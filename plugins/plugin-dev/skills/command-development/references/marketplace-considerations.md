# Command Marketplace 注意事项

创建面向分发且能在 marketplace 成功的 command 的指南。

## 概述

通过 marketplace 分发的 command 需要考虑个人自用 command 之外的额外因素。它们必须能跨环境工作、处理多样化使用场景，并为陌生用户提供优秀体验。

## 面向分发的设计

### 通用兼容性

**跨平台注意事项：**

```markdown
---
description: Cross-platform command
allowed-tools: Bash(uname *)
---

# Platform-Aware Command

Use the Bash tool to detect the platform with `uname`.

Set platform-specific values based on the result:

- Windows (`MINGW*`, `MSYS*`, `CYGWIN*`): path separator `\\`, null device `NUL`
- macOS/Linux: path separator `/`, null device `/dev/null`

[Platform-appropriate implementation...]
```

**避免平台特定 command：**

```markdown
<!-- BAD: macOS-specific -->

`pbcopy < file.txt`

<!-- GOOD: Ask Claude to use the Bash tool to detect pbcopy, xclip, or clip.exe before choosing a clipboard command. -->
```

### 最少依赖

**检查必需工具：**

```markdown
---
description: Dependency-aware command
allowed-tools: Bash(command *), Bash(git --version), Bash(jq --version), Bash(node --version)
---

# Check Dependencies

Required tools:

- git
- jq
- node

Use the Bash tool to check whether `git`, `jq`, and `node` are available.

If any dependency is missing, report:

ERROR: Missing required dependencies: [list]

INSTALLATION:

- git: https://git-scm.com/downloads
- jq: https://stedolan.github.io/jq/download/
- node: https://nodejs.org/

Install missing tools and try again.

If all dependencies are available, continue.

[Continue with command...]
```

**记录可选依赖：**

```markdown
<!--
DEPENDENCIES:
  Required:
  - git 2.0+: Version control
  - jq 1.6+: JSON processing

  Optional:
  - gh: GitHub CLI (for PR operations)
  - docker: Container operations (for containerized tests)

  Feature availability depends on installed tools.
-->
```

### 优雅降级

**处理缺失功能：**

```markdown
---
description: Feature-aware command
---

# Feature Detection

Detecting available features...

FEATURES=""

if command -v gh > /dev/null; then
FEATURES="$FEATURES github"
fi

if command -v docker > /dev/null; then
FEATURES="$FEATURES docker"
fi

Available features: $FEATURES

if echo "$FEATURES" | grep -q "github"; then

# Full functionality with GitHub integration

echo "✓ GitHub integration available"
else

# Reduced functionality without GitHub

echo "⚠ Limited functionality: GitHub CLI not installed"
echo " Install 'gh' for full features"
fi

[Adapt behavior based on available features...]
```

## 面向陌生用户的用户体验

### 清晰入门引导

**首次运行体验：**

```markdown
---
description: Command with onboarding
allowed-tools: Read, Write
---

# First Run Check

if [ ! -f ".claude/command-initialized" ]; then
**Welcome to Command Name!**

This appears to be your first time using this command.

WHAT THIS COMMAND DOES:
[Brief explanation of purpose and benefits]

QUICK START:

1. Basic usage: /command [arg]
2. For help: /command help
3. Examples: /command examples

SETUP:
No additional setup required. You're ready to go!

✓ Initialization complete

[Create initialization marker]

Ready to proceed with your request...
fi

[Normal command execution...]
```

**渐进式功能发现：**

```markdown
---
description: Command with tips
---

# Command Execution

[Main functionality...]

---

💡 TIP: Did you know?

You can speed up this command with the --fast flag:
/command --fast [args]

For more tips: /command tips
```

### 全面的错误处理

**预判用户错误：**

```markdown
---
description: Forgiving command
---

# User Input Handling

Argument: "$1"

<!-- Check for common typos -->

if [ "$1" = "hlep" ] || [ "$1" = "hepl" ]; then
Did you mean: help?

Showing help instead...
[Display help]

Exit.
fi

<!-- Suggest similar commands if not found -->

if [ "$1" != "valid-option1" ] && [ "$1" != "valid-option2" ]; then
❌ Unknown option: $1

Did you mean:

- valid-option1 (most similar)
- valid-option2

For all options: /command help

Exit.
fi

[Command continues...]
```

**有帮助的诊断信息：**

```markdown
---
description: Diagnostic command
---

# Operation Failed

The operation could not complete.

**Diagnostic Information:**

Environment:

- Platform: $(uname)
- Shell: $SHELL
- Working directory: $(pwd)
- Command: /command $@

Checking common issues:

- Git repository: $(git rev-parse --git-dir 2>&1)
- Write permissions: $(test -w . && echo "OK" || echo "DENIED")
- Required files: $(test -f config.yml && echo "Found" || echo "Missing")

This information helps debug the issue.

For support, include the above diagnostics.
```

## 分发最佳实践

### Namespace 意识

**避免名称冲突：**

```markdown
---
description: Namespaced command
---

<!--
COMMAND NAME: plugin-name-command

This command is namespaced with the plugin name to avoid
conflicts with commands from other plugins.

Alternative naming approaches:
- Use plugin prefix: /plugin-command
- Use category: /category-command
- Use verb-noun: /verb-noun

Chosen approach: plugin-name prefix
Reasoning: Clearest ownership, least likely to conflict
-->

# Plugin Name Command

[Implementation...]
```

**记录命名理由：**

```markdown
<!--
NAMING DECISION:

Command name: /deploy-app

Alternatives considered:
- /deploy: Too generic, likely conflicts
- /app-deploy: Less intuitive ordering
- /my-plugin-deploy: Too verbose

Final choice balances:
- Discoverability (clear purpose)
- Brevity (easy to type)
- Uniqueness (unlikely conflicts)
-->
```

### 可配置性

**用户偏好：**

```markdown
---
description: Configurable command
allowed-tools: Read
---

# Load User Configuration

Default configuration:

- verbose: false
- color: true
- max_results: 10

Check for user config at `.claude/plugin-name.local.md` with the Read tool.

If it exists, parse YAML frontmatter for `verbose`, `color`, and `max_results`; otherwise use the defaults above and tell the user they can create `.claude/plugin-name.local.md` to customize.

[Use configuration in command...]
```

**合理默认值：**

```markdown
---
description: Command with smart defaults
---

# Smart Defaults

Configuration:

- Format: ${FORMAT:-json} # Defaults to json
- Output: ${OUTPUT:-stdout} # Defaults to stdout
- Verbose: ${VERBOSE:-false} # Defaults to false

These defaults work for 80% of use cases.

Override with arguments:
/command --format yaml --output file.txt --verbose

Or set in .claude/plugin-name.local.md:
\`\`\`yaml

---

format: yaml
output: custom.txt
verbose: true

---

\`\`\`
```

### 版本兼容性

**版本检查：**

```markdown
---
description: Version-aware command
---

<!--
COMMAND VERSION: 2.1.0

COMPATIBILITY:
- Requires plugin version: >= 2.0.0
- Breaking changes from v1.x documented in MIGRATION.md

VERSION HISTORY:
- v2.1.0: Added --new-feature flag
- v2.0.0: BREAKING: Changed argument order
- v1.0.0: Initial release
-->

# Version Check

Command version: 2.1.0
Plugin version: [detect from plugin.json]

if [ "$PLUGIN_VERSION" < "2.0.0" ]; then
❌ ERROR: Incompatible plugin version

This command requires plugin version >= 2.0.0
Current version: $PLUGIN_VERSION

Update plugin:
/plugin update plugin-name

Exit.
fi

✓ Version compatible

[Command continues...]
```

**弃用警告：**

```markdown
---
description: Command with deprecation warnings
---

# Deprecation Check

if [ "$1" = "--old-flag" ]; then
⚠️ DEPRECATION WARNING

The --old-flag option is deprecated as of v2.0.0
It will be removed in v3.0.0 (est. June 2025)

Use instead: --new-flag

Example:
Old: /command --old-flag value
New: /command --new-flag value

See migration guide: /command migrate

Continuing with deprecated behavior for now...
fi

[Handle both old and new flags during deprecation period...]
```

## Marketplace 呈现

### Command 发现

**描述性命名：**

```markdown
---
description: Review pull request with security and quality checks
---

<!-- GOOD: Descriptive name and description -->
```

```markdown
---
description: Do the thing
---

<!-- BAD: Vague description -->
```

**可搜索关键词：**

```markdown
<!--
KEYWORDS: security, code-review, quality, validation, audit

These keywords help users discover this command when searching
for related functionality in the marketplace.
-->
```

### 展示示例

**有吸引力的演示：**

```markdown
---
description: Advanced code analysis command
---

# Code Analysis Command

This command performs deep code analysis with actionable insights.

## Demo: Quick Security Audit

Try it now:
\`\`\`
/analyze-code src/ --security
\`\`\`

**What you'll get:**

- Security vulnerability detection
- Code quality metrics
- Performance bottleneck identification
- Actionable recommendations

**Sample output:**
\`\`\`
Security Analysis Results
=========================

🔴 Critical (2):

- SQL injection risk in users.js:45
- XSS vulnerability in display.js:23

🟡 Warnings (5):

- Unvalidated input in api.js:67
  ...

Recommendations:

1. Fix critical issues immediately
2. Review warnings before next release
3. Run /analyze-code --fix for auto-fixes
   \`\`\`

---

Ready to analyze your code...

[Command implementation...]
```

### 用户评价与反馈

**反馈机制：**

```markdown
---
description: Command with feedback
---

# Command Complete

[Command results...]

---

**How was your experience?**

This helps improve the command for everyone.

Rate this command:

- 👍 Helpful
- 👎 Not helpful
- 🐛 Found a bug
- 💡 Have a suggestion

Reply with an emoji or:

- /command feedback

Your feedback matters!
```

**使用分析准备：**

```markdown
<!--
ANALYTICS NOTES:

Track for improvement:
- Most common arguments
- Failure rates
- Average execution time
- User satisfaction scores

Privacy-preserving:
- No personally identifiable information
- Aggregate statistics only
- User opt-out respected
-->
```

## 质量标准

### 专业打磨

**一致的品牌呈现：**

```markdown
---
description: Branded command
---

# ✨ Command Name

Part of the [Plugin Name] suite

[Command functionality...]

---

**Need Help?**

- Documentation: https://docs.example.com
- Support: support@example.com
- Community: https://community.example.com

Powered by Plugin Name v2.1.0
```

**关注细节：**

```markdown
<!-- Details that matter -->

✓ Use proper emoji/symbols consistently
✓ Align output columns neatly
✓ Format numbers with thousands separators
✓ Use color/formatting appropriately
✓ Provide progress indicators
✓ Show estimated time remaining
✓ Confirm successful operations
```

### 可靠性

**幂等性：**

```markdown
---
description: Idempotent command
---

# Safe Repeated Execution

Checking if operation already completed...

if [ -f ".claude/operation-completed.flag" ]; then
ℹ️ Operation already completed

Completed at: $(cat .claude/operation-completed.flag)

To re-run:

1. Remove flag: rm .claude/operation-completed.flag
2. Run command again

Otherwise, no action needed.

Exit.
fi

Performing operation...

[Safe, repeatable operation...]

Marking complete...
echo "$(date)" > .claude/operation-completed.flag
```

**原子操作：**

```markdown
---
description: Atomic command
---

# Atomic Operation

This operation is atomic - either fully succeeds or fully fails.

Creating temporary workspace...
TEMP_DIR=$(mktemp -d)

Perform changes in the isolated workspace at "$TEMP_DIR".

If validation succeeds:
- Move validated output from "$TEMP_DIR" into ./target/ using quoted paths.
- Report that the operation completed.

If validation fails:
- Remove "$TEMP_DIR" with quoted paths.
- Explain that no changes were applied and the operation is safe to retry.
```

## 面向分发的测试

### 发布前 Checklist

```markdown
<!--
PRE-RELEASE CHECKLIST:

Functionality:
- [ ] Works on macOS
- [ ] Works on Linux
- [ ] Works on Windows (WSL)
- [ ] All arguments tested
- [ ] Error cases handled
- [ ] Edge cases covered

User Experience:
- [ ] Clear description
- [ ] Helpful error messages
- [ ] Examples provided
- [ ] First-run experience good
- [ ] Documentation complete

Distribution:
- [ ] No hardcoded paths
- [ ] Dependencies documented
- [ ] Configuration options clear
- [ ] Version number set
- [ ] Changelog updated

Quality:
- [ ] No TODO comments
- [ ] No debug code
- [ ] Performance acceptable
- [ ] Security reviewed
- [ ] Privacy considered

Support:
- [ ] README complete
- [ ] Troubleshooting guide
- [ ] Support contact provided
- [ ] Feedback mechanism
- [ ] License specified
-->
```

### Beta 测试

**Beta 发布方式：**

```markdown
---
description: Beta command (v0.9.0)
---

# 🧪 Beta Command

**This is a beta release**

Features may change based on feedback.

BETA STATUS:

- Version: 0.9.0
- Stability: Experimental
- Support: Limited
- Feedback: Encouraged

Known limitations:

- Performance not optimized
- Some edge cases not handled
- Documentation incomplete

Help improve this command:

- Report issues: /command report-issue
- Suggest features: /command suggest
- Join beta testers: /command join-beta

---

[Command implementation...]

---

**Thank you for beta testing!**

Your feedback helps make this command better.
```

## 维护与更新

### 更新策略

**版本化 command：**

```markdown
<!--
VERSION STRATEGY:

Major (X.0.0): Breaking changes
- Document all breaking changes
- Provide migration guide
- Support old version briefly

Minor (x.Y.0): New features
- Backward compatible
- Announce new features
- Update examples

Patch (x.y.Z): Bug fixes
- No user-facing changes
- Update changelog
- Security fixes prioritized

Release schedule:
- Patches: As needed
- Minors: Monthly
- Majors: Annually or as needed
-->
```

**更新通知：**

```markdown
---
description: Update-aware command
---

# Check for Updates

Current version: 2.1.0
Latest version: [check if available]

if [ "$CURRENT_VERSION" != "$LATEST_VERSION" ]; then
📢 UPDATE AVAILABLE

New version: $LATEST_VERSION
Current: $CURRENT_VERSION

What's new:

- Feature improvements
- Bug fixes
- Performance enhancements

Update with:
/plugin update plugin-name

Release notes: https://releases.example.com/v$LATEST_VERSION
fi

[Command continues...]
```

## 最佳实践总结

### 分发设计

1. **通用**：可跨平台和环境工作
2. **自包含**：最少依赖，依赖要求清晰
3. **优雅**：功能不可用时能优雅降级
4. **宽容**：预判并处理用户错误
5. **有帮助**：错误清晰，默认值合理，文档优秀

### Marketplace 成功要素

1. **可发现**：名称清晰，description 良好，keywords 可搜索
2. **专业**：展示精致，品牌一致
3. **可靠**：充分测试，处理边界情况
4. **可维护**：版本化，定期更新，有支持渠道
5. **以用户为中心**：优秀 UX，响应反馈

### 质量标准

1. **完整**：文档齐全，所有功能可用
2. **已测试**：可在真实环境工作，覆盖边界情况
3. **安全**：无漏洞，操作安全
4. **高性能**：速度合理，资源效率高
5. **合乎伦理**：尊重隐私，获得用户同意

有了这些考虑，command 就能达到 marketplace-ready 状态，并在多样环境与使用场景中让用户满意。
