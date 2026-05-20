using System.Collections.Generic;
using UnityEditor;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitMainThread
    {
        private static readonly object PendingLock = new object();
        private static readonly List<string> PendingLifecycleWork = new List<string>();
        private static bool _drainRegistered;
        private static string _lastStopCode = string.Empty;

        internal static bool IsDrainRegisteredForTests => _drainRegistered;
        internal static string LastStopCodeForTests => _lastStopCode;

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

        internal static void RegisterDrain()
        {
            EditorApplication.update -= Drain;
            EditorApplication.update += Drain;
            _drainRegistered = true;
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
            }
        }

        internal static void ResetForTests()
        {
            Stop("host.stopped");
            _lastStopCode = string.Empty;
        }

        private static void Drain()
        {
        }
    }
}
