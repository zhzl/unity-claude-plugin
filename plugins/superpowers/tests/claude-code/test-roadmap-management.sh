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
