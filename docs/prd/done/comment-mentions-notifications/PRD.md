# PRD — Comment Mentions & In-App Notifications

## Context

The `comments` table (`packages/db/src/schema.ts:128-140`) already exists in the database schema with columns `id`, `ticketId`, `userId`, `body`, and `createdAt`. However, there are currently no API routes under `/api/projects/[id]/tickets/[ticketId]/comments` and no comment discussion UI in `TicketDetailModal` (`apps/web/src/components/tickets/ticket-detail-modal.tsx`).

With the recent completion of the `in-app-notifications` WebSocket infrastructure (`packages/db/src/schema.ts`, `apps/web/src/lib/notifications.ts`, `apps/web/src/lib/ws-hub.ts`, and `NotificationBell`), we now have the foundation to support interactive discussions on tickets with real-time mention alerts.

## Problem / Motivation

Team members cannot communicate or ask questions directly inside a ticket. Furthermore, developers and QA leads cannot call each other's attention to specific issues (e.g. asking for clarification on steps to reproduce, or notifying a developer of a re-test result) without leaving the platform.

## Scope

### 1. Comments API Routes
Create `apps/web/src/app/api/projects/[id]/tickets/[ticketId]/comments/route.ts`:
- **`GET`**:
  - Gated by `requireProjectMember(id)`.
  - Fetch all comments for `ticketId` joined with `schema.user` (`name`, `image`, `email`), ordered chronologically ascending (`createdAt asc`).
- **`POST`**:
  - Gated by `requireProjectMember(id)`.
  - Validate body with `@devflow/shared` `commentSchema` (`body` string min 1, max 5000).
  - Insert comment into `schema.comments`.
  - **Mention Parser & Notification Dispatch**:
    - Extract mentioned user IDs from the comment body (syntax: `@[User Name](userId)` or `@userId`).
    - Query ticket details to identify the ticket's `assigneeId` and `creatorId`.
    - For each mentioned user (excluding the comment author): dispatch an in-app notification with `type: "mentioned"` and message `"User X me-mention Anda di tiket: [Headline]"`.
    - For the ticket `assigneeId` and `creatorId` (if they were not already notified via mention and are not the comment author): dispatch an in-app notification with `type: "comment"` and message `"User X berkomentar di tiket: [Headline]"`.
    - Deliver notifications via `createNotification()` which broadcasts in real-time over WebSocket.

Create `apps/web/src/app/api/projects/[id]/tickets/[ticketId]/comments/[commentId]/route.ts`:
- **`DELETE`**:
  - Gated by `requireProjectMember(id)`.
  - Allow deletion only if the requester is the comment author (`userId === user.id`) or a project `owner`.
  - Return `204 No Content`.

### 2. Comment Thread UI in `TicketDetailModal`
In `apps/web/src/components/tickets/ticket-detail-modal.tsx`:
- Add a new "Aktivitas & Komentar" / "Komentar" section at the bottom of the modal content.
- Display a feed of comments with:
  - Author Avatar (`Avatar` component).
  - Author Name and formatted relative timestamp (`timeAgo`).
  - Delete button (`Trash2` icon) visible only to the comment author or project owner.
  - Formatted message body where `@mentions` are rendered as highlighted badge/pills (`bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded`).
- Comment input box:
  - Textarea with dynamic auto-resize.
  - Autocomplete dropdown popover when typing `@`: lists project members matching the typed query. Selecting a member inserts `@[Name](userId)` into the text.
  - Submit button with loading state.

## Out of scope

- Rich-text / WYSIWYG formatting toolbar (plain text with markdown/mention syntax is sufficient).
- Editing existing comments (comments can be deleted and re-posted to preserve discussion integrity).
- File attachments inside individual comments (ticket-level attachments already cover media needs).

## Success criteria

- Users can post comments on any task or bug ticket.
- Typing `@` displays an autocomplete list of project members.
- Posting a comment with `@member` sends a real-time WebSocket notification to the mentioned user.
- The ticket assignee and creator receive a comment notification if someone else comments on their ticket.
- Comments can be deleted by their author or the project owner.
- `pnpm lint` and `pnpm build` pass.

## Definition of done

- [ ] `pnpm --filter web lint` passes.
- [ ] `pnpm build` passes.
- [ ] Manual check: post a comment with `@member`, confirm the mentioned user receives a live notification.
- [ ] Manual check: confirm assignee and creator receive comment notifications.
- [ ] Manual check: delete a comment as author and verify it disappears from the list.
