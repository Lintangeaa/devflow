# ISSUES — Bug Description as Structured JSON

See `PRD.md` for full context and scope decisions.

## 1. Database

- [x] Add `bug_details` jsonb column (nullable) to `tickets` table in
      `packages/db/src/schema.ts`, typed as
      `{ feature, devices, scenario, given, when, then, output } | null`.
- [x] Generate migration: `pnpm db:generate`.
- [x] Apply migration locally: `pnpm db:migrate`.

## 2. One-time data migration script

- [x] Write a one-off script (e.g. `packages/db/scripts/backfill-bug-details.ts`
      or similar) that:
  - Reads all `bug`-type tickets.
  - Runs `parseStructuredDescription(ticket.description)` from
    `apps/web/src/components/tickets/structured-description.ts` against
    each (or a copy of that logic if cross-package import is awkward).
  - Writes the parsed result into `bug_details` where parsing succeeds;
    leaves `bug_details` as `null` otherwise.
- [x] Run the script against local/dev data and spot-check results.
- [x] After the migration has run, delete
      `serializeStructuredDescription`/`parseStructuredDescription` (and the
      file if nothing else imports it) once nothing in the ongoing app code
      path depends on them.

## 3. Shared validation (`packages/shared/src/index.ts`)

- [x] Add `bugDetailsSchema`: object with `feature, devices, scenario,
      given, when, then, output` all required non-empty strings.
- [x] Add `bugDetails: bugDetailsSchema.optional().nullable()` to
      `ticketSchema`.
- [x] Extend the existing `superRefine` (the one enforcing `severity` for
      bugs) to also require a fully-populated `bugDetails` when
      `type === "bug"`, raising issues at `path: ["bugDetails", "<field>"]`.

## 4. API routes

- [x] Ticket create route: accept `bugDetails` in the body, write to
      `schema.tickets.bugDetails`.
- [x] `apps/web/src/app/api/projects/[id]/tickets/[ticketId]/route.ts`
      (PATCH): accept `bugDetails` in the body, write to
      `schema.tickets.bugDetails`. Since `ticketUpdateSchema` has no
      type-aware refine, add a handler-level check: when the existing
      ticket's `type === "bug"` and `bugDetails` is present in the request
      body, validate it against `bugDetailsSchema` before writing.

## 5. UI — create form

- [x] `apps/web/src/components/tickets/create-ticket-form.tsx`: bind the
      existing 7-field bug inputs directly to a `bugDetails` object; remove
      the `serializeStructuredDescription` call and stop sending a
      serialized string as `description` for bugs. POST `bugDetails`
      instead.

## 6. UI — detail/edit modal

- [x] `apps/web/src/components/tickets/ticket-detail-modal.tsx`: for bug
      tickets, always render the 7-field structured editor bound to
      `ticket.bugDetails` (default to empty strings when `null`).
- [x] Remove the free-text `<textarea>` fallback for bugs and the "Beralih
      ke Format 7 Field" toggle button — no more branching on whether the
      old description parsed successfully.
- [x] On save, send `bugDetails` in the PATCH body instead of a serialized
      `description` string.

## 7. Export

- [x] `apps/web/src/app/api/projects/[id]/export/route.ts`: for bug rows,
      format `bug_details`'s 7 fields into the single "Description" column
      as multi-line text (reimplement the old serialize format locally in
      the export route). Task rows keep using `description` unchanged.

## 8. Verification (definition of done)

- [x] `pnpm --filter web lint` passes.
- [x] `pnpm --filter @devflow/shared lint` passes.
- [x] `pnpm build` passes.
- [x] Manual browser check: create a new bug, confirm all 7 fields are
      required and persist correctly.
- [x] Manual browser check: edit an existing (migrated) bug, confirm the
      structured form loads with correct values and no textarea/toggle is
      present.
- [x] Manual browser check: edit an existing bug whose `bug_details` is
      `null` (unmigrated/legacy), confirm the form renders empty and
      required rather than crashing.
- [x] Run the backfill script against dev data and confirm parsed bugs get
      `bug_details` populated correctly, non-conforming ones stay `null`.
- [x] Export a project's `.xlsx` and confirm the Description column reads
      correctly for both task and bug rows.
- [x] Code review pass (per repo's `code-review-and-quality` skill).
