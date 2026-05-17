#!/usr/bin/env bash
# Test: brainstorming skill
# Verifies active clarification discipline for design brainstorming.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

SKILL="$PLUGIN_ROOT/skills/brainstorming/SKILL.md"

echo "=== Test: brainstorming skill ==="
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

echo ""
echo "Test 1: Active clarification discipline..."
assert_file_contains "$SKILL" "主动澄清纪律" "Active clarification discipline section exists"
assert_file_contains "$SKILL" "问题是什么" "Clarification must state what the problem is"
assert_file_contains "$SKILL" "问题类型" "Clarification must display the problem type"
assert_file_contains "$SKILL" "歧义" "Clarification type includes ambiguity"
assert_file_contains "$SKILL" "隐藏假设" "Clarification type includes hidden assumptions"
assert_file_contains "$SKILL" "风险" "Clarification type includes risks"
assert_file_contains "$SKILL" "范围边界" "Clarification type includes scope boundary"
assert_file_contains "$SKILL" "用户容易理解" "Clarification must explain the problem in user-friendly language"
assert_file_contains "$SKILL" "需要用户确认什么" "Clarification must state what the user needs to confirm"
assert_file_contains "$SKILL" "具体选项" "Clarification must offer concrete options"
assert_file_contains "$SKILL" "推荐选项" "Clarification must mark the recommended option"
assert_file_contains "$SKILL" "不要只问是否确认" "Clarification must avoid bare yes/no confirmation"
assert_file_contains "$SKILL" "逐条确认" "Clarification must confirm decisions one at a time"
assert_file_contains "$SKILL" "不要只顺着用户已提出的问题推进" "Brainstorming must proactively surface hidden issues"

echo ""
echo "=== brainstorming skill tests passed ==="
