using System;
using System.IO;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    public static class UnityAgentKitHostRegistry
    {
        public const string HostName = "Unity Agent Kit";
        public const string ProtocolVersion = "2026-05-19";
        public const string ReadyStatus = "ready";

        public static string GetProjectRoot()
        {
            var assetsPath = Application.dataPath;
            var projectDirectory = Directory.GetParent(assetsPath);
            return Path.GetFullPath(projectDirectory?.FullName ?? assetsPath);
        }

        public static string GetRegistryPath()
        {
            return Path.Combine(GetProjectRoot(), "Library", "UnityAgentKit", "host.json");
        }

        public static UnityAgentKitHostRecord CreateRecord(int port, int previousEpoch, DateTimeOffset? now = null)
        {
            var timestamp = (now ?? DateTimeOffset.UtcNow).UtcDateTime.ToString("O");
            return new UnityAgentKitHostRecord
            {
                hostName = HostName,
                protocolVersion = ProtocolVersion,
                projectRoot = GetProjectRoot(),
                hostId = Guid.NewGuid().ToString("N"),
                hostEpoch = previousEpoch + 1,
                port = port,
                status = ReadyStatus,
                startedAt = timestamp,
                lastProbeAt = string.Empty
            };
        }

        public static int ReadExistingEpoch(string registryPath = null)
        {
            var record = ReadRecord(registryPath);
            return record?.hostEpoch ?? 0;
        }

        public static bool HasSameContinuityIdentity(UnityAgentKitHostRecord first, UnityAgentKitHostRecord second)
        {
            if (first == null || second == null || string.IsNullOrEmpty(first.hostId) || string.IsNullOrEmpty(second.hostId))
            {
                return false;
            }

            return first.hostId == second.hostId && first.hostEpoch == second.hostEpoch;
        }

        public static void WriteRecord(UnityAgentKitHostRecord record, string registryPath = null)
        {
            var targetPath = registryPath ?? GetRegistryPath();
            var directory = Path.GetDirectoryName(targetPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var tempPath = targetPath + ".tmp";
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }

            File.WriteAllText(tempPath, JsonUtility.ToJson(record, true) + Environment.NewLine);

            if (File.Exists(targetPath))
            {
                ReplaceExisting(tempPath, targetPath);
            }
            else
            {
                File.Move(tempPath, targetPath);
            }
        }

        public static UnityAgentKitHostRecord ReadRecord(string registryPath = null)
        {
            var targetPath = registryPath ?? GetRegistryPath();
            if (!File.Exists(targetPath))
            {
                return null;
            }

            return JsonUtility.FromJson<UnityAgentKitHostRecord>(File.ReadAllText(targetPath));
        }

        private static void ReplaceExisting(string tempPath, string targetPath)
        {
            try
            {
                File.Replace(tempPath, targetPath, null);
            }
            catch (PlatformNotSupportedException)
            {
                File.Delete(targetPath);
                File.Move(tempPath, targetPath);
            }
            catch (IOException)
            {
                File.Delete(targetPath);
                File.Move(tempPath, targetPath);
            }
        }
    }
}
