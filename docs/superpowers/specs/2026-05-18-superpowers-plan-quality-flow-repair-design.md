# Superpowers Plan Quality Flow Repair 设计规格

**目标：** 修复 Superpowers 在大型 roadmap phase、spec handoff 和 implementation plan 生成中的计划质量门禁，让范围、上游约束、参考输入和验证强度在进入实现前可见、可审查。

**非目标：** 不新增 CLI、validator、后台同步或独立 plan-quality skill；不修改任何具体项目 implementation plan；不把具体项目事故词写入通用流程规则。

**修改范围：**
- `plugins/superpowers/skills/roadmap-management/SKILL.md`
- `plugins/superpowers/skills/writing-plans/SKILL.md`
- `plugins/superpowers/skills/reviewing-specs/SKILL.md`

---

## 背景

现有流程已经包含 roadmap discovery、brainstorming、writing-plans 和 reviewing-specs，但在大型 phase 进入实现计划时，仍存在三个通用缺口：

1. roadmap handoff 之前没有足够明确的 phase 范围检查。
2. writing-plans 没有把上游约束和参考输入固定为 plan 的可审查结构。
3. spec/plan review 更偏文本一致性，缺少对计划可执行性和验证强度的通用检查。

本设计用现有 Superpowers 文档风格修复这些缺口：流程步骤、输入完整性、范围检查、输出结构和自检规则。规则保持通用，不绑定任何具体项目或技术栈。

## 设计原则

- **保持通用：** 只写流程规则，不写具体项目事故类型。
- **前置发现：** 范围过大、输入不完整、参考输入未映射，应在写计划前暴露。
- **显式交接：** roadmap/spec 中的约束必须进入 handoff 或 plan 结构。
- **验证对齐成功标准：** 任务验证步骤必须说明它证明了什么成功标准。
- **不自动扩大流程：** 不新增自动调用、不新增独立 skill、不修改 roadmap current truth。

## `roadmap-management` 修复

### Phase 范围检查

在 `write-spec` 和 `write-plan` action 中，读取目标 phase 后增加范围检查：

```text
检查 phase 是否包含多个可独立交付、可独立验证的软件单元。
```

如果发现 phase 可能过大，`roadmap-management` 不直接继续 handoff，而是要求用户选择：

1. 拆为正式 roadmap phases，并进入 `change-roadmap`。
2. 保持同一 roadmap phase，但拆为多个 implementation plans。
3. 明确接受单一 phase / 单一 plan 风险后继续。

该检查不自动修改 `ROADMAP.md`，也不自动调用其他技能。

### `write-spec` handoff 增强

`write-spec` 生成 Spec Discussion Brief 时包含：

- phase 范围检查结果；
- 如果建议拆分，列出可能的拆分单元；
- Roadmap `Shared Constraints`；
- phase scope、out-of-scope、success criteria；
- reference input mapping，如 roadmap 或用户提供参考输入；
- 未确认的拆分风险或 handoff 风险。

### `write-plan` handoff 增强

`write-plan` 读取 phase spec 后，输出给后续 `writing-plans` 的 handoff 必须包含：

- phase 范围检查结果；
- 用户选择的拆分方向；
- Roadmap `Shared Constraints`；
- phase scope、out-of-scope、success criteria；
- spec 中已确认的关键决策；
- reference inputs；
- 写 plan 前必须处理的未确认问题。

### 边界

- 不自动调用 `brainstorming` 或 `writing-plans`。
- 不自动拆分 roadmap phase。
- 正式 phase 结构变化必须通过 `change-roadmap`。
- 同一 phase 下的多个 plan 只影响 plan 文档，除非用户后续要求同步 roadmap。

## `writing-plans` 修复

### 计划前拆分门槛

写 implementation plan 前，必须判断规格是否包含多个可独立交付的软件单元。

如果包含多个独立单元，先停止并请用户选择：

1. 拆成多个 implementation plans。
2. 回到 roadmap change 处理 phase 结构。
3. 明确接受单一 plan 风险后继续。

如果用户选择继续单一 plan，plan 头部记录：

```markdown
**拆分检查：** 已检查；用户选择继续单一计划。
**风险说明：** [简短说明为什么该计划仍可执行，或用户接受的风险。]
```

如果无需拆分，也记录：

```markdown
**拆分检查：** 已检查；无需拆分。
```

### 上游约束摘要

每个 plan 在任务列表前增加必需章节：

```markdown
## 上游约束摘要
```

该章节列出：

- Roadmap `Shared Constraints`；
- 当前 phase scope；
- 当前 phase out-of-scope；
- phase success criteria；
- 用户已确认的关键决策；
- 本计划不包含的范围。

该章节用于交接和审查，不要求变成大型矩阵。

### 参考输入映射

当用户、roadmap 或 spec 提供参考项目、旧实现、设计文档或示例代码时，plan 增加条件章节：

```markdown
## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `path/or/name` | ... | ... | ... | 任务 N |
```

规则：

- 不允许只写“参考 X”。
- 不采用参考输入的某部分时必须说明原因。
- 采用内容必须能映射到任务。

### 验证证明格式

每个任务的测试或验证步骤必须说明它证明的成功标准：

```markdown
运行：...
预期：...
证明：该检查证明 [任务成功标准]，因为 [可观察结果]。
```

规则：

- skeleton、manifest、目录结构任务可以检查文件或字段存在。
- 行为任务不能只检查文件、函数、字符串或符号存在。
- 如果某一步只能做存在性检查，必须说明该任务不是行为验收任务。

### 自检扩展

在现有自检中增加：

1. 拆分检查是否已记录。
2. 上游约束是否进入任务分解。
3. 参考输入是否映射到任务。
4. 验证步骤是否证明成功标准。
5. 是否存在行为任务只用存在性验证。

## `reviewing-specs` 修复

### 扩展现有入口

不新增独立 skill，也不新增自动触发。只扩展现有：

```text
Spec/plan consistency review
```

新增通用计划质量检查项：

| 检查项 | 审查问题 |
|---|---|
| 上游约束检查 | roadmap/spec/user-confirmed constraints 是否进入 plan，并影响任务或验证。 |
| 参考输入检查 | 如果存在参考输入，plan 是否说明采用/不采用的部分及原因。 |
| 验证强度检查 | 任务验证是否证明成功标准，而不只是证明文件、符号或文本存在。 |
| 拆分检查 | plan 是否记录拆分判断；如果范围过大，是否已拆分或记录用户选择。 |
| 执行性检查 | 任务是否可按顺序执行，是否存在缺少前置任务或跨任务依赖倒置。 |

### 输出格式保持不变

有阻塞问题时继续输出：

```markdown
## Blocking consistency issues

1. **问题标题**
   - Location: [相关 spec 和 plan 章节或路径。]
   - Problem: [矛盾、遗漏、越界、排序问题或验证缺口。]
   - Why it affects execution or validation: [为什么会影响实现或验收。]
   - Suggested document revision: [窄范围文档修订建议。]
```

没有阻塞问题时继续输出：

```markdown
No blocking consistency issues found.

## Minor improvements
- [仅包含能改善执行或验证清晰度的小建议。]
```

### 边界不变

- 不修改文件。
- 不写 spec。
- 不写 plan。
- 不生成 implementation plan。
- 不审查代码实现。
- 不自动触发。
- 不把 minor improvement 当成阻塞。

如果审查发现 plan 可能应拆分，只能建议拆分为多个 plans、回到 roadmap change，或要求 plan 记录用户接受单一 plan 风险。

## 模板落点

本设计不新增长篇 reference docs。模板片段直接放入 `writing-plans/SKILL.md`：

1. 拆分检查记录。
2. 上游约束摘要。
3. 参考输入映射。
4. 验证证明格式。

`roadmap-management/SKILL.md` 只增加流程步骤和 handoff 字段，不新增模板文件。

`reviewing-specs/SKILL.md` 只扩展现有 `Spec/plan consistency review` 检查清单，不新增入口。

## 成功标准

本流程修复实现后必须满足：

- `roadmap-management` 在 `write-spec` 和 `write-plan` 中包含 phase 范围检查和 handoff 增强。
- `writing-plans` 在计划前包含拆分门槛，并在计划结构中包含拆分检查、上游约束摘要、参考输入映射和验证证明格式。
- `reviewing-specs` 的 `Spec/plan consistency review` 包含新的通用计划质量检查项。
- 修改后的文本保持通用，不绑定具体项目或技术栈。
- 后续大型 phase 可以选择正式拆 roadmap phases、同 phase 多 plans，或在用户明确接受风险后继续单一 plan。

## 验证计划

实现计划应包含以下验证：

1. 文档内容检查：确认三个 skill 文件都包含对应新增规则。
2. 模板检查：确认 `writing-plans` 中存在四个模板片段。
3. 边界检查：确认没有新增 CLI、validator、后台同步或独立 skill。
4. 抽象层级检查：确认新增规则不绑定具体项目或技术栈。
5. 交接检查：确认 `roadmap-management write-plan` handoff 明确传递拆分判断、上游约束和参考输入。
6. 审查检查：确认 `reviewing-specs` 的 spec/plan consistency review 覆盖上游约束、参考输入、验证强度、拆分检查和执行性检查。

## 后续流程

1. 用户审查并批准本 design spec。
2. 使用 `superpowers:writing-plans` 为流程修复创建 implementation plan。
3. 按 implementation plan 修改三个 skill 文档。
4. 完成验证后提交实现。
5. 回到需要修订的既有计划或修订 brief，按新流程处理拆分和新 plans。
