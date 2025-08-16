# Stakeholder Brief (Verified)

This brief cites specific files/lines per .augment/rules/verify.md.

## What it is
A role-based sanitation checklist web app with automated assignments, email-driven supervisor validation, and admin oversight.

Evidence:
- Auth server protects /app and routes: dhl_login/app.js lines 301–339, 431–444
- Supervisor validation page served unauthenticated: dhl_login/app.js lines 312–318
- Backend API with email and health endpoints: backend/server.js lines 207–223, 439–446

## Key Features (with sources)
- Roles and auth-protected UI: dhl_login/app.js 301–339
- Supervisor validation via emailed link /app/validate-checklist/:id: backend/server.js 207–213, 210 and dhl_login/app.js 315–318
- 22 checklist templates: Public/checklists/ (22 files listed)
- Barcode/Scanner support in forms: Public/scripts.js 146–248
- Admin assignment and management pages: dhl_login/routes/admin.js 161–186, 289–343; manual assignment POST 188–287
- Config endpoint for supervisor emails: backend/server.js 427–436
- Health check: backend/server.js 439–446

## End-to-End Workflow (with sources)
1) Admin assigns checklists (dhl_login/routes/admin.js 161–186, 188–287)
2) Associate completes and submits; backend saves data and emails supervisor (backend/server.js 118–156, 207–223)
3) Supervisor validates via link; UI hits /api/validate/:id (dhl_login/app.js 312–318, 192–253; Public/validate-checklist.html 996–1001, 1023–1031, 1142–1168)
4) Admin monitors/manage submissions (dhl_login/routes/admin.js 289–343, 350–417)

## Architecture (with sources)
- Auth Server (Port 3000): ecosystem.config.js 3–11; dhl_login/app.js 448–452
- Backend API (Port 3001): ecosystem.config.js 13–21; backend/server.js 16–20, 448–454
- Frontend served from Public/ under /app: dhl_login/app.js 323–339
- Data: JSON submission storage backend/server.js 56–116; assignment linkage 157–201

## Security
- CSRF via lusca: dhl_login/app.js 257–275
- Session config (secure cookies in prod): dhl_login/app.js 161–171, 18–20
- JWT for backend API: backend/server.js 22–37, 119–123

## Metrics Candidates
- Completion and validation timestamps in assignments: dhl_login/app.js 39–57 (validated assignments API) and 100–159 (complete-checklist update)
- Email send success logs: backend/server.js 247–255

## Roadmap (non-binding)
- Analytics/dashboard
- SSO / directory integration
- Offline data capture
- Multi-site tenancy

