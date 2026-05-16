---
name: reviewing-specs
description: Use only when the user explicitly requests a manual review of superpowers design discussions, design specs, implementation plans, or spec/plan consistency.
---

# 审查 Superpowers 规格

## 概述

这是一个纯手动审查 skill，用于用户明确要求时检查 superpowers 设计讨论、设计规格、实现计划或 spec/plan 一致性。

**核心原则：** 只审查，不接管。输出高信号问题和窄范围修订建议；是否采纳由用户决定。

**开始时宣布：** “我正在使用 reviewing-specs 技能进行手动审查。”

## 手动触发要求

只有用户明确要求使用本 skill 或明确要求以下审查时才使用：

- pre-spec review
- 写 spec 前审查
- 需求质疑
- 架构/性能审查
- spec/plan consistency review
- 检查 spec 和 plan 是否一致

如果用户只是普通讨论 roadmap、spec、plan、实现或代码，不要自动使用本 skill。

## 快速路由

| 当前状态 | 使用方式 |
| --- | --- |
| 设计尚未收敛，用户仍在探索需求 | 不审查；建议继续 superpowers:brainstorming |
| 设计已收敛，spec 尚未写 | 使用 Pre-spec review |
| spec 和 plan 都已完成 | 使用 Spec/plan consistency review |
| 已进入代码实现或代码已完成 | 不使用本 skill；改用代码审查或完成前验证流程 |
| 用户要求润色文档 | 不使用本 skill |

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

## 输入完整性检查

审查前先确认材料是否足够。

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

如果字段已经提供但内容是“暂未明确”“以后更好”等模糊表述，不要停止审查；把它作为 must-fix 问题输出。

如果只是次要背景缺失，可以继续审查，但要在结果中标出使用的假设。

### Spec/plan consistency review 需要

- design spec 路径或完整摘录。
- implementation plan 路径或完整摘录。
- 已批准目标和非目标。
- 规格中的成功标准或验收标准。

只有 spec 或只有 plan 时，不执行一致性审查；先说明缺少哪份材料。

## 入口 1：Pre-spec review

用于设计讨论已基本收敛、但设计规格尚未写入文件时。

先做需求质疑；只有需求边界足够清楚时，才继续架构/性能审查。用户明确要求只做其中一个阶段时，只运行指定阶段。

### A. 需求质疑检查

检查：

- 需求是否有会导致 spec 不稳定的歧义。
- 成功标准是否可观察、可测试或可人工验证。
- 非目标是否足够明确，能阻止范围蔓延。
- 是否存在用户未确认但设计默认成立的隐藏假设。
- 是否缺少会改变规格结构的关键场景。
- 审查建议是否会引入新范围；若会，标记为 `scope expansion`。

有 must-fix 时输出：

```markdown
## Top must-fix issues

1. **问题标题**
   - Problem: [歧义、隐藏假设、范围边界或成功标准问题。]
   - Why it must be fixed before spec: [为什么不解决会导致规格不稳定。]
   - Risk if ignored: [后续 spec 或 plan 的具体风险。]
   - Suggested clarification or revision: [窄范围澄清或修订建议。]
```

最多 5 条。没有 must-fix 时输出：

```markdown
No must-fix issues found.
```

### B. 架构/性能检查

检查：

- 组件职责边界是否清楚。
- 是否把一次性需求做成长期框架。
- 是否引入不必要的自动化、抽象或配置。
- 是否存在性能、延迟、执行速度、token 或上下文成本风险。
- 后续实现计划是否能切成小任务。
- 验证是否可以通过聚焦、有限的检查完成。
- 是否和当前 superpowers spec/plan 工作流冲突。

有问题时输出：

```markdown
## Top architecture/performance issues

1. **[blocking|concern] 问题标题**
   - Problem: [架构、性能、复杂度、执行速度或任务切片问题。]
   - Architecture/performance impact: [对边界、运行时、工作流速度或可维护性的影响。]
   - Risk if ignored: [后续规格或实现计划可能失败的方式。]
   - Suggested narrowing or revision: [窄范围调整建议。]
```

最多 5 条。没有问题时输出：

```markdown
No architecture/performance issues found.
```

`blocking` 表示写 spec 前必须处理；`concern` 表示应考虑但可由用户接受风险。

## 入口 2：Spec/plan consistency review

用于 design spec 和 implementation plan 都已经完成后。

检查：

- 覆盖矩阵：spec 每个目标是否能映射到 plan 任务。
- 越界检查：plan 是否加入 spec 未批准的工作。
- 非目标保持：plan 是否违反 spec 的非目标或范围边界。
- 顺序检查：任务依赖是否倒置或缺少前置步骤。
- 验证检查：plan 的验证命令是否能证明 spec 成功标准。
- 术语一致性：核心名称、路径、类型、阶段编号是否漂移。
- 占位符检查：是否存在 `TODO`、`待定`、`类似前文`、`适当处理`、`补充细节` 等模糊语。

有阻塞问题时输出：

```markdown
## Blocking consistency issues

1. **问题标题**
   - Location: [相关 spec 和 plan 章节或路径。]
   - Problem: [矛盾、遗漏、越界、排序问题或验证缺口。]
   - Why it affects execution or validation: [为什么会影响实现或验收。]
   - Suggested document revision: [窄范围文档修订建议。]
```

最多 5 条。没有阻塞问题时输出：

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

## 常见错误

| 错误 | 正确做法 |
| --- | --- |
| 看到 spec 或 plan 就自动触发 | 只有用户明确要求手动审查才触发 |
| 审查时顺手改文件 | 只输出问题和建议，不修改文件 |
| 把 pre-spec review 变成写 spec | 指出问题，等待用户决定 |
| 把 consistency review 变成写 plan | 比较覆盖、越界、顺序和验证，不生成计划 |
| 输出大量泛泛建议 | 最多输出高影响问题 |
| 把 concern 当成必须修改 | concern 只表示需要用户接受的风险 |
