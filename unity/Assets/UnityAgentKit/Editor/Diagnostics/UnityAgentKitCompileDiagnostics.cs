using System;
using System.Threading;
using UnityEditor;
using UnityEditor.Compilation;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitCompileDiagnostics
    {
        private static int compileInvalidationToken;

        internal static UnityAgentKitCompileStateResult ReadState(int capturedMainThreadId)
        {
            return CreateState(capturedMainThreadId, EditorApplication.isCompiling, EditorApplication.isUpdating);
        }

        internal static UnityAgentKitCompileRequestResult RequestCompile(string inputJson, int capturedMainThreadId)
        {
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

        internal static void ResetForTests()
        {
            compileInvalidationToken = 0;
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
                hasRecentCompileReport = false,
                recentCompileReportId = string.Empty,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId
            };
        }
    }
}
