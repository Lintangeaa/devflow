# Collaborators, Assignee Picker & Bug Attachments — Issues

See `PRD.md` for context, scope, and design decisions.

## Backend

- [x] `apps/web/src/app/api/users/search/route.ts` — `GET ?q=`, `requireUser`, case-insensitive partial email match, returns capped `{ id, name, email }[]`.
- [x] `apps/web/src/app/api/projects/[id]/members/route.ts` — `GET` (any member, joined with `user.name`/`user.email`), `POST` (`requireProjectOwner`, `memberSchema` from `@devflow/shared`, rejects if the user is already a member).
- [x] `apps/web/src/app/api/projects/[id]/members/[userId]/route.ts` — `PATCH` (role change, `requireProjectOwner`, rejects demoting the last owner), `DELETE` (`requireProjectOwner`, rejects removing the last owner).

## Frontend — members

- [x] `apps/web/src/components/projects/members-modal.tsx` — member list (`Avatar` + name/email + role `Badge`), email search-and-add, per-row role dropdown, remove button; owner-only mutation controls, disabled on the sole remaining owner's row.
- [x] `apps/web/src/app/projects/[id]/page.tsx` — add "Members" button to the board header, wired to `MembersModal`.

## Frontend — ticket detail & assignee

- [x] `apps/web/src/components/tickets/ticket-detail-modal.tsx` — full edit form (headline, description, priority, severity, phaseId, status) submitting via the existing `PATCH` ticket route; assignee picker sourced from project members; attachment section (grid with preview, upload via existing media `POST` route, list via existing media `GET` route); delete button (existing `DELETE` route) with confirmation.
- [x] `apps/web/src/app/projects/[id]/page.tsx` — fetch project members alongside project/tickets; make ticket cards clickable to open `TicketDetailModal`; refresh board data after modal edits/delete.
- [x] `apps/web/src/app/projects/[id]/page.tsx` (`CreateTicketForm`) — add assignee picker, same member-list data source as the detail modal.

## Definition of done

- [x] `pnpm lint` passes.
- [x] `pnpm build` passes.
- [x] Manual browser verification: add member (search by email) → change role → verify last-owner protection (attempt to demote/remove sole owner is rejected) → assign ticket on create → open existing ticket, edit fields, save → upload an image and a video attachment, verify gallery → attempt an oversized/wrong-type upload, verify rejection → delete a ticket from the modal.
- [x] Code review pass (`reviewer` agent / `code-review-and-quality` skill) before considering this done.
