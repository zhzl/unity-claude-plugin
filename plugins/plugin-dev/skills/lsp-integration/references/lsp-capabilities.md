# LSP 协议 capability 一览

Language Server Protocol 的 capability 概览，以及它们能为 Claude Code 启用什么功能。

## 核心 capability

### 文本文档同步

说明客户端与服务器如何保持文档内容同步。

| 能力（capability）               | 说明                       |
| ------------------------ | -------------------------- |
| `textDocument/didOpen`   | 文档打开时通知服务器       |
| `textDocument/didChange` | 将文档变更发送给服务器     |
| `textDocument/didSave`   | 保存时通知服务器           |
| `textDocument/didClose`  | 文档关闭时通知服务器       |

### 诊断（Diagnostics）

由服务器推送的代码问题通知。

| 能力（capability）                        | 说明                    |
| --------------------------------- | ----------------------- |
| `textDocument/publishDiagnostics` | 接收错误、警告和提示    |

**诊断严重程度：**

- 错误 (1) - 编译错误、类型不匹配
- 警告 (2) - 未使用变量、已弃用 API
- 信息 (3) - 风格建议
- 提示 (4) - 轻量建议

## 导航 capability

### 跳转到定义

跳转到符号定义位置。

| 能力（capability）                    | 说明                                         |
| ----------------------------- | -------------------------------------------- |
| `textDocument/definition`     | 查找定义位置                                 |
| `textDocument/typeDefinition` | 查找类型定义                                 |
| `textDocument/implementation` | 查找接口实现                                 |
| `textDocument/declaration`    | 查找声明（如果与定义分离）                   |

### 查找引用

定位符号的所有使用位置。

| 能力（capability）                    | 说明                         |
| ----------------------------- | ---------------------------- |
| `textDocument/references`     | 查找符号的所有引用           |
| `callHierarchy/incomingCalls` | 查找函数的调用方             |
| `callHierarchy/outgoingCalls` | 查找函数调用的其他函数       |

### 符号信息

获取代码符号的相关信息。

| 能力（capability）                    | 说明                     |
| ----------------------------- | ------------------------ |
| `textDocument/hover`          | 获取文档与类型信息       |
| `textDocument/documentSymbol` | 列出文档中的符号         |
| `workspace/symbol`            | 在 workspace 中搜索符号  |
| `textDocument/signatureHelp`  | 获取函数签名信息         |

## 代码智能 capability

### 补全

| 能力（capability）                | 说明                    |
| ------------------------- | ----------------------- |
| `textDocument/completion` | 获取补全建议            |
| `completionItem/resolve`  | 获取额外补全详情        |

### Code Actions（代码操作）

| 能力（capability）                | 说明                       |
| ------------------------- | -------------------------- |
| `textDocument/codeAction` | 获取可用修复与重构操作     |
| `codeAction/resolve`      | 获取 code action 的完整编辑 |

### 重构

| 能力（capability）                     | 说明                    |
| ------------------------------ | ----------------------- |
| `textDocument/rename`          | 跨文件重命名符号        |
| `textDocument/prepareRename`   | 验证是否可执行重命名    |
| `textDocument/formatting`      | 格式化整个文档          |
| `textDocument/rangeFormatting` | 格式化选定范围          |

## Workspace 能力（capability）

| 能力（capability）                         | 说明                          |
| ---------------------------------- | ----------------------------- |
| `workspace/didChangeConfiguration` | 通知服务器设置已变更          |
| `workspace/didChangeWatchedFiles`  | 通知服务器文件系统已变更      |
| `workspace/applyEdit`              | 服务器请求客户端应用编辑      |

## 各服务器的 capability 支持情况

并非所有服务器都支持所有 capability。常见支持层级如下：

### 常见支持

- 诊断（Diagnostics）
- 跳转到定义（Go to definition）
- 查找引用（Find references）
- 悬停（Hover）
- 文档符号（Document symbols）
- 补全（Completions）

### 部分支持（因服务器而异）

- 重命名（Rename）
- 代码操作（Code actions）
- 调用层级（Call hierarchy）
- 类型层级（Type hierarchy）
- 格式化（Formatting）

### 支持有限（少数服务器）

- Semantic tokens（语义标记）
- Inlay hints（内嵌提示）
- Linked editing ranges（联动编辑范围）

## 检查服务器 capability

服务器会在初始化期间声明其支持的 capability。Claude Code 可以使用当前集成所暴露的可用功能。

要查看服务器支持什么，请检查服务器文档或 initialize 响应：

```json
{
  "capabilities": {
    "textDocumentSync": 2,
    "completionProvider": { "triggerCharacters": ["."] },
    "hoverProvider": true,
    "definitionProvider": true,
    "referencesProvider": true,
    "documentSymbolProvider": true,
    "renameProvider": true
  }
}
```

## Claude Code 用法

在可用时，Claude Code 可能会使用这些 capability：

1. **诊断** - 编辑后的错误检测
2. **定义** - 理解代码结构
3. **引用** - 为安全重构查找使用位置
4. **悬停** - 获取类型信息和文档
5. **文档符号** - 导航文件结构

相比单纯的文本搜索，这些能力还能提供更精确的代码理解。
