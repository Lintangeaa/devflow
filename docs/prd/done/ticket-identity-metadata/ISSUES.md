# ISSUES — Ticket Identity Metadata (Creator, Dates)

See `PRD.md` for full context and scope decisions.

## 1. API — tickets list route

- [x] `apps/web/src/app/api/projects/[id]/tickets/route.ts` (GET): add a
      second aliased join against `schema.user` (e.g. `alias(schema.user,
      "creator")`) on `schema.tickets.creatorId`, selecting `creatorName` /
      `creatorImage` onto each returned row, mirroring the existing
      `assigneeName` join.
- [x] Confirm `resolvedAt` is included in this route's `select` — add it if
      missing.

## 2. Detail modal

- [x] `apps/web/src/components/tickets/ticket-detail-modal.tsx`: extend
      `TicketWithMeta` type to add `creatorId`, `creatorName`, `resolvedAt`.
- [x] Add a read-only metadata section (not part of the editable form)
      showing: creator avatar+name, created date, last-updated date, and
      resolved date (only rendered when `resolvedAt` is non-null).
- [x] If `creatorName` isn't present on the ticket object passed in, fall
      back to resolving `creatorId` against the existing `members` prop the
      same way `assigneeOptions` does.
- [x] Format timestamps consistently with however dates are already
      formatted elsewhere in this file (reuse existing date formatting
      utility/pattern if one exists in the component).

## 3. Kanban cards

- [x] `apps/web/src/components/tickets/bug-kanban.tsx` (`BugCard`): add a
      small avatar + creator name next to the existing assignee avatar,
      sourced from the `creatorName`/`creatorImage` fields now returned by
      the list API.
- [x] `apps/web/src/app/projects/[id]/board/page.tsx` (task card): same
      addition for the task board card.

## 4. Export

- [x] `apps/web/src/app/api/projects/[id]/export/route.ts`: extend the
      export query with the same aliased `creator` join used in the list
      route (or reuse a shared query helper if one exists) and add a
      `Creator` column.
- [x] Add a `Resolved` column populated from `resolvedAt` (blank when null).

## 5. Verification (definition of done)

- [x] `pnpm --filter web lint` passes.
- [x] `pnpm --filter @devflow/shared lint` passes.
- [x] `pnpm build` passes.
- [x] Manual browser check: open the detail modal for a task and a bug,
      confirm creator/created/updated/resolved render correctly (resolved
      only shown when applicable).
- [x] Manual browser check: confirm creator avatar+name appears on cards in
      both the Task board and Bug Kanban (both pre-production and
      production bug pages).
- [x] Generate an `.xlsx` export and confirm `Creator` and `Resolved`
      columns are populated correctly.
- [x] Code review pass (per repo's `code-review-and-quality` skill).
