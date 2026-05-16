# plugin-dev 中文化 Phase 1 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 完成 Phase 1 的盘点与术语表落地验证，并把执行摘要和验证证据回填到 roadmap。

**架构：** Phase 1 不修改 `plugins/plugin-dev` 内容。执行时以已批准的 spec 为事实来源，用只读命令验证目标目录与规格清单一致，再只更新 roadmap 中 Phase 1 的状态、执行摘要和验证证据。

**技术栈：** Markdown、Python 标准库（`pathlib`、`collections`）、Git。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`
**Phase:** Phase 1 — Inventory and glossary

---

## 范围检查

本计划只覆盖一个文档治理阶段：验证 Phase 1 spec 中的 99 文件盘点、术语表、保留规则和高风险字段规则，并完成 roadmap 回填。它不拆分为多个子系统，不开始翻译 `plugins/plugin-dev`，不新增工具，不改变插件、脚本或示例行为。

## 文件结构

- 读取：`docs/superpowers/specs/2026-05-15-plugin-dev-zh-translation-phase-1-design.md`
  - 职责：Phase 1 已批准规格，包含文件清单、术语表、保留规则和验证证据要求。
- 读取：`plugins/plugin-dev/**/*.{md,json,sh}`
  - 职责：只读盘点目标；执行计划不得修改这些文件。
- 修改：`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`
  - 职责：记录 Phase 1 计划 artifact、执行摘要、验证证据、完成状态和下一阶段手动交接。
- 已创建：`docs/superpowers/plans/2026-05-15-plugin-dev-zh-translation-phase-1.md`
  - 职责：本实现计划，供子代理驱动或内联执行使用。

## 任务 1：建立 Phase 1 完成状态的红灯检查

**文件：**
- 读取：`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`
- 修改：无
- 测试：内联 Python 检查

- [ ] **步骤 1：运行完成状态检查并确认当前未完成**

运行：

```bash
python - <<'PY'
from pathlib import Path
roadmap = Path('docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md').read_text(encoding='utf-8')
checks = {
    'phase1_completed': '| Phase 1 — Inventory and glossary | completed |' in roadmap,
    'verification_recorded': 'target_count 99' in roadmap and 'missing_count 0' in roadmap and 'extra_count 0' in roadmap,
    'current_phase_phase2': '- **Current Phase:** Phase 2 — Core plugin content' in roadmap,
}
for name, ok in checks.items():
    print(f'{name} {ok}')
raise SystemExit(0 if all(checks.values()) else 1)
PY
```

预期：命令以退出码 `1` 结束，并输出：

```text
phase1_completed False
verification_recorded False
current_phase_phase2 False
```

如果任一输出已经是 `True`，先读取 roadmap 确认是否有人已完成 Phase 1；不要覆盖已有证据。

## 任务 2：验证 spec 盘点与目标目录一致

**文件：**
- 读取：`docs/superpowers/specs/2026-05-15-plugin-dev-zh-translation-phase-1-design.md`
- 读取：`plugins/plugin-dev/**/*.{md,json,sh}`
- 修改：无
- 测试：内联 Python 检查

- [ ] **步骤 1：运行文件清单覆盖检查**

运行：

```bash
python - <<'PY'
from pathlib import Path
from collections import Counter

spec = Path('docs/superpowers/specs/2026-05-15-plugin-dev-zh-translation-phase-1-design.md')
root = Path('plugins/plugin-dev')
text = spec.read_text(encoding='utf-8')
targets = sorted(
    p.as_posix()
    for p in root.rglob('*')
    if p.is_file() and p.suffix.lower() in {'.md', '.json', '.sh'}
)
listed = []
for line in text.splitlines():
    if line.startswith('| `plugins/plugin-dev/'):
        listed.append(line.split('`')[1])
missing = [p for p in targets if p not in listed]
extra = [p for p in listed if p not in targets]
suffix_counts = dict(sorted(Counter(Path(p).suffix.lower() for p in targets).items()))
top_level_counts = dict(sorted(Counter(Path(p).relative_to(root).parts[0] for p in map(Path, targets)).items()))
print(f'target_count {len(targets)}')
print(f'listed_count {len(listed)}')
print(f'missing_count {len(missing)}')
print(f'extra_count {len(extra)}')
print(f'suffix_counts {suffix_counts}')
print(f'top_level_counts {top_level_counts}')
if missing:
    print('missing_paths')
    for path in missing:
        print(path)
if extra:
    print('extra_paths')
    for path in extra:
        print(path)
raise SystemExit(1 if missing or extra else 0)
PY
```

预期：命令通过，并输出：

```text
target_count 99
listed_count 99
missing_count 0
extra_count 0
suffix_counts {'.json': 6, '.md': 79, '.sh': 14}
top_level_counts {'.claude-plugin': 1, 'agents': 3, 'commands': 4, 'docs': 5, 'skills': 86}
```

- [ ] **步骤 2：运行术语和风险章节覆盖检查**

运行：

```bash
python - <<'PY'
from pathlib import Path
text = Path('docs/superpowers/specs/2026-05-15-plugin-dev-zh-translation-phase-1-design.md').read_text(encoding='utf-8')
required_terms = [
    'plugin', 'skill', 'command', 'slash command', 'agent', 'hook',
    'MCP', 'LSP', 'marketplace', 'frontmatter', 'manifest', 'schema'
]
required_sections = [
    '## Inventory Summary',
    '## Full File Inventory',
    '## Glossary',
    '## Non-translatable Rules',
    '## High-risk Fields',
    '## Verification Evidence Requirements',
]
missing_terms = [term for term in required_terms if term not in text]
missing_sections = [section for section in required_sections if section not in text]
print(f'missing_terms {len(missing_terms)}')
print(f'missing_sections {len(missing_sections)}')
if missing_terms:
    print('missing_terms_list')
    for term in missing_terms:
        print(term)
if missing_sections:
    print('missing_sections_list')
    for section in missing_sections:
        print(section)
raise SystemExit(1 if missing_terms or missing_sections else 0)
PY
```

预期：命令通过，并输出：

```text
missing_terms 0
missing_sections 0
```

## 任务 3：回填 roadmap 的 Phase 1 完成状态

**文件：**
- 读取：`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`
- 修改：`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`
- 测试：任务 4 的完成检查

- [ ] **步骤 1：读取 roadmap 当前内容**

使用 Read 工具读取：

```text
docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md
```

确认 Phase 1 当前为 `planned`，并且 Plan artifact 指向：

```text
docs/superpowers/plans/2026-05-15-plugin-dev-zh-translation-phase-1.md
```

- [ ] **步骤 2：更新 Current State**

将 `Current State` 中的当前阶段和下一步改为：

```markdown
- **Roadmap Status:** active
- **Current Phase:** Phase 2 — Core plugin content
- **Last Sync:** 2026-05-15
- **Next Manual Action:** 为 Phase 2 准备规格讨论 brief。
```

- [ ] **步骤 3：更新 Phase Summary 中 Phase 1 行**

将 Phase 1 行改为：

```markdown
| Phase 1 — Inventory and glossary | completed | 盘点文件、定义术语表和保留规则 | Spec `docs/superpowers/specs/2026-05-15-plugin-dev-zh-translation-phase-1-design.md`; Plan `docs/superpowers/plans/2026-05-15-plugin-dev-zh-translation-phase-1.md`; Implementation Summary recorded; Verification Evidence recorded |
```

- [ ] **步骤 4：更新 Phase 1 详情**

在 Phase 1 详情中，将状态和 artifacts 改为：

```markdown
- **Status:** completed
- **Scope:** 盘点 `plugins/plugin-dev` 下的 Markdown、JSON 和 shell 文件；定义中文术语表、保留原文规则和高风险字段清单。
- **Out of scope:** 实际批量翻译内容；修改插件行为；重排目录结构。
- **Success Criteria:**
  - 文件清单覆盖目标目录中的 Markdown、JSON 和 shell 文件。
  - 术语表明确常见插件、技能、命令、代理、hook、MCP、LSP、marketplace 等术语译法。
  - 高风险字段和不可翻译 token 有明确规则。
- **Artifacts:**
  - **Spec:** `docs/superpowers/specs/2026-05-15-plugin-dev-zh-translation-phase-1-design.md`
  - **Plan:** `docs/superpowers/plans/2026-05-15-plugin-dev-zh-translation-phase-1.md`
  - **Implementation Summary:** Phase 1 established a complete 99-file inventory, Chinese+English glossary, non-translatable rules, high-risk field rules, and verification evidence requirements in the approved spec.
  - **Verification Evidence:** 2026-05-15: `target_count 99`, `listed_count 99`, `missing_count 0`, `extra_count 0`, suffix counts `{'.json': 6, '.md': 79, '.sh': 14}`, top-level counts `{'.claude-plugin': 1, 'agents': 3, 'commands': 4, 'docs': 5, 'skills': 86}`, required terms covered, required risk sections covered.
```

- [ ] **步骤 5：更新 Handoff Rules 的下一步建议**

将下一步建议改为：

```markdown
- 下一步建议手动调用 `/superpowers:roadmap-management write-spec docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md Phase 2`。
```

- [ ] **步骤 6：追加 Change Log**

在 `## Change Log` 下方顶部追加：

```markdown
- 2026-05-15: Completed Phase 1 with validated inventory, glossary, non-translatable rules, and high-risk field rules; current phase advanced to Phase 2.
```

## 任务 4：验证 roadmap 完成状态

**文件：**
- 读取：`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`
- 读取：`docs/superpowers/specs/2026-05-15-plugin-dev-zh-translation-phase-1-design.md`
- 修改：无
- 测试：内联 Python 检查

- [ ] **步骤 1：运行完成状态检查**

运行：

```bash
python - <<'PY'
from pathlib import Path
roadmap_path = Path('docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md')
spec_path = Path('docs/superpowers/specs/2026-05-15-plugin-dev-zh-translation-phase-1-design.md')
plan_path = Path('docs/superpowers/plans/2026-05-15-plugin-dev-zh-translation-phase-1.md')
roadmap = roadmap_path.read_text(encoding='utf-8')
spec = spec_path.read_text(encoding='utf-8')
checks = {
    'spec_exists': spec_path.exists(),
    'plan_exists': plan_path.exists(),
    'roadmap_mentions_spec': spec_path.as_posix() in roadmap,
    'roadmap_mentions_plan': plan_path.as_posix() in roadmap,
    'spec_mentions_roadmap': roadmap_path.as_posix() in spec,
    'phase1_completed': '| Phase 1 — Inventory and glossary | completed |' in roadmap and '- **Status:** completed' in roadmap,
    'verification_recorded': 'target_count 99' in roadmap and 'missing_count 0' in roadmap and 'extra_count 0' in roadmap,
    'current_phase_phase2': '- **Current Phase:** Phase 2 — Core plugin content' in roadmap,
}
for name, ok in checks.items():
    print(f'{name} {ok}')
raise SystemExit(0 if all(checks.values()) else 1)
PY
```

预期：命令通过，并输出：

```text
spec_exists True
plan_exists True
roadmap_mentions_spec True
roadmap_mentions_plan True
spec_mentions_roadmap True
phase1_completed True
verification_recorded True
current_phase_phase2 True
```

- [ ] **步骤 2：确认没有把 `plugins/plugin-dev` 文件加入提交**

运行：

```bash
git diff --name-only --cached
```

预期：如果尚未 stage，输出为空。若已有 staged 文件，输出不得包含 `plugins/plugin-dev/` 路径。

## 任务 5：提交 Phase 1 完成文档

**文件：**
- 修改：`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`
- 创建或提交：`docs/superpowers/plans/2026-05-15-plugin-dev-zh-translation-phase-1.md`
- 测试：任务 2 和任务 4 的命令输出

- [ ] **步骤 1：查看工作区状态**

运行：

```bash
git status --short
```

预期：输出可能包含许多既有 `plugins/plugin-dev` 修改；本任务只处理下面两个 docs 文件：

```text
docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md
docs/superpowers/plans/2026-05-15-plugin-dev-zh-translation-phase-1.md
```

- [ ] **步骤 2：只 stage roadmap 和 plan**

运行：

```bash
git add "docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md" "docs/superpowers/plans/2026-05-15-plugin-dev-zh-translation-phase-1.md"
git diff --cached --name-only
```

预期输出只包含：

```text
docs/superpowers/plans/2026-05-15-plugin-dev-zh-translation-phase-1.md
docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md
```

如果输出包含 `plugins/plugin-dev/`，取消 stage 这些路径后重新运行 name-only 检查。

- [ ] **步骤 3：提交文档更新**

运行：

```bash
git commit -m "$(cat <<'EOF'
docs: complete plugin-dev translation inventory phase

Record the Phase 1 implementation plan and verification evidence so the roadmap can advance to core plugin content translation.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

预期：提交成功，提交摘要包含：

```text
docs: complete plugin-dev translation inventory phase
```

- [ ] **步骤 4：提交后检查状态**

运行：

```bash
git status --short
```

预期：不再显示这两个 docs 文件；既有 `plugins/plugin-dev` 修改如果仍存在，保持不处理。
