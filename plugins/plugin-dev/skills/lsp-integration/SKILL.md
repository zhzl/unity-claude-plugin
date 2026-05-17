---
name: lsp-integration
description: 当用户要求 "add LSP server"、"configure language server"、"set up LSP in plugin"、"add code intelligence"、"integrate language server protocol"、"use pyright-lsp"、"use typescript-lsp"、"use rust-lsp"、"socket transport"、"initializationOptions"，提到 LSP servers，或讨论 extensionToLanguage 映射时应使用此技能。提供将 Language Server Protocol 服务器集成到 Claude Code plugins 中以增强代码智能的指导。
---

# Claude Code 插件的 LSP 集成

## 概览

Language Server Protocol (LSP) 服务器提供诸如跳转到定义、查找引用和悬停信息等代码智能功能。Claude Code plugins 可以捆绑或配置 LSP 服务器，以增强 Claude 对代码的理解。

**支持的 capability 会因服务器和 Claude Code 集成方式而异：**

- 在支持时启用跳转到定义以进行代码导航
- 在支持时查找符号的引用
- 在支持时获取悬停信息和文档
- 在暴露相关能力时支持补全、诊断等语言特定功能

## LSP 服务器配置

插件可以在插件清单中提供 LSP 服务器：

### 基础配置

```json
{
  "name": "my-plugin",
  "lspServers": {
    "python": {
      "command": "pyright-langserver",
      "args": ["--stdio"],
      "extensionToLanguage": {
        ".py": "python",
        ".pyi": "python"
      }
    }
  }
}
```

### 独立文件配置

LSP 服务器也可以配置在插件根目录下单独的 `.lsp.json` 文件中：

```json
{
  "go": {
    "command": "gopls",
    "args": ["serve"],
    "extensionToLanguage": {
      ".go": "go"
    }
  }
}
```

在 `plugin.json` 中引用该文件：

```json
{
  "name": "my-plugin",
  "lspServers": "./.lsp.json"
}
```

### 配置字段

**command**（必需）：LSP 服务器可执行文件

**args**（可选）：服务器的命令行参数

**extensionToLanguage**（必需）：将文件扩展名映射到语言 ID

```json
{
  "extensionToLanguage": {
    ".py": "python",
    ".pyi": "python",
    ".pyw": "python"
  }
}
```

**env**（可选）：服务器进程的环境变量

```json
{
  "env": {
    "PYTHONPATH": "${CLAUDE_PLUGIN_ROOT}/lib"
  }
}
```

**transport**（可选）：通信传输方式 - `stdio`（默认）或 `socket`

```json
{
  "lspServers": {
    "dart": {
      "transport": "socket",
      "command": "dart",
      "args": ["language-server", "...[server-specific connection args here]..."],
      "extensionToLanguage": { ".dart": "dart" }
    }
  }
}
```

套接字传输属于高级配置。当前插件文档没有定义独立的 host/port 字段，也不会从 `args` 中自动推断，因此不要将上面的示例视为可直接复制粘贴的有效配置。除非 Claude Code 或该 language server 的官方文档明确说明该服务器所需的 socket 连接细节，否则应优先使用默认的 `stdio` 传输。

**initializationOptions**（可选）：在 LSP 初始化期间传递给服务器的选项

```json
{
  "initializationOptions": {
    "typescript": {
      "tsdk": "./node_modules/typescript/lib"
    },
    "diagnostics": true,
    "formatting": { "tabSize": 2 }
  }
}
```

**settings**（可选）：通过 `workspace/didChangeConfiguration` 传递的设置

**workspaceFolder**（可选）：服务器的工作区文件夹路径

**startupTimeout**（可选）：等待服务器启动的最大时长（毫秒）

**shutdownTimeout**（可选）：等待优雅关闭的最大时长（毫秒）

**restartOnCrash**（可选）：服务器崩溃后是否自动重启

**maxRestarts**（可选）：放弃前的最大重启次数

## Claude 能从 LSP 获得什么

当安装了 LSP 插件、其 language server 二进制可用，并且 Claude Code 暴露了该服务器的 capability 时，Claude 就可以使用 LSP 进行诊断和导航。

### 诊断

受支持的服务器可以报告类型错误、缺失导入和语法问题等错误与警告。具体行为会因 language server 和项目配置而异，因此仍应保留编译和测试命令用于验证。

### 代码导航

根据服务器支持情况，Claude 可以使用 language server 来：

- 跳转到定义
- 查找符号引用
- 通过悬停获取类型信息
- 列出文件中的符号
- 查找接口实现
- 追踪调用层级

在可用时，这些操作能为 Claude 提供比基于 grep 的搜索更精确的导航能力。

## 预构建 LSP 插件

Claude Code 为常见语言提供了官方 LSP 插件。可从插件市场安装：

| 语言       | 插件                | 必需二进制                   |
| ---------- | ------------------- | ---------------------------- |
| C/C++      | `clangd-lsp`        | `clangd`                     |
| C#         | `csharp-lsp`        | `csharp-ls`                  |
| Go         | `gopls-lsp`         | `gopls`                      |
| Java       | `jdtls-lsp`         | `jdtls`                      |
| Kotlin     | `kotlin-lsp`        | `kotlin-language-server`     |
| Lua        | `lua-lsp`           | `lua-language-server`        |
| PHP        | `php-lsp`           | `intelephense`               |
| Python     | `pyright-lsp`       | `pyright-langserver`         |
| Rust       | `rust-analyzer-lsp` | `rust-analyzer`              |
| Swift      | `swift-lsp`         | `sourcekit-lsp`              |
| TypeScript | `typescript-lsp`    | `typescript-language-server` |

先安装 language server 二进制，再安装插件：

```bash
# Example: Python
pip install pyright  # or: npm install -g pyright
claude plugin install pyright-lsp
```

**故障排查**：如果你在 `/plugin` 的 Errors（错误）标签页中看到 `Executable not found in $PATH`，请先安装上表对应的必需二进制。

## 创建自定义 LSP 集成

### 第 1 步：选择或构建 LSP 服务器

可选方案：

1. **使用现有 LSP 服务器** - 大多数语言都有官方或社区服务器
2. **随插件一起捆绑** - 在插件中包含服务器二进制
3. **要求用户自行安装** - 在 README 文档中记录服务器安装方式

### 第 2 步：在 plugin.json 中配置

```json
{
  "name": "go-lsp",
  "version": "1.0.0",
  "description": "Go language server integration",
  "lspServers": {
    "go": {
      "command": "gopls",
      "args": ["serve"],
      "extensionToLanguage": {
        ".go": "go",
        ".mod": "go.mod"
      }
    }
  }
}
```

### 第 3 步：捆绑服务器（可选）

对于自包含插件，可以捆绑服务器：

```
my-lsp-plugin/
├── .claude-plugin/
│   └── plugin.json
└── servers/
    └── my-lsp-server
```

对命令路径使用 `${CLAUDE_PLUGIN_ROOT}`：

```json
{
  "lspServers": {
    "mylang": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/my-lsp-server",
      "args": ["--stdio"]
    }
  }
}
```

### 第 4 步：记录要求

在你的插件 README 中：

- 列出所需的外部依赖
- 提供安装说明
- 说明支持的语言版本
- 描述可用功能

## extensionToLanguage 映射

`extensionToLanguage` 字段将文件扩展名映射到 LSP language identifier：

### 常见映射

```json
{
  "extensionToLanguage": {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".jsx": "javascriptreact",
    ".tsx": "typescriptreact",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".rb": "ruby",
    ".php": "php",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp"
  }
}
```

### 多扩展名

同一种语言可以对应多个扩展名：

```json
{
  "extensionToLanguage": {
    ".ts": "typescript",
    ".mts": "typescript",
    ".cts": "typescript",
    ".d.ts": "typescript"
  }
}
```

## LSP 服务器生命周期

### 启动

LSP 服务器会在以下情况下自动启动：

1. Claude Code 会话开始
2. 启用了带 LSP 服务器的插件
3. 用户打开了匹配已配置扩展名的文件

### 通信

- 使用 stdio 进行客户端与服务器通信
- 遵循 LSP 规范传递消息
- 由 Claude Code 管理连接

### 关闭

服务器会在以下情况下终止：

- Claude Code 会话结束
- Plugin 被禁用
- 服务器崩溃（可能会自动重启）

## 最佳实践

### 性能

1. **延迟初始化** - 服务器在需要时启动，而不是在会话开始时启动
2. **最小化配置** - 仅启用你需要的功能
3. **资源限制** - 考虑服务器对内存/CPU 的影响

### 兼容性

1. **检查 LSP 版本** - 确保服务器支持所需的协议版本
2. **跨平台测试** - 在 macOS、Linux、Windows 上验证
3. **处理缺失服务器** - 如果服务器未安装，应优雅降级

### 文档

1. **列出前置条件** - 所需外部工具与版本
2. **提供设置指南** - 分步安装说明
3. **记录功能** - 说明支持哪些 LSP capability

## 故障排查

### 服务器未启动

**检查：**

- 命令路径是否正确
- 服务器是否已安装且可执行
- 所需依赖是否可用
- 对捆绑服务器是否使用了 `${CLAUDE_PLUGIN_ROOT}`

### 没有代码智能

**检查：**

- 文件扩展名是否匹配 `extensionToLanguage` 映射
- language ID 是否对该服务器正确
- 服务器是否支持所请求的功能

### 调试模式

启用调试日志：

```bash
claude --debug
```

关注以下内容：

- LSP server 启动消息
- 通信日志
- 错误响应

## 快速参考

### 最小 LSP 配置

```json
{
  "lspServers": {
    "language": {
      "command": "server-command",
      "extensionToLanguage": {
        ".ext": "language-id"
      }
    }
  }
}
```

### 完整 LSP 配置

```json
{
  "lspServers": {
    "language": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/lsp-server",
      "args": ["--stdio", "--log-level", "warn"],
      "extensionToLanguage": {
        ".ext1": "language",
        ".ext2": "language"
      },
      "env": {
        "CONFIG_PATH": "${CLAUDE_PLUGIN_ROOT}/config"
      },
      "transport": "stdio",
      "initializationOptions": {},
      "settings": {},
      "workspaceFolder": ".",
      "startupTimeout": 10000,
      "shutdownTimeout": 5000,
      "restartOnCrash": true,
      "maxRestarts": 3
    }
  }
}
```

### 最佳实践摘要

**要做：**

- 对捆绑服务器路径使用 `${CLAUDE_PLUGIN_ROOT}`
- 映射所有相关文件扩展名
- 记录外部依赖
- 在多个平台上测试
- 优雅处理服务器不可用情况

**不要做：**

- 硬编码绝对路径
- 假设服务器已预装
- 未经权衡就捆绑大型二进制
- 忽略服务器启动错误

## 额外资源

### 参考文件

如需详细信息，可参阅：

- **`references/popular-lsp-servers.md`** - 按语言整理的 LSP server 精选列表，包含安装命令
- **`references/lsp-capabilities.md`** - LSP 协议 capability 及其可启用的功能

### 示例

- **`examples/minimal-lsp-plugin/`** - 最小 LSP 插件的完整目录结构
- **`examples/lsp-json-configs.md`** - 各种 `.lsp.json` 配置模式

### 外部资源

- **LSP 规范**: <https://microsoft.github.io/language-server-protocol/>
- **Claude Code 插件参考**: <https://code.claude.com/docs/en/plugins-reference>
- **Language Server 列表**: <https://langserver.org/>
