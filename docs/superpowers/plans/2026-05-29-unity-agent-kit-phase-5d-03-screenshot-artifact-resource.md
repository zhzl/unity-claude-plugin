# Unity Agent Kit Phase 5D-03 Screenshot Artifact Resource 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。
**目标：** 为 Unity Agent Kit 添加内部 `unity_screenshot.capture_game_view` workflow foundation，证明 Game View screenshot 通过可接受 capture method 生成真实 PNG artifact，并由 TS Resource readback + PNG header/dimension validation 作最终成功判定。
**架构：** Unity C# 只提供短主线程 Game View producer operation：验证 capture method、聚焦/重绘 Game View、请求 `ScreenCapture.CaptureScreenshot`、写入受控 artifact metadata；TS 负责 label validation、workflow timeout、host continuity、Resource URI/readback、PNG signature/IHDR dimension validation 和最终 public-result-shaped judgment。计划显式拒绝 forbidden path：`InternalEditorUtility.ReadScreenPixel + Texture2D.EncodeToPNG + File.WriteAllBytes`。
**技术栈:** TypeScript ESM、Node.js built-in test runner、Unity Editor C# EditMode tests、Unity `ScreenCapture.CaptureScreenshot`、Unity Agent Kit Phase 5B artifact/resource contracts。
**拆分检查：** 已检查；无需继续拆分。5D-03 是单一可交付软件单元：Screenshot capture-method feasibility + Game View producer + artifact Resource readback + TS PNG validation。5D-01a、5D-01b、5D-02 已完成且不在本计划中重做；5D-04 combined evidence sync 仍 pending。
**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5 / Phase 5D-03
**Spec:** `docs/superpowers/specs/2026-05-28-unity-agent-kit-phase-5d-test-playmode-screenshot-workflows-design.md`
**Parent Index:** `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md`

---

## 文件结构

- 创建：`plugins/unity-agent-kit/src/diagnostics/screenshot.ts`
  - 定义 internal operation `screenshot.capture`、screenshot capture summary DTO parser、safe label validation、host result mapping。
- 创建：`plugins/unity-agent-kit/src/workflows/screenshot.ts`
  - 暴露 `captureGameViewScreenshot()`。
  - 执行 rebind-aware host operation、bounded Resource readback、PNG signature/IHDR dimension validation、metadata/payload consistency check、timeout/continuity/failure judgment。
- 创建：`plugins/unity-agent-kit/tests/screenshot-workflows.test.ts`
  - 覆盖 TS parser、label rejection、Resource readback requirement、PNG header/dimension validation、metadata mismatch、timeout、host continuity/project mismatch。
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
  - 添加 screenshot capture input/result/feasibility DTO。
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitScreenshotDiagnostics.cs`
  - 添加 capture-method feasibility + adapter seam。
  - Production adapter 使用 Game View discovery/focus/repaint/target-size + `ScreenCapture.CaptureScreenshot`。
  - 不引入 `InternalEditorUtility.ReadScreenPixel`、`Texture2D.EncodeToPNG` 或 screenshot payload `File.WriteAllBytes`。
- 修改：`unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs`
  - 添加 metadata-only screenshot artifact helper，用于已由 Unity capture method 写出的 PNG payload。
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
  - 注册 internal operation `screenshot.capture`，要求 main-thread dispatch。
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/ScreenshotWorkflowTests.cs`
  - Unity focused tests 覆盖 feasibility seam、safe label/controlled path、metadata writing、Game View unavailable/file-not-ready diagnostics、router dispatch requirement，以及 interactive Editor 可用时的 production Game View smoke。
- 修改：`docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md`
  - 执行完成后只更新 5D-03 row/evidence/next action。
  - 不标记 Phase 5D completed；不标记 Phase 5 completed。

## 上游约束摘要

- **Roadmap Shared Constraints:** 基于 v2 演进；Public MCP tools 与 internal operations 分离；Resources 首版只用于 artifacts/reports；Artifacts 使用统一 metadata model；TS 负责 workflow orchestration、polling、timeout、host rebind、Resource readback、final judgment；Unity C# 只做短主线程 Unity API 操作和 metadata/payload 记录；Unity host 禁止长 `Thread.Sleep`、HTTP handler busy-wait、Unity main thread `Task.Wait`、复杂 workflow 编排。
- **Phase Scope:** Phase 5D 覆盖 Test / PlayMode / Screenshot workflows 的内部 foundation。本计划只做 5D-03 screenshot capture-method feasibility、Game View capture producer、screenshot artifact metadata/payload、Resource readback、TS PNG signature/header/dimension validation。
- **Phase Out-of-scope:** 不实现 public MCP tool registration；不实现 MCP Resource handlers；不创建或修改 `/unity` skill；不做 5D-04 combined evidence sync；不做 Phase 5E final daily loop E2E；不做 Phase 6/7/8 domain workflows；不做 Scene View、EditorWindow、camera target、visual acceptance 或 gameplay correctness。
- **Success Criteria:** 先证明/隔离可接受 capture method；Unity producer 不使用 forbidden screenshot path；`captureGameViewScreenshot` 只有在 `unity://screenshots/{artifactId}` Resource readback 成功、payload 非空、PNG signature/IHDR header 有效、width/height > 0、metadata 与 payload/host summary 匹配时才返回 `succeeded`；如果目标环境 exposes Game View，5D-03 completion 还必须包含 production Game View screenshot smoke evidence；如果 Game View/headless 环境不可用，记录 blocker/partial evidence 且不把 5D-03 标记 completed，除非用户明确接受 narrower evidence boundary；timeout/lost/uncertain 不伪装成功；scope guard 和 diff check 通过。
- **用户确认事项:** 5D-01a、5D-01b、5D-02 已完成，不重跑或重做这些卡；5D-03 完成后仍不标记 Phase 5D completed，5D-04 和 Phase 5E/final daily loop E2E 仍 pending；必须首先处理 screenshot capture-method feasibility 或 adapter seam；明确拒绝 `ReadScreenPixel + EncodeToPNG + File.WriteAllBytes`。
- **本计划不包含:** MCP server registration/export/action-dispatch surface、MCP Resource handler、actual skill file、Test/PlayMode 已完成卡重做、Phase 5D combined evidence sync、Phase 5E final E2E、roadmap structural change、Phase 6/7/8 work。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-28-unity-agent-kit-phase-5d-test-playmode-screenshot-workflows-design.md` | 5D-03 scope、feasibility-first rule、TS/Unity ownership、PNG header/dimension validation、Resource readback requirement | Test/PlayMode/combined evidence work | 已分配给 5D-01a/5D-01b/5D-02/5D-04 | 全部任务 |
| `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md` | Requirement IDs、depends-on、5D-03 pending state、completion boundary | 标记 Phase 5D/Phase 5 completed | 5D-04、Phase 5E 仍 pending | 任务 7-8 |
| `plugins/unity-agent-kit/src/resources/readback.ts` 与 `src/artifacts/*` | `unity://screenshots/{artifactId}` parsing、safe artifact root、metadata/payload readback | MCP Resource handler wiring | Phase 5D 只用 internal file-backed Resource readback | 任务 3-5 |
| `plugins/unity-agent-kit/src/workflows/test.ts`、`src/workflows/console.ts` | Resource readback failure/result style、metadata consistency pattern、public-result-shaped evidence | Test report semantics、console cursor semantics | Screenshot 以 PNG payload 为主证据 | 任务 3-5 |
| `plugins/unity-agent-kit/src/workflows/playmode.ts` | rebind-aware invocation、poll/timeout/continuity helper style | PlayMode stable state semantics | Screenshot success 由 artifact readback 与 PNG header 判定 | 任务 4-5 |
| `unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs` | artifact root、安全 relative path、metadata layout | `WriteSyntheticArtifact` 的 text payload 写入 | Screenshot producer payload 应由 capture method 写 PNG，不用 synthetic text writer | 任务 1-2 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Services/ScreenshotService.cs` | Game View discovery/focus/repaint/target size、`ScreenCapture.CaptureScreenshot` default path、Game View unavailable/file-not-ready diagnostics | `InternalEditorUtility.ReadScreenPixel`、`Texture2D.EncodeToPNG`、payload `File.WriteAllBytes` fallback、v2 output root/public contract | Forbidden path 且不符合 Phase 5 artifact/resource semantics | 任务 1-2 |
| `references/Unity-Skills` | 仅采用其“screenshot 是验证闭环证据之一”的领域背景 | `/unity` skill recipe、skill routing、domain workflow 文档 | `/unity` skill 和 recipe materialization 属于 Phase 5E/后续 phase，5D-03 明确 out of scope | 无实现任务；作为边界说明 |

---

### 任务 1：添加 Unity screenshot capture-method feasibility / adapter seam 红灯测试

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/ScreenshotWorkflowTests.cs`

- [x] **步骤 1：创建 Unity focused test 文件与基础 helper**

创建 `unity/Assets/UnityAgentKit/Editor/Tests/ScreenshotWorkflowTests.cs`：

```csharp
using System;
using System.IO;
using NUnit.Framework;
using UnityEngine;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class ScreenshotWorkflowTests
    {
        [Test]
        public void CaptureMethodFeasibilityDeclaresScreenCaptureAndRejectsForbiddenPipeline()
        {
            var feasibility = UnityAgentKitScreenshotDiagnostics.GetCaptureMethodFeasibilityForTests();

            Assert.IsTrue(feasibility.supported);
            Assert.AreEqual("screen_capture_capture_screenshot", feasibility.methodId);
            Assert.AreEqual("current_game_view", feasibility.view);
            Assert.IsFalse(feasibility.usesReadScreenPixel);
            Assert.IsFalse(feasibility.usesEncodeToPng);
            Assert.IsFalse(feasibility.usesPayloadFileWriteAllBytes);
        }

        private static UnityAgentKitHostRecord TestHostRecord()
        {
            return new UnityAgentKitHostRecord
            {
                hostName = "Unity Agent Kit",
                protocolVersion = "2026-05-19",
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "host-shot",
                hostEpoch = 11,
                port = 49155,
                status = "ready",
                startedAt = "2026-05-29T10:00:00.0000000Z",
                lastProbeAt = "2026-05-29T10:00:01.0000000Z"
            };
        }

        private static string TemporaryArtifactRoot(string testName)
        {
            var directory = Path.Combine(Path.GetTempPath(), "UnityAgentKitScreenshotTests", testName, Guid.NewGuid().ToString("N"), "artifacts");
            Directory.CreateDirectory(directory);
            return directory;
        }
    }
}
```

- [x] **步骤 2：添加 adapter seam 成功写 metadata 测试**

继续写入同一文件：

```csharp
[Test]
public void CaptureGameViewForTestsWritesControlledPngArtifactMetadata()
{
    var artifactRoot = TemporaryArtifactRoot("success");
    var adapter = new RecordingScreenshotAdapter(width: 320, height: 180, writesPayload: true);

    var response = UnityAgentKitScreenshotDiagnostics.CaptureGameViewForTests(
        TestHostRecord(),
        capturedMainThreadId: 7,
        inputJson: "{\"label\":\"smoke\"}",
        artifactRoot: artifactRoot,
        adapter: adapter,
        requestId: "req-shot");

    Assert.AreEqual("succeeded", response.status, response.code + ": " + response.message);
    Assert.AreEqual("screenshot.capture", response.operation);
    var result = JsonUtility.FromJson<UnityAgentKitScreenshotCaptureResult>(response.data);
    Assert.AreEqual("unity://screenshots/" + result.artifactId, result.uri);
    Assert.AreEqual("screenshots/" + result.artifactId + ".png", result.relativePath);
    Assert.AreEqual(320, result.width);
    Assert.AreEqual(180, result.height);
    Assert.Greater(result.sizeBytes, 0);
    Assert.AreEqual("screen_capture_capture_screenshot", result.captureMethod);
    Assert.AreEqual("valid", result.validationStatus);
    Assert.IsTrue(File.Exists(Path.Combine(artifactRoot, "screenshots", result.artifactId + ".png")));
    Assert.IsTrue(File.Exists(Path.Combine(artifactRoot, "metadata", "screenshots", result.artifactId + ".json")));
    Assert.IsFalse(adapter.UsedForbiddenPath);
}
```

- [x] **步骤 3：添加 unavailable/file-not-ready 失败测试**

继续写入同一文件：

```csharp
[Test]
public void CaptureGameViewForTestsFailsWhenGameViewUnavailable()
{
    var response = UnityAgentKitScreenshotDiagnostics.CaptureGameViewForTests(
        TestHostRecord(),
        capturedMainThreadId: 7,
        inputJson: "{\"label\":\"smoke\"}",
        artifactRoot: TemporaryArtifactRoot("unavailable"),
        adapter: new RecordingScreenshotAdapter(width: 0, height: 180, writesPayload: false),
        requestId: "req-shot-unavailable");

    Assert.AreEqual("failed", response.status);
    Assert.AreEqual("screenshot.game_view_unavailable", response.code);
}

[Test]
public void CaptureGameViewForTestsFailsWhenCaptureDoesNotCreateReadyFile()
{
    var response = UnityAgentKitScreenshotDiagnostics.CaptureGameViewForTests(
        TestHostRecord(),
        capturedMainThreadId: 7,
        inputJson: "{\"label\":\"smoke\"}",
        artifactRoot: TemporaryArtifactRoot("not-ready"),
        adapter: new RecordingScreenshotAdapter(width: 320, height: 180, writesPayload: false),
        requestId: "req-shot-not-ready");

    Assert.AreEqual("failed", response.status);
    Assert.AreEqual("screenshot.file_not_ready", response.code);
}
```

- [x] **步骤 4：添加 test adapter**

继续写入同一文件、放在 class 内：

```csharp
private sealed class RecordingScreenshotAdapter : UnityAgentKitScreenshotDiagnostics.IScreenshotCaptureAdapter
{
    private readonly int width;
    private readonly int height;
    private readonly bool writesPayload;

    public RecordingScreenshotAdapter(int width, int height, bool writesPayload)
    {
        this.width = width;
        this.height = height;
        this.writesPayload = writesPayload;
    }

    public bool UsedForbiddenPath { get; private set; }

    public UnityAgentKitScreenshotCaptureMethodFeasibility Feasibility => new UnityAgentKitScreenshotCaptureMethodFeasibility
    {
        supported = true,
        methodId = "screen_capture_capture_screenshot",
        view = "current_game_view",
        usesReadScreenPixel = false,
        usesEncodeToPng = false,
        usesPayloadFileWriteAllBytes = false,
        diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
    };

    public bool TryGetGameViewSize(out int gameViewWidth, out int gameViewHeight, out UnityAgentKitDiagnostic diagnostic)
    {
        gameViewWidth = width;
        gameViewHeight = height;
        diagnostic = null;
        return width > 0 && height > 0;
    }

    public void FocusAndRepaintGameView()
    {
    }

    public void CaptureGameViewPng(string absolutePath)
    {
        if (!writesPayload)
        {
            return;
        }

        Directory.CreateDirectory(Path.GetDirectoryName(absolutePath));
        var bytes = new byte[]
        {
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x01, 0x40,
            0x00, 0x00, 0x00, 0xB4,
            0x08, 0x06, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00
        };
        using (var stream = File.Create(absolutePath))
        {
            stream.Write(bytes, 0, bytes.Length);
        }
    }
}
```

说明：test adapter 只用于 fixture 写入；production screenshot diagnostics 文件不得使用 forbidden screenshot payload path。后续 scope guard 只扫描 implementation files。

- [x] **步骤 5：运行 Unity focused tests 验证红灯**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-03-screenshot-red.xml" -testFilter UnityAgentKit.Editor.Tests.ScreenshotWorkflowTests
```

预期：FAIL，包含缺失类型/方法，例如：

```text
The name 'UnityAgentKitScreenshotDiagnostics' does not exist
```

- [x] **步骤 6：Commit Unity 红灯测试**

```bash
git add unity/Assets/UnityAgentKit/Editor/Tests/ScreenshotWorkflowTests.cs
git commit -m "test: add phase 5d screenshot producer contracts"
```

---

### 任务 2：实现 Unity Game View screenshot producer 与 artifact metadata

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitScreenshotDiagnostics.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 测试：`unity/Assets/UnityAgentKit/Editor/Tests/ScreenshotWorkflowTests.cs`

- [x] **步骤 1：添加 screenshot DTO**

在 `UnityAgentKitModels.cs` 的 console/test DTO 附近添加：

```csharp
[Serializable]
public sealed class UnityAgentKitScreenshotCaptureInput
{
    public string label = string.Empty;
}

[Serializable]
public sealed class UnityAgentKitScreenshotCaptureMethodFeasibility
{
    public bool supported;
    public string methodId = string.Empty;
    public string view = string.Empty;
    public bool usesReadScreenPixel;
    public bool usesEncodeToPng;
    public bool usesPayloadFileWriteAllBytes;
    public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
}

[Serializable]
public sealed class UnityAgentKitScreenshotCaptureResult
{
    public string projectRoot = string.Empty;
    public string unityVersion = string.Empty;
    public string hostId = string.Empty;
    public int hostEpoch;
    public string artifactId = string.Empty;
    public string uri = string.Empty;
    public string relativePath = string.Empty;
    public int width;
    public int height;
    public long sizeBytes;
    public string captureMethod = string.Empty;
    public string validationStatus = string.Empty;
    public string label = string.Empty;
    public int capturedMainThreadId;
    public int executionThreadId;
    public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
}
```

- [x] **步骤 2：添加 metadata-only screenshot helper**

在 `UnityAgentKitArtifactContracts.cs` 中添加 public/internal helper，不写 payload，只验证已存在 PNG payload 并写 metadata：

```csharp
internal static UnityAgentKitArtifactMetadataRecord WriteScreenshotArtifactMetadata(
    string artifactRoot,
    string artifactId,
    string relativePath,
    UnityAgentKitHostRecord hostRecord,
    long sizeBytes)
{
    if (string.IsNullOrEmpty(artifactId))
    {
        throw new InvalidOperationException("Screenshot artifact id is required.");
    }

    if (!relativePath.StartsWith("screenshots/", StringComparison.Ordinal) || !relativePath.EndsWith(".png", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException("Screenshot artifact relative path must be under screenshots/ and end with .png.");
    }

    var payloadPath = ResolveArtifactPath(artifactRoot, relativePath);
    if (!File.Exists(payloadPath) || sizeBytes <= 0)
    {
        throw new InvalidOperationException("Screenshot payload must exist and be non-empty before metadata is written.");
    }

    var metadata = CreateBaseMetadata(artifactId, "screenshot", hostRecord, "unity_screenshot", "capture_game_view", sizeBytes);
    metadata.uri = "unity://screenshots/" + artifactId;
    metadata.relativePath = relativePath;
    WriteMetadata(artifactRoot, metadata);
    return metadata;
}
```

- [x] **步骤 3：实现 screenshot diagnostics class**

创建 `UnityAgentKitScreenshotDiagnostics.cs`，production adapter 必须使用 `ScreenCapture.CaptureScreenshot`：

```csharp
using System;
using System.IO;
using System.Reflection;
using System.Text.RegularExpressions;
using System.Threading;
using UnityEditor;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitScreenshotDiagnostics
    {
        private const string Operation = "screenshot.capture";
        private const string CaptureMethodId = "screen_capture_capture_screenshot";
        private static readonly IScreenshotCaptureAdapter productionAdapter = new UnityEditorScreenshotCaptureAdapter();

        internal interface IScreenshotCaptureAdapter
        {
            UnityAgentKitScreenshotCaptureMethodFeasibility Feasibility { get; }
            bool TryGetGameViewSize(out int width, out int height, out UnityAgentKitDiagnostic diagnostic);
            void FocusAndRepaintGameView();
            void CaptureGameViewPng(string absolutePath);
        }

        internal static UnityAgentKitScreenshotCaptureMethodFeasibility GetCaptureMethodFeasibilityForTests()
        {
            return productionAdapter.Feasibility;
        }

        internal static UnityAgentKitOperationResponse CaptureGameView(
            UnityAgentKitHostRecord record,
            int capturedMainThreadId,
            string inputJson,
            string requestId = "")
        {
            return CaptureGameViewForTests(record, capturedMainThreadId, inputJson, UnityAgentKitArtifactContracts.GetArtifactRoot(), productionAdapter, requestId);
        }

        internal static UnityAgentKitOperationResponse CaptureGameViewForTests(
            UnityAgentKitHostRecord record,
            int capturedMainThreadId,
            string inputJson,
            string artifactRoot,
            IScreenshotCaptureAdapter adapter,
            string requestId = "")
        {
            var startedAt = Now();
            var input = ParseInput(inputJson);
            if (!IsSafeLabel(input.label))
            {
                return Rejected(Operation, requestId, record, "screenshot.label_invalid", "Screenshot label must not contain path syntax.", startedAt);
            }

            var feasibility = adapter != null ? adapter.Feasibility : null;
            if (feasibility == null || !feasibility.supported || feasibility.usesReadScreenPixel || feasibility.usesEncodeToPng || feasibility.usesPayloadFileWriteAllBytes)
            {
                return Failed(Operation, requestId, record, "screenshot.capture_method_unavailable", "No acceptable Game View screenshot capture method is available.", startedAt);
            }

            if (!adapter.TryGetGameViewSize(out var width, out var height, out var sizeDiagnostic) || width <= 0 || height <= 0)
            {
                return Failed(Operation, requestId, record, "screenshot.game_view_unavailable", "Game view is not available for capture.", startedAt, sizeDiagnostic);
            }

            var artifactId = CreateArtifactId(input.label);
            var relativePath = "screenshots/" + artifactId + ".png";
            var absolutePath = Path.Combine(artifactRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));

            adapter.FocusAndRepaintGameView();
            adapter.CaptureGameViewPng(absolutePath);

            if (!File.Exists(absolutePath) || new FileInfo(absolutePath).Length <= 0)
            {
                return Failed(Operation, requestId, record, "screenshot.file_not_ready", "Screenshot payload was not ready after capture request.", startedAt);
            }

            var sizeBytes = new FileInfo(absolutePath).Length;
            var metadata = UnityAgentKitArtifactContracts.WriteScreenshotArtifactMetadata(artifactRoot, artifactId, relativePath, record, sizeBytes);
            var result = new UnityAgentKitScreenshotCaptureResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                artifactId = artifactId,
                uri = metadata.uri,
                relativePath = relativePath,
                width = width,
                height = height,
                sizeBytes = sizeBytes,
                captureMethod = CaptureMethodId,
                validationStatus = metadata.validationStatus,
                label = input.label ?? string.Empty,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId,
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };

            return Succeeded(Operation, requestId, record, "Screenshot artifact metadata captured.", JsonUtility.ToJson(result), startedAt);
        }
    }
}
```

在同一文件内补齐 private helpers：`ParseInput`、`IsSafeLabel`、`CreateArtifactId`、`Succeeded`、`Rejected`、`Failed`、`Create`、`Diagnostic`、`Now`、`DurationMs`、`Escape`，沿用 `UnityAgentKitPlayModeDiagnostics` / `UnityAgentKitOperationRouter` 的 response style。`CreateArtifactId` 必须只输出 `^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$` 范围内 id，例如 `shot-20260529-103012-184-smoke`。

- [x] **步骤 4：实现 production adapter**

在 `UnityAgentKitScreenshotDiagnostics.cs` 同一文件内添加 production adapter。此代码不得引用 `InternalEditorUtility.ReadScreenPixel`、`Texture2D.EncodeToPNG` 或 payload `File.WriteAllBytes`：

```csharp
private sealed class UnityEditorScreenshotCaptureAdapter : IScreenshotCaptureAdapter
{
    public UnityAgentKitScreenshotCaptureMethodFeasibility Feasibility => new UnityAgentKitScreenshotCaptureMethodFeasibility
    {
        supported = true,
        methodId = CaptureMethodId,
        view = "current_game_view",
        usesReadScreenPixel = false,
        usesEncodeToPng = false,
        usesPayloadFileWriteAllBytes = false,
        diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
    };

    public bool TryGetGameViewSize(out int width, out int height, out UnityAgentKitDiagnostic diagnostic)
    {
        diagnostic = null;
        width = 0;
        height = 0;
        var gameView = GetMainGameView();
        if (gameView == null)
        {
            diagnostic = Diagnostic("error", "screenshot.game_view_unavailable", "Game View is not available.", Operation, string.Empty);
            return false;
        }

        var targetSize = GetVector2Property(gameView, "targetSize") ?? gameView.position.size;
        width = Mathf.RoundToInt(targetSize.x);
        height = Mathf.RoundToInt(targetSize.y);
        return width > 0 && height > 0;
    }

    public void FocusAndRepaintGameView()
    {
        var gameView = GetMainGameView();
        if (gameView == null)
        {
            return;
        }

        gameView.Focus();
        gameView.Repaint();
    }

    public void CaptureGameViewPng(string absolutePath)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(absolutePath));
        ScreenCapture.CaptureScreenshot(absolutePath);
    }
}
```

补齐 `GetMainGameView()` 和 `GetVector2Property()`，采用 v2 的 Game View lookup/focus/repaint/target-size pattern，但不要复制 v2 的 forbidden fallback。

- [x] **步骤 5：注册 internal operation**

在 `UnityAgentKitOperationRouter.cs` 中添加常量、dispatch requirement 和 main-thread route：

```csharp
internal const string ScreenshotCaptureOperation = "screenshot.capture";
```

`RequiresMainThreadDispatch` 包含：

```csharp
normalized == ScreenshotCaptureOperation ||
```

`RunOnMainThread` 包含：

```csharp
if (operation == ScreenshotCaptureOperation)
{
    return UnityAgentKitScreenshotDiagnostics.CaptureGameView(record, capturedMainThreadId, request != null ? request.inputJson ?? string.Empty : string.Empty, requestId);
}
```

- [x] **步骤 6：运行 Unity focused tests 验证通过**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-03-screenshot-producer.xml" -testFilter UnityAgentKit.Editor.Tests.ScreenshotWorkflowTests
```

预期：PASS，XML 中 `failed="0"`。证明：feasibility seam 存在、production method 不声明 forbidden path、adapter seam 写受控 PNG artifact metadata、Game View unavailable/file-not-ready 明确失败。

- [x] **步骤 7：Commit Unity producer**

```bash
git add unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitScreenshotDiagnostics.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/ScreenshotWorkflowTests.cs
git commit -m "feat: add phase 5d screenshot producer"
```

---

### 任务 3：添加 TypeScript screenshot parser / PNG validation 红灯测试

**文件：**
- 创建：`plugins/unity-agent-kit/tests/screenshot-workflows.test.ts`

- [x] **步骤 1：创建 TS test 文件与 fixture helpers**

创建 `plugins/unity-agent-kit/tests/screenshot-workflows.test.ts`：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  parsePngHeaderDimensions,
  parseScreenshotCaptureData,
  screenshotCaptureOperation,
  type ScreenshotCaptureSummary,
} from "../src/diagnostics/screenshot.ts";
import { captureGameViewScreenshot, type ScreenshotWorkflowOptions } from "../src/workflows/screenshot.ts";
import {
  UNITY_AGENT_KIT_HOST_NAME,
  UNITY_AGENT_KIT_PROTOCOL_VERSION,
  type HostRegistryReadResult,
  type UnityAgentKitHostRecord,
} from "../src/host/registry.ts";
import type { HostTransport, HostTransportResult } from "../src/host/transport.ts";
```

继续写入 helper：

```ts
function sampleHostRecord(overrides: Partial<UnityAgentKitHostRecord> = {}): UnityAgentKitHostRecord {
  return {
    hostName: UNITY_AGENT_KIT_HOST_NAME,
    protocolVersion: UNITY_AGENT_KIT_PROTOCOL_VERSION,
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    hostId: "host-shot",
    hostEpoch: 11,
    port: 49520,
    status: "ready",
    startedAt: "2026-05-29T10:00:00.000Z",
    lastProbeAt: "2026-05-29T10:00:01.000Z",
    ...overrides,
  };
}

function screenshotSummary(overrides: Partial<ScreenshotCaptureSummary> = {}): ScreenshotCaptureSummary {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    hostId: "host-shot",
    hostEpoch: 11,
    artifactId: "shot-20260529-smoke",
    uri: "unity://screenshots/shot-20260529-smoke",
    relativePath: "screenshots/shot-20260529-smoke.png",
    width: 2,
    height: 3,
    sizeBytes: pngBytes(2, 3).byteLength,
    captureMethod: "screen_capture_capture_screenshot",
    validationStatus: "valid",
    label: "smoke",
    capturedMainThreadId: 1,
    executionThreadId: 1,
    diagnostics: [],
    ...overrides,
  };
}

function pngBytes(width: number, height: number): Uint8Array {
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52,
    (width >>> 24) & 0xff, (width >>> 16) & 0xff, (width >>> 8) & 0xff, width & 0xff,
    (height >>> 24) & 0xff, (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff,
    0x08, 0x06, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);
}
```

- [x] **步骤 2：添加 parser 与 PNG header tests**

继续写入同一文件：

```ts
test("screenshot parser accepts Game View artifact summary and rejects invalid shapes", () => {
  assert.deepEqual(parseScreenshotCaptureData(JSON.stringify(screenshotSummary())), screenshotSummary());
  assert.equal(parseScreenshotCaptureData("not-json"), null);
  assert.equal(parseScreenshotCaptureData(JSON.stringify({ artifactId: "shot" })), null);
  assert.equal(parseScreenshotCaptureData(JSON.stringify(screenshotSummary({ uri: "unity://test-reports/shot-20260529-smoke" }))), null);
  assert.equal(parseScreenshotCaptureData(JSON.stringify(screenshotSummary({ relativePath: "../shot.png" }))), null);
  assert.equal(parseScreenshotCaptureData(JSON.stringify(screenshotSummary({ width: 0 }))), null);
});

test("PNG header parser validates signature, IHDR, and positive dimensions", () => {
  assert.deepEqual(parsePngHeaderDimensions(pngBytes(2, 3)), { ok: true, width: 2, height: 3 });
  assert.deepEqual(parsePngHeaderDimensions(Uint8Array.from([1, 2, 3])), { ok: false, reason: "too_short" });
  const invalidSignature = pngBytes(2, 3);
  invalidSignature[0] = 0;
  assert.deepEqual(parsePngHeaderDimensions(invalidSignature), { ok: false, reason: "invalid_signature" });
  assert.deepEqual(parsePngHeaderDimensions(pngBytes(0, 3)), { ok: false, reason: "invalid_dimensions" });
});
```

- [x] **步骤 3：添加 Resource readback success behavior test**

继续写入同一文件，使用真实 Phase 5B file-backed Resource readback：

```ts
test("captureGameViewScreenshot succeeds only after screenshot Resource readback and PNG validation", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const summary = screenshotSummary({ projectRoot, sizeBytes: pngBytes(2, 3).byteLength });
    await writeScreenshotResource(artifactRoot, summary, pngBytes(2, 3));
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([{ port: record.port, result: { ok: true, statusCode: 200, body: record } }], [{
      port: record.port,
      requestId: "req-shot",
      operation: screenshotCaptureOperation,
      inputJson: "{\"label\":\"smoke\"}",
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, screenshotCaptureOperation, summary, "req-shot") },
    }]);

    const result = await captureGameViewScreenshot(options(record, transport.transport, { readRegistry: registry.readRegistry, projectRoot }), {
      requestId: "req-shot",
      label: "smoke",
      timeoutMs: 50,
      pollIntervalMs: 0,
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.tool, "unity_screenshot");
    assert.equal(result.action, "capture_game_view");
    assert.equal(result.resource?.uri, summary.uri);
    assert.deepEqual(result.evidence, {
      completion: "artifact_complete",
      artifactId: summary.artifactId,
      resourceUri: summary.uri,
      pngHeader: "valid",
      width: 2,
      height: 3,
    });
    registry.assertConsumed();
    transport.assertConsumed();
  });
});
```

Add helpers `withArtifactProject`, `writeScreenshotResource`, `registrySequence`, `transportWithProbesAndInvokes`, `options`, and `succeededEnvelope` by copying the shape from `test-workflows.test.ts` / `playmode-workflows.test.ts`, but write screenshot metadata under `metadata/screenshots/{artifactId}.json` and payload under `screenshots/{artifactId}.png`.

- [x] **步骤 4：运行 TS screenshot tests 验证红灯**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/screenshot-workflows.test.ts"
```

预期：FAIL，包含 module export/import 错误，例如：

```text
Cannot find module '../src/diagnostics/screenshot.ts'
```

- [x] **步骤 5：Commit TS 红灯测试**

```bash
git add plugins/unity-agent-kit/tests/screenshot-workflows.test.ts
git commit -m "test: add phase 5d screenshot workflow contracts"
```

---

### 任务 4：实现 TS screenshot diagnostics / workflow / PNG validation

**文件：**
- 创建：`plugins/unity-agent-kit/src/diagnostics/screenshot.ts`
- 创建：`plugins/unity-agent-kit/src/workflows/screenshot.ts`
- 测试：`plugins/unity-agent-kit/tests/screenshot-workflows.test.ts`

- [x] **步骤 1：实现 diagnostics contract 与 PNG parser**

创建 `plugins/unity-agent-kit/src/diagnostics/screenshot.ts`：

```ts
import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";

export const screenshotCaptureOperation = "screenshot.capture" as const;

export interface ScreenshotCaptureSummary {
  projectRoot: string;
  unityVersion: string;
  hostId: string;
  hostEpoch: number;
  artifactId: string;
  uri: string;
  relativePath: string;
  width: number;
  height: number;
  sizeBytes: number;
  captureMethod: string;
  validationStatus: "valid" | "invalid" | "uncertain";
  label: string;
  capturedMainThreadId: number;
  executionThreadId: number;
  diagnostics: UnityAgentKitDiagnostic[];
}

export type PngHeaderDimensionsResult =
  | { ok: true; width: number; height: number }
  | { ok: false; reason: "too_short" | "invalid_signature" | "missing_ihdr" | "invalid_dimensions" };

export function parseScreenshotCaptureData(data: unknown): ScreenshotCaptureSummary | null {
  const value = parseRecord(data);
  if (value === null) return null;
  if (!(
    isNonEmptyString(value.projectRoot) &&
    isNonEmptyString(value.unityVersion) &&
    isNonEmptyString(value.hostId) &&
    isNonNegativeInteger(value.hostEpoch) &&
    isSafeResourceId(value.artifactId) &&
    value.uri === `unity://screenshots/${value.artifactId}` &&
    isSafeScreenshotRelativePath(value.relativePath, value.artifactId) &&
    isPositiveInteger(value.width) &&
    isPositiveInteger(value.height) &&
    isPositiveInteger(value.sizeBytes) &&
    value.captureMethod === "screen_capture_capture_screenshot" &&
    value.validationStatus === "valid" &&
    typeof value.label === "string" &&
    isNonNegativeInteger(value.capturedMainThreadId) &&
    isNonNegativeInteger(value.executionThreadId) &&
    Array.isArray(value.diagnostics) &&
    value.diagnostics.every(isDiagnostic)
  )) {
    return null;
  }

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    hostId: value.hostId,
    hostEpoch: value.hostEpoch,
    artifactId: value.artifactId,
    uri: value.uri,
    relativePath: value.relativePath,
    width: value.width,
    height: value.height,
    sizeBytes: value.sizeBytes,
    captureMethod: value.captureMethod,
    validationStatus: value.validationStatus,
    label: value.label,
    capturedMainThreadId: value.capturedMainThreadId,
    executionThreadId: value.executionThreadId,
    diagnostics: value.diagnostics,
  };
}

export function parsePngHeaderDimensions(bytes: Uint8Array): PngHeaderDimensionsResult {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.byteLength < 33) return { ok: false, reason: "too_short" };
  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[index] !== signature[index]) return { ok: false, reason: "invalid_signature" };
  }
  const ihdrLength = readUint32(bytes, 8);
  const ihdrType = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (ihdrLength !== 13 || ihdrType !== "IHDR") return { ok: false, reason: "missing_ihdr" };
  const width = readUint32(bytes, 16);
  const height = readUint32(bytes, 20);
  if (width <= 0 || height <= 0) return { ok: false, reason: "invalid_dimensions" };
  return { ok: true, width, height };
}
```

补齐 `screenshotCaptureResultFromHostResult()`、`invalidScreenshotResult()`、`parseRecord()`、`isSafeResourceId()`、`isSafeScreenshotRelativePath()`、`isDiagnostic()` 等 helpers。`screenshotCaptureResultFromHostResult()` 必须：

- 将 host success 映射到 `tool: "unity_screenshot"` / `action: "capture_game_view"`。
- 对 projectRoot mismatch、invalid shape、host status 非 success 返回 failed/lost/uncertain，不返回 success。
- 保留 host diagnostics。

- [x] **步骤 2：实现 workflow success path**

创建 `plugins/unity-agent-kit/src/workflows/screenshot.ts`：

```ts
import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";
import { readUnityResource } from "../resources/readback.ts";
import type { HostTransport } from "../host/transport.ts";
import type { RegistryReader } from "./rebind.ts";
import {
  parsePngHeaderDimensions,
  parseScreenshotCaptureData,
  screenshotCaptureOperation,
  screenshotCaptureResultFromHostResult,
  type ScreenshotCaptureSummary,
} from "../diagnostics/screenshot.ts";
import { executeWithRebindAwareness } from "./rebind.ts";
import { timeoutContinuationResult } from "./timeout.ts";

export interface ScreenshotWorkflowOptions {
  registryPath: string;
  projectRoot: string;
  transport: HostTransport;
  readRegistry?: RegistryReader;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface CaptureGameViewScreenshotOptions {
  requestId?: string;
  label?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export async function captureGameViewScreenshot(
  workflow: ScreenshotWorkflowOptions,
  options: CaptureGameViewScreenshotOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `screenshot-capture-${Date.now()}`;
  if (!isSafeLabel(options.label ?? "")) {
    return definePublicResult({
      status: "rejected",
      tool: "unity_screenshot",
      action: "capture_game_view",
      operation: screenshotCaptureOperation,
      requestId,
      summary: "Screenshot label must not contain path syntax.",
      code: "screenshot.label_invalid",
      message: "Screenshot label must not contain path syntax.",
      diagnostics: [{ source: "workflow", severity: "warning", code: "screenshot.label_invalid", message: "Screenshot label must not contain path syntax." }],
    });
  }

  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    transport: workflow.transport,
    readRegistry: workflow.readRegistry,
    request: { operation: screenshotCaptureOperation, requestId, inputJson: JSON.stringify({ label: options.label ?? "" }) },
  });
  const mapped = screenshotCaptureResultFromHostResult(hostResult.result, workflow.projectRoot);
  if (mapped.status !== "succeeded") {
    return mapped;
  }

  const summary = parseScreenshotCaptureData(mapped.data);
  if (summary === null) {
    return screenshotFailure(mapped, "screenshot.capture_invalid_shape", "Screenshot capture returned invalid artifact metadata.");
  }

  const readback = await waitForScreenshotResourceReadback(workflow, summary, options, mapped);
  if (readback.status !== "ready") {
    return readback.result;
  }

  const png = parsePngHeaderDimensions(readback.contentBytes);
  if (!png.ok) {
    return screenshotFailure(mapped, "screenshot.png_invalid", "Screenshot resource payload is not a valid PNG header.", { reason: png.reason });
  }

  if (png.width !== summary.width || png.height !== summary.height) {
    return screenshotFailure(mapped, "screenshot.png_dimension_mismatch", "Screenshot PNG dimensions do not match Unity producer metadata.", { producerWidth: summary.width, producerHeight: summary.height, pngWidth: png.width, pngHeight: png.height });
  }

  return definePublicResult({
    status: "succeeded",
    tool: "unity_screenshot",
    action: "capture_game_view",
    operation: screenshotCaptureOperation,
    requestId: mapped.requestId,
    hostId: mapped.hostId,
    hostEpoch: mapped.hostEpoch,
    summary: "Screenshot artifact is complete.",
    diagnostics: mapped.diagnostics,
    data: summary,
    resource: readback.resource,
    evidence: { completion: "artifact_complete", artifactId: summary.artifactId, resourceUri: summary.uri, pngHeader: "valid", width: png.width, height: png.height },
    metadata: { resourceFilePath: readback.filePath, resourceContentBytes: readback.contentBytes.byteLength, pngWidth: png.width, pngHeight: png.height },
  });
}
```

补齐 `waitForScreenshotResourceReadback()`、`resourceMetadataMatchesSummary()`、`screenshotFailure()`、`screenshotReadbackTimeoutResult()`、`isSafeLabel()`、`remainingTimeoutMs()`、`defaultSleep()`。`waitForScreenshotResourceReadback()` 使用 `readUnityResource(workflow.projectRoot, summary.uri)`，在 timeout 内短轮询；timeout result 使用 `nextStep: { kind: "read_resource", tool: "unity_screenshot", action: "capture_game_view", resourceUri: summary.uri, reason: "Read the screenshot Resource before retrying capture." }`，`mayStillBeRunning: true`，`safeToRetry: false`。

- [x] **步骤 3：运行 TS focused tests 验证通过**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/screenshot-workflows.test.ts"
```

预期：PASS，`fail 0`。证明：parser、safe label、Resource readback success、PNG header/dimension validation 的 happy path 通过。

- [x] **步骤 4：Commit TS screenshot workflow**

```bash
git add plugins/unity-agent-kit/src/diagnostics/screenshot.ts plugins/unity-agent-kit/src/workflows/screenshot.ts plugins/unity-agent-kit/tests/screenshot-workflows.test.ts
git commit -m "feat: add phase 5d screenshot workflow"
```

---

### 任务 5：补齐 TS failure / timeout / continuity 行为测试

**文件：**
- 修改：`plugins/unity-agent-kit/tests/screenshot-workflows.test.ts`
- 修改：`plugins/unity-agent-kit/src/diagnostics/screenshot.ts`
- 修改：`plugins/unity-agent-kit/src/workflows/screenshot.ts`

- [x] **步骤 1：添加 label rejection 与 no-host-call 测试**

在 `screenshot-workflows.test.ts` 添加：

```ts
test("captureGameViewScreenshot rejects labels with path syntax before host invocation", async () => {
  const record = sampleHostRecord();
  const transport = transportWithProbesAndInvokes([], []);

  const result = await captureGameViewScreenshot(options(record, transport.transport), {
    requestId: "req-shot-bad-label",
    label: "../escape",
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "screenshot.label_invalid");
  transport.assertConsumed();
});
```

- [x] **步骤 2：添加 Resource missing timeout 测试**

```ts
test("captureGameViewScreenshot times out when screenshot Resource cannot be read back", async () => {
  await withArtifactProject(async (projectRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const summary = screenshotSummary({ projectRoot, artifactId: "shot-missing", uri: "unity://screenshots/shot-missing", relativePath: "screenshots/shot-missing.png" });
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([{ port: record.port, result: { ok: true, statusCode: 200, body: record } }], [{
      port: record.port,
      requestId: "req-shot-missing",
      operation: screenshotCaptureOperation,
      inputJson: "{\"label\":\"missing\"}",
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, screenshotCaptureOperation, summary, "req-shot-missing") },
    }]);

    const result = await captureGameViewScreenshot(options(record, transport.transport, { readRegistry: registry.readRegistry, projectRoot, sleep: async () => {} }), {
      requestId: "req-shot-missing",
      label: "missing",
      timeoutMs: 1,
      pollIntervalMs: 0,
    });

    assert.equal(result.status, "timeout");
    assert.equal(result.nextStep?.kind, "read_resource");
    assert.equal(result.nextStep?.resourceUri, "unity://screenshots/shot-missing");
    assert.equal(result.safeToRetry, false);
  });
});
```

- [x] **步骤 3：添加 invalid PNG / dimension mismatch / metadata mismatch 测试**

添加三个 tests：

```ts
test("captureGameViewScreenshot fails invalid PNG signature after Resource readback", async () => {
  await withValidHostAndResource(Uint8Array.from([1, 2, 3, 4]), {}, async (result) => {
    assert.equal(result.status, "failed");
    assert.equal(result.code, "screenshot.png_invalid");
  });
});

test("captureGameViewScreenshot fails when PNG dimensions differ from producer metadata", async () => {
  await withValidHostAndResource(pngBytes(4, 3), { width: 2, height: 3 }, async (result) => {
    assert.equal(result.status, "failed");
    assert.equal(result.code, "screenshot.png_dimension_mismatch");
  });
});

test("captureGameViewScreenshot fails when Resource metadata identity differs from producer summary", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const summary = screenshotSummary({ projectRoot });
    await writeScreenshotResource(artifactRoot, summary, pngBytes(2, 3), { hostId: "other-host" });
    const result = await runScreenshotCaptureAgainstSummary(record, projectRoot, summary);
    assert.equal(result.status, "failed");
    assert.equal(result.code, "screenshot.resource_mismatch");
  });
});
```

Add helper `withValidHostAndResource()` and `runScreenshotCaptureAgainstSummary()` in the same test file. These helpers must create a temp project, write metadata/payload, fake one successful host invocation, and call `captureGameViewScreenshot()`.

- [x] **步骤 4：添加 host continuity / projectRoot mismatch 测试**

```ts
test("captureGameViewScreenshot does not succeed across host identity mismatch", async () => {
  const record = sampleHostRecord();
  const summary = screenshotSummary({ hostId: "other-host" });
  const transport = transportWithProbesAndInvokes([{ port: record.port, result: { ok: true, statusCode: 200, body: record } }], [{
    port: record.port,
    requestId: "req-shot-host-mismatch",
    operation: screenshotCaptureOperation,
    inputJson: "{\"label\":\"smoke\"}",
    result: { ok: true, statusCode: 200, body: succeededEnvelope(record, screenshotCaptureOperation, summary, "req-shot-host-mismatch") },
  }]);

  const result = await captureGameViewScreenshot(options(record, transport.transport), {
    requestId: "req-shot-host-mismatch",
    label: "smoke",
  });

  assert.notEqual(result.status, "succeeded");
  assert.equal(result.code, "screenshot.host_identity_mismatch");
});
```

If the implementation maps this case through the generic invalid-shape path, tighten `screenshotCaptureResultFromHostResult()` so hostId/hostEpoch mismatch has explicit code `screenshot.host_identity_mismatch` and `status: "lost"`.

- [x] **步骤 5：运行 TS screenshot failure tests**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/screenshot-workflows.test.ts"
```

预期：PASS，`fail 0`。证明：invalid label、Resource missing timeout、invalid PNG、dimension mismatch、metadata mismatch、host continuity failure 都不会返回 success。

- [x] **步骤 6：Commit TS failure coverage**

```bash
git add plugins/unity-agent-kit/src/diagnostics/screenshot.ts plugins/unity-agent-kit/src/workflows/screenshot.ts plugins/unity-agent-kit/tests/screenshot-workflows.test.ts
git commit -m "test: cover screenshot artifact failure semantics"
```

---

### 任务 6：补齐 Unity router / safe path / production scope guard 测试

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/ScreenshotWorkflowTests.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitScreenshotDiagnostics.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`

- [x] **步骤 1：添加 router main-thread dispatch test**

在 `ScreenshotWorkflowTests.cs` 添加：

```csharp
[Test]
public void ScreenshotCaptureOperationRequiresMainThreadDispatch()
{
    Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" screenshot.capture "));
    var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
    {
        operation = "screenshot.capture",
        requestId = "req-shot-route",
        inputJson = "{\"label\":\"smoke\"}"
    }, TestHostRecord());

    Assert.AreEqual("rejected", response.status);
    Assert.AreEqual("host.dispatch_required", response.code);
}
```

- [x] **步骤 2：添加 safe label / controlled path test**

```csharp
[Test]
public void CaptureGameViewForTestsRejectsUnsafeLabelBeforeWritingPayload()
{
    var artifactRoot = TemporaryArtifactRoot("unsafe-label");
    var adapter = new RecordingScreenshotAdapter(width: 320, height: 180, writesPayload: true);

    var response = UnityAgentKitScreenshotDiagnostics.CaptureGameViewForTests(
        TestHostRecord(),
        capturedMainThreadId: 7,
        inputJson: "{\"label\":\"../escape\"}",
        artifactRoot: artifactRoot,
        adapter: adapter,
        requestId: "req-shot-unsafe-label");

    Assert.AreEqual("rejected", response.status);
    Assert.AreEqual("screenshot.label_invalid", response.code);
    Assert.IsFalse(Directory.Exists(Path.Combine(artifactRoot, "screenshots")));
}
```

If implementation initially returns `failed`, change it to `rejected` for input validation before Unity capture.

- [x] **步骤 3：添加 production Game View smoke test**

在 `ScreenshotWorkflowTests.cs` 添加一个 production adapter/router smoke。该测试只在 interactive Editor 且 Game View 可用时证明真实 `ScreenCapture.CaptureScreenshot` path 能产生当前 Game View PNG；如果 batchmode/headless 或 Game View unavailable，测试可以 `Assert.Ignore`，但后续 evidence sync 不得把 5D-03 标记 completed：

```csharp
[UnityEngine.TestTools.UnityTest]
public System.Collections.IEnumerator RouterScreenshotCaptureProductionSmokeWritesRealGameViewPngWhenInteractive()
{
    if (Application.isBatchMode)
    {
        Assert.Ignore("Production Game View screenshot smoke requires an interactive Unity editor.");
    }

    var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
    {
        operation = "screenshot.capture",
        requestId = "req-shot-production-smoke",
        inputJson = "{\"label\":\"production-smoke\"}"
    }, TestHostRecord(), System.Threading.Thread.CurrentThread.ManagedThreadId);

    if (response.status == "failed" && response.code == "screenshot.game_view_unavailable")
    {
        Assert.Ignore("Game View is unavailable in this editor environment.");
    }

    Assert.AreEqual("succeeded", response.status, response.code + ": " + response.message);
    var result = JsonUtility.FromJson<UnityAgentKitScreenshotCaptureResult>(response.data);
    var payloadPath = Path.Combine(UnityAgentKitArtifactContracts.GetArtifactRoot(), result.relativePath.Replace('/', Path.DirectorySeparatorChar));
    var metadataPath = Path.Combine(UnityAgentKitArtifactContracts.GetArtifactRoot(), "metadata", "screenshots", result.artifactId + ".json");

    for (var frame = 0; frame < 120 && (!File.Exists(payloadPath) || new FileInfo(payloadPath).Length <= 0); frame++)
    {
        yield return null;
    }

    Assert.IsTrue(File.Exists(payloadPath), payloadPath);
    Assert.Greater(new FileInfo(payloadPath).Length, 0);
    Assert.IsTrue(File.Exists(metadataPath), metadataPath);
    Assert.AreEqual("unity://screenshots/" + result.artifactId, result.uri);
    Assert.Greater(result.width, 0);
    Assert.Greater(result.height, 0);
}
```

- [x] **步骤 4：运行 Unity focused tests**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-03-screenshot-router.xml" -testFilter UnityAgentKit.Editor.Tests.ScreenshotWorkflowTests
```

预期：PASS，XML 中 `failed="0"`。

- [x] **步骤 5：运行 implementation scope guard**

运行：

```bash
node --input-type=module -e "import {readFileSync,existsSync} from 'node:fs'; const files=['unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs','unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs','unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitScreenshotDiagnostics.cs','unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs','plugins/unity-agent-kit/src/diagnostics/screenshot.ts','plugins/unity-agent-kit/src/workflows/screenshot.ts']; const forbidden=['InternalEditorUtility.ReadScreenPixel','ReadScreenPixel(','Texture2D.EncodeToPNG','EncodeToPNG(','File.WriteAllBytes','server.tool(','registerTool(','server.resource(','registerResource','ResourceTemplate','plugins/unity-agent-kit/skills/','Phase 5E','unity_scene','unity_object','unity_component','unity_material','unity_asset','unity_prefab','unity_ui','unity_validation','unity_animation']; const violations=[]; for (const file of files) { if (!existsSync(file)) { violations.push('missing '+file); continue; } const text=readFileSync(file,'utf8'); for (const marker of forbidden) if (text.includes(marker)) violations.push(marker+' in '+file); } if (violations.length) { console.error(violations.join('\n')); process.exit(1); } console.log('PASS Phase 5D-03 screenshot implementation scope guard');"
```

预期：

```text
PASS Phase 5D-03 screenshot implementation scope guard
```

证明：implementation files 未引入 forbidden screenshot path、public MCP registration、Resource handler、skill 或 Phase 6/7/8 domain markers。

- [x] **步骤 6：Commit Unity router/scope tests**

```bash
git add unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitScreenshotDiagnostics.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/ScreenshotWorkflowTests.cs
git commit -m "test: verify screenshot router boundaries"
```

---

### 任务 7：运行 focused verification 并同步 5D-03 execution evidence

**文件：**
- 修改：`docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md`
- 验证：TS focused tests、Unity focused tests、production Game View smoke gate、HostRuntime regression、scope guard、diff check

- [x] **步骤 1：运行 TS focused verification**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/screenshot-workflows.test.ts" "plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts" "plugins/unity-agent-kit/tests/host-runtime.test.ts" "plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts"
```

预期：PASS，`fail 0`。证明：5D-03 screenshot workflow、Phase 5B artifact/resource readback、host runtime result mapping 和 timeout continuation contract 未被破坏。不重跑或重写 5D-01a/5D-01b/5D-02 evidence。

- [x] **步骤 2：运行 Unity screenshot focused verification**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-03-screenshot-workflows.xml" -testFilter UnityAgentKit.Editor.Tests.ScreenshotWorkflowTests
```

预期：PASS，XML 中 `failed="0"`。证明：Unity screenshot producer seam、metadata helper、router dispatch requirement 和 failure diagnostics 通过。

- [x] **步骤 3：运行/检查 production Game View smoke gate**

如果当前目标环境可以暴露 interactive Game View，运行不带 `-batchmode` 的 focused smoke：
```bash
"${UNITY_EDITOR}" -projectPath unity -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-03-screenshot-production-smoke.xml" -testFilter UnityAgentKit.Editor.Tests.ScreenshotWorkflowTests.RouterScreenshotCaptureProductionSmokeWritesRealGameViewPngWhenInteractive
```

然后检查 production smoke XML；如果只存在 batchmode XML，也必须检查该 XML 中此 test case 是否 skipped/ignored：
```bash
node --input-type=module -e "import {existsSync,readFileSync} from 'node:fs'; const files=['D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-03-screenshot-production-smoke.xml','D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-03-screenshot-workflows.xml']; const xml=files.filter(existsSync).map((file)=>readFileSync(file,'utf8')).join('\n'); const name='RouterScreenshotCaptureProductionSmokeWritesRealGameViewPngWhenInteractive'; const i=xml.indexOf(name); if (i < 0) { console.error('BLOCKED missing production Game View smoke result; keep 5D-03 incomplete'); process.exit(2); } const start=xml.lastIndexOf('<test-case', i); const close=xml.indexOf('</test-case>', i); const empty=xml.indexOf('/>', i); const end=close >= 0 ? close + 12 : empty >= 0 ? empty + 2 : Math.min(xml.length, i + 1000); const fragment=xml.slice(Math.max(0, start), end); if (/result=\"Passed\"|outcome=\"Passed\"/.test(fragment)) { console.log('PASS production Game View smoke wrote real Game View PNG'); } else if (/result=\"Skipped\"|outcome=\"Skipped\"|label=\"Ignored\"/.test(fragment)) { console.error('BLOCKED production Game View smoke skipped or ignored; Game View unavailable keep 5D-03 incomplete unless user accepts narrower evidence boundary'); process.exit(2); } else { console.error('FAIL production Game View smoke did not pass'); console.error(fragment); process.exit(1); }"
```

预期：`PASS production Game View smoke wrote real Game View PNG`。如果输出 `BLOCKED`，只记录 blocker/partial evidence，保持 5D-03 为 `plan-ready` 或其他 non-completed 状态；不要把 5D-03 标记 `completed`，除非用户明确接受 narrower evidence boundary。

- [x] **步骤 4：运行 Unity HostRuntime regression**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-03-host-runtime-regression.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`。证明：新增 `screenshot.capture` route 未破坏 Phase 5A host runtime、dispatch、shutdown、timeout 和 loopback behavior。

- [x] **步骤 5：运行 changed-file scope guard**

运行任务 6 的 Node scope guard，预期输出：

```text
PASS Phase 5D-03 screenshot implementation scope guard
```

- [x] **步骤 6：运行 whitespace check**

运行：

```bash
git -c core.autocrlf=false diff --check
```

预期：无输出，exit 0。

- [x] **步骤 7：更新 Phase 5D execution index row**

只有在步骤 3 的 production Game View smoke gate 输出 `PASS production Game View smoke wrote real Game View PNG`，或用户明确接受 narrower evidence boundary 后，才执行本步骤。若步骤 3 输出 `BLOCKED`，保持 5D-03 row 为 `plan-ready` 或其他 non-completed 状态，并在 index 中记录 blocker/partial evidence；不得添加 completed evidence。

在 `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md` 的 Candidate Plan Cards 表中，将 5D-03 row 从：

```markdown
| 5D-03 | Screenshot capture-method feasibility, Game View producer, screenshot artifact metadata, Resource readback, TS PNG header/dimension validation | 5D-SCREENSHOT-FEASIBILITY-01, 5D-SCREENSHOT-CAPTURE-01, 5D-SCREENSHOT-RESOURCE-01, 5D-SCREENSHOT-PNG-01, 5D-HOST-01, 5D-SCOPE-01 | 3 | Phase 5A, Phase 5B, Phase 5C | `docs/superpowers/plans/2026-05-29-unity-agent-kit-phase-5d-03-screenshot-artifact-resource.md` | plan-ready |
```

改为：

```markdown
| 5D-03 | Screenshot capture-method feasibility, Game View producer, screenshot artifact metadata, Resource readback, TS PNG header/dimension validation | 5D-SCREENSHOT-FEASIBILITY-01, 5D-SCREENSHOT-CAPTURE-01, 5D-SCREENSHOT-RESOURCE-01, 5D-SCREENSHOT-PNG-01, 5D-HOST-01, 5D-SCOPE-01 | 3 | Phase 5A, Phase 5B, Phase 5C | `docs/superpowers/plans/2026-05-29-unity-agent-kit-phase-5d-03-screenshot-artifact-resource.md` | completed |
```

- [x] **步骤 8：追加 Phase 5D-03 completion evidence section**

在 5D-02 evidence section 后追加：

```markdown
## Phase 5D-03 Completion Evidence

5D-03 is completed. This does not complete Phase 5D, and Phase 5 remains incomplete.

Use this completed evidence template only when the production Game View smoke gate passed, or when the user explicitly accepted a narrower evidence boundary. If the smoke was skipped/ignored because Game View/headless is unavailable, do not use this completed evidence template.

- Focused TS verification passed via `node --experimental-strip-types --test "plugins/unity-agent-kit/tests/screenshot-workflows.test.ts" "plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts" "plugins/unity-agent-kit/tests/host-runtime.test.ts" "plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts"` with `fail 0`.
- Unity Screenshot focused verification passed in `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-03-screenshot-workflows.xml` with `failed="0"`.
- Production Game View screenshot smoke passed: the real `screenshot.capture` router path wrote a PNG payload and metadata under the artifact root, returned `unity://screenshots/{artifactId}`, and reported width/height > 0.
- Unity HostRuntime regression passed in `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-03-host-runtime-regression.xml` with `failed="0"`.
- Capture-method feasibility evidence declares `screen_capture_capture_screenshot` for current Game View and rejects the forbidden `ReadScreenPixel + EncodeToPNG + File.WriteAllBytes` screenshot payload path.
- TS coverage for 5D-03 includes safe label rejection, Resource readback requirement, PNG signature/IHDR validation, positive width/height validation, metadata/payload mismatch failures, Resource timeout nextStep, and host continuity/projectRoot guards.
- Unity coverage for 5D-03 includes Game View capture adapter seam, controlled screenshot artifact paths, metadata write after PNG payload proof, Game View unavailable/file-not-ready diagnostics, and main-thread dispatch requirement.
- Scope guard passed: `PASS Phase 5D-03 screenshot implementation scope guard`.
- Whitespace check passed: `git -c core.autocrlf=false diff --check` produced no output.
```

Replace `fail 0` and XML summaries with exact final counts if available.

- [x] **步骤 9：更新 Current Next Manual Action**

Replace the current next action with:

```markdown
Review the next pending Phase 5D card and prepare expanded plan work for `5D-04` combined scope guard / Phase 5D evidence sync. Do not execute this index or re-execute completed `5D-01a` / `5D-01b` / `5D-02` / `5D-03`; proceed to the next pending card only after its expanded plan is ready and approved.
```

- [x] **步骤 10：Commit 5D-03 evidence sync**

```bash
git add docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md
git commit -m "docs: record phase 5d screenshot workflow evidence"
```

---

### 任务 8：最终自检和交接

**文件：**
- 修改：`docs/superpowers/plans/2026-05-29-unity-agent-kit-phase-5d-03-screenshot-artifact-resource.md`
- 验证：focused tests、production Game View smoke gate、scope guard、diff check、completion boundaries

- [x] **步骤 1：运行 final focused TS verification**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/screenshot-workflows.test.ts" "plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts" "plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts"
```

预期：PASS，`fail 0`。证明：5D-03 screenshot workflow、Resource readback contract 和 timeout continuation contract 最终通过。

- [x] **步骤 2：运行 final Unity focused verification**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-03-final-screenshot-workflows.xml" -testFilter UnityAgentKit.Editor.Tests.ScreenshotWorkflowTests
```

预期：PASS，XML 中 `failed="0"`。证明：Unity screenshot producer focused coverage 最终通过；如果当前环境 exposes Game View，XML 或步骤 3 的 smoke XML 必须包含 production smoke passed evidence。

- [x] **步骤 3：确认 final production Game View smoke evidence**

运行任务 7 步骤 3 的 production smoke XML gate，并把 final Unity XML 也纳入候选：
```bash
node --input-type=module -e "import {existsSync,readFileSync} from 'node:fs'; const files=['D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-03-screenshot-production-smoke.xml','D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-03-final-screenshot-workflows.xml','D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-03-screenshot-workflows.xml']; const xml=files.filter(existsSync).map((file)=>readFileSync(file,'utf8')).join('\n'); const name='RouterScreenshotCaptureProductionSmokeWritesRealGameViewPngWhenInteractive'; const i=xml.indexOf(name); if (i < 0) { console.error('BLOCKED missing production Game View smoke result; keep 5D-03 incomplete'); process.exit(2); } const start=xml.lastIndexOf('<test-case', i); const close=xml.indexOf('</test-case>', i); const empty=xml.indexOf('/>', i); const end=close >= 0 ? close + 12 : empty >= 0 ? empty + 2 : Math.min(xml.length, i + 1000); const fragment=xml.slice(Math.max(0, start), end); if (/result=\"Passed\"|outcome=\"Passed\"/.test(fragment)) { console.log('PASS production Game View smoke wrote real Game View PNG'); } else if (/result=\"Skipped\"|outcome=\"Skipped\"|label=\"Ignored\"/.test(fragment)) { console.error('BLOCKED production Game View smoke skipped or ignored; Game View unavailable keep 5D-03 incomplete unless user accepts narrower evidence boundary'); process.exit(2); } else { console.error('FAIL production Game View smoke did not pass'); console.error(fragment); process.exit(1); }"
```

预期：`PASS production Game View smoke wrote real Game View PNG`。如果输出 `BLOCKED`，最终状态不是 completed；记录 blocker/partial evidence，并停止进入 5D-04 handoff，除非用户明确接受 narrower evidence boundary。

- [x] **步骤 4：运行 final scope guard 和 diff check**

运行任务 6 的 Node scope guard，预期输出：

```text
PASS Phase 5D-03 screenshot implementation scope guard
```

运行：

```bash
git -c core.autocrlf=false diff --check
```

预期：无输出，exit 0。

- [x] **步骤 5：确认 completion boundaries**

检查 `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md`：

- 5D-01a remains completed.
- 5D-01b remains completed.
- 5D-02 remains completed.
- 5D-03 is completed only if production Game View smoke passed or the user explicitly accepted narrower evidence; otherwise 5D-03 remains `plan-ready` or another non-completed status with blocker/partial evidence.
- 5D-04 remains pending, and it is only the next execution card after 5D-03 has completed under the production smoke gate.
- Completion Rule still requires all active 5D cards complete.
- Phase 5D is not marked completed.
- Phase 5 is not marked completed.

- [x] **步骤 6：Commit plan checkbox sync if needed**

Only if this plan file was updated during execution, commit the checkbox sync:

```bash
git add docs/superpowers/plans/2026-05-29-unity-agent-kit-phase-5d-03-screenshot-artifact-resource.md
git commit -m "docs: update phase 5d screenshot workflow plan progress"
```

- [x] **步骤 7：交接下一步提示词**

If production smoke passed or the user explicitly accepted narrower evidence, return this handoff prompt:

```text
Phase 5D-03 Screenshot capture-method feasibility / artifact validation / Resource readback is complete with evidence. Next pending card is Phase 5D-04 Combined scope guard / Phase 5D evidence sync. Use superpowers:writing-plans to prepare the expanded 5D-04 implementation plan. Preserve Phase 5D and Phase 5 boundaries: do not mark Phase 5D completed until 5D-04 evidence sync passes, and do not mark Phase 5 completed because Phase 5E and final daily loop E2E remain pending.
```

If production smoke was blocked/skipped and no narrower evidence boundary was accepted, return this handoff prompt instead:

```text
Phase 5D-03 remains incomplete because production Game View smoke evidence was blocked/skipped in this environment. Record blocker/partial evidence in the 5D execution index, keep 5D-03 non-completed, do not move to 5D-04 as the next execution card, and retry 5D-03 in an interactive Unity Editor with Game View available.
```

---

## 自检结果

- **规格覆盖度:** Covered. 5D-SCREENSHOT-FEASIBILITY-01 maps to tasks 1-2 and task 6 scope guard; 5D-SCREENSHOT-CAPTURE-01 maps to tasks 1-2 and Unity focused tests; 5D-SCREENSHOT-RESOURCE-01 maps to tasks 3-5; 5D-SCREENSHOT-PNG-01 maps to tasks 3-5; 5D-TIMEOUT-01 and 5D-HOST-01 map to tasks 4-5 and 7; 5D-SCOPE-01 maps to tasks 6-8.
- **占位符扫描:** No forbidden placeholder marker remains in executable steps. Each task has concrete files, commands, expected result, and implementation/test snippets.
- **类型一致性:** Internal operation is `screenshot.capture`; public-shaped tool/action is `unity_screenshot.capture_game_view`; Resource URI is `unity://screenshots/{artifactId}`; artifact type is `screenshot`; metadata relative path is `metadata/screenshots/{artifactId}.json`; payload relative path is `screenshots/{artifactId}.png`.
- **拆分检查:** Recorded in header; 5D-03 remains a single screenshot workflow unit and does not include 5D-04 evidence sync.
- **上游约束覆盖:** TS/Unity ownership boundary is explicitly enforced; forbidden screenshot path is rejected before implementation; MCP registration/resource handlers/skill/Phase 5E/Phase 6-8 are out of scope and guarded.
- **参考输入映射:** Roadmap, Phase 5D spec/index, existing artifact/resource/workflow patterns, Unity artifact contracts, and v2 screenshot reference each map to concrete tasks with adopted and rejected parts documented.
- **验证强度:** Behavior verification includes TS file-backed Resource readback and PNG header parsing, Unity adapter/metadata/router tests, production Game View smoke evidence when interactive Game View is available, HostRuntime regression, scope guard, and diff check. If production smoke is skipped/blocked, the plan records blocker/partial evidence and keeps 5D-03 non-completed unless the user explicitly accepts narrower evidence. Symbol-only checks are used only as boundary guards, not as primary behavior proof.
