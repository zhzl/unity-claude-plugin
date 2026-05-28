using System;
using System.Collections.Generic;
using UnityEditor.TestTools.TestRunner.Api;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitTestDiagnostics
    {
        private static readonly TestJobStore productionStore = new TestJobStore();
        private static readonly DiscoveryCacheStore productionDiscoveryCache = new DiscoveryCacheStore();
        private static readonly ITestRunnerAdapter productionAdapter = new UnityTestRunnerAdapter(productionStore, productionDiscoveryCache);

        internal interface ITestRunnerAdapter
        {
            UnityAgentKitTestDiscoveryResult Discover(UnityAgentKitTestSelectorInput selector);
            UnityAgentKitTestJobResult Start(UnityAgentKitTestSelectorInput selector, string jobId);
        }

        internal sealed class UnityAgentKitTestDiscoveryResult
        {
            internal UnityAgentKitTestCaseRecord[] tests = Array.Empty<UnityAgentKitTestCaseRecord>();
            internal UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
        }

        internal sealed class DiscoveryCacheStore
        {
            private readonly Dictionary<string, DiscoveryCacheEntry> entries = new Dictionary<string, DiscoveryCacheEntry>();

            internal bool TryGet(string key, out DiscoveryCacheEntry entry)
            {
                if (entries.TryGetValue(key ?? string.Empty, out var stored))
                {
                    entry = stored.Clone();
                    return true;
                }

                entry = null;
                return false;
            }

            internal void WritePending(string key)
            {
                entries[key ?? string.Empty] = DiscoveryCacheEntry.Pending();
            }

            internal void WriteCompleted(string key, UnityAgentKitTestDiscoveryResult result)
            {
                entries[key ?? string.Empty] = DiscoveryCacheEntry.Completed(result);
            }

            internal void Remove(string key)
            {
                entries.Remove(key ?? string.Empty);
            }
        }

        internal sealed class DiscoveryCacheEntry
        {
            internal bool completed;
            internal UnityAgentKitTestDiscoveryResult result = new UnityAgentKitTestDiscoveryResult();

            internal static DiscoveryCacheEntry Pending()
            {
                return new DiscoveryCacheEntry { completed = false, result = new UnityAgentKitTestDiscoveryResult() };
            }

            internal static DiscoveryCacheEntry Completed(UnityAgentKitTestDiscoveryResult result)
            {
                return new DiscoveryCacheEntry { completed = true, result = CloneDiscoveryResult(result) };
            }

            internal DiscoveryCacheEntry Clone()
            {
                return new DiscoveryCacheEntry { completed = completed, result = CloneDiscoveryResult(result) };
            }
        }

        internal sealed class TestJobStore
        {
            private readonly Dictionary<string, UnityAgentKitTestJobResult> jobs = new Dictionary<string, UnityAgentKitTestJobResult>();
            private readonly Dictionary<string, UnityAgentKitTestReportSummary> reports = new Dictionary<string, UnityAgentKitTestReportSummary>();

            internal void WriteJob(UnityAgentKitTestJobResult job)
            {
                if (job == null || string.IsNullOrEmpty(job.jobId))
                {
                    return;
                }

                jobs[job.jobId] = CloneJob(job);
            }

            internal bool TryGetJob(string jobId, out UnityAgentKitTestJobResult job)
            {
                if (jobs.TryGetValue(jobId ?? string.Empty, out var stored))
                {
                    job = CloneJob(stored);
                    return true;
                }

                job = null;
                return false;
            }

            internal void WriteReport(UnityAgentKitTestReportSummary report)
            {
                if (report == null || string.IsNullOrEmpty(report.jobId))
                {
                    return;
                }

                reports[report.jobId] = CloneReport(report);
            }

            internal bool TryGetReport(string jobId, out UnityAgentKitTestReportSummary report)
            {
                if (reports.TryGetValue(jobId ?? string.Empty, out var stored))
                {
                    report = CloneReport(stored);
                    return true;
                }

                report = null;
                return false;
            }
        }

        internal static UnityAgentKitOperationResponse List(string inputJson, UnityAgentKitHostRecord record, string requestId = "")
        {
            return ListForTests(inputJson, record, selector => productionAdapter.Discover(selector), requestId);
        }

        internal static UnityAgentKitOperationResponse Start(string inputJson, UnityAgentKitHostRecord record, string requestId = "")
        {
            return StartForTests(inputJson, record, productionStore, productionAdapter, requestId);
        }

        internal static UnityAgentKitOperationResponse GetStatus(string inputJson, UnityAgentKitHostRecord record, string requestId = "")
        {
            return GetStatusForTests(inputJson, record, productionStore, requestId);
        }

        internal static UnityAgentKitOperationResponse GetResult(string inputJson, UnityAgentKitHostRecord record, string requestId = "")
        {
            return GetResultForTests(inputJson, record, productionStore, UnityAgentKitArtifactContracts.GetArtifactRoot(), requestId);
        }

        internal static UnityAgentKitOperationResponse ListForTests(string inputJson, UnityAgentKitHostRecord record, Func<UnityAgentKitTestSelectorInput, UnityAgentKitTestCaseRecord[]> discover, string requestId = "")
        {
            return ListForTests(inputJson, record, selector => new UnityAgentKitTestDiscoveryResult
            {
                tests = discover != null ? discover(selector) : Array.Empty<UnityAgentKitTestCaseRecord>()
            }, requestId);
        }

        internal static UnityAgentKitOperationResponse ListForTests(string inputJson, UnityAgentKitHostRecord record, Func<UnityAgentKitTestSelectorInput, UnityAgentKitTestDiscoveryResult> discover, string requestId = "")
        {
            var startedAt = Now();
            if (!TryParseInput(inputJson, out var input, out var reject))
            {
                return Rejected("test.list", record, reject, "Test operation input is invalid.", startedAt, requestId);
            }

            var selector = NormalizeSelector(input.selector);
            if (!TryValidateSelector(selector, out reject))
            {
                return Rejected("test.list", record, reject, SelectorRejectedMessage(reject), startedAt, requestId);
            }

            var discovery = discover != null ? discover(selector) : null;
            if (DiscoveryIsPending(discovery))
            {
                return Uncertain("test.list", record, "test.discovery_pending", "Test discovery is pending; retry test.list in the same Unity host session.", startedAt, requestId);
            }

            if (DiscoveryHasFailure(discovery, out var discoveryFailure))
            {
                return Failed("test.list", record, discoveryFailure.code, discoveryFailure.message, startedAt, requestId);
            }

            return Succeeded("test.list", record, "Test list read.", JsonUtility.ToJson(CreateListResult(record, selector, discovery)), startedAt, requestId);
        }

        internal static UnityAgentKitOperationResponse StartForTests(string inputJson, UnityAgentKitHostRecord record, TestJobStore store, ITestRunnerAdapter adapter, string requestId = "")
        {
            var startedAt = Now();
            if (!TryParseInput(inputJson, out var input, out var reject))
            {
                return Rejected("test.start", record, reject, "Test operation input is invalid.", startedAt, requestId);
            }

            var selector = NormalizeSelector(input.selector);
            if (!TryValidateSelector(selector, out reject))
            {
                return Rejected("test.start", record, reject, SelectorRejectedMessage(reject), startedAt, requestId);
            }

            if (adapter == null)
            {
                return Failed("test.start", record, "test.runner_adapter_missing", "Test runner adapter is not available.", startedAt, requestId);
            }

            var jobId = string.IsNullOrEmpty(input.jobId) ? "test-job-" + Guid.NewGuid().ToString("N") : input.jobId;
            var productionAdapter = adapter as UnityTestRunnerAdapter;
            if (productionAdapter != null)
            {
                productionAdapter.SetHostRecord(record);
            }

            UnityAgentKitTestJobResult job;
            try
            {
                job = adapter.Start(selector, jobId);
            }
            catch (Exception exception)
            {
                var failedJob = CreateFailedJobForTests(record, selector, jobId, "test.runner_execute_failed", "Test runner execution failed: " + exception.Message);
                store.WriteJob(failedJob);
                return Failed("test.start", record, "test.runner_execute_failed", "Test runner execution failed.", startedAt, requestId);
            }

            if (!store.TryGetJob(job.jobId, out var _))
            {
                store.WriteJob(job);
            }

            if (string.Equals(job.state, "failed", StringComparison.Ordinal))
            {
                var diagnostic = FirstDiagnostic(job.diagnostics);
                var code = !string.IsNullOrEmpty(diagnostic.code) ? diagnostic.code : "test.runner_failed";
                var message = !string.IsNullOrEmpty(diagnostic.message) ? diagnostic.message : "Test runner failed to start the job.";
                return Failed("test.start", record, code, message, JsonUtility.ToJson(job), startedAt, requestId);
            }

            return Succeeded("test.start", record, "Test job accepted.", JsonUtility.ToJson(job), startedAt, requestId);
        }

        internal static UnityAgentKitOperationResponse GetStatusForTests(string inputJson, UnityAgentKitHostRecord record, TestJobStore store, string requestId = "")
        {
            var startedAt = Now();
            if (!TryParseInput(inputJson, out var input, out var reject))
            {
                return Rejected("test.status.get", record, reject, "Test operation input is invalid.", startedAt, requestId);
            }

            if (!store.TryGetJob(input.jobId, out var job))
            {
                return Uncertain("test.status.get", record, "test.job_missing", "No test job is available for the requested jobId.", startedAt, requestId);
            }

            return Succeeded("test.status.get", record, "Test job status read.", JsonUtility.ToJson(job), startedAt, requestId);
        }

        internal static UnityAgentKitOperationResponse GetResultForTests(string inputJson, UnityAgentKitHostRecord record, TestJobStore store, string artifactRoot, string requestId = "")
        {
            var startedAt = Now();
            if (!TryParseInput(inputJson, out var input, out var reject))
            {
                return Rejected("test.result.get", record, reject, "Test operation input is invalid.", startedAt, requestId);
            }

            if (!store.TryGetReport(input.jobId, out var report))
            {
                return Uncertain("test.result.get", record, "test.report_missing", "No terminal test report is available for the requested jobId.", startedAt, requestId);
            }

            UnityAgentKitArtifactContracts.WriteTestReportArtifact(artifactRoot, report.reportId, JsonUtility.ToJson(report, true), record, "result.get", report.jobId);
            return Succeeded("test.result.get", record, "Test report read.", JsonUtility.ToJson(report), startedAt, requestId);
        }

        internal static UnityAgentKitTestJobResult CreateAcceptedJobForTests(UnityAgentKitHostRecord record, UnityAgentKitTestSelectorInput selector, string jobId)
        {
            return CreateJob(record, selector, jobId, "accepted", Array.Empty<UnityAgentKitDiagnostic>());
        }

        internal static UnityAgentKitTestJobResult CreateFailedJobForTests(UnityAgentKitHostRecord record, UnityAgentKitTestSelectorInput selector, string jobId, string code, string message)
        {
            return CreateJob(record, selector, jobId, "failed", new[] { Diagnostic("error", code, message, "test.start", string.Empty) });
        }

        private static UnityAgentKitTestJobResult CreateJob(UnityAgentKitHostRecord record, UnityAgentKitTestSelectorInput selector, string jobId, string state, UnityAgentKitDiagnostic[] diagnostics)
        {
            var now = Now();
            return new UnityAgentKitTestJobResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                jobId = jobId ?? string.Empty,
                state = state,
                selector = CloneSelector(NormalizeSelector(selector)),
                createdAt = now,
                updatedAt = now,
                reportId = string.Empty,
                diagnostics = diagnostics ?? Array.Empty<UnityAgentKitDiagnostic>()
            };
        }

        internal static void MarkJobRunningForTests(UnityAgentKitHostRecord record, TestJobStore store, string jobId)
        {
            if (!store.TryGetJob(jobId, out var job))
            {
                return;
            }

            job.state = "running";
            job.updatedAt = Now();
            store.WriteJob(job);
        }

        internal static UnityAgentKitTestReportSummary CompleteJobForTests(UnityAgentKitHostRecord record, TestJobStore store, string jobId, int failed, string reportId)
        {
            if (!store.TryGetJob(jobId, out var job))
            {
                job = CreateAcceptedJobForTests(record, new UnityAgentKitTestSelectorInput(), jobId);
            }

            var total = Math.Max(1, failed);
            var failures = failed > 0 ? new[]
            {
                new UnityAgentKitTestFailureRecord
                {
                    name = "SyntheticFailure",
                    fullName = "SyntheticFailure",
                    message = "Synthetic test failure.",
                    stackTrace = string.Empty
                }
            } : Array.Empty<UnityAgentKitTestFailureRecord>();
            var terminalState = failed > 0 ? "failed" : "completed";
            var summary = CreateReport(record, job, reportId, total, total - failed, failed, 0, 0, 0, failures, terminalState);
            job.state = terminalState;
            job.reportId = summary.reportId;
            job.updatedAt = Now();
            store.WriteJob(job);
            store.WriteReport(summary);
            return summary;
        }

        private static UnityAgentKitTestReportSummary CreateReport(UnityAgentKitHostRecord record, UnityAgentKitTestJobResult job, string reportId, int total, int passed, int failed, int errors, int skipped, int inconclusive, UnityAgentKitTestFailureRecord[] failures, string terminalState)
        {
            var id = string.IsNullOrEmpty(reportId) ? "test-report-" + Guid.NewGuid().ToString("N") : reportId;
            return new UnityAgentKitTestReportSummary
            {
                schemaVersion = 1,
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                jobId = job != null ? job.jobId : string.Empty,
                reportId = id,
                uri = "unity://test-reports/" + id,
                mode = job != null && job.selector != null ? job.selector.mode : "editmode",
                selector = job != null ? CloneSelector(job.selector) : new UnityAgentKitTestSelectorInput(),
                total = total,
                passed = passed,
                failed = failed,
                errors = errors,
                skipped = skipped,
                inconclusive = inconclusive,
                verifiedTestPass = total > 0 && failed == 0 && errors == 0,
                terminalState = terminalState,
                failures = failures ?? Array.Empty<UnityAgentKitTestFailureRecord>(),
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };
        }

        private static bool TryParseInput(string inputJson, out UnityAgentKitTestOperationInput input, out string code)
        {
            code = string.Empty;
            try
            {
                input = string.IsNullOrEmpty(inputJson) ? new UnityAgentKitTestOperationInput() : JsonUtility.FromJson<UnityAgentKitTestOperationInput>(inputJson);
            }
            catch
            {
                input = null;
                code = "test.input_invalid";
                return false;
            }

            if (input == null)
            {
                input = new UnityAgentKitTestOperationInput();
            }

            return true;
        }

        private static UnityAgentKitTestSelectorInput NormalizeSelector(UnityAgentKitTestSelectorInput selector)
        {
            var normalized = selector != null ? CloneSelector(selector) : new UnityAgentKitTestSelectorInput();
            normalized.mode = string.IsNullOrEmpty(normalized.mode) ? "editmode" : normalized.mode.Trim().ToLowerInvariant();
            normalized.assembly = (normalized.assembly ?? string.Empty).Trim();
            normalized.className = (normalized.className ?? string.Empty).Trim();
            normalized.methodName = (normalized.methodName ?? string.Empty).Trim();
            return normalized;
        }

        private static bool TryValidateSelector(UnityAgentKitTestSelectorInput selector, out string code)
        {
            if (selector == null || selector.mode != "editmode")
            {
                code = "unsupported_selector_mode";
                return false;
            }

            if (!string.IsNullOrEmpty(selector.assembly))
            {
                code = "unsupported_selector_assembly";
                return false;
            }

            code = string.Empty;
            return true;
        }

        private static string SelectorRejectedMessage(string code)
        {
            return code == "unsupported_selector_assembly"
                ? "5D-01a Unity test bridge does not support assembly selectors."
                : "5D-01a Unity test bridge supports only editmode selector mode.";
        }

        private static UnityAgentKitTestListResult CreateListResult(UnityAgentKitHostRecord record, UnityAgentKitTestSelectorInput selector, UnityAgentKitTestDiscoveryResult discovery)
        {
            var tests = discovery != null && discovery.tests != null ? discovery.tests : Array.Empty<UnityAgentKitTestCaseRecord>();
            var diagnostics = discovery != null && discovery.diagnostics != null ? discovery.diagnostics : Array.Empty<UnityAgentKitDiagnostic>();
            return new UnityAgentKitTestListResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                selector = CloneSelector(selector),
                tests = tests,
                total = tests.Length,
                verifiedTestPass = false,
                diagnostics = diagnostics
            };
        }

        private static UnityAgentKitTestDiscoveryResult DiscoverWithCache(UnityAgentKitTestSelectorInput selector, DiscoveryCacheStore cache, Action<UnityAgentKitTestSelectorInput, Action<UnityAgentKitTestDiscoveryResult>> retrieve)
        {
            var cacheKey = DiscoveryCacheKey(selector);
            if (cache.TryGet(cacheKey, out var cached))
            {
                return cached.completed ? cached.result : PendingDiscoveryResult();
            }

            cache.WritePending(cacheKey);
            try
            {
                retrieve(selector, result => cache.WriteCompleted(cacheKey, result));
            }
            catch (Exception exception)
            {
                cache.Remove(cacheKey);
                return FailedDiscoveryResult("test.discovery_schedule_failed", "Test discovery scheduling failed: " + exception.Message);
            }

            if (cache.TryGet(cacheKey, out cached) && cached.completed)
            {
                return cached.result;
            }

            return PendingDiscoveryResult();
        }

        private static UnityAgentKitTestDiscoveryResult PendingDiscoveryResult()
        {
            return new UnityAgentKitTestDiscoveryResult
            {
                tests = Array.Empty<UnityAgentKitTestCaseRecord>(),
                diagnostics = new[]
                {
                    Diagnostic("warning", "test.discovery_pending", "Test discovery is pending; retry test.list in the same Unity host session.", "test.list")
                }
            };
        }

        private static UnityAgentKitTestDiscoveryResult FailedDiscoveryResult(string code, string message)
        {
            return new UnityAgentKitTestDiscoveryResult
            {
                tests = Array.Empty<UnityAgentKitTestCaseRecord>(),
                diagnostics = new[]
                {
                    Diagnostic("error", code, message, "test.list")
                }
            };
        }

        private static bool DiscoveryIsPending(UnityAgentKitTestDiscoveryResult discovery)
        {
            return TryGetDiscoveryDiagnostic(discovery, "test.discovery_pending", out _);
        }

        private static bool DiscoveryHasFailure(UnityAgentKitTestDiscoveryResult discovery, out UnityAgentKitDiagnostic failure)
        {
            return TryGetDiscoveryDiagnostic(discovery, "test.discovery_schedule_failed", out failure);
        }

        private static bool TryGetDiscoveryDiagnostic(UnityAgentKitTestDiscoveryResult discovery, string code, out UnityAgentKitDiagnostic match)
        {
            if (discovery != null && discovery.diagnostics != null)
            {
                foreach (var diagnostic in discovery.diagnostics)
                {
                    if (diagnostic != null && diagnostic.code == code)
                    {
                        match = diagnostic;
                        return true;
                    }
                }
            }

            match = new UnityAgentKitDiagnostic();
            return false;
        }

        private static string DiscoveryCacheKey(UnityAgentKitTestSelectorInput selector)
        {
            var normalized = NormalizeSelector(selector);
            return normalized.mode + "|" + normalized.className + "|" + normalized.methodName;
        }

        private static UnityAgentKitOperationResponse Succeeded(string operation, UnityAgentKitHostRecord record, string summary, string data, string startedAt, string requestId = "")
        {
            return Create("succeeded", operation, record, summary, data, Array.Empty<UnityAgentKitDiagnostic>(), string.Empty, string.Empty, startedAt, requestId);
        }

        private static UnityAgentKitOperationResponse Rejected(string operation, UnityAgentKitHostRecord record, string code, string message, string startedAt, string requestId = "")
        {
            return Create("rejected", operation, record, message, string.Empty, new[] { Diagnostic("warning", code, message, operation, requestId) }, code, message, startedAt, requestId);
        }

        private static UnityAgentKitOperationResponse Failed(string operation, UnityAgentKitHostRecord record, string code, string message, string startedAt, string requestId = "")
        {
            return Failed(operation, record, code, message, string.Empty, startedAt, requestId);
        }

        private static UnityAgentKitOperationResponse Failed(string operation, UnityAgentKitHostRecord record, string code, string message, string data, string startedAt, string requestId = "")
        {
            return Create("failed", operation, record, message, data, new[] { Diagnostic("error", code, message, operation, requestId) }, code, message, startedAt, requestId);
        }

        private static UnityAgentKitOperationResponse Uncertain(string operation, UnityAgentKitHostRecord record, string code, string message, string startedAt, string requestId = "")
        {
            return Create("uncertain", operation, record, message, string.Empty, new[] { Diagnostic("error", code, message, operation, requestId) }, code, message, startedAt, requestId);
        }

        private static UnityAgentKitOperationResponse Create(string status, string operation, UnityAgentKitHostRecord record, string summary, string data, UnityAgentKitDiagnostic[] diagnostics, string code, string message, string startedAt, string requestId = "")
        {
            var completedAt = Now();
            return new UnityAgentKitOperationResponse
            {
                status = status,
                operation = operation,
                requestId = requestId ?? string.Empty,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                summary = summary ?? string.Empty,
                data = data ?? string.Empty,
                diagnostics = diagnostics ?? Array.Empty<UnityAgentKitDiagnostic>(),
                startedAt = startedAt,
                completedAt = completedAt,
                durationMs = DurationMs(startedAt, completedAt),
                code = code ?? string.Empty,
                message = message ?? string.Empty,
                metadata = string.Empty
            };
        }

        private static UnityAgentKitDiagnostic Diagnostic(string severity, string code, string message, string operation, string requestId = "")
        {
            return new UnityAgentKitDiagnostic
            {
                source = "unity-host",
                severity = severity,
                code = code ?? string.Empty,
                message = message ?? string.Empty,
                details = string.Empty,
                attribution = "{\"operation\":\"" + Escape(operation) + "\",\"requestId\":\"" + Escape(requestId) + "\"}"
            };
        }

        private static UnityAgentKitDiagnostic FirstDiagnostic(UnityAgentKitDiagnostic[] diagnostics)
        {
            return diagnostics != null && diagnostics.Length > 0 && diagnostics[0] != null ? diagnostics[0] : new UnityAgentKitDiagnostic();
        }

        private static UnityAgentKitTestSelectorInput CloneSelector(UnityAgentKitTestSelectorInput selector)
        {
            if (selector == null)
            {
                return new UnityAgentKitTestSelectorInput();
            }

            return new UnityAgentKitTestSelectorInput
            {
                mode = selector.mode ?? string.Empty,
                assembly = selector.assembly ?? string.Empty,
                className = selector.className ?? string.Empty,
                methodName = selector.methodName ?? string.Empty
            };
        }

        private static UnityAgentKitTestDiscoveryResult CloneDiscoveryResult(UnityAgentKitTestDiscoveryResult result)
        {
            if (result == null)
            {
                return new UnityAgentKitTestDiscoveryResult();
            }

            return new UnityAgentKitTestDiscoveryResult
            {
                tests = CloneTestRecords(result.tests),
                diagnostics = CloneDiagnostics(result.diagnostics)
            };
        }

        private static UnityAgentKitTestCaseRecord[] CloneTestRecords(UnityAgentKitTestCaseRecord[] tests)
        {
            if (tests == null || tests.Length == 0)
            {
                return Array.Empty<UnityAgentKitTestCaseRecord>();
            }

            var clones = new UnityAgentKitTestCaseRecord[tests.Length];
            for (var index = 0; index < tests.Length; index++)
            {
                var test = tests[index];
                clones[index] = test == null ? new UnityAgentKitTestCaseRecord() : new UnityAgentKitTestCaseRecord
                {
                    id = test.id ?? string.Empty,
                    name = test.name ?? string.Empty,
                    fullName = test.fullName ?? string.Empty,
                    assembly = test.assembly ?? string.Empty,
                    className = test.className ?? string.Empty,
                    mode = test.mode ?? string.Empty
                };
            }

            return clones;
        }

        private static UnityAgentKitDiagnostic[] CloneDiagnostics(UnityAgentKitDiagnostic[] diagnostics)
        {
            if (diagnostics == null || diagnostics.Length == 0)
            {
                return Array.Empty<UnityAgentKitDiagnostic>();
            }

            var clones = new UnityAgentKitDiagnostic[diagnostics.Length];
            for (var index = 0; index < diagnostics.Length; index++)
            {
                var diagnostic = diagnostics[index];
                clones[index] = diagnostic == null ? new UnityAgentKitDiagnostic() : new UnityAgentKitDiagnostic
                {
                    source = diagnostic.source ?? string.Empty,
                    severity = diagnostic.severity ?? string.Empty,
                    code = diagnostic.code ?? string.Empty,
                    message = diagnostic.message ?? string.Empty,
                    details = diagnostic.details ?? string.Empty,
                    attribution = diagnostic.attribution ?? string.Empty
                };
            }

            return clones;
        }

        private static UnityAgentKitTestJobResult CloneJob(UnityAgentKitTestJobResult job)
        {
            return JsonUtility.FromJson<UnityAgentKitTestJobResult>(JsonUtility.ToJson(job));
        }

        private static UnityAgentKitTestReportSummary CloneReport(UnityAgentKitTestReportSummary report)
        {
            return JsonUtility.FromJson<UnityAgentKitTestReportSummary>(JsonUtility.ToJson(report));
        }

        private static string Now()
        {
            return DateTimeOffset.UtcNow.ToString("O");
        }

        private static int DurationMs(string startedAt, string completedAt)
        {
            if (DateTimeOffset.TryParse(startedAt, out var started) && DateTimeOffset.TryParse(completedAt, out var completed))
            {
                var duration = completed - started;
                return duration.TotalMilliseconds < 0 ? 0 : (int)Math.Round(duration.TotalMilliseconds);
            }

            return 0;
        }

        private static string Escape(string value)
        {
            return (value ?? string.Empty).Replace("\\", "\\\\").Replace("\"", "\\\"");
        }

        internal sealed class UnityTestRunnerAdapter : ITestRunnerAdapter, ICallbacks
        {
            private readonly TestJobStore store;
            private readonly DiscoveryCacheStore discoveryCache;
            private TestRunnerApi api;
            private bool callbacksRegistered;
            private string activeJobId = string.Empty;
            private UnityAgentKitHostRecord activeRecord;

            internal UnityTestRunnerAdapter(TestJobStore store) : this(store, new DiscoveryCacheStore())
            {
            }

            internal UnityTestRunnerAdapter(TestJobStore store, DiscoveryCacheStore discoveryCache)
            {
                this.store = store;
                this.discoveryCache = discoveryCache ?? new DiscoveryCacheStore();
            }

            internal void SetHostRecord(UnityAgentKitHostRecord record)
            {
                activeRecord = record;
            }

            internal void SetActiveJobForTests(string jobId, UnityAgentKitHostRecord record)
            {
                activeJobId = jobId ?? string.Empty;
                activeRecord = record;
            }

            public UnityAgentKitTestDiscoveryResult Discover(UnityAgentKitTestSelectorInput selector)
            {
                return DiscoverWithCache(selector, discoveryCache, (normalizedSelector, complete) =>
                {
                    EnsureApi();
                    api.RetrieveTestList(ToTestMode(normalizedSelector.mode), testRoot =>
                    {
                        var collected = new List<UnityAgentKitTestCaseRecord>();
                        var diagnostics = new List<UnityAgentKitDiagnostic>();
                        CollectTests(testRoot, normalizedSelector, collected, diagnostics);
                        complete(new UnityAgentKitTestDiscoveryResult
                        {
                            tests = collected.ToArray(),
                            diagnostics = diagnostics.ToArray()
                        });
                    });
                });
            }

            public UnityAgentKitTestJobResult Start(UnityAgentKitTestSelectorInput selector, string jobId)
            {
                if (!string.IsNullOrEmpty(activeJobId))
                {
                    return CreateFailedJobForTests(activeRecord, selector, jobId, "test.runner_busy", "Test runner already has an active job.");
                }

                EnsureApi();
                EnsureCallbacksRegistered();
                activeJobId = jobId;
                if (activeRecord == null)
                {
                    activeRecord = UnityAgentKitHostRegistry.ReadRecord();
                }

                var job = CreateAcceptedJobForTests(activeRecord, selector, jobId);
                store.WriteJob(job);
                try
                {
                    var settings = new ExecutionSettings(ToFilter(selector));
                    api.Execute(settings);
                }
                catch (Exception exception)
                {
                    var failedJob = CreateFailedJobForTests(activeRecord, selector, jobId, "test.runner_execute_failed", "Test runner execution failed: " + exception.Message);
                    store.WriteJob(failedJob);
                    Cleanup();
                    return failedJob;
                }

                return job;
            }

            public void RunStarted(ITestAdaptor testsToRun)
            {
                MarkJobRunningForTests(activeRecord, store, activeJobId);
            }

            public void RunFinished(ITestResultAdaptor result)
            {
                try
                {
                    if (!store.TryGetJob(activeJobId, out var job))
                    {
                        return;
                    }

                    var reportId = "test-report-" + Guid.NewGuid().ToString("N");
                    var failed = result.FailCount;
                    var errors = 0;
                    var skipped = result.SkipCount;
                    var inconclusive = result.InconclusiveCount;
                    var passed = result.PassCount;
                    var total = passed + failed + skipped + inconclusive;
                    var failures = CollectFailures(result);
                    var terminalState = failed > 0 || errors > 0 ? "failed" : "completed";
                    var report = CreateReport(activeRecord, job, reportId, total, passed, failed, errors, skipped, inconclusive, failures, terminalState);
                    job.state = terminalState;
                    job.reportId = report.reportId;
                    job.updatedAt = Now();
                    store.WriteJob(job);
                    store.WriteReport(report);
                }
                finally
                {
                    Cleanup();
                }
            }

            public void TestStarted(ITestAdaptor test)
            {
            }

            public void TestFinished(ITestResultAdaptor result)
            {
            }

            private static Filter ToFilter(UnityAgentKitTestSelectorInput selector)
            {
                var filter = new Filter();
                filter.testMode = ToTestMode(selector.mode);
                if (!string.IsNullOrEmpty(selector.className))
                {
                    filter.testNames = new[] { string.IsNullOrEmpty(selector.methodName) ? selector.className : selector.className + "." + selector.methodName };
                }
                else if (!string.IsNullOrEmpty(selector.methodName))
                {
                    filter.testNames = new[] { selector.methodName };
                }

                return filter;
            }

            internal static string[] TestNamesForTests(UnityAgentKitTestSelectorInput selector)
            {
                return ToFilter(NormalizeSelector(selector)).testNames ?? Array.Empty<string>();
            }

            private void EnsureApi()
            {
                if (api == null)
                {
                    api = ScriptableObject.CreateInstance<TestRunnerApi>();
                }
            }

            private void EnsureCallbacksRegistered()
            {
                if (callbacksRegistered)
                {
                    return;
                }

                api.RegisterCallbacks(this);
                callbacksRegistered = true;
            }

            private void Cleanup()
            {
                activeJobId = string.Empty;
                if (api == null)
                {
                    callbacksRegistered = false;
                    return;
                }

                if (callbacksRegistered)
                {
                    api.UnregisterCallbacks(this);
                    callbacksRegistered = false;
                }

                ScriptableObject.DestroyImmediate(api);
                api = null;
            }

            private static TestMode ToTestMode(string mode)
            {
                return TestMode.EditMode;
            }

            private static void CollectTests(ITestAdaptor test, UnityAgentKitTestSelectorInput selector, List<UnityAgentKitTestCaseRecord> tests, List<UnityAgentKitDiagnostic> diagnostics)
            {
                if (test == null)
                {
                    return;
                }

                var childCount = 0;
                foreach (var child in test.Children)
                {
                    childCount++;
                    CollectTests(child, selector, tests, diagnostics);
                }

                if (childCount == 0 && MatchesSelector(test, selector))
                {
                    var fullName = test.FullName ?? string.Empty;
                    var assembly = AssemblyForTestRecord(test);
                    if (assembly == "unknown")
                    {
                        diagnostics.Add(Diagnostic("warning", "test.discovery_assembly_unknown", "Test discovery could not prove the assembly for test case: " + fullName, "test.list"));
                    }

                    tests.Add(new UnityAgentKitTestCaseRecord
                    {
                        id = !string.IsNullOrEmpty(fullName) ? fullName : test.Name ?? string.Empty,
                        name = test.Name ?? string.Empty,
                        fullName = fullName,
                        assembly = assembly,
                        className = ClassNameForTestRecord(test, selector),
                        mode = selector.mode
                    });
                }
            }

            private static bool MatchesSelector(ITestAdaptor test, UnityAgentKitTestSelectorInput selector)
            {
                return MatchesSelectorValues(test.FullName ?? string.Empty, selector);
            }

            private static bool MatchesSelectorValues(string fullName, UnityAgentKitTestSelectorInput selector)
            {
                if (!string.IsNullOrEmpty(selector.className) &&
                    !string.Equals(fullName, selector.className, StringComparison.Ordinal) &&
                    !fullName.StartsWith(selector.className + ".", StringComparison.Ordinal))
                {
                    return false;
                }

                if (!string.IsNullOrEmpty(selector.methodName) && !fullName.EndsWith("." + selector.methodName, StringComparison.Ordinal))
                {
                    return false;
                }

                return true;
            }

            private static string GetAssemblyName(ITestAdaptor test)
            {
                if (test == null)
                {
                    return string.Empty;
                }

                var type = test.GetType();
                var property = type.GetProperty("AssemblyName") ?? type.GetProperty("Assembly");
                var value = property != null ? property.GetValue(test, null) : null;
                return value != null ? value.ToString() : string.Empty;
            }

            private static string AssemblyForTestRecord(ITestAdaptor test)
            {
                var assembly = GetAssemblyName(test);
                return !string.IsNullOrEmpty(assembly) ? assembly : "unknown";
            }

            private static string ClassNameForTestRecord(ITestAdaptor test, UnityAgentKitTestSelectorInput selector)
            {
                if (!string.IsNullOrEmpty(selector.className))
                {
                    return selector.className;
                }

                var fullName = test != null ? test.FullName ?? string.Empty : string.Empty;
                var name = test != null ? test.Name ?? string.Empty : string.Empty;
                return DeriveClassName(fullName, name);
            }

            private static string DeriveClassName(string fullName, string name)
            {
                if (!string.IsNullOrEmpty(fullName) && !string.IsNullOrEmpty(name) && fullName.EndsWith("." + name, StringComparison.Ordinal))
                {
                    return fullName.Substring(0, fullName.Length - name.Length - 1);
                }

                return !string.IsNullOrEmpty(fullName) ? fullName : "unknown";
            }

            internal static UnityAgentKitTestDiscoveryResult PendingDiscoveryResultForTests()
            {
                return PendingDiscoveryResult();
            }

            internal static UnityAgentKitTestDiscoveryResult DiscoverWithCacheForTests(UnityAgentKitTestSelectorInput selector, DiscoveryCacheStore cache, Action<UnityAgentKitTestSelectorInput, Action<UnityAgentKitTestDiscoveryResult>> retrieve)
            {
                return DiscoverWithCache(NormalizeSelector(selector), cache, retrieve);
            }

            internal static UnityAgentKitTestDiscoveryResult CompletedDiscoveryResultForTests(UnityAgentKitTestCaseRecord[] tests, UnityAgentKitDiagnostic[] diagnostics = null)
            {
                return new UnityAgentKitTestDiscoveryResult
                {
                    tests = tests ?? Array.Empty<UnityAgentKitTestCaseRecord>(),
                    diagnostics = diagnostics ?? Array.Empty<UnityAgentKitDiagnostic>()
                };
            }

            internal static UnityAgentKitTestDiscoveryResult DiscoveryResultWithUnknownAssemblyForTests(UnityAgentKitTestCaseRecord[] tests)
            {
                var records = CloneTestRecords(tests);
                var diagnostics = new List<UnityAgentKitDiagnostic>();
                foreach (var record in records)
                {
                    if (record != null && string.IsNullOrEmpty(record.assembly))
                    {
                        record.assembly = "unknown";
                    }

                    if (record != null && record.assembly == "unknown")
                    {
                        diagnostics.Add(Diagnostic("warning", "test.discovery_assembly_unknown", "Test discovery could not prove the assembly for test case: " + record.fullName, "test.list"));
                    }
                }

                return new UnityAgentKitTestDiscoveryResult
                {
                    tests = records,
                    diagnostics = diagnostics.ToArray()
                };
            }

            internal static UnityAgentKitTestCaseRecord TestRecordForTests(string fullName, string name, string assembly, UnityAgentKitTestSelectorInput selector)
            {
                var normalized = NormalizeSelector(selector);
                var recordFullName = fullName ?? string.Empty;
                var recordName = name ?? string.Empty;
                var recordAssembly = !string.IsNullOrEmpty(assembly) ? assembly : "unknown";
                var recordClassName = !string.IsNullOrEmpty(normalized.className) ? normalized.className : DeriveClassName(recordFullName, recordName);
                return new UnityAgentKitTestCaseRecord
                {
                    id = !string.IsNullOrEmpty(recordFullName) ? recordFullName : recordName,
                    name = recordName,
                    fullName = recordFullName,
                    assembly = recordAssembly,
                    className = recordClassName,
                    mode = normalized.mode
                };
            }

            internal static bool MatchesSelectorForTests(string fullName, string assembly, UnityAgentKitTestSelectorInput selector)
            {
                return MatchesSelectorValues(fullName ?? string.Empty, NormalizeSelector(selector));
            }

            private static UnityAgentKitTestFailureRecord[] CollectFailures(ITestResultAdaptor result)
            {
                var failures = new List<UnityAgentKitTestFailureRecord>();
                CollectFailures(result, failures);
                return failures.ToArray();
            }

            private static void CollectFailures(ITestResultAdaptor result, List<UnityAgentKitTestFailureRecord> failures)
            {
                if (result == null)
                {
                    return;
                }

                var childCount = 0;
                foreach (var child in result.Children)
                {
                    childCount++;
                    CollectFailures(child, failures);
                }

                if (result.FailCount > 0 && childCount == 0)
                {
                    failures.Add(new UnityAgentKitTestFailureRecord
                    {
                        name = result.Name ?? string.Empty,
                        fullName = result.FullName ?? string.Empty,
                        message = result.Message ?? string.Empty,
                        stackTrace = result.StackTrace ?? string.Empty
                    });
                }
            }
        }
    }
}
