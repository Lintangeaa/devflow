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

## 6. Deployment Blockers — Production Hono Split

Status: **OPEN — production deployment paused.** Production `devflow_db`, `devflow_minio`, and the current `devflow_web` container have not been removed or recreated.

### 6.1 API image runtime permission and workspace dependency links

- [x] API image initially failed with `EACCES: permission denied, open '/app/package.json'` because source files were copied as `600` and the runtime user was `apijs`.
- [x] API image initially lacked workspace `node_modules` links; runtime failed with `ERR_MODULE_NOT_FOUND: Cannot find package 'dotenv'`.
- [x] Added `chown -R apijs:nodejs /app` in `Dockerfile.api`.
- [x] Copied workspace dependency links from the `deps` stage into the API builder.
- [ ] Re-run the API canary after the latest image rebuild and confirm Hono starts successfully.

### 6.2 API runtime must not mutate dependencies

- [x] `pnpm --filter api start` attempted to run `pnpm install` during container startup because the image dependency state was considered out of sync.
- [x] Changed the API image command to invoke the bundled `tsx` executable directly.
- [ ] Confirm the direct `tsx` entrypoint remains valid after the final lockfile/image rebuild.

### 6.3 Frontend API rewrite must target the API container

- [x] Added `API_INTERNAL_URL` as a Docker build argument so the Next.js rewrite is not baked to `127.0.0.1:4000`.
- [ ] Build the production web image with `API_INTERNAL_URL=http://devflow_api:4000`.
- [ ] Verify `/api/health`, auth, projects, tickets, media, export, and notifications through the web proxy.

### 6.4 Nginx WebSocket routing

- [ ] Add/verify an Nginx location for `/ws/notifications` that proxies to Hono on port `4000` with HTTP/1.1 Upgrade headers.
- [ ] Verify the public authenticated WebSocket handshake and the `{"type":"connected"}` message.
- [ ] Do not route `/ws/notifications` to the Next.js frontend; the custom Next server was removed.

### 6.5 Production environment and network

- [ ] Run `devflow_api` on `devflow_default` with the captured production values for `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `S3_*`, and public app URL.
- [ ] Run `devflow_web` on the same network with the API alias `devflow_api`.
- [ ] Never use the dummy secrets from the committed `docker-compose.yml` for production.
- [ ] Preserve the existing `devflow_devflow_db_data` and `devflow_devflow_minio_data` volumes.

### 6.6 Required final verification

- [ ] API health returns `db: true`.
- [ ] Login/session cookie works across web → Hono API.
- [ ] Authenticated project, ticket, comment, notification, media, and export flows work.
- [ ] Authenticated WebSocket works through Nginx.
- [ ] Existing production DB and MinIO containers remain healthy after the web/API swap.
- [ ] Rollback images and captured env/config remain available.
