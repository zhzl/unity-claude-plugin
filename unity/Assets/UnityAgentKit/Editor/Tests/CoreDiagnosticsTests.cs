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

        [Test]
        public void CompileStateResultRoundTripsReadinessFields()
        {
            var result = new UnityAgentKitCompileStateResult
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                isCompiling = false,
                isUpdating = true,
                isIdle = false,
                invalidationToken = 4,
                hasRecentCompileReport = false,
                recentCompileReportId = string.Empty,
                capturedMainThreadId = 7,
                executionThreadId = 7
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitCompileStateResult>(JsonUtility.ToJson(result));

            Assert.AreEqual("D:/repo/unity", roundTrip.projectRoot);
            Assert.AreEqual("2022.3.61f1", roundTrip.unityVersion);
            Assert.IsFalse(roundTrip.isCompiling);
            Assert.IsTrue(roundTrip.isUpdating);
            Assert.IsFalse(roundTrip.isIdle);
            Assert.AreEqual(4, roundTrip.invalidationToken);
            Assert.IsFalse(roundTrip.hasRecentCompileReport);
            Assert.AreEqual(string.Empty, roundTrip.recentCompileReportId);
            Assert.AreEqual(7, roundTrip.capturedMainThreadId);
            Assert.AreEqual(7, roundTrip.executionThreadId);
        }

        [Test]
        public void CompileRequestResultRoundTripsAcceptedAndNoOpFields()
        {
            var result = new UnityAgentKitCompileRequestResult
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                requested = true,
                noOpReason = string.Empty,
                usedAssetDatabaseRefresh = true,
                usedCompilationPipeline = true,
                invalidationTokenBeforeRequest = 4,
                invalidationTokenAfterRequest = 5,
                isCompiling = false,
                isUpdating = false,
                capturedMainThreadId = 7,
                executionThreadId = 7
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitCompileRequestResult>(JsonUtility.ToJson(result));

            Assert.AreEqual("D:/repo/unity", roundTrip.projectRoot);
            Assert.AreEqual("2022.3.61f1", roundTrip.unityVersion);
            Assert.IsTrue(roundTrip.requested);
            Assert.AreEqual(string.Empty, roundTrip.noOpReason);
            Assert.IsTrue(roundTrip.usedAssetDatabaseRefresh);
            Assert.IsTrue(roundTrip.usedCompilationPipeline);
            Assert.AreEqual(4, roundTrip.invalidationTokenBeforeRequest);
            Assert.AreEqual(5, roundTrip.invalidationTokenAfterRequest);
            Assert.IsFalse(roundTrip.isCompiling);
            Assert.IsFalse(roundTrip.isUpdating);
            Assert.AreEqual(7, roundTrip.capturedMainThreadId);
            Assert.AreEqual(7, roundTrip.executionThreadId);
        }

        [Test]
        public void CompileOperationsRequireMainThreadDispatch()
        {
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" compile.state.get "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" compile.request "));

            var stateResponse = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "compile.state.get",
                requestId = "req-compile-state-direct"
            }, TestHostRecord());
            var requestResponse = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "compile.request",
                requestId = "req-compile-request-direct"
            }, TestHostRecord());

            Assert.AreEqual("rejected", stateResponse.status);
            Assert.AreEqual("host.dispatch_required", stateResponse.code);
            Assert.AreEqual("rejected", requestResponse.status);
            Assert.AreEqual("host.dispatch_required", requestResponse.code);
        }

        [Test]
        public void CompileStateOperationReturnsRealSnapshotOnMainThread()
        {
            var record = TestHostRecord();
            var currentThreadId = System.Threading.Thread.CurrentThread.ManagedThreadId;

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "compile.state.get",
                requestId = "req-compile-state"
            }, record, currentThreadId);

            AssertOperationEnvelopeMinimumFields(response, "succeeded", "compile.state.get", "req-compile-state", record);
            Assert.AreEqual(string.Empty, response.code);
            Assert.AreEqual(0, response.diagnostics.Length);

            var data = JsonUtility.FromJson<UnityAgentKitCompileStateResult>(response.data);
            Assert.AreEqual(UnityAgentKitHostRegistry.GetProjectRoot(), data.projectRoot);
            Assert.AreEqual(Application.unityVersion, data.unityVersion);
            Assert.AreEqual(EditorApplication.isCompiling, data.isCompiling);
            Assert.AreEqual(EditorApplication.isUpdating, data.isUpdating);
            Assert.AreEqual(!EditorApplication.isCompiling && !EditorApplication.isUpdating, data.isIdle);
            Assert.GreaterOrEqual(data.invalidationToken, 0);
            Assert.IsFalse(data.hasRecentCompileReport);
            Assert.AreEqual(currentThreadId, data.capturedMainThreadId);
            Assert.AreEqual(currentThreadId, data.executionThreadId);
        }

        [Test]
        public void CompileRequestOperationReturnsResultOnMainThread()
        {
            var record = TestHostRecord();
            var currentThreadId = System.Threading.Thread.CurrentThread.ManagedThreadId;
            const string requestId = "req-compile-request";

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "compile.request",
                requestId = requestId
            }, record, currentThreadId);

            AssertOperationEnvelopeMinimumFields(response, "succeeded", "compile.request", requestId, record);
            Assert.AreEqual(string.Empty, response.code);
            Assert.AreEqual(0, response.diagnostics.Length);

            var data = JsonUtility.FromJson<UnityAgentKitCompileRequestResult>(response.data);
            Assert.AreEqual(UnityAgentKitHostRegistry.GetProjectRoot(), data.projectRoot);
            Assert.AreEqual(Application.unityVersion, data.unityVersion);
            Assert.AreEqual(currentThreadId, data.capturedMainThreadId);
            Assert.AreEqual(currentThreadId, data.executionThreadId);
            Assert.GreaterOrEqual(data.invalidationTokenAfterRequest, data.invalidationTokenBeforeRequest);

            if (!data.requested)
            {
                Assert.AreEqual("already_compiling_or_updating", data.noOpReason);
                Assert.IsFalse(data.usedAssetDatabaseRefresh);
                Assert.IsFalse(data.usedCompilationPipeline);
            }
        }

        [TestCase(true, false)]
        [TestCase(false, true)]
        public void CompileRequestBusyGuardReturnsNoOpWithoutRefreshOrRequest(bool isCompiling, bool isUpdating)
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var refreshCalls = 0;
            var requestCalls = 0;
            var result = UnityAgentKitCompileDiagnostics.RequestCompileForTests(
                string.Empty,
                7,
                isCompiling: isCompiling,
                isUpdating: isUpdating,
                refreshAssetDatabase: () => refreshCalls += 1,
                requestScriptCompilation: () => requestCalls += 1);

            Assert.IsFalse(result.requested);
            Assert.AreEqual("already_compiling_or_updating", result.noOpReason);
            Assert.IsFalse(result.usedAssetDatabaseRefresh);
            Assert.IsFalse(result.usedCompilationPipeline);
            Assert.AreEqual(0, refreshCalls);
            Assert.AreEqual(0, requestCalls);
            Assert.AreEqual(result.invalidationTokenBeforeRequest, result.invalidationTokenAfterRequest);
            Assert.AreEqual(isCompiling, result.isCompiling);
            Assert.AreEqual(isUpdating, result.isUpdating);
        }

        [Test]
        public void CompileRequestIdleRefreshesAssetsRequestsCompilationAndIncrementsToken()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var refreshCalls = 0;
            var requestCalls = 0;
            var result = UnityAgentKitCompileDiagnostics.RequestCompileForTests(
                "{\"reason\":\"unit-test\"}",
                7,
                isCompiling: false,
                isUpdating: false,
                refreshAssetDatabase: () => refreshCalls += 1,
                requestScriptCompilation: () => requestCalls += 1);

            Assert.IsTrue(result.requested);
            Assert.AreEqual(string.Empty, result.noOpReason);
            Assert.IsTrue(result.usedAssetDatabaseRefresh);
            Assert.IsTrue(result.usedCompilationPipeline);
            Assert.AreEqual(1, refreshCalls);
            Assert.AreEqual(1, requestCalls);
            Assert.AreEqual(result.invalidationTokenBeforeRequest + 1, result.invalidationTokenAfterRequest);
            Assert.IsFalse(result.isCompiling);
            Assert.IsFalse(result.isUpdating);
            Assert.AreEqual(7, result.capturedMainThreadId);
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
