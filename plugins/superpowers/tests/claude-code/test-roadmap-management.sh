#!/usr/bin/env bash
# Test: roadmap-management skill
# Verifies manual-only roadmap workflow rules and reference templates.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

SKILL="$PLUGIN_ROOT/skills/roadmap-management/SKILL.md"
REFERENCE="$PLUGIN_ROOT/skills/roadmap-management/references/roadmap-format.md"
DISCOVERY_REFERENCE="$PLUGIN_ROOT/skills/roadmap-management/references/roadmap-discovery.md"
WRITING_PLANS="$PLUGIN_ROOT/skills/writing-plans/SKILL.md"
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

assert_section_contains() {
    local file="$1"
    local section="$2"
    local pattern="$3"
    local test_name="$4"
    local content

    content=$(awk -v section="$section" '
        $0 == section { in_section=1; next }
        in_section && /^## / { exit }
        in_section { print }
    ' "$file")

    if echo "$content" | grep -Fq -- "$pattern"; then
        echo "  [PASS] $test_name"
    else
        echo "  [FAIL] $test_name"
        echo "  Expected pattern: $pattern"
        echo "  In section: $section"
        echo "  In file: $file"
        exit 1
    fi
}

assert_file_exists "$SKILL" "Skill file exists"
assert_file_exists "$REFERENCE" "Reference file exists"
assert_file_exists "$DISCOVERY_REFERENCE" "Roadmap discovery reference exists"
assert_file_exists "$WRITING_PLANS" "writing-plans skill exists"
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
assert_file_contains "$SKILL" "phase success criteria 已满足" "Completion requires phase success criteria"
assert_file_contains "$SKILL" "Implementation Summary 是简短文本" "Implementation Summary semantics documented"
assert_file_contains "$REFERENCE" "short summary or commit/PR reference" "Implementation summary template defines format"
assert_file_contains "$SKILL" "new-roadmap" "new-roadmap action documented"
assert_file_contains "$SKILL" "progress" "progress action documented"
assert_file_contains "$SKILL" "write-spec" "write-spec action documented"
assert_file_contains "$SKILL" "write-plan" "write-plan action documented"
assert_file_contains "$SKILL" "implement-plan" "implement-plan action documented"
assert_file_contains "$SKILL" "complete-phase" "complete-phase action documented"
assert_file_contains "$SKILL" "change-roadmap" "change-roadmap action documented"

echo ""
echo "Test 2c: Acceptance-driven roadmap sync..."
assert_file_contains "$SKILL" "## 验收同步规则" "Acceptance sync section exists"
assert_section_contains "$SKILL" "## 验收同步规则" "最终验收通过后的事实性 roadmap 同步" "Final acceptance roadmap sync is documented"
assert_section_contains "$SKILL" "## 验收同步规则" "验收同步允许更新的字段" "Allowed sync fields section exists"
assert_section_contains "$SKILL" "## 验收同步规则" '- Phase Details 中对应 phase 的 `Implementation Summary`' "Implementation Summary can be synchronized"
assert_section_contains "$SKILL" "## 验收同步规则" '- Phase Details 中对应 phase 的 `Verification Evidence`' "Verification Evidence can be synchronized"
assert_section_contains "$SKILL" "## 验收同步规则" '- `Current State`' "Current State can be synchronized"
assert_section_contains "$SKILL" "## 验收同步规则" '- `Next Manual Action`' "Next Manual Action can be synchronized"
assert_section_contains "$SKILL" "## 验收同步规则" '- `Change Log`' "Change Log can be synchronized"
assert_section_contains "$SKILL" "## 验收同步规则" '不得修改 `Goal`' "Goal cannot be changed by sync"
assert_section_contains "$SKILL" "## 验收同步规则" '不得修改 `Shared Constraints`' "Shared Constraints cannot be changed by sync"
assert_section_contains "$SKILL" "## 验收同步规则" "不得修改 phase success criteria" "Phase success criteria cannot be changed by sync"
assert_section_contains "$SKILL" "## 验收同步规则" "证据不足以覆盖 phase success criteria" "Insufficient evidence blocks completion"
assert_section_contains "$SKILL" "## 验收同步规则" "不新增后台同步机制" "Background sync remains forbidden"
assert_section_contains "$SKILL" "## 验收同步规则" "只报告问题并停止" "Structural changes stop sync"

echo ""
echo "Test 2d: Active clarification discipline..."
assert_file_contains "$SKILL" "问题是什么" "Roadmap discussion must explain the problem before asking for confirmation"
assert_file_contains "$SKILL" "用户容易理解" "Roadmap discussion must explain the problem in user-friendly language"
assert_file_contains "$SKILL" "需要用户确认什么" "Roadmap discussion must state what the user needs to confirm"
assert_file_contains "$SKILL" "具体选项" "Roadmap discussion must offer concrete options"
assert_file_contains "$SKILL" "推荐选项" "Roadmap discussion must mark the recommended option"
assert_file_contains "$SKILL" "不要只问是否确认" "Roadmap discussion must avoid bare yes/no confirmation"
assert_file_contains "$SKILL" "逐条确认" "Roadmap discussion must confirm decisions one at a time"
assert_file_contains "$SKILL" "不要只顺着用户已提出的问题推进" "Roadmap discussion must proactively surface hidden issues"


echo ""
echo "Test 2b: Roadmap discovery before drafting..."
assert_file_contains "$SKILL" "Roadmap Discovery Brief" "new-roadmap requires a discovery brief"
assert_file_contains "$SKILL" "phase strategy" "new-roadmap requires phase strategy confirmation"
assert_file_contains "$SKILL" "参考输入映射" "Reference input mapping is required"
assert_file_contains "$SKILL" "结构性" "Structural change-roadmap discovery is documented"
assert_file_contains "$SKILL" "Roadmap Change Discovery Brief" "change-roadmap discovery brief is documented"
assert_file_contains "$SKILL" "不要把完整草案塞进选择题 preview" "Long draft preview anti-pattern is forbidden"
assert_file_contains "$SKILL" "正文统一中文" "Chinese document language consistency is documented"
assert_file_contains "$DISCOVERY_REFERENCE" "Roadmap Discovery Brief Template" "Roadmap discovery template exists"
assert_file_contains "$DISCOVERY_REFERENCE" "Roadmap Change Discovery Brief Template" "Roadmap change discovery template exists"
assert_file_contains "$DISCOVERY_REFERENCE" "Phase Strategy Options Template" "Phase strategy options template exists"
assert_file_contains "$DISCOVERY_REFERENCE" "Reference Input Mapping Template" "Reference input mapping template exists"


echo ""
echo "Test 3: Handoff skills..."
assert_file_contains "$SKILL" "superpowers:brainstorming" "Brainstorming handoff documented"
assert_file_contains "$SKILL" "superpowers:writing-plans" "Writing-plans handoff documented"
assert_file_contains "$SKILL" "superpowers:subagent-driven-development" "Subagent-driven handoff documented"
assert_file_contains "$SKILL" "superpowers:executing-plans" "Executing-plans handoff documented"
assert_file_contains "$SKILL" "不要自动调用" "Automatic skill invocation is forbidden"

echo ""
echo "Test 3b: writing-plans roadmap context..."
assert_file_contains "$WRITING_PLANS" "Roadmap 上下文" "writing-plans has roadmap context section"
assert_file_contains "$WRITING_PLANS" "显式提供 Roadmap 路径" "writing-plans requires explicit roadmap path"
assert_file_contains "$WRITING_PLANS" "不要主动寻找 roadmap" "writing-plans does not search for roadmap proactively"
assert_file_contains "$WRITING_PLANS" "Shared Constraints" "writing-plans reads shared constraints"
assert_file_contains "$WRITING_PLANS" "Phase:" "writing-plans records phase"

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
