using System;
using NUnit.Framework;
using UnityEngine;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class PlayModeWorkflowTests
    {
        [Test]
        public void PlayModeStateResultRoundTripsStableEditMode()
        {
            var result = new UnityAgentKitPlayModeStateResult
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                hostId = "host-playmode",
                hostEpoch = 7,
                state = "editmode",
                stable = true,
                isPlaying = false,
                isPlayingOrWillChangePlaymode = false,
                isPlayModeChanging = false,
                isCompiling = false,
                isUpdating = false,
                capturedMainThreadId = 1,
                executionThreadId = 1,
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitPlayModeStateResult>(JsonUtility.ToJson(result));

            Assert.AreEqual("editmode", roundTrip.state);
            Assert.IsTrue(roundTrip.stable);
            Assert.IsFalse(roundTrip.isPlaying);
            Assert.IsFalse(roundTrip.isPlayingOrWillChangePlaymode);
            Assert.IsFalse(roundTrip.isPlayModeChanging);
        }

        [Test]
        public void PlayModeOperationsRequireMainThreadDispatch()
        {
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" playmode.state.get "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" playmode.enter.request "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" playmode.exit.request "));

            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "playmode.state.get",
                requestId = "req-playmode-state-direct"
            }, TestHostRecord());

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual("host.dispatch_required", response.code);
        }

        [Test]
        public void PlayModeStateForTestsReadsAdapterSnapshotWithoutMutation()
        {
            var adapter = new RecordingPlayModeAdapter
            {
                IsPlaying = false,
                IsPlayingOrWillChangePlaymode = false,
                IsCompiling = false,
                IsUpdating = false
            };

            var response = UnityAgentKitPlayModeDiagnostics.ReadStateForTests(TestHostRecord(), capturedMainThreadId: 11, adapter);

            Assert.AreEqual("succeeded", response.status);
            var result = JsonUtility.FromJson<UnityAgentKitPlayModeStateResult>(response.data);
            Assert.AreEqual("editmode", result.state);
            Assert.IsTrue(result.stable);
            Assert.AreEqual(11, result.capturedMainThreadId);
            Assert.AreEqual(0, adapter.EnterRequests);
            Assert.AreEqual(0, adapter.ExitRequests);
        }

        [Test]
        public void PlayModeEnterForTestsNoOpsWhenAlreadyStablePlayMode()
        {
            var adapter = new RecordingPlayModeAdapter
            {
                IsPlaying = true,
                IsPlayingOrWillChangePlaymode = true,
                IsCompiling = false,
                IsUpdating = false
            };

            var response = UnityAgentKitPlayModeDiagnostics.RequestEnterForTests(TestHostRecord(), capturedMainThreadId: 11, adapter);

            Assert.AreEqual("succeeded", response.status);
            var result = JsonUtility.FromJson<UnityAgentKitPlayModeRequestResult>(response.data);
            Assert.AreEqual("playmode", result.targetState);
            Assert.IsFalse(result.requested);
            Assert.IsTrue(result.noOp);
            Assert.AreEqual("already_playmode", result.noOpReason);
            Assert.AreEqual(0, adapter.EnterRequests);
        }

        [Test]
        public void PlayModeEnterForTestsRequestsEnterFromStableEditMode()
        {
            var adapter = new RecordingPlayModeAdapter
            {
                IsPlaying = false,
                IsPlayingOrWillChangePlaymode = false,
                IsCompiling = false,
                IsUpdating = false
            };

            var response = UnityAgentKitPlayModeDiagnostics.RequestEnterForTests(TestHostRecord(), capturedMainThreadId: 11, adapter);

            Assert.AreEqual("succeeded", response.status);
            var result = JsonUtility.FromJson<UnityAgentKitPlayModeRequestResult>(response.data);
            Assert.AreEqual("playmode", result.targetState);
            Assert.IsTrue(result.requested);
            Assert.IsFalse(result.noOp);
            Assert.AreEqual(1, adapter.EnterRequests);
            Assert.AreEqual(0, adapter.ExitRequests);
        }

        [Test]
        public void PlayModeExitForTestsRequestsExitFromStablePlayMode()
        {
            var adapter = new RecordingPlayModeAdapter
            {
                IsPlaying = true,
                IsPlayingOrWillChangePlaymode = true,
                IsCompiling = false,
                IsUpdating = false
            };

            var response = UnityAgentKitPlayModeDiagnostics.RequestExitForTests(TestHostRecord(), capturedMainThreadId: 11, adapter);

            Assert.AreEqual("succeeded", response.status);
            var result = JsonUtility.FromJson<UnityAgentKitPlayModeRequestResult>(response.data);
            Assert.AreEqual("editmode", result.targetState);
            Assert.IsTrue(result.requested);
            Assert.IsFalse(result.noOp);
            Assert.AreEqual(0, adapter.EnterRequests);
            Assert.AreEqual(1, adapter.ExitRequests);
        }

        private static UnityAgentKitHostRecord TestHostRecord()
        {
            return new UnityAgentKitHostRecord
            {
                hostName = UnityAgentKitHostRegistry.HostName,
                protocolVersion = UnityAgentKitHostRegistry.ProtocolVersion,
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "host-playmode",
                hostEpoch = 7,
                port = 49510,
                status = UnityAgentKitHostRegistry.ReadyStatus,
                startedAt = DateTimeOffset.UtcNow.ToString("O"),
                lastProbeAt = DateTimeOffset.UtcNow.ToString("O")
            };
        }

        private sealed class RecordingPlayModeAdapter : UnityAgentKitPlayModeDiagnostics.IPlayModeEditorAdapter
        {
            public bool IsPlaying { get; set; }
            public bool IsPlayingOrWillChangePlaymode { get; set; }
            public bool IsCompiling { get; set; }
            public bool IsUpdating { get; set; }
            public int EnterRequests { get; private set; }
            public int ExitRequests { get; private set; }

            public void RequestEnter()
            {
                EnterRequests++;
            }

            public void RequestExit()
            {
                ExitRequests++;
            }
        }
    }
}
