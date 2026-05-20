using System;
using System.Net;
using System.Net.Sockets;
using UnityEditor;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    [InitializeOnLoad]
    internal static class UnityAgentKitHost
    {
        private const double RetryDelaySeconds = 2.0;
        private static bool _started;
        private static int _lastKnownEpoch = -1;
        private static double _nextStartAttemptAt;
        private static UnityAgentKitHostRecord _currentRecord;
        private static string _registryPathForTests;

        static UnityAgentKitHost()
        {
            RegisterCallbacks();
        }

        internal static bool IsStartedForTests => _started;
        internal static UnityAgentKitHostRecord CurrentRecordForTests => _currentRecord;

        internal static void RegisterCallbacks()
        {
            AssemblyReloadEvents.beforeAssemblyReload -= StopForReload;
            AssemblyReloadEvents.beforeAssemblyReload += StopForReload;
            EditorApplication.quitting -= StopForQuitting;
            EditorApplication.quitting += StopForQuitting;
            EditorApplication.update -= Tick;
            EditorApplication.update += Tick;
        }

        internal static bool ShouldSkipStart(bool started, bool serverRunning, bool isCompiling, bool isUpdating)
        {
            return (started && serverRunning) || isCompiling || isUpdating;
        }

        internal static void TickForTests(bool isCompiling, bool isUpdating, double now, string registryPath)
        {
            SetRegistryPathForTests(registryPath);
            Tick(isCompiling, isUpdating, now);
        }

        internal static UnityAgentKitHostRecord StartForTests(string registryPath)
        {
            SetRegistryPathForTests(registryPath);
            return StartHost();
        }

        internal static void StopForTests(string reasonCode)
        {
            Stop(reasonCode);
        }

        internal static void StopForReloadForTests()
        {
            StopForReload();
        }

        internal static void StopForQuittingForTests()
        {
            StopForQuitting();
        }

        internal static void ResetForTests()
        {
            Stop("host.stopped");
            _lastKnownEpoch = -1;
            _nextStartAttemptAt = 0;
            _registryPathForTests = null;
        }

        private static void Tick()
        {
            Tick(EditorApplication.isCompiling, EditorApplication.isUpdating, EditorApplication.timeSinceStartup);
        }

        private static void SetRegistryPathForTests(string registryPath)
        {
            if (string.Equals(_registryPathForTests, registryPath, StringComparison.Ordinal))
            {
                return;
            }

            Stop("host.stopped");
            _lastKnownEpoch = -1;
            _nextStartAttemptAt = 0;
            _registryPathForTests = registryPath;
        }

        private static void Tick(bool isCompiling, bool isUpdating, double now)
        {
            if (ShouldSkipStart(_started, UnityAgentKitLoopbackHttpServer.IsRunning, isCompiling, isUpdating))
            {
                return;
            }

            if (now < _nextStartAttemptAt)
            {
                return;
            }

            try
            {
                StartHost();
                _nextStartAttemptAt = 0;
            }
            catch (Exception error)
            {
                _nextStartAttemptAt = now + RetryDelaySeconds;
                Debug.LogWarning("[UnityAgentKit] Failed to start host; retrying in " + RetryDelaySeconds + " seconds. " + error.Message);
            }
        }

        private static UnityAgentKitHostRecord StartHost()
        {
            var previousEpoch = _lastKnownEpoch >= 0
                ? _lastKnownEpoch
                : UnityAgentKitHostRegistry.ReadExistingEpoch(_registryPathForTests);
            var record = UnityAgentKitHostRegistry.CreateRecord(SelectDynamicPort(), previousEpoch);
            UnityAgentKitLoopbackHttpServer.Start(record);
            UnityAgentKitHostRegistry.WriteRecord(record, _registryPathForTests);
            _currentRecord = record;
            _lastKnownEpoch = record.hostEpoch;
            _started = true;
            return record;
        }

        private static int SelectDynamicPort()
        {
            var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            try
            {
                return ((IPEndPoint)listener.LocalEndpoint).Port;
            }
            finally
            {
                listener.Stop();
            }
        }

        private static void StopForReload()
        {
            Stop("host.stopped_for_reload");
        }

        private static void StopForQuitting()
        {
            Stop("host.editor_quitting");
        }

        private static void Stop(string reasonCode)
        {
            UnityAgentKitLoopbackHttpServer.Stop(reasonCode);
            _currentRecord = null;
            _started = false;
        }
    }
}
