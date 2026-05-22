using System;
using System.IO;
using NUnit.Framework;
using UnityEngine;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class HostRuntimeArtifactTests
    {
        [Test]
        public void ArtifactRootUsesProjectAiDebugUnityAgentKitArtifactsDirectory()
        {
            var expected = Path.Combine(UnityAgentKitHostRegistry.GetProjectRoot(), ".ai-debug", "unity-agent-kit", "artifacts");

            var actual = UnityAgentKitArtifactContracts.GetArtifactRoot();

            Assert.AreEqual(NormalizePath(expected), NormalizePath(actual));
        }

        [Test]
        public void SyntheticScreenshotArtifactWritesPayloadAndDeterministicMetadata()
        {
            var artifactRoot = TemporaryArtifactRoot("screenshot");
            var record = TestHostRecord();

            var metadata = UnityAgentKitArtifactContracts.WriteSyntheticArtifact(
                artifactRoot,
                "shot-1",
                "screenshot",
                "screenshots/shot-1.txt",
                "synthetic image",
                record,
                "capture_game_view");

            var payloadPath = Path.Combine(artifactRoot, "screenshots", "shot-1.txt");
            var metadataPath = Path.Combine(artifactRoot, "metadata", "screenshots", "shot-1.json");
            var roundTrip = JsonUtility.FromJson<UnityAgentKitArtifactMetadataRecord>(File.ReadAllText(metadataPath));

            Assert.IsTrue(File.Exists(payloadPath));
            Assert.AreEqual("synthetic image", File.ReadAllText(payloadPath));
            Assert.AreEqual(1, metadata.schemaVersion);
            Assert.AreEqual("shot-1", metadata.id);
            Assert.AreEqual("screenshot", metadata.type);
            Assert.AreEqual("unity://screenshots/shot-1", metadata.uri);
            Assert.AreEqual("screenshots/shot-1.txt", metadata.relativePath);
            Assert.AreEqual("valid", metadata.validationStatus);
            Assert.AreEqual("host-a", metadata.hostId);
            Assert.AreEqual(3, metadata.hostEpoch);
            Assert.AreEqual("unity_screenshot", metadata.producerTool);
            Assert.AreEqual("capture_game_view", metadata.producerAction);
            Assert.Greater(metadata.sizeBytes, 0);
            Assert.AreEqual(0, metadata.diagnostics.Length);
            Assert.AreEqual("shot-1", roundTrip.id);
            Assert.AreEqual("unity://screenshots/shot-1", roundTrip.uri);
        }

        [Test]
        public void SyntheticTestReportUsesReportLocatorUnderTestReports()
        {
            var artifactRoot = TemporaryArtifactRoot("report");
            var record = TestHostRecord();

            var metadata = UnityAgentKitArtifactContracts.WriteSyntheticReport(
                artifactRoot,
                "report-1",
                "test-reports/report-1.txt",
                "synthetic report",
                record,
                "run_and_collect");

            var metadataPath = Path.Combine(artifactRoot, "metadata", "test-reports", "report-1.json");
            var roundTrip = JsonUtility.FromJson<UnityAgentKitArtifactMetadataRecord>(File.ReadAllText(metadataPath));

            Assert.AreEqual("report-1", metadata.id);
            Assert.AreEqual("test_report", metadata.type);
            Assert.AreEqual("unity://test-reports/report-1", metadata.uri);
            Assert.AreEqual(string.Empty, metadata.relativePath);
            Assert.NotNull(metadata.reportLocator);
            Assert.AreEqual("artifact_relative_path", metadata.reportLocator.kind);
            Assert.AreEqual("test-reports/report-1.txt", metadata.reportLocator.relativePath);
            Assert.AreEqual("artifact_relative_path", roundTrip.reportLocator.kind);
            Assert.AreEqual("test-reports/report-1.txt", roundTrip.reportLocator.relativePath);
        }

        [Test]
        public void UnsafeRelativePathIsRejectedBeforeWritingPayload()
        {
            var artifactRoot = TemporaryArtifactRoot("unsafe");
            var record = TestHostRecord();

            Assert.Throws<InvalidOperationException>(() => UnityAgentKitArtifactContracts.WriteSyntheticArtifact(
                artifactRoot,
                "shot-unsafe",
                "screenshot",
                "../outside.txt",
                "payload",
                record,
                "capture_game_view"));

            Assert.Throws<InvalidOperationException>(() => UnityAgentKitArtifactContracts.WriteSyntheticArtifact(
                artifactRoot,
                "shot-drive",
                "screenshot",
                "C:/outside.txt",
                "payload",
                record,
                "capture_game_view"));

            Assert.Throws<InvalidOperationException>(() => UnityAgentKitArtifactContracts.WriteSyntheticArtifact(
                artifactRoot,
                "shot-encoded",
                "screenshot",
                "screenshots/%2e%2e/outside.txt",
                "payload",
                record,
                "capture_game_view"));
        }

        private static UnityAgentKitHostRecord TestHostRecord()
        {
            return new UnityAgentKitHostRecord
            {
                hostName = "Unity Agent Kit",
                protocolVersion = "2026-05-19",
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "host-a",
                hostEpoch = 3,
                port = 49152,
                status = "ready",
                startedAt = "2026-05-22T10:00:00.0000000Z",
                lastProbeAt = "2026-05-22T10:00:01.0000000Z"
            };
        }

        private static string TemporaryArtifactRoot(string testName)
        {
            var directory = Path.Combine(Path.GetTempPath(), "UnityAgentKitArtifactTests", testName, Guid.NewGuid().ToString("N"), "artifacts");
            Directory.CreateDirectory(directory);
            return directory;
        }

        private static string NormalizePath(string path)
        {
            return Path.GetFullPath(path).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        }
    }
}
