# PRD — Monorepo Hono Backend Split

## Context

Devflow currently runs as a unified Next.js 15 App Router application in `apps/web`. While Next.js App Router functions well for server-rendered UI and simple stateless CRUD, integrating persistent stateful features—specifically real-time WebSocket notifications (`/ws/notifications`) and streaming media proxies—required a custom `apps/web/server.js` wrapping `NextNodeServer`.

This custom server architecture introduced significant maintenance overhead:
- Brittle asset serving logic (`tryServePublicAsset`) to bypass Next.js standalone file conflicts.
- Complex loopback authentication fetches (`http://127.0.0.1:3000/api/auth/get-session`) during WebSocket upgrade requests.
- Complex Docker standalone build packaging where custom server files risked getting overwritten.

To establish a clean, long-term foundation for Devflow (including upcoming MCP server integrations and background task processing), we are splitting the application into two dedicated apps within the existing Turborepo monorepo:
1. `apps/api`: A fast, lightweight, native TypeScript backend powered by **Hono** on `@hono/node-server`.
2. `apps/web`: A clean, standard Next.js 15 frontend with zero custom server wrappers.

Both apps continue sharing `@devflow/db` (Drizzle ORM) and `@devflow/shared` (Zod schemas and contracts).

## Architecture & Responsibilities

### 1. `apps/api` (Backend Service)
- **Runtime & Framework**: Node.js, `hono`, `@hono/node-server`, `ws`.
- **Port**: `4000` (configurable via `PORT`).
- **Auth**: `better-auth` instance mounted via `auth.handler(c.req.raw)` at `/api/auth/*`.
- **Authorization Middlewares**:
  - `requireUser`: reads better-auth session from request headers, injecting `c.set("user", session.user)`.
  - `requireProjectMember(paramName)` & `requireProjectOwner(paramName)`: validates membership against `@devflow/db` `projectMembers` table.
- **WebSocket Server**:
  - Native `ws` instance attached to the HTTP server on `/ws/notifications`.
  - In-process session validation using `auth.api.getSession({ headers })` (zero loopback HTTP overhead).
  - Centralized client connection registry for real-time notification broadcasting.
- **REST Endpoints**:
  - `/api/health`
  - `/api/projects` (CRUD, members, phases, overview, export)
  - `/api/projects/:id/tickets` (CRUD, status re-ordering, subtasks)
  - `/api/projects/:id/tickets/:ticketId/comments` (Comment threads with @mentions)
  - `/api/projects/:id/tickets/:ticketId/media` (S3 upload and Range 206 streaming proxy)
  - `/api/notifications` (List, mark read, mark all read)
  - `/api/users/search` (Autocomplete for members & mentions)

### 2. `apps/web` (Frontend Service)
- **Runtime & Framework**: Standard Next.js 15 (App Router), React 19, Tailwind CSS v4.
- **Port**: `3000`.
- **Local Dev Proxy**: `next.config.ts` rewrites `/api/:path*` and `/ws/:path*` to `http://localhost:4000`.
- **Auth Client**: `better-auth/react` client pointing to `/api/auth`.
- **Server Removal**: Deletion of `apps/web/server.js`. Next.js runs via standard `next dev` and `next start`.

### 3. Production Deployment & Orchestration
- **Docker Compose**:
  - `api`: Container building `apps/api` (exposing port `4000`).
  - `web`: Container building `apps/web` standalone (exposing port `3000`).
  - `postgres`: Container (port `5433` -> `5438`).
  - `minio`: Container (port `9000` / `9001`).
- **Nginx Reverse Proxy**:
  - Serves single domain `devflow.alpitech.biz.id`.
  - Routes `/api/` and `/ws/` to `api:4000` with WebSocket upgrade headers.
  - Routes all other traffic to `web:3000`.

## Scope

### Phase 1: Initialize `apps/api`
- Create `apps/api` workspace with `package.json`, `tsconfig.json`, and dependencies (`hono`, `@hono/node-server`, `ws`, `better-auth`, `exceljs`, `@aws-sdk/client-s3`).
- Set up Hono app entrypoint `src/index.ts` and HTTP server with WebSocket attachment.
- Port libraries: `src/lib/auth.ts`, `src/lib/access.ts`, `src/lib/s3.ts`, `src/lib/notifications.ts`.

### Phase 2: Port Route Handlers to Hono
- Migrate auth route (`/api/auth/*`).
- Migrate projects route (`/api/projects`, `/api/projects/:id`, members, phases, overview, export).
- Migrate tickets route (`/api/projects/:id/tickets`, comments, media uploads/streaming).
- Migrate notifications and user search routes.

### Phase 3: Clean up `apps/web` & Configure Proxies
- Configure `next.config.ts` rewrites for local development.
- Remove `apps/web/server.js` and standalone server overrides.
- Remove migrated `src/app/api/` route handlers from `apps/web` (keeping frontend purely client/SSR views).

### Phase 4: Verification & Docker Packaging
- Update root `turbo.json` with `api#build` and `api#dev` pipelines.
- Create `apps/api/Dockerfile` and update `apps/web/Dockerfile` and `docker-compose.yml`.
- Verify full test cycle: `pnpm lint`, `pnpm build`, local dev test, and Docker build.

## Out of Scope

- Database schema modifications (`packages/db` remains untouched).
- Zod schema changes (`packages/shared` remains unchanged single source of truth).

## Success Criteria

1. Hono backend runs cleanly on `localhost:4000` handling all API requests and WebSockets without error.
2. Next.js frontend runs cleanly on `localhost:3000` using standard Next commands without custom `server.js`.
3. Real-time notifications and comment mentions function seamlessly over WebSocket.
4. Media attachments upload, stream with Range 206, and Excel export downloads successfully.
5. `pnpm lint` and `pnpm build` pass across all workspaces in the monorepo.

## Definition of Done

- [ ] `apps/api` workspace created with Hono, better-auth, S3, and native WebSocket.
- [ ] All API routes ported and validated against `@devflow/shared` Zod schemas.
- [ ] `apps/web/server.js` removed and `apps/web` cleaned up.
- [ ] Turborepo pipelines configured for `web` and `api`.
- [ ] Dockerfiles & Docker Compose updated.
- [ ] `pnpm lint` passes across all packages.
- [ ] `pnpm build` passes across all packages.
- [ ] Code review pass (per repo's `code-review-and-quality` skill).
