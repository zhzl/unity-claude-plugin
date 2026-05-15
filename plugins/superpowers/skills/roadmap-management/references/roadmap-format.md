# Roadmap Format Reference

本参考文件保存 `roadmap-management` 的长模板和输出示例。主技能只保留流程纪律；创建或更新实际文档时再参考这里。

## ROADMAP.md Full Template

```markdown
# <Roadmap Title>

## Metadata

- **Status:** active
- **Created:** YYYY-MM-DD
- **Last Sync:** YYYY-MM-DD
- **Current Phase:** P1
- **Next Action:** write-spec

## Goal

<One or two sentences describing the long-term initiative.>

## Non-goals

- <Thing this roadmap explicitly will not do>

## Shared Constraints

These constraints apply to every phase.

- <Constraint shared by all phases>

## Success Criteria

The roadmap is complete when:

- <Observable success criterion>

## Decisions

| Date | Decision | Reason |
|------|----------|--------|
| YYYY-MM-DD | Created roadmap | Initial approved roadmap |

## Current State

- **Overall Status:** active
- **Current Phase:** P1
- **Current Phase Status:** needs-spec
- **Next Manual Action:** `/superpowers:roadmap-management write-spec docs/superpowers/roadmaps/YYYY-MM-DD-slug/ROADMAP.md P1`
- **Last Sync:** YYYY-MM-DD
- **Last Sync Evidence:** Initial roadmap

## Blockers

| Blocker | Affects | Status | Resolution |
|---------|---------|--------|------------|
| None | None | clear | No active blockers |

## Phase Summary

| Phase | Status | Goal | Spec | Plan | Verification | Next |
|-------|--------|------|------|------|--------------|------|
| P1 | needs-spec | Define the first deliverable | pending | pending | pending | write-spec |

## Phase Details

### P1: First Deliverable

**Status:** needs-spec

**Goal:**  
Define and deliver the first coherent phase.

**Depends on:**  
None

**Scope:**
- Define the first deliverable.

**Out of Scope:**
- Work outside this phase.

**Artifacts:**
- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending

**Success Criteria:**
- The first phase has observable completion evidence.

**Next Manual Action:**  
`/superpowers:roadmap-management write-spec docs/superpowers/roadmaps/YYYY-MM-DD-slug/ROADMAP.md P1`

## Pending Proposals

No pending proposals.

## Proposal Rules

Use a `Proposal Brief` before changing roadmap structure or direction.

## Sync Rules

Before changing `Current State`, `Phase Summary`, or phase `Status`, read linked disk artifacts. Do not infer progress from chat memory alone.

## Handoff Rules

`roadmap-management` suggests next manual commands and does not automatically call other skills.

## Change Log

| Date | Change | Evidence |
|------|--------|----------|
| YYYY-MM-DD | Created roadmap | Initial roadmap |
```

## Phase Detail Template

```markdown
### Pn: <Phase Name>

**Status:** needs-spec

**Goal:**  
<What this phase accomplishes.>

**Depends on:**  
<Previous phase or None>

**Scope:**
- <In-scope item>

**Out of Scope:**
- <Out-of-scope item>

**Artifacts:**
- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending

**Success Criteria:**
- <Observable completion criterion>

**Next Manual Action:**  
`/superpowers:roadmap-management write-spec <ROADMAP.md> Pn`
```

## Proposal Brief Template

```markdown
# Roadmap Change Proposal

**Type:** phase-reorder
**Roadmap:** `<ROADMAP.md>`
**Affects:** P2, P3
**Requires Approval:** yes

## Current State

- P2: Current phase description
- P3: Current phase description

## Proposed Change

Describe the proposed roadmap change.

## Why

Explain why the roadmap should change.

## Impact

- Describe affected phases.
- Describe affected artifacts.
- Describe whether `Shared Constraints` change.

## Approval Question

Apply this proposal to `ROADMAP.md`?
```

## Spec Discussion Brief Template

```markdown
# Spec Discussion Brief

**Roadmap:** `<ROADMAP.md>`
**Phase:** Pn: <Phase Name>
**Spec Target:** `docs/superpowers/specs/YYYY-MM-DD-<phase>-design.md`

## Roadmap Goal

Copy the roadmap goal here.

## Phase Goal

Copy the phase goal here.

## Shared Constraints

- Copy every relevant shared constraint here.

## Phase Scope

- Copy in-scope phase items here.

## Out of Scope

- Copy out-of-scope phase items here.

## Success Criteria

- Copy phase success criteria here.

## Suggested Manual Next Step

`/superpowers:brainstorming <this brief>`
```

## Plan Handoff Template

```markdown
# Plan Handoff

**Roadmap:** `<ROADMAP.md>`
**Phase:** Pn
**Spec:** `docs/superpowers/specs/YYYY-MM-DD-<phase>-design.md`

## Shared Constraints

- Copy every relevant shared constraint here.

## Suggested Manual Next Step

`/superpowers:writing-plans @docs/superpowers/specs/YYYY-MM-DD-<phase>-design.md`

Include this roadmap context:
- Roadmap: `<ROADMAP.md>`
- Phase: Pn
```

## Execution Handoff Template

```markdown
# Execution Handoff

**Roadmap:** `<ROADMAP.md>`
**Phase:** Pn
**Plan:** `docs/superpowers/plans/YYYY-MM-DD-<phase>.md`

## Suggested Manual Next Step

Recommended:
`/superpowers:subagent-driven-development @docs/superpowers/plans/YYYY-MM-DD-<phase>.md`

Alternative:
`/superpowers:executing-plans @docs/superpowers/plans/YYYY-MM-DD-<phase>.md`
```

## Completion Evidence Examples

Strong evidence:

```text
bash plugins/superpowers/tests/claude-code/run-skill-tests.sh --test test-roadmap-management.sh passed
bash plugins/superpowers/tests/explicit-skill-requests/run-test.sh roadmap-management plugins/superpowers/tests/explicit-skill-requests/prompts/use-roadmap-management.txt passed
commit 1234567 adds roadmap-management skill and tests
```

Weak evidence that is not enough by itself:

```text
done
tested
looks good
```
