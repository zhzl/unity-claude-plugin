# Large Subplan Planning Protocol 设计规格

**日期：** 2026-05-19
**项目：** Unity Agent Kit / Superpowers 本地流程修复

**相关文件：**
- `docs/superpowers/phase-5-subplan-planning-workflow-experience.md`
- `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
- `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-split-landing.md`
- `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md`
- `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

## 1. Problem Statement

Phase 5A Host Runtime 文档经过五类输入 closure 检查和 `reviewing-specs` 后，技术内容已经补强，但它仍不符合严格 `superpowers:writing-plans` 的 executable implementation plan 形态。

当前问题不是 5A 技术边界是否存在，而是文档角色混淆：

- `phase-5a-host-runtime.md` 包含完整 Host Runtime contract、quality gates、completion evidence 和测试要求。
- 它缺少 strict writing-plans 要求的微步骤：具体失败测试、预期 FAIL、最小实现、预期 PASS、验证命令和 commit。
- 如果直接交给 `subagent-driven-development` 或 `executing-plans` 执行，执行者仍会有过多自由解释空间。
- 如果把全部 5A 内容强行改成单个 strict writing-plans plan，文档会膨胀到不可维护长度。

因此，需要一个本地 Large Subplan Planning Protocol，用于处理“技术合同必须保持统一，但严格执行计划太大”的 subplan。

## 2. Goals

本设计的目标：

1. 保留 large subplan 的 technical contract 凝聚力。
2. 用 requirement IDs 让 execution plans 可追踪到 technical contract。
3. 用 sibling execution plans 控制单个执行计划的上下文大小。
4. 保持 strict `superpowers:writing-plans`，不得因需求大而降级为模糊计划。
5. 用最大深度和硬停止线防止 `subplan -> batchplan -> sub-batchplan` 无限拆分。
6. 先在 Phase 5A 落地验证，暂不修改通用 superpowers skills。

## 3. Non-goals

本设计不做以下事情：

- 不修改通用 `superpowers:writing-plans` skill。
- 不修改通用 `superpowers:roadmap-management` skill。
- 不开始 Phase 5A 代码实现。
- 不把 Phase 5A 立即拆成 5A1 / 5A2 / 5A3 formal subplans。
- 不继续维护 split landing plan 作为完整可重放模板。
- 不降低 writing-plans 对测试代码、FAIL/PASS、最小实现、验证命令和 commit 的要求。

## 4. Protocol Trigger Conditions

当出现以下任一情况时，使用 Large Subplan Planning Protocol：

1. 一个 subplan 的技术边界必须保持统一，但单个 strict writing-plans 文件会过长。
2. 一个 subplan 涉及多个强耦合能力域，但这些能力共享同一 contract。
3. 按严格 writing-plans 编写时，单个 plan 会超过 3 个大任务。
4. 任一 task 预计修改 5 个以上文件，或一个 execution plan 预计修改 8 个以上文件。
5. 为了缩短 plan，开始倾向省略测试代码、预期 FAIL、预期 PASS、最小实现或 commit 步骤。
6. `reviewing-specs` 认为技术一致，但文档仍不是可直接执行的 strict writing-plans plan。

## 5. Maximum Structure Depth

Large Subplan Planning Protocol 只允许以下结构：

```text
Roadmap Phase
→ Subplan Technical Contract
→ Execution Plan Set Index
→ Sibling Execution Plans
→ Tasks
```

禁止以下结构：

```text
Execution Plan
→ Batch Plan
→ Sub-batch Plan
```

如果某个 execution plan 太大，只能拆成同级 sibling execution plans。若 sibling execution plans 仍失控，必须停止并触发 formal subplan split review。

## 6. Strict Writing-plans Preservation Rule

Large subplan handling 只能通过拆分保持计划质量，不能通过降低计划精度保持短文档。

每个真正 executable execution plan 必须保持 strict `superpowers:writing-plans` 要求：

- 包含具体失败测试。
- 包含运行命令和预期 FAIL。
- 包含最小实现指导。
- 包含运行命令和预期 PASS。
- 行为验证必须证明语义，不只证明文件、符号或字符串存在。
- 包含 commit 步骤。
- 不只列测试名。
- 不用占位或弱化表达替代实现细节。

如果一个 execution plan 无法在合理上下文预算内满足这些要求，必须拆成更小的同级 execution plans。若同级拆分超过硬停止线，则触发 formal subplan split review。

## 7. Escalation Thresholds

出现以下任一情况，必须停止当前拆分方式并触发 formal subplan split review：

- execution plan set 需要第 9 个 sibling execution plan。
- 任一 execution plan 无法控制在 2-3 个 strict writing-plans tasks。
- 任一 execution plan 无法完整保留具体失败测试、预期 FAIL、最小实现、预期 PASS、验证命令和 commit。
- 某个 requirement 只能通过弱化 technical contract 或降低验证强度才能放入 execution plan。
- plan-set review 发现 requirement ownership、wave 或 depends_on 需要反复迁移才能成立。
- dependency graph 需要多轮 backtrack 或 reopen technical contract。
- 执行计划开始出现 batch/sub-batch 嵌套。

文件数量只作为辅助 sizing 信号，不单独触发 formal split review。若任一 task 预计修改 5 个以上文件，或任一 execution plan 预计修改 8 个以上文件，plan-set review 必须检查该 plan 是否仍能满足 strict writing-plans；只有无法完整保留 strict writing-plans 内容时，才触发 formal split review。

## 8. Splitting Principle

Large subplan 的 execution plans 采用：

```text
Interface-first foundation + vertical runtime slices
```

规则：

1. 可以有最小 shared interface / DTO / contract foundation。
2. 后续 execution plans 应尽量交付可验证 runtime slice。
3. 不按纯技术层横切，例如“所有 DTO -> 所有 HTTP -> 所有 TS client”。
4. 每个 slice 必须证明一个可观察行为或 contract truth。
5. 文件存在、符号存在、测试名存在不算行为证明。

## 9. Plan-set Review Gate

Execution plan set 和 sibling execution plans 必须通过 plan-set review gate。检查项：

1. requirement IDs 是否 100% 覆盖 technical contract。
2. 每个 requirement 是否映射到 plan、task、test 和 evidence。
3. 每个 execution plan 是否不超过 2-3 个 tasks。
4. 每个 task 是否包含 files、action、verify、done 的等价信息。
5. 每个行为 task 是否有自动验证。
6. 是否违反 subplan out-of-scope。
7. 是否出现弱化表达或占位表达。
8. 是否保持 interface-first foundation + vertical runtime slices。
9. 是否存在无限嵌套或横向无限扩张信号。
10. 是否应触发 formal subplan split review。

## 10. Phase 5A Structure Review Result

Phase 5A 已触发 structure review。三个只读复审视角结论如下：

- scope / roadmap 视角：建议保持单一 5A formal subplan，因为 5A 在 roadmap 和 split design 中是完整 Host Runtime foundation。
- vertical slice 视角：建议保持单一 5A technical contract，因为 registry/probe、lifecycle、operations、timeout、TS rebind 和 vertical smoke 共享同一 runtime continuity contract。
- execution sizing 视角：建议拆分，因为严格 writing-plans 下 5A 至少需要 7 个 sibling execution plans，且部分区域可能继续超预算。

最终结构决策：

```text
Phase 5A 暂时保持单一 formal subplan，
但 execution plan set 最多允许 8 个 sibling execution plans。
如果 8 个仍不足以保持 strict writing-plans，
必须停止并重新触发 formal subplan split review。
```

## 11. Phase 5A Technical Contract

保留现有路径：

```text
docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md
```

但该文件的角色改为：

```text
Unity Agent Kit Phase 5A Host Runtime Technical Contract
```

文件头部必须明确：

```text
本文件不是 executable implementation plan；
不得直接交给 subagent-driven-development 或 executing-plans 执行；
执行入口是 Phase 5A execution plan set index。
```

## 12. Contract Requirement Index

Phase 5A technical contract 中新增：

```markdown
## Contract Requirement Index
```

Requirement IDs 采用“能力域 + 语义 requirement”粒度，不按测试名逐项编号，也不只按大章节粗编号。

当前 5A 可使用的命名前缀：

```text
5A-RESULT-xx
5A-MCP-xx
5A-DTO-xx
5A-REG-xx
5A-HTTP-xx
5A-LIFE-xx
5A-OPS-xx
5A-DISPATCH-xx
5A-TIMEOUT-xx
5A-REBIND-xx
5A-EVIDENCE-xx
```

这些前缀只是命名辅助，不是必须预留完整 taxonomy。只创建当前 5A technical contract 实际需要的 requirement IDs；未使用的前缀不需要出现在 Contract Requirement Index 中。

每条 requirement 至少记录：

```markdown
| ID | Requirement | Source section | Covered by execution plan | Evidence |
```

`Covered by execution plan` 可以先指向 plan card；等 execution plan 展开后，再指向具体 execution plan 和 task。

## 13. Phase 5A Execution Plan Set Index

新增文件：

```text
docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md
```

该文件不是 executable plan。它负责：

- 列出 5A sibling execution plan cards。
- 记录 wave 和 depends_on。
- 映射 requirement IDs。
- 记录 plan card、expanded plan、completed 状态。
- 记录是否触发 hard stop。
- 指向当前 Next Manual Action。

## 14. Phase 5A Initial Plan Cards

Phase 5A 可以有 1-8 个 active sibling execution plans，8 是硬上限。当前设计先定义 8 个 candidate plan cards 作为覆盖地图，不要求最终执行时强制保留 8 个 active plans。

```text
5A-01 TS result + MCP mapping foundation
5A-02 Unity DTO + registry contract
5A-03 Host bootstrap + lifecycle cleanup
5A-04 GET /probe HTTP contract
5A-05 POST /operations envelope + router
5A-06 Main-thread dispatch + host-level timeout
5A-07 TS registry/probe/invoke/rebind classification
5A-08 Vertical smoke + completion evidence
```

Plan-set review 可以在不弱化 requirement coverage 的前提下合并或删除 candidate cards，但不得制造空洞 card、占位 card 或第 9 个 sibling execution plan。如果 plan-set review 证明需要第 9 个 plan，或任一 active plan 无法严格满足 writing-plans，则停止并重新触发 formal subplan split review。

## 15. Generation Cadence

采用混合生成节奏：

1. 先写 execution index 和最多 8 个 candidate plan cards。
2. 只展开当前 wave 的 strict writing-plans execution plan。
3. 每个 wave 开始前，把对应 active plan card 展开为完整 execution plan。
4. 每次展开都运行 plan-set review。
5. 所有 active execution plans completed，加 final evidence 通过后，5A 才能 completed。

Plan card 不是 executable plan，不得被执行者直接执行。

### Plan Card Expansion Rules

Plan card 展开为 executable plan 时必须遵守：

- Expanded plan 不得新增超出 card 的 requirement coverage。
- Expanded plan 不得删除 card 已声明的 requirement coverage；如需删除，必须先更新 execution index 并重跑 plan-set review。
- 如需合并、删除或拆分 candidate cards，必须先更新 execution index 并重跑 plan-set review。
- 如需改变 wave、depends_on 或 requirement ownership，必须先更新 execution index 并重跑 plan-set review。
- 如变更需要第 9 个 sibling execution plan，立即触发 formal subplan split review。
- Expanded plan 可以细化 tests、steps、files 和 evidence，但不能重新解释 technical contract。

## 16. Phase 5 Plan Index Changes

Phase 5 plan index 的 subplan 表需要显式区分 technical contract 和 execution entry。

推荐表结构：

```markdown
| Subplan | Scope | Contract | Execution Index | Status | Execution Status | Completion Evidence | Upgrade Check |
```

Phase 5A 行必须表达：

- Contract 指向 `phase-5a-host-runtime.md`。
- Execution Index 指向 `phase-5a-execution-index.md`。
- Status 表示 contract 已 ready，但不是 executable plan。
- Execution Status 表示 execution plans 尚未完成。
- Completion Evidence 仍为 pending。
- Upgrade Check 仍为 stays subplan。

Next Manual Action 不得直接指向：

```text
/superpowers:subagent-driven-development docs/...phase-5a-host-runtime.md
```

它必须先指向创建或审查 Phase 5A execution index 和当前 wave execution plan。

### Current-truth Hierarchy

运行时入口和状态口径只以以下文件为准：

1. `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`：Phase 5 subplan 层级入口和总体状态。
2. `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`：Phase 5A execution plan set 的 current entry、wave、depends_on、active plan cards 和 execution status。

`phase-5-split-landing.md` 和 `phase-5-subplan-planning-workflow-experience.md` 只记录历史、经验和指针，不承担当前执行入口或状态真相。落地 implementation plan 的最高优先级验证项，是证明 Phase 5 plan index、roadmap 和 Next Manual Action 不再把 `phase-5a-host-runtime.md` 当作 executable plan。

## 17. Split Landing Plan Changes

`phase-5-split-landing.md` 不再承担完整模板同步职责。

处理规则：

- 保留它作为已执行过的一次性 landing plan 历史记录。
- 修正文中会误导的“5A implementation plan 可直接执行”表达。
- 增加指针到 Large Subplan Planning Protocol、5A technical contract、5A execution index。
- 不内嵌全部 execution plan set。
- 不要求每次 execution plan 展开都同步 split landing。

## 18. Roadmap and Experience Doc Changes

Roadmap Phase 5 不标记 completed。

如需同步 roadmap 当前状态，表达应为：

```text
Phase 5A Host Runtime technical contract ready;
next step is creating/reviewing Phase 5A execution plan set;
code implementation has not started.
```

`docs/superpowers/phase-5-subplan-planning-workflow-experience.md` 需要记录本次经验：

- 单一 subplan 多 execution plans 的错误风险。
- 不应无限嵌套 batchplan。
- 参考 get-shit-done 的 sibling plan、wave、context budget 思路。
- 但保留 superpowers strict writing-plans，不降级为 GSD-style。
- 5A structure review 结果：keep single 5A with hard limit 8 sibling execution plans。

## 19. Implementation Plan Scope

本设计通过后，下一步不是实现 5A 代码，而是写一个文档落地 implementation plan：

```text
docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-contract-execution-plan-set.md
```

该 plan 只修改文档，范围包括：

- 创建本地 protocol 文档。
- 修改 5A 文件标题和定位为 technical contract。
- 新增 Contract Requirement Index。
- 创建 5A execution index。
- 创建最多 8 个 candidate plan cards。
- 更新 Phase 5 plan index。
- 更新 split landing 指针。
- 更新 experience doc。
- 必要时更新 roadmap next action。
- 验证 technical contract 不再被标成 executable plan。
- 验证 split landing 不再内嵌完整 execution plan set。

## 20. Completion Rules

Phase 5A completed 的条件变为：

```text
5A technical contract ready
+ execution index complete
+ all active sibling execution plans completed
+ final vertical smoke evidence passed
+ plan index completion evidence recorded
```

任何单个 execution plan completed 都不能把 Phase 5A 标记 completed。

## 21. Success Criteria

本设计落地后的成功标准：

1. 有独立 protocol 文档。
2. 有本 design spec 记录规则与 Phase 5A application。
3. 5A 文件被明确标记为 technical contract。
4. Phase 5 plan index 明确区分 contract、execution index、execution status。
5. 5A execution index 列出最多 8 个 active sibling execution plans，并可先记录最多 8 个 candidate plan cards。
6. 真正 executable plans 之后必须严格 writing-plans。
7. 如果 8 个 sibling plans 仍不够，流程会停止并触发 formal subplan split review。
