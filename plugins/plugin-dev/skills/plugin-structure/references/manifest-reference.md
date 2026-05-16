# Plugin Manifest 参考

`plugin.json` configuration 的完整参考。

## File Location

**Optional path**：`.claude-plugin/plugin.json`

对于只依赖 conventions 的 plugins，manifest 是可选的。当需要 metadata、custom component paths 或 configuration 时，请将 `plugin.json` 放在 plugin root 的 `.claude-plugin/` directory 中。如果该文件存在，则必须提供 `name`。

## Complete Field Reference

### Core Fields

#### name（required）

**Type**：String
**Format**：kebab-case
**Example**：`"test-automation-suite"`

Plugin 的唯一 identifier。用于：

- Claude Code 中的 plugin identification
- 与其他 plugins 的 conflict detection
- Command namespacing（可选）

**Requirements**：

- 必须在所有已安装 plugins 中唯一
- 只能使用 lowercase letters、numbers 和 hyphens
- 不能包含 spaces 或 special characters
- 以 letter 开头
- 以 letter 或 number 结尾

**Validation**：

```javascript
/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
```

**Examples**：

- ✅ Good：`api-tester`、`code-review`、`git-workflow-automation`
- ❌ Bad：`API Tester`、`code_review`、`-git-workflow`、`test-`

#### version

**Type**：String
**Format**：Semantic versioning（MAJOR.MINOR.PATCH）
**Example**：`"2.1.0"`
**Default**：未指定时为 `"0.1.0"`

Semantic versioning 指南：

- **MAJOR**：不兼容 API changes、breaking changes
- **MINOR**：新 functionality，backward-compatible
- **PATCH**：Bug fixes，backward-compatible

**Pre-release versions**：

- `"1.0.0-alpha.1"` - Alpha release
- `"1.0.0-beta.2"` - Beta release
- `"1.0.0-rc.1"` - Release candidate

**Examples**：

- `"0.1.0"` - Initial development
- `"1.0.0"` - First stable release
- `"1.2.3"` - Patch update to 1.2
- `"2.0.0"` - 包含 breaking changes 的 major version

#### description

**Type**：String
**Length**：建议 50-200 characters
**Example**：`"Automates code review workflows with style checks and automated feedback"`

简要说明 plugin purpose 和 functionality。

**Best practices**：

- 聚焦 plugin 做什么，而不是怎么做
- 使用 active voice
- 提及 key features 或 benefits
- 控制在 200 characters 以下，便于 marketplace display

**Examples**：

- ✅ "Generates comprehensive test suites from code analysis and coverage reports"
- ✅ "Integrates with Jira for automatic issue tracking and sprint management"
- ❌ "A plugin that helps you do testing stuff"
- ❌ "This is a very long description that goes on and on about every single feature..."

### Metadata Fields

#### author

**Type**：Object
**Fields**：name（required）、email（optional）、url（optional）

```json
{
  "author": {
    "name": "Jane Developer",
    "email": "jane@example.com",
    "url": "https://janedeveloper.com"
  }
}
```

**Alternative format**（仅 string）：

```json
{
  "author": "Jane Developer <jane@example.com> (https://janedeveloper.com)"
}
```

**Use cases**：

- Credit 和 attribution
- Support 或问题联系
- Marketplace display
- Community recognition

#### homepage

**Type**：String（URL）
**Example**：`"https://docs.example.com/plugins/my-plugin"`

指向 plugin documentation 或 landing page 的链接。

**Should point to**：

- Plugin documentation site
- Project homepage
- Detailed usage guide
- Installation instructions

**Not for**：

- Source code（使用 `repository` field）
- Issue tracker（包含在 documentation 中）
- Personal websites（使用 `author.url`）

#### repository

**Type**：String（URL）或 Object
**Example**：`"https://github.com/user/plugin-name"`

Source code repository 位置。

**String format**：

```json
{
  "repository": "https://github.com/user/plugin-name"
}
```

**Object format**（详细）：

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/user/plugin-name.git",
    "directory": "packages/plugin-name"
  }
}
```

**Use cases**：

- Source code access
- Issue reporting
- Community contributions
- Transparency and trust

#### license

**Type**：String
**Format**：SPDX identifier
**Example**：`"MIT"`

Software license identifier。

**Common licenses**：

- `"MIT"` - Permissive，popular choice
- `"Apache-2.0"` - Permissive，带 patent grant
- `"GPL-3.0"` - Copyleft
- `"BSD-3-Clause"` - Permissive
- `"ISC"` - Permissive，类似 MIT
- `"UNLICENSED"` - Proprietary，非 open source

**Full list**：<https://spdx.org/licenses/>

**Multiple licenses**：

```json
{
  "license": "(MIT OR Apache-2.0)"
}
```

#### keywords

**Type**：Array of strings
**Example**：`["testing", "automation", "ci-cd", "quality-assurance"]`

用于 plugin discovery 和 categorization 的 tags。

**Best practices**：

- 使用 5-10 个 keywords
- 包含 functionality categories
- 添加 technology names
- 使用常见 search terms
- 避免重复 plugin name

**Categories to consider**：

- Functionality：`testing`、`debugging`、`documentation`、`deployment`
- Technologies：`typescript`、`python`、`docker`、`aws`
- Workflows：`ci-cd`、`code-review`、`git-workflow`
- Domains：`web-development`、`data-science`、`devops`

### Component Path Fields

#### commands

**Type**：String 或 Array of strings
**Default**：`["./commands"]`
**Example**：`"./cli-commands"`

包含 command definitions 的 directories 或 files。Custom paths 会替换默认 `./commands` directory，除非你显式包含 `./commands`。

**Single path**：

```json
{
  "commands": "./custom-commands"
}
```

**Multiple paths**：

```json
{
  "commands": ["./commands", "./admin-commands", "./experimental-commands"]
}
```

**Behavior**：替换默认 `commands/` directory，除非显式包含 `./commands`

**Use cases**：

- 按 category 组织 commands
- 将 stable commands 与 experimental commands 分离
- 从 shared locations 加载 commands

#### agents

**Type**：String 或 Array of strings
**Default**：`["./agents"]`
**Example**：`"./specialized-agents"`

包含 agent definitions 的 directories 或 files。Custom paths 会替换默认 `./agents` directory，除非你显式包含 `./agents`。

**Format**：与 `commands` field 相同

**Use cases**：

- 按 specialization 分组 agents
- 分离 general-purpose 和 task-specific agents
- 从 plugin dependencies 加载 agents

#### hooks

**Type**：String（JSON file path）或 Object（inline configuration）
**Default**：`"./hooks/hooks.json"`

Hook configuration 位置或 inline definition。

**File path**：

```json
{
  "hooks": "./config/hooks.json"
}
```

**Inline configuration**：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

**Use cases**：

- 简单 plugins：Inline configuration（< 50 lines）
- 复杂 plugins：External JSON file
- 多个 hook sets：为不同 contexts 使用单独文件

#### mcpServers

**Type**：String（JSON file path）或 Object（inline configuration）
**Default**：`./.mcp.json`

MCP server configuration 位置或 inline definition。

**File path**：

```json
{
  "mcpServers": "./.mcp.json"
}
```

**Inline configuration**：

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/github-mcp.js"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**Use cases**：

- 简单 plugins：单个 inline server（< 20 lines）
- 复杂 plugins：External `.mcp.json` file
- 多个 servers：始终使用 external file

#### outputStyles

**Type**：String 或 Array of strings
**Default**：`["./output-styles"]`
**Example**：`"./styles"`

指向 output style definition files 或 directories 的 path(s)。Custom paths 会替换默认 `./output-styles` directory，除非你显式包含 `./output-styles`。

**Single path**：

```json
{
  "outputStyles": "./styles"
}
```

**Multiple paths**：

```json
{
  "outputStyles": ["./styles/default.md", "./styles/compact.md"]
}
```

**Behavior**：替换默认 `output-styles/` directory，除非显式包含 `./output-styles`

Output style files 是带 YAML frontmatter（`name`、`description`、`keep-coding-instructions`）的 markdown。完整 frontmatter schema 见 plugin-structure skill 的 `references/output-styles.md`。

**Use cases**：

- 提供 domain-specific formatting（例如简洁 code review output）
- 打包多个 style options 供用户选择
- 为不同 workflows 提供 specialized output modes

## Path Resolution

### Relative Path Rules

Component fields 中的所有 paths 必须遵循这些规则：

1. **必须是 relative**：不能使用 absolute paths
2. **必须以 `./` 开头**：表示相对于 plugin root
3. **不能使用 `../`**：不能导航到 parent directory
4. **只使用 forward slashes**：即使在 Windows 上也是如此

**Examples**：

- ✅ `"./commands"`
- ✅ `"./src/commands"`
- ✅ `"./configs/hooks.json"`
- ❌ `"/Users/name/plugin/commands"`
- ❌ `"commands"`（缺少 `./`）
- ❌ `"../shared/commands"`
- ❌ `".\\commands"`（backslash）

### Path Behavior

Claude Code 加载 components 时：

1. **Default paths**：未配置 custom path 时使用 standard locations。
   - `./commands/`
   - `./agents/`
   - `./skills/`
   - `./hooks/hooks.json`
   - `./.mcp.json`

2. **Custom paths**：Behavior 取决于 field。
   - `skills` 补充 `./skills`
   - `commands`、`agents` 和 `outputStyles` 会替换 defaults，除非显式列出 default path
   - `hooks`、`mcpServers` 和 LSP settings 有各自的 file/merge behavior

3. **Conflicts**：Loaded components 之间的 name conflicts 会导致 errors

## Validation

### Manifest Validation

Claude Code 会在 plugin load 时验证 manifest：

**Syntax validation**：

- 有效 JSON format
- 无 syntax errors
- Field types 正确

**Field validation**：

- `name` field 存在且 format 有效
- `version` 遵循 semantic versioning（如果存在）
- Paths 是带 `./` prefix 的 relative paths
- URLs 有效（如果存在）

**Component validation**：

- Referenced paths 存在
- Hook 和 MCP configurations 有效
- 无 circular dependencies

### Common Validation Errors

**Invalid name format**：

```jsonc
{
  "name": "My Plugin" // Contains spaces
}
```

修复：使用 kebab-case

```jsonc
{
  "name": "my-plugin" // Valid
}
```

**Absolute path**：

```jsonc
{
  "commands": "/Users/name/commands" // Absolute path
}
```

修复：使用 relative path

```jsonc
{
  "commands": "./commands" // Valid
}
```

**Missing ./ prefix**：

```jsonc
{
  "hooks": "hooks/hooks.json" // No ./
}
```

修复：添加 ./ prefix

```jsonc
{
  "hooks": "./hooks/hooks.json" // Valid
}
```

**Invalid version**：

```jsonc
{
  "version": "1.0" // Not semantic versioning
}
```

修复：使用 MAJOR.MINOR.PATCH

```jsonc
{
  "version": "1.0.0" // Valid
}
```

## Minimal vs. Complete Examples

### Minimal Manifest

需要 manifest 时的最低配置：

```json
{
  "name": "hello-world"
}
```

完全依赖默认 directory discovery。

### Recommended Plugin

用于 distribution 的良好 metadata：

```json
{
  "name": "code-review-assistant",
  "version": "1.0.0",
  "description": "Automates code review with style checks and suggestions",
  "author": {
    "name": "Jane Developer",
    "email": "jane@example.com"
  },
  "homepage": "https://docs.example.com/code-review",
  "repository": "https://github.com/janedev/code-review-assistant",
  "license": "MIT",
  "keywords": ["code-review", "automation", "quality", "ci-cd"]
}
```

### Complete Plugin

包含所有 features 的完整 configuration：

```json
{
  "name": "enterprise-devops",
  "version": "2.3.1",
  "description": "Comprehensive DevOps automation for enterprise CI/CD pipelines",
  "author": {
    "name": "DevOps Team",
    "email": "devops@company.com",
    "url": "https://company.com/devops"
  },
  "homepage": "https://docs.company.com/plugins/devops",
  "repository": {
    "type": "git",
    "url": "https://github.com/company/devops-plugin.git"
  },
  "license": "Apache-2.0",
  "keywords": [
    "devops",
    "ci-cd",
    "automation",
    "kubernetes",
    "docker",
    "deployment"
  ],
  "commands": ["./commands", "./admin-commands"],
  "agents": "./specialized-agents",
  "hooks": "./config/hooks.json",
  "mcpServers": "./.mcp.json"
}
```

## Best Practices

### Metadata

1. **Always include version**：跟踪 changes 和 updates
2. **Write clear descriptions**：帮助用户理解 plugin purpose
3. **Provide contact information**：支持 user support
4. **Link to documentation**：降低 support burden
5. **Choose appropriate license**：匹配 project goals

### Paths

1. **Use defaults when possible**：最小化 configuration
2. **Organize logically**：将相关 components 分组
3. **Document custom paths**：说明为什么使用 non-standard layout
4. **Test path resolution**：在多个 systems 上验证

### Maintenance

1. **Bump version on changes**：遵循 semantic versioning
2. **Update keywords**：反映 new functionality
3. **Keep description current**：匹配 actual capabilities
4. **Maintain changelog**：跟踪 version history
5. **Update repository links**：保持 URLs 当前有效

### Distribution

1. **Complete metadata before publishing**：填写所有 fields
2. **Test on clean install**：验证 plugin 无需 dev environment 也能工作
3. **Validate manifest**：使用 validation tools
4. **Include README**：记录 installation 和 usage
5. **Specify license file**：在 plugin root 中包含 LICENSE file
