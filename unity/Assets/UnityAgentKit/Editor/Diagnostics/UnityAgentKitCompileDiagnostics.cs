using System;
using System.Collections.Generic;
using System.Threading;
using UnityEditor;
using UnityEditor.Compilation;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitCompileDiagnostics
    {
        private sealed class ActiveCompileCycle
        {
            public string compileCycleId = string.Empty;
            public int invalidationTokenAtStart;
            public bool assemblyCompilationFinishedSeen;
            public bool compilationFinishedSeen;
            public bool editorIdleAfterCompilation;
            public int compilerErrorCount;
            public int compilerWarningCount;
            public readonly List<UnityAgentKitCompilerMessageRecord> compilerMessages = new List<UnityAgentKitCompilerMessageRecord>();
        }

        private static int compileInvalidationToken;
        private static ActiveCompileCycle activeCompileCycle;
        private static UnityAgentKitCompileReportResult recentCompletedReport;
        private static bool compilerCallbacksSubscribed;
        private static UnityAgentKitHostRecord currentHostRecord;

        [InitializeOnLoadMethod]
        private static void Initialize()
        {
            EnsureCompilerCallbacksSubscribed();
        }

        internal static UnityAgentKitCompileStateResult ReadState(int capturedMainThreadId)
        {
            EnsureCompilerCallbacksSubscribed();
            CompleteActiveCycleIfIdle(EditorApplication.isCompiling, EditorApplication.isUpdating);
            return CreateState(capturedMainThreadId, EditorApplication.isCompiling, EditorApplication.isUpdating);
        }

        internal static UnityAgentKitCompileRequestResult RequestCompile(string inputJson, int capturedMainThreadId)
        {
            EnsureCompilerCallbacksSubscribed();
            return RequestCompile(
                inputJson,
                capturedMainThreadId,
                EditorApplication.isCompiling,
                EditorApplication.isUpdating,
                AssetDatabase.Refresh,
                CompilationPipeline.RequestScriptCompilation);
        }

        internal static UnityAgentKitCompileRequestResult RequestCompileForTests(
            string inputJson,
            int capturedMainThreadId,
            bool isCompiling,
            bool isUpdating,
            Action refreshAssetDatabase,
            Action requestScriptCompilation)
        {
            return RequestCompile(inputJson, capturedMainThreadId, isCompiling, isUpdating, refreshAssetDatabase, requestScriptCompilation);
        }

        internal static bool TryReadRecentReport(UnityAgentKitHostRecord record, string inputJson, out UnityAgentKitCompileReportResult report, out string code, out string message)
        {
            EnsureCompilerCallbacksSubscribed();
            CompleteActiveCycleIfIdle(EditorApplication.isCompiling, EditorApplication.isUpdating);
            return TryReadRecentReportInternal(record, inputJson, out report, out code, out message);
        }

        internal static void ResetForTests()
        {
            compileInvalidationToken = 0;
            activeCompileCycle = null;
            recentCompletedReport = null;
            currentHostRecord = null;
            DetachCompilerCallbacks();
        }

        internal static CompilerMessage CreateCompilerMessageForTests(string file, int line, int column, CompilerMessageType type, string message)
        {
            return new CompilerMessage
            {
                file = file,
                line = line,
                column = column,
                type = type,
                message = message
            };
        }

        internal static void StartCompileCycleForTests(UnityAgentKitHostRecord record, int invalidationTokenAtStart)
        {
            currentHostRecord = CloneHostRecord(record);
            activeCompileCycle = CreateActiveCompileCycle(invalidationTokenAtStart);
            recentCompletedReport = null;
        }

        internal static void RecordAssemblyCompilationFinishedForTests(string assemblyPath, CompilerMessage[] messages)
        {
            RecordAssemblyCompilationFinished(assemblyPath, messages);
        }

        internal static void RecordCompilationFinishedForTests()
        {
            RecordCompilationFinished(new object[0]);
        }

        internal static void CompleteActiveCycleIfIdleForTests(bool isCompiling, bool isUpdating)
        {
            CompleteActiveCycleIfIdle(isCompiling, isUpdating);
        }

        internal static bool TryReadRecentReportForTests(UnityAgentKitHostRecord record, out UnityAgentKitCompileReportResult report, out string code, out string message)
        {
            return TryReadRecentReportInternal(record, string.Empty, out report, out code, out message);
        }

        internal static void EnsureCompilerCallbacksSubscribedForTests()
        {
            EnsureCompilerCallbacksSubscribed();
        }

        internal static void DetachCompilerCallbacksForTests()
        {
            DetachCompilerCallbacks();
        }

        internal static bool HasCompilerCallbackSubscriptionsForTests()
        {
            return compilerCallbacksSubscribed;
        }

        private static UnityAgentKitCompileRequestResult RequestCompile(
            string inputJson,
            int capturedMainThreadId,
            bool isCompiling,
            bool isUpdating,
            Action refreshAssetDatabase,
            Action requestScriptCompilation)
        {
            var tokenBefore = compileInvalidationToken;
            var requested = false;
            var noOpReason = string.Empty;
            var usedAssetDatabaseRefresh = false;
            var usedCompilationPipeline = false;

            if (isCompiling || isUpdating)
            {
                noOpReason = "already_compiling_or_updating";
            }
            else
            {
                refreshAssetDatabase();
                usedAssetDatabaseRefresh = true;
                requestScriptCompilation();
                usedCompilationPipeline = true;
                compileInvalidationToken += 1;
                activeCompileCycle = CreateActiveCompileCycle(compileInvalidationToken);
                recentCompletedReport = null;
                requested = true;
            }

            return new UnityAgentKitCompileRequestResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                requested = requested,
                noOpReason = noOpReason,
                usedAssetDatabaseRefresh = usedAssetDatabaseRefresh,
                usedCompilationPipeline = usedCompilationPipeline,
                invalidationTokenBeforeRequest = tokenBefore,
                invalidationTokenAfterRequest = compileInvalidationToken,
                isCompiling = isCompiling,
                isUpdating = isUpdating,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId
            };
        }

        private static UnityAgentKitCompileStateResult CreateState(int capturedMainThreadId, bool isCompiling, bool isUpdating)
        {
            return new UnityAgentKitCompileStateResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                isCompiling = isCompiling,
                isUpdating = isUpdating,
                isIdle = !isCompiling && !isUpdating,
                invalidationToken = compileInvalidationToken,
                hasRecentCompileReport = recentCompletedReport != null,
                recentCompileReportId = recentCompletedReport != null ? recentCompletedReport.reportId : string.Empty,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId
            };
        }

        private static bool TryReadRecentReportInternal(UnityAgentKitHostRecord record, string inputJson, out UnityAgentKitCompileReportResult report, out string code, out string message)
        {
            report = null;
            code = string.Empty;
            message = string.Empty;

            if (!TryParseReportRequestInput(inputJson, out var input, out code, out message))
            {
                return false;
            }

            if (recentCompletedReport == null)
            {
                code = "compile.report_missing";
                message = "No complete compile report is available.";
                return false;
            }

            if (!string.IsNullOrEmpty(input.reportId) && !string.Equals(input.reportId, recentCompletedReport.reportId, StringComparison.Ordinal))
            {
                code = "compile.report_missing";
                message = "No complete compile report is available.";
                return false;
            }

            if (!DoesRecordMatchReport(record, recentCompletedReport))
            {
                code = "compile.report_missing";
                message = "No complete compile report is available.";
                return false;
            }

            report = CloneReport(recentCompletedReport);
            return true;
        }

        private static bool TryParseReportRequestInput(string inputJson, out UnityAgentKitCompileReportRequestInput input, out string code, out string message)
        {
            code = string.Empty;
            message = string.Empty;

            if (string.IsNullOrWhiteSpace(inputJson))
            {
                input = new UnityAgentKitCompileReportRequestInput();
                return true;
            }

            try
            {
                input = JsonUtility.FromJson<UnityAgentKitCompileReportRequestInput>(inputJson) ?? new UnityAgentKitCompileReportRequestInput();
                return true;
            }
            catch (ArgumentException)
            {
                input = null;
                code = "compile.report_input_invalid";
                message = "Compile report request input JSON is malformed.";
                return false;
            }
        }

        private static void EnsureCompilerCallbacksSubscribed()
        {
            if (compilerCallbacksSubscribed)
            {
                return;
            }

            CompilationPipeline.assemblyCompilationFinished += RecordAssemblyCompilationFinished;
            CompilationPipeline.compilationFinished += RecordCompilationFinished;
            compilerCallbacksSubscribed = true;
        }

        private static void DetachCompilerCallbacks()
        {
            if (!compilerCallbacksSubscribed)
            {
                recentCompletedReport = null;
                activeCompileCycle = null;
                return;
            }

            CompilationPipeline.assemblyCompilationFinished -= RecordAssemblyCompilationFinished;
            CompilationPipeline.compilationFinished -= RecordCompilationFinished;
            compilerCallbacksSubscribed = false;
            recentCompletedReport = null;
            activeCompileCycle = null;
        }

        private static ActiveCompileCycle CreateActiveCompileCycle(int invalidationTokenAtStart)
        {
            return new ActiveCompileCycle
            {
                compileCycleId = Guid.NewGuid().ToString("N"),
                invalidationTokenAtStart = invalidationTokenAtStart
            };
        }

        private static ActiveCompileCycle GetOrCreateActiveCompileCycle()
        {
            if (activeCompileCycle == null)
            {
                activeCompileCycle = CreateActiveCompileCycle(compileInvalidationToken);
                recentCompletedReport = null;
            }

            return activeCompileCycle;
        }

        private static void RecordAssemblyCompilationFinished(string assemblyPath, CompilerMessage[] messages)
        {
            var cycle = GetOrCreateActiveCompileCycle();
            cycle.assemblyCompilationFinishedSeen = true;

            if (messages == null)
            {
                return;
            }

            for (var i = 0; i < messages.Length; i += 1)
            {
                var message = CreateCompilerMessageRecord(assemblyPath, messages[i]);
                cycle.compilerMessages.Add(message);
                if (string.Equals(message.type, "error", StringComparison.Ordinal))
                {
                    cycle.compilerErrorCount += 1;
                }
                else if (string.Equals(message.type, "warning", StringComparison.Ordinal))
                {
                    cycle.compilerWarningCount += 1;
                }
            }
        }

        private static void RecordCompilationFinished(object context)
        {
            var cycle = GetOrCreateActiveCompileCycle();
            cycle.compilationFinishedSeen = true;
        }

        private static void CompleteActiveCycleIfIdle(bool isCompiling, bool isUpdating)
        {
            if (activeCompileCycle == null)
            {
                return;
            }

            if (!activeCompileCycle.assemblyCompilationFinishedSeen || !activeCompileCycle.compilationFinishedSeen || isCompiling || isUpdating)
            {
                return;
            }

            activeCompileCycle.editorIdleAfterCompilation = true;
            recentCompletedReport = BuildCompletedReport(activeCompileCycle, currentHostRecord);
            activeCompileCycle = null;
        }

        private static UnityAgentKitCompileReportResult BuildCompletedReport(ActiveCompileCycle cycle, UnityAgentKitHostRecord record)
        {
            var host = CloneHostRecord(record);
            return new UnityAgentKitCompileReportResult
            {
                reportId = Guid.NewGuid().ToString("N"),
                compileCycleId = cycle.compileCycleId,
                hostId = host != null ? host.hostId : string.Empty,
                hostEpoch = host != null ? host.hostEpoch : 0,
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                completedAt = DateTimeOffset.UtcNow.ToString("O"),
                invalidationTokenAtCompletion = cycle.invalidationTokenAtStart,
                compilerErrorCount = cycle.compilerErrorCount,
                compilerWarningCount = cycle.compilerWarningCount,
                compilerMessagesSummary = BuildCompilerMessagesSummary(cycle.compilerErrorCount, cycle.compilerWarningCount),
                compilerMessages = cycle.compilerMessages.ToArray(),
                assemblyCompilationFinishedSeen = cycle.assemblyCompilationFinishedSeen,
                compilationFinishedSeen = cycle.compilationFinishedSeen,
                editorIdleAfterCompilation = cycle.editorIdleAfterCompilation
            };
        }

        private static string BuildCompilerMessagesSummary(int errorCount, int warningCount)
        {
            return errorCount + (errorCount == 1 ? " error, " : " errors, ") + warningCount + (warningCount == 1 ? " warning" : " warnings");
        }

        private static UnityAgentKitCompilerMessageRecord CreateCompilerMessageRecord(string assemblyPath, CompilerMessage message)
        {
            return new UnityAgentKitCompilerMessageRecord
            {
                assemblyPath = assemblyPath ?? string.Empty,
                file = message.file ?? string.Empty,
                line = message.line,
                column = message.column,
                type = ToCompilerMessageType(message.type),
                message = message.message ?? string.Empty
            };
        }

        private static string ToCompilerMessageType(CompilerMessageType type)
        {
            if (type == CompilerMessageType.Error)
            {
                return "error";
            }

            if (type == CompilerMessageType.Warning)
            {
                return "warning";
            }

            return type.ToString().ToLowerInvariant();
        }

        private static bool DoesRecordMatchReport(UnityAgentKitHostRecord record, UnityAgentKitCompileReportResult report)
        {
            if (record == null)
            {
                return string.IsNullOrEmpty(report.hostId) && report.hostEpoch == 0;
            }

            return string.Equals(record.hostId ?? string.Empty, report.hostId ?? string.Empty, StringComparison.Ordinal) &&
                record.hostEpoch == report.hostEpoch;
        }

        private static UnityAgentKitCompileReportResult CloneReport(UnityAgentKitCompileReportResult source)
        {
            return new UnityAgentKitCompileReportResult
            {
                reportId = source.reportId,
                compileCycleId = source.compileCycleId,
                hostId = source.hostId,
                hostEpoch = source.hostEpoch,
                projectRoot = source.projectRoot,
                unityVersion = source.unityVersion,
                completedAt = source.completedAt,
                invalidationTokenAtCompletion = source.invalidationTokenAtCompletion,
                compilerErrorCount = source.compilerErrorCount,
                compilerWarningCount = source.compilerWarningCount,
                compilerMessagesSummary = source.compilerMessagesSummary,
                compilerMessages = CloneCompilerMessages(source.compilerMessages),
                assemblyCompilationFinishedSeen = source.assemblyCompilationFinishedSeen,
                compilationFinishedSeen = source.compilationFinishedSeen,
                editorIdleAfterCompilation = source.editorIdleAfterCompilation
            };
        }

        private static UnityAgentKitCompilerMessageRecord[] CloneCompilerMessages(UnityAgentKitCompilerMessageRecord[] messages)
        {
            if (messages == null || messages.Length == 0)
            {
                return Array.Empty<UnityAgentKitCompilerMessageRecord>();
            }

            var cloned = new UnityAgentKitCompilerMessageRecord[messages.Length];
            for (var i = 0; i < messages.Length; i += 1)
            {
                var message = messages[i] ?? new UnityAgentKitCompilerMessageRecord();
                cloned[i] = new UnityAgentKitCompilerMessageRecord
                {
                    assemblyPath = message.assemblyPath,
                    file = message.file,
                    line = message.line,
                    column = message.column,
                    type = message.type,
                    message = message.message
                };
            }

            return cloned;
        }

        private static UnityAgentKitHostRecord CloneHostRecord(UnityAgentKitHostRecord record)
        {
            if (record == null)
            {
                return null;
            }

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
    }
}
