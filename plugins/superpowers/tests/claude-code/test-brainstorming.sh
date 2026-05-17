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
assert_file_contains "$SKILL" "主动挑战扫描" "Active challenge scan section exists"
assert_file_contains "$SKILL" "不设固定上限" "Challenge scan has no fixed upper limit"
assert_file_contains "$SKILL" "必须先确认" "Challenge scan prioritizes must-confirm issues"
assert_file_contains "$SKILL" "建议确认" "Challenge scan separates suggested confirmations"
assert_file_contains "$SKILL" "可作为设计假设" "Challenge scan can record design assumptions"
assert_file_contains "$SKILL" "展示完整清单" "Challenge scan requires showing the full list"
assert_file_contains "$SKILL" "为什么重要" "Clarification must explain why the issue matters"
assert_file_contains "$SKILL" "AskUserQuestion" "High-impact questions mention AskUserQuestion limitation"
assert_file_contains "$SKILL" "不能替代问题解释" "AskUserQuestion cannot replace explanation"
assert_file_contains "$SKILL" "只有在“必须先确认”的关键问题已确认" "Options wait for must-confirm issues"
assert_file_contains "$SKILL" "主动澄清格式" "Active clarification format section exists"
assert_file_contains "$SKILL" "问题是什么" "Clarification must state what the problem is"
assert_file_contains "$SKILL" "问题类型" "Clarification must display the problem type"
assert_file_contains "$SKILL" "歧义" "Clarification type includes ambiguity"
assert_file_contains "$SKILL" "隐藏假设" "Clarification type includes hidden assumptions"
assert_file_contains "$SKILL" "风险" "Clarification type includes risks"
assert_file_contains "$SKILL" "范围边界" "Clarification type includes scope boundary"
assert_file_contains "$SKILL" "用户容易理解" "Clarification must explain the problem in user-friendly language"
assert_file_contains "$SKILL" "需要用户确认什么" "Clarification must state what the user needs to confirm"
assert_file_contains "$SKILL" "确认问题" "Clarification must state the decision question before options"
assert_file_contains "$SKILL" "推荐选项" "Clarification must mark the recommended option"
assert_file_contains "$SKILL" "必须先列完全部选项" "Clarification must list all options before recommendation"
assert_file_contains "$SKILL" '不要在 `选项 A/B/C` 标题里写“推荐”' "Clarification must not put recommendation in option titles"
assert_file_contains "$SKILL" "不要在列完所有选项前插入推荐理由" "Clarification must not insert recommendation reason before all options"
assert_file_contains "$SKILL" '`推荐选项` 必须是独立字段' "Clarification recommendation must be an independent field"
assert_file_contains "$SKILL" "请先回复 A / B / C" "Clarification must ask for A/B/C response"
assert_file_contains "$SKILL" "不要只问是否确认" "Clarification must avoid bare yes/no confirmation"
assert_file_contains "$SKILL" "逐条确认" "Clarification must confirm decisions one at a time"
assert_file_contains "$SKILL" "不要只顺着用户已提出的问题推进" "Brainstorming must proactively surface hidden issues"

echo ""
echo "=== brainstorming skill tests passed ==="
