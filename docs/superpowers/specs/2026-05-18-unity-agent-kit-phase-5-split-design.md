# Unity Agent Kit Phase 5 Split Design 设计规格

**目标：** 将旧的 Phase 5 大型 implementation plan 拆分为可独立规划、验证和执行的 Phase 5 subplans，降低实现漂移，并为第一个可执行子计划 Phase 5A Host Runtime 基础设施建立清晰边界。

**非目标：** 不正式拆分 roadmap phases；不实现代码；不执行旧总 plan；不修改通用 `roadmap-management` 规则；不把旧计划中的低可信实现方案继续作为 completion evidence。

**输入：**
- Roadmap：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- Phase 5 spec：`docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`
- 旧总 plan：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure.md`
- Revision brief：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-revision-brief.md`

---

## 已确认决策

| 类别 | 决策 |
|---|---|
| 拆分层级 | 先设计 subplans，再决定是否升级正式 roadmap phases。 |
| 旧总 plan | 标记 deprecated，保留历史参考，不得执行。 |
| 第一个可执行 subplan | Phase 5A：Host Runtime 基础设施。 |
| reference mapping 粒度 | 每个 subplan 按能力域 / 基础设施域映射。 |
| subplan 验收 | Plan index 映射 + subplan 独立 evidence + Phase 5 最终统一完成。 |
| split design spec | 先写本 split design spec，再写 5A implementation plan。 |
| roadmap planned 同步 | split design spec + plan index + 5A plan 都完成后，再同步 roadmap planned。 |
| 旧 plan 防误用 | 文件头强标记 `DEPRECATED / 不得执行 / 仅作历史参考`。 |
| quality gate | 每个 subplan 必须有 7 分 quality gate。 |
| Phase 1-4 compliance | 每个 subplan 必须有轻量 compliance matrix。 |

---

## 总体结构与 current truth 边界

Phase 5 拆分后的结构为：

```text
Phase 5 split design spec
→ Phase 5 plan index
→ Phase 5A / 5B / 5C / 5D / 5E subplans
```

当前不正式拆 roadmap phases。Roadmap 仍保持一个 Phase 5：

```text
Phase 5 — 高频日常闭环基础设施
```

后续 Phase 5 的 `Plan` artifact 应指向 plan index：

```text
docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md
```

映射关系：

```text
ROADMAP.md Phase 5
→ Spec: Phase 5 daily loop design spec
→ Plan: Phase 5 plan index
→ Plan index: links 5A / 5B / 5C / 5D / 5E subplans
→ Each subplan: independent validation evidence
→ Phase 5 completed only after all subplans + final E2E evidence pass
```

Plan index 是 Phase 5 的计划入口和状态索引，不是 implementation plan。它负责：

- 列出所有 subplans；
- 记录 scope、plan path、status、completion evidence；
- 标记旧总 plan 为 deprecated reference；
- 说明每个 subplan 是否可能升级为正式 roadmap phase；
- 说明 roadmap Phase 5 何时才能标记 completed。

只有在以下文件都存在后，才同步 roadmap Phase 5 为 `planned`：

1. 本 split design spec；
2. Phase 5 plan index；
3. Phase 5A Host Runtime implementation plan。

同步后：

- Roadmap Phase 5 `Plan` artifact 指向 plan index；
- `Next Manual Action` 指向执行 5A plan；
- Phase 5 不标记 completed，直到所有 subplans + final E2E evidence 完成。

---

## 后续升级为正式 roadmap phases 的条件

如果后续发现某个 subplan 满足以下条件之一，则停止当前 subplan 流程，走 roadmap structural change，将相关 subplan 升级为正式 roadmap phase：

- 有独立路线图目标；
- 有独立跨阶段依赖；
- 需要单独 blocker / current state / verification evidence；
- 完成后能解锁 Phase 6/7/8；
- 不再只是 Phase 5 内部实现切片。

默认结论是：5A-5E 保持为 Phase 5 subplans，不写入 Phase Summary 作为正式 phases。

---

## Subplan 切分与依赖顺序

依赖顺序：

```text
5A Host Runtime
→ 5B Artifact / Resource / Timeout / Completion rules
→ 5C Core Diagnostics Workflows
→ 5D Test / PlayMode / Screenshot Workflows
→ 5E MCP / /unity Skill / E2E
```

关键边界：

- 5A 处理 host runtime、operation dispatch、main-thread dispatch、lost/rebind。
- 5B 处理通用 timeout / polling / completion / artifact / Resource 语义。
- 5C 和 5D 都会实现异步或等待型 workflow。
- 5D 不是“异步开始的地方”；它是 test job、PlayMode transition、screenshot artifact 这些更重 workflow 的落地点。
- 5C 交付 console diagnostics / cursor / snapshot 能力，供 5D 的 test/playmode/screenshot 诊断辅助复用。

### Phase 5A：Host Runtime 基础设施

**目标：** 建立所有后续 workflow 共用的 Unity C# host runtime 基础。

**Scope：**

- 单一 Unity C# host runtime，位于 `unity/Assets/UnityAgentKit/`。
- loopback HTTP server：动态端口、`/probe`、`/operations`、启动 / 停止、domain reload identity / epoch。
- host registry：写入 `unity/Library/UnityAgentKit/host.json`，支持 active host validation、probe、lost / rebind 语义。
- Unity main-thread dispatch：可等待、有返回值、异常传播、timeout。
- C# host request / response DTO：使用 DTO 和 JSON serialization / deserialization；不用 string concat / string search 作为主要协议实现。
- Operation result envelope：建立 Unity host response、TS public result、MCP tool result 映射规则的基础。

**独立验收：**

- Unity EditMode tests 覆盖 registry、probe、operation routing、main-thread dispatch、DTO serialization。
- TS tests 覆盖 registry read、probe/rebind/lost、operation response mapping。
- 不需要实现 19 个 action，但要能执行一个最小 read-only probe / echo / status operation 证明 runtime 可用。

### Phase 5B：Artifact / Resource / Timeout / Completion 基础设施

**目标：** 建立所有 artifact、Resource readback、timeout/polling、completion rules 的统一基础。

**Scope：**

- Artifact store：root、metadata schema、screenshot / test report / console snapshot 共用结构、safe relative path。
- MCP Resource readback：`unity://screenshots/{artifactId}`、`unity://test-reports/{reportId}`、`unity://console-snapshots/{artifactId}`，并支持安全读取与 validation status。
- Timeout / polling policy：per workflow group、long wait justification、timeout next step。
- Completion rules：request accepted 不等于 success；state settled 不等于业务成功；artifact complete 必须可读、非空、metadata 有效；job complete 必须有 report；`uncertain` / `lost` / `timeout` 有证据结构。

**独立验收：**

- TS Resource tests 覆盖 URI parsing、safe readback、traversal rejection。
- Unity EditMode tests 覆盖 artifact metadata 写入和 validation status。
- Completion rule tests 防止 fire-and-forget 直接返回 success。

### Phase 5C：Core Diagnostics Workflows

**目标：** 实现 editor / compile / console 三组核心 diagnostic workflows。它们包含 read snapshot、request accepted、state settled、verified workflow 和 artifact-backed snapshot，不是纯同步 action。

| Action | 语义类型 | 说明 |
|---|---|---|
| `unity_editor.get_status` | read snapshot | 读当前 Editor 状态。 |
| `unity_editor.wait_ready` | state settled | 等 Editor ready，保持 read-only，不自动退出 PlayMode。 |
| `unity_compile.get_state` | read snapshot | 读 compiling / updating 状态。 |
| `unity_compile.request` | request accepted | 请求编译，不代表完成；包含 busy guard、refresh、no-op evidence。 |
| `unity_compile.wait_for_idle` | state settled | 等 Unity idle，不代表编译成功。 |
| `unity_compile.compile_and_check` | state settled + verified | bounded compile lifecycle + compiler message attribution。 |
| `unity_console.snapshot` | read snapshot / artifact-backed | 真实读取 Console，可生成 console snapshot Resource。 |
| `unity_console.count` | read snapshot | 读 Console count。 |
| `unity_console.clear` | effect complete + verified | 清空并验证计数符合预期。 |

**关键要求：**

- `wait_ready` 保持 read-only，不自动退出 PlayMode。
- `compile.request` 包含 busy guard、`AssetDatabase.Refresh()`、no-op evidence。
- `compile_and_check` 必须基于 bounded compile lifecycle + compiler message attribution。
- 无归因证据时返回 `uncertain`，不能用 idle 或 Console-clean 冒充成功。
- Console snapshot/count 必须真实读取 Unity Console，借鉴 v2 `UnityEditor.LogEntries` 反射方案。
- Console diagnostic cursor / snapshot 是 5D 的诊断辅助前置能力。

**独立验收：**

- TS workflow tests 防止 `wait_for_idle` 被当作 compile success。
- Unity tests 覆盖 compiler message attribution 和 Console readback。
- 行为验证不能只查字符串存在。

### Phase 5D：Test / PlayMode / Screenshot Workflows

**目标：** 实现 test job、PlayMode transition、screenshot artifact 这些更重的 workflow。它们依赖 5A runtime、5B completion/resource rules，并复用 5C console diagnostics 作为辅助诊断。

| Action | 语义类型 | 说明 |
|---|---|---|
| `unity_test.list` | read snapshot | 使用真实 TestRunner discovery。 |
| `unity_test.start` | request accepted + job-backed | 启动真实 test job，不代表通过。 |
| `unity_test.get_status` | job status snapshot | 查询真实 job 状态。 |
| `unity_test.get_result` | report readback | 获取真实 test report。 |
| `unity_test.run_and_collect` | job settled + report collected | 测试结束并拿到 report，不代表通过。 |
| `unity_test.run_and_verify` | job settled + verified | 测试结束且通过成功规则。 |
| `unity_playmode.get_state` | read snapshot | 获取当前 PlayMode 状态。 |
| `unity_playmode.enter_and_verify` | state settled + verified | 稳定进入 PlayMode。 |
| `unity_playmode.exit_and_verify` | state settled + verified | 稳定退出到 EditMode。 |
| `unity_screenshot.capture_game_view` | artifact complete + verified | PNG 存在、非空、尺寸有效、Resource 可读。 |

**关键要求：**

- TestRunner 使用真实 Unity Test Runner API：`TestRunnerApi.RetrieveTestList`、`ExecutionSettings`、callbacks、report metadata。
- 禁止 fixed pass report。
- PlayMode 使用 transition status 和 no-op evidence。
- Screenshot 保留 Phase 5 public Resource API，但 Unity 侧借鉴 v2 Game View 查找、focus、repaint、target size。
- 禁止 `InternalEditorUtility.ReadScreenPixel + Texture2D.EncodeToPNG + File.WriteAllBytes`。
- 禁止截图刚请求就立刻读文件，必须 bounded completion / readback。

**独立验收：**

- Unity tests 覆盖 TestRunner adapter、PlayMode transition、Game View setup。
- TS tests 覆盖 job status/result、run_and_collect vs run_and_verify 区分、screenshot Resource validation。
- 需要最少真实 API smoke/integration，不能只 mock 所有 Unity API。

### Phase 5E：MCP / `/unity` Skill / E2E / Completion Evidence

**目标：** 把 5A-5D 的能力接入 public MCP tools、最小 `/unity` skill 和最终 daily loop E2E。

**Scope：**

- MCP server registration：public tools、action dispatch、Resource handlers、result-to-MCP mapping。
- `/unity` actual skill：skeleton、gated recipe drafts、E2E 后解除 gating、stable P0 recipes、Resource 读取纪律。
- Skill semantic audit：recipe 引用 stable tools/actions；params 示例通过 schema；verification path 与 public action 语义一致。
- E2E daily loop runner：editor status、compile check、console snapshot、tests verify、playmode enter/exit、screenshot artifact、structured report。
- Completion evidence template：每个 P0 action、每类 Resource、`/unity` recipe、final daily loop result。

**独立验收：**

- MCP server registration smoke test 使用真实 SDK API 或最接近真实 SDK 的 smoke test。
- `/unity` skill audit 通过。
- E2E runner 输出 structured report。
- 只有 5A-5E 全部完成并 final E2E 通过后，Phase 5 才能进入 roadmap completion。

---

## 每个 subplan 的必需结构

### 计划头部

每个 subplan 头部必须包含：

```markdown
**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`
**Plan Index:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
**Subplan:** Phase 5A / 5B / 5C / 5D / 5E

**拆分检查：** 已检查；Phase 5 按 plan index 拆分为 5A-5E，本计划只覆盖 [当前 subplan scope]。
```

如果某个 subplan 后续被判断应升级为正式 roadmap phase，必须先停止并走 roadmap structural change，而不是在 implementation plan 内自行改变 phase 结构。

### 上游约束摘要

每个 subplan 必须包含：

```markdown
## 上游约束摘要
```

内容包括：

- Roadmap `Shared Constraints` 中与本 subplan 相关的约束；
- Phase 5 scope / out-of-scope / success criteria；
- revision brief 中已确认的 action 级修订、禁止项和 v2 使用原则；
- 本 subplan 不包含的范围；
- 本 subplan 对后续 subplans 的交付物。

只列和当前 subplan 有关的内容，不复制整份 roadmap 或 revision brief。

### Phase 1-4 Compliance Matrix

每个 subplan 必须包含轻量 matrix：

```markdown
## Phase 1-4 Compliance Matrix

| 上游 Phase | 适用约束 | 本 subplan 如何满足 | 落地任务 | 验证 |
|---|---|---|---|---|
```

最低覆盖：

| Phase | 必须考虑的约束 |
|---|---|
| Phase 1 | 单一 Unity C# host runtime；TS / Unity C# 边界清楚。 |
| Phase 2 | `/unity` skill 是薄路由和 recipe 指导层；实现逻辑留在 MCP tools / Unity host。 |
| Phase 3 | Public action contract 稳定；schema 有界；safety metadata 准确；禁止 free-form params。 |
| Phase 4 | async/job/workflow/artifact 语义可靠；不能无证据报成功；Resource 可验证。 |

不是每个 subplan 都要实现所有约束，但每个 subplan 都必须说明哪些适用、哪些不适用、为什么。

### unity-mcp-v2 Reference Mapping

每个 subplan 必须按能力域写：

```markdown
## unity-mcp-v2 Reference Mapping

| 能力域 | 参考输入 | 采用机制 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|---|
```

规则：

- 不允许只写“参考 v2”。
- 不采用 v2 的 public contract 可以，但必须说明原因。
- v2 中正确且适用于当前目标的底层机制必须吸收或说明为什么不适用。
- reference mapping 粒度按能力域 / 基础设施域，不要求每个 2-5 分钟步骤重复。

### Quality Gate

每个 subplan 必须包含：

```markdown
## Quality Gate

| 对象 | 方案摘要 | 置信度 / 10 | 低于 7 分处理 |
|---|---|---:|---|
```

规则：

- 低于 7 分的基础设施、action、验证方案不得进入 completion evidence；
- 处理方式只能是：修订方案、排除出 completion evidence、用户逐条明确接受风险；
- 不能用“后续补充”“先 stub”作为通过理由。

### Subplan Completion Evidence

每个 subplan 必须定义自己的 completion evidence：

```markdown
## Subplan Completion Evidence
```

内容包括：

- 关键测试命令；
- Unity EditMode / TS / MCP / E2E 中适用的验证输出；
- 每个行为任务证明了什么成功标准；
- 不能只证明文件、函数、字符串或符号存在；
- 该 subplan 交付给下一 subplan 的具体 artifact / API / contract。

### Roadmap Phase Upgrade Check

每个 subplan 必须包含：

```markdown
## Roadmap Phase Upgrade Check
```

检查：

- 是否有独立路线图目标；
- 是否有独立跨阶段依赖；
- 是否需要单独 blocker / current state / verification evidence；
- 是否完成后能解锁 Phase 6/7/8；
- 是否不再只是 Phase 5 内部实现切片。

默认结论应是：

```markdown
当前保持为 Phase 5 subplan；不升级为正式 roadmap phase。
```

如果结论不是这个，停止并进入 roadmap structural change。

---

## Plan index 与旧 plan 废弃规则

### Plan index 文件

创建新的 Phase 5 plan index：

```text
docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md
```

它是 roadmap Phase 5 的 `Plan` artifact 入口，不是 implementation plan。

### Plan index 头部

```markdown
# Unity Agent Kit Phase 5 Plan Index

> **用途：** 本文件不是 implementation plan。它是 Phase 5 的 subplan 索引和执行状态入口。执行时必须进入具体 subplan。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`
**Split Design:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md`
**Deprecated Old Plan:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md`
```

### Subplan table

```markdown
## Subplans

| Subplan | Scope | Plan | Status | Completion Evidence | Upgrade Check |
|---|---|---|---|---|---|
| Phase 5A | Host Runtime 基础设施 | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | planned | pending | stays subplan |
| Phase 5B | Artifact / Resource / Timeout / Completion 基础设施 | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5b-artifact-resource-timeout.md` | pending | pending | stays subplan |
| Phase 5C | Core Diagnostics Workflows | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5c-core-diagnostics-workflows.md` | pending | pending | stays subplan |
| Phase 5D | Test / PlayMode / Screenshot Workflows | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5d-test-playmode-screenshot-workflows.md` | pending | pending | stays subplan |
| Phase 5E | MCP / `/unity` Skill / E2E / Completion Evidence | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5e-mcp-skill-e2e.md` | pending | pending | stays subplan |
```

### Plan index 状态规则

- `pending`：subplan 尚未编写；
- `planned`：subplan plan 已创建，可执行；
- `in-progress`：subplan 正在执行；
- `completed`：subplan 已完成并有 evidence；
- `blocked`：subplan 有阻塞项；
- `deprecated`：旧计划或被替代计划。

Plan index 可以更新 subplan 状态，但不能把 roadmap Phase 5 标记 completed。

### 旧 plan 废弃规则

旧计划：

```text
docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure.md
```

应改名为：

```text
docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md
```

文件头添加，并明确旧文件不作为可执行 implementation plan：

```markdown
> **DEPRECATED / 不得执行 / 仅作历史参考**
>
> 本文件是旧 Phase 5 总 implementation plan。它已被 Phase 5 split design 和 plan index 取代。
> 后续不得按本文件执行任务、同步 roadmap planned 状态或生成 completion evidence。
> 请使用：
> - Split Design: `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md`
> - Plan Index: `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
> - Revision Brief: `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-revision-brief.md`
```

---

## Phase 5A 首个 implementation plan 范围

Phase 5 split design 完成后，第一个可执行计划是：

```text
docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md
```

### Phase 5A 目标

实现 Unity Agent Kit 的单一 Unity C# host runtime、loopback transport、registry/probe、main-thread dispatch、DTO/result envelope 和 active host lost/rebind 基础。

### Phase 5A Scope

#### 1. Unity C# host runtime

创建单一 C# host runtime：

```text
unity/Assets/UnityAgentKit/
```

最低文件边界：

```text
unity/Assets/UnityAgentKit/Editor/UnityAgentKit.Editor.asmdef
unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs
unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs
unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs
unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs
unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs
unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs
```

#### 2. Loopback HTTP transport

实现真实 loopback HTTP server：

- 绑定 `127.0.0.1`；
- 使用动态端口；
- 提供 `/probe`；
- 提供 `/operations`；
- 支持启动 / 停止；
- domain reload 后能更新 host identity / epoch；
- 不使用假 port `0` 作为成功状态。

#### 3. Host registry / probe / rebind

Registry 路径：

```text
unity/Library/UnityAgentKit/host.json
```

最低字段：

```text
hostName
protocolVersion
projectRoot
hostId
hostEpoch
port
status
startedAt
lastProbeAt?
```

规则：

- Unity project root 用 `Application.dataPath` 推导，不依赖 `Environment.CurrentDirectory`。
- TS 侧读取 registry 后必须 probe active host。
- host identity / epoch 不匹配时返回 `lost` 或触发 rebind。
- registry 存在不等于 host 可用。

#### 4. Main-thread dispatch

实现 Unity 主线程 dispatch：

- 可等待；
- 有返回值；
- 异常传播；
- timeout；
- 不在 HTTP handler 内直接长阻塞 Unity 主线程；
- 不让后台线程直接调用 Unity API。

#### 5. DTO / JSON protocol

C# host request / response 使用 DTO + JSON serialization / deserialization。

禁止：

- 以 string concat 作为 response JSON 主要实现；
- 以 string search 作为 request parsing 主要实现；
- operation success 直接等同于 handler 收到请求。

#### 6. Operation result envelope

定义 Unity host operation result envelope，并为后续映射打基础：

```text
status
operation
requestId
hostId
hostEpoch
summary
data
diagnostics
startedAt
completedAt
durationMs
```

最低状态：

```text
succeeded
failed
uncertain
timeout
lost
rejected
```

#### 7. TS host client 基础

创建 TS 侧 host runtime client：

```text
plugins/unity-agent-kit/src/host/registry.ts
plugins/unity-agent-kit/src/host/http-client.ts
plugins/unity-agent-kit/src/host/rebind.ts
plugins/unity-agent-kit/src/contracts/result.ts
```

要求：

- registry read validation；
- `/probe` active validation；
- `/operations` invoke；
- lost/rebind 语义；
- operation envelope → public result 基础映射；
- timeout failure 返回可诊断结果。

### Phase 5A Out of Scope

Phase 5A 不实现：

- 19 个 public action 的完整业务逻辑；
- artifact store；
- MCP Resource handlers；
- TestRunner；
- CompileDiagnostics；
- Console readback；
- PlayMode transition；
- Screenshot capture；
- `/unity` actual skill；
- MCP server public tool registration；
- final daily loop E2E。

可以实现一个最小 internal operation 用于验证 runtime，例如：

```text
host.probe
host.echo
host.status
```

但不能把它们当作 Phase 5 stable public action。

### Phase 5A Reference Mapping

Phase 5A plan 必须映射：

| 能力域 | v2 参考方向 |
|---|---|
| loopback HTTP host | v2 host runtime / loopback server |
| registry / probe | v2 registry / probe / host rebirth |
| main-thread dispatch | v2 Unity API 主线程调度机制 |
| operation envelope | v2 operation envelope / result shape |
| active host validation | v2 host identity / active instance 检查 |

必须说明：采用哪些底层机制、不采用哪些 public contract、为什么不采用、落地到哪些任务。

### Phase 5A Completion Evidence

Phase 5A 完成时必须提供：

- TS tests：registry read、probe active host、lost/rebind、operation envelope mapping、timeout result。
- Unity EditMode tests：registry path 和字段、dynamic port、`/probe`、`/operations`、main-thread dispatch success / exception / timeout、DTO serialization。
- 最小 loopback smoke：Unity host 写入 registry、TS probe 成功、TS invoke 最小 operation 成功、host restart / epoch 变化可检测。

---

## 验证、交付顺序与后续流程

### 交付顺序

Phase 5 拆分接下来按这个顺序推进：

```text
1. 写 Phase 5 split design spec
2. 标记旧总 plan deprecated
3. 创建 Phase 5 plan index
4. 写 Phase 5A Host Runtime implementation plan
5. 在 split design / plan index / 5A plan 都完成后，同步 roadmap Phase 5 planned 状态
6. 执行 Phase 5A
7. 根据 Phase 5A evidence 更新 plan index
8. 继续写 5B plan
```

### Split design spec 自检

本规格写入后，自检必须覆盖：

1. **范围检查**：未正式拆 roadmap phases；5A-5E 是 Phase 5 subplans；升级为正式 phases 需要 roadmap structural change。
2. **旧 plan 安全检查**：旧 plan 被标记 deprecated；旧 plan 不再作为可执行 implementation plan；plan index 指向新 subplans。
3. **subplan 结构检查**：每个 subplan 都要求上游约束摘要、Phase 1-4 compliance matrix、v2 reference mapping、7 分 quality gate、completion evidence、roadmap phase upgrade check。
4. **依赖顺序检查**：5A → 5B → 5C → 5D → 5E；5C / 5D 都可包含异步 workflow；5D 不是异步首次出现；5C 的 console diagnostics 可作为 5D 诊断辅助。
5. **Phase 5A scope 检查**：5A 只做 host runtime；不实现 19 个 public actions 的业务逻辑；不创建 `/unity` skill；不创建 MCP public tool registration；最小 internal operation 只用于 runtime smoke，不作为 stable public action。
6. **reference discipline 检查**：每个 subplan 必须吸收 v2 正确底层机制；不采用 v2 public contract 必须说明原因；禁止把正确机制降级成 stub。
7. **验证强度检查**：行为任务不能只检查文件、函数、字符串或符号存在；completion evidence 必须证明 subplan success criteria；低于 7 分方案不能进入 evidence，除非用户逐条接受风险。

### 后续写 plan index 的要求

Plan index 必须：

- 明确不是 implementation plan；
- 指向 split design spec；
- 列出 5A-5E subplans；
- 记录旧 deprecated plan；
- 记录每个 subplan status / evidence；
- 说明 Phase 5 completed 的条件；
- 说明 roadmap 当前仍是单一 Phase 5。

### 后续写 Phase 5A plan 的要求

5A plan 必须：

- 使用新的 `writing-plans` 结构；
- 包含上游约束摘要；
- 包含 Phase 1-4 compliance matrix；
- 包含 5A reference mapping；
- 包含 7 分 quality gate；
- 每个验证步骤写明“证明”；
- 任务粒度小，避免 5A 自身再次膨胀。

### 与 roadmap-management 通用规则的关系

本次设计只在 Phase 5 split design 中固化 plan index 模式，不立即修改 `roadmap-management` skill。

后续如果本模式跑通，再单独创建一个小流程修复：

```text
当同一 roadmap phase 拆多个 implementation plans 时，roadmap Plan artifact 指向 plan index / split index。
```

### 过渡到 implementation plan

本规格写入并通过自检后，不直接执行 Phase 5A。下一步是调用 `superpowers:writing-plans`，为“Phase 5 split design 落地”创建 implementation plan。该 plan 应包含：

1. 写 split design spec；
2. 废弃旧总 plan；
3. 创建 plan index；
4. 写 Phase 5A implementation plan；
5. 同步 roadmap planned 状态。
