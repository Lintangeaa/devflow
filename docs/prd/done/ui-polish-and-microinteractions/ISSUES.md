# ISSUES — UI Polish & Micro-Interactions

See `PRD.md` for full context and scope decisions.

## 1. Toast Notification System (`sonner`)

- [x] Install `sonner` in `apps/web`.
- [x] Mount `<Toaster />` in `apps/web/src/app/layout.tsx`.
- [x] Add toast triggers to ticket operations (create, update, delete, status drag-and-drop).
- [x] Add toast triggers to comment operations (submit, delete).
- [x] Add toast triggers to notifications and export downloads.

## 2. Kanban Card Meta Badges

- [x] Update `GET /api/projects/[id]/tickets/route.ts` to include `commentCount` and `mediaCount` for each ticket.
- [x] Update `TaskCard` in `apps/web/src/app/projects/[id]/board/page.tsx` with comment and attachment badges.
- [x] Update `BugCard` in `apps/web/src/components/tickets/bug-kanban.tsx` with comment and attachment badges.

## 3. Skeleton Shimmer Loaders

- [x] Create `apps/web/src/components/ui/skeleton.tsx` (base primitive and composite skeletons).
- [x] Integrate skeleton loaders in `/projects/[id]/board/page.tsx`.
- [x] Integrate skeleton loaders in `/projects/[id]/bugs/page.tsx` and `bug-kanban.tsx`.
- [x] Integrate skeleton loaders in `/projects/[id]/overview/page.tsx`.
- [x] Integrate skeleton loaders in `/projects/page.tsx`.

## 4. Reusable `EmptyState` Component

- [x] Create `apps/web/src/components/ui/empty-state.tsx`.
- [x] Use `EmptyState` in board views when no tickets match filters or exist.
- [x] Use `EmptyState` in project list when no projects exist.

## 5. Verification (definition of done)

- [x] `pnpm --filter web lint` passes.
- [x] `pnpm build` passes.
- [x] Manual check: verify sonner toasts on interactive actions.
- [x] Manual check: verify comment and media count badges on cards.
- [x] Manual check: verify skeleton loaders on board, bugs, and overview.
- [x] Code review pass (per repo's `code-review-and-quality` skill).
