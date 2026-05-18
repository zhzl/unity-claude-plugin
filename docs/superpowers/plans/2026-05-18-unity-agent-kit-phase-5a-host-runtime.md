# Unity Agent Kit Phase 5A Host Runtime 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 Unity Agent Kit 的单一 Unity C# host runtime、loopback transport、registry/probe、main-thread dispatch、DTO/result envelope 和 active host lost/rebind 基础。

**架构：** Unity C# host 位于 `unity/Assets/UnityAgentKit/`，负责短主线程动作、registry 写入、loopback HTTP、operation routing 和 DTO envelope。TS host client 位于 `plugins/unity-agent-kit/src/host/`，负责读取 registry、probe active host、invoke `/operations`、识别 lost/rebind，并把 host envelope 映射到 public-result foundation。`plugins/unity-agent-kit/src/contracts/` 只定义最小 MCP tool result payload 映射基础，不注册 MCP tools 或绑定具体 public action schema。

**技术栈：** TypeScript ESM、Node.js built-in test runner、Unity 2022.3.61f1 Editor C#、Unity EditMode tests、loopback HTTP、JSON DTO。
**拆分检查：** 已检查；Phase 5 按 plan index 拆分为 5A-5E，本计划只覆盖 Host Runtime 基础设施。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`
**Plan Index:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
**Subplan:** Phase 5A

## 上游约束摘要

- **Roadmap Shared Constraints**
  - Phase 5A 继续采用 `unity-mcp-v2` 的 host runtime、loopback HTTP、registry/probe、operation envelope、host rebirth / rebind 基线。
  - TS 负责 registry 读取、active host 验证、lost/rebind 判断、最终 public result 收敛；Unity C# 只负责短主线程动作、DTO JSON 收发、registry 写入和最小 operation routing。
  - 保持单一 Unity C# host source tree：`unity/Assets/UnityAgentKit/` 是唯一 C# host 目录，不在 TS 插件目录复制第二份 host。
  - public schema、MCP tool 注册、workflow 编排和长时间等待不进入本 subplan；这些职责继续留在 TS 更高层或后续 subplans。
- **Phase Scope**
  - 5A 只覆盖 Host Runtime foundation：TS package skeleton、result foundation、MCP payload mapping foundation、Unity DTO、registry、`/probe`、`/operations`、main-thread dispatch、host restart/epoch validation 和最小 vertical smoke path。
  - 5A 最终验证目标是：真实 `/probe` HTTP response、真实 `/operations` HTTP request、main-thread dispatch、DTO envelope、host-level timeout failure、dispatch exception diagnostics、host restart/epoch detection，以及 TS public result → MCP tool result payload mapping。
  - 5A host-level safety timeout only；5B owns workflow-level timeout/polling。
- **Phase Out-of-scope**
  - 5A 不实现 19 public action business logic。
  - 5A 不实现 artifact store、MCP Resource handlers、TestRunner、CompileDiagnostics、Console readback、PlayMode transition、Screenshot capture。
  - 5A 不实现 `/unity` skill、MCP public tool registration 或 final daily loop E2E。
  - 5A 不实现 workflow-level timeout/polling、resource URI handler、完整 diagnostics workflow、candidate action orchestration。
- **Success Criteria**
  - `UnityAgentKitHostRegistry` 能写入 host record，TS client 能读取 registry 并完成 active host 基础校验；最小链路必须明确覆盖 `Unity host writes registry`。
  - Unity loopback server 暴露真实 `/probe` HTTP response，并以 DTO 反序列化断言 host identity，而不是字符串搜索。
  - Unity loopback server 处理真实 `/operations` HTTP request，将 DTO JSON 反序列化为 operation request、dispatch 到 captured Unity main thread，并返回 DTO envelope JSON。
  - `/operations` 能覆盖 `host.echo`、`host.threadCheck`、unknown operation rejection、Malformed JSON structured failure、dispatch exception 和 host-level safety timeout。
  - TS client 能把 host envelope 映射到 public-result foundation，并进一步生成 MCP tool result payload，保留 status、diagnostics、evidence 和 resource references；最小链路必须明确覆盖 `TS maps envelope to public-result foundation`。
  - TS client 能识别 host restart/epoch 变化，在 `hostId / hostEpoch mismatch` 时返回 `lost` 或触发 rebind 分支，而不是复用旧 continuity。
- **用户确认事项**
  - Unity C# host 位置固定在 `unity/Assets/UnityAgentKit/`。
  - TS host client 位于 `plugins/unity-agent-kit/src/host/`，只做 host runtime foundation，不创建 MCP tools。
  - 本计划仅创建 implementation plan 文档；主会话在 reviewing-specs gate 通过前不会把 index 中的 Phase 5A 状态改为 `planned`。
  - 所有验证命令以本仓库为根目录执行；常规 TS 单测脚本固定为 `node --experimental-strip-types --test tests/host-runtime.test.ts`，live-host vertical smoke 只允许由 Unity EditMode harness 内部运行 `node --experimental-strip-types --test tests/phase5a-vertical-smoke.test.ts`。
- **本计划不包含**
  - 不包含 5B 的 workflow timeout/polling policy、artifact/resource/completion plumbing。
  - 不包含 5C 的 compile/console/test diagnostic workflows。
  - 不包含 5D 的 TestRunner、PlayMode、Screenshot vertical workflows。
  - 不包含 5E 的 MCP public tool registration、`/unity` skill、E2E daily loop 和 roadmap completion sync。

## Phase 1-4 Compliance Matrix

| 上游 Phase | 适用约束 | 本 subplan 如何满足 | 落地任务 | 验证 |
|---|---|---|---|---|
| Phase 1 | 单一 Unity host、TS/C# 明确分层、基于 v2 host runtime 演进 | 仅在 `unity/Assets/UnityAgentKit/` 建立单一 C# host source tree；TS 仅实现 registry/probe/invoke/rebind client 与 public-result foundation，不复制第二份 host | 任务 2、3、4、5 | Unity EditMode tests 通过 `OperationRequestJsonDeserializesToDto`、`ProbeEndpointReturnsHostIdentityOverHttp`、真实 `/operations` 测试；TS 运行 `node --experimental-strip-types --test tests/host-runtime.test.ts` 覆盖非 live-host registry/probe/invoke/rebind 单测 |
| Phase 2 | `/unity` 是薄路由 skill，skill 不承载运行时实现 | 5A 只提供供后续 `/unity` 薄路由依赖的 host runtime foundation，不在本计划注册 MCP tools 或写 skill recipe | 任务 1、5、6 | TS tests 仅验证 result foundation、host client 与 `TS public result → MCP tool result payload`；plan evidence 中不得出现 MCP tool 注册或 `/unity` skill 文件 |
| Phase 3 | public result status enum、tool/action 与 internal operation 分离 | 在 `plugins/unity-agent-kit/src/contracts/` 只定义最小 public-result foundation 与 MCP payload mapping foundation；Unity `/operations` 只暴露 internal operation，如 `host.echo`、`host.threadCheck` | 任务 1、4、5 | TS tests 覆盖 `mapPublicResultToMcpToolResult` preservation、`status !== "succeeded"` 的 `isError` 推导；Unity tests 覆盖 unknown operation → structured `rejected` |
| Phase 4 | TS 负责 timeout/polling/final judgment；Unity 负责短主线程动作、DTO/result envelope、host rebirth / rebind 限制恢复 | 5A 只实现 host-level safety timeout、DTO JSON round-trip、captured Unity main thread dispatch、lost/rebind foundation；不进入 workflow-level timeout/polling 或长流程等待 | 任务 2、4、5、6 | Unity tests 覆盖 DTO JSON round-trip、Malformed JSON、dispatch exception、host-level safety timeout、`host.threadCheck`；TS tests 覆盖 wrong protocol、`hostId / hostEpoch mismatch`、`lost or rebind decision`，常规命令固定为 `node --experimental-strip-types --test tests/host-runtime.test.ts`，live-host vertical smoke 只通过 `HostRuntimeVerticalSmokeTests` 驱动 |

## unity-mcp-v2 Reference Mapping

| 能力域 | 参考输入 | 采用机制 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|---|
| loopback HTTP host | `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Transport/UnityMcpV2LoopbackHttpServer.cs`：`UnityMcpV2LoopbackHttpServer`、`BuildProbeUrl(int port)`、`BuildOperationsUrl(int port)`、`Start(UnityMcpV2HostRecord record)`、`Stop()`、`HandleContext(HttpListenerContext context)`、`HandleProbe(UnityMcpV2HostRecord record)`、`HandleOperation(string requestJson)`；`references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Tests/UnityMcpV2HttpServerTests.cs`：`BuildLoopbackUrl_UsesAssignedPort`、`BuildProbeUrl_UsesAssignedPort`、`LoopbackServer_HandlesProbeAndOperationRoutes` | 采用真实 loopback HTTP host，Unity 暴露 `GET /probe` 与 `POST /operations`，并保持 `BuildProbeUrl/BuildOperationsUrl` 对动态端口的明确构造；用真实 HTTP 集成测试覆盖 probe 和 operations route，而不是内存 stub | v2 public compatibility layer、legacy public tools | 新插件只落地 host runtime foundation；5A 不复制 v2 旧 public surface，也不在此阶段注册 MCP tools | 任务 3、4、6 |
| registry/probe | `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/UnityMcpV2HostRegistry.cs`：`UnityMcpV2HostRegistry`、`GetRegistryPath()`、`CreateRecord(int port, int previousEpoch, string hostVersion, string protocolVersion)`、`ReadExistingEpoch()`、`Publish(UnityMcpV2HostRecord record)`；`references/unity-mcp-v2/plugins/unity-mcp-v2/src/discovery/host-registry.ts`：`HostRegistryRecord`、`readHostRegistry(registryPath)`、`isHostRegistryRecord`；`references/unity-mcp-v2/plugins/unity-mcp-v2/src/client/http-client.ts`：`validateReadyHost(record)`、`probeHost(record, timeoutMs)`、`validateProbeResponse(record, payload)`、`sameHostIdentity(a, b)` | 采用 Unity writes registry → TS reads registry → TS probes `/probe`，并按 `hostId`、`hostEpoch`、`projectRoot`、`protocolVersion`、`port` 做 registry + active probe 双重校验 | 把 registry 直接暴露为 public API，或跳过 active probe 只信任静态文件 | 5A 需要证明 active host 真正存活；只读静态文件无法证明旧 continuity 仍有效，也无法覆盖 `validateProbeResponse(record, payload)` 的 identity 校验 | 任务 2、3、5、6 |
| main-thread dispatch | `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Transport/UnityMcpV2LoopbackHttpServer.cs`：`MainThreadDispatchTimeoutMs`、`MainThreadQueue`、`_mainThreadId`、`DispatchOnMainThread(Func<string> work, string operation, string requestId)`、`DrainMainThreadQueue()`、`FailPendingMainThreadWork(string code, string message)`、`MainThreadWorkItem`；`references/unity-mcp-v2/Assets/UnityMcpV2/Editor/UnityMcpV2HostEntry.cs`：`RegisterCallbacks()`、`Tick()` | 采用 captured Unity main thread + queue-drain 模式：HTTP handler 只做 DTO parse/serialize，`host.threadCheck` 等 operation 通过主线程队列执行，并由 Editor callback 驱动 drain | 在后台线程直接访问 Unity API、long workflow waiting | 5A 只允许短主线程动作；长时间等待和 workflow 编排属于 5B，不放进 host runtime foundation | 任务 4、6 |
| operation / envelope / DTO | `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/UnityMcpV2Models.cs`：`UnityMcpV2HostRecord`、`UnityMcpV2OperationRequest`、`UnityMcpV2OperationResponse`、`UnityMcpV2OperationData`、`UnityMcpV2OperationInput`；`references/unity-mcp-v2/Assets/UnityMcpV2/Editor/UnityMcpV2OperationRouter.cs`：`NormalizeOperation(string operation)`、`Route(UnityMcpV2OperationRequest request, UnityMcpV2HostRecord host)`、`Accepted(...)`、`Completed(...)`、`Failed(...)`；`references/unity-mcp-v2/plugins/unity-mcp-v2/src/kernel/envelope.ts`：`createAcceptedEnvelope`、`createCompletedEnvelope`、`createFailedEnvelope`；`references/unity-mcp-v2/plugins/unity-mcp-v2/src/kernel/operations.ts`：`v2Operations`、`getActionOperationNames()`、`getWorkflowOperationNames()`；`references/unity-mcp-v2/plugins/unity-mcp-v2/src/mcp/action-tools.ts`：`ActionToolResult`、`toActionToolResult(operation, requestId, result)` | 采用 structured DTO + envelope 路由：Unity `/operations` 只处理 internal operation，TS 再把 envelope 映射到 public result foundation 和 MCP payload，并通过 payload 保留 `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs` | legacy public tools、把 internal operation 名直接当作 public tool schema | 5A 只建立 host envelope 与 public-result foundation 的桥接，不继承旧 public tool compatibility layer，也不在 5A 注册 MCP tools | 任务 1、4、5、6 |
| host rebirth / rebind | `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/UnityMcpV2HostEntry.cs`：`_epoch`、`_currentRecord`、`ShouldSkipStart(bool started, bool serverRunning, bool isCompiling, bool isUpdating)`、`StartHost()`、`StopForReload()`；`references/unity-mcp-v2/plugins/unity-mcp-v2/src/client/http-client.ts`：`sameHostIdentity(a, b)`、`validateReadyHost(record)`、`validateProbeResponse(record, payload)`、`executeAgainstHost(...)`、`invokeHostHttp(params)`、`isPreOperationRetryable(error)`、`preserveMostSpecificError(current, fallback)`、`errorPriority(error)`；`references/unity-mcp-v2/plugins/unity-mcp-v2/src/kernel/errors.ts`：`hostRestarted`、`staleInstance`、`requestTimedOut`、`transportUnavailable`；`references/unity-mcp-v2/plugins/unity-mcp-v2/tests/client/http-client.test.ts`：`http client rebinds once when the initial probe host is stale and a new host is ready`、`http client classifies in-flight host rebirth as HOST_RESTARTED when transport fails`、`http client rejects probe responses whose identity mismatches the registry host`、`http client does not replay operation when operation transport failure coincides with host restart`、`client classifies post-response identity drift as STALE_INSTANCE` | 采用 registry identity + active probe + transport failure classification 组合判断：一旦 probe 或 invoke 发现 continuity 漂移，就返回 `lost` 或进入单次 rebind decision，而不是延续旧 host 成功 | 假设 old hostId/hostEpoch continuity 可以跨 restart 复用，或在 in-flight 失败时自动无限重放 | 5A 必须证明 `old hostId / hostEpoch continuity is invalidated`，并记录 `lost or rebind decision`；否则 TS 可能把旧 envelope 误判为当前 host 成功结果 | 任务 5、6 |
| JSON / protocol parsing | `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Transport/UnityMcpV2LoopbackHttpServer.cs`：`JsonUtility.FromJson<UnityMcpV2OperationRequest>(requestJson)`、`JsonUtility.ToJson(...)`、`NormalizeAbsentOptionalInputs(request, requestJson)`、`ExtractOperationWithoutUnity(string requestJson)`、`ExtractRequestIdWithoutUnity(string requestJson)`、`ExtractStringFieldWithoutUnity(string requestJson, string fieldName)`、`EscapeJson(string value)`；`references/unity-mcp-v2/plugins/unity-mcp-v2/src/client/http-client.ts`：`parseJsonObject(raw)`、`readProbeString(...)`、`readProbeNumber(...)` | `/probe` 与 `/operations` 全部使用结构化 JSON parse/serialize，Malformed JSON 返回 structured failure，并在 TS 侧逐字段读取 probe payload 而不是字符串搜索 | string concat/string search | 字符串拼接或搜索无法证明 DTO shape、diagnostics shape 和 protocol continuity；5A 要求逐字段断言和可执行失败分类 | 任务 2、3、4、5、6 |

## Quality Gate

| Gate | 最低信心分 | 达标条件 | 未达标处理 |
|---|---|---|---|
| loopback | 8/10 | 真实 `/probe` HTTP response` 和 `/operations` HTTP request` 测试都通过，且 DTO 反序列化断言完整 | 若低于 8，先补 probe/operations 实测，再继续后续任务 |
| main-thread dispatch | 8/10 | `host.threadCheck` 证明 dispatch 到 captured Unity main thread | 若低于 8，停止扩展 operation catalog，只修复 dispatch foundation |
| DTO/result envelope | 8/10 | DTO JSON round-trip、Malformed JSON、unknown operation、dispatch exception 都返回结构化 envelope | 若低于 8，停止 TS client 开发，先补齐 DTO contract |
| active host validation | 8/10 | TS 能识别 host restart、hostId / hostEpoch mismatch 和 wrong protocol | 若低于 8，禁止把 runtime 标记为 stable foundation |
| MCP result mapping foundation | 8/10 | `mapPublicResultToMcpToolResult` 保留 status/diagnostics/evidence/resource references | 若低于 8，禁止进入 MCP tool registration 子计划 |
| vertical smoke path | 8/10 | 从 registry 写入到 TS payload mapping 的最小链路可验证 | 若低于 8，必须补强最小链路证据，不扩展业务逻辑 |

低分处理规则：任何 gate 低于 8/10 时，本 subplan 保持未完成状态，只允许继续做提高该 gate 置信度的最小修复；不得借机扩展到 5B-5E 范围。

## 文件结构

本 subplan 执行时计划创建以下文件：

- `plugins/unity-agent-kit/package.json`
- `plugins/unity-agent-kit/src/contracts/result.ts`
- `plugins/unity-agent-kit/src/contracts/mcp-result.ts`
- `plugins/unity-agent-kit/src/host/registry.ts`
- `plugins/unity-agent-kit/src/host/http-client.ts`
- `plugins/unity-agent-kit/src/host/rebind.ts`
- `plugins/unity-agent-kit/tests/host-runtime.test.ts`
- `plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts`
- `unity/Assets/UnityAgentKit/Editor/UnityAgentKit.Editor.asmdef`
- `unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs`
- `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs`
- `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs`
- `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- `unity/Assets/UnityAgentKit/Editor/Tests/UnityAgentKit.Editor.Tests.asmdef`
- `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`
- `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs`

## Phase 5A 最小 vertical smoke path

`phase5a-vertical-smoke` 必须是具体可执行的跨边界验证，而不是概念性描述。执行载体固定为：

- TS: `plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts`
- Unity: `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs`

Unity test keeps the loopback host alive while Node probes and invokes it。具体编排固定为：

1. `HostRuntimeVerticalSmokeTests` 在 Unity EditMode 内启动真实 `UnityAgentKitLoopbackHttpServer`，写出 `unity/Library/UnityAgentKit/host.json`，捕获 Unity main thread，并在整个 Node 子进程生命周期内保持 host alive。
2. Unity 测试从仓库根目录启动：`cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/phase5a-vertical-smoke.test.ts`，并通过环境变量传递 `UNITY_AGENT_KIT_PROJECT_ROOT`、`UNITY_AGENT_KIT_REGISTRY_PATH` 或等价 project-scoped registry 信息。
3. `phase5a-vertical-smoke.test.ts` 读取 `unity/Library/UnityAgentKit/host.json`，调用真实 `/probe`，再调用真实 `/operations` 的 `host.threadCheck`。
4. Node 测试把 `/operations` 返回的 envelope 映射到 public result 与 MCP payload，并断言 payload 保留 `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`；`structuredContent` 继续保留 status、diagnostics、evidence、resource references。
5. Unity 测试等待 Node 进程退出；若退出码非 0 则直接失败；随后显式停止 host。

```text
Unity writes registry → TS reads registry → TS probes `/probe` → TS invokes `/operations` → Unity dispatches to captured main thread via `host.threadCheck` → TS maps envelope/public result
```

该 `/operations` 调用必须是真实 HTTP `/operations` 请求，不允许用内存 stub 替代，也不依赖独立长驻 Unity 进程。

该 smoke path 至少包含以下断言点：

- `HostRuntimeVerticalSmokeTests` 证明 registry record、`/probe` response、`/operations` response 都使用 DTO JSON round-trip，而不是字符串搜索。
- `phase5a-vertical-smoke.test.ts` 读取 Unity 写入的 registry DTO，并从其中取得 `hostId`、`hostEpoch`、`projectRoot`、`protocolVersion`、`port`。
- TS test 对 `/probe` 的 active host 校验必须逐字段断言 `hostId`、`hostEpoch`、`projectRoot`、`protocolVersion` 与 registry 一致。
- TS test 对真实 HTTP `/operations` 调用 `host.threadCheck`，并断言返回 envelope 的 `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs` 可映射到 public result 和 MCP payload。
- Unity test 对 `host.threadCheck` 断言 `ranOnMainThread == true` 且 `capturedMainThreadId == executionThreadId`，证明 dispatch 发生在 captured Unity main thread。
- TS test 对 `TS public result → MCP tool result payload` 断言 `structuredContent` 保留 status、diagnostics、evidence、resource references。
- host restart/rebind evidence 必须记录 `old hostId / hostEpoch continuity is invalidated` 与 `lost or rebind decision`，避免把旧 continuity 下的成功 envelope 继续视为当前 host 结果。

## 任务 1：创建 TS package skeleton、result foundation 和 MCP payload mapping

**文件：**
- 创建：`plugins/unity-agent-kit/package.json`
- 创建：`plugins/unity-agent-kit/src/contracts/result.ts`
- 创建：`plugins/unity-agent-kit/src/contracts/mcp-result.ts`
- 创建：`plugins/unity-agent-kit/tests/host-runtime.test.ts`

- [ ] **步骤 1：创建最小 package skeleton 和固定测试脚本**

  在 `plugins/unity-agent-kit/package.json` 中创建最小 ESM package，包含：

  ```json
  {
    "name": "unity-agent-kit",
    "private": true,
    "type": "module",
    "scripts": {
      "test": "node --experimental-strip-types --test tests/host-runtime.test.ts"
    }
  }
  ```

  必须断言 package script exactly `node --experimental-strip-types --test tests/host-runtime.test.ts`，不得省略 `--experimental-strip-types`。

- [ ] **步骤 2：定义 public-result foundation contract**

  在 `src/contracts/result.ts` 定义 5A 最小 public result foundation：

  - `status: "succeeded" | "failed" | "uncertain" | "cancelled" | "timeout" | "lost" | "rejected"`
  - `tool`
  - `action`
  - `summary`
  - `diagnostics[]`
  - `evidence?`
  - `resource? | resources?`
  - `metadata?`

  只定义 Phase 5A host-runtime foundation 需要的共享类型；不注册 MCP tools，不绑定 public action catalog。

- [ ] **步骤 3：定义 `mapPublicResultToMcpToolResult` foundation**

  在 `src/contracts/mcp-result.ts` 实现 `mapPublicResultToMcpToolResult(publicResult)`：

  - `content` 保持最小摘要输出。
  - `structuredContent` 直接保留 public result payload。
  - `isError` 由 `status !== "succeeded"` 推导。
  - `status`、`diagnostics`、`evidence`、`resource` / `resources` 不做扁平化丢失。

- [ ] **步骤 4：编写 TS foundation tests**

  在 `tests/host-runtime.test.ts` 中加入：

  - package script 断言：读取 `package.json` 并断言 `scripts.test === "node --experimental-strip-types --test tests/host-runtime.test.ts"`
  - `mapPublicResultToMcpToolResult` test preserving status, diagnostics and evidence
  - `timeout`、`lost`、`uncertain`、`failed`、`rejected` 的 `isError` 都为 `true`
  - `succeeded` 的 `isError` 为 `false`

  预期测试命名示例：

  - `packageJsonUsesStripTypesNodeTestScript`
  - `mapPublicResultToMcpToolResultPreservesStatusDiagnosticsAndEvidence`
  - `mapPublicResultToMcpToolResultPreservesResourceReferences`

- [ ] **步骤 5：运行 TS foundation tests**

  运行：

  ```bash
  cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
  ```

  预期输出至少包含：

  ```text
  ok 1 - packageJsonUsesStripTypesNodeTestScript
  ok 2 - mapPublicResultToMcpToolResultPreservesStatusDiagnosticsAndEvidence
  ```

  若失败，只修复 result foundation 或 MCP payload mapping；不要提前加入 host networking 实现。

## 任务 2：创建 Unity host DTOs 和 registry foundation

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

- [ ] **步骤 1：定义 Unity DTO models**

  在 `UnityAgentKitModels.cs` 中定义最小 DTO：

  - `UnityAgentKitHostRecord`
  - `UnityAgentKitProbeResponse`
  - `UnityAgentKitOperationRequest`
  - `UnityAgentKitOperationResponse`
  - `UnityAgentKitDiagnostic`
  - `UnityAgentKitThreadCheckResult`

  DTO 字段至少覆盖：`status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`，以及 `projectRoot`、`protocolVersion`、`port`、`inputJson` 等 registry/request 所需字段。

- [ ] **步骤 2：实现 registry foundation**

  `UnityAgentKitHostRegistry.cs` 负责：

  - 计算 project-scoped registry path
  - 写入 `UnityAgentKitHostRecord`
  - 读取同结构用于 Unity 侧自检
  - 记录 `hostId`、`hostEpoch`、`port`、`projectRoot`、`protocolVersion`

  registry body 必须使用 DTO JSON；state no `string concat / string search` as protocol body。

- [ ] **步骤 3：编写 Unity DTO 和 registry tests**

  在 `HostRuntimeTests.cs` 中增加：

  - registry path test
  - host record round-trip test
  - operation response envelope round-trip test
  - `OperationRequestJsonDeserializesToDto`
  - `OperationResponseDtoSerializesAndDeserializesRoundTrip`

  这两个测试必须使用 `UnityEngine.JsonUtility`，并直接断言字段值。`OperationResponseDtoSerializesAndDeserializesRoundTrip` 必须额外断言 `requestId`、`hostId`、`hostEpoch`、`startedAt`、`completedAt`、`durationMs`。

- [ ] **步骤 4：运行 Unity DTO tests**

  运行 Unity EditMode 测试命令，例如：

  ```bash
  /c/Program\ Files/Unity/Hub/Editor/2022.3.61f1/Editor/Unity.exe -batchmode -projectPath D:/ai/unity-claude-plugin/unity -runTests -testPlatform editmode -testResults D:/ai/unity-claude-plugin/artifacts/phase5a-editmode.xml -logFile D:/ai/unity-claude-plugin/artifacts/phase5a-editmode.log
  ```

  预期输出或结果文件显示：

  ```text
  OperationRequestJsonDeserializesToDto: Passed
  OperationResponseDtoSerializesAndDeserializesRoundTrip: Passed
  ```

  若失败，只修复 DTO shape 或 registry foundation；不要提前实现 HTTP server。

## 任务 3：实现 loopback HTTP `/probe` 和 dynamic registry

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

- [ ] **步骤 1：创建 host bootstrap 和 dynamic port 分配**

  `UnityAgentKitHost.cs` 负责 Editor 启动时创建 host identity、递增 `hostEpoch`、启动 loopback server、写 registry。端口必须是 dynamic port，而不是硬编码固定端口。

- [ ] **步骤 2：实现 `/probe` endpoint**

  `UnityAgentKitLoopbackHttpServer.cs` 至少支持：

  - `GET /probe`
  - 返回 `UnityAgentKitProbeResponse`
  - 使用 `UnityEngine.JsonUtility.ToJson(response)` 生成响应体
  - `Content-Type: application/json`

  `/probe` 响应字段至少包含 `hostId`、`hostEpoch`、`projectRoot`、`protocolVersion`、`port`。

- [ ] **步骤 3：写入 dynamic registry**

  server 启动成功后，把分配出的实际端口写回 registry；如果 host 重启，必须写入新的 `hostEpoch`，避免旧 registry continuity 被误用。

- [ ] **步骤 4：编写 `/probe` integration tests**

  在 `HostRuntimeTests.cs` 中增加：

  - dynamic port test
  - `ProbeEndpointReturnsHostIdentityOverHttp`

  `ProbeEndpointReturnsHostIdentityOverHttp` 必须通过真实 HTTP 调用 `/probe`，再使用 `UnityEngine.JsonUtility.FromJson<UnityAgentKitProbeResponse>` 反序列化并断言字段；不得通过 `string contains` 或字符串搜索验证。

- [ ] **步骤 5：运行 Unity `/probe` tests**

  运行与任务 2 相同的 Unity EditMode 测试命令。

  预期输出至少包含：

  ```text
  ProbeEndpointReturnsHostIdentityOverHttp: Passed
  ```

  若失败，只修复 loopback bootstrap、dynamic port 或 probe DTO；不要提前实现 `/operations`。

## 任务 4：实现 main-thread dispatch 和 `/operations` internal path

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

- [ ] **步骤 1：实现 main-thread capture 和 dispatch foundation**

  implementation text must say `UnityAgentKitMainThread` captures Unity main thread id and `/operations` deserializes DTO JSON, dispatches to main thread, serializes DTO envelope JSON.

  `UnityAgentKitMainThread` 至少提供：

  - Unity 启动时捕获主线程 id
  - `Run(Func<UnityAgentKitOperationResponse>)` 或等价 API
  - 超时保护，形成 host-level safety timeout

- [ ] **步骤 2：实现最小 operation router**

  `UnityAgentKitOperationRouter.cs` 至少支持：

  - `host.echo`
  - `host.threadCheck`
  - unknown operation → structured `rejected`
  - malformed request → structured `failed` with operation `host.invalidRequest`

  `host.echo` 返回 request payload；`host.threadCheck` 返回 `UnityAgentKitThreadCheckResult`，包括 `capturedMainThreadId`、`executionThreadId`、`ranOnMainThread`。

- [ ] **步骤 3：实现 `/operations` HTTP endpoint**

  `UnityAgentKitLoopbackHttpServer.cs` 增加：

  - `POST /operations`
  - 使用 `UnityEngine.JsonUtility.FromJson<UnityAgentKitOperationRequest>` 反序列化 body
  - dispatch 到主线程执行 router
  - 使用 `UnityEngine.JsonUtility.ToJson(response)` 返回 `UnityAgentKitOperationResponse`

- [ ] **步骤 4：编写真实 `/operations` tests**

  `HostRuntimeTests.cs` 至少覆盖：

  - `host.echo` over real HTTP `/operations`
  - rejected unknown operation
  - real HTTP `/operations` response deserialized with `UnityEngine.JsonUtility.FromJson<UnityAgentKitOperationResponse>`
  - 对每个 operation envelope 逐字段断言 `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`
  - `host.threadCheck` test over real HTTP `/operations`, deserializing `UnityAgentKitThreadCheckResult`, asserting `ranOnMainThread`, and equality of captured/execution thread ids
  - malformed JSON test returning structured `failed` envelope with operation `host.invalidRequest`

- [ ] **步骤 5：补齐 dispatch exception 和 timeout tests**

  在 router 中加入专用测试 operation，例如 `host.throw`、`host.sleepForTimeout` 或等价内部测试 operation，并编写：

  - dispatch exception test：返回 `failed`，diagnostics DTO JSON 包含 source=`host`、severity=`error`、message、operation 名称
  - host-level safety timeout test：返回 `timeout`，diagnostics DTO JSON 说明 timeout 来源和等待时长

  这些断言必须基于 DTO JSON 反序列化后逐字段比较，不使用字符串包含判断。

- [ ] **步骤 6：运行 Unity `/operations` tests**

  运行 Unity EditMode 测试命令。

  预期输出至少包含：

  ```text
  host.threadCheck: Passed
  MalformedJsonReturnsStructuredFailedEnvelope: Passed
  DispatchExceptionReturnsStructuredDiagnostics: Passed
  HostLevelSafetyTimeoutReturnsTimeoutEnvelope: Passed
  ```

  若失败，只修复 dispatch、router 或 DTO envelope；不要把 workflow polling 加进 Unity host。

## 任务 5：实现 TS registry/probe/invoke/rebind client

**文件：**
- 创建：`plugins/unity-agent-kit/src/host/registry.ts`
- 创建：`plugins/unity-agent-kit/src/host/http-client.ts`
- 创建：`plugins/unity-agent-kit/src/host/rebind.ts`
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts`
- 创建：`plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts`

- [ ] **步骤 1：实现 TS registry reader**

  `registry.ts` 负责读取 Unity 写入的 host registry DTO，并校验：

  - registry 文件存在
  - JSON 可解析
  - protocolVersion 正确
  - projectRoot 指向 `unity/`
  - hostId、hostEpoch、port 非空

  读取结果必须保留后续 active probe 所需的完整 identity 字段，不能在读取阶段丢失 `hostId`、`hostEpoch` 或 `projectRoot`。

- [ ] **步骤 2：实现 TS HTTP client**

  `http-client.ts` 负责：

  - probe active host
  - invoke `/operations`
  - 对非 2xx、JSON parse failure、network error 形成 host diagnostics
  - 将 Unity DTO envelope 映射为 public-result foundation

  `invokeOperation` 必须允许以真实 HTTP 请求调用 `host.threadCheck`，供任务 6 的 `phase5a-vertical-smoke` 直接复用。

- [ ] **步骤 3：实现 rebind / lost foundation**

  `rebind.ts` 负责：

  - 比较 registry host record 与 probe response
  - 识别 wrong protocol
  - 识别 host restart 后的 mismatched hostId/hostEpoch after restart
  - 决定返回 `lost`、触发 rebind、或拒绝继续复用旧 host continuity

  这里必须把 restart/domain reload continuity 写成明确规则：一旦 active probe 与既有 continuity 不匹配，就视为 `old hostId / hostEpoch continuity is invalidated`，返回 `lost or rebind decision`，不得继续消费旧 host envelope。

- [ ] **步骤 4：编写 TS host client coverage**

  `tests/host-runtime.test.ts` 至少覆盖：

  - wrong protocol
  - mismatched hostId/hostEpoch after restart
  - timeout mapping
  - envelope mapping preserving `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`
  - MCP tool result mapping preserving those envelope metadata fields via payload together with status/diagnostics/evidence/resource references
  - `controlled registry/probe rebind simulation`，命名示例：`controlledRegistryProbeRebindSimulationInvalidatesOldContinuity`

  `tests/phase5a-vertical-smoke.test.ts` 必须专门承载 `phase5a-vertical-smoke` live-host vertical smoke。

  `phase5a-vertical-smoke` 必须显式断言：

  - TS 读取 Unity registry DTO 成功
  - TS active probe 命中真实 `/probe`
  - TS 通过真实 HTTP `/operations` 调用 `host.threadCheck`
  - 返回 envelope 被映射为 public result，并保留 `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`
  - `TS public result → MCP tool result payload` 通过 payload 保留这些 envelope metadata fields，以及 status、diagnostics、evidence、resource references

  `controlled registry/probe rebind simulation` 必须显式断言：

  - 构造旧 continuity registry record 与新的 active probe response
  - `hostId / hostEpoch mismatch` 时 `old hostId / hostEpoch continuity is invalidated`
  - TS 返回 `lost` 或 rebind decision，而不是旧 host success

- [ ] **步骤 5：运行 TS host client tests**

  运行：

  ```bash
  cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
  ```

  预期输出至少包含：

  ```text
  ok - detects wrong protocol
  ok - detects hostIdHostEpochMismatchAfterRestart
  ok - controlledRegistryProbeRebindSimulationInvalidatesOldContinuity
  ok - preservesStatusDiagnosticsEvidenceAndResourcesInMcpPayload
  ```

  若失败，只修复 TS registry/probe/invoke/rebind foundation；不要注册 MCP tools。

## 任务 6：验证 Phase 5A vertical smoke path 和 completion evidence

**文件：**
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts`
- 创建：`plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs`
- 读取：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
- 后续阶段再修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`

- [ ] **步骤 1：运行 plan content check**

  执行文档内容检查，确认本 plan 保留关键字符串、无占位词、无字符串包含式断言、无错误 TS 测试脚本。预期输出：

  ```text
  PASS Phase 5A plan content is ready for review gate
  ```

- [ ] **步骤 2：运行 TS 测试命令并记录 evidence**

  常规 TS 命令只运行非 live-host 单测：

  ```bash
  cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
  ```

  `phase5a-vertical-smoke.test.ts` 不能被该命令的 glob 间接包含；standalone `phase5a-vertical-smoke.test.ts` pass/skip 不可作为 completion evidence。regular TS evidence only covers non-live host runtime unit tests。

  记录至少以下 evidence：

  - result foundation tests 通过
  - registry/probe/invoke/rebind simulations 通过
  - envelope mapping 通过
  - timeout mapping 通过
  - MCP payload preservation 通过
  - `controlled registry/probe rebind simulation` 通过，并记录 `lost or rebind decision`

- [ ] **步骤 3：运行 Unity EditMode 测试命令并记录 evidence**

  运行：

  ```bash
  "${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests
  ```

  该 Unity 测试内部必须启动：

  ```bash
  cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/phase5a-vertical-smoke.test.ts
  ```

  `HostRuntimeVerticalSmokeTests` 负责在 Node 进程运行期间保持真实 loopback host alive，Node 退出后再停止 host。Unity test keeps the loopback host alive while Node probes and invokes it。

  记录至少以下 evidence：

  - DTO JSON round-trip
  - 真实 `/probe` HTTP response`
  - 真实 `/operations` HTTP request`
  - `host.threadCheck`
  - `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`
  - Malformed JSON structured failed envelope
  - dispatch exception
  - host-level safety timeout
  - Unity-side restart/domain reload evidence，或 controlled registry/probe rebind simulation 对应的 Unity probe identity 变化证据

- [ ] **步骤 4：验证最小 vertical smoke path 全链路**

  必须用 `HostRuntimeVerticalSmokeTests` + `phase5a-vertical-smoke.test.ts` 的具体测试与断言证明以下链路，而不是只写概念图：

  ```text
  Unity writes registry → TS reads registry → TS probes `/probe` → TS invokes real HTTP `/operations` → Unity dispatches to captured main thread via `host.threadCheck` → TS maps envelope/public result
  ```

  固定编排要求：

  - Unity EditMode 测试先启动真实 loopback host，并把 registry 路径传给 Node 子进程
  - Unity test keeps the loopback host alive while Node probes and invokes it
  - Node 子进程运行 `node --experimental-strip-types --test tests/phase5a-vertical-smoke.test.ts`
  - Node 退出码为 0 才算通过；Unity 随后停止 host

  最低断言要求：

  - Unity registry 文件中的 `hostId`、`hostEpoch`、`port` 被 TS 成功读取
  - `/probe` response 与 registry identity 一致
  - `/operations` 返回的 `host.threadCheck` envelope 经过 TS 映射后仍保留 `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`，以及 status、diagnostics、evidence
  - Unity 断言 `ranOnMainThread == true` 与 `capturedMainThreadId == executionThreadId`

  若任一节点失败，本 subplan 不可完成。

- [ ] **步骤 5：验证 host restart/domain reload epoch evidence**

  必须新增并记录以下至少一类验证：

  - Unity-side restart/domain reload test，证明 host 重启或 domain reload 后 active probe identity 改变；或
  - `controlled registry/probe rebind simulation`，显式构造旧 registry continuity 与新 probe identity 不一致的场景

  两类验证都必须证明：

  - `old hostId / hostEpoch continuity is invalidated`
  - TS 在 active probe 之后返回 `lost` 或 rebind decision
  - 不会把旧 host continuity 下的 success envelope 继续当作当前 host 结果

  该证据必须同时映射到任务 5 的 TS tests 和任务 6 的 completion evidence。

- [ ] **步骤 6：准备 completion evidence 文本**

  completion evidence 必须明确列出命令、关键测试名、PASS 输出和结构化验证点，不接受 `done`、`tested` 或泛化描述。

  必须逐字包含：

  ```bash
  "${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests
  ```

  并说明该 Unity 测试内部运行：

  ```bash
  cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/phase5a-vertical-smoke.test.ts
  ```

  against the live loopback host。evidence text 必须显式出现：`phase5a-vertical-smoke.test.ts`、`HostRuntimeVerticalSmokeTests`、`host.threadCheck`、`captured Unity main thread`、`old hostId / hostEpoch continuity is invalidated`、`lost or rebind decision`。

- [ ] **步骤 7：在实际 5A 执行完成后更新 plan index 为 completed**

  只有当 5A 后续执行阶段真正完成且 evidence 已记录后，才允许更新 `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` 中对应行与 completion evidence。此步骤属于 5A execution 收尾，不属于本次 plan 创建动作。evidence text 应包含：真实 probe/operations tests、main-thread dispatch、timeout/exception handling、host restart detection、MCP payload preservation。

## MCP Tool Result Mapping Foundation

5A 只定义 MCP Tool Result Mapping Foundation，不注册 MCP tools。

- `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs` 必须通过 payload preserved exactly；不得把这些 envelope metadata fields 扁平化丢失或改写。
- `diagnostics` preserved without flattening severity/source/attribution/message；调用方后续仍能读取完整 diagnostics shape。
- `evidence`、`resource`、`resources` 等字段 remain inside payload，不因转换到 MCP tool result 而丢失。
- `structuredContent` 保留完整 public result foundation，供后续 MCP public tool registration 直接复用。
- `content` 只提供最小摘要，不承载唯一事实来源。
- `isError` derived from `status !== "succeeded"`。

## Subplan Completion Evidence

完成 5A 执行时，必须附上以下命令和证据：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

standalone `phase5a-vertical-smoke.test.ts` pass/skip 不可作为 completion evidence；regular TS evidence only covers non-live host runtime unit tests；live-host vertical smoke 必须由下面的 Unity EditMode harness 驱动，并由其内部运行 `node --experimental-strip-types --test tests/phase5a-vertical-smoke.test.ts`。

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests
```

并明确说明该 Unity 测试内部运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/phase5a-vertical-smoke.test.ts
```

against the live loopback host。

证据必须至少覆盖：

- DTO JSON round-trip：`OperationRequestJsonDeserializesToDto` 和 `OperationResponseDtoSerializesAndDeserializesRoundTrip` 通过。
- real probe HTTP response deserialized into DTOs：`ProbeEndpointReturnsHostIdentityOverHttp` 使用 `UnityEngine.JsonUtility.FromJson<UnityAgentKitProbeResponse>`。
- regular TS evidence only covers non-live host runtime unit tests：result foundation、registry/probe/invoke/rebind simulations、envelope mapping、timeout mapping、MCP payload preservation、controlled rebind simulation。
- `phase5a-vertical-smoke.test.ts` 与 `HostRuntimeVerticalSmokeTests`：必须明确记录这段链路：Unity writes registry → TS reads registry → TS probes `/probe` → TS invokes `/operations`，并继续记录 `host.threadCheck` 如何 dispatch 到 captured Unity main thread，以及 TS 如何映射 envelope/public result；standalone `phase5a-vertical-smoke.test.ts` pass/skip 不可作为 completion evidence。
- Unity test keeps the loopback host alive while Node probes and invokes it。
- real operations HTTP request dispatches to captured Unity main thread through `host.threadCheck`，并断言 `ranOnMainThread == true`、`capturedMainThreadId == executionThreadId`，证明命中了 `captured Unity main thread`。
- Malformed JSON structured failed envelope：operation 为 `host.invalidRequest`，返回结构化 `failed` envelope。
- dispatch exception：返回结构化 diagnostics DTO JSON，包含 host source 和 error severity。
- host-level timeout：返回 `timeout` envelope，并说明 may-still-be-running 语义仅限 host-level safety timeout。
- host restart/domain reload epoch evidence：必须提供 Unity-side restart/domain reload 测试，或 `controlled registry/probe rebind simulation` 结果，证明 `old hostId / hostEpoch continuity is invalidated`。
- `lost or rebind decision`：TS 在 active probe 后基于新 identity 返回 `lost` 或 rebind decision，而不是继续复用旧 host continuity。
- MCP tool result payload preservation：TS public result → MCP tool result payload 通过 payload 保留 `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`，以及 status、diagnostics、evidence、resource references。

## Roadmap Phase Upgrade Check

当前 subplan 仍然属于 Phase 5 内部拆分执行单元，不是正式 roadmap phase。

若后续发现 Host Runtime foundation 需要独立 roadmap goal、跨 phase blocker 管理、单独 completion cadence，必须先走 roadmap 结构调整；在该调整发生前，Phase 5A 仍保持 subplan 身份，不单独升级为 roadmap phase。
