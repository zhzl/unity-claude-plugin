# Phase 5 Subplan Planning Workflow 体验记录

**日期：** 2026-05-18
**项目：** Unity Agent Kit
**相关 Roadmap：** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**相关 Split Design：** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md`
**相关 Plan Index：** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`

## 目的

记录 Phase 5 使用 plan index 管理 5A-5E subplans 时暴露出的流程体验问题，先作为本项目本地观察记录。等 5A → 5B → 后续 subplan 模式跑通后，再把稳定规则补进 `superpowers:roadmap-management` skill。

## 触发问题

Phase 5 split landing plan 只负责：

1. 废弃旧 Phase 5 总 plan；
2. 创建 Phase 5 plan index；
3. 创建 Phase 5A Host Runtime 初始文档，当前已重新定位为 technical contract；
4. 创建/接入 Phase 5A execution index，并把 roadmap 下一步指向 5A-01 strict execution plan 准备。

执行者读到 `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-split-landing.md` 后，容易产生疑问：

> technical contract 和 execution index 已有，首个 strict execution plan 应该什么时候写？5A execution plans 完成后，5B / 5C / 5D / 5E 应该什么时候写？输入什么上下文？plan index 状态怎么更新？

## 当前观察到的体验问题

### 1. Plan index 列出了 5A-5E，但缺少 subplan planning loop

`phase-5-plan-index.md` 现在列出 5A-5E 的 plan path 和 status，但没有明确说明：

- 当前 subplan 完成后，什么时候创建下一个 subplan plan；
- 创建下一个 plan 前必须满足什么 evidence gate；
- 写下一个 plan 应调用 `writing-plans`，执行已有 plan 应调用 `subagent-driven-development` 或 `executing-plans`；
- Next Manual Action 应如何从准备 5A-01 strict execution plan，切换到执行已审查的 expanded plan，再切换到写 5B。

### 2. Split landing plan 是一次性落地计划，不是长期流程说明

`phase-5-split-landing.md` 明确不创建 5B-5E plans。这个决定是对的，因为 5B 应基于真实完成的 5A Host Runtime contract，而不是基于 5A 计划假设。

但体验上，如果 plan index 不补充长期流程，执行者会误以为拆分只完成了 5A，后续 5B-5E 没有流程入口。

### 3. 5B plan 不应在 5A 完成前正式创建

5B 依赖 5A 的真实交付：

- Unity host runtime；
- `/probe`、`/operations` 的实际 DTO / envelope shape；
- TS host client result mapping；
- `timeout` / `lost` / `rejected` 等基础状态语义；
- registry / rebind / host identity 的实际测试证据。

因此，正式 5B implementation plan 应在 5A completed evidence 后创建。可以提前记录 5B 草稿问题，但不应把草稿标为 `planned`。

### 4. 通用 skill 尚未覆盖“单一 roadmap phase 多 implementation plans”模式

当前 `roadmap-management` 流程没有明确处理：

```text
Roadmap Phase
→ Plan Index / Split Index
→ 多个 sequential subplan implementation plans
→ 每个 subplan 独立 evidence
→ 最终统一 roadmap completion
```

这个问题具有通用性，但在 Phase 5 模式真正跑通前，不应立即修改 skill。先在本项目记录真实摩擦点和失败模式。

## 当前建议的本地补救

在 `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` 中补一个小章节：

```markdown
## Subplan Planning Workflow
```

建议位置：`## Status Rules` 后、`## Deprecated Plans` 前。

该章节只说明流程，不写 5B 技术细节：

1. 当前 subplan plan 创建并审查通过后，状态从 `pending` 到 `planned`；
2. 执行当前 subplan；
3. evidence 通过后，状态从 `planned` / `in-progress` 到 `completed`；
4. 只有当前 subplan `completed` 后，才调用 `superpowers:writing-plans` 创建下一个 subplan implementation plan；
5. 下一个 plan 审查通过后，更新其状态为 `planned`；
6. Roadmap Phase 5 只有全部 subplans 和 final E2E evidence 通过后才能 completed。

## 5A 完成后创建 5B plan 的推荐提示词

当 Phase 5A 代码完成、completion evidence 通过，并且 plan index 中 5A 已标记为 `completed` 后，调用：

```text
/superpowers:writing-plans
```

推荐提示词：

```text
基于已完成的 Phase 5A evidence，创建 Unity Agent Kit Phase 5B Artifact / Resource / Timeout / Completion implementation plan。

输入：
- Roadmap: docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md
- Phase 5 spec: docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md
- Split design: docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md
- Plan index: docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md
- Completed 5A technical contract and execution evidence: docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md + docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md
- Target output: docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5b-artifact-resource-timeout.md

前置条件：
- Phase 5A 已完成并在 plan index 中标记 completed。
- 5B 必须基于真实完成的 5A Host Runtime contract，而不是基于 5A 计划假设。

5B scope：
- artifact store root、metadata schema、safe relative path
- MCP Resource readback foundation
- resource URI parsing and traversal rejection
- workflow-level timeout / polling policy
- completion rules
- artifact/job/uncertain/lost/timeout evidence structure

5B out of scope：
- 不实现 5C editor/compile/console workflows
- 不实现 5D TestRunner/PlayMode/Screenshot workflows
- 不实现 5E MCP public tool registration、/unity skill 或 final daily loop E2E
- 不重新设计 5A Host Runtime

计划必须包含：
- 上游约束摘要
- Phase 1-4 Compliance Matrix
- unity-mcp-v2 Reference Mapping
- Quality Gate，所有对象置信度至少 7/10
- Subplan Completion Evidence
- Roadmap Phase Upgrade Check
- 小步 TDD 任务，每个行为验证必须证明语义，不只检查文件/字符串存在
```

5B plan 写完后，使用 reviewing-specs 做一致性审查：

```text
/superpowers:reviewing-specs docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5b-artifact-resource-timeout.md
```

审查通过后，更新 plan index：

```text
Phase 5B: pending → planned
Next Manual Action → /superpowers:subagent-driven-development docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5b-artifact-resource-timeout.md
```

## 5A 内容 closure 检查新增经验

5A plan 进入实现前，单独跑 `reviewing-specs` 不足以发现所有输入来源的遗漏。更可靠的流程是先做五类输入 closure 检查，再统一修订 plan：

1. **Upstream spec**：核对原 Phase 5 design spec 中适用于 5A Host Runtime foundation 的目标、非目标、result/diagnostic/timeout contract。
2. **Roadmap**：核对 Shared Constraints、Phase 1-4 carry-over 约束、Phase 5 planned/completed 状态和 plan index 边界。
3. **Revision brief**：核对禁止项、v2 吸收纪律、TS test script、project root、DTO/JSON、anti-stub、quality gate。
4. **Split design**：核对 5A scope、non-goals、registry minimum fields、quality gate、completion evidence、roadmap upgrade check。
5. **v2 reference**：核对 `unity-mcp-v2` 中已正确处理的 host lifecycle、transport/protocol、TS rebind/error classification、operation/result envelope 边界。

本次检查暴露的流程问题：

- 只深查 v2 reference 会漏掉 split design 的 registry minimum fields、revision brief 的 `Application.dataPath` project root 要求，以及 upstream spec 的 diagnostic/result foundation 边界。
- 先修某一类输入再查其他输入会反复改同一段 plan。更好的顺序是：五类输入全部检查 → 汇总 blocking / concern / 不采纳项 → 一次性修订 5A plan 和 split landing 内嵌模板 → 再跑 `reviewing-specs`。
- 子代理 prompt 必须明确“只读检查，不调用任何 skill，不执行 reviewing-specs，不派发其他 subagent”。否则子代理可能误把自己当成 reviewing-specs 主会话，再次尝试派发 subagent 并中止。
- v2 reference 检查应按子域拆分并行执行：Unity lifecycle、HTTP transport/protocol、TS client/rebind、operation/result mapping。单个泛化检查容易只覆盖 happy path。

5A 本次五类 closure 的中间结论：

- **Upstream spec**：总体通过，但需澄清 diagnostic minimum shape、`nextStep?` / `job?` 的 5A 边界，以及 host-level timeout 与 workflow timeout contract 的分工。
- **Roadmap**：通过；仅有 5A plan 中 pre-review gate wording 与当前 `planned` 状态的非阻塞文案不一致。
- **Revision brief**：暂不通过；需明确 Unity project root 由 `Application.dataPath` 推导，不依赖 `Environment.CurrentDirectory`。
- **Split design**：暂不通过；需补齐 registry minimum fields：`hostName`、`status`、`startedAt`、`lastProbeAt?`。
- **v2 reference**：不通过；需补齐 compile/updating start guard、reload/quitting cleanup、Start-before-Stop、Stop/Close listener、fail pending work、registry invalid shape、pre-operation rebind、in-flight no replay、post-response stale instance、failure code/message preservation、invalid envelope fail-closed 等 Host Runtime foundation 边界。

本轮后续已完成七组问题的逐条确认，用户均选择完整补强方案：

1. Unity lifecycle / 旧 HTTP 服务处理纳入 5A 必修通过标准。
2. Registry / project identity contract 作为严格接口契约补齐。
3. HTTP transport / protocol 边界作为严格契约补齐。
4. TS client / rebind / error classification 作为 5A foundation 补齐。
5. Operation / result / envelope contract 作为严格 foundation 补齐。
6. Timeout contract 在 5A 中严格分层定义。
7. Completion evidence、Quality Gate、split landing 内嵌模板和状态文案随上述内容同步。

用户确认采用“在现有 5A plan 内完整补强”方案，不拆成 5A1 / 5A2。实际修订要求：修改 5A plan 主体任务、quality gate 和 completion evidence；同步 split landing 内嵌模板；修订后再跑 reviewing-specs。5A 未复审通过前不建议进入实现。

## 后续补 skill 的候选规则

等 Phase 5A → 5B → 至少一个后续 subplan 流程跑通后，考虑把以下规则补进 `superpowers:roadmap-management`：

1. 当同一个 roadmap phase 拆成多个 implementation plans 时，roadmap `Plan` artifact 应指向 plan index / split index，而不是某个单独 subplan。
2. Plan index 必须记录每个 subplan 的 path、status、completion evidence、upgrade check 和 next action。
3. 下一个 subplan implementation plan 只能在前一个 subplan completed evidence 后创建，除非用户明确选择提前写草稿并标注风险。
4. `writing-plans` 用于创建下一个 subplan plan；`subagent-driven-development` / `executing-plans` 用于执行已有 plan。
5. Roadmap phase 不能因为某个 subplan completed 就标记 completed；必须等全部 subplans 和最终 phase-level evidence 通过。
6. 如果某个 subplan 获得独立 roadmap 目标、跨 phase blocker 或能独立解锁后续 phase，应停止并走 roadmap structural change，而不是继续把它藏在 plan index 中。

## 需要继续观察的问题

- 5A completion evidence 应该写在 plan 文件内、plan index row 内，还是另建 execution summary？
- Next Manual Action 应该指向“写 5B plan”，还是在 5A completed 时直接由执行者创建 5B plan？
- 5B plan 是否需要先做独立 spec，还是 split design 中的 5B scope 足够作为 writing-plans 输入？
- reviewing-specs 是否足够审查 subplan plan，还是需要新增 plan-index consistency review？
- 如果 5B 执行时发现 5A contract 需要调整，plan index 如何表达 backtrack / re-open 5A？

## Large Subplan Planning Protocol 新增经验

Phase 5A 暴露出第二类 subplan 体验问题：技术合同可以通过 `reviewing-specs`，但仍不等于 strict `superpowers:writing-plans` executable plan。

本次确认的本地规则：

1. 大 subplan 不再使用 subplan -> batchplan -> sub-batchplan 嵌套。
2. 最大结构固定为 `Roadmap Phase -> Subplan Technical Contract -> Execution Plan Set Index -> Sibling Execution Plans -> Tasks`。
3. `strict writing-plans 不降级`：不能为了缩短计划省略具体失败测试、预期 FAIL、最小实现、预期 PASS、验证命令或 commit。
4. Phase 5A 暂保持单一 formal subplan，因为 Host Runtime identity、DTO、envelope、timeout 和 rebind 共享同一 technical contract。
5. Phase 5A execution plan set 最多 8 个 active sibling execution plans；如果需要第 9 个，或任一 active plan 无法保持 strict writing-plans，则触发 formal subplan split review。
6. Phase 5 plan index 与 5A execution index 是 current-truth；split landing 和 experience doc 只记录历史和经验。
7. 参考 `get-shit-done` 的 sibling plan、wave、context budget 和 plan checker 思路，但不采用 GSD-style 降低 plan 细节密度。

本规则先作为项目本地 protocol 落地。只有等 5A 至少跑通 technical contract -> execution index -> expanded execution plan -> evidence 的真实接力后，才考虑迁移到通用 superpowers skill。

## 当前结论

先执行 `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-contract-execution-plan-set.md`，把 Large Subplan Planning Protocol、5A technical contract 和 5A execution index 落地为项目内 current-truth。等 Phase 5A 至少跑通 technical contract → execution index → expanded strict execution plan → evidence 的真实接力后，再基于本记录和实际失败模式修改通用 superpowers skills。
