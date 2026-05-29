using System;
using System.IO;
using System.Reflection;
using System.Threading;
using UnityEditor;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitScreenshotDiagnostics
    {
        private const string CaptureOperation = "screenshot.capture";
        private const string CaptureMethodId = "screen_capture_capture_screenshot";
        private const string CaptureView = "current_game_view";
        private const int PayloadReadyTimeoutMs = 1000;
        private static readonly IScreenshotCaptureAdapter productionAdapter = new UnityEditorScreenshotCaptureAdapter();

        internal interface IScreenshotCaptureAdapter
        {
            UnityAgentKitScreenshotCaptureMethodFeasibility Feasibility { get; }
            bool TryGetGameViewSize(out int gameViewWidth, out int gameViewHeight, out UnityAgentKitDiagnostic diagnostic);
            void FocusAndRepaintGameView();
            void CaptureGameViewPng(string absolutePath);
        }

        private sealed class PendingScreenshotCapture
        {
            internal string capturePath;
            internal string absolutePath;
            internal string artifactRoot;
            internal string artifactId;
            internal string relativePath;
            internal UnityAgentKitHostRecord record;
            internal int width;
            internal int height;
            internal int capturedMainThreadId;
            internal string label;
            internal string requestId;
            internal string startedAt;
            internal string captureMethod;
            internal DateTimeOffset deadline;
            internal Action<UnityAgentKitOperationResponse> complete;
            internal Func<bool> isCancelled;
            internal bool completed;

            internal void OnEditorUpdate()
            {
                TryCompletePendingCapture(this);
            }
        }

        internal static UnityAgentKitScreenshotCaptureMethodFeasibility GetCaptureMethodFeasibilityForTests()
        {
            return GetCaptureMethodFeasibilityForTests(productionAdapter);
        }

        internal static UnityAgentKitScreenshotCaptureMethodFeasibility GetCaptureMethodFeasibilityForTests(IScreenshotCaptureAdapter adapter)
        {
            return ValidateFeasibility(adapter);
        }

        internal static UnityAgentKitOperationResponse CaptureGameView(
            UnityAgentKitHostRecord record,
            int capturedMainThreadId,
            string inputJson,
            string requestId = "")
        {
            return Rejected("host.dispatch_required", "Screenshot capture requires asynchronous main-thread dispatch.", record, Now(), requestId);
        }

        internal static void CaptureGameViewAsync(
            UnityAgentKitHostRecord record,
            int capturedMainThreadId,
            string inputJson,
            Action<UnityAgentKitOperationResponse> complete,
            string requestId = "",
            Func<bool> isCancelled = null)
        {
            CaptureGameViewAsyncForTests(
                record,
                capturedMainThreadId,
                inputJson,
                UnityAgentKitArtifactContracts.GetArtifactRoot(),
                productionAdapter,
                complete,
                requestId,
                PayloadReadyTimeoutMs,
                isCancelled);
        }

        internal static UnityAgentKitOperationResponse CaptureGameViewForTests(
            UnityAgentKitHostRecord record,
            int capturedMainThreadId,
            string inputJson,
            string artifactRoot,
            IScreenshotCaptureAdapter adapter,
            string requestId = "")
        {
            UnityAgentKitOperationResponse response = null;
            var cancelled = false;
            CaptureGameViewAsyncForTests(
                record,
                capturedMainThreadId,
                inputJson,
                artifactRoot,
                adapter,
                completed => response = completed,
                requestId,
                PayloadReadyTimeoutMs,
                () => cancelled);
            if (response != null)
            {
                return response;
            }

            cancelled = true;
            return Rejected("host.dispatch_required", "Screenshot capture requires asynchronous main-thread dispatch.", record, Now(), requestId);
        }

        internal static Action CaptureGameViewAsyncForTests(
            UnityAgentKitHostRecord record,
            int capturedMainThreadId,
            string inputJson,
            string artifactRoot,
            IScreenshotCaptureAdapter adapter,
            Action<UnityAgentKitOperationResponse> complete,
            string requestId = "",
            int payloadReadyTimeoutMs = PayloadReadyTimeoutMs,
            Func<bool> isCancelled = null)
        {
            var startedAt = Now();
            var input = ParseInput(inputJson);
            if (!IsSafeLabel(input.label))
            {
                Complete(complete, Rejected("screenshot.label_invalid", "Screenshot label must not contain path syntax.", record, startedAt, requestId));
                return null;
            }

            var feasibility = ValidateFeasibility(adapter);
            if (!feasibility.supported)
            {
                var code = feasibility.diagnostics != null && feasibility.diagnostics.Length > 0 && !string.IsNullOrEmpty(feasibility.diagnostics[0].code)
                    ? feasibility.diagnostics[0].code
                    : "screenshot.capture_method_unavailable";
                Complete(complete, Failed(code, "Screenshot capture method is unavailable.", record, startedAt, requestId, feasibility.diagnostics));
                return null;
            }

            UnityAgentKitDiagnostic gameViewDiagnostic = null;
            var width = 0;
            var height = 0;
            if (adapter == null || !adapter.TryGetGameViewSize(out width, out height, out gameViewDiagnostic))
            {
                var diagnostics = gameViewDiagnostic != null
                    ? new[] { gameViewDiagnostic }
                    : new[] { Diagnostic("error", "screenshot.game_view_unavailable", "Game View size is unavailable.", CaptureOperation, requestId) };
                Complete(complete, Failed("screenshot.game_view_unavailable", "Game View size is unavailable.", record, startedAt, requestId, diagnostics));
                return null;
            }

            var artifactId = CreateArtifactId(input.label);
            var relativePath = "screenshots/" + artifactId + ".png";
            var absolutePath = Path.Combine(artifactRoot, "screenshots", artifactId + ".png");
            var capturePath = Path.Combine(artifactRoot, "screenshots", ".pending", artifactId + ".png");

            try
            {
                adapter.FocusAndRepaintGameView();
                Directory.CreateDirectory(Path.GetDirectoryName(capturePath));
                adapter.CaptureGameViewPng(capturePath);
            }
            catch (Exception exception)
            {
                var diagnostic = Diagnostic("error", "screenshot.capture_failed", "Game View screenshot capture failed.", CaptureOperation, requestId);
                diagnostic.details = "{\"exceptionType\":\"" + Escape(exception.GetType().Name) + "\"}";
                Complete(complete, Failed("screenshot.capture_failed", exception.Message, record, startedAt, requestId, new[] { diagnostic }));
                return null;
            }

            var pending = new PendingScreenshotCapture
            {
                capturePath = capturePath,
                absolutePath = absolutePath,
                artifactRoot = artifactRoot,
                artifactId = artifactId,
                relativePath = relativePath,
                record = record,
                width = width,
                height = height,
                capturedMainThreadId = capturedMainThreadId,
                label = input.label ?? string.Empty,
                requestId = requestId,
                startedAt = startedAt,
                captureMethod = feasibility.methodId,
                deadline = DateTimeOffset.UtcNow.AddMilliseconds(Math.Max(0, payloadReadyTimeoutMs)),
                complete = complete,
                isCancelled = isCancelled
            };

            if (TryCompletePendingCapture(pending))
            {
                return null;
            }

            EditorApplication.update += pending.OnEditorUpdate;
            return () => CancelPending(pending);
        }

        private static bool TryCompletePendingCapture(PendingScreenshotCapture pending)
        {
            if (pending == null || pending.completed)
            {
                return true;
            }

            if (pending.isCancelled != null && pending.isCancelled())
            {
                CancelPending(pending);
                return true;
            }

            if (TryGetPayloadSize(pending.capturePath, out var sizeBytes))
            {
                CompletePending(pending, CreateSucceededCaptureResponse(pending, sizeBytes));
                return true;
            }

            if (DateTimeOffset.UtcNow > pending.deadline)
            {
                CompletePending(pending, Failed("screenshot.file_not_ready", "Screenshot file was not created or is empty.", pending.record, pending.startedAt, pending.requestId));
                return true;
            }

            return false;
        }

        private static UnityAgentKitOperationResponse CreateSucceededCaptureResponse(PendingScreenshotCapture pending, long sizeBytes)
        {
            UnityAgentKitArtifactMetadataRecord metadata;
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(pending.absolutePath));
                if (File.Exists(pending.absolutePath))
                {
                    File.Delete(pending.absolutePath);
                }

                File.Move(pending.capturePath, pending.absolutePath);
                metadata = UnityAgentKitArtifactContracts.WriteScreenshotArtifactMetadata(pending.artifactRoot, pending.artifactId, pending.relativePath, pending.record, sizeBytes);
            }
            catch (Exception exception)
            {
                var diagnostic = Diagnostic("error", "screenshot.metadata_write_failed", "Screenshot metadata write failed.", CaptureOperation, pending.requestId);
                diagnostic.details = "{\"exceptionType\":\"" + Escape(exception.GetType().Name) + "\"}";
                return Failed("screenshot.metadata_write_failed", exception.Message, pending.record, pending.startedAt, pending.requestId, new[] { diagnostic });
            }

            var result = new UnityAgentKitScreenshotCaptureResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                hostId = pending.record != null ? pending.record.hostId : string.Empty,
                hostEpoch = pending.record != null ? pending.record.hostEpoch : 0,
                artifactId = pending.artifactId,
                uri = metadata.uri,
                relativePath = metadata.relativePath,
                width = pending.width,
                height = pending.height,
                sizeBytes = sizeBytes,
                captureMethod = pending.captureMethod,
                validationStatus = metadata.validationStatus,
                label = pending.label,
                capturedMainThreadId = pending.capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId,
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };

            return Succeeded("Game View screenshot artifact written.", JsonUtility.ToJson(result), pending.record, pending.startedAt, pending.requestId);
        }

        private static UnityAgentKitScreenshotCaptureInput ParseInput(string inputJson)
        {
            if (string.IsNullOrWhiteSpace(inputJson))
            {
                return new UnityAgentKitScreenshotCaptureInput();
            }

            try
            {
                return JsonUtility.FromJson<UnityAgentKitScreenshotCaptureInput>(inputJson) ?? new UnityAgentKitScreenshotCaptureInput();
            }
            catch (ArgumentException)
            {
                return new UnityAgentKitScreenshotCaptureInput();
            }
        }

        private static bool IsSafeLabel(string label)
        {
            if (string.IsNullOrEmpty(label))
            {
                return true;
            }

            if (label.Length > 64 || label.Contains("/") || label.Contains("\\") || label.Contains("\0") || label.Contains("..") || HasWindowsDrivePrefix(label))
            {
                return false;
            }

            for (var i = 0; i < label.Length; i++)
            {
                var c = label[i];
                if (!IsAsciiLetterOrDigit(c) && c != '_' && c != '-')
                {
                    return false;
                }
            }

            return true;
        }

        private static string CreateArtifactId(string label)
        {
            var id = "shot-" + DateTimeOffset.UtcNow.ToString("yyyyMMdd-HHmmss-fff");
            if (!string.IsNullOrEmpty(label))
            {
                id += "-" + label;
            }

            return id.Length <= 128 ? id : id.Substring(0, 128).TrimEnd('-', '_');
        }

        private static bool TryGetPayloadSize(string absolutePath, out long sizeBytes)
        {
            sizeBytes = 0;
            if (File.Exists(absolutePath))
            {
                sizeBytes = new FileInfo(absolutePath).Length;
            }

            return sizeBytes > 0;
        }

        private static UnityAgentKitScreenshotCaptureMethodFeasibility ValidateFeasibility(IScreenshotCaptureAdapter adapter)
        {
            var feasibility = adapter != null ? adapter.Feasibility : null;
            if (feasibility == null)
            {
                return Unsupported("screenshot.capture_method_unavailable", "Screenshot capture adapter is unavailable.");
            }

            if (feasibility.usesReadScreenPixel || feasibility.usesEncodeToPng || feasibility.usesPayloadFileWriteAllBytes)
            {
                return Unsupported("screenshot.capture_method_forbidden", "Screenshot capture adapter declares a forbidden capture path.");
            }

            if (!feasibility.supported || feasibility.methodId != CaptureMethodId)
            {
                return Unsupported("screenshot.capture_method_unavailable", "Screenshot capture method is unavailable.");
            }

            return feasibility;
        }

        private static UnityAgentKitScreenshotCaptureMethodFeasibility Unsupported(string code, string message)
        {
            return new UnityAgentKitScreenshotCaptureMethodFeasibility
            {
                supported = false,
                methodId = CaptureMethodId,
                view = CaptureView,
                usesReadScreenPixel = false,
                usesEncodeToPng = false,
                usesPayloadFileWriteAllBytes = false,
                diagnostics = new[] { Diagnostic("error", code, message, CaptureOperation, string.Empty) }
            };
        }

        private static bool HasWindowsDrivePrefix(string value)
        {
            return value.Length >= 2 && char.IsLetter(value[0]) && value[1] == ':';
        }

        private static bool IsAsciiLetterOrDigit(char c)
        {
            return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9');
        }

        private static UnityAgentKitOperationResponse Succeeded(string summary, string data, UnityAgentKitHostRecord record, string startedAt, string requestId)
        {
            return Create("succeeded", summary, data, Array.Empty<UnityAgentKitDiagnostic>(), string.Empty, string.Empty, record, startedAt, requestId);
        }

        private static UnityAgentKitOperationResponse Rejected(string code, string message, UnityAgentKitHostRecord record, string startedAt, string requestId)
        {
            return Create("rejected", message, string.Empty, new[] { Diagnostic("warning", code, message, CaptureOperation, requestId) }, code, message, record, startedAt, requestId);
        }

        private static UnityAgentKitOperationResponse Failed(string code, string message, UnityAgentKitHostRecord record, string startedAt, string requestId)
        {
            return Failed(code, message, record, startedAt, requestId, new[] { Diagnostic("error", code, message, CaptureOperation, requestId) });
        }

        private static UnityAgentKitOperationResponse Failed(string code, string message, UnityAgentKitHostRecord record, string startedAt, string requestId, UnityAgentKitDiagnostic[] diagnostics)
        {
            return Create("failed", message, string.Empty, diagnostics, code, message, record, startedAt, requestId);
        }

        private static UnityAgentKitOperationResponse Create(
            string status,
            string summary,
            string data,
            UnityAgentKitDiagnostic[] diagnostics,
            string code,
            string message,
            UnityAgentKitHostRecord record,
            string startedAt,
            string requestId)
        {
            var completedAt = Now();
            return new UnityAgentKitOperationResponse
            {
                status = status,
                operation = CaptureOperation,
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

        private static void Complete(Action<UnityAgentKitOperationResponse> complete, UnityAgentKitOperationResponse response)
        {
            try
            {
                complete?.Invoke(response);
            }
            catch (Exception)
            {
            }
        }

        private static void CompletePending(PendingScreenshotCapture pending, UnityAgentKitOperationResponse response)
        {
            if (pending == null || pending.completed)
            {
                return;
            }

            pending.completed = true;
            EditorApplication.update -= pending.OnEditorUpdate;
            Complete(pending.complete, response);
        }

        private static void CancelPending(PendingScreenshotCapture pending)
        {
            if (pending == null || pending.completed)
            {
                return;
            }

            pending.completed = true;
            EditorApplication.update -= pending.OnEditorUpdate;
            DeleteCapturePath(pending.capturePath);
        }

        private static void DeleteCapturePath(string capturePath)
        {
            if (string.IsNullOrEmpty(capturePath) || !File.Exists(capturePath))
            {
                return;
            }

            try
            {
                File.Delete(capturePath);
            }
            catch (IOException)
            {
            }
            catch (UnauthorizedAccessException)
            {
            }
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

        private sealed class UnityEditorScreenshotCaptureAdapter : IScreenshotCaptureAdapter
        {
            public UnityAgentKitScreenshotCaptureMethodFeasibility Feasibility => new UnityAgentKitScreenshotCaptureMethodFeasibility
            {
                supported = true,
                methodId = CaptureMethodId,
                view = CaptureView,
                usesReadScreenPixel = false,
                usesEncodeToPng = false,
                usesPayloadFileWriteAllBytes = false,
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };

            public bool TryGetGameViewSize(out int gameViewWidth, out int gameViewHeight, out UnityAgentKitDiagnostic diagnostic)
            {
                gameViewWidth = 0;
                gameViewHeight = 0;
                diagnostic = null;

                var gameView = GetMainGameView();
                if (gameView == null)
                {
                    diagnostic = Diagnostic("error", "screenshot.game_view_unavailable", "Game View is unavailable.", CaptureOperation, string.Empty);
                    return false;
                }

                if (!TryGetVector2Property(gameView, "targetSize", out var size))
                {
                    size = gameView.position.size;
                }

                gameViewWidth = Mathf.RoundToInt(size.x);
                gameViewHeight = Mathf.RoundToInt(size.y);
                return gameViewWidth > 0 && gameViewHeight > 0;
            }

            public void FocusAndRepaintGameView()
            {
                var gameView = GetMainGameView();
                if (gameView == null)
                {
                    return;
                }

                gameView.Focus();
                gameView.Repaint();
            }

            public void CaptureGameViewPng(string absolutePath)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(absolutePath));
                ScreenCapture.CaptureScreenshot(absolutePath);
            }

            private static EditorWindow GetMainGameView()
            {
                var gameViewType = Type.GetType("UnityEditor.GameView,UnityEditor");
                if (gameViewType == null)
                {
                    return null;
                }

                var getMainGameView = gameViewType.GetMethod("GetMainGameView", BindingFlags.NonPublic | BindingFlags.Static);
                if (getMainGameView != null)
                {
                    var mainGameView = getMainGameView.Invoke(null, null) as EditorWindow;
                    if (mainGameView != null)
                    {
                        return mainGameView;
                    }
                }

                var gameViews = Resources.FindObjectsOfTypeAll(gameViewType);
                if (gameViews != null && gameViews.Length > 0)
                {
                    return gameViews[0] as EditorWindow;
                }

                return EditorWindow.GetWindow(gameViewType);
            }

            private static bool TryGetVector2Property(EditorWindow window, string propertyName, out Vector2 value)
            {
                value = Vector2.zero;
                if (window == null)
                {
                    return false;
                }

                var property = window.GetType().GetProperty(propertyName, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                if (property == null || property.PropertyType != typeof(Vector2))
                {
                    return false;
                }

                value = (Vector2)property.GetValue(window, null);
                return true;
            }
        }
    }
}
