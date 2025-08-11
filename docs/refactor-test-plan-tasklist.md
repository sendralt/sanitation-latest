# Refactor and Test Stabilization Tasklist

Scope: Finalize current refactor PR with unit tests; then stabilize full integration test suite in a follow-up effort.

## Phase A: Current PR (targeted unit verification)

1. Add CI-friendly unit test script
   - Add `test:unit` script to dhl_login/package.json to run only unit tests under `__tests__/`.
   - Update PR description to indicate unit tests are the verification scope for this PR.

2. Ensure unit tests pass locally
   - Run `cd dhl_login && npm run test:unit`.
   - If failures, iterate until green.

3. Optional: Add a minimal README section
   - Document `/api/checklists` and dynamic client consumption.

## Phase B: Follow-up PR (integration test suite stabilization)

4. Establish deterministic test DB lifecycle
   - Add Jest globalSetup/globalTeardown to create in-memory SQLite and call `sequelize.sync({ force: true })` per run.
   - Remove per-test destructive cleanup that races with teardown.

5. Standardize auth/session test environment
   - Ensure `JWT_SECRET` and related env vars are set during tests.
   - Mock or configure session/CSRF for predictable 200 vs 302 results.

6. Harden route tests
   - Align tests with expected redirects vs JSON responses.
   - Add factories/fixtures for users, checklists, and assignments.

7. Extend coverage for new shared utilities and endpoints
   - Add integration tests for `/api/checklists` and `/api/validate/:id` flows.

## Status

- [ ] Phase A.1: Add test:unit script
- [ ] Phase A.2: Run unit tests locally and ensure green
- [ ] Phase A.3: Optional README additions
- [ ] Phase B.4: Add Jest global setup/teardown for DB
- [ ] Phase B.5: Configure auth/session env for tests
- [ ] Phase B.6: Align and harden route tests
- [ ] Phase B.7: Extend coverage for shared utils and endpoints

## Notes

- Keep Phase A changes in the existing PR (feat/dynamic-checklists-api).
- Use a separate PR for Phase B test stabilization.

