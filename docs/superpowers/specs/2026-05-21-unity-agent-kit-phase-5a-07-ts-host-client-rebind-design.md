# Unity Agent Kit Phase 5A-07 TS Host Client Rebind Classification 设计规格

**目标：** 为 Phase 5A-07 设计 TS 侧 host runtime client：严格读取 Unity host registry，验证 active `/probe`，调用 `/operations`，执行 bounded pre-operation rebind、in-flight no replay、post-response identity drift 分类，并把 Unity host envelope 映射到既有 public result foundation。

**非目标：** 不创建 live vertical smoke；不创建 `plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts`；不创建 Unity `HostRuntimeVerticalSmokeTests`；不修改 Unity C# host runtime，除非实现时发现 DTO contract 缺口且需另行确认；不注册 MCP public tools；不写 `/unity` skill；不实现 workflow timeout、artifact/resource store、final daily loop E2E 或 Phase 5A completion evidence；不新增 npm dependency。

**输入：**
- Roadmap：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- Phase 5 split design：`docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md`
- Phase 5 daily loop spec：`docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`
- Phase 5A Host Runtime technical contract：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
- Phase 5A execution index：`docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
- Existing TS foundation：`plugins/unity-agent-kit/src/contracts/result.ts`、`plugins/unity-agent-kit/src/contracts/mcp-result.ts`、`plugins/unity-agent-kit/tests/host-runtime.test.ts`

---

## 已确认决策

| 类别 | 决策 |
|---|---|
| 5A-07 范围 | 严格只做 TS non-live host client classification。 |
| 5A-08 边界 | Live vertical smoke、Unity harness、Phase 5A final completion evidence 留给 5A-08。 |
| 验证策略 | 混合验证：真实临时 registry 文件、本地 Node HTTP server、可控 `HostTransport` adapter。 |
| 模块方案 | 采用四模块方案：`registry.ts`、`transport.ts`、`http-client.ts`、`rebind.ts`。 |
| Continuity failure 映射 | public result 统一使用 `status: "lost"`，具体原因放在 diagnostic `code`。 |
| 依赖 | 不新增 npm dependency；使用 Node 内置能力。 |

---

## 拆分判断

5A-07 可以保持为一个 execution plan，因为范围限定为 TS non-live host client classification，行为边界集中在 registry、transport、HTTP envelope mapping 和 rebind state machine。

不需要进一步拆分的前提：

- 不创建 live vertical smoke；
- 不修改 Unity C# host runtime；
- 不注册 MCP public tools；
- 不进入 workflow timeout / polling policy；
- 不把 5A-08 final evidence 混入本设计。

如果实现计划需要创建第九个 5A sibling execution plan，或必须把 live Unity harness 纳入 5A-07，必须停止并触发 formal subplan split review，而不是在 5A-07 内扩大范围。

---

## 上游约束摘要

- **Roadmap Shared Constraints：** TS 负责 host binding、rebind handling、timeout/cancellation 分类、diagnostics convergence 和最终 status judgment；Unity C# host 只负责短主线程动作、状态读取、operation envelope 和 registry 写入。
- **Phase 5A 范围：** 5A-07 覆盖 `5A-REG-03`、`5A-REBIND-01`、`5A-REBIND-02`、`5A-REBIND-03`、`5A-REBIND-04`、`5A-TIMEOUT-02`。
- **Phase 5A 非范围：** 不实现 public action business logic、artifact/resource store、workflow timeout、MCP server registration、`/unity` skill 或 final daily loop E2E。
- **已完成前置：** 5A-01 已提供 public result / MCP mapping foundation；5A-02 到 5A-06 已提供 Unity DTO、registry、probe、operations、main-thread dispatch、host-level timeout 和 shutdown lifecycle foundation。5A-07 以这些完成结果为前提。
- **执行口径：** Roadmap Current State 是完成度 current truth；5A-07 设计不把 Phase 5A 或 Phase 5 标记 completed。

---

## 架构

5A-07 新增 TS host client 层，位于：

```text
plugins/unity-agent-kit/src/host/
```

模块职责：

```text
registry.ts
  → 读取和校验 Unity 写入的 host.json
  → 分类 registry missing / invalid JSON / invalid shape / invalid port
  → 区分 missing-before-seen 与 disappeared-after-seen
  → 保留 hostId + hostEpoch + projectRoot continuity identity

transport.ts
  → 定义最小 HostTransport seam
  → 提供 Node HTTP implementation
  → 只负责 GET /probe、POST /operations、request timeout / transport failure 的低层结果

http-client.ts
  → 使用 registry + transport 执行 active validation 和 operation invoke
  → 校验 probe response 与 operation envelope shape
  → 映射 Unity host envelope 到 existing public result foundation
  → unknown status fail-closed

rebind.ts
  → 实现 bounded pre-operation rebind
  → 禁止 infinite retry
  → 禁止 in-flight replay
  → post-response identity drift 返回 status: lost
  → 按 diagnostic priority 保留最具体原因
```

测试集中在现有：

```text
plugins/unity-agent-kit/tests/host-runtime.test.ts
```

不创建：

```text
plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts
unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs
```

---

## 模块设计

### `registry.ts`

职责：读取 project-scoped registry path 下的 Unity host record，并返回结构化结果，而不是直接抛出给调用者猜测。

最小 record 字段：

```text
hostName
protocolVersion
projectRoot
hostId
hostEpoch
port
status
startedAt
lastProbeAt?
```

校验规则：

- `hostName` 是 non-empty string；
- `protocolVersion` 是 supported version；
- `projectRoot` 匹配当前 Unity project；
- `hostId` 是 non-empty string；
- `hostEpoch` 是 integer >= 0；
- `port` 是 integer > 0；
- `status` 是 supported status；
- `startedAt` 是 non-empty string；
- `lastProbeAt?` 类型有效。

Registry failure classification：

```text
missing_before_seen
missing_after_seen
invalid_json
invalid_shape
invalid_port
unexpected_fs_error
```

`missing_after_seen` 必须由调用方显式传入或持有 registry observation state；实现不得依赖进程全局隐式状态。

### `transport.ts`

职责：提供最小 `HostTransport` seam 和 Node HTTP implementation。

设计原则：

- seam 只表达 `probe` 与 `invokeOperation`；
- 不做通用 HTTP framework；
- 不理解 rebind policy；
- 不把 Unity envelope 直接映射成 public result；
- 只返回低层 transport 成功、request timeout、transport unavailable、HTTP parse failure 等结果。

Node implementation 使用 Node 内置能力实现 loopback HTTP，不新增依赖。它必须支持 bounded request timeout，并区分：

```text
transport_unavailable
request_timeout
invalid_json_response
http_status_failure
```

### `http-client.ts`

职责：把 registry record、probe response 和 operation envelope 转成可信的 TS host client 结果。

Active validation fields：

```text
hostId
hostEpoch
projectRoot
protocolVersion
port
status
```

Probe classification：

```text
ready
not_ready
protocol_mismatch
probe_invalid_shape
identity_mismatch
transport_unavailable
request_timeout
```

Operation envelope mapping：

- `succeeded` → public result `succeeded`；
- `failed` → public result `failed`；
- `rejected` → public result `rejected`；
- `timeout + host.dispatch_timeout` → public result `timeout`，保留 `mayStillBeRunning`；
- `lost` → public result `lost`；
- invalid envelope → public result `failed` + `host.invalid_envelope`；
- unknown status → fail closed，public result `failed` + `host.invalid_envelope`。

### `rebind.ts`

职责：执行 bounded pre-operation rebind 和 operation lifecycle classification。

核心规则：

- 只允许 operation sent 前 single/bounded rebind；
- 不允许 infinite retry；
- operation 一旦 sent，不能 replay 到新 host；
- in-flight transport failure 后只 reread registry 用于 classification；
- response 后必须检查 registry identity drift；
- post-response drift 后不能返回 success；
- continuity failure 的 public result 使用 `status: "lost"`。

---

## 数据流

### 1. Registry read

```text
readHostRegistry(path, options)
→ fs read
→ JSON parse
→ shape validation
→ projectRoot/protocolVersion/port/status validation
→ HostRegistryReadResult
```

结果分类：

```text
ok
missing_before_seen
missing_after_seen
invalid_json
invalid_shape
invalid_port
unexpected_fs_error
```

`missing_before_seen` 表示尚未观察到 host registry。`missing_after_seen` 表示之前见过 registry，后来消失；它是 stronger continuity-loss signal，5A-07 diagnostic priority 不得把它降级成 generic missing。

### 2. Active probe validation

```text
registry record
→ transport.probe(record.port)
→ probe response shape validation
→ compare hostId + hostEpoch + projectRoot + protocolVersion + port + status
→ ActiveHostValidationResult
```

规则：

- `status != ready` 不等于 transport failure；保留 `host.not_ready`；
- probe response shape 错误返回 `host.probe_invalid_shape`；
- identity 或 active validation fields 不一致返回 `status: lost` + `host.identity_mismatch`；
- transport/request timeout 不映射为 workflow timeout。

### 3. Operation invoke

```text
valid active host
→ transport.invokeOperation(record.port, operation request)
→ parse operation envelope
→ validate status/code/diagnostics/minimum envelope fields
→ map to UnityAgentKitPublicResult
→ re-read registry for post-response identity drift
```

规则：

- Unity envelope `timeout + host.dispatch_timeout` 映射为 public result `status: "timeout"`；
- Transport timeout 映射为 diagnostic `host.request_timeout`，不是 workflow timeout；
- Invalid envelope 映射为 `status: "failed"` + `host.invalid_envelope`；
- Unknown status fail-closed；
- response 后 registry identity 变化时，最终返回 `status: "lost"` + `host.stale_instance`。

### 4. Rebind

```text
executeWithRebind(operation)
→ read registry
→ active probe
→ if pre-operation stale/not_ready/transport issue allows rebind:
     reread registry once
     reprobe once
→ send operation once
→ no replay after send
→ classify in-flight failure or post-response drift
```

规则：

- bounded rebind 只发生在 operation sent 前；
- operation sent 后不 replay；
- in-flight failure 只允许 reread registry 分类；
- post-response identity drift 覆盖 success；
- diagnostic priority 保留最具体原因。

---

## 错误处理与诊断语义

### Registry diagnostics

| 场景 | public status | diagnostic code | 说明 |
|---|---|---|---|
| registry 不存在且从未见过 | `lost` | `host.registry_missing` | host 尚未可用或 Unity 未启动 |
| registry 之前见过后消失 | `lost` | `host.registry_missing` | continuity 断裂，priority 高于普通 missing |
| invalid JSON | `failed` | `host.registry_invalid_json` | 本地 registry 文件损坏 |
| invalid shape | `failed` | `host.registry_invalid_shape` | 字段缺失或类型错误 |
| invalid port | `failed` | `host.registry_invalid_port` | port 非可用正整数 |
| unexpected fs error | `failed` | `host.registry_read_failed` | 保留原始错误 message/details |

### Probe diagnostics

| 场景 | public status | diagnostic code | 说明 |
|---|---|---|---|
| probe `status != ready` | `lost` | `host.not_ready` | host 可达但不接受当前操作 |
| protocol mismatch | `lost` | `host.protocol_mismatch` | active host 与 TS client contract 不兼容 |
| probe invalid shape | `failed` | `host.probe_invalid_shape` | response 无法信任 |
| identity mismatch | `lost` | `host.identity_mismatch` | registry 指向的 host 和 probe 响应不是同一 continuity |
| transport unavailable | `lost` | `host.transport_unavailable` | 连接失败、ECONNREFUSED、socket failure |
| request timeout | `timeout` | `host.request_timeout` | TS request/socket deadline，非 workflow timeout |

### Operation envelope diagnostics

| 场景 | public status | diagnostic code | 说明 |
|---|---|---|---|
| Unity envelope `succeeded` | `succeeded` | 原样保留 | 仅在 post-response identity 未漂移时可信 |
| Unity envelope `failed` | `failed` | 原样保留 | 保留 operation/requestId/diagnostics |
| Unity envelope `rejected` | `rejected` | 原样保留 | 保留 operation/requestId/diagnostics |
| Unity envelope `timeout` + `host.dispatch_timeout` | `timeout` | `host.dispatch_timeout` | host-level timeout，保留 `mayStillBeRunning` |
| Unity envelope `lost` | `lost` | 原样保留 | continuity 已由 Unity host 判定为不可信 |
| unknown status | `failed` | `host.invalid_envelope` | fail closed |
| invalid envelope shape | `failed` | `host.invalid_envelope` | 不消费不可信 payload |

### Continuity diagnostics

| 场景 | public status | diagnostic code | 说明 |
|---|---|---|---|
| pre-operation stale registry 后 rebind 到 ready host | 继续执行 | evidence 记录 rebind | operation 尚未 sent，可 bounded rebind |
| pre-operation rebind 仍失败 | `lost` / `failed` / `timeout` | 保留最具体 code | 不继续尝试 |
| in-flight transport failure 且 registry identity changed | `lost` | `host.restarted` | operation 不 replay |
| response 后 registry missing after seen | `lost` | `host.stale_instance` | 不能信任旧 success |
| response 后 hostId/hostEpoch changed | `lost` | `host.stale_instance` | old host success envelope is not current success |

### Timeout 分层

| 类型 | 5A-07 行为 |
|---|---|
| Host-level timeout | Unity envelope 已返回 `timeout + host.dispatch_timeout`；TS 保留并映射为 `status: "timeout"` |
| Transport/request timeout | TS transport deadline；返回 `status: "timeout"` + `host.request_timeout` |
| Workflow timeout | 5A-07 不产生；只保留 future-safe fields，不设置 workflow timeout code |

---

## Diagnostic priority

当多个错误同时出现时，5A-07 必须保留最具体、最能解释 continuity 的原因，而不是被同一次 classification pipeline 中更泛化的 failure 覆盖。优先级从高到低：

1. `host.stale_instance` / `host.restarted`
2. `host.identity_mismatch`
3. `host.protocol_mismatch`
4. `host.not_ready`
5. `host.registry_missing` after seen
6. `host.request_timeout`
7. `host.transport_unavailable`
8. generic invalid shape / invalid envelope / unexpected failure

实现计划必须通过测试证明：

- `host.not_ready` 不被 transport unavailable 覆盖；
- `host.restarted` 不被 registry missing after seen 覆盖；
- `host.stale_instance` 不被 generic failure 覆盖。

---

## 测试策略

5A-07 必须使用 TDD。每个行为任务先写 failing test，再写最少实现。固定验证命令：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

### 1. Registry tests

```text
readHostRegistryAcceptsMinimumRecord
readHostRegistryRejectsMissingFile
readHostRegistryRejectsInvalidJson
readHostRegistryRejectsInvalidShape
readHostRegistryRejectsInvalidPort
readHostRegistryDistinguishesMissingBeforeAndAfterSeenRegistry
continuityIdentityUsesHostIdAndHostEpoch
```

证明：registry reader 不只信任文件存在；host continuity identity 使用 `hostId + hostEpoch`；missing before seen 与 missing after seen 可区分；invalid registry 不会被误判为 ready host。

### 2. HTTP transport / client tests

使用本地 Node HTTP server：

```text
probeActiveHostValidatesRegistryAndProbeIdentity
probeActiveHostRejectsNotReadyProbe
probeActiveHostRejectsProtocolMismatch
probeActiveHostRejectsInvalidProbeShape
probeActiveHostRejectsIdentityMismatch
invokeOperationMapsSucceededEnvelopeToPublicResult
invokeOperationMapsHostTimeoutEnvelopeToTimeoutResult
invokeOperationRejectsInvalidEnvelope
invokeOperationFailsClosedOnUnknownStatus
transportRequestTimeoutMapsToRequestTimeoutDiagnostic
transportUnavailableMapsToTransportDiagnostic
transportTimeoutDoesNotMapToWorkflowTimeout
```

证明：`/probe` 和 `/operations` 是真实 HTTP request/response；TS 校验 active validation fields；invalid/unknown envelope 不会假成功；request timeout 与 workflow timeout 分离。

### 3. Rebind/no-replay tests

使用可控 `HostTransport` adapter：

```text
preOperationProbeNotReadyAllowsSingleRebind
initialProbeStaleRebindsOnceToReadyHost
preOperationRetryPreservesMostSpecificError
preOperationRebindDoesNotLoopIndefinitely
inFlightOperationTransportFailureDoesNotReplay
inFlightOperationFailureWithHostRestartDoesNotReplayToNewHost
operationFailureRereadsRegistryOnlyForClassification
postResponseIdentityDriftReturnsStaleInstance
postResponseMissingRegistryReturnsStaleInstance
oldHostSuccessEnvelopeIsNotCurrentSuccess
controlledRegistryProbeRebindSimulationInvalidatesOldContinuity
```

证明：只允许 pre-operation bounded rebind；operation sent 后绝不 replay；response 后 registry identity drift 会覆盖 success；old host envelope 不会被当成 current success。

### 4. Diagnostic priority tests

```text
preservesHostNotReadyOverTransportUnavailable
preservesHostRestartedOverRegistryMissingAfterSeen
preservesStaleInstanceOverGenericFailure
hostTimeoutEnvelopeMapsToTimeoutResult
transportRequestTimeoutMapsToTransportDiagnostic
invalidEnvelopeMapsToErrorResult
unknownStatusFailsClosed
```

证明：TS 保留最具体 diagnostic；host-level timeout、transport timeout、workflow timeout 三者边界稳定。

### 5. Scope guard

验证不创建：

```text
plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts
unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs
plugins/unity-agent-kit/src/tools
plugins/unity-agent-kit/skills/unity.md
```

证明：5A-07 没有提前进入 5A-08、MCP public tool registration 或 `/unity` skill。

---

## 验收要求

5A-07 完成前必须满足：

- `plugins/unity-agent-kit/src/host/registry.ts` 覆盖 strict registry validation 和 missing-before/after-seen classification；
- `plugins/unity-agent-kit/src/host/transport.ts` 覆盖 Node HTTP probe/invoke、request timeout 和 transport unavailable；
- `plugins/unity-agent-kit/src/host/http-client.ts` 覆盖 active validation、operation envelope validation、public result mapping、unknown status fail-closed；
- `plugins/unity-agent-kit/src/host/rebind.ts` 覆盖 bounded pre-operation rebind、in-flight no replay、post-response identity drift 和 diagnostic priority；
- `tests/host-runtime.test.ts` 通过固定 TS 命令；
- scope guard 证明没有创建 5A-08、MCP public tool 或 `/unity` skill 文件；
- 5A-07 计划和实现不得把 Phase 5A 或 Phase 5 标记 completed。

---

## Plan / roadmap 同步边界

- 本设计写入后，下一步是为 5A-07 创建 strict implementation plan。
- 5A-07 implementation plan 应引用本 spec 作为设计 source of truth。
- Phase 5A execution index 中 5A-07 可在计划创建并审查通过后从 candidate/pending 推进到 planned；5A-06 的完成度应以 roadmap Current State 和 5A-06 final evidence 为准。
- 5A-07 完成后只记录 TS non-live evidence；Phase 5A completion、vertical smoke evidence、plan index final completion evidence 留给 5A-08。
- Roadmap Phase 5 不得因 5A-07 完成而标记 completed。
