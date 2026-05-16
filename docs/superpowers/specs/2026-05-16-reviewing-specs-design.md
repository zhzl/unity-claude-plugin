# Reviewing Specs Skill 设计规格

## 背景

`references/superpowers-agents/` 中现有 3 个审查型 agent：

- `superpowers-spec-skeptic`：写设计规格前的需求质疑。
- `superpowers-architecture-reviewer`：写设计规格前的架构、性能、复杂度审查。
- `superpowers-doc-consistency-reviewer`：设计规格和实现计划完成后的文档一致性审查。

这些 agent 都服务于 superpowers 的 `brainstorming → writing-plans → implementation` 工作流，但它们目前是子代理形态，且触发方式依赖人工点名。用户希望把它们改造成纯手动 skill，并确认是否应合并、是否需要优化内容。

## 目标

创建一个新的纯手动 skill：`reviewing-specs`，用于在用户明确请求时审查 superpowers 设计讨论、设计规格、实现计划及 spec/plan 一致性。

该 skill 应满足：

1. 只在用户明确请求手动审查时使用，不自动嵌入 `brainstorming` 或 `writing-plans`。
2. 合并现有 3 个 agent 的职责，但对外提供两个入口：`pre-spec review` 和 `spec/plan consistency review`。
3. 保留三组内部检查视角：需求质疑、架构/性能审查、文档一致性审查。
4. 全文使用中文，保留必要英文标签、路径、命令和输出字段。
5. 明确禁止修改文件、重写规格、生成实现计划、扩大已批准范围。
6. 输出高信号问题，避免泛泛建议和长列表。

## 非目标

该 skill 不负责：

- 代码实现审查；代码完成后仍使用 `superpowers:requesting-code-review`。
- 完成前验证；实现完成后仍使用 `superpowers:verification-before-completion`。
- 编写或重写设计规格；设计规格仍由 `superpowers:brainstorming` 产出。
- 编写实现计划；计划仍由 `superpowers:writing-plans` 产出。
- 自动调度子代理。
- 文档润色、中文表达优化或通用技术写作审查。
- 安全审查、性能基准测试或运行验证命令。

## Skill 位置和名称

新增文件：

```text
plugins/superpowers/skills/reviewing-specs/SKILL.md
```

Frontmatter：

```yaml
---
name: reviewing-specs
description: Use only when the user explicitly requests a manual review of superpowers design discussions, design specs, implementation plans, or spec/plan consistency.
---
```

描述必须强调 `explicitly requests` 和 `manual review`，避免未来 Claude 因看到 superpowers spec/plan 工作流就自动调用该 skill。

## 对外入口

### 入口 1：Pre-spec review

用于设计讨论已基本收敛、但设计规格尚未写入文件时。该入口包含两个内部阶段：

1. 需求质疑检查。
2. 架构/性能检查。

如果需求仍不稳定，应先输出需求质疑问题；只有需求边界足够清楚时，才继续输出架构/性能问题。若用户明确要求只做其中一个阶段，则只运行指定阶段。

### 入口 2：Spec/plan consistency review

用于设计规格和实现计划都已经完成后，检查两份文档是否一致、计划是否覆盖规格目标、是否越界、任务顺序是否可执行、验证步骤是否证明成功标准。

该入口不能在缺少 spec 或 plan 时运行；如果材料缺失，应先说明缺少什么。

## 输入完整性检查

正式审查前，skill 应先检查输入是否足够。

### Pre-spec review 输入

需要至少包含：

- 当前设计摘要或设计讨论结论。
- 目标。
- 非目标或明确范围边界。
- 成功标准。
- 已知约束。

如果缺少会影响审查结论的关键输入，应先输出：

```markdown
缺少审查输入：
- [缺少的输入]

请补充后再进行审查。
```

如果缺少的只是次要背景，可以继续审查，但必须在结果中标出对应假设。

### Spec/plan consistency review 输入

需要包含：

- design spec 路径或完整摘录。
- implementation plan 路径或完整摘录。
- 已批准目标和非目标。
- 规格中的成功标准或验收标准。

如果只有 spec 或只有 plan，不能执行一致性审查。

## 阶段适用性检查

skill 必须先判断请求是否属于当前 skill 的范围：

| 用户请求状态 | 行为 |
| --- | --- |
| 设计尚未收敛，用户仍在探索需求 | 不审查，建议继续 `superpowers:brainstorming` |
| 设计已收敛，spec 尚未写 | 使用 `pre-spec review` |
| spec 和 plan 都已完成 | 使用 `spec/plan consistency review` |
| 已进入代码实现或代码已完成 | 不使用本 skill，建议使用代码审查或验证类 skill |
| 用户要求润色文档 | 不使用本 skill |

## 内部检查清单

### A. 需求质疑检查

关注内容：

- 需求是否存在会导致 spec 不稳定的歧义。
- 成功标准是否可观察、可测试或可人工验证。
- 非目标是否足够明确，能阻止范围蔓延。
- 是否存在“用户没有确认但设计默认成立”的隐藏假设。
- 是否缺少会改变规格结构的关键场景。
- 审查建议是否会引入新范围；若会，必须标记为 scope expansion。

输出格式：

```markdown
## Top must-fix issues

1. **问题标题**
   - Problem: [歧义、隐藏假设、范围边界或成功标准问题。]
   - Why it must be fixed before spec: [为什么不解决会导致规格不稳定。]
   - Risk if ignored: [后续 spec 或 plan 的具体风险。]
   - Suggested clarification or revision: [窄范围澄清或修订建议。]
```

如果没有 must-fix：

```markdown
No must-fix issues found.
```

最多输出 5 条 must-fix。

### B. 架构/性能检查

关注内容：

- 组件职责边界是否清楚。
- 设计是否把一次性需求做成长期框架。
- 是否引入不必要的自动化、抽象或配置。
- 是否存在性能、延迟、执行速度、token 或上下文成本风险。
- 后续实现计划是否能切成小任务。
- 验证是否可以通过聚焦、有限的检查完成。
- 是否和当前 superpowers spec/plan 工作流冲突。

输出格式：

```markdown
## Top architecture/performance issues

1. **[blocking|concern] 问题标题**
   - Problem: [架构、性能、复杂度、执行速度或任务切片问题。]
   - Architecture/performance impact: [对边界、运行时、工作流速度或可维护性的影响。]
   - Risk if ignored: [后续规格或实现计划可能失败的方式。]
   - Suggested narrowing or revision: [窄范围调整建议。]
```

如果没有问题：

```markdown
No architecture/performance issues found.
```

最多输出 5 条。`blocking` 表示写 spec 前必须处理；`concern` 表示应考虑但可由用户接受风险。

### C. Spec/plan 一致性检查

关注内容：

- 覆盖矩阵：spec 每个目标是否能映射到 plan 任务。
- 越界检查：plan 是否加入 spec 未批准的工作。
- 非目标保持：plan 是否违反 spec 的非目标或范围边界。
- 顺序检查：任务依赖是否倒置或缺少前置步骤。
- 验证检查：plan 的验证命令是否能证明 spec 成功标准。
- 术语一致性：核心名称、路径、类型、阶段编号是否漂移。
- 占位符检查：是否存在 `TODO`、`待定`、`类似前文`、`适当处理`、`补充细节` 等模糊语。

输出格式：

```markdown
## Blocking consistency issues

1. **问题标题**
   - Location: [相关 spec 和 plan 章节或路径。]
   - Problem: [矛盾、遗漏、越界、排序问题或验证缺口。]
   - Why it affects execution or validation: [为什么会影响实现或验收。]
   - Suggested document revision: [窄范围文档修订建议。]
```

如果没有阻塞问题：

```markdown
No blocking consistency issues found.

## Minor improvements

- [仅包含能改善执行或验证清晰度的小建议。]
```

最多输出 5 条 blocking issue；没有 blocking 时最多输出 3 条 minor improvement。

## 公共边界规则

skill 必须遵守：

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

## 反馈处理规则

审查结果的处理方式：

- `blocking` / must-fix：必须处理，或者由用户明确接受风险并拒绝修改。
- `concern`：风险提醒，不自动阻塞；用户可以接受该权衡。
- minor improvement：只改善执行或验证清晰度，不应阻塞进入下一步。
- 如果建议与已批准范围冲突，应标记为 `scope expansion`，不能直接纳入建议。
- 如果审查发现当前材料不适合该模式，应停止审查并说明应回到哪个流程阶段。

## 与现有工作流关系

- `superpowers:brainstorming` 仍负责需求探索和设计规格产出。
- `reviewing-specs` 可在用户明确要求时插入到写 spec 前或写 plan 后。
- `superpowers:writing-plans` 仍负责从已批准 spec 生成实现计划。
- `superpowers:subagent-driven-development` 和 `superpowers:executing-plans` 仍负责实现计划执行。
- `superpowers:requesting-code-review` 仍负责代码审查。
- `superpowers:verification-before-completion` 仍负责完成前验证。

## 测试策略

因为该变更创建新 skill，实现阶段必须遵守 `superpowers:writing-skills` 和 `superpowers:test-driven-development`。在写 skill 正文前，应先设计并运行最小压力场景，观察没有该 skill 时的基线失败。

### 压力场景 1：Pre-spec 需求质疑

输入：一个看似完整但缺少成功标准和非目标的 superpowers 设计摘要。

期望基线失败：审查者直接润色 spec 或生成实现计划，而不是指出需求歧义和成功标准缺口。

skill 通过标准：输出 must-fix 问题，不写 spec，不生成 plan。

### 压力场景 2：Pre-spec 架构/性能

输入：一个把手动审查做成自动多阶段强制流程的设计摘要。

期望基线失败：审查者给泛泛架构建议，或默认接受过度自动化。

skill 通过标准：指出过度设计、执行成本或任务切片风险，并给出窄范围修订建议。

### 压力场景 3：Spec/plan 一致性

输入：一份 spec 和一份 plan，其中 plan 漏掉一个 spec 目标，并加入一个 spec 未批准的额外任务。

期望基线失败：审查者只总结两份文档内容，或只做文字润色。

skill 通过标准：输出 blocking consistency issues，明确定位遗漏和越界，不修改文件。

## 成功标准

实现完成后应满足：

1. 新 skill 位于 `plugins/superpowers/skills/reviewing-specs/SKILL.md`。
2. skill 只在用户明确手动请求审查时触发。
3. skill 对外提供 `pre-spec review` 和 `spec/plan consistency review` 两个入口。
4. skill 内部保留需求质疑、架构/性能、文档一致性三组检查清单。
5. skill 明确输入完整性检查、阶段适用性检查和反馈处理规则。
6. skill 输出格式与本规格定义一致。
7. skill 不要求自动调度子代理，不修改文件，不生成 spec 或 plan。
8. 压力场景验证显示使用 skill 后能避免基线失败。
