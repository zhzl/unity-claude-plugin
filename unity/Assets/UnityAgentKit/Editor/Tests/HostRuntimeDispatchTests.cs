using System;
using System.Collections;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace UnityAgentKit.Editor.Tests
{
    public sealed partial class HostRuntimeTests
    {
        private sealed class CompletedAsyncResult : IAsyncResult
        {
            private readonly ManualResetEvent _waitHandle = new ManualResetEvent(true);

            public object AsyncState => null;
            public WaitHandle AsyncWaitHandle => _waitHandle;
            public bool CompletedSynchronously => false;
            public bool IsCompleted => true;
        }

        private sealed class CompletedReadWithoutCallbackStream : Stream
        {
            private readonly byte[] _payload;
            private bool _endReadCalled;

            public CompletedReadWithoutCallbackStream(byte[] payload)
            {
                _payload = payload;
            }

            public int EndReadCallCount { get; private set; }

            public override bool CanRead => true;
            public override bool CanSeek => false;
            public override bool CanWrite => false;
            public override long Length => throw new NotSupportedException();

            public override long Position
            {
                get => throw new NotSupportedException();
                set => throw new NotSupportedException();
            }

            public override IAsyncResult BeginRead(byte[] buffer, int offset, int count, AsyncCallback callback, object state)
            {
                Array.Copy(_payload, 0, buffer, offset, Math.Min(count, _payload.Length));
                return new CompletedAsyncResult();
            }

            public override int EndRead(IAsyncResult asyncResult)
            {
                if (_endReadCalled)
                {
                    throw new InvalidOperationException("EndRead called more than once.");
                }

                _endReadCalled = true;
                EndReadCallCount += 1;
                return _payload.Length;
            }

            public override int Read(byte[] buffer, int offset, int count)
            {
                throw new NotSupportedException();
            }

            public override void Flush()
            {
            }

            public override long Seek(long offset, SeekOrigin origin)
            {
                throw new NotSupportedException();
            }

            public override void SetLength(long value)
            {
                throw new NotSupportedException();
            }

            public override void Write(byte[] buffer, int offset, int count)
            {
                throw new NotSupportedException();
            }
        }

        [Test]
        public void ThreadCheckOperationIsMarkedAsMainThreadDispatch()
        {
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" host.threadCheck "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch("host.throw"));
            Assert.IsFalse(UnityAgentKitOperationRouter.RequiresMainThreadDispatch("host.echo"));
            Assert.IsFalse(UnityAgentKitOperationRouter.RequiresMainThreadDispatch("unknown.operation"));
        }

        [Test]
        public void MainThreadDispatchRunsThreadCheckOnCapturedThread()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            UnityAgentKitOperationResponse response = null;

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-thread-direct"
            }, TestHostRecord(49210), completed => response = completed);

            UnityAgentKitMainThread.DrainForTests();

            AssertOperationEnvelopeMinimumFields(response, "succeeded", "host.threadCheck", "req-thread-direct", TestHostRecord(49210));
            var data = JsonUtility.FromJson<UnityAgentKitThreadCheckResult>(response.data);
            Assert.AreEqual(UnityAgentKitMainThread.CapturedMainThreadIdForTests, data.capturedMainThreadId);
            Assert.AreEqual(data.capturedMainThreadId, data.executionThreadId);
            Assert.IsTrue(data.ranOnMainThread);
        }

        [Test]
        public void CompletionCallbackExceptionDoesNotPreventLaterDispatchesInSameDrain()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            var firstCompletionCount = 0;
            var secondCompletionCount = 0;
            UnityAgentKitOperationResponse secondResponse = null;
            var record = TestHostRecord(49211);

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-thread-first"
            }, record, _ =>
            {
                firstCompletionCount += 1;
                throw new InvalidOperationException("completion failed");
            });

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-thread-second"
            }, record, completed =>
            {
                secondCompletionCount += 1;
                secondResponse = completed;
            });

            Assert.DoesNotThrow(() => UnityAgentKitMainThread.DrainForTests());

            Assert.AreEqual(1, firstCompletionCount);
            Assert.AreEqual(1, secondCompletionCount);
            AssertOperationEnvelopeMinimumFields(secondResponse, "succeeded", "host.threadCheck", "req-thread-second", record);
            var data = JsonUtility.FromJson<UnityAgentKitThreadCheckResult>(secondResponse.data);
            Assert.AreEqual(UnityAgentKitMainThread.CapturedMainThreadIdForTests, data.capturedMainThreadId);
            Assert.AreEqual(data.capturedMainThreadId, data.executionThreadId);
            Assert.IsTrue(data.ranOnMainThread);
        }

        [Test]
        public void DispatchExceptionReturnsStructuredDiagnostics()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            UnityAgentKitOperationResponse response = null;

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.throw",
                requestId = "req-throw"
            }, TestHostRecord(49212), completed => response = completed);

            UnityAgentKitMainThread.DrainForTests();

            AssertOperationEnvelopeMinimumFields(response, "failed", "host.throw", "req-throw", TestHostRecord(49212));
            Assert.AreEqual("host.dispatch_exception", response.code);
            Assert.AreEqual(1, response.diagnostics.Length);
            Assert.AreEqual("error", response.diagnostics[0].severity);
            Assert.AreEqual("host.dispatch_exception", response.diagnostics[0].code);
            Assert.AreEqual("{\"exceptionType\":\"InvalidOperationException\"}", response.diagnostics[0].details);
        }

        [UnityTest]
        public IEnumerator HostThreadCheckOverOperationsRunsOnCapturedMainThread()
        {
            var registryPath = TemporaryRegistryPath("operations-threadcheck-main-thread");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.threadCheck\",\"requestId\":\"req-thread-http\"}");

                yield return WaitForPendingDispatch();
                UnityAgentKitMainThread.DrainForTests();
                yield return WaitForRequestDone(request);

                var requestError = request.GetError();
                if (requestError != null)
                {
                    throw requestError;
                }

                var requestResult = request.GetResult();
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(requestResult.body);
                Assert.AreEqual(200, requestResult.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "succeeded", "host.threadCheck", "req-thread-http", record);
                Assert.AreEqual(string.Empty, response.code);
                Assert.AreEqual(0, response.diagnostics.Length);
                var data = JsonUtility.FromJson<UnityAgentKitThreadCheckResult>(response.data);
                Assert.AreEqual(UnityAgentKitMainThread.CapturedMainThreadIdForTests, data.capturedMainThreadId);
                Assert.AreEqual(data.capturedMainThreadId, data.executionThreadId);
                Assert.IsTrue(data.ranOnMainThread);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [UnityTest]
        public IEnumerator PendingDispatchTimeoutReturnsHostTimeout()
        {
            var registryPath = TemporaryRegistryPath("operations-pending-timeout");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(75);
                var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-timeout\"}");

                yield return WaitForPendingDispatch();
                yield return WaitForRequestDone(request);

                if (request.GetError() != null)
                {
                    throw request.GetError();
                }

                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(request.GetResult().body);
                Assert.AreEqual(200, request.GetResult().statusCode);
                AssertOperationEnvelopeMinimumFields(response, "timeout", "host.pendingDispatchTimeout", "req-timeout", record);
                Assert.AreEqual("host.dispatch_timeout", response.code);
                Assert.AreEqual(1, response.diagnostics.Length);
                Assert.AreEqual("host.dispatch_timeout", response.diagnostics[0].code);
                Assert.AreEqual(0, UnityAgentKitMainThread.PendingDispatchCountForTests);
            }
            finally
            {
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                UnityAgentKitHost.ResetForTests();
            }
        }

        [UnityTest]
        public IEnumerator PendingDispatchTimeoutDoesNotBlockMainThreadOrHandler()
        {
            var registryPath = TemporaryRegistryPath("operations-timeout-nonblocking");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-nonblocking\"}");

                yield return WaitForPendingDispatch();

                Assert.AreEqual(0, UnityAgentKitLoopbackHttpServer.ActiveHandlerCountForTests);
                Assert.IsFalse(request.IsDone);

                UnityAgentKitMainThread.DrainForTests();

                Assert.Greater(UnityAgentKitMainThread.PendingDispatchCountForTests, 0);
                Assert.IsFalse(request.IsDone);

                yield return WaitForRequestDone(request);
                Assert.IsNull(request.GetError());

                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(request.GetResult().body);
                Assert.AreEqual(200, request.GetResult().statusCode);
                AssertOperationEnvelopeMinimumFields(response, "timeout", "host.pendingDispatchTimeout", "req-nonblocking", record);
                Assert.AreEqual("host.dispatch_timeout", response.code);
            }
            finally
            {
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                UnityAgentKitHost.ResetForTests();
            }
        }

        [UnityTest]
        public IEnumerator PendingDispatchTimeoutMarksMayStillBeRunning()
        {
            var registryPath = TemporaryRegistryPath("operations-timeout-may-still-run");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(75);
                var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-timeout-metadata\"}");

                yield return WaitForPendingDispatch();
                yield return WaitForRequestDone(request);

                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(request.GetResult().body);
                AssertOperationEnvelopeMinimumFields(response, "timeout", "host.pendingDispatchTimeout", "req-timeout-metadata", record);
                Assert.AreEqual("{\"mayStillBeRunning\":true}", response.metadata);
                Assert.AreEqual("{\"mayStillBeRunning\":true}", response.diagnostics[0].details);
            }
            finally
            {
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                UnityAgentKitHost.ResetForTests();
            }
        }

        [UnityTest]
        public IEnumerator ExpiredDispatchWorkDoesNotExecuteLater()
        {
            var registryPath = TemporaryRegistryPath("operations-expired-not-executed");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(75);
                var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-expired\"}");

                yield return WaitForPendingDispatch();
                yield return WaitForRequestDone(request);
                UnityAgentKitMainThread.DrainForTests();
                UnityAgentKitMainThread.DrainForTests();

                Assert.AreEqual(0, UnityAgentKitMainThread.ExpiredDispatchExecutionCountForTests);
                Assert.AreEqual(0, UnityAgentKitMainThread.PendingDispatchCountForTests);
            }
            finally
            {
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void ClaimedDispatchCannotBeCompletedByTimeoutBeforeExecution()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(1000);
            UnityAgentKitOperationResponse response = null;
            var timeoutAttempted = false;
            var record = TestHostRecord(49245);

            try
            {
                UnityAgentKitMainThread.BeforeRunClaimedDispatchForTests = requestId =>
                {
                    timeoutAttempted = UnityAgentKitMainThread.ForceDispatchTimeoutForTests(requestId);
                };

                UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
                {
                    operation = "host.threadCheck",
                    requestId = "req-claimed-race"
                }, record, completed => response = completed);

                UnityAgentKitMainThread.DrainForTests();

                Assert.IsTrue(timeoutAttempted == false, "Claimed dispatch must not be completed by timeout.");
                AssertOperationEnvelopeMinimumFields(response, "succeeded", "host.threadCheck", "req-claimed-race", record);
                Assert.AreEqual(0, UnityAgentKitMainThread.ExpiredDispatchExecutionCountForTests);
                Assert.AreEqual(0, UnityAgentKitMainThread.PendingDispatchCountForTests);
            }
            finally
            {
                UnityAgentKitMainThread.BeforeRunClaimedDispatchForTests = null;
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                UnityAgentKitMainThread.ResetForTests();
            }
        }

        [UnityTest]
        public IEnumerator HostStopReturnsStoppedEnvelopeBeforeClosingListener()
        {
            var registryPath = TemporaryRegistryPath("operations-http-stop-pending");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(1000);
                var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-http-stop\"}");

                yield return WaitForPendingDispatch();
                UnityAgentKitHost.StopForTests("host.stopped");
                yield return WaitForRequestDone(request);

                var requestError = request.GetError();
                if (requestError != null)
                {
                    throw requestError;
                }

                var requestResult = request.GetResult();
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(requestResult.body);
                Assert.AreEqual(200, requestResult.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "failed", "host.pendingDispatchTimeout", "req-http-stop", record);
                Assert.AreEqual("host.stopped", response.code);
                Assert.AreEqual(1, response.diagnostics.Length);
                Assert.AreEqual("host.stopped", response.diagnostics[0].code);
                Assert.AreNotEqual("timeout", response.status);
                Assert.AreNotEqual("host.dispatch_timeout", response.code);
                Assert.AreEqual(0, UnityAgentKitMainThread.PendingDispatchCountForTests);
            }
            finally
            {
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void HandlerAdmissionCountsActiveHandlerBeforeReturning()
        {
            var port = FreeTcpPort();
            var accepted = false;

            try
            {
                UnityAgentKitLoopbackHttpServer.StartWithoutRecordForTests(port);
                var serverType = typeof(UnityAgentKitLoopbackHttpServer);
                var state = serverType.GetField("_currentState", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.NonPublic).GetValue(null);
                var tryEnterHandler = state.GetType().GetMethod("TryEnterHandler", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);

                accepted = (bool)tryEnterHandler.Invoke(state, null);

                Assert.IsTrue(accepted);
                Assert.AreEqual(1, UnityAgentKitLoopbackHttpServer.ActiveHandlerCountForTests);
            }
            finally
            {
                if (accepted)
                {
                    typeof(UnityAgentKitLoopbackHttpServer).GetMethod("DecrementActiveHandlerCount", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.NonPublic).Invoke(null, null);
                }

                UnityAgentKitLoopbackHttpServer.Stop("host.stopped");
                UnityAgentKitMainThread.ResetForTests();
            }
        }

        [Test]
        public void AcceptedOperationStoppedBeforeAdmissionReturnsStoppedEnvelope()
        {
            var registryPath = TemporaryRegistryPath("operations-http-accepted-before-admission-stop");
            var acceptedBeforeAdmission = new ManualResetEventSlim(false);
            var releaseAdmission = new ManualResetEventSlim(false);
            BackgroundHttpRequest request = null;

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitLoopbackHttpServer.AcceptedContextBeforeAdmissionHookForTests = () =>
                {
                    acceptedBeforeAdmission.Set();
                    Assert.IsTrue(releaseAdmission.Wait(1000), "Expected test to release accepted request admission.");
                };
                request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.threadCheck\",\"requestId\":\"req-accepted-before-admission-stop\"}");

                Assert.IsTrue(acceptedBeforeAdmission.Wait(1000), "Expected listener to accept request before admission.");
                UnityAgentKitHost.StopForTests("host.stopped");
                releaseAdmission.Set();

                Assert.IsTrue(request.WaitUntilDone(1000), "Expected accepted request to complete after stop.");
                Assert.IsNull(request.GetError());

                var result = request.GetResult();
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);
                Assert.AreEqual(200, result.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "failed", "host.threadCheck", "req-accepted-before-admission-stop", record);
                Assert.AreEqual("host.stopped", response.code);
                Assert.AreEqual(1, response.diagnostics.Length);
                Assert.AreEqual("host.stopped", response.diagnostics[0].code);
            }
            finally
            {
                UnityAgentKitLoopbackHttpServer.AcceptedContextBeforeAdmissionHookForTests = null;
                releaseAdmission.Set();
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void ReadChunkWithTimeoutTreatsSignaledReadAsCompleteWithoutCallback()
        {
            var stream = new CompletedReadWithoutCallbackStream(Encoding.UTF8.GetBytes("ok"));
            var chunk = new byte[8];

            var bytesRead = UnityAgentKitLoopbackHttpServer.ReadChunkWithTimeout(stream, chunk, 250);

            Assert.AreEqual(2, bytesRead);
            Assert.AreEqual("ok", Encoding.UTF8.GetString(chunk, 0, bytesRead));
            Assert.AreEqual(1, stream.EndReadCallCount);
        }

        [Test]
        public void CompleteReadableAcceptedOperationTransfersToGuaranteedOwnershipBeforeStoppedEnvelope()
        {
            var registryPath = TemporaryRegistryPath("operations-complete-body-guaranteed-stop");
            var bodyRead = new ManualResetEventSlim(false);
            var releaseClassification = new ManualResetEventSlim(false);
            BackgroundHttpRequest request = null;

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.ResetEnqueueInstrumentationForTests();
                UnityAgentKitLoopbackHttpServer.AfterCompleteOperationBodyReadHookForTests = () =>
                {
                    bodyRead.Set();
                    Assert.IsTrue(releaseClassification.Wait(1000), "Expected test to release operation ownership transfer.");
                };

                request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.threadCheck\",\"requestId\":\"req-complete-body-stop\"}");

                Assert.IsTrue(bodyRead.Wait(1000), "Expected complete request body to be read before stopping.");
                UnityAgentKitHost.StopForTests("host.stopped");
                Assert.AreEqual(1, UnityAgentKitLoopbackHttpServer.AcceptReservationCountForTests, "Complete body classification remains protected by accept reservation before transfer.");
                releaseClassification.Set();

                Assert.IsTrue(request.WaitUntilDone(1000), "Expected stopped envelope response for complete readable accepted operation.");
                Assert.IsNull(request.GetError());

                var result = request.GetResult();
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);
                Assert.AreEqual(200, result.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "failed", "host.threadCheck", "req-complete-body-stop", record);
                Assert.AreEqual("host.stopped", response.code);
                Assert.IsFalse(UnityAgentKitMainThread.WasRequestIdEnqueuedForTests("req-complete-body-stop"));
                Assert.AreEqual(0, UnityAgentKitLoopbackHttpServer.GuaranteedOperationHandlerCountForTests);
            }
            finally
            {
                UnityAgentKitLoopbackHttpServer.AfterCompleteOperationBodyReadHookForTests = null;
                releaseClassification.Set();
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void StopWaitsForAcceptReservationBeforeClosingListener()
        {
            var registryPath = TemporaryRegistryPath("stop-waits-for-accept-reservation");
            var beforeGetContext = new ManualResetEventSlim(false);
            var releaseGetContext = new ManualResetEventSlim(false);

            try
            {
                UnityAgentKitLoopbackHttpServer.BeforeGetContextHookForTests = () =>
                {
                    beforeGetContext.Set();
                    Assert.IsTrue(releaseGetContext.Wait(1000), "Expected test to release GetContext entry.");
                };

                UnityAgentKitHost.StartForTests(registryPath);

                Assert.IsTrue(beforeGetContext.Wait(1000), "Expected listener to hold accept reservation before GetContext.");
                Assert.AreEqual(1, UnityAgentKitLoopbackHttpServer.AcceptReservationCountForTests);

                UnityAgentKitHost.StopForTests("host.stopped");

                Assert.IsFalse(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(100), "Close worker must wait while accept reservation is held.");
                releaseGetContext.Set();
                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000), "Expected listener to close after accept reservation release.");
            }
            finally
            {
                UnityAgentKitLoopbackHttpServer.BeforeGetContextHookForTests = null;
                releaseGetContext.Set();
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void StopRequestsWakeAndSignalsListenerLoopExited()
        {
            var registryPath = TemporaryRegistryPath("stop-wake-loop-exit");

            try
            {
                UnityAgentKitHost.StartForTests(registryPath);

                UnityAgentKitHost.StopForTests("host.stopped");

                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WakeRequestCountForTests >= 1, "Stop must issue a deterministic wake request.");
                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerLoopExitedForTests(1000), "Expected listener loop exit signal after Stop wake.");
                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000), "Expected close worker to close after listener loop exit.");
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void IncompleteAcceptedOperationBodyDoesNotBlockFinalClose()
        {
            var registryPath = TemporaryRegistryPath("operations-incomplete-body-non-guarantee");
            TcpClient client = null;

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                client = StartPartialOperationsPost(record.port, "{\"operation\":\"host.threadCheck\"", 200);

                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForAcceptedContextForTests(1000), "Expected listener to accept partial request.");
                UnityAgentKitHost.StopForTests("host.stopped");

                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000), "Incomplete body must not hold drain ownership or block final close.");
                Assert.AreEqual(0, UnityAgentKitLoopbackHttpServer.GuaranteedOperationHandlerCountForTests);
                Assert.AreEqual(0, UnityAgentKitLoopbackHttpServer.GuaranteedAsyncWriteCountForTests);
            }
            finally
            {
                client?.Close();
                UnityAgentKitHost.ResetForTests();
            }
        }

        [UnityTest]
        public IEnumerator WakeFallbackDoesNotCloseGuaranteedStoppedWrite()
        {
            var registryPath = TemporaryRegistryPath("wake-fallback-preserves-guaranteed-write");
            var guaranteedWriteHeld = new ManualResetEventSlim(false);
            var releaseGuaranteedWrite = new ManualResetEventSlim(false);
            BackgroundHttpRequest request = null;

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitLoopbackHttpServer.BeforeGuaranteedAsyncWriteForTests = () =>
                {
                    guaranteedWriteHeld.Set();
                    Assert.IsTrue(releaseGuaranteedWrite.Wait(1000), "Expected test to release guaranteed write.");
                };

                request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-wake-fallback-write\"}");
                yield return WaitForPendingDispatch();
                UnityAgentKitHost.StopForTests("host.stopped");

                Assert.IsTrue(guaranteedWriteHeld.Wait(1000), "Expected stopped envelope write to be held.");
                UnityAgentKitLoopbackHttpServer.ForceWakeFailureFallbackForTests();
                Assert.IsFalse(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(100), "Fallback must not close while guaranteed stopped write is held.");

                releaseGuaranteedWrite.Set();
                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000));
            }
            finally
            {
                UnityAgentKitLoopbackHttpServer.BeforeGuaranteedAsyncWriteForTests = null;
                releaseGuaranteedWrite.Set();
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void ClosingWindowAcceptedDirectOperationReturnsStoppedEnvelope()
        {
            var registryPath = TemporaryRegistryPath("operations-http-stop-window-direct-envelope");
            BackgroundHttpRequest stopWindowRequest = null;

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitLoopbackHttpServer.AfterBeginClosingHookForTests = () =>
                {
                    stopWindowRequest = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.echo\",\"requestId\":\"req-stop-window-direct\",\"inputJson\":\"{\\\"text\\\":\\\"closing\\\"}\"}");
                    Assert.IsTrue(stopWindowRequest.WaitUntilDone(1000), "Expected closing-window direct request to complete before listener close.");
                };

                UnityAgentKitHost.StopForTests("host.stopped");

                Assert.NotNull(stopWindowRequest);
                Assert.IsTrue(stopWindowRequest.IsDone);
                Assert.IsNull(stopWindowRequest.GetError());

                var stopWindowResult = stopWindowRequest.GetResult();
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(stopWindowResult.body);
                Assert.AreEqual(200, stopWindowResult.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "failed", "host.echo", "req-stop-window-direct", record);
                Assert.AreEqual("host.stopped", response.code);
                Assert.AreEqual(1, response.diagnostics.Length);
                Assert.AreEqual("host.stopped", response.diagnostics[0].code);
                Assert.AreNotEqual("succeeded", response.status);
            }
            finally
            {
                UnityAgentKitLoopbackHttpServer.AfterBeginClosingHookForTests = null;
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void ClosingWindowAcceptedDispatchReturnsStoppedEnvelopeBeforeListenerClose()
        {
            var registryPath = TemporaryRegistryPath("operations-http-stop-window-closing-envelope");
            BackgroundHttpRequest stopWindowRequest = null;

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitLoopbackHttpServer.AfterBeginClosingHookForTests = () =>
                {
                    stopWindowRequest = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.threadCheck\",\"requestId\":\"req-stop-window-closing\"}");
                    Assert.IsTrue(stopWindowRequest.WaitUntilDone(1000), "Expected closing-window request to complete before listener close.");
                };

                UnityAgentKitHost.StopForTests("host.stopped");

                Assert.NotNull(stopWindowRequest);
                Assert.IsTrue(stopWindowRequest.IsDone);
                Assert.IsNull(stopWindowRequest.GetError());

                var stopWindowResult = stopWindowRequest.GetResult();
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(stopWindowResult.body);
                Assert.AreEqual(200, stopWindowResult.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "failed", "host.threadCheck", "req-stop-window-closing", record);
                Assert.AreEqual("host.stopped", response.code);
                Assert.AreEqual(1, response.diagnostics.Length);
                Assert.AreEqual("host.stopped", response.diagnostics[0].code);
                Assert.AreNotEqual("timeout", response.status);
                Assert.AreNotEqual("host.dispatch_timeout", response.code);
                Assert.AreEqual(0, UnityAgentKitLoopbackHttpServer.ActiveHandlerCountForTests);
            }
            finally
            {
                UnityAgentKitLoopbackHttpServer.AfterBeginClosingHookForTests = null;
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void StopWindowDispatchDoesNotEnterNormalDispatchQueue()
        {
            var registryPath = TemporaryRegistryPath("operations-http-stop-window-no-enqueue");
            BackgroundHttpRequest stopWindowRequest = null;

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.ResetEnqueueInstrumentationForTests();
                UnityAgentKitLoopbackHttpServer.AfterBeginClosingHookForTests = () =>
                {
                    stopWindowRequest = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.threadCheck\",\"requestId\":\"req-stop-window-no-enqueue\"}");
                    Assert.IsTrue(stopWindowRequest.WaitUntilDone(1000), "Expected stop-window request to complete before listener close.");
                };

                UnityAgentKitHost.StopForTests("host.stopped");

                Assert.NotNull(stopWindowRequest);
                Assert.IsNull(stopWindowRequest.GetError());
                Assert.IsFalse(UnityAgentKitMainThread.WasRequestIdEnqueuedForTests("req-stop-window-no-enqueue"));
                Assert.AreEqual(0, UnityAgentKitMainThread.PendingDispatchCountForTests);
            }
            finally
            {
                UnityAgentKitLoopbackHttpServer.AfterBeginClosingHookForTests = null;
                UnityAgentKitHost.ResetForTests();
            }
        }

        [UnityTest]
        public IEnumerator HttpPendingDispatchOnReloadReturnsStoppedEnvelope()
        {
            var registryPath = TemporaryRegistryPath("operations-http-reload-pending");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(1000);
                var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-http-reload-pending\"}");

                yield return WaitForPendingDispatch();
                UnityAgentKitHost.StopForReloadForTests();
                yield return WaitForRequestDone(request);

                Assert.IsNull(request.GetError());
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(request.GetResult().body);
                Assert.AreEqual(200, request.GetResult().statusCode);
                AssertOperationEnvelopeMinimumFields(response, "failed", "host.pendingDispatchTimeout", "req-http-reload-pending", record);
                Assert.AreEqual("host.stopped_for_reload", response.code);
                Assert.AreNotEqual("timeout", response.status);
                Assert.AreNotEqual("host.dispatch_timeout", response.code);
            }
            finally
            {
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                UnityAgentKitHost.ResetForTests();
            }
        }

        [UnityTest]
        public IEnumerator HttpPendingDispatchOnEditorQuittingReturnsStoppedEnvelope()
        {
            var registryPath = TemporaryRegistryPath("operations-http-quitting-pending");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(1000);
                var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-http-quitting-pending\"}");

                yield return WaitForPendingDispatch();
                UnityAgentKitHost.StopForQuittingForTests();
                yield return WaitForRequestDone(request);

                Assert.IsNull(request.GetError());
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(request.GetResult().body);
                Assert.AreEqual(200, request.GetResult().statusCode);
                AssertOperationEnvelopeMinimumFields(response, "failed", "host.pendingDispatchTimeout", "req-http-quitting-pending", record);
                Assert.AreEqual("host.editor_quitting", response.code);
                Assert.AreNotEqual("timeout", response.status);
                Assert.AreNotEqual("host.dispatch_timeout", response.code);
            }
            finally
            {
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void StopFailsPendingDispatchWork()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            UnityAgentKitOperationResponse response = null;

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-stop-pending"
            }, TestHostRecord(49240), completed => response = completed);

            UnityAgentKitMainThread.Stop("host.stopped");

            AssertOperationEnvelopeMinimumFields(response, "failed", "host.threadCheck", "req-stop-pending", TestHostRecord(49240));
            Assert.AreEqual("host.stopped", response.code);
            Assert.AreEqual(0, UnityAgentKitMainThread.PendingDispatchCountForTests);
        }

        [Test]
        public void EnqueueAfterStopCompletesImmediatelyWithoutPendingDispatch()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            UnityAgentKitMainThread.Stop("host.stopped");
            UnityAgentKitOperationResponse response = null;

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-enqueue-after-stop"
            }, TestHostRecord(49244), completed => response = completed);

            AssertOperationEnvelopeMinimumFields(response, "failed", "host.threadCheck", "req-enqueue-after-stop", TestHostRecord(49244));
            Assert.AreEqual("host.stopped", response.code);
            Assert.AreEqual(1, response.diagnostics.Length);
            Assert.AreEqual("host.stopped", response.diagnostics[0].code);
            Assert.AreEqual(0, UnityAgentKitMainThread.PendingDispatchCountForTests);
        }

        [Test]
        public void StopFailsPendingWorkWithStoppedDiagnostic()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            UnityAgentKitOperationResponse response = null;

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-stopped-diagnostic"
            }, TestHostRecord(49241), completed => response = completed);

            UnityAgentKitMainThread.Stop("host.stopped");

            Assert.AreEqual("failed", response.status);
            Assert.AreEqual("host.stopped", response.code);
            Assert.AreEqual(1, response.diagnostics.Length);
            Assert.AreEqual("host.stopped", response.diagnostics[0].code);
            Assert.AreEqual("error", response.diagnostics[0].severity);
        }

        [Test]
        public void ReloadStopFailsPendingWorkWithoutTimeoutStatus()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            UnityAgentKitOperationResponse response = null;

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-reload-pending"
            }, TestHostRecord(49242), completed => response = completed);

            UnityAgentKitMainThread.Stop("host.stopped_for_reload");

            AssertOperationEnvelopeMinimumFields(response, "failed", "host.threadCheck", "req-reload-pending", TestHostRecord(49242));
            Assert.AreEqual("host.stopped_for_reload", response.code);
            Assert.AreNotEqual("timeout", response.status);
            Assert.AreNotEqual("host.dispatch_timeout", response.code);
        }

        [Test]
        public void QuittingStopFailsPendingWorkWithEditorQuittingDiagnostic()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            UnityAgentKitOperationResponse response = null;

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-quitting-pending"
            }, TestHostRecord(49243), completed => response = completed);

            UnityAgentKitMainThread.Stop("host.editor_quitting");

            AssertOperationEnvelopeMinimumFields(response, "failed", "host.threadCheck", "req-quitting-pending", TestHostRecord(49243));
            Assert.AreEqual("host.editor_quitting", response.code);
            Assert.AreEqual("host.editor_quitting", response.diagnostics[0].code);
        }

        private static BackgroundHttpRequest StartPostInBackground(string url, string body)
        {
            var request = new BackgroundHttpRequest();
            request.thread = new Thread(() =>
            {
                try
                {
                    request.SetResult(Post(url, body));
                }
                catch (Exception error)
                {
                    request.SetError(error);
                }
                finally
                {
                    request.MarkDone();
                }
            });
            request.thread.IsBackground = true;
            request.thread.Start();
            return request;
        }

        private static TcpClient StartPartialOperationsPost(int port, string partialBody, int declaredContentLength)
        {
            var client = new TcpClient("127.0.0.1", port);
            var payload = System.Text.Encoding.UTF8.GetBytes(
                "POST /operations HTTP/1.1\r\n" +
                "Host: 127.0.0.1:" + port + "\r\n" +
                "Content-Type: application/json\r\n" +
                "Content-Length: " + declaredContentLength + "\r\n" +
                "Connection: keep-alive\r\n" +
                "\r\n" +
                partialBody);
            client.GetStream().Write(payload, 0, payload.Length);
            return client;
        }

        private static IEnumerator WaitForPendingDispatch()
        {
            var deadline = DateTimeOffset.UtcNow.AddSeconds(2);
            while (UnityAgentKitMainThread.PendingDispatchCountForTests == 0 && DateTimeOffset.UtcNow < deadline)
            {
                yield return null;
            }

            Assert.Greater(UnityAgentKitMainThread.PendingDispatchCountForTests, 0);
        }

        private static IEnumerator WaitForRequestDone(BackgroundHttpRequest request)
        {
            var deadline = DateTimeOffset.UtcNow.AddSeconds(2);
            while (!request.IsDone && DateTimeOffset.UtcNow < deadline)
            {
                yield return null;
            }

            Assert.IsTrue(request.IsDone);
            Assert.IsNotNull(request.thread);
            Assert.IsTrue(request.thread.Join(1000));
        }

        private sealed class BackgroundHttpRequest
        {
            private readonly object syncRoot = new object();
            private readonly ManualResetEventSlim doneSignal = new ManualResetEventSlim(false);
            private Exception error;
            private HttpResult result;

            internal Thread thread;

            internal bool IsDone => doneSignal.IsSet;

            internal bool WaitUntilDone(int millisecondsTimeout)
            {
                if (!doneSignal.Wait(millisecondsTimeout))
                {
                    return false;
                }

                return thread == null || thread.Join(millisecondsTimeout);
            }

            internal Exception GetError()
            {
                lock (syncRoot)
                {
                    return error;
                }
            }

            internal HttpResult GetResult()
            {
                lock (syncRoot)
                {
                    return result;
                }
            }

            internal void SetError(Exception value)
            {
                lock (syncRoot)
                {
                    error = value;
                }
            }

            internal void SetResult(HttpResult value)
            {
                lock (syncRoot)
                {
                    result = value;
                }
            }

            internal void MarkDone()
            {
                doneSignal.Set();
            }
        }
    }
}
