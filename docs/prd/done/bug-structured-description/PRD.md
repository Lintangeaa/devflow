# PRD — Bug Description as Structured JSON

## Context

Bug tickets already follow a de-facto 7-field structure — Feature, Devices,
Scenario, Given, When, Then, Output (a Gherkin-style BDD shape) — but it is
not enforced by the schema. Today:

- `packages/db/src/schema.ts:94` — `tickets.description` is a plain nullable
  `text` column, shared by both `task` and `bug` types.
- `apps/web/src/components/tickets/structured-description.ts` serializes the
  7 fields into a single `**Label**: value` markdown blob
  (`serializeStructuredDescription`) and parses it back out with a regex
  (`parseStructuredDescription`, returns `null` if any of the 7 labeled
  sections is missing).
- `create-ticket-form.tsx` requires all 7 fields client-side for new bugs,
  then serializes to markdown text before POSTing as `description`.
- `ticket-detail-modal.tsx` tries to parse `ticket.description` on load; if
  parsing fails (legacy/non-conforming data), it silently falls back to a
  free-text `<textarea>` with a manual "Beralih ke Format 7 Field" toggle.
- `packages/shared/src/index.ts` validates `description` as a flat
  `z.string().max(5000)` — the 7-field shape is not represented at the
  validation layer at all.

This means the "structure" only exists as a markdown convention + a
best-effort regex parser, which can silently degrade to plain text and is
not locked by the schema or API validation.

## Problem / Motivation

The current markdown-serialize/regex-parse round trip is fragile: any
description that doesn't exactly match the expected markdown shape falls
back to a free-text textarea with no structure at all, defeating the intent
of the 7-field format. The description field should be locked to a real
JSON shape so the structure can't silently degrade.

## Scope

Applies to **bug tickets only** — `task` tickets keep the existing plain
`description` text column and UI unchanged.

### 1. Database
- Add a new nullable `bug_details` `jsonb` column to `tickets`
  (`packages/db/src/schema.ts`, pattern-matching the existing
  `tags: jsonb(...).$type<string[]>()` column), typed as:
  ```ts
  interface BugDetails {
    feature: string; devices: string; scenario: string;
    given: string; when: string; then: string; output: string;
  }
  ```
- The existing `description` text column is unchanged and kept for `task`
  tickets; for `bug` tickets it becomes legacy/unused going forward (old
  values are not deleted).
- Drizzle migration generated via `pnpm db:generate` / applied via
  `pnpm db:migrate`.

### 2. One-time data migration
- A one-off script that reads all `bug`-type tickets, runs the existing
  `parseStructuredDescription(ticket.description)` against each, and writes
  the result into `bug_details` where parsing succeeds.
- Bugs whose old `description` doesn't match the 7-field markdown shape are
  left with `bug_details = null` — no attempt to guess/backfill partial
  data. These show as an empty structured form the user fills in manually
  (see UI section).
- This script is a one-time backfill, not part of the ongoing app code path
  — `parseStructuredDescription`/`serializeStructuredDescription` are not
  needed anywhere else after this point and can be deleted from
  `structured-description.ts` once the migration has run (or the whole file
  removed if nothing else imports it).

### 3. Shared validation (`packages/shared/src/index.ts`)
- Add a `bugDetailsSchema` (object, all 7 fields required non-empty
  strings).
- In `ticketSchema`, add `bugDetails: bugDetailsSchema.optional().nullable()`
  and extend the existing `superRefine` (the same one that enforces
  `severity` for bugs) to also require `bugDetails` with all 7 sub-fields
  when `type === "bug"`, raising per-field issues at
  `path: ["bugDetails", "<field>"]` — mirroring the `severity` pattern.
- `ticketUpdateSchema` has no type-aware refine today (type isn't always
  present in a PATCH body). Add the equivalent bug-details validation in the
  API route handler instead, where the existing ticket's `type` is already
  loaded — validate `bugDetails` there when the target ticket is a bug and
  `bugDetails` is present in the request body.

### 4. API route
- `apps/web/src/app/api/projects/[id]/tickets/[ticketId]/route.ts` (PATCH)
  and the ticket create route: accept `bugDetails` in the body and write it
  to `schema.tickets.bugDetails`.

### 5. UI
- `create-ticket-form.tsx`: for `type === "bug"`, bind the existing 7-field
  form directly to `bugDetails` JSON (no more
  `serializeStructuredDescription` call before POST).
- `ticket-detail-modal.tsx`: for bug tickets, always render the 7-field
  structured editor bound to `bugDetails` — remove the free-text
  `<textarea>` fallback and the "Beralih ke Format 7 Field" toggle button
  entirely. If `bugDetails` is `null` (unmigrated legacy bug), the 7 fields
  render empty and required, same as creating a new bug.
- No other read-only UI currently renders `description`, so no additional
  read view changes are needed beyond the modal.

### 6. Export (`api/projects/[id]/export/route.ts`)
- Keep a single "Description" column in the `.xlsx` export.
- For `bug` rows, populate that column with the 7 fields formatted as
  multi-line text (same visual shape `serializeStructuredDescription`
  produced, reimplemented inline or as a small formatter local to the
  export route since the old helper may be deleted per scope item 2).
- For `task` rows, populate it from `description` as today.

## Out of scope

- Any change to `task` ticket descriptions (stay plain text).
- Description version history / audit trail.
- Guessing/backfilling `bug_details` for bugs whose old description text
  doesn't match the 7-field markdown shape — those are left empty for
  manual re-entry.
- Kanban drag-and-drop (tracked separately in `docs/prd/todo/kanban-drag-drop/`).

## Success criteria

- Creating a new bug ticket requires filling all 7 `bugDetails` fields and
  persists them as real JSON in `bug_details`, not a serialized string in
  `description`.
- Editing an existing bug in `TicketDetailModal` always shows the 7-field
  structured form — no free-text textarea or format-toggle button exists
  for bugs anymore.
- Running the one-time migration script against existing bug data populates
  `bug_details` for every bug whose old `description` matched the markdown
  shape, and leaves the rest `null`.
- The `.xlsx` export still produces one "Description" column, correctly
  formatted for both task and bug rows.
- `pnpm lint` and `pnpm build` pass.

## Definition of done (from CLAUDE.md / repo conventions)

- [ ] Validation lives in `@devflow/shared` (`bugDetailsSchema` /
      `ticketSchema` `superRefine`), not duplicated inline beyond the
      necessary type-aware check in the PATCH route handler.
- [ ] DB writes go through `@devflow/db`'s `schema.*` via Drizzle (migration
      generated with `pnpm db:generate`, applied with `pnpm db:migrate`).
- [ ] `pnpm lint` passes for `web` and `@devflow/shared`.
- [ ] `pnpm build` passes.
- [ ] Manual verification: create a bug, edit an existing bug, run the
      migration script against seed/dev data, and check the `.xlsx` export
      output (no automated test suite exists in this repo yet).
