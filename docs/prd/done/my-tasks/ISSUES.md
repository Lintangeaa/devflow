# ISSUES — My Tasks Personal Workspace & Dashboard

See `PRD.md` for full context and architecture specifications.

## 1. Backend Route (`apps/api`)

- [x] Create `apps/api/src/routes/my-tasks.ts`:
  - Require authentication (`requireAuth`).
  - Query projects where the authenticated user is a member.
  - Implement filtering by `view` (`assigned` | `reported` | `mentioned`).
  - Implement query filters for `projectId`, `type` (`task` | `bug`), `priority`, and `search`.
  - Calculate summary metrics (`totalInProgress`, `totalTodo`, `totalDueSoon`, `totalResolved`).
  - Return tickets joined with `projectName`, `projectSlug`, `phaseName`, `assigneeName`, and `creatorName`.
- [x] Mount `myTasksRouter` at `/api/my-tasks` in `apps/api/src/index.ts`.

## 2. Frontend Components (`apps/web`)

- [x] Create `apps/web/src/components/my-tasks/my-tasks-metrics.tsx`:
  - 4 stats cards: In Progress, Todo / Open, Due Soon / Overdue, Resolved / Done.
- [x] Create `apps/web/src/components/my-tasks/my-tasks-filter-bar.tsx`:
  - Search input with debounce.
  - Project selector dropdown.
  - Type toggle (All, Task, Bug).
  - Priority filter.
- [x] Create `apps/web/src/components/my-tasks/my-tasks-list.tsx`:
  - Grouped status sections (In Progress, Todo / Open, Ready for QA, Done).
  - Ticket item card with project badge, ticket type, priority, due date, comments count, and click action.
  - Empty state when no tickets match filter.
- [x] Build `apps/web/src/app/my-tasks/page.tsx`:
  - Wrapped in `AppShell`.
  - Tab navigation (Assigned to Me, Reported by Me, Mentions).
  - Integrates `TicketDetailModal` for viewing and modifying tickets in-place.

## 3. Verification & Quality (definition of done)

- [x] Verify `GET /api/my-tasks` returns accurate tickets across multiple projects.
- [x] Test switching between Assigned to Me, Reported by Me, and Mentions tabs.
- [x] Test filtering by project, type, and priority.
- [x] Test opening `TicketDetailModal` from My Tasks, updating status/comments, and verifying optimistic/live reload.
- [x] `pnpm lint` passes with 0 errors.
- [x] `pnpm build` passes with 0 errors.
- [x] Code review pass (per repo's `code-review-and-quality` skill).
