# Collaborators, Assignee Picker & Bug Attachments

## Context

Devflow has no way to add anyone to a project besides its creator (owner),
no way to (re)assign a ticket to a specific person, no way to upload
evidence (screenshot/video/file) for a bug, and no UI to edit a ticket at
all after it's created — only create and delete exist today. The
`project_members` table (owner/member roles) and the ticket media upload
API (`api/projects/[id]/tickets/[ticketId]/media`) already exist in the
schema/backend but have zero UI. `packages/shared` already exports a
`memberSchema` that's never been used by any route.

This PRD builds on `docs/prd/done/ui-redesign/` — the `Badge` and `Avatar`
components introduced there are reused here for member rows and assignee
display.

## Problem / Motivation

A project currently can't have more than one working member in practice:
nobody else can be added, tickets can't be assigned to anyone, and there's
no way to attach proof of a bug or to correct a ticket after creation.

## Scope

### Backend — new

1. **`api/users/search/route.ts`** — `GET ?q=` — searches registered users
   by partial, case-insensitive email match. Requires an authenticated
   session (`requireUser`); not project-scoped. Returns a capped list of
   `{ id, name, email }` — no other user fields exposed.
2. **`api/projects/[id]/members/route.ts`** —
   - `GET` — list members (any project member can view), joined with
     `user.name`/`user.email`.
   - `POST` — add an existing user as a member (`requireProjectOwner`),
     body validated with `memberSchema` (already in `packages/shared`).
3. **`api/projects/[id]/members/[userId]/route.ts`** —
   - `PATCH` — change a member's role (`requireProjectOwner`). Rejects
     demoting the project's last remaining owner.
   - `DELETE` — remove a member (`requireProjectOwner`). Rejects removing
     the last remaining owner.

### Backend — reused, no changes

- `PATCH`/`DELETE` on `api/projects/[id]/tickets/[ticketId]` (already
  supports headline/description/priority/severity/phaseId/status/
  assigneeId via `ticketUpdateSchema`).
- `POST`/`GET` on `api/projects/[id]/tickets/[ticketId]/media` (already
  enforces the 50MB size limit and image/video MIME allowlist).

### Frontend — new

4. **`components/projects/members-modal.tsx`** — triggered by a new
   "Members" button in the project board header (next to Export
   Excel/+Bug/+Task). Lists members (`Avatar` + name/email + role `Badge`),
   a search-by-email box to add an existing user, a role dropdown per row
   (owner-only, disabled for the current sole owner), and a remove button
   (owner-only, disabled for the current sole owner).
5. **`components/tickets/ticket-detail-modal.tsx`** — opens when a ticket
   card is clicked. Full edit form for headline/description/priority/
   severity/phaseId/status (submits via the existing `PATCH` ticket
   route), an assignee picker (dropdown sourced from the project's member
   list), an attachment section (grid of uploaded media with
   image/video preview, an upload control using the existing media
   `POST` route), and a delete button (existing `DELETE` route,
   confirmation before submitting).
6. Assignee picker also added to the existing `CreateTicketForm` (same
   member-list data source as the detail modal).
7. `apps/web/src/app/projects/[id]/page.tsx` — ticket cards become
   clickable (open `TicketDetailModal`); a `useMembers`-style fetch is
   added alongside the existing project/tickets fetch.

## Design decisions

- **Add member = search + add existing user, no email invite** — no
  SMTP/pending-invite infra exists in this repo; adding this would be a
  separate, larger initiative.
- **Owner can promote/demote member↔owner and remove anyone, except the
  last remaining owner** — every project must keep at least one owner, so
  demoting/removing the sole owner is rejected by the API (403/409), not
  just hidden in the UI.
- **User search by partial email only** — email is the reliable, unique
  identifier; excludes users who are already members of the project.
- **`TicketDetailModal` is a full edit form, not just assignee+attachment**
  — since no ticket-edit UI exists at all today, building the assignee
  picker and attachment gallery as part of a real edit modal (reusing the
  already-existing `PATCH ticketUpdateSchema` surface) avoids a second,
  narrower "just these two fields" modal that would need replacing later.
- **Members management via modal, not a separate route** — consistent
  with the existing `NewProjectForm` modal pattern; a project's member
  count is expected to stay small enough that a modal list is sufficient.
- **Reuse `Badge`/`Avatar` from `ui-redesign`** — member rows and assignee
  display use the same primitives already styled for the rest of the app.

## Out of scope

- Comments on tickets — separate future PRD.
- Email-based invites with a pending/accepted state.
- Avatar image upload — still initials-only (from `ui-redesign`).
- Activity log / audit trail UI (the `activities` table exists but stays
  unused here).
- Bulk member or ticket actions.

## Success criteria

- A project owner can search for a registered user by email, add them as
  a member, change any member's role, and remove a member — with the
  last remaining owner protected from demotion/removal (API rejects it,
  UI reflects the constraint).
- An assignee can be picked from the real member list both when creating
  a ticket and from the ticket detail modal, and shows up on the board
  via `Avatar` + name (already wired from `ui-redesign`).
- Clicking a ticket card opens `TicketDetailModal`; editing any field and
  saving persists via the existing `PATCH` route and is reflected on the
  board after close.
- Uploading an image or video in the ticket detail modal succeeds and
  appears in the attachment gallery; rejected files (wrong type/too large)
  show a clear error, matching the existing server-side constraints.
- Deleting a ticket from the modal removes it from the board.
- `pnpm lint` and `pnpm build` pass.
- Manual browser verification of the full flow: add member → assign
  ticket → open ticket → edit fields → upload attachment → delete ticket.
