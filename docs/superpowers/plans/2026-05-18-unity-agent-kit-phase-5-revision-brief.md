# Unity Agent Kit Phase 5 Plan Revision Brief

> **用途：** 本文件不是 implementation plan。它保存 Phase 5 旧 plan 审查后已确认的修订输入，供后续流程修复、Phase 5 拆分和新 subplans 编写使用。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`  
**Original Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`  
**Old Plan Under Review:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure.md`  
**Date:** 2026-05-18

---

## 1. 适用标准

后续 Phase 5 修订必须同时满足 Roadmap Phase 1-5 已制定的标准：

| Phase | 对 Phase 5 修订的约束 |
|---|---|
| Phase 1 | 单一 Unity C# host runtime；边界清楚；C# host 位于 `unity/Assets/UnityAgentKit/`；不复制双 host。 |
| Phase 2 | `/unity` skill 是薄路由和 recipe 指导层；实现逻辑留在 MCP tools / Unity host；recipe 必须和 public tools 语义一致。 |
| Phase 3 | Public action contract 稳定；schema 有界；safety metadata 准确；禁止 free-form params。 |
| Phase 4 | Async / job / workflow / artifact 语义可靠；不能刚请求就读结果；不能无证据报成功；Resource 必须可验证。 |
| Phase 5 | 19 个 P0 actions 必须真实支撑 daily loop；不能 stub、固定 pass、固定空 Console 或假 artifact。 |

---

## 2. 已确认的 action 级修订

| # | Action / 能力 | 已确认修订 |
|---:|---|---|
| A1 | `unity_test.*` | 必须改为真实 Unity Test Runner API 实现，不能保留 stub、内存假 job、固定 pass report。 |
| A2 | `unity_compile.compile_and_check` | 必须实现真实 bounded compile lifecycle + compiler message attribution。无归因证据时返回 `uncertain`，不能用 idle 或 Console-clean 冒充成功。 |
| A3 | `unity_console.snapshot/count` | 必须真实读取 Unity Console，借鉴 unity-mcp-v2 的 `UnityEditor.LogEntries` 反射读取方案。 |
| A4 | `unity_screenshot.capture_game_view` | 保留 Phase 5 public action、artifact root 和 Resource URI；Unity 侧借鉴 v2 Game View 查找、focus、repaint、target size。 |
| A5 | `unity_compile.request` | 必须加入 busy guard、`AssetDatabase.Refresh()`、no-op evidence。 |
| A6 | `unity_playmode.*` | 必须加入 v2 风格 `transitionStatus` 和 no-op evidence；public 仍只暴露 `get_state/enter_and_verify/exit_and_verify`。 |
| A7 | Editor / host / evidence project root | 统一用 `Application.dataPath` 推导 Unity project root，避免依赖 `Environment.CurrentDirectory`。 |
| A8 | `unity_editor.wait_ready` | 保持 read-only，不自动退出 PlayMode；需要退出时使用 `unity_playmode.exit_and_verify`。 |

---

## 3. 已确认的禁止项

| # | 禁止项 | 原因 |
|---:|---|---|
| F1 | 禁止使用 `InternalEditorUtility.ReadScreenPixel + Texture2D.EncodeToPNG + File.WriteAllBytes` 作为截图方案。 | 用户明确指出该方案错误。 |
| F2 | 禁止截图刚请求就立刻读文件。 | 违反 Phase 4 async / artifact 语义；必须 bounded completion/readback。 |
| F3 | 禁止固定空 Console 结果。 | 会漏报真实错误，不能支撑 daily loop diagnostics。 |
| F4 | 禁止固定 pass test report。 | 会产生测试假通过。 |
| F5 | 禁止把 unity-mcp-v2 中正确可用的底层实现降级成 stub。 | public contract 可不同，但正确底层机制必须映射和吸收。 |
| F6 | 禁止 string concat / string search 作为 C# host protocol 的主要 JSON 实现。 | 不满足 Phase 3 schema contract 和 Phase 4 result semantics。 |
| F7 | 禁止 fire-and-forget 后直接返回 operation success。 | 不满足 Unity main-thread dispatch 和 async completion 语义。 |
| F8 | 禁止低于 7 分的 action / 基础设施方案进入验收路径，除非用户逐条明确接受风险。 | 防止明知低可信方案成为 completion evidence。 |

---

## 4. 已确认的 unity-mcp-v2 使用原则

| # | 原则 | 说明 |
|---:|---|---|
| V1 | 不做 Legacy v2 public tool compatibility layer。 | Phase 5 public contract 使用 Unity Agent Kit 新 action/resource/status 体系。 |
| V2 | 正确底层机制必须借鉴 v2。 | Console、TestRunner、PlayMode、Screenshot、compile request 等能力不能自由发挥成弱实现。 |
| V3 | public contract 差异不等于底层实现不用参考。 | API、Resource URI、artifact root 可以不同；Unity 侧机制应尽量复用正确经验。 |
| V4 | 不采用 v2 的某部分时必须说明原因。 | 例如 v2 `compile.run_and_wait + console snapshot` 不能证明 compiler message attribution，因此不能作为 `compile_and_check` 成功判据。 |
| V5 | 后续 plan 必须新增 `unity-mcp-v2 reference mapping` 章节。 | 每个能力域列出 v2 对应文件/operation/service、可复用机制、Phase 5 必须不同的 contract、不采用原因和落地要求。 |

---

## 5. 旧 plan 暴露的问题

| 问题 | 具体表现 | 根因 |
|---|---|---|
| 前序 spec 约束没有变成强制门禁 | Phase 4 反复强调 async/job/artifact，但截图仍刚请求就读文件。 | 只引用前序 spec，没有做 compliance matrix。 |
| Phase 内容过大导致实现漂移 | 一个 3000+ 行 plan 同时覆盖 host、19 actions、skill、MCP、E2E。 | 单个实现单元超出可靠规划容量。 |
| 参考实现吸收不完整 | v2 Console/TestRunner/Screenshot/PlayMode 有正确底层机制，但 plan 写成固定空值或 stub。 | 没有 reference implementation mapping。 |
| public contract 差异被误用 | Phase 5 不兼容 v2 public tools 是对的，但底层机制仍应借鉴。 | 把“API 不同”误解成“实现可自由发挥”。 |
| 测试设计太弱 | 字符串包含测试允许 fake job、fixed pass、empty console 通过。 | plan 没有要求测试证明真实行为。 |
| 基础设施和 action 混杂 | transport/DTO/artifact/job 分散在 action 任务里。 | 依赖顺序错误，action 任务临时补基础设施。 |
| 验收证据太后置 | E2E、Resource readback、first failure policy 在末尾才出现。 | 成功标准没有反推到每个任务。 |
| 没有 scope-size gate | Phase 5 是否过大没有在写 plan 前被拦截。 | roadmap/write-plan 流程缺少拆 phase / subplans 检查。 |

---

## 6. 已确认的 plan 结构修订

| 编号 | 结论 |
|---:|---|
| U1 | Phase 5 plan 必须重排为基础设施优先，再做 action vertical slice。 |
| U2 | 新增 `unity-mcp-v2 reference mapping` 章节。 |
| U3 | 实现真实 loopback HTTP server：动态端口、`/probe`、`/operations`、统一 response、启动/停止、domain reload identity/epoch。 |
| U4 | 实现可等待、有返回值、有异常传播、有 timeout 的 Unity main-thread dispatch。 |
| U5 | 独立实现 active host validation / probe / rebind / lost 语义。 |
| U6 | C# host request/response 使用 DTO + JSON serialization/deserialization。 |
| U7 | 新增 operation result envelope → TS public result → MCP tool result 统一映射规则。 |
| U8 | 新增统一 Artifact store 标准，screenshot/test/console 共用 metadata schema。 |
| U9 | 独立实现 MCP Resource readback 安全与验证。 |
| U10 | 所有 wait/job/artifact/resource/E2E path 强制落地 timeout / polling policy。 |
| U11 | 新增 Async / Job / Artifact completion rules 横向约束。 |
| U12 | 全面升级测试策略，测试必须防止 stub / fixed result / false success。 |
| U13 | Unity EditMode tests 采用 service adapter 单元测试 + 最少真实 API smoke/integration。 |
| U14 | TS 测试和运行脚本统一使用 Node `--experimental-strip-types`。 |
| U15 | MCP server registration 使用真实 SDK API 或最接近真实 SDK 的 smoke test 验证。 |
| U16 | `/unity` recipe audit 升级为语义审计。 |
| U17 | `/unity` skill 使用 skeleton + gated recipe drafts，E2E 后解除 gating。 |
| U18 | E2E daily loop runner 必须真实执行 daily loop 并输出 structured report。 |
| U19 | 定义严格 completion evidence 模板。 |
| U20 | 先修订 plan 并 commit，再同步 roadmap planned 状态并 commit，然后 implementation。 |
| U21 | plan 拆分为更小、更可验证的任务粒度。 |
| U22 | 设定 7 分 quality gate，低分 action / 基础设施必须修订。 |

---

## 7. 建议的新拆分方向

当前 Phase 5 不应继续用一个 3000+ 行总 plan 直接实现。后续流程修复后，应先决定是拆成同一 roadmap Phase 下的 subplans，还是进行正式 roadmap phase 结构调整。

建议默认先拆为同 Phase subplans：

| 子计划 | 目标 | 可独立验收 |
|---|---|---|
| Phase 5A：Host Runtime 基础设施 | loopback HTTP、registry、probe、main-thread dispatch、DTO/result envelope、active host/lost/rebind。 | 是 |
| Phase 5B：Artifact / Resource / Timeout 基础设施 | artifact store、metadata、Resource readback、timeout/polling、completion rules。 | 是 |
| Phase 5C：核心 diagnostic actions | editor、compile、console。 | 是 |
| Phase 5D：job/test/playmode/screenshot actions | TestRunner、PlayMode、Screenshot。 | 是 |
| Phase 5E：MCP / Skill / E2E / roadmap evidence | public tools 暴露、recipe gating、E2E daily loop、completion evidence。 | 是 |

如果后续判断这些子计划本身应成为 roadmap current truth 中的正式 phase，则必须通过 roadmap structural change / proposal 流程处理。

---

## 8. 后续流程修复要求

在重写 Phase 5 plan 前，先修复流程规则：

1. `roadmap-management` 增加 phase scope-size gate。
   - 如果一个 phase 同时包含多个可独立验收子系统，必须先建议拆正式 phase 或拆同 phase subplans。

2. `writing-plans` 增加强制表。
   - 前序 spec compliance matrix。
   - Reference implementation mapping。
   - Low-confidence / stub risk table。
   - Quality gate：低于 7 分必须修订或明确排除出 completion evidence。

3. Plan review gate 增加专项检查。
   - 是否吸收参考实现。
   - 是否继承前序 spec。
   - 是否存在 stub / fixed result / weak tests。
   - 是否存在 async/job/artifact 假完成。

---

## 9. 后续使用方式

后续继续 Phase 5 时，不要直接执行旧 plan。建议流程：

1. 修复流程规则。
2. 回到本 revision brief。
3. 按新流程决定 Phase 5 拆为 subplans 还是正式修改 roadmap phase 结构。
4. 废弃或替换旧 3000+ 行 plan。
5. 为第一个子计划重新编写小而可验证的 implementation plan。
6. 每个子计划独立验证、commit、review。
