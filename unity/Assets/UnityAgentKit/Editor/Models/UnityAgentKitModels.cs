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
    public sealed class UnityAgentKitPlayModeStateResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string state = string.Empty;
        public bool stable;
        public bool isPlaying;
        public bool isPlayingOrWillChangePlaymode;
        public bool isPlayModeChanging;
        public bool isCompiling;
        public bool isUpdating;
        public int capturedMainThreadId;
        public int executionThreadId;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }

    [Serializable]
    public sealed class UnityAgentKitPlayModeRequestResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string targetState = string.Empty;
        public bool requested;
        public bool noOp;
        public string noOpReason = string.Empty;
        public UnityAgentKitPlayModeStateResult stateBeforeRequest = new UnityAgentKitPlayModeStateResult();
        public int capturedMainThreadId;
        public int executionThreadId;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
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

    [Serializable]
    public sealed class UnityAgentKitCompileReportRequestInput
    {
        public string reportId = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitCompilerMessageRecord
    {
        public string assemblyPath = string.Empty;
        public string file = string.Empty;
        public int line;
        public int column;
        public string type = string.Empty;
        public string message = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitCompileReportResult
    {
        public string reportId = string.Empty;
        public string compileCycleId = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string completedAt = string.Empty;
        public int invalidationTokenAtCompletion;
        public int compilerErrorCount;
        public int compilerWarningCount;
        public string compilerMessagesSummary = string.Empty;
        public UnityAgentKitCompilerMessageRecord[] compilerMessages = Array.Empty<UnityAgentKitCompilerMessageRecord>();
        public bool assemblyCompilationFinishedSeen;
        public bool compilationFinishedSeen;
        public bool editorIdleAfterCompilation;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleCursor
    {
        public string hostId = string.Empty;
        public int hostEpoch;
        public int consoleGeneration;
        public int startIndex;
        public string createdAt = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleCounts
    {
        public int error;
        public int warning;
        public int log;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleSeverityScan
    {
        public int scannedCount;
        public int startIndex;
        public int endIndexExclusive;
        public int limit;
        public bool severityBreakdownComplete;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleSnapshotRange
    {
        public int startIndex;
        public int endIndexExclusive;
        public int totalCountAtCapture;
        public int limit;
        public bool truncated;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleEntryRecord
    {
        public int index;
        public int entryId;
        public string severity = string.Empty;
        public string message = string.Empty;
        public string stackTrace = string.Empty;
        public string mode = string.Empty;
        public string attribution = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleCountInput
    {
        public int maxSeverityScan = 500;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleSnapshotInput
    {
        public int limit = 200;
        public bool includeStackTrace;
        public UnityAgentKitConsoleCursor cursor = null;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleClearInput
    {
        public bool confirmClear;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleCountResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public int totalCount;
        public UnityAgentKitConsoleCounts counts = new UnityAgentKitConsoleCounts();
        public UnityAgentKitConsoleSeverityScan severityScan = new UnityAgentKitConsoleSeverityScan();
        public UnityAgentKitConsoleCursor cursor = new UnityAgentKitConsoleCursor();
        public int consoleGeneration;
        public int capturedMainThreadId;
        public int executionThreadId;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleSnapshotPayload
    {
        public int schemaVersion;
        public string artifactId = string.Empty;
        public string createdAt = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public UnityAgentKitConsoleCursor cursor = new UnityAgentKitConsoleCursor();
        public UnityAgentKitConsoleSnapshotRange range = new UnityAgentKitConsoleSnapshotRange();
        public UnityAgentKitConsoleCounts counts = new UnityAgentKitConsoleCounts();
        public UnityAgentKitConsoleEntryRecord[] entries = Array.Empty<UnityAgentKitConsoleEntryRecord>();
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleSnapshotResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string artifactId = string.Empty;
        public string uri = string.Empty;
        public UnityAgentKitConsoleCounts counts = new UnityAgentKitConsoleCounts();
        public UnityAgentKitConsoleCursor cursor = new UnityAgentKitConsoleCursor();
        public UnityAgentKitConsoleSnapshotRange range = new UnityAgentKitConsoleSnapshotRange();
        public int entryCount;
        public bool includeStackTrace;
        public int capturedMainThreadId;
        public int executionThreadId;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleClearResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public bool explicitClear;
        public bool cleared;
        public int countBeforeClear;
        public int countAfterClear;
        public int consoleGenerationBeforeClear;
        public int consoleGenerationAfterClear;
        public UnityAgentKitConsoleCursor cursor = new UnityAgentKitConsoleCursor();
        public int capturedMainThreadId;
        public int executionThreadId;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }

    [Serializable]
    public sealed class UnityAgentKitTestSelectorInput
    {
        public string mode = "editmode";
        public string assembly = string.Empty;
        public string className = string.Empty;
        public string methodName = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitTestOperationInput
    {
        public UnityAgentKitTestSelectorInput selector = new UnityAgentKitTestSelectorInput();
        public string jobId = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitTestCaseRecord
    {
        public string id = string.Empty;
        public string name = string.Empty;
        public string fullName = string.Empty;
        public string assembly = string.Empty;
        public string className = string.Empty;
        public string mode = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitTestListResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public UnityAgentKitTestSelectorInput selector = new UnityAgentKitTestSelectorInput();
        public UnityAgentKitTestCaseRecord[] tests = Array.Empty<UnityAgentKitTestCaseRecord>();
        public int total;
        public bool verifiedTestPass;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }

    [Serializable]
    public sealed class UnityAgentKitTestJobResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string jobId = string.Empty;
        public string state = string.Empty;
        public UnityAgentKitTestSelectorInput selector = new UnityAgentKitTestSelectorInput();
        public string createdAt = string.Empty;
        public string updatedAt = string.Empty;
        public string reportId = string.Empty;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }

    [Serializable]
    public sealed class UnityAgentKitTestFailureRecord
    {
        public string name = string.Empty;
        public string fullName = string.Empty;
        public string message = string.Empty;
        public string stackTrace = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitTestReportSummary
    {
        public int schemaVersion = 1;
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string jobId = string.Empty;
        public string reportId = string.Empty;
        public string uri = string.Empty;
        public string mode = string.Empty;
        public UnityAgentKitTestSelectorInput selector = new UnityAgentKitTestSelectorInput();
        public int total;
        public int passed;
        public int failed;
        public int errors;
        public int skipped;
        public int inconclusive;
        public bool verifiedTestPass;
        public string terminalState = string.Empty;
        public UnityAgentKitTestFailureRecord[] failures = Array.Empty<UnityAgentKitTestFailureRecord>();
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }
}
