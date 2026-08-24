# PRD — Ticket Identity Metadata (Creator, Dates)

## Context

The `tickets` table already has `creatorId`, `createdAt`, `updatedAt`, and
`resolvedAt` columns (`packages/db/src/schema.ts`), but none of this is
surfaced to users today:

- `ticket-detail-modal.tsx`'s `TicketWithMeta` type declares `createdAt`/
  `updatedAt` but never renders them; `creatorId`/`resolvedAt` aren't even in
  the type.
- Kanban/board cards (`bug-kanban.tsx`'s `BugCard`, `board/page.tsx`'s task
  card) show an assignee avatar+name but nothing about who created the
  ticket or when.
- The tickets list GET route (`api/projects/[id]/tickets/route.ts`) already
  `leftJoin`s `schema.user` to resolve `assigneeId` → `assigneeName`, but has
  no equivalent join for `creatorId` — it's returned as a raw id string.
- The `.xlsx` export already has `Created`/`Updated` columns (from raw
  `createdAt`/`updatedAt`) but no `Creator` or `Resolved` column.

## Problem / Motivation

Users can't currently see who created a ticket or track its resolution
timeline from the UI — this metadata exists in the database but is invisible
everywhere it would be useful (detail view, kanban cards, export).

## Scope

### 1. API — resolve `creatorId` to a display name
- `apps/web/src/app/api/projects/[id]/tickets/route.ts` (GET/list handler):
  add a second join against `schema.user` (aliased, e.g. `alias(schema.user,
  "creator")`) on `schema.tickets.creatorId`, selecting `creatorName` /
  `creatorImage` onto each row — mirroring the existing `assigneeName` join
  pattern exactly.
- Also select `resolvedAt` on this route if not already included in the
  returned row shape (confirm during implementation — it's a DB column but
  may not currently be in the `select`).

### 2. Detail modal (`ticket-detail-modal.tsx`)
- Extend `TicketWithMeta` to include `creatorId`, `creatorName`,
  `resolvedAt` (in addition to existing `createdAt`/`updatedAt`).
- Render a read-only metadata section (not editable — creator/dates are
  never user-settable after creation) showing:
  - Creator: avatar + name, resolved primarily from the `creatorName`
    returned by the list API; if the modal only has `creatorId` (e.g. from
    a stale prop), fall back to matching against the already-loaded
    `members` prop the same way `assigneeOptions` does today.
  - Created: formatted `createdAt` timestamp.
  - Last updated: formatted `updatedAt` timestamp.
  - Resolved: formatted `resolvedAt` timestamp, shown only when non-null
    (i.e. only for tickets that have actually reached a resolved/closed/done
    state).

### 3. Kanban cards
- `apps/web/src/components/tickets/bug-kanban.tsx` (`BugCard`) and
  `apps/web/src/app/projects/[id]/board/page.tsx` (task card): add a small
  avatar + creator name caption, positioned alongside the existing assignee
  avatar, using the same `Avatar` component and the `creatorName`/
  `creatorImage` fields added to the list API response.

### 4. Export (`api/projects/[id]/export/route.ts`)
- Add `Creator` column (from the same joined `creatorName` used in the API
  list route — extend this export route's existing query with the same
  aliased join).
- Add `Resolved` column (from `resolvedAt`, blank when null).

## Out of scope

- Audit trail / history of field changes (who changed what and when beyond
  creation/resolution) — only the existing single-timestamp columns are
  surfaced, no new change-log table.
- Filtering or sorting tickets by creator.
- Any change to who can set `creatorId` — it's set once at creation
  (`creatorId = requireUser().id` at insert time, unchanged) and never
  editable via PATCH.
- Bug description structuring (tracked separately in
  `docs/prd/todo/bug-structured-description/`) and kanban drag-and-drop
  (tracked separately in `docs/prd/todo/kanban-drag-drop/`).

## Success criteria

- Opening any ticket's detail modal shows creator name+avatar, created date,
  last-updated date, and (when applicable) resolved date.
- Kanban cards on both the Task board and Bug Kanban show a creator
  avatar+name alongside the existing assignee avatar.
- The `.xlsx` export includes populated `Creator` and `Resolved` columns.
- `pnpm lint` and `pnpm build` pass.

## Definition of done (from CLAUDE.md / repo conventions)

- [ ] DB reads go through `@devflow/db`'s `schema.*` via Drizzle joins, no
      raw SQL.
- [ ] `pnpm lint` passes for `web` and `@devflow/shared`.
- [ ] `pnpm build` passes.
- [ ] Manual verification: open a ticket detail modal, check a kanban card,
      and generate an `.xlsx` export to confirm creator/date fields render
      correctly (no automated test suite exists in this repo yet).
