# Bug Triage Workflow: Overview, Board, Bugs, Ticket + Searchable Dropdowns

## Context

Today a project has a single page (`/projects/[id]`) mixing task and bug
tickets in the same phase-column kanban, with no triage flow from
"a bug was reported" to "a task is being worked on to fix it", no
distinction between pre-production bugs and production incidents, no
monitoring view, and every dropdown (priority, severity, status, phase,
assignee) is a plain native `<select>`. `tickets.parentId` (self-reference)
and `tickets.environment` (free text) already exist in the schema and are
already accepted by the create/update API, but nothing in the UI sets or
uses either of them.

This PRD builds on `docs/prd/done/collaborators-and-attachments/` (members,
assignee, `TicketDetailModal`, media) and `docs/prd/done/ui-redesign/`
(`Badge`, `Avatar`, design tokens) — all reused here, not replaced.

## Problem / Motivation

There's no workflow for "QA finds a bug → a dev task gets created to fix
it → the bug's status reflects that automatically", no separation between
bugs found before release and incidents found in production, no place to
see what's currently in progress across both, and picking priority/
severity/status/phase/assignee from a long native `<select>` is clunky.

## Scope

### Navigation restructure

1. **New `components/layout/project-sidebar.tsx`** — a project-scoped left
   sidebar (visible on all `/projects/[id]/*` routes) with 4 links, in this
   order: **Overview**, **Board**, **Bugs**, **Ticket**. Replaces the
   current single `/projects/[id]/page.tsx` with 4 route files:
   - `apps/web/src/app/projects/[id]/overview/page.tsx`
   - `apps/web/src/app/projects/[id]/board/page.tsx` (today's kanban, task-only)
   - `apps/web/src/app/projects/[id]/bugs/page.tsx`
   - `apps/web/src/app/projects/[id]/ticket/page.tsx`
   - `/projects/[id]` itself redirects to `/projects/[id]/overview`.
   Shared page chrome (project title/description, Members/Export buttons)
   moves into a shared layout (`apps/web/src/app/projects/[id]/layout.tsx`)
   wrapping all 4 routes, so it isn't duplicated per page.

### Board (task-only)

2. Ticket fetch on Board filters to `type=task` (server-side query param,
   already supported by `api/projects/[id]/tickets?type=task`). Everything
   else (phase columns, `CreateTicketForm`, `TicketDetailModal`) stays as
   today, plus: a linked-bug indicator on a task's card/detail if its
   `parentId` points to a bug (shows the bug's headline, links to it).

### Bugs & Ticket (bug triage kanban)

3. **`components/tickets/bug-kanban.tsx`** — shared component used by both
   `bugs/page.tsx` and `ticket/page.tsx` (parameterized by an
   `environment` filter: `bugs` = `environment` is not `"production"`,
   `ticket` = `environment === "production"`). 5 columns matching the
   existing `bug_status` enum (New/Open/In Progress/Resolved/Closed).
   "+ Bug" / "+ Ticket" button creates a `type=bug` ticket with
   `environment` pre-set accordingly (`"production"` on the Ticket page,
   left as-is/empty on Bugs).
4. Each bug card gets a **"Buat Task"** action, opening `CreateTicketForm`
   pre-locked to `type=task` with `parentId` set to that bug's id. A bug
   that already has at least one linked task shows a "Linked → <task
   headline>" badge with a link to open that task's detail modal.

### Bug ↔ task status auto-sync

5. **`api/projects/[id]/tickets/route.ts` (`POST`)** — when a new ticket is
   created with `type=task` and a non-null `parentId`, look up the parent;
   if it's a `type=bug` ticket whose status is `new` or `open`, update its
   status to `in_progress` in the same request (best-effort, not a
   transaction requirement beyond what the existing single-insert pattern
   already gives).
6. **`api/projects/[id]/tickets/[ticketId]/route.ts` (`PATCH`)** — when a
   ticket's `status` is updated to `done` (task) and it has a `parentId`,
   look up the parent bug; if its status is not already `resolved` or
   `closed` (never override a manual terminal state), update it to
   `resolved`.

### Overview (monitoring dashboard)

7. **`api/projects/[id]/overview/route.ts`** — `GET`, returns aggregate
   counts: tasks by `TASK_STATUSES`, bugs by `BUG_STATUSES` split into
   pre-production (`environment != "production"`) and production
   (`environment == "production"`), plus a flat list of all tickets
   currently `in_progress` (any type) with enough fields to render a
   `TicketCard`.
8. **`apps/web/src/app/projects/[id]/overview/page.tsx`** — summary cards
   (counts) + Recharts bar/donut charts (bug-status distribution for Bugs,
   separately for Ticket, and task-status distribution for Board) + a list
   of in-progress items (click → `TicketDetailModal`). Snapshot only, no
   time-series/trend data.

### Searchable dropdowns

9. **`components/ui/combobox.tsx`** — new generic searchable dropdown
   (Radix `Popover` + `cmdk`), supporting an optional per-option color
   swatch/`Badge` render (used for priority/severity/status/type). Replaces
   every native `<select>` for priority/severity/status/phase/assignee in
   `CreateTicketForm` (on Board/Bugs/Ticket) and `TicketDetailModal`.
10. Add `cmdk` as a new dependency (`apps/web/package.json`).

## Design decisions

- **`environment === "production"` distinguishes Ticket from Bugs, not a
  new ticket type/table** — the column already exists and is already
  accepted by the API; no schema migration needed.
- **Bug↔task linking reuses `tickets.parentId`** — already a
  self-referencing FK with `onDelete: "set null"`, already accepted by
  both create and update schemas; no schema migration needed.
- **Status auto-sync is one-directional per transition, never overrides a
  manual terminal state** — creating a task moves its parent bug forward
  (new/open → in_progress); completing that task resolves the bug, but
  only if the bug hasn't already been manually set to resolved/closed.
  This keeps the sync helpful without fighting a human who already closed
  the bug for a different reason.
- **5-column bug kanban matches the existing `bug_status` enum exactly**
  (not a simplified 3-column grouping) — avoids inventing a UI-only status
  mapping that would drift from what the backend actually validates.
- **Bugs and Ticket share one `BugKanban` component, parameterized by
  environment** — same columns, same card shape, same "Buat Task" action;
  only the create-time default and the filter differ.
- **Recharts for charts** — snapshot bar/donut only, no new time-series
  aggregation query.
- **`cmdk` + Radix `Popover` for the searchable dropdown** — Radix is
  already a dependency family in this repo (`react-dialog`,
  `react-dropdown-menu`), `cmdk` is the standard accessible
  command/combobox primitive that pairs with it.
- **Shared project layout for chrome** — Members/Export/project
  title move to `apps/web/src/app/projects/[id]/layout.tsx` so the 4 route
  pages don't each re-fetch/re-render the same header.

## Out of scope

- Notifications when a bug auto-transitions status.
- Time-series/trend charts (only current-state distribution snapshots).
- Any change to Members/Export functionality itself (only where they live in the DOM, per the shared layout).
- A generic "all tickets across all projects" cross-project dashboard — Overview is per-project.
- Editing `environment` free-text for arbitrary values beyond the Bugs/Ticket split (still a plain text field on the ticket, just defaulted by which page created it).

## Success criteria

- Visiting `/projects/[id]` redirects to `/projects/[id]/overview`; the sidebar shows Overview/Board/Bugs/Ticket and each route renders independently (refresh/bookmark/back-forward all work).
- Board only shows tasks; a task created via "Buat Task" from a bug shows a link back to that bug, and the bug shows a "Linked" badge back to the task.
- Creating a task from a bug moves that bug to `in_progress`; setting that task's status to `done` moves the bug to `resolved` (unless it was already manually `resolved`/`closed`).
- Bugs page shows only non-production bugs in a 5-column kanban; Ticket page shows only `environment="production"` bugs in the same kanban shape; creating from each page sets the right default `environment`.
- Overview shows correct aggregate counts and at least one chart per category (bug/ticket/task status distribution), plus a working in-progress list that opens `TicketDetailModal`.
- Every priority/severity/status/phase/assignee field across all create/edit forms is a searchable `Combobox` with colored chips, not a native `<select>`.
- `pnpm lint` and `pnpm build` pass.
- Manual browser verification of the full flow: create a bug on Bugs → "Buat Task" → verify bug moved to in_progress → mark task done → verify bug moved to resolved → create a Ticket (production) → verify it does NOT appear on Bugs page and vice versa → check Overview counts/charts reflect the above → verify Combobox search/chip rendering on at least 2 of the replaced fields.
