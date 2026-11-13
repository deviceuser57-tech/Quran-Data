# P0-SEC-GATE-01 Security Remediation Authorization

**Authorization ID:** `QCR-OS-P0-SEC-GATE-01-SECURITY-REMEDIATION-AUTHORIZATION`
**Authorization date/time:** `2026-11-12T21:46:53+02:00`
**Authorizing instruction:** Explicit limited human authorization in the P0-SEC-GATE-01 execution instruction
**Gate:** `P0-SEC-GATE-01 — Pre-STEP-10 Security Hardening Gate`
**Baseline commit:** `dc4ef55cdaeeb10d7e5b5b236295357eb3c580d2`
**Accepted checkpoint:** `checkpoint/phase-0/p0-step-09`, tag `qcr-os/phase-0/p0-step-09/pass`; both are frozen and point to the baseline commit.

## Supplemental explicit execution authorization

**Effective date/time:** `2026-11-12T22:39:19+02:00`
**Authorization state:** `P0_SEC_GATE_01_EXECUTION_AUTHORIZATION = GRANTED`
**Authorized gate/findings:** `P0-SEC-GATE-01`; `SEC-FINDING-001`; `SEC-FINDING-004`.

The complete P0-SEC-GATE-01 instruction remains binding. `README.md` is outside scope and must remain untouched and excluded from gate staging and commits. Safely excludable unrelated worktree files must likewise remain untouched and outside the gate changeset.

## Supplemental dependency-security authorization

**Authorization ID:** `QCR-OS-P0-SEC-GATE-01-DEPENDENCY-REMEDIATION-AUTHORIZATION`
**Effective date/time:** `2026-11-12T23:42:50+02:00`
**Authorized files:** `package.json`, `package-lock.json`, only as required for confirmed dependency remediation.

This authorization covers the minimum supported dependency changes necessary to resolve the confirmed audit findings blocking P0-SEC-GATE-01. It does not authorize `npm audit fix --force`, arbitrary major upgrades, unrelated dependency updates, Express replacement, architecture changes, or Runtime behavior changes unrelated to the findings. The package changes are limited to the exact vulnerability-related changes documented in the Security Audit Report.

## Authorized purpose

Validate, minimally remediate, test, and document the confirmed findings `SEC-FINDING-001` (unvalidated file-based IDs/path traversal) and `SEC-FINDING-004` (internal error/stack disclosure) within P0-SEC-GATE-01 only.

## Permitted file categories

- Runtime files directly necessary to remediate findings 001 and 004 within `server/controllers/**`, `server/routes/**`, `server/utils/**`, or `server/server.mjs`.
- Directly related executable security/regression tests in existing test locations.
- Governance authorization, audit, and minimal gate-state evidence under the authorized governance locations.

Runtime changes are permitted only when directly necessary to remediate findings 001 or 004. Each changed file must be tied to a confirmed finding and validated by focused tests.

## Required validation and evidence

- Revalidate both findings against the accepted checkpoint code.
- Add and execute behavioral negative/regression tests for traversal/file-ID validation and error-detail disclosure.
- Run the existing test suite, applicable integration and Runtime smoke tests, `npm audit`, available SAST/security tooling, secret scanning, and `git diff --check`; report unavailable or unexecuted checks accurately.
- Capture before/after protected-source, D0_OUTPUT, Shadow schema/data, and legacy Runtime database evidence.
- Create a Security Audit Report with exact findings, changes, test results, scan results, integrity checks, residual risks, and the bounded gate decision.
- Create a PASS security checkpoint and publish its dedicated branch/tag only if every mandatory PASS criterion is met.

## Prohibited actions

- Reopen, modify, move, amend, republish, or re-execute P0-STEP-09 or its accepted commit, branch, or tag.
- Execute or authorize P0-STEP-10, Source Registration, Quran ingestion, Runtime cutover, Phase 1 or later phases, or Multi-Agent implementation.
- Modify `TIRE_SOURCES/**`, `D0_OUTPUT/**`, the Phase-0 Shadow schema or data, SQL migrations, or `data/sqlite/database.sqlite`.
- Modify findings 002, 003, 005, 006, or 007 automatically; they remain documented outside this remediation scope.
- Perform unrelated refactoring, cosmetic cleanup, broad dependency upgrades, or history rewriting; force-push is forbidden.

## Preserved classifications and boundaries

- `P0-STEP-09 = PASS / CLOSED / FROZEN`.
- `P0-STEP-10 = NOT_STARTED`; `P0-STEP-10_AUTHORIZED = NO`; `P0-STEP-10_EXECUTED = NO`.
- Protected Quran/source content remains immutable. Shadow schema and data remain unchanged. Quran ingestion and Source Registration remain forbidden.
- Findings 002 (`NOT_CONFIRMED_AS_CROSS_USER_EXPLOIT`), 003 (`NOT_CONFIRMED_AS_ACCESS_CONTROL_VULNERABILITY`), 005 (`NOT_CONFIRMED_AS_SECURITY_SENSITIVE_IN_CURRENT_REACHABLE_CODE`), 006 (`SECURITY_COVERAGE_GAP`), and 007 (`CI_RUNTIME_CONSISTENCY_ISSUE`) remain documented but outside automatic remediation.

## Stop conditions

Stop and report `BLOCKED` if the accepted remote checkpoint identity or required worktree integrity fails, an unexplained hardening-branch conflict exists, a required behavioral verification cannot be executed, or the authorized remediation requires out-of-scope changes. Report `FAIL` if a required security/regression test fails. Do not create PASS references for a blocked or failed gate.

**This artifact authorizes P0-SEC-GATE-01 only and does not authorize P0-STEP-10.**
