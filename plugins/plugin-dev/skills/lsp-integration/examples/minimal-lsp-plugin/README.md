# Go LSP 插件示例

为 Claude Code 提供 Go language server 集成。

## 前置条件

安装 gopls（Go language server）：

```bash
go install golang.org/x/tools/gopls@latest
```

确认 `gopls` 在你的 PATH 中：

```bash
which gopls
```

## 安装

```bash
claude --plugin-dir /path/to/go-lsp
```

## 功能

安装后，Claude 可以使用受支持的 `gopls` capability：

- **诊断** - 服务器报告时提供类型错误和其他问题
- **跳转到定义** - 跳转到函数和类型的定义位置
- **查找引用** - 定位符号的使用位置
- **悬停信息** - 查看类型信息和文档

## 故障排查

如果你看到 "Executable not found in $PATH"：

1. 确认 gopls 已安装：`which gopls`
2. 将 Go bin 加入 PATH：`export PATH=$PATH:$(go env GOPATH)/bin`
3. 重启 Claude Code
