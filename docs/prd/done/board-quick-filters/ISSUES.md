# ISSUES — Kanban Board Quick Filter Bar

See `PRD.md` for full context and scope decisions.

## 1. Reusable `BoardFilterBar` Component

- [x] Create `apps/web/src/components/tickets/board-filter-bar.tsx`:
  - Search input with clear button.
  - Assignee avatar strip + "Unassigned" pill button with active selection states.
  - Priority & Severity filter dropdowns.
  - Filter counter badge and "Reset Filter" button.
  - Export filter state type and matching filter evaluation predicate helper.

## 2. Integration into Task Board

- [x] `apps/web/src/app/projects/[id]/board/page.tsx`:
  - Mount `BoardFilterBar`.
  - Filter `tickets` state before grouping by phase columns.
  - Ensure column drag-and-drop continues to work correctly.

## 3. Integration into Bug Kanban

- [x] `apps/web/src/components/tickets/bug-kanban.tsx`:
  - Mount `BoardFilterBar`.
  - Filter `tickets` state before distributing into the 6 status columns (`new`, `open`, `in_progress`, `ready_for_qa`, `resolved`, `closed`).
  - Verify drag-and-drop and quick-action buttons continue to operate smoothly.

## 4. Verification (definition of done)

- [x] `pnpm --filter web lint` passes.
- [x] `pnpm build` passes.
- [x] Manual check: test search by keyword/scenario on both task and bug boards.
- [x] Manual check: test assignee avatar toggle and unassigned filter.
- [x] Manual check: test priority and severity filters.
- [x] Manual check: verify drag-and-drop while filtered.
- [x] Code review pass (per repo's `code-review-and-quality` skill).
