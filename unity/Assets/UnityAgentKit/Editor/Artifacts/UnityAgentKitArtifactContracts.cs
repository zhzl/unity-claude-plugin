using System;
using System.IO;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitArtifactContracts
    {
        internal static string GetArtifactRoot()
        {
            return Path.Combine(UnityAgentKitHostRegistry.GetProjectRoot(), ".ai-debug", "unity-agent-kit", "artifacts");
        }

        internal static UnityAgentKitArtifactMetadataRecord WriteSyntheticArtifact(
            string artifactRoot,
            string id,
            string type,
            string relativePath,
            string payload,
            UnityAgentKitHostRecord hostRecord,
            string producerAction)
        {
            if (type != "screenshot" && type != "console_snapshot")
            {
                throw new InvalidOperationException("Synthetic artifact type must be screenshot or console_snapshot.");
            }

            var expectedPrefix = type == "screenshot" ? "screenshots/" : "console-snapshots/";
            if (!relativePath.StartsWith(expectedPrefix, StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Synthetic artifact relative path does not match artifact type.");
            }

            var payloadPath = ResolveArtifactPath(artifactRoot, relativePath);
            Directory.CreateDirectory(Path.GetDirectoryName(payloadPath));
            File.WriteAllText(payloadPath, payload ?? string.Empty);

            var metadata = CreateBaseMetadata(id, type, hostRecord, type == "screenshot" ? "unity_screenshot" : "unity_console", producerAction, new FileInfo(payloadPath).Length);
            metadata.uri = type == "screenshot" ? "unity://screenshots/" + id : "unity://console-snapshots/" + id;
            metadata.relativePath = relativePath;
            WriteMetadata(artifactRoot, metadata);
            return metadata;
        }

        internal static UnityAgentKitArtifactMetadataRecord WriteSyntheticReport(
            string artifactRoot,
            string reportId,
            string relativePath,
            string payload,
            UnityAgentKitHostRecord hostRecord,
            string producerAction)
        {
            if (!relativePath.StartsWith("test-reports/", StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Synthetic report relative path must be under test-reports/.");
            }

            var payloadPath = ResolveArtifactPath(artifactRoot, relativePath);
            Directory.CreateDirectory(Path.GetDirectoryName(payloadPath));
            File.WriteAllText(payloadPath, payload ?? string.Empty);

            var metadata = CreateBaseMetadata(reportId, "test_report", hostRecord, "unity_test", producerAction, new FileInfo(payloadPath).Length);
            metadata.uri = "unity://test-reports/" + reportId;
            metadata.relativePath = string.Empty;
            metadata.reportLocator = new UnityAgentKitReportLocatorRecord
            {
                kind = "artifact_relative_path",
                relativePath = relativePath
            };
            WriteMetadata(artifactRoot, metadata);
            return metadata;
        }

        internal static bool IsSafeRelativePath(string relativePath)
        {
            if (string.IsNullOrEmpty(relativePath) || relativePath.Contains("\\") || relativePath.Contains("\0"))
            {
                return false;
            }

            string decoded;
            try
            {
                decoded = Uri.UnescapeDataString(relativePath);
            }
            catch (UriFormatException)
            {
                return false;
            }

            return IsSafePathSegments(relativePath) && IsSafePathSegments(decoded);
        }

        private static string ResolveArtifactPath(string artifactRoot, string relativePath)
        {
            if (!IsSafeRelativePath(relativePath))
            {
                throw new InvalidOperationException("Artifact relative path is unsafe.");
            }

            var root = Path.GetFullPath(artifactRoot);
            var target = Path.GetFullPath(Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar)));
            var rootPrefix = root.EndsWith(Path.DirectorySeparatorChar.ToString(), StringComparison.Ordinal) ? root : root + Path.DirectorySeparatorChar;

            if (target != root && !target.StartsWith(rootPrefix, StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Artifact path escapes the artifact root.");
            }

            return target;
        }

        private static bool IsSafePathSegments(string value)
        {
            if (value.StartsWith("/", StringComparison.Ordinal) || value.Contains("\\") || HasWindowsDrivePrefix(value))
            {
                return false;
            }

            var parts = value.Split('/');
            foreach (var part in parts)
            {
                if (string.IsNullOrEmpty(part) || part == "." || part == "..")
                {
                    return false;
                }
            }

            return true;
        }

        private static bool HasWindowsDrivePrefix(string value)
        {
            return value.Length >= 2 && char.IsLetter(value[0]) && value[1] == ':';
        }

        private static UnityAgentKitArtifactMetadataRecord CreateBaseMetadata(
            string id,
            string type,
            UnityAgentKitHostRecord hostRecord,
            string producerTool,
            string producerAction,
            long sizeBytes)
        {
            return new UnityAgentKitArtifactMetadataRecord
            {
                schemaVersion = 1,
                id = id ?? string.Empty,
                type = type ?? string.Empty,
                createdAt = DateTimeOffset.UtcNow.ToString("O"),
                validationStatus = sizeBytes > 0 ? "valid" : "invalid",
                hostId = hostRecord != null ? hostRecord.hostId : string.Empty,
                hostEpoch = hostRecord != null ? hostRecord.hostEpoch : 0,
                producerTool = producerTool ?? string.Empty,
                producerAction = producerAction ?? string.Empty,
                producerJobId = string.Empty,
                sizeBytes = sizeBytes,
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };
        }

        private static void WriteMetadata(string artifactRoot, UnityAgentKitArtifactMetadataRecord metadata)
        {
            var relativeMetadataPath = MetadataRelativePath(metadata);
            var metadataPath = ResolveArtifactPath(artifactRoot, relativeMetadataPath);
            Directory.CreateDirectory(Path.GetDirectoryName(metadataPath));
            File.WriteAllText(metadataPath, JsonUtility.ToJson(metadata, true) + Environment.NewLine);
        }

        private static string MetadataRelativePath(UnityAgentKitArtifactMetadataRecord metadata)
        {
            if (metadata.type == "screenshot")
            {
                return "metadata/screenshots/" + metadata.id + ".json";
            }

            if (metadata.type == "test_report")
            {
                return "metadata/test-reports/" + metadata.id + ".json";
            }

            if (metadata.type == "console_snapshot")
            {
                return "metadata/console-snapshots/" + metadata.id + ".json";
            }

            throw new InvalidOperationException("Unsupported artifact metadata type.");
        }
    }

    [Serializable]
    internal sealed class UnityAgentKitReportLocatorRecord
    {
        public string kind = string.Empty;
        public string relativePath = string.Empty;
    }

    [Serializable]
    internal sealed class UnityAgentKitArtifactMetadataRecord
    {
        public int schemaVersion;
        public string id = string.Empty;
        public string type = string.Empty;
        public string uri = string.Empty;
        public string relativePath = string.Empty;
        public UnityAgentKitReportLocatorRecord reportLocator = null;
        public string createdAt = string.Empty;
        public string validationStatus = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string producerTool = string.Empty;
        public string producerAction = string.Empty;
        public string producerJobId = string.Empty;
        public long sizeBytes;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }
}
