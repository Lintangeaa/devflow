# PRD — In-App Notifications (WebSocket)

## Context

No notification infrastructure exists anywhere in this repo today —
confirmed via a full grep for "notification"/"notify"/"bell" across
`apps/web/src` and `packages`: zero matches. There's no `notifications`
table (current tables: `projects`, `phases`, `projectMembers`, `tickets`,
`comments`, `media`, `activities`, plus better-auth's `user`/`session`/
`account`/`verification`), no bell icon component, and no WebSocket/SSE
infra. This is fully greenfield work.

Devflow is deployed as a Next.js **standalone** build run directly with
`docker run --network host` behind nginx (per `CLAUDE.md`) — i.e. a single
long-running Node process, not a serverless/edge deployment. This makes a
real WebSocket server feasible without an external pub/sub service, as long
as the app continues to run as a single instance (no horizontal scaling
across multiple containers without additional pub/sub — see Out of Scope).

## Problem / Motivation

Users have no way to know they've been assigned a ticket or that a
ticket they care about changed status (e.g. a bug reached
`ready_for_qa`, once `docs/prd/todo/bug-status-qa-workflow/` lands)
without manually checking every board.

## Scope

### 1. Database
- New `notifications` table (`packages/db/src/schema.ts`):
  - `id` (uuid, pk)
  - `userId` (text, recipient, -> better-auth `user.id`)
  - `type` (text, e.g. `"assigned"` | `"status_changed"`)
  - `ticketId` (uuid, references `tickets.id`, `onDelete: "cascade"`)
  - `projectId` (uuid, references `projects.id`, `onDelete: "cascade"`, for
    building the navigation link without an extra join)
  - `message` (text, precomputed human-readable string, e.g. "Kamu
    di-assign ke bug: Login gagal di Safari")
  - `read` (boolean, default `false`)
  - `createdAt` (timestamp)
- Drizzle migration via `pnpm db:generate` / `pnpm db:migrate`.

### 2. Triggers (server-side, on the existing PATCH route)
In `apps/web/src/app/api/projects/[id]/tickets/[ticketId]/route.ts`:
- **Assigned**: when `assigneeId` changes to a non-null value different
  from the previous one, insert a notification for the new assignee.
- **Status changed**: when `status` changes (including via the existing
  task→bug auto-sync path), insert a notification for both the ticket's
  `assigneeId` and `creatorId` (dedupe if they're the same user, and don't
  notify the user who made the change about their own action).
- Insert happens in the same request/transaction as the ticket update.

### 3. Delivery — custom server + WebSocket
- Replace the standalone Next.js entry point with a custom `server.ts` that
  wraps the Next.js request handler and attaches a `ws`-based WebSocket
  server on a distinct path (e.g. `/ws/notifications`).
- On WebSocket connect, authenticate the connection using the existing
  better-auth session (read the session cookie during the HTTP upgrade
  request) and register the socket against that `userId` in an in-memory
  `Map<userId, Set<WebSocket>>`.
- When a notification is inserted (step 2), broadcast a small payload
  (`{ id, type, ticketId, projectId, message, createdAt }`) to all open
  sockets for the target `userId`, if any are connected.
- The client uses the WebSocket message purely as a "refetch" trigger — on
  receiving a message, the client calls the notifications list API to get
  the authoritative current state (avoids divergence between the socket
  payload and DB state, and handles reconnect/missed-message gaps
  gracefully).
- Client reconnect logic: on WebSocket close/error, retry with backoff; on
  reconnect, immediately refetch the notification list to catch anything
  missed while disconnected.
- Dockerfile / start script: update to run the custom server instead of
  the default `next start` in the standalone output.
- Nginx config: needs `Upgrade`/`Connection` headers proxied for the `/ws/`
  location block to support the WebSocket handshake (call out as a
  deployment note; actual nginx config file may be outside this repo).

### 4. API routes
- `GET /api/notifications` — list the current user's notifications
  (paginated or capped, e.g. latest 50), most recent first.
- `PATCH /api/notifications/[id]` — mark one notification as read.
- `PATCH /api/notifications/read-all` — mark all of the current user's
  notifications as read.
- All routes gated by `requireUser()` (no project-level check needed since
  notifications are already scoped to `userId` at the row level).

### 5. UI
- A bell icon in `apps/web/src/components/layout/header.tsx`, with an
  unread-count badge (from an initial fetch + WebSocket-triggered
  refetches).
- Clicking the bell opens a dropdown listing recent notifications
  (message + relative time), unread ones visually distinguished.
- Clicking an individual notification: marks it read (`PATCH`) and
  navigates to the relevant ticket (project + ticket id encoded in the
  notification row) — opening the ticket detail the same way clicking a
  kanban card does today.

## Out of scope

- Horizontal scaling / multi-instance WebSocket fan-out (e.g. Redis pub/sub
  bridging multiple app instances) — this design assumes a single running
  Node process, matching the current deployment.
- Email/push/SMS notification channels — in-app only.
- Notification preferences/settings (muting certain types, per-project
  opt-out).
- Notifying on comments or other activity types beyond assignment and
  status change (can be added later using the same table/trigger pattern).
- Any change to the `activities` table (if it already logs similar events,
  it stays a separate audit log — not reused for notification delivery).

## Success criteria

- Assigning a user to a ticket creates a notification row and (if they're
  connected) pushes a live update via WebSocket.
- Changing a ticket's status notifies its assignee and creator (excluding
  the actor).
- The bell icon shows an accurate unread count and updates live while the
  app is open.
- Clicking a notification marks it read and navigates to the ticket.
- The app still builds and runs correctly as a Docker standalone deployment
  with the custom server.
- `pnpm lint` and `pnpm build` pass.

## Definition of done (from CLAUDE.md / repo conventions)

- [ ] Validation lives in `@devflow/shared` where applicable (e.g. a
      notification-list query param schema, if needed).
- [ ] DB writes go through `@devflow/db`'s `schema.*` via Drizzle.
- [ ] `pnpm lint` passes for `web`.
- [ ] `pnpm build` passes, including the custom server entry point.
- [ ] Manual verification: assign a ticket to another logged-in session,
      confirm a live notification appears without a page reload; change a
      ticket's status and confirm the assignee/creator get notified; verify
      the Docker standalone build still starts correctly with the custom
      server (no automated test suite exists in this repo yet).
