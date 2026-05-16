# Reviewing Specs Subagent Review 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 `reviewing-specs` 从主会话内联审查改为手动触发后强制派发 subagent 审查。

**架构：** 保留 `reviewing-specs` 的手动触发边界和两个审查入口，但新增强制 subagent 门控：主会话只判断入口、检查输入、构造 subagent prompt、转述结果；不得自行给出审查结论。通过压力场景验证触发后必须使用当前平台的 subagent 派发工具；派发工具不可用时必须停止。

**技术栈：** Markdown、YAML frontmatter、Claude Code Skill 工具、subagent 派发工具、Python 标准库、git diff。

**Spec:** `docs/superpowers/specs/2026-05-16-reviewing-specs-design.md`

---

## 提交策略

本计划包含“提交检查点”步骤，但执行者只有在用户于执行阶段明确授权创建 commit 时才运行这些步骤。若没有授权，跳过所有 `git commit` 命令，并在最终汇报中说明“未提交”。

## 文件结构

### 修改

- `plugins/superpowers/skills/reviewing-specs/SKILL.md` — 更新为手动触发后强制 subagent 审查，加入 subagent 派发工具不可用时停止、subagent prompt 要求、主会话职责边界。
- `docs/superpowers/specs/2026-05-16-reviewing-specs-design.md` — 已更新为强制 subagent 审查规格；执行时只验证，不再改写。

### 不修改

- `docs/superpowers/plans/2026-05-16-reviewing-specs.md` — 保留已完成的旧实现记录，不回写旧计划。
- `references/superpowers-agents/*.md` — 保留参考 agent 文件，不迁移、不删除。
- 其他 superpowers skills。

---

## 任务 1：红灯阶段，验证当前 skill 允许内联审查

**文件：**
- 读取：`plugins/superpowers/skills/reviewing-specs/SKILL.md`
- 不创建或修改文件。

- [ ] **步骤 1：确认当前 skill 存在**

运行：

```bash
test -f "plugins/superpowers/skills/reviewing-specs/SKILL.md" && echo "skill exists"
```

预期：输出 `skill exists`。

- [ ] **步骤 2：运行基线场景，观察当前 skill 可被内联使用**

使用当前平台的 subagent 派发工具（本环境为 `Agent` 工具，`subagent_type` 选择 `general-purpose`），提示词如下：

```text
你在测试当前 reviewing-specs skill 的既有行为。请读取并应用文件：plugins/superpowers/skills/reviewing-specs/SKILL.md。

用户明确请求：使用 reviewing-specs 做 pre-spec review。

待审设计摘要：
- 目标：新增一个 superpowers skill，用来审查所有 superpowers 设计和计划。
- 行为：用户说审查时，它检查设计、架构、计划和代码实现。
- 输出：给出建议。
- 非目标：暂未明确。
- 成功标准：以后审查更好。
- 约束：不要影响现有 brainstorming / writing-plans 流程。

请给出你会如何响应。不要修改文件。
```

预期红灯：输出直接给出审查结论或审查问题，而不是说明必须派发 subagent。记录为当前 skill 允许主会话内联审查。

- [ ] **步骤 3：记录红灯证据**

在当前对话中记录：

```markdown
红灯证据：当前 reviewing-specs 被触发后，响应直接输出审查结果/问题，没有强制派发 subagent。
```

预期：有明确红灯证据；如果当前 skill 已经强制 subagent，停止并报告无需修改。

---

## 任务 2：绿灯阶段，更新 SKILL.md 强制 subagent 审查

**文件：**
- 修改：`plugins/superpowers/skills/reviewing-specs/SKILL.md`

- [ ] **步骤 1：将概述和开始语改为 subagent 审查**

把当前概述中的“纯手动审查 skill”含义改为“手动触发、强制 subagent 审查 skill”。保留 `description` 中的 `Use only when the user explicitly requests...`。

`SKILL.md` 目标内容必须包含：

```markdown
这是一个手动触发、强制 subagent 执行的审查 skill，用于用户明确要求时检查 superpowers 设计讨论、设计规格、实现计划或 spec/plan 一致性。

**核心原则：** 手动触发，subagent 审查。主会话只准备上下文、派发 subagent、转述结果；不得自行完成审查。

**开始时宣布：** “我正在使用 reviewing-specs 技能派发 subagent 进行手动审查。”
```

- [ ] **步骤 2：新增强制 subagent 规则章节**

在“手动触发要求”之后新增：

```markdown
## 强制 subagent 规则

一旦本 skill 被触发，必须派发 subagent 执行审查。

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
```

- [ ] **步骤 3：更新快速路由**

将快速路由中的行为改为：

```markdown
| 当前状态 | 使用方式 |
| --- | --- |
| 设计尚未收敛，用户仍在探索需求 | 不审查；建议继续 superpowers:brainstorming |
| 设计已收敛，spec 尚未写 | 派发 subagent 执行 Pre-spec review |
| spec 和 plan 都已完成 | 派发 subagent 执行 Spec/plan consistency review |
| 已进入代码实现或代码已完成 | 不使用本 skill；改用代码审查或完成前验证流程 |
| 用户要求润色文档 | 不使用本 skill |
| subagent 派发工具不可用 | 停止；不内联审查 |
```

- [ ] **步骤 4：更新公共边界**

在公共边界中加入：

```markdown
- 不在 subagent 不可用时改由主会话内联审查。
- 不把 subagent 结果自动写入文档；必须等待用户决定。
```

- [ ] **步骤 5：新增 subagent prompt 要求章节**

在“输入完整性检查”之后新增：

```markdown
## Subagent prompt 要求

派发 subagent 时，prompt 必须包含：

- 说明这是 `reviewing-specs` 的强制 subagent 审查。
- 审查入口：`pre-spec review` 或 `spec/plan consistency review`。
- 用户提供的材料、路径或摘要。
- 公共边界：不修改文件、不写 spec、不写 plan、不生成实现计划、不审查代码实现。
- 对应入口的检查清单。
- 对应入口的输出格式和最多问题数量。

subagent 只返回审查结果，不扩展范围。
```

- [ ] **步骤 6：更新入口描述**

将入口描述中“使用/输出/检查”等容易被理解为主会话执行的动词改为“派发 subagent 执行/要求 subagent 输出/要求 subagent 检查”。不改变输出格式。

- [ ] **步骤 7：运行结构检查**

运行：

```bash
python - <<'PY'
from pathlib import Path
path = Path('plugins/superpowers/skills/reviewing-specs/SKILL.md')
text = path.read_text(encoding='utf-8')
required = [
    'name: reviewing-specs',
    'Use only when the user explicitly requests a manual review',
    '强制 subagent 规则',
    '必须派发 subagent 执行审查',
    '主会话不得',
    '自行输出审查结论',
    'subagent 派发工具不可用',
    'Subagent prompt 要求',
    '派发 subagent 执行 Pre-spec review',
    '派发 subagent 执行 Spec/plan consistency review',
    '不在 subagent 不可用时改由主会话内联审查',
]
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit('missing required subagent review content: ' + ', '.join(missing))
for forbidden in ['model:', 'color:', 'tools:']:
    if forbidden in text:
        raise SystemExit(f'agent-only field present: {forbidden}')
print('subagent review skill structure ok')
PY
```

预期：输出 `subagent review skill structure ok`。

---

## 任务 3：绿灯验证，确认不再允许内联审查

**文件：**
- 读取：`plugins/superpowers/skills/reviewing-specs/SKILL.md`
- 可能修改：`plugins/superpowers/skills/reviewing-specs/SKILL.md`，仅当验证发现仍允许内联审查时做最小修订。

- [ ] **步骤 1：验证触发后必须派发 subagent**

使用当前平台的 subagent 派发工具（本环境为 `Agent` 工具，`subagent_type` 选择 `general-purpose`），提示词如下：

```text
你在测试更新后的 reviewing-specs skill。请读取并严格应用文件：plugins/superpowers/skills/reviewing-specs/SKILL.md。

用户明确请求：使用 reviewing-specs 做 pre-spec review。

待审设计摘要：
- 目标：新增一个 superpowers skill，用来审查所有 superpowers 设计和计划。
- 行为：用户说审查时，它检查设计、架构、计划和代码实现。
- 输出：给出建议。
- 非目标：暂未明确。
- 成功标准：以后审查更好。
- 约束：不要影响现有 brainstorming / writing-plans 流程。

你不能实际调用 subagent 派发工具。请说明你作为主会话应做什么；不要自行输出审查结论。
```

预期：回答必须说明应派发 subagent，并且不得直接列出审查问题。

- [ ] **步骤 2：验证 subagent 派发工具不可用时停止**

使用当前平台的 subagent 派发工具（本环境为 `Agent` 工具，`subagent_type` 选择 `general-purpose`），提示词如下：

```text
你在测试更新后的 reviewing-specs skill。请读取并严格应用文件：plugins/superpowers/skills/reviewing-specs/SKILL.md。

用户明确请求：使用 reviewing-specs 检查 spec 和 plan 是否一致。

当前环境不能派发 subagent，也没有可用的 subagent 派发工具。

请给出你应该如何响应。
```

预期：输出必须包含无法执行 reviewing-specs，因为该 skill 要求 subagent 审查；不得 fallback 到内联审查。

- [ ] **步骤 3：验证 subagent prompt 构造**

使用当前平台的 subagent 派发工具（本环境为 `Agent` 工具，`subagent_type` 选择 `general-purpose`），提示词如下：

```text
你在测试更新后的 reviewing-specs skill。请读取并严格应用文件：plugins/superpowers/skills/reviewing-specs/SKILL.md。

用户明确请求：使用 reviewing-specs 做 spec/plan consistency review。

Spec 摘要：
- 目标 A：新增纯手动 reviewing-specs skill。
- 目标 B：提供 pre-spec review 和 spec/plan consistency review 两个入口。
- 目标 C：触发后必须派发 subagent，不得修改文件。
- 非目标：不做代码审查。
- 成功标准：压力场景验证能防止基线失败。

Plan 摘要：
- 任务 1：创建 reviewing-specs/SKILL.md。
- 任务 2：把 skill 接入 brainstorming，使每次写 spec 前自动运行。
- 任务 3：添加 code review 模式。
- 验证：人工浏览文档。

你不能实际调用 subagent 派发工具。请构造将要派发给 subagent 的 prompt 大纲；不要自己审查 spec/plan。
```

预期：输出是 subagent prompt 大纲，包含审查入口、材料、边界、检查清单和输出格式；不得直接输出 blocking issues。

- [ ] **步骤 4：修复验证失败（仅在需要时执行）**

如果任一场景失败，只对 `plugins/superpowers/skills/reviewing-specs/SKILL.md` 做最小修订。修改后只重跑失败场景。

预期：所有场景通过。

---

## 任务 4：质量自检和收尾

**文件：**
- 验证：`plugins/superpowers/skills/reviewing-specs/SKILL.md`
- 验证：`docs/superpowers/specs/2026-05-16-reviewing-specs-design.md`
- 验证：`docs/superpowers/plans/2026-05-16-reviewing-specs-subagent-review.md`

- [ ] **步骤 1：运行最终结构检查**

运行：

```bash
python - <<'PY'
from pathlib import Path
skill = Path('plugins/superpowers/skills/reviewing-specs/SKILL.md').read_text(encoding='utf-8')
spec = Path('docs/superpowers/specs/2026-05-16-reviewing-specs-design.md').read_text(encoding='utf-8')
plan = Path('docs/superpowers/plans/2026-05-16-reviewing-specs-subagent-review.md').read_text(encoding='utf-8')
checks = {
    'skill requires subagent': '必须派发 subagent 执行审查' in skill,
    'skill forbids inline fallback': '不在 subagent 不可用时改由主会话内联审查' in skill,
    'skill has prompt requirements': '## Subagent prompt 要求' in skill,
    'spec requires subagent': '一旦触发，主会话必须派发 subagent 执行审查' in spec,
    'spec forbids fallback': '不得 fallback 到主会话审查' in spec,
    'plan validates no inline': '验证触发后必须派发 subagent' in plan,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('failed checks: ' + ', '.join(failed))
print('subagent reviewing-specs checks ok')
PY
```

预期：输出 `subagent reviewing-specs checks ok`。

- [ ] **步骤 2：运行 Markdown whitespace 检查**

运行：

```bash
python - <<'PY'
from pathlib import Path
paths = [
    Path('plugins/superpowers/skills/reviewing-specs/SKILL.md'),
    Path('docs/superpowers/specs/2026-05-16-reviewing-specs-design.md'),
    Path('docs/superpowers/plans/2026-05-16-reviewing-specs-subagent-review.md'),
]
for path in paths:
    text = path.read_text(encoding='utf-8')
    for lineno, line in enumerate(text.splitlines(), start=1):
        if line.rstrip(' \t') != line:
            raise SystemExit(f'trailing whitespace: {path}:{lineno}')
    if not text.endswith('\n'):
        raise SystemExit(f'missing final newline: {path}')
print('subagent review docs whitespace ok')
PY
```

预期：输出 `subagent review docs whitespace ok`。

- [ ] **步骤 3：运行 diff 检查**

运行：

```bash
git diff --check -- \
  "plugins/superpowers/skills/reviewing-specs/SKILL.md" \
  "docs/superpowers/specs/2026-05-16-reviewing-specs-design.md" \
  "docs/superpowers/plans/2026-05-16-reviewing-specs-subagent-review.md"
```

预期：无输出，退出码为 0。

- [ ] **步骤 4：确认范围**

运行：

```bash
python - <<'PY'
import subprocess
allowed = {
    'plugins/superpowers/skills/reviewing-specs/SKILL.md',
    'docs/superpowers/specs/2026-05-16-reviewing-specs-design.md',
    'docs/superpowers/plans/2026-05-16-reviewing-specs-subagent-review.md',
}
changed = set(subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines())
changed.update(subprocess.check_output(['git', 'diff', '--cached', '--name-only'], text=True).splitlines())
changed.update(subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard'], text=True).splitlines())
relevant_prefixes = ('plugins/superpowers/', 'docs/superpowers/specs/', 'docs/superpowers/plans/')
known_unrelated = {
    'docs/superpowers/plans/2026-05-16-plugin-dev-zh-translation-phase-3.md',
}
extra = sorted(
    p for p in changed
    if p.startswith(relevant_prefixes)
    and p not in allowed
    and p not in known_unrelated
    and not p.startswith('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/')
)
if extra:
    raise SystemExit('unexpected relevant changes: ' + ', '.join(extra))
print('subagent review change scope ok')
PY
```

预期：输出 `subagent review change scope ok`。仓库中可能存在用户此前留下的其他未提交文件；不要修改或提交它们。

- [ ] **步骤 5：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  "plugins/superpowers/skills/reviewing-specs/SKILL.md" \
  "docs/superpowers/specs/2026-05-16-reviewing-specs-design.md" \
  "docs/superpowers/plans/2026-05-16-reviewing-specs-subagent-review.md"
git commit -m "$(cat <<'EOF'
feat: require subagent specs review

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

预期：只有用户明确授权 commit 时执行；否则跳过。

---

## 自检覆盖

本计划覆盖更新后规格中的成功标准：

1. 强制 subagent 规则由任务 2 写入 skill，并由任务 3 验证。
2. 手动触发边界保留在现有 skill 文本，并由任务 3 验证不得内联审查。
3. 两个入口和三组检查清单保留在 skill 中。
4. 输入完整性、阶段适用性、subagent prompt 要求和反馈处理规则由任务 2 覆盖。
5. 不自动嵌入 `brainstorming` 或 `writing-plans` 由公共边界和 prompt 要求覆盖。
6. subagent 派发工具不可用时停止由任务 3 场景 2 验证。
