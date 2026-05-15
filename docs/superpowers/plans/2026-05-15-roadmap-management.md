# Roadmap Management 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为 Superpowers 增加一个中文 manual-only `roadmap-management` 技能，用单个 `ROADMAP.md` 管理大型长期任务，并保持 spec → plan → implement 的既有流程。

**架构：** 新技能文件负责流程纪律、动作菜单、状态规则和红线；长模板与示例拆到 `references/roadmap-format.md`。测试采用先写失败的静态行为测试，再补技能与引用文档，最后接入显式触发测试和测试入口。

**技术栈：** Markdown skill 文档、Bash 静态测试、Claude Code explicit skill request 测试。

---

## 文件结构

- 创建：`plugins/superpowers/skills/roadmap-management/SKILL.md` — 中文 manual-only 主技能。
- 创建：`plugins/superpowers/skills/roadmap-management/references/roadmap-format.md` — `ROADMAP.md`、`Proposal Brief` 和 handoff 模板。
- 创建：`plugins/superpowers/tests/claude-code/test-roadmap-management.sh` — 低成本静态行为测试。
- 创建：`plugins/superpowers/tests/explicit-skill-requests/prompts/use-roadmap-management.txt` — 显式触发测试 prompt。
- 修改：`plugins/superpowers/tests/explicit-skill-requests/run-all.sh` — 注册显式触发测试。
- 修改：`plugins/superpowers/tests/claude-code/run-skill-tests.sh` — 注册静态行为测试。
- 修改：`plugins/superpowers/skills/writing-plans/SKILL.md` — 增加显式 Roadmap/Phase 上下文支持。

## 任务 1：先添加失败的 roadmap-management 静态行为测试

**文件：**
- 创建：`plugins/superpowers/tests/claude-code/test-roadmap-management.sh`

- [ ] **步骤 1：编写失败的静态测试**

创建 `plugins/superpowers/tests/claude-code/test-roadmap-management.sh`，内容如下：

```bash
#!/usr/bin/env bash
# Test: roadmap-management skill
# Verifies manual-only roadmap workflow rules and reference templates.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

SKILL="$PLUGIN_ROOT/skills/roadmap-management/SKILL.md"
REFERENCE="$PLUGIN_ROOT/skills/roadmap-management/references/roadmap-format.md"
NATURAL_TRIGGER_PROMPT="$PLUGIN_ROOT/tests/skill-triggering/prompts/roadmap-management.txt"

echo "=== Test: roadmap-management skill ==="
echo ""

assert_file_exists() {
    local file="$1"
    local test_name="$2"

    if [ -f "$file" ]; then
        echo "  [PASS] $test_name"
    else
        echo "  [FAIL] $test_name"
        echo "  Missing file: $file"
        exit 1
    fi
}

assert_file_missing() {
    local file="$1"
    local test_name="$2"

    if [ ! -f "$file" ]; then
        echo "  [PASS] $test_name"
    else
        echo "  [FAIL] $test_name"
        echo "  Unexpected file exists: $file"
        exit 1
    fi
}

assert_file_contains() {
    local file="$1"
    local pattern="$2"
    local test_name="$3"

    if grep -q "$pattern" "$file"; then
        echo "  [PASS] $test_name"
    else
        echo "  [FAIL] $test_name"
        echo "  Expected pattern: $pattern"
        echo "  In file: $file"
        exit 1
    fi
}

assert_file_exists "$SKILL" "Skill file exists"
assert_file_exists "$REFERENCE" "Reference file exists"
assert_file_missing "$NATURAL_TRIGGER_PROMPT" "No natural trigger prompt is added"

echo ""
echo "Test 1: Manual-only trigger rules..."
assert_file_contains "$SKILL" "name: roadmap-management" "Frontmatter names the skill"
assert_file_contains "$SKILL" "不要因普通长期任务" "Description prevents natural triggering"
assert_file_contains "$SKILL" "MANUAL-ONLY" "Manual-only hard gate exists"
assert_file_contains "$SKILL" "显式调用" "Requires explicit invocation"
assert_file_contains "$SKILL" "不要新增 natural trigger tests" "Forbids natural trigger tests"

echo ""
echo "Test 2: Roadmap model and actions..."
assert_file_contains "$SKILL" "docs/superpowers/roadmaps" "Roadmap location documented"
assert_file_contains "$SKILL" "ROADMAP.md" "ROADMAP.md documented"
assert_file_contains "$SKILL" "Shared Constraints" "Shared constraints documented"
assert_file_contains "$SKILL" "Phase Summary" "Phase summary documented"
assert_file_contains "$SKILL" "Phase Details" "Phase details documented"
assert_file_contains "$SKILL" "Artifacts" "Artifacts mapping documented"
assert_file_contains "$SKILL" "Verification Evidence" "Verification evidence documented"
assert_file_contains "$SKILL" "new-roadmap" "new-roadmap action documented"
assert_file_contains "$SKILL" "progress" "progress action documented"
assert_file_contains "$SKILL" "write-spec" "write-spec action documented"
assert_file_contains "$SKILL" "write-plan" "write-plan action documented"
assert_file_contains "$SKILL" "implement-plan" "implement-plan action documented"
assert_file_contains "$SKILL" "complete-phase" "complete-phase action documented"
assert_file_contains "$SKILL" "change-roadmap" "change-roadmap action documented"

echo ""
echo "Test 3: Handoff skills..."
assert_file_contains "$SKILL" "superpowers:brainstorming" "Brainstorming handoff documented"
assert_file_contains "$SKILL" "superpowers:writing-plans" "Writing-plans handoff documented"
assert_file_contains "$SKILL" "superpowers:subagent-driven-development" "Subagent-driven handoff documented"
assert_file_contains "$SKILL" "superpowers:executing-plans" "Executing-plans handoff documented"
assert_file_contains "$SKILL" "不要自动调用" "Automatic skill invocation is forbidden"

echo ""
echo "Test 4: Proposal and OpenSpec governance..."
assert_file_contains "$SKILL" "Proposal Brief" "Proposal Brief documented"
assert_file_contains "$SKILL" "current truth" "Current truth concept documented"
assert_file_contains "$SKILL" "proposed change" "Proposed change concept documented"
assert_file_contains "$SKILL" "职责分离" "Document responsibility separation documented"
assert_file_contains "$SKILL" "大变更先 Proposal" "Proposal before large changes documented"
assert_file_contains "$SKILL" "不要复制 OpenSpec" "OpenSpec full lifecycle is forbidden"
assert_file_contains "$SKILL" "不要复制 GSD" "GSD full artifact set is forbidden"

echo ""
echo "Test 5: Red lines..."
assert_file_contains "$SKILL" "不要创建 CLI" "CLI creation is forbidden"
assert_file_contains "$SKILL" "不要创建 schema validators" "Schema validators are forbidden"
assert_file_contains "$SKILL" "不要新增 worktree guidance" "Worktree guidance is forbidden"
assert_file_contains "$SKILL" "不要从聊天记忆推断完成度" "Chat-memory completion is forbidden"

echo ""
echo "Test 6: Reference templates..."
assert_file_contains "$REFERENCE" "ROADMAP.md Full Template" "Roadmap full template exists"
assert_file_contains "$REFERENCE" "Phase Detail Template" "Phase detail template exists"
assert_file_contains "$REFERENCE" "Proposal Brief Template" "Proposal template exists"
assert_file_contains "$REFERENCE" "Spec Discussion Brief Template" "Spec brief template exists"
assert_file_contains "$REFERENCE" "Plan Handoff Template" "Plan handoff template exists"
assert_file_contains "$REFERENCE" "Execution Handoff Template" "Execution handoff template exists"
assert_file_contains "$REFERENCE" "Completion Evidence Examples" "Completion evidence examples exist"

echo ""
echo "=== roadmap-management skill tests passed ==="
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
bash plugins/superpowers/tests/claude-code/test-roadmap-management.sh
```

预期：FAIL，输出包含：

```text
Missing file: .../plugins/superpowers/skills/roadmap-management/SKILL.md
```

- [ ] **步骤 3：Commit**

```bash
git add plugins/superpowers/tests/claude-code/test-roadmap-management.sh
git commit -m "test: add roadmap management skill checks"
```

## 任务 2：实现中文 manual-only 主技能与 reference 文档

**文件：**
- 创建：`plugins/superpowers/skills/roadmap-management/SKILL.md`
- 创建：`plugins/superpowers/skills/roadmap-management/references/roadmap-format.md`
- 测试：`plugins/superpowers/tests/claude-code/test-roadmap-management.sh`

- [ ] **步骤 1：创建技能目录和 reference 目录**

运行：

```bash
mkdir -p plugins/superpowers/skills/roadmap-management/references
```

预期：命令成功，无输出。

- [ ] **步骤 2：编写 `SKILL.md`**

创建 `plugins/superpowers/skills/roadmap-management/SKILL.md`，内容如下：

```markdown
---
name: roadmap-management
description: 当用户明确点名 roadmap-management、显式调用 /superpowers:roadmap-management，或要求按 roadmap-management 流程处理指定 ROADMAP.md 时使用；不要因普通长期任务或 roadmap 讨论自动触发
---

# Roadmap Management

一个手动触发的长期任务路线图控制器，用于管理大型 initiative 的 `ROADMAP.md`、阶段状态、共享约束、artifact 映射和下一步手动交接。

<MANUAL-ONLY>
只在用户明确点名 `roadmap-management`、显式调用 `/superpowers:roadmap-management`，或要求按 roadmap-management 流程处理指定 `ROADMAP.md` 时使用本技能。

不要因为用户普通提到这些词就自动触发本技能：
- 长期任务
- roadmap
- 多阶段
- milestone
- 同步状态
- blocker
- 阻塞项

如果用户没有明确请求本技能，继续使用普通 Superpowers 流程。
</MANUAL-ONLY>

## 概述

一个大功能或长期 initiative 对应一个 `ROADMAP.md`：

`docs/superpowers/roadmaps/YYYY-MM-DD-<slug>/ROADMAP.md`

职责分离：

- `ROADMAP.md` 是长期目标、共享约束、阶段状态、artifact 映射和下一步的 current truth。
- `Proposal Brief` 是 proposed change，用于改变路线图方向之前的确认。
- `docs/superpowers/specs/` 保存阶段设计和规格。
- `docs/superpowers/plans/` 保存阶段实现计划。

完整模板和长示例见 `references/roadmap-format.md`。

## OpenSpec 文档治理原则

本技能借鉴 OpenSpec 的文档治理思想，但不要复制 OpenSpec 的完整目录和 `changes/` lifecycle。

- **current truth / proposed change 分离：** `ROADMAP.md` 是 current truth；`Proposal Brief` 是 proposed change。
- **职责分离：** roadmap 保存长期状态；spec 保存阶段设计；plan 保存执行步骤。
- **大变更先 Proposal：** 修改目标、共享约束或 phase 结构前，先生成 `Proposal Brief` 并获得用户批准。
- **完成需要 evidence：** `complete-phase` 必须有 `Verification Evidence`。
- **轻量历史：** 使用 `Decisions`、`Pending Proposals`、`Change Log` 和 phase status 保留历史，不新增 archive 目录。

## 用户动作

如果用户没有指定动作，询问：

1. `new-roadmap` — 创建新的长期 roadmap
2. `progress` — 读取 roadmap 和 artifacts，同步状态并显示下一步
3. `write-spec` — 为某个 phase 准备 `Spec Discussion Brief`
4. `write-plan` — 为某个 phase 准备 `superpowers:writing-plans` 交接
5. `implement-plan` — 为某个 phase 准备执行交接
6. `complete-phase` — 记录验证证据并完成 phase
7. `change-roadmap` — 通过 `Proposal Brief` 调整目标、约束或 phase 结构

主循环：

```text
progress → write-spec → write-plan → implement-plan → complete-phase → progress
```

`change-roadmap` 是侧路：当路线图本身需要改变时使用。

## ROADMAP.md 结构

`ROADMAP.md` 应包含：

1. `Metadata`
2. `Goal`
3. `Non-goals`
4. `Shared Constraints`
5. `Success Criteria`
6. `Decisions`
7. `Current State`
8. `Blockers`
9. `Phase Summary`
10. `Phase Details`
11. `Pending Proposals`
12. `Proposal Rules`
13. `Sync Rules`
14. `Handoff Rules`
15. `Change Log`

每个 phase 必须包含 `Artifacts`：

```markdown
**Artifacts:**
- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending
```

## 状态规则

Roadmap status：

- `active`
- `blocked`
- `completed`
- `archived`

Phase status：

- `not-started`
- `needs-spec`
- `designed`
- `planned`
- `in-progress`
- `blocked`
- `completed`
- `archived`

状态推断：

- `Spec: pending` → `needs-spec`
- `Spec` 路径存在且 `Plan: pending` → `designed`
- `Spec` 路径存在且 `Plan` 路径存在且验证证据缺失 → `planned` 或 `in-progress`
- `Verification Evidence` 存在 → 可以考虑 `completed`
- 链接 artifact 路径缺失 → 不推进状态，先标记 artifact missing 或提示用户修正

不要从聊天记忆推断完成度。

## Proposal Rules

需要 `Proposal Brief` 的变更：

- 修改 `Goal`
- 修改 `Non-goals`
- 修改 `Shared Constraints`
- 修改整体 `Success Criteria`
- 新增、删除、合并、拆分、重排 phase
- 大幅修改 phase scope
- 大幅修改 phase success criteria

不需要 `Proposal Brief` 的事实更新：

- 回填 artifact 路径
- 标记 artifact missing
- 更新 `Last Sync`
- 添加 blocker
- 记录 `Verification Evidence`
- 追加 `Change Log`

默认流程：

```text
生成 Proposal Brief → 用户批准 → 更新 ROADMAP.md → 写入 Decisions / Phase Summary / Phase Details / Change Log
```

未批准但需要保留的 proposal 可以写入 `Pending Proposals`。

## Action: new-roadmap

用于创建一个大功能的路线图。

步骤：

1. 确认 title 和 slug。
2. 确认 `Goal`。
3. 确认 `Non-goals`。
4. 确认 `Shared Constraints`。
5. 起草 phases。
6. 请求用户批准 phase 拆分。
7. 创建 `docs/superpowers/roadmaps/YYYY-MM-DD-<slug>/ROADMAP.md`。

不要写 spec、plan 或实现代码。

## Action: progress

用于同步状态并显示下一步。

步骤：

1. 读取 `ROADMAP.md`。
2. 定位 `Current State` 和当前 phase。
3. 读取当前 phase 的已链接 artifacts。
4. 如果磁盘证据发生变化，保守更新状态。
5. 输出当前状态和下一条手动命令。

`progress` 合并了内部的 refresh 和 advance 概念，用户不需要理解这两个内部动作。

## Action: write-spec

用于为某个 phase 准备规格讨论。

步骤：

1. 读取 `ROADMAP.md`。
2. 定位目标 phase。
3. 提取 `Goal`、`Shared Constraints`、phase scope、out of scope 和 success criteria。
4. 生成 `Spec Discussion Brief`。
5. 建议用户手动调用 `superpowers:brainstorming`。

不要自动调用 `superpowers:brainstorming`。

## Action: write-plan

用于为已有 spec 的 phase 准备实现计划交接。

步骤：

1. 读取 `ROADMAP.md`。
2. 读取 phase 的 `Spec` 路径。
3. 提取 Roadmap 路径、Phase、`Shared Constraints`。
4. 生成 plan handoff。
5. 建议用户手动调用 `superpowers:writing-plans`。

不要直接写 plan，除非用户另行显式调用 `writing-plans`。

## Action: implement-plan

用于为已有 plan 的 phase 准备执行交接。

步骤：

1. 读取 `ROADMAP.md`。
2. 读取 phase 的 `Plan` 路径。
3. 确认 phase 是 `planned` 或 `in-progress`。
4. 生成 execution handoff。
5. 建议用户手动调用 `superpowers:subagent-driven-development` 或 `superpowers:executing-plans`。

不要直接执行 plan。

## Action: complete-phase

用于记录验证证据并完成 phase。

步骤：

1. 读取 `ROADMAP.md`。
2. 读取 phase 的 `Spec` 和 `Plan`。
3. 要求用户提供具体 `Verification Evidence`。
4. 有证据时才将 phase 标记为 `completed`。
5. 将 `Current State` 推进到下一个未完成 phase。
6. 追加 `Change Log`。

不能用 `done`、`tested`、`looks good` 这类空泛文字作为完成证据。

## Action: change-roadmap

用于调整路线图本身，而不是推进当前 phase。

步骤：

1. 读取 `ROADMAP.md`。
2. 生成 `Proposal Brief`。
3. 请求用户批准。
4. 只在批准后更新 current truth。
5. 更新 `Decisions` 和 `Change Log`。

## 手动交接规则

本技能只建议下一条手动命令，不自动调用其他技能。

可以建议：

- `/superpowers:brainstorming`
- `/superpowers:writing-plans`
- `/superpowers:subagent-driven-development`
- `/superpowers:executing-plans`

不要自动调用 `Skill` 工具，不要开始实现，不要运行执行计划。

## 红线

不要：

- 因普通长期任务措辞自然触发本技能。
- 新增 natural trigger tests。
- 自动调用其他 Superpowers 技能。
- 创建 CLI 命令。
- 创建 schema validators。
- 创建后台同步。
- 新增 worktree guidance。
- 复制 OpenSpec 的完整 `changes/` lifecycle。
- 复制 GSD 的完整 `.planning/PROJECT.md`、`STATE.md`、`CONTEXT.md` artifact set。
- 把详细 spec 内容写进 `ROADMAP.md`。
- 把详细实现步骤写进 `ROADMAP.md`。
- 从聊天记忆推断完成度。

## 常见错误

| 错误 | 正确行为 |
|---|---|
| 用户说继续 roadmap 后自动调用 writing-plans | 输出建议的手动命令 |
| 用户要求重排 phase 后立即编辑 ROADMAP.md | 先生成 `Proposal Brief` |
| 链接 spec 路径缺失但 phase 被标记为 designed | 标记 artifact missing，不推进状态 |
| ROADMAP.md 写入详细实现步骤 | 将实现细节移到 plans |
| spec brief 忽略 Shared Constraints | 在 brief 中完整带入共享约束 |
```

- [ ] **步骤 3：编写 `roadmap-format.md`**

创建 `plugins/superpowers/skills/roadmap-management/references/roadmap-format.md`，内容如下：

````markdown
# Roadmap Format Reference

本参考文件保存 `roadmap-management` 的长模板和输出示例。主技能只保留流程纪律；创建或更新实际文档时再参考这里。

## ROADMAP.md Full Template

```markdown
# <Roadmap Title>

## Metadata

- **Status:** active
- **Created:** YYYY-MM-DD
- **Last Sync:** YYYY-MM-DD
- **Current Phase:** P1
- **Next Action:** progress

## Goal

<One or two sentences describing the long-term initiative.>

## Non-goals

- <Thing this roadmap explicitly will not do>

## Shared Constraints

These constraints apply to every phase.

- <Constraint shared by all phases>

## Success Criteria

The roadmap is complete when:

- <Observable success criterion>

## Decisions

| Date | Decision | Reason |
|------|----------|--------|
| YYYY-MM-DD | Created roadmap | Initial approved roadmap |

## Current State

- **Overall Status:** active
- **Current Phase:** P1
- **Current Phase Status:** needs-spec
- **Next Manual Action:** `/superpowers:roadmap-management write-spec docs/superpowers/roadmaps/YYYY-MM-DD-slug/ROADMAP.md P1`
- **Last Sync:** YYYY-MM-DD
- **Last Sync Evidence:** Initial roadmap

## Blockers

| Blocker | Affects | Status | Resolution |
|---------|---------|--------|------------|
| None | None | clear | No active blockers |

## Phase Summary

| Phase | Status | Goal | Spec | Plan | Verification | Next |
|-------|--------|------|------|------|--------------|------|
| P1 | needs-spec | Define the first deliverable | pending | pending | pending | write-spec |

## Phase Details

### P1: First Deliverable

**Status:** needs-spec

**Goal:**  
Define and deliver the first coherent phase.

**Depends on:**  
None

**Scope:**
- Define the first deliverable.

**Out of Scope:**
- Work outside this phase.

**Artifacts:**
- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending

**Success Criteria:**
- The first phase has observable completion evidence.

**Next Manual Action:**  
`/superpowers:roadmap-management write-spec docs/superpowers/roadmaps/YYYY-MM-DD-slug/ROADMAP.md P1`

## Pending Proposals

No pending proposals.

## Proposal Rules

Use a `Proposal Brief` before changing roadmap structure or direction.

## Sync Rules

Before changing `Current State`, `Phase Summary`, or phase `Status`, read linked disk artifacts. Do not infer progress from chat memory alone.

## Handoff Rules

`roadmap-management` suggests next manual commands and does not automatically call other skills.

## Change Log

| Date | Change | Evidence |
|------|--------|----------|
| YYYY-MM-DD | Created roadmap | Initial roadmap |
```

## Phase Detail Template

```markdown
### Pn: <Phase Name>

**Status:** needs-spec

**Goal:**  
<What this phase accomplishes.>

**Depends on:**  
<Previous phase or None>

**Scope:**
- <In-scope item>

**Out of Scope:**
- <Out-of-scope item>

**Artifacts:**
- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending

**Success Criteria:**
- <Observable completion criterion>

**Next Manual Action:**  
`/superpowers:roadmap-management write-spec <ROADMAP.md> Pn`
```

## Proposal Brief Template

```markdown
# Roadmap Change Proposal

**Type:** phase-reorder
**Roadmap:** `<ROADMAP.md>`
**Affects:** P2, P3
**Requires Approval:** yes

## Current State

- P2: Current phase description
- P3: Current phase description

## Proposed Change

Describe the proposed roadmap change.

## Why

Explain why the roadmap should change.

## Impact

- Describe affected phases.
- Describe affected artifacts.
- Describe whether `Shared Constraints` change.

## Approval Question

Apply this proposal to `ROADMAP.md`?
```

## Spec Discussion Brief Template

```markdown
# Spec Discussion Brief

**Roadmap:** `<ROADMAP.md>`
**Phase:** Pn: <Phase Name>
**Spec Target:** `docs/superpowers/specs/YYYY-MM-DD-<phase>-design.md`

## Roadmap Goal

Copy the roadmap goal here.

## Phase Goal

Copy the phase goal here.

## Shared Constraints

- Copy every relevant shared constraint here.

## Phase Scope

- Copy in-scope phase items here.

## Out of Scope

- Copy out-of-scope phase items here.

## Success Criteria

- Copy phase success criteria here.

## Suggested Manual Next Step

`/superpowers:brainstorming <this brief>`
```

## Plan Handoff Template

```markdown
# Plan Handoff

**Roadmap:** `<ROADMAP.md>`
**Phase:** Pn
**Spec:** `docs/superpowers/specs/YYYY-MM-DD-<phase>-design.md`

## Shared Constraints

- Copy every relevant shared constraint here.

## Suggested Manual Next Step

`/superpowers:writing-plans @docs/superpowers/specs/YYYY-MM-DD-<phase>-design.md`

Include this roadmap context:
- Roadmap: `<ROADMAP.md>`
- Phase: Pn
```

## Execution Handoff Template

```markdown
# Execution Handoff

**Roadmap:** `<ROADMAP.md>`
**Phase:** Pn
**Plan:** `docs/superpowers/plans/YYYY-MM-DD-<phase>.md`

## Suggested Manual Next Step

Recommended:
`/superpowers:subagent-driven-development @docs/superpowers/plans/YYYY-MM-DD-<phase>.md`

Alternative:
`/superpowers:executing-plans @docs/superpowers/plans/YYYY-MM-DD-<phase>.md`
```

## Completion Evidence Examples

Strong evidence:

```text
bash plugins/superpowers/tests/claude-code/run-skill-tests.sh --test test-roadmap-management.sh passed
bash plugins/superpowers/tests/explicit-skill-requests/run-test.sh roadmap-management plugins/superpowers/tests/explicit-skill-requests/prompts/use-roadmap-management.txt passed
commit 1234567 adds roadmap-management skill and tests
```

Weak evidence that is not enough by itself:

```text
done
tested
looks good
```
````

- [ ] **步骤 4：运行静态测试验证通过**

运行：

```bash
bash plugins/superpowers/tests/claude-code/test-roadmap-management.sh
```

预期：PASS，输出包含：

```text
=== roadmap-management skill tests passed ===
```

- [ ] **步骤 5：Commit**

```bash
git add plugins/superpowers/skills/roadmap-management/SKILL.md plugins/superpowers/skills/roadmap-management/references/roadmap-format.md
git commit -m "feat: add manual roadmap management skill"
```

## 任务 3：添加显式触发测试并注册到 explicit request suite

**文件：**
- 创建：`plugins/superpowers/tests/explicit-skill-requests/prompts/use-roadmap-management.txt`
- 修改：`plugins/superpowers/tests/explicit-skill-requests/run-all.sh`
- 测试：`plugins/superpowers/tests/explicit-skill-requests/run-test.sh`

- [ ] **步骤 1：创建显式触发 prompt**

创建 `plugins/superpowers/tests/explicit-skill-requests/prompts/use-roadmap-management.txt`，内容如下：

```text
please use roadmap-management to help me manage a long-running Superpowers initiative
```

- [ ] **步骤 2：运行 targeted explicit request 测试**

运行：

```bash
bash plugins/superpowers/tests/explicit-skill-requests/run-test.sh roadmap-management plugins/superpowers/tests/explicit-skill-requests/prompts/use-roadmap-management.txt
```

预期：PASS，输出包含：

```text
PASS: Skill 'roadmap-management' was triggered
```

- [ ] **步骤 3：把测试加入 `run-all.sh`**

在 `plugins/superpowers/tests/explicit-skill-requests/run-all.sh` 的第 60 行摘要前插入：

```bash
# Test: use roadmap-management
 echo ">>> Test 5: use-roadmap-management"
if "$SCRIPT_DIR/run-test.sh" "roadmap-management" "$PROMPTS_DIR/use-roadmap-management.txt"; then
    PASSED=$((PASSED + 1))
    RESULTS="$RESULTS\nPASS: use-roadmap-management"
else
    FAILED=$((FAILED + 1))
    RESULTS="$RESULTS\nFAIL: use-roadmap-management"
fi
echo ""
```

插入后，相关区域应为：

```bash
# Test: mid-conversation execute plan
echo ">>> Test 4: mid-conversation-execute-plan"
if "$SCRIPT_DIR/run-test.sh" "subagent-driven-development" "$PROMPTS_DIR/mid-conversation-execute-plan.txt"; then
    PASSED=$((PASSED + 1))
    RESULTS="$RESULTS\nPASS: mid-conversation-execute-plan"
else
    FAILED=$((FAILED + 1))
    RESULTS="$RESULTS\nFAIL: mid-conversation-execute-plan"
fi
echo ""

# Test: use roadmap-management
echo ">>> Test 5: use-roadmap-management"
if "$SCRIPT_DIR/run-test.sh" "roadmap-management" "$PROMPTS_DIR/use-roadmap-management.txt"; then
    PASSED=$((PASSED + 1))
    RESULTS="$RESULTS\nPASS: use-roadmap-management"
else
    FAILED=$((FAILED + 1))
    RESULTS="$RESULTS\nFAIL: use-roadmap-management"
fi
echo ""

echo "=== Summary ==="
```

- [ ] **步骤 4：检查 shell 语法**

运行：

```bash
bash -n plugins/superpowers/tests/explicit-skill-requests/run-all.sh
```

预期：命令成功，无输出。

- [ ] **步骤 5：Commit**

```bash
git add plugins/superpowers/tests/explicit-skill-requests/prompts/use-roadmap-management.txt plugins/superpowers/tests/explicit-skill-requests/run-all.sh
git commit -m "test: add explicit roadmap management trigger"
```

## 任务 4：注册 roadmap-management 静态测试到 Claude Code skill test runner

**文件：**
- 修改：`plugins/superpowers/tests/claude-code/run-skill-tests.sh`
- 测试：`plugins/superpowers/tests/claude-code/run-skill-tests.sh`

- [ ] **步骤 1：把测试加入 fast test list**

将 `plugins/superpowers/tests/claude-code/run-skill-tests.sh` 第 74-78 行：

```bash
# List of skill tests to run (fast unit tests)
tests=(
    "test-subagent-driven-development.sh"
)
```

替换为：

```bash
# List of skill tests to run (fast unit tests)
tests=(
    "test-subagent-driven-development.sh"
    "test-roadmap-management.sh"
)
```

- [ ] **步骤 2：检查 shell 语法**

运行：

```bash
bash -n plugins/superpowers/tests/claude-code/run-skill-tests.sh
```

预期：命令成功，无输出。

- [ ] **步骤 3：运行 targeted static test through runner**

运行：

```bash
bash plugins/superpowers/tests/claude-code/run-skill-tests.sh --test test-roadmap-management.sh
```

预期：PASS，输出包含：

```text
STATUS: PASSED
```

- [ ] **步骤 4：Commit**

```bash
git add plugins/superpowers/tests/claude-code/run-skill-tests.sh
git commit -m "test: run roadmap management skill checks"
```

## 任务 5：为 writing-plans 增加显式 Roadmap/Phase 上下文支持

**文件：**
- 修改：`plugins/superpowers/skills/writing-plans/SKILL.md`
- 测试：`plugins/superpowers/tests/claude-code/test-roadmap-management.sh`

- [ ] **步骤 1：先扩展静态测试，要求 writing-plans 支持显式 roadmap context**

在 `plugins/superpowers/tests/claude-code/test-roadmap-management.sh` 的变量区：

```bash
SKILL="$PLUGIN_ROOT/skills/roadmap-management/SKILL.md"
REFERENCE="$PLUGIN_ROOT/skills/roadmap-management/references/roadmap-format.md"
NATURAL_TRIGGER_PROMPT="$PLUGIN_ROOT/tests/skill-triggering/prompts/roadmap-management.txt"
```

替换为：

```bash
SKILL="$PLUGIN_ROOT/skills/roadmap-management/SKILL.md"
REFERENCE="$PLUGIN_ROOT/skills/roadmap-management/references/roadmap-format.md"
WRITING_PLANS="$PLUGIN_ROOT/skills/writing-plans/SKILL.md"
NATURAL_TRIGGER_PROMPT="$PLUGIN_ROOT/tests/skill-triggering/prompts/roadmap-management.txt"
```

在 reference file exists 检查后添加：

```bash
assert_file_exists "$WRITING_PLANS" "writing-plans skill exists"
```

在 `Test 3: Handoff skills...` 之后添加：

```bash
echo ""
echo "Test 3b: writing-plans roadmap context..."
assert_file_contains "$WRITING_PLANS" "Roadmap Context" "writing-plans has roadmap context section"
assert_file_contains "$WRITING_PLANS" "Shared Constraints" "writing-plans reads shared constraints"
assert_file_contains "$WRITING_PLANS" "Phase:" "writing-plans records phase"
```

- [ ] **步骤 2：运行静态测试验证失败**

运行：

```bash
bash plugins/superpowers/tests/claude-code/test-roadmap-management.sh
```

预期：FAIL，输出包含：

```text
Expected pattern: Roadmap Context
```

- [ ] **步骤 3：修改 `writing-plans/SKILL.md`**

在 `plugins/superpowers/skills/writing-plans/SKILL.md` 第 59 行的计划文档头部代码块后、`## 任务结构` 前插入：

```markdown
## Roadmap Context

如果用户显式提供 Roadmap 和 Phase，在计划头部记录：

```markdown
**Roadmap:** `docs/superpowers/roadmaps/<slug>/ROADMAP.md`
**Phase:** P1 / P2 / N/A
```

在编写计划前读取该 roadmap，并遵守它的 `Shared Constraints`。不要主动寻找 roadmap；只有用户显式提供 Roadmap 或 Phase 时才使用这段上下文。
```

- [ ] **步骤 4：运行静态测试验证通过**

运行：

```bash
bash plugins/superpowers/tests/claude-code/test-roadmap-management.sh
```

预期：PASS，输出包含：

```text
=== roadmap-management skill tests passed ===
```

- [ ] **步骤 5：Commit**

```bash
git add plugins/superpowers/tests/claude-code/test-roadmap-management.sh plugins/superpowers/skills/writing-plans/SKILL.md
git commit -m "feat: support roadmap context in writing plans"
```

## 任务 6：最终验证

**文件：**
- 验证：`plugins/superpowers/tests/explicit-skill-requests/run-all.sh`
- 验证：`plugins/superpowers/tests/claude-code/run-skill-tests.sh`
- 验证：`plugins/superpowers/tests/claude-code/test-roadmap-management.sh`
- 验证：`plugins/superpowers/tests/explicit-skill-requests/run-test.sh`

- [ ] **步骤 1：运行 shell 语法检查**

运行：

```bash
bash -n plugins/superpowers/tests/explicit-skill-requests/run-all.sh
bash -n plugins/superpowers/tests/claude-code/run-skill-tests.sh
bash -n plugins/superpowers/tests/claude-code/test-roadmap-management.sh
```

预期：三个命令都成功，无输出。

- [ ] **步骤 2：运行 targeted roadmap-management 静态测试**

运行：

```bash
bash plugins/superpowers/tests/claude-code/run-skill-tests.sh --test test-roadmap-management.sh
```

预期：PASS，输出包含：

```text
STATUS: PASSED
```

- [ ] **步骤 3：运行 targeted explicit request 测试**

运行：

```bash
bash plugins/superpowers/tests/explicit-skill-requests/run-test.sh roadmap-management plugins/superpowers/tests/explicit-skill-requests/prompts/use-roadmap-management.txt
```

预期：PASS，输出包含：

```text
PASS: Skill 'roadmap-management' was triggered
```

- [ ] **步骤 4：确认没有新增 natural trigger prompt**

运行：

```bash
test ! -f plugins/superpowers/tests/skill-triggering/prompts/roadmap-management.txt
```

预期：命令成功，无输出。

- [ ] **步骤 5：检查 diff 格式**

运行：

```bash
git diff --check -- plugins/superpowers docs/superpowers
```

预期：命令成功，无输出。

- [ ] **步骤 6：最终 Commit**

如果前面任务已经逐任务提交，本步骤不需要创建额外 commit。若执行时选择批量提交，使用：

```bash
git add plugins/superpowers/skills/roadmap-management/SKILL.md plugins/superpowers/skills/roadmap-management/references/roadmap-format.md plugins/superpowers/tests/claude-code/test-roadmap-management.sh plugins/superpowers/tests/claude-code/run-skill-tests.sh plugins/superpowers/tests/explicit-skill-requests/prompts/use-roadmap-management.txt plugins/superpowers/tests/explicit-skill-requests/run-all.sh plugins/superpowers/skills/writing-plans/SKILL.md docs/superpowers/specs/2026-05-15-roadmap-management-design.md docs/superpowers/plans/2026-05-15-roadmap-management.md
git commit -m "feat: add manual roadmap management workflow"
```
