# PRD — Overview Ticket Card Enrichment

## Context

The project overview page (`apps/web/src/app/projects/[id]/overview/page.tsx`,
cards rendered lines ~310–360, data from
`apps/web/src/app/api/projects/[id]/overview/route.ts`) shows a lighter card
than the Bug Kanban's `BugCard`
(`apps/web/src/components/tickets/bug-kanban.tsx`, lines 421–504):

- Overview card today: type/priority/severity/environment badges, headline,
  parent-bug link (if the ticket is a task with a `parentId`), assignee
  avatar+name, phase badge.
- `BugCard` additionally shows: **creator** avatar+name, a **linked-task
  badge** ("Linked → {task}") for bugs that already have a child task, and
  a "Buat Task" quick-action button when no linked task exists yet.

This gap exists because `overview/route.ts`'s query only joins
`schema.user` for `assigneeName` and joins a `parentTicket` alias for
parent-bug info (lines ~17–48) — it does not join a `creatorUser` alias or
compute a `childTaskMap`, both of which
`apps/web/src/app/api/projects/[id]/tickets/route.ts` already does (lines
~64–105) for the Bug Kanban/board views.

Separately, bug tickets are gaining a structured `bugDetails` JSON field
(see `docs/prd/todo/bug-structured-description/`, 7 fields: feature,
devices, scenario, given, when, then, output) — once that lands, overview
cards should surface a short preview of it.

## Problem / Motivation

Overview is meant to give a project lead a fast at-a-glance read of ticket
activity, but today it's missing who created each ticket, whether a bug
already has a task in progress against it, and any hint of what the bug
actually is beyond its headline — all of which are already visible on the
Bug Kanban and require opening the detail modal to see here.

## Scope

### 1. API — `apps/web/src/app/api/projects/[id]/tickets/[id]/overview/route.ts`
(actual path: `apps/web/src/app/api/projects/[id]/overview/route.ts`)
- Add a `creatorUser` aliased join against `schema.user` on
  `schema.tickets.creatorId`, selecting `creatorName`/`creatorImage` —
  mirror the exact pattern already used in `tickets/route.ts`.
- Add the same `childTaskMap`/linked-task computation used in
  `tickets/route.ts` (~lines 64, 104–105) so each bug row can carry
  `linkedTaskId`/`linkedTaskHeadline` when a child task exists.
- Include `bugDetails` (or a truncated derived preview field, e.g. the
  `scenario` sub-field) in the row selection for bug tickets, once the
  `bug_details` column exists (depends on
  `docs/prd/todo/bug-structured-description/`).

### 2. UI — overview card component
- Add creator avatar+name (mirroring `BugCard`'s creator display) next to
  the existing assignee.
- Add the "Linked → {task}" badge when `linkedTaskHeadline` is present, and
  the "Buat Task" quick-action button when a bug has no linked task —
  reuse the existing logic/markup from `BugCard` rather than reimplementing
  it.
- Add a short one-line preview of `bugDetails.scenario` (or `.feature` if
  `scenario` is empty) under the headline for bug tickets that have
  structured details populated; omit the preview line entirely when
  `bugDetails` is null.

## Out of scope

- Any change to the Bug Kanban or Task board cards themselves — they
  already show this information.
- Full structured-field editing from the overview page — preview is
  read-only; edits still happen via `TicketDetailModal`.
- This PRD assumes `docs/prd/todo/bug-structured-description/` has been
  implemented for the `bugDetails` preview part specifically; the
  creator/linked-task parts don't depend on it and can ship independently.

## Success criteria

- Overview cards show creator avatar+name alongside assignee.
- Bug cards on overview show a linked-task badge or "Buat Task" button,
  matching Bug Kanban's behavior.
- Bug cards with populated `bugDetails` show a one-line scenario/feature
  preview.
- `pnpm lint` and `pnpm build` pass.

## Definition of done (from CLAUDE.md / repo conventions)

- [ ] DB reads go through `@devflow/db`'s `schema.*` via Drizzle joins.
- [ ] `pnpm lint` passes for `web`.
- [ ] `pnpm build` passes.
- [ ] Manual verification: open the overview page, confirm creator, linked-
      task badge, and structured-field preview all render correctly for a
      bug ticket with a linked task and populated `bugDetails` (no
      automated test suite exists in this repo yet).
