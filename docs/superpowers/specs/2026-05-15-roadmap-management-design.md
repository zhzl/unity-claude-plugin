# Manual Roadmap Management for Superpowers

## Context

Superpowers already has a feature-level workflow:

```text
brainstorming → writing-plans → subagent-driven-development / executing-plans
```

This works for single features, but long-running initiatives need a durable layer above specs and plans. The new workflow adds a manual-only roadmap controller that helps users manage long-term goals, shared constraints, phase state, artifact mappings, proposal review, and next actions across sessions.

The design borrows two ideas without copying either system wholesale:

- From get-shit-done: state should be recoverable from disk artifacts instead of chat memory.
- From OpenSpec: current truth and proposed changes should stay separate, and different document types should have clear responsibilities.

## Goals

- Add one manual-only `roadmap-management` skill.
- Write the skill in Chinese while preserving stable English action and field names.
- Use one authoritative `ROADMAP.md` per large initiative.
- Keep roadmap state recoverable from disk artifacts.
- Map each phase to its spec, plan, implementation summary, and verification evidence.
- Align roadmap progression with the existing Superpowers loop:
  - write spec
  - write plan
  - implement plan
  - complete phase
- Support lightweight `Proposal Brief` review before changing roadmap direction.
- Keep long templates and examples in a reference document so `SKILL.md` stays focused.
- Avoid requiring users to remember complex prompts.

## Non-goals

- Do not add CLI commands.
- Do not add schema validators.
- Do not add background sync.
- Do not add hooks.
- Do not add worktree guidance.
- Do not copy OpenSpec's full `changes/` lifecycle.
- Do not copy GSD's full `.planning/PROJECT.md`, `STATE.md`, `CONTEXT.md` artifact set.
- Do not make `roadmap-management` naturally trigger from generic long-term task wording.
- Do not replace existing `brainstorming`, `writing-plans`, `subagent-driven-development`, or `executing-plans`.

## Design Summary

Add a new manual-only skill:

```text
plugins/superpowers/skills/roadmap-management/SKILL.md
```

Add a reference document for long templates and examples:

```text
plugins/superpowers/skills/roadmap-management/references/roadmap-format.md
```

The skill acts as a roadmap controller. Users explicitly invoke it, then choose one of these actions:

1. `new-roadmap`
2. `progress`
3. `write-spec`
4. `write-plan`
5. `implement-plan`
6. `complete-phase`
7. `change-roadmap`

The main loop is:

```text
progress → write-spec → write-plan → implement-plan → complete-phase → progress
```

`change-roadmap` is a side path for changing goals, shared constraints, or phase structure through a `Proposal Brief`.

## Manual-only Triggering

`roadmap-management` must only be used when the user explicitly asks for it, for example:

- `/superpowers:roadmap-management`
- `use roadmap-management`
- `请使用 roadmap-management`
- `按 roadmap-management 流程处理这个 ROADMAP.md`

It must not automatically trigger from ordinary phrases like:

- `长期任务`
- `roadmap`
- `多阶段`
- `同步状态`
- `阻塞项`

This preserves the requirement that roadmap management is manually controlled.

The skill frontmatter should keep the trigger narrow:

```yaml
---
name: roadmap-management
description: 当用户明确点名 roadmap-management、显式调用 /superpowers:roadmap-management，或要求按 roadmap-management 流程处理指定 ROADMAP.md 时使用；不要因普通长期任务或 roadmap 讨论自动触发
---
```

## Directory Structure

The final structure under `docs/superpowers` remains:

```text
docs/superpowers/
├── specs/
│   └── YYYY-MM-DD-<feature-or-phase>-design.md
├── plans/
│   └── YYYY-MM-DD-<feature-or-phase>.md
└── roadmaps/
    └── YYYY-MM-DD-<roadmap-slug>/
        └── ROADMAP.md
```

No nested phase directories, proposal directories, archive directories, or OpenSpec-style `changes/` directories are added in the first version.

## Skill File Structure

`SKILL.md` should be concise and written in Chinese. It should retain stable English terms for action names and roadmap field names.

Recommended sections:

1. Frontmatter
2. `# Roadmap Management`
3. Manual-only hard gate
4. Overview
5. OpenSpec documentation governance principles
6. User actions
7. Main loop
8. `ROADMAP.md` location
9. Status and `Artifacts` rules
10. `Proposal Rules`
11. Per-action workflows
12. Manual handoff rules
13. Red lines
14. Common mistakes

Long templates and examples should move to `references/roadmap-format.md`.

## Reference Document Structure

`references/roadmap-format.md` should contain:

1. `ROADMAP.md Full Template`
2. `Phase Detail Template`
3. `Proposal Brief Template`
4. `Spec Discussion Brief Template`
5. `Plan Handoff Template`
6. `Execution Handoff Template`
7. `Completion Evidence Examples`

This keeps the skill focused while still giving future agents complete document examples when they need to create or update roadmap artifacts.

## OpenSpec Documentation Governance

OpenSpec's influence appears in document governance, not in directory cloning.

### Current truth vs proposed change

```text
ROADMAP.md = current truth
Proposal Brief = proposed change
```

A structural or directional roadmap change must not be written directly into current truth. `change-roadmap` first produces a `Proposal Brief`; after user approval, the accepted change is applied to `ROADMAP.md`.

### Document responsibility separation

```text
ROADMAP.md                   long-term goal, shared constraints, phase state, artifact mapping
docs/superpowers/specs/      phase design/specification
docs/superpowers/plans/      phase implementation plan
```

`ROADMAP.md` must not contain full spec text or detailed implementation steps.

### Progressive rigor

Small fact updates do not require proposal review:

- filling artifact paths
- marking missing artifacts
- updating `Last Sync`
- adding blockers
- recording verification evidence
- appending change log entries

Structural or directional changes require proposal review:

- changing `Goal`
- changing `Non-goals`
- changing `Shared Constraints`
- changing overall `Success Criteria`
- adding, removing, merging, splitting, or reordering phases
- significantly changing phase scope
- significantly changing phase success criteria

### Evidence before completion

A phase cannot become `completed` unless it has `Verification Evidence`. Conversation memory alone is not evidence.

### Lightweight history

The first version records history in:

- `Decisions`
- `Pending Proposals`
- `Change Log`
- phase status values such as `completed` or `archived`

It does not move files into an archive directory.

## ROADMAP.md Model

Each large initiative gets one roadmap:

```text
docs/superpowers/roadmaps/YYYY-MM-DD-<slug>/ROADMAP.md
```

The roadmap is the current truth for:

- long-term goal
- non-goals
- shared constraints
- success criteria
- current state
- phase summary
- phase details
- artifact mappings
- blockers
- pending proposals
- decisions
- change log

Detailed phase design remains in `docs/superpowers/specs/`.

Detailed implementation planning remains in `docs/superpowers/plans/`.

## ROADMAP.md Required Sections

`ROADMAP.md` should contain:

1. `Metadata`
2. `Goal`
3. `Non-goals`
4. `Shared Constraints`
5. `Success Criteria`
6. `Decisions`
7. `Current State`
8. `Blockers`
9. `Phase Summary`
10. `Phase Details`
11. `Pending Proposals`
12. `Proposal Rules`
13. `Sync Rules`
14. `Handoff Rules`
15. `Change Log`

Each phase must include artifact mappings:

```markdown
**Artifacts:**
- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending
```

## Status Values

Roadmap status:

```text
active
blocked
completed
archived
```

Phase status:

```text
not-started
needs-spec
designed
planned
in-progress
blocked
completed
archived
```

Status inference rules:

```text
Spec pending
→ needs-spec

Spec exists, Plan pending
→ designed

Spec exists, Plan exists, Verification pending
→ planned or in-progress

Verification evidence exists
→ completed

Linked artifact path missing
→ do not advance status
```

## User Actions

### `new-roadmap`

Creates a new `ROADMAP.md`.

Responsibilities:

- confirm title
- confirm goal
- confirm non-goals
- confirm shared constraints
- draft phases
- ask user to approve phase split
- create roadmap file

Must not:

- write spec
- write plan
- execute implementation

### `progress`

Reads `ROADMAP.md` and linked artifacts, then reports current state and next manual action.

Responsibilities:

- read roadmap
- read current phase artifact paths
- conservatively update status if evidence changed
- suggest next manual action

This combines status refresh and next-step selection so users do not need to choose between internal sync and advance modes.

### `write-spec`

Prepares a `Spec Discussion Brief` for one phase.

Responsibilities:

- read roadmap
- locate phase
- extract roadmap goal, shared constraints, phase scope, and phase success criteria
- output a brief suitable for manual `/superpowers:brainstorming`

Must not automatically invoke `brainstorming`.

### `write-plan`

Prepares a planning handoff for one phase.

Responsibilities:

- read roadmap
- read linked spec
- extract roadmap path, phase id, and shared constraints
- suggest manual `/superpowers:writing-plans`

Must not write the plan directly unless the user separately invokes `writing-plans`.

### `implement-plan`

Prepares an execution handoff.

Responsibilities:

- read roadmap
- read linked plan
- confirm phase is ready for execution
- suggest manual `subagent-driven-development` or `executing-plans`

Must not execute the plan directly.

### `complete-phase`

Records verification evidence and advances the roadmap.

Responsibilities:

- read roadmap
- read linked spec and plan
- require verification evidence
- mark phase completed only with evidence
- update current phase to the next incomplete phase
- append change log

### `change-roadmap`

Changes roadmap direction through a `Proposal Brief`.

Use for:

- changing `Goal`
- changing `Non-goals`
- changing `Shared Constraints`
- changing overall `Success Criteria`
- adding, removing, merging, splitting, or reordering phases
- significantly changing phase scope
- significantly changing phase success criteria

Must generate a `Proposal Brief` before modifying current truth.

## Proposal Rules

Proposal is lightweight and does not create a new directory.

Default flow:

```text
Generate Proposal Brief
→ user approves
→ apply to ROADMAP.md
→ update Decisions / Phase Summary / Phase Details / Change Log
```

Proposal is required for structural or directional changes.

Proposal is not required for:

- filling artifact paths
- updating `Last Sync`
- adding blockers
- recording verification evidence
- appending change log entries
- marking artifact paths missing

Optional unresolved proposals may be stored in `Pending Proposals` inside `ROADMAP.md`.

## Manual Handoff Rules

`roadmap-management` suggests next manual commands. It does not call other skills automatically.

Allowed:

- suggest `/superpowers:brainstorming`
- suggest `/superpowers:writing-plans`
- suggest `/superpowers:subagent-driven-development`
- suggest `/superpowers:executing-plans`

Not allowed:

- automatically invoke `Skill`
- start implementation
- run execution plans
- claim phase completion without evidence

## Files to Add

```text
plugins/superpowers/skills/roadmap-management/SKILL.md
plugins/superpowers/skills/roadmap-management/references/roadmap-format.md
plugins/superpowers/tests/explicit-skill-requests/prompts/use-roadmap-management.txt
plugins/superpowers/tests/claude-code/test-roadmap-management.sh
```

## Files to Edit

```text
plugins/superpowers/tests/explicit-skill-requests/run-all.sh
plugins/superpowers/tests/claude-code/run-skill-tests.sh
```

Optional:

```text
plugins/superpowers/skills/writing-plans/SKILL.md
```

The optional `writing-plans` change only adds support for explicitly supplied roadmap context:

```markdown
**Roadmap:** `docs/superpowers/roadmaps/<slug>/ROADMAP.md`
**Phase:** P1 / P2 / N/A
```

## Files Not to Edit

Do not add natural trigger coverage:

```text
plugins/superpowers/tests/skill-triggering/prompts/roadmap-management.txt
plugins/superpowers/tests/skill-triggering/run-all.sh
```

Do not modify `brainstorming` to automatically route into `roadmap-management`.

## Tests

Add explicit request test:

```text
plugins/superpowers/tests/explicit-skill-requests/prompts/use-roadmap-management.txt
```

Add lightweight behavior test:

```text
plugins/superpowers/tests/claude-code/test-roadmap-management.sh
```

The behavior test should check that the skill mentions:

- manual-only
- `MANUAL-ONLY`
- `docs/superpowers/roadmaps`
- `ROADMAP.md`
- `Shared Constraints`
- `Phase Summary`
- `Phase Details`
- `Artifacts`
- `Spec`
- `Plan`
- `Verification Evidence`
- `Proposal Brief`
- `new-roadmap`
- `progress`
- `write-spec`
- `write-plan`
- `implement-plan`
- `complete-phase`
- `change-roadmap`
- `superpowers:brainstorming`
- `superpowers:writing-plans`
- `superpowers:subagent-driven-development`
- `superpowers:executing-plans`

It should check that the reference document exists and mentions:

- `ROADMAP.md Full Template`
- `Phase Detail Template`
- `Proposal Brief Template`
- `Spec Discussion Brief Template`
- `Plan Handoff Template`
- `Execution Handoff Template`
- `Completion Evidence Examples`

It should also check explicit prohibitions:

- do not automatically call other skills
- do not add natural trigger tests
- do not create CLI commands
- do not create schema validators
- do not add worktree guidance
- do not copy OpenSpec full lifecycle
- do not copy GSD full artifact set

## Verification Commands

```bash
bash -n plugins/superpowers/tests/explicit-skill-requests/run-all.sh
bash -n plugins/superpowers/tests/claude-code/run-skill-tests.sh
bash -n plugins/superpowers/tests/claude-code/test-roadmap-management.sh
```

```bash
bash plugins/superpowers/tests/explicit-skill-requests/run-test.sh roadmap-management plugins/superpowers/tests/explicit-skill-requests/prompts/use-roadmap-management.txt
```

```bash
bash plugins/superpowers/tests/claude-code/run-skill-tests.sh --test test-roadmap-management.sh
```

## Resolved Design Decisions

- One skill, not multiple skills.
- Main skill content is Chinese.
- Stable action names and field names remain English.
- Long templates and examples are split into `references/roadmap-format.md`.
- Manual-only trigger.
- One roadmap per large initiative.
- Shared constraints live in `ROADMAP.md`.
- Specs and plans stay in existing directories.
- Proposal is a brief, not a new directory lifecycle.
- User actions align with Superpowers' spec → plan → implement loop.
- OpenSpec is represented through document governance, not copied directories.
