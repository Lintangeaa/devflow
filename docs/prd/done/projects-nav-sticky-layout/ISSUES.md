# ISSUES — Rename Dashboard to Projects + Sticky Header/Sidebar

See `PRD.md` for full context and scope decisions.

## 1. Route rename

- [x] Move `apps/web/src/app/dashboard/page.tsx` to
      `apps/web/src/app/projects/page.tsx` (adjust any relative imports if
      needed).
- [x] `apps/web/src/app/page.tsx:6` — change redirect target to `/projects`.
- [x] `apps/web/src/app/login/page.tsx:8` — change redirect target to `/projects`.
- [x] `apps/web/src/app/signup/page.tsx:8` — change redirect target to `/projects`.
- [x] `apps/web/src/components/auth/login-form.tsx:26` — change `router.push`
      target to `/projects`.
- [x] `apps/web/src/components/auth/signup-form.tsx:27` — change `router.push`
      target to `/projects`.
- [x] `apps/web/src/components/layout/header.tsx:22` — logo link href →
      `/projects`.
- [x] `apps/web/src/components/layout/header.tsx:26` — nav link href →
      `/projects`, label text → "Projects".
- [x] `apps/web/src/app/projects/[id]/layout.tsx:118` — "back to dashboard"
      link href → `/projects`, update label text accordingly.

## 2. Sticky header

- [x] `apps/web/src/components/layout/header.tsx:19` — add `sticky top-0
      z-40` to the header element's class list.

## 3. Fixed sidebar

- [x] `apps/web/src/components/layout/project-sidebar.tsx:44` — replace
      `min-h-[calc(100vh-3.5rem)]` with `sticky top-14
      h-[calc(100vh-3.5rem)] overflow-y-auto`.
- [x] `apps/web/src/app/projects/[id]/layout.tsx:108` — change
      `min-h-screen` to `h-screen` on the outer wrapper if needed so the
      content pane's `overflow-y-auto` (line 113) actually bounds and
      scrolls independently under the sticky header/sidebar.

## 4. Verification (definition of done)

- [x] `pnpm --filter web lint` passes.
- [x] `pnpm build` passes.
- [x] Manual check: log in, confirm redirect lands on `/projects` (not
      `/dashboard`).
- [x] Manual check: sign up as a new user, confirm redirect lands on
      `/projects`.
- [x] Manual check: header nav shows "Projects" and links correctly from
      every page.
- [x] Manual check: scroll the projects list page, confirm header stays
      pinned at the top.
- [x] Manual check: scroll a project detail page (e.g. a bug board with
      many cards), confirm header and sidebar both stay pinned while the
      main content scrolls independently.
- [x] Manual check: no remaining references to `/dashboard` anywhere in
      `apps/web/src` (grep to confirm).
- [x] Code review pass (per repo's `code-review-and-quality` skill).
