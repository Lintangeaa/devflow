# ISSUES — Overview Ticket Card Enrichment

See `PRD.md` for full context and scope decisions.

## 1. API

- [x] `apps/web/src/app/api/projects/[id]/overview/route.ts`: add a
      `creatorUser` aliased join against `schema.user` on
      `schema.tickets.creatorId`, selecting `creatorName`/`creatorImage`
      (mirror `tickets/route.ts`'s existing pattern).
- [x] Same file: add the `childTaskMap`/linked-task computation (mirror
      `tickets/route.ts` ~lines 64, 104–105) so bug rows carry
      `linkedTaskId`/`linkedTaskHeadline`.
- [x] Include `bugDetails` in the row selection for bug tickets (depends on
      the `bug_details` column existing — see
      `docs/prd/todo/bug-structured-description/`).

## 2. UI

- [x] Overview card component (in
      `apps/web/src/app/projects/[id]/overview/page.tsx`): render creator
      avatar+name next to assignee.
- [x] Same file: render the "Linked → {task}" badge or "Buat Task" button
      for bug tickets, reusing `BugCard`'s existing markup/logic from
      `apps/web/src/components/tickets/bug-kanban.tsx` rather than
      duplicating it (extract a shared sub-component if practical).
- [x] Same file: render a one-line `bugDetails.scenario`/`.feature` preview
      under the headline for bugs with populated structured details; omit
      when `bugDetails` is null.

## 3. Verification (definition of done)

- [x] `pnpm --filter web lint` passes.
- [x] `pnpm build` passes.
- [x] Manual check: overview card shows creator avatar+name.
- [x] Manual check: a bug with a linked task shows the "Linked → {task}"
      badge; a bug without one shows "Buat Task".
- [x] Manual check: a bug with populated `bugDetails` shows a scenario/
      feature preview line; one without shows none.
- [x] Code review pass (per repo's `code-review-and-quality` skill).
