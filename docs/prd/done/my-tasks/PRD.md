# PRD — My Tasks Personal Workspace & Dashboard

## Context

In Devflow, users previously had to navigate into each individual project to find what tasks or bugs were assigned to them, reported by them, or where they were mentioned. This created fragmented workflows for developers, QA engineers, and project leads managing work across multiple projects.

The **My Tasks (`/my-tasks`)** feature provides a unified, cross-project personal workspace where every user can track, filter, and manage their assigned tasks and reported bugs from a single dashboard.

## Goals & Decisions

1. **Dedicated Personal Hub (`/my-tasks`)**:
   - Centralized view aggregating tasks and bugs across all projects where the authenticated user is a member.
   - 3 primary tabs:
     - 📌 **Assigned to Me**: Tasks & bugs assigned to the current user.
     - 📝 **Reported by Me**: Tasks & bugs created/reported by the current user.
     - 💬 **Mentions**: Tickets where the current user was @mentioned in comments.

2. **Top Metric Summary Cards**:
   - ⏳ **In Progress**: Active workload count.
   - 📋 **Todo / Open**: Queue of upcoming work.
   - ⏰ **Due Soon / Overdue**: Tasks approaching deadline or past due date.
   - ✅ **Resolved / Done**: Recently completed tasks & bugs.

3. **Grouped Status Sections & Quick Filters**:
   - Structured accordion/collapsible sections grouped by status:
     - In Progress
     - Todo / Open
     - Ready for QA
     - Done / Resolved
   - Filter bar:
     - Search input (by title or ID).
     - Project filter dropdown (All Projects vs specific project).
     - Type filter (All, Tasks Only, Bugs Only).
     - Priority filter (All, Low, Medium, High, Critical).

4. **Direct In-Place Interaction**:
   - Clicking any ticket card immediately opens `TicketDetailModal` with full capabilities (update status, reply to comments with @mentions, upload media) without leaving the `/my-tasks` page.
   - Provides a "Buka di Project Board" link to jump directly into the project's Kanban board.

5. **Backend API (`apps/api`)**:
   - Endpoint `GET /api/my-tasks`:
     - Query parameters: `view` (`assigned` | `reported` | `mentioned`), `projectId`, `type`, `priority`, `search`.
     - Validates user session and restricts query to projects the user is a member of.
     - Returns tickets joined with project details (`name`, `slug`), phase name, creator info, and computed metrics.

## Out of Scope

- Offline caching.
- Bulk multi-ticket status changes in a single action (individual modal updates used).

## Definition of Done

- [ ] Backend route `GET /api/my-tasks` implemented in `apps/api/src/routes/my-tasks.ts` and mounted in Hono app.
- [ ] Frontend page `apps/web/src/app/my-tasks/page.tsx` built with metrics cards, 3 tabs, filter toolbar, grouped status sections, and ticket cards with project badges.
- [ ] Integration with `TicketDetailModal` allowing in-place status updates, commenting, and attachments directly from My Tasks.
- [ ] `pnpm lint` passes with 0 errors across all packages.
- [ ] `pnpm build` passes with 0 errors across all packages.
- [ ] Code review pass (per repo's `code-review-and-quality` skill).
