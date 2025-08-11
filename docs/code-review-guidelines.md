# Code Review Guidelines

Scope
- Prefer small PRs (around ≤400 changed lines).
- Clear description with context, testing, and rollback notes.
- Link related issues.

Author pre-checklist
- Tests: `npm test` in [dhl_login/package.json](dhl_login/package.json).
- Coverage meets thresholds (see [dhl_login/jest.config.js](dhl_login/jest.config.js)).
- Lint passes: `npm run lint` in dhl_login.
- Security: no secrets; `npm audit` has no high/critical.
- DB: include migrations for schema changes; ensure reversibility; update seeders if needed.
- Update docs when behavior or ops change.

Reviewer checklist
- Functionality: endpoints/flows/validation correct (see [dhl_login/routes](dhl_login/routes)).
- Readability: clear names, small functions, comments for non-obvious logic.
- Errors: correct HTTP codes; no swallowed errors; logs actionable.
- Security: validate inputs ([dhl_login/utils/validation.js](dhl_login/utils/validation.js)); proper authz; no sensitive logs.
- Performance: reasonable queries, indexes where needed; avoid N+1; no blocking I/O on hot paths.
- Tests: meaningful assertions for happy/edge/error paths; maintain or improve coverage.
- Migrations: safe for prod data; plan for zero-downtime when applicable; rollback path defined.

PR template (paste in description)
- Context:
- Changes:
- Testing:
- Risks:
- Rollback:
- Related Issue(s):

Approvals and merge
- At least one reviewer approval.
- All required checks green (CI, coverage, lint, audit).
- Squash merge with concise summary.
- Delete branch after merge.

Post-merge
- Verify deployment, logs, and `/health`.
- Roll back quickly if SLOs degrade.