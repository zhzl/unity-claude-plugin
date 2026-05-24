using System.Threading;
using UnityEditor;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitEditorDiagnostics
    {
        internal static UnityAgentKitEditorStatusResult ReadStatus(int capturedMainThreadId)
        {
            var isPlaying = EditorApplication.isPlaying;
            var isPlayingOrWillChangePlaymode = EditorApplication.isPlayingOrWillChangePlaymode;
            var isCompiling = EditorApplication.isCompiling;
            var isUpdating = EditorApplication.isUpdating;
            var isPlayModeChanging = isPlayingOrWillChangePlaymode != isPlaying;

            return new UnityAgentKitEditorStatusResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                isCompiling = isCompiling,
                isUpdating = isUpdating,
                isPlaying = isPlaying,
                isPlayingOrWillChangePlaymode = isPlayingOrWillChangePlaymode,
                isPlayModeChanging = isPlayModeChanging,
                isReady = !isCompiling && !isUpdating && !isPlayModeChanging,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId
            };
        }
    }
}
