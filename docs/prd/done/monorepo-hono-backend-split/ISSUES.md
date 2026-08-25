# ISSUES — Monorepo Hono Backend Split

See `PRD.md` for full context and architecture decisions.

> **Changelog (2026-08-25)**: Added section 7 — local Docker Compose
> full-stack run + `infra` profile exclusion for `devflow-db`/`devflow-minio`.
> Section 6 (production) untouched, still open.

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
- [x] Fixed root cause found in section 7: `turbo.json`'s `build` task
      didn't declare `API_INTERNAL_URL` in its `env` allowlist, so Turbo's
      strict env mode stripped the ARG before `next build` ever saw it —
      the rewrite was baking to `127.0.0.1:4000` regardless of the build
      arg. See section 7.2.
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

## 7. Local Docker Compose Full-Stack Run & Infra Profile Exclusion

Runs on this machine only. Does not touch Nginx, CI/CD, or the production
swap tracked in section 6.

### 7.1 Compose profile for `devflow-db` / `devflow-minio`

- [x] Add `profiles: ["infra"]` to the `devflow-db` service in `docker-compose.yml`.
- [x] Add `profiles: ["infra"]` to the `devflow-minio` service in `docker-compose.yml`.
- [x] Change `devflow-api`'s `depends_on` entries for `devflow-db` and
      `devflow-minio` to `required: false` so Compose doesn't refuse to
      start when the `infra` profile is inactive. (Also added
      `devflow-web`'s `depends_on: devflow-db` as `required: false` — same
      reasoning, `devflow-web` also reads `DATABASE_URL`.)
- [x] Add `.env.example` entry documenting `COMPOSE_PROFILES=infra` as the
      default for local full-stack runs.
- [x] Add a root `.env` (git-ignored, confirmed covered by `.gitignore`)
      with `COMPOSE_PROFILES=infra` so plain `docker compose up` keeps
      starting all four services by default.
- [x] Document in `AGENTS.md` / `README` (whichever already documents
      `docker compose` usage) how to run without `infra`
      (`COMPOSE_PROFILES= docker compose up` or omitting `.env`) for a host
      that already has its own Postgres/MinIO.

### 7.2 Local full-stack verification (definition of done)

- [x] Added a healthcheck to `devflow-minio`
      (`curl -f http://localhost:9000/minio/health/live`) and changed
      `devflow-minio-init`'s dependency condition from `service_started` to
      `service_healthy` — MinIO reports its container as started before it
      actually accepts connections, so `devflow-minio-init` raced it and
      failed with `connection refused` on a fresh `docker compose up` (not
      in the original checklist — discovered on a clean re-run while
      restoring the stack to its normal state after verification).
- [x] Fixed `devflow-api`/`devflow-web`'s `DATABASE_URL`/`S3_*`/auth env
      values in `docker-compose.yml` being hardcoded to the
      `devflow-db`/`devflow-minio` container hostnames regardless of the
      `infra` profile — excluding the profile left `devflow-api` still
      trying to resolve a hostname that no longer exists, defeating the
      whole point of section 7.1. Changed them to
      `${COMPOSE_VAR:-default-pointing-at-devflow-db/minio}` so a host without
      the `infra` profile supplies its own values via env/`.env` to point
      at its existing Postgres/MinIO, while local full-stack runs keep
      working unchanged via the defaults (not in the original checklist —
      discovered while verifying this section's definition of done; this
      is the actual mechanism section 7.1's exclusion depends on).
- [x] Used a distinct `COMPOSE_*` variable prefix
      (`COMPOSE_DATABASE_URL`, `COMPOSE_S3_ENDPOINT`, etc.) rather than
      reusing the plain `DATABASE_URL`/`S3_*` names — the root `.env`
      already sets those for host-side `pnpm dev` (pointing at
      `localhost:5433`/`localhost:9002`), and since `docker compose`
      auto-loads the root `.env` for variable substitution, the first
      version of this fix silently broke the local full-stack run:
      `${DATABASE_URL:-devflow-db default}` resolved to the `pnpm dev`
      value instead of falling through to the container-network default,
      pointing `devflow-api` at its own loopback instead of `devflow-db`
      (not in the original checklist — found by testing the fix above
      against the running stack).
- [x] Added a `devflow-minio-init` one-shot service (`minio/mc`, `infra`
      profile) that creates the `devflow` bucket on startup
      (`mc mb --ignore-existing`) — a fresh `devflow-minio` volume has no
      bucket, so media uploads failed with `NoSuchBucket` until created
      manually. `devflow-api` now depends on it (`required: false`, so a
      host running without the `infra` profile — external MinIO with the
      bucket already provisioned — isn't blocked) (not in the original
      checklist — discovered while verifying this section's definition of
      done).
- [x] Fix `turbo.json`'s `build` task not declaring `API_INTERNAL_URL` in
      its `env` allowlist — Turbo's strict env mode stripped the variable
      before it reached the `next build` subprocess, so the built
      `devflow-web` image always baked the `127.0.0.1:4000` rewrite
      fallback regardless of the Docker build ARG. Added
      `"env": ["API_INTERNAL_URL"]` to the `build` task (not in the
      original checklist — discovered while verifying this section's
      definition of done; this also explains part of the still-open
      section 6.3 production blocker).
- [x] Made `devflow-minio`'s host-published API port configurable via
      `${MINIO_HOST_PORT:-9000}` in `docker-compose.yml` (container-internal
      port and `devflow-minio:9000` hostname used by
      `devflow-api`/`devflow-web` unchanged) — host port `9000` on this
      machine is already bound by an unrelated project's `php-fpm`. Set
      `MINIO_HOST_PORT=9002` in this machine's local `.env` rather than
      hardcoding the remap into the committed `docker-compose.yml`/
      `.env.example` (both keep the `9000` default); documented the
      override in `.env.example` (not in the original checklist —
      discovered while verifying this section's definition of done; the
      hardcoded-remap version of this fix was caught and corrected by
      code review, see closing review below).
- [x] Fix pre-existing `Dockerfile` build failure: `pnpm turbo run build
      --filter=web` aborted with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`
      because pnpm's dependency status check wants an interactive TTY to
      purge `node_modules` during the Docker build. Added `ENV CI=true` in
      the builder stage (not in the original checklist — discovered while
      verifying this section's definition of done).
- [x] Fix `Dockerfile` `builder` stage never reusing the `deps` stage's
      `pnpm install` output — it ran a second full `pnpm install` (via
      `turbo run build`) from scratch on every build, hitting the npm
      registry for ~580 packages and failing under flaky Wi-Fi. Copied
      `node_modules` from `deps` into `builder` for `apps/web`,
      `packages/db`, `packages/shared`, matching the same fix already
      applied to `Dockerfile.api` (not in the original checklist —
      discovered while verifying this section's definition of done).
- [x] `docker compose up --build` starts all four services
      (`devflow-db`, `devflow-minio`, `devflow-api`, `devflow-web`) and all
      report healthy/running.
- [x] `GET /api/health` (via `devflow-web`'s rewrite) returns `db: true`.
- [x] Login / session cookie works through `devflow-web` → `devflow-api`
      (verified via `curl` sign-up/sign-in/get-session against the running
      containers — the Chrome browser extension wasn't connected this
      session for a full UI pass).
- [x] Projects, board, tickets, comments + @mentions, notifications work
      end to end through the containers (verified via `curl`: create
      project, create ticket, post a comment with a mention token, list
      comments, list notifications — all succeeded through `devflow-web`'s
      proxy to `devflow-api`).
- [x] Media upload and Range 206 streaming proxy work against
      `devflow-minio` (uploaded a PNG via `curl`, downloaded it back
      byte-identical, and confirmed a `Range: bytes=0-10` request returns
      `206 Partial Content` with `content-range`).
- [x] Excel export downloads successfully (`GET /api/projects/:id/export`
      returned a valid `.xlsx` — `file` confirmed "Microsoft Excel 2007+").
- [x] Authenticated WebSocket (`/ws/notifications`) connects and returns
      `{"type":"connected","userId":"..."}` — verified against
      `devflow-api`'s published port (`ws://localhost:4000/ws/notifications`
      with the session cookie). Note: this does **not** work through
      `devflow-web:3000` locally — `next.config.ts` only rewrites
      `/api/:path*`, not `/ws/:path*`, and there's no Nginx in the local
      compose stack to route the upgrade request. This matches the
      documented production architecture (section 6.4: Nginx routes
      `/ws/notifications` directly to the API container, bypassing web) —
      not a bug, but worth calling out since the original checklist wording
      assumed a web-proxied path that only exists behind Nginx.
- [x] `COMPOSE_PROFILES= COMPOSE_DATABASE_URL=... COMPOSE_S3_ENDPOINT=...
      docker compose up -d devflow-api devflow-web` (infra profile
      inactive) starts cleanly without creating `devflow-db`/`devflow-minio`
      at all, using the externally-supplied `COMPOSE_*` env values, and the
      API/web containers don't crash-loop waiting on the excluded services
      (`RestartCount: 0` on both after 5s; `/api/health` correctly reports
      `db: false` against the deliberately-unreachable external DB used for
      this test, rather than crashing).
