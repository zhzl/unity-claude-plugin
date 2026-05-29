using System;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitOperationRouter
    {
        internal const string InvalidRequestOperation = "host.invalidRequest";
        internal const string EchoOperation = "host.echo";
        internal const string ThreadCheckOperation = "host.threadCheck";
        internal const string EditorStatusGetOperation = "editor.status.get";
        internal const string PlayModeStateGetOperation = "playmode.state.get";
        internal const string PlayModeEnterRequestOperation = "playmode.enter.request";
        internal const string PlayModeExitRequestOperation = "playmode.exit.request";
        internal const string CompileStateGetOperation = "compile.state.get";
        internal const string CompileRequestOperation = "compile.request";
        internal const string CompileReportGetOperation = "compile.report.get";
        internal const string ConsoleCountOperation = "console.count";
        internal const string ConsoleSnapshotOperation = "console.snapshot";
        internal const string ConsoleClearOperation = "console.clear";
        internal const string TestListOperation = "test.list";
        internal const string TestStartOperation = "test.start";
        internal const string TestStatusGetOperation = "test.status.get";
        internal const string TestResultGetOperation = "test.result.get";
        internal const string ThrowOperation = "host.throw";
        internal const string PendingDispatchTimeoutOperation = "host.pendingDispatchTimeout";

        internal static string NormalizeOperation(string operation)
        {
            return (operation ?? string.Empty).Trim();
        }

        internal static UnityAgentKitOperationResponse Route(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record)
        {
            var startedAt = Now();
            var operation = NormalizeOperation(request != null ? request.operation : string.Empty);
            var requestId = request != null ? request.requestId ?? string.Empty : string.Empty;

            if (string.IsNullOrEmpty(operation))
            {
                return Rejected(operation, requestId, record, "operation.empty", "Operation is required.", startedAt);
            }

            if (operation == EchoOperation)
            {
                return Succeeded(operation, requestId, record, "Echo completed.", request != null ? request.inputJson ?? string.Empty : string.Empty, startedAt);
            }

            if (RequiresMainThreadDispatch(operation))
            {
                return Rejected(operation, requestId, record, "host.dispatch_required", "Operation requires main-thread dispatch.", startedAt);
            }

            return Rejected(operation, requestId, record, "operation.unknown", "Unknown operation: " + operation, startedAt);
        }

        internal static bool RequiresMainThreadDispatch(string operation)
        {
            var normalized = NormalizeOperation(operation);
            return normalized == ThreadCheckOperation ||
                normalized == EditorStatusGetOperation ||
                normalized == PlayModeStateGetOperation ||
                normalized == PlayModeEnterRequestOperation ||
                normalized == PlayModeExitRequestOperation ||
                normalized == CompileStateGetOperation ||
                normalized == CompileRequestOperation ||
                normalized == CompileReportGetOperation ||
                normalized == ConsoleCountOperation ||
                normalized == ConsoleSnapshotOperation ||
                normalized == ConsoleClearOperation ||
                normalized == TestListOperation ||
                normalized == TestStartOperation ||
                normalized == TestStatusGetOperation ||
                normalized == TestResultGetOperation ||
                normalized == ThrowOperation ||
                normalized == PendingDispatchTimeoutOperation;
        }

        internal static UnityAgentKitOperationResponse RunOnMainThread(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record, int capturedMainThreadId)
        {
            var startedAt = Now();
            var operation = NormalizeOperation(request != null ? request.operation : string.Empty);
            var requestId = request != null ? request.requestId ?? string.Empty : string.Empty;

            if (operation == ThreadCheckOperation)
            {
                var result = new UnityAgentKitThreadCheckResult
                {
                    capturedMainThreadId = capturedMainThreadId,
                    executionThreadId = System.Threading.Thread.CurrentThread.ManagedThreadId,
                    ranOnMainThread = capturedMainThreadId == System.Threading.Thread.CurrentThread.ManagedThreadId
                };
                return Succeeded(operation, requestId, record, "Thread check completed.", UnityEngine.JsonUtility.ToJson(result), startedAt);
            }

            if (operation == EditorStatusGetOperation)
            {
                var result = UnityAgentKitEditorDiagnostics.ReadStatus(capturedMainThreadId);
                return Succeeded(operation, requestId, record, "Editor status read.", UnityEngine.JsonUtility.ToJson(result), startedAt);
            }

            if (operation == PlayModeStateGetOperation)
            {
                return UnityAgentKitPlayModeDiagnostics.ReadState(record, capturedMainThreadId, requestId);
            }

            if (operation == PlayModeEnterRequestOperation)
            {
                return UnityAgentKitPlayModeDiagnostics.RequestEnter(record, capturedMainThreadId, requestId);
            }

            if (operation == PlayModeExitRequestOperation)
            {
                return UnityAgentKitPlayModeDiagnostics.RequestExit(record, capturedMainThreadId, requestId);
            }

            if (operation == CompileStateGetOperation)
            {
                var result = UnityAgentKitCompileDiagnostics.ReadState(record, capturedMainThreadId);
                return Succeeded(operation, requestId, record, "Compile state read.", UnityEngine.JsonUtility.ToJson(result), startedAt);
            }

            if (operation == CompileRequestOperation)
            {
                var result = UnityAgentKitCompileDiagnostics.RequestCompile(request != null ? request.inputJson ?? string.Empty : string.Empty, record, capturedMainThreadId);
                return Succeeded(operation, requestId, record, result.requested ? "Compile request accepted." : "Compile request skipped because Unity is already compiling or updating.", JsonUtility.ToJson(result), startedAt);
            }

            if (operation == CompileReportGetOperation)
            {
                if (UnityAgentKitCompileDiagnostics.TryReadRecentReport(request != null ? record : null, request != null ? request.inputJson ?? string.Empty : string.Empty, out var report, out var code, out var message))
                {
                    return Succeeded(operation, requestId, record, "Compile report read.", UnityEngine.JsonUtility.ToJson(report), startedAt);
                }

                return Uncertain(operation, requestId, record, code, message, startedAt);
            }

            if (operation == ConsoleCountOperation)
            {
                try
                {
                    var result = UnityAgentKitConsoleDiagnostics.Count(record, capturedMainThreadId, request != null ? request.inputJson ?? string.Empty : string.Empty);
                    return Succeeded(operation, requestId, record, "Console count read.", JsonUtility.ToJson(result), startedAt);
                }
                catch (ConsoleReflectionUnavailableException exception)
                {
                    return Failed(operation, requestId, record, "console.reflection_unavailable", exception.Message, startedAt);
                }
            }

            if (operation == ConsoleSnapshotOperation)
            {
                try
                {
                    var result = UnityAgentKitConsoleDiagnostics.Snapshot(record, capturedMainThreadId, request != null ? request.inputJson ?? string.Empty : string.Empty, UnityAgentKitArtifactContracts.GetArtifactRoot());
                    return Succeeded(operation, requestId, record, "Console snapshot artifact written.", JsonUtility.ToJson(result), startedAt);
                }
                catch (ConsoleCursorInvalidException exception)
                {
                    return Uncertain(operation, requestId, record, "console.cursor_invalid", exception.Message, startedAt);
                }
                catch (ConsoleReflectionUnavailableException exception)
                {
                    return Failed(operation, requestId, record, "console.reflection_unavailable", exception.Message, startedAt);
                }
            }

            if (operation == ConsoleClearOperation)
            {
                try
                {
                    var result = UnityAgentKitConsoleDiagnostics.Clear(record, capturedMainThreadId, request != null ? request.inputJson ?? string.Empty : string.Empty);
                    return Succeeded(operation, requestId, record, result.cleared ? "Console clear verified." : "Console clear verification failed.", JsonUtility.ToJson(result), startedAt);
                }
                catch (ConsoleClearNotExplicitException exception)
                {
                    return Rejected(operation, requestId, record, "console.clear_requires_explicit_confirmation", exception.Message, startedAt);
                }
                catch (ConsoleReflectionUnavailableException exception)
                {
                    return Failed(operation, requestId, record, "console.reflection_unavailable", exception.Message, startedAt);
                }
            }

            if (operation == TestListOperation)
            {
                return UnityAgentKitTestDiagnostics.List(request != null ? request.inputJson ?? string.Empty : string.Empty, record, requestId);
            }

            if (operation == TestStartOperation)
            {
                return UnityAgentKitTestDiagnostics.Start(request != null ? request.inputJson ?? string.Empty : string.Empty, record, requestId);
            }

            if (operation == TestStatusGetOperation)
            {
                return UnityAgentKitTestDiagnostics.GetStatus(request != null ? request.inputJson ?? string.Empty : string.Empty, record, requestId);
            }

            if (operation == TestResultGetOperation)
            {
                return UnityAgentKitTestDiagnostics.GetResult(request != null ? request.inputJson ?? string.Empty : string.Empty, record, requestId);
            }

            if (operation == ThrowOperation)
            {
                throw new InvalidOperationException("Synthetic dispatch exception.");
            }

            return Rejected(operation, requestId, record, "operation.unknown", "Unknown operation: " + operation, startedAt);
        }

        internal static UnityAgentKitOperationResponse RunCompileRequestForTests(
            UnityAgentKitOperationRequest request,
            UnityAgentKitHostRecord record,
            int capturedMainThreadId,
            bool isCompiling,
            bool isUpdating,
            Action refreshAssetDatabase,
            Action requestScriptCompilation)
        {
            var startedAt = Now();
            var operation = NormalizeOperation(request != null ? request.operation : string.Empty);
            var requestId = request != null ? request.requestId ?? string.Empty : string.Empty;
            var result = UnityAgentKitCompileDiagnostics.RequestCompileForTests(
                request != null ? request.inputJson ?? string.Empty : string.Empty,
                record,
                capturedMainThreadId,
                isCompiling,
                isUpdating,
                refreshAssetDatabase,
                requestScriptCompilation);
            return Succeeded(operation, requestId, record, result.requested ? "Compile request accepted." : "Compile request skipped because Unity is already compiling or updating.", JsonUtility.ToJson(result), startedAt);
        }

        internal static UnityAgentKitOperationResponse DispatchException(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record, Exception error)
        {
            var startedAt = Now();
            var operation = NormalizeOperation(request != null ? request.operation : string.Empty);
            var requestId = request != null ? request.requestId ?? string.Empty : string.Empty;
            var message = "Main-thread dispatch failed.";
            var response = Failed(operation, requestId, record, "host.dispatch_exception", message, startedAt);
            response.diagnostics[0].details = "{\"exceptionType\":\"" + Escape(error != null ? error.GetType().Name : "Exception") + "\"}";
            return response;
        }

        internal static UnityAgentKitOperationResponse DispatchTimeout(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record)
        {
            var startedAt = Now();
            var operation = NormalizeOperation(request != null ? request.operation : string.Empty);
            var requestId = request != null ? request.requestId ?? string.Empty : string.Empty;
            var message = "Main-thread dispatch timed out.";
            var response = Create("timeout", operation, requestId, record, message, string.Empty, new[] { Diagnostic("error", "host.dispatch_timeout", message, operation, requestId) }, "host.dispatch_timeout", message, startedAt);
            response.metadata = "{\"mayStillBeRunning\":true}";
            response.diagnostics[0].details = "{\"mayStillBeRunning\":true}";
            return response;
        }

        internal static UnityAgentKitOperationResponse Stopped(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record, string reasonCode)
        {
            var startedAt = Now();
            var operation = NormalizeOperation(request != null ? request.operation : string.Empty);
            var requestId = request != null ? request.requestId ?? string.Empty : string.Empty;
            var code = string.IsNullOrEmpty(reasonCode) ? "host.stopped" : reasonCode;
            return Failed(operation, requestId, record, code, "Pending dispatch work was stopped.", startedAt);
        }

        internal static UnityAgentKitOperationResponse EmptyBody(UnityAgentKitHostRecord record)
        {
            return Failed(InvalidRequestOperation, string.Empty, record, "protocol.empty_body", "Operation request body is empty.", Now());
        }

        internal static UnityAgentKitOperationResponse MalformedJson(UnityAgentKitHostRecord record, string message)
        {
            return Failed(InvalidRequestOperation, string.Empty, record, "protocol.malformed_json", string.IsNullOrEmpty(message) ? "Operation request JSON is malformed." : message, Now());
        }

        internal static UnityAgentKitOperationResponse HttpNotFound(UnityAgentKitHostRecord record)
        {
            return Failed(InvalidRequestOperation, string.Empty, record, "http.not_found", "Unknown route.", Now());
        }

        internal static UnityAgentKitOperationResponse MethodNotAllowed(UnityAgentKitHostRecord record)
        {
            return Failed(InvalidRequestOperation, string.Empty, record, "http.method_not_allowed", "Method not allowed.", Now());
        }

        internal static UnityAgentKitOperationResponse RequestBodyTooLarge(UnityAgentKitHostRecord record)
        {
            return Failed("host.operation", string.Empty, record, "http.request_body_too_large", "Operation request body is too large.", Now());
        }

        private static UnityAgentKitOperationResponse Succeeded(string operation, string requestId, UnityAgentKitHostRecord record, string summary, string data, string startedAt)
        {
            return Create("succeeded", operation, requestId, record, summary, data, Array.Empty<UnityAgentKitDiagnostic>(), string.Empty, string.Empty, startedAt);
        }

        private static UnityAgentKitOperationResponse Rejected(string operation, string requestId, UnityAgentKitHostRecord record, string code, string message, string startedAt)
        {
            return Create("rejected", operation, requestId, record, message, string.Empty, new[] { Diagnostic("warning", code, message, operation, requestId) }, code, message, startedAt);
        }

        private static UnityAgentKitOperationResponse Failed(string operation, string requestId, UnityAgentKitHostRecord record, string code, string message, string startedAt)
        {
            return Create("failed", operation, requestId, record, message, string.Empty, new[] { Diagnostic("error", code, message, operation, requestId) }, code, message, startedAt);
        }

        private static UnityAgentKitOperationResponse Uncertain(string operation, string requestId, UnityAgentKitHostRecord record, string code, string message, string startedAt)
        {
            return Create("uncertain", operation, requestId, record, message, string.Empty, new[] { Diagnostic("error", code, message, operation, requestId) }, code, message, startedAt);
        }

        private static UnityAgentKitOperationResponse Create(string status, string operation, string requestId, UnityAgentKitHostRecord record, string summary, string data, UnityAgentKitDiagnostic[] diagnostics, string code, string message, string startedAt)
        {
            var completedAt = Now();
            return new UnityAgentKitOperationResponse
            {
                status = status,
                operation = operation ?? string.Empty,
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

        private static UnityAgentKitDiagnostic Diagnostic(string severity, string code, string message, string operation, string requestId)
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
    }
}
