# PRD — UI Polish & Micro-Interactions

## Context

Devflow now possesses a complete core feature loop: multi-phase task boards, 6-stage QA bug kanban, structured bug scenarios, media proxy streaming, real-time WebSocket in-app notifications, ticket discussion threads with @mentions, and instant filter toolbars.

To elevate the application from a functional internal tool to a delightful, commercial-grade product (similar to Linear and Raycast), this milestone focuses on tactile feedback, visual richness, smooth loading states, and descriptive empty states.

## Problem / Motivation

1. **Lack of Instant Feedback**: User actions (saving ticket updates, submitting comments, exporting files) currently rely on modal dismissals or silent reloads without crisp toast feedback.
2. **Missing Context on Cards**: Users cannot see whether a card has active discussion comments or screenshot/video attachments without opening the modal.
3. **Rough Loading Transitions**: Page transitions between Overview, Board, and Bug views show blank states or simple text spinners rather than structured skeleton layouts.
4. **Sparse Empty States**: Empty board columns or empty projects lists lack engaging illustrations or quick-action calls-to-action (CTAs).

## Scope

### 1. Modern Toast Notifications with `sonner`
- Add `sonner` to `apps/web/package.json`.
- Mount `<Toaster position="bottom-right" richColors theme="system" />` in `apps/web/src/app/layout.tsx`.
- Connect toast feedback across interactive operations:
  - Ticket created / updated / deleted: `toast.success(...)`.
  - Comment posted / deleted: `toast.success(...)`.
  - Filter reset / all notifications marked read: `toast.success(...)`.
  - Export download started / failed: `toast.success(...)` / `toast.error(...)`.

### 2. Kanban Card Meta Badges (Comment & Media Counts)
- Update `GET /api/projects/[id]/tickets` (`apps/web/src/app/api/projects/[id]/tickets/route.ts`):
  - Add subquery/count aggregation for `commentCount` (from `schema.comments`) and `mediaCount` (from `schema.media`).
- Update `TicketWithMeta` type in `apps/web/src/components/tickets/ticket-detail-modal.tsx`:
  - `commentCount?: number; mediaCount?: number;`
- Update `TaskCard` (`apps/web/src/app/projects/[id]/board/page.tsx`) and `BugCard` (`apps/web/src/components/tickets/bug-kanban.tsx`):
  - Render mini badges in the card footer:
    - If `commentCount > 0`: `<MessageSquare className="h-3 w-3" /> {commentCount}`
    - If `mediaCount > 0`: `<Paperclip className="h-3 w-3" /> {mediaCount}`

### 3. Skeleton Shimmer Loaders
- Create `apps/web/src/components/ui/skeleton.tsx` (or skeleton helper components):
  - `SkeletonBoard`: 4 to 6 column placeholders with shimmering card blocks.
  - `SkeletonOverview`: KPI stat cards, distribution charts, and in-progress card shimmer blocks.
  - `SkeletonProjects`: Project card shimmer blocks.
- Integrate skeleton loaders into:
  - `/projects` (Project list page)
  - `/projects/[id]/overview` (Project Overview page)
  - `/projects/[id]/board` (Task Board page)
  - `/projects/[id]/bugs` & `/projects/[id]/ticket` (Bug Kanban page)

### 4. Comprehensive `EmptyState` Component
- Create reusable `apps/web/src/components/ui/empty-state.tsx`:
  - Icon with rounded background accent.
  - Title & descriptive helper message.
  - Optional CTA action button (`title`, `icon`, `onClick`).
- Integrate into empty columns, empty project list, and empty ticket search results.

## Out of scope

- Complex sound effects or haptic feedback.
- Dark mode redesign (the current semantic color token setup is preserved and complemented).

## Success criteria

- Toast notifications smoothly pop up in the bottom-right on user actions with dark/light theme adaptation.
- Kanban cards display comment count and attachment count badges when non-zero.
- Page navigation displays shimmering skeleton layouts before content renders.
- Empty states present clean icons with actionable CTA buttons.
- `pnpm lint` and `pnpm build` pass.

## Definition of done

- [ ] `pnpm --filter web lint` passes.
- [ ] `pnpm build` passes.
- [ ] Manual check: verify toast notifications on create, update, comment, and export.
- [ ] Manual check: verify comment & media count badges on cards.
- [ ] Manual check: verify skeleton loading shimmer on overview, board, and bugs.
- [ ] Code review pass (per repo's `code-review-and-quality` skill).
