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
3. 创建 Phase 5A Host Runtime implementation plan；
4. 将 roadmap Phase 5 同步到可执行 5A 的 planned 状态。

执行者读到 `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-split-landing.md` 后，容易产生疑问：

> 这里只有 5A plan。5A 完成后，5B / 5C / 5D / 5E 的 plan 应该什么时候写？调用什么技能？输入什么上下文？plan index 状态怎么更新？

## 当前观察到的体验问题

### 1. Plan index 列出了 5A-5E，但缺少 subplan planning loop

`phase-5-plan-index.md` 现在列出 5A-5E 的 plan path 和 status，但没有明确说明：

- 当前 subplan 完成后，什么时候创建下一个 subplan plan；
- 创建下一个 plan 前必须满足什么 evidence gate；
- 写下一个 plan 应调用 `writing-plans`，执行已有 plan 应调用 `subagent-driven-development` 或 `executing-plans`；
- Next Manual Action 应如何从执行 5A 切换到写 5B，再切换到执行 5B。

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
- Completed 5A plan/evidence: docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md
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

## 当前结论

先把 subplan planning loop 补进 Phase 5 plan index，作为项目内可执行规则。等 Phase 5 至少跑通 5A → 5B 的真实接力后，再基于本记录和实际失败模式修改 `superpowers:roadmap-management` skill。
