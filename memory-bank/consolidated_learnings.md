# Consolidated Learnings — P2 Implementation (Summary)

**Date:** 2025-08-13  
**Source:** Raw reflections from P0–P2 implementation work

This document distills high-value, reusable patterns and actionable items discovered while implementing P2 (advanced CMMS features) for JSG Inspections. Keep short, practical, and directly applicable.

## Core Patterns & Best Practices

1. Migration Manager Pattern (SQLite)
   - Use a MigrationManager that:
     - Creates a timestamped backup before applying migrations.
     - Runs migrations sequentially and updates a schema_version table.
     - Rolls back from the latest backup if any migration fails and triggers a safe app relaunch.
   - Rationale: Minimizes data loss and allows safe incremental upgrades in desktop apps.

2. Centralized Secure DB API (secureOperations)
   - Centralize all DB operations in a single module with:
     - Named operations, parameter lists, SQL templates, returnType annotations ('many','one','scalar','write').
     - Per-operation validators that verify inputs before executing SQL.
   - Rationale: Eliminates ad-hoc SQL, prevents injection, enforces consistent shapes, simplifies audits and testing.

3. Preload IPC Wrapper (createIPCWrapper)
   - Expose a minimal, stable renderer API via preload.js that:
     - Wraps ipcRenderer.invoke with standardized error normalization and logging.
     - Returns data directly (no success envelope) and throws normalized Errors for failures.
     - Provides retry metadata for retryable operations.
   - Rationale: Keeps renderer components simpler and consistent. Centralized error handling reduces duplication.

4. Feature Flagging & Dev Gating
   - Gate legacy/unsafe operations to development only (clear errors in production).
   - Rationale: Allows gradual migration while preventing production exposure to raw SQL.

5. Schema + API Co-evolution
   - When adding new domain capability (e.g., work orders, PM), implement:
     - Migrations (schema) → secureOperations (API) → preload exposure → UI components.
   - Rationale: Keeps layers synchronized and testable.

## Practical Workarounds / Operational Lessons

1. Code-level validation scripts when native installs fail
   - When npm/native installs are blocked (TLS/certificate issues), implement:
     - Script that inspects code to confirm migrations, secure ops, and preload APIs exist (e.g., test-p2-sql-validation.js).
     - Optional scaffold test script for local DB runs (test-p2-migrations.js) that can be executed once dependencies are available.
   - Rationale: Allows progress verification and reviews even in constrained environments.

2. Audit & RBAC requirements
   - Ensure preload exposes contextual user identity (id/username/role) for auditLog entries and RBAC enforcement.
   - Rationale: Audit entries without a user context are incomplete; RBAC requires runtime user info.

3. CI/Packaging in constrained networks
   - If corporate TLS interception blocks package downloads:
     - Use an internal npm registry mirror with trusted certs or configure CI runners with trusted CA.
     - Alternatively, prebuild artifacts in a controlled environment and publish artifacts to internal feeds.
   - Rationale: Prevents blocker for CI and electron-builder packaging.

## High-Value Technical Decisions to Keep

- Use parameterized queries everywhere; annotate returnType for callers.
- Index frequently-used columns during migrations, especially date/foreign-key fields.
- Keep canonical validation logic close to DB layer (secureOperations validators) rather than scattered in UI.
- Prefer structured metadata (JSON arrays) for variable lists (required_parts, required_skills) stored as text in DB.

## Next Operational Actions (short list)
- Wire authenticated user context into preload for audit and RBAC enforcement.
- Add unit tests for secureOperations validators and returnType handling.
- Add E2E tests for critical workflows (schedule → start → complete; deficiency → work order → closure).
- Resolve CI/certificate issues to enable full npm install, electron packaging, and runtime migration tests.

## Reference Implementation Notes
- MigrationManager backup/rollback process and schema_version approach has proven robust for desktop SQLite apps.
- The preload wrapper design (normalizeError + createIPCWrapper) dramatically simplifies renderer code and improves observability.

---

## Phase 3 — Consolidated Learnings (Load Tests, Calibrations, Credentials)

**Date:** 2025-08-13  
**Scope:** Implementation and integration of Phase 3 domain features: load_tests, calibrations, credentials, certificates, audit_log, PM→WO integration.

Key takeaways:
- The migration-first approach (migrations → secureOperations → preload → UI) allowed rapid, low-risk construction of the Phase 3 UI because the DB and API surfaces already existed.
- Always map and normalize database field naming at the API/preload boundary so renderer components receive a consistent shape (prefer camelCase in renderer). This avoids widespread conditional code in components (e.g., handle both next_test_due and nextTestDue).
- Audit logging is only meaningful when coupled with real user identity passed from the renderer/preload. Plan to wire authentication early in the next cycle.
- Adding "action" shortcuts (Generate Work Order from PM schedules) improves PM operational flow and reduces manual effort; include audit entries and link back to pm_schedule_id for traceability.
- Small, focused test harnesses (like test-phase3-implementation.js) are invaluable for verifying schema, enums, and complex queries without requiring the entire app runtime.

Durable patterns to extract:
- Canonicalize date columns with a normalized YYYY-MM-DD text column indexed for rapid range searches (inspection_date_date).
- Store variable arrays as JSON text and parse only in UI—secureOperations should validate JSON structure.
- For certification documents: compute and store SHA256 hash at storage time and include in certificate records; store certificate path and QR code data for verification pages.

Actionable improvements:
1. Preload: add function to return current user context (id, username, role) and ensure secureOperations audit entries use it.
2. secureOperations: add camelCase mapping layer for select operations or adjust IPC wrapper to translate snake_case → camelCase.
3. Tests: convert test-phase3-implementation.js into a CI job that runs against a disposable SQLite instance to validate migrations and constraints on push.
4. Certificates: implement PDF generation pipeline (generatePdf util extension) to create certificate PDFs, compute sha256, and store certificate_path + certificate_hash.

Short-term priorities:
- Wire authenticated user context into preload (high).
- Standardize field mapping at preload to reduce renderer complexity (medium).
- Add unit tests for secureOperations validators (medium).
- Implement certificate PDF generation and hashing (medium/next phase).

End of Phase 3 consolidated learnings.

---
