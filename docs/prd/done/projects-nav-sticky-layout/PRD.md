# PRD — Rename Dashboard to Projects + Sticky Header/Sidebar

## Context

- The header's only nav item is currently labeled "Dashboard" and points at
  `/dashboard` (`apps/web/src/components/layout/header.tsx:22,26`). That
  route (`apps/web/src/app/dashboard/page.tsx`) is the user's projects list
  (queries `projectMembers`/`projects`, renders a grid of project cards
  linking to `/projects/${p.id}`) — i.e. it's already conceptually
  "Projects", just named/routed as "Dashboard".
- Neither the shared `Header` (`header.tsx:19`) nor `ProjectSidebar`
  (`apps/web/src/components/layout/project-sidebar.tsx:44`) are
  sticky/fixed today — both are static/in-flow (`border-b ... backdrop-blur`
  for the header; `min-h-[calc(100vh-3.5rem)]` for the sidebar). Scrolling a
  long page currently scrolls the header and sidebar away with the content.
- The project detail layout (`apps/web/src/app/projects/[id]/layout.tsx`)
  already has a `flex-1 overflow-y-auto` content pane (line 113), but it
  only works as an independently-scrolling region if the ancestor
  containers are height-bounded, which they currently aren't (`min-h-screen`
  at line 108, not `h-screen`).

## Problem / Motivation

"Dashboard" as a label/route doesn't match what the page actually is (a
projects list) — renaming it to "Projects" makes the nav self-explanatory.
Separately, on longer pages (e.g. a bug board with many cards), the header
and sidebar disappearing on scroll makes navigation and the theme
switcher/logout inconvenient to reach.

## Scope

### 1. Rename "Dashboard" → "Projects" (label + route)

- Move `apps/web/src/app/dashboard/page.tsx` →
  `apps/web/src/app/projects/page.tsx`. This coexists fine with the existing
  `apps/web/src/app/projects/[id]/...` dynamic segment in Next.js App
  Router (a static `page.tsx` at `projects/` and a `[id]` dynamic folder
  at the same level are distinct routes).
- Update every reference to the literal `/dashboard` path to `/projects`:
  - `apps/web/src/app/page.tsx:6` — `redirect(session ? "/dashboard" : "/login")`.
  - `apps/web/src/app/login/page.tsx:8` — `if (session) redirect("/dashboard")`.
  - `apps/web/src/app/signup/page.tsx:8` — `if (session) redirect("/dashboard")`.
  - `apps/web/src/components/auth/login-form.tsx:26` — `router.push("/dashboard")`.
  - `apps/web/src/components/auth/signup-form.tsx:27` — `router.push("/dashboard")`.
  - `apps/web/src/components/layout/header.tsx:22` — logo `<Link href="/dashboard">`.
  - `apps/web/src/components/layout/header.tsx:26` — nav `<Link href="/dashboard">Dashboard</Link>`, change label text to "Projects" too.
  - `apps/web/src/app/projects/[id]/layout.tsx:118` — "back to dashboard" link, update href and label.
- No middleware references `/dashboard` (auth guards are per-page via
  `requireUser()`), so no middleware changes needed.

### 2. Sticky header (all pages)

- `apps/web/src/components/layout/header.tsx:19`: add `sticky top-0 z-40`
  to the header's class list so it stays pinned while the page scrolls.
  Applies everywhere `Header` is used — the projects list page and every
  project detail page.
- `AuthHeader` (`auth-header.tsx`) is unchanged — login/signup pages don't
  need a pinned nav.

### 3. Fixed sidebar (project detail pages)

- `apps/web/src/components/layout/project-sidebar.tsx:44`: change
  `min-h-[calc(100vh-3.5rem)]` to `sticky top-14 h-[calc(100vh-3.5rem)]
  overflow-y-auto` so the sidebar pins under the sticky header and scrolls
  independently if its own nav list ever grows taller than the viewport.
- Verify `apps/web/src/app/projects/[id]/layout.tsx`'s outer wrapper (line
  108, currently `min-h-screen flex flex-col`) and the sidebar+content row
  (line 110, `flex flex-1 overflow-hidden`) correctly bound the height so
  the content pane's existing `overflow-y-auto` (line 113) scrolls
  independently under the fixed header/sidebar — adjust `min-h-screen` to
  `h-screen` on the outer wrapper if needed for this to work correctly.

## Out of scope

- Visual redesign of the header or sidebar beyond positioning changes.
- New breadcrumb navigation.
- Mobile-responsive sidebar behavior (e.g. a collapsible/hamburger sidebar)
  — this PRD only changes desktop scroll/positioning behavior.
- Any change to `AuthHeader` or the login/signup pages' layout.

## Success criteria

- Header nav item reads "Projects" and every link that used to go to
  `/dashboard` now goes to `/projects`, with no broken links or 404s.
- Login and signup flows still land the user on the projects list after
  success.
- Scrolling any page keeps the header visible at the top.
- Scrolling a project detail page keeps the sidebar visible alongside the
  header while the main content area scrolls independently.
- `pnpm lint` and `pnpm build` pass.

## Definition of done (from CLAUDE.md / repo conventions)

- [ ] `pnpm lint` passes for `web`.
- [ ] `pnpm build` passes.
- [ ] Manual verification: log in, confirm redirect to `/projects`; check
      the header nav label and sticky behavior on scroll on both the
      projects list and a project detail page; check the sidebar stays
      fixed while content scrolls (no automated test suite exists in this
      repo yet).
