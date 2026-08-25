# ISSUES — Comment Mentions & In-App Notifications

See `PRD.md` for full context and scope decisions.

## 1. Comments API Endpoints

- [x] Create `apps/web/src/app/api/projects/[id]/tickets/[ticketId]/comments/route.ts`:
  - `GET`: Fetch comments for `ticketId` joined with `schema.user` (`name`, `image`), ordered by `createdAt asc`.
  - `POST`: Validate with `commentSchema`, insert into `schema.comments`, parse mentioned user IDs, and dispatch `createNotification()` for mentioned users as well as the ticket's assignee/creator.
- [x] Create `apps/web/src/app/api/projects/[id]/tickets/[ticketId]/comments/[commentId]/route.ts`:
  - `DELETE`: Delete comment if requester is author (`comment.userId === user.id`) or project owner.

## 2. Mention Parser & Notification Dispatch

- [x] Add mention parsing helper in `apps/web/src/lib/notifications.ts` (e.g. `parseMentions(body: string): string[]`).
- [x] Trigger `"mentioned"` notifications: `"User X me-mention Anda di tiket: [Headline]"`.
- [x] Trigger `"comment"` notifications for assignee & creator if not already notified.

## 3. UI Discussion Feed in `TicketDetailModal`

- [x] Create `CommentSection` component (or integrate into `TicketDetailModal`):
  - Load comments from `GET /api/projects/[id]/tickets/[ticketId]/comments`.
  - Render list of comments with author avatar, name, relative time, delete action, and styled mention pills.
  - Textarea input with `@` autocomplete menu showing project members.
  - Submit comment and refresh comment list.

## 4. Verification (definition of done)

- [x] `pnpm --filter web lint` passes.
- [x] `pnpm build` passes.
- [x] Manual check: post a comment with `@member`, confirm live notification is pushed via WebSocket.
- [x] Manual check: verify delete permission (author vs non-author).
- [x] Code review pass (per repo's `code-review-and-quality` skill).
