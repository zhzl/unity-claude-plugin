using System;
using System.Collections.Generic;
using System.Threading;
using UnityEditor;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitMainThread
    {
        private sealed class PendingDispatch
        {
            internal PendingDispatch(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record, Action<UnityAgentKitOperationResponse> complete)
            {
                this.request = request;
                this.record = record;
                this.complete = complete;
            }

            internal readonly UnityAgentKitOperationRequest request;
            internal readonly UnityAgentKitHostRecord record;
            internal readonly Action<UnityAgentKitOperationResponse> complete;
            internal Timer timeoutTimer;
            internal bool completed;
            internal bool cancelled;
            internal bool holdForTimeout;
            internal bool claimed;
            internal Action cancelClaimedWork;
            internal UnityAgentKitOperationResponse timeoutResponse;
        }

        private static readonly object PendingLock = new object();
        private static readonly List<string> PendingLifecycleWork = new List<string>();
        private static readonly List<PendingDispatch> PendingDispatches = new List<PendingDispatch>();
        private static readonly List<string> EnqueuedRequestIdsForTests = new List<string>();
        private static bool _drainRegistered;
        private static bool _isAcceptingDispatches;
        private static string _lastStopCode = string.Empty;
        private static int _capturedMainThreadId;
        private static int _dispatchTimeoutMs = 250;
        private static int _expiredDispatchExecutionCount;
        private static PendingDispatch _currentClaimedDispatchForTests;

        internal static Action<string> BeforeRunClaimedDispatchForTests;

        internal static bool IsDrainRegisteredForTests => _drainRegistered;
        internal static string LastStopCodeForTests => _lastStopCode;
        internal static int CapturedMainThreadIdForTests => _capturedMainThreadId;
        internal static bool IsCapturedMainThread => _capturedMainThreadId != 0 && Thread.CurrentThread.ManagedThreadId == _capturedMainThreadId;
        internal static int ExpiredDispatchExecutionCountForTests => _expiredDispatchExecutionCount;

        internal static int PendingLifecycleWorkCountForTests
        {
            get
            {
                lock (PendingLock)
                {
                    return PendingLifecycleWork.Count;
                }
            }
        }

        internal static int PendingDispatchCountForTests
        {
            get
            {
                lock (PendingLock)
                {
                    return PendingDispatches.Count;
                }
            }
        }

        internal static void ResetEnqueueInstrumentationForTests()
        {
            lock (PendingLock)
            {
                EnqueuedRequestIdsForTests.Clear();
            }
        }

        internal static bool WasRequestIdEnqueuedForTests(string requestId)
        {
            lock (PendingLock)
            {
                return EnqueuedRequestIdsForTests.Contains(requestId ?? string.Empty);
            }
        }

        internal static bool IsCurrentClaimedDispatchForTests(string requestId)
        {
            lock (PendingLock)
            {
                if (_currentClaimedDispatchForTests == null)
                {
                    return false;
                }

                var currentRequestId = _currentClaimedDispatchForTests.request != null ? _currentClaimedDispatchForTests.request.requestId ?? string.Empty : string.Empty;
                return currentRequestId == (requestId ?? string.Empty);
            }
        }

        internal static void RegisterDrain()
        {
            lock (PendingLock)
            {
                _capturedMainThreadId = Thread.CurrentThread.ManagedThreadId;
                _isAcceptingDispatches = true;
            }

            EditorApplication.update -= Drain;
            EditorApplication.update += Drain;
            _drainRegistered = true;
        }

        internal static void ConfigureDispatchTimeoutForTests(int timeoutMs)
        {
            _dispatchTimeoutMs = timeoutMs;
        }

        internal static void Enqueue(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record, Action<UnityAgentKitOperationResponse> complete)
        {
            PendingDispatch item = null;
            string stopCode = null;

            lock (PendingLock)
            {
                if (!_isAcceptingDispatches)
                {
                    stopCode = _lastStopCode;
                }
                else
                {
                    item = new PendingDispatch(request, record, complete);
                    item.holdForTimeout = UnityAgentKitOperationRouter.NormalizeOperation(request != null ? request.operation : string.Empty) == UnityAgentKitOperationRouter.PendingDispatchTimeoutOperation;
                    item.timeoutTimer = new Timer(_ => TryCompleteDispatchTimeout(item), null, Timeout.Infinite, Timeout.Infinite);
                    PendingDispatches.Add(item);
                    EnqueuedRequestIdsForTests.Add(request != null ? request.requestId ?? string.Empty : string.Empty);
                }
            }

            if (item == null)
            {
                try
                {
                    complete?.Invoke(UnityAgentKitOperationRouter.Stopped(request, record, stopCode));
                }
                catch (Exception)
                {
                }

                return;
            }

            try
            {
                item.timeoutTimer.Change(_dispatchTimeoutMs, Timeout.Infinite);
            }
            catch (ObjectDisposedException)
            {
            }
        }

        internal static void DrainForTests()
        {
            Drain();
        }

        internal static void EnqueueLifecycleWorkForTests(string itemId)
        {
            lock (PendingLock)
            {
                PendingLifecycleWork.Add(itemId ?? string.Empty);
            }
        }

        internal static bool ForceDispatchTimeoutForTests(string requestId)
        {
            PendingDispatch item = null;
            lock (PendingLock)
            {
                for (var i = 0; i < PendingDispatches.Count; i += 1)
                {
                    var candidate = PendingDispatches[i];
                    var candidateRequestId = candidate.request != null ? candidate.request.requestId ?? string.Empty : string.Empty;
                    if (candidateRequestId == (requestId ?? string.Empty))
                    {
                        item = candidate;
                        break;
                    }
                }

                if (item == null && _currentClaimedDispatchForTests != null)
                {
                    var currentRequestId = _currentClaimedDispatchForTests.request != null ? _currentClaimedDispatchForTests.request.requestId ?? string.Empty : string.Empty;
                    if (currentRequestId == (requestId ?? string.Empty))
                    {
                        item = _currentClaimedDispatchForTests;
                    }
                }
            }

            return item != null && TryCompleteDispatchTimeout(item);
        }

        internal static void Stop(string reasonCode)
        {
            List<PendingDispatch> pendingDispatches;
            string stopCode;
            EditorApplication.update -= Drain;
            _drainRegistered = false;
            lock (PendingLock)
            {
                _isAcceptingDispatches = false;
                _lastStopCode = string.IsNullOrEmpty(reasonCode) ? "host.stopped" : reasonCode;
                stopCode = _lastStopCode;
                PendingLifecycleWork.Clear();
                pendingDispatches = new List<PendingDispatch>(PendingDispatches);
                if (_currentClaimedDispatchForTests != null && !ContainsReference(pendingDispatches, _currentClaimedDispatchForTests))
                {
                    pendingDispatches.Add(_currentClaimedDispatchForTests);
                }

                PendingDispatches.Clear();
                _currentClaimedDispatchForTests = null;
                foreach (var item in pendingDispatches)
                {
                    item.cancelled = true;
                }
            }

            foreach (var item in pendingDispatches)
            {
                TryComplete(item, UnityAgentKitOperationRouter.Stopped(item.request, item.record, stopCode), ownsItem: true, cancelClaimedWork: true);
            }
        }

        internal static void ResetForTests()
        {
            Stop("host.stopped");
            _lastStopCode = string.Empty;
            _capturedMainThreadId = Thread.CurrentThread.ManagedThreadId;
            _dispatchTimeoutMs = 250;
            _expiredDispatchExecutionCount = 0;
            _currentClaimedDispatchForTests = null;
            BeforeRunClaimedDispatchForTests = null;
            ResetEnqueueInstrumentationForTests();
        }

        private static void Drain()
        {
            var claimableCount = CountClaimableDispatches();
            if (claimableCount == 0)
            {
                return;
            }

            for (var i = 0; i < claimableCount; i += 1)
            {
                var item = TryClaimNextDispatch();
                if (item == null)
                {
                    return;
                }

                SetCurrentClaimedDispatchForTests(item);
                BeforeRunClaimedDispatchForTests?.Invoke(item.request != null ? item.request.requestId ?? string.Empty : string.Empty);
                if (IsDispatchCancelled(item))
                {
                    ClearCurrentClaimedDispatchForTests(item);
                    continue;
                }

                try
                {
                    if (UnityAgentKitOperationRouter.TryRunOnMainThreadAsync(
                        item.request,
                        item.record,
                        _capturedMainThreadId,
                        response => TryComplete(item, response, ownsItem: true),
                        out var cancelClaimedWork,
                        () => IsDispatchCancelled(item)))
                    {
                        SetCancelClaimedWork(item, cancelClaimedWork);
                        continue;
                    }

                    var response = UnityAgentKitOperationRouter.RunOnMainThread(item.request, item.record, _capturedMainThreadId);
                    TryComplete(item, response, ownsItem: true);
                }
                catch (Exception error)
                {
                    TryComplete(item, UnityAgentKitOperationRouter.DispatchException(item.request, item.record, error), ownsItem: true, cancelClaimedWork: true);
                }
                finally
                {
                    ClearCurrentClaimedDispatchForTests(item);
                }
            }
        }

        private static bool IsDispatchCancelled(PendingDispatch item)
        {
            lock (PendingLock)
            {
                return item == null || item.cancelled || item.completed || !_isAcceptingDispatches;
            }
        }

        private static int CountClaimableDispatches()
        {
            lock (PendingLock)
            {
                var count = 0;
                for (var i = 0; i < PendingDispatches.Count; i += 1)
                {
                    if (!PendingDispatches[i].holdForTimeout && !PendingDispatches[i].claimed)
                    {
                        count += 1;
                    }
                }

                return count;
            }
        }

        private static PendingDispatch TryClaimNextDispatch()
        {
            lock (PendingLock)
            {
                for (var i = 0; i < PendingDispatches.Count; i += 1)
                {
                    var item = PendingDispatches[i];
                    if (item.holdForTimeout)
                    {
                        continue;
                    }

                    if (item.claimed)
                    {
                        continue;
                    }

                    item.claimed = true;
                    return item;
                }
            }

            return null;
        }

        private static void SetCurrentClaimedDispatchForTests(PendingDispatch item)
        {
            lock (PendingLock)
            {
                _currentClaimedDispatchForTests = item;
            }
        }

        private static void ClearCurrentClaimedDispatchForTests(PendingDispatch item)
        {
            lock (PendingLock)
            {
                if (ReferenceEquals(_currentClaimedDispatchForTests, item))
                {
                    _currentClaimedDispatchForTests = null;
                }
            }
        }

        private static void SetCancelClaimedWork(PendingDispatch item, Action cancel)
        {
            if (cancel == null)
            {
                return;
            }

            var cancelNow = false;
            UnityAgentKitOperationResponse timeoutResponse = null;
            lock (PendingLock)
            {
                if (item == null || item.completed || item.cancelled || !_isAcceptingDispatches)
                {
                    cancelNow = true;
                }
                else
                {
                    item.cancelClaimedWork = cancel;
                    timeoutResponse = item.timeoutResponse;
                    item.timeoutResponse = null;
                }
            }

            if (cancelNow)
            {
                InvokeCancel(cancel);
                return;
            }

            if (timeoutResponse != null)
            {
                TryComplete(item, timeoutResponse, cancelClaimedWork: true);
            }
        }

        private static Action TakeCancelClaimedWork(PendingDispatch item)
        {
            if (item == null)
            {
                return null;
            }

            var cancel = item.cancelClaimedWork;
            item.cancelClaimedWork = null;
            return cancel;
        }

        private static void InvokeCancel(Action cancel)
        {
            try
            {
                cancel?.Invoke();
            }
            catch (Exception)
            {
            }
        }

        private static bool ContainsReference(List<PendingDispatch> items, PendingDispatch item)
        {
            for (var i = 0; i < items.Count; i += 1)
            {
                if (ReferenceEquals(items[i], item))
                {
                    return true;
                }
            }

            return false;
        }

        private static bool TryCompleteDispatchTimeout(PendingDispatch item)
        {
            if (item == null)
            {
                return false;
            }

            var response = UnityAgentKitOperationRouter.DispatchTimeout(item.request, item.record);
            lock (PendingLock)
            {
                if (!item.completed && item.claimed && item.cancelClaimedWork == null)
                {
                    item.timeoutResponse = response;
                    return false;
                }
            }

            return TryComplete(item, response, cancelClaimedWork: true);
        }

        private static bool TryComplete(PendingDispatch item, UnityAgentKitOperationResponse response, bool ownsItem = false, bool cancelClaimedWork = false)
        {
            Action cancel = null;
            lock (PendingLock)
            {
                if (item.completed)
                {
                    return false;
                }

                if (ownsItem)
                {
                    PendingDispatches.Remove(item);
                }
                else
                {
                    if (item.claimed && !(cancelClaimedWork && item.cancelClaimedWork != null))
                    {
                        return false;
                    }

                    if (!PendingDispatches.Remove(item))
                    {
                        if (item.cancelled)
                        {
                            return false;
                        }

                        item.completed = true;
                        return false;
                    }
                }

                item.completed = true;
                item.timeoutResponse = null;
                cancel = cancelClaimedWork ? TakeCancelClaimedWork(item) : null;
                if (!cancelClaimedWork)
                {
                    item.cancelClaimedWork = null;
                }
            }

            item.timeoutTimer?.Dispose();
            InvokeCancel(cancel);

            try
            {
                item.complete?.Invoke(response);
            }
            catch (Exception)
            {
            }

            return true;
        }
    }
}
