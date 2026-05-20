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
        }

        private static readonly object PendingLock = new object();
        private static readonly List<string> PendingLifecycleWork = new List<string>();
        private static readonly List<PendingDispatch> PendingDispatches = new List<PendingDispatch>();
        private static bool _drainRegistered;
        private static string _lastStopCode = string.Empty;
        private static int _capturedMainThreadId;

        internal static bool IsDrainRegisteredForTests => _drainRegistered;
        internal static string LastStopCodeForTests => _lastStopCode;
        internal static int CapturedMainThreadIdForTests => _capturedMainThreadId;

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

        internal static void Enqueue(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record, Action<UnityAgentKitOperationResponse> complete)
        {
            lock (PendingLock)
            {
                PendingDispatches.Add(new PendingDispatch(request, record, complete));
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
            EditorApplication.update -= Drain;
            _drainRegistered = false;
            _lastStopCode = string.IsNullOrEmpty(reasonCode) ? "host.stopped" : reasonCode;
            lock (PendingLock)
            {
                PendingLifecycleWork.Clear();
                PendingDispatches.Clear();
            }
        }

        internal static void ResetForTests()
        {
            Stop("host.stopped");
            _lastStopCode = string.Empty;
            _capturedMainThreadId = Thread.CurrentThread.ManagedThreadId;
        }

        private static void Drain()
        {
            List<PendingDispatch> work;
            lock (PendingLock)
            {
                if (PendingDispatches.Count == 0)
                {
                    return;
                }

                work = new List<PendingDispatch>(PendingDispatches);
                PendingDispatches.Clear();
            }

            foreach (var item in work)
            {
                UnityAgentKitOperationResponse response;
                try
                {
                    response = UnityAgentKitOperationRouter.RunOnMainThread(item.request, item.record, _capturedMainThreadId);
                }
                catch (Exception error)
                {
                    response = UnityAgentKitOperationRouter.DispatchException(item.request, item.record, error);
                }

                item.complete?.Invoke(response);
            }
        }
    }
}
