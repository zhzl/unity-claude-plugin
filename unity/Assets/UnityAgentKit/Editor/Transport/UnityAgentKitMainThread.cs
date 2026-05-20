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
        }

        private static readonly object PendingLock = new object();
        private static readonly List<string> PendingLifecycleWork = new List<string>();
        private static readonly List<PendingDispatch> PendingDispatches = new List<PendingDispatch>();
        private static bool _drainRegistered;
        private static string _lastStopCode = string.Empty;
        private static int _capturedMainThreadId;
        private static int _dispatchTimeoutMs = 250;
        private static int _expiredDispatchExecutionCount;

        internal static bool IsDrainRegisteredForTests => _drainRegistered;
        internal static string LastStopCodeForTests => _lastStopCode;
        internal static int CapturedMainThreadIdForTests => _capturedMainThreadId;
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

        internal static void RegisterDrain()
        {
            _capturedMainThreadId = Thread.CurrentThread.ManagedThreadId;
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
            var item = new PendingDispatch(request, record, complete);
            item.holdForTimeout = UnityAgentKitOperationRouter.NormalizeOperation(request != null ? request.operation : string.Empty) == UnityAgentKitOperationRouter.PendingDispatchTimeoutOperation;
            item.timeoutTimer = new Timer(_ => TryComplete(item, UnityAgentKitOperationRouter.DispatchTimeout(item.request, item.record)), null, Timeout.Infinite, Timeout.Infinite);

            lock (PendingLock)
            {
                PendingDispatches.Add(item);
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

        internal static void Stop(string reasonCode)
        {
            List<PendingDispatch> pendingDispatches;
            EditorApplication.update -= Drain;
            _drainRegistered = false;
            _lastStopCode = string.IsNullOrEmpty(reasonCode) ? "host.stopped" : reasonCode;
            lock (PendingLock)
            {
                PendingLifecycleWork.Clear();
                pendingDispatches = new List<PendingDispatch>(PendingDispatches);
                PendingDispatches.Clear();
                foreach (var item in pendingDispatches)
                {
                    item.completed = true;
                    item.cancelled = true;
                }
            }

            foreach (var item in pendingDispatches)
            {
                item.timeoutTimer?.Dispose();
            }
        }

        internal static void ResetForTests()
        {
            Stop("host.stopped");
            _lastStopCode = string.Empty;
            _capturedMainThreadId = Thread.CurrentThread.ManagedThreadId;
            _dispatchTimeoutMs = 250;
            _expiredDispatchExecutionCount = 0;
        }

        private static void Drain()
        {
            List<PendingDispatch> work = null;
            lock (PendingLock)
            {
                if (PendingDispatches.Count == 0)
                {
                    return;
                }

                for (var i = 0; i < PendingDispatches.Count; i += 1)
                {
                    var item = PendingDispatches[i];
                    if (item.holdForTimeout)
                    {
                        continue;
                    }

                    if (work == null)
                    {
                        work = new List<PendingDispatch>();
                    }

                    work.Add(item);
                }
            }

            if (work == null)
            {
                return;
            }

            foreach (var item in work)
            {
                if (item.completed)
                {
                    if (!item.cancelled)
                    {
                        Interlocked.Increment(ref _expiredDispatchExecutionCount);
                    }

                    continue;
                }

                try
                {
                    var response = UnityAgentKitOperationRouter.RunOnMainThread(item.request, item.record, _capturedMainThreadId);
                    TryComplete(item, response);
                }
                catch (Exception error)
                {
                    TryComplete(item, UnityAgentKitOperationRouter.DispatchException(item.request, item.record, error));
                }
            }
        }

        private static bool TryComplete(PendingDispatch item, UnityAgentKitOperationResponse response)
        {
            lock (PendingLock)
            {
                if (item.completed)
                {
                    return false;
                }

                if (!PendingDispatches.Remove(item))
                {
                    item.completed = true;
                    return false;
                }

                item.completed = true;
            }

            item.timeoutTimer?.Dispose();

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
