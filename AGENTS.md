# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Devflow — internal dev team management + bug tracker. Turborepo monorepo, Next.js 15 fullstack app, Drizzle + PostgreSQL, better-auth, MinIO (S3) upload.

## Commands

```bash
pnpm install
cp .env.example apps/web/.env.local   # fill in DATABASE_URL etc.
docker compose up -d                  # postgres (host port 5433 -> container 5438) + minio (9000/9001)
pnpm db:generate                      # drizzle-kit generate (packages/db) — writes to packages/db/migrations
pnpm db:migrate                       # drizzle-kit migrate — applies schema to Postgres
pnpm dev                              # turbo dev -> http://localhost:3000
pnpm build                            # turbo build
pnpm lint                             # turbo lint (next lint for web, tsc --noEmit for shared)
pnpm db:studio                        # drizzle-kit studio
```

There is no test suite configured yet. `pnpm --filter web lint` / `pnpm --filter @devflow/shared lint` run a single workspace in isolation.

Deploy: `docker build -t devflow:latest . && docker run --network host devflow:latest`, served behind nginx (domain `devflow.alpitech.biz.id`). The Dockerfile produces a Next.js standalone build (`apps/web/.next/standalone`); the app binds `HOSTNAME=127.0.0.1` inside the container.

## Architecture

**Workspaces** (pnpm + Turborepo, path aliases in `tsconfig.base.json`):
- `apps/web` — the entire product: Next.js 15 App Router, UI + API routes in one app. No separate backend.
- `packages/db` (`@devflow/db`) — Drizzle schema (`src/schema.ts`) + generated migrations. Exports a shared `db` client (`drizzle-orm/node-postgres` over a `pg.Pool`) and the `schema` object. `DATABASE_URL` defaults to the docker-compose Postgres (`localhost:5433`).
- `packages/shared` (`@devflow/shared`) — zod schemas + inferred types used by both the API routes and client forms (`src/index.ts`). This is the single source of truth for request validation — API routes call `.safeParse` against these schemas rather than re-validating inline.
- `packages/mcp` — planned, not yet implemented.

**Auth**: better-auth with the Drizzle adapter, mounted at `apps/web/src/app/api/auth/[...all]/route.ts`. `apps/web/src/lib/auth.ts` is the server-side `auth` instance; `apps/web/src/lib/auth-client.ts` is the `"use client"` React hook surface (`useSession`, `signIn`, `signUp`, `signOut`). better-auth owns the `user`/`session`/`account`/`verification` tables in `schema.ts`; app tables reference `user.id` via plain `text` foreign keys (not `uuid`), since better-auth ids are strings.

**Two-tier authorization**:
- System role: `user.role` is `admin` | `user` (global).
- Per-project role: `project_members.role` is `owner` | `member`, keyed by `(projectId, userId)`.
- `apps/web/src/lib/api.ts` — `requireUser()` reads the better-auth session from request headers and throws `HttpError(401, ...)` if absent.
- `apps/web/src/lib/access.ts` — `requireProjectMember(projectId)` / `requireProjectOwner(projectId)` layer project-role checks on top, throwing `HttpError(403, ...)`. Every project-scoped API route starts by calling one of these before touching data.

**API routes** (`apps/web/src/app/api/**/route.ts`) follow one consistent shape: await `params`, call the relevant `require*` guard, parse/validate the body with a `@devflow/shared` zod schema (`safeParse` -> 400 with `.flatten()` on failure), then run Drizzle queries against `schema.*` and return `NextResponse.json`. See `api/projects/[id]/tickets/route.ts` for the reference pattern (list with dynamic `and(...)` filter conditions, insert with `.returning()`).

**Tickets model**: `tickets` is a single table for both `task` and `bug` types (`type` column), with a shared free-text `status` column whose valid values depend on `type` (`TASK_STATUSES` vs `BUG_STATUSES` in `packages/shared`) — status is not a DB enum, it's validated in the handler/schema layer. Bugs require `severity` (enforced via `superRefine` in `ticketSchema`); tasks don't. Tickets can self-reference via `parentId` for subtasks.

**Storage**: `apps/web/src/lib/s3.ts` wraps `@aws-sdk/client-s3` for MinIO (`forcePathStyle: true`). `signedUrl()` returns a public URL built from `S3_PUBLIC_URL` if set (nginx-fronted), otherwise a presigned URL. Ticket media uploads go through `api/projects/[id]/tickets/[ticketId]/media/route.ts`.

**Export**: `.xlsx` report generation via `exceljs` at `api/projects/[id]/export/route.ts`.

## Conventions

- Server-only modules (`lib/api.ts`, `lib/access.ts`) import `"server-only"` at the top — don't remove that guard or import them from client components.
- Validation logic belongs in `packages/shared`, not duplicated in route handlers or forms.
- DB writes go through `@devflow/db`'s `schema.*` tables via Drizzle, not raw SQL, except for the `checkDb()` healthcheck.
- Some Indonesian-language strings appear in user-facing error messages (e.g. `"Anda bukan member project ini"`) — match this when adding similar guard clauses.
