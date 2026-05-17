# 按语言分类的热门 LSP 服务器

面向常见编程语言的推荐 Language Server Protocol 服务器精选列表。

## 官方/推荐服务器

### Python

#### Pyright（推荐）

- 快速、功能完整的类型检查器
- 命令： `pyright-langserver --stdio`
- 安装： `npm install -g pyright`

```json
{
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

#### Pylsp（替代方案）

- 基于插件，扩展性强
- 命令： `pylsp`
- 安装： `pip install python-lsp-server`

### TypeScript/JavaScript

#### TypeScript Language Server（推荐）

- 官方 TypeScript 服务器
- 命令： `typescript-language-server --stdio`
- 安装： `npm install -g typescript-language-server typescript`

```json
{
  "lspServers": {
    "typescript": {
      "command": "typescript-language-server",
      "args": ["--stdio"],
      "extensionToLanguage": {
        ".ts": "typescript",
        ".tsx": "typescriptreact",
        ".js": "javascript",
        ".jsx": "javascriptreact"
      }
    }
  }
}
```

### Rust

#### rust-analyzer（推荐）

- 官方 Rust language server
- 命令： `rust-analyzer`
- 安装： `rustup component add rust-analyzer`

```json
{
  "lspServers": {
    "rust": {
      "command": "rust-analyzer",
      "extensionToLanguage": {
        ".rs": "rust"
      }
    }
  }
}
```

### Go

#### gopls（官方）

- 官方 Go 语言服务器
- 命令： `gopls serve`
- 安装： `go install golang.org/x/tools/gopls@latest`

```json
{
  "lspServers": {
    "go": {
      "command": "gopls",
      "args": ["serve"],
      "extensionToLanguage": {
        ".go": "go"
      }
    }
  }
}
```

### Java

#### Eclipse JDT Language Server

- 功能完整的 Java 服务器
- 命令： 取决于安装方式
- 安装： 从 Eclipse 下载

#### jdtls（封装器）

- 更简化的 jdtls 封装器
- 安装： 使用包管理器或手动安装

### C/C++

#### clangd（推荐）

- 基于 LLVM，速度快
- 命令： `clangd`
- 安装：LLVM/Clang 的一部分

```json
{
  "lspServers": {
    "cpp": {
      "command": "clangd",
      "extensionToLanguage": {
        ".c": "c",
        ".cpp": "cpp",
        ".cc": "cpp",
        ".h": "c",
        ".hpp": "cpp"
      }
    }
  }
}
```

### C\#

#### csharp-ls

- .NET/C# 语言服务器
- 命令： `csharp-ls`
- 安装： `dotnet tool install -g csharp-ls`

### Ruby

#### Solargraph

- Ruby language server
- 命令： `solargraph stdio`
- 安装： `gem install solargraph`

```json
{
  "lspServers": {
    "ruby": {
      "command": "solargraph",
      "args": ["stdio"],
      "extensionToLanguage": {
        ".rb": "ruby",
        ".rake": "ruby"
      }
    }
  }
}
```

### PHP

#### Intelephense

- 高性能 PHP 服务器
- 命令： `intelephense --stdio`
- 安装： `npm install -g intelephense`

#### Phpactor

- 偏向 Vim，且可扩展
- 命令： `phpactor language-server`
- 安装： 通过 Composer 安装

## Web 技术

### HTML/CSS

#### vscode-html-languageserver

- 提供 HTML language server 功能
- 命令： `html-languageserver --stdio`
- 安装： `npm install -g vscode-langservers-extracted`

#### vscode-css-languageserver

- 支持 CSS/SCSS/Less
- 命令： `css-languageserver --stdio`
- 安装： `npm install -g vscode-langservers-extracted`

### JSON

#### vscode-json-languageserver

- 支持 schema 的 JSON 服务器
- 命令： `json-languageserver --stdio`
- 安装： `npm install -g vscode-langservers-extracted`

### YAML

#### yaml-language-server

- 支持 schema 的 YAML 服务器
- 命令： `yaml-language-server --stdio`
- 安装： `npm install -g yaml-language-server`

## 其他语言

### Lua

#### lua-language-server

- 完整 Lua 支持
- 安装：GitHub 发布页面或包管理器

### Kotlin

#### kotlin-language-server

- Kotlin 支持
- 安装：GitHub 发布页面

### Swift

#### sourcekit-lsp

- 官方 Swift 服务器
- 属于 Swift 工具链的一部分

### Elixir

#### elixir-ls

- Elixir/Phoenix 支持
- 安装：GitHub 发布页面

### Haskell

#### haskell-language-server

- 完整 Haskell 支持
- 安装： `ghcup install hls`

## 安装验证

测试服务器是否正常工作：

```bash
# Check if command exists
which <server-command>

# Check version
<server-command> --version

# Test stdio mode with a real LSP test harness or client.
# Raw echo is not enough: LSP stdio messages must include Content-Length framing.
# Example harnesses: a small script that writes framed JSON-RPC, the editor/client you will use, or the plugin's integration test runner.
```
