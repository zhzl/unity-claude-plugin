---
name: roadmap-management
description: 当用户明确点名 roadmap-management、显式调用 /superpowers:roadmap-management，或要求按 roadmap-management 流程处理指定 ROADMAP.md 时使用；不要因普通长期任务或 roadmap 讨论自动触发
---

# Roadmap Management

一个手动触发的长期任务路线图控制器，用于管理大型 initiative 的 `ROADMAP.md`、阶段状态、共享约束、artifact 映射和下一步手动交接。

<MANUAL-ONLY>
只在用户明确点名 `roadmap-management`、显式调用 `/superpowers:roadmap-management`，或要求按 roadmap-management 流程处理指定 `ROADMAP.md` 时使用本技能。

不要因为用户普通提到这些词就自动触发本技能：
- 长期任务
- roadmap
- 多阶段
- milestone
- 同步状态
- blocker
- 阻塞项

如果用户没有明确请求本技能，继续使用普通 Superpowers 流程。
</MANUAL-ONLY>

## 概述

一个大功能或长期 initiative 对应一个 `ROADMAP.md`：

`docs/superpowers/roadmaps/YYYY-MM-DD-<slug>/ROADMAP.md`

职责分离：

- `ROADMAP.md` 是长期目标、共享约束、阶段状态、artifact 映射和下一步的 current truth。
- `Proposal Brief` 是 proposed change，用于改变路线图方向之前的确认。
- `docs/superpowers/specs/` 保存阶段设计和规格。
- `docs/superpowers/plans/` 保存阶段实现计划。

完整模板和示例片段见 `references/roadmap-format.md`。Roadmap discovery、change discovery、phase strategy 和参考输入映射模板见 `references/roadmap-discovery.md`。

## OpenSpec 文档治理原则

本技能借鉴 OpenSpec 的文档治理思想，但不要复制 OpenSpec 的完整目录和 `changes/` lifecycle。

- **current truth / proposed change 分离：** `ROADMAP.md` 是 current truth；`Proposal Brief` 是 proposed change。
- **职责分离：** roadmap 保存长期状态；spec 保存阶段设计；plan 保存执行步骤。
- **大变更先 Proposal：** 修改目标、共享约束或 phase 结构前，先生成 `Proposal Brief` 并获得用户批准。
- **完成需要 evidence：** `complete-phase` 必须有 `Verification Evidence`。
- **轻量历史：** 使用 `Decisions`、`Pending Proposals`、`Change Log` 和 phase status 保留历史，不新增 archive 目录。

## 用户动作

如果用户没有指定动作，询问：

1. `new-roadmap` — 创建新的长期 roadmap
2. `progress` — 读取 roadmap 和 artifacts，同步状态并显示下一步
3. `write-spec` — 为某个 phase 准备 `Spec Discussion Brief`
4. `write-plan` — 为某个 phase 准备 `superpowers:writing-plans` 交接
5. `implement-plan` — 为某个 phase 准备执行交接
6. `complete-phase` — 记录验证证据并完成 phase
7. `change-roadmap` — 通过 `Proposal Brief` 调整目标、约束或 phase 结构

主循环：

```text
progress → write-spec → write-plan → implement-plan → complete-phase → progress
```

`change-roadmap` 是侧路：当路线图本身需要改变时使用。

## ROADMAP.md 结构

`ROADMAP.md` 应包含：

1. `Metadata`
2. `Goal`
3. `Non-goals`
4. `Shared Constraints`
5. `Success Criteria`
6. `Decisions`
7. `Current State`
8. `Blockers`
9. `Phase Summary`
10. `Phase Details`
11. `Pending Proposals`
12. `Proposal Rules`
13. `Sync Rules`
14. `Handoff Rules`
15. `Change Log`

每个 phase 必须包含 `Artifacts`：

```markdown
**Artifacts:**
- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending
```

Implementation Summary 是简短文本：记录主要变更、commit/PR 引用或执行摘要；不要写详细实现步骤。

## 状态规则

Roadmap status：

- `active`
- `blocked`
- `completed`
- `archived`

Phase status：

- `not-started`
- `needs-spec`
- `designed`
- `planned`
- `in-progress`
- `blocked`
- `completed`
- `archived`

状态推断：

- `Spec: pending` → `needs-spec`
- `Spec` 路径存在且 `Plan: pending` → `designed`
- `Spec` 路径存在且 `Plan` 路径存在且验证证据缺失 → 新阶段用 `planned`；如果 roadmap 已明确记录执行已开始，则保持 `in-progress`
- `Verification Evidence` 存在且 phase success criteria 已满足 → 可以标记 `completed`
- 链接 artifact 路径缺失 → 不推进状态，先标记 artifact missing 或提示用户修正

不要从聊天记忆推断完成度。

## 验收同步规则

最终验收通过后的事实性 roadmap 同步可以由 `subagent-driven-development` 的 roadmap 同步子代理执行。同步是执行验收的一部分，不是独立 action，不新增后台同步机制。

验收同步允许更新的字段：

- 当前 phase 的 `Status`
- Phase Summary 中对应 phase 的 status 和 artifact 摘要
- Phase Details 中对应 phase 的 `Implementation Summary`
- Phase Details 中对应 phase 的 `Verification Evidence`
- `Current State`
- `Last Sync`
- `Next Manual Action`
- `Change Log`

这些更新属于事实更新，不需要 `Proposal Brief`。

验收同步不得修改以下字段和结构：

- 不得修改 `Goal`
- 不得修改 `Non-goals`
- 不得修改 `Shared Constraints`
- 不得修改整体 `Success Criteria`
- 不得修改 phase scope
- 不得修改 phase out-of-scope
- 不得修改 phase success criteria
- 不得修改 phase 顺序
- 不得新增、删除、合并或拆分 phase
- 不得修改 `Proposal Rules`、`Sync Rules` 或 `Handoff Rules`

同步前必须有具体 `Verification Evidence`，并确认 phase success criteria 已被证据覆盖。证据不足以覆盖 phase success criteria 时，不得将 phase 标记为 `completed`。

如果验收结果显示需要结构性 roadmap 变更，同步子代理只报告问题并停止；后续必须通过 `change-roadmap` 流程处理。

## Proposal Rules

需要 `Proposal Brief` 的变更：

- 修改 `Goal`
- 修改 `Non-goals`
- 修改 `Shared Constraints`
- 修改整体 `Success Criteria`
- 新增、删除、合并、拆分、重排 phase
- 大幅修改 phase scope
- 大幅修改 phase success criteria

不需要 `Proposal Brief` 的事实更新：

- 回填 artifact 路径
- 标记 artifact missing
- 更新 `Last Sync`
- 添加 blocker
- 记录 `Verification Evidence`
- 追加 `Change Log`
- 最终验收通过后的事实性 roadmap 同步，仅限“验收同步规则”允许的字段

默认流程：

```text
生成 Proposal Brief → 用户批准 → 更新 ROADMAP.md → 写入 Decisions / Phase Summary / Phase Details / Change Log
```

未批准但需要保留的 proposal 可以写入 `Pending Proposals`。

## Roadmap Discovery Rules

在写完整 `ROADMAP.md` 草案或结构性 `Proposal Brief` 之前，先完成轻量 discovery；模板见 `references/roadmap-discovery.md`。

必须 discovery 的情况：

- `new-roadmap` 总是先生成 `Roadmap Discovery Brief`。
- 结构性 `change-roadmap` 先生成 `Roadmap Change Discovery Brief`，再生成 `Proposal Brief`。
- 用户要求结合多个参考项目、文档或方案时，discovery 和后续 phase 必须包含参考输入映射。
- phase 拆分存在多种合理方式时，先给出 2-3 个 `phase strategy` 选项、权衡和推荐。

不需要 discovery 的事实更新：

- 回填 artifact 路径。
- 标记 artifact missing。
- 更新 `Last Sync`。
- 添加 blocker。
- 记录 `Verification Evidence`。
- 追加 `Change Log`。

确认顺序：

```text
Discovery Brief → phase strategy 选项 → 用户确认策略 → ROADMAP.md 草案或 Proposal Brief → 用户批准 → 写入 current truth
```

展示规则：

- 中文 roadmap 中，除路径、命令、状态枚举、API 字段和代码标识符外，正文统一中文。
- 长草案直接用正文或分节展示；不要把完整草案塞进选择题 preview。

### Discovery 技能边界

Roadmap discovery 是本技能内置的 brainstorming-lite，不是 `superpowers:brainstorming` 的前置步骤。

当当前对话正在执行 `new-roadmap` 或结构性 `change-roadmap` 的 discovery、参考输入映射、phase strategy 讨论、或用户在确认策略前追问目标/架构/工具面/API 边界时，继续使用本技能回答、提问或调整 phase strategy。不要因为这些追问看起来像创造性设计工作而自动调用 `superpowers:brainstorming`。

只有 `write-spec` action 可以建议用户手动调用 `superpowers:brainstorming`，且仍然不能自动调用。

## Action: new-roadmap

用于创建一个大功能的路线图。

步骤：

1. 确认 title、slug 和 roadmap 主题。
2. 收集输入材料：用户描述、引用路径、现有 docs/specs/plans。
3. 生成 `Roadmap Discovery Brief`，提炼目标理解、参考输入摘要、初步范围和未决问题。
4. 如果有未决问题，先提问；不要直接写完整草案。
5. 提出 2-3 个 `phase strategy` 选项，说明权衡并给出推荐。
6. 请求用户确认 phase strategy。
7. 用户确认后，再起草完整 `ROADMAP.md`。
8. 如果用户要求结合多个参考项目、文档或方案，每个 phase 必须写出参考输入映射。
9. 请求用户批准完整草案。
10. 创建 `docs/superpowers/roadmaps/YYYY-MM-DD-<slug>/ROADMAP.md`。

不要写 spec、plan 或实现代码。不要自动调用 `superpowers:brainstorming`；`new-roadmap` 内置的是只服务于 roadmap 的轻量 discovery。

## Action: progress

用于同步状态并显示下一步。

步骤：

1. 读取 `ROADMAP.md`。
2. 定位 `Current State` 和当前 phase。
3. 读取当前 phase 的已链接 artifacts。
4. 如果磁盘证据发生变化，保守更新状态。
5. 输出当前状态和下一条手动命令。

`progress` 合并了内部的 refresh 和 advance 概念，用户不需要理解这两个内部动作。

## Action: write-spec

用于为某个 phase 准备规格讨论。

步骤：

1. 读取 `ROADMAP.md`。
2. 定位目标 phase。
3. 提取 `Goal`、`Shared Constraints`、phase scope、out of scope 和 success criteria。
4. 生成 `Spec Discussion Brief`。
5. 建议用户手动调用 `superpowers:brainstorming`。

不要自动调用 `superpowers:brainstorming`。

## Action: write-plan

用于为已有 spec 的 phase 准备实现计划交接。

步骤：

1. 读取 `ROADMAP.md`。
2. 读取 phase 的 `Spec` 路径。
3. 提取 Roadmap 路径、Phase、`Shared Constraints`。
4. 生成 plan handoff。
5. 建议用户手动调用 `superpowers:writing-plans`。

不要直接写 plan，除非用户另行显式调用 `writing-plans`。

## Action: implement-plan

用于为已有 plan 的 phase 准备执行交接。

步骤：

1. 读取 `ROADMAP.md`。
2. 读取 phase 的 `Plan` 路径。
3. 确认 phase 是 `planned` 或 `in-progress`。
4. 生成 execution handoff。
5. 建议用户手动调用 `superpowers:subagent-driven-development` 或 `superpowers:executing-plans`。

不要直接执行 plan。

## Action: complete-phase

用于记录验证证据并完成 phase。

步骤：

1. 读取 `ROADMAP.md`。
2. 读取 phase 的 `Spec` 和 `Plan`。
3. 要求用户提供具体 `Verification Evidence`。
4. 只有 `Verification Evidence` 具体且 phase success criteria 已满足时，才将 phase 标记为 `completed`。
5. 将 `Current State` 推进到下一个未完成 phase。
6. 追加 `Change Log`。

不能用 `done`、`tested`、`looks good` 这类空泛文字作为完成证据。

## Action: change-roadmap

用于调整路线图本身，而不是推进当前 phase。

步骤：

1. 读取 `ROADMAP.md`。
2. 判断变更类型：事实更新或结构性变更。
3. 事实更新不需要 discovery，也不需要 `Proposal Brief`；按对应状态规则保守更新。
4. 结构性变更先生成 `Roadmap Change Discovery Brief`，说明当前状态、变更动因、参考输入映射和可选策略。
5. 如果影响 phase 结构或 phase scope，先提出 2-3 个 `phase strategy` 选项并请求用户确认。
6. 用户确认策略后，再生成 `Proposal Brief`。
7. 请求用户批准 `Proposal Brief`。
8. 只在批准后更新 current truth。
9. 更新 `Decisions` 和 `Change Log`。

## 手动交接规则

本技能只建议下一条手动命令，不自动调用其他技能。

可以建议：

- `/superpowers:brainstorming`
- `/superpowers:writing-plans`
- `/superpowers:subagent-driven-development`
- `/superpowers:executing-plans`

不要自动调用 `Skill` 工具，不要开始实现，不要运行执行计划。

## 红线

不要：

- 因普通长期任务措辞自然触发本技能。
- 不要新增 natural trigger tests。
- 自动调用其他 Superpowers 技能。
- 在 `new-roadmap` / 结构性 `change-roadmap` 的 discovery 或 phase strategy 讨论中自动调用 `superpowers:brainstorming`。
- 不要创建 CLI 命令。
- 不要创建 schema validators。
- 不要创建后台同步；验收同步只能由执行验收流程中的子代理显式完成，不新增后台同步机制。
- 不要新增 worktree guidance。
- 复制 OpenSpec 的完整 `changes/` lifecycle。
- 不要复制 GSD 的完整 `.planning/PROJECT.md`、`STATE.md`、`CONTEXT.md` artifact set。
- 跳过 `new-roadmap` 的 `Roadmap Discovery Brief`。
- 跳过结构性 `change-roadmap` 的 `Roadmap Change Discovery Brief`。
- 在用户确认 phase strategy 前生成完整 `ROADMAP.md` 草案。
- 用户要求结合多个参考输入时，写出无法追溯到参考输入的抽象 phase。
- 把详细 spec 内容写进 `ROADMAP.md`。
- 把详细实现步骤写进 `ROADMAP.md`。
- 从聊天记忆推断完成度。

## 常见错误

| 错误 | 正确行为 |
|---|---|
| 用户说继续 roadmap 后自动调用 writing-plans | 输出建议的手动命令 |
| 用户要求创建 roadmap 后直接给完整模板 | 先生成 `Roadmap Discovery Brief`，再确认 phase strategy |
| `new-roadmap` discovery 中用户追问架构/API/工具面后自动调用 `brainstorming` | 留在 roadmap discovery 内回答或调整 phase strategy；`write-spec` 时才建议用户手动调用 |
| 用户要求结合多个参考项目但 phase 只写抽象目标 | 为每个 phase 写参考输入映射 |
| 用户要求重排 phase 后立即编辑 ROADMAP.md | 结构性变更先生成 `Roadmap Change Discovery Brief`，确认策略后再生成 `Proposal Brief` |
| 链接 spec 路径缺失但 phase 被标记为 designed | 标记 artifact missing，不推进状态 |
| ROADMAP.md 写入详细实现步骤 | 将实现细节移到 plans |
| spec brief 忽略 Shared Constraints | 在 brief 中完整带入共享约束 |
