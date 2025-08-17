# Warehouse Sanitation Checklist System — Stakeholder Brief

## What it is
A web application for managing warehouse sanitation checklists with role-based authentication, automated assignment workflows, barcode/QR support, email-driven supervisor validation, and admin oversight.

## Why it matters (Business Value)
- Compliance: Standardized, timestamped checklists with supervisor validation
- Productivity: Automated assignments reduce manual coordination
- Accuracy: Real-time validation and error reduction via structured forms
- Visibility: Admin views to monitor progress and audit trails
- Readiness: Works across desktop/mobile; email notifications link to validation

## Key Features
- Authentication and roles (Associate, Auditor, Admin)
- Automated assignment lifecycle (assign → perform → submit → validate → complete/rework)
- 22 checklists by frequency (Daily, Weekly, Quarterly)
- Barcode/QR generator and scanner to jump to forms
- Email notifications with direct validation links
- Auditor validation UI to accept or request rework
- Admin dashboard to create users, manage assignments, and view submissions

## End-to-End Workflow
1. Admin assigns checklist(s) to associates
2. Associate logs in, opens assigned checklist (scan QR or select)
3. Associate completes and submits; backend stores payload, emails supervisor
4. Supervisor logs in and validates via emailed link; approves or requests rework
5. Admin monitors assignment status, audits submissions, and reassigns as needed

## Architecture (High level)
- Auth server (dhl_login, Port 3000): sessions, roles, admin UI, protected /app UI
- Backend API (backend, Port 3001): submissions, email notifications, configuration
- Frontend (Public/ via /app): checklist forms, barcode generator, validation UI
- Data: SQLite for auth/metadata; JSON files for submissions
- Infra: PM2 process manager, Nginx reverse proxy, Let’s Encrypt (deployment docs provided)

## Security and Compliance
- Role-based access; protected /app routes after login
- JWT-protected API endpoints
- HTTPS via Nginx and Let’s Encrypt
- CSRF and security headers (lusca), session hardening, env-driven secrets

## Success Metrics
- Checklist completion rate and time-to-completion
- Rework rate after auditor review
- On-time compliance by frequency (daily/weekly/quarterly)
- Throughput and adoption (active users, assignments closed)

## Roadmap (Examples)
- Enhanced Auditor Role features
- Move Auditor validation process from email to in-app
- Analytics dashboard (compliance trends, hotspots)


