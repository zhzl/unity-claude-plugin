# Plan 验收文档同步设计

## 背景

Superpowers 的长期工作流已经区分 `ROADMAP.md`、阶段规格和阶段实现计划。当前缺口在于：实现计划完成并通过验收后，plan 复选框和 roadmap 进度仍容易留给主会话手动整理，既占用主会话上下文，也容易遗漏证据或状态更新。

本设计补齐执行阶段的文档同步规则：任务级进度写回 plan，整份 plan 最终验收通过后写回 roadmap；同步工作由已通过验收的子代理或专门的同步子代理执行，主会话只做轻量 diff 核对和流程协调。

## 目标

- 在 `subagent-driven-development` 中明确任务验收后同步 plan checkbox 的时机和责任方。
- 在 `subagent-driven-development` 中明确最终整体验收通过后同步 roadmap 的时机和责任方。
- 在 `roadmap-management` 中明确验收同步允许更新的字段、证据要求和禁止边界。
- 保持 `ROADMAP.md` 作为长期 current truth，plan 作为任务级执行记录。
- 避免主会话复制、整理或重写大量 plan / roadmap 内容。

## 非目标

- 不新增后台同步机制。
- 不新增 CLI 命令、schema validator 或自动扫描器。
- 不改变 roadmap 的 manual-only 触发规则。
- 不允许子代理修改 roadmap 的目标、共享约束、phase 结构或 phase success criteria。
- 不改变 `writing-plans` 生成计划的基础格式。

## 影响文件

- 修改：`plugins/superpowers/skills/subagent-driven-development/SKILL.md`
- 修改：`plugins/superpowers/skills/roadmap-management/SKILL.md`
- 修改或新增：`plugins/superpowers/tests/claude-code/test-roadmap-management.sh`
- 修改或新增：`plugins/superpowers/tests/claude-code/test-subagent-driven-development.sh`

## 设计概述

采用职责分离方案：

- `subagent-driven-development` 负责执行流程中的同步时机和子代理分工。
- `roadmap-management` 负责 roadmap 可同步字段、完成证据要求和禁止变更边界。

同步是执行验收的一部分，不是独立的 roadmap action，也不是后台任务。只有任务或整份 plan 已经过相应验收关卡，才允许同步对应文档。

## 任务级 plan 同步

每个任务的子代理执行流程调整为：

1. 实现子代理完成当前任务并报告结果。
2. 规格合规审查子代理确认实现符合计划和规格。
3. 代码质量审查子代理确认无阻塞性质量问题。
4. 文档同步子代理更新 plan 文件中当前任务对应的复选框。
5. 主会话检查 VCS diff，确认只勾选了正确任务。
6. 主会话将对应 Todo 标记为 completed。

同步规则：

- 只勾选已经通过两阶段审查的当前任务。
- 不提前勾选后续任务。
- 不改写任务正文、代码块、命令、预期输出或验收标准。
- 如果任务标题、编号或步骤无法唯一匹配，子代理必须停止并报告，不能猜测。
- 主会话不把 plan 内容复制进上下文重新整理，只核对 diff 和子代理返回的精确摘要。

## 最终 roadmap 同步

当整份 plan 的全部任务完成后，执行流程调整为：

1. 分派最终代码审查子代理审查整体实现。
2. 最终审查通过后，分派 roadmap 同步子代理。
3. roadmap 同步子代理读取 plan 头部的 `Roadmap` 和 `Phase` 字段。
4. 子代理基于最终审查结果、验证命令输出、提交引用或 diff 摘要提炼：
   - `Implementation Summary`
   - `Verification Evidence`
5. 子代理更新对应 `ROADMAP.md` 的事实性进度字段。
6. 主会话检查 VCS diff，确认 roadmap 更新范围符合允许字段。

只有 plan 明确包含 `Roadmap` 和 `Phase` 时才执行 roadmap 同步。没有 roadmap 上下文时，不主动查找 roadmap，不调用 roadmap-management，也不猜测所属 phase。

## Roadmap 允许同步的字段

最终验收通过后，roadmap 同步子代理可以更新：

- 当前 phase 的 `Status`
- Phase Summary 中对应 phase 的 status 和 artifact 摘要
- Phase Details 中对应 phase 的 `Implementation Summary`
- Phase Details 中对应 phase 的 `Verification Evidence`
- `Current State`
- `Last Sync`
- `Next Manual Action`
- `Change Log`

这些更新属于事实性进度同步，不需要 `Proposal Brief`。

## Roadmap 禁止同步的字段

roadmap 同步子代理不能修改：

- `Goal`
- `Non-goals`
- `Shared Constraints`
- 整体 `Success Criteria`
- phase scope
- phase out-of-scope
- phase success criteria
- phase 顺序
- phase 新增、删除、合并或拆分
- `Proposal Rules`
- `Sync Rules`
- `Handoff Rules`

如果验收过程中发现需要结构性 roadmap 变更，子代理只报告问题并停止；后续仍需按 `roadmap-management change-roadmap` 流程处理。

## 完成证据要求

roadmap 同步必须有具体 `Verification Evidence`。可接受证据包括：

- 验证命令、退出结果和关键输出摘要。
- 已通过的相关测试数量或脚本名称。
- 最终审查子代理的通过结论和主要覆盖项。
- 实现 commit、PR 或 diff 摘要。
- 针对 phase success criteria 的逐项覆盖说明。

不能用以下文字作为完成证据：

- `done`
- `tested`
- `looks good`
- `完成了`
- `应该可以`

如果证据不足以覆盖 phase success criteria，不能把 phase 标记为 `completed`。

## 主会话职责

主会话仍负责流程协调，但不承担文档整理工作：

- 分派实现、审查和同步子代理。
- 回答子代理的必要问题。
- 检查同步子代理产生的 VCS diff。
- 在 diff 合规后更新 Todo 状态。
- 对不合规同步发起修复或要求子代理停止。

主会话不应把整份 plan 或 roadmap 复制进上下文来手动重写同步内容。

## 测试策略

本次改动以静态文档规则测试为主。

### roadmap-management 测试

更新或新增 `plugins/superpowers/tests/claude-code/test-roadmap-management.sh`，检查：

- skill 明确允许最终验收通过后的事实性 roadmap 同步。
- skill 列出允许同步的字段。
- skill 禁止结构性 roadmap 变更。
- skill 明确 `Verification Evidence` 必须具体。
- skill 仍禁止后台同步、CLI 命令、schema validator 和自然触发。

### subagent-driven-development 测试

更新或新增 `plugins/superpowers/tests/claude-code/test-subagent-driven-development.sh`，检查：

- 每个任务通过规格合规审查和代码质量审查后，才同步 plan checkbox。
- plan checkbox 同步由子代理执行。
- 最终整体审查通过后，roadmap 同步由子代理执行。
- 主会话只核对 VCS diff，不承担大段文档同步。
- 没有 `Roadmap` 和 `Phase` 字段时，不主动查找 roadmap。

## 成功标准

- `subagent-driven-development` 明确规定任务级和最终级文档同步流程。
- `roadmap-management` 明确规定最终验收后的事实性 roadmap 同步边界。
- 静态测试覆盖新增规则和关键禁止项。
- 所有相关测试命令通过。
- 改动保持文档规则层面，不新增运行时代码或后台自动化。
