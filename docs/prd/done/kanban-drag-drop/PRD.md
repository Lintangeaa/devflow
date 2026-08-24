# PRD — Kanban Drag-and-Drop

## Context

All Devflow kanban boards currently move a card between columns only through
`TicketDetailModal`'s status combobox (`PATCH /api/projects/[id]/tickets/[ticketId]`).
There are two distinct board implementations, both currently click-to-open only:

- **Task board** (`apps/web/src/app/projects/[id]/board/page.tsx`) — columns are
  the project's **phases** (`phases` table via `tickets.phaseId`), not a fixed
  status list.
- **Bug Kanban** (`apps/web/src/components/tickets/bug-kanban.tsx`) — columns are
  the fixed `BUG_STATUSES` (`packages/shared/src/index.ts`). Reused by both the
  pre-production bugs page (`bugs/page.tsx`, `environmentFilter="non_production"`)
  and the production bugs page (`ticket/page.tsx`, `environmentFilter="production"`).

This PRD adds drag-and-drop as an additional way to change a card's column
(status or phase) and its manual order within a column, alongside the existing
form-based edit — the form is not being removed.

No drag-and-drop library is currently installed in the repo.

## Problem / Motivation

Editing a ticket's status via the form modal is slower than a direct drag when
triaging many cards at once (e.g. moving several bugs from `new` to `open`
during a triage session). Drag-and-drop is the expected interaction pattern
for kanban-style boards.

## Scope

### 1. Bug Kanban (`bug-kanban.tsx`)
- Cards become draggable within and across the fixed `BUG_STATUSES` columns.
- Dropping a card into a different column updates `status` via the existing
  `PATCH /api/projects/[id]/tickets/[ticketId]` route. No status-transition
  validation — any column-to-column move is allowed (matches today's form,
  which lets you pick any status freely).
- Dropping a card into a new position within the *same* column reorders it
  (see `position` field, below).
- Applies identically to both the pre-production and production bug pages,
  since they share the same component.

### 2. Task board (`board/page.tsx`)
- Cards become draggable within and across phase columns.
- Dropping into a different phase column updates `phaseId`.
- If the destination phase is the **last phase** in the project's phase order,
  the ticket's `status` is also auto-set to `done` in the same request — this
  reuses the existing auto-sync logic in the PATCH route (a `task` ticket
  reaching `done` with a `parentId` auto-resolves the parent bug).
- Dropping into a new position within the same phase column reorders it.

### 3. Ordering within a column
- New `position` integer column on `tickets` (Drizzle migration in
  `packages/db`). Scoped per board grouping (per `status` for Bug Kanban, per
  `phaseId` for Task board) — used only to render manual drag order, not a
  cross-column ranking.
- On drop, the moved ticket and any tickets shifted by the drop get their
  `position` updated via the same PATCH route (extend `ticketUpdateSchema` /
  route to accept `position`).

### 4. Permissions
- No new authorization rule. Drag-and-drop calls the same PATCH route already
  gated by `requireProjectMember` — any project member (owner or regular
  member) can drag, same as who can edit via the form today.

### 5. Library
- Add `@dnd-kit/core` + `@dnd-kit/sortable` (+ `@dnd-kit/utilities`) to
  `apps/web`. No existing drag-and-drop dependency to replace.

### 6. UX
- Optimistic UI: move the card locally immediately on drop, call the PATCH
  route in the background, and roll back to the previous position/column if
  the request fails (e.g. show a toast/error and revert).

## Out of scope

- Real-time sync of drag moves across multiple connected users (no WebSocket
  push — a second user must refresh to see another user's drag).
- Undo/redo history for drag moves.
- Bulk/multi-card drag selection.
- Custom drag animations beyond `@dnd-kit`'s defaults.
- Native mobile app support (web touch drag via `@dnd-kit` is included by the
  library default, but no separate mobile-specific design pass).
- Status-transition validation rules (all column-to-column moves stay
  unrestricted, matching current form behavior).

## Success criteria

- A bug card can be dragged between any two `BUG_STATUSES` columns on both
  the pre-production and production bug pages, and the change persists after
  a page reload.
- A task card can be dragged between phase columns on the Task board, and
  persists after reload; dropping into the last phase sets `status` to
  `done` and triggers existing parent-bug auto-resolve when applicable.
- Cards can be reordered within the same column and the order persists after
  reload.
- A failed PATCH request (e.g. network error) reverts the card to its prior
  position/column in the UI.
- `pnpm lint` and `pnpm build` pass with the new dependency and migration.

## Definition of done (from CLAUDE.md / repo conventions)

- [ ] Validation added to `@devflow/shared` (`ticketUpdateSchema`), not
      duplicated inline in the route handler.
- [ ] DB writes go through `@devflow/db`'s `schema.*` via Drizzle (migration
      generated with `pnpm db:generate`, applied with `pnpm db:migrate`).
- [ ] `pnpm lint` passes for `web` and `@devflow/shared`.
- [ ] `pnpm build` passes.
- [ ] Manual verification: drag-and-drop tested in the browser on both Bug
      Kanban pages and the Task board (no automated test suite exists in this
      repo yet).
