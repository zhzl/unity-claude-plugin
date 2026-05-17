# LSP 配置模式

可直接复制粘贴的 `.lsp.json` 配置，适用于常见场景。

## 最小配置

最简单的 LSP 配置示例：

```json
{
  "python": {
    "command": "pyright-langserver",
    "args": ["--stdio"],
    "extensionToLanguage": {
      ".py": "python"
    }
  }
}
```

## 多语言

在一个文件中配置多个 language server：

```json
{
  "python": {
    "command": "pyright-langserver",
    "args": ["--stdio"],
    "extensionToLanguage": {
      ".py": "python",
      ".pyi": "python"
    }
  },
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
```

## 搭配环境变量

向服务器传递环境变量：

```json
{
  "python": {
    "command": "pyright-langserver",
    "args": ["--stdio"],
    "extensionToLanguage": {
      ".py": "python"
    },
    "env": {
      "PYTHONPATH": "${CLAUDE_PLUGIN_ROOT}/lib",
      "VIRTUAL_ENV": "${CLAUDE_PLUGIN_ROOT}/.venv"
    }
  }
}
```

## 搭配 initializationOptions（初始化选项）

在服务器初始化期间传递选项：

```json
{
  "rust": {
    "command": "rust-analyzer",
    "extensionToLanguage": {
      ".rs": "rust"
    },
    "initializationOptions": {
      "cargo": {
        "buildScripts": {
          "enable": true
        }
      },
      "procMacro": {
        "enable": true
      }
    }
  }
}
```

## 搭配运行时设置

在初始化后传递 settings：

```json
{
  "typescript": {
    "command": "typescript-language-server",
    "args": ["--stdio"],
    "extensionToLanguage": {
      ".ts": "typescript"
    },
    "settings": {
      "typescript": {
        "inlayHints": {
          "parameterNames": {
            "enabled": "all"
          }
        }
      }
    }
  }
}
```

## 搭配超时与重启策略

配置服务器生命周期：

```json
{
  "java": {
    "command": "jdtls",
    "extensionToLanguage": {
      ".java": "java"
    },
    "startupTimeout": 60000,
    "shutdownTimeout": 5000,
    "restartOnCrash": true,
    "maxRestarts": 3
  }
}
```

## 捆绑服务器

引用随插件一起捆绑的服务器：

```json
{
  "custom": {
    "command": "${CLAUDE_PLUGIN_ROOT}/servers/my-lsp-server",
    "args": ["--stdio"],
    "extensionToLanguage": {
      ".custom": "custom-lang"
    },
    "env": {
      "CONFIG_PATH": "${CLAUDE_PLUGIN_ROOT}/config/server.json"
    }
  }
}
```

## 套接字传输

仅在高级场景中使用套接字，即 language server 文档明确说明支持套接字模式时。当前插件文档没有定义独立的 host/port 字段，也不会从 `args` 自动推断，因此不要将这里视为可直接复制粘贴的配置。除非 Claude Code 或服务器文档明确给出连接细节，否则优先使用 `stdio`。

```json
{
  "php": {
    "command": "intelephense",
    "args": ["...[server-specific socket startup args here]..."],
    "transport": "socket",
    "extensionToLanguage": {
      ".php": "php"
    }
  }
}
```

## 完整配置示例

将所有选项组合在一起：

```json
{
  "go": {
    "command": "gopls",
    "args": ["serve", "-rpc.trace"],
    "transport": "stdio",
    "extensionToLanguage": {
      ".go": "go",
      ".mod": "go.mod",
      ".sum": "go.sum"
    },
    "env": {
      "GOFLAGS": "-mod=vendor"
    },
    "initializationOptions": {
      "usePlaceholders": true,
      "completeUnimported": true
    },
    "settings": {
      "gopls": {
        "staticcheck": true,
        "analyses": {
          "unusedparams": true
        }
      }
    },
    "workspaceFolder": "${workspaceFolder}",
    "startupTimeout": 30000,
    "shutdownTimeout": 5000,
    "restartOnCrash": true,
    "maxRestarts": 5
  }
}
```

## 在 plugin.json 中内联

不使用单独的 `.lsp.json`，而是直接内联配置：

```json
{
  "name": "my-lsp-plugin",
  "version": "1.0.0",
  "description": "Language server integration",
  "lspServers": {
    "python": {
      "command": "pyright-langserver",
      "args": ["--stdio"],
      "extensionToLanguage": {
        ".py": "python"
      }
    }
  }
}
```

或者引用外部文件：

```json
{
  "name": "my-lsp-plugin",
  "version": "1.0.0",
  "description": "Language server integration",
  "lspServers": "./.lsp.json"
}
```
