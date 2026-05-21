using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using NUnit.Framework;
using UnityEngine;

namespace UnityAgentKit.Editor.Tests
{
    public sealed partial class HostRuntimeTests
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

        [Test]
        public void HostLifecycleSkipRulesCoverCompileUpdateAndStoppedServer()
        {
            Assert.IsTrue(UnityAgentKitHost.ShouldSkipStart(started: true, serverRunning: true, isCompiling: false, isUpdating: false));
            Assert.IsTrue(UnityAgentKitHost.ShouldSkipStart(started: false, serverRunning: false, isCompiling: true, isUpdating: false));
            Assert.IsTrue(UnityAgentKitHost.ShouldSkipStart(started: false, serverRunning: false, isCompiling: false, isUpdating: true));
            Assert.IsFalse(UnityAgentKitHost.ShouldSkipStart(started: false, serverRunning: false, isCompiling: false, isUpdating: false));
            Assert.IsFalse(UnityAgentKitHost.ShouldSkipStart(started: true, serverRunning: false, isCompiling: false, isUpdating: false));
        }

        [Test]
        public void StartForTestsWritesRegistryWithDynamicPort()
        {
            var registryPath = TemporaryRegistryPath("host-start");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var roundTrip = UnityAgentKitHostRegistry.ReadRecord(registryPath);

                Assert.NotNull(record);
                Assert.NotNull(roundTrip);
                Assert.AreEqual(record.hostId, roundTrip.hostId);
                Assert.AreEqual(record.hostEpoch, roundTrip.hostEpoch);
                Assert.AreEqual(UnityAgentKitHostRegistry.ReadyStatus, roundTrip.status);
                Assert.Greater(roundTrip.port, 0);
                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.IsRunning);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void OperationNameIsTrimmedBeforeRouting()
        {
            var record = TestHostRecord(49170);
            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = " host.echo ",
                requestId = "req-trim",
                inputJson = "{\"text\":\"trimmed\"}"
            }, record);

            Assert.AreEqual("succeeded", response.status);
            Assert.AreEqual("host.echo", response.operation);
            Assert.AreEqual("req-trim", response.requestId);
            Assert.AreEqual("host-router", response.hostId);
            Assert.AreEqual(3, response.hostEpoch);
            Assert.AreEqual("{\"text\":\"trimmed\"}", response.data);
            Assert.AreEqual(string.Empty, response.code);
            Assert.AreEqual(string.Empty, response.message);
        }

        [Test]
        public void MissingOperationReturnsRejectedEnvelope()
        {
            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                requestId = "req-missing",
                inputJson = "{\"text\":\"missing\"}"
            }, TestHostRecord(49171));

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual(string.Empty, response.operation);
            Assert.AreEqual("req-missing", response.requestId);
            Assert.AreEqual("operation.empty", response.code);
            Assert.IsNotEmpty(response.message);
            Assert.AreEqual(1, response.diagnostics.Length);
            Assert.AreEqual("operation.empty", response.diagnostics[0].code);
            Assert.AreEqual("warning", response.diagnostics[0].severity);
        }

        [Test]
        public void EmptyOperationReturnsRejectedEnvelope()
        {
            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "   ",
                requestId = "req-empty"
            }, TestHostRecord(49172));

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual(string.Empty, response.operation);
            Assert.AreEqual("req-empty", response.requestId);
            Assert.AreEqual("operation.empty", response.code);
        }

        [Test]
        public void UnknownOperationReturnsRejectedEnvelopeWithCode()
        {
            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "unknown.operation",
                requestId = "req-unknown"
            }, TestHostRecord(49173));

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual("unknown.operation", response.operation);
            Assert.AreEqual("req-unknown", response.requestId);
            Assert.AreEqual("operation.unknown", response.code);
            Assert.AreEqual(1, response.diagnostics.Length);
            Assert.AreEqual("operation.unknown", response.diagnostics[0].code);
        }

        [Test]
        public void HostEchoRoutesWithoutMainThreadDispatch()
        {
            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "host.echo",
                requestId = "req-echo-router",
                inputJson = "{\"value\":42}"
            }, TestHostRecord(49174));

            Assert.AreEqual("succeeded", response.status);
            Assert.AreEqual("host.echo", response.operation);
            Assert.AreEqual("req-echo-router", response.requestId);
            Assert.AreEqual("{\"value\":42}", response.data);
            Assert.AreEqual(0, response.diagnostics.Length);
            Assert.IsNotEmpty(response.startedAt);
            Assert.IsNotEmpty(response.completedAt);
            Assert.GreaterOrEqual(response.durationMs, 0);
        }

        [Test]
        public void ThreadCheckIsClassifiedAsDispatchRequiredWithoutExecuting()
        {
            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = " host.threadCheck ",
                requestId = "req-thread-check"
            }, TestHostRecord(49175));

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual("host.threadCheck", response.operation);
            Assert.AreEqual("req-thread-check", response.requestId);
            Assert.AreEqual("host.dispatch_required", response.code);
            Assert.AreEqual(1, response.diagnostics.Length);
            Assert.AreEqual("host.dispatch_required", response.diagnostics[0].code);
            Assert.AreEqual(string.Empty, response.data);
        }

        [Test]
        public void BuildProbeUrlUsesAssignedPortAndCanonicalPath()
        {
            Assert.AreEqual("http://127.0.0.1:49152/", UnityAgentKitLoopbackHttpServer.BuildLoopbackPrefix(49152));
            Assert.AreEqual("http://127.0.0.1:49152/probe", UnityAgentKitLoopbackHttpServer.BuildProbeUrl(49152));
        }

        [Test]
        public void BuildOperationsUrlUsesAssignedPortAndCanonicalPath()
        {
            Assert.AreEqual("http://127.0.0.1:49180/operations", UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(49180));
        }

        [Test]
        public void HostEchoOverOperationsReturnsTopLevelOperationEnvelope()
        {
            var registryPath = TemporaryRegistryPath("operations-echo");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var result = Post(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.echo\",\"requestId\":\"req-http-echo\",\"inputJson\":\"{\\\"text\\\":\\\"hello\\\"}\"}");
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

                Assert.AreEqual(200, result.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "succeeded", "host.echo", "req-http-echo", record);
                Assert.AreEqual("{\"text\":\"hello\"}", response.data);
                Assert.AreEqual(string.Empty, response.code);
                Assert.AreEqual(string.Empty, response.message);
                Assert.AreEqual(0, response.diagnostics.Length);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void OperationsMissingOperationReturnsStructuredRejectedEnvelope()
        {
            var registryPath = TemporaryRegistryPath("operations-missing");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var result = Post(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"requestId\":\"req-missing-http\"}");
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

                Assert.AreEqual(400, result.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "rejected", string.Empty, "req-missing-http", record);
                Assert.AreEqual("operation.empty", response.code);
                Assert.AreEqual(1, response.diagnostics.Length);
                Assert.AreEqual("operation.empty", response.diagnostics[0].code);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void OperationsEmptyBodyReturnsStructuredFailedEnvelope()
        {
            var registryPath = TemporaryRegistryPath("operations-empty-body");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var result = Post(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), string.Empty);
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

                Assert.AreEqual(400, result.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "failed", "host.invalidRequest", string.Empty, record);
                Assert.AreEqual("protocol.empty_body", response.code);
                Assert.AreEqual(1, response.diagnostics.Length);
                Assert.AreEqual("protocol.empty_body", response.diagnostics[0].code);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void OperationsMalformedJsonReturnsStructuredFailedEnvelope()
        {
            var registryPath = TemporaryRegistryPath("operations-malformed-json");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var result = Post(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{not-json");
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

                Assert.AreEqual(400, result.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "failed", "host.invalidRequest", string.Empty, record);
                Assert.AreEqual("protocol.malformed_json", response.code);
                Assert.AreEqual(1, response.diagnostics.Length);
                Assert.AreEqual("protocol.malformed_json", response.diagnostics[0].code);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void OperationsUnknownOperationReturnsStructuredRejectedEnvelope()
        {
            var registryPath = TemporaryRegistryPath("operations-unknown");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var result = Post(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"unknown.operation\",\"requestId\":\"req-unknown-http\"}");
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

                Assert.AreEqual(200, result.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "rejected", "unknown.operation", "req-unknown-http", record);
                Assert.AreEqual("operation.unknown", response.code);
                Assert.AreEqual(1, response.diagnostics.Length);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void ProbeEndpointReturnsHostIdentityOverHttp()
        {
            var registryPath = TemporaryRegistryPath("probe-identity");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var response = ReadProbe(UnityAgentKitLoopbackHttpServer.BuildProbeUrl(record.port));

                Assert.AreEqual(record.hostId, response.hostId);
                Assert.AreEqual(record.hostEpoch, response.hostEpoch);
                Assert.AreEqual(record.projectRoot, response.projectRoot);
                Assert.AreEqual(UnityAgentKitHostRegistry.ProtocolVersion, response.protocolVersion);
                Assert.AreEqual(record.port, response.port);
                Assert.AreEqual(UnityAgentKitHostRegistry.ReadyStatus, response.status);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void ProbeEndpointReturnsJsonContentTypeAndReadableUtf8Body()
        {
            var registryPath = TemporaryRegistryPath("probe-content-type");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var result = Get(UnityAgentKitLoopbackHttpServer.BuildProbeUrl(record.port));
                var response = JsonUtility.FromJson<UnityAgentKitProbeResponse>(result.body);

                Assert.AreEqual(200, result.statusCode);
                Assert.AreEqual("application/json; charset=utf-8", result.contentType);
                Assert.AreEqual(System.Text.Encoding.UTF8.GetByteCount(result.body), result.contentLength);
                Assert.AreEqual(record.hostId, response.hostId);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void ProbeReturnsNotReadyWhenHostRecordUnavailable()
        {
            var port = FreeTcpPort();

            try
            {
                UnityAgentKitLoopbackHttpServer.StartWithoutRecordForTests(port);
                var result = Get(UnityAgentKitLoopbackHttpServer.BuildProbeUrl(port));
                var response = JsonUtility.FromJson<UnityAgentKitProbeResponse>(result.body);

                Assert.AreEqual(200, result.statusCode);
                Assert.AreEqual("not_ready", response.status);
                Assert.AreEqual("host.not_ready", response.code);
                Assert.IsNotEmpty(response.message);
            }
            finally
            {
                UnityAgentKitLoopbackHttpServer.Stop("host.stopped");
            }
        }

        [Test]
        public void UnknownRouteReturns404StructuredOperationEnvelope()
        {
            var registryPath = TemporaryRegistryPath("operations-unknown-route");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var result = Get("http://127.0.0.1:" + record.port + "/unknown");
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

                Assert.AreEqual(404, result.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "failed", "host.invalidRequest", string.Empty, record);
                Assert.AreEqual("http.not_found", response.code);
                Assert.AreEqual(1, response.diagnostics.Length);
                Assert.AreEqual("http.not_found", response.diagnostics[0].code);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void WrongMethodReturns405StructuredJson()
        {
            var registryPath = TemporaryRegistryPath("probe-wrong-method");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var result = Post(UnityAgentKitLoopbackHttpServer.BuildProbeUrl(record.port), "{}");
                var response = JsonUtility.FromJson<UnityAgentKitProbeResponse>(result.body);

                Assert.AreEqual(405, result.statusCode);
                StringAssert.StartsWith("application/json", result.contentType);
                Assert.AreEqual("not_ready", response.status);
                Assert.AreEqual("http.method_not_allowed", response.code);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void OperationsWrongMethodReturns405StructuredEnvelope()
        {
            var registryPath = TemporaryRegistryPath("operations-wrong-method");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var result = Get(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port));
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

                Assert.AreEqual(405, result.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "failed", "host.invalidRequest", string.Empty, record);
                Assert.AreEqual("http.method_not_allowed", response.code);
                Assert.AreEqual(1, response.diagnostics.Length);
                Assert.AreEqual("http.method_not_allowed", response.diagnostics[0].code);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void OperationsEndpointReturnsJsonContentTypeAndReadableUtf8Body()
        {
            var registryPath = TemporaryRegistryPath("operations-content-type");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var result = Post(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\" host.echo \",\"requestId\":\"req-framing\",\"inputJson\":\"{\\\"text\\\":\\\"utf8-✓\\\"}\"}");
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

                Assert.AreEqual(200, result.statusCode);
                Assert.AreEqual("application/json; charset=utf-8", result.contentType);
                Assert.AreEqual(System.Text.Encoding.UTF8.GetByteCount(result.body), result.contentLength);
                AssertOperationEnvelopeMinimumFields(response, "succeeded", "host.echo", "req-framing", record);
                Assert.AreEqual("{\"text\":\"utf8-✓\"}", response.data);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void RestartRecordChangesHostIdentityAndIncrementsEpochThroughHostBootstrap()
        {
            var registryPath = TemporaryRegistryPath("host-bootstrap-restart");

            try
            {
                var first = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitHost.StopForTests("host.stopped");
                var second = UnityAgentKitHost.StartForTests(registryPath);

                Assert.AreNotEqual(first.hostId, second.hostId);
                Assert.AreEqual(first.hostEpoch + 1, second.hostEpoch);
                Assert.IsFalse(UnityAgentKitHostRegistry.HasSameContinuityIdentity(first, second));
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void HostDoesNotStartWhileCompilingOrUpdatingOnTick()
        {
            var registryPath = TemporaryRegistryPath("tick-skip");

            try
            {
                UnityAgentKitHost.TickForTests(isCompiling: true, isUpdating: false, now: 1.0, registryPath: registryPath);
                UnityAgentKitHost.TickForTests(isCompiling: false, isUpdating: true, now: 2.0, registryPath: registryPath);

                Assert.IsFalse(UnityAgentKitHost.IsStartedForTests);
                Assert.IsFalse(File.Exists(registryPath));
                Assert.IsFalse(UnityAgentKitLoopbackHttpServer.IsRunning);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void HostRetriesStartOnUpdateTickAfterCompileEnds()
        {
            var registryPath = TemporaryRegistryPath("tick-retry");

            try
            {
                UnityAgentKitHost.TickForTests(isCompiling: true, isUpdating: false, now: 1.0, registryPath: registryPath);
                UnityAgentKitHost.TickForTests(isCompiling: false, isUpdating: false, now: 2.0, registryPath: registryPath);
                var record = UnityAgentKitHostRegistry.ReadRecord(registryPath);

                Assert.IsTrue(UnityAgentKitHost.IsStartedForTests);
                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.IsRunning);
                Assert.NotNull(record);
                Assert.AreEqual(1, record.hostEpoch);
                Assert.IsNotEmpty(record.hostId);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void RestartsWhenStartedFlagTrueButServerStopped()
        {
            var registryPath = TemporaryRegistryPath("server-stopped-restart");

            try
            {
                var first = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitLoopbackHttpServer.Stop("host.stopped");

                UnityAgentKitHost.TickForTests(isCompiling: false, isUpdating: false, now: 3.0, registryPath: registryPath);
                var second = UnityAgentKitHost.CurrentRecordForTests;

                Assert.NotNull(second);
                Assert.AreNotEqual(first.hostId, second.hostId);
                Assert.AreEqual(first.hostEpoch + 1, second.hostEpoch);
                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.IsRunning);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void StopForReloadStopsLoopbackServerAndClearsHostRecord()
        {
            var registryPath = TemporaryRegistryPath("reload-stop");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var url = UnityAgentKitLoopbackHttpServer.BuildProbeUrl(record.port);
                Assert.AreEqual(record.hostId, ReadProbe(url).hostId);

                UnityAgentKitHost.StopForReloadForTests();
                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000), "Expected listener close to finish after reload stop.");

                Assert.IsFalse(UnityAgentKitHost.IsStartedForTests);
                Assert.IsNull(UnityAgentKitHost.CurrentRecordForTests);
                Assert.IsFalse(UnityAgentKitLoopbackHttpServer.IsRunning);
                AssertRequestFails(url);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void EditorQuittingStopsLoopbackServerAndClearsLifecyclePendingWork()
        {
            var registryPath = TemporaryRegistryPath("quitting-stop");

            try
            {
                UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.EnqueueLifecycleWorkForTests("quit-cleanup");

                UnityAgentKitHost.StopForQuittingForTests();
                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000), "Expected listener close to finish after editor quitting stop.");

                Assert.IsFalse(UnityAgentKitLoopbackHttpServer.IsRunning);
                Assert.IsFalse(UnityAgentKitMainThread.IsDrainRegisteredForTests);
                Assert.AreEqual(0, UnityAgentKitMainThread.PendingLifecycleWorkCountForTests);
                Assert.AreEqual("host.editor_quitting", UnityAgentKitMainThread.LastStopCodeForTests);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void StoppingWindowDirectOperationReturnsStoppedEnvelope()
        {
            var registryPath = TemporaryRegistryPath("stop-window-direct-operation");
            HttpResult result = default;
            var resultCaptured = false;

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitLoopbackHttpServer.BeginStopHookForTests = () =>
                {
                    result = Post(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.echo\",\"requestId\":\"req-stop-window-echo\",\"inputJson\":\"{\\\"text\\\":\\\"stopping\\\"}\"}");
                    resultCaptured = true;
                };

                UnityAgentKitHost.StopForTests("host.stopped");
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

                Assert.IsTrue(resultCaptured, "Expected stop hook to capture the direct operation response.");
                Assert.AreEqual(200, result.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "failed", "host.echo", "req-stop-window-echo", record);
                Assert.AreEqual("host.stopped", response.code);
                Assert.AreEqual(1, response.diagnostics.Length);
                Assert.AreEqual("host.stopped", response.diagnostics[0].code);
            }
            finally
            {
                UnityAgentKitLoopbackHttpServer.BeginStopHookForTests = null;
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void StopFlushWaitsForAsyncWritesEnqueuedAfterInitialAsyncIdleCheck()
        {
            var registryPath = TemporaryRegistryPath("stop-flush-async-after-active");
            var asyncWriteEnqueued = new ManualResetEventSlim(false);
            var releaseActiveHandlerDone = new ManualResetEventSlim(false);
            var activeHandlerEntered = false;
            var injectedAsyncWrite = false;

            try
            {
                UnityAgentKitHost.StartForTests(registryPath);
                InvokeLoopbackCounterForTests("IncrementActiveHandlerCount");
                activeHandlerEntered = true;
                UnityAgentKitLoopbackHttpServer.BeforeActiveHandlersIdleWaitHookForTests = () =>
                {
                    if (injectedAsyncWrite)
                    {
                        return;
                    }

                    injectedAsyncWrite = true;
                    SetPendingAsyncWriteCountForTests(1);
                    asyncWriteEnqueued.Set();
                };

                var releaseThread = new Thread(() =>
                {
                    asyncWriteEnqueued.Wait(1000);
                    InvokeLoopbackCounterForTests("DecrementActiveHandlerCount");
                    releaseActiveHandlerDone.Set();
                })
                {
                    IsBackground = true,
                    Name = "UnityAgentKitStopFlushAsyncAfterActiveTestRelease"
                };
                releaseThread.Start();

                UnityAgentKitHost.StopForTests("host.stopped");

                Assert.IsTrue(asyncWriteEnqueued.Wait(1000), "Expected close flow to begin the active handler idle wait.");
                Assert.IsTrue(releaseActiveHandlerDone.Wait(1000), "Expected active handler release thread to complete.");
                Assert.IsFalse(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(100), "Listener must not close while an async write remains pending.");

                SetPendingAsyncWriteCountForTests(0);
                activeHandlerEntered = false;
                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000), "Expected listener close to finish after async write release.");
            }
            finally
            {
                UnityAgentKitLoopbackHttpServer.BeforeActiveHandlersIdleWaitHookForTests = null;
                if (activeHandlerEntered)
                {
                    InvokeLoopbackCounterForTests("DecrementActiveHandlerCount");
                }

                SetPendingAsyncWriteCountForTests(0);
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void StopOnCapturedMainThreadDoesNotWaitForActiveHandlersToFlush()
        {
            var registryPath = TemporaryRegistryPath("stop-main-thread-nonblocking");
            var releaseActiveHandler = new ManualResetEventSlim(false);
            var releaseThreadDone = new ManualResetEventSlim(false);
            var activeHandlerEntered = false;
            var stopReturnedBeforeRelease = false;

            try
            {
                UnityAgentKitHost.StartForTests(registryPath);
                InvokeLoopbackCounterForTests("IncrementActiveHandlerCount");
                activeHandlerEntered = true;
                var releaseThread = new Thread(() =>
                {
                    releaseActiveHandler.Wait(1000);
                    InvokeLoopbackCounterForTests("DecrementActiveHandlerCount");
                    releaseThreadDone.Set();
                })
                {
                    IsBackground = true,
                    Name = "UnityAgentKitStopNonblockingTestRelease"
                };
                releaseThread.Start();

                UnityAgentKitHost.StopForTests("host.stopped");
                stopReturnedBeforeRelease = !releaseThreadDone.IsSet;
                activeHandlerEntered = false;
                releaseActiveHandler.Set();

                Assert.IsTrue(releaseThreadDone.Wait(1000), "Expected active handler release thread to complete.");
                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000), "Expected listener close to finish after active handler release.");
                Assert.IsTrue(stopReturnedBeforeRelease, "Stop must return on the captured Unity main thread before waiting active handlers idle.");
            }
            finally
            {
                releaseActiveHandler.Set();
                if (activeHandlerEntered)
                {
                    InvokeLoopbackCounterForTests("DecrementActiveHandlerCount");
                }

                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void StopClosesListenerAndUnregistersDrain()
        {
            var registryPath = TemporaryRegistryPath("stop-drain");

            try
            {
                UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.EnqueueLifecycleWorkForTests("stop-cleanup");
                Assert.IsTrue(UnityAgentKitMainThread.IsDrainRegisteredForTests);

                UnityAgentKitHost.StopForTests("host.stopped");
                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000), "Expected listener close to finish after host stop.");

                Assert.IsFalse(UnityAgentKitLoopbackHttpServer.IsRunning);
                Assert.IsFalse(UnityAgentKitMainThread.IsDrainRegisteredForTests);
                Assert.AreEqual(0, UnityAgentKitMainThread.PendingLifecycleWorkCountForTests);
                Assert.AreEqual("host.stopped", UnityAgentKitMainThread.LastStopCodeForTests);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void StartStopsExistingListenerBeforeBinding()
        {
            var firstPort = FreeTcpPort();
            var secondPort = FreeTcpPort();
            var first = UnityAgentKitHostRegistry.CreateRecord(firstPort, 0, DateTimeOffset.Parse("2026-05-19T14:00:00.0000000Z"));
            var second = UnityAgentKitHostRegistry.CreateRecord(secondPort, first.hostEpoch, DateTimeOffset.Parse("2026-05-19T14:01:00.0000000Z"));
            var firstUrl = UnityAgentKitLoopbackHttpServer.BuildProbeUrl(first.port);
            var secondUrl = UnityAgentKitLoopbackHttpServer.BuildProbeUrl(second.port);

            try
            {
                UnityAgentKitLoopbackHttpServer.Start(first);
                Assert.AreEqual(first.hostId, ReadProbe(firstUrl).hostId);

                UnityAgentKitLoopbackHttpServer.Start(second);
                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000), "Expected old listener close to finish before asserting old probe failure.");

                AssertRequestFails(firstUrl);
                Assert.AreEqual(second.hostId, ReadProbe(secondUrl).hostId);
            }
            finally
            {
                UnityAgentKitLoopbackHttpServer.Stop("host.stopped");
                UnityAgentKitMainThread.ResetForTests();
            }
        }

        [Test]
        public void StoppedOldListenerNoLongerResponds()
        {
            var registryPath = TemporaryRegistryPath("old-listener-stopped");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var url = UnityAgentKitLoopbackHttpServer.BuildProbeUrl(record.port);
                Assert.AreEqual(record.hostId, ReadProbe(url).hostId);

                UnityAgentKitHost.StopForTests("host.stopped");
                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000), "Expected listener close to finish before asserting old probe failure.");

                AssertRequestFails(url);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void ShutdownListenerExceptionsDoNotFailStop()
        {
            var registryPath = TemporaryRegistryPath("shutdown-exceptions");

            try
            {
                UnityAgentKitHost.StartForTests(registryPath);

                Assert.DoesNotThrow(() => UnityAgentKitLoopbackHttpServer.Stop("host.stopped"));
                Assert.DoesNotThrow(() => UnityAgentKitLoopbackHttpServer.Stop("host.stopped"));
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        private static void InvokeLoopbackCounterForTests(string methodName)
        {
            typeof(UnityAgentKitLoopbackHttpServer)
                .GetMethod(methodName, System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.NonPublic)
                .Invoke(null, null);
        }

        private static void SetPendingAsyncWriteCountForTests(int count)
        {
            Assert.GreaterOrEqual(count, 0);

            while (UnityAgentKitLoopbackHttpServer.GuaranteedAsyncWriteCountForTests < count)
            {
                InvokeLoopbackCounterForTests("IncrementGuaranteedAsyncWriteCount");
            }

            while (UnityAgentKitLoopbackHttpServer.GuaranteedAsyncWriteCountForTests > count)
            {
                InvokeLoopbackCounterForTests("DecrementGuaranteedAsyncWriteCount");
            }
        }

        private static UnityAgentKitHostRecord TestHostRecord(int port)
        {
            return new UnityAgentKitHostRecord
            {
                hostName = UnityAgentKitHostRegistry.HostName,
                protocolVersion = UnityAgentKitHostRegistry.ProtocolVersion,
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "host-router",
                hostEpoch = 3,
                port = port,
                status = UnityAgentKitHostRegistry.ReadyStatus,
                startedAt = "2026-05-20T10:00:00.0000000Z",
                lastProbeAt = "2026-05-20T10:00:01.0000000Z"
            };
        }

        private static void AssertOperationEnvelopeMinimumFields(UnityAgentKitOperationResponse response, string status, string operation, string requestId, UnityAgentKitHostRecord record)
        {
            Assert.NotNull(response);
            Assert.AreEqual(status, response.status);
            Assert.AreEqual(operation, response.operation);
            Assert.AreEqual(requestId, response.requestId);
            Assert.AreEqual(record.hostId, response.hostId);
            Assert.AreEqual(record.hostEpoch, response.hostEpoch);
            Assert.IsNotEmpty(response.summary);
            Assert.IsNotNull(response.data);
            Assert.IsNotNull(response.diagnostics);
            Assert.IsNotEmpty(response.startedAt);
            Assert.IsNotEmpty(response.completedAt);
            Assert.GreaterOrEqual(response.durationMs, 0);
            Assert.IsNotNull(response.code);
            Assert.IsNotNull(response.message);
        }

        private static UnityAgentKitProbeResponse ReadProbe(string url)
        {
            return JsonUtility.FromJson<UnityAgentKitProbeResponse>(Get(url).body);
        }

        private static HttpResult Get(string url)
        {
            return Request(url, "GET", string.Empty);
        }

        private static HttpResult Post(string url, string body)
        {
            return Request(url, "POST", body);
        }

        private static HttpResult Request(string url, string method, string body)
        {
            var request = (HttpWebRequest)WebRequest.Create(url);
            request.Method = method;
            request.Timeout = 1000;
            request.ReadWriteTimeout = 1000;
            if (method == "POST")
            {
                var payload = System.Text.Encoding.UTF8.GetBytes(body ?? string.Empty);
                request.ContentType = "application/json";
                request.ContentLength = payload.Length;
                using (var stream = request.GetRequestStream())
                {
                    stream.Write(payload, 0, payload.Length);
                }
            }

            try
            {
                return ReadHttpResponse((HttpWebResponse)request.GetResponse());
            }
            catch (WebException error)
            {
                if (error.Response is HttpWebResponse response)
                {
                    return ReadHttpResponse(response);
                }

                throw;
            }
        }

        private static HttpResult ReadHttpResponse(HttpWebResponse response)
        {
            using (response)
            using (var stream = response.GetResponseStream())
            using (var reader = new StreamReader(stream))
            {
                return new HttpResult
                {
                    statusCode = (int)response.StatusCode,
                    contentType = response.ContentType,
                    contentLength = response.ContentLength,
                    body = reader.ReadToEnd()
                };
            }
        }

        private static int FreeTcpPort()
        {
            var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            try
            {
                return ((IPEndPoint)listener.LocalEndpoint).Port;
            }
            finally
            {
                listener.Stop();
            }
        }

        private struct HttpResult
        {
            public int statusCode;
            public string contentType;
            public long contentLength;
            public string body;
        }

        private static void AssertRequestFails(string url)
        {
            Assert.Throws<WebException>(() => Get(url));
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
