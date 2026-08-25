# ISSUES — Collapsible App Sidebar & Unified App Shell

See `PRD.md` for full context and UI specifications.

## 1. Sidebar State Management & Context

- [x] Create `apps/web/src/components/layout/sidebar-context.tsx`:
  - `isCollapsed` state with `localStorage` persistence (`devflow:sidebar-collapsed`).
  - `isMobileOpen` state for mobile drawer toggle.
  - Keyboard shortcut listener for `Cmd + B` / `Ctrl + B`.
  - Export custom hook `useSidebar()`.

## 2. Build Sidebar Components

- [x] Create `apps/web/src/components/layout/project-switcher.tsx`:
  - Dropdown menu showing current project and list of user projects for fast switching.
  - Option to create a new project directly from the switcher.
- [x] Create `apps/web/src/components/layout/user-profile-menu.tsx`:
  - Displays user avatar, name, and email in footer.
  - Popover dropdown containing Theme selector (`ThemeSelector`) and Logout action.
- [x] Create `apps/web/src/components/layout/app-sidebar.tsx`:
  - Header: Logo, Project Switcher, collapse toggle button (`PanelLeftClose` / `PanelLeftOpen`).
  - Global navigation items: Projects (`/projects`), My Tasks (`/my-tasks`).
  - Contextual project navigation (when on `/projects/[id]/*`): Overview, Board, Bugs, Ticket, Members Modal trigger, Excel Export trigger.
  - Tooltips for icon-only rail mode when collapsed.
  - Mobile drawer wrapper with slide-in animation and backdrop overlay.

## 3. Minimal TopBar & App Shell

- [x] Create `apps/web/src/components/layout/app-topbar.tsx`:
  - Breadcrumb navigation (`Devflow / Projects / [Project Name] / [Current Page]`).
  - Mobile hamburger menu trigger.
  - Right-aligned `NotificationBell`.
- [x] Create `apps/web/src/components/layout/app-shell.tsx`:
  - Wraps children with `AppSidebar`, `AppTopBar`, and responsive main content viewport (`flex h-screen overflow-hidden`).
- [x] Create placeholder page for `/my-tasks` (`apps/web/src/app/my-tasks/page.tsx`).

## 4. Refactor Existing Layouts & Cleanup

- [x] Update `apps/web/src/app/projects/page.tsx` to use `AppShell`.
- [x] Update `apps/web/src/app/projects/[id]/layout.tsx` to use `AppShell` and remove legacy top-bar & `ProjectSidebar`.
- [x] Remove deprecated `apps/web/src/components/layout/header.tsx` and `apps/web/src/components/layout/project-sidebar.tsx`.

## 5. Verification (definition of done)

- [x] Test expanded (`w-64`) and collapsed (`w-16`) icon rail modes.
- [x] Test `Cmd + B` / `Ctrl + B` keyboard shortcut.
- [x] Test mobile drawer behavior on small viewports.
- [x] Test navigation transitions between global `/projects` and contextual `/projects/[id]/*`.
- [x] `pnpm lint` passes with 0 errors.
- [x] `pnpm build` passes with 0 errors.
- [x] Code review pass (per repo's `code-review-and-quality` skill).
