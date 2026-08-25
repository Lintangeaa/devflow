# PRD — Bug Status: Add "Ready for QA" Workflow State

## Context

Today, `BUG_STATUSES` (`packages/shared/src/index.ts:9`) is:
```
["new", "open", "in_progress", "resolved", "closed"]
```
And the auto-sync in
`apps/web/src/app/api/projects/[id]/tickets/[ticketId]/route.ts` (lines
~64–85) jumps a bug straight from dev-task-done to fully `resolved`:
```ts
if (effectiveType === "task" && effectiveStatus === "done" && effectiveParentId) {
  const [parent] = await db.select(...).from(schema.tickets)
    .where(and(eq(schema.tickets.id, effectiveParentId), eq(schema.tickets.projectId, id)));
  if (parent && parent.type === "bug" && !["resolved", "closed"].includes(parent.status)) {
    await db.update(schema.tickets).set({ status: "resolved", resolvedAt: new Date(), updatedAt: new Date() })...
  }
}
```
There is no intermediate state representing "the dev fix is done but QA
hasn't verified it yet" — a bug goes from `in_progress` to `resolved`
without ever being flagged as needing testing.

## Problem / Motivation

When a dev task linked to a bug is marked `done`, the bug should be visibly
queued for QA verification rather than being marked `resolved` outright —
`resolved` should mean QA has actually confirmed the fix, not just that a
dev finished coding it.

## Scope

### 1. New status value
- Add `"ready_for_qa"` to `BUG_STATUSES` in `packages/shared/src/index.ts`:
  ```
  ["new", "open", "in_progress", "ready_for_qa", "resolved", "closed"]
  ```
- No change to `TASK_STATUSES`.

### 2. Auto-sync behavior change
- In `tickets/[ticketId]/route.ts`'s auto-sync block: when a task becomes
  `done` and its parent is a bug not already in `["ready_for_qa",
  "resolved", "closed"]`, set the parent's status to `"ready_for_qa"`
  instead of `"resolved"`. Do **not** set `resolvedAt` at this point —
  `resolvedAt` should only be set when the bug actually reaches `resolved`
  or `closed` (matches the existing `resolvedAt`-on-terminal-status
  convention noted in CLAUDE.md/route logic elsewhere).
- Moving a bug to `resolved`/`closed` remains a manual action (via form or
  drag, per `docs/prd/todo/kanban-drag-drop/`), same as today — this PRD
  only changes what the *automatic* transition targets.

### 3. QA-reject flow
- No new status for a failed QA pass. QA/dev manually moves the bug back to
  `in_progress` (via the existing form or the kanban drag feature) if
  verification fails — no `reopened` state is introduced.

### 4. UI updates
- `apps/web/src/components/tickets/bug-kanban.tsx`: add a `ready_for_qa`
  column between `in_progress` and `resolved` in `BUG_STATUSES`-driven
  rendering, with its own label/color in whatever status-label/color config
  the component uses (e.g. `BUG_STATUS_CONFIG`/`BUG_STATUS_COLORS` if such
  a map exists — verify exact name during implementation).
- `apps/web/src/components/tickets/ticket-detail-modal.tsx`: status
  combobox options for bugs automatically pick up the new value since they
  're built from `BUG_STATUSES`.
- Overview page and export route: no special handling needed beyond
  existing status-label lookups picking up the new value, unless a status
  color/label map needs a corresponding entry there too (check during
  implementation).

## Out of scope

- A distinct "reopened" status — rejected QA just goes back to
  `in_progress`.
- Automatic notification when a bug moves to `ready_for_qa` (tracked
  separately in `docs/prd/todo/in-app-notifications/`).
- Kanban drag-and-drop mechanics themselves (tracked separately in
  `docs/prd/todo/kanban-drag-drop/`) — this PRD only adds the status value
  and auto-sync target; drag support for it comes from that other PRD.
- Any per-project configurability of the status list (still a fixed
  `BUG_STATUSES` constant, not project-configurable workflow stages).

## Success criteria

- Marking a task `done` whose parent is a bug sets the bug to
  `ready_for_qa`, not `resolved`, and does not set `resolvedAt`.
- `ready_for_qa` appears as a selectable status in the bug edit form and as
  a column on Bug Kanban with a distinct label/color.
- Manually moving a bug from `ready_for_qa` to `in_progress`, `resolved`,
  or `closed` all work via the existing form.
- `pnpm lint` and `pnpm build` pass.

## Definition of done (from CLAUDE.md / repo conventions)

- [ ] Validation lives in `@devflow/shared` (`BUG_STATUSES`), not
      duplicated inline.
- [ ] `pnpm lint` passes for `web` and `@devflow/shared`.
- [ ] `pnpm build` passes.
- [ ] Manual verification: complete a task linked to a bug and confirm the
      bug moves to `ready_for_qa`; manually move it through the remaining
      statuses via the form (no automated test suite exists in this repo
      yet).
