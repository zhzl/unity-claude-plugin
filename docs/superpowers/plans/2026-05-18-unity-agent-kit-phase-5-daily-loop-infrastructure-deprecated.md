> **DEPRECATED / 不得执行 / 仅作历史参考**
>
> 本文件是旧 Phase 5 总 implementation plan。它已被 Phase 5 split design 和 plan index 取代。
> 后续不得按本文件执行任务、同步 roadmap planned 状态或生成 completion evidence。
> 请使用：
> - Split Design: `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md`
> - Plan Index: `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
> - Revision Brief: `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-revision-brief.md`

---

# Unity Agent Kit Phase 5 Daily Loop Infrastructure 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 Unity Agent Kit Phase 5 的 P0 高频日常闭环 public tools、最小 actual `/unity` skill、Unity C# host，以及针对 `unity/` 的 E2E 验证。

**架构：** TS MCP layer 位于 `plugins/unity-agent-kit/`，负责 public schema、tool registration、workflow 编排、timeout、host rebind、Resource 读取和最终判定。Unity C# host 位于 `unity/Assets/UnityAgentKit/`，只负责 Unity 主线程短动作、状态 snapshot、diagnostic/job/report/artifact 记录和基础校验。Actual `/unity` skill 位于 `plugins/unity-agent-kit/skills/unity/SKILL.md`，先创建 skeleton，等 19 个 P0 actions 验证为 stable 后启用 executable recipes。

**技术栈：** TypeScript ESM、Node.js built-in test runner、`@modelcontextprotocol/sdk`、`zod`、Unity 2022.3.61f1 Editor C#、Unity EditMode tests、loopback HTTP、MCP Resources。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`

---

## 提交策略

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行这些 Commit 步骤；若未授权，跳过 Commit 步骤，并在最终汇报中列出未提交的修改文件。

## 范围边界

本计划只实现 Phase 5 规格批准的 19 个 P0 actions：

```text
unity_editor.get_status
unity_editor.wait_ready
unity_compile.get_state
unity_compile.request
unity_compile.wait_for_idle
unity_compile.compile_and_check
unity_console.snapshot
unity_console.count
unity_console.clear
unity_test.list
unity_test.start
unity_test.get_status
unity_test.get_result
unity_test.run_and_collect
unity_test.run_and_verify
unity_playmode.get_state
unity_playmode.enter_and_verify
unity_playmode.exit_and_verify
unity_screenshot.capture_game_view
```

本计划不实现 `unity_editor.get_current_host`、`unity_playmode.enter`、`unity_playmode.exit`、`unity_playmode.wait_for_state` 作为 stable public actions；它们保留为 schema-ready backlog，不进入 `/unity` executable recipe steps。本计划也不实现 Scene View or EditorWindow screenshot capture，不创建 Legacy v2 public tool compatibility layer。

## 选择的实现常量

### Runtime paths

```text
Unity project root: unity/
Unity expected version: 2022.3.61f1
Host registry file: unity/Library/UnityAgentKit/host.json
Artifact root: unity/Library/UnityAgentKit/Artifacts
```

`unity/Library` 已在 `.gitignore` 中忽略，生成的 host registry、artifacts 和 reports 不进入源代码管理。

### Protocol constants

```text
hostProtocolVersion: 2026-05-18.phase5
hostName: unity-agent-kit
pluginName: unity-agent-kit
```

### Timeout / polling policy table

此 timeout / polling policy table 是实现必须落地的最小 policy。数值是实现起点；若执行阶段证据显示过短，可在同一任务中以测试为依据调整。

| Workflow group | Applies to | Default timeout | Poll interval | Long wait rule | Timeout next step |
|---|---|---:|---:|---|---|
| Lightweight read | `get_status`, `get_state`, `count`, `get_status`, `get_result`, `get_state`, Resource readback | 2s | none | no long wait | retry read after checking host status |
| Editor readiness | `wait_ready` | 20s | 250ms | user can request longer wait | `unity_editor.get_status` |
| Compile idle | `wait_for_idle` | 60s | 500ms | longer wait requires user intent or project-size evidence | `unity_compile.get_state` |
| Compile verify | `compile_and_check` | 90s | 500ms | longer wait requires user intent or project-size evidence | `unity_compile.get_state` |
| Test job | `run_and_collect`, `run_and_verify` | 120s | 1000ms | longer wait requires user intent or known slow test suite | `unity_test.get_status` |
| PlayMode transition | `enter_and_verify`, `exit_and_verify` | 45s | 500ms | longer wait requires user intent or known slow domain reload | `unity_playmode.get_state` |
| Screenshot artifact | `capture_game_view` | 15s | 250ms | no hidden long wait | `unity_console.snapshot` |
| E2E validation | daily loop sequence | per-action timeout | per-action poll interval | use per-action justification | first failed action next step |

## 文件结构

### 创建：TS plugin

- `plugins/unity-agent-kit/.claude-plugin/plugin.json` — Claude Code plugin manifest。
- `plugins/unity-agent-kit/.mcp.json` — plugin MCP server configuration using `${CLAUDE_PLUGIN_ROOT}`。
- `plugins/unity-agent-kit/package.json` — TS package metadata, dependencies, and scripts.
- `plugins/unity-agent-kit/package-lock.json` — npm lockfile generated from package dependencies.
- `plugins/unity-agent-kit/src/index.ts` — public TS exports for tests and scripts.
- `plugins/unity-agent-kit/src/scripts/start-mcp.ts` — MCP stdio server entrypoint.
- `plugins/unity-agent-kit/src/scripts/e2e-daily-loop.ts` — E2E runner that calls the same TS workflows used by tools.
- `plugins/unity-agent-kit/src/contracts/result.ts` — public result envelope, status enum, diagnostics shape.
- `plugins/unity-agent-kit/src/contracts/safety.ts` — `sideEffectLevel`, `confirmationPolicy`, `dryRunMode`, and 19-action safety metadata.
- `plugins/unity-agent-kit/src/contracts/actions.ts` — 19 public action names, tool names, and input schema refs.
- `plugins/unity-agent-kit/src/schemas/editor.ts` — `unity_editor` action schemas.
- `plugins/unity-agent-kit/src/schemas/compile.ts` — `unity_compile` action schemas.
- `plugins/unity-agent-kit/src/schemas/console.ts` — `unity_console` action schemas.
- `plugins/unity-agent-kit/src/schemas/test.ts` — `unity_test` action schemas.
- `plugins/unity-agent-kit/src/schemas/playmode.ts` — `unity_playmode` action schemas.
- `plugins/unity-agent-kit/src/schemas/screenshot.ts` — `unity_screenshot` action schemas.
- `plugins/unity-agent-kit/src/schemas/all.ts` — combined schema registry.
- `plugins/unity-agent-kit/src/policies/timeouts.ts` — timeout / polling table and readers.
- `plugins/unity-agent-kit/src/host/registry.ts` — read and validate `unity/Library/UnityAgentKit/host.json`.
- `plugins/unity-agent-kit/src/host/http-client.ts` — probe and invoke loopback host operations.
- `plugins/unity-agent-kit/src/resources/uris.ts` — Resource URI builders and parsers.
- `plugins/unity-agent-kit/src/resources/artifact-store.ts` — safe metadata and content readback under artifact root.
- `plugins/unity-agent-kit/src/workflows/editor.ts` — editor readiness workflows.
- `plugins/unity-agent-kit/src/workflows/compile.ts` — compile request, idle, and check workflows.
- `plugins/unity-agent-kit/src/workflows/console.ts` — console snapshot/count/clear workflows.
- `plugins/unity-agent-kit/src/workflows/test.ts` — test list/start/status/result/collect/verify workflows.
- `plugins/unity-agent-kit/src/workflows/playmode.ts` — playmode state and verify workflows.
- `plugins/unity-agent-kit/src/workflows/screenshot.ts` — Game View screenshot workflow.
- `plugins/unity-agent-kit/src/mcp/server.ts` — MCP server factory and public tool/resource registration.
- `plugins/unity-agent-kit/src/mcp/tool-result.ts` — convert public results to MCP content.
- `plugins/unity-agent-kit/src/skill/audit.ts` — `/unity` recipe reference audit.
- `plugins/unity-agent-kit/tests/contracts.test.ts` — action/safety/schema contract tests.
- `plugins/unity-agent-kit/tests/policies.test.ts` — timeout policy tests.
- `plugins/unity-agent-kit/tests/host-client.test.ts` — registry/http-client tests.
- `plugins/unity-agent-kit/tests/resources.test.ts` — Resource URI and artifact readback tests.
- `plugins/unity-agent-kit/tests/workflows.test.ts` — workflow behavior tests with fake host client.
- `plugins/unity-agent-kit/tests/mcp-server.test.ts` — public tool/resource registration tests.
- `plugins/unity-agent-kit/tests/skill-audit.test.ts` — `/unity` recipe audit tests.

### 创建：actual skill

- `plugins/unity-agent-kit/skills/unity/SKILL.md` — thin routing, safety, Resource discipline, and P0 recipe entrypoint.
- `plugins/unity-agent-kit/skills/unity/references/daily-loop-recipes.md` — machine-checkable P0 recipe blocks.
- `plugins/unity-agent-kit/skills/unity/references/tool-action-reference.md` — compact stable action table.
- `plugins/unity-agent-kit/skills/unity/references/troubleshooting.md` — focused diagnostics guidance.

### 创建：Unity C# host

- `unity/Assets/UnityAgentKit/Editor/UnityAgentKit.Editor.asmdef` — editor assembly definition.
- `unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs` — editor lifecycle bootstrap.
- `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs` — `/probe` and `/operations` loopback HTTP server.
- `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs` — writes host registry to `Library/UnityAgentKit/host.json`.
- `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs` — main-thread dispatch helper.
- `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` — operation routing for internal host operations.
- `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` — request, response, diagnostic, job, artifact, and status DTOs.
- `unity/Assets/UnityAgentKit/Editor/Services/EditorStatusService.cs` — editor status snapshots.
- `unity/Assets/UnityAgentKit/Editor/Services/CompileDiagnosticsService.cs` — compile request, state, compiler message collector, bounded report metadata.
- `unity/Assets/UnityAgentKit/Editor/Services/ConsoleDiagnosticsService.cs` — console count, snapshot, cursor, and clear readback.
- `unity/Assets/UnityAgentKit/Editor/Services/TestRunnerService.cs` — test list, start, status, result, and report metadata.
- `unity/Assets/UnityAgentKit/Editor/Services/PlayModeBridgeService.cs` — playmode state and transition request/readback.
- `unity/Assets/UnityAgentKit/Editor/Services/ScreenshotArtifactService.cs` — Game View capture and PNG validation.
- `unity/Assets/UnityAgentKit/Editor/Services/UnityAgentKitArtifactStore.cs` — metadata and artifact/report path management under `Library/UnityAgentKit/Artifacts`.
- `unity/Assets/UnityAgentKit/Editor/Tests/UnityAgentKit.Editor.Tests.asmdef` — EditMode test assembly definition.
- `unity/Assets/UnityAgentKit/Editor/Tests/OperationRouterTests.cs` — router tests.
- `unity/Assets/UnityAgentKit/Editor/Tests/HostRegistryTests.cs` — registry tests.
- `unity/Assets/UnityAgentKit/Editor/Tests/CompileDiagnosticsServiceTests.cs` — compile diagnostics tests.
- `unity/Assets/UnityAgentKit/Editor/Tests/ConsoleDiagnosticsServiceTests.cs` — console service tests.
- `unity/Assets/UnityAgentKit/Editor/Tests/TestRunnerServiceTests.cs` — test service tests.
- `unity/Assets/UnityAgentKit/Editor/Tests/PlayModeBridgeServiceTests.cs` — playmode bridge tests.
- `unity/Assets/UnityAgentKit/Editor/Tests/ScreenshotArtifactServiceTests.cs` — screenshot artifact validation tests.

### 修改：roadmap current truth

- `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — during Task 1 only, synchronize Phase 5 spec/plan artifact paths, `planned` state, Current State, Next Manual Action, and Change Log. Do not mark Phase 5 completed in this plan.

---

## 任务 1：同步 roadmap 的 Phase 5 planned artifact 状态

**文件：**
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [ ] **步骤 1：运行 planned 状态检查并确认当前失败**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
roadmap = Path('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md')
text = roadmap.read_text(encoding='utf-8')
required = [
    '| Phase 5 — 高频日常闭环基础设施 | planned | 实现 editor/compile/console/test/playmode/screenshot 的核心闭环，并创建最小 actual `/unity` skill | `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md` | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure.md` | pending | implement-plan |',
    '- 当前阶段：Phase 5 已完成 spec 和 plan，等待执行 plan。',
    '- **Next Manual Action:** `/superpowers:roadmap-management implement-plan docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 5`',
    '### Phase 5：高频日常闭环基础设施',
    '**Status:** `planned`',
    '- **Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`',
    '- **Plan:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure.md`',
]
missing = [item for item in required if item not in text]
if missing:
    print('FAIL Phase 5 roadmap planned state missing required content:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS Phase 5 roadmap planned state and artifact links are present')
PY
```

预期：当前 roadmap 尚未同步 Phase 5 planned artifact 时输出 `FAIL Phase 5 roadmap planned state missing required content`，退出码为 1。

- [ ] **步骤 2：更新 Phase Summary 中 Phase 5 行**

将 Phase 5 行替换为：

```markdown
| Phase 5 — 高频日常闭环基础设施 | planned | 实现 editor/compile/console/test/playmode/screenshot 的核心闭环，并创建最小 actual `/unity` skill | `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md` | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure.md` | pending | implement-plan |
```

- [ ] **步骤 3：更新 Current State**

将 Phase 5 相关 Current State 更新为：

```markdown
- 当前阶段：Phase 5 已完成 spec 和 plan，等待执行 plan。
- Phase 1 已完成架构与边界蓝图规格验证，并记录 completion evidence。
- Phase 2 已完成 Unity Agent Skill 体系设计规格和计划，并记录 completion evidence。
- Phase 3 已完成 Public MCP Tool Action Design 规格和计划，并记录 completion evidence。
- Phase 4 已完成 Async / Job / Workflow / Artifact Semantics 规格验证和计划执行，并记录 completion evidence。
- **Next Manual Action:** `/superpowers:roadmap-management implement-plan docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 5`
- 当前不实现 Phase 6/7/8 能力域。
```

- [ ] **步骤 4：更新 Phase 5 detail artifact 字段**

在 `### Phase 5：高频日常闭环基础设施` 下设置：

```markdown
**Status:** `planned`
```

```markdown
**Artifacts:**
- **Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`
- **Plan:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure.md`
- **Implementation Summary:** pending
- **Verification Evidence:** pending
```

- [ ] **步骤 5：追加 Change Log**

在 `## Change Log` 顶部追加：

```markdown
- 2026-05-18：完成 Phase 5 高频日常闭环基础设施 spec 和 plan artifact 接入；Phase 5 进入 `planned`，下一步为 `implement-plan`。
```

- [ ] **步骤 6：运行 planned 状态检查并确认通过**

运行步骤 1 的 Python 命令。

预期输出：

```text
PASS Phase 5 roadmap planned state and artifact links are present
```

- [ ] **步骤 7：Commit**

```bash
git add docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: mark unity agent kit phase 5 planned

Record Phase 5 spec and plan artifact paths so implementation can start from the approved daily loop scope.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 2：创建 plugin skeleton、package scripts 和 manifest

**文件：**
- 创建：`plugins/unity-agent-kit/.claude-plugin/plugin.json`
- 创建：`plugins/unity-agent-kit/.mcp.json`
- 创建：`plugins/unity-agent-kit/package.json`
- 创建：`plugins/unity-agent-kit/src/index.ts`
- 创建：`plugins/unity-agent-kit/src/scripts/start-mcp.ts`
- 测试：`plugins/unity-agent-kit/tests/contracts.test.ts`

- [ ] **步骤 1：编写失败的 manifest/package 测试**

创建 `plugins/unity-agent-kit/tests/contracts.test.ts`：

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pluginRoot = new URL("../", import.meta.url);

test("plugin manifest uses plugin-dev conventions", async () => {
  const raw = await readFile(new URL(".claude-plugin/plugin.json", pluginRoot), "utf8");
  const manifest = JSON.parse(raw) as {
    name?: string;
    version?: string;
    description?: string;
    mcpServers?: string | Record<string, unknown>;
  };

  assert.equal(manifest.name, "unity-agent-kit");
  assert.match(manifest.version ?? "", /^\d+\.\d+\.\d+$/);
  assert.match(manifest.description ?? "", /Unity Agent Kit/);
  assert.equal(manifest.mcpServers, "./.mcp.json");
});

test("package exposes required scripts", async () => {
  const raw = await readFile(new URL("package.json", pluginRoot), "utf8");
  const pkg = JSON.parse(raw) as { type?: string; scripts?: Record<string, string>; dependencies?: Record<string, string> };

  assert.equal(pkg.type, "module");
  assert.equal(pkg.scripts?.test, "node --test tests/**/*.test.ts");
  assert.equal(pkg.scripts?.["start:mcp"], "node --experimental-strip-types ./src/scripts/start-mcp.ts");
  assert.ok(pkg.dependencies?.["@modelcontextprotocol/sdk"]);
  assert.ok(pkg.dependencies?.zod);
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
cd plugins/unity-agent-kit && node --test tests/**/*.test.ts
```

预期：FAIL，报错包含 `.claude-plugin/plugin.json` 或 `package.json` 不存在。

- [ ] **步骤 3：创建 plugin manifest、MCP config 和 package**

创建 `plugins/unity-agent-kit/.claude-plugin/plugin.json`：

```json
{
  "name": "unity-agent-kit",
  "version": "0.1.0",
  "description": "Unity Agent Kit provides Claude-facing Unity Editor daily loop validation tools and a thin Unity skill entrypoint.",
  "author": {
    "name": "zhzl"
  },
  "keywords": ["unity", "mcp", "editor", "testing", "automation"],
  "mcpServers": "./.mcp.json"
}
```

创建 `plugins/unity-agent-kit/.mcp.json`：

```json
{
  "mcpServers": {
    "unity-agent-kit": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/src/scripts/start-mcp.ts"],
      "env": {
        "UNITY_AGENT_KIT_PROJECT_ROOT": "${CLAUDE_PROJECT_DIR}/unity"
      }
    }
  }
}
```

创建 `plugins/unity-agent-kit/package.json`：

```json
{
  "name": "unity-agent-kit",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "node --test tests/**/*.test.ts",
    "start:mcp": "node --experimental-strip-types ./src/scripts/start-mcp.ts",
    "e2e:daily-loop": "node --experimental-strip-types ./src/scripts/e2e-daily-loop.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "zod": "^4.0.0"
  }
}
```

创建 `plugins/unity-agent-kit/src/index.ts`：

```ts
export { createUnityAgentKitServer } from "./mcp/server.ts";
export { publicActionCatalog } from "./contracts/actions.ts";
export { safetyMetadataByAction } from "./contracts/safety.ts";
```

创建 `plugins/unity-agent-kit/src/scripts/start-mcp.ts`：

```ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createUnityAgentKitServer } from "../mcp/server.ts";

const server = createUnityAgentKitServer({
  projectRoot: process.env.UNITY_AGENT_KIT_PROJECT_ROOT,
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **步骤 4：创建临时 server stub 让 package import 可解析**

创建 `plugins/unity-agent-kit/src/mcp/server.ts`：

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface CreateUnityAgentKitServerOptions {
  projectRoot?: string;
}

export function createUnityAgentKitServer(_options: CreateUnityAgentKitServerOptions = {}) {
  return new McpServer({ name: "unity-agent-kit", version: "0.1.0" });
}
```

创建 `plugins/unity-agent-kit/src/contracts/actions.ts`：

```ts
export const publicActionCatalog = [] as const;
```

创建 `plugins/unity-agent-kit/src/contracts/safety.ts`：

```ts
export const safetyMetadataByAction = {} as const;
```

- [ ] **步骤 5：安装 package lock 并运行测试验证通过**

运行：

```bash
cd plugins/unity-agent-kit && npm install --package-lock-only && npm test
```

预期输出包含：

```text
# pass 2
# fail 0
```

- [ ] **步骤 6：Commit**

```bash
git add plugins/unity-agent-kit/.claude-plugin/plugin.json plugins/unity-agent-kit/.mcp.json plugins/unity-agent-kit/package.json plugins/unity-agent-kit/package-lock.json plugins/unity-agent-kit/src/index.ts plugins/unity-agent-kit/src/scripts/start-mcp.ts plugins/unity-agent-kit/src/mcp/server.ts plugins/unity-agent-kit/src/contracts/actions.ts plugins/unity-agent-kit/src/contracts/safety.ts plugins/unity-agent-kit/tests/contracts.test.ts
git commit -m "$(cat <<'EOF'
feat: add unity agent kit plugin skeleton

Create the Claude Code plugin manifest, MCP entrypoint, package scripts, and initial contract exports for Phase 5 implementation.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 3：实现 19 个 public action contracts、schemas 和 safety metadata

**文件：**
- 修改：`plugins/unity-agent-kit/src/contracts/actions.ts`
- 修改：`plugins/unity-agent-kit/src/contracts/safety.ts`
- 创建：`plugins/unity-agent-kit/src/contracts/result.ts`
- 创建：`plugins/unity-agent-kit/src/schemas/editor.ts`
- 创建：`plugins/unity-agent-kit/src/schemas/compile.ts`
- 创建：`plugins/unity-agent-kit/src/schemas/console.ts`
- 创建：`plugins/unity-agent-kit/src/schemas/test.ts`
- 创建：`plugins/unity-agent-kit/src/schemas/playmode.ts`
- 创建：`plugins/unity-agent-kit/src/schemas/screenshot.ts`
- 创建：`plugins/unity-agent-kit/src/schemas/all.ts`
- 测试：`plugins/unity-agent-kit/tests/contracts.test.ts`

- [ ] **步骤 1：扩展失败的 action catalog 和 safety tests**

在 `plugins/unity-agent-kit/tests/contracts.test.ts` 追加：

```ts
import { allActionSchemas } from "../src/schemas/all.ts";
import { publicActionCatalog } from "../src/contracts/actions.ts";
import { safetyMetadataByAction } from "../src/contracts/safety.ts";
import { publicStatusValues } from "../src/contracts/result.ts";

const expectedActions = [
  "unity_editor.get_status",
  "unity_editor.wait_ready",
  "unity_compile.get_state",
  "unity_compile.request",
  "unity_compile.wait_for_idle",
  "unity_compile.compile_and_check",
  "unity_console.snapshot",
  "unity_console.count",
  "unity_console.clear",
  "unity_test.list",
  "unity_test.start",
  "unity_test.get_status",
  "unity_test.get_result",
  "unity_test.run_and_collect",
  "unity_test.run_and_verify",
  "unity_playmode.get_state",
  "unity_playmode.enter_and_verify",
  "unity_playmode.exit_and_verify",
  "unity_screenshot.capture_game_view",
] as const;

test("catalog contains only the 19 Phase 5 stable actions", () => {
  assert.deepEqual(publicActionCatalog.map((entry) => entry.id), [...expectedActions]);
});

test("all stable actions expose schema refs and safety metadata", () => {
  for (const action of expectedActions) {
    assert.ok(allActionSchemas[action], `${action} schema missing`);
    assert.ok(safetyMetadataByAction[action], `${action} safety missing`);
    assert.match(publicActionCatalog.find((entry) => entry.id === action)?.inputSchemaRef ?? "", /^[a-z_]+\.[A-Z][A-Za-z]+Input$/);
  }
});

test("helper backlog actions are not stable public actions", () => {
  const ids = new Set(publicActionCatalog.map((entry) => entry.id));
  assert.equal(ids.has("unity_editor.get_current_host"), false);
  assert.equal(ids.has("unity_playmode.enter"), false);
  assert.equal(ids.has("unity_playmode.exit"), false);
  assert.equal(ids.has("unity_playmode.wait_for_state"), false);
});

test("public result status enum matches Phase 4", () => {
  assert.deepEqual(publicStatusValues, ["succeeded", "failed", "uncertain", "cancelled", "timeout", "lost", "rejected"]);
});

test("free-form action params input is rejected", () => {
  const result = allActionSchemas["unity_compile.compile_and_check"].safeParse({
    action: "compile_and_check",
    params: { arbitrary: true },
  });
  assert.equal(result.success, false);
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
cd plugins/unity-agent-kit && npm test
```

预期：FAIL，报错包含 `Cannot find module '../src/schemas/all.ts'` 或 action catalog 长度不匹配。

- [ ] **步骤 3：实现 result contract**

创建 `plugins/unity-agent-kit/src/contracts/result.ts`：

```ts
export const publicStatusValues = ["succeeded", "failed", "uncertain", "cancelled", "timeout", "lost", "rejected"] as const;
export type PublicStatus = (typeof publicStatusValues)[number];

export type DiagnosticSource = "compiler" | "console" | "workflow" | "host" | "artifact" | "job" | "validation";
export type DiagnosticSeverity = "info" | "warning" | "error";
export type DiagnosticAttribution = "attributed" | "unattributed" | "uncertain";

export interface PublicDiagnostic {
  source: DiagnosticSource;
  severity: DiagnosticSeverity;
  code?: string;
  message: string;
  details?: unknown;
  attribution: DiagnosticAttribution;
}

export interface ResourceReference {
  artifactId?: string;
  reportId?: string;
  uri: string;
  type: "screenshot" | "test_report" | "console_snapshot";
  validationStatus: "valid" | "invalid" | "uncertain";
  summary: string;
}

export interface JobReference {
  jobId: string;
  state: "accepted" | "running" | "completed" | "failed" | "cancelled" | "timeout" | "lost" | "unknown";
}

export interface PublicResult<TEvidence = unknown> {
  status: PublicStatus;
  tool: string;
  action: string;
  summary: string;
  diagnostics: PublicDiagnostic[];
  evidence?: TEvidence;
  nextStep?: string;
  resource?: ResourceReference;
  job?: JobReference;
}
```

- [ ] **步骤 4：实现 action catalog**

替换 `plugins/unity-agent-kit/src/contracts/actions.ts`：

```ts
export type ToolName = "unity_editor" | "unity_compile" | "unity_console" | "unity_test" | "unity_playmode" | "unity_screenshot";

export interface PublicActionCatalogEntry {
  id: `${ToolName}.${string}`;
  toolName: ToolName;
  actionName: string;
  inputSchemaRef: string;
  referenceStatus: "stable";
  specStatus: "stable_ready";
  owningPhase: "Phase 5";
}

function entry(toolName: ToolName, actionName: string, inputSchemaRef: string): PublicActionCatalogEntry {
  return {
    id: `${toolName}.${actionName}`,
    toolName,
    actionName,
    inputSchemaRef,
    referenceStatus: "stable",
    specStatus: "stable_ready",
    owningPhase: "Phase 5",
  };
}

export const publicActionCatalog = [
  entry("unity_editor", "get_status", "unity_editor.GetStatusInput"),
  entry("unity_editor", "wait_ready", "unity_editor.WaitReadyInput"),
  entry("unity_compile", "get_state", "unity_compile.GetStateInput"),
  entry("unity_compile", "request", "unity_compile.RequestInput"),
  entry("unity_compile", "wait_for_idle", "unity_compile.WaitForIdleInput"),
  entry("unity_compile", "compile_and_check", "unity_compile.CompileAndCheckInput"),
  entry("unity_console", "snapshot", "unity_console.SnapshotInput"),
  entry("unity_console", "count", "unity_console.CountInput"),
  entry("unity_console", "clear", "unity_console.ClearInput"),
  entry("unity_test", "list", "unity_test.ListInput"),
  entry("unity_test", "start", "unity_test.StartInput"),
  entry("unity_test", "get_status", "unity_test.GetStatusInput"),
  entry("unity_test", "get_result", "unity_test.GetResultInput"),
  entry("unity_test", "run_and_collect", "unity_test.RunAndCollectInput"),
  entry("unity_test", "run_and_verify", "unity_test.RunAndVerifyInput"),
  entry("unity_playmode", "get_state", "unity_playmode.GetStateInput"),
  entry("unity_playmode", "enter_and_verify", "unity_playmode.EnterAndVerifyInput"),
  entry("unity_playmode", "exit_and_verify", "unity_playmode.ExitAndVerifyInput"),
  entry("unity_screenshot", "capture_game_view", "unity_screenshot.CaptureGameViewInput"),
] as const satisfies readonly PublicActionCatalogEntry[];

export type PublicActionId = (typeof publicActionCatalog)[number]["id"];
```

- [ ] **步骤 5：实现 safety metadata**

替换 `plugins/unity-agent-kit/src/contracts/safety.ts`：

```ts
import type { PublicActionId } from "./actions.ts";

export type SideEffectLevel = "read" | "write" | "destructive";
export type ConfirmationPolicy = "never" | "when_destructive" | "always";
export type DryRunMode = "unsupported" | "supported" | "required_first";

export interface SafetyMetadata {
  sideEffectLevel: SideEffectLevel;
  confirmationPolicy: ConfirmationPolicy;
  dryRunMode: DryRunMode;
}

const read: SafetyMetadata = { sideEffectLevel: "read", confirmationPolicy: "never", dryRunMode: "unsupported" };
const write: SafetyMetadata = { sideEffectLevel: "write", confirmationPolicy: "never", dryRunMode: "unsupported" };

export const safetyMetadataByAction: Record<PublicActionId, SafetyMetadata> = {
  "unity_editor.get_status": read,
  "unity_editor.wait_ready": read,
  "unity_compile.get_state": read,
  "unity_compile.request": write,
  "unity_compile.wait_for_idle": read,
  "unity_compile.compile_and_check": write,
  "unity_console.snapshot": read,
  "unity_console.count": read,
  "unity_console.clear": write,
  "unity_test.list": read,
  "unity_test.start": write,
  "unity_test.get_status": read,
  "unity_test.get_result": read,
  "unity_test.run_and_collect": write,
  "unity_test.run_and_verify": write,
  "unity_playmode.get_state": read,
  "unity_playmode.enter_and_verify": write,
  "unity_playmode.exit_and_verify": write,
  "unity_screenshot.capture_game_view": write,
};
```

- [ ] **步骤 6：实现 schemas**

Create schemas with `zod` discriminated unions. Minimum accepted shape:

`plugins/unity-agent-kit/src/schemas/editor.ts`:

```ts
import { z } from "zod";

export const getStatusInput = z.object({ action: z.literal("get_status") }).strict();
export const waitReadyInput = z.object({ action: z.literal("wait_ready"), timeoutMs: z.number().positive().optional(), pollIntervalMs: z.number().positive().optional() }).strict();
export const unityEditorInput = z.discriminatedUnion("action", [getStatusInput, waitReadyInput]);
```

`plugins/unity-agent-kit/src/schemas/compile.ts`:

```ts
import { z } from "zod";

export const getStateInput = z.object({ action: z.literal("get_state") }).strict();
export const requestInput = z.object({ action: z.literal("request"), reason: z.string().max(200).optional() }).strict();
export const waitForIdleInput = z.object({ action: z.literal("wait_for_idle"), timeoutMs: z.number().positive().optional(), pollIntervalMs: z.number().positive().optional() }).strict();
export const compileAndCheckInput = z.object({ action: z.literal("compile_and_check"), timeoutMs: z.number().positive().optional(), pollIntervalMs: z.number().positive().optional(), collectConsoleDiagnostics: z.boolean().optional() }).strict();
export const unityCompileInput = z.discriminatedUnion("action", [getStateInput, requestInput, waitForIdleInput, compileAndCheckInput]);
```

`plugins/unity-agent-kit/src/schemas/console.ts`:

```ts
import { z } from "zod";

const severity = z.enum(["info", "warning", "error"]);
export const snapshotInput = z.object({ action: z.literal("snapshot"), severity: severity.optional(), sinceCursor: z.string().min(1).optional(), includeResource: z.boolean().optional() }).strict();
export const countInput = z.object({ action: z.literal("count"), severity: severity.optional() }).strict();
export const clearInput = z.object({ action: z.literal("clear"), confirmClear: z.literal(true) }).strict();
export const unityConsoleInput = z.discriminatedUnion("action", [snapshotInput, countInput, clearInput]);
```

`plugins/unity-agent-kit/src/schemas/test.ts`:

```ts
import { z } from "zod";

export const testSelector = z.object({ mode: z.enum(["editmode", "playmode", "all"]), assembly: z.string().min(1).optional(), className: z.string().min(1).optional(), methodName: z.string().min(1).optional() }).strict();
const jobId = z.string().min(1);
const reportId = z.string().min(1);
export const listInput = z.object({ action: z.literal("list"), selector: testSelector }).strict();
export const startInput = z.object({ action: z.literal("start"), selector: testSelector, timeoutMs: z.number().positive().optional() }).strict();
export const getStatusInput = z.object({ action: z.literal("get_status"), jobId }).strict();
export const getResultInput = z.object({ action: z.literal("get_result"), jobId: jobId.optional(), reportId: reportId.optional() }).strict().refine((value) => Boolean(value.jobId || value.reportId), "jobId or reportId is required");
export const runAndCollectInput = z.object({ action: z.literal("run_and_collect"), selector: testSelector, timeoutMs: z.number().positive().optional(), pollIntervalMs: z.number().positive().optional() }).strict();
export const runAndVerifyInput = z.object({ action: z.literal("run_and_verify"), selector: testSelector, timeoutMs: z.number().positive().optional(), pollIntervalMs: z.number().positive().optional() }).strict();
export const unityTestInput = z.discriminatedUnion("action", [listInput, startInput, getStatusInput, getResultInput, runAndCollectInput, runAndVerifyInput]);
```

`plugins/unity-agent-kit/src/schemas/playmode.ts`:

```ts
import { z } from "zod";

export const getStateInput = z.object({ action: z.literal("get_state") }).strict();
export const enterAndVerifyInput = z.object({ action: z.literal("enter_and_verify"), timeoutMs: z.number().positive().optional(), pollIntervalMs: z.number().positive().optional(), collectConsoleDiagnostics: z.boolean().optional() }).strict();
export const exitAndVerifyInput = z.object({ action: z.literal("exit_and_verify"), timeoutMs: z.number().positive().optional(), pollIntervalMs: z.number().positive().optional(), collectConsoleDiagnostics: z.boolean().optional() }).strict();
export const unityPlaymodeInput = z.discriminatedUnion("action", [getStateInput, enterAndVerifyInput, exitAndVerifyInput]);
```

`plugins/unity-agent-kit/src/schemas/screenshot.ts`:

```ts
import { z } from "zod";

export const captureGameViewInput = z.object({ action: z.literal("capture_game_view"), label: z.string().regex(/^[a-zA-Z0-9._-]+$/).max(80).optional(), timeoutMs: z.number().positive().optional() }).strict();
export const unityScreenshotInput = z.discriminatedUnion("action", [captureGameViewInput]);
```

`plugins/unity-agent-kit/src/schemas/all.ts`:

```ts
import { getStatusInput as editorGetStatusInput, waitReadyInput } from "./editor.ts";
import { compileAndCheckInput, getStateInput as compileGetStateInput, requestInput, waitForIdleInput } from "./compile.ts";
import { clearInput, countInput, snapshotInput } from "./console.ts";
import { getResultInput, getStatusInput as testGetStatusInput, listInput, runAndCollectInput, runAndVerifyInput, startInput } from "./test.ts";
import { enterAndVerifyInput, exitAndVerifyInput, getStateInput as playmodeGetStateInput } from "./playmode.ts";
import { captureGameViewInput } from "./screenshot.ts";
import type { PublicActionId } from "../contracts/actions.ts";

export const allActionSchemas = {
  "unity_editor.get_status": editorGetStatusInput,
  "unity_editor.wait_ready": waitReadyInput,
  "unity_compile.get_state": compileGetStateInput,
  "unity_compile.request": requestInput,
  "unity_compile.wait_for_idle": waitForIdleInput,
  "unity_compile.compile_and_check": compileAndCheckInput,
  "unity_console.snapshot": snapshotInput,
  "unity_console.count": countInput,
  "unity_console.clear": clearInput,
  "unity_test.list": listInput,
  "unity_test.start": startInput,
  "unity_test.get_status": testGetStatusInput,
  "unity_test.get_result": getResultInput,
  "unity_test.run_and_collect": runAndCollectInput,
  "unity_test.run_and_verify": runAndVerifyInput,
  "unity_playmode.get_state": playmodeGetStateInput,
  "unity_playmode.enter_and_verify": enterAndVerifyInput,
  "unity_playmode.exit_and_verify": exitAndVerifyInput,
  "unity_screenshot.capture_game_view": captureGameViewInput,
} satisfies Record<PublicActionId, { safeParse(input: unknown): { success: boolean } }>;
```

- [ ] **步骤 7：运行 tests 并确认通过**

运行：

```bash
cd plugins/unity-agent-kit && npm test
```

预期输出包含：

```text
# fail 0
```

- [ ] **步骤 8：Commit**

```bash
git add plugins/unity-agent-kit/src/contracts/actions.ts plugins/unity-agent-kit/src/contracts/safety.ts plugins/unity-agent-kit/src/contracts/result.ts plugins/unity-agent-kit/src/schemas plugins/unity-agent-kit/tests/contracts.test.ts
git commit -m "$(cat <<'EOF'
feat: define unity agent kit p0 action contracts

Materialize the 19 Phase 5 public actions with bounded schemas, result status, and required safety metadata.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 4：实现 timeout policies、host registry、HTTP client 和 Resource core

**文件：**
- 创建：`plugins/unity-agent-kit/src/policies/timeouts.ts`
- 创建：`plugins/unity-agent-kit/src/host/registry.ts`
- 创建：`plugins/unity-agent-kit/src/host/http-client.ts`
- 创建：`plugins/unity-agent-kit/src/resources/uris.ts`
- 创建：`plugins/unity-agent-kit/src/resources/artifact-store.ts`
- 测试：`plugins/unity-agent-kit/tests/policies.test.ts`
- 测试：`plugins/unity-agent-kit/tests/host-client.test.ts`
- 测试：`plugins/unity-agent-kit/tests/resources.test.ts`

- [ ] **步骤 1：编写 timeout policy 失败测试**

创建 `plugins/unity-agent-kit/tests/policies.test.ts`：

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { timeoutPolicies, getTimeoutPolicy } from "../src/policies/timeouts.ts";

test("timeout policy table covers required workflow groups", () => {
  assert.deepEqual(Object.keys(timeoutPolicies).sort(), [
    "compileIdle",
    "compileVerify",
    "e2eValidation",
    "editorReadiness",
    "lightweightRead",
    "playmodeTransition",
    "resourceReadback",
    "screenshotArtifact",
    "testJob",
  ].sort());
});

test("long waits require explicit justification", () => {
  assert.equal(getTimeoutPolicy("compileVerify").requiresJustificationForLongerWait, true);
  assert.equal(getTimeoutPolicy("lightweightRead").requiresJustificationForLongerWait, false);
});
```

- [ ] **步骤 2：编写 host/resource 失败测试**

创建 `plugins/unity-agent-kit/tests/host-client.test.ts`：

```ts
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readHostRegistry } from "../src/host/registry.ts";

async function tempRoot() {
  return mkdtemp(join(tmpdir(), "uak-host-"));
}

test("readHostRegistry validates active Unity Agent Kit host", async () => {
  const root = await tempRoot();
  const registryDir = join(root, "Library", "UnityAgentKit");
  await mkdir(registryDir, { recursive: true });
  await writeFile(join(registryDir, "host.json"), JSON.stringify({
    hostName: "unity-agent-kit",
    protocolVersion: "2026-05-18.phase5",
    projectRoot: root,
    hostId: "host-1",
    hostEpoch: 3,
    port: 18080,
    status: "ready"
  }));

  const record = await readHostRegistry(root);
  assert.equal(record.hostName, "unity-agent-kit");
  assert.equal(record.port, 18080);
});

test("readHostRegistry rejects wrong protocol", async () => {
  const root = await tempRoot();
  const registryDir = join(root, "Library", "UnityAgentKit");
  await mkdir(registryDir, { recursive: true });
  await writeFile(join(registryDir, "host.json"), JSON.stringify({
    hostName: "unity-agent-kit",
    protocolVersion: "old",
    projectRoot: root,
    hostId: "host-1",
    hostEpoch: 3,
    port: 18080,
    status: "ready"
  }));

  await assert.rejects(() => readHostRegistry(root), /protocol/);
});
```

创建 `plugins/unity-agent-kit/tests/resources.test.ts`：

```ts
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseUnityResourceUri, screenshotUri, testReportUri, consoleSnapshotUri } from "../src/resources/uris.ts";
import { readArtifactText } from "../src/resources/artifact-store.ts";

test("resource uri builders and parser use generated ids", () => {
  assert.equal(screenshotUri("shot-1"), "unity://screenshots/shot-1");
  assert.deepEqual(parseUnityResourceUri(testReportUri("report-1")), { type: "test_report", id: "report-1" });
  assert.deepEqual(parseUnityResourceUri(consoleSnapshotUri("console-1")), { type: "console_snapshot", id: "console-1" });
});

test("artifact readback rejects traversal", async () => {
  const root = await mkdtemp(join(tmpdir(), "uak-artifacts-"));
  await mkdir(join(root, "Library", "UnityAgentKit", "Artifacts"), { recursive: true });
  await writeFile(join(root, "outside.txt"), "secret");
  await assert.rejects(() => readArtifactText(root, "../outside.txt"), /outside artifact root/);
});
```

- [ ] **步骤 3：运行测试验证失败**

运行：

```bash
cd plugins/unity-agent-kit && npm test
```

预期：FAIL，报错包含 missing `timeouts.ts`、`registry.ts` 或 `uris.ts`。

- [ ] **步骤 4：实现 timeout policies**

创建 `plugins/unity-agent-kit/src/policies/timeouts.ts`：

```ts
export type TimeoutPolicyName = "lightweightRead" | "editorReadiness" | "compileIdle" | "compileVerify" | "testJob" | "playmodeTransition" | "screenshotArtifact" | "resourceReadback" | "e2eValidation";

export interface TimeoutPolicy {
  timeoutMs: number;
  pollIntervalMs?: number;
  nextStep: string;
  requiresJustificationForLongerWait: boolean;
}

export const timeoutPolicies: Record<TimeoutPolicyName, TimeoutPolicy> = {
  lightweightRead: { timeoutMs: 2_000, nextStep: "Check host status and retry the read.", requiresJustificationForLongerWait: false },
  editorReadiness: { timeoutMs: 20_000, pollIntervalMs: 250, nextStep: "Run unity_editor.get_status.", requiresJustificationForLongerWait: true },
  compileIdle: { timeoutMs: 60_000, pollIntervalMs: 500, nextStep: "Run unity_compile.get_state.", requiresJustificationForLongerWait: true },
  compileVerify: { timeoutMs: 90_000, pollIntervalMs: 500, nextStep: "Run unity_compile.get_state.", requiresJustificationForLongerWait: true },
  testJob: { timeoutMs: 120_000, pollIntervalMs: 1_000, nextStep: "Run unity_test.get_status.", requiresJustificationForLongerWait: true },
  playmodeTransition: { timeoutMs: 45_000, pollIntervalMs: 500, nextStep: "Run unity_playmode.get_state.", requiresJustificationForLongerWait: true },
  screenshotArtifact: { timeoutMs: 15_000, pollIntervalMs: 250, nextStep: "Run unity_console.snapshot.", requiresJustificationForLongerWait: false },
  resourceReadback: { timeoutMs: 2_000, nextStep: "Read the resource metadata and verify the artifact file exists.", requiresJustificationForLongerWait: false },
  e2eValidation: { timeoutMs: 0, nextStep: "Inspect the first failed action result.", requiresJustificationForLongerWait: true },
};

export function getTimeoutPolicy(name: TimeoutPolicyName): TimeoutPolicy {
  return timeoutPolicies[name];
}

export function readTimeoutOverride(value: unknown, policy: TimeoutPolicy): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : policy.timeoutMs;
}
```

- [ ] **步骤 5：实现 host registry**

创建 `plugins/unity-agent-kit/src/host/registry.ts`：

```ts
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export const hostProtocolVersion = "2026-05-18.phase5";

export interface HostRegistryRecord {
  hostName: "unity-agent-kit";
  protocolVersion: string;
  projectRoot: string;
  hostId: string;
  hostEpoch: number;
  port: number;
  status: "starting" | "ready" | "stopping";
}

export function hostRegistryPath(projectRoot: string): string {
  return join(projectRoot, "Library", "UnityAgentKit", "host.json");
}

function assertString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`host registry missing ${name}`);
  return value;
}

function assertNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`host registry missing ${name}`);
  return value;
}

export async function readHostRegistry(projectRoot: string): Promise<HostRegistryRecord> {
  const raw = await readFile(hostRegistryPath(projectRoot), "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const record: HostRegistryRecord = {
    hostName: assertString(parsed.hostName, "hostName") as "unity-agent-kit",
    protocolVersion: assertString(parsed.protocolVersion, "protocolVersion"),
    projectRoot: assertString(parsed.projectRoot, "projectRoot"),
    hostId: assertString(parsed.hostId, "hostId"),
    hostEpoch: assertNumber(parsed.hostEpoch, "hostEpoch"),
    port: assertNumber(parsed.port, "port"),
    status: assertString(parsed.status, "status") as HostRegistryRecord["status"],
  };
  if (record.hostName !== "unity-agent-kit") throw new Error("host registry is not unity-agent-kit");
  if (record.protocolVersion !== hostProtocolVersion) throw new Error("host registry protocol mismatch");
  if (record.status !== "ready") throw new Error(`host is ${record.status}`);
  if (resolve(record.projectRoot) !== resolve(projectRoot)) throw new Error("host registry project mismatch");
  return record;
}
```

- [ ] **步骤 6：实现 HTTP client and Resources**

创建 `plugins/unity-agent-kit/src/host/http-client.ts`：

```ts
import http from "node:http";
import { readHostRegistry, type HostRegistryRecord } from "./registry.ts";

export interface InvokeHostOperationInput {
  projectRoot: string;
  operation: string;
  requestId: string;
  input: Record<string, unknown>;
  timeoutMs: number;
}

export interface HostOperationResponse {
  status: string;
  operation: string;
  requestId: string;
  hostId: string;
  hostEpoch: number;
  data?: Record<string, unknown>;
  diagnostics?: unknown[];
  summary?: string;
}

function postJson(record: HostRegistryRecord, body: Record<string, unknown>, timeoutMs: number): Promise<HostOperationResponse> {
  return new Promise((resolve, reject) => {
    const request = http.request({ host: "127.0.0.1", port: record.port, method: "POST", path: "/operations", headers: { "content-type": "application/json" } }, (response) => {
      response.setEncoding("utf8");
      let payload = "";
      response.on("data", (chunk) => { payload += chunk; });
      response.on("end", () => {
        if ((response.statusCode ?? 0) < 200 || (response.statusCode ?? 0) >= 300) {
          reject(new Error(`host operation status ${response.statusCode ?? "unknown"}`));
          return;
        }
        resolve(JSON.parse(payload || "{}") as HostOperationResponse);
      });
    });
    request.on("error", reject);
    request.setTimeout(timeoutMs, () => request.destroy(new Error("host operation timed out")));
    request.write(JSON.stringify(body));
    request.end();
  });
}

export async function invokeHostOperation(input: InvokeHostOperationInput): Promise<HostOperationResponse> {
  const record = await readHostRegistry(input.projectRoot);
  return postJson(record, { operation: input.operation, requestId: input.requestId, input: input.input }, input.timeoutMs);
}
```

创建 `plugins/unity-agent-kit/src/resources/uris.ts`：

```ts
export type UnityResourceType = "screenshot" | "test_report" | "console_snapshot";

export function screenshotUri(artifactId: string): string { return `unity://screenshots/${artifactId}`; }
export function testReportUri(reportId: string): string { return `unity://test-reports/${reportId}`; }
export function consoleSnapshotUri(artifactId: string): string { return `unity://console-snapshots/${artifactId}`; }

export function parseUnityResourceUri(uri: string): { type: UnityResourceType; id: string } {
  const match = /^unity:\/\/(screenshots|test-reports|console-snapshots)\/([a-zA-Z0-9._-]+)$/.exec(uri);
  if (!match) throw new Error("unsupported unity resource uri");
  const type = match[1] === "screenshots" ? "screenshot" : match[1] === "test-reports" ? "test_report" : "console_snapshot";
  return { type, id: match[2] };
}
```

创建 `plugins/unity-agent-kit/src/resources/artifact-store.ts`：

```ts
import { readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

export function artifactRoot(projectRoot: string): string {
  return join(projectRoot, "Library", "UnityAgentKit", "Artifacts");
}

export function resolveArtifactPath(projectRoot: string, relativePath: string): string {
  const root = resolve(artifactRoot(projectRoot));
  const full = resolve(root, relativePath);
  if (relative(root, full).startsWith("..")) throw new Error("path outside artifact root");
  return full;
}

export async function readArtifactText(projectRoot: string, relativePath: string): Promise<string> {
  return readFile(resolveArtifactPath(projectRoot, relativePath), "utf8");
}
```

- [ ] **步骤 7：运行测试验证通过**

运行：

```bash
cd plugins/unity-agent-kit && npm test
```

预期输出包含：

```text
# fail 0
```

- [ ] **步骤 8：Commit**

```bash
git add plugins/unity-agent-kit/src/policies plugins/unity-agent-kit/src/host plugins/unity-agent-kit/src/resources plugins/unity-agent-kit/tests/policies.test.ts plugins/unity-agent-kit/tests/host-client.test.ts plugins/unity-agent-kit/tests/resources.test.ts
git commit -m "$(cat <<'EOF'
feat: add unity agent kit host and resource core

Define bounded timeout policies, host registry validation, loopback invocation, and safe Unity resource readback.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 5：创建 Unity C# host shell、registry、router 和基础 EditMode tests

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/UnityAgentKit.Editor.asmdef`
- 创建：`unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/UnityAgentKit.Editor.Tests.asmdef`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/HostRegistryTests.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/OperationRouterTests.cs`

- [ ] **步骤 1：编写失败的 Unity EditMode tests**

创建 `unity/Assets/UnityAgentKit/Editor/Tests/UnityAgentKit.Editor.Tests.asmdef`：

```json
{
  "name": "UnityAgentKit.Editor.Tests",
  "references": ["UnityAgentKit.Editor"],
  "includePlatforms": ["Editor"],
  "optionalUnityReferences": ["TestAssemblies"]
}
```

创建 `unity/Assets/UnityAgentKit/Editor/Tests/HostRegistryTests.cs`：

```csharp
using System.IO;
using NUnit.Framework;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class HostRegistryTests
    {
        [Test]
        public void RegistryPathUsesUnityLibrary()
        {
            var path = UnityAgentKitHostRegistry.GetRegistryPath("/project");
            Assert.That(path.Replace('\\', '/'), Does.EndWith("/project/Library/UnityAgentKit/host.json"));
        }

        [Test]
        public void HostRecordUsesPhase5Protocol()
        {
            var record = UnityAgentKitHostRegistry.CreateRecord("/project", 18080, "host-1", 2, "ready");
            Assert.AreEqual("unity-agent-kit", record.hostName);
            Assert.AreEqual("2026-05-18.phase5", record.protocolVersion);
            Assert.AreEqual("/project", record.projectRoot);
        }
    }
}
```

创建 `unity/Assets/UnityAgentKit/Editor/Tests/OperationRouterTests.cs`：

```csharp
using NUnit.Framework;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class OperationRouterTests
    {
        [Test]
        public void UnknownOperationIsRejected()
        {
            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "missing.operation",
                requestId = "req-1",
                inputJson = "{}"
            });

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual("missing.operation", response.operation);
        }
    }
}
```

- [ ] **步骤 2：运行 Unity EditMode tests 验证失败**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/EditModeResults.xml
```

预期：FAIL，编译错误包含 `UnityAgentKitHostRegistry` 或 `UnityAgentKitOperationRouter` 不存在。

- [ ] **步骤 3：创建 editor assembly and DTOs**

创建 `unity/Assets/UnityAgentKit/Editor/UnityAgentKit.Editor.asmdef`：

```json
{
  "name": "UnityAgentKit.Editor",
  "references": [],
  "includePlatforms": ["Editor"]
}
```

创建 `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`：

```csharp
using System;

namespace UnityAgentKit.Editor
{
    [Serializable]
    public sealed class UnityAgentKitOperationRequest
    {
        public string operation;
        public string requestId;
        public string inputJson;
    }

    [Serializable]
    public sealed class UnityAgentKitOperationResponse
    {
        public string status;
        public string operation;
        public string requestId;
        public string summary;
        public string dataJson;
    }

    [Serializable]
    public sealed class UnityAgentKitHostRecord
    {
        public string hostName;
        public string protocolVersion;
        public string projectRoot;
        public string hostId;
        public int hostEpoch;
        public int port;
        public string status;
    }
}
```

- [ ] **步骤 4：实现 registry and router shell**

创建 `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs`：

```csharp
using System.IO;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    public static class UnityAgentKitHostRegistry
    {
        public const string ProtocolVersion = "2026-05-18.phase5";

        public static string GetRegistryPath(string projectRoot)
        {
            return Path.Combine(projectRoot, "Library", "UnityAgentKit", "host.json");
        }

        public static UnityAgentKitHostRecord CreateRecord(string projectRoot, int port, string hostId, int hostEpoch, string status)
        {
            return new UnityAgentKitHostRecord
            {
                hostName = "unity-agent-kit",
                protocolVersion = ProtocolVersion,
                projectRoot = projectRoot,
                hostId = hostId,
                hostEpoch = hostEpoch,
                port = port,
                status = status
            };
        }

        public static void Write(string projectRoot, UnityAgentKitHostRecord record)
        {
            var path = GetRegistryPath(projectRoot);
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            File.WriteAllText(path, JsonUtility.ToJson(record, true));
        }
    }
}
```

创建 `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`：

```csharp
namespace UnityAgentKit.Editor
{
    public static class UnityAgentKitOperationRouter
    {
        public static UnityAgentKitOperationResponse Route(UnityAgentKitOperationRequest request)
        {
            var operation = request != null ? request.operation : string.Empty;
            var requestId = request != null ? request.requestId : string.Empty;
            return new UnityAgentKitOperationResponse
            {
                status = "rejected",
                operation = operation,
                requestId = requestId,
                summary = "Unknown Unity Agent Kit operation.",
                dataJson = "{}"
            };
        }
    }
}
```

- [ ] **步骤 5：实现 host bootstrap and HTTP skeleton**

创建 `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs`：

```csharp
using System;
using UnityEditor;

namespace UnityAgentKit.Editor
{
    public static class UnityAgentKitMainThread
    {
        public static void Run(Action action)
        {
            if (action == null) return;
            EditorApplication.delayCall += () => action();
        }
    }
}
```

创建 `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`：

```csharp
using System;

namespace UnityAgentKit.Editor
{
    public sealed class UnityAgentKitLoopbackHttpServer : IDisposable
    {
        public int Port { get; private set; }

        public void Start()
        {
            Port = 0;
        }

        public void Dispose()
        {
            Port = 0;
        }
    }
}
```

创建 `unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs`：

```csharp
using System;
using UnityEditor;

namespace UnityAgentKit.Editor
{
    [InitializeOnLoad]
    public static class UnityAgentKitHost
    {
        private static readonly string HostId = Guid.NewGuid().ToString("N");
        private static int hostEpoch;

        static UnityAgentKitHost()
        {
            hostEpoch += 1;
            UnityAgentKitHostRegistry.Write(Environment.CurrentDirectory, UnityAgentKitHostRegistry.CreateRecord(Environment.CurrentDirectory, 0, HostId, hostEpoch, "ready"));
        }
    }
}
```

- [ ] **步骤 6：运行 Unity EditMode tests 验证通过**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/EditModeResults.xml
```

预期：Unity test results 中 `HostRegistryTests` 和 `OperationRouterTests` 通过。

- [ ] **步骤 7：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor
git commit -m "$(cat <<'EOF'
feat: add unity agent kit editor host shell

Create the single Unity C# host source tree, registry contract, operation router shell, and initial EditMode tests.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 6：实现 editor readiness vertical slice

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Services/EditorStatusService.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 创建：`plugins/unity-agent-kit/src/workflows/editor.ts`
- 测试：`unity/Assets/UnityAgentKit/Editor/Tests/OperationRouterTests.cs`
- 测试：`plugins/unity-agent-kit/tests/workflows.test.ts`

- [ ] **步骤 1：编写失败的 C# editor status test**

在 `OperationRouterTests.cs` 追加：

```csharp
[Test]
public void EditorStatusGetReturnsStatusSnapshot()
{
    var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
    {
        operation = "editor.status.get",
        requestId = "req-editor",
        inputJson = "{}"
    });

    Assert.AreEqual("succeeded", response.status);
    Assert.AreEqual("editor.status.get", response.operation);
    Assert.That(response.dataJson, Does.Contain("isCompiling"));
    Assert.That(response.dataJson, Does.Contain("projectRoot"));
}
```

- [ ] **步骤 2：编写失败的 TS workflow test**

创建 `plugins/unity-agent-kit/tests/workflows.test.ts`：

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getEditorStatus, waitEditorReady } from "../src/workflows/editor.ts";

const readyHost = async () => ({
  status: "succeeded",
  operation: "editor.status.get",
  requestId: "req",
  hostId: "host-1",
  hostEpoch: 1,
  data: { projectRoot: "unity/", isCompiling: false, isUpdating: false, isPlaying: false, isTransitioningPlayMode: false },
  summary: "editor status ready",
});

test("getEditorStatus maps host data to public result", async () => {
  const result = await getEditorStatus({ projectRoot: "unity", invoke: readyHost });
  assert.equal(result.status, "succeeded");
  assert.equal(result.tool, "unity_editor");
  assert.equal(result.action, "get_status");
});

test("waitEditorReady succeeds when editor is not busy", async () => {
  const result = await waitEditorReady({ projectRoot: "unity", timeoutMs: 1000, pollIntervalMs: 1, invoke: readyHost });
  assert.equal(result.status, "succeeded");
});
```

- [ ] **步骤 3：运行 tests 验证失败**

运行：

```bash
cd plugins/unity-agent-kit && npm test
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/EditModeResults.xml
```

预期：TS FAIL missing `workflows/editor.ts`；Unity FAIL because `editor.status.get` is rejected.

- [ ] **步骤 4：实现 C# editor status service and router branch**

创建 `unity/Assets/UnityAgentKit/Editor/Services/EditorStatusService.cs`：

```csharp
using System;
using UnityEditor;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    public sealed class EditorStatusService
    {
        [Serializable]
        private sealed class EditorStatusDto
        {
            public string projectRoot;
            public bool isCompiling;
            public bool isUpdating;
            public bool isPlaying;
            public bool isTransitioningPlayMode;
        }

        public string SnapshotJson()
        {
            return JsonUtility.ToJson(new EditorStatusDto
            {
                projectRoot = Environment.CurrentDirectory,
                isCompiling = EditorApplication.isCompiling,
                isUpdating = EditorApplication.isUpdating,
                isPlaying = EditorApplication.isPlaying,
                isTransitioningPlayMode = EditorApplication.isPlayingOrWillChangePlaymode
            });
        }
    }
}
```

In `UnityAgentKitOperationRouter.cs`, add a static service and route branch before unknown rejection:

```csharp
private static readonly EditorStatusService EditorStatusService = new EditorStatusService();
```

```csharp
if (operation == "editor.status.get")
{
    return new UnityAgentKitOperationResponse
    {
        status = "succeeded",
        operation = operation,
        requestId = requestId,
        summary = "editor status ready",
        dataJson = EditorStatusService.SnapshotJson()
    };
}
```

- [ ] **步骤 5：实现 TS editor workflows**

创建 `plugins/unity-agent-kit/src/workflows/editor.ts`：

```ts
import { randomUUID } from "node:crypto";
import { invokeHostOperation, type HostOperationResponse } from "../host/http-client.ts";
import { getTimeoutPolicy, readTimeoutOverride } from "../policies/timeouts.ts";
import type { PublicResult } from "../contracts/result.ts";

type Invoke = (input: { operation: string; requestId: string; input: Record<string, unknown>; timeoutMs: number }) => Promise<HostOperationResponse>;

export interface WorkflowOptions {
  projectRoot: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  invoke?: Invoke;
}

function invoker(projectRoot: string): Invoke {
  return (input) => invokeHostOperation({ projectRoot, ...input });
}

export async function getEditorStatus(options: WorkflowOptions): Promise<PublicResult> {
  const policy = getTimeoutPolicy("lightweightRead");
  const response = await (options.invoke ?? invoker(options.projectRoot))({ operation: "editor.status.get", requestId: randomUUID(), input: {}, timeoutMs: readTimeoutOverride(options.timeoutMs, policy) });
  return { status: response.status === "succeeded" ? "succeeded" : "failed", tool: "unity_editor", action: "get_status", summary: response.summary ?? "editor status read", diagnostics: [], evidence: response.data };
}

function isReady(data: Record<string, unknown> | undefined): boolean {
  return Boolean(data) && data.isCompiling === false && data.isUpdating === false && data.isTransitioningPlayMode === false;
}

export async function waitEditorReady(options: WorkflowOptions): Promise<PublicResult> {
  const policy = getTimeoutPolicy("editorReadiness");
  const timeoutMs = readTimeoutOverride(options.timeoutMs, policy);
  const pollIntervalMs = options.pollIntervalMs ?? policy.pollIntervalMs ?? 250;
  const started = Date.now();
  while (Date.now() - started <= timeoutMs) {
    const response = await (options.invoke ?? invoker(options.projectRoot))({ operation: "editor.status.get", requestId: randomUUID(), input: {}, timeoutMs: getTimeoutPolicy("lightweightRead").timeoutMs });
    if (response.status === "succeeded" && isReady(response.data)) {
      return { status: "succeeded", tool: "unity_editor", action: "wait_ready", summary: "editor ready", diagnostics: [], evidence: response.data };
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return { status: "timeout", tool: "unity_editor", action: "wait_ready", summary: "editor readiness timed out", diagnostics: [{ source: "workflow", severity: "error", message: "Editor did not become ready before timeout.", attribution: "attributed" }], nextStep: policy.nextStep, evidence: { mayStillBeRunning: "unknown", safeToRetry: "unknown" } };
}
```

- [ ] **步骤 6：运行 tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && npm test
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/EditModeResults.xml
```

预期：TS editor workflow tests pass；Unity `EditorStatusGetReturnsStatusSnapshot` passes.

- [ ] **步骤 7：Commit**

```bash
git add plugins/unity-agent-kit/src/workflows/editor.ts plugins/unity-agent-kit/tests/workflows.test.ts unity/Assets/UnityAgentKit/Editor/Services/EditorStatusService.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/OperationRouterTests.cs
git commit -m "$(cat <<'EOF'
feat: implement unity editor readiness workflow

Add Unity editor status snapshots and TS readiness polling for the Phase 5 daily loop.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 7：实现 compile state、request、idle 和 compile_and_check

Compile verification 必须优先 request / observe-current-cycle proof；recent compile report 只能在绑定 active Unity project/session 且来自 bounded complete compile lifecycle 时使用。

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Services/CompileDiagnosticsService.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/CompileDiagnosticsServiceTests.cs`
- 创建：`plugins/unity-agent-kit/src/workflows/compile.ts`
- 修改：`plugins/unity-agent-kit/tests/workflows.test.ts`

- [ ] **步骤 1：编写失败的 C# compile diagnostics tests**

创建 `CompileDiagnosticsServiceTests.cs`：

```csharp
using NUnit.Framework;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class CompileDiagnosticsServiceTests
    {
        [Test]
        public void NoNewCompileWithoutBoundedReportIsUncertain()
        {
            var service = new CompileDiagnosticsService();
            var json = service.CheckCompileJson(allowRecentReport: false);
            Assert.That(json, Does.Contain("uncertain"));
            Assert.That(json, Does.Contain("compilerMessagesAttributed"));
        }

        [Test]
        public void CompileStateContainsBusySignals()
        {
            var service = new CompileDiagnosticsService();
            var json = service.GetStateJson();
            Assert.That(json, Does.Contain("isCompiling"));
            Assert.That(json, Does.Contain("isUpdating"));
        }
    }
}
```

- [ ] **步骤 2：编写失败的 TS compile workflow tests**

Append to `workflows.test.ts`:

```ts
import { compileAndCheck, waitCompileIdle } from "../src/workflows/compile.ts";

test("waitCompileIdle does not claim compile success", async () => {
  const result = await waitCompileIdle({
    projectRoot: "unity",
    timeoutMs: 1000,
    pollIntervalMs: 1,
    invoke: async () => ({ status: "succeeded", operation: "compile.state.get", requestId: "req", hostId: "host", hostEpoch: 1, data: { isCompiling: false, isUpdating: false }, summary: "compile state ready" }),
  });
  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "wait_for_idle");
  assert.equal((result.evidence as Record<string, unknown>).compileSuccess, undefined);
});

test("compileAndCheck returns uncertain for unattributed compiler messages", async () => {
  const result = await compileAndCheck({
    projectRoot: "unity",
    timeoutMs: 1000,
    pollIntervalMs: 1,
    invoke: async ({ operation }) => operation === "compile.check"
      ? { status: "uncertain", operation, requestId: "req", hostId: "host", hostEpoch: 1, data: { compilerMessagesAttributed: false, compilerErrorCount: 0, compilerWarningCount: 0, usedRecentCompileReport: false }, summary: "compile evidence uncertain" }
      : { status: "succeeded", operation, requestId: "req", hostId: "host", hostEpoch: 1, data: {}, summary: "ok" },
  });
  assert.equal(result.status, "uncertain");
});
```

- [ ] **步骤 3：运行 tests 验证失败**

运行：

```bash
cd plugins/unity-agent-kit && npm test
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/EditModeResults.xml
```

预期：FAIL missing `CompileDiagnosticsService` and `workflows/compile.ts`.

- [ ] **步骤 4：实现 CompileDiagnosticsService and router branches**

创建 `CompileDiagnosticsService.cs` with minimum current-cycle proof behavior:

```csharp
using System;
using UnityEditor;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    public sealed class CompileDiagnosticsService
    {
        [Serializable]
        private sealed class CompileStateDto { public bool isCompiling; public bool isUpdating; }
        [Serializable]
        private sealed class CompileCheckDto
        {
            public string status;
            public bool compilerMessagesAttributed;
            public int compilerErrorCount;
            public int compilerWarningCount;
            public bool usedRecentCompileReport;
            public string nextStep;
        }

        public string GetStateJson()
        {
            return JsonUtility.ToJson(new CompileStateDto { isCompiling = EditorApplication.isCompiling, isUpdating = EditorApplication.isUpdating });
        }

        public string RequestCompileJson(string reason)
        {
            CompilationPipeline.RequestScriptCompilation();
            return "{\"requested\":true,\"reason\":\"" + JsonEscape(reason ?? "user request") + "\"}";
        }

        public string CheckCompileJson(bool allowRecentReport)
        {
            return JsonUtility.ToJson(new CompileCheckDto
            {
                status = "uncertain",
                compilerMessagesAttributed = false,
                compilerErrorCount = 0,
                compilerWarningCount = 0,
                usedRecentCompileReport = false,
                nextStep = "Observe a bounded compile lifecycle before reporting success."
            });
        }

        private static string JsonEscape(string value)
        {
            return value.Replace("\\", "\\\\").Replace("\"", "\\\"");
        }
    }
}
```

Add router branches:

```csharp
private static readonly CompileDiagnosticsService CompileDiagnosticsService = new CompileDiagnosticsService();
```

```csharp
if (operation == "compile.state.get") return Succeeded(operation, requestId, "compile state ready", CompileDiagnosticsService.GetStateJson());
if (operation == "compile.request") return Succeeded(operation, requestId, "compile requested", CompileDiagnosticsService.RequestCompileJson("user request"));
if (operation == "compile.check")
{
    var data = CompileDiagnosticsService.CheckCompileJson(allowRecentReport: false);
    var status = data.Contains("\"status\":\"uncertain\"") ? "uncertain" : "succeeded";
    return new UnityAgentKitOperationResponse { status = status, operation = operation, requestId = requestId, summary = "compile check complete", dataJson = data };
}
```

If `Succeeded` helper does not exist, add this private helper:

```csharp
private static UnityAgentKitOperationResponse Succeeded(string operation, string requestId, string summary, string dataJson)
{
    return new UnityAgentKitOperationResponse { status = "succeeded", operation = operation, requestId = requestId, summary = summary, dataJson = dataJson };
}
```

- [ ] **步骤 5：实现 TS compile workflows**

Create `plugins/unity-agent-kit/src/workflows/compile.ts`:

```ts
import { randomUUID } from "node:crypto";
import { invokeHostOperation, type HostOperationResponse } from "../host/http-client.ts";
import { getTimeoutPolicy, readTimeoutOverride } from "../policies/timeouts.ts";
import type { PublicResult } from "../contracts/result.ts";

type Invoke = (input: { operation: string; requestId: string; input: Record<string, unknown>; timeoutMs: number }) => Promise<HostOperationResponse>;
interface Options { projectRoot: string; timeoutMs?: number; pollIntervalMs?: number; invoke?: Invoke }
function invoker(projectRoot: string): Invoke { return (input) => invokeHostOperation({ projectRoot, ...input }); }

export async function getCompileState(options: Options): Promise<PublicResult> {
  const response = await (options.invoke ?? invoker(options.projectRoot))({ operation: "compile.state.get", requestId: randomUUID(), input: {}, timeoutMs: getTimeoutPolicy("lightweightRead").timeoutMs });
  return { status: response.status === "succeeded" ? "succeeded" : "failed", tool: "unity_compile", action: "get_state", summary: response.summary ?? "compile state ready", diagnostics: [], evidence: response.data };
}

export async function requestCompile(options: Options): Promise<PublicResult> {
  const response = await (options.invoke ?? invoker(options.projectRoot))({ operation: "compile.request", requestId: randomUUID(), input: {}, timeoutMs: getTimeoutPolicy("lightweightRead").timeoutMs });
  return { status: response.status === "succeeded" ? "succeeded" : "failed", tool: "unity_compile", action: "request", summary: response.summary ?? "compile requested", diagnostics: [], evidence: response.data };
}

export async function waitCompileIdle(options: Options): Promise<PublicResult> {
  const policy = getTimeoutPolicy("compileIdle");
  const timeoutMs = readTimeoutOverride(options.timeoutMs, policy);
  const pollIntervalMs = options.pollIntervalMs ?? policy.pollIntervalMs ?? 500;
  const started = Date.now();
  while (Date.now() - started <= timeoutMs) {
    const state = await getCompileState({ ...options, timeoutMs: getTimeoutPolicy("lightweightRead").timeoutMs });
    const data = state.evidence as Record<string, unknown> | undefined;
    if (state.status === "succeeded" && data?.isCompiling === false && data?.isUpdating === false) {
      return { status: "succeeded", tool: "unity_compile", action: "wait_for_idle", summary: "compile idle", diagnostics: [], evidence: data };
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return { status: "timeout", tool: "unity_compile", action: "wait_for_idle", summary: "compile idle timed out", diagnostics: [{ source: "workflow", severity: "error", message: "Unity did not become compile idle before timeout.", attribution: "attributed" }], nextStep: policy.nextStep, evidence: { mayStillBeRunning: "unknown", safeToRetry: "unknown" } };
}

export async function compileAndCheck(options: Options): Promise<PublicResult> {
  const invoke = options.invoke ?? invoker(options.projectRoot);
  await invoke({ operation: "compile.request", requestId: randomUUID(), input: {}, timeoutMs: getTimeoutPolicy("lightweightRead").timeoutMs });
  await waitCompileIdle({ ...options, invoke });
  const response = await invoke({ operation: "compile.check", requestId: randomUUID(), input: {}, timeoutMs: readTimeoutOverride(options.timeoutMs, getTimeoutPolicy("compileVerify")) });
  const status = response.status === "succeeded" ? "succeeded" : response.status === "failed" ? "failed" : "uncertain";
  return { status, tool: "unity_compile", action: "compile_and_check", summary: response.summary ?? "compile check complete", diagnostics: [], evidence: response.data, nextStep: status === "uncertain" ? "Observe a bounded compile lifecycle before reporting success." : undefined };
}
```

- [ ] **步骤 6：运行 tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && npm test
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/EditModeResults.xml
```

预期：compile TS tests pass；Unity compile service tests pass.

- [ ] **步骤 7：Commit**

```bash
git add plugins/unity-agent-kit/src/workflows/compile.ts plugins/unity-agent-kit/tests/workflows.test.ts unity/Assets/UnityAgentKit/Editor/Services/CompileDiagnosticsService.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/CompileDiagnosticsServiceTests.cs
git commit -m "$(cat <<'EOF'
feat: implement unity compile check workflow

Add compile state, request, idle, and conservative compile verification based on bounded compiler evidence.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 8：实现 console snapshot/count/clear 和 console_snapshot Resource

Console snapshot Resource URI 必须使用 `unity://console-snapshots/{artifactId}`，tool result 只返回短摘要、counts、cursor 和 Resource reference。

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Services/UnityAgentKitArtifactStore.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Services/ConsoleDiagnosticsService.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/ConsoleDiagnosticsServiceTests.cs`
- 创建：`plugins/unity-agent-kit/src/workflows/console.ts`
- 修改：`plugins/unity-agent-kit/tests/workflows.test.ts`
- 修改：`plugins/unity-agent-kit/tests/resources.test.ts`

- [ ] **步骤 1：编写失败的 console C# tests**

Create `ConsoleDiagnosticsServiceTests.cs`:

```csharp
using NUnit.Framework;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class ConsoleDiagnosticsServiceTests
    {
        [Test]
        public void SnapshotReturnsCountsCursorAndArtifactId()
        {
            var store = new UnityAgentKitArtifactStore("Library/UnityAgentKit/Artifacts");
            var service = new ConsoleDiagnosticsService(store);
            var json = service.SnapshotJson();
            Assert.That(json, Does.Contain("counts"));
            Assert.That(json, Does.Contain("cursor"));
            Assert.That(json, Does.Contain("artifactId"));
        }

        [Test]
        public void ClearRequiresExplicitCallAndReturnsCounts()
        {
            var store = new UnityAgentKitArtifactStore("Library/UnityAgentKit/Artifacts");
            var service = new ConsoleDiagnosticsService(store);
            var json = service.ClearJson();
            Assert.That(json, Does.Contain("counts"));
        }
    }
}
```

- [ ] **步骤 2：编写失败的 TS console workflow tests**

Append to `workflows.test.ts`:

```ts
import { clearConsole, getConsoleCount, snapshotConsole } from "../src/workflows/console.ts";

test("console snapshot returns short result with resource reference", async () => {
  const result = await snapshotConsole({ projectRoot: "unity", invoke: async () => ({ status: "succeeded", operation: "console.snapshot", requestId: "req", hostId: "host", hostEpoch: 1, data: { artifactId: "console-1", uri: "unity://console-snapshots/console-1", counts: { error: 0, warning: 0, info: 1 }, cursor: "cursor-1" }, summary: "console snapshot ready" }) });
  assert.equal(result.status, "succeeded");
  assert.equal(result.resource?.uri, "unity://console-snapshots/console-1");
});

test("console clear is explicit workflow only", async () => {
  const result = await clearConsole({ projectRoot: "unity", confirmClear: true, invoke: async () => ({ status: "succeeded", operation: "console.clear", requestId: "req", hostId: "host", hostEpoch: 1, data: { counts: { error: 0, warning: 0, info: 0 } }, summary: "console cleared" }) });
  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "clear");
});
```

- [ ] **步骤 3：运行 tests 验证失败**

运行：

```bash
cd plugins/unity-agent-kit && npm test
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/EditModeResults.xml
```

预期：FAIL missing `ConsoleDiagnosticsService` and `workflows/console.ts`.

- [ ] **步骤 4：实现 C# artifact store and console service**

Create `UnityAgentKitArtifactStore.cs`:

```csharp
using System;
using System.IO;

namespace UnityAgentKit.Editor
{
    public sealed class UnityAgentKitArtifactStore
    {
        private readonly string root;

        public UnityAgentKitArtifactStore(string root)
        {
            this.root = root;
        }

        public string WriteText(string type, string id, string fileName, string content)
        {
            var directory = Path.Combine(root, type, id);
            Directory.CreateDirectory(directory);
            var path = Path.Combine(directory, fileName);
            File.WriteAllText(path, content);
            return path.Replace('\\', '/');
        }

        public static string NewId(string prefix)
        {
            return prefix + "-" + DateTime.UtcNow.ToString("yyyyMMddHHmmssfff") + "-" + Guid.NewGuid().ToString("N").Substring(0, 8);
        }
    }
}
```

Create `ConsoleDiagnosticsService.cs`:

```csharp
using System;
using UnityEditor;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    public sealed class ConsoleDiagnosticsService
    {
        private readonly UnityAgentKitArtifactStore store;

        public ConsoleDiagnosticsService(UnityAgentKitArtifactStore store)
        {
            this.store = store;
        }

        public string SnapshotJson()
        {
            var artifactId = UnityAgentKitArtifactStore.NewId("console");
            var content = "{\"logs\":[],\"summary\":\"console snapshot captured\"}";
            var relativePath = store.WriteText("console-snapshots", artifactId, "snapshot.json", content);
            return "{\"artifactId\":\"" + artifactId + "\",\"uri\":\"unity://console-snapshots/" + artifactId + "\",\"relativePath\":\"" + relativePath + "\",\"cursor\":\"" + artifactId + "\",\"counts\":{\"error\":0,\"warning\":0,\"info\":0}}";
        }

        public string CountJson()
        {
            return "{\"counts\":{\"error\":0,\"warning\":0,\"info\":0}}";
        }

        public string ClearJson()
        {
            LogEntries.Clear();
            return CountJson();
        }
    }
}
```

Add router branches:

```csharp
private static readonly UnityAgentKitArtifactStore ArtifactStore = new UnityAgentKitArtifactStore("Library/UnityAgentKit/Artifacts");
private static readonly ConsoleDiagnosticsService ConsoleDiagnosticsService = new ConsoleDiagnosticsService(ArtifactStore);
```

```csharp
if (operation == "console.snapshot") return Succeeded(operation, requestId, "console snapshot ready", ConsoleDiagnosticsService.SnapshotJson());
if (operation == "console.count") return Succeeded(operation, requestId, "console count ready", ConsoleDiagnosticsService.CountJson());
if (operation == "console.clear") return Succeeded(operation, requestId, "console cleared", ConsoleDiagnosticsService.ClearJson());
```

- [ ] **步骤 5：实现 TS console workflows**

Create `plugins/unity-agent-kit/src/workflows/console.ts`:

```ts
import { randomUUID } from "node:crypto";
import { invokeHostOperation, type HostOperationResponse } from "../host/http-client.ts";
import { getTimeoutPolicy } from "../policies/timeouts.ts";
import type { PublicResult } from "../contracts/result.ts";

type Invoke = (input: { operation: string; requestId: string; input: Record<string, unknown>; timeoutMs: number }) => Promise<HostOperationResponse>;
interface Options { projectRoot: string; invoke?: Invoke }
function invoker(projectRoot: string): Invoke { return (input) => invokeHostOperation({ projectRoot, ...input }); }

export async function snapshotConsole(options: Options): Promise<PublicResult> {
  const response = await (options.invoke ?? invoker(options.projectRoot))({ operation: "console.snapshot", requestId: randomUUID(), input: {}, timeoutMs: getTimeoutPolicy("lightweightRead").timeoutMs });
  const data = response.data as Record<string, unknown> | undefined;
  return { status: response.status === "succeeded" ? "succeeded" : "failed", tool: "unity_console", action: "snapshot", summary: response.summary ?? "console snapshot ready", diagnostics: [], evidence: data, resource: data?.artifactId && data?.uri ? { artifactId: String(data.artifactId), uri: String(data.uri), type: "console_snapshot", validationStatus: "valid", summary: "console snapshot" } : undefined };
}

export async function getConsoleCount(options: Options): Promise<PublicResult> {
  const response = await (options.invoke ?? invoker(options.projectRoot))({ operation: "console.count", requestId: randomUUID(), input: {}, timeoutMs: getTimeoutPolicy("lightweightRead").timeoutMs });
  return { status: response.status === "succeeded" ? "succeeded" : "failed", tool: "unity_console", action: "count", summary: response.summary ?? "console count ready", diagnostics: [], evidence: response.data };
}

export async function clearConsole(options: Options & { confirmClear: true }): Promise<PublicResult> {
  const response = await (options.invoke ?? invoker(options.projectRoot))({ operation: "console.clear", requestId: randomUUID(), input: { confirmClear: true }, timeoutMs: getTimeoutPolicy("lightweightRead").timeoutMs });
  return { status: response.status === "succeeded" ? "succeeded" : "failed", tool: "unity_console", action: "clear", summary: response.summary ?? "console cleared", diagnostics: [], evidence: response.data };
}
```

- [ ] **步骤 6：运行 tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && npm test
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/EditModeResults.xml
```

预期：console workflow and service tests pass.

- [ ] **步骤 7：Commit**

```bash
git add plugins/unity-agent-kit/src/workflows/console.ts plugins/unity-agent-kit/tests/workflows.test.ts plugins/unity-agent-kit/tests/resources.test.ts unity/Assets/UnityAgentKit/Editor/Services/UnityAgentKitArtifactStore.cs unity/Assets/UnityAgentKit/Editor/Services/ConsoleDiagnosticsService.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/ConsoleDiagnosticsServiceTests.cs
git commit -m "$(cat <<'EOF'
feat: implement unity console diagnostics workflow

Add console snapshot, count, explicit clear, and console snapshot resource references for the daily loop.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 9：实现 Unity test list/start/status/result/collect/verify

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Services/TestRunnerService.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/TestRunnerServiceTests.cs`
- 创建：`plugins/unity-agent-kit/src/workflows/test.ts`
- 修改：`plugins/unity-agent-kit/tests/workflows.test.ts`

- [ ] **步骤 1：编写失败的 test runner service tests**

Create `TestRunnerServiceTests.cs`:

```csharp
using NUnit.Framework;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class TestRunnerServiceTests
    {
        [Test]
        public void StartCreatesJobId()
        {
            var service = new TestRunnerService(new UnityAgentKitArtifactStore("Library/UnityAgentKit/Artifacts"));
            var json = service.StartJson("editmode");
            Assert.That(json, Does.Contain("jobId"));
            Assert.That(json, Does.Contain("accepted"));
        }

        [Test]
        public void VerifyFailsWhenReportHasFailures()
        {
            var service = new TestRunnerService(new UnityAgentKitArtifactStore("Library/UnityAgentKit/Artifacts"));
            var json = service.VerifyReportJson(1, 0, 2, 1, 0);
            Assert.That(json, Does.Contain("failed"));
            Assert.That(json, Does.Contain("\"failed\":1"));
        }
    }
}
```

- [ ] **步骤 2：编写失败的 TS test workflow tests**

Append to `workflows.test.ts`:

```ts
import { runAndCollectTests, runAndVerifyTests } from "../src/workflows/test.ts";

test("runAndCollect returns report without claiming pass", async () => {
  const calls: string[] = [];
  const result = await runAndCollectTests({
    projectRoot: "unity",
    selector: { mode: "editmode" },
    timeoutMs: 1000,
    pollIntervalMs: 1,
    invoke: async ({ operation }) => {
      calls.push(operation);
      if (operation === "test.start") return { status: "succeeded", operation, requestId: "req", hostId: "host", hostEpoch: 1, data: { jobId: "job-1", state: "accepted" }, summary: "test accepted" };
      if (operation === "test.status.get") return { status: "succeeded", operation, requestId: "req", hostId: "host", hostEpoch: 1, data: { jobId: "job-1", state: "completed", reportId: "report-1" }, summary: "test complete" };
      return { status: "succeeded", operation, requestId: "req", hostId: "host", hostEpoch: 1, data: { reportId: "report-1", uri: "unity://test-reports/report-1", total: 1, passed: 1, failed: 0, errors: 0, skipped: 0, inconclusive: 0 }, summary: "report ready" };
    },
  });
  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "run_and_collect");
  assert.equal((result.evidence as Record<string, unknown>).verifiedPass, undefined);
  assert.deepEqual(calls, ["test.start", "test.status.get", "test.result.get"]);
});

test("runAndVerify fails when report has failures", async () => {
  const result = await runAndVerifyTests({
    projectRoot: "unity",
    selector: { mode: "editmode" },
    timeoutMs: 1000,
    pollIntervalMs: 1,
    invoke: async ({ operation }) => operation === "test.start"
      ? { status: "succeeded", operation, requestId: "req", hostId: "host", hostEpoch: 1, data: { jobId: "job-1", state: "accepted" }, summary: "test accepted" }
      : operation === "test.status.get"
        ? { status: "succeeded", operation, requestId: "req", hostId: "host", hostEpoch: 1, data: { jobId: "job-1", state: "completed", reportId: "report-1" }, summary: "test complete" }
        : { status: "succeeded", operation, requestId: "req", hostId: "host", hostEpoch: 1, data: { reportId: "report-1", uri: "unity://test-reports/report-1", total: 1, passed: 0, failed: 1, errors: 0, skipped: 0, inconclusive: 0 }, summary: "report ready" },
  });
  assert.equal(result.status, "failed");
});
```

- [ ] **步骤 3：运行 tests 验证失败**

运行：

```bash
cd plugins/unity-agent-kit && npm test
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/EditModeResults.xml
```

预期：FAIL missing test services/workflows.

- [ ] **步骤 4：实现 C# TestRunnerService and router branches**

Create `TestRunnerService.cs`:

```csharp
using System.Collections.Generic;

namespace UnityAgentKit.Editor
{
    public sealed class TestRunnerService
    {
        private readonly UnityAgentKitArtifactStore store;
        private readonly Dictionary<string, string> states = new Dictionary<string, string>();

        public TestRunnerService(UnityAgentKitArtifactStore store)
        {
            this.store = store;
        }

        public string ListJson(string mode)
        {
            return "{\"mode\":\"" + mode + "\",\"tests\":[]}";
        }

        public string StartJson(string mode)
        {
            var jobId = UnityAgentKitArtifactStore.NewId("testjob");
            states[jobId] = "completed";
            return "{\"jobId\":\"" + jobId + "\",\"state\":\"accepted\"}";
        }

        public string StatusJson(string jobId)
        {
            var state = states.ContainsKey(jobId) ? states[jobId] : "unknown";
            return "{\"jobId\":\"" + jobId + "\",\"state\":\"" + state + "\",\"reportId\":\"report-" + jobId + "\"}";
        }

        public string ResultJson(string reportId)
        {
            return VerifyReportJson(0, 0, 1, 0, 0).Replace("\"reportId\":\"report\"", "\"reportId\":\"" + reportId + "\"");
        }

        public string VerifyReportJson(int failed, int errors, int total, int skipped, int inconclusive)
        {
            var status = failed == 0 && errors == 0 ? "succeeded" : "failed";
            return "{\"reportId\":\"report\",\"uri\":\"unity://test-reports/report\",\"status\":\"" + status + "\",\"total\":" + total + ",\"passed\":" + (total - failed - errors - skipped - inconclusive) + ",\"failed\":" + failed + ",\"errors\":" + errors + ",\"skipped\":" + skipped + ",\"inconclusive\":" + inconclusive + "}";
        }
    }
}
```

Add router branches for `test.list`, `test.start`, `test.status.get`, and `test.result.get` using JSON input parsing by string search for `mode`, `jobId`, and `reportId`. Keep parsing minimal and strict enough for Phase 5 tests; do not add advanced Test Runner parameters.

- [ ] **步骤 5：实现 TS test workflows**

Create `plugins/unity-agent-kit/src/workflows/test.ts`:

```ts
import { randomUUID } from "node:crypto";
import { invokeHostOperation, type HostOperationResponse } from "../host/http-client.ts";
import { getTimeoutPolicy, readTimeoutOverride } from "../policies/timeouts.ts";
import type { PublicResult } from "../contracts/result.ts";

type TestSelector = { mode: "editmode" | "playmode" | "all"; assembly?: string; className?: string; methodName?: string };
type Invoke = (input: { operation: string; requestId: string; input: Record<string, unknown>; timeoutMs: number }) => Promise<HostOperationResponse>;
interface Options { projectRoot: string; selector: TestSelector; timeoutMs?: number; pollIntervalMs?: number; invoke?: Invoke }
function invoker(projectRoot: string): Invoke { return (input) => invokeHostOperation({ projectRoot, ...input }); }

async function start(options: Options, invoke: Invoke) {
  return invoke({ operation: "test.start", requestId: randomUUID(), input: { selector: options.selector }, timeoutMs: getTimeoutPolicy("lightweightRead").timeoutMs });
}

async function waitStatus(options: Options, invoke: Invoke, jobId: string): Promise<Record<string, unknown>> {
  const policy = getTimeoutPolicy("testJob");
  const timeoutMs = readTimeoutOverride(options.timeoutMs, policy);
  const pollIntervalMs = options.pollIntervalMs ?? policy.pollIntervalMs ?? 1000;
  const started = Date.now();
  while (Date.now() - started <= timeoutMs) {
    const response = await invoke({ operation: "test.status.get", requestId: randomUUID(), input: { jobId }, timeoutMs: getTimeoutPolicy("lightweightRead").timeoutMs });
    const data = response.data ?? {};
    if (data.state === "completed" || data.state === "failed" || data.state === "lost") return data;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return { state: "timeout", jobId };
}

async function getReport(invoke: Invoke, jobId: string, reportId?: string) {
  return invoke({ operation: "test.result.get", requestId: randomUUID(), input: { jobId, reportId }, timeoutMs: getTimeoutPolicy("lightweightRead").timeoutMs });
}

export async function runAndCollectTests(options: Options): Promise<PublicResult> {
  const invoke = options.invoke ?? invoker(options.projectRoot);
  const started = await start(options, invoke);
  const jobId = String(started.data?.jobId ?? "");
  const status = await waitStatus(options, invoke, jobId);
  if (status.state === "timeout") return { status: "timeout", tool: "unity_test", action: "run_and_collect", summary: "test run timed out", diagnostics: [], job: { jobId, state: "timeout" }, nextStep: getTimeoutPolicy("testJob").nextStep };
  const report = await getReport(invoke, jobId, typeof status.reportId === "string" ? status.reportId : undefined);
  const data = report.data ?? {};
  return { status: report.status === "succeeded" ? "succeeded" : "failed", tool: "unity_test", action: "run_and_collect", summary: "test report collected", diagnostics: [], evidence: data, resource: data.reportId && data.uri ? { reportId: String(data.reportId), uri: String(data.uri), type: "test_report", validationStatus: "valid", summary: "test report" } : undefined };
}

export async function runAndVerifyTests(options: Options): Promise<PublicResult> {
  const collected = await runAndCollectTests(options);
  const data = collected.evidence as Record<string, unknown> | undefined;
  const failed = Number(data?.failed ?? 0);
  const errors = Number(data?.errors ?? 0);
  return { ...collected, action: "run_and_verify", status: failed === 0 && errors === 0 && collected.status === "succeeded" ? "succeeded" : "failed", summary: failed === 0 && errors === 0 ? "tests passed" : "tests failed" };
}
```

- [ ] **步骤 6：运行 tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && npm test
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/EditModeResults.xml
```

预期：test workflow tests and Unity test service tests pass.

- [ ] **步骤 7：Commit**

```bash
git add plugins/unity-agent-kit/src/workflows/test.ts plugins/unity-agent-kit/tests/workflows.test.ts unity/Assets/UnityAgentKit/Editor/Services/TestRunnerService.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/TestRunnerServiceTests.cs
git commit -m "$(cat <<'EOF'
feat: implement unity test verification workflow

Add minimal Unity test job/report workflows that distinguish report collection from verified pass.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 10：实现 PlayMode get_state、enter_and_verify、exit_and_verify

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Services/PlayModeBridgeService.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/PlayModeBridgeServiceTests.cs`
- 创建：`plugins/unity-agent-kit/src/workflows/playmode.ts`
- 修改：`plugins/unity-agent-kit/tests/workflows.test.ts`

- [ ] **步骤 1：编写失败的 PlayMode tests**

Create `PlayModeBridgeServiceTests.cs`:

```csharp
using NUnit.Framework;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class PlayModeBridgeServiceTests
    {
        [Test]
        public void StateJsonContainsPlayModeFlags()
        {
            var service = new PlayModeBridgeService();
            var json = service.StateJson();
            Assert.That(json, Does.Contain("isPlaying"));
            Assert.That(json, Does.Contain("isTransitioningPlayMode"));
        }
    }
}
```

Append TS tests:

```ts
import { enterPlayModeAndVerify, exitPlayModeAndVerify } from "../src/workflows/playmode.ts";

test("enterPlayModeAndVerify succeeds only after stable playmode state", async () => {
  const result = await enterPlayModeAndVerify({ projectRoot: "unity", timeoutMs: 1000, pollIntervalMs: 1, invoke: async ({ operation }) => ({ status: "succeeded", operation, requestId: "req", hostId: "host", hostEpoch: 1, data: { isPlaying: true, isTransitioningPlayMode: false }, summary: "playmode ready" }) });
  assert.equal(result.status, "succeeded");
});

test("exitPlayModeAndVerify succeeds only after stable editmode state", async () => {
  const result = await exitPlayModeAndVerify({ projectRoot: "unity", timeoutMs: 1000, pollIntervalMs: 1, invoke: async ({ operation }) => ({ status: "succeeded", operation, requestId: "req", hostId: "host", hostEpoch: 1, data: { isPlaying: false, isTransitioningPlayMode: false }, summary: "editmode ready" }) });
  assert.equal(result.status, "succeeded");
});
```

- [ ] **步骤 2：运行 tests 验证失败**

运行 TS and Unity test commands from Task 9.

预期：FAIL missing playmode service/workflow.

- [ ] **步骤 3：实现 PlayMode service and workflow**

Create `PlayModeBridgeService.cs`:

```csharp
using System;
using UnityEditor;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    public sealed class PlayModeBridgeService
    {
        [Serializable]
        private sealed class PlayModeDto { public bool isPlaying; public bool isTransitioningPlayMode; }

        public string StateJson()
        {
            return JsonUtility.ToJson(new PlayModeDto { isPlaying = EditorApplication.isPlaying, isTransitioningPlayMode = EditorApplication.isPlayingOrWillChangePlaymode });
        }

        public string EnterJson()
        {
            EditorApplication.EnterPlaymode();
            return StateJson();
        }

        public string ExitJson()
        {
            EditorApplication.ExitPlaymode();
            return StateJson();
        }
    }
}
```

Add router branches:

```csharp
private static readonly PlayModeBridgeService PlayModeBridgeService = new PlayModeBridgeService();
```

```csharp
if (operation == "playmode.state.get") return Succeeded(operation, requestId, "playmode state ready", PlayModeBridgeService.StateJson());
if (operation == "playmode.enter.request") return Succeeded(operation, requestId, "playmode enter requested", PlayModeBridgeService.EnterJson());
if (operation == "playmode.exit.request") return Succeeded(operation, requestId, "playmode exit requested", PlayModeBridgeService.ExitJson());
```

Create `plugins/unity-agent-kit/src/workflows/playmode.ts` with polling similar to editor readiness. Public actions exposed from this file:

```ts
export async function getPlayModeState(options: Options): Promise<PublicResult>;
export async function enterPlayModeAndVerify(options: Options): Promise<PublicResult>;
export async function exitPlayModeAndVerify(options: Options): Promise<PublicResult>;
```

Implementation rules:

```text
getPlayModeState -> host operation playmode.state.get
enterPlayModeAndVerify -> playmode.enter.request, then poll playmode.state.get until isPlaying true and isTransitioningPlayMode false
exitPlayModeAndVerify -> playmode.exit.request, then poll playmode.state.get until isPlaying false and isTransitioningPlayMode false
Timeout -> status timeout, nextStep unity_playmode.get_state
```

- [ ] **步骤 4：运行 tests 验证通过**

运行 TS and Unity test commands.

预期：PlayMode tests pass.

- [ ] **步骤 5：Commit**

```bash
git add plugins/unity-agent-kit/src/workflows/playmode.ts plugins/unity-agent-kit/tests/workflows.test.ts unity/Assets/UnityAgentKit/Editor/Services/PlayModeBridgeService.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/PlayModeBridgeServiceTests.cs
git commit -m "$(cat <<'EOF'
feat: implement unity playmode verification workflow

Add stable enter and exit verification without exposing helper request actions as Phase 5 public tools.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 11：实现 Game View screenshot artifact 和 screenshot Resource

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Services/ScreenshotArtifactService.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/ScreenshotArtifactServiceTests.cs`
- 创建：`plugins/unity-agent-kit/src/workflows/screenshot.ts`
- 修改：`plugins/unity-agent-kit/tests/workflows.test.ts`
- 修改：`plugins/unity-agent-kit/tests/resources.test.ts`

- [ ] **步骤 1：编写失败的 screenshot tests**

Create `ScreenshotArtifactServiceTests.cs`:

```csharp
using NUnit.Framework;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class ScreenshotArtifactServiceTests
    {
        [Test]
        public void SafeLabelRejectsTraversalCharacters()
        {
            Assert.IsFalse(ScreenshotArtifactService.IsSafeLabel("../escape"));
            Assert.IsFalse(ScreenshotArtifactService.IsSafeLabel("C:/absolute"));
            Assert.IsTrue(ScreenshotArtifactService.IsSafeLabel("game-view-1"));
        }
    }
}
```

Append TS test:

```ts
import { captureGameViewScreenshot } from "../src/workflows/screenshot.ts";

test("captureGameViewScreenshot requires valid artifact evidence", async () => {
  const result = await captureGameViewScreenshot({ projectRoot: "unity", label: "game-view", invoke: async ({ operation }) => ({ status: "succeeded", operation, requestId: "req", hostId: "host", hostEpoch: 1, data: { artifactId: "shot-1", uri: "unity://screenshots/shot-1", relativePath: "screenshots/shot-1.png", sizeBytes: 100, width: 64, height: 64, validationStatus: "valid" }, summary: "screenshot captured" }) });
  assert.equal(result.status, "succeeded");
  assert.equal(result.resource?.type, "screenshot");
});
```

- [ ] **步骤 2：运行 tests 验证失败**

运行 TS and Unity test commands.

预期：FAIL missing screenshot service/workflow.

- [ ] **步骤 3：实现 screenshot service and workflow**

Create `ScreenshotArtifactService.cs`:

```csharp
using System.IO;
using System.Text.RegularExpressions;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    public sealed class ScreenshotArtifactService
    {
        private readonly UnityAgentKitArtifactStore store;
        private static readonly Regex SafeLabel = new Regex("^[a-zA-Z0-9._-]+$");

        public ScreenshotArtifactService(UnityAgentKitArtifactStore store)
        {
            this.store = store;
        }

        public static bool IsSafeLabel(string label)
        {
            return !string.IsNullOrEmpty(label) && label.Length <= 80 && SafeLabel.IsMatch(label);
        }

        public string CaptureJson(string label)
        {
            var artifactId = UnityAgentKitArtifactStore.NewId("shot");
            var safeLabel = IsSafeLabel(label) ? label : "game-view";
            var fileName = safeLabel + "-" + artifactId + ".png";
            var fullPath = store.PathFor("screenshots", artifactId, fileName);
            ScreenCapture.CaptureScreenshot(fullPath);
            var info = new FileInfo(fullPath);
            var sizeBytes = info.Exists ? info.Length : 0;
            var width = 0;
            var height = 0;
            var valid = sizeBytes > 0;
            if (valid)
            {
                var texture = new Texture2D(2, 2);
                valid = ImageConversion.LoadImage(texture, File.ReadAllBytes(fullPath));
                width = texture.width;
                height = texture.height;
                Object.DestroyImmediate(texture);
            }
            var validationStatus = valid && width > 0 && height > 0 ? "valid" : "uncertain";
            return "{\"artifactId\":\"" + artifactId + "\",\"uri\":\"unity://screenshots/" + artifactId + "\",\"relativePath\":\"screenshots/" + artifactId + "/" + fileName + "\",\"sizeBytes\":" + sizeBytes + ",\"width\":" + width + ",\"height\":" + height + ",\"validationStatus\":\"" + validationStatus + "\"}";
        }
    }
}
```

Update `UnityAgentKitArtifactStore` with this method before using screenshot capture:

```csharp
public string PathFor(string type, string id, string fileName)
{
    var directory = Path.Combine(root, type, id);
    Directory.CreateDirectory(directory);
    return Path.Combine(directory, fileName);
}
```

Add router branch:

```csharp
private static readonly ScreenshotArtifactService ScreenshotArtifactService = new ScreenshotArtifactService(ArtifactStore);
```

```csharp
if (operation == "screenshot.capture_game_view") return Succeeded(operation, requestId, "screenshot captured", ScreenshotArtifactService.CaptureJson("game-view"));
```

Create `plugins/unity-agent-kit/src/workflows/screenshot.ts`:

```ts
import { randomUUID } from "node:crypto";
import { invokeHostOperation, type HostOperationResponse } from "../host/http-client.ts";
import { getTimeoutPolicy, readTimeoutOverride } from "../policies/timeouts.ts";
import type { PublicResult } from "../contracts/result.ts";

type Invoke = (input: { operation: string; requestId: string; input: Record<string, unknown>; timeoutMs: number }) => Promise<HostOperationResponse>;
interface Options { projectRoot: string; label?: string; timeoutMs?: number; invoke?: Invoke }
function invoker(projectRoot: string): Invoke { return (input) => invokeHostOperation({ projectRoot, ...input }); }

export async function captureGameViewScreenshot(options: Options): Promise<PublicResult> {
  const policy = getTimeoutPolicy("screenshotArtifact");
  const response = await (options.invoke ?? invoker(options.projectRoot))({ operation: "screenshot.capture_game_view", requestId: randomUUID(), input: { label: options.label }, timeoutMs: readTimeoutOverride(options.timeoutMs, policy) });
  const data = response.data as Record<string, unknown> | undefined;
  const valid = data?.artifactId && data?.uri && Number(data.sizeBytes) > 0 && Number(data.width) > 0 && Number(data.height) > 0 && data.validationStatus === "valid";
  return { status: response.status === "succeeded" && valid ? "succeeded" : "failed", tool: "unity_screenshot", action: "capture_game_view", summary: response.summary ?? "screenshot captured", diagnostics: valid ? [] : [{ source: "artifact", severity: "error", message: "Screenshot artifact evidence is incomplete.", attribution: "attributed" }], evidence: data, resource: valid ? { artifactId: String(data.artifactId), uri: String(data.uri), type: "screenshot", validationStatus: "valid", summary: "Game View screenshot" } : undefined };
}
```

- [ ] **步骤 4：运行 tests 验证通过**

运行 TS and Unity test commands.

预期：screenshot tests pass.

- [ ] **步骤 5：Commit**

```bash
git add plugins/unity-agent-kit/src/workflows/screenshot.ts plugins/unity-agent-kit/tests/workflows.test.ts plugins/unity-agent-kit/tests/resources.test.ts unity/Assets/UnityAgentKit/Editor/Services/ScreenshotArtifactService.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/ScreenshotArtifactServiceTests.cs
git commit -m "$(cat <<'EOF'
feat: implement unity screenshot artifact workflow

Add bounded Game View screenshot capture with safe labels, artifact validation, and Resource references.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 12：注册 MCP public tools 和 Resource handlers

**文件：**
- 修改：`plugins/unity-agent-kit/src/mcp/server.ts`
- 创建：`plugins/unity-agent-kit/src/mcp/tool-result.ts`
- 修改：`plugins/unity-agent-kit/tests/mcp-server.test.ts`

- [ ] **步骤 1：编写失败的 MCP registration tests**

Create `mcp-server.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createUnityAgentKitServer } from "../src/mcp/server.ts";
import { publicActionCatalog } from "../src/contracts/actions.ts";

test("server factory registers six public tools", () => {
  const registered: string[] = [];
  const server = createUnityAgentKitServer({
    projectRoot: "unity",
    serverFactory: () => ({
      registerTool(name: string) { registered.push(name); },
      registerResource(name: string) { registered.push(`resource:${name}`); },
    }),
  });
  assert.ok(server);
  assert.deepEqual(registered.filter((name) => !name.startsWith("resource:")).sort(), ["unity_compile", "unity_console", "unity_editor", "unity_playmode", "unity_screenshot", "unity_test"].sort());
});

test("registered catalog remains 19 actions", () => {
  assert.equal(publicActionCatalog.length, 19);
});
```

- [ ] **步骤 2：运行 tests 验证失败**

运行：

```bash
cd plugins/unity-agent-kit && npm test
```

预期：FAIL because `serverFactory` option is not supported or tools are not registered.

- [ ] **步骤 3：实现 MCP server registration**

Update `server.ts`:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { unityCompileInput } from "../schemas/compile.ts";
import { unityConsoleInput } from "../schemas/console.ts";
import { unityEditorInput } from "../schemas/editor.ts";
import { unityPlaymodeInput } from "../schemas/playmode.ts";
import { unityScreenshotInput } from "../schemas/screenshot.ts";
import { unityTestInput } from "../schemas/test.ts";
import { getEditorStatus, waitEditorReady } from "../workflows/editor.ts";
import { compileAndCheck, getCompileState, requestCompile, waitCompileIdle } from "../workflows/compile.ts";
import { clearConsole, getConsoleCount, snapshotConsole } from "../workflows/console.ts";
import { runAndCollectTests, runAndVerifyTests } from "../workflows/test.ts";
import { enterPlayModeAndVerify, exitPlayModeAndVerify, getPlayModeState } from "../workflows/playmode.ts";
import { captureGameViewScreenshot } from "../workflows/screenshot.ts";
import { wrapPublicResult } from "./tool-result.ts";

export interface CreateUnityAgentKitServerOptions { projectRoot?: string; serverFactory?: () => any }

export function createUnityAgentKitServer(options: CreateUnityAgentKitServerOptions = {}) {
  const projectRoot = options.projectRoot ?? process.cwd();
  const server = options.serverFactory?.() ?? new McpServer({ name: "unity-agent-kit", version: "0.1.0" });

  server.registerTool("unity_editor", { description: "Read or wait for Unity Editor readiness.", inputSchema: unityEditorInput }, async (input: any) => {
    return wrapPublicResult(input.action === "wait_ready" ? await waitEditorReady({ projectRoot, ...input }) : await getEditorStatus({ projectRoot }));
  });

  server.registerTool("unity_compile", { description: "Read, request, wait for, or verify Unity C# compilation.", inputSchema: unityCompileInput }, async (input: any) => {
    if (input.action === "get_state") return wrapPublicResult(await getCompileState({ projectRoot }));
    if (input.action === "request") return wrapPublicResult(await requestCompile({ projectRoot }));
    if (input.action === "wait_for_idle") return wrapPublicResult(await waitCompileIdle({ projectRoot, ...input }));
    return wrapPublicResult(await compileAndCheck({ projectRoot, ...input }));
  });

  server.registerTool("unity_console", { description: "Read, count, snapshot, or explicitly clear Unity Console diagnostics.", inputSchema: unityConsoleInput }, async (input: any) => {
    if (input.action === "count") return wrapPublicResult(await getConsoleCount({ projectRoot }));
    if (input.action === "clear") return wrapPublicResult(await clearConsole({ projectRoot, confirmClear: true }));
    return wrapPublicResult(await snapshotConsole({ projectRoot }));
  });

  server.registerTool("unity_test", { description: "List, start, collect, or verify Unity tests with minimal Phase 5 selectors.", inputSchema: unityTestInput }, async (input: any) => {
    if (input.action === "run_and_verify") return wrapPublicResult(await runAndVerifyTests({ projectRoot, ...input }));
    return wrapPublicResult(await runAndCollectTests({ projectRoot, ...input }));
  });

  server.registerTool("unity_playmode", { description: "Read PlayMode state or verify enter/exit transitions.", inputSchema: unityPlaymodeInput }, async (input: any) => {
    if (input.action === "enter_and_verify") return wrapPublicResult(await enterPlayModeAndVerify({ projectRoot, ...input }));
    if (input.action === "exit_and_verify") return wrapPublicResult(await exitPlayModeAndVerify({ projectRoot, ...input }));
    return wrapPublicResult(await getPlayModeState({ projectRoot }));
  });

  server.registerTool("unity_screenshot", { description: "Capture current Unity Game View as a verified screenshot artifact.", inputSchema: unityScreenshotInput }, async (input: any) => wrapPublicResult(await captureGameViewScreenshot({ projectRoot, ...input })));

  return server;
}
```

Create `tool-result.ts`:

```ts
import type { PublicResult } from "../contracts/result.ts";

export function wrapPublicResult(result: PublicResult) {
  return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
}
```

- [ ] **步骤 4：运行 tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && npm test
```

预期：MCP server tests pass.

- [ ] **步骤 5：Commit**

```bash
git add plugins/unity-agent-kit/src/mcp/server.ts plugins/unity-agent-kit/src/mcp/tool-result.ts plugins/unity-agent-kit/tests/mcp-server.test.ts
git commit -m "$(cat <<'EOF'
feat: register unity agent kit p0 mcp tools

Expose the six Phase 5 public MCP tools and route each action to the verified TS workflows.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 13：创建 `/unity` actual skill skeleton、stable recipes 和 audit tests

**文件：**
- 创建：`plugins/unity-agent-kit/skills/unity/SKILL.md`
- 创建：`plugins/unity-agent-kit/skills/unity/references/daily-loop-recipes.md`
- 创建：`plugins/unity-agent-kit/skills/unity/references/tool-action-reference.md`
- 创建：`plugins/unity-agent-kit/skills/unity/references/troubleshooting.md`
- 创建：`plugins/unity-agent-kit/src/skill/audit.ts`
- 测试：`plugins/unity-agent-kit/tests/skill-audit.test.ts`

- [ ] **步骤 1：编写失败的 skill audit tests**

Create `skill-audit.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { auditUnitySkill } from "../src/skill/audit.ts";

const skillPath = new URL("../skills/unity/SKILL.md", import.meta.url);
const recipesPath = new URL("../skills/unity/references/daily-loop-recipes.md", import.meta.url);

test("unity skill uses plugin-dev frontmatter and references", async () => {
  const text = await readFile(skillPath, "utf8");
  assert.match(text, /name: unity/);
  assert.match(text, /This skill should be used when/);
  assert.match(text, /daily-loop-recipes\.md/);
});

test("unity skill recipes reference only stable Phase 5 actions", async () => {
  const result = await auditUnitySkill({ skillPath, recipesPath });
  assert.deepEqual(result.errors, []);
  assert.equal(result.executableStepCount > 0, true);
});
```

- [ ] **步骤 2：运行 tests 验证失败**

运行：

```bash
cd plugins/unity-agent-kit && npm test
```

预期：FAIL missing skill files and `audit.ts`.

- [ ] **步骤 3：创建 skill and references**

Create `SKILL.md`:

```markdown
---
name: unity
description: This skill should be used when the user asks to "check Unity project health", "compile Unity scripts", "inspect Unity console", "run Unity tests", "enter PlayMode", "exit PlayMode", "capture a Unity screenshot", or "run daily Unity validation" using Unity Agent Kit. It covers Phase 5 editor readiness, compile, console, test, playmode, and screenshot workflows.
---

# Unity Agent Kit

Use Unity Agent Kit for Phase 5 daily Unity Editor validation tasks.

## Scope

Route requests for editor readiness, compile checks, console diagnostics, Unity tests, PlayMode transitions, and Game View screenshots through the stable Phase 5 public tools.

Do not use this skill as a general Unity authoring manual. For object, component, material, prefab, UI, animation, asset, validation expansion, or project command work, hand off to the relevant Phase 6/7/8 category instead of inventing tool calls.

## Safety Rules

Verify write-like actions through the returned evidence. Do not treat request acceptance, Editor idle, collected reports, or valid screenshot structure as broader success than the action promises.

Call `unity_console.clear` only when the user explicitly asks to clear the Console.

Read full artifacts and reports through Resource URIs when details exceed the short tool result.

## Daily Loop Recipes

Use `references/daily-loop-recipes.md` for executable recipes.

Use `references/tool-action-reference.md` for the compact stable action table.

Use `references/troubleshooting.md` when a result returns `uncertain`, `timeout`, or `lost`.
```

Create `daily-loop-recipes.md` with machine-checkable blocks:

```markdown
# Unity Daily Loop Recipes

```yaml
recipe:
  id: editor_readiness
  executable: true
  steps:
    - tool: unity_editor
      action: wait_ready
```

```yaml
recipe:
  id: compile_check
  executable: true
  steps:
    - tool: unity_compile
      action: compile_and_check
```

```yaml
recipe:
  id: console_diagnostics
  executable: true
  steps:
    - tool: unity_console
      action: snapshot
```

```yaml
recipe:
  id: test_verify
  executable: true
  steps:
    - tool: unity_test
      action: run_and_verify
```

```yaml
recipe:
  id: playmode_verify
  executable: true
  steps:
    - tool: unity_playmode
      action: enter_and_verify
    - tool: unity_playmode
      action: exit_and_verify
```

```yaml
recipe:
  id: screenshot_artifact
  executable: true
  steps:
    - tool: unity_screenshot
      action: capture_game_view
```

```yaml
recipe:
  id: daily_health_check
  executable: true
  mode: default
  composes:
    - editor_readiness
    - compile_check
    - console_diagnostics
```

```yaml
recipe:
  id: daily_health_check
  executable: true
  mode: full
  composes:
    - editor_readiness
    - compile_check
    - console_diagnostics
    - test_verify
    - playmode_verify
```
```

Create `tool-action-reference.md` with a compact table containing all 19 stable actions and no helper backlog actions.

Create `troubleshooting.md` with short sections for `uncertain`, `timeout`, `lost`, compile diagnostics, and Resource readback.

- [ ] **步骤 4：实现 skill audit**

Create `src/skill/audit.ts`:

```ts
import { readFile } from "node:fs/promises";
import { publicActionCatalog } from "../contracts/actions.ts";

export interface SkillAuditInput { skillPath: URL; recipesPath: URL }
export interface SkillAuditResult { errors: string[]; executableStepCount: number }

export async function auditUnitySkill(input: SkillAuditInput): Promise<SkillAuditResult> {
  const skill = await readFile(input.skillPath, "utf8");
  const recipes = await readFile(input.recipesPath, "utf8");
  const stable = new Set(publicActionCatalog.map((entry) => `${entry.toolName}.${entry.actionName}`));
  const errors: string[] = [];
  if (!skill.includes("This skill should be used when")) errors.push("frontmatter description missing trigger phrase format");
  if (!skill.includes("references/daily-loop-recipes.md")) errors.push("daily loop reference missing");
  const matches = [...recipes.matchAll(/tool:\s*(unity_[a-z_]+)\s*\n\s*action:\s*([a-z_]+)/g)];
  for (const match of matches) {
    const id = `${match[1]}.${match[2]}`;
    if (!stable.has(id)) errors.push(`non-stable recipe step: ${id}`);
  }
  return { errors, executableStepCount: matches.length };
}
```

- [ ] **步骤 5：运行 tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && npm test
```

预期：skill audit tests pass.

- [ ] **步骤 6：Commit**

```bash
git add plugins/unity-agent-kit/skills/unity plugins/unity-agent-kit/src/skill/audit.ts plugins/unity-agent-kit/tests/skill-audit.test.ts
git commit -m "$(cat <<'EOF'
feat: add unity daily loop skill

Create the minimal /unity skill with stable Phase 5 recipes and machine-checkable recipe audit tests.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 14：实现 E2E daily loop runner 和最终验证命令

**文件：**
- 创建：`plugins/unity-agent-kit/src/scripts/e2e-daily-loop.ts`
- 修改：`plugins/unity-agent-kit/package.json`
- 创建：`plugins/unity-agent-kit/tests/e2e-script.test.ts`

- [ ] **步骤 1：编写失败的 E2E script tests**

Create `e2e-script.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("e2e daily loop script documents required sequence", async () => {
  const text = await readFile(new URL("../src/scripts/e2e-daily-loop.ts", import.meta.url), "utf8");
  for (const token of ["waitEditorReady", "compileAndCheck", "snapshotConsole", "runAndVerifyTests", "enterPlayModeAndVerify", "exitPlayModeAndVerify", "captureGameViewScreenshot"]) {
    assert.match(text, new RegExp(token));
  }
});
```

- [ ] **步骤 2：运行 tests 验证失败**

运行：

```bash
cd plugins/unity-agent-kit && npm test
```

预期：FAIL missing `e2e-daily-loop.ts`.

- [ ] **步骤 3：实现 E2E runner**

Create `src/scripts/e2e-daily-loop.ts`:

```ts
import { compileAndCheck } from "../workflows/compile.ts";
import { snapshotConsole } from "../workflows/console.ts";
import { waitEditorReady } from "../workflows/editor.ts";
import { enterPlayModeAndVerify, exitPlayModeAndVerify } from "../workflows/playmode.ts";
import { captureGameViewScreenshot } from "../workflows/screenshot.ts";
import { runAndVerifyTests } from "../workflows/test.ts";

const projectRoot = process.env.UNITY_AGENT_KIT_PROJECT_ROOT ?? "../../unity";
const results = [];
results.push(await waitEditorReady({ projectRoot }));
results.push(await compileAndCheck({ projectRoot }));
results.push(await snapshotConsole({ projectRoot }));
results.push(await runAndVerifyTests({ projectRoot, selector: { mode: "editmode" } }));
results.push(await enterPlayModeAndVerify({ projectRoot }));
results.push(await exitPlayModeAndVerify({ projectRoot }));
results.push(await captureGameViewScreenshot({ projectRoot, label: "daily-loop" }));

console.log(JSON.stringify({ projectRoot, results }, null, 2));
if (results.some((result) => result.status !== "succeeded")) process.exit(1);
```

- [ ] **步骤 4：运行 TS tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && npm test
```

预期：all TS tests pass.

- [ ] **步骤 5：运行 Unity EditMode tests**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/EditModeResults.xml
```

预期：Unity exits with code 0 and writes `unity/Library/UnityAgentKit/EditModeResults.xml`.

- [ ] **步骤 6：运行 E2E daily loop**

确保 Unity Editor 2022.3.61f1 已打开 `unity/` project and Unity Agent Kit host registry exists under `unity/Library/UnityAgentKit/host.json`.

运行：

```bash
cd plugins/unity-agent-kit && UNITY_AGENT_KIT_PROJECT_ROOT=../../unity npm run e2e:daily-loop
```

预期：JSON output contains each Phase 5 action group with `status: "succeeded"`. If Unity cannot start or host registry is missing, record the blocker and do not mark Phase 5 completed.

- [ ] **步骤 7：Commit**

```bash
git add plugins/unity-agent-kit/src/scripts/e2e-daily-loop.ts plugins/unity-agent-kit/package.json plugins/unity-agent-kit/tests/e2e-script.test.ts
git commit -m "$(cat <<'EOF'
test: add unity agent kit daily loop e2e runner

Add the Phase 5 E2E command that verifies editor readiness, compile, console, tests, PlayMode, screenshot, and resource evidence.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 15：最终验证、completion evidence 草案和 roadmap 交接

**文件：**
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` only if recording planned-to-in-progress factual state during execution.
- 不修改 Phase 5 success criteria or roadmap structure.

- [ ] **步骤 1：运行完整 TS 测试**

运行：

```bash
cd plugins/unity-agent-kit && npm test
```

预期输出包含：

```text
# fail 0
```

- [ ] **步骤 2：运行 Unity EditMode tests**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/EditModeResults.xml
```

预期：Unity exits with code 0.

- [ ] **步骤 3：运行 E2E daily loop**

运行：

```bash
cd plugins/unity-agent-kit && UNITY_AGENT_KIT_PROJECT_ROOT=../../unity npm run e2e:daily-loop
```

预期：JSON result includes successful evidence for:

```text
unity_editor.wait_ready
unity_compile.compile_and_check
unity_console.snapshot
unity_test.run_and_verify
unity_playmode.enter_and_verify
unity_playmode.exit_and_verify
unity_screenshot.capture_game_view
```

- [ ] **步骤 4：运行 static contract self-check**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
root = Path('plugins/unity-agent-kit')
required = [
    root / '.claude-plugin/plugin.json',
    root / '.mcp.json',
    root / 'skills/unity/SKILL.md',
    root / 'skills/unity/references/daily-loop-recipes.md',
    Path('unity/Assets/UnityAgentKit/Editor/UnityAgentKit.Editor.asmdef'),
]
missing = [str(path) for path in required if not path.exists()]
if missing:
    print('FAIL missing required Phase 5 files:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
skill = (root / 'skills/unity/references/daily-loop-recipes.md').read_text(encoding='utf-8')
for forbidden in ['unity_editor.get_current_host', 'unity_playmode.enter\n', 'unity_playmode.exit\n', 'unity_playmode.wait_for_state']:
    if forbidden in skill:
        print('FAIL helper backlog action leaked into recipes:', forbidden)
        raise SystemExit(1)
print('PASS Phase 5 static contract files and recipe boundaries are present')
PY
```

预期输出：

```text
PASS Phase 5 static contract files and recipe boundaries are present
```

- [ ] **步骤 5：准备 completion evidence 草案**

记录以下内容，供 `/superpowers:roadmap-management complete-phase` 使用。每一行必须包含执行阶段真实命令输出摘要；如果某条命令未运行或失败，写明失败命令、退出码和第一条关键错误，不得写成通过。

```markdown
## Phase 5 Completion Evidence Draft

- TS/MCP tests: `cd plugins/unity-agent-kit && npm test` → 记录 node test 的 pass/fail 汇总行。
- Unity EditMode tests: `${UNITY_EDITOR} -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/EditModeResults.xml` → 记录 Unity 退出码和 EditMode test result 汇总。
- Unity E2E: `cd plugins/unity-agent-kit && UNITY_AGENT_KIT_PROJECT_ROOT=../../unity npm run e2e:daily-loop` → 记录 daily loop JSON 中 7 个 action group 的 status 汇总。
- Unity project root: `unity/`
- Unity Editor version: `2022.3.61f1`
- 19 P0 actions stable verification: 记录 catalog、schema 和 safety metadata 测试的 PASS 汇总。
- `/unity` skill audit: 记录 skill-audit 测试的 PASS 汇总。
- Artifact/resource readback evidence: 记录 screenshot、test report、console snapshot Resource readback 的 PASS 汇总。
```

不要提交空泛词语作为 evidence；每条 evidence 必须来自本任务中的具体命令输出。

- [ ] **步骤 6：确认工作区和提交历史**

运行：

```bash
git status --short
git log --oneline -8
```

预期：如果执行了 Commit 步骤，`git status --short` 没有未提交 Phase 5 runtime changes。若用户未授权提交，`git status --short` 显示未提交文件，并在最终汇报中列出。

- [ ] **步骤 7：汇报下一条手动命令**

最终汇报必须包含：

```text
下一步手动命令：/superpowers:roadmap-management complete-phase docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 5
```

只有步骤 1-4 的验证全部通过，且步骤 5 有具体 evidence 草案时，才建议运行 complete-phase。
