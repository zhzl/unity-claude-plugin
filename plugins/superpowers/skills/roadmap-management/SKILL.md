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

完整模板和示例片段见 `references/roadmap-format.md`。

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

默认流程：

```text
生成 Proposal Brief → 用户批准 → 更新 ROADMAP.md → 写入 Decisions / Phase Summary / Phase Details / Change Log
```

未批准但需要保留的 proposal 可以写入 `Pending Proposals`。

## Action: new-roadmap

用于创建一个大功能的路线图。

步骤：

1. 确认 title 和 slug。
2. 确认 `Goal`。
3. 确认 `Non-goals`。
4. 确认 `Shared Constraints`。
5. 起草 phases。
6. 请求用户批准 phase 拆分。
7. 创建 `docs/superpowers/roadmaps/YYYY-MM-DD-<slug>/ROADMAP.md`。

不要写 spec、plan 或实现代码。

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
2. 生成 `Proposal Brief`。
3. 请求用户批准。
4. 只在批准后更新 current truth。
5. 更新 `Decisions` 和 `Change Log`。

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
- 不要创建 CLI 命令。
- 不要创建 schema validators。
- 不要创建后台同步。
- 不要新增 worktree guidance。
- 复制 OpenSpec 的完整 `changes/` lifecycle。
- 不要复制 GSD 的完整 `.planning/PROJECT.md`、`STATE.md`、`CONTEXT.md` artifact set。
- 把详细 spec 内容写进 `ROADMAP.md`。
- 把详细实现步骤写进 `ROADMAP.md`。
- 从聊天记忆推断完成度。

## 常见错误

| 错误 | 正确行为 |
|---|---|
| 用户说继续 roadmap 后自动调用 writing-plans | 输出建议的手动命令 |
| 用户要求重排 phase 后立即编辑 ROADMAP.md | 先生成 `Proposal Brief` |
| 链接 spec 路径缺失但 phase 被标记为 designed | 标记 artifact missing，不推进状态 |
| ROADMAP.md 写入详细实现步骤 | 将实现细节移到 plans |
| spec brief 忽略 Shared Constraints | 在 brief 中完整带入共享约束 |
