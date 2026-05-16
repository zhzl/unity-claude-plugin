# Unity Agent Kit Phase 1 架构与边界蓝图实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 Unity Agent Kit Phase 1 架构与边界蓝图规格作为 roadmap artifact 正式接入，并完成文档级验证证据交接。

**架构：** Phase 1 不实现代码；本计划只同步 roadmap 中 Phase 1 的 Spec/Plan artifact、验证规格文件质量，并准备 `complete-phase` 所需的具体证据。所有验证使用聚焦的文档检查命令，避免引入运行时代码或额外自动化。

**技术栈：** Markdown roadmap/spec/plan 文档、Python 一次性文档校验命令、Git 工作区检查。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 1
**Spec:** `docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md`

---

## 提交策略

本计划包含“提交检查点”步骤，但执行者只有在用户于执行阶段明确授权创建 commit 时才运行这些步骤。若没有授权，跳过所有 `git commit` 命令，并在最终汇报中说明“未提交”。

## 文件结构

### 已存在

- `docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md` — Phase 1 架构与边界蓝图规格。
- `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — Unity Agent Kit 长期 roadmap current truth。

### 本计划执行时修改

- `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — 回填 Phase 1 Spec/Plan artifact，更新 Phase 1 状态为 `planned`，并更新 current state / blocker / next manual action。

### 本计划执行时不修改

- 不修改 `docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md`，除非验证命令发现具体缺陷并经主会话确认。
- 不修改 `references/unity-mcp-v2` 或 `references/Unity-Skills`。
- 不创建 `plugins/unity-agent-kit/` 或 `unity/Assets/UnityAgentKit/`。
- 不实现 MCP tools、Unity C# host、skills、registry、resources 或 tests。
- 不把 Phase 1 标记为 `completed`；完成状态必须由后续 `/superpowers:roadmap-management complete-phase` 在具体 Verification Evidence 下记录。

---

## 任务 1：用失败检查确认 roadmap 尚未链接 Phase 1 artifacts

**文件：**
- 读取：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [ ] **步骤 1：运行 artifact 链接检查并确认当前失败**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
roadmap = Path('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md')
text = roadmap.read_text(encoding='utf-8')
required = [
    '| 1 | 架构与边界蓝图 | `planned` |',
    '**Status:** `planned`',
    '- **Spec:** `docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md`',
    '- **Plan:** `docs/superpowers/plans/2026-05-16-unity-agent-kit-phase-1-architecture-boundary.md`',
]
missing = [item for item in required if item not in text]
if missing:
    print('FAIL Phase 1 roadmap artifacts/status not linked:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS Phase 1 roadmap artifacts/status linked')
PY
```

预期：FAIL，输出包含：

```text
FAIL Phase 1 roadmap artifacts/status not linked:
```

- [ ] **步骤 2：记录失败原因**

确认失败原因只来自 Phase 1 roadmap artifact/status 尚未回填。如果失败原因是文件不存在或编码错误，停止并报告主会话，不继续编辑 roadmap。

---

## 任务 2：回填 Phase 1 roadmap artifact 并推进到 planned

**文件：**
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- 验证：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [ ] **步骤 1：更新 Phase Summary 中 Phase 1 状态**

在 `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` 中替换：

```markdown
| 1 | 架构与边界蓝图 | `needs-spec` | 定义 Unity Agent Kit 总体结构和硬约束 |
```

为：

```markdown
| 1 | 架构与边界蓝图 | `planned` | 定义 Unity Agent Kit 总体结构和硬约束 |
```

- [ ] **步骤 2：更新 Phase 1 detail 状态**

在 Phase 1 detail 中替换：

```markdown
**Status:** `needs-spec`
```

为：

```markdown
**Status:** `planned`
```

- [ ] **步骤 3：回填 Phase 1 artifact 路径**

在 Phase 1 的 `Artifacts` 列表中替换：

```markdown
- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending
```

为：

```markdown
- **Spec:** `docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md`
- **Plan:** `docs/superpowers/plans/2026-05-16-unity-agent-kit-phase-1-architecture-boundary.md`
- **Implementation Summary:** pending
- **Verification Evidence:** pending
```

- [ ] **步骤 4：更新 Current State 和 Next Manual Action**

在 `Current State` 中替换：

```markdown
- 当前阶段：Phase 1 需要编写 spec。
- **Next Manual Action:** `/superpowers:roadmap-management write-spec docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 1`
- 当前不实现代码。
```

为：

```markdown
- 当前阶段：Phase 1 已完成 spec 和 plan，等待按 plan 执行验证与完成证据交接。
- **Next Manual Action:** `/superpowers:roadmap-management implement-plan docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 1`
- 当前不实现代码；Phase 1 plan 只用于文档验证与交接。
```

- [ ] **步骤 5：更新 Phase 1 blocker**

在 `Blockers` 中替换：

```markdown
- 尚未为 Phase 1 编写 spec。
```

为：

```markdown
- Phase 1 尚未完成 plan 执行和 Verification Evidence 记录。
```

- [ ] **步骤 6：追加 Change Log**

在 `Change Log` 末尾追加：

```markdown
- 2026-05-16：回填 Phase 1 spec 和 plan artifact，Phase 1 进入 `planned` 状态。
```

- [ ] **步骤 7：重新运行 artifact 链接检查并确认通过**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
roadmap = Path('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md')
text = roadmap.read_text(encoding='utf-8')
required = [
    '| 1 | 架构与边界蓝图 | `planned` |',
    '**Status:** `planned`',
    '- **Spec:** `docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md`',
    '- **Plan:** `docs/superpowers/plans/2026-05-16-unity-agent-kit-phase-1-architecture-boundary.md`',
    '- Phase 1 尚未完成 plan 执行和 Verification Evidence 记录。',
    '- 2026-05-16：回填 Phase 1 spec 和 plan artifact，Phase 1 进入 `planned` 状态。',
]
missing = [item for item in required if item not in text]
if missing:
    print('FAIL Phase 1 roadmap artifacts/status not linked:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS Phase 1 roadmap artifacts/status linked')
PY
```

预期：PASS，输出：

```text
PASS Phase 1 roadmap artifacts/status linked
```

- [ ] **步骤 8：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md
git commit -m "docs: link unity agent kit phase 1 artifacts"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 3：验证 Phase 1 规格质量

**文件：**
- 读取：`docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md`

- [ ] **步骤 1：运行规格自检命令**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md')
text = p.read_text(encoding='utf-8')
lines = text.splitlines()
failed = False
checks = {
    'TODO/FIXME/TBD': ['TODO', 'FIXME', 'TBD', '待定', '暂未明确', '补充细节', '类似前文', '适当处理'],
    '裸延后表述': ['后续再说', '以后再说', 'later TBD'],
}
for name, needles in checks.items():
    hits = [(i + 1, n) for i, line in enumerate(lines) for n in needles if n in line]
    if hits:
        failed = True
        print(f'FAIL {name}: {hits}')
    else:
        print(f'PASS {name}')
forbidden_patterns = [
    '注册 v2 旧 public tools',
    '保留 v2 旧 public tools',
    '提供 v2 旧 public tools',
    'v2 public tool compatibility layer',
]
hits = []
for i, line in enumerate(lines, 1):
    for pat in forbidden_patterns:
        if pat in line and not any(neg in line for neg in ['不', '不提供', '不注册', '不引入']):
            hits.append((i, pat, line.strip()))
if hits:
    failed = True
    print('FAIL legacy compatibility positive statements:')
    for hit in hits:
        print(hit)
else:
    print('PASS no positive legacy compatibility statements')
required = [
    'developmentRepoRoot',
    'pluginRoot',
    'unityProjectRoot',
    'Transport Security 与 Host 最低校验',
    'Contract Kernel 与 C# host 的关系',
    '默认持久化与保存范围',
    'Phase Handoff Table',
]
for needle in required:
    if needle not in text:
        failed = True
        print(f'FAIL missing required content: {needle}')
    else:
        print(f'PASS contains: {needle}')
raise SystemExit(1 if failed else 0)
PY
```

预期：PASS，输出包含：

```text
PASS TODO/FIXME/TBD
PASS 裸延后表述
PASS no positive legacy compatibility statements
PASS contains: developmentRepoRoot
PASS contains: pluginRoot
PASS contains: unityProjectRoot
PASS contains: Transport Security 与 Host 最低校验
PASS contains: Contract Kernel 与 C# host 的关系
PASS contains: 默认持久化与保存范围
PASS contains: Phase Handoff Table
```

- [ ] **步骤 2：如果规格自检失败，停止执行**

如果步骤 1 输出任何 `FAIL`，不要继续记录 completion evidence。将失败输出交给主会话，由主会话决定是否修改 spec。

- [ ] **步骤 3：提交检查点（仅用户明确授权时执行）**

本任务默认不修改文件。如果步骤 1 通过且没有文件变化，不执行 commit。如果主会话批准了修复并修改了 spec，运行：

```bash
git add docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md
git commit -m "docs: refine unity agent kit phase 1 spec"
```

预期：只有用户明确授权提交且 spec 有实际修改时才执行；否则跳过。

---

## 任务 4：准备 Phase 1 completion evidence 交接

**文件：**
- 读取：`docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md`
- 读取：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [ ] **步骤 1：整理 Implementation Summary**

向主会话报告以下 Implementation Summary 文本，不直接写入 roadmap completed 字段：

```markdown
Phase 1 完成 Unity Agent Kit 架构与边界蓝图规格，明确新插件 identity、四层主干、Contract Kernel、public/internal/host 边界、v2 candidate baseline 采纳规则、安全/完成语义/持久化/target/artifact/result/error 边界，以及 Phase 2-9 的交接输入。
```

- [ ] **步骤 2：整理 Verification Evidence**

向主会话报告以下 Verification Evidence 模板，并填入任务 3 的实际命令输出摘要：

```markdown
- 规格文件：`docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md`
- 计划文件：`docs/superpowers/plans/2026-05-16-unity-agent-kit-phase-1-architecture-boundary.md`
- 验证命令：`PYTHONIOENCODING=utf-8 python - <<'PY' ... PY`
- 验证结果：规格自检通过，包含 TODO/FIXME/TBD、裸延后表述、legacy compatibility 正向表述和关键章节存在性检查。
- 覆盖 Phase 1 success criteria：规格明确 Unity Agent Kit 不是单纯 MCP 工具；明确不采用“一 operation 一 MCP tool”；明确 TS 与 Unity C# 职责；明确 Resources、artifacts、skills、public tools 和 internal operations 边界；明确 Phase 2-9 设计输入。
```

- [ ] **步骤 3：生成下一条手动命令建议**

向主会话报告：

```text
/superpowers:roadmap-management complete-phase docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 1
```

并说明需要把步骤 1 和步骤 2 的具体 evidence 交给 `complete-phase`。

- [ ] **步骤 4：确认不直接完成 phase**

确认本计划执行阶段不直接把 Phase 1 标记为 `completed`。Phase completion 必须由 `roadmap-management complete-phase` 基于具体 Verification Evidence 完成。

---

## 任务 5：最终检查工作区状态

**文件：**
- 读取：Git 工作区状态

- [ ] **步骤 1：查看工作区状态**

运行：

```bash
git status --short
```

预期：至少能看到本计划相关文件变更；如果出现无关文件变更，不要删除或覆盖，向主会话报告。

- [ ] **步骤 2：查看相关 diff 摘要**

运行：

```bash
git diff -- docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md docs/superpowers/plans/2026-05-16-unity-agent-kit-phase-1-architecture-boundary.md
```

预期：diff 只包含 Phase 1 spec、Phase 1 plan 和 roadmap Phase 1 artifact/status 同步相关变化。

- [ ] **步骤 3：提交检查点（仅用户明确授权时执行）**

如果用户明确授权提交，并且前面任务已经通过验证，运行：

```bash
git add docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md docs/superpowers/plans/2026-05-16-unity-agent-kit-phase-1-architecture-boundary.md
git commit -m "docs: add unity agent kit phase 1 architecture plan"
```

预期：只有用户明确授权提交时才执行；否则跳过。
