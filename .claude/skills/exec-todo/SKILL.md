---
name: exec-todo
description: Use when the user wants to actually EXECUTE a plan/checklist file's items — triggers on "/exec-todo <file-or-slug>", "kerjakan fase X", "lanjutkan todo Y", or being pointed at a plan doc (from prd-grill's PRD+ISSUES pair, or a phase-plan file) to implement. Reads the given file, turns its unchecked checklist items into this session's tracked task list, then works through them in order — checking off both the session task list and the markdown checkboxes as each item is verified, dispatching a review step and any required verification at the end per this repo's own "definition of done" if one is documented, then committing the finished work as the last closing gate. Not a planning skill (see prd-grill/brd-grill for that) — this one implements an already-written plan. Not for executing more than one plan file per invocation.
license: MIT
metadata:
  category: workflow
  author: lintang
  version: "1.1.0"
compatibility: "Requires a session task-tracking tool (TaskCreate/TaskUpdate or equivalent todo tool) and write access to the plan file to check off items."
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, TaskCreate, TaskUpdate, Skill, AskUserQuestion]
argument-hint: "<path-or-slug>"
disable-model-invocation: false
user-invocable: true
model: inherit
effort: medium
compatible_with: [claude-code, opencode, antigravity, commandcode]
---

# /exec-todo

Turn a plan/checklist file into an actively-tracked, actually-executed piece
of work. [`prd-grill`](../prd-grill/SKILL.md) (optionally preceded by
[`brd-grill`](../brd-grill/SKILL.md)) writes the plan; `exec-todo` is what
runs it. See `references/project-example.md` for a concrete worked example
this skill was generalized from — a real repo's version encoded a fixed
six-step "definition of done" gate that had been silently skipped before it
existed, which is exactly the failure mode Step 3 below exists to prevent.

## Usage

```
/exec-todo <path>              # exact path to the plan/checklist file
/exec-todo <slug or number>    # fuzzy match — resolved in Step 0
/exec-todo                     # no argument: ask which file, don't guess
```

## Step 0 — Resolve the input to exactly one file

- If given a path, use it directly — still verify it exists, don't assume.
- If given a slug/number/fuzzy name, search this repo's plan-doc location
  (see [`prd-grill`'s output conventions](../prd-grill/references/output-conventions.md)
  for the two common shapes — both use a `todo/`→`done/` split: either
  `docs/prd/todo|done/<slug>/ISSUES.md`, or a `doc/phases/todo|done/...`
  phase file — match whichever this repo actually uses). Prefer a match in
  the `todo/` (still open) location; if the only match is already in
  `done/` (closed), tell the user its checklist is already fully checked and
  ask whether they meant a different, still-open file — don't silently
  re-execute a closed plan.
- If nothing matches, or the match is ambiguous, list the candidates and ask
  which one — don't guess at scope.
- If no argument was given at all, ask which file rather than defaulting to
  "whatever looks unfinished."

Read the resolved file **in full** before doing anything else — don't act on
a partial read or a summary from earlier in the conversation; it may have
changed since.

## Step 1 — Parse the checklist into a task list

Extract every unchecked `- [ ]` line from the file's checklist section, in
document order, **including any fixed closing items** this repo's
convention requires (test commands, review-dispatch steps, verification
steps) — those are real work, not decoration, and belong in the tracked
list too. Skip lines already `- [x]`.

If every item is already `- [x]`: don't fabricate work. Check whether the
file still sits in a `todo/` location (both conventions in `prd-grill`'s
output-conventions reference use a `todo/`→`done/` split) — if so and it
hasn't moved yet, that move is itself the actionable item; do it and stop.
Otherwise tell the user there's nothing to execute.

Create the session's tracked task list from the extracted items — one task
per checklist line, same order as the document (order matters: later items,
especially closing gates, genuinely depend on earlier ones). Use whichever
task-tracking mechanism this session actually exposes (`TaskCreate`/
`TaskUpdate`, or an equivalent built-in todo tool) — don't invent an ad hoc
scheme (a scratch markdown file, a mental list) when a real tracked list is
available; the point is an explicit, inspectable todo that survives context
compaction, not prose the model has to re-derive each turn.

Each task's text should stay recognizable against the source checklist line
— don't paraphrase away the file/component name it names, so a later
checkmark can be matched back to the exact line without re-opening the file.

## Step 2 — Work through the list, one task at a time

For each task, in order:

1. Mark it in-progress in the session task tool.
2. Do the work. If the item is a genuinely multi-step implementation (not a
   one-line change), use the [`incremental-implementation`](../incremental-implementation/SKILL.md)
   skill's discipline for that item specifically — this skill governs
   *tracking*, not *how* to write the code. For behavior-changing work,
   [`test-driven-development`](../test-driven-development/SKILL.md) governs
   how the tests get written.
3. Verify it (run the relevant test/type-check/build) before marking it
   done — don't check off unverified work.
4. Mark the task completed in the session tool, **and** flip the
   corresponding `- [ ]` → `- [x]` in the actual plan file in the same turn
   — the two must stay in sync. The session task list is ephemeral (gone
   next conversation); the markdown file is the durable record. If the
   completed work deviates from the literal checklist wording (different
   file, reduced scope), still check it off with a short parenthetical note
   explaining the deviation.
5. If you discover necessary work that wasn't on the original checklist
   (e.g. an endpoint a frontend item actually needed), add it as a **new**
   task in the session list AND a new checklist line in the file — don't
   silently fold it into an existing item or omit it.

If you hit a genuine blocker on one item (ambiguous requirement, needs a
user decision), surface it via a choice-style question tool, resolve it,
then continue — don't silently skip it or reorder around it without saying
so.

## Step 3 — The closing gates are not optional busywork

When you reach fixed closing checklist items, follow this repo's own
documented "definition of done" **exactly**, in whatever order it specifies
— check for one in a root-level agent-instructions file (`CLAUDE.md`,
`AGENTS.md`, `CONTRIBUTING.md`) before improvising. If this repo has no such
documented sequence, use this default, in order:

1. Dispatch a review step proactively (don't wait to be asked) once the
   feature items are done — use this repo's `reviewer` agent if one exists
   (see [`agents/reviewer`](../../agents/reviewer/) in this skill collection
   for the pattern), otherwise invoke
   [`code-review-and-quality`](../code-review-and-quality/SKILL.md)
   directly. Address blocking findings before proceeding.
2. Run the project's actual verification (E2E/manual browser pass, not just
   unit tests/type-check) against the real flows the plan touched, if this
   repo has such a step. If the tooling for it isn't available this
   session, say so explicitly — don't skip silently.
3. Write whatever verification report/artifact this repo's convention
   expects (screenshots, a report file), if any.
4. Clean up test data and any dev processes started for verification.
5. Check off the closing checklist items in the file (only after 1-4 pass or
   their findings are addressed/accepted).
6. Move the plan doc(s) from `todo/` to `done/` now (both conventions in
   `prd-grill`'s reference use this split — a `docs/prd/todo/<slug>/` pair
   or a `doc/phases/todo/...` file) and fix any relative links in it or
   pointing to it. This step is exactly as mandatory as the other five — a
   plan that's fully checked but still sitting in `todo/` is an incomplete
   close-out, not a cosmetic detail.
7. Commit the work. This is the last closing gate, after the plan doc has
   moved to `done/` — a completed, reviewed plan left uncommitted is still
   an incomplete close-out. Stage exactly what this execution touched (the
   implementation files plus the plan doc's move into `done/`) — inspect
   `git status`/`git diff` first and don't sweep in unrelated pre-existing
   changes with a blanket `git add -A`. Write the commit message from what
   the plan actually delivered (the PRD's problem/scope, not "implement
   checklist items"), matching this repo's existing commit message style
   (check `git log` for tone/format). Follow the same git safety rules as
   always: never `--amend`, never `--no-verify`, never force-push, and if a
   pre-commit hook fails, fix the issue and make a new commit rather than
   bypassing it. Skip this step only if the working tree isn't a git repo,
   or the user has explicitly said not to commit — otherwise it's not
   optional, same as steps 1-6.

## Step 4 — Final report

Summarize: what was implemented (by checklist item), test/type-check
results, review verdict, verification findings, and the file's final
location. If something was genuinely left unchecked (blocked, descoped,
deferred), say so plainly and point to where that's noted in the file —
don't imply full completion if the file itself doesn't show `- [x]` on
every line.

## What this skill is not

- Not a planning tool — it never edits the *plan content* of a file, only
  its checkboxes and its location. Scope changes go through `prd-grill`'s
  refine flow to produce a new version, not through this skill rewriting
  the checklist it's executing.
- Not a substitute for `incremental-implementation`/`test-driven-development`
  for the actual coding work inside each item — this skill wraps those with
  tracking and file bookkeeping, it doesn't replace their discipline.
- Not for executing more than one plan file per invocation — several plans
  in sequence means several `/exec-todo` invocations, not this skill
  silently chaining files together.
