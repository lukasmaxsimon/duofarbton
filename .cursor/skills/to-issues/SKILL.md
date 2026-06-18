
---
name: to-issues
description: Break a plan, spec, or PRD into independently-grabbable issues in Linear using tracer-bullet vertical slices. Use when user wants to convert a plan into Linear issues, create implementation tickets, or break down work into issues.
---

# To Issues (Linear)

Break a plan into independently-grabbable Linear issues using vertical slices (tracer bullets).

Issues are created in **Linear** via the connected **Linear MCP server** (official `mcp.linear.app`, connected through Cursor). Do not create GitHub issues.

## Linear configuration

Pin defaults here if you have them, otherwise resolve at runtime (see step 0):

- **Team**: `BEA` — or leave blank to resolve via `list_teams`.
- **Project** (optional): `<project name>` — omit to create issues without a project.
- **Ready signal**: how an issue is marked "ready for AFK agents". Either:
  - a **label** (e.g. `agent-ready`), applied via `labels`/`AI Ready`, or
  - a **workflow state** (e.g. `Todo` instead of `Triage`), set via `state`/`status`.

  Default: apply the `<ready-label>` label. Adjust per your workspace.

### MCP tools used

Read/resolve: `list_teams`, `list_projects`, `list_issue_labels`, `list_issue_statuses`, `get_issue`, `list_issues`.
Write: `create_issue`, `update_issue`, `create_comment`.

The exact parameter names depend on the connected Linear MCP build. The official server's `create_issue` accepts `team` (id/key/name), `title`, `description` (Markdown), `parentId` (for sub-issues), `state`/`status`, `priority`, `assignee` (`"me"` allowed), and `labels`/`labelIds`. Inspect the live tool schema in Cursor and use whatever it actually exposes rather than assuming.

## Process

### 0. Resolve Linear context

Before drafting, make sure you know which Linear team (and optionally project) the issues belong to, plus the label/state vocabulary:

- If the team/project/ready-signal aren't pinned above or given in the conversation, call `list_teams`, `list_projects`, `list_issue_labels`, and `list_issue_statuses` and confirm with the user.
- Resolve the human-readable names to the IDs/keys the write tools expect.

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes an issue reference (Linear issue identifier like `LMK-123`, a Linear URL, or a file path) as an argument, fetch it with `get_issue` and read its full body and comments.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Issue titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

### 3. Draft vertical slices

Break the plan into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

Slices may be 'HITL' or 'AFK'. HITL slices require human interaction, such as an architectural decision or a design review. AFK slices can be implemented and merged without human interaction. Prefer AFK over HITL where possible.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
</vertical-slice-rules>

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Blocked by**: which other slices (if any) must complete first
- **User stories covered**: which user stories this addresses (if the source material has them)

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the correct slices marked as HITL and AFK?

Iterate until the user approves the breakdown.

### 5. Publish the issues to Linear

For each approved slice, create a new Linear issue with `create_issue`, using the resolved team (and project) from step 0 and the body template below. These issues are considered ready for AFK agents, so apply the **ready signal** (label or state from the config block) unless instructed otherwise.

Publish issues in **dependency order (blockers first)** so you can reference real Linear issue identifiers (e.g. `LMK-123`) in dependent issues.

Use Linear's native relationships instead of free text where the MCP allows it:

- **Parent → sub-issue**: if the source was an existing Linear issue, set `parentId` on `create_issue` so the new issues become sub-issues of it. Do NOT duplicate this as text.
- **Blocked by**: after a blocker is created, set a native **"blocked by"** relation on the dependent issue if the connected MCP exposes a relation/dependency tool (or `update_issue`). If it does not, fall back to recording the blocker's identifier in the "Blocked by" section of the body.

After creating each issue, capture its returned identifier so later slices can reference it.

<issue-template>
## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation.

Avoid specific file paths or code snippets — they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it here and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

The blocking issue's Linear identifier (e.g. `LMK-123`) — only if the dependency could not be set as a native "blocked by" relation.

Or "None - can start immediately" if no blockers.

</issue-template>

Parent and blocking relationships live in Linear's native fields (sub-issue + relations), not as a "## Parent" heading in the body.

Do NOT close or modify the parent issue beyond linking the new sub-issues to it.