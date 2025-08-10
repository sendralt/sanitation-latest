# Code Duplication Audit Report

Date: 2025-08-10
Repository: sanitation-latest

## Summary

I scanned the repository (backend, authentication server, and frontend) to identify meaningful code duplications beyond boilerplate. The most impactful duplications are in validation flows, hard-coded checklist catalogs, and user-creation validation. Below are concrete findings with exact locations, example snippets, severity, and refactoring suggestions.

---

## High-Priority Duplications

### 1) Validation flow duplicated across two servers and multiple routes

- What’s duplicated:
  - Reading checklist JSON by ID, validating presence of `randomCheckboxes`, sending JSON payload (GET)
  - Processing supervisor validation: iterating `validatedCheckboxes` to update stored structure, saving file, updating `Assignment` to “validated”, looking up supervisor admin (POST)
  - Implemented in both `backend/server.js` and `dhl_login/app.js`

- Why it matters:
  - High risk of drift and subtle bugs (e.g., one route changes and the others don’t)
  - Doubles maintenance burden
  - Inconsistent auth models (authenticated vs public) increase complexity

- Locations:
  - GET validation data (authenticated vs unauthenticated duplication in backend)
    - `backend/server.js` lines 253–287 (GET `/validate/:id`, JWT-protected)
    - `backend/server.js` lines 387–421 (GET `/validate-public/:id`, no auth)
    - `dhl_login/app.js` lines 186–231 (GET `/api/validate/:id`, no auth)

    Example:
    ```js
    // Check if randomCheckboxes is available and is an array
    if (!formData.randomCheckboxes || !Array.isArray(formData.randomCheckboxes)) {
      return res.status(400).json({ message: 'Random checkboxes not found in the checklist data.' });
    }
    res.status(200).json({ fileId, title: formData.title, checkboxes: formData.checkboxes, randomCheckboxes: formData.randomCheckboxes });
    ```

  - POST validation update (three places share nearly identical logic)
    - `dhl_login/app.js` lines 233–336 (POST `/api/validate/:id`, public)
    - `backend/server.js` lines 290–381 (POST `/validate/:id`, JWT)
    - `backend/server.js` lines 424–515 (POST `/validate-public/:id`, public)

    Example:
    ```js
    validationData.validatedCheckboxes.forEach((validatedCb) => {
      const { id: validatedId, checked: newCheckedState } = validatedCb;
      for (const headingKey in formData.checkboxes) {
        if (formData.checkboxes[headingKey] && formData.checkboxes[headingKey][validatedId]) {
          formData.checkboxes[headingKey][validatedId].checked = newCheckedState;
          break;
        }
      }
    });
    ```

- Severity/Impact: HIGH
  - Complex flow duplicated in 3 places; easy for logic/security to diverge
  - Inconsistent access controls (JWT vs public) are duplicated across servers

- Refactor suggestions:
  - Consolidate validation endpoints into a single server (recommend `dhl_login` since it serves the UI) and remove duplicates from `backend`; or vice versa.
  - Extract shared helpers (e.g., `loadChecklistData`, `saveChecklistData`, `updateChecklistFromValidation`, `markAssignmentValidated`) into a shared module consumed by the chosen server.
  - If both servers must access the same logic, move helpers into a `shared/` directory and require from both apps, or publish an internal package.

---

### 2) Hard-coded checklist catalog duplicated in multiple frontend files (with mismatches)

- What’s duplicated:
  - Static arrays of checklist filenames used for menus/tools:
    - `Public/scripts.js` lines 95–117
    - `Public/barcode_generator.html` lines 72–93
    - `Public/validate-checklist.html` lines 601–623 (contains likely typos: `Quarterlyl.html`)

  Example:
  ```js
  const checklists = [
    "checklists/1_A_Cell_West_Side_Daily.html",
    ...
    "checklists/22_F_Cell_High_Level_Quarterly.html"
  ];
  ```

  Example with typos:
  ```html
  "checklists/21_E_Cell_High_Level_Quarterlyl.html",
  "checklists/22_F_Cell_High_Level_Quarterlyl.html"
  ```

- Why it matters:
  - Single source of truth is missing; arrays can get out-of-sync (and already have typos)
  - The DB has canonical checklist entries (seeded from `Public/checklists`). UI should not hard-code these

- Severity/Impact: HIGH

- Refactor suggestions:
  - Add an API route to serve the checklist catalog from the DB (e.g., GET `/api/checklists`), using the `Checklist` model (`type`, `order` exist via seeder).
  - Update frontend pages to fetch the catalog dynamically, not hard-code arrays.
  - Optionally, add a client-side cache and fallback messaging if API fails.

---

## Medium-Priority Duplications

### 3) User creation/validation logic duplicated between Admin UI and API

- What’s duplicated:
  - Username length checks, password length checks, validation of exactly two unique security questions, retrieving security question text, and hashing answers

- Locations:
  - `dhl_login/routes/admin.js` lines 67–95 (server-rendered form validation)
  - `dhl_login/routes/auth.js` lines 54–75 and 76–96 (API registration validation)

  Examples:
  ```js
  // admin.js
  if (!password || password.length < 8) {
    validationErrors.password = 'Password must be at least 8 characters long.';
  }
  // ensure two unique security questions and valid IDs via getSecurityQuestionById
  ```

  ```js
  // auth.js
  if (!password || !validator.isLength(password, { min: 8 })) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }
  if (!Array.isArray(securityAnswers) || securityAnswers.length !== 2) {
    return res.status(400).json({ message: 'Exactly two security answers are required.' });
  }
  ```

- Severity/Impact: MEDIUM
  - Important business rules duplicated; drift could allow inconsistent acceptance criteria between Admin and API paths

- Refactor suggestions:
  - Extract common validation utilities into `dhl_login/utils/validation.js`:
    - `validateUsername`, `validatePassword`, `validateSecurityAnswers(securityAnswers)`
  - Have both admin and API routes call the same utility; keep error message mapping in each layer as needed.

---

### 4) UUID format regex duplicated

- What’s duplicated:
  - The same UUID regex literal appears in multiple places

- Locations:
  - `dhl_login/utils/assignmentLogic.js` lines 82–101
  - `dhl_login/routes/admin.js` lines 212–224

  Example:
  ```js
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return { success: false, error: 'Invalid userId format' };
  }
  ```

- Severity/Impact: MEDIUM

- Refactor suggestions:
  - Export a single `isValidUUID` function from a common validation module and use everywhere.

---

## Lower-Priority or Contextual Duplications

### 5) File I/O patterns and data path construction repeated

- What’s duplicated:
  - Constructing paths to `backend/data` and reading/writing JSON appears in both `backend/server.js` and `dhl_login/app.js`

- Locations (examples):
  - `backend/server.js` ~lines 152–156, ~259–266, ~332–334, ~522–530
  - `dhl_login/app.js` lines 191–199, 240–249, 288–289

- Severity/Impact: LOW to MEDIUM

- Refactor suggestions:
  - Create `shared/dataStore.js` with helpers like `getChecklistFilePath(id)`, `readChecklistData(id)`, `writeChecklistData(id, formData)`.
  - Centralize base data directory path to avoid hard-coded relative traversals.

---

## Prioritization

1) Consolidate validation flows across servers (HIGH)
- Complexity high; duplicated in 3+ places; risk of security/logic drift.

2) Centralize checklist catalog (HIGH)
- Duplicated arrays with typos; switch to DB-backed API for single source of truth.

3) Unify user validation logic (MEDIUM)
- Single validation utilities to ensure consistent business rules.

4) Centralize UUID validation (MEDIUM)
- Small win; lowers inconsistencies and noise.

5) File I/O helper consolidation (LOW/MEDIUM)
- Reduces boilerplate and mistakes; improves testability.

---

## Refactoring Plan (proposed)

- Phase 1: Validation endpoints
  - Choose one server to host all validation routes (recommend `dhl_login` for proximity to UI).
  - Extract helpers: `loadChecklistData(fileId)`, `saveChecklistData(fileId, data)`, `updateChecklistFromValidation(formData, validatedCheckboxes)`, `markAssignmentValidated(filename, supervisorName)`.
  - Replace `backend/server.js` `/validate` and `/validate-public` with proxies or remove if not needed.

- Phase 2: Checklist catalog
  - New route in `dhl_login`: GET `/api/checklists` returning `filename`, `title`, `type`, `order`.
  - Update `Public/scripts.js`, `Public/barcode_generator.html`, `Public/validate-checklist.html` to fetch and render dynamically.
  - Remove hard-coded arrays. Fix typos by relying on the API.

- Phase 3: Validation utilities
  - Create `dhl_login/utils/validation.js` with `validateUsername`, `validatePassword`, `validateSecurityAnswers`, `isValidUUID`.
  - Update `admin.js` and `auth.js` to call these.

- Phase 4: Data access helpers
  - Create `shared/dataStore.js` with normalized handling of `backend/data` dir.
  - Replace scattered `fs/path` calls with helper usage.

- Testing
  - Add unit tests for new shared utilities.
  - Add integration tests for the consolidated validation route (GET/POST).
  - Add tests for `/api/checklists` and frontend rendering fallback.

---

## Next Steps

- Confirm desired target for consolidated validation routes (`dhl_login` or `backend`).
- Implement `/api/checklists` and update frontend to consume it.
- Extract validation utilities and apply to both `admin.js` and `auth.js`.

I’m ready to implement once priorities are confirmed.

