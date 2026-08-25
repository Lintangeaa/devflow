# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Devflow — internal dev team management + bug tracker. Turborepo monorepo, Next.js 15 App Router (frontend), Hono (Node.js backend), Drizzle + PostgreSQL, better-auth, MinIO (S3) upload, native WebSockets.

## Commands

```bash
pnpm install
cp .env.example .env                  # fill in DATABASE_URL, BETTER_AUTH_SECRET, etc.
docker compose up -d devflow-db devflow-minio  # postgres (host port 5433 -> container 5438) + minio (9000/9001), for local `pnpm dev`
pnpm db:generate                      # drizzle-kit generate (packages/db) — writes to packages/db/migrations
pnpm db:migrate                       # drizzle-kit migrate — applies schema to Postgres
pnpm dev                              # turbo dev -> web on http://localhost:3000, api on http://localhost:4000
pnpm build                            # turbo build (builds all workspaces)
pnpm lint                             # turbo lint (next lint for web, tsc --noEmit for shared, db, api)
pnpm db:studio                        # drizzle-kit studio
```

### Full stack via Docker Compose

`docker-compose.yml` runs all four services: `devflow-db`, `devflow-minio`,
`devflow-api`, `devflow-web`. `devflow-db` and `devflow-minio` sit behind
the `infra` Compose profile:

```bash
docker compose up --build              # requires .env with COMPOSE_PROFILES=infra (the .env.example default) — builds & starts all 4 services
```

On a host that already runs its own Postgres/MinIO (e.g. a server sharing
infra with other apps), don't activate the `infra` profile — only
`devflow-api` and `devflow-web` start, using the `DATABASE_URL`/`S3_*`
values from that host's own env:

```bash
COMPOSE_PROFILES= docker compose up -d devflow-api devflow-web
```

Deploy:
- Backend: `docker build -f Dockerfile.api -t devflow-api:latest .`
- Frontend: `docker build -f Dockerfile -t devflow-web:latest .`
- Served behind Nginx (`devflow.alpitech.biz.id`):
  - `/api/` & `/ws/` -> `devflow-api:4000`
  - `/` -> `devflow-web:3000`

## Architecture

**Workspaces** (pnpm + Turborepo, path aliases in `tsconfig.base.json`):
- `apps/api` — Hono backend on `@hono/node-server`:
  - Native WebSockets on `/ws/notifications` with in-memory session validation.
  - REST API routes (`/api/auth/*`, `/api/projects/*`, `/api/notifications/*`, `/api/users/*`).
  - S3 / MinIO uploads & Range 206 streaming proxy.
  - Excel `.xlsx` report generator via `exceljs`.
- `apps/web` — Next.js 15 App Router (pure frontend & SSR):
  - 100% vanilla Next.js without custom `server.js`.
  - Next.js rewrites `/api/:path*` to `http://localhost:4000` in development.
  - Better-auth client (`useSession`, `signIn`, `signUp`, `signOut`).
- `packages/db` (`@devflow/db`) — Drizzle schema (`src/schema.ts`) + generated migrations. Exports a shared `db` client (`drizzle-orm/node-postgres` over a `pg.Pool`) and the `schema` object.
- `packages/shared` (`@devflow/shared`) — Zod schemas + inferred types used across both the API routes and client forms (`src/index.ts`). Single source of truth for validation.
- `packages/mcp` — planned, not yet implemented.

**Auth**:
- Server: `better-auth` mounted at `/api/auth/*` in `apps/api`.
- Client: `better-auth/react` client in `apps/web/src/lib/auth-client.ts`.

**Two-tier authorization**:
- System role: `user.role` is `admin` | `user` (global).
- Per-project role: `project_members.role` is `owner` | `member`, keyed by `(projectId, userId)`.
- `apps/api/src/lib/access.ts`: `requireAuth`, `requireProjectMember(c, projectId)`, `requireProjectOwner(c, projectId)`.

## Conventions

- Validation logic belongs in `packages/shared`, not duplicated in route handlers or forms.
- DB writes go through `@devflow/db`'s `schema.*` tables via Drizzle, not raw SQL, except for the `checkDb()` healthcheck.
- Some Indonesian-language strings appear in user-facing error messages (e.g. `"Anda bukan member project ini"`) — match this when adding similar guard clauses.
