# ISSUES — Bug Status: Add "Ready for QA" Workflow State

See `PRD.md` for full context and scope decisions.

## 1. Shared status enum

- [x] `packages/shared/src/index.ts`: add `"ready_for_qa"` to
      `BUG_STATUSES`, positioned between `in_progress` and `resolved`.

## 2. Auto-sync logic

- [x] `apps/web/src/app/api/projects/[id]/tickets/[ticketId]/route.ts`:
      change the task-done → parent-bug auto-sync to set status
      `"ready_for_qa"` instead of `"resolved"`, and do not set `resolvedAt`
      in this path. Keep the `!["ready_for_qa", "resolved",
      "closed"].includes(parent.status)` guard so a bug already past this
      point isn't regressed.

## 3. Bug Kanban UI

- [x] `apps/web/src/components/tickets/bug-kanban.tsx`: add a
      `ready_for_qa` column between `in_progress` and `resolved` (columns
      are driven by `BUG_STATUSES.map(...)`, so verify it picks up
      automatically) and add a label/color entry to whatever status
      label/color config exists in this file (or a shared one) for the new
      value.

## 4. Detail modal / forms

- [x] `apps/web/src/components/tickets/ticket-detail-modal.tsx`: confirm
      the bug status combobox (built from `BUG_STATUSES`) picks up
      `ready_for_qa` automatically; add a label if status labels are
      hardcoded rather than derived from the raw enum value.

## 5. Overview / export

- [x] `apps/web/src/app/projects/[id]/overview/page.tsx` and
      `apps/web/src/app/api/projects/[id]/export/route.ts`: check whether
      either hardcodes a bug status list/label map that would need a
      `ready_for_qa` entry; update if so.

## 6. Verification (definition of done)

- [x] `pnpm --filter web lint` passes.
- [x] `pnpm --filter @devflow/shared lint` passes.
- [x] `pnpm build` passes.
- [x] Manual check: mark a task `done` whose parent is a bug in
      `in_progress`; confirm the bug becomes `ready_for_qa` and
      `resolvedAt` stays null.
- [x] Manual check: `ready_for_qa` shows as its own Bug Kanban column with
      a distinct label/color.
- [x] Manual check: move a bug manually from `ready_for_qa` to
      `in_progress` (QA reject) and separately to `resolved` (QA pass) via
      the edit form.
- [x] Code review pass (per repo's `code-review-and-quality` skill).
