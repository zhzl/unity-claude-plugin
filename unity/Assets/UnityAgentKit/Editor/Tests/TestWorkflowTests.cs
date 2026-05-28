using System;
using System.IO;
using NUnit.Framework;
using UnityEngine;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class TestWorkflowTests
    {
        [Test]
        public void TestSelectorRoundTripsReservedAllMode()
        {
            var input = new UnityAgentKitTestSelectorInput
            {
                mode = "all",
                assembly = "Assembly",
                className = "Class",
                methodName = "Method"
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitTestSelectorInput>(JsonUtility.ToJson(input));

            Assert.AreEqual("all", roundTrip.mode);
            Assert.AreEqual("Assembly", roundTrip.assembly);
            Assert.AreEqual("Class", roundTrip.className);
            Assert.AreEqual("Method", roundTrip.methodName);
        }

        [Test]
        public void TestReportSummaryRoundTripsCountsFailuresAndResourceUri()
        {
            var summary = new UnityAgentKitTestReportSummary
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                hostId = "host-test",
                hostEpoch = 21,
                jobId = "job-1",
                reportId = "report-1",
                uri = "unity://test-reports/report-1",
                mode = "editmode",
                selector = new UnityAgentKitTestSelectorInput { mode = "editmode" },
                total = 2,
                passed = 1,
                failed = 1,
                errors = 0,
                skipped = 0,
                inconclusive = 0,
                verifiedTestPass = false,
                terminalState = "failed",
                failures = new[]
                {
                    new UnityAgentKitTestFailureRecord
                    {
                        name = "SampleFailingTest",
                        fullName = "UnityAgentKit.Editor.Tests.TestWorkflowTests.SampleFailingTest",
                        message = "expected failure",
                        stackTrace = "stack"
                    }
                },
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitTestReportSummary>(JsonUtility.ToJson(summary));

            Assert.AreEqual("report-1", roundTrip.reportId);
            Assert.AreEqual("unity://test-reports/report-1", roundTrip.uri);
            Assert.AreEqual(2, roundTrip.total);
            Assert.AreEqual(1, roundTrip.passed);
            Assert.AreEqual(1, roundTrip.failed);
            Assert.AreEqual(0, roundTrip.errors);
            Assert.AreEqual(0, roundTrip.skipped);
            Assert.AreEqual(0, roundTrip.inconclusive);
            Assert.IsFalse(roundTrip.verifiedTestPass);
            Assert.AreEqual("failed", roundTrip.terminalState);
            Assert.AreEqual(1, roundTrip.failures.Length);
            Assert.AreEqual("SampleFailingTest", roundTrip.failures[0].name);
        }

        [Test]
        public void TestOperationsRequireMainThreadDispatch()
        {
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" test.list "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" test.start "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" test.status.get "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" test.result.get "));

            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "test.list",
                requestId = "req-test-list-direct"
            }, TestHostRecord());

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual("host.dispatch_required", response.code);
        }

        [Test]
        public void TestListForTestsRejectsAllModeWithUnsupportedSelectorCode()
        {
            var called = false;
            var result = UnityAgentKitTestDiagnostics.ListForTests(
                "{\"selector\":{\"mode\":\"all\"}}",
                TestHostRecord(),
                _ =>
                {
                    called = true;
                    return Array.Empty<UnityAgentKitTestCaseRecord>();
                });

            Assert.AreEqual("rejected", result.status);
            Assert.AreEqual("unsupported_selector_mode", result.code);
            Assert.IsFalse(called);
        }

        [Test]
        public void TestListForTestsRejectsPlayModeWithUnsupportedSelectorCode()
        {
            var called = false;
            var result = UnityAgentKitTestDiagnostics.ListForTests(
                "{\"selector\":{\"mode\":\"playmode\"}}",
                TestHostRecord(),
                _ =>
                {
                    called = true;
                    return Array.Empty<UnityAgentKitTestCaseRecord>();
                });

            Assert.AreEqual("rejected", result.status);
            Assert.AreEqual("unsupported_selector_mode", result.code);
            Assert.IsFalse(called);
        }

        [Test]
        public void TestStartForTestsRejectsPlayModeWithUnsupportedSelectorCode()
        {
            var result = UnityAgentKitTestDiagnostics.StartForTests(
                "{\"selector\":{\"mode\":\"playmode\"}}",
                TestHostRecord(),
                new UnityAgentKitTestDiagnostics.TestJobStore(),
                new RecordingRunnerAdapter(TestHostRecord()));

            Assert.AreEqual("rejected", result.status);
            Assert.AreEqual("unsupported_selector_mode", result.code);
        }

        [Test]
        public void TestListForTestsRejectsUnknownModeWithUnsupportedSelectorCode()
        {
            var called = false;
            var result = UnityAgentKitTestDiagnostics.ListForTests(
                "{\"selector\":{\"mode\":\"foo\"}}",
                TestHostRecord(),
                _ =>
                {
                    called = true;
                    return Array.Empty<UnityAgentKitTestCaseRecord>();
                });

            Assert.AreEqual("rejected", result.status);
            Assert.AreEqual("unsupported_selector_mode", result.code);
            Assert.IsFalse(called);
        }

        [Test]
        public void TestListForTestsRejectsAssemblySelectorBeforeDiscovery()
        {
            var called = false;
            var result = UnityAgentKitTestDiagnostics.ListForTests(
                "{\"selector\":{\"mode\":\"editmode\",\"assembly\":\"UnityAgentKit.Editor.Tests\"}}",
                TestHostRecord(),
                _ =>
                {
                    called = true;
                    return Array.Empty<UnityAgentKitTestCaseRecord>();
                });

            Assert.AreEqual("rejected", result.status);
            Assert.AreEqual("unsupported_selector_assembly", result.code);
            Assert.IsFalse(called);
        }

        [Test]
        public void TestListForTestsIncludesDiscoveryPendingDiagnostic()
        {
            var result = UnityAgentKitTestDiagnostics.ListForTests(
                "{\"selector\":{\"mode\":\"editmode\"}}",
                TestHostRecord(),
                _ => new UnityAgentKitTestDiagnostics.UnityAgentKitTestDiscoveryResult
                {
                    tests = Array.Empty<UnityAgentKitTestCaseRecord>(),
                    diagnostics = new[]
                    {
                        new UnityAgentKitDiagnostic { severity = "warning", code = "test.discovery_pending", message = "pending" }
                    }
                });

            Assert.AreEqual("uncertain", result.status);
            Assert.AreEqual("test.discovery_pending", result.code);
            Assert.AreEqual(1, result.diagnostics.Length);
            Assert.AreEqual("test.discovery_pending", result.diagnostics[0].code);
        }

        [Test]
        public void TestListForTestsReturnsCachedSnapshotAfterAsyncDiscoveryCallback()
        {
            var cache = new UnityAgentKitTestDiagnostics.DiscoveryCacheStore();
            Action<UnityAgentKitTestDiagnostics.UnityAgentKitTestDiscoveryResult> callback = null;
            var calls = 0;
            Func<UnityAgentKitTestSelectorInput, UnityAgentKitTestDiagnostics.UnityAgentKitTestDiscoveryResult> discover = selector =>
                UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter.DiscoverWithCacheForTests(
                    selector,
                    cache,
                    (_, complete) =>
                    {
                        calls++;
                        callback = complete;
                    });

            var first = UnityAgentKitTestDiagnostics.ListForTests(
                "{\"selector\":{\"mode\":\"editmode\",\"className\":\"Example.Foo\",\"methodName\":\"Passes\"}}",
                TestHostRecord(),
                discover);

            Assert.AreEqual("uncertain", first.status);
            Assert.AreEqual("test.discovery_pending", first.code);
            Assert.AreEqual(1, first.diagnostics.Length);
            Assert.AreEqual("test.discovery_pending", first.diagnostics[0].code);
            Assert.AreEqual(1, calls);
            Assert.IsNotNull(callback);

            callback(UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter.CompletedDiscoveryResultForTests(new[]
            {
                new UnityAgentKitTestCaseRecord
                {
                    id = "Example.Foo.Passes",
                    name = "Passes",
                    fullName = "Example.Foo.Passes",
                    assembly = "unknown",
                    className = "Example.Foo",
                    mode = "editmode"
                }
            }));

            var second = UnityAgentKitTestDiagnostics.ListForTests(
                "{\"selector\":{\"mode\":\"editmode\",\"className\":\"Example.Foo\",\"methodName\":\"Passes\"}}",
                TestHostRecord(),
                discover);

            Assert.AreEqual("succeeded", second.status);
            Assert.AreEqual(1, calls);
            var data = JsonUtility.FromJson<UnityAgentKitTestListResult>(second.data);
            Assert.AreEqual(1, data.total);
            Assert.AreEqual("Example.Foo.Passes", data.tests[0].fullName);
        }

        [Test]
        public void TestListForTestsReturnsSnapshotAfterSimulatedDiscoveryCompletion()
        {
            var cache = new UnityAgentKitTestDiagnostics.DiscoveryCacheStore();
            Action<UnityAgentKitTestDiagnostics.UnityAgentKitTestDiscoveryResult> callback = null;
            var calls = 0;
            var selector = new UnityAgentKitTestSelectorInput
            {
                mode = "editmode",
                className = "Example.Foo",
                methodName = "Passes"
            };

            var first = UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter.DiscoverWithCacheForTests(
                selector,
                cache,
                (_, complete) =>
                {
                    calls++;
                    callback = complete;
                });

            Assert.AreEqual("test.discovery_pending", first.diagnostics[0].code);
            Assert.AreEqual(1, calls);

            callback(UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter.CompletedDiscoveryResultForTests(new[]
            {
                new UnityAgentKitTestCaseRecord
                {
                    id = "Example.Foo.Passes",
                    name = "Passes",
                    fullName = "Example.Foo.Passes",
                    assembly = "unknown",
                    className = "Example.Foo",
                    mode = "editmode"
                }
            }));

            var second = UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter.DiscoverWithCacheForTests(
                selector,
                cache,
                (_, __) => { calls++; });

            Assert.AreEqual(1, calls);
            Assert.AreEqual(1, second.tests.Length);
            Assert.AreEqual("Example.Foo.Passes", second.tests[0].fullName);
        }

        [Test]
        public void TestListForTestsBroadUnknownAssemblyReturnsDiagnostic()
        {
            var result = UnityAgentKitTestDiagnostics.ListForTests(
                "{\"selector\":{\"mode\":\"editmode\"}}",
                TestHostRecord(),
                _ => UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter.DiscoveryResultWithUnknownAssemblyForTests(new[]
                {
                    new UnityAgentKitTestCaseRecord
                    {
                        id = "Example.Foo.Passes",
                        name = "Passes",
                        fullName = "Example.Foo.Passes",
                        assembly = string.Empty,
                        className = "Example.Foo",
                        mode = "editmode"
                    }
                }));

            Assert.AreEqual("succeeded", result.status);
            var data = JsonUtility.FromJson<UnityAgentKitTestListResult>(result.data);
            Assert.AreEqual("unknown", data.tests[0].assembly);
            Assert.AreEqual(1, data.diagnostics.Length);
            Assert.AreEqual("test.discovery_assembly_unknown", data.diagnostics[0].code);
        }

        [Test]
        public void TestMethodOnlySelectorCreatesTestNameFilter()
        {
            var testNames = UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter.TestNamesForTests(
                new UnityAgentKitTestSelectorInput { mode = "editmode", methodName = "SamplePassingTest" });

            Assert.AreEqual(1, testNames.Length);
            Assert.AreEqual("SamplePassingTest", testNames[0]);
        }

        [Test]
        public void TestClassOnlySelectorMatchesExactClassWithoutPrefixBug()
        {
            var selector = new UnityAgentKitTestSelectorInput
            {
                mode = "editmode",
                className = "Example.Foo"
            };

            Assert.IsTrue(UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter.MatchesSelectorForTests(
                "Example.Foo.Passes",
                "Selected.Assembly",
                selector));
            Assert.IsFalse(UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter.MatchesSelectorForTests(
                "Example.FooBar.Passes",
                "Selected.Assembly",
                selector));
        }

        [Test]
        public void TestListForTestsFiltersClassAndMethodExactlyWithoutPrefixBug()
        {
            var selector = new UnityAgentKitTestSelectorInput
            {
                mode = "editmode",
                className = "Example.Foo",
                methodName = "Passes"
            };

            Assert.IsTrue(UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter.MatchesSelectorForTests(
                "Example.Foo.Passes",
                "Selected.Assembly",
                selector));
            Assert.IsFalse(UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter.MatchesSelectorForTests(
                "Example.Foo.Fails",
                "Selected.Assembly",
                selector));
            Assert.IsFalse(UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter.MatchesSelectorForTests(
                "Example.FooBar.Passes",
                "Selected.Assembly",
                selector));
        }

        [Test]
        public void TestListForTestsReturnsSelectorSnapshotWithoutPassClaim()
        {
            var result = UnityAgentKitTestDiagnostics.ListForTests(
                "{\"selector\":{\"mode\":\"editmode\",\"className\":\"UnityAgentKit.Editor.Tests.TestWorkflowTests\",\"methodName\":\"SamplePassingTest\"}}",
                TestHostRecord(),
                selector => new[]
                {
                    new UnityAgentKitTestCaseRecord
                    {
                        id = "UnityAgentKit.Editor.Tests.TestWorkflowTests.SamplePassingTest",
                        name = "SamplePassingTest",
                        fullName = "UnityAgentKit.Editor.Tests.TestWorkflowTests.SamplePassingTest",
                        assembly = selector.assembly,
                        className = selector.className,
                        mode = selector.mode
                    }
                });

            Assert.AreEqual("succeeded", result.status);
            var data = JsonUtility.FromJson<UnityAgentKitTestListResult>(result.data);
            Assert.AreEqual("editmode", data.selector.mode);
            Assert.AreEqual(string.Empty, data.selector.assembly);
            Assert.AreEqual("UnityAgentKit.Editor.Tests.TestWorkflowTests", data.selector.className);
            Assert.AreEqual("SamplePassingTest", data.selector.methodName);
            Assert.AreEqual(1, data.total);
            Assert.IsNotNull(data.tests);
            Assert.AreEqual(1, data.tests.Length);
            Assert.AreEqual("SamplePassingTest", data.tests[0].name);
            Assert.IsFalse(data.verifiedTestPass);
        }

        [Test]
        public void TestListRecordForTestsUsesDiscoveredAssemblyAndClassName()
        {
            var record = UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter.TestRecordForTests(
                "Example.Namespace.SampleTests.Passes",
                "Passes",
                "Discovered.Assembly",
                new UnityAgentKitTestSelectorInput { mode = "editmode" });

            Assert.AreEqual("Discovered.Assembly", record.assembly);
            Assert.AreEqual("Example.Namespace.SampleTests", record.className);
        }

        [Test]
        public void TestListRecordForTestsAvoidsEmptyDefaultSelectorIdentity()
        {
            var record = UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter.TestRecordForTests(
                "Example.Namespace.SampleTests.Passes",
                "Passes",
                string.Empty,
                new UnityAgentKitTestSelectorInput { mode = "editmode" });

            Assert.AreEqual("unknown", record.assembly);
            Assert.IsNotEmpty(record.className);
        }

        [Test]
        public void TestListRecordForTestsDoesNotFabricateSelectorAssembly()
        {
            var record = UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter.TestRecordForTests(
                "Example.Namespace.SampleTests.Passes",
                "Passes",
                string.Empty,
                new UnityAgentKitTestSelectorInput { mode = "editmode", assembly = "Requested.Assembly" });

            Assert.AreEqual("unknown", record.assembly);
        }

        [Test]
        public void TestStartForTestsFailsMissingAdapter()
        {
            var start = UnityAgentKitTestDiagnostics.StartForTests(
                "{\"selector\":{\"mode\":\"editmode\"}}",
                TestHostRecord(),
                new UnityAgentKitTestDiagnostics.TestJobStore(),
                null);

            Assert.AreEqual("failed", start.status);
            Assert.AreEqual("test.runner_adapter_missing", start.code);
            Assert.AreEqual(1, start.diagnostics.Length);
            Assert.AreEqual("test.runner_adapter_missing", start.diagnostics[0].code);
        }

        [Test]
        public void TestStartForTestsInvokesRunnerAdapterAndStoresAcceptedJob()
        {
            var record = TestHostRecord();
            var store = new UnityAgentKitTestDiagnostics.TestJobStore();
            var adapter = new RecordingRunnerAdapter(record);

            var start = UnityAgentKitTestDiagnostics.StartForTests(
                "{\"selector\":{\"mode\":\"editmode\"}}",
                record,
                store,
                adapter);

            Assert.AreEqual("succeeded", start.status);
            Assert.IsTrue(adapter.ExecuteCalled);
            var job = JsonUtility.FromJson<UnityAgentKitTestJobResult>(start.data);
            Assert.AreEqual("accepted", job.state);
            Assert.AreEqual(record.hostId, job.hostId);
            Assert.AreEqual(record.hostEpoch, job.hostEpoch);
            Assert.IsTrue(store.TryGetJob(job.jobId, out var stored));
            Assert.AreEqual(job.jobId, stored.jobId);
        }

        [Test]
        public void TestStartForTestsPreservesRequestId()
        {
            var response = UnityAgentKitTestDiagnostics.StartForTests(
                "{\"selector\":{\"mode\":\"editmode\"}}",
                TestHostRecord(),
                new UnityAgentKitTestDiagnostics.TestJobStore(),
                null,
                "req-test-start");

            Assert.AreEqual("req-test-start", response.requestId);
            Assert.AreEqual(1, response.diagnostics.Length);
            StringAssert.Contains("req-test-start", response.diagnostics[0].attribution);
        }

        [Test]
        public void TestStartForTestsReturnsFailedEnvelopeWhenRunnerBusy()
        {
            var record = TestHostRecord();
            var store = new UnityAgentKitTestDiagnostics.TestJobStore();
            var adapter = new UnityAgentKitTestDiagnostics.UnityTestRunnerAdapter(store);
            adapter.SetActiveJobForTests("job-active", record);

            var start = UnityAgentKitTestDiagnostics.StartForTests(
                "{\"jobId\":\"job-busy\",\"selector\":{\"mode\":\"editmode\"}}",
                record,
                store,
                adapter);

            Assert.AreEqual("failed", start.status);
            Assert.AreEqual("test.runner_busy", start.code);
            var busyJob = JsonUtility.FromJson<UnityAgentKitTestJobResult>(start.data);
            Assert.AreEqual("job-busy", busyJob.jobId);
            Assert.AreEqual("failed", busyJob.state);
            Assert.AreEqual(1, busyJob.diagnostics.Length);
            Assert.AreEqual("test.runner_busy", busyJob.diagnostics[0].code);
            Assert.IsFalse(store.TryGetJob("job-active", out var _));
        }

        [Test]
        public void TestStartForTestsStoresFailedJobWhenAdapterThrows()
        {
            var record = TestHostRecord();
            var store = new UnityAgentKitTestDiagnostics.TestJobStore();
            var start = UnityAgentKitTestDiagnostics.StartForTests(
                "{\"jobId\":\"job-throws\",\"selector\":{\"mode\":\"editmode\"}}",
                record,
                store,
                new ThrowingRunnerAdapter());

            Assert.AreEqual("failed", start.status);
            Assert.AreEqual("test.runner_execute_failed", start.code);
            Assert.AreEqual(1, start.diagnostics.Length);
            Assert.AreEqual("test.runner_execute_failed", start.diagnostics[0].code);
            Assert.IsTrue(store.TryGetJob("job-throws", out var stored));
            Assert.AreEqual("failed", stored.state);
            Assert.AreEqual(1, stored.diagnostics.Length);
            Assert.AreEqual("test.runner_execute_failed", stored.diagnostics[0].code);
        }

        [Test]
        public void TestCallbacksUpdateJobStoreAndResultWritesReportArtifact()
        {
            var record = TestHostRecord();
            var store = new UnityAgentKitTestDiagnostics.TestJobStore();
            var uniqueId = Guid.NewGuid().ToString("N");
            var jobId = "job-" + uniqueId;
            var reportId = "report-" + uniqueId;
            var artifactRoot = TemporaryArtifactRoot("test-workflow-report");

            try
            {
                var job = UnityAgentKitTestDiagnostics.CreateAcceptedJobForTests(
                    record,
                    new UnityAgentKitTestSelectorInput { mode = "editmode" },
                    jobId);
                store.WriteJob(job);

                UnityAgentKitTestDiagnostics.MarkJobRunningForTests(record, store, jobId);
                Assert.IsTrue(store.TryGetJob(jobId, out var running));
                Assert.AreEqual("running", running.state);

                var passedReport = UnityAgentKitTestDiagnostics.CompleteJobForTests(record, store, jobId, failed: 0, reportId: reportId + "-passed");
                Assert.AreEqual("completed", passedReport.terminalState);

                UnityAgentKitTestDiagnostics.MarkJobRunningForTests(record, store, jobId);
                var report = UnityAgentKitTestDiagnostics.CompleteJobForTests(record, store, jobId, failed: 1, reportId: reportId);
                Assert.AreEqual("failed", report.terminalState);
                Assert.AreEqual(1, report.failed);

                var status = UnityAgentKitTestDiagnostics.GetStatusForTests("{\"jobId\":\"" + jobId + "\"}", record, store);
                Assert.AreEqual("succeeded", status.status);
                var statusJob = JsonUtility.FromJson<UnityAgentKitTestJobResult>(status.data);
                Assert.AreEqual("failed", statusJob.state);

                var result = UnityAgentKitTestDiagnostics.GetResultForTests(
                    "{\"jobId\":\"" + jobId + "\"}",
                    record,
                    store,
                    artifactRoot);

                Assert.AreEqual("succeeded", result.status);
                var summary = JsonUtility.FromJson<UnityAgentKitTestReportSummary>(result.data);
                Assert.AreEqual(jobId, summary.jobId);
                Assert.AreEqual(reportId, summary.reportId);
                Assert.AreEqual(1, summary.failed);
                Assert.AreEqual("unity://test-reports/" + summary.reportId, summary.uri);
                Assert.IsFalse(summary.verifiedTestPass);

                var reportPayloadPath = Path.Combine(artifactRoot, "test-reports", summary.reportId + ".json");
                var reportMetadataPath = Path.Combine(artifactRoot, "metadata", "test-reports", summary.reportId + ".json");

                Assert.IsTrue(File.Exists(reportPayloadPath), reportPayloadPath);
                Assert.IsTrue(File.Exists(reportMetadataPath), reportMetadataPath);

                var reportPayload = File.ReadAllText(reportPayloadPath);
                var reportMetadata = File.ReadAllText(reportMetadataPath);

                StringAssert.Contains(summary.reportId, reportPayload);
                StringAssert.Contains(summary.jobId, reportPayload);
                StringAssert.Contains(summary.uri, reportPayload);
                StringAssert.Contains(summary.reportId, reportMetadata);
                StringAssert.Contains(summary.uri, reportMetadata);
                var metadata = JsonUtility.FromJson<UnityAgentKitArtifactMetadataRecord>(reportMetadata);
                Assert.AreEqual(summary.jobId, metadata.producerJobId);
            }
            finally
            {
                if (Directory.Exists(artifactRoot))
                {
                    Directory.Delete(artifactRoot, recursive: true);
                }
            }
        }

        private static UnityAgentKitHostRecord TestHostRecord()
        {
            return new UnityAgentKitHostRecord
            {
                hostName = UnityAgentKitHostRegistry.HostName,
                protocolVersion = UnityAgentKitHostRegistry.ProtocolVersion,
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "host-test",
                hostEpoch = 21,
                port = 49500,
                status = UnityAgentKitHostRegistry.ReadyStatus,
                startedAt = DateTimeOffset.UtcNow.ToString("O"),
                lastProbeAt = DateTimeOffset.UtcNow.ToString("O")
            };
        }

        private static string TemporaryArtifactRoot(string testName)
        {
            var directory = Path.Combine(Path.GetTempPath(), "UnityAgentKitArtifactTests", testName, Guid.NewGuid().ToString("N"), "artifacts");
            Directory.CreateDirectory(directory);
            return directory;
        }

        private sealed class ThrowingRunnerAdapter : UnityAgentKitTestDiagnostics.ITestRunnerAdapter
        {
            public UnityAgentKitTestDiagnostics.UnityAgentKitTestDiscoveryResult Discover(UnityAgentKitTestSelectorInput selector)
            {
                return new UnityAgentKitTestDiagnostics.UnityAgentKitTestDiscoveryResult
                {
                    tests = Array.Empty<UnityAgentKitTestCaseRecord>()
                };
            }

            public UnityAgentKitTestJobResult Start(UnityAgentKitTestSelectorInput selector, string jobId)
            {
                throw new InvalidOperationException("execute failed");
            }
        }

        private sealed class RecordingRunnerAdapter : UnityAgentKitTestDiagnostics.ITestRunnerAdapter
        {
            private readonly UnityAgentKitHostRecord record;
            internal bool ExecuteCalled;

            internal RecordingRunnerAdapter(UnityAgentKitHostRecord record)
            {
                this.record = record;
            }

            public UnityAgentKitTestDiagnostics.UnityAgentKitTestDiscoveryResult Discover(UnityAgentKitTestSelectorInput selector)
            {
                return new UnityAgentKitTestDiagnostics.UnityAgentKitTestDiscoveryResult
                {
                    tests = Array.Empty<UnityAgentKitTestCaseRecord>()
                };
            }

            public UnityAgentKitTestJobResult Start(UnityAgentKitTestSelectorInput selector, string jobId)
            {
                ExecuteCalled = true;
                return UnityAgentKitTestDiagnostics.CreateAcceptedJobForTests(record, selector, jobId);
            }
        }
    }
}
