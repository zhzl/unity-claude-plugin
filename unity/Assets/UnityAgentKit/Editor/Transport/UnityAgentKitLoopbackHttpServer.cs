using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitLoopbackHttpServer
    {
        internal const int MaxOperationRequestBodyBytes = 64 * 1024;
        internal const int OperationRequestBodyDeadlineMs = 2000;
        private const int RequestBodyChunkTimeoutMs = 250;

        private enum BodyReadFailure
        {
            None,
            TooLarge,
            Incomplete
        }

        private sealed class RequestBodyTooLargeException : Exception
        {
        }

        private sealed class ListenerState
        {
            private const int ListenerLoopExitWaitMilliseconds = 500;

            private readonly object _ownershipGate = new object();
            private readonly ManualResetEventSlim _acceptReservationsIdle = new ManualResetEventSlim(true);
            private readonly ManualResetEventSlim _guaranteedHandlersIdle = new ManualResetEventSlim(true);
            private readonly ManualResetEventSlim _guaranteedAsyncWritesIdle = new ManualResetEventSlim(true);
            private readonly ManualResetEventSlim _listenerLoopExited = new ManualResetEventSlim(false);
            private readonly ManualResetEventSlim _acceptedContextSeen = new ManualResetEventSlim(false);
            private readonly ManualResetEventSlim _closeIdle = new ManualResetEventSlim(true);
            private int _acceptReservationCount;
            private int _getContextReservationCount;
            private int _guaranteedHandlerCount;
            private int _guaranteedAsyncWriteCount;
            private int _isStopping;
            private int _isClosed;
            private int _wakeRequestCount;
            private string _stopReason = string.Empty;

            internal ListenerState(HttpListener listener, UnityAgentKitHostRecord record)
            {
                this.listener = listener;
                this.record = record;
            }

            internal readonly HttpListener listener;
            internal readonly UnityAgentKitHostRecord record;

            internal int AcceptReservationCount => Volatile.Read(ref _acceptReservationCount);
            internal int GetContextReservationCount => Volatile.Read(ref _getContextReservationCount);
            internal int GuaranteedHandlerCount => Volatile.Read(ref _guaranteedHandlerCount);
            internal int GuaranteedAsyncWriteCount => Volatile.Read(ref _guaranteedAsyncWriteCount);
            internal int WakeRequestCount => Volatile.Read(ref _wakeRequestCount);
            internal bool IsStopping => Volatile.Read(ref _isStopping) != 0;
            internal string StopReason => Volatile.Read(ref _stopReason) ?? string.Empty;

            internal void BeginStopping(string reasonCode)
            {
                Volatile.Write(ref _stopReason, string.IsNullOrEmpty(reasonCode) ? "host.stopped" : reasonCode);
                Interlocked.Exchange(ref _isStopping, 1);
                _closeIdle.Reset();
            }

            internal bool TryEnterAcceptReservation()
            {
                lock (_ownershipGate)
                {
                    if (Volatile.Read(ref _isClosed) != 0)
                    {
                        return false;
                    }

                    _acceptReservationsIdle.Reset();
                    _acceptReservationCount++;
                    return true;
                }
            }

            internal void LeaveAcceptReservation()
            {
                lock (_ownershipGate)
                {
                    if (_acceptReservationCount <= 0)
                    {
                        throw new InvalidOperationException("Accept reservation count underflow.");
                    }

                    _acceptReservationCount--;
                    if (_acceptReservationCount == 0)
                    {
                        _acceptReservationsIdle.Set();
                    }
                }
            }

            internal void EnterGetContextReservation()
            {
                lock (_ownershipGate)
                {
                    if (_getContextReservationCount >= _acceptReservationCount)
                    {
                        throw new InvalidOperationException("GetContext reservation count overflow.");
                    }

                    _getContextReservationCount++;
                }
            }

            internal void LeaveGetContextReservation()
            {
                lock (_ownershipGate)
                {
                    if (_getContextReservationCount <= 0)
                    {
                        throw new InvalidOperationException("GetContext reservation count underflow.");
                    }

                    _getContextReservationCount--;
                }
            }

            internal void AdmitAcceptedOperationContext()
            {
                lock (_ownershipGate)
                {
                    if (_acceptReservationCount <= 0)
                    {
                        throw new InvalidOperationException("Accept reservation count underflow.");
                    }

                    _acceptReservationCount--;
                    if (_acceptReservationCount == 0)
                    {
                        _acceptReservationsIdle.Set();
                    }

                    _guaranteedHandlersIdle.Reset();
                    _guaranteedHandlerCount++;
                }
            }

            internal void ReleaseGuaranteedHandler()
            {
                lock (_ownershipGate)
                {
                    if (_guaranteedHandlerCount <= 0)
                    {
                        throw new InvalidOperationException("Guaranteed handler count underflow.");
                    }

                    _guaranteedHandlerCount--;
                    if (_guaranteedHandlerCount == 0)
                    {
                        _guaranteedHandlersIdle.Set();
                    }
                }
            }

            internal void TrackGuaranteedAsyncWrite()
            {
                lock (_ownershipGate)
                {
                    _guaranteedAsyncWritesIdle.Reset();
                    _guaranteedAsyncWriteCount++;
                }
            }

            internal void ReleaseGuaranteedAsyncWrite()
            {
                lock (_ownershipGate)
                {
                    if (_guaranteedAsyncWriteCount <= 0)
                    {
                        throw new InvalidOperationException("Guaranteed async write count underflow.");
                    }

                    _guaranteedAsyncWriteCount--;
                    if (_guaranteedAsyncWriteCount == 0)
                    {
                        _guaranteedAsyncWritesIdle.Set();
                    }
                }
            }

            internal bool TryEnterHandler()
            {
                lock (_ownershipGate)
                {
                    _guaranteedHandlersIdle.Reset();
                    _guaranteedHandlerCount++;
                    return !IsStopping;
                }
            }

            internal void RequestWake()
            {
                Interlocked.Increment(ref _wakeRequestCount);
                if (record == null)
                {
                    return;
                }

                ThreadPool.QueueUserWorkItem(_ =>
                {
                    try
                    {
                        var request = (HttpWebRequest)WebRequest.Create(BuildWakeUrl(record.port));
                        request.Method = "GET";
                        request.Timeout = 250;
                        request.ReadWriteTimeout = 250;
                        using (var response = (HttpWebResponse)request.GetResponse())
                        {
                        }
                    }
                    catch (WebException)
                    {
                    }
                    catch (ObjectDisposedException)
                    {
                    }
                });
            }

            internal void MarkListenerLoopExited()
            {
                _listenerLoopExited.Set();
            }

            internal bool WaitForListenerLoopExited(int millisecondsTimeout)
            {
                return _listenerLoopExited.Wait(millisecondsTimeout);
            }

            internal void MarkAcceptedContextSeen()
            {
                _acceptedContextSeen.Set();
            }

            internal bool WaitForAcceptedContext(int millisecondsTimeout)
            {
                return _acceptedContextSeen.Wait(millisecondsTimeout);
            }

            internal bool ForceNonGuaranteeWakeFallbackForTests()
            {
                return TryCloseListenerForPendingGetContext();
            }

            internal void WaitUntilSafeToClose()
            {
                if (WaitForListenerLoopExited(ListenerLoopExitWaitMilliseconds))
                {
                    WaitForOwnershipIdle();
                    return;
                }

                while (!WaitForListenerLoopExited(0))
                {
                    if (TryCloseListenerForPendingGetContext())
                    {
                        WaitForListenerLoopExited(ListenerLoopExitWaitMilliseconds);
                        continue;
                    }

                    WaitForOwnershipIdle();
                    if (WaitForListenerLoopExited(0))
                    {
                        break;
                    }
                }

                WaitForOwnershipIdle();
            }

            private bool TryCloseListenerForPendingGetContext()
            {
                lock (_ownershipGate)
                {
                    if (_acceptReservationCount <= 0 || _acceptReservationCount != _getContextReservationCount)
                    {
                        return false;
                    }

                    if (_guaranteedHandlerCount != 0 || _guaranteedAsyncWriteCount != 0)
                    {
                        return false;
                    }
                }

                listener.Close();
                return true;
            }

            private void WaitForOwnershipIdle()
            {
                WaitForIdle(_acceptReservationsIdle, () => _acceptReservationCount, _ownershipGate);
                WaitForIdle(_guaranteedHandlersIdle, () => _guaranteedHandlerCount, _ownershipGate);
                WaitForIdle(_guaranteedAsyncWritesIdle, () => _guaranteedAsyncWriteCount, _ownershipGate);
            }

            internal void MarkClosed()
            {
                lock (_ownershipGate)
                {
                    _isClosed = 1;
                }

                _closeIdle.Set();
            }

            internal bool WaitForClosed(int millisecondsTimeout)
            {
                return _closeIdle.Wait(millisecondsTimeout);
            }
        }

        private static readonly ManualResetEventSlim ListenerCloseIdle = new ManualResetEventSlim(true);
        private static ListenerState _currentState;
        private static ListenerState _lastStateForTests;
        private static int _pendingListenerCloseCount;
        internal static Action BeginStopHookForTests;
        internal static Action BeforeStopFlushHookForTests;
        internal static Action AfterBeginClosingHookForTests;
        internal static Action AcceptedContextBeforeAdmissionHookForTests;
        internal static Action HandlerStartedForTests;
        internal static Action BeforeActiveHandlersIdleWaitHookForTests;
        internal static Action BeforeGetContextHookForTests;
        internal static Action AfterCompleteOperationBodyReadHookForTests;
        internal static Action BeforeGuaranteedAsyncWriteForTests;

        internal static bool IsRunning
        {
            get
            {
                var state = _currentState;
                return state != null && state.listener.IsListening;
            }
        }

        internal static int ActiveHandlerCountForTests
        {
            get
            {
                var state = _currentState ?? _lastStateForTests;
                return state != null ? state.GuaranteedHandlerCount : 0;
            }
        }

        internal static int AcceptReservationCountForTests
        {
            get
            {
                var state = _currentState ?? _lastStateForTests;
                return state != null ? state.AcceptReservationCount : 0;
            }
        }

        internal static int GuaranteedOperationHandlerCountForTests
        {
            get
            {
                var state = _currentState ?? _lastStateForTests;
                return state != null ? state.GuaranteedHandlerCount : 0;
            }
        }

        internal static int GuaranteedAsyncWriteCountForTests
        {
            get
            {
                var state = _currentState ?? _lastStateForTests;
                return state != null ? state.GuaranteedAsyncWriteCount : 0;
            }
        }

        internal static int WakeRequestCountForTests
        {
            get
            {
                var state = _currentState ?? _lastStateForTests;
                return state != null ? state.WakeRequestCount : 0;
            }
        }

        internal static bool WaitForListenerClosedForTests(int millisecondsTimeout)
        {
            return ListenerCloseIdle.Wait(millisecondsTimeout);
        }

        internal static bool WaitForListenerLoopExitedForTests(int millisecondsTimeout)
        {
            var state = _currentState ?? _lastStateForTests;
            return state == null || state.WaitForListenerLoopExited(millisecondsTimeout);
        }

        internal static bool WaitForAcceptedContextForTests(int millisecondsTimeout)
        {
            var state = _currentState ?? _lastStateForTests;
            return state != null && state.WaitForAcceptedContext(millisecondsTimeout);
        }

        internal static bool ForceWakeFailureFallbackForTests()
        {
            var state = _currentState ?? _lastStateForTests;
            return state != null && state.ForceNonGuaranteeWakeFallbackForTests();
        }

        internal static string BuildProbeUrl(int port)
        {
            return "http://127.0.0.1:" + port + "/probe";
        }

        internal static string BuildOperationsUrl(int port)
        {
            return "http://127.0.0.1:" + port + "/operations";
        }

        internal static string BuildWakeUrl(int port)
        {
            return "http://127.0.0.1:" + port + "/__unity_agent_kit_stop_wake";
        }

        internal static string BuildLoopbackPrefix(int port)
        {
            return "http://127.0.0.1:" + port + "/";
        }

        internal static void Start(UnityAgentKitHostRecord record)
        {
            if (record == null)
            {
                throw new ArgumentNullException(nameof(record));
            }

            StartListener(record, record.port);
        }

        internal static void StartWithoutRecordForTests(int port)
        {
            StartListener(null, port);
        }

        internal static void Stop(string reasonCode = "host.stopped")
        {
            var state = _currentState;
            _currentState = null;
            _lastStateForTests = state;
            state?.BeginStopping(reasonCode);
            BeginStopHookForTests?.Invoke();

            UnityAgentKitMainThread.Stop(reasonCode);
            BeforeStopFlushHookForTests?.Invoke();

            if (state != null)
            {
                AfterBeginClosingHookForTests?.Invoke();
                state.RequestWake();
                ScheduleListenerClose(state);
            }
        }

        private static void ScheduleListenerClose(ListenerState state)
        {
            Interlocked.Increment(ref _pendingListenerCloseCount);
            ListenerCloseIdle.Reset();
            ThreadPool.QueueUserWorkItem(_ => CloseListenerWhenIdle(state));
        }

        private static void CloseListenerWhenIdle(ListenerState state)
        {
            try
            {
                BeforeActiveHandlersIdleWaitHookForTests?.Invoke();
                state.WaitUntilSafeToClose();
                state.listener.Close();
            }
            catch (HttpListenerException)
            {
            }
            catch (ObjectDisposedException)
            {
            }
            finally
            {
                state.MarkClosed();
                if (Interlocked.Decrement(ref _pendingListenerCloseCount) == 0)
                {
                    ListenerCloseIdle.Set();
                }
            }
        }

        private static void StartListener(UnityAgentKitHostRecord record, int port)
        {
            Stop("host.restarting");
            var listener = new HttpListener();
            listener.Prefixes.Add(BuildLoopbackPrefix(port));
            listener.Start();
            var state = new ListenerState(listener, record);
            _currentState = state;
            _lastStateForTests = state;
            UnityAgentKitMainThread.RegisterDrain();
            var thread = new Thread(() => ListenLoop(state))
            {
                IsBackground = true,
                Name = "UnityAgentKitLoopbackHttpServer"
            };
            thread.Start();
        }

        private static void ListenLoop(ListenerState state)
        {
            try
            {
                while (state.listener.IsListening)
                {
                    if (!state.TryEnterAcceptReservation())
                    {
                        return;
                    }

                    var reservationHeld = true;
                    var enteredGetContext = false;
                    try
                    {
                        BeforeGetContextHookForTests?.Invoke();
                        state.EnterGetContextReservation();
                        enteredGetContext = true;
                        HttpListenerContext context;
                        try
                        {
                            context = state.listener.GetContext();
                            state.MarkAcceptedContextSeen();
                        }
                        finally
                        {
                            if (enteredGetContext)
                            {
                                state.LeaveGetContextReservation();
                                enteredGetContext = false;
                            }
                        }

                        AcceptedContextBeforeAdmissionHookForTests?.Invoke();
                        HandleAcceptedContext(context, state, ref reservationHeld);
                        if (state.IsStopping)
                        {
                            return;
                        }
                    }
                    finally
                    {
                        if (enteredGetContext)
                        {
                            state.LeaveGetContextReservation();
                        }

                        if (reservationHeld)
                        {
                            state.LeaveAcceptReservation();
                        }
                    }
                }
            }
            catch (HttpListenerException)
            {
            }
            catch (ObjectDisposedException)
            {
            }
            finally
            {
                state.MarkListenerLoopExited();
            }
        }

        private static void HandleAcceptedContext(HttpListenerContext context, ListenerState state, ref bool reservationHeld)
        {
            var path = context.Request.Url != null ? context.Request.Url.AbsolutePath : string.Empty;
            if (path == "/__unity_agent_kit_stop_wake")
            {
                state.LeaveAcceptReservation();
                reservationHeld = false;
                AbortResponse(context.Response);
                return;
            }

            if (path == "/operations" && context.Request.HttpMethod == "POST")
            {
                HandleAcceptedOperationContext(context, state, ref reservationHeld);
                return;
            }

            state.LeaveAcceptReservation();
            reservationHeld = false;
            HandleNonOperationContext(context, state);
        }

        private static void HandleAcceptedOperationContext(HttpListenerContext context, ListenerState state, ref bool reservationHeld)
        {
            var record = state != null ? state.record : null;
            string body;
            BodyReadFailure bodyReadFailure;
            if (!TryReadCompleteBody(context.Request, out body, out bodyReadFailure))
            {
                state.LeaveAcceptReservation();
                reservationHeld = false;
                if (bodyReadFailure == BodyReadFailure.TooLarge)
                {
                    WriteJson(context.Response, 400, JsonUtility.ToJson(UnityAgentKitOperationRouter.RequestBodyTooLarge(record)));
                }
                else
                {
                    AbortResponse(context.Response);
                }
                return;
            }

            AfterCompleteOperationBodyReadHookForTests?.Invoke();
            state.AdmitAcceptedOperationContext();
            reservationHeld = false;
            try
            {
                HandleReadableAcceptedOperation(context, state, body, record);
            }
            finally
            {
                state.ReleaseGuaranteedHandler();
            }
        }

        private static void HandleReadableAcceptedOperation(HttpListenerContext context, ListenerState state, string body, UnityAgentKitHostRecord record)
        {
            HandlerStartedForTests?.Invoke();
            if (string.IsNullOrWhiteSpace(body))
            {
                WriteJson(context.Response, 400, JsonUtility.ToJson(UnityAgentKitOperationRouter.EmptyBody(record)));
                return;
            }

            UnityAgentKitOperationRequest request;
            try
            {
                request = JsonUtility.FromJson<UnityAgentKitOperationRequest>(body);
            }
            catch (Exception error)
            {
                WriteJson(context.Response, 400, JsonUtility.ToJson(UnityAgentKitOperationRouter.MalformedJson(record, "Operation request JSON is malformed: " + error.Message)));
                return;
            }

            if (request == null)
            {
                WriteJson(context.Response, 400, JsonUtility.ToJson(UnityAgentKitOperationRouter.MalformedJson(record, "Operation request JSON is malformed.")));
                return;
            }

            var operation = UnityAgentKitOperationRouter.NormalizeOperation(request.operation);
            if (state != null && state.IsStopping && !string.IsNullOrEmpty(operation))
            {
                WriteJson(context.Response, 200, JsonUtility.ToJson(UnityAgentKitOperationRouter.Stopped(request, record, state.StopReason)));
                return;
            }

            if (UnityAgentKitOperationRouter.RequiresMainThreadDispatch(operation))
            {
                UnityAgentKitMainThread.Enqueue(request, record, response =>
                {
                    QueueWriteJson(state, context.Response, 200, JsonUtility.ToJson(response));
                });
                return;
            }

            var response = UnityAgentKitOperationRouter.Route(request, record);
            var statusCode = response.status == "rejected" && response.code == "operation.empty" ? 400 : 200;
            WriteJson(context.Response, statusCode, JsonUtility.ToJson(response));
        }

        private static void HandleNonOperationContext(HttpListenerContext context, ListenerState state)
        {
            var record = state != null ? state.record : null;
            var path = context.Request.Url != null ? context.Request.Url.AbsolutePath : string.Empty;
            if (path == "/operations")
            {
                WriteJson(context.Response, 405, JsonUtility.ToJson(UnityAgentKitOperationRouter.MethodNotAllowed(record)));
                return;
            }

            if (path == "/probe" && context.Request.HttpMethod == "GET")
            {
                WriteJson(context.Response, 200, JsonUtility.ToJson(CreateProbeResponse(record)));
                return;
            }

            if (path == "/probe")
            {
                WriteJson(context.Response, 405, JsonUtility.ToJson(FailureProbe("http.method_not_allowed", "Method not allowed.")));
                return;
            }

            WriteJson(context.Response, 404, JsonUtility.ToJson(UnityAgentKitOperationRouter.HttpNotFound(record)));
        }

        private static bool TryReadCompleteBody(HttpListenerRequest request, out string body, out BodyReadFailure failure)
        {
            body = string.Empty;
            failure = BodyReadFailure.None;
            var stream = request.InputStream;

            try
            {
                var deadline = DateTimeOffset.UtcNow.AddMilliseconds(OperationRequestBodyDeadlineMs);
                if (request.ContentLength64 > MaxOperationRequestBodyBytes)
                {
                    DrainRequestBody(stream, deadline);
                    failure = BodyReadFailure.TooLarge;
                    return false;
                }

                body = ReadRequestBody(request, stream, deadline);
                return true;
            }
            catch (RequestBodyTooLargeException)
            {
                failure = BodyReadFailure.TooLarge;
                return false;
            }
            catch (IOException)
            {
                failure = BodyReadFailure.Incomplete;
                CloseRequestInputStream(stream);
                return false;
            }
            catch (ObjectDisposedException)
            {
                failure = BodyReadFailure.Incomplete;
                CloseRequestInputStream(stream);
                return false;
            }
            catch (NotSupportedException)
            {
                failure = BodyReadFailure.Incomplete;
                CloseRequestInputStream(stream);
                return false;
            }
            catch (InvalidOperationException)
            {
                failure = BodyReadFailure.Incomplete;
                CloseRequestInputStream(stream);
                return false;
            }
        }

        private static string ReadRequestBody(HttpListenerRequest request, Stream stream, DateTimeOffset deadline)
        {
            using (var buffer = new MemoryStream())
            {
                var chunk = new byte[1024];
                while (true)
                {
                    var bytesRead = ReadRequestBodyChunk(stream, chunk, deadline);
                    if (bytesRead <= 0)
                    {
                        break;
                    }

                    if (buffer.Length + bytesRead > MaxOperationRequestBodyBytes)
                    {
                        DrainRequestBody(stream, deadline, chunk);
                        throw new RequestBodyTooLargeException();
                    }

                    buffer.Write(chunk, 0, bytesRead);
                }

                return (request.ContentEncoding ?? Encoding.UTF8).GetString(buffer.ToArray());
            }
        }

        private static void DrainRequestBody(Stream stream, DateTimeOffset deadline)
        {
            DrainRequestBody(stream, deadline, new byte[1024]);
        }

        private static void DrainRequestBody(Stream stream, DateTimeOffset deadline, byte[] chunk)
        {
            while (ReadRequestBodyChunk(stream, chunk, deadline) > 0)
            {
            }
        }

        private static int ReadRequestBodyChunk(Stream stream, byte[] chunk, DateTimeOffset deadline)
        {
            var remainingMs = (int)Math.Ceiling((deadline - DateTimeOffset.UtcNow).TotalMilliseconds);
            if (remainingMs <= 0)
            {
                throw new IOException("Timed out while reading request body.");
            }

            var timeoutMs = Math.Min(RequestBodyChunkTimeoutMs, remainingMs);
            return ReadChunkWithTimeout(stream, chunk, timeoutMs);
        }

        internal static int ReadChunkWithTimeout(Stream stream, byte[] chunk, int timeoutMs)
        {
            IAsyncResult asyncResult = null;
            WaitHandle asyncWaitHandle = null;
            var endReadPending = false;

            try
            {
                asyncResult = stream.BeginRead(chunk, 0, chunk.Length, null, null);
                endReadPending = true;
                asyncWaitHandle = asyncResult.AsyncWaitHandle;
                if (asyncWaitHandle != null && asyncWaitHandle.WaitOne(timeoutMs))
                {
                    var bytesRead = stream.EndRead(asyncResult);
                    endReadPending = false;
                    return bytesRead;
                }

                CloseRequestInputStream(stream);
                if (endReadPending && asyncWaitHandle != null && asyncWaitHandle.WaitOne(timeoutMs))
                {
                    EndTimedOutRead(stream, asyncResult);
                    endReadPending = false;
                }

                throw new IOException("Timed out while reading request body.");
            }
            finally
            {
                CloseAsyncWaitHandle(asyncWaitHandle);
            }
        }

        private static void EndTimedOutRead(Stream stream, IAsyncResult asyncResult)
        {
            try
            {
                stream.EndRead(asyncResult);
            }
            catch (IOException)
            {
            }
            catch (ObjectDisposedException)
            {
            }
            catch (NotSupportedException)
            {
            }
            catch (InvalidOperationException)
            {
            }
        }

        private static void CloseAsyncWaitHandle(WaitHandle asyncWaitHandle)
        {
            if (asyncWaitHandle == null)
            {
                return;
            }

            try
            {
                asyncWaitHandle.Close();
            }
            catch (ObjectDisposedException)
            {
            }
        }

        private static void CloseRequestInputStream(Stream stream)
        {
            try
            {
                stream.Close();
            }
            catch (IOException)
            {
            }
            catch (ObjectDisposedException)
            {
            }
            catch (NotSupportedException)
            {
            }
            catch (InvalidOperationException)
            {
            }
        }

        private static UnityAgentKitProbeResponse CreateProbeResponse(UnityAgentKitHostRecord record)
        {
            if (record == null)
            {
                return FailureProbe("host.not_ready", "Unity Agent Kit host record is not available.");
            }

            return new UnityAgentKitProbeResponse
            {
                hostId = record.hostId,
                hostEpoch = record.hostEpoch,
                projectRoot = record.projectRoot,
                protocolVersion = record.protocolVersion,
                port = record.port,
                status = record.status,
                code = string.Empty,
                message = string.Empty
            };
        }

        private static UnityAgentKitProbeResponse FailureProbe(string code, string message)
        {
            return new UnityAgentKitProbeResponse
            {
                status = "not_ready",
                code = code ?? string.Empty,
                message = message ?? string.Empty
            };
        }

        private static void QueueWriteJson(ListenerState state, HttpListenerResponse response, int statusCode, string json)
        {
            if (state == null)
            {
                WriteJson(response, statusCode, json);
                return;
            }

            state.TrackGuaranteedAsyncWrite();
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    BeforeGuaranteedAsyncWriteForTests?.Invoke();
                    WriteJson(response, statusCode, json);
                }
                catch (HttpListenerException)
                {
                }
                catch (ObjectDisposedException)
                {
                }
                catch (InvalidOperationException)
                {
                }
                catch (IOException)
                {
                }
                finally
                {
                    state.ReleaseGuaranteedAsyncWrite();
                }
            });
        }

        private static void WaitForIdle(ManualResetEventSlim idleEvent, Func<int> countAccessor, object ownershipGate)
        {
            while (true)
            {
                lock (ownershipGate)
                {
                    if (countAccessor() == 0)
                    {
                        return;
                    }
                }

                idleEvent.Wait();
            }
        }

        private static void IncrementActiveHandlerCount()
        {
            var state = _currentState ?? _lastStateForTests;
            if (state == null)
            {
                return;
            }

            state.TryEnterHandler();
        }

        private static void DecrementActiveHandlerCount()
        {
            var state = _currentState ?? _lastStateForTests;
            state?.ReleaseGuaranteedHandler();
        }

        private static void IncrementGuaranteedAsyncWriteCount()
        {
            var state = _currentState ?? _lastStateForTests;
            state?.TrackGuaranteedAsyncWrite();
        }

        private static void DecrementGuaranteedAsyncWriteCount()
        {
            var state = _currentState ?? _lastStateForTests;
            state?.ReleaseGuaranteedAsyncWrite();
        }

        private static void AbortResponse(HttpListenerResponse response)
        {
            try
            {
                response.Abort();
            }
            catch (HttpListenerException)
            {
            }
            catch (ObjectDisposedException)
            {
            }
            catch (InvalidOperationException)
            {
            }
        }

        private static void WriteJson(HttpListenerResponse response, int statusCode, string json)
        {
            var payload = Encoding.UTF8.GetBytes(string.IsNullOrEmpty(json) ? "{}" : json);
            var stream = response.OutputStream;
            Exception writeError = null;
            response.StatusCode = statusCode;
            response.ContentType = "application/json; charset=utf-8";
            response.ContentLength64 = payload.Length;

            try
            {
                stream.Write(payload, 0, payload.Length);
            }
            catch (Exception error)
            {
                writeError = error;
                throw;
            }
            finally
            {
                try
                {
                    stream.Close();
                }
                catch (Exception) when (writeError != null)
                {
                }
            }
        }
    }
}
