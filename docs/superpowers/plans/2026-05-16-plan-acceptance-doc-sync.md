# Plan 验收文档同步实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 让 Superpowers 在 plan 任务和整体验收通过后，由子代理同步 plan checkbox 和 roadmap 事实性进度，主会话只做轻量 diff 核对。

**架构：** 使用文档规则层面的最小改动：`subagent-driven-development` 定义同步时机和子代理职责，`roadmap-management` 定义 roadmap 可同步字段和禁止边界。静态测试先写失败断言，再补 skill 文档规则并运行对应测试验证。

**技术栈：** Markdown skill 文档、Bash 静态测试、Claude Code skill 测试脚本。

**Spec:** `docs/superpowers/specs/2026-05-16-plan-acceptance-doc-sync-design.md`

---

## 提交策略

本计划包含“提交检查点”步骤，但执行者只有在用户于执行阶段明确授权创建 commit 时才运行这些步骤。若没有授权，跳过所有 `git commit` 命令，并在最终汇报中说明“未提交”。

## 文件结构

### 修改

- `plugins/superpowers/tests/claude-code/test-roadmap-management.sh` — 增加 roadmap 验收同步规则的静态断言。
- `plugins/superpowers/skills/roadmap-management/SKILL.md` — 增加最终验收后的事实性 roadmap 同步边界。
- `plugins/superpowers/tests/claude-code/test-subagent-driven-development.sh` — 增加子代理文档同步流程的静态断言。
- `plugins/superpowers/skills/subagent-driven-development/SKILL.md` — 增加任务级 plan checkbox 同步和最终 roadmap 同步流程。

### 不修改

- 不修改 `plugins/superpowers/skills/writing-plans/SKILL.md`。
- 不修改 roadmap reference 模板。
- 不新增 CLI 命令、schema validator、后台同步机制或自然触发测试。

---

## 任务 1：为 roadmap-management 增加失败的验收同步静态测试

**文件：**
- 修改：`plugins/superpowers/tests/claude-code/test-roadmap-management.sh`

- [ ] **步骤 1：在 roadmap 测试中加入验收同步断言**

在 `plugins/superpowers/tests/claude-code/test-roadmap-management.sh` 的 Test 2 结束后、`Test 2b: Roadmap discovery before drafting...` 之前插入：

```bash
echo ""
echo "Test 2c: Acceptance-driven roadmap sync..."
assert_file_contains "$SKILL" "最终验收通过后的事实性 roadmap 同步" "Final acceptance roadmap sync is documented"
assert_file_contains "$SKILL" "验收同步允许更新的字段" "Allowed sync fields section exists"
assert_file_contains "$SKILL" "Implementation Summary" "Implementation Summary can be synchronized"
assert_file_contains "$SKILL" "Verification Evidence" "Verification Evidence can be synchronized"
assert_file_contains "$SKILL" "Current State" "Current State can be synchronized"
assert_file_contains "$SKILL" "Next Manual Action" "Next Manual Action can be synchronized"
assert_file_contains "$SKILL" "Change Log" "Change Log can be synchronized"
assert_file_contains "$SKILL" '不得修改 `Goal`' "Goal cannot be changed by sync"
assert_file_contains "$SKILL" '不得修改 `Shared Constraints`' "Shared Constraints cannot be changed by sync"
assert_file_contains "$SKILL" "不得修改 phase success criteria" "Phase success criteria cannot be changed by sync"
assert_file_contains "$SKILL" "证据不足以覆盖 phase success criteria" "Insufficient evidence blocks completion"
assert_file_contains "$SKILL" "不新增后台同步机制" "Background sync remains forbidden"
assert_file_contains "$SKILL" "只报告问题并停止" "Structural changes stop sync"
```

- [ ] **步骤 2：运行 roadmap 测试验证失败**

运行：

```bash
bash plugins/superpowers/tests/claude-code/test-roadmap-management.sh
```

预期：FAIL，输出包含：

```text
Expected pattern: 最终验收通过后的事实性 roadmap 同步
```

- [ ] **步骤 3：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add plugins/superpowers/tests/claude-code/test-roadmap-management.sh
git commit -m "test: add roadmap acceptance sync checks"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 2：实现 roadmap-management 的验收同步规则

**文件：**
- 修改：`plugins/superpowers/skills/roadmap-management/SKILL.md`
- 测试：`plugins/superpowers/tests/claude-code/test-roadmap-management.sh`

- [ ] **步骤 1：在状态规则后新增验收同步章节**

在 `plugins/superpowers/skills/roadmap-management/SKILL.md` 的“状态规则”章节之后、`## Proposal Rules` 之前插入：

```markdown
## 验收同步规则

最终验收通过后的事实性 roadmap 同步可以由 `subagent-driven-development` 的 roadmap 同步子代理执行。同步是执行验收的一部分，不是独立 action，不新增后台同步机制。

验收同步允许更新的字段：

- 当前 phase 的 `Status`
- Phase Summary 中对应 phase 的 status 和 artifact 摘要
- Phase Details 中对应 phase 的 `Implementation Summary`
- Phase Details 中对应 phase 的 `Verification Evidence`
- `Current State`
- `Last Sync`
- `Next Manual Action`
- `Change Log`

这些更新属于事实更新，不需要 `Proposal Brief`。

验收同步不得修改 `Goal`、`Non-goals`、`Shared Constraints`、整体 `Success Criteria`、phase scope、phase out-of-scope、phase success criteria、phase 顺序、phase 新增/删除/合并/拆分、`Proposal Rules`、`Sync Rules` 或 `Handoff Rules`。

同步前必须有具体 `Verification Evidence`，并确认 phase success criteria 已被证据覆盖。证据不足以覆盖 phase success criteria 时，不得将 phase 标记为 `completed`。

如果验收结果显示需要结构性 roadmap 变更，同步子代理只报告问题并停止；后续必须通过 `change-roadmap` 流程处理。
```

- [ ] **步骤 2：把验收同步加入事实更新列表**

在同一文件 `不需要 Proposal Brief 的事实更新：` 列表中追加：

```markdown
- 最终验收通过后的事实性 roadmap 同步，仅限“验收同步规则”允许的字段
```

- [ ] **步骤 3：保持红线中的后台同步禁令**

确认 `## 红线` 章节仍包含禁止后台同步的规则。如果当前只写了“不要创建后台同步”，将该条扩展为：

```markdown
- 不要创建后台同步；验收同步只能由执行验收流程中的子代理显式完成，不新增后台同步机制。
```

- [ ] **步骤 4：运行 roadmap 测试验证通过**

运行：

```bash
bash plugins/superpowers/tests/claude-code/test-roadmap-management.sh
```

预期：PASS，输出包含：

```text
=== roadmap-management skill tests passed ===
```

- [ ] **步骤 5：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add plugins/superpowers/skills/roadmap-management/SKILL.md
git commit -m "docs: define roadmap acceptance sync rules"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 3：为 subagent-driven-development 增加失败的文档同步静态测试

**文件：**
- 修改：`plugins/superpowers/tests/claude-code/test-subagent-driven-development.sh`

- [ ] **步骤 1：加入 skill 文件路径和静态断言函数**

在 `source "$SCRIPT_DIR/test-helpers.sh"` 后插入：

```bash
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILL="$PLUGIN_ROOT/skills/subagent-driven-development/SKILL.md"

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
```

- [ ] **步骤 2：在动态 Claude 测试前加入静态同步规则测试**

在文件头部 `echo ""` 之后、`# Test 1: Verify skill can be loaded` 之前插入：

```bash
# Test 0: Verify acceptance document sync rules are documented
echo "Test 0: Acceptance document sync rules..."

assert_file_contains "$SKILL" "文档同步子代理" "Document sync subagent is documented"
assert_file_contains "$SKILL" "只勾选已经通过两阶段审查的当前任务" "Only reviewed task checkbox is checked"
assert_file_contains "$SKILL" "不提前勾选后续任务" "Future tasks are not checked early"
assert_file_contains "$SKILL" "主会话只检查 VCS diff" "Controller only verifies diff"
assert_file_contains "$SKILL" "roadmap 同步子代理" "Roadmap sync subagent is documented"
assert_file_contains "$SKILL" '读取 plan 头部的 `Roadmap` 和 `Phase` 字段' "Roadmap and Phase are read from plan header"
assert_file_contains "$SKILL" "不主动查找 roadmap" "No proactive roadmap search"
assert_file_contains "$SKILL" "证据不足时不得标记 completed" "Insufficient evidence blocks completed status"

echo ""
```

- [ ] **步骤 3：运行 subagent 测试验证失败**

运行：

```bash
bash plugins/superpowers/tests/claude-code/test-subagent-driven-development.sh
```

预期：FAIL，输出包含：

```text
Expected pattern: 文档同步子代理
```

- [ ] **步骤 4：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add plugins/superpowers/tests/claude-code/test-subagent-driven-development.sh
git commit -m "test: add subagent document sync checks"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 4：实现 subagent-driven-development 的文档同步流程

**文件：**
- 修改：`plugins/superpowers/skills/subagent-driven-development/SKILL.md`
- 测试：`plugins/superpowers/tests/claude-code/test-subagent-driven-development.sh`

- [ ] **步骤 1：在流程图中加入任务级文档同步节点**

在 `digraph process` 的 `cluster_per_task` 节点列表中，紧跟 `"代码质量审查子智能体通过?" [shape=diamond];` 后加入：

```dot
        "分派文档同步子智能体更新 plan checkbox" [shape=box];
        "主会话检查 VCS diff" [shape=box];
```

将现有边：

```dot
    "代码质量审查子智能体通过?" -> "在 TodoWrite 中标记任务完成" [label="是"];
```

替换为：

```dot
    "代码质量审查子智能体通过?" -> "分派文档同步子智能体更新 plan checkbox" [label="是"];
    "分派文档同步子智能体更新 plan checkbox" -> "主会话检查 VCS diff";
    "主会话检查 VCS diff" -> "在 TodoWrite 中标记任务完成";
```

- [ ] **步骤 2：在流程图中加入最终 roadmap 同步节点**

在 `digraph process` 的全局节点列表中，紧跟 `"分派最终代码审查子智能体审查整体实现" [shape=box];` 后加入：

```dot
    "分派 roadmap 同步子智能体更新 ROADMAP.md" [shape=box];
    "主会话检查 roadmap VCS diff" [shape=box];
```

将现有边：

```dot
    "分派最终代码审查子智能体审查整体实现" -> "使用 superpowers:finishing-a-development-branch";
```

替换为：

```dot
    "分派最终代码审查子智能体审查整体实现" -> "分派 roadmap 同步子智能体更新 ROADMAP.md";
    "分派 roadmap 同步子智能体更新 ROADMAP.md" -> "主会话检查 roadmap VCS diff";
    "主会话检查 roadmap VCS diff" -> "使用 superpowers:finishing-a-development-branch";
```

- [ ] **步骤 3：在流程图后新增文档同步关卡章节**

在流程图代码块结束后、`## 模型选择` 之前插入：

```markdown
## 文档同步关卡

文档同步是验收流程的一部分，由子智能体执行，主会话只检查 VCS diff 并协调下一步。主会话不把整份 plan 或 roadmap 复制进上下文手动整理。

### 任务级 plan checkbox 同步

每个任务只有在规格合规审查和代码质量审查都通过后，才分派文档同步子代理更新 plan checkbox。

文档同步子代理必须遵守：

- 只勾选已经通过两阶段审查的当前任务。
- 不提前勾选后续任务。
- 不改写任务正文、代码块、命令、预期输出或验收标准。
- 如果任务标题、编号或步骤无法唯一匹配，停止并报告，不猜测。

主会话只检查 VCS diff，确认只勾选了正确任务，然后再在 TodoWrite 中标记任务完成。

### 最终 roadmap 同步

所有任务完成并通过最终代码审查后，分派 roadmap 同步子代理更新 `ROADMAP.md`。

roadmap 同步子代理必须遵守：

- 读取 plan 头部的 `Roadmap` 和 `Phase` 字段。
- 只在 plan 明确包含 `Roadmap` 和 `Phase` 时同步 roadmap。
- 没有 roadmap 上下文时，不主动查找 roadmap，不猜测所属 phase。
- 基于最终审查结果、验证命令输出、提交引用或 diff 摘要提炼 `Implementation Summary` 和 `Verification Evidence`。
- 只更新 `roadmap-management` 允许的事实性进度字段。
- 证据不足时不得标记 completed。
- 如果需要结构性 roadmap 变更，停止并报告。

主会话只检查 VCS diff 是否符合允许字段，不承担 roadmap 内容整理。
```

- [ ] **步骤 4：更新红线，防止主会话绕过同步子代理**

在 `## 红线` 的“绝不”列表中加入：

```markdown
- 在审查通过前勾选 plan checkbox
- 由主会话手动整理大段 plan 或 roadmap 同步内容
- 没有 `Roadmap` 和 `Phase` 上下文时主动查找 roadmap
- 在 roadmap 证据不足时标记 phase completed
```

- [ ] **步骤 5：运行 subagent 测试验证通过**

运行：

```bash
bash plugins/superpowers/tests/claude-code/test-subagent-driven-development.sh
```

预期：PASS，输出包含：

```text
=== All subagent-driven-development skill tests passed ===
```

- [ ] **步骤 6：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add plugins/superpowers/skills/subagent-driven-development/SKILL.md
git commit -m "docs: add subagent document sync workflow"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 5：运行相关测试并核对最终 diff

**文件：**
- 验证：`plugins/superpowers/tests/claude-code/test-roadmap-management.sh`
- 验证：`plugins/superpowers/tests/claude-code/test-subagent-driven-development.sh`
- 验证：`plugins/superpowers/skills/roadmap-management/SKILL.md`
- 验证：`plugins/superpowers/skills/subagent-driven-development/SKILL.md`

- [ ] **步骤 1：运行 roadmap 单测**

运行：

```bash
bash plugins/superpowers/tests/claude-code/test-roadmap-management.sh
```

预期：PASS，输出包含：

```text
=== roadmap-management skill tests passed ===
```

- [ ] **步骤 2：运行 subagent 单测**

运行：

```bash
bash plugins/superpowers/tests/claude-code/test-subagent-driven-development.sh
```

预期：PASS，输出包含：

```text
=== All subagent-driven-development skill tests passed ===
```

- [ ] **步骤 3：通过测试入口运行两个相关测试**

运行：

```bash
bash plugins/superpowers/tests/claude-code/run-skill-tests.sh --test test-roadmap-management.sh
bash plugins/superpowers/tests/claude-code/run-skill-tests.sh --test test-subagent-driven-development.sh
```

预期：两个命令都输出：

```text
STATUS: PASSED
```

- [ ] **步骤 4：检查 diff 范围**

运行：

```bash
git diff -- plugins/superpowers/skills/roadmap-management/SKILL.md plugins/superpowers/skills/subagent-driven-development/SKILL.md plugins/superpowers/tests/claude-code/test-roadmap-management.sh plugins/superpowers/tests/claude-code/test-subagent-driven-development.sh
```

预期：diff 只包含：

```text
- roadmap-management 的验收同步规则
- subagent-driven-development 的文档同步流程
- 两个测试文件的新增静态断言
```

- [ ] **步骤 5：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add plugins/superpowers/skills/roadmap-management/SKILL.md plugins/superpowers/skills/subagent-driven-development/SKILL.md plugins/superpowers/tests/claude-code/test-roadmap-management.sh plugins/superpowers/tests/claude-code/test-subagent-driven-development.sh
git commit -m "docs: sync accepted plan progress from subagents"
```

预期：只有用户明确授权提交时才执行；否则跳过。
