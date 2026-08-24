# Devflow

Internal dev team management + bug tracker. Monorepo (Turborepo) · Next.js 15 fullstack · Drizzle + PostgreSQL · better-auth · MinIO (S3) upload.

## Stack

- **apps/web** — Next.js 15 App Router (fullstack UI + API), TypeScript, Tailwind v4, Radix + shadcn-style UI
- **packages/db** — Drizzle schema + migrations (PostgreSQL)
- **packages/shared** — zod schemas + types (dipakai frontend & backend)
- **packages/mcp** — (rencana) MCP server untuk integrasi AI/agent
- Auth: better-auth (email+password, 2 role sistem: `admin`/`user`; per-project `owner`/`member`)
- Storage: MinIO (S3-compatible) untuk upload image & video
- Export: exceljs → .xlsx laporan ticket/bug per project

## Development

```bash
pnpm install
cp .env.example apps/web/.env.local   # isi DATABASE_URL dll
pnpm db:generate                      # sudah ada migrations/
pnpm db:migrate                       # terapkan schema ke Postgres
pnpm dev                              # → http://localhost:3000
```

## Deploy

```bash
docker compose up -d                  # postgres (5433) + minio (9000/9001)
pnpm turbo build --filter=web         # build production
docker build -t devflow:latest . && docker run --network host devflow:latest
```

Serve di belakang nginx (pola `nextjs-docker-deploy`), domain: `devflow.alpitech.biz.id`.

## API cepat

- `/api/health` — healthcheck (db)
- `/api/projects` — GET (list milik user) / POST (buat, jadi owner)
- `/api/projects/:id` — GET (project + phases) / PATCH / DELETE (owner)
- `/api/projects/:id/phases` — GET/POST (fase)
- `/api/projects/:id/tickets` — GET (filter `type=task|bug`, `priority`, `phase`) / POST
- `/api/projects/:id/tickets/:ticketId` — PATCH / DELETE
- `/api/projects/:id/tickets/:ticketId/media` — POST upload image/video (FormData `file`) / GET list
- `/api/projects/:id/export` — GET .xlsx (exceljs)

## Role

- **Sistem:** `admin` (kelola semua) · `user` (akses app)
- **Per-project:** `owner` (kelola project, hapus, set fase/anggota) · `member` (buat/edit task & bug, upload)

## Data model (inti)

`users, sessions, accounts, verifications` (better-auth) +
`projects, phases, project_members, tickets, comments, media, activities`