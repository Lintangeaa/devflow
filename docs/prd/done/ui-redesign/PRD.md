# UI/UX Redesign — Soft & Colorful Design System

## Context

Devflow's UI is functional but generic: priority/severity/status badges are
hand-rolled inline `<span>`s with hardcoded Tailwind classes repeated across
files, there's no `Avatar` component, no font beyond the OS default, and
spacing/color choices vary slightly page to page rather than coming from a
shared system. The dark/light theme switcher (`docs/prd/done/theme-switcher/`)
already established CSS-variable-based tokens and a `ThemeProvider`, but
those tokens are still the original minimal palette.

This PRD is the first of two: a follow-up PRD will add project
collaborator/member management (invite, assignee picker) on top of the
`Badge`/`Avatar` components this PRD introduces.

## Problem / Motivation

The UI needs to look and feel like a modern, deliberately-designed product
rather than an unstyled scaffold, before more collaboration features (which
lean heavily on badges/avatars for assignees, roles, tags) get built on top
of it.

## Scope

1. **Design tokens** (`apps/web/src/app/globals.css`) — extend the existing
   light/dark CSS variables toward a soft & colorful direction (Notion/Trello-like):
   more saturated/varied accent colors for priority, severity, status, and
   ticket type categories; softer borders; subtle shadows; slightly larger
   border radius. Both themes (`:root` and `.dark`) get updated token sets —
   the dark/light *mechanism* from the theme-switcher work is untouched,
   only the token values change.
2. **Font** — load `Plus Jakarta Sans` via `next/font/google` in
   `apps/web/src/app/layout.tsx`, apply as the base font family.
3. **New primitive components** (`apps/web/src/components/ui/`):
   - `badge.tsx` — `Badge`/`Chip` component, `cva`-based variants for
     priority (low/medium/high/critical), severity (minor/major/blocker/crash),
     ticket type (task/bug), and generic status.
   - `avatar.tsx` — initials-based `Avatar` (no image upload in this PRD —
     just a colored circle with the user's initials, deterministic color
     from their name/id). Built now so the collaborator PRD can reuse it
     for assignee/creator display without redoing this work.
4. **Redesign pages/components** (visual only, no data/logic changes):
   - `apps/web/src/app/dashboard/page.tsx` — project card grid restyled.
   - `apps/web/src/app/projects/[id]/page.tsx` — phase columns and ticket
     cards restyled, priority/severity/type spans replaced with the new
     `Badge` component.
   - `apps/web/src/components/auth/login-form.tsx`,
     `apps/web/src/components/auth/signup-form.tsx`,
     `apps/web/src/components/projects/new-project-form.tsx`,
     and the create-ticket form inside `projects/[id]/page.tsx` — inputs,
     labels, buttons restyled consistently with the new tokens.
   - `apps/web/src/components/layout/header.tsx` and `auth-header.tsx` —
     adjusted to the new palette (expected to be a light touch since they
     already consume the CSS variables rather than hardcoded colors).

## Design decisions

- **Soft & colorful over minimal or dense** — chosen direction: more
  saturated category colors, softer shadows/corners, generous whitespace —
  matches what was asked for ("modern", "enak dilihat") over a
  Linear-style dense/neutral alternative.
- **Plus Jakarta Sans over Inter or system font** — a slightly rounder,
  friendlier sans that fits the soft/colorful direction better than a
  neutral system font.
- **`Badge`/`Avatar` as new reusable primitives in `components/ui/`** —
  not one-off styling inline in each page, so the upcoming collaborator PRD
  (assignee picker, member list) can reuse them directly instead of
  redefining badge/avatar styling a second time.
- **Visual-only scope** — no new fields, no new data, no new pages. Every
  file touched keeps its existing props/behavior; only markup/className
  changes and the two new primitive components are added.
- **Collaborator/member management is explicitly a separate, later PRD** —
  keeps this PRD reviewable as a single coherent visual change rather than
  bundling an unrelated feature.

## Out of scope

- Collaborator/project member management (invite, assignee picker, roles UI) — next PRD.
- Any new page, route, or data field.
- Mobile-specific redesign (hamburger nav, etc.) beyond what the existing responsive classes already handle.
- Avatar image upload — `Avatar` in this PRD is initials-only.
- Redesigning the `ThemeSelector`/`DropdownMenu` interaction pattern itself (only its color tokens change, not its structure).

## Success criteria

- New `Badge` and `Avatar` components exist in `apps/web/src/components/ui/` and are used by the dashboard and project board pages (replacing the old inline `<span>` styling for priority/severity/type).
- Plus Jakarta Sans is loaded and visibly applied across the app.
- Dashboard, project board, all four forms, and the header all reflect the new soft/colorful token set in both light and dark theme.
- No behavioral regression: all existing flows (login, signup, create project, create ticket, theme switching, logout) still work exactly as before — this is a visual-only change.
- `pnpm lint` and `pnpm build` pass.
- Manual browser verification across the touched pages in both light and dark theme.
