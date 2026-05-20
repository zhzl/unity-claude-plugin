using System;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitOperationRouter
    {
        internal const string InvalidRequestOperation = "host.invalidRequest";
        internal const string EchoOperation = "host.echo";
        internal const string ThreadCheckOperation = "host.threadCheck";
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

            if (operation == ThreadCheckOperation)
            {
                return Rejected(operation, requestId, record, "host.dispatch_required", "Operation requires main-thread dispatch.", startedAt);
            }

            return Rejected(operation, requestId, record, "operation.unknown", "Unknown operation: " + operation, startedAt);
        }

        internal static bool RequiresMainThreadDispatch(string operation)
        {
            var normalized = NormalizeOperation(operation);
            return normalized == ThreadCheckOperation || normalized == ThrowOperation || normalized == PendingDispatchTimeoutOperation;
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

            if (operation == ThrowOperation)
            {
                throw new InvalidOperationException("Synthetic dispatch exception.");
            }

            return Rejected(operation, requestId, record, "operation.unknown", "Unknown operation: " + operation, startedAt);
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
