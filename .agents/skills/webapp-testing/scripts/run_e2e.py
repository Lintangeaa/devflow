#!/usr/bin/env python3
"""E2E test runner/orchestrator for the webapp-testing skill.

Wraps `npx playwright test`: ensures browsers are installed, runs the
JSON reporter, and prints a pass/fail/flaky summary. Exits non-zero on
any failure so it can be used both locally and in CI.

Usage:
    python run_e2e.py [--grep PATTERN] [--project NAME] [--headed] [--install]
"""
import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def run(cmd: list[str]) -> int:
    print(f"$ {' '.join(cmd)}")
    return subprocess.run(cmd, check=False).returncode


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Playwright E2E tests with a summary report.")
    parser.add_argument("--grep", help="Only run tests matching this pattern")
    parser.add_argument("--project", help="Only run this Playwright project (e.g. chromium)")
    parser.add_argument("--headed", action="store_true", help="Run in headed mode")
    parser.add_argument("--install", action="store_true", help="Install Playwright browsers before running")
    args = parser.parse_args()

    npx = shutil.which("npx")
    if npx is None:
        print("error: npx not found on PATH — Node.js is required", file=sys.stderr)
        return 1

    if args.install:
        code = run([npx, "playwright", "install", "--with-deps"])
        if code != 0:
            return code

    with tempfile.TemporaryDirectory() as tmp:
        results_path = Path(tmp) / "results.json"
        cmd = [npx, "playwright", "test", f"--reporter=json"]
        if args.grep:
            cmd += ["--grep", args.grep]
        if args.project:
            cmd += ["--project", args.project]
        if args.headed:
            cmd.append("--headed")

        with open(results_path, "w") as out:
            proc = subprocess.run(cmd, stdout=out, stderr=subprocess.STDOUT)

        summary = _summarize(results_path)
        print(summary)

    return proc.returncode


def _summarize(results_path: Path) -> str:
    try:
        data = json.loads(results_path.read_text())
    except (json.JSONDecodeError, FileNotFoundError, OSError):
        return "Could not parse Playwright JSON output — see raw output above."

    passed = failed = flaky = skipped = 0

    def walk(suites):
        nonlocal passed, failed, flaky, skipped
        for suite in suites:
            for spec in suite.get("specs", []):
                for test in spec.get("tests", []):
                    status = test.get("status")
                    if status == "expected":
                        passed += 1
                    elif status == "unexpected":
                        failed += 1
                    elif status == "flaky":
                        flaky += 1
                    elif status == "skipped":
                        skipped += 1
            walk(suite.get("suites", []))

    walk(data.get("suites", []))
    total = passed + failed + flaky + skipped
    return (
        f"\n--- E2E Summary ---\n"
        f"Total: {total} | Passed: {passed} | Failed: {failed} | "
        f"Flaky: {flaky} | Skipped: {skipped}\n"
    )


if __name__ == "__main__":
    sys.exit(main())
