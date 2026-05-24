using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class CoreDiagnosticsTests
    {
        [Test]
        public void EditorStatusResultRoundTripsReadinessFields()
        {
            var result = new UnityAgentKitEditorStatusResult
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                isCompiling = false,
                isUpdating = false,
                isPlaying = true,
                isPlayingOrWillChangePlaymode = true,
                isPlayModeChanging = false,
                isReady = true,
                capturedMainThreadId = 7,
                executionThreadId = 7
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitEditorStatusResult>(JsonUtility.ToJson(result));

            Assert.AreEqual("D:/repo/unity", roundTrip.projectRoot);
            Assert.AreEqual("2022.3.61f1", roundTrip.unityVersion);
            Assert.IsFalse(roundTrip.isCompiling);
            Assert.IsFalse(roundTrip.isUpdating);
            Assert.IsTrue(roundTrip.isPlaying);
            Assert.IsTrue(roundTrip.isPlayingOrWillChangePlaymode);
            Assert.IsFalse(roundTrip.isPlayModeChanging);
            Assert.IsTrue(roundTrip.isReady);
            Assert.AreEqual(7, roundTrip.capturedMainThreadId);
            Assert.AreEqual(7, roundTrip.executionThreadId);
        }

        [Test]
        public void EditorStatusOperationRequiresMainThreadDispatch()
        {
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" editor.status.get "));

            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "editor.status.get",
                requestId = "req-editor-direct"
            }, TestHostRecord());

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual("editor.status.get", response.operation);
            Assert.AreEqual("host.dispatch_required", response.code);
        }

        [Test]
        public void EditorStatusOperationReturnsRealSnapshotOnMainThread()
        {
            var record = TestHostRecord();
            var currentThreadId = System.Threading.Thread.CurrentThread.ManagedThreadId;

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "editor.status.get",
                requestId = "req-editor-status"
            }, record, currentThreadId);

            AssertOperationEnvelopeMinimumFields(response, "succeeded", "editor.status.get", "req-editor-status", record);
            Assert.AreEqual(string.Empty, response.code);
            Assert.AreEqual(0, response.diagnostics.Length);

            var data = JsonUtility.FromJson<UnityAgentKitEditorStatusResult>(response.data);
            var expectedIsPlayModeChanging = EditorApplication.isPlayingOrWillChangePlaymode != EditorApplication.isPlaying;

            Assert.AreEqual(UnityAgentKitHostRegistry.GetProjectRoot(), data.projectRoot);
            Assert.AreEqual(Application.unityVersion, data.unityVersion);
            Assert.AreEqual(EditorApplication.isCompiling, data.isCompiling);
            Assert.AreEqual(EditorApplication.isUpdating, data.isUpdating);
            Assert.AreEqual(EditorApplication.isPlaying, data.isPlaying);
            Assert.AreEqual(EditorApplication.isPlayingOrWillChangePlaymode, data.isPlayingOrWillChangePlaymode);
            Assert.AreEqual(expectedIsPlayModeChanging, data.isPlayModeChanging);
            Assert.AreEqual(!EditorApplication.isCompiling && !EditorApplication.isUpdating && !expectedIsPlayModeChanging, data.isReady);
            Assert.AreEqual(currentThreadId, data.capturedMainThreadId);
            Assert.AreEqual(currentThreadId, data.executionThreadId);
        }

        private static UnityAgentKitHostRecord TestHostRecord()
        {
            return new UnityAgentKitHostRecord
            {
                hostName = UnityAgentKitHostRegistry.HostName,
                protocolVersion = UnityAgentKitHostRegistry.ProtocolVersion,
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "host-editor-tests",
                hostEpoch = 7,
                port = 49220,
                status = UnityAgentKitHostRegistry.ReadyStatus,
                startedAt = "2026-05-23T10:00:00.0000000Z",
                lastProbeAt = "2026-05-23T10:00:01.0000000Z"
            };
        }

        private static void AssertOperationEnvelopeMinimumFields(UnityAgentKitOperationResponse response, string status, string operation, string requestId, UnityAgentKitHostRecord record)
        {
            Assert.NotNull(response);
            Assert.AreEqual(status, response.status);
            Assert.AreEqual(operation, response.operation);
            Assert.AreEqual(requestId, response.requestId);
            Assert.AreEqual(record.hostId, response.hostId);
            Assert.AreEqual(record.hostEpoch, response.hostEpoch);
            Assert.IsNotEmpty(response.summary);
            Assert.IsNotEmpty(response.startedAt);
            Assert.IsNotEmpty(response.completedAt);
            Assert.GreaterOrEqual(response.durationMs, 0);
        }
    }
}
