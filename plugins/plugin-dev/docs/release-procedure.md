# Version Release Procedure

This document describes the complete release workflow for plugin-dev.

## Version Files

Version must be synchronized across these files on release:

- `plugins/plugin-dev/.claude-plugin/plugin.json` (source of truth)
- Optional root `.claude-plugin/marketplace.json` if this repository is also published as a marketplace

```bash
# Verify version consistency
rg '"version"' plugins/plugin-dev/.claude-plugin/plugin.json
```

## Release Steps

### 1. Create Release Branch

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create release branch
git checkout -b release/v0.x.x
```

### 2. Update Version Numbers

Update version in **all version files** (must match):

- `plugins/plugin-dev/.claude-plugin/plugin.json` (source of truth)
- Optional root `.claude-plugin/marketplace.json` if this repository is also published as a marketplace

```bash
# Find current version to replace
rg '"version"' plugins/plugin-dev/.claude-plugin/plugin.json

# Update all version files, then verify
rg '"version"' plugins/plugin-dev/.claude-plugin/plugin.json
```

### 3. Update Documentation

- `CHANGELOG.md`, if present - Add release notes following Keep a Changelog format:
  1. Review commits since last release: `git log v0.x.x..HEAD --oneline`
  2. Organize into sections: Added, Changed, Fixed, Security, Performance, Documentation
  3. Group related changes and reference PR numbers
  4. Add version comparison links at bottom of file
- Any other relevant documentation

> **Note**: If the repository has a README version badge, it can be configured to update from GitHub releases.

### 4. Test and Validate

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

### 5. Commit and Create PR

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

### 6. Merge and Create Release

After PR review and approval:

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

**Note**: Main branch is protected and requires PRs. All version bumps must go through the release branch workflow. The `--target main` flag ensures the tag is created on the correct commit.

**Publishing**: The `plugins/plugin-dev/` directory is the distributable plugin unit. If this repository also has a root `.claude-plugin/marketplace.json`, that root manifest defines marketplace distribution; otherwise, treat `plugins/plugin-dev/` as the plugin to publish or install directly.
