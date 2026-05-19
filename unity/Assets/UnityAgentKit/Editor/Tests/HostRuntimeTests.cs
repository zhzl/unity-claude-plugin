using System;
using NUnit.Framework;
using UnityEngine;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class HostRuntimeTests
    {
        [Test]
        public void HostRecordRoundTripsAllMinimumFields()
        {
            var record = new UnityAgentKitHostRecord
            {
                hostName = "Unity Agent Kit",
                protocolVersion = "2026-05-19",
                projectRoot = "/repo/unity",
                hostId = "host-a",
                hostEpoch = 7,
                port = 49152,
                status = "ready",
                startedAt = "2026-05-19T10:00:00.0000000Z",
                lastProbeAt = "2026-05-19T10:00:01.0000000Z"
            };

            var json = JsonUtility.ToJson(record);
            var roundTrip = JsonUtility.FromJson<UnityAgentKitHostRecord>(json);

            Assert.AreEqual("Unity Agent Kit", roundTrip.hostName);
            Assert.AreEqual("2026-05-19", roundTrip.protocolVersion);
            Assert.AreEqual("/repo/unity", roundTrip.projectRoot);
            Assert.AreEqual("host-a", roundTrip.hostId);
            Assert.AreEqual(7, roundTrip.hostEpoch);
            Assert.AreEqual(49152, roundTrip.port);
            Assert.AreEqual("ready", roundTrip.status);
            Assert.AreEqual("2026-05-19T10:00:00.0000000Z", roundTrip.startedAt);
            Assert.AreEqual("2026-05-19T10:00:01.0000000Z", roundTrip.lastProbeAt);
        }

        [Test]
        public void ProbeResponseRoundTripsActiveValidationFields()
        {
            var response = new UnityAgentKitProbeResponse
            {
                hostId = "host-probe",
                hostEpoch = 3,
                projectRoot = "/repo/unity",
                protocolVersion = "2026-05-19",
                port = 49153,
                status = "not_ready",
                code = "host.not_ready",
                message = "Editor is compiling."
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitProbeResponse>(JsonUtility.ToJson(response));

            Assert.AreEqual("host-probe", roundTrip.hostId);
            Assert.AreEqual(3, roundTrip.hostEpoch);
            Assert.AreEqual("/repo/unity", roundTrip.projectRoot);
            Assert.AreEqual("2026-05-19", roundTrip.protocolVersion);
            Assert.AreEqual(49153, roundTrip.port);
            Assert.AreEqual("not_ready", roundTrip.status);
            Assert.AreEqual("host.not_ready", roundTrip.code);
            Assert.AreEqual("Editor is compiling.", roundTrip.message);
        }

        [Test]
        public void OperationRequestJsonDeserializesToDto()
        {
            var json = "{\"operation\":\"host.echo\",\"requestId\":\"req-1\",\"inputJson\":\"{\\\"text\\\":\\\"hello\\\"}\"}";

            var request = JsonUtility.FromJson<UnityAgentKitOperationRequest>(json);

            Assert.AreEqual("host.echo", request.operation);
            Assert.AreEqual("req-1", request.requestId);
            Assert.AreEqual("{\"text\":\"hello\"}", request.inputJson);
        }

        [Test]
        public void OperationResponseDtoSerializesAndDeserializesRoundTrip()
        {
            var response = new UnityAgentKitOperationResponse
            {
                status = "failed",
                operation = "host.echo",
                requestId = "req-2",
                hostId = "host-response",
                hostEpoch = 9,
                summary = "Echo failed.",
                data = "{\"ok\":false}",
                diagnostics = new[]
                {
                    new UnityAgentKitDiagnostic
                    {
                        source = "unity-host",
                        severity = "error",
                        code = "host.dispatch_exception",
                        message = "Dispatch failed.",
                        details = "{\"exceptionType\":\"InvalidOperationException\"}",
                        attribution = "{\"operation\":\"host.echo\",\"requestId\":\"req-2\"}"
                    }
                },
                startedAt = "2026-05-19T10:00:00.0000000Z",
                completedAt = "2026-05-19T10:00:01.2500000Z",
                durationMs = 1250,
                code = "host.dispatch_exception",
                message = "Dispatch failed.",
                metadata = "{\"continuity\":\"same host\"}"
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitOperationResponse>(JsonUtility.ToJson(response));

            Assert.AreEqual("failed", roundTrip.status);
            Assert.AreEqual("host.echo", roundTrip.operation);
            Assert.AreEqual("req-2", roundTrip.requestId);
            Assert.AreEqual("host-response", roundTrip.hostId);
            Assert.AreEqual(9, roundTrip.hostEpoch);
            Assert.AreEqual("Echo failed.", roundTrip.summary);
            Assert.AreEqual("{\"ok\":false}", roundTrip.data);
            Assert.AreEqual(1, roundTrip.diagnostics.Length);
            Assert.AreEqual("unity-host", roundTrip.diagnostics[0].source);
            Assert.AreEqual("error", roundTrip.diagnostics[0].severity);
            Assert.AreEqual("host.dispatch_exception", roundTrip.diagnostics[0].code);
            Assert.AreEqual("Dispatch failed.", roundTrip.diagnostics[0].message);
            Assert.AreEqual("{\"exceptionType\":\"InvalidOperationException\"}", roundTrip.diagnostics[0].details);
            Assert.AreEqual("{\"operation\":\"host.echo\",\"requestId\":\"req-2\"}", roundTrip.diagnostics[0].attribution);
            Assert.AreEqual("2026-05-19T10:00:00.0000000Z", roundTrip.startedAt);
            Assert.AreEqual("2026-05-19T10:00:01.2500000Z", roundTrip.completedAt);
            Assert.AreEqual(1250, roundTrip.durationMs);
            Assert.AreEqual("host.dispatch_exception", roundTrip.code);
            Assert.AreEqual("Dispatch failed.", roundTrip.message);
            Assert.AreEqual("{\"continuity\":\"same host\"}", roundTrip.metadata);
        }

        [Test]
        public void ThreadCheckResultRoundTripsMainThreadFields()
        {
            var result = new UnityAgentKitThreadCheckResult
            {
                capturedMainThreadId = 12,
                executionThreadId = 12,
                ranOnMainThread = true
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitThreadCheckResult>(JsonUtility.ToJson(result));

            Assert.AreEqual(12, roundTrip.capturedMainThreadId);
            Assert.AreEqual(12, roundTrip.executionThreadId);
            Assert.IsTrue(roundTrip.ranOnMainThread);
        }

        [Test]
        public void ProjectRootDerivedFromApplicationDataPath()
        {
            var expectedProjectRoot = System.IO.Path.GetFullPath(System.IO.Directory.GetParent(Application.dataPath)?.FullName ?? Application.dataPath);

            var actualProjectRoot = UnityAgentKitHostRegistry.GetProjectRoot();

            Assert.AreEqual(NormalizePath(expectedProjectRoot), NormalizePath(actualProjectRoot));
        }

        [Test]
        public void HostRegistryDoesNotUseEnvironmentCurrentDirectory()
        {
            var originalCurrentDirectory = Environment.CurrentDirectory;
            var unrelatedDirectory = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "UnityAgentKitCwdTest");
            System.IO.Directory.CreateDirectory(unrelatedDirectory);

            try
            {
                Environment.CurrentDirectory = unrelatedDirectory;

                var projectRoot = UnityAgentKitHostRegistry.GetProjectRoot();

                Assert.AreNotEqual(NormalizePath(unrelatedDirectory), NormalizePath(projectRoot));
                Assert.AreEqual(NormalizePath(System.IO.Directory.GetParent(Application.dataPath)?.FullName ?? Application.dataPath), NormalizePath(projectRoot));
            }
            finally
            {
                Environment.CurrentDirectory = originalCurrentDirectory;
            }
        }

        [Test]
        public void RegistryPathUsesProjectLibraryUnityAgentKitHostJson()
        {
            var projectRoot = UnityAgentKitHostRegistry.GetProjectRoot();
            var expectedPath = System.IO.Path.Combine(projectRoot, "Library", "UnityAgentKit", "host.json");

            var registryPath = UnityAgentKitHostRegistry.GetRegistryPath();

            Assert.AreEqual(NormalizePath(expectedPath), NormalizePath(registryPath));
        }

        [Test]
        public void HostRegistryWritesMinimumFields()
        {
            var registryPath = TemporaryRegistryPath("minimum-fields");
            var record = new UnityAgentKitHostRecord
            {
                hostName = "Unity Agent Kit",
                protocolVersion = "2026-05-19",
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "host-write",
                hostEpoch = 11,
                port = 49154,
                status = "ready",
                startedAt = "2026-05-19T11:00:00.0000000Z",
                lastProbeAt = "2026-05-19T11:00:01.0000000Z"
            };

            UnityAgentKitHostRegistry.WriteRecord(record, registryPath);
            var body = System.IO.File.ReadAllText(registryPath);
            var roundTrip = JsonUtility.FromJson<UnityAgentKitHostRecord>(body);

            Assert.AreEqual("Unity Agent Kit", roundTrip.hostName);
            Assert.AreEqual("2026-05-19", roundTrip.protocolVersion);
            Assert.AreEqual(UnityAgentKitHostRegistry.GetProjectRoot(), roundTrip.projectRoot);
            Assert.AreEqual("host-write", roundTrip.hostId);
            Assert.AreEqual(11, roundTrip.hostEpoch);
            Assert.AreEqual(49154, roundTrip.port);
            Assert.AreEqual("ready", roundTrip.status);
            Assert.AreEqual("2026-05-19T11:00:00.0000000Z", roundTrip.startedAt);
            Assert.AreEqual("2026-05-19T11:00:01.0000000Z", roundTrip.lastProbeAt);
        }

        [Test]
        public void HostRegistryReadRoundTripsWrittenRecord()
        {
            var registryPath = TemporaryRegistryPath("read-roundtrip");
            var record = new UnityAgentKitHostRecord
            {
                hostName = "Unity Agent Kit",
                protocolVersion = "2026-05-19",
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "host-read",
                hostEpoch = 12,
                port = 49155,
                status = "ready",
                startedAt = "2026-05-19T12:00:00.0000000Z",
                lastProbeAt = ""
            };

            UnityAgentKitHostRegistry.WriteRecord(record, registryPath);
            var roundTrip = UnityAgentKitHostRegistry.ReadRecord(registryPath);

            Assert.NotNull(roundTrip);
            Assert.AreEqual("host-read", roundTrip.hostId);
            Assert.AreEqual(12, roundTrip.hostEpoch);
            Assert.AreEqual(49155, roundTrip.port);
            Assert.AreEqual("ready", roundTrip.status);
        }

        [Test]
        public void CreateRecordUsesNewHostId()
        {
            var first = UnityAgentKitHostRegistry.CreateRecord(49156, 0, DateTimeOffset.Parse("2026-05-19T13:00:00.0000000Z"));
            var second = UnityAgentKitHostRegistry.CreateRecord(49156, 0, DateTimeOffset.Parse("2026-05-19T13:00:01.0000000Z"));

            Assert.IsNotEmpty(first.hostId);
            Assert.IsNotEmpty(second.hostId);
            Assert.AreNotEqual(first.hostId, second.hostId);
            Assert.AreEqual(1, first.hostEpoch);
            Assert.AreEqual(1, second.hostEpoch);
        }

        [Test]
        public void ReadExistingEpochAndIncrementOnRestart()
        {
            var registryPath = TemporaryRegistryPath("epoch-increment");
            UnityAgentKitHostRegistry.WriteRecord(new UnityAgentKitHostRecord
            {
                hostName = "Unity Agent Kit",
                protocolVersion = "2026-05-19",
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "old-host",
                hostEpoch = 41,
                port = 49157,
                status = "ready",
                startedAt = "2026-05-19T13:10:00.0000000Z"
            }, registryPath);

            var previousEpoch = UnityAgentKitHostRegistry.ReadExistingEpoch(registryPath);
            var restartRecord = UnityAgentKitHostRegistry.CreateRecord(49158, previousEpoch, DateTimeOffset.Parse("2026-05-19T13:11:00.0000000Z"));

            Assert.AreEqual(41, previousEpoch);
            Assert.AreEqual(42, restartRecord.hostEpoch);
            Assert.AreNotEqual("old-host", restartRecord.hostId);
        }

        [Test]
        public void ContinuityIdentityUsesHostIdAndHostEpoch()
        {
            var current = new UnityAgentKitHostRecord { hostId = "host-a", hostEpoch = 5 };
            var same = new UnityAgentKitHostRecord { hostId = "host-a", hostEpoch = 5 };
            var differentHost = new UnityAgentKitHostRecord { hostId = "host-b", hostEpoch = 5 };
            var differentEpoch = new UnityAgentKitHostRecord { hostId = "host-a", hostEpoch = 6 };

            Assert.IsTrue(UnityAgentKitHostRegistry.HasSameContinuityIdentity(current, same));
            Assert.IsFalse(UnityAgentKitHostRegistry.HasSameContinuityIdentity(current, differentHost));
            Assert.IsFalse(UnityAgentKitHostRegistry.HasSameContinuityIdentity(current, differentEpoch));
        }

        [Test]
        public void ContinuityIdentityRejectsMissingHostId()
        {
            var missingCurrent = new UnityAgentKitHostRecord { hostId = string.Empty, hostEpoch = 0 };
            var missingSame = new UnityAgentKitHostRecord { hostId = string.Empty, hostEpoch = 0 };
            var valid = new UnityAgentKitHostRecord { hostId = "host-a", hostEpoch = 0 };

            Assert.IsFalse(UnityAgentKitHostRegistry.HasSameContinuityIdentity(missingCurrent, missingSame));
            Assert.IsFalse(UnityAgentKitHostRegistry.HasSameContinuityIdentity(missingCurrent, valid));
            Assert.IsFalse(UnityAgentKitHostRegistry.HasSameContinuityIdentity(valid, missingSame));
        }

        [Test]
        public void RestartRecordChangesHostIdentityAndIncrementsEpoch()
        {
            var previous = UnityAgentKitHostRegistry.CreateRecord(49159, 6, DateTimeOffset.Parse("2026-05-19T13:20:00.0000000Z"));
            var restart = UnityAgentKitHostRegistry.CreateRecord(49160, previous.hostEpoch, DateTimeOffset.Parse("2026-05-19T13:21:00.0000000Z"));

            Assert.AreNotEqual(previous.hostId, restart.hostId);
            Assert.AreEqual(previous.hostEpoch + 1, restart.hostEpoch);
            Assert.IsFalse(UnityAgentKitHostRegistry.HasSameContinuityIdentity(previous, restart));
        }

        private static string TemporaryRegistryPath(string testName)
        {
            var directory = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "UnityAgentKitRegistryTests", testName, Guid.NewGuid().ToString("N"));
            System.IO.Directory.CreateDirectory(directory);
            return System.IO.Path.Combine(directory, "host.json");
        }

        private static string NormalizePath(string path)
        {
            return System.IO.Path.GetFullPath(path).TrimEnd(System.IO.Path.DirectorySeparatorChar, System.IO.Path.AltDirectorySeparatorChar);
        }
    }
}
