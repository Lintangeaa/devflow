# Dark/Light Theme Switcher — Issues

See `PRD.md` for context, scope, and design decisions.

## Theme engine

- [x] Add `next-themes` dependency to `apps/web/package.json`.
- [x] Wrap `apps/web/src/app/layout.tsx` body in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="devflow:theme">`.
- [x] Remove the old inline FOUC-prevention `<script>` from `layout.tsx` (superseded by `next-themes`' own no-flash injection).
- [x] Verify `suppressHydrationWarning` stays on `<html>` (required by `next-themes`).

## Components

- [x] `apps/web/src/components/ui/dropdown-menu.tsx` — thin Radix `DropdownMenu` wrapper (Root/Trigger/Content/Item), matching the `Button` primitive's shadcn-style convention. (Not in the original checklist — added because `ThemeSelector` needed a dropdown primitive and the repo already has this pattern for `Button`.)
- [x] `apps/web/src/components/theme/theme-selector.tsx` — `ThemeSelector` client component: Radix `DropdownMenu` with 3 items (System/Monitor, Dark/Moon, Light/Sun), reads/sets theme via `useTheme()` from `next-themes`.
- [x] `apps/web/src/components/layout/header.tsx` — `Header` client component: logo/app name, nav link to Dashboard, logout button (`authClient.signOut`, redirect to `/login`), `ThemeSelector` on the right.
- [x] `apps/web/src/components/layout/auth-header.tsx` — `AuthHeader` component: app name + `ThemeSelector` only, no nav/logout.

## Page wiring

- [x] `apps/web/src/app/dashboard/page.tsx` — replace the current inline `<header>` block with `<Header />`.
- [x] `apps/web/src/app/projects/[id]/page.tsx` — replace its inline header with `<Header />`.
- [x] `apps/web/src/app/login/page.tsx` — add `<AuthHeader />`.
- [x] `apps/web/src/app/signup/page.tsx` — add `<AuthHeader />`.

## Cleanup (scoped to touched files)

- [x] Confirm `"use client"` boundaries are correct: `ThemeSelector`/`Header`/`AuthHeader` are client components only where they need interactivity (theme dropdown, logout handler); page-level data fetching in `dashboard`/`projects/[id]` stays server-side. (`AuthHeader` itself is a server component — it composes the client `ThemeSelector` but has no interactivity of its own.)
- [x] Prop types on new components follow existing conventions (see `Button`/`ButtonProps` in `apps/web/src/components/ui/button.tsx`).
- [x] Fixed pre-existing `react/no-unescaped-entities` lint error in `apps/web/src/app/dashboard/page.tsx` (a file this feature touches) — escaped the literal quotes around "New Project".
- [x] Bootstrap ESLint for `apps/web` (`eslint@9`, `eslint-config-next@15`, `eslint.config.mjs`) — repo had a `lint` script but no ESLint config at all; needed so `pnpm lint` can actually run and pass. (Not in the original checklist — added after surfacing the gap to the user and getting confirmation to bootstrap it.)

## Definition of done

- [x] `pnpm lint` passes.
- [x] `pnpm build` passes.
- [x] Manual browser verification: System/Dark/Light all apply correctly, no FOUC on reload, choice persists across reload. Verified via Chrome automation: login (System→Light, reload persists), signup → dashboard (full `Header`, logout works), login again → project detail page (`Header` + Dark theme, all icons/labels match spec). System's live OS-tracking wasn't separately re-verified (relies on `next-themes`' standard `enableSystem` behavior); local Postgres/MinIO started via `docker compose up -d` and test user/project cleaned up afterward.
- [x] Code review pass (`reviewer` agent / `code-review-and-quality` skill) before considering this done. Verdict: **Approve**, no blocking issues (correctness, readability, architecture, security, performance all clean; lint/build independently re-verified).
