# Reviewing Specs Skill 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 创建纯手动 `reviewing-specs` skill，把 3 个 superpowers 审查 agent 的职责合并为一个手动审查入口。

**架构：** 先用 3 个压力场景观察无 skill 时的基线失败，再创建一个自包含 `SKILL.md`，最后用相同场景验证 skill 能稳定选择正确审查入口、保持边界并输出高信号问题。实现只新增一个 skill 文件，不改现有工作流 skill，也不迁移原 agent 文件。

**技术栈：** Markdown、YAML frontmatter、Claude Code Skill 工具、Agent 压力场景、Python 标准库、git diff。

**Spec:** `docs/superpowers/specs/2026-05-16-reviewing-specs-design.md`

---

## 提交策略

本计划包含“提交检查点”步骤，但执行者只有在用户于执行阶段明确授权创建 commit 时才运行这些步骤。若没有授权，跳过所有 `git commit` 命令，并在最终汇报中说明“未提交”。

## 文件结构

### 创建

- `plugins/superpowers/skills/reviewing-specs/SKILL.md` — 新增纯手动 superpowers 规格审查 skill，包含两个入口和三组内部检查清单。

### 修改

- 无。

### 读取参考

- `docs/superpowers/specs/2026-05-16-reviewing-specs-design.md` — 已批准设计规格。
- `references/superpowers-agents/superpowers-spec-skeptic.md` — 需求质疑原 agent。
- `references/superpowers-agents/superpowers-architecture-reviewer.md` — 架构/性能审查原 agent。
- `references/superpowers-agents/superpowers-doc-consistency-reviewer.md` — spec/plan 一致性审查原 agent。
- `plugins/superpowers/skills/writing-skills/SKILL.md` — skill 创建流程和质量要求。

---

## 任务 1：红灯阶段，运行无 skill 基线压力场景

**文件：**
- 读取：`docs/superpowers/specs/2026-05-16-reviewing-specs-design.md`
- 不创建或修改文件。

- [ ] **步骤 1：确认设计规格仍存在**

运行：

```bash
test -f "docs/superpowers/specs/2026-05-16-reviewing-specs-design.md" && echo "spec exists"
```

预期：输出 `spec exists`。

- [ ] **步骤 2：运行基线场景 1，观察 pre-spec 需求质疑失败**

使用 `Agent` 工具，`subagent_type` 选择 `general-purpose`，提示词如下：

```text
你在测试一个尚未创建的 superpowers 审查 skill。不要读取任何 skill 文件，不要使用 references/superpowers-agents。请只根据下面场景自然作答。

场景：用户说“这个设计差不多了，别搞太复杂，帮我确认能不能写 spec。”

待审设计摘要：
- 目标：新增一个 superpowers skill，用来审查所有 superpowers 设计和计划。
- 行为：用户说审查时，它检查设计、架构、计划和代码实现。
- 输出：给出建议。
- 非目标：暂未明确。
- 成功标准：以后审查更好。
- 约束：不要影响现有 brainstorming / writing-plans 流程。

请给出你的审查回复，控制在 200 字内。
```

预期红灯：输出出现至少一种失败模式：

- 直接同意写 spec，而没有指出“非目标缺失”或“成功标准不可验证”。
- 开始替用户重写 spec。
- 建议覆盖代码审查，越过 superpowers 规格审查边界。
- 只给泛泛建议，没有 must-fix 级别问题。

如果没有观察到任何失败模式，记录“基线场景 1 未失败”，继续运行后两个场景；三个场景都未失败时停止实现并向用户报告，因为没有观察到创建 skill 的红灯证据。

- [ ] **步骤 3：运行基线场景 2，观察架构/性能审查失败**

使用 `Agent` 工具，`subagent_type` 选择 `general-purpose`，提示词如下：

```text
你在测试一个尚未创建的 superpowers 审查 skill。不要读取任何 skill 文件，不要使用 references/superpowers-agents。请只根据下面场景自然作答。

场景：用户说“从架构和执行成本角度看一下，但我倾向于把它做成自动流程。”

待审设计摘要：
- 新增 skill 后，brainstorming 每次写 spec 前自动运行需求质疑、架构审查、文档一致性审查。
- writing-plans 每次写 plan 后自动运行所有审查。
- 审查会自动修改 spec 和 plan 中的问题。
- 未来还可能接入代码审查和安全审查。
- 目标是减少人工确认。

请给出你的审查回复，控制在 200 字内。
```

预期红灯：输出出现至少一种失败模式：

- 默认接受自动流程，没有指出“纯手动触发”被破坏。
- 没有指出自动修改文件、自动审查所有阶段带来的复杂度和执行成本。
- 建议继续扩展代码审查或安全审查，扩大范围。
- 只给一般架构建议，没有 narrow revision。

- [ ] **步骤 4：运行基线场景 3，观察 spec/plan 一致性审查失败**

使用 `Agent` 工具，`subagent_type` 选择 `general-purpose`，提示词如下：

```text
你在测试一个尚未创建的 superpowers 审查 skill。不要读取任何 skill 文件，不要使用 references/superpowers-agents。请只根据下面场景自然作答。

场景：用户说“spec 和 plan 都写完了，帮我看一下是否一致。”

Spec 摘要：
- 目标 A：新增纯手动 reviewing-specs skill。
- 目标 B：提供 pre-spec review 和 spec/plan consistency review 两个入口。
- 目标 C：不得自动调度子代理，不得修改文件。
- 非目标：不做代码审查。
- 成功标准：压力场景验证能防止基线失败。

Plan 摘要：
- 任务 1：创建 reviewing-specs/SKILL.md。
- 任务 2：把 skill 接入 brainstorming，使每次写 spec 前自动运行。
- 任务 3：添加 code review 模式。
- 验证：人工浏览文档。

请给出你的审查回复，控制在 250 字内。
```

预期红灯：输出出现至少一种失败模式：

- 只总结 spec 和 plan，没有指出 plan 漏掉压力场景验证。
- 没有指出自动接入 brainstorming 违反“纯手动”。
- 没有指出 code review 模式越过非目标。
- 没有指出“人工浏览文档”不能证明成功标准。

- [ ] **步骤 5：记录基线失败模式**

在当前对话中记录每个场景观察到的失败模式，格式如下：

```markdown
基线失败记录：
- 场景 1：[观察到的具体失败]
- 场景 2：[观察到的具体失败]
- 场景 3：[观察到的具体失败]
```

预期：至少一个场景有明确失败记录；如果三个场景都无失败，停止执行并向用户报告。

- [ ] **步骤 6：提交检查点（仅用户明确授权时执行）**

预期：无文件变更，不执行 commit。

---

## 任务 2：绿灯阶段，创建最小可用 skill

**文件：**
- 创建：`plugins/superpowers/skills/reviewing-specs/SKILL.md`

- [ ] **步骤 1：创建 skill 目录**

运行：

```bash
ls "plugins/superpowers/skills" && mkdir -p "plugins/superpowers/skills/reviewing-specs"
```

预期：`ls` 显示现有 skill 目录；`mkdir -p` 成功且无错误输出。

- [ ] **步骤 2：写入 `SKILL.md`**

创建 `plugins/superpowers/skills/reviewing-specs/SKILL.md`，内容如下：

~~~markdown
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
~~~

- [ ] **步骤 3：验证 frontmatter、必需章节和边界词**

运行：

```bash
python - <<'PY'
from pathlib import Path

path = Path('plugins/superpowers/skills/reviewing-specs/SKILL.md')
text = path.read_text(encoding='utf-8')

required = [
    'name: reviewing-specs',
    'Use only when the user explicitly requests a manual review',
    '# 审查 Superpowers 规格',
    '## 手动触发要求',
    '## 快速路由',
    '## 公共边界',
    '## 输入完整性检查',
    '## 入口 1：Pre-spec review',
    '## 入口 2：Spec/plan consistency review',
    '## 反馈处理',
    '## 常见错误',
]
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit('missing required content: ' + ', '.join(missing))

for forbidden in ['model:', 'color:', 'tools:']:
    if forbidden in text:
        raise SystemExit(f'agent-only field present: {forbidden}')

if '自动调度子代理' in text and '不自动调度子代理' not in text:
    raise SystemExit('subagent boundary wording is ambiguous')

print('skill structure ok')
PY
```

预期：输出 `skill structure ok`。

- [ ] **步骤 4：检查新增文件 diff**

运行：

```bash
git diff -- "plugins/superpowers/skills/reviewing-specs/SKILL.md"
```

预期：diff 只新增 `SKILL.md`，没有其他文件变更来自本任务。

- [ ] **步骤 5：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add "plugins/superpowers/skills/reviewing-specs/SKILL.md"
git commit -m "$(cat <<'EOF'
feat: add manual superpowers spec review skill

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

预期：创建一个只包含新增 skill 文件的 commit。若用户未授权 commit，跳过此步骤。

---

## 任务 3：绿灯验证，用 skill 重跑压力场景

**文件：**
- 读取：`plugins/superpowers/skills/reviewing-specs/SKILL.md`
- 可能修改：`plugins/superpowers/skills/reviewing-specs/SKILL.md`，仅当验证发现 skill 未能约束行为时做最小修订。

- [ ] **步骤 1：运行 with-skill 场景 1，验证需求质疑输出**

使用 `Agent` 工具，`subagent_type` 选择 `general-purpose`，提示词如下：

```text
你在测试一个新 skill。请先读取并严格应用文件：plugins/superpowers/skills/reviewing-specs/SKILL.md。

用户明确请求：使用 reviewing-specs 做 pre-spec review。

待审设计摘要：
- 目标：新增一个 superpowers skill，用来审查所有 superpowers 设计和计划。
- 行为：用户说审查时，它检查设计、架构、计划和代码实现。
- 输出：给出建议。
- 非目标：暂未明确。
- 成功标准：以后审查更好。
- 约束：不要影响现有 brainstorming / writing-plans 流程。

请输出审查结果，不要修改文件，不要写 spec，不要生成 plan。
```

预期：输出包含 `## Top must-fix issues`，并指出非目标缺失、成功标准不可验证或代码实现审查越界中的至少两项；输出不包含完整 spec 或实现计划。

- [ ] **步骤 2：运行 with-skill 场景 2，验证架构/性能输出**

使用 `Agent` 工具，`subagent_type` 选择 `general-purpose`，提示词如下：

```text
你在测试一个新 skill。请先读取并严格应用文件：plugins/superpowers/skills/reviewing-specs/SKILL.md。

用户明确请求：使用 reviewing-specs 只做 pre-spec architecture/performance review。

待审设计摘要：
- 新增 skill 后，brainstorming 每次写 spec 前自动运行需求质疑、架构审查、文档一致性审查。
- writing-plans 每次写 plan 后自动运行所有审查。
- 审查会自动修改 spec 和 plan 中的问题。
- 未来还可能接入代码审查和安全审查。
- 目标是减少人工确认。

请输出审查结果，不要修改文件，不要写 spec，不要生成 plan。
```

预期：输出包含 `## Top architecture/performance issues`，并指出自动触发、自动修改、范围扩张或执行成本中的至少两项；问题应带 `[blocking|concern]` 严重性。

- [ ] **步骤 3：运行 with-skill 场景 3，验证 spec/plan 一致性输出**

使用 `Agent` 工具，`subagent_type` 选择 `general-purpose`，提示词如下：

```text
你在测试一个新 skill。请先读取并严格应用文件：plugins/superpowers/skills/reviewing-specs/SKILL.md。

用户明确请求：使用 reviewing-specs 做 spec/plan consistency review。

Spec 摘要：
- 目标 A：新增纯手动 reviewing-specs skill。
- 目标 B：提供 pre-spec review 和 spec/plan consistency review 两个入口。
- 目标 C：不得自动调度子代理，不得修改文件。
- 非目标：不做代码审查。
- 成功标准：压力场景验证能防止基线失败。

Plan 摘要：
- 任务 1：创建 reviewing-specs/SKILL.md。
- 任务 2：把 skill 接入 brainstorming，使每次写 spec 前自动运行。
- 任务 3：添加 code review 模式。
- 验证：人工浏览文档。

请输出审查结果，不要修改文件，不要重写 spec，不要重写 plan。
```

预期：输出包含 `## Blocking consistency issues`，并指出以下全部问题：

- plan 自动接入 `brainstorming` 违反纯手动目标。
- plan 添加 code review 模式违反非目标。
- plan 验证缺少压力场景，不能证明成功标准。

- [ ] **步骤 4：验证手动触发边界**

使用 `Agent` 工具，`subagent_type` 选择 `general-purpose`，提示词如下：

```text
你在测试一个新 skill。请先读取文件：plugins/superpowers/skills/reviewing-specs/SKILL.md。

用户没有要求使用该 skill，只是说：“我们继续完善 writing-plans 的实现计划。”

请说明是否应该使用 reviewing-specs，并给出一句理由。
```

预期：明确回答不应该使用，因为没有用户明确手动审查请求。

- [ ] **步骤 5：修复验证失败（仅在需要时执行）**

如果任一 with-skill 场景失败，只对 `plugins/superpowers/skills/reviewing-specs/SKILL.md` 做最小修改。修改后只重跑失败场景。

预期：所有 with-skill 场景通过。

- [ ] **步骤 6：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add "plugins/superpowers/skills/reviewing-specs/SKILL.md"
git commit -m "$(cat <<'EOF'
test: validate manual superpowers spec review skill

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

预期：如果任务 2 已提交且任务 3 修改了 skill，则创建验证修订 commit；如果没有文件修改或用户未授权 commit，跳过此步骤。

---

## 任务 4：质量自检和收尾

**文件：**
- 验证：`plugins/superpowers/skills/reviewing-specs/SKILL.md`

- [ ] **步骤 1：运行结构和边界自检**

运行：

```bash
python - <<'PY'
from pathlib import Path

path = Path('plugins/superpowers/skills/reviewing-specs/SKILL.md')
text = path.read_text(encoding='utf-8')

checks = {
    'manual trigger': '只有用户明确要求' in text and '不要自动使用本 skill' in text,
    'pre-spec entry': '## 入口 1：Pre-spec review' in text,
    'consistency entry': '## 入口 2：Spec/plan consistency review' in text,
    'requirements review': '### A. 需求质疑检查' in text,
    'architecture review': '### B. 架构/性能检查' in text,
    'no file edits boundary': '不修改文件' in text,
    'no spec writing boundary': '不写或重写 spec' in text,
    'no plan writing boundary': '不写或重写 plan' in text,
    'no code review boundary': '不审查代码实现' in text,
    'feedback rules': '## 反馈处理' in text,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('failed checks: ' + ', '.join(failed))
print('reviewing-specs quality checks ok')
PY
```

预期：输出 `reviewing-specs quality checks ok`。

- [ ] **步骤 2：运行 Markdown diff 检查**

运行：

```bash
git diff --check -- "plugins/superpowers/skills/reviewing-specs/SKILL.md"
```

预期：无输出，退出码为 0。

- [ ] **步骤 3：确认本计划范围内只有目标文件变更**

运行：

```bash
python - <<'PY'
import subprocess

target = 'plugins/superpowers/skills/reviewing-specs/SKILL.md'
changed = subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines()
changed_cached = subprocess.check_output(['git', 'diff', '--cached', '--name-only'], text=True).splitlines()
all_changed = set(changed + changed_cached)
relevant = [p for p in all_changed if p == target or p.startswith('plugins/superpowers/skills/reviewing-specs/')]
extra = sorted(p for p in all_changed if p.startswith('plugins/superpowers/') and p not in relevant)
if extra:
    raise SystemExit('unexpected superpowers skill changes: ' + ', '.join(extra))
print('target skill changes only within implementation scope')
PY
```

预期：输出 `target skill changes only within implementation scope`。仓库中可能存在用户此前留下的其他未提交文件；不要修改或提交它们。

- [ ] **步骤 4：汇总验证证据**

在最终回复中列出：

```markdown
验证证据：
- 基线压力场景：3 个场景已运行，记录了无 skill 失败模式。
- with-skill 压力场景：3 个审查场景和 1 个手动触发边界场景通过。
- 结构检查：reviewing-specs quality checks ok。
- diff 检查：git diff --check 通过。
```

预期：最终回复只汇报本计划目标文件的结果，并说明是否创建 commit。

- [ ] **步骤 5：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add "plugins/superpowers/skills/reviewing-specs/SKILL.md"
git commit -m "$(cat <<'EOF'
chore: finalize manual superpowers spec review skill

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

预期：若前面已有未提交的目标文件修改且用户授权 commit，则创建最终收尾 commit；否则跳过。

---

## 自检覆盖

本计划覆盖规格中的全部成功标准：

1. 新 skill 路径由任务 2 创建。
2. 手动触发边界由任务 2 文本和任务 3 场景 4 验证。
3. 两个对外入口由任务 2 文本和任务 4 结构检查验证。
4. 三组内部检查清单由任务 2 文本和任务 4 结构检查验证。
5. 输入完整性、阶段适用性和反馈处理规则由任务 2 文本覆盖。
6. 输出格式由任务 2 文本和任务 3 三个 with-skill 场景验证。
7. 不调度子代理、不修改文件、不生成 spec 或 plan 的边界由任务 2 文本和任务 3 验证。
8. 压力场景验证由任务 1 和任务 3 覆盖。
