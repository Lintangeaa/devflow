# Bug Triage Workflow — Issues

See `PRD.md` for context, scope, and design decisions. Reopened — see the
PRD's changelog note. Everything below "Reopened" was already shipped and
verified in the first pass; new work is under "Reopened".

## Navigation restructure

- [x] `apps/web/src/components/layout/project-sidebar.tsx` — left sidebar with Overview/Board/Bugs/Ticket links, active-route highlighting.
- [x] `apps/web/src/app/projects/[id]/layout.tsx` — shared layout: `Header`, `ProjectSidebar`, project title/description, Members/Export buttons; wraps the 4 child routes.
- [x] `apps/web/src/app/projects/[id]/overview/page.tsx` — new route (content below).
- [x] `apps/web/src/app/projects/[id]/board/page.tsx` — move/adapt today's kanban content here, filtered to `type=task`.
- [x] `apps/web/src/app/projects/[id]/bugs/page.tsx` — new route using `BugKanban` filtered to non-production.
- [x] `apps/web/src/app/projects/[id]/ticket/page.tsx` — new route using `BugKanban` filtered to `environment="production"`.
- [x] `apps/web/src/app/projects/[id]/page.tsx` — replace with a redirect to `/projects/[id]/overview`.

## Bug ↔ task linking & auto-sync (backend)

- [x] `apps/web/src/app/api/projects/[id]/tickets/route.ts` (`POST`) — when creating a `type=task` ticket with a `parentId` pointing to a `type=bug` ticket whose status is `new`/`open`, update that bug's status to `in_progress`.
- [x] `apps/web/src/app/api/projects/[id]/tickets/[ticketId]/route.ts` (`PATCH`) — when a `type=task` ticket's status changes to `done` and it has a `parentId`, update the parent bug's status to `resolved` unless it's already `resolved`/`closed`.

## Bugs & Ticket kanban (frontend)

- [x] `apps/web/src/components/tickets/bug-kanban.tsx` — 5-column kanban (New/Open/In Progress/Resolved/Closed) parameterized by an environment filter prop; "+ Bug"/"+ Ticket" create button; bug card shows "Linked → task" badge when a linked task exists.
- [x] "Buat Task" action on a bug card — opens `CreateTicketForm` pre-locked to `type=task`, `parentId` set to that bug.
- [x] `apps/web/src/app/api/projects/[id]/tickets/route.ts` (`GET`) — confirm/extend the existing `type`/filter query params support an `environment` filter (add if missing) so `bugs`/`ticket` pages can query server-side rather than filtering client-side.

## Overview dashboard

- [x] `apps/web/src/app/api/projects/[id]/overview/route.ts` — `GET`, aggregate counts (tasks by `TASK_STATUSES`; bugs by `BUG_STATUSES` split pre-production/production) + flat list of `in_progress` tickets (any type).
- [x] `apps/web/src/app/projects/[id]/overview/page.tsx` — summary count cards, Recharts bar/donut charts per category, in-progress list opening `TicketDetailModal`.
- [x] Add `recharts` dependency to `apps/web/package.json`.

## Searchable dropdowns

- [x] `apps/web/src/components/ui/combobox.tsx` — new generic searchable dropdown (Radix `Popover` + `cmdk`), optional colored-swatch/`Badge` option rendering.
- [x] Add `cmdk` dependency to `apps/web/package.json`.
- [x] Replace priority/severity/phase/assignee `<select>`s in `CreateTicketForm` with `Combobox`.
- [x] Replace status/priority/severity/phase/assignee `<select>`s in `apps/web/src/components/tickets/ticket-detail-modal.tsx` with `Combobox`.

## Board task ↔ bug link display

- [x] `TicketCard` (Board) and `TicketDetailModal` — show a linked-bug indicator (headline + link) when a task's `parentId` points to a bug.

## Definition of done (original pass)

- [x] `pnpm lint` passes.
- [x] `pnpm build` passes.
- [x] Manual browser verification: create bug on Bugs → "Buat Task" → verify bug auto-moves to in_progress → mark task done → verify bug auto-moves to resolved (unless manually closed first) → create a Ticket (production) → confirm it's absent from Bugs and vice versa → check Overview counts/charts match → verify at least 2 Combobox fields (search + colored chip) work correctly → confirm `/projects/[id]` redirects to `/projects/[id]/overview`.
- [x] Code review pass (`reviewer` agent / `code-review-and-quality` skill) before considering this done.

## Reopened — structured bug description

- [x] `apps/web/src/components/tickets/structured-description.ts` (or similar) — template serialize/parse helpers: `serializeStructuredDescription({feature, devices, scenario, given, when, then, output}) -> string` and `parseStructuredDescription(description: string) -> fields | null` (null when the text doesn't match the template).
- [x] `apps/web/src/components/tickets/create-ticket-form.tsx` — for `type=bug`, replace the single description textarea with 7 required fields (Feature, Devices, Scenario, Given, When, Then, Output); serialize on submit into `description`.
- [x] `apps/web/src/components/tickets/ticket-detail-modal.tsx` — for `type=bug`, attempt to parse `description` into the 7 fields on load; render the structured editor if parsing succeeds, otherwise fall back to the existing plain textarea; serialize back into `description` on save (structured mode only).

## Reopened — Fase vs Status fix

- [x] `apps/web/src/components/tickets/create-ticket-form.tsx` — only render the "Fase" `Combobox` when `type === "task"`; omit it entirely for `type === "bug"` (don't send `phaseId` for bugs).
- [x] `apps/web/src/components/tickets/ticket-detail-modal.tsx` — only render the "Fase" `Combobox` when `ticket.type === "task"`; omit it for bugs (status already covers the bug's kanban position).

## Reopened — Combobox z-index fix

- [x] `apps/web/src/components/ui/combobox.tsx` — raise `Popover.Content`'s z-index above `Dialog.Content`'s (`TicketDetailModal`), so the searchable dropdown always renders on top when opened from inside the modal.

## Definition of done (reopened work)

- [x] `pnpm lint` passes.
- [x] `pnpm build` passes.
- [x] Manual browser verification: create a new bug with the 7 structured fields, confirm it saves and re-opens with fields pre-filled correctly; open a bug created before this change (or any ticket with a non-template description) and confirm it falls back to a plain textarea without data loss; confirm "Fase" is absent on bug create/edit forms and still present/working on task create/edit forms; open a Combobox from inside `TicketDetailModal` and confirm it renders fully visible above the modal.
- [x] Code review pass (`reviewer` agent / `code-review-and-quality` skill) before considering this done.
