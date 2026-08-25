# ISSUES — In-App Notifications (WebSocket)

See `PRD.md` for full context and scope decisions.

## 1. Database

- [x] Add `notifications` table to `packages/db/src/schema.ts`: `id`,
      `userId`, `type`, `ticketId`, `projectId`, `message`, `read`
      (default false), `createdAt`.
- [x] Generate migration: `pnpm db:generate`.
- [x] Apply migration locally: `pnpm db:migrate`.

## 2. Trigger logic

- [x] `apps/web/src/app/api/projects/[id]/tickets/[ticketId]/route.ts`
      (PATCH): when `assigneeId` changes to a new non-null value, insert an
      `"assigned"` notification for the new assignee.
- [x] Same route: when `status` changes (direct edit or via the task→bug
      auto-sync), insert a `"status_changed"` notification for
      `assigneeId` and `creatorId`, deduped, excluding the acting user.
- [x] Extract a small shared helper (e.g. `lib/notifications.ts`) for
      inserting + broadcasting a notification, since it's called from
      multiple trigger points.

## 3. Custom server + WebSocket

- [x] Add a `server.ts` (or similar) at the repo/app root that wraps the
      Next.js request handler and attaches a `ws` WebSocket server on
      `/ws/notifications`.
- [x] Add `ws` as a dependency of `apps/web`.
- [x] Implement connection auth: read the better-auth session cookie during
      the HTTP upgrade request, reject unauthenticated upgrades, register
      authenticated sockets in an in-memory `Map<userId, Set<WebSocket>>`.
- [x] Implement broadcast: when a notification is inserted, send it to all
      sockets registered for the target `userId`.
- [x] Update `package.json` scripts / Dockerfile CMD to run the custom
      server instead of default `next start` for the standalone build.
- [x] Document the nginx `Upgrade`/`Connection` header requirement for the
      `/ws/` location block (deployment note, even if the nginx config
      itself lives outside this repo).

## 4. API routes

- [x] `GET /api/notifications` — list current user's notifications
      (latest 50, most recent first), gated by `requireUser()`.
- [x] `PATCH /api/notifications/[id]` — mark one notification read.
- [x] `PATCH /api/notifications/read-all` — mark all read for current user.

## 5. Client

- [x] WebSocket client hook/module: connects to `/ws/notifications` on
      mount, reconnects with backoff on close/error, refetches the
      notification list on connect/reconnect and on any received message.
- [x] Bell icon component in `apps/web/src/components/layout/header.tsx`
      with unread-count badge.
- [x] Dropdown listing recent notifications (message, relative time,
      unread visually distinguished).
- [x] Click handler: `PATCH` mark-as-read, then navigate to the relevant
      ticket (project + ticket id from the notification row).

## 6. Verification (definition of done)

- [x] `pnpm --filter web lint` passes.
- [x] `pnpm build` passes (including the custom server entry point).
- [x] Manual check: open two logged-in sessions (different users), assign
      one user to a ticket from the other's session, confirm the assignee's
      session gets a live bell update without reloading.
- [x] Manual check: change a ticket's status, confirm assignee/creator
      (excluding the actor) are notified.
- [x] Manual check: click a notification, confirm it's marked read and
      navigates to the correct ticket.
- [x] Manual check: `docker build` + `docker run` the standalone image,
      confirm the app starts correctly with the custom server and
      WebSocket upgrade works through the deployed nginx config.
- [x] Code review pass (per repo's `code-review-and-quality` skill).
