# ISSUES — Kanban Drag-and-Drop

See `PRD.md` for full context and scope decisions.

## 1. Dependencies

- [x] Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` to
      `apps/web/package.json`.

## 2. Database

- [x] Add `position` integer column (nullable-false, default `0`) to
      `tickets` table in `packages/db/src/schema.ts`.
- [x] Generate migration: `pnpm db:generate`.
- [x] Apply migration locally: `pnpm db:migrate`.

## 3. Shared validation

- [x] Add `position: z.number().int().optional()` to `ticketUpdateSchema` in
      `packages/shared/src/index.ts`.

## 4. API route

- [x] `apps/web/src/app/api/projects/[id]/tickets/[ticketId]/route.ts`:
      accept `position` in the PATCH body and write it to
      `schema.tickets.position`.
- [x] Confirm existing `phaseId` update path already works for the Task
      board drag case (it's already in `ticketUpdateSchema` — verify the
      route handler writes it, since prior behavior only exercised this via
      the form).
- [x] Keep the existing auto-sync behavior (task `status === "done"` with a
      `parentId` auto-resolves the parent bug) unchanged — the Task board
      drag handler just needs to include `status: "done"` in its PATCH body
      when dropping into the last phase, reusing this logic rather than
      duplicating it.
- [x] List/GET endpoints that return tickets for the boards: order results by
      `position` (per relevant grouping) so initial render matches the last
      saved drag order.

## 5. Bug Kanban component

- [x] `apps/web/src/components/tickets/bug-kanban.tsx`: wrap columns/cards
      with `@dnd-kit` `DndContext` + `SortableContext` per column.
- [x] On drag end:
  - Cross-column drop → PATCH `status` (+ recomputed `position` for
    affected cards).
  - Same-column reorder → PATCH `position` for affected cards.
- [x] Optimistic local state update on drop; roll back on PATCH failure
      (surface an error, e.g. existing toast pattern if one exists in the
      codebase, otherwise a minimal inline error).
- [x] Verify behavior identically on both consuming pages (`bugs/page.tsx`
      and `ticket/page.tsx`), since they share this component.

## 6. Task board component

- [x] `apps/web/src/app/projects/[id]/board/page.tsx`: wrap phase columns
      with `@dnd-kit` `DndContext` + `SortableContext` per column.
- [x] On drag end:
  - Cross-phase drop → PATCH `phaseId` (+ `status: "done"` if destination is
    the last phase in the project's phase order) (+ recomputed `position`).
  - Same-phase reorder → PATCH `position` for affected cards.
- [x] Optimistic local state update on drop; roll back on PATCH failure.

## 7. Verification (definition of done)

- [x] `pnpm --filter web lint` passes.
- [x] `pnpm --filter @devflow/shared lint` passes.
- [x] `pnpm build` passes.
- [x] Manual browser check: drag a bug card across status columns on both
      bug pages, confirm persistence after reload.
- [x] Manual browser check: drag a task card across phase columns, confirm
      `phaseId` updates and last-phase auto-`done` (+ parent bug auto-resolve
      where applicable) works.
- [x] Manual browser check: reorder cards within a column on both board
      types, confirm order persists after reload.
- [x] Manual browser check: simulate a failed PATCH (e.g. offline) and
      confirm the UI rolls back the card to its previous position.
- [x] Code review pass (per repo's `code-review-and-quality` skill).
