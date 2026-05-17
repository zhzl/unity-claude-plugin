# Hook 开发辅助脚本

这些脚本可帮助你在部署前验证、测试并 lint hook 实现。

## validate-hook-schema.sh

验证 `hooks.json` 配置文件的结构是否正确，并检查常见问题。

**Usage:**

```bash
./validate-hook-schema.sh path/to/hooks.json
```

**Checks:**

- JSON 语法是否有效
- 必需字段是否存在
- hook 事件名是否有效
- hook 类型是否正确（command/prompt）
- timeout 值是否在有效范围内
- 是否存在硬编码路径
- prompt hook 与事件是否兼容

**Example:**

```bash
cd my-plugin
./validate-hook-schema.sh hooks/hooks.json
```

## test-hook.sh

在部署到 Claude Code 之前，使用示例输入测试单个 hook 脚本。

**Usage:**

```bash
./test-hook.sh [options] <hook-script> <test-input.json>
```

**Options:**

- `-v, --verbose` - 显示详细执行信息
- `-t, --timeout N` - 设置超时时间（秒，默认：60）
- `--create-sample <event-type>` - 生成示例测试输入

**Example:**

```bash
# Create sample test input
./test-hook.sh --create-sample PreToolUse > test-input.json

# Test a hook script
./test-hook.sh my-hook.sh test-input.json

# Test with verbose output and custom timeout
./test-hook.sh -v -t 30 my-hook.sh test-input.json
```

**Features:**

- 自动设置正确的环境变量（CLAUDE_PROJECT_DIR、CLAUDE_PLUGIN_ROOT）
- 统计执行时间
- 验证输出 JSON
- 显示 exit code 及其含义
- 捕获环境文件输出

## hook-linter.sh

检查 hook 脚本中的常见问题与最佳实践违规。

**Usage:**

```bash
./hook-linter.sh <hook-script.sh> [hook-script2.sh ...]
```

**Checks:**

- 是否包含 shebang
- 是否使用 `set -euo pipefail`
- 是否读取 stdin 输入
- 是否有正确的错误处理
- 变量是否加引号（防注入）
- 是否正确使用 exit code
- 是否存在硬编码路径
- 是否包含长时间运行代码
- 错误是否输出到 stderr
- 是否进行输入验证

**Example:**

```bash
# Lint single script
./hook-linter.sh ../examples/validate-write.sh

# Lint multiple scripts
./hook-linter.sh ../examples/*.sh
```

## 典型工作流

1. **编写你的 hook 脚本**

   ```bash
   vim my-plugin/scripts/my-hook.sh
   ```

2. **Lint 脚本**

   ```bash
   ./hook-linter.sh my-plugin/scripts/my-hook.sh
   ```

3. **创建测试输入**

   ```bash
   ./test-hook.sh --create-sample PreToolUse > test-input.json
   # Edit test-input.json as needed
   ```

4. **测试 hook**

   ```bash
   ./test-hook.sh -v my-plugin/scripts/my-hook.sh test-input.json
   ```

5. **加入 hooks.json**

   ```bash
   # Edit my-plugin/hooks/hooks.json
   ```

6. **校验配置**

   ```bash
   ./validate-hook-schema.sh my-plugin/hooks/hooks.json
   ```

7. **在 Claude Code 中测试**
   ```bash
   claude --debug
   ```

## 提示

- 部署前始终测试 hooks，避免破坏用户工作流
- 使用 verbose mode（`-v`）调试 hook 行为
- 查看 linter 输出中的安全和最佳实践问题
- 任何修改后都校验 hooks.json
- 为不同场景创建不同测试输入（安全操作、危险操作、边界情况）

## 常见问题

### Hook 没有执行

检查：

- 脚本是否有 shebang（`#!/bin/bash`）
- 脚本是否可执行（`chmod +x`）
- hooks.json 中的路径是否正确（使用 `${CLAUDE_PLUGIN_ROOT}`）

### Hook 超时

- 降低 hooks.json 中的 timeout
- 优化 hook 脚本性能
- 移除长时间运行的操作

### Hook 静默失败

- 检查 exit code（应为 0 或 2）
- 确保错误输出到 stderr（`>&2`）
- 验证 JSON 输出结构

### 注入漏洞

- 始终为变量加引号：`"$variable"`
- 使用 `set -euo pipefail`
- 校验所有输入字段
- 运行 linter 发现问题
