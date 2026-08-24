# Dark/Light Theme Switcher

## Context

Devflow (`apps/web`) currently has partial dark-mode infrastructure but no
way for a user to actually switch themes: `globals.css` already defines
CSS variables for both `:root` (light) and `.dark`, and `app/layout.tsx`
has an inline `<script>` that reads `localStorage['devflow:theme']` /
`prefers-color-scheme` to avoid a flash of unstyled theme on load — but
there is no UI control, no live-switching mechanism, and no shared header
component (`dashboard`, `projects/[id]`, `login`, `signup` each build their
own header inline).

## Problem / Motivation

Users have no way to choose a theme; the app only follows OS preference at
first paint and can never be changed at runtime. There's also no shared
header to hang a theme control off of.

## Scope

1. **Theme engine** — add `next-themes`, wrap the app in `ThemeProvider`
   (`attribute="class"`, `defaultTheme="system"`, `enableSystem`) in
   `apps/web/src/app/layout.tsx`; remove the old manual FOUC-prevention
   inline `<script>` (next-themes handles this itself via its own
   no-flash script injection).
2. **`ThemeSelector` component** — a new dropdown (built on the existing
   `@radix-ui/react-dropdown-menu` dependency) with exactly 3 items, each
   with a `lucide-react` icon (already a dependency):
   - **System** — `Monitor` icon
   - **Dark** — `Moon` icon
   - **Light** — `Sun` icon
3. **Shared `Header` component** — logo/app name, nav link(s) (Dashboard),
   logout action (`authClient.signOut`), and `ThemeSelector` on the right.
   Used on `dashboard/page.tsx` and `projects/[id]/page.tsx`, replacing
   their current inline headers.
4. **`AuthHeader` component** — minimal header variant for `login` and
   `signup` pages (no session yet): app name + `ThemeSelector` only, no
   nav/logout.
5. **Component structure cleanup** — while touching these files, apply
   React/Next.js best practices to what's touched: correct `"use client"`
   boundaries (theme/dropdown state is client-only; page data-fetching
   stays server-only), proper prop typing, and composition consistent with
   the existing `Button`/`cn` conventions. Scoped to files this feature
   touches — not a full repo audit.

## Design decisions

- **`next-themes` over hand-rolled context** — replaces the existing
  manual `localStorage['devflow:theme']` + inline script approach; picked
  over keeping the hand-rolled version to get battle-tested system-preference
  handling and flash prevention for free.
- **Storage key stays `devflow:theme`** — pass `storageKey="devflow:theme"`
  to `ThemeProvider` so any theme a returning user already has saved from
  the old inline-script mechanism still applies; avoids a reset to
  "system" for existing users.
- **Full header (nav + logout + theme) vs. minimal header (theme only)** —
  authenticated pages get the full header; `login`/`signup` get a minimal
  variant since there's no session to show nav/logout for.
- **English labels** — "System" / "Dark" / "Light", matching the dropdown
  item icons (Monitor / Moon / Sun).
- **No new theming system** — only the 2 themes (dark/light) already
  defined in `globals.css`; no per-user DB-persisted preference.

## Out of scope

- Per-user database-persisted theme preference (this stays `localStorage`-only via `next-themes`).
- Any theming beyond the existing dark/light CSS variables (no custom accent-color picker, no additional themes).
- Mobile-specific header/nav treatment (e.g. hamburger menu) beyond what a responsive `flex` header already handles.
- A full, repo-wide component/code-quality audit — cleanup here is limited to files this feature touches (layout, new Header/AuthHeader/ThemeSelector, dashboard and project-detail pages).

## Success criteria

- Dropdown shows exactly 3 options (System/Monitor, Dark/Moon, Light/Sun) and switching between them updates the theme app-wide immediately.
- Reloading the page after choosing a theme shows no flash of the wrong theme (FOUC), and the choice persists across reloads and sessions (`localStorage['devflow:theme']`).
- Choosing "System" tracks OS `prefers-color-scheme` live (no reload needed) rather than snapshotting it once.
- `Header` (with nav + logout + `ThemeSelector`) renders on `dashboard` and `projects/[id]`; `AuthHeader` (theme only) renders on `login`/`signup`.
- Logout via the header signs the user out (`authClient.signOut`) and redirects to `/login`.
- `pnpm lint` and `pnpm build` pass.
- Manual browser verification: all 3 theme states render correctly on at least one authenticated page and one auth page, in both light and dark OS settings.
