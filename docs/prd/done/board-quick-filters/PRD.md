# PRD — Kanban Board Quick Filter Bar

## Context

Today, both the Bug Kanban (`apps/web/src/components/tickets/bug-kanban.tsx`, used on `/projects/[id]/bugs` and `/projects/[id]/ticket`) and the Task Board (`apps/web/src/app/projects/[id]/board/page.tsx`) load and render all tickets in their respective views without any client-side filtering toolbar.

As projects grow with dozens of tickets across multiple developers and QA testers, navigating and finding specific cards becomes cumbersome.

## Problem / Motivation

Users have to visually scan all columns or open multiple cards to find tickets assigned to a particular teammate, find a specific bug by keyword/scenario, or focus on critical/high-severity issues.

## Scope

### 1. `BoardFilterBar` Component
Create a reusable `BoardFilterBar` component in `apps/web/src/components/tickets/board-filter-bar.tsx` with:
- **Text Search Input**:
  - Instant client-side search across ticket `headline`, `description`, and `bugDetails.scenario` / `bugDetails.feature`.
  - Clear icon to quickly reset the search text.
- **Assignee Avatar Filter Strip**:
  - Horizontal list of avatars for all project `members`.
  - "Unassigned" pill button.
  - Clicking an avatar or "Unassigned" toggles filtering cards assigned to that person (or unassigned).
  - Selected state indicated by a distinct primary border / ring.
- **Priority & Severity Filters**:
  - Select/combobox dropdowns to filter by priority (`low`, `medium`, `high`, `critical`) and severity (`minor`, `major`, `blocker`, `crash`).
- **Reset Filters Button**:
  - Appears when any filter (search, assignee, priority, severity) is active to reset all filters in one click.
  - Displays count of matching vs total cards (e.g. "Menampilkan 4 dari 24 tiket").

### 2. Integration with Board Views
Integrate `BoardFilterBar` into:
1. **Task Board** (`apps/web/src/app/projects/[id]/board/page.tsx`):
   - Place filter toolbar below the header and above the phase columns.
   - Filter `tickets` passed to each column based on active filter criteria.
2. **Bug Kanban (Non-Production)** (`apps/web/src/app/projects/[id]/bugs/page.tsx` via `BugKanban`):
   - Filter tickets across the 6 status columns (`new`, `open`, `in_progress`, `ready_for_qa`, `resolved`, `closed`).
3. **Production Incidents Kanban** (`apps/web/src/app/projects/[id]/ticket/page.tsx` via `BugKanban`):
   - Filter production bug tickets across columns.

## Out of scope

- Server-side database pagination/filtering (client-side filtering provides instant, zero-latency feedback without extra network roundtrips).
- Persisting filter states in URL query parameters or localStorage (can be evaluated as a future enhancement).

## Success criteria

- Typing in the search box immediately filters visible cards across all columns.
- Clicking an assignee's avatar filters only their assigned cards.
- Selecting priority/severity filters only matching cards.
- Drag-and-drop continues to work seamlessly on filtered cards.
- Reset button clears all filters and restores full column view.
- `pnpm lint` and `pnpm build` pass.

## Definition of done

- [ ] `pnpm --filter web lint` passes.
- [ ] `pnpm build` passes.
- [ ] Manual check: test search, assignee filter, priority/severity filter on `/board`, `/bugs`, and `/ticket`.
- [ ] Manual check: verify drag-and-drop works while filters are active.
