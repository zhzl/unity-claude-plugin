#!/usr/bin/env bash
# Test: subagent-driven-development skill
# Verifies that the skill documents the required workflow and guardrails.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILL="$PLUGIN_ROOT/skills/subagent-driven-development/SKILL.md"
IMPLEMENTER="$PLUGIN_ROOT/skills/subagent-driven-development/implementer-prompt.md"
SPEC_REVIEWER="$PLUGIN_ROOT/skills/subagent-driven-development/spec-reviewer-prompt.md"

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

echo "=== Test: subagent-driven-development skill ==="
echo ""

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

# Test 1: Verify skill can be loaded
echo "Test 1: Skill loading..."

assert_file_contains "$SKILL" "name: subagent-driven-development" "Skill frontmatter names the skill"
assert_file_contains "$SKILL" "# 子智能体驱动开发" "Skill title exists"
assert_file_contains "$SKILL" "读取计划，提取所有任务的完整文本" "Mentions loading plan"

echo ""

# Test 2: Verify skill describes correct workflow order
echo "Test 2: Workflow ordering..."

skill_text="$(<"$SKILL")"

if assert_order "$skill_text" "分派规格审查子智能体" "分派代码质量审查子智能体" "Spec compliance before code quality"; then
    : # pass
else
    exit 1
fi

if assert_order "$skill_text" "代码质量审查子智能体通过?" "分派文档同步子智能体更新 plan checkbox" "Document sync after code quality review"; then
    : # pass
else
    exit 1
fi

if assert_order "$skill_text" "分派最终代码审查子智能体审查整体实现" "分派 roadmap 同步子智能体更新 ROADMAP.md" "Roadmap sync after final review"; then
    : # pass
else
    exit 1
fi

echo ""

# Test 3: Verify self-review is mentioned
echo "Test 3: Self-review requirement..."

assert_file_contains "$IMPLEMENTER" "汇报前：自审" "Mentions self-review"
assert_file_contains "$IMPLEMENTER" "完整性" "Checks completeness"

echo ""

# Test 4: Verify plan is read once
echo "Test 4: Plan reading efficiency..."

assert_file_contains "$SKILL" "读取计划，提取所有任务的完整文本" "Controller reads plan at the beginning"
assert_file_contains "$SKILL" "一次性读取计划文件" "Example reads plan once"
assert_file_contains "$SKILL" "让子智能体读取计划文件（应提供完整文本）" "Subagents do not read the plan file"

echo ""

# Test 5: Verify spec compliance reviewer is skeptical
echo "Test 5: Spec compliance reviewer mindset..."

assert_file_contains "$SPEC_REVIEWER" "不要信任报告" "Reviewer is skeptical"
assert_file_contains "$SPEC_REVIEWER" "独立验证所有内容" "Reviewer verifies independently"
assert_file_contains "$SPEC_REVIEWER" "阅读他们写的实际代码" "Reviewer reads code"

echo ""

# Test 6: Verify review loops
echo "Test 6: Review loop requirements..."

assert_file_contains "$SKILL" "重新审查" "Review loops mentioned"
assert_file_contains "$SKILL" "实现子智能体修复规格差距" "Implementer fixes spec issues"
assert_file_contains "$SKILL" "实现子智能体修复质量问题" "Implementer fixes quality issues"

echo ""

# Test 7: Verify full task text is provided
echo "Test 7: Task context provision..."

assert_file_contains "$IMPLEMENTER" "计划中任务的完整文本 - 粘贴到这里" "Provides text directly"
assert_file_contains "$SKILL" "附带完整任务文本 + 上下文" "Controller includes full task text"
assert_file_contains "$SKILL" "让子智能体读取计划文件（应提供完整文本）" "Doesn't make subagent read file"

echo ""

# Test 8: Verify workflow prerequisites
echo "Test 8: Workflow prerequisites..."

assert_file_contains "$SKILL" "superpowers:writing-plans" "Mentions writing-plans prerequisite"

echo ""

# Test 9: Verify main branch warning
echo "Test 9: Main branch red flag..."

assert_file_contains "$SKILL" "未经用户明确同意就在 main/master 分支上开始实现" "Warns against main branch"

echo ""

echo "=== All subagent-driven-development skill tests passed ==="
