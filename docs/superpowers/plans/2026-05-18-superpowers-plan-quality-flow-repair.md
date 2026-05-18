# Superpowers Plan Quality Flow Repair 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 修改三个 Superpowers 流程技能，让 roadmap handoff、implementation plan 生成和 spec/plan review 更早暴露范围、约束、参考输入和验证强度问题。

**架构：** 只修改现有 skill 文档，不新增 CLI、validator、后台同步或独立 skill。`roadmap-management` 负责 handoff 前范围检查和上下文交接，`writing-plans` 负责计划结构和验证格式，`reviewing-specs` 负责手动 subagent consistency review 的通用计划质量检查。

**技术栈：** Markdown、Superpowers skill 文档、Python inline 文本检查、git diff/check。

**Spec:** `docs/superpowers/specs/2026-05-18-superpowers-plan-quality-flow-repair-design.md`

**拆分检查：** 已检查；无需拆分。三个 skill 修改属于同一个流程修复单元，范围小、无代码运行时依赖，能用一个 implementation plan 独立完成和验证。

---

## 提交策略

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行这些 Commit 步骤；若未授权，跳过 Commit 步骤，并在最终汇报中列出未提交的修改文件。

## 上游约束摘要

- **设计规格：** `docs/superpowers/specs/2026-05-18-superpowers-plan-quality-flow-repair-design.md`。
- **修改范围：** 只修改 `plugins/superpowers/skills/roadmap-management/SKILL.md`、`plugins/superpowers/skills/writing-plans/SKILL.md`、`plugins/superpowers/skills/reviewing-specs/SKILL.md`。
- **非目标：** 不新增 CLI、validator、后台同步或独立 plan-quality skill；不修改任何具体项目 implementation plan；不把具体项目或技术栈事故词写入通用流程规则。
- **成功标准：** 三个 skill 文件包含设计规格要求的新流程步骤、模板和审查维度；新增文本保持通用；验证命令证明修改落地。
- **本计划不包含：** 不修订既有大型 implementation plan，不改 roadmap current truth，不调用实现执行技能。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-18-superpowers-plan-quality-flow-repair-design.md` | 目标、非目标、三处 skill 修改范围、成功标准和验证计划 | 不采用其中的后续流程执行步骤作为本计划的实现内容 | 本计划只实现 skill 文档修复，不处理后续既有计划修订 | 任务 1-4 |
| `plugins/superpowers/skills/roadmap-management/SKILL.md` | 保留手动交接、不自动调用其他技能、不自动修改 roadmap current truth 的现有边界 | 不改变 `new-roadmap` 和 `change-roadmap` 的主体流程 | 设计只要求增强 `write-spec` 和 `write-plan` handoff | 任务 1 |
| `plugins/superpowers/skills/writing-plans/SKILL.md` | 保留现有计划头部、任务结构、自检、执行交接格式 | 不新增独立 reference doc | 设计要求轻量模板直接进入主 skill 文档 | 任务 2 |
| `plugins/superpowers/skills/reviewing-specs/SKILL.md` | 保留手动触发、subagent 审查、不修改文件、现有输出格式 | 不新增独立 review skill 或自动触发入口 | 设计要求扩展现有 `Spec/plan consistency review` | 任务 3 |

## 文件结构

- 修改：`plugins/superpowers/skills/roadmap-management/SKILL.md` — 增加 phase 范围检查规则，并增强 `write-spec` / `write-plan` handoff 步骤。
- 修改：`plugins/superpowers/skills/writing-plans/SKILL.md` — 增加拆分门槛、上游约束摘要、参考输入映射、验证证明格式和自检扩展。
- 修改：`plugins/superpowers/skills/reviewing-specs/SKILL.md` — 扩展 `Spec/plan consistency review` 的通用计划质量检查项。

---

## 任务 1：增强 roadmap-management 的 phase 范围检查和 handoff

**文件：**
- 修改：`plugins/superpowers/skills/roadmap-management/SKILL.md`

- [x] **步骤 1：编写失败的 roadmap-management 文本检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
path = Path('plugins/superpowers/skills/roadmap-management/SKILL.md')
text = path.read_text(encoding='utf-8')
required = [
    '## Phase 范围检查',
    '多个可独立交付、可独立验证的软件单元',
    '拆为正式 roadmap phases',
    '保持同一 roadmap phase，但拆为多个 implementation plans',
    '明确接受单一 phase / 单一 plan 风险后继续',
    'phase 范围检查结果',
    '用户选择的拆分方向',
    'spec 中已确认的关键决策',
    '写 plan 前必须处理的未确认问题',
]
missing = [item for item in required if item not in text]
if missing:
    print('FAIL roadmap-management flow repair text missing:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS roadmap-management flow repair text present')
PY
```

预期：FAIL，输出缺少 `## Phase 范围检查` 等新文本。

证明：该检查证明 roadmap-management 尚未包含设计规格要求的范围检查和 handoff 字段，因为它逐项查找新流程的关键文本。

- [x] **步骤 2：插入 Phase 范围检查章节**

在 `## Action: write-spec` 之前插入：

```markdown
## Phase 范围检查

在 `write-spec` 和 `write-plan` action 中，读取目标 phase 后先检查该 phase 是否包含多个可独立交付、可独立验证的软件单元。

如果 phase 可能过大，先向用户说明范围风险，并让用户选择：

1. 拆为正式 roadmap phases，并进入 `change-roadmap`。
2. 保持同一 roadmap phase，但拆为多个 implementation plans。
3. 明确接受单一 phase / 单一 plan 风险后继续。

本检查不得自动修改 `ROADMAP.md`，不得自动调用其他技能。正式 phase 结构变化必须通过 `change-roadmap`；同一 phase 下的多个 plan 只影响 plan 文档，除非用户后续要求同步 roadmap。
```

- [x] **步骤 3：更新 `write-spec` action 步骤**

将 `## Action: write-spec` 下的步骤替换为：

```markdown
步骤：

1. 读取 `ROADMAP.md`。
2. 定位目标 phase。
3. 提取 `Goal`、`Shared Constraints`、phase scope、out of scope 和 success criteria。
4. 执行 Phase 范围检查；如果 phase 可能过大，先让用户选择拆正式 roadmap phases、拆同 phase 多个 plans，或接受单一 phase / plan 风险后继续。
5. 生成 `Spec Discussion Brief`，其中必须包含 Roadmap / Phase 摘要、`Shared Constraints`、phase scope、out of scope、success criteria、phase 范围检查结果、可能的拆分单元、reference input mapping（如适用）、主动挑战扫描清单、第一条“必须先确认”的问题和未确认挑战清单。
6. 只有在必须先确认的问题已确认或明确记录为 roadmap 假设后，才建议用户手动调用 `superpowers:brainstorming`。
7. handoff 给 brainstorming 时必须带上已确认结论、未确认挑战清单、phase 范围检查结果和未确认的拆分风险或 handoff 风险。
```

- [x] **步骤 4：更新 `write-plan` action 步骤**

将 `## Action: write-plan` 下的步骤替换为：

```markdown
步骤：

1. 读取 `ROADMAP.md`。
2. 定位目标 phase。
3. 读取 phase 的 `Spec` 路径。
4. 提取 Roadmap 路径、Phase、`Shared Constraints`、phase scope、out of scope、success criteria、spec 中已确认的关键决策和 reference inputs。
5. 执行 Phase 范围检查；如果 phase 可能过大，先让用户选择拆正式 roadmap phases、拆同 phase 多个 plans，或接受单一 phase / plan 风险后继续。
6. 生成 plan handoff，必须包含 phase 范围检查结果、用户选择的拆分方向、`Shared Constraints`、phase scope、out of scope、success criteria、spec 中已确认的关键决策、reference inputs，以及写 plan 前必须处理的未确认问题。
7. 建议用户手动调用 `superpowers:writing-plans`。
```

保留 `不要直接写 plan，除非用户另行显式调用 writing-plans。`

- [x] **步骤 5：运行 roadmap-management 文本检查验证通过**

运行步骤 1 的 Python 命令。

预期输出：

```text
PASS roadmap-management flow repair text present
```

证明：该检查证明 `roadmap-management` 已包含 phase 范围检查和 `write-spec` / `write-plan` handoff 增强所需的关键文本。

- [x] **步骤 6：Commit**

```bash
git add plugins/superpowers/skills/roadmap-management/SKILL.md
git commit -m "$(cat <<'EOF'
docs: strengthen roadmap phase handoff checks

Add a phase scope check and richer write-spec/write-plan handoff fields so oversized roadmap phases are surfaced before planning.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 2：增强 writing-plans 的拆分门槛、约束、参考映射和验证格式

**文件：**
- 修改：`plugins/superpowers/skills/writing-plans/SKILL.md`

- [x] **步骤 1：编写失败的 writing-plans 文本检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
path = Path('plugins/superpowers/skills/writing-plans/SKILL.md')
text = path.read_text(encoding='utf-8')
required = [
    '计划前拆分门槛',
    '**拆分检查：** 已检查；无需拆分。',
    '## 上游约束摘要',
    '**Roadmap Shared Constraints:**',
    '## 参考输入映射',
    '| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |',
    '证明：该检查证明 [任务成功标准]，因为 [可观察结果]。',
    '行为任务不能只检查文件、函数、字符串或符号存在',
    '验证步骤是否证明成功标准',
]
missing = [item for item in required if item not in text]
if missing:
    print('FAIL writing-plans flow repair text missing:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS writing-plans flow repair text present')
PY
```

预期：FAIL，输出缺少 `计划前拆分门槛`、`## 上游约束摘要` 等新文本。

证明：该检查证明 writing-plans 尚未包含设计规格要求的计划结构、模板和验证强化内容。

- [x] **步骤 2：替换范围检查章节为计划前拆分门槛**

将 `## 范围检查` 下现有段落替换为：

```markdown
## 计划前拆分门槛

写 implementation plan 前，必须判断规格是否包含多个可独立交付的软件单元。

如果规格涵盖多个独立子系统，它应该在头脑风暴阶段就被拆分为子项目规格。如果没有，先停止并建议拆成多个 implementation plans，或回到 roadmap change 处理 phase 结构。每个 plan 应该能独立产出可工作、可测试的软件。

只有用户明确接受单一 plan 风险后，才继续写总 plan。继续单一 plan 时，必须在计划头部记录拆分检查结果和风险说明。
```

- [x] **步骤 3：更新计划文档头部模板**

在计划头部模板的 `**技术栈：** [关键技术/库]` 后加入：

```markdown
**拆分检查：** 已检查；无需拆分。
```

并在模板说明后补充：

```markdown
如果用户明确接受继续单一计划的风险，改写为：

```markdown
**拆分检查：** 已检查；用户选择继续单一计划。
**风险说明：** [简短说明为什么该计划仍可执行，或用户接受的风险。]
```
```

- [x] **步骤 4：在 Roadmap 上下文后插入上游约束摘要和参考输入映射模板**

在 `## Roadmap 上下文` 章节结束后、`## 任务结构` 之前插入：

```markdown
## 上游约束摘要

每个 plan 在任务列表前必须包含：

```markdown
## 上游约束摘要

- **Roadmap Shared Constraints:** [从 roadmap 提取；没有时写 N/A]
- **Phase Scope:** [当前 phase scope]
- **Phase Out-of-scope:** [当前 phase out-of-scope]
- **Success Criteria:** [当前 phase success criteria]
- **用户确认事项:** [用户已确认的关键决策]
- **本计划不包含:** [明确不进入本计划的范围]
```

该章节用于交接和审查，不要求写成大型矩阵。

## 参考输入映射

当用户、roadmap 或 spec 提供参考项目、旧实现、设计文档或示例代码时，plan 必须包含：

```markdown
## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `path/or/name` | [采用的结构、模式或约束] | [不采用的部分] | [不采用原因] | 任务 N |
```

规则：

- 不允许只写“参考 X”。
- 不采用参考输入的某部分时必须说明原因。
- 采用内容必须能映射到任务。
```

- [x] **步骤 5：更新任务结构中的验证步骤模板**

在任务结构示例的验证步骤中，将：

```markdown
运行：`pytest tests/path/test.py::test_name -v`
预期：PASS
```

替换为：

```markdown
运行：`pytest tests/path/test.py::test_name -v`
预期：PASS
证明：该检查证明 [任务成功标准]，因为 [可观察结果]。
```

并在 `## 注意事项` 中追加：

```markdown
- skeleton、manifest、目录结构任务可以检查文件或字段存在。
- 行为任务不能只检查文件、函数、字符串或符号存在。
- 如果某一步只能做存在性检查，必须说明该任务不是行为验收任务。
```

- [x] **步骤 6：扩展自检清单**

在 `## 自检` 的现有 3 项后追加：

```markdown
**4. 拆分检查：** 计划是否记录了拆分检查结果；如果用户选择继续单一计划，是否记录了风险说明？

**5. 上游约束覆盖：** Roadmap、spec 或用户确认事项中的约束是否进入上游约束摘要，并映射到任务或验证？

**6. 参考输入映射：** 如果存在参考输入，计划是否说明采用内容、不采用内容、不采用原因和落地任务？

**7. 验证强度：** 每个行为任务的验证步骤是否证明任务成功标准，而不是只证明文件、函数、字符串或符号存在？
```

- [x] **步骤 7：运行 writing-plans 文本检查验证通过**

运行步骤 1 的 Python 命令。

预期输出：

```text
PASS writing-plans flow repair text present
```

证明：该检查证明 `writing-plans` 已包含拆分门槛、上游约束摘要、参考输入映射、验证证明格式和自检扩展所需的关键文本。

- [x] **步骤 8：Commit**

```bash
git add plugins/superpowers/skills/writing-plans/SKILL.md
git commit -m "$(cat <<'EOF'
docs: strengthen implementation plan structure

Require split checks, upstream constraints, reference mapping, and verification proof in implementation plans.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 3：扩展 reviewing-specs 的 spec/plan consistency review

**文件：**
- 修改：`plugins/superpowers/skills/reviewing-specs/SKILL.md`

- [x] **步骤 1：编写失败的 reviewing-specs 文本检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
path = Path('plugins/superpowers/skills/reviewing-specs/SKILL.md')
text = path.read_text(encoding='utf-8')
required = [
    '上游约束检查',
    '参考输入检查',
    '验证强度检查',
    '拆分检查',
    '执行性检查',
    'plan 是否记录拆分判断',
    '任务验证是否证明成功标准',
]
missing = [item for item in required if item not in text]
if missing:
    print('FAIL reviewing-specs flow repair text missing:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS reviewing-specs flow repair text present')
PY
```

预期：FAIL，输出缺少 `上游约束检查`、`参考输入检查` 等新文本。

证明：该检查证明 reviewing-specs 尚未扩展现有 spec/plan consistency review 的通用计划质量检查项。

- [x] **步骤 2：扩展 Spec/plan consistency review 检查清单**

在 `入口 2：Spec/plan consistency review` 的“要求 subagent 检查”列表中，在 `验证检查` 后加入：

```markdown
- 上游约束检查：roadmap/spec/user-confirmed constraints 是否进入 plan，并影响任务或验证。
- 参考输入检查：如果存在参考输入，plan 是否说明采用/不采用的部分及原因。
- 验证强度检查：任务验证是否证明成功标准，而不只是证明文件、符号或文本存在。
- 拆分检查：plan 是否记录拆分判断；如果范围过大，是否已拆分或记录用户选择。
- 执行性检查：任务是否可按顺序执行，是否存在缺少前置任务或跨任务依赖倒置。
```

保留现有输出格式和手动 subagent 边界。

- [x] **步骤 3：补充拆分建议边界**

在 `反馈处理` 列表中追加：

```markdown
- 如果审查发现 plan 可能应拆分，只能建议拆分为多个 plans、回到 roadmap change，或要求 plan 记录用户接受单一 plan 风险；不得自行重写 plan 或决定 roadmap phase 结构。
```

- [x] **步骤 4：运行 reviewing-specs 文本检查验证通过**

运行步骤 1 的 Python 命令。

预期输出：

```text
PASS reviewing-specs flow repair text present
```

证明：该检查证明 `reviewing-specs` 的 `Spec/plan consistency review` 已包含上游约束、参考输入、验证强度、拆分和执行性检查。

- [x] **步骤 5：Commit**

```bash
git add plugins/superpowers/skills/reviewing-specs/SKILL.md
git commit -m "$(cat <<'EOF'
docs: expand spec plan consistency review

Add general plan quality checks for constraints, references, verification strength, split decisions, and execution order.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 4：最终验证流程修复

**文件：**
- 验证：`plugins/superpowers/skills/roadmap-management/SKILL.md`
- 验证：`plugins/superpowers/skills/writing-plans/SKILL.md`
- 验证：`plugins/superpowers/skills/reviewing-specs/SKILL.md`

- [x] **步骤 1：运行综合内容检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
checks = {
    'plugins/superpowers/skills/roadmap-management/SKILL.md': [
        '## Phase 范围检查',
        'phase 范围检查结果',
        '用户选择的拆分方向',
        '写 plan 前必须处理的未确认问题',
    ],
    'plugins/superpowers/skills/writing-plans/SKILL.md': [
        '计划前拆分门槛',
        '## 上游约束摘要',
        '## 参考输入映射',
        '证明：该检查证明 [任务成功标准]，因为 [可观察结果]。',
        '验证步骤是否证明成功标准',
    ],
    'plugins/superpowers/skills/reviewing-specs/SKILL.md': [
        '上游约束检查',
        '参考输入检查',
        '验证强度检查',
        '拆分检查',
        '执行性检查',
    ],
}
missing = []
for path, needles in checks.items():
    text = Path(path).read_text(encoding='utf-8')
    for needle in needles:
        if needle not in text:
            missing.append(f'{path}: {needle}')
if missing:
    print('FAIL flow repair content missing:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS flow repair content present in all target skills')
PY
```

预期输出：

```text
PASS flow repair content present in all target skills
```

证明：该检查证明三个目标 skill 文件都包含设计规格要求的新增流程文本。

- [x] **步骤 2：运行边界检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
changed_files = [
    Path('plugins/superpowers/skills/roadmap-management/SKILL.md'),
    Path('plugins/superpowers/skills/writing-plans/SKILL.md'),
    Path('plugins/superpowers/skills/reviewing-specs/SKILL.md'),
]
forbidden = ['CLI command', 'schema validator', '后台同步机制', 'plan-quality skill']
violations = []
for path in changed_files:
    text = path.read_text(encoding='utf-8')
    for word in forbidden:
        if word in text:
            violations.append(f'{path}: {word}')
if violations:
    print('FAIL forbidden flow expansion text found:')
    for item in violations:
        print('-', item)
    raise SystemExit(1)
print('PASS no forbidden flow expansion text found')
PY
```

预期输出：

```text
PASS no forbidden flow expansion text found
```

证明：该检查证明实现没有引入设计规格排除的 CLI、validator、后台同步或独立 plan-quality skill 方向。

- [x] **步骤 3：运行 markdown whitespace 检查**

运行：

```bash
git diff --check
```

预期：无输出，退出码为 0。

证明：该检查证明 skill 文档修改没有 trailing whitespace 或 diff whitespace 错误。

- [x] **步骤 4：检查未意外修改非目标文件**

运行：

```bash
git status --short
```

预期：除用户已知的未跟踪旧计划文件外，只显示三个 skill 文件的修改。

证明：该检查证明实现范围限制在设计规格批准的三个 skill 文件内，没有修改具体项目 implementation plan 或 roadmap current truth。

- [x] **步骤 5：Commit**

```bash
git add plugins/superpowers/skills/roadmap-management/SKILL.md plugins/superpowers/skills/writing-plans/SKILL.md plugins/superpowers/skills/reviewing-specs/SKILL.md
git commit -m "$(cat <<'EOF'
docs: repair superpowers planning flow quality gates

Update roadmap handoff, implementation plan structure, and spec-plan review so scope, upstream constraints, references, and verification strength are explicit before execution.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```
