# Unity Agent Kit Phase 5A-08 Vertical Smoke + Completion Evidence 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为 Phase 5A Host Runtime 交付 live vertical smoke、最终 TS/Unity evidence 和 Phase 5A completion evidence，同步证明 5A-EVIDENCE-01 至 5A-EVIDENCE-04。

**架构：** 新增一个 TS live smoke test，由 Unity EditMode `HostRuntimeVerticalSmokeTests` 启动真实 loopback host 后以 Node 子进程执行。现有 `host-runtime.test.ts` 继续承载 non-live evidence，并把 5A-07 的“vertical smoke 文件不得存在”scope guard 转换为 5A-08 的“只允许 vertical smoke evidence 文件，不允许 MCP public tools 或 `/unity` skill 越界”scope guard。completion evidence 只写入 Phase 5A execution index、Phase 5 plan index 和 roadmap 状态文本，不把 Phase 5 标记 completed。

**技术栈：** TypeScript ESM、Node.js built-in test runner、Unity 2022.3.61f1 Editor C# EditMode tests、loopback HTTP、JSON DTO、NUnit、UnityTest coroutine、`System.Diagnostics.Process`。
**拆分检查：** 已检查；无需拆分。5A-08 只有一个独立交付单元：live vertical smoke + completion evidence；它不引入新的 runtime 子系统，docs sync 是同一 completion gate 的证据记录。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Contract:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
**Execution Index:** `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
**Plan Card:** 5A-08 — Vertical smoke + completion evidence

---

## 执行权限说明

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行这些 Commit 步骤；若未授权，跳过 Commit 步骤，并在最终汇报中列出未提交的修改文件。

## 文件结构

- 创建：`plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts` — Node-side live smoke；读取 Unity 写入的 canonical registry，真实 `GET /probe`，真实 `POST /operations` 调用 `host.threadCheck`，映射 public result 和 MCP payload。
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs` — Unity EditMode harness；使用 `UnityAgentKitHostRegistry.GetRegistryPath()` 对应的 project-scoped `unity/Library/UnityAgentKit/host.json` 启动真实 host，启动 Node 子进程，保持 host alive 并 drain main-thread dispatch，Node 退出后停止 host 并验证 cleanup。
- 创建/使用：`.ai-debug/unity-agent-kit/phase5a-vertical-smoke/` — vertical smoke 辅助目录；仅用于 canonical registry backup/restore marker、Node stdout/stderr 或调试辅助文件，不替代 canonical registry evidence。
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts` — 将 5A-07 scope guard 更新为 5A-08 scope guard：允许 vertical smoke evidence 文件存在，继续禁止 MCP public tools、public action wiring 和 `/unity` skill。
- 修改：`docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` — 5A-08 完成后记录 expanded plan 路径、completed 状态和三条 completion evidence 命令。
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` — 5A subplan 完成后记录 Phase 5A completed；保持 5B-5E pending，Phase 5 不 completed。
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — 记录 Phase 5A completion evidence；保持 Roadmap Phase 5 status 非 completed，并把 next manual action 指向 Phase 5B。
- 不创建：`plugins/unity-agent-kit/skills/unity.md`。
- 不创建：`plugins/unity-agent-kit/src/tools/`、MCP public tool registration、public action dispatch wiring、workflow timeout/resource/artifact/final daily loop E2E 文件。

## 上游约束摘要

- **Roadmap Shared Constraints:** 保留 `unity-mcp-v2` 的 host runtime、loopback HTTP、registry/probe、operation envelope、host rebirth/rebind 和稳定错误语义；TS 负责 registry/probe/invoke/rebind、timeout 分类和 public result 收敛；Unity C# 只负责短主线程动作、DTO JSON、registry 写入和 loopback routing；禁止 Unity 主线程长阻塞、HTTP handler 忙等或把 workflow 编排移入 C# host。
- **Phase Scope:** Phase 5A 只覆盖 Host Runtime foundation：TS result/MCP mapping foundation、Unity DTO/registry、`/probe`、`/operations`、main-thread dispatch、host-level timeout、TS host client rebind/classification 和最小 live vertical smoke path。
- **Phase Out-of-scope:** 不实现 Phase 5B-5E；不实现 public MCP tools；不创建 `/unity` skill；不实现 workflow timeout、artifact/resource store、compile/console/test/playmode/screenshot workflows 或 final daily loop E2E。
- **Success Criteria:** `tests/host-runtime.test.ts` 作为 non-live evidence 通过；`HostRuntimeTests` 作为 Unity host runtime evidence 通过；`HostRuntimeVerticalSmokeTests` 驱动 live Node smoke 并通过；Phase 5A execution index 和 Phase 5 plan index 记录 completion evidence；roadmap Phase 5 保持 incomplete。
- **用户确认事项:** 5A-01 至 5A-07 已完成；5A-07 证据为 `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts`，`tests 60 / pass 60 / fail 0`；5A-08 是 Phase 5A 剩余 pending work；Phase 5A 只有在 5A-08 final vertical smoke 和 evidence 全部通过后才能标记 completed；Roadmap Phase 5 仍不能标记 completed；插件生成的临时配置和调试辅助文件统一放在仓库根目录 `.ai-debug/unity-agent-kit/` 并按功能分目录。
- **本计划不包含:** 不扩大 operation catalog；不写 public tool schema；不新增 MCP server exports；不写 skill recipe；不实现 resources/artifacts；不实现 workflow polling；不改 Phase 5B-5E 状态；不运行实现命令。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` | Phase 5A 当前状态、Shared Constraints、Phase 5 仍 incomplete、v2 baseline、TS/Unity 分层、禁止 Unity 长阻塞 | Phase 5B-5E public tools/workflows/resources/skill 范围 | 5A-08 只完成 Host Runtime evidence，不满足 Phase 5 整体 success criteria | 任务 1-3 |
| `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` | 5A-08 requirement IDs、depends_on、Completion Rule、5A completed 条件 | 把 execution index 当 executable plan | index 只记录状态和证据，不执行实现 | 任务 2 |
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | `phase5a-vertical-smoke.test.ts` + `HostRuntimeVerticalSmokeTests` 固定载体、canonical project registry path、live host 编排、5A-EVIDENCE-01 至 04、completion evidence 命令 | Contract Area 1-5 的已完成实现步骤 | 5A-01 至 5A-07 已完成；5A-08 只补最终 evidence gate | 任务 1-3 |
| `plugins/unity-agent-kit/tests/host-runtime.test.ts` | 复用现有 `readHostRegistry`、`probeActiveHost`、`invokeOperationOnce`、`mapPublicResultToMcpToolResult` coverage；保留 non-live evidence 命令 | 5A-07 vertical smoke absence guard | 5A-08 正式创建 vertical smoke 文件，旧 absence guard 会变成错误约束 | 任务 1 |
| `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs` 和 `HostRuntimeDispatchTests.cs` | 复用 `StartForTests`、`StopForTests`、`DrainForTests`、real HTTP `/operations`、cleanup evidence 的测试风格和 helper 约束 | 把 Node smoke 塞入 `HostRuntimeTests` partial class | 5A-EVIDENCE-03 要求独立 `HostRuntimeVerticalSmokeTests` 驱动 live Node smoke | 任务 1、3 |
| `references/unity-mcp-v2` | loopback HTTP、registry/probe、host rebirth/rebind、Unity/TS 双侧测试策略 | v2 legacy public tools、nested compatibility envelope、`host.probe` as canonical probe、string contains 作为主协议断言 | Unity Agent Kit 使用 `GET /probe`、top-level `UnityAgentKitOperationResponse`、new public result foundation 和 DTO JSON 逐字段断言 | 任务 1 |
| `references/Unity-Skills` | Unity 操作领域经验作为 roadmap 背景 | skill 文件、JSON 文件队列、actual slash command 结构 | 5A-08 不创建 skill 或 workflow recipe | scope guard |

## 验证强度与 scope guards

| Gate | 最低信心分 | 达标条件 | 未达标处理 |
|---|---:|---|---|
| Non-live TS evidence | 9/10 | `host-runtime.test.ts` 继续通过 `tests 60 / pass 60 / fail 0`，覆盖 result mapping、registry validation、TS client simulations、timeout classification、MCP payload preservation | 只修 TS foundation 或 scope guard；不得删减既有 5A-07 tests |
| Unity HostRuntimeTests evidence | 9/10 | `HostRuntimeTests` filter 继续通过 `total 78 / passed 78 / failed 0`，覆盖 DTO、registry、lifecycle、HTTP protocol、dispatch/timeout、result envelope | 只修 host runtime foundation；不得绕开 shutdown/main-thread tests |
| Live vertical smoke | 9/10 | Unity 使用 canonical project registry path 启动真实 host，Node 读取 `unity/Library/UnityAgentKit/host.json`、probe `/probe`、invoke real `/operations` `host.threadCheck`，Unity drain captured main thread，Node 映射 public result 和 MCP payload，Unity cleanup 后旧 listener 不响应；backup/restore 辅助文件只落在 `.ai-debug/unity-agent-kit/phase5a-vertical-smoke/` | 只修 smoke harness 或 host runtime foundation；不得改成 fake server、memory stub、temporary registry override 或 standalone skip 作为 evidence |
| Scope guard | 10/10 | 只新增 `phase5a-vertical-smoke.test.ts` 和 `HostRuntimeVerticalSmokeTests.cs`；继续禁止 MCP public tools、`/unity` skill、workflow/resource/artifact/final E2E | 删除越界文件或代码后重跑全部 evidence |
| Documentation evidence | 9/10 | execution index、Phase 5 plan index、roadmap 都记录三条命令、关键测试名和 Phase 5 incomplete 边界 | 不更新状态；先补齐 evidence 文本 |

## 任务 1：实现 live vertical smoke 和 scope guard 转换

**文件：**
- 创建：`plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs`
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts`

- [ ] **步骤 1：编写 Node-side live smoke test**

创建 `plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts`：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { definePublicResult, type UnityAgentKitPublicResult } from "../src/contracts/result.ts";
import { mapPublicResultToMcpToolResult } from "../src/contracts/mcp-result.ts";
import { readHostRegistry } from "../src/host/registry.ts";
import { probeActiveHost, invokeOperationOnce } from "../src/host/http-client.ts";
import { createNodeHostTransport } from "../src/host/transport.ts";

test("phase5aVerticalSmokeProbesAndInvokesLiveUnityHost", async () => {
  const projectRoot = requiredEnv("UNITY_AGENT_KIT_PROJECT_ROOT");
  const registryPath = requiredEnv("UNITY_AGENT_KIT_REGISTRY_PATH");
  const transport = createNodeHostTransport({ timeoutMs: readTimeoutMs() });

  const registry = await readHostRegistry(registryPath, { projectRoot });
  assert.equal(registry.ok, true, formatValue(registry));
  if (!registry.ok) {
    return;
  }

  const probe = await probeActiveHost(registry.record, transport);
  assert.equal(probe.ok, true, formatValue(probe));
  if (!probe.ok) {
    return;
  }

  assert.equal(probe.record.hostId, registry.record.hostId);
  assert.equal(probe.record.hostEpoch, registry.record.hostEpoch);
  assert.equal(probe.probe.projectRoot, projectRoot);
  assert.equal(probe.probe.port, registry.record.port);
  assert.equal(probe.probe.status, "ready");

  const result = await invokeOperationOnce(registry.record, transport, {
    operation: "host.threadCheck",
    requestId: "phase5a-vertical-smoke-thread-check",
  });

  assert.equal(result.status, "succeeded", formatValue(result));
  assert.equal(result.operation, "host.threadCheck");
  assert.equal(result.requestId, "phase5a-vertical-smoke-thread-check");
  assert.equal(result.hostId, registry.record.hostId);
  assert.equal(result.hostEpoch, registry.record.hostEpoch);
  assert.equal(typeof result.summary, "string");
  assert.ok(result.summary.length > 0);
  assert.ok(Array.isArray(result.diagnostics));
  assert.equal(result.diagnostics.length, 0);
  assert.equal(typeof result.startedAt, "string");
  assert.equal(typeof result.completedAt, "string");
  assert.equal(typeof result.durationMs, "number");

  const threadCheck = parseJsonObject(result.data, "host.threadCheck data");
  assert.equal(threadCheck.ranOnMainThread, true);
  assert.equal(threadCheck.capturedMainThreadId, threadCheck.executionThreadId);

  const publicResult = definePublicResult({
    ...result,
    evidence: {
      phase: "5A-08",
      path: [
        "Unity writes registry",
        "TS reads registry",
        "TS probes /probe",
        "TS invokes real HTTP /operations",
        "Unity dispatches host.threadCheck on captured main thread",
        "TS maps envelope/public result",
      ],
      capturedMainThreadId: threadCheck.capturedMainThreadId,
      executionThreadId: threadCheck.executionThreadId,
    },
  } as UnityAgentKitPublicResult);

  const mcpResult = mapPublicResultToMcpToolResult(publicResult);
  assert.deepEqual(mcpResult.structuredContent, publicResult);
  assert.equal(mcpResult.structuredContent.status, "succeeded");
  assert.equal(mcpResult.structuredContent.operation, "host.threadCheck");
  assert.equal(mcpResult.structuredContent.requestId, "phase5a-vertical-smoke-thread-check");
  assert.equal(mcpResult.structuredContent.hostId, registry.record.hostId);
  assert.equal(mcpResult.structuredContent.hostEpoch, registry.record.hostEpoch);
  assert.deepEqual(mcpResult.structuredContent.diagnostics, []);
  assert.equal((mcpResult.structuredContent.evidence as Record<string, unknown>).phase, "5A-08");
  assert.equal(mcpResult.content[0].text, publicResult.summary);
  assert.doesNotMatch(mcpResult.content[0].text, /capturedMainThreadId|hostEpoch|diagnostics/);
  assert.equal(mcpResult.isError, false);
});

function requiredEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value && value.length > 0, `${name} is required for Phase 5A vertical smoke.`);
  return value;
}

function readTimeoutMs(): number {
  const raw = process.env.UNITY_AGENT_KIT_REQUEST_TIMEOUT_MS;
  if (raw === undefined || raw.length === 0) {
    return 3000;
  }

  const parsed = Number(raw);
  assert.ok(Number.isFinite(parsed) && parsed > 0, "UNITY_AGENT_KIT_REQUEST_TIMEOUT_MS must be a positive number.");
  return Math.floor(parsed);
}

function parseJsonObject(value: unknown, label: string): Record<string, unknown> {
  assert.equal(typeof value, "string", `${label} must be a JSON string.`);
  const parsed = JSON.parse(value as string);
  assert.equal(typeof parsed, "object", `${label} must parse to an object.`);
  assert.notEqual(parsed, null, `${label} must not parse to null.`);
  assert.equal(Array.isArray(parsed), false, `${label} must not parse to an array.`);
  return parsed as Record<string, unknown>;
}

function formatValue(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
```

- [ ] **步骤 2：运行 Node-side smoke test 验证 red**

运行：

```bash
cd plugins/unity-agent-kit && UNITY_AGENT_KIT_PROJECT_ROOT="D:/ai/unity-claude-plugin/unity" UNITY_AGENT_KIT_REGISTRY_PATH="D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/missing-5a08-host.json" node --experimental-strip-types --test tests/phase5a-vertical-smoke.test.ts
```

预期：FAIL，输出包含 `host.registry_missing` 或 `missing_before_seen`。

证明：该 red 证明 Node-side smoke 不会在没有 Unity live registry/host 的情况下假成功。

- [ ] **步骤 3：编写 Unity vertical smoke harness**

创建 `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs`：

```csharp
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
```

- [ ] **步骤 4：更新 TS non-live scope guard**

在 `plugins/unity-agent-kit/tests/host-runtime.test.ts` 的 `assertPathDoesNotExist` helper 后新增：

```ts
async function assertPathExists(pathUrl: URL): Promise<void> {
  const details = await stat(pathUrl);
  assert.ok(details.isFile() || details.isDirectory(), `Expected path to exist: ${pathUrl.href}`);
}
```

替换现有 `phase5a07ScopeGuardDoesNotCreateVerticalSmokeOrMcpRegistration` test：

```ts
test("phase5a08ScopeGuardAllowsOnlyVerticalSmokeEvidenceFiles", async () => {
  const requiredEvidencePaths = [
    new URL("phase5a-vertical-smoke.test.ts", import.meta.url),
    new URL("../../../unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs", import.meta.url),
  ];

  for (const requiredPath of requiredEvidencePaths) {
    await assertPathExists(requiredPath);
  }

  const forbiddenPaths = [
    new URL("../src/tools", import.meta.url),
    new URL("../src/mcp", import.meta.url),
    new URL("../src/actions", import.meta.url),
    new URL("../skills/unity.md", import.meta.url),
  ];

  for (const forbiddenPath of forbiddenPaths) {
    await assertPathDoesNotExist(forbiddenPath);
  }
});
```

- [ ] **步骤 5：运行 live vertical smoke 验证通过**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests
```

预期：PASS，Unity XML 中 `total="1"`、`passed="1"`、`failed="0"`，Node stdout 中包含 `tests 1`、`pass 1`、`fail 0`。

证明：该检查证明 Unity keeps the loopback host alive while Node probes and invokes it；Node 读取 canonical project registry `unity/Library/UnityAgentKit/host.json`、调用真实 `/probe`、调用真实 `/operations` 的 `host.threadCheck`；Unity main thread dispatch 被 drain；MCP payload mapping 保留 public result；canonical registry backup/restore 辅助文件位于 `.ai-debug/unity-agent-kit/phase5a-vertical-smoke/`。

- [ ] **步骤 6：运行 non-live TS evidence 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：PASS，输出包含 `tests 60`、`pass 60`、`fail 0`。

证明：该检查证明 5A-EVIDENCE-01 仍覆盖 result mapping、registry validation、TS client simulations、timeout classification、MCP payload preservation；并证明 scope guard 已从 5A-07 absence guard 正确转换为 5A-08 evidence-file admission guard。

- [ ] **步骤 7：Commit**

```bash
git add plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts plugins/unity-agent-kit/tests/host-runtime.test.ts unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs
git commit -m "$(cat <<'EOF'
test: add phase 5a vertical smoke evidence

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 2：记录 Phase 5A completion evidence

**文件：**
- 修改：`docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [ ] **步骤 1：编写 evidence 文档检查命令并验证 red**

运行：

```bash
node --input-type=module - <<'NODE'
import { readFileSync } from 'node:fs';

const commands = [
  'cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts',
  '"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests',
  '"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests',
];
const evidenceText = [
  'HostRuntimeTests',
  'HostRuntimeVerticalSmokeTests',
  'phase5a-vertical-smoke.test.ts',
  'host.threadCheck',
  'captured Unity main thread',
  'non-blocking pending dispatch hook',
  'old hostId / hostEpoch continuity is invalidated',
  'lost or rebind decision',
  'Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending',
];
const checks = [
  {
    file: 'docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md',
    required: [
      'Phase 5A-08 Vertical smoke + completion evidence 已完成',
      ...commands,
      ...evidenceText,
    ],
    forbidden: [],
  },
  {
    file: 'docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md',
    required: [
      '## Phase 5A Completion Evidence',
      'Phase 5A completed',
      ...commands,
      ...evidenceText,
    ],
    forbidden: [],
  },
  {
    file: 'docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md',
    required: [
      'Phase 5A Host Runtime foundation 已完成',
      'HostRuntimeTests',
      'HostRuntimeVerticalSmokeTests',
      'phase5a-vertical-smoke.test.ts',
      'Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending',
    ],
    forbidden: [
      '5A-08 remains pending',
      '5A-08 仍 pending',
      'continue-5a-08',
      '5A-08 pending',
    ],
  },
];

for (const { file, required, forbidden } of checks) {
  const text = readFileSync(file, 'utf8');
  for (const needle of required) {
    if (!text.includes(needle)) {
      throw new Error(`${file} missing ${needle}`);
    }
  }
  for (const needle of forbidden) {
    if (text.includes(needle)) {
      throw new Error(`${file} still contains stale text ${needle}`);
    }
  }
}
console.log('PASS Phase 5A-08 completion evidence docs');
NODE
```

预期：FAIL，至少缺少 `Phase 5A-08 Vertical smoke + completion evidence 已完成`。

证明：该 red 证明 docs 尚未记录 final completion evidence，不能提前标记 Phase 5A completed。

- [ ] **步骤 2：更新 Phase 5A execution index**

在 `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` 中将 5A-08 row 更新为：

```markdown
| 5A-08 | Vertical smoke + completion evidence | 5A-EVIDENCE-01, 5A-EVIDENCE-02, 5A-EVIDENCE-03, 5A-EVIDENCE-04 | 6 | 5A-01, 5A-02, 5A-03, 5A-05, 5A-06, 5A-07 | `docs/superpowers/plans/2026-05-21-unity-agent-kit-phase-5a-08-vertical-smoke-completion-evidence.md` | completed |
```

将 `## Current Next Manual Action` 内容替换为：

```markdown
Phase 5A-08 Vertical smoke + completion evidence 已完成。Evidence:

1. `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts` passed with `tests 60`, `pass 60`, `fail 0`; covers result mapping, registry validation, TS client simulations, timeout classification, MCP payload preservation, and 5A-08 scope guard.
2. `"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests` passed with `total="78"`, `passed="78"`, `failed="0"`; covers DTO, registry, lifecycle cleanup, HTTP protocol, main-thread dispatch, non-blocking pending dispatch hook, host-level timeout, stop/reload pending failure, and result envelope behavior.
3. `"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests` passed with `total="1"`, `passed="1"`, `failed="0"`; `HostRuntimeVerticalSmokeTests` starts the live Unity host, runs `phase5a-vertical-smoke.test.ts`, proves `host.threadCheck` runs on the captured Unity main thread, maps the envelope to public result and MCP payload, then stops the host and verifies cleanup.

Phase 5A completed because all active sibling execution plans and final vertical smoke evidence passed. Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending.

Next action: create/review the Phase 5B Artifact / Resource / Timeout / Completion subplan artifacts before implementing Phase 5B.
```

在 `## Completion Rule` 后追加：

```markdown
## Phase 5A Completion Evidence

Phase 5A-08 Vertical smoke + completion evidence 已完成 and closes the Phase 5A Host Runtime foundation. Evidence groups covered:

- registry: minimum `UnityAgentKitHostRecord`, project root from `Application.dataPath`, existing epoch increment, new hostId on restart/reload, strict TS registry validation, and registry failure classification.
- lifecycle: compiling/updating skip start, update tick retry, beforeAssemblyReload stop, Editor quitting stop, Start stops old listener, Stop closes listener, deterministic wake, listener-loop-exited signal, cleanup of pending work, old listener no longer responds.
- HTTP protocol: canonical `GET /probe`, canonical `POST /operations`, structured 404/405/400 envelopes, JSON content type/framing, 127.0.0.1 URL helpers, request context preservation.
- dispatch/timeout: `host.threadCheck`, captured Unity main thread, dispatch exception diagnostics, non-blocking pending dispatch hook, host-level timeout with may-still-be-running, stop/reload pending failure not timeout.
- TS client: ready/not_ready, invalid registry/probe shapes, stable diagnostic codes, bounded pre-operation rebind, in-flight no replay, post-response stale/lost, old hostId / hostEpoch continuity is invalidated, lost or rebind decision.
- result/envelope: DTO JSON round-trip, operation normalization, status/code table, failure metadata preservation, invalid envelope mapping, unknown status fail-closed.
- vertical smoke: Unity writes registry → TS reads registry → TS probes `/probe` → TS invokes real `/operations` → Unity dispatches to captured Unity main thread via `host.threadCheck` → TS maps envelope/public result and MCP payload.
- MCP payload mapping foundation: `structuredContent` preserves full public result; `content` is summary only; `isError` follows `status !== "succeeded"`.
```

- [ ] **步骤 3：更新 Phase 5 plan index**

在 `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` 中将 Phase 5A row 更新为：

```markdown
| Phase 5A | Host Runtime 基础设施 | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` | completed | completed | completed: 5A-01 through 5A-08 completed; final evidence includes `host-runtime.test.ts` tests 60/pass 60/fail 0, `HostRuntimeTests` total 78/passed 78/failed 0, and `HostRuntimeVerticalSmokeTests` total 1/passed 1/failed 0 | stays subplan |
```

在 `## Completion Rule` 后追加 Phase 5A subplan completion evidence 段：

````markdown
## Phase 5A Completion Evidence

Phase 5A completed after 5A-01 through 5A-08 completed and final evidence passed. Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending.

Canonical evidence commands:

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests
```

Evidence summary:

- `HostRuntimeTests` passed and covers DTO, registry, lifecycle cleanup, HTTP protocol, main-thread dispatch, non-blocking pending dispatch hook, host-level timeout, stop/reload pending failure, and result envelope behavior.
- `HostRuntimeVerticalSmokeTests` passed and runs `phase5a-vertical-smoke.test.ts` against the live Unity host.
- `host.threadCheck` ran on the captured Unity main thread.
- TS mapped the Unity envelope to public result and MCP payload.
- TS evidence proves old hostId / hostEpoch continuity is invalidated and returns lost or rebind decision rather than trusting stale success.
````

将 `## Next Manual Action` 内容替换为：

```markdown
Phase 5A Host Runtime foundation completed with evidence. Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending.

Next action: create/review Phase 5B Artifact / Resource / Timeout / Completion artifacts before implementing Phase 5B. Do not mark Roadmap Phase 5 completed from Phase 5A evidence alone.
```

- [ ] **步骤 4：更新 roadmap Phase 5 current truth、Phase Summary 和 evidence**

在 `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` 中同步所有影响 Phase 5A / Phase 5 current truth 的位置。必须更新：

- `Current State` 中 Phase 5A 状态段落。
- `Phase Summary` 的 Phase 5 row，把 `Next` 从 `continue-5a-08` 改为 `continue-5b` 或等价 Phase 5B handoff。
- Phase 5 `Implementation Summary`，把 `5A-08 remains pending` / `5A-08 仍 pending` 改为 Phase 5A completed evidence summary。
- Phase 5 `Verification Evidence`，追加 5A-08 final evidence。
- Phase 5 `Next Manual Action` 或相关 next action 文本，改为 Phase 5B artifact/resource/timeout/completion subplan artifact creation/review。
- `## Change Log` 顶部追加 5A-08 completion entry。

必须移除或改写 roadmap 中所有旧状态文字：

```text
5A-08 remains pending
5A-08 仍 pending
continue-5a-08
5A-08 pending
```

不得修改 Roadmap Goal、Non-goals、Shared Constraints、phase order 或 Phase 5B-5E pending 状态。必须保留：

```text
Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending
```

将 `Current State` 的 Phase 5A 段落改为包含以下内容：

```markdown
- 当前阶段：Phase 5A Host Runtime foundation 已完成，5A-01 through 5A-08 均完成并记录 evidence；5A-08 Vertical smoke + completion evidence 覆盖 `5A-EVIDENCE-01`、`5A-EVIDENCE-02`、`5A-EVIDENCE-03`、`5A-EVIDENCE-04`。最终证据为：`cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts` 通过，`tests 60`、`pass 60`、`fail 0`；`HostRuntimeTests` Unity command 通过，`total="78"`、`passed="78"`、`failed="0"`；`HostRuntimeVerticalSmokeTests` Unity command 通过，`total="1"`、`passed="1"`、`failed="0"`，并由 Unity 启动真实 host、运行 `phase5a-vertical-smoke.test.ts`、证明 `host.threadCheck` 在 captured Unity main thread 执行、完成 public result/MCP payload mapping 和 host cleanup。Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending。
```

将 Phase 5 `Implementation Summary` 改为以以下口径结尾：

```markdown
Phase 5A Host Runtime foundation 已完成；5A-01 through 5A-08 均完成并记录 evidence。Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending.
```

在 Phase 5 `Verification Evidence` 中追加：

```markdown
5A-08 final evidence：`cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts` 通过，`tests 60`、`pass 60`、`fail 0`；`"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests` 通过，`total="78"`、`passed="78"`、`failed="0"`；`"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests` 通过，`total="1"`、`passed="1"`、`failed="0"`。Evidence covers HostRuntimeTests, phase5a-vertical-smoke.test.ts, HostRuntimeVerticalSmokeTests, host.threadCheck, captured Unity main thread, non-blocking pending dispatch hook, old hostId / hostEpoch continuity is invalidated, and lost or rebind decision. Scope guard confirms no MCP public tool registration/export/action-dispatch wiring and no `/unity` skill were created by Phase 5A.
```

将 Phase 5 `Next Manual Action` 改为：

```markdown
Phase 5A completed；下一步创建并审查 Phase 5B Artifact / Resource / Timeout / Completion subplan artifacts。Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending.
```

在 `## Change Log` 顶部追加：

```markdown
- 2026-05-21：完成 Phase 5A-08 Vertical smoke + completion evidence，覆盖 `5A-EVIDENCE-01`、`5A-EVIDENCE-02`、`5A-EVIDENCE-03`、`5A-EVIDENCE-04`。TS non-live evidence `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts` 通过，`tests 60`、`pass 60`、`fail 0`；Unity `HostRuntimeTests` 通过，`total="78"`、`passed="78"`、`failed="0"`；Unity `HostRuntimeVerticalSmokeTests` 通过，`total="1"`、`passed="1"`、`failed="0"`，并由 Unity 启动真实 loopback host、运行 `phase5a-vertical-smoke.test.ts`、验证 `host.threadCheck` 在 captured Unity main thread 执行、TS 映射 envelope/public result/MCP payload、Unity 停止 host 并验证 cleanup。Phase 5A completed；Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending。
```

- [ ] **步骤 5：运行 evidence docs 检查验证通过**

运行：

```bash
node --input-type=module - <<'NODE'
import { readFileSync } from 'node:fs';

const commands = [
  'cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts',
  '"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests',
  '"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests',
];
const evidenceText = [
  'HostRuntimeTests',
  'HostRuntimeVerticalSmokeTests',
  'phase5a-vertical-smoke.test.ts',
  'host.threadCheck',
  'captured Unity main thread',
  'non-blocking pending dispatch hook',
  'old hostId / hostEpoch continuity is invalidated',
  'lost or rebind decision',
  'Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending',
];
const checks = [
  {
    file: 'docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md',
    required: [
      'Phase 5A-08 Vertical smoke + completion evidence 已完成',
      ...commands,
      ...evidenceText,
    ],
    forbidden: [],
  },
  {
    file: 'docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md',
    required: [
      '## Phase 5A Completion Evidence',
      'Phase 5A completed',
      ...commands,
      ...evidenceText,
    ],
    forbidden: [],
  },
  {
    file: 'docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md',
    required: [
      'Phase 5A Host Runtime foundation 已完成',
      'HostRuntimeTests',
      'HostRuntimeVerticalSmokeTests',
      'phase5a-vertical-smoke.test.ts',
      'Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending',
    ],
    forbidden: [
      '5A-08 remains pending',
      '5A-08 仍 pending',
      'continue-5a-08',
      '5A-08 pending',
    ],
  },
];

for (const { file, required, forbidden } of checks) {
  const text = readFileSync(file, 'utf8');
  for (const needle of required) {
    if (!text.includes(needle)) {
      throw new Error(`${file} missing ${needle}`);
    }
  }
  for (const needle of forbidden) {
    if (text.includes(needle)) {
      throw new Error(`${file} still contains stale text ${needle}`);
    }
  }
}
console.log('PASS Phase 5A-08 completion evidence docs');
NODE
```

预期：PASS，输出 `PASS Phase 5A-08 completion evidence docs`。

证明：该检查证明 5A-EVIDENCE-04 已进入 execution index、Phase 5 plan index 和 roadmap current truth，且 Phase 5 incomplete 边界没有丢失。

- [ ] **步骤 6：Commit**

```bash
git add docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: record phase 5a completion evidence

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 3：最终 verification gate 和 scope boundary 审查

**文件：**
- 验证：`plugins/unity-agent-kit/tests/host-runtime.test.ts`
- 验证：`plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts`
- 验证：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`
- 验证：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs`
- 验证：`docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
- 验证：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- 验证：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [ ] **步骤 1：运行 TS non-live evidence**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：PASS，输出 `tests 60`、`pass 60`、`fail 0`。

证明：覆盖 5A-EVIDENCE-01：result mapping、registry validation、TS client simulations、timeout classification、MCP payload preservation。

- [ ] **步骤 2：运行 Unity HostRuntimeTests evidence**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `total="78"`、`passed="78"`、`failed="0"`。

证明：覆盖 5A-EVIDENCE-02：DTO、registry、lifecycle、HTTP protocol、dispatch/timeout、result envelope behavior。

- [ ] **步骤 3：运行 Unity-driven live vertical smoke evidence**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests
```

预期：PASS，XML 中 `total="1"`、`passed="1"`、`failed="0"`；Node stdout 中包含 `tests 1`、`pass 1`、`fail 0`。

证明：覆盖 5A-EVIDENCE-03：Unity writes registry → TS reads registry → TS probes `/probe` → TS invokes real `/operations` → Unity dispatches `host.threadCheck` on captured Unity main thread → TS maps envelope/public result/MCP payload → Unity cleanup。

- [ ] **步骤 4：运行 scope boundary check**

运行：

```bash
node --input-type=module - <<'NODE'
import { existsSync } from 'node:fs';
const required = [
  'plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts',
  'unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs',
];
const forbidden = [
  'plugins/unity-agent-kit/skills/unity.md',
  'plugins/unity-agent-kit/src/tools',
  'plugins/unity-agent-kit/src/mcp',
  'plugins/unity-agent-kit/src/actions',
];
for (const path of required) {
  if (!existsSync(path)) throw new Error(`missing required 5A-08 evidence file: ${path}`);
}
for (const path of forbidden) {
  if (existsSync(path)) throw new Error(`out-of-scope 5A-08 file exists: ${path}`);
}
console.log('PASS Phase 5A-08 scope boundary');
NODE
```

预期：PASS，输出 `PASS Phase 5A-08 scope boundary`。

证明：该检查证明 5A-08 没有实现 Phase 5B-5E、public MCP tools、`/unity` skill、workflow/resource/artifact/final daily loop E2E。

- [ ] **步骤 5：运行 evidence docs check**

运行任务 2 步骤 5 中的 docs check 命令。

预期：PASS，输出 `PASS Phase 5A-08 completion evidence docs`。

证明：覆盖 5A-EVIDENCE-04：Phase 5A completion evidence 已记录，Phase 5 incomplete 边界仍存在。

- [ ] **步骤 6：最终 git diff 检查**

运行：

```bash
git diff --check
```

预期：PASS，无输出。

证明：文档和代码改动没有 whitespace error。

- [ ] **步骤 7：最终汇报边界**

最终汇报必须包含：

```text
Phase 5A completed with evidence.
Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending.
No MCP public tools, /unity skill, workflow timeout, artifact/resource store, or final daily loop E2E were implemented in 5A-08.
```

## 自检结果

- **规格覆盖度:** 5A-EVIDENCE-01 由任务 1 步骤 6 和任务 3 步骤 1 覆盖；5A-EVIDENCE-02 由任务 3 步骤 2 覆盖；5A-EVIDENCE-03 由任务 1 步骤 5 和任务 3 步骤 3 覆盖；5A-EVIDENCE-04 由任务 2 和任务 3 步骤 5 覆盖。
- **占位符扫描:** 未发现禁止占位表达；所有步骤都包含具体文件、代码、命令和预期结果。
- **类型一致性:** TS 使用既有 `readHostRegistry`、`probeActiveHost`、`invokeOperationOnce`、`createNodeHostTransport`、`definePublicResult`、`mapPublicResultToMcpToolResult`；Unity 使用既有 `UnityAgentKitHost.StartForTests`、`StopForTests`、`UnityAgentKitMainThread.DrainForTests`、`UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests`。
- **拆分检查:** 已记录；无需拆分。5A-08 是单一 completion gate，不新增独立 subplan。
- **上游约束覆盖:** Roadmap Shared Constraints、Phase scope/out-of-scope、用户确认事项和 Phase 5 incomplete 边界都映射到任务和验证命令。
- **参考输入映射:** 已说明采用内容、不采用内容、不采用原因和落地任务。
- **验证强度:** 行为验收使用真实 Unity host + Node subprocess + real HTTP；存在性检查仅用于 scope boundary，不作为 vertical smoke 行为验收。

## 执行交接

计划执行时必须从任务 1 开始。任务 1 通过前不得记录 docs completion evidence；任务 2 通过前不得称 Phase 5A completed；任务 3 全部通过前不得提交最终完成汇报。
