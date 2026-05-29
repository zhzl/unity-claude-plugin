using System;
using System.IO;
using NUnit.Framework;
using UnityEngine;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class ScreenshotWorkflowTests
    {
        [Test]
        public void CaptureMethodFeasibilityDeclaresScreenCaptureAndRejectsForbiddenPipeline()
        {
            var feasibility = UnityAgentKitScreenshotDiagnostics.GetCaptureMethodFeasibilityForTests();

            Assert.IsTrue(feasibility.supported);
            Assert.AreEqual("screen_capture_capture_screenshot", feasibility.methodId);
            Assert.AreEqual("current_game_view", feasibility.view);
            Assert.IsFalse(feasibility.usesReadScreenPixel);
            Assert.IsFalse(feasibility.usesEncodeToPng);
            Assert.IsFalse(feasibility.usesPayloadFileWriteAllBytes);
        }

        [Test]
        public void CaptureGameViewForTestsWritesControlledPngArtifactMetadata()
        {
            var artifactRoot = TemporaryArtifactRoot("success");
            var adapter = new RecordingScreenshotAdapter(width: 320, height: 180, writesPayload: true);

            var response = UnityAgentKitScreenshotDiagnostics.CaptureGameViewForTests(
                TestHostRecord(),
                capturedMainThreadId: 7,
                inputJson: "{\"label\":\"smoke\"}",
                artifactRoot: artifactRoot,
                adapter: adapter,
                requestId: "req-shot");

            Assert.AreEqual("succeeded", response.status, response.code + ": " + response.message);
            Assert.AreEqual("screenshot.capture", response.operation);
            var result = JsonUtility.FromJson<UnityAgentKitScreenshotCaptureResult>(response.data);
            Assert.AreEqual("unity://screenshots/" + result.artifactId, result.uri);
            Assert.AreEqual("screenshots/" + result.artifactId + ".png", result.relativePath);
            Assert.AreEqual(320, result.width);
            Assert.AreEqual(180, result.height);
            Assert.Greater(result.sizeBytes, 0);
            Assert.AreEqual("screen_capture_capture_screenshot", result.captureMethod);
            Assert.AreEqual("valid", result.validationStatus);
            var expectedPngPath = Path.Combine(artifactRoot, "screenshots", result.artifactId + ".png");
            Assert.GreaterOrEqual(adapter.TryGetGameViewSizeCallCount, 1);
            Assert.GreaterOrEqual(adapter.FocusAndRepaintGameViewCallCount, 1);
            Assert.GreaterOrEqual(adapter.CaptureGameViewPngCallCount, 1);
            Assert.AreEqual(expectedPngPath, adapter.CapturedAbsolutePath);
            Assert.IsTrue(File.Exists(expectedPngPath));
            CollectionAssert.AreEqual(adapter.FixturePngBytes, File.ReadAllBytes(expectedPngPath));
            Assert.IsTrue(File.Exists(Path.Combine(artifactRoot, "metadata", "screenshots", result.artifactId + ".json")));
            Assert.IsFalse(adapter.UsedForbiddenPath);
        }

        [Test]
        public void CaptureGameViewForTestsFailsWhenGameViewUnavailable()
        {
            var response = UnityAgentKitScreenshotDiagnostics.CaptureGameViewForTests(
                TestHostRecord(),
                capturedMainThreadId: 7,
                inputJson: "{\"label\":\"smoke\"}",
                artifactRoot: TemporaryArtifactRoot("unavailable"),
                adapter: new RecordingScreenshotAdapter(width: 0, height: 180, writesPayload: false),
                requestId: "req-shot-unavailable");

            Assert.AreEqual("failed", response.status);
            Assert.AreEqual("screenshot.game_view_unavailable", response.code);
        }

        [Test]
        public void CaptureGameViewForTestsFailsWhenCaptureDoesNotCreateReadyFile()
        {
            var response = UnityAgentKitScreenshotDiagnostics.CaptureGameViewForTests(
                TestHostRecord(),
                capturedMainThreadId: 7,
                inputJson: "{\"label\":\"smoke\"}",
                artifactRoot: TemporaryArtifactRoot("not-ready"),
                adapter: new RecordingScreenshotAdapter(width: 320, height: 180, writesPayload: false),
                requestId: "req-shot-not-ready");

            Assert.AreEqual("failed", response.status);
            Assert.AreEqual("screenshot.file_not_ready", response.code);
        }

        [Test]
        public void CaptureGameViewForTestsRejectsUnsafeLabelBeforeWritingPayload()
        {
            var artifactRoot = TemporaryArtifactRoot("unsafe-label");
            var adapter = new RecordingScreenshotAdapter(width: 320, height: 180, writesPayload: true);

            var response = UnityAgentKitScreenshotDiagnostics.CaptureGameViewForTests(
                TestHostRecord(),
                capturedMainThreadId: 7,
                inputJson: "{\"label\":\"../escape\"}",
                artifactRoot: artifactRoot,
                adapter: adapter,
                requestId: "req-shot-unsafe-label");

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual("screenshot.label_invalid", response.code);
            Assert.IsFalse(Directory.Exists(Path.Combine(artifactRoot, "screenshots")));
        }

        [Test]
        public void CaptureGameViewForTestsFailsForbiddenAdapterWithoutCapturingPayload()
        {
            var adapter = new RecordingScreenshotAdapter(width: 320, height: 180, writesPayload: true, usesForbiddenPath: true);

            var response = UnityAgentKitScreenshotDiagnostics.CaptureGameViewForTests(
                TestHostRecord(),
                capturedMainThreadId: 7,
                inputJson: "{\"label\":\"smoke\"}",
                artifactRoot: TemporaryArtifactRoot("forbidden-adapter"),
                adapter: adapter,
                requestId: "req-shot-forbidden");

            Assert.AreEqual("failed", response.status);
            Assert.AreEqual("screenshot.capture_method_forbidden", response.code);
            Assert.AreEqual(0, adapter.CaptureGameViewPngCallCount);
        }

        [Test]
        public void WriteScreenshotArtifactMetadataRejectsSizeMismatch()
        {
            var artifactRoot = TemporaryArtifactRoot("metadata-size-mismatch");
            var artifactId = "shot-size-mismatch";
            var relativePath = "screenshots/" + artifactId + ".png";
            var payloadPath = Path.Combine(artifactRoot, "screenshots", artifactId + ".png");
            WriteFixturePng(payloadPath);

            Assert.Throws<InvalidOperationException>(() =>
                UnityAgentKitArtifactContracts.WriteScreenshotArtifactMetadata(
                    artifactRoot,
                    artifactId,
                    relativePath,
                    TestHostRecord(),
                    new FileInfo(payloadPath).Length + 1));

            Assert.IsFalse(File.Exists(Path.Combine(artifactRoot, "metadata", "screenshots", artifactId + ".json")));
        }

        [Test]
        public void WriteScreenshotArtifactMetadataRejectsArtifactIdRelativePathMismatch()
        {
            var artifactRoot = TemporaryArtifactRoot("metadata-path-mismatch");
            var artifactId = "shot-path-mismatch";
            var otherArtifactId = "shot-path-other";
            var relativePath = "screenshots/" + otherArtifactId + ".png";
            var payloadPath = Path.Combine(artifactRoot, "screenshots", otherArtifactId + ".png");
            WriteFixturePng(payloadPath);

            Assert.Throws<InvalidOperationException>(() =>
                UnityAgentKitArtifactContracts.WriteScreenshotArtifactMetadata(
                    artifactRoot,
                    artifactId,
                    relativePath,
                    TestHostRecord(),
                    new FileInfo(payloadPath).Length));

            Assert.IsFalse(File.Exists(Path.Combine(artifactRoot, "metadata", "screenshots", artifactId + ".json")));
        }

        [Test]
        public void ScreenshotCaptureOperationRequiresMainThreadDispatch()
        {
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" screenshot.capture "));
            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "screenshot.capture",
                requestId = "req-shot-route",
                inputJson = "{\"label\":\"smoke\"}"
            }, TestHostRecord());

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual("host.dispatch_required", response.code);
        }

        [UnityEngine.TestTools.UnityTest]
        public System.Collections.IEnumerator RouterScreenshotCaptureProductionSmokeWritesRealGameViewPngWhenInteractive()
        {
            if (Application.isBatchMode)
            {
                Assert.Ignore("Production Game View screenshot smoke requires an interactive Unity editor.");
            }

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "screenshot.capture",
                requestId = "req-shot-production-smoke",
                inputJson = "{\"label\":\"production-smoke\"}"
            }, TestHostRecord(), System.Threading.Thread.CurrentThread.ManagedThreadId);

            if (response.status == "failed" && response.code == "screenshot.game_view_unavailable")
            {
                Assert.Ignore("Game View is unavailable in this editor environment.");
            }

            Assert.AreEqual("succeeded", response.status, response.code + ": " + response.message);
            var result = JsonUtility.FromJson<UnityAgentKitScreenshotCaptureResult>(response.data);
            var payloadPath = Path.Combine(UnityAgentKitArtifactContracts.GetArtifactRoot(), result.relativePath.Replace('/', Path.DirectorySeparatorChar));
            var metadataPath = Path.Combine(UnityAgentKitArtifactContracts.GetArtifactRoot(), "metadata", "screenshots", result.artifactId + ".json");

            for (var frame = 0; frame < 120 && (!File.Exists(payloadPath) || new FileInfo(payloadPath).Length <= 0); frame++)
            {
                yield return null;
            }

            Assert.IsTrue(File.Exists(payloadPath), payloadPath);
            Assert.Greater(new FileInfo(payloadPath).Length, 0);
            Assert.IsTrue(File.Exists(metadataPath), metadataPath);
            Assert.AreEqual("unity://screenshots/" + result.artifactId, result.uri);
            Assert.Greater(result.width, 0);
            Assert.Greater(result.height, 0);
        }

        private static UnityAgentKitHostRecord TestHostRecord()
        {
            return new UnityAgentKitHostRecord
            {
                hostName = "Unity Agent Kit",
                protocolVersion = "2026-05-19",
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "host-shot",
                hostEpoch = 11,
                port = 49155,
                status = "ready",
                startedAt = "2026-05-29T10:00:00.0000000Z",
                lastProbeAt = "2026-05-29T10:00:01.0000000Z"
            };
        }

        private static string TemporaryArtifactRoot(string testName)
        {
            var directory = Path.Combine(Path.GetTempPath(), "UnityAgentKitScreenshotTests", testName, Guid.NewGuid().ToString("N"), "artifacts");
            Directory.CreateDirectory(directory);
            return directory;
        }

        private static void WriteFixturePng(string absolutePath)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(absolutePath));
            using (var stream = File.Create(absolutePath))
            {
                var bytes = RecordingScreenshotAdapter.FixturePngBytesValue;
                stream.Write(bytes, 0, bytes.Length);
            }
        }

        private sealed class RecordingScreenshotAdapter : UnityAgentKitScreenshotDiagnostics.IScreenshotCaptureAdapter
        {
            private readonly int width;
            private readonly int height;
            private readonly bool writesPayload;
            private readonly bool usesForbiddenPath;

            public RecordingScreenshotAdapter(int width, int height, bool writesPayload, bool usesForbiddenPath = false)
            {
                this.width = width;
                this.height = height;
                this.writesPayload = writesPayload;
                this.usesForbiddenPath = usesForbiddenPath;
            }

            public bool UsedForbiddenPath { get; private set; }
            public int TryGetGameViewSizeCallCount { get; private set; }
            public int FocusAndRepaintGameViewCallCount { get; private set; }
            public int CaptureGameViewPngCallCount { get; private set; }
            public string CapturedAbsolutePath { get; private set; }
            public byte[] FixturePngBytes => FixturePngBytesValue;
            public static byte[] FixturePngBytesValue => new byte[]
            {
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D,
                0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x01,
                0x00, 0x00, 0x00, 0x01,
                0x08, 0x06, 0x00, 0x00, 0x00,
                0x1F, 0x15, 0xC4, 0x89,
                0x00, 0x00, 0x00, 0x0A,
                0x49, 0x44, 0x41, 0x54,
                0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
                0x0D, 0x0A, 0x2D, 0xB4,
                0x00, 0x00, 0x00, 0x00,
                0x49, 0x45, 0x4E, 0x44,
                0xAE, 0x42, 0x60, 0x82
            };

            public UnityAgentKitScreenshotCaptureMethodFeasibility Feasibility => new UnityAgentKitScreenshotCaptureMethodFeasibility
            {
                supported = true,
                methodId = "screen_capture_capture_screenshot",
                view = "current_game_view",
                usesReadScreenPixel = usesForbiddenPath,
                usesEncodeToPng = false,
                usesPayloadFileWriteAllBytes = false,
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };

            public bool TryGetGameViewSize(out int gameViewWidth, out int gameViewHeight, out UnityAgentKitDiagnostic diagnostic)
            {
                TryGetGameViewSizeCallCount++;
                gameViewWidth = width;
                gameViewHeight = height;
                diagnostic = null;
                return width > 0 && height > 0;
            }

            public void FocusAndRepaintGameView()
            {
                FocusAndRepaintGameViewCallCount++;
            }

            public void CaptureGameViewPng(string absolutePath)
            {
                CaptureGameViewPngCallCount++;
                CapturedAbsolutePath = absolutePath;
                if (!writesPayload)
                {
                    return;
                }

                Directory.CreateDirectory(Path.GetDirectoryName(absolutePath));
                using (var stream = File.Create(absolutePath))
                {
                    var bytes = FixturePngBytes;
                    stream.Write(bytes, 0, bytes.Length);
                }
            }
        }
    }
}
