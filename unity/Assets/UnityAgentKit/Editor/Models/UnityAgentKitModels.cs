using System;

namespace UnityAgentKit.Editor
{
    [Serializable]
    public sealed class UnityAgentKitHostRecord
    {
        public string hostName = string.Empty;
        public string protocolVersion = string.Empty;
        public string projectRoot = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public int port;
        public string status = string.Empty;
        public string startedAt = string.Empty;
        public string lastProbeAt = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitProbeResponse
    {
        public string hostId = string.Empty;
        public int hostEpoch;
        public string projectRoot = string.Empty;
        public string protocolVersion = string.Empty;
        public int port;
        public string status = string.Empty;
        public string code = string.Empty;
        public string message = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitOperationRequest
    {
        public string operation = string.Empty;
        public string requestId = string.Empty;
        public string inputJson = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitOperationResponse
    {
        public string status = string.Empty;
        public string operation = string.Empty;
        public string requestId = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string summary = string.Empty;
        public string data = string.Empty;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
        public string startedAt = string.Empty;
        public string completedAt = string.Empty;
        public int durationMs;
        public string code = string.Empty;
        public string message = string.Empty;
        public string metadata = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitDiagnostic
    {
        public string source = string.Empty;
        public string severity = string.Empty;
        public string code = string.Empty;
        public string message = string.Empty;
        public string details = string.Empty;
        public string attribution = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitThreadCheckResult
    {
        public int capturedMainThreadId;
        public int executionThreadId;
        public bool ranOnMainThread;
    }

    [Serializable]
    public sealed class UnityAgentKitEditorStatusResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public bool isCompiling;
        public bool isUpdating;
        public bool isPlaying;
        public bool isPlayingOrWillChangePlaymode;
        public bool isPlayModeChanging;
        public bool isReady;
        public int capturedMainThreadId;
        public int executionThreadId;
    }

    [Serializable]
    public sealed class UnityAgentKitCompileStateResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public bool isCompiling;
        public bool isUpdating;
        public bool isIdle;
        public int invalidationToken;
        public bool hasRecentCompileReport;
        public string recentCompileReportId = string.Empty;
        public int capturedMainThreadId;
        public int executionThreadId;
    }

    [Serializable]
    public sealed class UnityAgentKitCompileRequestInput
    {
        public string reason = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitCompileRequestResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public bool requested;
        public string noOpReason = string.Empty;
        public bool usedAssetDatabaseRefresh;
        public bool usedCompilationPipeline;
        public int invalidationTokenBeforeRequest;
        public int invalidationTokenAfterRequest;
        public bool isCompiling;
        public bool isUpdating;
        public int capturedMainThreadId;
        public int executionThreadId;
    }
}
