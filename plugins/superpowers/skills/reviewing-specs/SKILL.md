---
name: reviewing-specs
description: Use only when the user explicitly invokes /superpowers:reviewing-specs or asks to use reviewing-specs for manual pre-spec review or spec/plan consistency review of superpowers artifacts. Do not use for ordinary code review, subagent-driven spec compliance review, roadmap sync validation, implementation verification, or checkbox/documentation sync.
---

# 审查 Superpowers 规格

## 概述

这是一个手动触发、强制 subagent 执行的审查 skill，用于用户明确要求时检查 superpowers 设计讨论、设计规格、实现计划或 spec/plan 一致性。

**核心原则：** 手动触发，subagent 审查。主会话只准备上下文、派发 subagent、转述结果；不得自行完成审查。

**开始时宣布：** “我正在使用 reviewing-specs 技能派发 subagent 进行手动审查。”

## 手动触发要求

这是显式调用型 skill。只有用户明确写出以下意图时才使用：

- `/superpowers:reviewing-specs`
- `use reviewing-specs` / `使用 reviewing-specs`
- “按 reviewing-specs 流程做手动审查”
- 明确要求 `pre-spec review` 或 `spec/plan consistency review`，且上下文是 superpowers 设计/spec/plan artifact 的人工审查

如果用户只是普通讨论 roadmap、spec、plan、实现或代码，不要自动使用本 skill。不要因为 subagent prompt 中出现“规格审查”“spec review”“plan”“roadmap”“consistency”等词就触发本 skill。

## 强制 subagent 规则

一旦本 skill 被触发，必须派发 subagent 执行审查。在 Claude Code 中，subagent 派发工具是 `Agent` 工具；部分旧文档或平台可能称为 `Task` 工具。按当前平台的实际 subagent 派发工具执行。

主会话只允许：

1. 判断是否适用本 skill。
2. 选择审查入口。
3. 检查输入是否足够。
4. 构造 subagent prompt。
5. 转述 subagent 结果并询问用户是否采纳。

主会话不得：

- 自行输出审查结论。
- 在 subagent 返回前判断设计是否通过。
- 在 subagent 不可用时 fallback 到内联审查。

如果当前环境不能派发 subagent，停止并说明：

```markdown
无法执行 reviewing-specs：该 skill 要求 subagent 审查，但当前环境无法派发 subagent。
```

## 快速路由

| 当前状态 | 使用方式 |
| --- | --- |
| 设计尚未收敛，用户仍在探索需求 | 不审查；建议继续 superpowers:brainstorming |
| 设计已收敛，spec 尚未写 | 派发 subagent 执行 Pre-spec review |
| spec 和 plan 都已完成 | 派发 subagent 执行 Spec/plan consistency review |
| 已进入代码实现或代码已完成 | 不使用本 skill；改用代码审查或完成前验证流程 |
| subagent-driven-development 的规格合规审查 | 不使用本 skill；按实现计划的规格合规审查 prompt 执行 |
| roadmap 同步、completion evidence、plan checkbox 或文档同步检查 | 不使用本 skill；只做对应文本/状态验证 |
| 用户要求润色文档 | 不使用本 skill |
| subagent 派发工具不可用 | 停止；不内联审查 |

## 公共边界

必须遵守：

- 不修改文件。
- 不写或重写 spec。
- 不写或重写 plan。
- 不生成实现计划。
- 不审查代码实现。
- 不扩大已批准范围。
- 不输出泛泛最佳实践。
- 不重复用户或主会话已明确接受的结论。
- 不把 `concern` 自动升级为 `blocking`。
- 不把 minor improvement 作为进入实现前的阻塞条件。
- 不在 subagent 不可用时改由主会话内联审查。
- 不把 subagent 结果自动写入文档；必须等待用户决定。

## 输入完整性检查

派发 subagent 前先确认材料是否足够。

### Pre-spec review 需要

- 当前设计摘要或设计讨论结论。
- 目标。
- 非目标或明确范围边界。
- 成功标准。
- 已知约束。

缺少关键输入时，先输出：

```markdown
缺少审查输入：
- [缺少的输入]

请补充后再进行审查。
```

如果字段已经提供但内容是“暂未明确”“以后更好”等模糊表述，不要停止审查；将该材料交给 subagent，并要求它把模糊表述作为 must-fix 问题输出。

如果只是次要背景缺失，可以继续派发 subagent，但要在 prompt 中标出使用的假设。

### Spec/plan consistency review 需要

- design spec 路径或完整摘录。
- implementation plan 路径或完整摘录。
- 已批准目标和非目标。
- 规格中的成功标准或验收标准。

只有 spec 或只有 plan 时，不执行一致性审查；先说明缺少哪份材料。

## Subagent prompt 要求

派发 subagent 时，prompt 必须包含：

- 说明这是 `reviewing-specs` 的强制 subagent 审查。
- 审查入口：`pre-spec review` 或 `spec/plan consistency review`。
- 用户提供的材料、路径或摘要。
- 公共边界：不修改文件、不写 spec、不写 plan、不生成实现计划、不审查代码实现。
- 对应入口的检查清单。
- 对应入口的输出格式和最多问题数量。

subagent 只返回审查结果，不扩展范围。

## 入口 1：Pre-spec review

用于设计讨论已基本收敛、但设计规格尚未写入文件时。

派发 subagent 先做需求质疑；只有需求边界足够清楚时，才继续架构/性能审查。用户明确要求只做其中一个阶段时，要求 subagent 只运行指定阶段。

### A. 需求质疑检查

要求 subagent 检查：

- 需求是否有会导致 spec 不稳定的歧义。
- 成功标准是否可观察、可测试或可人工验证。
- 非目标是否足够明确，能阻止范围蔓延。
- 是否存在用户未确认但设计默认成立的隐藏假设。
- 是否缺少会改变规格结构的关键场景。
- 审查建议是否会引入新范围；若会，标记为 `scope expansion`。

有 must-fix 时要求 subagent 输出：

```markdown
## Top must-fix issues

1. **问题标题**
   - Problem: [歧义、隐藏假设、范围边界或成功标准问题。]
   - Why it must be fixed before spec: [为什么不解决会导致规格不稳定。]
   - Risk if ignored: [后续 spec 或 plan 的具体风险。]
   - Suggested clarification or revision: [窄范围澄清或修订建议。]
```

最多 5 条。没有 must-fix 时要求 subagent 输出：

```markdown
No must-fix issues found.
```

### B. 架构/性能检查

要求 subagent 检查：

- 组件职责边界是否清楚。
- 是否把一次性需求做成长期框架。
- 是否引入不必要的自动化、抽象或配置。
- 是否存在性能、延迟、执行速度、token 或上下文成本风险。
- 后续实现计划是否能切成小任务。
- 验证是否可以通过聚焦、有限的检查完成。
- 是否和当前 superpowers spec/plan 工作流冲突。

有问题时要求 subagent 输出：

```markdown
## Top architecture/performance issues

1. **[blocking|concern] 问题标题**
   - Problem: [架构、性能、复杂度、执行速度或任务切片问题。]
   - Architecture/performance impact: [对边界、运行时、工作流速度或可维护性的影响。]
   - Risk if ignored: [后续规格或实现计划可能失败的方式。]
   - Suggested narrowing or revision: [窄范围调整建议。]
```

最多 5 条。没有问题时要求 subagent 输出：

```markdown
No architecture/performance issues found.
```

`blocking` 表示写 spec 前必须处理；`concern` 表示应考虑但可由用户接受风险。

## 入口 2：Spec/plan consistency review

用于 design spec 和 implementation plan 都已经完成后。

要求 subagent 检查：

- 覆盖矩阵：spec 每个目标是否能映射到 plan 任务。
- 越界检查：plan 是否加入 spec 未批准的工作。
- 非目标保持：plan 是否违反 spec 的非目标或范围边界。
- 顺序检查：任务依赖是否倒置或缺少前置步骤。
- 验证检查：plan 的验证命令是否能证明 spec 成功标准。
- 上游约束检查：roadmap/spec/user-confirmed constraints 是否进入 plan，并影响任务或验证。
- 参考输入检查：如果存在参考输入，plan 是否说明采用/不采用的部分及原因。
- 验证强度检查：任务验证是否证明成功标准，而不只是证明文件、符号或文本存在。
- 拆分检查：plan 是否记录拆分判断；如果范围过大，是否已拆分或记录用户选择。
- 执行性检查：任务是否可按顺序执行，是否存在缺少前置任务或跨任务依赖倒置。
- 术语一致性：核心名称、路径、类型、阶段编号是否漂移。
- 占位符检查：是否存在 `TODO`、`待定`、`类似前文`、`适当处理`、`补充细节` 等模糊语。

有阻塞问题时要求 subagent 输出：

```markdown
## Blocking consistency issues

1. **问题标题**
   - Location: [相关 spec 和 plan 章节或路径。]
   - Problem: [矛盾、遗漏、越界、排序问题或验证缺口。]
   - Why it affects execution or validation: [为什么会影响实现或验收。]
   - Suggested document revision: [窄范围文档修订建议。]
```

最多 5 条。没有阻塞问题时要求 subagent 输出：

```markdown
No blocking consistency issues found.

## Minor improvements

- [仅包含能改善执行或验证清晰度的小建议。]
```

Minor improvements 最多 3 条。

## 反馈处理

- `blocking` / must-fix：必须处理，或由用户明确接受风险并拒绝修改。
- `concern`：风险提醒，不自动阻塞；用户可以接受该权衡。
- minor improvement：只改善执行或验证清晰度，不阻塞进入下一步。
- 与已批准范围冲突的建议必须标记为 `scope expansion`，不能直接纳入范围。
- 如果材料不适合当前入口，停止审查并说明应回到哪个流程阶段。
- 主会话不得把 subagent 结果自动写入文档；必须等待用户决定。
- 如果审查发现 plan 可能应拆分，只能建议拆分为多个 plans、回到 roadmap change，或要求 plan 记录用户接受单一 plan 风险；不得自行重写 plan 或决定 roadmap phase 结构。

## 常见错误

| 错误 | 正确做法 |
| --- | --- |
| 看到 spec 或 plan 就自动触发 | 只有用户明确要求手动审查才触发 |
| 触发后主会话直接审查 | 派发 subagent；主会话只转述结果 |
| subagent 派发工具不可用时内联审查 | 停止并说明无法执行 reviewing-specs |
| 审查时顺手改文件 | 只输出问题和建议，不修改文件 |
| 把 pre-spec review 变成写 spec | 指出问题，等待用户决定 |
| 把 consistency review 变成写 plan | 比较覆盖、越界、顺序和验证，不生成计划 |
| 输出大量泛泛建议 | 最多输出高影响问题 |
| 把 concern 当成必须修改 | concern 只表示需要用户接受的风险 |
