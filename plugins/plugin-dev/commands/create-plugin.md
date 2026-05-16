---
description: 使用 guided 8-phase workflow 创建 plugin
argument-hint: "[plugin-description]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(mkdir *), Bash(git init *), TaskCreate, TaskGet, TaskUpdate, TaskList, AskUserQuestion, Skill, Agent
model: sonnet
---

# 插件（Plugin）创建工作流

引导用户从最初构想到经过测试的完整实现，创建一个完整、高质量的 Claude Code plugin。遵循系统化方法：理解需求、设计组件、澄清细节、按最佳实践实现、验证并测试。

## 核心原则

- **提出澄清问题**：识别关于 plugin 目的、触发方式、范围和组件的所有歧义。提出具体、明确的问题，而不是做假设。继续实现前先等待用户回答。
- **加载相关 skills**：在需要时使用 Skill 工具加载 plugin-dev skills（plugin-structure、hook-development、agent-development 等）
- **使用专门的 agents**：利用 agent-creator、plugin-validator 和 skill-reviewer agents 进行 AI 辅助开发
- **遵循最佳实践**：参考 plugin-dev 自身实现中的模式
- **渐进式披露**：创建精简的 skills，并辅以 references/examples
- **使用 Task tools**：在所有阶段使用 TaskCreate、TaskUpdate 和 TaskList 跟踪全部进度

**初始请求：** $ARGUMENTS

**安全说明：** 此 workflow 具有较广的文件系统访问权限，可用于创建 plugin 结构。它可以在你的权限范围内写入文件并创建目录。开始前请检查目标目录，详情参见 [docs/workflow-security.md](../docs/workflow-security.md)。

---

## 第 1 阶段（Phase 1）：发现与需求澄清

**目标**：理解需要构建什么 plugin，以及它要解决什么问题

**操作**：

1. 创建包含全部 8 个阶段的任务列表
2. 如果从参数中已经可以明确 plugin 的用途：
   - 总结你的理解
   - 识别 plugin 类型（integration、workflow、analysis、toolkit 等）
3. 如果 plugin 用途不清晰，向用户提问：
   - 这个 plugin 要解决什么问题？
   - 谁会在什么场景下使用它？
   - 它应该做什么？
   - 是否有类似插件可供参考？
4. 总结理解，并在继续前与用户确认

**输出**：对 plugin 用途和目标用户的清晰说明

---

## 第 2 阶段（Phase 2）：组件规划

**目标**：确定需要哪些 plugin 组件

**在进入此阶段前，必须使用 Skill 工具加载 plugin-structure skill。**

**操作**：

1. 加载 plugin-structure skill 以理解组件类型
2. 分析 plugin 需求并确定所需组件：
   - **技能（Skills）**：是否需要专门知识？（hooks API、MCP 模式等）
   - **命令（Commands）**：是否需要用户主动触发的操作？（deploy、configure、analyze）
   - **Agents**：是否需要自主任务？（validation、generation、analysis）
   - **Hooks**：是否需要事件驱动自动化？（validation、notifications）
   - **MCP**：是否需要外部服务集成？（databases、APIs）
   - **LSP**：是否需要代码智能？（go-to-definition、find references）
   - **设置（Settings）**：是否需要用户配置？（.local.md files）
3. 对每种所需组件类型，明确：
   - 每种类型需要多少个
   - 每个组件负责什么
   - 大致的触发/使用模式
4. 以表格形式向用户展示组件规划：
   ```
   | Component Type | Count | Purpose |
   |----------------|-------|---------|
   | Skills         | 2     | Hook patterns, MCP usage |
   | Commands       | 3     | Deploy, configure, validate |
   | Agents         | 1     | Autonomous validation |
   | Hooks          | 0     | Not needed |
   | MCP            | 1     | Database integration |
   ```
5. 获取用户确认或调整意见

**输出**：已确认的待创建组件列表

---

## 第 3 阶段（Phase 3）：详细设计与澄清问题

**目标**：详细定义每个组件，并解决所有歧义

**关键要求**：这是最重要的阶段之一。不要跳过。

**操作**：

1. 对规划中的每个组件，识别尚未明确的方面：
   - **Skills**：什么会触发它们？它们提供什么知识？需要多详细？
   - **Commands**：需要哪些参数？哪些工具？交互式还是自动化？
   - **Agents**：何时触发（主动/被动）？需要哪些工具？输出格式是什么？
   - **Hooks**：哪些事件？基于 prompt 还是 command？验证标准是什么？
   - **MCP**：需要什么 server 类型？如何认证？有哪些工具？
   - **Settings**：有哪些字段？哪些必填、哪些可选？默认值是什么？

2. **按结构化分组向用户提出所有问题**（每种组件类型一个分组）

3. **在进入实现前等待用户回答**

4. 如果用户说“你觉得怎么最好就怎么做”，请给出具体建议，并获取明确确认

**技能示例问题**：

- 哪些具体的用户提问应触发这个 skill？
- 它是否应包含 utility scripts？需要什么功能？
- 核心 SKILL.md 与 references/ 之间的详细程度如何分配？
- 是否需要包含真实世界示例？

**agent 示例问题**：

- 这个 agent 应该在特定操作后主动触发，还是只在明确请求时触发？
- 它需要哪些工具（Read、Write、Bash 等）？
- 输出格式应该是什么？
- 是否有需要强制执行的特定质量标准？

**输出**：每个组件的详细规格说明

---

## 第 4 阶段（Phase 4）：插件结构创建

**目标**：创建 plugin 目录结构和 manifest

**操作**：

1. 确定 plugin 名称（kebab-case，且具有描述性）
2. 选择 plugin 位置：
   - 询问用户："我应该在哪里创建这个 plugin？"
   - 提供选项：当前目录、../new-plugin-name、自定义路径
3. 使用 bash 创建目录结构：
   ```bash
   mkdir -p plugin-name/.claude-plugin
   mkdir -p plugin-name/skills     # if needed
   mkdir -p plugin-name/commands   # if needed
   mkdir -p plugin-name/agents     # if needed
   mkdir -p plugin-name/hooks      # if needed
   ```
4. 使用 Write 工具创建 plugin.json manifest：
   ```json
   {
     "name": "plugin-name",
     "version": "0.1.0",
     "description": "[brief description]",
     "author": {
       "name": "[author from user or default]"
     }
   }
   ```

   只有用户提供了 `author.email` 时才添加该字段；如果未知，则省略这个可选字段。
5. 创建 README.md 模板
6. 如有需要，创建 .gitignore（用于 .claude/*.local.md 等）
7. 如果是在新目录中创建，则初始化 git 仓库（仅允许 `git init`；额外的 git 操作如暂存和提交应留给用户在 workflow 完成后自行执行，以尊重其提交偏好）

**输出**：plugin 目录结构已创建，并可用于添加组件

**workflow 结束后的 git 操作**（用户可在完成后自行运行）：

```bash
git status --short
git add path/to/plugin/.claude-plugin/plugin.json path/to/plugin/README.md
git commit -m "feat: initial plugin structure"
```

只暂存新 plugin 中明确指定的路径；不要使用宽泛的暂存方式。

---

## 第 5 阶段（Phase 5）：组件实现

**目标**：按最佳实践创建每个组件

**在实现每种组件类型前加载相关 skills：**

- Skills：加载 skill-development skill
- Commands：加载 command-development skill
- Agents：加载 agent-development skill
- Hooks：加载 hook-development skill
- MCP：加载 mcp-integration skill
- LSP：加载 lsp-integration skill
- Settings：加载 plugin-settings skill

**针对每种组件的操作**：

### 对于技能（Skills）

1. 使用 Skill 工具加载 skill-development skill
2. 对每个 skill：
   - 询问用户具体的使用示例（或使用 Phase 3 中的信息）
   - 规划资源（scripts/、references/、examples/）
   - 创建 skill 目录结构
   - 编写 SKILL.md，要求：
     - 使用第三人称描述，并包含具体触发短语
     - 正文精简（1,500-2,000 words），使用祈使句
     - 引用配套支持文件
   - 为详细内容创建 reference files
   - 为可运行代码创建 example files
   - 如有需要，创建 utility scripts
3. 使用 skill-reviewer agent 验证每个 skill

### 对于命令（Commands）

1. 使用 Skill 工具加载 command-development skill
2. 对每个 command：
   - 编写带 frontmatter 的 command markdown
   - 包含清晰的 description 和 argument-hint
   - 指定 allowed-tools（最小必要集）
   - 为 Claude 编写指令，而不是写给用户
   - 提供 usage examples 和 tips
   - 如适用，引用相关 skills

### 对于智能体（Agents）

1. 使用 Skill 工具加载 agent-development skill
2. 对每个 agent，使用 agent-creator agent：
   - 提供该 agent 应完成工作的描述
   - 由 agent-creator 生成：identifier、whenToUse 示例、systemPrompt
   - 创建带 frontmatter 和 system prompt 的 agent markdown 文件
   - 添加合适的 model、color 和 tools
   - 使用 plugin-validator agent 验证

### 对于钩子（Hooks）

1. 使用 Skill 工具加载 hook-development skill
2. 对每个 hook：
   - 创建 hooks/hooks.json 并写入 hook 配置
   - 对复杂逻辑优先使用基于 prompt 的 hooks
   - 使用 ${CLAUDE_PLUGIN_ROOT} 以提高可移植性
   - 在插件自有的 scripts 或 hooks 目录中创建可运行 hook 脚本；examples/ 仅用于复制粘贴示例
   - 使用 plugin-validator agent 验证（其会处理 hook schema validation）

### 对于 MCP 集成

1. 使用 Skill 工具加载 mcp-integration skill
2. 创建 .mcp.json 配置，包含：
   - Server 类型（本地使用 stdio，托管使用 SSE）
   - Command 和 args（带 ${CLAUDE_PLUGIN_ROOT}）
   - 必要的环境变量
3. 在 README 中记录所需 env vars
4. 提供 setup instructions

### 对于 LSP 集成

1. 使用 Skill 工具加载 lsp-integration skill
2. 向 plugin.json 添加 lspServers 配置：
   - Server command 和 args
   - extensionToLanguage 映射
   - 必要的环境变量
3. 如果是自包含方案，则打包 LSP server binary
4. 否则在 README 中记录外部 server 安装方式
5. 使用与所配置扩展名匹配的语言文件进行测试

### 对于设置（Settings）

1. 使用 Skill 工具加载 plugin-settings skill
2. 在 README 中创建 settings 模板
3. 创建示例 `.claude/plugin-name.local.md` 文件（作为文档）
4. 视需要在 hooks/commands 中实现 settings 读取
5. 添加到 .gitignore：`.claude/*.local.md`

**进度跟踪**：在每个组件完成后更新任务

**输出**：所有 plugin 组件均已实现

---

## 第 6 阶段（Phase 6）：校验与质量检查

**目标**：确保 plugin 符合质量标准并能正常工作

**操作**：

1. **运行 plugin-validator agent**：
   - 使用 plugin-validator agent 对 plugin 进行全面验证
   - 检查：manifest、structure、naming、components、security
   - 审阅验证报告

2. **修复关键问题**：
   - 处理验证中的关键错误
   - 修复那些代表真实问题的警告

3. **使用 skill-reviewer 复查**（如果 plugin 包含 skills）：
   - 对每个 skill 使用 skill-reviewer agent
   - 检查 description 质量、渐进式披露和写作风格
   - 应用建议

4. **测试 agent 触发**（如果 plugin 包含 agents）：
   - 对每个 agent，确认 <example> 块足够清晰
   - 检查触发条件是否具体
   - 通过 plugin-validator agent 再次验证

5. **测试 hook 配置**（如果 plugin 包含 hooks）：
   - 通过 plugin-validator agent 验证（检查 hook schema 和脚本）
   - 验证 ${CLAUDE_PLUGIN_ROOT} 的使用

6. **呈现发现**：
   - 验证结果摘要
   - 任何仍然存在的问题
   - 整体质量评估

7. **询问用户**："验证已完成。发现的问题： [count critical] 个严重问题、[count warnings] 个警告。你希望我现在修复它们，还是继续进入测试？"

**输出**：plugin 已验证，可进入测试

---

## 第 7 阶段（Phase 7）：测试与验证

**目标**：测试 plugin 在 Claude Code 中能否正确工作

**操作**：

1. **安装说明**：
   - 向用户展示如何本地测试：
     ```bash
     claude --plugin-dir /path/to/plugin-name
     ```
   - 或复制到 `.claude-plugin/` 以进行项目测试

2. **供用户执行的验证清单**：
   - [ ] Skills 会在触发时加载（使用触发短语提问）
   - [ ] Commands 会出现在 `/help` 中并正确执行
   - [ ] Agents 会在合适场景下触发
   - [ ] Hooks 会在事件发生时激活（如适用）
   - [ ] MCP servers 能成功连接（如适用）
   - [ ] Settings files 能正常工作（如适用）

3. **测试建议**：
   - 对 skills：使用 description 中的触发短语进行提问
   - 对 commands：用不同参数运行 `/plugin-name:command-name`
   - 对 agents：创建与 agent 示例匹配的场景
   - 对 hooks：使用 `claude --debug` 查看 hook 执行情况
   - 对 MCP：使用 `/mcp` 验证 servers 和 tools

4. **询问用户**："我已经为这个 plugin 做好了测试准备。你希望我带你逐项测试每个组件，还是你想自己测试？"

5. **如果用户需要引导**，则通过具体测试用例逐项带他们完成测试

**输出**：plugin 已测试并验证可正常工作

---

## 第 8 阶段（Phase 8）：文档整理与后续步骤

**目标**：确保 plugin 文档完善，并可准备分发

**操作**：

1. **验证 README 完整性**：
   - 检查 README 是否包含：overview、features、installation、prerequisites、usage
   - 对 MCP plugins：记录所需环境变量
   - 对 hook plugins：说明 hook 激活方式
   - 对 settings：提供配置模板

2. **询问是否发布到 marketplace**：
   - 询问用户："你想把这个 plugin 发布到 marketplace 吗？"
   - 如果是，则继续进行 marketplace 集成
   - 如果否，则跳到第 4 步

3. **Marketplace 集成**（如果要发布）：
   - 使用 Skill 工具加载 marketplace-structure skill
   - 确定目标 marketplace：
     - 询问："要使用哪个 marketplace？（现有 marketplace 路径、创建新的，或跳过）"
   - 如果是现有 marketplace：
     - 读取 marketplace.json
     - 起草 plugin entry：

       ```json
       {
         "name": "[plugin-name]",
         "source": "[relative-path-or-github]",
         "description": "[from plugin.json]",
         "version": "[from plugin.json]",
         "category": "[suggest based on plugin type]"
       }
       ```

     - 显示 marketplace.json 添加前后的 diff
     - 请求用户确认该条目
     - 用新的 plugin entry 更新 marketplace.json
     - 更新 marketplace metadata.version（补丁版本递增）

   - 如果要创建新的 marketplace：
     - 建议使用 `/plugin-dev:create-marketplace` command
     - 或创建最小化 marketplace.json，并将该 plugin 作为首个条目
   - 在更新后使用 plugin-validator agent 验证 marketplace

4. **创建总结**：
   - 将所有任务标记为完成
   - 列出已创建内容：
     - Plugin 名称和用途
     - 已创建的组件（X 个 skills、Y 个 commands、Z 个 agents 等）
     - 关键文件及其用途
     - 文件总数和目录结构
   - 如果已添加到 marketplace：
     - Marketplace 名称和位置
     - Plugin entry 详情
   - 后续步骤：
     - 测试建议
     - 发布到 marketplace（如果尚未完成）
     - 基于实际使用继续迭代

5. **建议改进项**（可选）：
   - 可增强 plugin 的额外组件
   - 集成机会
   - 测试策略

**输出**：完整、文档齐全的 plugin 已可使用或发布

---

## 重要说明

### 在所有阶段中

- **使用 Task tools** 在每个阶段跟踪进度（TaskCreate、TaskUpdate、TaskList）
- **使用 Skill 工具加载 skills**，在处理特定组件类型时调用
- **使用专门的 agents**（agent-creator、plugin-validator、skill-reviewer）
- **在关键决策点请求用户确认**
- **参考 plugin-dev 自身的模式**
- **应用最佳实践**：
  - skills 使用第三人称 description
  - skill 正文使用祈使句
  - commands 写给 Claude，而不是写给用户
  - 强触发短语
  - 使用 ${CLAUDE_PLUGIN_ROOT} 以提高可移植性
  - 渐进式披露
  - 安全优先（HTTPS、不要硬编码凭据）

### 关键决策点（等待用户）

1. Phase 1 之后：确认 plugin 用途
2. Phase 2 之后：批准组件规划
3. Phase 3 之后：继续进入实现
4. Phase 6 之后：修复问题或继续
5. Phase 7 之后：继续进入文档整理

### 按阶段需要加载的技能（Skills）

- **Phase 2**：plugin-structure
- **Phase 5**：skill-development、command-development、agent-development、hook-development、mcp-integration、lsp-integration、plugin-settings（按需）
- **Phase 6**：（agents 会自动使用 skills）
- **Phase 8**：marketplace-structure（如果要发布到 marketplace）

### 质量标准

每个组件都必须满足以下标准：

- ✅ 遵循 plugin-dev 已验证有效的模式
- ✅ 使用正确的命名约定
- ✅ 具备强触发条件（skills/agents）
- ✅ 包含可运行示例
- ✅ 记录完善
- ✅ 已通过工具验证
- ✅ 已在 Claude Code 中测试

---

## 示例工作流

### 用户请求

"创建一个用于管理数据库迁移的 plugin"

### 第 1 阶段（Phase 1）：发现与需求澄清

- 理解：迁移管理、数据库 schema 版本管理
- 确认：用户想创建、运行并回滚 migrations

### 第 2 阶段（Phase 2）：组件规划

- Skills：1 个（migration 最佳实践）
- Commands：3 个（create-migration、run-migrations、rollback）
- Agents：1 个（migration-validator）
- MCP：1 个（database connection）

### 第 3 阶段（Phase 3）：澄清问题

- 支持哪些数据库？（PostgreSQL、MySQL 等）
- migration 文件格式是什么？（SQL、代码式？）
- agent 是否应在应用前先执行验证？
- 需要哪些 MCP tools？（query、execute、schema）

### 第 4-8 阶段（Phase 4-8）：实现、校验、测试与文档整理

---

从 Phase 1：发现与需求澄清 开始。
