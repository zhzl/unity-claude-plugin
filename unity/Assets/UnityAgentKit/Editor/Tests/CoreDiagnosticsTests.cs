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
                TestHostRecord(),
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
                TestHostRecord(),
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

        [Test]
        public void CompileReportResultRoundTripsCompilerMessagesAndCompleteness()
        {
            var report = new UnityAgentKitCompileReportResult
            {
                reportId = "compile-report-1",
                compileCycleId = "compile-cycle-1",
                hostId = "host-editor-tests",
                hostEpoch = 7,
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                completedAt = "2026-05-25T10:00:00.0000000Z",
                invalidationTokenAtCompletion = 5,
                compilerErrorCount = 1,
                compilerWarningCount = 1,
                compilerMessagesSummary = "1 error, 1 warning",
                compilerMessages = new[]
                {
                    new UnityAgentKitCompilerMessageRecord
                    {
                        assemblyPath = "Library/ScriptAssemblies/Assembly-CSharp.dll",
                        file = "Assets/Broken.cs",
                        line = 12,
                        column = 7,
                        type = "error",
                        message = "CS1002: ; expected"
                    },
                    new UnityAgentKitCompilerMessageRecord
                    {
                        assemblyPath = "Library/ScriptAssemblies/Assembly-CSharp.dll",
                        file = "Assets/Warning.cs",
                        line = 3,
                        column = 1,
                        type = "warning",
                        message = "CS0168: variable is declared but never used"
                    }
                },
                assemblyCompilationFinishedSeen = true,
                compilationFinishedSeen = true,
                editorIdleAfterCompilation = true
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitCompileReportResult>(JsonUtility.ToJson(report));

            Assert.AreEqual("compile-report-1", roundTrip.reportId);
            Assert.AreEqual("compile-cycle-1", roundTrip.compileCycleId);
            Assert.AreEqual("host-editor-tests", roundTrip.hostId);
            Assert.AreEqual(7, roundTrip.hostEpoch);
            Assert.AreEqual("2026-05-25T10:00:00.0000000Z", roundTrip.completedAt);
            Assert.AreEqual(5, roundTrip.invalidationTokenAtCompletion);
            Assert.AreEqual(1, roundTrip.compilerErrorCount);
            Assert.AreEqual(1, roundTrip.compilerWarningCount);
            Assert.AreEqual("1 error, 1 warning", roundTrip.compilerMessagesSummary);
            Assert.AreEqual(2, roundTrip.compilerMessages.Length);
            AssertCompilerMessageEquals(
                roundTrip.compilerMessages[0],
                "Library/ScriptAssemblies/Assembly-CSharp.dll",
                "Assets/Broken.cs",
                12,
                7,
                "error",
                "CS1002: ; expected");
            AssertCompilerMessageEquals(
                roundTrip.compilerMessages[1],
                "Library/ScriptAssemblies/Assembly-CSharp.dll",
                "Assets/Warning.cs",
                3,
                1,
                "warning",
                "CS0168: variable is declared but never used");
            Assert.IsTrue(roundTrip.assemblyCompilationFinishedSeen);
            Assert.IsTrue(roundTrip.compilationFinishedSeen);
            Assert.IsTrue(roundTrip.editorIdleAfterCompilation);
        }

        [Test]
        public void CompileReportOperationRequiresMainThreadDispatch()
        {
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" compile.report.get "));

            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "compile.report.get",
                requestId = "req-report-direct"
            }, TestHostRecord());

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual("host.dispatch_required", response.code);
        }

        [Test]
        public void CompileCollectorRecordsCompletedReportWithCompilerMessages()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var record = TestHostRecord();
            var messages = new[]
            {
                UnityAgentKitCompileDiagnostics.CreateCompilerMessageForTests(
                    "Assets/Broken.cs",
                    12,
                    7,
                    UnityEditor.Compilation.CompilerMessageType.Error,
                    "CS1002: ; expected"),
                UnityAgentKitCompileDiagnostics.CreateCompilerMessageForTests(
                    "Assets/Warning.cs",
                    3,
                    1,
                    UnityEditor.Compilation.CompilerMessageType.Warning,
                    "CS0168: variable is declared but never used")
            };

            UnityAgentKitCompileDiagnostics.StartCompileCycleForTests(record, invalidationTokenAtStart: 5);
            UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", messages);
            UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
            UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: false, isUpdating: false);

            Assert.IsTrue(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(record, out var report, out var code, out var message));
            Assert.AreEqual(string.Empty, code);
            Assert.AreEqual(string.Empty, message);
            Assert.AreEqual(record.hostId, report.hostId);
            Assert.AreEqual(record.hostEpoch, report.hostEpoch);
            Assert.AreEqual(5, report.invalidationTokenAtCompletion);
            Assert.AreEqual(1, report.compilerErrorCount);
            Assert.AreEqual(1, report.compilerWarningCount);
            Assert.AreEqual("1 error, 1 warning", report.compilerMessagesSummary);
            Assert.AreEqual(2, report.compilerMessages.Length);
            Assert.IsTrue(report.assemblyCompilationFinishedSeen);
            Assert.IsTrue(report.compilationFinishedSeen);
            Assert.IsTrue(report.editorIdleAfterCompilation);
        }

        [Test]
        public void CompileCollectorDoesNotCompleteReportBeforeEditorIdle()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var record = TestHostRecord();

            UnityAgentKitCompileDiagnostics.StartCompileCycleForTests(record, invalidationTokenAtStart: 5);
            UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", new UnityEditor.Compilation.CompilerMessage[0]);
            UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
            UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: true, isUpdating: false);

            Assert.IsFalse(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(record, out _, out var code, out var message));
            Assert.AreEqual("compile.report_missing", code);
            Assert.AreEqual("No complete compile report is available.", message);
        }

        [Test]
        public void CompileCollectorDoesNotCompleteReportWithoutAssemblyCompilerProof()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var record = TestHostRecord();

            UnityAgentKitCompileDiagnostics.StartCompileCycleForTests(record, invalidationTokenAtStart: 5);
            UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
            UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: false, isUpdating: false);

            Assert.IsFalse(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(record, out _, out var code, out var message));
            Assert.AreEqual("compile.report_missing", code);
            Assert.AreEqual("No complete compile report is available.", message);
        }

        [Test]
        public void CompileReportOperationReturnsUncertainWhenReportMissing()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var record = TestHostRecord();

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "compile.report.get",
                requestId = "req-report-missing"
            }, record, System.Threading.Thread.CurrentThread.ManagedThreadId);

            Assert.AreEqual("uncertain", response.status);
            Assert.AreEqual("compile.report.get", response.operation);
            Assert.AreEqual("compile.report_missing", response.code);
            Assert.AreEqual(1, response.diagnostics.Length);
            Assert.AreEqual("compile.report_missing", response.diagnostics[0].code);
        }

        [Test]
        public void CompileReportOperationReturnsRecentCompletedReport()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var record = TestHostRecord();
            var messages = new[]
            {
                UnityAgentKitCompileDiagnostics.CreateCompilerMessageForTests(
                    "Assets/Warning.cs",
                    3,
                    1,
                    UnityEditor.Compilation.CompilerMessageType.Warning,
                    "CS0168: variable is declared but never used")
            };

            UnityAgentKitCompileDiagnostics.StartCompileCycleForTests(record, invalidationTokenAtStart: 5);
            UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", messages);
            UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
            UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: false, isUpdating: false);

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "compile.report.get",
                requestId = "req-report-read"
            }, record, System.Threading.Thread.CurrentThread.ManagedThreadId);

            AssertOperationEnvelopeMinimumFields(response, "succeeded", "compile.report.get", "req-report-read", record);
            var report = JsonUtility.FromJson<UnityAgentKitCompileReportResult>(response.data);
            Assert.IsNotEmpty(report.reportId);
            Assert.IsNotEmpty(report.compileCycleId);
            Assert.AreEqual(record.hostId, report.hostId);
            Assert.AreEqual(record.hostEpoch, report.hostEpoch);
            Assert.IsNotEmpty(report.completedAt);
            Assert.AreEqual(5, report.invalidationTokenAtCompletion);
            Assert.AreEqual(0, report.compilerErrorCount);
            Assert.AreEqual(1, report.compilerWarningCount);
            Assert.AreEqual("0 errors, 1 warning", report.compilerMessagesSummary);
            Assert.NotNull(report.compilerMessages);
            Assert.AreEqual(1, report.compilerMessages.Length);
            AssertCompilerMessageEquals(
                report.compilerMessages[0],
                "Library/ScriptAssemblies/Assembly-CSharp.dll",
                "Assets/Warning.cs",
                3,
                1,
                "warning",
                "CS0168: variable is declared but never used");
            Assert.IsTrue(report.assemblyCompilationFinishedSeen);
            Assert.IsTrue(report.compilationFinishedSeen);
            Assert.IsTrue(report.editorIdleAfterCompilation);
        }

        [Test]
        public void CompileRequestRouteCapturesHostIdentityForCompletedReport()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            try
            {
                var record = TestHostRecord();
                var currentThreadId = System.Threading.Thread.CurrentThread.ManagedThreadId;

                var requestResponse = UnityAgentKitOperationRouter.RunCompileRequestForTests(
                    new UnityAgentKitOperationRequest
                    {
                        operation = "compile.request",
                        requestId = "req-compile-request-host-capture"
                    },
                    record,
                    currentThreadId,
                    isCompiling: false,
                    isUpdating: false,
                    refreshAssetDatabase: () => { },
                    requestScriptCompilation: () => { });

                AssertOperationEnvelopeMinimumFields(requestResponse, "succeeded", "compile.request", "req-compile-request-host-capture", record);
                var requestResult = JsonUtility.FromJson<UnityAgentKitCompileRequestResult>(requestResponse.data);
                Assert.IsTrue(requestResult.requested);

                UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", new UnityEditor.Compilation.CompilerMessage[0]);
                UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
                UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: false, isUpdating: false);

                var reportResponse = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
                {
                    operation = "compile.report.get",
                    requestId = "req-report-read-host-capture"
                }, record, currentThreadId);

                AssertOperationEnvelopeMinimumFields(reportResponse, "succeeded", "compile.report.get", "req-report-read-host-capture", record);
                var report = JsonUtility.FromJson<UnityAgentKitCompileReportResult>(reportResponse.data);
                Assert.AreEqual(record.hostId, report.hostId);
                Assert.AreEqual(record.hostEpoch, report.hostEpoch);
            }
            finally
            {
                UnityAgentKitCompileDiagnostics.ResetForTests();
            }
        }

        [Test]
        public void CompileCollectorStartsFreshCycleAtCompilationStartedBoundary()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            try
            {
                var record = TestHostRecord();
                var firstCycleMessages = new[]
                {
                    UnityAgentKitCompileDiagnostics.CreateCompilerMessageForTests(
                        "Assets/FirstWarning.cs",
                        3,
                        1,
                        UnityEditor.Compilation.CompilerMessageType.Warning,
                        "CS0168: first warning")
                };
                var secondCycleMessages = new[]
                {
                    UnityAgentKitCompileDiagnostics.CreateCompilerMessageForTests(
                        "Assets/SecondError.cs",
                        8,
                        2,
                        UnityEditor.Compilation.CompilerMessageType.Error,
                        "CS1002: second error")
                };

                UnityAgentKitCompileDiagnostics.StartCompileCycleForTests(record, invalidationTokenAtStart: 5);
                UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", firstCycleMessages);
                UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
                UnityAgentKitCompileDiagnostics.RecordCompilationStartedForTests();
                UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", secondCycleMessages);
                UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
                UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: false, isUpdating: false);

                Assert.IsTrue(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(record, out var report, out var code, out var message));
                Assert.AreEqual(string.Empty, code);
                Assert.AreEqual(string.Empty, message);
                Assert.AreEqual(1, report.compilerErrorCount);
                Assert.AreEqual(0, report.compilerWarningCount);
                Assert.AreEqual("1 error, 0 warnings", report.compilerMessagesSummary);
                Assert.AreEqual(1, report.compilerMessages.Length);
                AssertCompilerMessageEquals(
                    report.compilerMessages[0],
                    "Library/ScriptAssemblies/Assembly-CSharp.dll",
                    "Assets/SecondError.cs",
                    8,
                    2,
                    "error",
                    "CS1002: second error");
            }
            finally
            {
                UnityAgentKitCompileDiagnostics.ResetForTests();
            }
        }

        [Test]
        public void CompileStateOperationHidesRecentReportWhenCurrentHostDoesNotMatchProofHost()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            try
            {
                var oldRecord = TestHostRecord();
                var newRecord = CopyHostRecord(oldRecord);
                newRecord.hostId = "host-editor-tests-restarted";
                newRecord.hostEpoch = oldRecord.hostEpoch + 1;

                UnityAgentKitCompileDiagnostics.StartCompileCycleForTests(oldRecord, invalidationTokenAtStart: 5);
                UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", new UnityEditor.Compilation.CompilerMessage[0]);
                UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
                UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: false, isUpdating: false);

                var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
                {
                    operation = "compile.state.get",
                    requestId = "req-state-host-mismatch"
                }, newRecord, System.Threading.Thread.CurrentThread.ManagedThreadId);

                AssertOperationEnvelopeMinimumFields(response, "succeeded", "compile.state.get", "req-state-host-mismatch", newRecord);
                var state = JsonUtility.FromJson<UnityAgentKitCompileStateResult>(response.data);
                Assert.IsFalse(state.hasRecentCompileReport);
                Assert.AreEqual(string.Empty, state.recentCompileReportId);
            }
            finally
            {
                UnityAgentKitCompileDiagnostics.ResetForTests();
            }
        }

        [Test]
        public void CompileRequestCapturesCycleBeforeReentrantCallbacksRun()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            try
            {
                var record = TestHostRecord();
                var result = UnityAgentKitCompileDiagnostics.RequestCompileForTests(
                    string.Empty,
                    record,
                    7,
                    isCompiling: false,
                    isUpdating: false,
                    refreshAssetDatabase: () =>
                    {
                        UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", new UnityEditor.Compilation.CompilerMessage[0]);
                    },
                    requestScriptCompilation: () =>
                    {
                        UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
                    });

                Assert.IsTrue(result.requested);

                UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: false, isUpdating: false);

                Assert.IsTrue(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(record, out var report, out var code, out var message));
                Assert.AreEqual(string.Empty, code);
                Assert.AreEqual(string.Empty, message);
                Assert.AreEqual(result.invalidationTokenAfterRequest, report.invalidationTokenAtCompletion);
                Assert.AreEqual(record.hostId, report.hostId);
                Assert.AreEqual(record.hostEpoch, report.hostEpoch);
            }
            finally
            {
                UnityAgentKitCompileDiagnostics.ResetForTests();
            }
        }

        [Test]
        public void CompileReportReadFailsWhenCurrentHostDoesNotMatchCompletedReportHost()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var oldRecord = TestHostRecord();
            var newRecord = CopyHostRecord(oldRecord);
            newRecord.hostId = "host-editor-tests-restarted";
            newRecord.hostEpoch = oldRecord.hostEpoch + 1;

            UnityAgentKitCompileDiagnostics.StartCompileCycleForTests(oldRecord, invalidationTokenAtStart: 5);
            UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", new UnityEditor.Compilation.CompilerMessage[0]);
            UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
            UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: false, isUpdating: false);

            Assert.IsFalse(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(newRecord, out _, out var code, out var message));
            Assert.AreEqual("compile.report_missing", code);
            Assert.AreEqual("No complete compile report is available.", message);

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "compile.report.get",
                requestId = "req-report-host-mismatch"
            }, newRecord, System.Threading.Thread.CurrentThread.ManagedThreadId);

            AssertOperationEnvelopeMinimumFields(response, "uncertain", "compile.report.get", "req-report-host-mismatch", newRecord);
            Assert.AreEqual("compile.report_missing", response.code);
            Assert.AreEqual(string.Empty, response.data);
            Assert.AreEqual(1, response.diagnostics.Length);
            Assert.AreEqual("compile.report_missing", response.diagnostics[0].code);
        }

        [Test]
        public void CompileReportOperationReturnsControlledErrorWhenInputJsonIsMalformed()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var record = TestHostRecord();
            UnityAgentKitCompileDiagnostics.StartCompileCycleForTests(record, invalidationTokenAtStart: 5);
            UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", new UnityEditor.Compilation.CompilerMessage[0]);
            UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
            UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: false, isUpdating: false);

            Assert.IsFalse(UnityAgentKitCompileDiagnostics.TryReadRecentReport(record, "{bad json", out _, out var code, out var message));
            Assert.AreEqual("compile.report_input_invalid", code);
            Assert.AreEqual("Compile report request input JSON is malformed.", message);

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "compile.report.get",
                requestId = "req-report-bad-input",
                inputJson = "{bad json"
            }, record, System.Threading.Thread.CurrentThread.ManagedThreadId);

            AssertOperationEnvelopeMinimumFields(response, "uncertain", "compile.report.get", "req-report-bad-input", record);
            Assert.AreEqual("compile.report_input_invalid", response.code);
            Assert.AreEqual("Compile report request input JSON is malformed.", response.message);
            Assert.AreEqual(string.Empty, response.data);
            Assert.AreEqual(1, response.diagnostics.Length);
            Assert.AreEqual("compile.report_input_invalid", response.diagnostics[0].code);
            Assert.AreEqual("Compile report request input JSON is malformed.", response.diagnostics[0].message);
        }

        [Test]
        public void CompileCallbackSubscriptionSmokeCanAttachAndDetach()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();

            UnityAgentKitCompileDiagnostics.EnsureCompilerCallbacksSubscribedForTests();
            Assert.IsTrue(UnityAgentKitCompileDiagnostics.HasCompilerCallbackSubscriptionsForTests());

            UnityAgentKitCompileDiagnostics.DetachCompilerCallbacksForTests();
            Assert.IsFalse(UnityAgentKitCompileDiagnostics.HasCompilerCallbackSubscriptionsForTests());

            UnityAgentKitCompileDiagnostics.EnsureCompilerCallbacksSubscribedForTests();
            Assert.IsTrue(UnityAgentKitCompileDiagnostics.HasCompilerCallbackSubscriptionsForTests());
        }

        [Test]
        public void CompileCollectorResetClearsRecentReportProof()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var record = TestHostRecord();
            UnityAgentKitCompileDiagnostics.StartCompileCycleForTests(record, invalidationTokenAtStart: 5);
            UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", new UnityEditor.Compilation.CompilerMessage[0]);
            UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
            UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: false, isUpdating: false);
            Assert.IsTrue(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(record, out _, out _, out _));

            UnityAgentKitCompileDiagnostics.ResetForTests();

            Assert.IsFalse(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(record, out _, out var code, out var message));
            Assert.AreEqual("compile.report_missing", code);
            Assert.AreEqual("No complete compile report is available.", message);
        }

        [Test]
        public void CompileCollectorSubscriptionLossClearsRecentReportProof()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var record = TestHostRecord();
            UnityAgentKitCompileDiagnostics.StartCompileCycleForTests(record, invalidationTokenAtStart: 5);
            UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", new UnityEditor.Compilation.CompilerMessage[0]);
            UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
            UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: false, isUpdating: false);
            Assert.IsTrue(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(record, out _, out _, out _));

            UnityAgentKitCompileDiagnostics.DetachCompilerCallbacksForTests();

            Assert.IsFalse(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(record, out _, out var code, out var message));
            Assert.AreEqual("compile.report_missing", code);
            Assert.AreEqual("No complete compile report is available.", message);
        }

        [Test]
        public void ConsoleCursorRoundTripsContinuityFields()
        {
            var cursor = new UnityAgentKitConsoleCursor
            {
                hostId = "host-console",
                hostEpoch = 9,
                consoleGeneration = 2,
                startIndex = 12,
                createdAt = "2026-05-27T10:00:00.0000000Z"
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitConsoleCursor>(JsonUtility.ToJson(cursor));

            Assert.AreEqual("host-console", roundTrip.hostId);
            Assert.AreEqual(9, roundTrip.hostEpoch);
            Assert.AreEqual(2, roundTrip.consoleGeneration);
            Assert.AreEqual(12, roundTrip.startIndex);
            Assert.IsNotEmpty(roundTrip.createdAt);
        }

        [Test]
        public void ConsoleCountResultRoundTripsBoundedSeverityEvidence()
        {
            var result = new UnityAgentKitConsoleCountResult
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                hostId = "host-console",
                hostEpoch = 9,
                totalCount = 1000,
                counts = new UnityAgentKitConsoleCounts { error = 1, warning = 2, log = 497 },
                severityScan = new UnityAgentKitConsoleSeverityScan
                {
                    scannedCount = 500,
                    startIndex = 500,
                    endIndexExclusive = 1000,
                    limit = 500,
                    severityBreakdownComplete = false
                },
                cursor = new UnityAgentKitConsoleCursor { hostId = "host-console", hostEpoch = 9, consoleGeneration = 2, startIndex = 1000, createdAt = "2026-05-27T10:00:00.0000000Z" },
                consoleGeneration = 2,
                capturedMainThreadId = 7,
                executionThreadId = 7,
                diagnostics = new[] { new UnityAgentKitDiagnostic { source = "console", severity = "warning", code = "console.severity_breakdown_partial", message = "Severity breakdown scanned the bounded tail window only." } }
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitConsoleCountResult>(JsonUtility.ToJson(result));

            Assert.AreEqual(1000, roundTrip.totalCount);
            Assert.AreEqual(1, roundTrip.counts.error);
            Assert.AreEqual(500, roundTrip.severityScan.scannedCount);
            Assert.IsFalse(roundTrip.severityScan.severityBreakdownComplete);
            Assert.AreEqual(1000, roundTrip.cursor.startIndex);
            Assert.AreEqual("console.severity_breakdown_partial", roundTrip.diagnostics[0].code);
        }

        [Test]
        public void ConsoleSnapshotResultRoundTripsResourceAndRangeFields()
        {
            var result = new UnityAgentKitConsoleSnapshotResult
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                hostId = "host-console",
                hostEpoch = 9,
                artifactId = "console-20260527-100000",
                uri = "unity://console-snapshots/console-20260527-100000",
                counts = new UnityAgentKitConsoleCounts { error = 1, warning = 1, log = 1 },
                cursor = new UnityAgentKitConsoleCursor { hostId = "host-console", hostEpoch = 9, consoleGeneration = 2, startIndex = 15, createdAt = "2026-05-27T10:00:00.0000000Z" },
                range = new UnityAgentKitConsoleSnapshotRange { startIndex = 12, endIndexExclusive = 15, totalCountAtCapture = 15, limit = 200, truncated = false },
                entryCount = 3,
                includeStackTrace = false,
                capturedMainThreadId = 7,
                executionThreadId = 7,
                diagnostics = new UnityAgentKitDiagnostic[0]
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitConsoleSnapshotResult>(JsonUtility.ToJson(result));

            Assert.AreEqual("console-20260527-100000", roundTrip.artifactId);
            Assert.AreEqual("unity://console-snapshots/console-20260527-100000", roundTrip.uri);
            Assert.AreEqual(12, roundTrip.range.startIndex);
            Assert.AreEqual(15, roundTrip.range.endIndexExclusive);
            Assert.AreEqual(3, roundTrip.entryCount);
            Assert.IsFalse(roundTrip.includeStackTrace);
        }

        [Test]
        public void ConsoleClearResultRoundTripsVerifiedCountAndGenerationEvidence()
        {
            var result = new UnityAgentKitConsoleClearResult
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                hostId = "host-console",
                hostEpoch = 9,
                explicitClear = true,
                cleared = true,
                countBeforeClear = 12,
                countAfterClear = 0,
                consoleGenerationBeforeClear = 2,
                consoleGenerationAfterClear = 3,
                cursor = new UnityAgentKitConsoleCursor { hostId = "host-console", hostEpoch = 9, consoleGeneration = 3, startIndex = 0, createdAt = "2026-05-27T10:00:00.0000000Z" },
                capturedMainThreadId = 7,
                executionThreadId = 7,
                diagnostics = new UnityAgentKitDiagnostic[0]
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitConsoleClearResult>(JsonUtility.ToJson(result));

            Assert.IsTrue(roundTrip.explicitClear);
            Assert.IsTrue(roundTrip.cleared);
            Assert.AreEqual(12, roundTrip.countBeforeClear);
            Assert.AreEqual(0, roundTrip.countAfterClear);
            Assert.AreEqual(2, roundTrip.consoleGenerationBeforeClear);
            Assert.AreEqual(3, roundTrip.consoleGenerationAfterClear);
            Assert.AreEqual(3, roundTrip.cursor.consoleGeneration);
        }

        [Test]
        public void ConsoleOperationsRequireMainThreadDispatch()
        {
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" console.count "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" console.snapshot "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" console.clear "));

            var countResponse = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest { operation = "console.count", requestId = "req-console-count-direct" }, TestHostRecord());
            var snapshotResponse = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest { operation = "console.snapshot", requestId = "req-console-snapshot-direct" }, TestHostRecord());
            var clearResponse = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest { operation = "console.clear", requestId = "req-console-clear-direct" }, TestHostRecord());

            Assert.AreEqual("rejected", countResponse.status);
            Assert.AreEqual("host.dispatch_required", countResponse.code);
            Assert.AreEqual("rejected", snapshotResponse.status);
            Assert.AreEqual("host.dispatch_required", snapshotResponse.code);
            Assert.AreEqual("rejected", clearResponse.status);
            Assert.AreEqual("host.dispatch_required", clearResponse.code);
        }

        [Test]
        public void ConsoleCountSeamUsesRealTotalAndBoundedSeverityScan()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var entries = new[]
            {
                UnityAgentKitConsoleDiagnostics.CreateEntryForTests(0, "old error", string.Empty, "Error"),
                UnityAgentKitConsoleDiagnostics.CreateEntryForTests(1, "new warning", string.Empty, "Warning"),
                UnityAgentKitConsoleDiagnostics.CreateEntryForTests(2, "new log", string.Empty, "Log")
            };

            var result = UnityAgentKitConsoleDiagnostics.CountForTests(TestHostRecord(), 7, maxSeverityScan: 2, entries: entries);

            Assert.AreEqual(3, result.totalCount);
            Assert.AreEqual(0, result.counts.error);
            Assert.AreEqual(1, result.counts.warning);
            Assert.AreEqual(1, result.counts.log);
            Assert.AreEqual(2, result.severityScan.scannedCount);
            Assert.AreEqual(1, result.severityScan.startIndex);
            Assert.AreEqual(3, result.severityScan.endIndexExclusive);
            Assert.IsFalse(result.severityScan.severityBreakdownComplete);
            Assert.AreEqual("console.severity_breakdown_partial", result.diagnostics[0].code);
        }

        [Test]
        public void ConsoleSnapshotSeamWritesBoundedArtifactAndMetadata()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var artifactRoot = TemporaryConsoleArtifactRoot("snapshot");
            var record = TestHostRecord();
            var entries = new[]
            {
                UnityAgentKitConsoleDiagnostics.CreateEntryForTests(0, "old error", "stack", "Error"),
                UnityAgentKitConsoleDiagnostics.CreateEntryForTests(1, "new warning", "stack", "Warning"),
                UnityAgentKitConsoleDiagnostics.CreateEntryForTests(2, "new log", "stack", "Log")
            };

            var result = UnityAgentKitConsoleDiagnostics.SnapshotForTests(record, 7, "{\"limit\":2,\"includeStackTrace\":false}", entries, artifactRoot);
            var payloadPath = System.IO.Path.Combine(artifactRoot, "console-snapshots", result.artifactId + ".json");
            var metadataPath = System.IO.Path.Combine(artifactRoot, "metadata", "console-snapshots", result.artifactId + ".json");
            var payloadText = System.IO.File.ReadAllText(payloadPath);
            var metadata = JsonUtility.FromJson<UnityAgentKitArtifactMetadataRecord>(System.IO.File.ReadAllText(metadataPath));

            Assert.AreEqual(2, result.entryCount);
            Assert.AreEqual(1, result.range.startIndex);
            Assert.AreEqual(3, result.range.endIndexExclusive);
            Assert.IsTrue(result.range.truncated);
            Assert.IsTrue(System.IO.File.Exists(payloadPath));
            Assert.IsTrue(payloadText.Contains("new warning"));
            Assert.IsFalse(payloadText.Contains("old error"));
            Assert.AreEqual("console_snapshot", metadata.type);
            Assert.AreEqual("unity_console", metadata.producerTool);
            Assert.AreEqual("snapshot", metadata.producerAction);
            Assert.AreEqual("valid", metadata.validationStatus);
        }

        [Test]
        public void ConsoleSnapshotInvalidCursorReturnsUncertainOperationResponse()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var record = TestHostRecord();
            var inputJson = "{\"limit\":10,\"cursor\":{\"hostId\":\"other\",\"hostEpoch\":7,\"consoleGeneration\":0,\"startIndex\":0,\"createdAt\":\"2026-05-27T10:00:00.0000000Z\"}}";

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "console.snapshot",
                requestId = "req-console-invalid-cursor",
                inputJson = inputJson
            }, record, System.Threading.Thread.CurrentThread.ManagedThreadId);

            Assert.AreEqual("uncertain", response.status);
            Assert.AreEqual("console.cursor_invalid", response.code);
        }

        [Test]
        public void ConsoleClearRequiresExplicitInputAndDoesNotIncrementGeneration()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "console.clear",
                requestId = "req-console-clear-not-explicit",
                inputJson = "{}"
            }, TestHostRecord(), System.Threading.Thread.CurrentThread.ManagedThreadId);

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual("console.clear_requires_explicit_confirmation", response.code);
        }

        [Test]
        public void ConsoleClearSeamVerifiesCountAndIncrementsGenerationOnlyAfterSuccess()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var clearCalls = 0;
            var result = UnityAgentKitConsoleDiagnostics.ClearForTests(
                TestHostRecord(),
                7,
                "{\"confirmClear\":true}",
                countBeforeClear: 3,
                countAfterClear: 0,
                clearConsole: () => clearCalls += 1);

            Assert.IsTrue(result.explicitClear);
            Assert.IsTrue(result.cleared);
            Assert.AreEqual(3, result.countBeforeClear);
            Assert.AreEqual(0, result.countAfterClear);
            Assert.AreEqual(0, result.consoleGenerationBeforeClear);
            Assert.AreEqual(1, result.consoleGenerationAfterClear);
            Assert.AreEqual(1, clearCalls);
        }

        [Test]
        public void ConsoleClearSeamDoesNotIncrementGenerationWhenVerificationFails()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var result = UnityAgentKitConsoleDiagnostics.ClearForTests(
                TestHostRecord(),
                7,
                "{\"confirmClear\":true}",
                countBeforeClear: 3,
                countAfterClear: 2,
                clearConsole: () => { });

            Assert.IsFalse(result.cleared);
            Assert.AreEqual(0, result.consoleGenerationBeforeClear);
            Assert.AreEqual(0, result.consoleGenerationAfterClear);
            Assert.AreEqual(2, result.countAfterClear);
        }

        [Test]
        public void ConsoleLogEntriesReflectionSmokeReadsControlledLogEntry()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var record = TestHostRecord();
            var uniqueMessage = "UnityAgentKit console reflection smoke " + System.Guid.NewGuid().ToString("N");
            Debug.Log(uniqueMessage);

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "console.snapshot",
                requestId = "req-console-snapshot-smoke",
                inputJson = "{\"limit\":50,\"includeStackTrace\":false}"
            }, record, System.Threading.Thread.CurrentThread.ManagedThreadId);

            AssertOperationEnvelopeMinimumFields(response, "succeeded", "console.snapshot", "req-console-snapshot-smoke", record);
            var data = JsonUtility.FromJson<UnityAgentKitConsoleSnapshotResult>(response.data);
            var payloadPath = System.IO.Path.Combine(UnityAgentKitArtifactContracts.GetArtifactRoot(), "console-snapshots", data.artifactId + ".json");
            var payloadText = System.IO.File.ReadAllText(payloadPath);

            Assert.LessOrEqual(data.entryCount, 50);
            Assert.GreaterOrEqual(data.range.totalCountAtCapture, 1);
            Assert.IsTrue(payloadText.Contains(uniqueMessage));
        }

        [Test]
        public void ConsoleClearReflectionSmokeClearsControlledLogAndIncrementsGeneration()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var record = TestHostRecord();
            Debug.Log("UnityAgentKit console clear smoke " + System.Guid.NewGuid().ToString("N"));

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "console.clear",
                requestId = "req-console-clear-smoke",
                inputJson = "{\"confirmClear\":true}"
            }, record, System.Threading.Thread.CurrentThread.ManagedThreadId);

            AssertOperationEnvelopeMinimumFields(response, "succeeded", "console.clear", "req-console-clear-smoke", record);
            var data = JsonUtility.FromJson<UnityAgentKitConsoleClearResult>(response.data);
            Assert.IsTrue(data.explicitClear);
            Assert.IsTrue(data.cleared);
            Assert.GreaterOrEqual(data.countBeforeClear, 1);
            Assert.AreEqual(0, data.countAfterClear);
            Assert.Greater(data.consoleGenerationAfterClear, data.consoleGenerationBeforeClear);
            Assert.AreEqual(data.consoleGenerationAfterClear, data.cursor.consoleGeneration);
        }

        private static string TemporaryConsoleArtifactRoot(string testName)
        {
            var directory = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "UnityAgentKitConsoleTests", testName, System.Guid.NewGuid().ToString("N"), "artifacts");
            System.IO.Directory.CreateDirectory(directory);
            return directory;
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

        private static UnityAgentKitHostRecord CopyHostRecord(UnityAgentKitHostRecord record)
        {
            return new UnityAgentKitHostRecord
            {
                hostName = record.hostName,
                protocolVersion = record.protocolVersion,
                projectRoot = record.projectRoot,
                hostId = record.hostId,
                hostEpoch = record.hostEpoch,
                port = record.port,
                status = record.status,
                startedAt = record.startedAt,
                lastProbeAt = record.lastProbeAt
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

        private static void AssertCompilerMessageEquals(
            UnityAgentKitCompilerMessageRecord message,
            string assemblyPath,
            string file,
            int line,
            int column,
            string type,
            string expectedMessage)
        {
            Assert.AreEqual(assemblyPath, message.assemblyPath);
            Assert.AreEqual(file, message.file);
            Assert.AreEqual(line, message.line);
            Assert.AreEqual(column, message.column);
            Assert.AreEqual(type, message.type);
            Assert.AreEqual(expectedMessage, message.message);
        }
    }
}
