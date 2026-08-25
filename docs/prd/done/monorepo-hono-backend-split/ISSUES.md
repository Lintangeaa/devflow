# ISSUES — Monorepo Hono Backend Split

See `PRD.md` for full context and architecture decisions.

## 1. Setup `apps/api` Workspace

- [x] Create `apps/api/package.json` with Hono, `@hono/node-server`, `ws`, `@devflow/db`, `@devflow/shared`, `better-auth`, `exceljs`, `@aws-sdk/client-s3`.
- [x] Create `apps/api/tsconfig.json` extending root configuration.
- [x] Create `apps/api/src/index.ts` with Hono app, HTTP server, and native WebSocket server attached to `/ws/notifications`.
- [x] Port `src/lib/auth.ts`, `src/lib/access.ts`, `src/lib/s3.ts`, and `src/lib/notifications.ts` into `apps/api`.

## 2. Port API Routes to Hono

- [x] Auth route (`/api/auth/*`) mounted to better-auth handler.
- [x] Healthcheck route (`/api/health`).
- [x] Projects routes:
  - List & create projects (`/api/projects`).
  - Project detail, overview metrics, and members (`/api/projects/:id`, `/api/projects/:id/members`, `/api/projects/:id/overview`, `/api/projects/:id/phases`).
  - Project Excel export (`/api/projects/:id/export`).
- [x] Tickets routes:
  - List & create tickets (`/api/projects/:id/tickets`).
  - Ticket detail, update, delete (`/api/projects/:id/tickets/:ticketId`).
  - Comments list, create with mentions, delete (`/api/projects/:id/tickets/:ticketId/comments`).
  - Media upload & Range 206 streaming proxy (`/api/projects/:id/tickets/:ticketId/media`).
- [x] Notifications routes (`/api/notifications`, `/api/notifications/:id`, `/api/notifications/read-all`).
- [x] Users search route (`/api/users/search`).

## 3. Clean up `apps/web` & Configure Proxies

- [x] Update `apps/web/next.config.ts` to rewrite `/api/:path*` to `http://localhost:4000/api/:path*`.
- [x] Remove `apps/web/server.js` and dependencies only needed for custom server.
- [x] Remove `apps/web/src/app/api/` route handlers.
- [x] Ensure `apps/web` client components & SSR fetch properly via rewrites / proxy.

## 4. Docker & Turborepo Orchestration

- [x] Update `turbo.json` with `api` task definitions.
- [x] Create `apps/api/Dockerfile` for backend container.
- [x] Update `apps/web/Dockerfile` to standard Next.js standalone container.
- [x] Update `docker-compose.yml` to include both `api` and `web` services.
- [x] Update `AGENTS.md` and documentation with new commands.

## 5. Verification (definition of done)

- [x] `pnpm lint` passes across all packages (`@devflow/db`, `@devflow/shared`, `web`, `api`).
- [x] `pnpm build` passes across all packages.
- [x] Local dev sanity check: test login, projects, board, bugs, comments, attachments, notifications, and export.
- [x] Code review pass (per repo's `code-review-and-quality` skill).
