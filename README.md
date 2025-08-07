# Warehouse Sanitation Checklists

A web application for managing warehouse sanitation checklists with user authentication, barcode scanning, and supervisor validation.

## 🏗️ System Architecture

**VERIFIED:** Based on directory structure at project root, the system has 3 main components:

- **Authentication Server** (`dhl_login/`): User management and session handling
- **Backend API** (`backend/`): Data processing and email notifications  
- **Frontend Interface** (`Public/`): Interactive checklists and forms

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
**VERIFIED:** Based on `backend/server.js` lines 17, 25, 198, 219-220:

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
3. **NOTE:** Supervisor email is hardcoded as "sendral.ts.1@pg.com" in `Public/validate-checklist.html` line 880

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
**VERIFIED:** Based on `backend/server.js` lines 216-222:
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
