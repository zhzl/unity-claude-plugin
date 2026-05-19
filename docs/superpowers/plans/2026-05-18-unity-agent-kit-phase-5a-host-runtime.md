# Unity Agent Kit Phase 5A Host Runtime Technical Contract

> **执行边界警告：** 本文件不是 executable implementation plan，不得直接交给 `subagent-driven-development` 或 `executing-plans` 执行。实际实现必须拆入严格 execution plans，并统一受 `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` 管理。

**目标：** 定义 Unity Agent Kit Phase 5A Host Runtime 的 technical contract，明确 TS package skeleton、result foundation、MCP payload mapping foundation、Unity DTO/registry、loopback `/probe`、main-thread dispatch、`/operations`、TS registry/probe/invoke/rebind client 和最小 vertical smoke path 的约束、边界与验收证据。

**架构：** Unity C# host 位于 `unity/Assets/UnityAgentKit/`，负责短主线程动作、registry 写入、loopback HTTP、operation routing、DTO envelope、lifecycle cleanup 和 host restart/epoch continuity。TS host client 位于 `plugins/unity-agent-kit/src/host/`，负责读取 registry、probe active host、invoke `/operations`、rebind/lost/error classification，并把 host envelope 映射到 public-result foundation。`plugins/unity-agent-kit/src/contracts/` 只定义最小 MCP tool result payload 映射基础，不注册 MCP tools 或绑定具体 public action schema。

**技术栈：** TypeScript ESM、Node.js built-in test runner、Unity 2022.3.61f1 Editor C#、Unity EditMode tests、loopback HTTP、JSON DTO。
**拆分检查：** 已检查；本 technical contract 保持 Phase 5A 单一 formal subplan，实际执行由 execution plan set 管理，最多允许 8 个 active sibling execution plans。若出现第 9 个 active sibling execution plan，或无法继续保持 strict writing-plans discipline，必须触发 formal subplan split review。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`
**Plan Index:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
**Execution Index:** `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
**Subplan:** Phase 5A

## Contract Requirement Index

| ID | Requirement | Source section | Covered by execution plan | Evidence |
|---|---|---|---|---|
| 5A-RESULT-01 | Public result foundation defines `succeeded`, `failed`, `uncertain`, `cancelled`, `timeout`, `lost`, and `rejected` status semantics. | `Operation / Result / Envelope Contract` | 5A-01 candidate | TS unit evidence |
| 5A-RESULT-02 | Diagnostics preserve source, severity, code, message, details, attribution, and failure metadata. | `Operation / Result / Envelope Contract` | 5A-01 candidate | TS + Unity DTO evidence |
| 5A-MCP-01 | MCP tool result mapping keeps full public result in `structuredContent`, summary-only `content`, and `isError = status !== succeeded`. | `MCP Tool Result Mapping Foundation` | 5A-01 candidate | TS mapping evidence |
| 5A-DTO-01 | Unity DTOs define host record, probe response, operation request, operation response, diagnostics, and thread check result minimum fields. | `Contract Area 2：创建 Unity DTOs 和 registry foundation` | 5A-02 candidate | Unity DTO round-trip evidence |
| 5A-DTO-02 | `/operations` response is top-level `UnityAgentKitOperationResponse`; nested v2 data envelope compatibility is not adopted. | `Operation / Result / Envelope Contract` | 5A-05 candidate | Unity operation envelope evidence |
| 5A-REG-01 | `projectRoot` is derived from `Application.dataPath`, not `Environment.CurrentDirectory`. | `Contract Area 2：创建 Unity DTOs 和 registry foundation` | 5A-02 candidate | Unity registry evidence |
| 5A-REG-02 | Host continuity identity uses `hostId + hostEpoch`; restart/reload creates a new host identity and increments epoch. | `Contract Area 2：创建 Unity DTOs 和 registry foundation` | 5A-02 candidate | Unity registry + restart evidence |
| 5A-REG-03 | TS registry reader performs strict validation and stable failure classification for missing, invalid JSON, invalid shape, invalid port, disappearance after seen, and unexpected fs errors. | `Contract Area 5：实现 TS registry/probe/invoke/rebind client` | 5A-07 candidate | TS registry evidence |
| 5A-HTTP-01 | Canonical `GET /probe` uses `http://127.0.0.1:{port}/probe` and validates active host fields. | `Contract Area 3：实现 loopback HTTP /probe、dynamic registry 和 host lifecycle` | 5A-04 candidate | Unity probe + TS probe evidence |
| 5A-HTTP-02 | Canonical `POST /operations` returns structured operation envelopes and structured 404/405/400 transport failures. | `Contract Area 4：实现 main-thread dispatch、/operations 和 HTTP protocol contract` | 5A-05 candidate | Unity HTTP protocol evidence |
| 5A-HTTP-03 | HTTP responses set JSON content type, UTF-8 body/framing, and close readable response streams. | `Contract Area 3 / Contract Area 4 HTTP protocol sections` | 5A-04 and 5A-05 candidates | Unity HTTP evidence |
| 5A-LIFE-01 | Host does not start during compiling/updating and retries on update tick after those states end. | `Contract Area 3：实现 loopback HTTP /probe、dynamic registry 和 host lifecycle` | 5A-03 candidate | Unity lifecycle evidence |
| 5A-LIFE-02 | Reload, quitting, and Stop clean up listener, record, update/drain callback, and pending work; old listener no longer responds. | `Contract Area 3 lifecycle and Contract Area 4 dispatch cleanup sections` | 5A-03 candidate | Unity cleanup evidence |
| 5A-OPS-01 | Operation normalization handles trim, missing/empty operation, unknown operation, malformed JSON, and stable status/code table. | `Operation / Result / Envelope Contract` | 5A-05 candidate | Unity router evidence |
| 5A-OPS-02 | Minimal operations include `host.echo` and `host.threadCheck`; no 5A public action business logic is implemented. | `Contract Area 4：实现 main-thread dispatch、/operations 和 HTTP protocol contract` | 5A-05 and 5A-06 candidates | Unity operation evidence |
| 5A-DISPATCH-01 | `/operations` dispatches short work to the captured Unity main thread and proves `host.threadCheck` runs on that thread. | `Contract Area 4 main-thread dispatch sections` | 5A-06 candidate | Unity dispatch evidence |
| 5A-DISPATCH-02 | Dispatch exception and expired work produce structured diagnostics and expired queued work does not execute later. | `Contract Area 4 exception and pending work sections` | 5A-06 candidate | Unity dispatch failure evidence |
| 5A-TIMEOUT-01 | Host-level timeout uses a non-blocking pending dispatch hook and never blocks Unity main thread or HTTP handler. | `Timeout Contract 分层` | 5A-06 candidate | Unity timeout evidence |
| 5A-TIMEOUT-02 | Host-level timeout, transport/request timeout, and workflow timeout are separated; workflow timeout remains out of scope for 5A. | `Timeout Contract 分层` | 5A-06 and 5A-07 candidates | Unity + TS timeout evidence |
| 5A-REBIND-01 | TS active validation checks `hostId`, `hostEpoch`, `projectRoot`, `protocolVersion`, `port`, and `status` using registry plus probe. | `Contract Area 5：实现 TS registry/probe/invoke/rebind client` | 5A-07 candidate | TS probe validation evidence |
| 5A-REBIND-02 | Pre-operation rebind is bounded and single-pass where allowed; infinite retry is forbidden. | `Contract Area 5 rebind sections` | 5A-07 candidate | TS rebind evidence |
| 5A-REBIND-03 | In-flight operations are not replayed to a new host, and post-response identity drift returns stale/lost instead of success. | `Contract Area 5 rebind sections` | 5A-07 candidate | TS stale/lost evidence |
| 5A-REBIND-04 | TS preserves the most specific diagnostic priority across not_ready, restarted, stale instance, registry disappearance, and transport failures. | `Contract Area 5 diagnostic priority sections` | 5A-07 candidate | TS diagnostic priority evidence |
| 5A-EVIDENCE-01 | Non-live TS evidence covers result mapping, registry validation, TS client simulations, timeout classification, and MCP payload preservation. | `Subplan Completion Evidence` | 5A-08 candidate | `node --experimental-strip-types --test tests/host-runtime.test.ts` |
| 5A-EVIDENCE-02 | Unity HostRuntimeTests cover DTO, registry, lifecycle, HTTP protocol, dispatch/timeout, and result envelope behavior. | `Subplan Completion Evidence` | 5A-08 candidate | Unity `HostRuntimeTests` command |
| 5A-EVIDENCE-03 | Live vertical smoke is driven by Unity `HostRuntimeVerticalSmokeTests`, which keeps the loopback host alive while Node probes and invokes it. | `Phase 5A 最小 vertical smoke path` | 5A-08 candidate | Unity vertical smoke command |
| 5A-EVIDENCE-04 | Phase 5A is completed only after all active sibling execution plans, final vertical smoke evidence, and plan index completion evidence pass. | `Subplan Completion Evidence` / `Roadmap Phase Upgrade Check` | 5A-08 candidate | Plan index completion evidence |

## 上游约束摘要

- **Roadmap Shared Constraints**
  - Phase 5A 继续采用 `unity-mcp-v2` 的 host runtime、loopback HTTP、registry/probe、operation envelope、host rebirth / rebind 基线。
  - TS 负责 registry 读取、active host 验证、lost/rebind 判断、最终 public result 收敛；Unity C# 只负责短主线程动作、DTO JSON 收发、registry 写入和最小 operation routing。
  - 保持单一 Unity C# host source tree：`unity/Assets/UnityAgentKit/` 是唯一 C# host 目录，不在 TS 插件目录复制第二份 host。
  - public schema、MCP tool 注册、workflow 编排和长时间等待不进入本 subplan；这些职责继续留在 TS 更高层或后续 subplans。
- **Phase Scope**
  - 5A 只覆盖 Host Runtime foundation：TS package skeleton、result foundation、MCP payload mapping foundation、Unity DTO、registry、`/probe`、`/operations`、main-thread dispatch、host lifecycle cleanup、host restart/epoch validation 和最小 vertical smoke path。
  - 5A 最终验证目标是：真实 `/probe` HTTP response、真实 `/operations` HTTP request、main-thread dispatch、DTO envelope、non-blocking pending dispatch hook 触发的 host-level timeout failure、dispatch exception diagnostics、host restart/epoch detection、TS rebind/classification，以及 TS public result → MCP tool result payload mapping。
  - 5A host-level safety timeout only；timeout evidence 必须使用 non-blocking pending dispatch hook。transport/request timeout 只在 TS client 归类为 transport diagnostic；workflow timeout 属于 5B。
- **Phase Out-of-scope**
  - 5A 不实现 19 public action business logic。
  - 5A 不实现 artifact/resource store、MCP Resource handlers、TestRunner、CompileDiagnostics、Console readback、PlayMode transition、Screenshot capture。
  - 5A 不实现 `/unity` skill、MCP public tool registration 或 final daily loop E2E。
  - 5A 不实现 workflow-level timeout/polling、resource URI handler、完整 diagnostics workflow、candidate action orchestration。
- **状态口径**
  - Phase 5A plan 已进入 planned 状态。只有后续执行阶段产出 completion evidence 后，才能把 plan index 对应行更新为 completed；不得在计划阶段把 planned 状态误写成 completed。

## Phase 1-4 Compliance Matrix

| 上游 Phase | 适用约束 | 本 subplan 如何满足 | 落地任务 | 验证 |
|---|---|---|---|---|
| Phase 1 | 单一 Unity host、TS/C# 明确分层、基于 v2 host runtime 演进 | 仅在 `unity/Assets/UnityAgentKit/` 建立单一 C# host source tree；TS 仅实现 registry/probe/invoke/rebind client 与 public-result foundation | 任务 2、3、4、5 | Unity EditMode tests 覆盖 DTO、registry、lifecycle、probe、operations；TS 运行 `node --experimental-strip-types --test tests/host-runtime.test.ts` 覆盖 registry/probe/invoke/rebind 单测 |
| Phase 2 | `/unity` 是薄路由 skill，skill 不承载运行时实现 | 5A 只提供供后续 `/unity` 薄路由依赖的 host runtime foundation，不在本计划注册 MCP tools 或写 skill recipe | 任务 1、5、6 | TS tests 仅验证 result foundation、host client 与 `TS public result → MCP tool result payload`；evidence 中不得出现 MCP tool 注册或 `/unity` skill 文件 |
| Phase 3 | public result status enum、tool/action 与 internal operation 分离 | 在 `plugins/unity-agent-kit/src/contracts/` 只定义最小 public-result foundation 与 MCP payload mapping foundation；Unity `/operations` 只暴露 internal operation，如 `host.echo`、`host.threadCheck` | 任务 1、4、5 | TS tests 覆盖 result mapping；Unity tests 覆盖 operation normalization、unknown operation → structured `rejected` |
| Phase 4 | TS 负责 timeout/polling/final judgment；Unity 负责短主线程动作、DTO/result envelope、host rebirth / rebind 限制恢复 | 5A 只实现 host-level safety timeout、DTO JSON round-trip、captured Unity main thread dispatch、lost/rebind foundation；不进入 workflow-level timeout/polling | 任务 2、4、5、6 | Unity tests 覆盖 host-level timeout、stop/reload pending failure、expired work 不执行；TS tests 覆盖 host restart/stale/rebind classification |

## unity-mcp-v2 Reference Mapping

| 能力域 | 参考输入 | 采用机制 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|---|
| loopback HTTP host | `UnityMcpV2LoopbackHttpServer`、`BuildProbeUrl`、`BuildOperationsUrl`、`Start`、`Stop`、route tests | 采用真实 loopback HTTP host，canonical endpoints 固定为 `GET /probe` 与 `POST /operations`；URL helper 固定为 `http://127.0.0.1:{port}/probe` 和 `/operations` | v2 public compatibility layer、legacy public tools、`/operations` host.probe 作为 canonical probe | 5A 只落地 host runtime foundation；canonical probe 是 `GET /probe` | 任务 3、4、6 |
| registry/probe | `UnityMcpV2HostRegistry`、`HostRegistryRecord`、`readHostRegistry`、`validateReadyHost`、`validateProbeResponse`、`sameHostIdentity` | 采用 Unity writes registry → TS reads registry → TS probes `/probe`，并按 `hostId`、`hostEpoch`、`projectRoot`、`protocolVersion`、`port`、`status` 做 registry + active probe 双重校验 | 跳过 active probe 只信任静态文件 | 静态文件无法证明旧 continuity 仍有效 | 任务 2、3、5、6 |
| main-thread dispatch | `MainThreadDispatchTimeoutMs`、`MainThreadQueue`、`DrainMainThreadQueue`、`FailPendingMainThreadWork`、entry callbacks | 采用 captured Unity main thread + queue-drain 模式；HTTP handler 只做 DTO parse/serialize，短 operation 通过主线程队列执行 | 后台线程直接访问 Unity API、long workflow waiting、阻塞 Unity 主线程 | 5A 只允许短主线程动作；长时间等待和 workflow 编排属于 5B | 任务 4、6 |
| operation / envelope / DTO | `UnityMcpV2OperationRequest`、`UnityMcpV2OperationResponse`、`NormalizeOperation`、router、kernel envelope | 采用 top-level `UnityAgentKitOperationResponse`；TS 映射到 public result foundation 和 MCP payload，保留完整 status/diagnostics/evidence/resource metadata | nested v2 data envelope compatibility、legacy public tool schema | 5A 不继承旧 public tool compatibility layer | 任务 1、4、5、6 |
| host rebirth / rebind | `_epoch`、`ShouldSkipStart`、`StartHost`、`StopForReload`、`executeAgainstHost`、`isPreOperationRetryable`、`preserveMostSpecificError` | 采用 registry identity + active probe + bounded pre-operation rebind + in-flight no replay + post-response identity drift check | 无限重试、in-flight 自动重放、跨 restart 复用旧 continuity | 防止把旧 host envelope 误判为当前 host 成功结果 | 任务 3、5、6 |
| JSON / protocol parsing | `JsonUtility.FromJson`、`JsonUtility.ToJson`、`parseJsonObject`、逐字段读取 | `/probe` 与 `/operations` 全部使用 DTO JSON parse/serialize；request context preservation 通过 DTO parse 取得 operation/requestId | string concat/string search 作为主协议 | 字符串搜索无法证明 DTO shape、diagnostics shape 和 protocol continuity | 任务 2、3、4、5、6 |

## Quality Gate

| Gate | 最低信心分 | 达标条件 | 未达标处理 |
|---|---|---|---|
| Lifecycle cleanup | 8/10 | `isCompiling/isUpdating` 不启动；compile/updating 结束后 update tick 可重试；reload/quitting/Stop 清理 server、listener、drain callback、pending work；旧 listener 不再响应 | 若低于 8，只修复 `UnityAgentKitHost.cs`、`UnityAgentKitLoopbackHttpServer.cs`、`UnityAgentKitMainThread.cs` lifecycle，不扩展 operation catalog |
| Registry contract | 8/10 | `UnityAgentKitHostRecord` 最小字段、projectRoot derivation、epoch increment、hostId refresh、TS registry validation 和 failure classification 全部有测试 | 若低于 8，先补 registry DTO 与 TS reader；不得进入 rebind optimistic path |
| HTTP protocol | 8/10 | `GET /probe`、`POST /operations`、404/405/400 structured envelope、JSON content-type/framing/closed stream、URL helper/127.0.0.1 全部有测试 | 若低于 8，先补 transport contract；不得用字符串搜索或内存 stub 替代 |
| Main-thread dispatch | 8/10 | `host.threadCheck` 证明 dispatch 到 captured Unity main thread；stop/reload pending failure 与 expired work 不执行有测试 | 若低于 8，停止扩展 operation catalog，只修复 dispatch foundation |
| TS rebind/classification | 8/10 | ready/not_ready、invalid shapes、pre-operation bounded rebind、in-flight no replay、post-response identity drift、stable diagnostic priority 全部有测试 | 若低于 8，禁止把 runtime 标记为 stable foundation |
| Result/envelope contract | 8/10 | operation normalization、status/code table、diagnostic minimum shape、failure metadata preservation、unknown status fail-closed 全部有测试 | 若低于 8，停止 TS client 开发，先补齐 DTO/result contract |
| Timeout layering | 8/10 | host-level timeout、transport/request timeout、workflow timeout out-of-scope、stop/reload pending failure not timeout 全部有测试 | 若低于 8，只修 timeout classification，不加入 workflow timeout/polling |
| Vertical smoke path | 8/10 | Unity writes registry → TS reads registry → TS probes `/probe` → TS invokes real `/operations` → Unity main-thread dispatch → TS maps envelope/public result 可验证 | 若低于 8，必须补强最小链路证据，不扩展业务逻辑 |
| MCP payload mapping foundation | 8/10 | `mapPublicResultToMcpToolResult` 保留 full public result、diagnostics/evidence/resource/resources/metadata/job?/nextStep?/envelope metadata | 若低于 8，禁止进入 MCP tool registration 子计划 |

低分处理规则：任何 gate 低于 8/10 时，本 subplan 保持 planned/incomplete 状态，只允许继续做提高该 gate 置信度的最小修复；不得借机扩展到 5B-5E 范围。

## 文件结构

本 technical contract 覆盖以下 future implementation candidate files；实际创建或修改这些文件时，必须由展开后的 strict execution plans 执行。不得在本合同修订中创建 5A 范围外文档或更新 split landing、experience doc、roadmap、plan index（除 execution completion 收尾明确要求外）：

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
3. `phase5a-vertical-smoke.test.ts` 读取 Unity 写入的 registry DTO，调用真实 `GET /probe`，再调用真实 `POST /operations` 的 `host.threadCheck`。
4. Node 测试把 `/operations` 返回的 envelope 映射到 public result 与 MCP payload，并断言 payload 保留 `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`；`structuredContent` 继续保留 status、diagnostics、evidence、resource references。
5. Unity 测试等待 Node 进程退出；若退出码非 0 则直接失败；随后显式停止 host，并记录 Unity-side cleanup evidence。

```text
Unity writes registry → TS reads registry → TS probes `/probe` → TS invokes `/operations` → Unity dispatches to captured main thread via `host.threadCheck` → TS maps envelope/public result
```

该 `/operations` 调用必须是真实 HTTP `/operations` 请求，不允许用内存 stub 替代，也不依赖独立长驻 Unity 进程。lifecycle evidence 不能只靠 TS simulation，必须有 Unity-side cleanup evidence。

## Contract Area 1：创建 TS package skeleton、result foundation 和 MCP payload mapping

**文件：**
- Future implementation candidate：`plugins/unity-agent-kit/package.json`
- Future implementation candidate：`plugins/unity-agent-kit/src/contracts/result.ts`
- Future implementation candidate：`plugins/unity-agent-kit/src/contracts/mcp-result.ts`
- Future implementation candidate：`plugins/unity-agent-kit/tests/host-runtime.test.ts`

- **Contract detail 1：创建最小 package skeleton 和固定测试脚本**

  在 `plugins/unity-agent-kit/package.json` 中创建最小 ESM package，包含固定脚本：

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

- **Contract detail 2：定义 public-result foundation contract**

  在 `src/contracts/result.ts` 定义 5A 最小 public result foundation：

  - `status: "succeeded" | "failed" | "uncertain" | "cancelled" | "timeout" | "lost" | "rejected"`
  - `tool`, `action`, `summary`
  - `diagnostics[]`，minimum shape 支持 `source`, `severity`, `code?`, `message`, `details?`, `attribution?`
  - `evidence?`, `resource?`, `resources?`, `metadata?`
  - future-safe fields 可保留 `job?`, `nextStep?`, `safeToRetry?`, `mayStillBeRunning?`，但 5A 不产生真实 async accepted operation 或 job system

  只定义 Phase 5A host-runtime foundation 需要的共享类型；不注册 MCP tools，不绑定 public action catalog。

- **Contract detail 3：定义 `mapPublicResultToMcpToolResult` foundation**

  在 `src/contracts/mcp-result.ts` 实现 `mapPublicResultToMcpToolResult(publicResult)`：

  - `structuredContent` 保留完整 public result payload。
  - `content` 只输出 summary/minimal text，不承载唯一事实来源。
  - `isError` 由 `status !== "succeeded"` 推导。
  - 保留 `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs` 等 envelope metadata。
  - 保留 `diagnostics` 的 `code` 与 `attribution`，以及 `evidence`, `resource`, `resources`, `metadata`, `job?`, `nextStep?`。

- **Contract detail 4：编写 TS foundation tests**

  在 `tests/host-runtime.test.ts` 中加入：

  - `packageJsonUsesStripTypesNodeTestScript`
  - `mapPublicResultToMcpToolResultPreservesStatusDiagnosticsAndEvidence`
  - `mapPublicResultToMcpToolResultPreservesResourceReferences`
  - `mapPublicResultPreservesDiagnosticsCodeAndAttribution`
  - `mapPublicResultPreservesFailureMetadata`
  - `mapPublicResultPreservesFutureWorkflowFields`
  - `publicResultMappingPreservesSafeToRetryAndNextStep`
  - `workflowTimeoutFieldsArePreservedButNotProducedBy5A`
  - `timeout`、`lost`、`uncertain`、`failed`、`rejected` 的 `isError` 都为 `true`；`succeeded` 的 `isError` 为 `false`

- **Contract detail 5：运行 TS foundation tests**

  ```bash
  cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
  ```

  若失败，只修复 result foundation 或 MCP payload mapping；不要提前加入 host networking 实现。

## Contract Area 2：创建 Unity DTOs 和 registry foundation

**文件：**
- Future implementation candidate：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- Future implementation candidate：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs`
- Future implementation candidate：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

- **Contract detail 1：定义 Unity DTO models**

  在 `UnityAgentKitModels.cs` 中定义最小 DTO：

  - `UnityAgentKitHostRecord` 至少包含：`hostName`, `protocolVersion`, `projectRoot`, `hostId`, `hostEpoch`, `port`, `status`, `startedAt`, `lastProbeAt?`。
  - `UnityAgentKitProbeResponse` 至少包含 active validation fields：`hostId`, `hostEpoch`, `projectRoot`, `protocolVersion`, `port`, `status`，并支持 not-ready code/message。
  - `UnityAgentKitOperationRequest` 支持 `operation`, `requestId`, `inputJson?`。
  - `UnityAgentKitOperationResponse` top-level response，不采用 nested v2 data envelope compatibility；字段至少覆盖 `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`, `code`, `message`, `metadata?`。
  - `UnityAgentKitDiagnostic` 支持 `source`, `severity`, `code?`, `message`, `details?`, `attribution?`。
  - `UnityAgentKitThreadCheckResult` 包含 `capturedMainThreadId`, `executionThreadId`, `ranOnMainThread`。

- **Contract detail 2：实现 registry foundation**

  `UnityAgentKitHostRegistry.cs` 负责：

  - 计算 project-scoped registry path。
  - `projectRoot` 必须从 `Application.dataPath` 推导，禁止依赖 `Environment.CurrentDirectory`。
  - 写入和读取 `UnityAgentKitHostRecord`，registry body 必须使用 DTO JSON；state no `string concat / string search` as protocol body。
  - host 启动读取 existing registry epoch，新 record 写入 `previous hostEpoch + 1`。
  - 每次 restart/reload 产生新 `hostId`；continuity identity = `hostId + hostEpoch`。
  - active validation fields = `hostId + hostEpoch + projectRoot + protocolVersion + port + status`。

- **Contract detail 3：编写 Unity DTO 和 registry tests**

  在 `HostRuntimeTests.cs` 中增加：

  - `HostRegistryWritesMinimumFields`
  - `ProjectRootDerivedFromApplicationDataPath`
  - `HostRegistryDoesNotUseEnvironmentCurrentDirectory`
  - `ReadExistingEpochAndIncrementOnRestart`
  - `HostRecordRoundTripsAllMinimumFields`
  - `OperationRequestJsonDeserializesToDto`
  - `OperationResponseDtoSerializesAndDeserializesRoundTrip`

  这些测试必须使用 `UnityEngine.JsonUtility`，并直接断言字段值。`OperationResponseDtoSerializesAndDeserializesRoundTrip` 必须额外断言 `requestId`、`hostId`、`hostEpoch`、`startedAt`、`completedAt`、`durationMs`。

- **Contract detail 4：运行 Unity DTO/registry tests**

  ```bash
  "${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
  ```

  若失败，只修复 DTO shape 或 registry foundation；不要提前实现 HTTP server。

## Contract Area 3：实现 loopback HTTP `/probe`、dynamic registry 和 host lifecycle

**文件：**
- Future implementation candidate：`unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs`
- Future implementation candidate：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- Future implementation candidate：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs`
- Future implementation candidate：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

- **Contract detail 1：创建 host bootstrap、dynamic port 和 restart/epoch 规则**

  `UnityAgentKitHost.cs` 负责 Editor 启动时创建 host identity、递增 `hostEpoch`、启动 loopback server、写 registry。端口必须是 dynamic port，而不是硬编码固定端口。启动读取 existing registry epoch，新 record 写入 previous epoch + 1；每次 restart/reload 产生新 `hostId`。

  host lifecycle 必须满足：

  - `isCompiling` 或 `isUpdating` 时不启动 host。
  - compile/updating 结束后，update tick 可重新尝试启动。
  - `_started == true` 但 server 不 running 时允许重启。
  - 注册 `AssemblyReloadEvents.beforeAssemblyReload`，reload 前停止 host。
  - 注册 `EditorApplication.quitting`，quit 前停止 host。

- **Contract detail 2：实现 loopback server Start/Stop lifecycle**

  `UnityAgentKitLoopbackHttpServer.cs` 必须满足：

  - `Start()` 前先 `Stop()` 旧 listener。
  - listener thread 是 background thread，`Stop()` 不能阻塞 join。
  - `Stop()` 调用 `listener.Stop()` + `listener.Close()`，并清空 listener/record 引用。
  - shutdown 期间出现 `HttpListenerException` 或 `ObjectDisposedException` 是正常退出，不应导致 Stop 失败。
  - old listener stop 后不再响应旧 `/probe` 或 `/operations`。
  - URL helpers 固定为 `http://127.0.0.1:{port}/probe` 和 `http://127.0.0.1:{port}/operations`；不绑定 wildcard address。

- **Contract detail 3：实现 canonical `GET /probe` endpoint**

  `UnityAgentKitLoopbackHttpServer.cs` 至少支持：

  - `GET /probe` 返回 200 + `UnityAgentKitProbeResponse` DTO。
  - host not ready 时仍返回 200 structured probe response，`status = not_ready`，并包含 `code = host.not_ready` 和 `message`。
  - unknown route 返回 404 structured envelope；wrong method 返回 405 structured envelope。
  - 每个 response 设置 status code、JSON content-type（`application/json; charset=utf-8` 或等价 JSON content-type）、完整 UTF-8 body、`ContentLength64` 或等价 framing，并关闭 output stream。

- **Contract detail 4：编写 `/probe` 和 lifecycle integration tests**

  在 `HostRuntimeTests.cs` 中增加：

  - `DoesNotStartHostWhileCompilingOrUpdating`
  - `RestartsWhenStartedFlagTrueButServerStopped`
  - `BeforeAssemblyReloadStopsLoopbackServer`
  - `EditorQuittingStopsLoopbackServer`
  - `StartStopsExistingListenerBeforeBinding`
  - `StopClosesListenerAndUnregistersDrain`
  - `StoppedOldListenerNoLongerResponds`
  - `ShutdownListenerExceptionsDoNotFailStop`
  - `ProbeEndpointReturnsHostIdentityOverHttp`
  - `ProbeEndpointReturnsJsonContentType`
  - `ProbeReturnsNotReadyWhenHostRecordUnavailable`
  - `BuildProbeUrlUsesAssignedPort`
  - `LoopbackPrefixUses127001`

  `ProbeEndpointReturnsHostIdentityOverHttp` 必须通过真实 HTTP 调用 `/probe`，再使用 `UnityEngine.JsonUtility.FromJson<UnityAgentKitProbeResponse>` 反序列化并断言字段；不得通过 `string contains` 或字符串搜索验证。lifecycle evidence 必须是 Unity-side cleanup evidence，不能只靠 TS simulation。

- **Contract detail 5：运行 Unity `/probe` 和 lifecycle tests**

  ```bash
  "${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
  ```

  若失败，只修复 loopback bootstrap、dynamic port、probe DTO 或 lifecycle cleanup；不要提前实现 `/operations`。

## Contract Area 4：实现 main-thread dispatch、`/operations` 和 HTTP protocol contract

**文件：**
- Future implementation candidate：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs`
- Future implementation candidate：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- Future implementation candidate：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- Future implementation candidate：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- Future implementation candidate：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

- **Contract detail 1：实现 main-thread capture、dispatch 和 Stop cleanup**

  `UnityAgentKitMainThread` captures Unity main thread id and `/operations` deserializes DTO JSON, dispatches to main thread, serializes DTO envelope JSON。

  `UnityAgentKitMainThread` 至少提供：

  - Unity 启动时捕获主线程 id。
  - `Run(Func<UnityAgentKitOperationResponse>)` 或等价 API。
  - update/drain callback registration；`Stop()` 时注销 update/drain callback。
  - Stop/reload/quitting 时 fail pending main-thread work，diagnostic 使用 `host.stopped`、`host.stopped_for_reload`、`host.editor_quitting` 等，不把这类 failure 映射为 timeout。
  - timeout/expired queued work 后不能再执行。
  - non-blocking pending dispatch hook，用于测试 host-level safety timeout。
  - 禁止通过 `Thread.Sleep`、busy wait、`Task.Wait` 或阻塞 Unity main thread / HTTP handler 制造 timeout。

- **Contract detail 2：实现 operation normalization、router 和 status/code table**

  `UnityAgentKitOperationRouter.cs` 至少支持：

  - operation trim whitespace；`" host.echo "` 路由为 `host.echo`。
  - null/missing/empty operation → structured `rejected`，code `operation.empty`。
  - unknown operation → structured `rejected`，code `operation.unknown`。
  - malformed JSON → structured `failed`，operation `host.invalidRequest`，code `protocol.malformed_json` 或 `host.invalidRequest`。
  - dispatch exception → `failed`，code `host.dispatch_exception`。
  - host-level timeout → `timeout`，code `host.dispatch_timeout`，details 包含 `mayStillBeRunning: true` 或等价结构化字段。
  - stop/reload pending failure → `failed` 或 `lost`，code `host.stopped` / `host.stopped_for_reload` / `host.editor_quitting`。
  - `host.echo` 返回 request payload；`host.threadCheck` 返回 `UnityAgentKitThreadCheckResult`。

  5A 不产生真实 async `accepted` operation。status/code table 必须 fail closed：unknown status 映射为 failed + `host.invalid_envelope`。

- **Contract detail 3：实现 canonical `POST /operations` HTTP endpoint**

  `UnityAgentKitLoopbackHttpServer.cs` 增加：

  - `POST /operations` valid request 返回 200 + top-level `UnityAgentKitOperationResponse` DTO。
  - transport invalid 返回 4xx：unknown route 404 structured envelope；wrong method 405 structured envelope；empty body 400 structured failed envelope；malformed JSON 400 structured failed envelope；missing/empty operation 400 structured rejected envelope。
  - transport ok but operation failed/rejected/timeout 返回 200 + operation envelope。
  - Request context preservation：不用 string extraction 作为主协议；先 DTO JSON parse 得到 operation/requestId，再 dispatch；dispatch timeout/failure before work executed 仍保留 operation/requestId。malformed JSON 使用 operation `host.invalidRequest`。
  - 每个 response 设置 status code、JSON content-type、完整 UTF-8 body、`ContentLength64` 或等价 framing，并关闭 output stream。

- **Contract detail 4：编写真实 `/operations` 和 HTTP protocol tests**

  `HostRuntimeTests.cs` 至少覆盖：

  - `OperationNameIsTrimmedBeforeRouting`
  - `MissingOperationReturnsRejectedEnvelope`
  - `EmptyOperationReturnsRejectedEnvelope`
  - `UnknownOperationReturnsRejectedEnvelopeWithCode`
  - `host.echo` over real HTTP `/operations`
  - `host.threadCheck` over real HTTP `/operations`
  - `OperationsEndpointReturnsJsonContentType`
  - `UnknownRouteReturns404StructuredEnvelope`
  - `WrongMethodReturns405StructuredEnvelope`
  - `OperationsEmptyBodyReturnsStructuredFailedEnvelope`
  - `OperationsMalformedJsonReturnsStructuredFailedEnvelope`
  - `OperationsMissingOperationReturnsStructuredRejectedEnvelope`
  - `ResponseBodyIsClosedAndReadable`
  - `BuildOperationsUrlUsesAssignedPort`

  每个 operation envelope 必须逐字段断言 `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`, `code`, `message`。断言必须基于 DTO JSON 反序列化，不使用字符串包含判断。

- **Contract detail 5：补齐 dispatch exception、stop/reload pending failure 和非阻塞 timeout tests**

  在 router 中加入 `host.throw` 测试 operation，并在 `UnityAgentKitMainThread` 中加入固定的 non-blocking pending dispatch hook；测试 operation 名称固定为 `host.pendingDispatchTimeout`。该 hook 只创建不会在 deadline 前完成的 pending dispatch item，由 host-level deadline path 生成 `timeout` envelope；不得使用 `Thread.Sleep`、busy wait、`Task.Wait`，也不得阻塞 Unity main thread 或 HTTP handler。

  必须加入测试：

  - `DispatchExceptionReturnsStructuredDiagnostics`
  - `PendingDispatchTimeoutReturnsHostTimeout`
  - `PendingDispatchTimeoutDoesNotBlockMainThreadOrHandler`
  - `PendingDispatchTimeoutMarksMayStillBeRunning`
  - `StopFailsPendingDispatchWork`
  - `StopFailsPendingWorkWithStoppedDiagnostic`
  - `ReloadStopFailsPendingWorkWithoutTimeoutStatus`
  - `ExpiredDispatchWorkDoesNotExecuteLater`

- **Contract detail 6：运行 Unity `/operations` tests**

  ```bash
  "${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
  ```

  若失败，只修复 dispatch、router、HTTP protocol 或 DTO envelope；不要把 workflow polling 加进 Unity host。

## Contract Area 5：实现 TS registry/probe/invoke/rebind client

**文件：**
- Future implementation candidate：`plugins/unity-agent-kit/src/host/registry.ts`
- Future implementation candidate：`plugins/unity-agent-kit/src/host/http-client.ts`
- Future implementation candidate：`plugins/unity-agent-kit/src/host/rebind.ts`
- Future implementation candidate：`plugins/unity-agent-kit/tests/host-runtime.test.ts`
- Future implementation candidate：`plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts`

- **Contract detail 1：实现 TS registry reader 和严格 validation**

  `registry.ts` 负责读取 Unity 写入的 host registry DTO，并校验：

  - `hostName` 是 non-empty string。
  - `protocolVersion` 是 supported version。
  - `projectRoot` 是 current Unity project；validation 与 Unity `Application.dataPath` 推导结果一致。
  - `hostId` 是 non-empty string。
  - `hostEpoch` 是 integer >= 0。
  - `port` 是 integer > 0。
  - `status` 是 supported status。
  - `startedAt` 是 valid string；`lastProbeAt?` shape valid。

  registry failure classification 固定为：`missing registry`、`invalid JSON`、`invalid shape`、`invalid port`、`seen registry after disappearance`、`unexpected fs error`。读取结果必须保留完整 identity 字段，不能丢失 `hostId`、`hostEpoch` 或 `projectRoot`。

  测试名至少包含：

  - `readHostRegistryAcceptsMinimumRecord`
  - `readHostRegistryRejectsMissingFile`
  - `readHostRegistryRejectsInvalidJson`
  - `readHostRegistryRejectsInvalidShape`
  - `readHostRegistryRejectsInvalidPort`
  - `readHostRegistryDistinguishesMissingBeforeAndAfterSeenRegistry`
  - `continuityIdentityUsesHostIdAndHostEpoch`

- **Contract detail 2：实现 TS HTTP client 和 diagnostic code foundation**

  `http-client.ts` 负责 probe active host、invoke `/operations`、解析 structured envelopes，并将 Unity DTO envelope 映射为 public-result foundation。diagnostic codes 必须稳定，至少覆盖：

  - `host.registry_missing`
  - `host.registry_invalid_json`
  - `host.registry_invalid_shape`
  - `host.registry_invalid_port`
  - `host.not_ready`
  - `host.protocol_mismatch`
  - `host.probe_invalid_shape`
  - `host.identity_mismatch`
  - `host.transport_unavailable`
  - `host.restarted`
  - `host.stale_instance`
  - `host.invalid_envelope`
  - `host.request_timeout`

  Ready/not_ready handling、registry/probe invalid shapes、continuity identity (`hostId + hostEpoch`) 和 active validation fields (`hostId + hostEpoch + projectRoot + protocolVersion + port + status`) 必须全部测试。

- **Contract detail 3：实现 bounded pre-operation rebind 和 in-flight no-replay**

  `rebind.ts` 负责：

  - pre-operation single/bounded rebind allowed when operation not sent：stale initial registry、probe transport failure、probe not_ready、probe identity mismatch、registry replaced by new ready host。
  - No infinite retry loop。
  - Once operation sent：no replay to new host；reread registry only for classification；preserve operation/requestId；record no replay evidence。
  - Post-response identity drift：success response 后 reread/check identity；若 `hostId/hostEpoch` 已变，返回 stale/lost，不返回 success。
  - Preserve most specific error with stable priority。

  这里必须把 restart/domain reload continuity 写成明确规则：一旦 active probe 与既有 continuity 不匹配，就视为 `old hostId / hostEpoch continuity is invalidated`，返回 `lost or rebind decision`，不得继续消费旧 host envelope。

- **Contract detail 4：实现 timeout classification 和 envelope mapping**

  TS timeout 分层固定为：

  - Host-level timeout：Unity host 已收到 operation，但 host-level deadline 在 dispatch result 前过期；response status `timeout`，code `host.dispatch_timeout`，不证明 operation failed；保留 `mayStillBeRunning` 或等价 details。
  - Transport/request timeout：Node request/socket/transport deadline 或连接问题；code `host.transport_unavailable` 或 `host.request_timeout`；不是 workflow timeout。
  - Workflow timeout：属于 5B；5A 不产生 workflow timeout，只保留 future-safe fields。

  Envelope mapping 必须保留 failure paths 的 `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`, `code`, `message`。invalid envelope 映射为 error result；unknown status fail closed。

- **Contract detail 5：编写 TS host client coverage**

  `tests/host-runtime.test.ts` 至少覆盖：

  - `preOperationProbeNotReadyAllowsSingleRebind`
  - `initialProbeStaleRebindsOnceToReadyHost`
  - `preOperationRetryPreservesMostSpecificError`
  - `preOperationRebindDoesNotLoopIndefinitely`
  - `inFlightOperationTransportFailureDoesNotReplay`
  - `inFlightOperationFailureWithHostRestartDoesNotReplayToNewHost`
  - `operationFailureRereadsRegistryOnlyForClassification`
  - `postResponseIdentityDriftReturnsStaleInstance`
  - `postResponseMissingRegistryReturnsStaleInstance`
  - `oldHostSuccessEnvelopeIsNotCurrentSuccess`
  - `preservesHostNotReadyOverTransportUnavailable`
  - `preservesHostRestartedOverRegistryMissingAfterSeen`
  - `preservesStaleInstanceOverGenericFailure`
  - `hostTimeoutEnvelopeMapsToTimeoutResult`
  - `transportRequestTimeoutMapsToTransportDiagnostic`
  - `transportTimeoutDoesNotMapToWorkflowTimeout`
  - `invalidEnvelopeMapsToErrorResult`
  - `unknownStatusFailsClosed`
  - `controlledRegistryProbeRebindSimulationInvalidatesOldContinuity`

  `tests/phase5a-vertical-smoke.test.ts` 专门承载 live-host vertical smoke，显式断言 TS 读取 Unity registry DTO、probe 真实 `/probe`、invoke 真实 `/operations` 的 `host.threadCheck`，并把 envelope 映射为 public result 和 MCP payload。

- **Contract detail 6：运行 TS host client tests**

  ```bash
  cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
  ```

  若失败，只修复 TS registry/probe/invoke/rebind foundation；不要注册 MCP tools。

## Contract Area 6：验证 completion evidence、Quality Gate 和 plan index 收尾

**文件：**
- Future implementation candidate：`plugins/unity-agent-kit/tests/host-runtime.test.ts`
- Future implementation candidate：`plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts`
- Future implementation candidate：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`
- Future implementation candidate：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs`
- Contract-only reference：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
- Future execution completion update only：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`

- **Contract detail 1：运行 plan content check**

  执行文档内容检查，确认本 plan 保留关键字符串、无占位词、无字符串包含式断言、无错误 TS 测试脚本。预期输出：

  ```text
  PASS Phase 5A plan content is ready for review gate
  ```

- **Contract detail 2：运行 TS 测试命令并记录 evidence**

  常规 TS 命令只运行非 live-host 单测：

  ```bash
  cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
  ```

  `phase5a-vertical-smoke.test.ts` 不能被该命令的 glob 间接包含；standalone `phase5a-vertical-smoke.test.ts` pass/skip 不可作为 completion evidence。regular TS evidence only covers non-live host runtime unit tests。

  记录 evidence groups：

  - result/envelope：result foundation、operation/result/envelope contract、unknown status fail-closed、diagnostic code/attribution preservation、future workflow fields preserved but not produced。
  - registry：minimum host record、strict validation、registry failure classification、continuity identity。
  - TS client：registry/probe/invoke/rebind simulations、ready/not_ready、bounded pre-operation rebind、in-flight no replay、post-response stale instance、specific error priority。
  - dispatch/timeout：host-level timeout envelope mapping、transport/request timeout classification、workflow timeout out-of-scope。
  - MCP payload mapping foundation：full public result in `structuredContent`、summary-only `content`、`isError` status rule、metadata/evidence/resources preservation。

- **Contract detail 3：运行 Unity HostRuntimeTests 并记录 evidence**

  ```bash
  "${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
  ```

  `HostRuntimeTests` 必须记录 evidence groups：

  - registry：`HostRegistryWritesMinimumFields`、`ProjectRootDerivedFromApplicationDataPath`、`HostRegistryDoesNotUseEnvironmentCurrentDirectory`、`ReadExistingEpochAndIncrementOnRestart`、`HostRecordRoundTripsAllMinimumFields`。
  - lifecycle：`DoesNotStartHostWhileCompilingOrUpdating`、`RestartsWhenStartedFlagTrueButServerStopped`、`BeforeAssemblyReloadStopsLoopbackServer`、`EditorQuittingStopsLoopbackServer`、`StartStopsExistingListenerBeforeBinding`、`StopClosesListenerAndUnregistersDrain`、`StopFailsPendingDispatchWork`、`ExpiredDispatchWorkDoesNotExecuteLater`、`StoppedOldListenerNoLongerResponds`。
  - HTTP protocol：`ProbeEndpointReturnsJsonContentType`、`OperationsEndpointReturnsJsonContentType`、404/405/400 structured envelope、not_ready probe、URL helper、127.0.0.1 prefix、closed readable body、shutdown listener exceptions。
  - dispatch/timeout：`host.threadCheck`、captured Unity main thread、dispatch exception、non-blocking pending dispatch hook、host-level timeout with may-still-be-running、stop/reload pending failure not timeout。
  - result/envelope：operation normalization、missing/empty/unknown operation rejected、malformed JSON failed、failure metadata preserved。

- **Contract detail 4：运行 live-host vertical smoke Unity harness**

  ```bash
  "${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests
  ```

  该 Unity 测试内部必须启动：

  ```bash
  cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/phase5a-vertical-smoke.test.ts
  ```

  `HostRuntimeVerticalSmokeTests` 负责在 Node 进程运行期间保持真实 loopback host alive，Node 退出后再停止 host。必须验证：

  ```text
  Unity writes registry → TS reads registry → TS probes `/probe` → TS invokes real HTTP `/operations` → Unity dispatches to captured main thread via `host.threadCheck` → TS maps envelope/public result
  ```

  最低断言要求：

  - Unity registry 文件中的 `hostId`、`hostEpoch`、`port`、`projectRoot`、`protocolVersion` 被 TS 成功读取。
  - `/probe` response 与 registry identity 一致。
  - `/operations` 返回的 `host.threadCheck` envelope 经过 TS 映射后仍保留 `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`，以及 status、diagnostics、evidence。
  - Unity 断言 `ranOnMainThread == true` 与 `capturedMainThreadId == executionThreadId`。
  - Node 退出后 Unity 显式 Stop host，并记录 Unity-side cleanup evidence。

- **Contract detail 5：验证 host restart/domain reload epoch evidence**

  必须新增并记录 Unity-side cleanup + restart/domain reload evidence，不能只靠 TS simulation。证据至少证明：

  - `ReadExistingEpochAndIncrementOnRestart`：启动读取 existing registry epoch，新 record 写入 previous epoch + 1。
  - restart/reload 产生新 `hostId`。
  - Stop/reload/quitting 停止 loopback server，旧 listener 不再响应 `/probe` 或 `/operations`。
  - `old hostId / hostEpoch continuity is invalidated`。
  - TS 在 active probe 之后返回 `lost` 或 rebind decision。
  - 不会把旧 host continuity 下的 success envelope 继续当作当前 host 结果。

- **Contract detail 6：评估 Quality Gate 并准备 completion evidence 文本**

  completion evidence 必须明确列出命令、关键测试名、PASS 输出和结构化验证点，不接受 `done`、`tested` 或泛化描述。必须逐字包含三条 completion evidence 命令：

  ```bash
  cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
  "${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
  "${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests
  ```

  evidence text 必须显式出现：`HostRuntimeTests`、`phase5a-vertical-smoke.test.ts`、`HostRuntimeVerticalSmokeTests`、`host.threadCheck`、`captured Unity main thread`、`non-blocking pending dispatch hook`、`old hostId / hostEpoch continuity is invalidated`、`lost or rebind decision`。

- **Contract detail 7：在实际 5A 执行完成后更新 plan index 为 completed**

  只有当 5A 的所有 active execution plans 真正完成、evidence 已记录且 final vertical smoke evidence 通过后，才允许更新 `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` 中对应行与 completion evidence。此步骤属于 5A execution 收尾，不属于本文档修订动作。evidence text 应包含：registry、lifecycle cleanup、HTTP protocol、main-thread dispatch、timeout/exception handling、host restart detection、TS rebind/classification、MCP payload preservation、vertical smoke。

## Operation / Result / Envelope Contract

5A 的 operation/result/envelope 是 strict foundation：

- Operation normalization：null/missing/empty → rejected 或 invalid；trim whitespace；`" host.echo "` → `host.echo`。
- Suggested codes：malformed JSON → failed `host.invalidRequest` / `protocol.malformed_json`；missing/empty operation → rejected `operation.empty`；unknown operation → rejected `operation.unknown`。
- Diagnostic minimum shape supports `source`, `severity`, `code?`, `message`, `details?`, `attribution`。
- Failure paths preserve `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`, `code`, `message`。
- Status/code table：success `succeeded`；unknown `rejected + operation.unknown`；missing `rejected + operation.empty`；malformed `failed + protocol.malformed_json`；dispatch exception `failed + host.dispatch_exception`；host-level timeout `timeout + host.dispatch_timeout`；stop/reload pending failure `failed/lost + host.stopped`；transport unavailable `lost/failed + host.transport_unavailable`；host restarted `lost + host.restarted`；stale instance `lost + host.stale_instance`；invalid envelope `failed + host.invalid_envelope`。
- 5A does not produce real async accepted operation。Public result foundation may preserve future fields `job?`, `nextStep?`, `metadata?` without producing job system。
- Nested v2 data envelope compatibility is not adopted；`/operations` response top-level is `UnityAgentKitOperationResponse`。
- `mapPublicResultToMcpToolResult`：`structuredContent` preserves full public result；`content` summary only；`isError` status !== `succeeded`；preserves diagnostics/evidence/resource/resources/metadata/job?/nextStep?/envelope metadata。

## Timeout Contract 分层

- **Host-level timeout：** Unity host received operation but host-level deadline expired before dispatch result；status `timeout`，code `host.dispatch_timeout`；does not prove operation failed；`mayStillBeRunning: true` 或等价 structured details；不得阻塞 Unity main thread 或 HTTP handler；不得使用 `Thread.Sleep`、busy wait、`Task.Wait` 制造 timeout。
- **Transport/request timeout：** TS HTTP client deadline/socket/transport issue；code `host.transport_unavailable` 或 `host.request_timeout`；不是 workflow timeout。
- **Workflow timeout：** 属于 5B；5A 不产生 workflow timeout。
- Stop/reload pending failure is not timeout：使用 `host.stopped` / `host.stopped_for_reload` / `host.editor_quitting` 等。
- Mapping preserves future `safeToRetry?`, `nextStep?`, `mayStillBeRunning?`, `job?` fields。

## MCP Tool Result Mapping Foundation

5A 只定义 MCP Tool Result Mapping Foundation，不注册 MCP tools。

- `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs` 必须通过 payload preserved exactly；不得把这些 envelope metadata fields 扁平化丢失或改写。
- `diagnostics` preserved without flattening severity/source/code/attribution/message；调用方后续仍能读取完整 diagnostics shape。
- `evidence`、`resource`、`resources`、`metadata`、`job?`、`nextStep?` 等字段 remain inside payload，不因转换到 MCP tool result 而丢失。
- `structuredContent` 保留完整 public result foundation，供后续 MCP public tool registration 直接复用。
- `content` 只提供最小摘要，不承载唯一事实来源。
- `isError` derived from `status !== "succeeded"`。

## Subplan Completion Evidence

完成 5A 时，必须确认所有 active execution plans、最终 vertical smoke evidence 和 plan index completion evidence 全部通过，并附上以下命令和证据：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests
```

standalone `phase5a-vertical-smoke.test.ts` pass/skip 不可作为 completion evidence；regular TS evidence only covers non-live host runtime unit tests；ordinary Unity evidence must include `HostRuntimeTests`；live-host vertical smoke 必须由 `HostRuntimeVerticalSmokeTests` 驱动，并由其内部运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/phase5a-vertical-smoke.test.ts
```

against the live loopback host。

证据必须按以下 groups 覆盖：

- **registry：** minimum `UnityAgentKitHostRecord` fields、`projectRoot` derived from `Application.dataPath`、existing epoch read + previous epoch + 1、new hostId on restart/reload、TS strict registry validation、registry failure classification。
- **lifecycle：** compiling/updating skip start、update tick retry、beforeAssemblyReload stop、Editor quitting stop、Start stops old listener、Stop closes listener and clears references、shutdown listener exceptions tolerated、background listener thread without blocking join、unregister update/drain callback、fail pending main-thread work、expired work not executed、server stopped despite `_started == true` can restart、old listener no longer responds。
- **HTTP protocol：** canonical `GET /probe` and `POST /operations`、probe not_ready 200 response、404/405/400 structured envelopes、JSON content-type/framing/closed body、URL helpers use assigned port and `127.0.0.1`、request context preservation。
- **dispatch/timeout：** `host.threadCheck` dispatches to captured Unity main thread；dispatch exception diagnostics；`host.pendingDispatchTimeout` produces host-level timeout with may-still-be-running；non-blocking pending dispatch hook；stop/reload pending failure is not timeout。
- **TS client：** ready/not_ready、invalid registry/probe shapes、stable diagnostic codes、bounded pre-operation rebind、no infinite retry、in-flight no replay、post-response identity drift stale/lost、specific error priority、timeout classifications。
- **result/envelope：** DTO JSON round-trip、operation normalization、status/code table、failure metadata preservation、invalid envelope mapping、unknown status fail-closed。
- **vertical smoke：** Unity writes registry → TS reads registry → TS probes `/probe` → TS invokes real `/operations` → Unity dispatches to captured main thread via `host.threadCheck` → TS maps envelope/public result；Unity test keeps the loopback host alive while Node probes and invokes it，并在 Node 退出后停止 host。
- **MCP payload mapping foundation：** TS public result → MCP tool result payload 通过 `structuredContent` 保留 full public result；content summary only；保留 `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`，以及 diagnostics/evidence/resource/resources/metadata/job?/nextStep?。

## Roadmap Phase Upgrade Check

| 检查项 | 结论 | 说明 |
|---|---|---|
| independent roadmap goal? | no | 5A 只是 Phase 5 Host Runtime foundation 内部拆分，不形成独立 roadmap goal。 |
| cross-phase blocker/current-state needs? | no | 当前约束可在 Phase 5 内部 completion evidence 中管理。 |
| independently unlock Phase 6/7/8? | no | 5A 只提供 runtime foundation，不能单独解锁后续 phase。 |
| singly satisfy Phase 5 success criteria? | no | Phase 5 success 还需要 5B-5E 的 workflows、resource/artifact、public tools 和 daily loop E2E。 |
| remains Phase 5 internal subplan? | yes | 本 technical contract 保持 Phase 5 内部 subplan 身份，实际实现拆分继续由 execution plan set 管理。 |

若后续发现 Host Runtime foundation 需要独立 roadmap goal、跨 phase blocker 管理、单独 completion cadence，必须先走 roadmap 结构调整；在该调整发生前，Phase 5A 仍保持 technical contract + execution-plan-set 结构，不单独升级为 roadmap phase。
