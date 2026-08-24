# UI/UX Redesign — Issues

See `PRD.md` for context, scope, and design decisions.

## Design tokens & font

- [x] `apps/web/src/app/globals.css` — extend `:root` and `.dark` CSS variables toward soft & colorful: add per-category accent tokens (priority low/medium/high/critical, severity minor/major/blocker/crash, ticket type task/bug), softer `--border`, subtle shadow token, larger radius token.
- [x] `apps/web/src/app/layout.tsx` — load `Plus Jakarta Sans` via `next/font/google`, apply its class/variable to `<html>` or `<body>`.

## New primitive components

- [x] `apps/web/src/components/ui/badge.tsx` — `Badge` component, `cva` variants for priority/severity/type/status, matching the category tokens added above. (Also added `PriorityBadge`/`SeverityBadge`/`TypeBadge` convenience wrappers mapping ticket values to the right variant.)
- [x] `apps/web/src/components/ui/avatar.tsx` — initials-based `Avatar` component (deterministic background color from name/id, no image support).

## Page/component redesign

- [x] `apps/web/src/app/dashboard/page.tsx` — restyle project card grid with new tokens.
- [x] `apps/web/src/app/projects/[id]/page.tsx` — restyle phase columns and ticket cards; replace inline priority/type/severity `<span>` styling with the new `Badge` component.
- [x] `apps/web/src/components/auth/login-form.tsx` — restyle inputs/labels/button with new tokens.
- [x] `apps/web/src/components/auth/signup-form.tsx` — restyle inputs/labels/button with new tokens.
- [x] `apps/web/src/components/projects/new-project-form.tsx` — restyle modal/inputs/button with new tokens.
- [x] Create-ticket form (inside `apps/web/src/app/projects/[id]/page.tsx`) — restyle inputs/selects/textarea with new tokens.
- [x] `apps/web/src/components/layout/header.tsx` and `apps/web/src/components/layout/auth-header.tsx` — verify/adjust against new palette (light touch: primary-colored wordmark, translucent/backdrop-blur header — both already consumed CSS tokens so most of the change was automatic).

## Definition of done

- [x] `pnpm lint` passes.
- [x] `pnpm build` passes.
- [x] Manual browser verification: dashboard, project board, login, signup, new-project modal, create-ticket form, header — all checked in both light and dark theme. Verified via Chrome automation: signup → dashboard (project card, Badge, hover-lift) → project board seeded with a bug + task ticket (PriorityBadge/TypeBadge/status Badge + Avatar all render with distinct soft colors) → create-ticket form → switched Dark→Light and re-checked board/dashboard → logged out and checked login page in Light. Local Postgres started via `docker compose up -d`; test user/project cleaned up afterward.
- [x] No functional regression: login, signup, create project, create ticket, theme switching, logout all still work.
- [x] Code review pass (`reviewer` agent / `code-review-and-quality` skill) before considering this done. Verdict: **Approve**, no blocking issues (verified globals.css token consistency, confirmed visual-only diff with no logic/data changes; noted `SeverityBadge` is currently unused — intentional, reserved for the follow-up collaborator PRD).
