# Reviewing Specs Skill 设计规格

## 背景

`reviewing-specs` 已实现为一个手动触发的 superpowers 规格审查 skill，用于写 spec 前审查设计，以及在 spec 和 plan 都完成后检查一致性。用户进一步明确要求：该 skill 每次使用时都必须由 subagent 执行审查，而不是由主会话内联审查。

现有 `references/superpowers-agents/` 中的三个审查角色仍是语义来源：

- `superpowers-spec-skeptic`：写设计规格前的需求质疑。
- `superpowers-architecture-reviewer`：写设计规格前的架构、性能、复杂度审查。
- `superpowers-doc-consistency-reviewer`：设计规格和实现计划完成后的文档一致性审查。

## 目标

更新 `reviewing-specs`，使它成为“手动触发、强制 subagent 执行”的审查入口。

该 skill 应满足：

1. 只在用户明确请求手动审查时使用，不自动嵌入 `brainstorming` 或 `writing-plans`。
2. 一旦触发，主会话必须派发 subagent 执行审查，不得内联完成审查。
3. 如果当前环境不能派发 subagent，必须停止并说明原因，不得 fallback 到主会话审查。
4. 对外提供两个入口：`pre-spec review` 和 `spec/plan consistency review`。
5. 保留三组内部检查视角：需求质疑、架构/性能审查、文档一致性审查。
6. subagent 只返回结构化审查结果，不修改文件、不写 spec、不写 plan、不生成实现计划。
7. 主会话只负责判断入口、收集输入、构造 subagent prompt、转述结果和询问用户是否采纳。
8. 全文使用中文，保留必要英文标签、路径、命令和输出字段。

## 非目标

该 skill 不负责：

- 自动嵌入 `brainstorming`、`writing-plans` 或其他上游流程。
- 在用户未明确请求时自动运行审查。
- 由主会话内联完成审查。
- 代码实现审查；代码完成后仍使用 `superpowers:requesting-code-review`。
- 完成前验证；实现完成后仍使用 `superpowers:verification-before-completion`。
- 编写或重写设计规格；设计规格仍由 `superpowers:brainstorming` 产出。
- 编写实现计划；计划仍由 `superpowers:writing-plans` 产出。
- 文档润色、中文表达优化或通用技术写作审查。
- 安全审查、性能基准测试或运行验证命令。

## Skill 位置和名称

目标文件：

```text
plugins/superpowers/skills/reviewing-specs/SKILL.md
```

Frontmatter 保持：

```yaml
---
name: reviewing-specs
description: Use only when the user explicitly requests a manual review of superpowers design discussions, design specs, implementation plans, or spec/plan consistency.
---
```

描述必须保留 `explicitly requests` 和 `manual review`，避免未来 Claude 因看到 superpowers spec/plan 工作流就自动调用该 skill。

## 强制 subagent 规则

`reviewing-specs` 被触发后，必须遵守：

1. 主会话先判断请求是否属于本 skill，并选择审查入口。
2. 主会话检查输入是否足够；缺少关键输入时先向用户补问。
3. 输入足够后，主会话必须使用当前平台的 subagent 派发工具执行审查；在 Claude Code 中这是 `Agent` 工具，部分旧文档或平台可能称为 `Task` 工具。
4. subagent prompt 必须包含：审查入口、输入材料、边界规则、检查清单、输出格式。
5. subagent 只能审查和报告，不得修改文件。
6. 主会话不得在 subagent 返回前给出自己的审查结论。
7. 主会话收到 subagent 结果后，只能转述、整理或要求用户决定是否采纳。
8. 如果当前平台的 subagent 派发工具不可用，主会话必须停止并说明“无法执行 reviewing-specs，因为该 skill 要求 subagent 审查”。

## 对外入口

### 入口 1：Pre-spec review

用于设计讨论已基本收敛、但设计规格尚未写入文件时。该入口包含两个内部阶段：

1. 需求质疑检查。
2. 架构/性能检查。

默认 subagent 先做需求质疑；只有需求边界足够清楚时，才继续架构/性能审查。若用户明确要求只做其中一个阶段，则 subagent 只运行指定阶段。

### 入口 2：Spec/plan consistency review

用于设计规格和实现计划都已经完成后。subagent 检查两份文档是否一致、计划是否覆盖规格目标、是否越界、任务顺序是否可执行、验证步骤是否证明成功标准。

该入口不能在缺少 spec 或 plan 时运行；如果材料缺失，主会话先说明缺少什么，不派发审查 subagent。

## 输入完整性检查

正式派发 subagent 前，主会话先检查输入是否足够。

### Pre-spec review 输入

需要至少包含：

- 当前设计摘要或设计讨论结论。
- 目标。
- 非目标或明确范围边界。
- 成功标准。
- 已知约束。

如果缺少会影响审查结论的关键输入，主会话先输出：

```markdown
缺少审查输入：
- [缺少的输入]

请补充后再进行审查。
```

如果字段已经提供但内容是“暂未明确”“以后更好”等模糊表述，不要停止审查；将该材料交给 subagent，并要求它把模糊表述作为 must-fix 问题输出。

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
| 设计已收敛，spec 尚未写 | 派发 subagent 执行 `pre-spec review` |
| spec 和 plan 都已完成 | 派发 subagent 执行 `spec/plan consistency review` |
| 已进入代码实现或代码已完成 | 不使用本 skill，建议使用代码审查或验证类 skill |
| 用户要求润色文档 | 不使用本 skill |
| subagent 派发工具不可用 | 停止，不内联审查 |

## Subagent prompt 要求

主会话派发 subagent 时，prompt 必须包含：

- 说明这是 `reviewing-specs` 的强制 subagent 审查。
- 指定审查入口：`pre-spec review` 或 `spec/plan consistency review`。
- 提供用户材料、相关路径或摘要。
- 明确禁止修改文件、写 spec、写 plan、生成实现计划、审查代码实现。
- 明确输出格式和最多问题数量。
- 要求 subagent 只返回审查结果，不扩展范围。

## 内部检查清单

### A. 需求质疑检查

关注内容：

- 需求是否存在会导致 spec 不稳定的歧义。
- 成功标准是否可观察、可测试或可人工验证。
- 非目标是否足够明确，能阻止范围蔓延。
- 是否存在“用户没有确认但设计默认成立”的隐藏假设。
- 是否缺少会改变规格结构的关键场景。
- 审查建议是否会引入新范围；若会，必须标记为 `scope expansion`。

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

skill 和 subagent 必须遵守：

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

## 反馈处理规则

审查结果的处理方式：

- `blocking` / must-fix：必须处理，或者由用户明确接受风险并拒绝修改。
- `concern`：风险提醒，不自动阻塞；用户可以接受该权衡。
- minor improvement：只改善执行或验证清晰度，不应阻塞进入下一步。
- 如果建议与已批准范围冲突，应标记为 `scope expansion`，不能直接纳入建议。
- 如果审查发现当前材料不适合该模式，应停止审查并说明应回到哪个流程阶段。
- 主会话不得把 subagent 结果自动写入文档；必须等待用户决定。

## 与现有工作流关系

- `superpowers:brainstorming` 仍负责需求探索和设计规格产出。
- `reviewing-specs` 可在用户明确要求时插入到写 spec 前或写 plan 后。
- `reviewing-specs` 触发后强制使用 subagent 审查，但不自动嵌入上游流程。
- `superpowers:writing-plans` 仍负责从已批准 spec 生成实现计划。
- `superpowers:subagent-driven-development` 和 `superpowers:executing-plans` 仍负责实现计划执行。
- `superpowers:requesting-code-review` 仍负责代码审查。
- `superpowers:verification-before-completion` 仍负责完成前验证。

## 测试策略

因为该变更编辑现有 skill，实现阶段必须遵守 `superpowers:writing-skills` 和 `superpowers:test-driven-development`。在修改 skill 正文前，应先运行压力场景，观察当前 skill 在被触发时可能由主会话内联审查。

### 压力场景 1：触发后不得内联审查

输入：用户明确请求使用 `reviewing-specs` 做 pre-spec review，并提供完整设计摘要。

期望基线失败：当前 skill 允许主会话直接输出审查结果。

通过标准：更新后的 skill 要求必须派发 subagent，主会话不得内联输出审查结论。

### 压力场景 2：subagent 派发工具不可用时停止

输入：环境中无法派发 subagent，但用户明确请求 `reviewing-specs` 审查。

期望基线失败：主会话 fallback 到内联审查。

通过标准：更新后的 skill 要求停止并说明无法执行，因为该 skill 要求 subagent 审查。

### 压力场景 3：Spec/plan 一致性由 subagent 完成

输入：用户明确请求 `reviewing-specs` 检查 spec 和 plan 是否一致。

期望基线失败：主会话自己比较 spec 和 plan。

通过标准：更新后的 skill 要求主会话构造 subagent prompt，并由 subagent 返回 `Blocking consistency issues` 或无阻塞结果。

## 成功标准

实现完成后应满足：

1. `plugins/superpowers/skills/reviewing-specs/SKILL.md` 明确规定每次触发都必须派发 subagent。
2. skill 仍只在用户明确手动请求审查时触发。
3. skill 对外提供 `pre-spec review` 和 `spec/plan consistency review` 两个入口。
4. skill 内部保留需求质疑、架构/性能、文档一致性三组检查清单。
5. skill 明确输入完整性检查、阶段适用性检查、subagent prompt 要求和反馈处理规则。
6. skill 输出格式与本规格定义一致。
7. skill 不自动嵌入 `brainstorming` 或 `writing-plans`。
8. skill 不修改文件，不生成 spec 或 plan，不审查代码实现。
9. 压力场景验证显示：触发后不允许主会话内联审查，subagent 派发工具不可用时停止。
