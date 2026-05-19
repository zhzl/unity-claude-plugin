# Large Subplan Planning Protocol

**Purpose:** Define how this project handles a roadmap subplan whose technical contract must stay coherent while a single strict `superpowers:writing-plans` implementation plan would be too large.

## When to Use

Use this protocol when any of these signals appear:

1. A subplan shares one technical contract, but one strict execution plan would become too large.
2. A subplan involves multiple strongly-coupled domains that must share one contract.
3. A plan author starts omitting concrete tests, expected FAIL, minimal implementation, expected PASS, verification commands, or commit steps to keep a plan short.
4. A document passes technical consistency review but is not directly executable under strict `superpowers:writing-plans`.

## Maximum Structure Depth

Only this structure is allowed:

```text
Roadmap Phase
→ Subplan Technical Contract
→ Execution Plan Set Index
→ Sibling Execution Plans
→ Tasks
```

Do not create nested batch plans:

```text
Execution Plan
→ Batch Plan
→ Sub-batch Plan
```

If an execution plan is too large, split it into sibling execution plans. If sibling plans exceed the hard stop, run formal subplan split review instead of adding another layer.

## Strict writing-plans preservation rule

Large subplan handling may split plans, but must not weaken `superpowers:writing-plans` requirements.

Every executable execution plan must include:

- concrete failing tests;
- command and expected FAIL output;
- minimal implementation guidance;
- command and expected PASS output;
- semantic verification, not only file or symbol existence;
- commit steps.

If a sibling execution plan cannot include those within a reviewable scope, split it into smaller sibling execution plans. If that requires a ninth sibling plan, stop and run formal subplan split review.

## Execution Plan Set Rules

An execution plan set index records:

- candidate plan cards;
- active execution plans;
- requirement IDs;
- wave and depends_on;
- expanded plan path;
- execution status;
- current next action.

Plan card is not executable. It is a coverage and scheduling record. Only an expanded strict writing-plans execution plan can be passed to `subagent-driven-development` or `executing-plans`.

## Plan Card Expansion Rules

When expanding a plan card:

1. Do not add requirement coverage beyond the card.
2. Do not delete requirement coverage from the card unless the execution index is updated and plan-set review passes.
3. Do not change wave, depends_on, or requirement ownership without updating the execution index and rerunning plan-set review.
4. Do not create a ninth sibling execution plan. If the ninth plan is needed, run formal subplan split review.
5. Expanded plans may add tests, steps, files, and evidence details, but must not reinterpret the technical contract.

## Escalation Thresholds

Run formal subplan split review when any of these happen:

- the execution plan set needs a ninth sibling execution plan;
- any execution plan cannot stay within 2-3 strict writing-plans tasks;
- an execution plan cannot preserve concrete tests, FAIL/PASS expectations, minimal implementation guidance, verification commands, and commit steps;
- a requirement can only fit by weakening the technical contract or reducing verification strength;
- requirement ownership, wave, or depends_on must be repeatedly moved to make the plan set work;
- a nested batch/sub-batch structure appears.

File counts are sizing signals, not independent hard stops. If a task is expected to touch more than five files or an execution plan more than eight files, plan-set review must check whether strict writing-plans can still be preserved.

## Splitting Principle

Use interface-first foundation plus vertical runtime slices.

- A minimal shared interface, DTO, or contract foundation is allowed.
- Each following execution plan should prove an observable runtime behavior or contract truth.
- Do not split by pure technical layer when that produces plans that only create files.
- File existence, symbol existence, and test-name existence are not behavior evidence.

## Plan-set Review Gate

Before execution, review the execution index and current expanded execution plan for:

1. requirement IDs fully cover the technical contract;
2. each requirement maps to a plan, task, test, and evidence;
3. each executable plan has 2-3 tasks;
4. each task has concrete files, action, verify, done, tests, expected FAIL/PASS, and commit steps;
5. out-of-scope boundaries are preserved;
6. weak phrases are absent;
7. the structure stays within the maximum depth;
8. formal subplan split review is not required.

## Current-truth files

For a large subplan, runtime entry and status truth live only in:

1. the phase plan index;
2. the subplan execution index.

Historical landing plans and experience notes may point to those files, but they are not current execution entry points.
