# 版本发布流程

本文档描述 plugin-dev 的完整发布工作流。

## 版本文件

发布时必须在以下文件之间同步版本：

- `plugins/plugin-dev/.claude-plugin/plugin.json`（事实来源）
- 可选的根目录 `.claude-plugin/marketplace.json`，如果此仓库也作为 marketplace 发布

```bash
# Verify version consistency
rg '"version"' plugins/plugin-dev/.claude-plugin/plugin.json
```

## 发布步骤

### 1. 创建发布分支

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create release branch
git checkout -b release/v0.x.x
```

### 2. 更新版本号

在**所有版本文件**中更新版本（必须一致）：

- `plugins/plugin-dev/.claude-plugin/plugin.json`（事实来源）
- 可选的根目录 `.claude-plugin/marketplace.json`，如果此仓库也作为 marketplace 发布

```bash
# Find current version to replace
rg '"version"' plugins/plugin-dev/.claude-plugin/plugin.json

# Update all version files, then verify
rg '"version"' plugins/plugin-dev/.claude-plugin/plugin.json
```

### 3. 更新文档

- 如果存在 `CHANGELOG.md`，按 Keep a Changelog 格式添加发布说明：
  1. 查看自上次发布以来的提交：`git log v0.x.x..HEAD --oneline`
  2. 按 Added、Changed、Fixed、Security、Performance、Documentation 分组
  3. 将相关变更归类，并引用 PR 编号
  4. 在文件底部添加版本比较链接
- 其他相关文档

> **说明**: 如果仓库有 README 版本徽章，可以将其配置为从 GitHub releases 更新。

### 4. 测试与验证

```bash
# Lint markdown files
markdownlint-cli2 '**/*.md'

# Verify version consistency
rg '"version"' plugins/plugin-dev/.claude-plugin/plugin.json

# Load plugin locally and test
claude --plugin-dir plugins/plugin-dev

# Test skills load correctly by asking trigger questions
# Test workflow commands: /plugin-dev:create-plugin, /plugin-dev:create-marketplace
# Test agents trigger appropriately
```

### 5. 提交并创建 PR

```bash
# Review and stage only intended release files
git status --short
git add plugins/plugin-dev/.claude-plugin/plugin.json plugins/plugin-dev/docs/release-procedure.md
git commit -m "chore: prepare release v0.x.x"

# Push release branch
git push origin release/v0.x.x

# Create pull request
gh pr create --title "chore: prepare release v0.x.x" \
  --body "Version bump to v0.x.x

## Changes
- [List major changes]
- [List bug fixes]
- [List documentation updates]

## Checklist
- [x] Version updated in plugin.json and optional marketplace.json if present
- [x] CHANGELOG.md updated with release notes if present
- [x] Markdownlint passes
- [x] Plugin tested locally
"
```

### 6. 合并并创建发布（Release）

在 PR 审查并批准后：

```bash
# Merge PR via GitHub UI or:
gh pr merge --squash  # or --merge or --rebase based on preference

# Create GitHub Release (this also creates the tag atomically)
gh release create v0.x.x \
  --target main \
  --title "v0.x.x" \
  --notes-file - <<'EOF'
## Summary

Brief description of the release focus.

## What's Changed

[Copy relevant sections from CHANGELOG.md if present, or summarize release changes]

**Full Changelog**: https://github.com/sjnims/plugin-dev/compare/<previous-tag>...<new-tag>
EOF
```

**说明**: main 分支受保护并要求通过 PR。所有版本更新都必须走发布分支工作流。`--target main` 标志可确保 tag 在正确的 commit 上创建。

**发布（Publishing）**：`plugins/plugin-dev/` 目录是可分发的插件单元。如果此仓库也有根目录 `.claude-plugin/marketplace.json`，则该根 manifest 定义 marketplace 分发；否则，将 `plugins/plugin-dev/` 视为直接发布或安装的插件。
