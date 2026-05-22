using System;
using System.Collections;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;
using NUnit.Framework;
using UnityEngine.TestTools;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class HostRuntimeVerticalSmokeTests
    {
        [UnityTest]
        public IEnumerator Phase5AVerticalSmokeDrivesLiveNodeProbeAndThreadCheck()
        {
            var registryPath = UnityAgentKitHostRegistry.GetRegistryPath();
            var debugDirectory = ResolveDebugDirectory();
            var backupPath = Path.Combine(debugDirectory, "host.json.backup");
            var markerPath = Path.Combine(debugDirectory, "canonical-registry-existed.marker");
            var registryExistedBeforeTest = File.Exists(registryPath);
            UnityAgentKitHostRecord record = null;

            Directory.CreateDirectory(debugDirectory);
            if (registryExistedBeforeTest)
            {
                File.Copy(registryPath, backupPath, true);
                File.WriteAllText(markerPath, "true");
            }
            else
            {
                if (File.Exists(backupPath))
                {
                    File.Delete(backupPath);
                }

                File.WriteAllText(markerPath, "false");
            }

            try
            {
                record = UnityAgentKitHost.StartForTests(registryPath);
                Assert.AreEqual(NormalizePath(registryPath), NormalizePath(UnityAgentKitHostRegistry.GetRegistryPath()));
                Assert.IsTrue(File.Exists(registryPath), "Expected Unity host to write canonical project registry.");
                var node = StartNodeSmoke(registryPath, debugDirectory);

                while (!node.IsDone && !node.HasTimedOut)
                {
                    UnityAgentKitMainThread.DrainForTests();
                    yield return null;
                }

                UnityAgentKitMainThread.DrainForTests();
                node.Finish(debugDirectory);

                Assert.AreEqual(0, node.ExitCode, node.FormatFailure());
                Assert.That(node.StdoutText, Does.Contain("tests 1"));
                Assert.That(node.StdoutText, Does.Contain("pass 1"));
                Assert.That(node.StdoutText, Does.Contain("fail 0"));

                UnityAgentKitHost.StopForTests("host.stopped");
                Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000), "Expected vertical smoke host cleanup to close listener.");
                Assert.IsFalse(UnityAgentKitLoopbackHttpServer.IsRunning);
                AssertProbeUnavailable(UnityAgentKitLoopbackHttpServer.BuildProbeUrl(record.port));
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
                RestoreCanonicalRegistry(registryPath, backupPath, registryExistedBeforeTest);
            }
        }

        private static NodeSmokeProcess StartNodeSmoke(string registryPath, string debugDirectory)
        {
            var pluginRoot = ResolvePluginRoot();
            var testPath = Path.Combine(pluginRoot, "tests", "phase5a-vertical-smoke.test.ts");
            Assert.IsTrue(File.Exists(testPath), "Expected Phase 5A vertical smoke TS test at " + testPath);

            var startInfo = new ProcessStartInfo
            {
                FileName = ResolveNodeExecutable(),
                Arguments = "--experimental-strip-types --test tests/phase5a-vertical-smoke.test.ts",
                WorkingDirectory = pluginRoot,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };
            startInfo.Environment["UNITY_AGENT_KIT_PROJECT_ROOT"] = UnityAgentKitHostRegistry.GetProjectRoot();
            startInfo.Environment["UNITY_AGENT_KIT_REGISTRY_PATH"] = registryPath;
            startInfo.Environment["UNITY_AGENT_KIT_REQUEST_TIMEOUT_MS"] = "3000";
            startInfo.Environment["UNITY_AGENT_KIT_DEBUG_DIRECTORY"] = debugDirectory;

            return NodeSmokeProcess.Start(startInfo, TimeSpan.FromSeconds(15));
        }

        private static string ResolveNodeExecutable()
        {
            var configured = Environment.GetEnvironmentVariable("UNITY_AGENT_KIT_NODE_PATH");
            return string.IsNullOrEmpty(configured) ? "node" : configured;
        }

        private static string ResolvePluginRoot()
        {
            var unityProjectRoot = UnityAgentKitHostRegistry.GetProjectRoot();
            var repositoryRoot = Directory.GetParent(unityProjectRoot)?.FullName;
            Assert.IsFalse(string.IsNullOrEmpty(repositoryRoot), "Expected Unity project root to have a repository parent.");
            var pluginRoot = Path.Combine(repositoryRoot, "plugins", "unity-agent-kit");
            Assert.IsTrue(Directory.Exists(pluginRoot), "Expected unity-agent-kit plugin root at " + pluginRoot);
            return pluginRoot;
        }

        private static string ResolveDebugDirectory()
        {
            var unityProjectRoot = UnityAgentKitHostRegistry.GetProjectRoot();
            var repositoryRoot = Directory.GetParent(unityProjectRoot)?.FullName;
            Assert.IsFalse(string.IsNullOrEmpty(repositoryRoot), "Expected Unity project root to have a repository parent.");
            return Path.Combine(repositoryRoot, ".ai-debug", "unity-agent-kit", "phase5a-vertical-smoke");
        }

        private static void RestoreCanonicalRegistry(string registryPath, string backupPath, bool registryExistedBeforeTest)
        {
            if (registryExistedBeforeTest)
            {
                File.Copy(backupPath, registryPath, true);
                return;
            }

            if (File.Exists(registryPath))
            {
                File.Delete(registryPath);
            }
        }

        private static void AssertProbeUnavailable(string url)
        {
            var request = (HttpWebRequest)WebRequest.Create(url);
            request.Method = "GET";
            request.Timeout = 250;
            request.ReadWriteTimeout = 250;

            Assert.Throws<WebException>(() =>
            {
                using (request.GetResponse())
                {
                }
            });
        }

        private static string NormalizePath(string path)
        {
            return Path.GetFullPath(path).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        }

        private sealed class NodeSmokeProcess
        {
            private readonly Process process;
            private readonly StringBuilder stdout;
            private readonly StringBuilder stderr;
            private readonly object outputLock;
            private readonly DateTimeOffset deadline;

            private NodeSmokeProcess(Process process, StringBuilder stdout, StringBuilder stderr, object outputLock, DateTimeOffset deadline)
            {
                this.process = process;
                this.stdout = stdout;
                this.stderr = stderr;
                this.outputLock = outputLock;
                this.deadline = deadline;
            }

            internal bool IsDone => process.HasExited;
            internal bool HasTimedOut => DateTimeOffset.UtcNow >= deadline;
            internal int ExitCode => process.ExitCode;
            internal string StdoutText
            {
                get
                {
                    lock (outputLock)
                    {
                        return stdout.ToString();
                    }
                }
            }

            internal static NodeSmokeProcess Start(ProcessStartInfo startInfo, TimeSpan timeout)
            {
                var stdout = new StringBuilder();
                var stderr = new StringBuilder();
                var outputLock = new object();
                var process = new Process
                {
                    StartInfo = startInfo,
                    EnableRaisingEvents = true
                };

                process.OutputDataReceived += (_, args) => AppendLine(stdout, outputLock, args.Data);
                process.ErrorDataReceived += (_, args) => AppendLine(stderr, outputLock, args.Data);

                Assert.IsTrue(process.Start(), "Expected Node vertical smoke process to start.");
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();

                return new NodeSmokeProcess(process, stdout, stderr, outputLock, DateTimeOffset.UtcNow.Add(timeout));
            }

            internal void Finish(string debugDirectory)
            {
                if (!process.HasExited)
                {
                    try
                    {
                        process.Kill();
                    }
                    catch (InvalidOperationException)
                    {
                    }

                    WriteOutput(debugDirectory);
                    Assert.Fail("Node vertical smoke timed out.\n" + FormatFailure());
                }

                process.WaitForExit(1000);
                WriteOutput(debugDirectory);
            }

            internal string FormatFailure()
            {
                lock (outputLock)
                {
                    return "Node vertical smoke failed." + Environment.NewLine +
                        "stdout:" + Environment.NewLine + stdout + Environment.NewLine +
                        "stderr:" + Environment.NewLine + stderr;
                }
            }

            private void WriteOutput(string debugDirectory)
            {
                Directory.CreateDirectory(debugDirectory);
                lock (outputLock)
                {
                    File.WriteAllText(Path.Combine(debugDirectory, "node.stdout.log"), stdout.ToString());
                    File.WriteAllText(Path.Combine(debugDirectory, "node.stderr.log"), stderr.ToString());
                }
            }

            private static void AppendLine(StringBuilder builder, object syncRoot, string line)
            {
                if (line == null)
                {
                    return;
                }

                lock (syncRoot)
                {
                    builder.AppendLine(line);
                }
            }
        }
    }
}
