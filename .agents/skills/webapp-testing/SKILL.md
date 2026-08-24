---
name: webapp-testing
description: Executable E2E + TDD workflow for web apps — real Playwright config, a Python test runner, and a CI pipeline file, not just markdown code snippets. Use when setting up or running E2E tests for a webapp end-to-end, not just reading patterns about it.
license: MIT
metadata:
  category: testing
  author: lintang
compatible_with: [claude-code, opencode, antigravity, commandcode]
---

# Webapp Testing (E2E + TDD, executable)

Sets up a webapp with a ready-to-run E2E test pipeline — real files you
copy and execute, not markdown snippets to retype every session. Combines
the TDD red-green-refactor discipline with Playwright E2E, wired through a
single Python entrypoint.

**Related skills:** for granular Playwright patterns (Page Object Model,
flaky-test triage, artifact management), see `e2e-testing`. For general
red-green-refactor discipline beyond E2E (unit/integration tests), see
`test-driven-development`. This skill sits on top of both — it's the
scaffolding that turns their patterns into files you actually run.

## When to use

- Setting up E2E testing for a webapp project from scratch
- Adding a new user-facing flow and want a failing E2E test before
  implementing it (TDD applied to E2E)
- Wiring E2E tests into CI

## When NOT to use

- You just need Playwright *patterns/snippets* to write a test by hand —
  use `e2e-testing` instead
- Pure unit/integration test TDD with no browser involved — use
  `test-driven-development`

## Steps

1. **Install the scaffolding.** Copy `assets/playwright.config.ts` to the
   project root (merge manually if a config already exists). Ensure
   `@playwright/test` is a dev dependency (`npm i -D @playwright/test`).

2. **Write the test first (RED).** Before implementing a new flow, write
   an E2E spec under `tests/e2e/` that describes the desired behavior. It
   should fail — see `references/tdd-e2e-workflow.md` for the full
   red-green-refactor cycle applied to E2E specifically.

3. **Run the suite via the runner, not raw `npx playwright test`.**

   ```bash
   python skills/webapp-testing/scripts/run_e2e.py
   ```

   This wraps Playwright, installs browsers if missing, runs the JSON
   reporter, and prints a pass/fail/flaky summary with a non-zero exit
   code on failure — so both you and CI can call one command instead of
   re-deriving Playwright flags each time. Pass through Playwright options
   as needed: `--grep <pattern>`, `--project chromium`, `--headed`.

4. **Implement until green.** Re-run `run_e2e.py` after each change until
   the new spec passes, then refactor with tests still green.

5. **Wire into CI.** Copy `assets/e2e-workflow.yml` to
   `.github/workflows/e2e.yml`. It calls the same `run_e2e.py` entrypoint
   used locally, so local and CI runs stay identical.

## Files in this skill

- `scripts/run_e2e.py` — the test runner/orchestrator (stdlib-only Python)
- `assets/playwright.config.ts` — ready-to-use Playwright config
- `assets/e2e-workflow.yml` — GitHub Actions pipeline, copy to
  `.github/workflows/e2e.yml`
- `references/tdd-e2e-workflow.md` — red-green-refactor cycle applied to
  E2E tests specifically, and how it relates to `test-driven-development`
