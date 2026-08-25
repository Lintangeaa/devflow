# PRD — Collapsible App Sidebar & Unified App Shell

## Context

Devflow's current UI layout suffers from fragmented navigation:
- A horizontal top header (`apps/web/src/components/layout/header.tsx`) takes up 56px vertical space across all authenticated pages.
- When navigating inside a project (`/projects/[id]/*`), the user sees both the top header and a static left sidebar (`apps/web/src/components/layout/project-sidebar.tsx`), cramping the kanban boards and overview charts.
- There is no easy workspace/project switcher, no quick access to global personal tasks, and the layout looks dated compared to modern developer platforms (such as Linear, GitHub, and Jira).

To solve this, we are overhauling the navigation into a sleek, unified **Collapsible App Sidebar (`AppSidebar`)** with an icon rail mode, contextual project navigation, quick project switcher, profile popover in the footer, and a minimal top breadcrumb bar with notification bell.

## Goals & Decisions

1. **Collapsible Icon Rail Mode**:
   - Expanded width: `w-64` (256px) displaying logo, project switcher, section headers, menu labels, and badges.
   - Collapsed width: `w-16` (64px) displaying icons only with tooltips on hover.
   - Shortcut key: `Cmd + B` / `Ctrl + B` toggles sidebar state.
   - Persistence: Preserves expanded/collapsed preference in `localStorage` (`devflow:sidebar-collapsed`).
   - Mobile: Responsive sliding drawer with backdrop overlay triggered via topbar hamburger icon.

2. **Unified Navigation Structure**:
   - **Sidebar Header**:
     - Devflow logo + name.
     - Project Switcher dropdown: lists user's projects with quick search and active project selection.
     - Toggle collapse button (`PanelLeftClose` / `PanelLeftOpen`).
   - **Global Menu Section**:
     - 📁 **Projects** (`/projects`)
     - 📌 **My Tasks** (`/my-tasks` — placeholder ready for the personal dashboard feature)
   - **Contextual Project Section** (active when URL matches `/projects/[id]/*`):
     - Active project indicator badge.
     - 📊 **Overview** (`/projects/[id]/overview`)
     - 📋 **Board** (`/projects/[id]/board`)
     - 🐛 **Bugs** (`/projects/[id]/bugs`)
     - 🔥 **Ticket** (`/projects/[id]/ticket`)
     - 👥 **Members** (modal trigger)
     - 📥 **Export Excel** (direct download action)
   - **Sidebar Footer**:
     - User Profile section (Avatar, Name, Email) with popover dropdown containing:
       - Theme Selector (`ThemeSelector`)
       - Sign Out button
   - **Minimal TopBar (`AppHeader` / Breadcrumb Bar)**:
     - Breadcrumb navigation trail (`Devflow / Projects / [Project Name] / [Current Page]`).
     - Mobile menu trigger.
     - Real-time `NotificationBell`.

3. **Legacy Cleanup**:
   - Retire the old horizontal `Header` component and old standalone `ProjectSidebar`.
   - Wrap authenticated routes with the clean `AppShell` container.

## Out of Scope

- Implementing the full `/my-tasks` personal dashboard logic (a separate PRD will cover that; the sidebar only provides the navigation link and route placeholder).
- Database schema changes.

## Definition of Done

- [ ] `SidebarProvider` / Context created for managing expanded/collapsed state, mobile drawer open state, and keyboard shortcuts (`Cmd+B`).
- [ ] `AppSidebar` component built with expanded & collapsed icon-rail modes, project switcher dropdown, and footer profile popover.
- [ ] Minimal `TopBar` / Breadcrumb header built with breadcrumbs and `NotificationBell`.
- [ ] Unified `AppShell` layout integrated across `/projects`, `/projects/[id]/*`, and `/my-tasks`.
- [ ] Responsive mobile drawer and backdrop tested.
- [ ] `pnpm lint` passes with 0 errors across all packages.
- [ ] `pnpm build` passes with 0 errors across all packages.
- [ ] Code review pass (per repo's `code-review-and-quality` skill).
