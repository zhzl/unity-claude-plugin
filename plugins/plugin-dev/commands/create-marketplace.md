---
description: 使用引导式工作流创建 plugin marketplace
argument-hint: "[marketplace-description]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(mkdir *), Bash(git init *), TaskCreate, TaskGet, TaskUpdate, TaskList, AskUserQuestion, Skill, Agent
model: sonnet
---

# 插件市场（Marketplace）创建工作流

引导用户从初始概念开始，创建一个完整的 plugin marketplace，并最终形成经过验证、可分发的集合。遵循系统化方法：理解需求、规划插件、配置结构、添加条目、验证，并为分发做好准备。

## 核心原则

- **提出澄清问题**：识别关于 marketplace 目的、插件和分发策略的所有歧义。提出具体问题，而不是做假设。在继续之前等待用户回答。
- **加载 marketplace-structure skill**：使用 Skill 工具加载 marketplace-structure skill，以获取 schema 和模式指导
- **使用 plugin-validator agent**：利用 plugin-validator agent 对 marketplace 进行全面验证
- **遵循最佳实践**：参考本仓库自身 marketplace.json 的模式
- **使用 Task tools**：在所有阶段使用 TaskCreate、TaskUpdate 和 TaskList 跟踪全部进度

**初始请求：** $ARGUMENTS

**安全说明：** 此 workflow 具有较广的文件系统访问权限，可用于创建 marketplace 结构。它可以在你的权限范围内写入文件并创建目录。开始前请检查目标目录，详情参见 [docs/workflow-security.md](../docs/workflow-security.md)。

---

## 第 1 阶段（Phase 1）：发现与需求澄清

**目标**：理解需要创建什么 marketplace，以及它的用途

**操作**：

1. 创建包含全部 8 个阶段的任务列表
2. 如果从参数中已经可以明确 marketplace 的用途：
   - 总结你的理解
   - 识别 marketplace 类型（团队内部、社区、单插件、多插件）
3. 如果 marketplace 用途不清晰，向用户提问：
   - 这个 marketplace 会包含哪些插件？
   - 目标受众是谁？（团队、社区、公开）
   - 插件会是本地的（同仓库）还是外部的（GitHub、git URL）？
   - 由单个维护者维护，还是接受社区贡献？
4. 总结理解，并在继续前与用户确认

**输出**：关于 marketplace 用途和分发策略的清晰说明

---

## 第 2 阶段（Phase 2）：插件规划

**目标**：确定要包含哪些插件及其来源

**在进入此阶段前，必须使用 Skill 工具加载 marketplace-structure skill。**

**操作**：

1. 加载 marketplace-structure skill 以获得 schema 指导
2. 列出要纳入 marketplace 的插件：
   - 对每个插件，记录名称、来源类型和简要描述
3. 按来源类型分类：
   - **本地（Local / relative path）**：在同一仓库中维护的插件
   - **GitHub**：托管在 GitHub 上的外部插件
   - **Git URL（仓库地址）**：托管在 GitLab、Bitbucket 或自建服务上的外部插件
4. 以表格形式向用户展示插件规划：

   ```text
   | Plugin Name      | Source Type | Description            |
   |------------------|-------------|------------------------|
   | code-formatter   | local       | Code formatting tools  |
   | security-scanner | github      | Security analysis      |
   | legacy-tool      | git-url     | Legacy utility         |
   ```

5. 对每个本地插件，确定：
   - 它是否已经存在？（将进行验证）
   - 是否需要创建？（引导到 /plugin-dev:create-plugin）
6. 获取用户确认或调整意见

**输出**：带有来源信息的已确认插件列表

---

## 第 3 阶段（Phase 3）：元数据设计

**目标**：定义 marketplace 元数据和所有者信息

**操作**：

1. 确定 marketplace 名称：
   - 必须使用 kebab-case（小写加连字符）
   - 应准确描述用途
   - 示例：`team-tools`、`security-plugins`、`awesome-claude-plugins`

2. 收集所有者信息：
   - 询问用户："谁来维护这个 marketplace？"
   - 必填：name
   - 可选：email、url

3. 定义可选元数据：
   - description：marketplace 的简要说明
   - version：初始版本（建议 1.0.0 或 0.1.0）
   - pluginRoot：相对来源的基础路径（默认：无）

4. 展示配置摘要：

   ```json
   {
     "name": "team-tools",
     "owner": {
       "name": "Platform Team",
       "email": "platform@company.com"
     },
     "metadata": {
       "description": "Internal development tools",
       "version": "1.0.0"
     }
   }
   ```

5. 获取用户确认

**输出**：已确认的 marketplace 元数据

---

## 第 4 阶段（Phase 4）：结构创建

**目标**：创建 marketplace 目录结构和 manifest

**操作**：

1. 确定 marketplace 的位置：
   - 询问用户："我应该在哪里创建这个 marketplace？"
   - 提供选项：当前目录、新目录、自定义路径

2. 使用 bash 创建目录结构：

   ```bash
   mkdir -p marketplace-name/.claude-plugin
   mkdir -p marketplace-name/plugins  # if local plugins
   ```

3. 使用 Write 工具创建 `.claude-plugin/marketplace.json` manifest：

   ```json
   {
     "name": "marketplace-name",
     "owner": {
       "name": "[from Phase 3]"
     },
     "metadata": {
       "description": "[from Phase 3]",
       "version": "[from Phase 3]"
     },
     "plugins": []
   }
   ```

   这个空的 `plugins` 数组只是临时脚手架；在将 marketplace 视为完成之前，需要在 Phase 5 中补充插件条目。

4. 创建 README.md 模板，包含：
   - Marketplace 描述
   - 安装说明
   - 可用插件表格（将在 Phase 5 填充）
   - 贡献指南（如果是社区型）

5. 如果创建的是新目录，则初始化 git 仓库（仅允许 `git init`；额外的 git 操作如暂存和提交应留给用户在 workflow 完成后自行执行，以尊重其提交偏好）

**输出**：marketplace 目录结构已创建

**workflow 结束后的 git 操作**（用户可在完成后自行运行）：

```bash
git status --short
git add path/to/marketplace/.claude-plugin/marketplace.json path/to/marketplace/README.md
git commit -m "feat: initial marketplace structure"
```

只暂存新 marketplace 中明确指定的路径；不要使用宽泛的暂存方式。

---

## 第 5 阶段（Phase 5）：插件条目配置

**目标**：为每个插件条目配置合适的元数据

**操作**：

1. 对 Phase 2 计划中的每个插件：

   **对于本地插件**：
   - 如果插件已存在：
     - 读取其 plugin.json 以获取元数据
     - 使用相对 source path 创建条目
   - 如果插件不存在：
     - 询问："Plugin 'X' 不存在。现在创建它，还是先添加占位项？"
     - 如果选择创建：请用户先运行 `/plugin-dev:create-plugin` 为该插件建好基础
     - 如果选择占位：在 README 中创建带 TODO 注释的条目

   **对于 GitHub 插件**：
   - 创建带 github source object 的条目
   - 若未知则提示补充 version 和 description
   - 如果插件缺少 plugin.json，可考虑设置 strict: false

   **对于 git URL 插件**：
   - 创建带 url source object 的条目
   - 若未知则提示补充 version 和 description

2. 为每个条目配置可选字段：
   - version（建议始终包含）
   - description（建议始终包含）
   - category（如果 marketplace 使用分类）
   - tags（提高可发现性）

3. 使用所有插件条目更新 marketplace.json

4. 使用插件表格更新 README.md：

   | Plugin | Description | Version |
   | ------ | ----------- | ------- |
   | X      | Does Y      | 1.0.0   |

**输出**：marketplace.json 中的全部插件条目已配置完成

---

## 第 6 阶段（Phase 6）：分发设置

**目标**：根据目标受众配置分发策略

**操作**：

1. **对于团队/内部 marketplace**：
   - 提供团队 settings 配置：

     ```json
     {
       "extraKnownMarketplaces": {
         "marketplace-name": {
           "source": {
             "source": "github",
             "repo": "org/marketplace-repo"
           }
         }
       }
     }
     ```

   - 记录哪些插件应放入 `enabledPlugins`
   - 在 README 中补充：团队成员如何安装

2. **对于社区/公开 marketplace**：
   - 创建 CONTRIBUTING.md，包含：
     - 插件提交流程指南
     - 审核流程
     - 质量要求
   - 创建 CI workflow 用于验证（可选）：
     - JSON 语法检查
     - 必填字段验证
     - 重复名称检测

3. **对于所有 marketplace**：
   - 在 README 中记录安装命令：

     ```text
     /plugin marketplace add owner/repo
     ```

   - 列出单个插件的安装方式：

     ```text
     /plugin install plugin-name@marketplace-name
     ```

**输出**：分发文档已完善

---

## 第 7 阶段（Phase 7）：校验

**目标**：确保 marketplace 符合质量标准

**操作**：

1. **运行 plugin-validator agent**：
   - 使用 plugin-validator agent 验证 marketplace
   - 检查：schema、必填字段、插件条目、source path

2. **修复关键问题**：
   - 处理验证中的关键错误
   - 修复那些代表真实问题的警告

3. **验证本地插件**（如有）：
   - 对每个本地插件执行插件验证
   - 修复发现的问题

4. **检查最佳实践**：
   - 所有条目都带有 version
   - 所有条目都带有 description
   - README 记录了全部插件
   - Owner 信息完整

5. **展示验证报告**：
   - Marketplace 验证摘要
   - 每个本地插件的验证摘要
   - 整体质量评估

6. **询问用户**："验证已完成。你希望我修复问题，还是继续进入测试？"

**输出**：marketplace 已验证，可进入测试

---

## 第 8 阶段（Phase 8）：测试与收尾

**目标**：测试 marketplace 安装流程并完成收尾

**操作**：

1. **本地测试**：
   - 向用户展示如何测试：

     ```text
     /plugin marketplace add ./path/to/marketplace
     ```

   - 列出 marketplace：

     ```text
     /plugin marketplace list
     ```

   - 安装测试插件：

     ```text
     /plugin install plugin-name@marketplace-name
     ```

2. **验证清单**：
   - [ ] Marketplace 可成功添加
   - [ ] 所有插件都会出现在 `/plugin` 浏览器中
   - [ ] 本地插件可正确安装
   - [ ] 外部插件可访问（如果是公开源）

3. **创建总结**：
   - 将所有任务标记为完成
   - 列出已创建内容：
     - Marketplace 名称和用途
     - 已配置插件数量
     - 分发策略
     - 创建的关键文件
   - 后续步骤：
     - 推送到 GitHub/git 托管平台
     - 分享给团队
     - 添加到项目 settings

4. **建议改进项**（可选）：
   - 可进一步纳入的插件
   - CI/CD 集成机会
   - 版本管理策略

**输出**：完整、已验证的 marketplace 已可用于分发

---

## 重要说明

### 在所有阶段中

- **使用 Task tools** 在每个阶段跟踪进度（TaskCreate、TaskUpdate、TaskList）
- **加载 marketplace-structure skill** 作为 schema 参考
- **使用 plugin-validator agent** 执行验证
- **在关键决策点请求用户确认**
- **参考本仓库的 marketplace.json**
- **应用最佳实践**：
  - 使用 kebab-case 名称
  - 完整的 owner 信息
  - 所有条目带 version
  - 在 README 中记录所有插件
  - 对本地 marketplace 插件使用相对 source path 和 `metadata.pluginRoot`

### 关键决策点（等待用户）

1. Phase 1 之后：确认 marketplace 用途
2. Phase 2 之后：批准插件规划
3. Phase 3 之后：确认元数据
4. Phase 5 之后：继续进行分发配置
5. Phase 7 之后：修复问题或继续

### 需要加载的技能（Skills）

- **Phase 2+**：marketplace-structure（用于 schema 和模式）
- **Phase 5**：plugin-structure（如果要创建本地插件）

### 质量标准

每个 marketplace 都必须满足以下标准：

- ✅ JSON 语法有效
- ✅ 所有必填字段齐全（name、owner、plugins）
- ✅ 插件条目包含 name 和 source
- ✅ 不存在重复插件名
- ✅ 本地 source path 存在
- ✅ README 记录了 marketplace 和插件
- ✅ 已使用 plugin-validator agent 完成验证

---

## 示例工作流

### 用户请求

"为我们团队的内部工具创建一个 marketplace"

### 第 1 阶段（Phase 1）：发现与需求澄清

- 理解：面向内部团队分发
- 确认：团队专用插件，使用 GitHub 托管

### 第 2 阶段（Phase 2）：插件规划

- 3 个插件：linter-config（local）、security-scanner（local）、docs-generator（github）

### 第 3 阶段（Phase 3）：元数据

- name: team-tools
- owner: Platform Team
- version: 1.0.0

### 第 4-8 阶段（Phase 4-8）：结构创建、条目配置、分发、校验与测试

---

从 Phase 1：发现与需求澄清 开始。
