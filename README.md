# Warehouse Sanitation Checklists

A web application for managing warehouse sanitation checklists with user authentication, barcode scanning, and supervisor validation.

## 🏗️ System Architecture

**VERIFIED:** Based on directory structure at project root, the system has 3 main components:

- **Authentication Server** (`dhl_login/`): User management and session handling
- **Backend API** (`backend/`): Data processing and email notifications
- **Frontend Interface** (`Public/`): Interactive checklists and forms (served under `/app/*` behind session auth; validation page is publicly accessible)

## ✨ New & Changed Features

- VERIFIED: Dynamic checklist catalog API
  - New `GET /api/checklists` from dhl_login returns [{ id, title, filename, type, order }]
  - Frontend (scripts.js, barcode_generator.html, validate-checklist.html) now fetches dynamically instead of hard-coded arrays
  - Source: dhl_login/routes/checklistsApi.js; Public/scripts.js; Public/barcode_generator.html; Public/validate-checklist.html

- VERIFIED: Validation flow consolidated
  - Public validation routes consolidated under dhl_login: GET/POST `/api/validate/:id`
  - Duplicated backend validation routes deprecated with 410
  - Shared helpers extracted for loading/saving JSON and applying validation
  - Source: dhl_login/app.js; dhl_login/utils/validationHelpers.js; backend/server.js

- VERIFIED: JWT-based backend auth
  - Frontend fetches a session-issued JWT and includes it as Authorization: Bearer in requests
    - Source: Public/scripts.js lines 5-31, 382-389, 426-439
  - Backend protects endpoints with passport-jwt
    - Source: backend/server.js lines 22-37, 118-123

- VERIFIED: Random 20% checklist verification
  - Backend selects ~20% of submitted checkboxes for supervisor spot‑checks
  - Source: backend/server.js lines 59-100 (getRandomCheckboxes), applied in /submit-form lines 147-155

- VERIFIED: Assignment lifecycle integration
  - Upon successful submission, frontend marks current assignment completed and dhl_login assigns the next one
    - Source: Public/scripts.js lines 301-355 (markAssignmentCompleted) and dhl_login/app.js lines 100-159 (complete-checklist)
  - When supervisor validates, assignment status updates to validated
    - Source: dhl_login/app.js lines 291-336; backend/server.js lines 335-371 and 468-507

- VERIFIED: Health check endpoint
  - backend GET /health for container/orchestration checks
  - Source: backend/server.js lines 571-578

- VERIFIED: CSRF protection on dhl_login
  - Lusca CSRF enabled globally except in test; validation API placed before CSRF to allow external access
  - Source: dhl_login/app.js lines 338-362 and 182-231, 233-336

- VERIFIED: Admin can view submission payloads
  - Route: /admin/assignments/submission-data/:filename
  - Source: dhl_login/routes/admin.js lines 363-430

## 📋 Available Checklists

**VERIFIED:** Based on file count in `Public/checklists/`, there are exactly **22 checklists**:

- **Daily checklists**: 12 files (1_A_Cell_West_Side_Daily.html through 12_F_Cell_East_Side_Daily.html)
- **Weekly checklists**: 2 files (13_All_Cells_Weekly.html, 14_All_Cells_Weekly.html)
- **Quarterly checklists**: 8 files (15_A&B_Cells_LL_Quarterly.html through 22_F_Cell_High_Level_Quarterly.html)

## 🚀 Installation & Setup

### Prerequisites
- Node.js and npm

### 1. Install Dependencies

```bash
# Root dependencies
npm install

# Authentication server dependencies
cd dhl_login
npm install
cd ..

# Backend API dependencies
cd backend
npm install
cd ..
```

### 2. Environment Configuration

#### Authentication Server (dhl_login/.env)
**VERIFIED:** Based on `dhl_login/app.js` lines 159, 366 and `dhl_login/seeders/initial-admin-user.js` lines 8-11:

```env
SESSION_SECRET=your-session-secret
PORT=3000

# Initial admin user (for seeder)
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=password123
INITIAL_ADMIN_SEC_ANSWER1=Fluffy
INITIAL_ADMIN_SEC_ANSWER2=Central Elementary
```

#### Backend API (backend/.env)
**VERIFIED:** Based on `backend/server.js` lines 17, 25, 209, 230-231:

```env
PORT=3001
JWT_SECRET=your-jwt-secret
BASE_URL=http://localhost:3000
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

### 3. Database Setup

**VERIFIED:** Based on `dhl_login/package.json` line 7 and `dhl_login/seeders/` directory:

```bash
cd dhl_login

# Create all database tables (User, Checklist, Assignment)
npm run sync-db

# Populate initial data (admin user and checklists)
npx sequelize-cli db:seed:all

# Create data directories
mkdir -p data
cd ../backend
mkdir -p data
```

**Note:** The `sync-db` script has been updated to create all required tables, not just the User table.

### 4. Start the Application

**VERIFIED:** Based on package.json scripts:

**Terminal 1 - Authentication Server:**
```bash
cd dhl_login
npm start
# Runs on http://localhost:3000 (default)
```

**Terminal 2 - Backend API:**
```bash
cd backend
npm start
# Runs on http://localhost:3001 (default)
```

## 👥 User Guide

### For Associates
1. Login with assigned credentials
2. View assigned checklists on dashboard
3. Complete tasks using barcode scanner or manual selection
4. Submit completed checklists

### For Supervisors
1. Receive email notifications when checklists are submitted
2. Click validation links in emails to review submissions
3. Validation links open on `/app/validate-checklist/:id` (served by dhl_login). NOTE: Supervisor email is currently hardcoded as "sendral.ts.1@pg.com" in `Public/scripts.js` line 371 and `Public/validate-checklist.html` line 880

### For Administrators
**VERIFIED:** Based on `dhl_login/routes/admin.js` lines 35, 174, 302:

1. **User Management**: Access `/admin/users/new` to create user accounts
2. **Assignment Management**: Use `/admin/assignments/assign` for manual checklist assignments
3. **Monitoring**: View assignment status at `/admin/assignments/manage`

**Default Admin Login:** `admin` / `password123` (change in production)

## 🧪 Testing

**VERIFIED:** Based on package.json files:

```bash
# Root level tests
npm test                    # jest --coverage
npm run test:watch         # jest --watch --coverage
npm run test:all           # jest --coverage --runInBand
npm run test:name-population

# Authentication server tests
cd dhl_login && npm test   # jest --testEnvironment=node

# Backend API tests
cd backend && npm test     # jest
```

## ⚙️ Configuration

### Email Setup
**VERIFIED:** Based on `backend/server.js` lines 226-233:
- Uses Gmail SMTP service
- Requires EMAIL_USER and EMAIL_PASS environment variables
- Supervisor email hardcoded in frontend code

### Database
**VERIFIED:** Based on `dhl_login/config/config.json`:
- SQLite database stored in `dhl_login/data/auth.db`
- Checklist submissions stored as JSON files in `backend/data/`

### Checklists
**VERIFIED:** Based on directory structure and seeder file:
- HTML templates in `Public/checklists/`
- Auto-populated via `dhl_login/seeders/20250702152524-populate-checklists.js`

## 🔧 Troubleshooting

### Common Issues

**Database Errors:**
- Ensure `dhl_login/data/` directory exists
- Run `npm run sync-db` in dhl_login directory

**Authentication Problems:**
- Verify JWT_SECRET matches in both .env files
- Clear browser cookies

**Email Failures:**
- Check EMAIL_USER and EMAIL_PASS in backend/.env
- Verify Gmail app password setup

**Port Conflicts:**
- Default ports: 3000 (auth server), 3001 (backend API)
- Modify PORT in respective .env files if needed

## 📁 Project Structure

**VERIFIED:** Based on actual directory listing:

```
sanitation-latest/
├── Public/                    # Frontend static files
│   ├── checklists/           # 22 checklist HTML files
│   ├── scripts.js            # Main JavaScript
│   ├── styles.css            # Styling
│   └── barcode_generator.html # Barcode utility
├── backend/                   # API server
│   ├── server.js             # Main server (port 3001)
│   └── data/                 # JSON submission storage
├── dhl_login/                # Authentication server
│   ├── app.js                # Main server (port 3000)
│   ├── models/               # Database models
│   ├── routes/               # Route handlers
│   ├── seeders/              # Database initialization
│   └── data/                 # SQLite database
└── package.json              # Root dependencies
```

## 📄 License

**VERIFIED:** Based on `dhl_login/package.json` line 13: ISC License

---

**All information in this README has been verified against the actual codebase files and directories.**
