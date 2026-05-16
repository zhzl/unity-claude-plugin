# Roadmap Discovery Reference

本参考保存 `new-roadmap` 和结构性 `change-roadmap` 在写正式 roadmap/proposal 前使用的轻量探讨模板。主技能负责强制触发；这里保存长模板，避免 `SKILL.md` 过长。

## Roadmap Discovery Brief Template

```markdown
# Roadmap Discovery Brief

**Roadmap Topic:** <topic>
**Candidate Title:** <title>
**Candidate Slug:** <slug>
**Inputs Reviewed:**
- <user request or reference path>

## 目标理解

- <用中文说明长期目标>

## 参考输入摘要

| 输入 | 可复用的具体设计 | 不采用/暂不采用的内容 | 原因 |
|------|------------------|------------------------|------|
| <reference> | <specific design ideas> | <excluded ideas> | <why> |

## 初步范围

**应纳入：**
- <in-scope item>

**不应纳入：**
- <out-of-scope item>

## 未决问题

- <question that must be answered before drafting ROADMAP.md>

## 下一步

先确认 phase strategy，再生成完整 ROADMAP.md 草案。
```

## Roadmap Change Discovery Brief Template

用于结构性 `change-roadmap`：修改目标、共享约束、整体成功标准，或新增、删除、合并、拆分、重排 phase。

```markdown
# Roadmap Change Discovery Brief

**Roadmap:** `<ROADMAP.md>`
**Change Type:** <goal-change | constraint-change | phase-structure-change | scope-change>
**Requires Proposal Brief:** yes

## 当前路线图状态

- 当前目标：<summary>
- 当前 phase：<summary>
- 当前约束：<summary>

## 变更动因

- <why the current roadmap is insufficient>

## 参考输入映射

| 新输入/反馈 | 影响的 roadmap 部分 | 建议调整 |
|-------------|---------------------|----------|
| <input> | <Goal / Shared Constraints / Pn> | <change> |

## 可选变更策略

- 方案 A：<strategy>
- 方案 B：<strategy>
- 方案 C：<strategy>

## 推荐策略

<recommendation and tradeoff>

## 下一步

用户确认策略后，再生成 `Proposal Brief`。
```

事实更新不需要 discovery，例如回填 artifact 路径、更新 `Last Sync`、添加 blocker、记录验证证据、追加 `Change Log`。

## Phase Strategy Options Template

在创建新 roadmap 或结构性调整 phase 前，给出 2-3 种拆分策略。

```markdown
## Phase Strategy Options

### 方案 A：<strategy name>

- **思路：** <how phases are organized>
- **优点：** <benefits>
- **代价：** <tradeoffs>
- **适合：** <when this is best>

### 方案 B：<strategy name>

- **思路：** <how phases are organized>
- **优点：** <benefits>
- **代价：** <tradeoffs>
- **适合：** <when this is best>

### 推荐

推荐 <A/B/C>，因为 <reason>。
```

## Reference Input Mapping Template

当用户要求结合多个参考项目、文档或方案时，每个 phase 都必须能追溯到具体输入。

```markdown
**参考设计输入：**
- 来自 `<reference-a>`：<具体设计、约束或模式>
- 来自 `<reference-b>`：<具体设计、约束或模式>

**阶段转化：**
- <这些输入如何转成该 phase 的目标、范围或成功标准>
```

## 展示规则

- 长草案直接用正文或分节展示；不要把完整草案塞进选择题 preview。
- 中文 roadmap 中，除路径、命令、状态枚举、API 字段和代码标识符外，正文统一中文。
- `ROADMAP.md` 只写长期方向、阶段边界和 artifact 状态；详细 spec 内容仍放入 `docs/superpowers/specs/`。
