using System;
using System.Threading;
using UnityEditor;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitPlayModeDiagnostics
    {
        private const string StateOperation = "playmode.state.get";
        private const string EnterOperation = "playmode.enter.request";
        private const string ExitOperation = "playmode.exit.request";
        private static readonly IPlayModeEditorAdapter productionAdapter = new UnityEditorPlayModeAdapter();

        internal interface IPlayModeEditorAdapter
        {
            bool IsPlaying { get; }
            bool IsPlayingOrWillChangePlaymode { get; }
            bool IsCompiling { get; }
            bool IsUpdating { get; }
            void RequestEnter();
            void RequestExit();
        }

        internal static UnityAgentKitOperationResponse ReadState(UnityAgentKitHostRecord record, int capturedMainThreadId, string requestId = "")
        {
            return ReadStateForTests(record, capturedMainThreadId, productionAdapter, requestId);
        }

        internal static UnityAgentKitOperationResponse RequestEnter(UnityAgentKitHostRecord record, int capturedMainThreadId, string requestId = "")
        {
            return RequestEnterForTests(record, capturedMainThreadId, productionAdapter, requestId);
        }

        internal static UnityAgentKitOperationResponse RequestExit(UnityAgentKitHostRecord record, int capturedMainThreadId, string requestId = "")
        {
            return RequestExitForTests(record, capturedMainThreadId, productionAdapter, requestId);
        }

        internal static UnityAgentKitOperationResponse ReadStateForTests(UnityAgentKitHostRecord record, int capturedMainThreadId, IPlayModeEditorAdapter adapter, string requestId = "")
        {
            var startedAt = Now();
            var result = CreateState(record, capturedMainThreadId, adapter, Array.Empty<UnityAgentKitDiagnostic>());
            return Succeeded(StateOperation, record, "PlayMode state read.", JsonUtility.ToJson(result), startedAt, requestId);
        }

        internal static UnityAgentKitOperationResponse RequestEnterForTests(UnityAgentKitHostRecord record, int capturedMainThreadId, IPlayModeEditorAdapter adapter, string requestId = "")
        {
            return RequestForTests(EnterOperation, "playmode", "already_playmode", record, capturedMainThreadId, adapter, requestId);
        }

        internal static UnityAgentKitOperationResponse RequestExitForTests(UnityAgentKitHostRecord record, int capturedMainThreadId, IPlayModeEditorAdapter adapter, string requestId = "")
        {
            return RequestForTests(ExitOperation, "editmode", "already_editmode", record, capturedMainThreadId, adapter, requestId);
        }

        private static UnityAgentKitOperationResponse RequestForTests(string operation, string targetState, string alreadyReason, UnityAgentKitHostRecord record, int capturedMainThreadId, IPlayModeEditorAdapter adapter, string requestId)
        {
            var startedAt = Now();
            var diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
            var stateBeforeRequest = CreateState(record, capturedMainThreadId, adapter, diagnostics);
            var result = new UnityAgentKitPlayModeRequestResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                targetState = targetState,
                stateBeforeRequest = stateBeforeRequest,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId,
                diagnostics = diagnostics
            };

            if (stateBeforeRequest.stable && stateBeforeRequest.state == targetState)
            {
                result.requested = false;
                result.noOp = true;
                result.noOpReason = alreadyReason;
                return Succeeded(operation, record, "PlayMode request skipped because Unity is already in the target state.", JsonUtility.ToJson(result), startedAt, requestId);
            }

            if (!stateBeforeRequest.stable)
            {
                diagnostics = new[] { Diagnostic("warning", "playmode.transition_or_busy", "PlayMode request skipped because Unity is transitioning, compiling, or updating.", operation, requestId) };
                stateBeforeRequest.diagnostics = diagnostics;
                result.requested = false;
                result.noOp = true;
                result.noOpReason = "transition_or_busy";
                result.diagnostics = diagnostics;
                return Succeeded(operation, record, "PlayMode request skipped because Unity is transitioning, compiling, or updating.", JsonUtility.ToJson(result), startedAt, requestId);
            }

            if (targetState == "playmode")
            {
                adapter.RequestEnter();
            }
            else
            {
                adapter.RequestExit();
            }

            result.requested = true;
            result.noOp = false;
            return Succeeded(operation, record, "PlayMode request accepted.", JsonUtility.ToJson(result), startedAt, requestId);
        }

        private static UnityAgentKitPlayModeStateResult CreateState(UnityAgentKitHostRecord record, int capturedMainThreadId, IPlayModeEditorAdapter adapter, UnityAgentKitDiagnostic[] diagnostics)
        {
            var isPlaying = adapter != null && adapter.IsPlaying;
            var isPlayingOrWillChangePlaymode = adapter != null && adapter.IsPlayingOrWillChangePlaymode;
            var isCompiling = adapter != null && adapter.IsCompiling;
            var isUpdating = adapter != null && adapter.IsUpdating;
            var isPlayModeChanging = isPlayingOrWillChangePlaymode != isPlaying;

            return new UnityAgentKitPlayModeStateResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                state = isPlayModeChanging ? "transitioning" : isPlaying ? "playmode" : "editmode",
                stable = !isPlayModeChanging && !isCompiling && !isUpdating,
                isPlaying = isPlaying,
                isPlayingOrWillChangePlaymode = isPlayingOrWillChangePlaymode,
                isPlayModeChanging = isPlayModeChanging,
                isCompiling = isCompiling,
                isUpdating = isUpdating,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId,
                diagnostics = diagnostics ?? Array.Empty<UnityAgentKitDiagnostic>()
            };
        }

        private static UnityAgentKitOperationResponse Succeeded(string operation, UnityAgentKitHostRecord record, string summary, string data, string startedAt, string requestId = "")
        {
            return Create("succeeded", operation, record, summary, data, Array.Empty<UnityAgentKitDiagnostic>(), string.Empty, string.Empty, startedAt, requestId);
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

        private sealed class UnityEditorPlayModeAdapter : IPlayModeEditorAdapter
        {
            public bool IsPlaying => EditorApplication.isPlaying;
            public bool IsPlayingOrWillChangePlaymode => EditorApplication.isPlayingOrWillChangePlaymode;
            public bool IsCompiling => EditorApplication.isCompiling;
            public bool IsUpdating => EditorApplication.isUpdating;

            public void RequestEnter()
            {
                EditorApplication.isPlaying = true;
            }

            public void RequestExit()
            {
                EditorApplication.isPlaying = false;
            }
        }
    }
}
