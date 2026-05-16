# Plugin Manifest 参考

`plugin.json` 配置的完整参考。

## 文件位置

**可选 path**：`.claude-plugin/plugin.json`

对于只依赖 conventions 的 plugins，manifest 是可选的。当需要 metadata、custom component paths 或 configuration 时，请将 `plugin.json` 放在 plugin root 的 `.claude-plugin/` directory 中。如果该文件存在，则必须提供 `name`。

## 完整 field 参考

### 核心 fields

#### name（必需）

**类型**：String
**格式**：kebab-case
**示例**：`"test-automation-suite"`

Plugin 的唯一 identifier。用于：

- Claude Code 中的 plugin identification
- 与其他 plugins 的 conflict detection
- Command namespacing（可选）

**要求：**

- 必须在所有已安装 plugins 中唯一
- 只能使用 lowercase letters、numbers 和 hyphens
- 不能包含 spaces 或 special characters
- 以 letter 开头
- 以 letter 或 number 结尾

**Validation（验证）：**

```javascript
/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
```

**示例：**

- ✅ 好：`api-tester`、`code-review`、`git-workflow-automation`
- ❌ 坏：`API Tester`、`code_review`、`-git-workflow`、`test-`

#### version

**类型**：String
**格式**：Semantic versioning（MAJOR.MINOR.PATCH）
**示例**：`"2.1.0"`
**默认值**：未指定时为 `"0.1.0"`

Semantic versioning 指南：

- **MAJOR**：不兼容 API changes、breaking changes
- **MINOR**：新 functionality，backward-compatible
- **PATCH**：Bug fixes（问题修复），backward-compatible

**预发布 versions（pre-release versions）：**

- `"1.0.0-alpha.1"` - Alpha release（Alpha 版本）
- `"1.0.0-beta.2"` - Beta release（Beta 版本）
- `"1.0.0-rc.1"` - Release candidate（发布候选版本）

**示例：**

- `"0.1.0"` - Initial development（初始开发）
- `"1.0.0"` - First stable release（首个稳定版本）
- `"1.2.3"` - Patch update to 1.2（1.2 的 patch 更新）
- `"2.0.0"` - 包含 breaking changes 的 major version

#### description

**类型**：String
**长度**：建议 50-200 characters
**示例**：`"Automates code review workflows with style checks and automated feedback"`

简要说明 plugin 的用途和功能。

**最佳实践（best practices）：**

- 聚焦 plugin 做什么，而不是怎么做
- 使用 active voice
- 提及 key features 或 benefits
- 控制在 200 characters 以下，便于 marketplace display

**示例：**

- ✅ "基于代码分析和覆盖率报告生成全面的测试套件"
- ✅ "与 Jira 集成，用于自动 issue tracking 和 sprint management"
- ❌ "一个帮助你做测试相关事情的 plugin"
- ❌ "这是一段很长的 description，会没完没了地描述每一个 feature..."

### Metadata fields（metadata 字段）

#### author

**类型**：Object
**字段（fields）：** name（必需）、email（可选）、url（可选）

```json
{
  "author": {
    "name": "Jane Developer",
    "email": "jane@example.com",
    "url": "https://janedeveloper.com"
  }
}
```

**替代 format**（仅 string）：

```json
{
  "author": "Jane Developer <jane@example.com> (https://janedeveloper.com)"
}
```

**用例（use cases）：**

- 署名（credit 和 attribution）
- Support 或问题联系
- Marketplace 展示（Marketplace display）
- 社区认可（Community recognition）

#### homepage

**类型**：String（URL）
**示例**：`"https://docs.example.com/plugins/my-plugin"`

指向 plugin documentation 或 landing page 的链接。

**应指向：**

- Plugin 文档站点（Plugin documentation site）
- 项目主页（Project homepage）
- 详细使用指南（Detailed usage guide）
- 安装说明（Installation instructions）

**不用于：**

- Source code（使用 `repository` field）
- Issue tracker（包含在 documentation 中）
- Personal websites（使用 `author.url`）

#### repository

**类型**：String（URL）或 Object
**示例**：`"https://github.com/user/plugin-name"`

Source code repository 位置。

**String 格式（string format）：**

```json
{
  "repository": "https://github.com/user/plugin-name"
}
```

**Object 格式（object format）：**

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/user/plugin-name.git",
    "directory": "packages/plugin-name"
  }
}
```

**用例（use cases）：**

- Source code 访问（Source code access）
- Issue 报告（Issue reporting）
- 社区贡献（Community contributions）
- 透明度与信任（Transparency and trust）

#### license

**类型**：String
**格式**：SPDX identifier
**示例**：`"MIT"`

Software license identifier（软件 license 标识符）。

**常见 licenses：**

- `"MIT"` - Permissive（宽松型），常用选择
- `"Apache-2.0"` - Permissive（宽松型），带 patent grant
- `"GPL-3.0"` - Copyleft（著佐权）
- `"BSD-3-Clause"` - Permissive（宽松型）
- `"ISC"` - Permissive（宽松型），类似 MIT
- `"UNLICENSED"` - Proprietary，非 open source

**完整列表：** <https://spdx.org/licenses/>

**多个 licenses：**

```json
{
  "license": "(MIT OR Apache-2.0)"
}
```

#### keywords

**类型**：Array of strings
**示例**：`["testing", "automation", "ci-cd", "quality-assurance"]`

用于 plugin discovery 和 categorization 的 tags。

**最佳实践（best practices）：**

- 使用 5-10 个 keywords
- 包含 functionality categories
- 添加 technology names
- 使用常见 search terms
- 避免重复 plugin name

**可考虑的类别：**

- Functionality（功能）：`testing`、`debugging`、`documentation`、`deployment`
- Technologies（技术）：`typescript`、`python`、`docker`、`aws`
- Workflows（工作流）：`ci-cd`、`code-review`、`git-workflow`
- Domains（领域）：`web-development`、`data-science`、`devops`

### 组件 path fields（component path fields）

#### commands

**类型**：String 或 Array of strings
**默认值**：`["./commands"]`
**示例**：`"./cli-commands"`

包含 command definitions 的 directories 或 files。Custom paths 会替换默认 `./commands` directory，除非你显式包含 `./commands`。

**单个 path：**

```json
{
  "commands": "./custom-commands"
}
```

**多个 paths：**

```json
{
  "commands": ["./commands", "./admin-commands", "./experimental-commands"]
}
```

**行为**：替换默认 `commands/` directory，除非显式包含 `./commands`

**用例（use cases）：**

- 按 category 组织 commands
- 将 stable commands 与 experimental commands 分离
- 从 shared locations 加载 commands

#### agents

**类型**：String 或 Array of strings
**默认值**：`["./agents"]`
**示例**：`"./specialized-agents"`

包含 agent definitions 的 directories 或 files。Custom paths 会替换默认 `./agents` directory，除非你显式包含 `./agents`。

**格式**：与 `commands` field 相同

**用例（use cases）：**

- 按 specialization 分组 agents
- 分离 general-purpose 和 task-specific agents
- 从 plugin dependencies 加载 agents

#### hooks

**类型**：String（JSON file path）或 Object（inline configuration）
**默认值**：`"./hooks/hooks.json"`

Hook configuration 位置或 inline definition。

**File path（文件 path）：**

```json
{
  "hooks": "./config/hooks.json"
}
```

**Inline configuration（内联 configuration）：**

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

**用例（use cases）：**

- 简单 plugins：Inline configuration（< 50 lines）
- 复杂 plugins：External JSON file
- 多个 hook sets：为不同 contexts 使用单独文件

#### mcpServers

**类型**：String（JSON file path）或 Object（inline configuration）
**默认值**：`./.mcp.json`

MCP server configuration 位置或 inline definition。

**File path（文件 path）：**

```json
{
  "mcpServers": "./.mcp.json"
}
```

**Inline configuration（内联 configuration）：**

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

**用例（use cases）：**

- 简单 plugins：单个 inline server（< 20 lines）
- 复杂 plugins：External `.mcp.json` file
- 多个 servers：始终使用 external file

#### outputStyles

**类型**：String 或 Array of strings
**默认值**：`["./output-styles"]`
**示例**：`"./styles"`

指向 output style definition files 或 directories 的 path(s)。Custom paths 会替换默认 `./output-styles` directory，除非你显式包含 `./output-styles`。

**单个 path：**

```json
{
  "outputStyles": "./styles"
}
```

**多个 paths：**

```json
{
  "outputStyles": ["./styles/default.md", "./styles/compact.md"]
}
```

**行为**：替换默认 `output-styles/` directory，除非显式包含 `./output-styles`

Output style files 是带 YAML frontmatter（`name`、`description`、`keep-coding-instructions`）的 markdown。完整 frontmatter schema 见 plugin-structure skill 的 `references/output-styles.md`。

**用例（use cases）：**

- 提供 domain-specific formatting（例如简洁 code review output）
- 打包多个 style options 供用户选择
- 为不同 workflows 提供 specialized output modes

## Path 解析（path resolution）

### Relative path 规则

Component fields 中的所有 paths 必须遵循这些规则：

1. **必须是 relative**：不能使用 absolute paths
2. **必须以 `./` 开头**：表示相对于 plugin root
3. **不能使用 `../`**：不能导航到 parent directory
4. **只使用 forward slashes**：即使在 Windows 上也是如此

**示例：**

- ✅ `"./commands"`
- ✅ `"./src/commands"`
- ✅ `"./configs/hooks.json"`
- ❌ `"/Users/name/plugin/commands"`
- ❌ `"commands"`（缺少 `./`）
- ❌ `"../shared/commands"`
- ❌ `".\\commands"`（backslash）

### Path 行为（path behavior）

Claude Code 加载 components 时：

1. **默认 paths（default paths）**：未配置 custom path 时使用 standard locations。
   - `./commands/`
   - `./agents/`
   - `./skills/`
   - `./hooks/hooks.json`
   - `./.mcp.json`

2. **自定义 paths（custom paths）**：Behavior 取决于 field。
   - `skills` 补充 `./skills`
   - `commands`、`agents` 和 `outputStyles` 会替换 defaults，除非显式列出 default path
   - `hooks`、`mcpServers` 和 LSP settings 有各自的 file/merge behavior

3. **冲突（conflicts）**：Loaded components 之间的 name conflicts 会导致 errors

## Validation（验证）

### Manifest validation（manifest 验证）

Claude Code 会在 plugin load 时验证 manifest：

**语法 validation（syntax validation）：**

- 有效 JSON format
- 无 syntax errors
- Field types 正确

**Field 验证（field validation）：**

- `name` field 存在且 format 有效
- `version` 遵循 semantic versioning（如果存在）
- Paths 是带 `./` prefix 的 relative paths
- URLs 有效（如果存在）

**Component 验证（component validation）：**

- Referenced paths 存在
- Hook 和 MCP configurations 有效
- 无 circular dependencies

### 常见 validation errors（验证错误）

**无效 name format：**

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

**Absolute path（绝对 path）：**

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

**缺少 ./ prefix：**

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

**无效 version：**

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

## Minimal 与 complete 示例

### Minimal manifest（最小 manifest）

需要 manifest 时的最低配置：

```json
{
  "name": "hello-world"
}
```

完全依赖默认 directory discovery。

### 推荐 plugin

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

### 完整 plugin

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

## 最佳实践（best practices）

### Metadata（元数据）

1. **始终包含 version**：跟踪 changes 和 updates
2. **编写清晰 description**：帮助用户理解 plugin purpose
3. **提供联系信息**：支持 user support
4. **链接到 documentation**：降低 support burden
5. **选择合适 license**：匹配 project goals

### Paths（paths）

1. **能用 defaults 就用 defaults（Use defaults when possible）**：最小化 configuration
2. **按逻辑组织（Organize logically）**：将相关 components 分组
3. **记录 custom paths（Document custom paths）**：说明为什么使用 non-standard layout
4. **测试 path resolution（Test path resolution）**：在多个 systems 上验证

### 维护（maintenance）

1. **变更时提升 version（Bump version on changes）**：遵循 semantic versioning
2. **更新 keywords（Update keywords）**：反映 new functionality
3. **保持 description 当前有效（Keep description current）**：匹配 actual capabilities
4. **维护 changelog（Maintain changelog）**：跟踪 version history
5. **更新 repository links（Update repository links）**：保持 URLs 当前有效

### 分发（distribution）

1. **发布前补全 metadata（Complete metadata before publishing）**：填写所有 fields
2. **在 clean install 上测试（Test on clean install）**：验证 plugin 无需 dev environment 也能工作
3. **验证 manifest（Validate manifest）**：使用 validation tools
4. **包含 README（Include README）**：记录 installation 和 usage
5. **指定 license file（Specify license file）**：在 plugin root 中包含 LICENSE file
