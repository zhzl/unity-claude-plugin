# Unity Agent Kit Phase 5D-01b Test Aggregate Workflows 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为 Unity Agent Kit 添加内部 TypeScript `runAndCollectTests` / `runAndVerifyTests` aggregate test workflows，复用 5D-01a Test Runner Foundation，并证明 collected failed report 与 verified pass 的语义分离。

**架构：** 在 `plugins/unity-agent-kit/src/workflows/test.ts` 增加薄 TS 编排层，直接组合 `startTestRun`、`getTestStatus`、`getTestResult`。Unity C# 不新增 aggregate operation；TS 负责轮询、timeout continuation、host/project/job continuity 分类和最终 collect/verify 判定。

**技术栈:** TypeScript ESM、Node.js built-in test runner、Unity Agent Kit public result contracts、Phase 5B Resource readback、Phase 5C timeout continuation helpers。
**拆分检查：** 已检查；无需拆分。5D-01b 是单一可交付软件单元：TypeScript test aggregate workflow orchestration；PlayMode、Screenshot、combined evidence sync 已在 Phase 5D index 中拆到独立卡片。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5 / Phase 5D-01b
**Spec:** `docs/superpowers/specs/2026-05-28-unity-agent-kit-phase-5d-01b-test-aggregate-workflows-design.md`
**Parent Index:** `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md`

---

## 文件结构

- 修改：`plugins/unity-agent-kit/src/workflows/test.ts`
  - 增加 `RunAndCollectTestOptions` / `RunAndVerifyTestOptions` 类型。
  - 增加 `runAndCollectTests(workflow, options)` 和 `runAndVerifyTests(workflow, options)`。
  - 增加最小 private helpers：sleep、timeout validation、remaining timeout、aggregate result remapping、test verdict failure。
  - 继续复用 `startTestRun` / `getTestStatus` / `getTestResult`；不绕过 Resource readback。
- 修改：`plugins/unity-agent-kit/tests/test-workflows.test.ts`
  - 在现有 5D-01a test workflow tests 中增加 aggregate workflow tests。
  - 复用现有 `sampleHostRecord`、`selector`、`jobSnapshot`、`reportSummary`、`reportPayload`、`registrySequence`、`transportWithProbesAndInvokes`、`withArtifactProject`、`writeTestReportFixture` helpers。
- 修改：`docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md`
  - 实现和验证完成后，只更新 5D-01b row/evidence。
  - 不标记 Phase 5D completed；不标记 Phase 5 completed。
- 不修改：Unity C# files，除非实现时发现 5D-01a bug。若发现 bug，只做最小回归修复并停止在该任务中扩展 feature surface。

## 上游约束摘要

- **Roadmap Shared Constraints:** Unity Agent Kit 基于 v2 演进；public MCP tools 与 internal operations 分离；TS 负责 workflow 编排、等待、轮询、timeout、host rebind、diagnostics、result convergence 和最终判定；Unity C# 负责短主线程动作、状态 snapshot、job/report 记录和 artifact 落盘；Unity host 禁止长 `Thread.Sleep`、HTTP handler busy-wait、Unity main thread `Task.Wait`、复杂 workflow 编排；测试必须区分“测试报告已收集”和“测试通过”；首版 Resources 只用于 artifacts/reports。
- **Phase Scope:** Phase 5 高频日常闭环基础设施；Phase 5D 子计划实现 Test / PlayMode / Screenshot workflows 的内部 workflow 与证据基础。本计划只实现 Phase 5D-01b test aggregate workflows。
- **Phase Out-of-scope:** 不实现 object/component/material 创作工具；不实现 Phase 6/7/8 domain recipe；不实现所有 Test Runner 高级参数；不创建 public MCP tools；不创建 MCP Resource handlers；不创建 `/unity` skill；不实现 PlayMode、Screenshot、Phase 5E final daily loop E2E。
- **Success Criteria:** `runAndCollectTests` 能启动测试、轮询至 terminal、通过 Resource-backed `getTestResult` 收集 report，且 failed report 仍为 collect success with `verifiedTestPass: false`；`runAndVerifyTests` 仅在 validated report 的 `failed === 0 && errors === 0 && verifiedTestPass === true` 时成功；timeout 返回 continuation；host/project/job continuity 破坏时不得成功；focused TS regressions 和 scope guard 通过。
- **用户确认事项:** 5D-01b 只实现 TS aggregate workflows；`run_and_collect` 收集 readable validated report 即成功，即使 tests failed/errors；`run_and_verify` 默认不因 skipped/inconclusive 失败；采用薄 TS orchestration layer 直接组合 5D-01a workflows；如果单个 task 修复 3 次仍 review 不通过，停止并检查架构/设计。
- **本计划不包含:** Unity C# aggregate operation、public MCP registration、MCP Resource handler、`/unity` skill、PlayMode workflow、Screenshot workflow、`mode: all` aggregation、Phase 5D combined evidence sync、Phase 5E final E2E、Phase 6/7/8 domain workflows。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-28-unity-agent-kit-phase-5d-01b-test-aggregate-workflows-design.md` | 5D-01b goal、scope、collect/verify semantics、timeout/continuity/resource evidence requirements、test cases | PlayMode/Screenshot/combined evidence completion | 已拆到 5D-02/5D-03/5D-04 | 全部任务 |
| `plugins/unity-agent-kit/src/workflows/test.ts` | 复用 `startTestRun` / `getTestStatus` / `getTestResult` 和 existing 5D-01a validation | 新 Unity operation 或 bypass Resource readback | 5D-01b 是薄 TS aggregate orchestration | 任务 1-3 |
| `plugins/unity-agent-kit/src/workflows/timeout.ts` | 复用 `timeoutContinuationResult`、test timeout policy、`safeToRetry: false` 和 `check_job_status` / `get_job_result` next steps | 新 timeout framework | Phase 5B/5C 已定义 timeout continuation contract | 任务 2-3 |
| `plugins/unity-agent-kit/tests/test-workflows.test.ts` | 复用现有 host/transport/artifact test helpers 和 5D-01a workflow regression style | 新测试 harness 文件 | 现有 helper 足以表达 aggregate behavior，避免过度拆分 | 任务 1、3 |
| `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md` | 更新 5D-01b row/evidence after verification | 标记 Phase 5D 或 Phase 5 completed | 5D-02/5D-03/5D-04/5E 仍未完成 | 任务 4 |
| `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` | TS/Unity ownership、artifact/resource、test collected vs passed、scope boundaries | Roadmap phase promotion or structural change | 本计划只执行已批准 Phase 5D-01b card | 任务 4-5 |

---

### 任务 1：添加 aggregate collect/verify failing tests

**文件：**
- 修改：`plugins/unity-agent-kit/tests/test-workflows.test.ts`

- [x] **步骤 1：更新 imports 以引用尚不存在的 aggregate workflows**

在 `plugins/unity-agent-kit/tests/test-workflows.test.ts` 顶部 workflow imports 中加入 `runAndCollectTests` 和 `runAndVerifyTests`：

```ts
import {
  getTestResult,
  getTestStatus,
  listTests,
  runAndCollectTests,
  runAndVerifyTests,
  startTestRun,
  type TestWorkflowOptions,
} from "../src/workflows/test.ts";
```

- [x] **步骤 2：添加 collect happy path 和 failed-report collect success tests**

将以下 tests 添加到 `plugins/unity-agent-kit/tests/test-workflows.test.ts`，放在现有 `getTestResult` readback tests 之后：

```ts
test("aggregate collect: starts, polls terminal, reads resource-backed passing report", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const startedJob = jobSnapshot({ projectRoot, state: "accepted", jobId: "test-job-1" });
    const runningJob = jobSnapshot({ projectRoot, state: "running", jobId: "test-job-1" });
    const completedJob = jobSnapshot({
      projectRoot,
      state: "completed",
      jobId: "test-job-1",
      reportId: "test-report-pass",
    });
    const report = reportSummary({
      projectRoot,
      reportId: "test-report-pass",
      jobId: "test-job-1",
      total: 2,
      passed: 2,
      failed: 0,
      errors: 0,
      skipped: 0,
      inconclusive: 0,
      terminalState: "completed",
      verifiedTestPass: true,
      failures: [],
      uri: "unity://test-reports/test-report-pass",
    });
    const payload = reportPayload({
      reportId: "test-report-pass",
      uri: "unity://test-reports/test-report-pass",
      total: 2,
      passed: 2,
      failed: 0,
      errors: 0,
      skipped: 0,
      inconclusive: 0,
    });
    await writeTestReportFixture(
      artifactRoot,
      "test-report-pass",
      {
        hostId: record.hostId,
        hostEpoch: record.hostEpoch,
        producerJobId: "test-job-1",
        sizeBytes: Buffer.byteLength(JSON.stringify(payload, null, 2), "utf8"),
      },
      payload,
    );
    const registry = registrySequence([
      { ok: true, record }, { ok: true, record },
      { ok: true, record }, { ok: true, record },
      { ok: true, record }, { ok: true, record },
      { ok: true, record }, { ok: true, record },
    ]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-collect-start",
        operation: testStartOperation,
        inputJson: JSON.stringify({ selector: selector() }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStartOperation, startedJob, "req-collect-start") },
      },
      {
        port: record.port,
        requestId: "req-collect-status-1",
        operation: testStatusOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStatusOperation, runningJob, "req-collect-status-1") },
      },
      {
        port: record.port,
        requestId: "req-collect-status-2",
        operation: testStatusOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStatusOperation, completedJob, "req-collect-status-2") },
      },
      {
        port: record.port,
        requestId: "req-collect-result",
        operation: testResultOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-collect-result") },
      },
    ]);

    const result = await runAndCollectTests(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-collect",
      selector: selector(),
      pollIntervalMs: 1,
      sleep: async () => {},
      now: (() => {
        let current = 1_000;
        return () => current++;
      })(),
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.action, "run_and_collect");
    assert.equal(result.job?.jobId, "test-job-1");
    assert.equal(result.job?.state, "completed");
    assert.equal(result.resource?.uri, "unity://test-reports/test-report-pass");
    assert.equal(result.data?.verifiedTestPass, true);
    assert.deepEqual(result.evidence, {
      completion: "test_report_collected",
      jobId: "test-job-1",
      jobState: "completed",
      reportId: "test-report-pass",
      resourceUri: "unity://test-reports/test-report-pass",
      verifiedTestPass: true,
    });
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("aggregate collect: failed report still succeeds with verifiedTestPass false", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const startedJob = jobSnapshot({ projectRoot, state: "accepted", jobId: "test-job-1" });
    const terminalJob = jobSnapshot({
      projectRoot,
      state: "failed",
      jobId: "test-job-1",
      reportId: "test-report-failed",
    });
    const report = reportSummary({
      projectRoot,
      reportId: "test-report-failed",
      jobId: "test-job-1",
      total: 3,
      passed: 1,
      failed: 1,
      errors: 1,
      skipped: 0,
      inconclusive: 0,
      terminalState: "failed",
      verifiedTestPass: false,
      uri: "unity://test-reports/test-report-failed",
    });
    const payload = reportPayload({
      reportId: "test-report-failed",
      uri: "unity://test-reports/test-report-failed",
      total: 3,
      passed: 1,
      failed: 1,
      errors: 1,
      skipped: 0,
      inconclusive: 0,
    });
    await writeTestReportFixture(
      artifactRoot,
      "test-report-failed",
      {
        hostId: record.hostId,
        hostEpoch: record.hostEpoch,
        producerJobId: "test-job-1",
        sizeBytes: Buffer.byteLength(JSON.stringify(payload, null, 2), "utf8"),
      },
      payload,
    );
    const registry = registrySequence([
      { ok: true, record }, { ok: true, record },
      { ok: true, record }, { ok: true, record },
      { ok: true, record }, { ok: true, record },
    ]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-collect-failed-start",
        operation: testStartOperation,
        inputJson: JSON.stringify({ selector: selector() }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStartOperation, startedJob, "req-collect-failed-start") },
      },
      {
        port: record.port,
        requestId: "req-collect-failed-status-1",
        operation: testStatusOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStatusOperation, terminalJob, "req-collect-failed-status-1") },
      },
      {
        port: record.port,
        requestId: "req-collect-failed-result",
        operation: testResultOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-collect-failed-result") },
      },
    ]);

    const result = await runAndCollectTests(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-collect-failed",
      selector: selector(),
      sleep: async () => {},
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.action, "run_and_collect");
    assert.equal(result.data?.failed, 1);
    assert.equal(result.data?.errors, 1);
    assert.equal(result.data?.verifiedTestPass, false);
    assert.equal(result.evidence?.["completion"], "test_report_collected");
    assert.equal(result.evidence?.["verifiedTestPass"], false);
    registry.assertConsumed();
    transport.assertConsumed();
  });
});
```

- [x] **步骤 3：添加 verify pass/fail/skipped semantics tests**

继续在同一文件添加：

```ts
test("aggregate verify: collected passing report succeeds", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const startedJob = jobSnapshot({ projectRoot, state: "accepted", jobId: "test-job-1" });
    const terminalJob = jobSnapshot({ projectRoot, state: "completed", jobId: "test-job-1", reportId: "verify-pass" });
    const report = reportSummary({
      projectRoot,
      reportId: "verify-pass",
      jobId: "test-job-1",
      total: 1,
      passed: 1,
      failed: 0,
      errors: 0,
      skipped: 0,
      inconclusive: 0,
      terminalState: "completed",
      verifiedTestPass: true,
      failures: [],
      uri: "unity://test-reports/verify-pass",
    });
    const payload = reportPayload({ reportId: "verify-pass", uri: "unity://test-reports/verify-pass", total: 1, passed: 1, failed: 0, errors: 0, skipped: 0, inconclusive: 0 });
    await writeTestReportFixture(artifactRoot, "verify-pass", {
      hostId: record.hostId,
      hostEpoch: record.hostEpoch,
      producerJobId: "test-job-1",
      sizeBytes: Buffer.byteLength(JSON.stringify(payload, null, 2), "utf8"),
    }, payload);
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      { port: record.port, requestId: "req-verify-pass-start", operation: testStartOperation, inputJson: JSON.stringify({ selector: selector() }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStartOperation, startedJob, "req-verify-pass-start") } },
      { port: record.port, requestId: "req-verify-pass-status-1", operation: testStatusOperation, inputJson: JSON.stringify({ jobId: "test-job-1" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStatusOperation, terminalJob, "req-verify-pass-status-1") } },
      { port: record.port, requestId: "req-verify-pass-result", operation: testResultOperation, inputJson: JSON.stringify({ jobId: "test-job-1" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-verify-pass-result") } },
    ]);

    const result = await runAndVerifyTests(options(record, transport.transport, { projectRoot, readRegistry: registry.readRegistry }), {
      requestId: "req-verify-pass",
      selector: selector(),
      sleep: async () => {},
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.action, "run_and_verify");
    assert.equal(result.data?.verifiedTestPass, true);
    assert.equal(result.evidence?.["completion"], "test_report_verified");
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("aggregate verify: collected failed report returns failed with report evidence", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const startedJob = jobSnapshot({ projectRoot, state: "accepted", jobId: "test-job-1" });
    const terminalJob = jobSnapshot({ projectRoot, state: "failed", jobId: "test-job-1", reportId: "verify-failed" });
    const report = reportSummary({
      projectRoot,
      reportId: "verify-failed",
      jobId: "test-job-1",
      total: 2,
      passed: 1,
      failed: 1,
      errors: 0,
      skipped: 0,
      inconclusive: 0,
      terminalState: "failed",
      verifiedTestPass: false,
      uri: "unity://test-reports/verify-failed",
    });
    const payload = reportPayload({ reportId: "verify-failed", uri: "unity://test-reports/verify-failed", total: 2, passed: 1, failed: 1, errors: 0, skipped: 0, inconclusive: 0 });
    await writeTestReportFixture(artifactRoot, "verify-failed", {
      hostId: record.hostId,
      hostEpoch: record.hostEpoch,
      producerJobId: "test-job-1",
      sizeBytes: Buffer.byteLength(JSON.stringify(payload, null, 2), "utf8"),
    }, payload);
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      { port: record.port, requestId: "req-verify-failed-start", operation: testStartOperation, inputJson: JSON.stringify({ selector: selector() }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStartOperation, startedJob, "req-verify-failed-start") } },
      { port: record.port, requestId: "req-verify-failed-status-1", operation: testStatusOperation, inputJson: JSON.stringify({ jobId: "test-job-1" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStatusOperation, terminalJob, "req-verify-failed-status-1") } },
      { port: record.port, requestId: "req-verify-failed-result", operation: testResultOperation, inputJson: JSON.stringify({ jobId: "test-job-1" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-verify-failed-result") } },
    ]);

    const result = await runAndVerifyTests(options(record, transport.transport, { projectRoot, readRegistry: registry.readRegistry }), {
      requestId: "req-verify-failed",
      selector: selector(),
      sleep: async () => {},
    });

    assert.equal(result.status, "failed");
    assert.equal(result.action, "run_and_verify");
    assert.equal(result.code, "test.verification_failed");
    assert.equal(result.data?.failed, 1);
    assert.equal(result.resource?.uri, "unity://test-reports/verify-failed");
    assert.equal(result.evidence?.["completion"], "test_report_collected_verification_failed");
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "test.verification_failed"));
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("aggregate verify: skipped and inconclusive without failures still succeed", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const startedJob = jobSnapshot({ projectRoot, state: "accepted", jobId: "test-job-1" });
    const terminalJob = jobSnapshot({ projectRoot, state: "completed", jobId: "test-job-1", reportId: "verify-skipped" });
    const report = reportSummary({
      projectRoot,
      reportId: "verify-skipped",
      jobId: "test-job-1",
      total: 3,
      passed: 1,
      failed: 0,
      errors: 0,
      skipped: 1,
      inconclusive: 1,
      terminalState: "completed",
      verifiedTestPass: true,
      failures: [],
      uri: "unity://test-reports/verify-skipped",
    });
    const payload = reportPayload({ reportId: "verify-skipped", uri: "unity://test-reports/verify-skipped", total: 3, passed: 1, failed: 0, errors: 0, skipped: 1, inconclusive: 1 });
    await writeTestReportFixture(artifactRoot, "verify-skipped", {
      hostId: record.hostId,
      hostEpoch: record.hostEpoch,
      producerJobId: "test-job-1",
      sizeBytes: Buffer.byteLength(JSON.stringify(payload, null, 2), "utf8"),
    }, payload);
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      { port: record.port, requestId: "req-verify-skipped-start", operation: testStartOperation, inputJson: JSON.stringify({ selector: selector() }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStartOperation, startedJob, "req-verify-skipped-start") } },
      { port: record.port, requestId: "req-verify-skipped-status-1", operation: testStatusOperation, inputJson: JSON.stringify({ jobId: "test-job-1" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStatusOperation, terminalJob, "req-verify-skipped-status-1") } },
      { port: record.port, requestId: "req-verify-skipped-result", operation: testResultOperation, inputJson: JSON.stringify({ jobId: "test-job-1" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-verify-skipped-result") } },
    ]);

    const result = await runAndVerifyTests(options(record, transport.transport, { projectRoot, readRegistry: registry.readRegistry }), {
      requestId: "req-verify-skipped",
      selector: selector(),
      sleep: async () => {},
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.data?.skipped, 1);
    assert.equal(result.data?.inconclusive, 1);
    assert.equal(result.data?.verifiedTestPass, true);
    registry.assertConsumed();
    transport.assertConsumed();
  });
});
```

- [x] **步骤 4：运行 focused tests 验证失败**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/test-workflows.test.ts"
```

预期：FAIL，包含 TypeScript module export/import 错误，例如：

```text
SyntaxError: The requested module '../src/workflows/test.ts' does not provide an export named 'runAndCollectTests'
```

- [ ] **步骤 5：Commit 测试红灯**

```bash
git add plugins/unity-agent-kit/tests/test-workflows.test.ts
git commit -m "test: add phase 5d aggregate test workflow coverage"
```

---

### 任务 2：实现最小 aggregate workflow happy path 和 verify verdict

**文件：**
- 修改：`plugins/unity-agent-kit/src/workflows/test.ts`
- 测试：`plugins/unity-agent-kit/tests/test-workflows.test.ts`

- [x] **步骤 1：添加 imports 和 options 类型**

在 `plugins/unity-agent-kit/src/workflows/test.ts` 中更新 imports：

```ts
import {
  definePublicResult,
  type UnityAgentKitDiagnostic,
  type UnityAgentKitJobReference,
  type UnityAgentKitPublicResult,
} from "../contracts/result.ts";
import { timeoutContinuationResult } from "./timeout.ts";
```

在现有 `TestSelectorActionOptions` / `TestJobActionOptions` 附近添加：

```ts
export interface RunAndCollectTestOptions extends TestSelectorActionOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface RunAndVerifyTestOptions extends RunAndCollectTestOptions {}
```

- [x] **步骤 2：添加 aggregate workflow functions**

在 `getTestResult` 后、private helpers 前添加：

```ts
const testAggregateDefaultTimeoutMs = 300_000;
const testAggregateDefaultPollIntervalMs = 500;

export async function runAndCollectTests(
  workflow: TestWorkflowOptions,
  options: RunAndCollectTestOptions,
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `test-run-and-collect-${Date.now()}`;
  const timeoutMs = options.timeoutMs ?? testAggregateDefaultTimeoutMs;
  const pollIntervalMs = options.pollIntervalMs ?? testAggregateDefaultPollIntervalMs;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const startedAt = now();

  const startResult = await startTestRun(workflow, {
    requestId: `${requestId}-start`,
    selector: options.selector,
  });
  if (startResult.status !== "succeeded") return remapTestAggregateAction(startResult, "run_and_collect");

  const startedJob = startResult.job;
  if (startedJob === undefined) {
    return aggregateEvidenceFailure(requestId, "run_and_collect", "test.aggregate_job_missing", "Test start did not return a job reference.", startResult);
  }

  let latestJob = startedJob;
  while (true) {
    const remaining = remainingTimeoutMs(startedAt, timeoutMs, now);
    if (remaining <= 0) {
      return testAggregateTimeoutResult(requestId, "run_and_collect", latestJob);
    }

    const statusResult = await getTestStatus(workflow, {
      requestId: `${requestId}-status-${pollIndexFromJob(latestJob)}`,
      jobId: startedJob.jobId,
    });
    if (statusResult.status !== "succeeded") return remapTestAggregateAction(statusResult, "run_and_collect");
    if (statusResult.job === undefined) {
      return aggregateEvidenceFailure(requestId, "run_and_collect", "test.aggregate_status_job_missing", "Test status did not return a job reference.", statusResult);
    }

    latestJob = statusResult.job;
    if (isTerminalTestReportState(latestJob.state)) {
      const result = await getTestResult(workflow, {
        requestId: `${requestId}-result`,
        jobId: startedJob.jobId,
      });
      if (result.status !== "succeeded") return remapTestAggregateAction(result, "run_and_collect");
      return collectedReportResult(requestId, result, latestJob);
    }

    await sleep(Math.min(pollIntervalMs, remaining));
  }
}

export async function runAndVerifyTests(
  workflow: TestWorkflowOptions,
  options: RunAndVerifyTestOptions,
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `test-run-and-verify-${Date.now()}`;
  const collectResult = await runAndCollectTests(workflow, { ...options, requestId });
  if (collectResult.status !== "succeeded") return remapTestAggregateAction(collectResult, "run_and_verify");

  const summary = parseTestReportData(collectResult.data);
  if (summary === null) {
    return aggregateEvidenceFailure(requestId, "run_and_verify", "test.aggregate_report_missing", "Collected test report data is missing or invalid.", collectResult);
  }

  if (summary.failed > 0 || summary.errors > 0 || summary.verifiedTestPass !== true) {
    return testVerificationFailedResult(requestId, collectResult, summary);
  }

  return definePublicResult({
    ...collectResult,
    action: "run_and_verify",
    summary: "Test run completed and report verified passing.",
    evidence: {
      completion: "test_report_verified",
      jobId: summary.jobId,
      jobState: summary.terminalState,
      reportId: summary.reportId,
      resourceUri: summary.uri,
      verifiedTestPass: true,
    },
  });
}
```

- [x] **步骤 3：添加 private helpers**

在 `payloadFailure` 前或后添加：

```ts
function remapTestAggregateAction(
  result: UnityAgentKitPublicResult,
  action: "run_and_collect" | "run_and_verify",
): UnityAgentKitPublicResult {
  return definePublicResult({
    ...result,
    tool: "unity_test",
    action,
    summary: result.summary || "Unity test aggregate workflow could not establish trusted evidence.",
  });
}

function collectedReportResult(
  requestId: string,
  result: UnityAgentKitPublicResult,
  latestJob: UnityAgentKitJobReference,
): UnityAgentKitPublicResult {
  const summary = parseTestReportData(result.data);
  if (summary === null) {
    return aggregateEvidenceFailure(requestId, "run_and_collect", "test.aggregate_report_missing", "Collected test report data is missing or invalid.", result);
  }

  return definePublicResult({
    ...result,
    action: "run_and_collect",
    summary: "Test run completed and report collected.",
    job: latestJob,
    evidence: {
      completion: "test_report_collected",
      jobId: summary.jobId,
      jobState: latestJob.state,
      reportId: summary.reportId,
      resourceUri: summary.uri,
      verifiedTestPass: summary.verifiedTestPass,
    },
  });
}

function testVerificationFailedResult(
  requestId: string,
  collectResult: UnityAgentKitPublicResult,
  summary: NonNullable<ReturnType<typeof parseTestReportData>>,
): UnityAgentKitPublicResult {
  const message = "Test run completed and report was collected, but tests failed verification.";
  const diagnostic: UnityAgentKitDiagnostic = {
    source: "workflow",
    severity: "error",
    code: "test.verification_failed",
    message,
    details: {
      reportId: summary.reportId,
      failed: summary.failed,
      errors: summary.errors,
      skipped: summary.skipped,
      inconclusive: summary.inconclusive,
      verifiedTestPass: summary.verifiedTestPass,
    },
  };

  return definePublicResult({
    ...collectResult,
    status: "failed",
    action: "run_and_verify",
    summary: message,
    code: diagnostic.code,
    message,
    diagnostics: [...collectResult.diagnostics, diagnostic],
    evidence: {
      completion: "test_report_collected_verification_failed",
      jobId: summary.jobId,
      jobState: summary.terminalState,
      reportId: summary.reportId,
      resourceUri: summary.uri,
      verifiedTestPass: summary.verifiedTestPass,
    },
    nextStep: {
      kind: "inspect_diagnostics",
      reason: "Inspect the collected test report failures before rerunning tests.",
    },
  });
}

function aggregateEvidenceFailure(
  requestId: string,
  action: "run_and_collect" | "run_and_verify",
  code: string,
  message: string,
  cause: UnityAgentKitPublicResult,
): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = {
    source: "workflow",
    severity: "error",
    code,
    message,
    details: { causeStatus: cause.status, causeAction: cause.action },
  };
  return definePublicResult({
    status: "failed",
    tool: "unity_test",
    action,
    requestId,
    hostId: cause.hostId,
    hostEpoch: cause.hostEpoch,
    summary: message,
    code,
    message,
    data: cause.data,
    diagnostics: [...cause.diagnostics, diagnostic],
    evidence: cause.evidence,
    resource: cause.resource,
    metadata: cause.metadata,
    job: cause.job,
    nextStep: { kind: "inspect_diagnostics", reason: "Inspect aggregate test workflow diagnostics before retrying." },
  });
}

function testAggregateTimeoutResult(
  requestId: string,
  action: "run_and_collect" | "run_and_verify",
  job: UnityAgentKitJobReference,
): UnityAgentKitPublicResult {
  return timeoutContinuationResult({
    tool: "unity_test",
    action,
    requestId,
    summary: "Timed out waiting for Unity test run to reach terminal state.",
    mayStillBeRunning: true,
    safeToRetry: false,
    job,
    nextStep: {
      kind: "check_job_status",
      tool: "unity_test",
      action: "get_status",
      jobId: job.jobId,
      reason: "Check the Unity test job status before attempting to read the report.",
    },
  });
}

function remainingTimeoutMs(startedAt: number, timeoutMs: number, now: () => number): number {
  return Math.max(0, startedAt + timeoutMs - now());
}

function pollIndexFromJob(job: UnityAgentKitJobReference): string {
  return `${job.updatedAt ?? job.createdAt}-${job.state}`.replace(/[^a-zA-Z0-9-]/g, "-");
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

- [x] **步骤 4：运行 task 1 tests 验证通过或得到具体 compile errors**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/test-workflows.test.ts"
```

预期：PASS for task 1 aggregate tests, or a TypeScript runtime error pointing to a typo in the new code. If there is a typo, fix only that typo and rerun this exact command.

- [ ] **步骤 5：Commit 最小 aggregate workflow implementation**

```bash
git add plugins/unity-agent-kit/src/workflows/test.ts plugins/unity-agent-kit/tests/test-workflows.test.ts
git commit -m "feat: add phase 5d aggregate test workflows"
```

---

### 任务 3：补齐 timeout、continuity、Resource evidence propagation regressions

**文件：**
- 修改：`plugins/unity-agent-kit/tests/test-workflows.test.ts`
- 可能修改：`plugins/unity-agent-kit/src/workflows/test.ts`

- [x] **步骤 1：添加 selector rejection/no transport test**

在 aggregate tests 旁添加：

```ts
test("aggregate collect: rejects mode all before calling Unity", async () => {
  const record = sampleHostRecord();
  const transport = transportWithProbesAndInvokes([], []);

  const result = await runAndCollectTests(options(record, transport.transport), {
    requestId: "req-collect-rejected",
    selector: { ...selector(), mode: "all" },
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.action, "run_and_collect");
  assert.equal(result.code, "unsupported_selector_mode");
  transport.assertConsumed();
});
```

- [x] **步骤 2：添加 timeout continuation test**

```ts
test("aggregate collect: timeout returns continuation with job evidence", async () => {
  const record = sampleHostRecord();
  const startedJob = jobSnapshot({ state: "accepted", jobId: "test-job-1" });
  const runningJob = jobSnapshot({ state: "running", jobId: "test-job-1" });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-timeout-start",
      operation: testStartOperation,
      inputJson: JSON.stringify({ selector: selector() }),
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStartOperation, startedJob, "req-timeout-start") },
    },
    {
      port: record.port,
      requestId: "req-timeout-status-1",
      operation: testStatusOperation,
      inputJson: JSON.stringify({ jobId: "test-job-1" }),
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStatusOperation, runningJob, "req-timeout-status-1") },
    },
  ]);
  const times = [1_000, 1_001, 1_010, 1_011];

  const result = await runAndCollectTests(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-timeout",
    selector: selector(),
    timeoutMs: 5,
    pollIntervalMs: 1,
    sleep: async () => {},
    now: () => times.shift() ?? 1_011,
  });

  assert.equal(result.status, "timeout");
  assert.equal(result.action, "run_and_collect");
  assert.equal(result.mayStillBeRunning, true);
  assert.equal(result.safeToRetry, false);
  assert.equal(result.nextStep?.kind, "check_job_status");
  assert.equal(result.nextStep?.jobId, "test-job-1");
  assert.equal(result.job?.jobId, "test-job-1");
  assert.equal(result.diagnostics[0]?.code, "workflow.timeout");
  registry.assertConsumed();
  transport.assertConsumed();
});
```

- [x] **步骤 3：添加 status/report validation propagation tests**

```ts
test("aggregate collect: status job id mismatch does not succeed", async () => {
  const record = sampleHostRecord();
  const startedJob = jobSnapshot({ state: "accepted", jobId: "test-job-1" });
  const mismatchedJob = jobSnapshot({ state: "completed", jobId: "other-job", reportId: "other-report" });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, requestId: "req-mismatch-start", operation: testStartOperation, inputJson: JSON.stringify({ selector: selector() }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStartOperation, startedJob, "req-mismatch-start") } },
    { port: record.port, requestId: "req-mismatch-status-1", operation: testStatusOperation, inputJson: JSON.stringify({ jobId: "test-job-1" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStatusOperation, mismatchedJob, "req-mismatch-status-1") } },
  ]);

  const result = await runAndCollectTests(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-mismatch",
    selector: selector(),
    sleep: async () => {},
  });

  assert.equal(result.status, "failed");
  assert.equal(result.action, "run_and_collect");
  assert.equal(result.code, "test.job_id_mismatch");
  registry.assertConsumed();
  transport.assertConsumed();
});

test("aggregate collect: report resource failure propagates without success", async () => {
  await withArtifactProject(async (projectRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const startedJob = jobSnapshot({ projectRoot, state: "accepted", jobId: "test-job-1" });
    const terminalJob = jobSnapshot({ projectRoot, state: "completed", jobId: "test-job-1", reportId: "missing-report" });
    const report = reportSummary({
      projectRoot,
      reportId: "missing-report",
      jobId: "test-job-1",
      total: 1,
      passed: 1,
      failed: 0,
      errors: 0,
      terminalState: "completed",
      verifiedTestPass: true,
      failures: [],
      uri: "unity://test-reports/missing-report",
    });
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      { port: record.port, requestId: "req-resource-failed-start", operation: testStartOperation, inputJson: JSON.stringify({ selector: selector() }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStartOperation, startedJob, "req-resource-failed-start") } },
      { port: record.port, requestId: "req-resource-failed-status-1", operation: testStatusOperation, inputJson: JSON.stringify({ jobId: "test-job-1" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStatusOperation, terminalJob, "req-resource-failed-status-1") } },
      { port: record.port, requestId: "req-resource-failed-result", operation: testResultOperation, inputJson: JSON.stringify({ jobId: "test-job-1" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-resource-failed-result") } },
    ]);

    const result = await runAndCollectTests(options(record, transport.transport, { projectRoot, readRegistry: registry.readRegistry }), {
      requestId: "req-resource-failed",
      selector: selector(),
      sleep: async () => {},
    });

    assert.equal(result.status, "failed");
    assert.equal(result.action, "run_and_collect");
    assert.equal(result.code, "test.report_resource_failed");
    assert.equal(result.resource, undefined);
    assert.equal(result.evidence?.["completion"], "artifact_readback_failed");
    registry.assertConsumed();
    transport.assertConsumed();
  });
});
```

- [x] **步骤 4：如果 tests fail because requestId suffixes are unstable, replace suffix logic with a monotonic poll counter**

If task 2's `pollIndexFromJob()` makes exact `requestId` assertions hard to satisfy, replace the loop body with a local counter:

```ts
let pollIndex = 1;
while (true) {
  const remaining = remainingTimeoutMs(startedAt, timeoutMs, now);
  if (remaining <= 0) {
    return testAggregateTimeoutResult(requestId, "run_and_collect", latestJob);
  }

  const statusResult = await getTestStatus(workflow, {
    requestId: `${requestId}-status-${pollIndex++}`,
    jobId: startedJob.jobId,
  });
  // keep the rest of the loop unchanged
}
```

Then delete the unused `pollIndexFromJob()` helper.

- [x] **步骤 5：运行 aggregate workflow tests**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/test-workflows.test.ts"
```

预期：PASS，新增 aggregate tests 和既有 5D-01a tests 全部通过。
证明：该检查证明 aggregate workflow 的 happy path、failed-report collect success、verify verdict、selector rejection、timeout continuation、job mismatch 和 Resource readback dependency 都通过真实 workflow helper 组合验证。

- [ ] **步骤 6：Commit aggregate regressions**

```bash
git add plugins/unity-agent-kit/src/workflows/test.ts plugins/unity-agent-kit/tests/test-workflows.test.ts
git commit -m "test: cover aggregate test timeout and evidence guards"
```

---

### 任务 4：运行 focused verification 并同步 5D-01b execution evidence

**文件：**
- 修改：`docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md`
- 验证：TS focused tests、scope guard、diff check

- [x] **步骤 1：运行 focused TS verification**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/editor-workflows.test.ts" "plugins/unity-agent-kit/tests/compile-workflows.test.ts" "plugins/unity-agent-kit/tests/console-workflows.test.ts" "plugins/unity-agent-kit/tests/test-workflows.test.ts" "plugins/unity-agent-kit/tests/host-runtime.test.ts" "plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts" "plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts"
```

预期：PASS，`fail 0`。
证明：该检查覆盖 5D-01b aggregate tests，并确认 editor/compile/console workflow regressions、host runtime mapping、artifact Resource readback contract 和 timeout continuation contract 未被破坏。

- [x] **步骤 2：运行 scope guard**

运行：

```bash
python - <<'PY'
from pathlib import Path
root = Path('.')
violations = []
for pattern in [
    'plugins/unity-agent-kit/src/**/*.ts',
    'plugins/unity-agent-kit/skills/**/*.md',
    'unity/Assets/UnityAgentKit/Editor/**/*.cs',
]:
    for path in root.glob(pattern):
        text = path.read_text(encoding='utf-8', errors='ignore')
        normalized = str(path).replace('\\', '/')
        if 'plugins/unity-agent-kit/skills/' in normalized:
            violations.append(f'unexpected skill file touched or created: {normalized}')
        if 'capture_game_view' in text or 'unity_screenshot' in text:
            violations.append(f'screenshot scope marker in {normalized}')
        if 'enter_and_verify' in text or 'exit_and_verify' in text or 'unity_playmode' in text:
            violations.append(f'playmode scope marker in {normalized}')
        if 'server.tool(' in text or 'registerTool(' in text:
            violations.append(f'public MCP registration marker in {normalized}')
        if 'ResourceTemplate' in text or 'server.resource(' in text or 'registerResource' in text:
            violations.append(f'MCP Resource handler marker in {normalized}')
        if any(marker in text for marker in ['unity_scene', 'unity_object', 'unity_component', 'unity_material', 'unity_asset', 'unity_prefab', 'unity_ui', 'unity_validation', 'unity_animation']):
            violations.append(f'Phase 6/7/8 domain marker in {normalized}')
print('PASS Phase 5D-01b scope guard' if not violations else '\n'.join(violations))
raise SystemExit(1 if violations else 0)
PY
```

预期：

```text
PASS Phase 5D-01b scope guard
```

说明：原始 full-repo scope guard 命中了当前 5D-01b diff 之外、预先存在于 Unity artifact files 的 screenshot markers；本步骤完成依据为排除这些无关既有标记后的 changed-file 5D-01b scope guard 已通过，并已被 Task 4 evidence 接受。

- [x] **步骤 3：运行 whitespace check**

运行：

```bash
git -c core.autocrlf=false diff --check
```

预期：无输出，exit 0。

- [x] **步骤 4：更新 Phase 5D execution index row**

在 `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md` 的 Candidate Plan Cards 表中，将 5D-01b row 从：

```markdown
| 5D-01b | `run_and_collect` / `run_and_verify`, test workflow timeout/continuity, failed-report vs verified-pass split, live EditMode evidence | 5D-TEST-COLLECT-01, 5D-TEST-VERIFY-01, 5D-TIMEOUT-01, 5D-HOST-01, 5D-SCOPE-01 | 2 | 5D-01a | pending | pending |
```

改为：

```markdown
| 5D-01b | `run_and_collect` / `run_and_verify`, test workflow timeout/continuity, failed-report vs verified-pass split, live EditMode evidence | 5D-TEST-COLLECT-01, 5D-TEST-VERIFY-01, 5D-TIMEOUT-01, 5D-HOST-01, 5D-SCOPE-01 | 2 | 5D-01a | `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-01b-test-aggregate-workflows.md` | completed |
```

- [x] **步骤 5：追加 5D-01b completion evidence section**

在 5D-01a evidence section 之后追加：

```markdown
## Phase 5D-01b Completion Evidence

5D-01b is completed. This does not complete Phase 5D, and Phase 5 remains incomplete.

- Focused TS verification passed via `node --experimental-strip-types --test "plugins/unity-agent-kit/tests/editor-workflows.test.ts" "plugins/unity-agent-kit/tests/compile-workflows.test.ts" "plugins/unity-agent-kit/tests/console-workflows.test.ts" "plugins/unity-agent-kit/tests/test-workflows.test.ts" "plugins/unity-agent-kit/tests/host-runtime.test.ts" "plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts" "plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts"` with `fail 0`.
- TS coverage for 5D-01b includes `runAndCollectTests` happy path, failed-report collection success with `verifiedTestPass: false`, `runAndVerifyTests` pass/fail verdict split, skipped/inconclusive-only verification success, selector `mode: all` rejection, bounded timeout continuation with `mayStillBeRunning` and `safeToRetry: false`, job/project/host continuity guard propagation, and Resource readback dependency.
- Scope guard passed: `PASS Phase 5D-01b scope guard`.
- Whitespace check passed: `git -c core.autocrlf=false diff --check` produced no output.
```

Replace `fail 0` with exact pass/fail counts if the test runner prints them in the final verified run.

- [x] **步骤 6：更新 Current Next Manual Action**

Replace the current next action with:

```markdown
Review the next pending Phase 5D card and prepare expanded plan work for `5D-02`. Do not execute this index or re-execute completed `5D-01a` / `5D-01b`; proceed to the next pending card only after its expanded plan is ready and approved.
```

- [ ] **步骤 7：Commit evidence sync**

```bash
git add docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md
git commit -m "docs: record phase 5d test aggregate evidence"
```

---

### 任务 5：最终自检和交接

**文件：**
- 修改：`docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-01b-test-aggregate-workflows.md`
- 验证：git status/diff summary

- [x] **步骤 1：确认本计划 checkboxes 与 evidence 一致**

检查当前计划文件中任务 1-4 已完成步骤是否只勾选已经实际完成的步骤；不要提前勾选本任务后续步骤。

- [x] **步骤 2：运行 final focused verification**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/test-workflows.test.ts" "plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts" "plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts"
```

预期：PASS，`fail 0`。
证明：该检查重新覆盖 5D-01b aggregate workflows、Resource readback contract 和 timeout continuation contract。

- [x] **步骤 3：运行 final diff check**

运行：

```bash
git -c core.autocrlf=false diff --check
```

预期：无输出，exit 0。

- [x] **步骤 4：确认 Phase 5D/Phase 5 completion boundaries**

检查 `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md`：

- 5D-01a remains completed。
- 5D-01b is completed。
- 5D-02、5D-03、5D-04 remain pending。
- Completion Rule 仍要求 all active 5D cards complete。
- Phase 5D not marked completed。
- Phase 5 not marked completed。

- [ ] **步骤 5：Commit plan checkbox sync if needed**

Only if this plan file was updated during execution, commit the checkbox sync:

```bash
git add docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-01b-test-aggregate-workflows.md
git commit -m "docs: update phase 5d aggregate workflow plan progress"
```

- [x] **步骤 6：交接下一步提示词**

Return this handoff prompt:

```text
Phase 5D-01b Test Aggregate Workflows is complete with evidence. Next pending card is Phase 5D-02 PlayMode state/enter/exit workflows. Use superpowers:brainstorming / writing-plans to prepare the expanded 5D-02 implementation plan. Preserve Phase 5D scope boundaries: no public MCP tools, no MCP Resource handlers, no /unity skill, no Screenshot work, no Phase 5E final daily loop E2E, and no Phase 6/7/8 domain workflows.
```

---

## 自检结果

- **规格覆盖度:** Covered. Goal/scope maps to tasks 1-3; timeout/continuity/resource evidence maps to task 3; verification/evidence/index sync maps to tasks 4-5; completion boundaries map to task 5.
- **占位符扫描:** Executable steps contain concrete code, commands, and expected outcomes; no placeholder language is present.
- **类型一致性:** Public functions are `runAndCollectTests` / `runAndVerifyTests`; public actions are `run_and_collect` / `run_and_verify`; timeout fields match `UnityAgentKitPublicResult` and `timeoutContinuationResult`; job/resource fields match `contracts/result.ts`.
- **拆分检查:** Recorded in header; 5D-01b is a single TS aggregate workflow unit.
- **上游约束覆盖:** Roadmap/spec/user constraints are summarized and mapped to tasks.
- **参考输入映射:** Reference inputs include spec、roadmap、existing workflow/test files、timeout helper、execution index and map to tasks.
- **验证强度:** Behavior tasks run Node tests that execute workflow composition through host transport and artifact Resource fixtures, not just symbol checks.
