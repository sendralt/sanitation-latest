# 🏭 Warehouse Sanitation Checklist System

A comprehensive web application for managing warehouse sanitation checklists with user authentication, barcode scanning, automated assignment workflows, and supervisor validation.

## ✨ Key Features

- **🔐 Secure Authentication**: User login with session management and JWT-based API authentication
- **📋 Dynamic Checklists**: 22 different sanitation checklists (daily, weekly, quarterly)
- **📱 Barcode Integration**: QR code generation and scanning for efficient checklist access
- **🔄 Automated Workflows**: Automatic assignment of next checklists upon completion
- **✅ Smart Validation**: Random 20% spot-check system for quality assurance
- **📧 Email Notifications**: Automatic supervisor notifications with validation links
- **👥 Role-Based Access**: Different interfaces for associates, supervisors, and administrators
- **📊 Assignment Tracking**: Complete lifecycle management from assignment to validation

## 🏗️ System Architecture

The application consists of three main components:

### 🔑 Authentication Server (`dhl_login/` - Port 3000)
- User management and session handling
- Assignment lifecycle management
- Admin dashboard and user creation
- Checklist validation interface

### 🚀 Backend API (`backend/` - Port 3001)
- Form submission processing
- Email notification system
- JWT-protected endpoints
- Health monitoring

### 🎨 Frontend Interface (`Public/`)
- Interactive checklist forms
- Barcode generator and scanner
- Real-time form validation
- Responsive design for mobile and desktop

## 📋 Available Checklists

The system includes **22 comprehensive sanitation checklists** organized by frequency:

### 📅 Daily Checklists (12 total)
- Cell A: West Side & East Side
- Cell B: West Side & East Side
- Cell C: West Side & East Side
- Cell D: West Side & East Side
- Cell E: West Side & East Side
- Cell F: West Side & East Side

### 📆 Weekly Checklists (2 total)
- All Cells Weekly Wet Mop
- All Cells Weekly Floor Scrub

### 📊 Quarterly Checklists (8 total)
- A&B Cells Low Level
- D Cell Low Level
- High Level checklists for Cells A, B, C, D, E, and F

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)
- **Gmail account** (for email notifications)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/sendralt/sanitation-latest.git
cd sanitation-latest

# Install root dependencies
npm install

# Install authentication server dependencies
cd dhl_login
npm install
cd ..

# Install backend API dependencies
cd backend
npm install
cd ..
```

### 2. Environment Setup

Create environment files for both servers:

#### Authentication Server Configuration
Create `dhl_login/.env`:
```env
SESSION_SECRET=your-super-secret-session-key
PORT=3000

# Initial admin user credentials
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=password123
INITIAL_ADMIN_SEC_ANSWER1=Fluffy
INITIAL_ADMIN_SEC_ANSWER2=Central Elementary
```

#### Backend API Configuration
Create `backend/.env`:
```env
PORT=3001
JWT_SECRET=your-jwt-secret-key
BASE_URL=http://localhost:3000
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

> **📧 Email Setup**: You'll need a Gmail account with an [App Password](https://support.google.com/accounts/answer/185833) for email notifications.

### 3. Database Initialization

```bash
cd dhl_login

# Create database tables (User, Checklist, Assignment)
npm run sync-db

# Populate initial data (admin user and all checklists)
npx sequelize-cli db:seed:all

# Create data directories
mkdir -p data
cd ../backend
mkdir -p data
```

### 4. Launch the Application

Open **two terminal windows** and run:

**Terminal 1 - Authentication Server:**
```bash
cd dhl_login
npm start
```
✅ Server will start at `http://localhost:3000`

**Terminal 2 - Backend API:**
```bash
cd backend
npm start
```
✅ API will start at `http://localhost:3001`

### 5. Access the Application

- **Main Application**: http://localhost:3000
- **Default Admin Login**: `admin` / `password123`
- **API Health Check**: http://localhost:3001/health

## 👥 User Guide

### 🧑‍💼 For Associates (Workers)

1. **Login**: Use your assigned username and password
2. **Dashboard**: View your current assigned checklist
3. **Complete Checklist**:
   - Use the barcode scanner for quick access
   - Fill out all required fields and checkboxes
   - Add comments where necessary
4. **Submit**: Click submit when complete - next checklist is automatically assigned

### 👨‍💼 For Supervisors

1. **Email Notifications**: Receive automatic emails when checklists are submitted
2. **Review Process**: Click the validation link in the email
3. **Validation**: Review the submission and approve/reject with comments
4. **Spot Checks**: System randomly selects ~20% of checkboxes for verification

### 🔧 For Administrators

Access the admin panel at `/admin` with admin credentials:

#### User Management
- **Create Users**: `/admin/users/new` - Add new associates
- **View Users**: Monitor all user accounts and activity

#### Assignment Management
- **Manual Assignment**: `/admin/assignments/assign` - Assign specific checklists
- **Monitor Progress**: `/admin/assignments/manage` - Track all assignments
- **View Submissions**: Access detailed submission data and payloads

#### System Configuration
- Manage checklist catalog
- Monitor system health and performance

> **🔑 Default Admin**: Username: `admin`, Password: `password123` (⚠️ Change in production!)

## 🧪 Testing & Quality Assurance

The application includes comprehensive test suites for all components:

### Running Tests

```bash
# Run all tests with coverage
npm test

# Watch mode for development
npm run test:watch

# Run tests sequentially (for CI/CD)
npm run test:all

# Test specific components
cd dhl_login && npm test    # Authentication server tests
cd backend && npm test      # Backend API tests
```

### Test Coverage
- **Unit Tests**: Individual function and component testing
- **Integration Tests**: API endpoint and database interaction testing
- **Validation Tests**: Form validation and data integrity testing
- **Authentication Tests**: Login, session, and JWT testing

### Quality Tools
- **ESLint**: Code quality and style enforcement
- **Jest**: Testing framework with coverage reporting
- **GitHub Actions**: Automated CI/CD pipeline

## ⚙️ Configuration & Customization

### 📧 Email Notifications
- **Service**: Gmail SMTP
- **Configuration**: Set `EMAIL_USER` and `EMAIL_PASS` in `backend/.env`
- **Supervisor Email**: Currently configured in frontend code
- **Templates**: Automatic notifications with validation links

### 🗄️ Database Storage
- **User Data**: SQLite database at `dhl_login/data/auth.db`
- **Submissions**: JSON files stored in `backend/data/`
- **Models**: User, Checklist, and Assignment entities with full relationships

### 📋 Checklist Management
- **Templates**: HTML files in `Public/checklists/`
- **Dynamic Loading**: Checklists populated automatically via database seeders
- **API Access**: RESTful API for checklist catalog at `/api/checklists`

### 🔐 Security Features
- **CSRF Protection**: Enabled on all forms
- **JWT Authentication**: Secure API access
- **Session Management**: Secure cookie-based sessions
- **Rate Limiting**: Protection against brute force attacks

## 🔧 Troubleshooting

### Common Issues & Solutions

#### 🗄️ Database Problems
```bash
# Database not found or corrupted
cd dhl_login
npm run sync-db
npx sequelize-cli db:seed:all
```

#### 🔐 Authentication Issues
- **JWT Errors**: Ensure `JWT_SECRET` matches in both `.env` files
- **Session Problems**: Clear browser cookies and restart servers
- **Login Failures**: Verify user exists in database

#### 📧 Email Notification Failures
- **Gmail Setup**: Use [App Passwords](https://support.google.com/accounts/answer/185833), not regular password
- **SMTP Errors**: Verify `EMAIL_USER` and `EMAIL_PASS` in `backend/.env`
- **Firewall**: Ensure port 587 (SMTP) is not blocked

#### 🌐 Port Conflicts
- **Default Ports**: 3000 (auth), 3001 (backend)
- **Change Ports**: Update `PORT` in respective `.env` files
- **Check Usage**: `lsof -i :3000` or `netstat -an | grep 3000`

#### 📱 Frontend Issues
- **Barcode Scanner**: Ensure HTTPS for camera access in production
- **Form Validation**: Check browser console for JavaScript errors
- **API Calls**: Verify both servers are running and accessible

## 📁 Project Structure

```
sanitation-latest/
├── 📁 Public/                     # Frontend Interface
│   ├── 📁 checklists/            # 22 HTML checklist templates
│   ├── 📄 scripts.js             # Main application JavaScript
│   ├── 🎨 styles.css             # Application styling
│   ├── 📱 barcode_generator.html # QR code generator utility
│   └── ✅ validate-checklist.html # Supervisor validation interface
│
├── 🔧 backend/                    # Backend API Server (Port 3001)
│   ├── 📄 server.js              # Express server & API endpoints
│   ├── 🧪 tests/                 # API test suites
│   ├── 📁 data/                  # JSON submission storage
│   └── 📄 package.json           # Backend dependencies
│
├── 🔐 dhl_login/                  # Authentication Server (Port 3000)
│   ├── 📄 app.js                 # Main Express application
│   ├── 📁 models/                # Sequelize database models
│   ├── 📁 routes/                # Express route handlers
│   ├── 📁 views/                 # EJS templates
│   ├── 📁 seeders/               # Database initialization scripts
│   ├── 📁 utils/                 # Helper utilities
│   ├── 🧪 tests/                 # Authentication test suites
│   ├── 📁 data/                  # SQLite database storage
│   └── 📄 package.json           # Auth server dependencies
│
├── 📚 docs/                       # Documentation
├── 🧪 test-results/              # Test output and reports
├── 📄 package.json               # Root project dependencies
└── 📄 README.md                  # This file
```

## 🚀 Deployment

### Production Considerations
- **Environment Variables**: Use secure, unique values for all secrets
- **HTTPS**: Enable SSL/TLS for secure communication
- **Database**: Consider PostgreSQL for production instead of SQLite
- **Email**: Configure proper SMTP service (not just Gmail)
- **Monitoring**: Set up logging and health monitoring
- **Backup**: Implement regular database and file backups

### Docker Support
The application is containerizable. See `docs/deployment-onprem.md` for detailed deployment instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC License - See the LICENSE file for details.

## 📞 Support

For issues and questions:
- Check the troubleshooting section above
- Review the documentation in the `docs/` folder
- Create an issue in the GitHub repository

---

*This README reflects the current state of the application as of the latest update. All features and configurations have been verified against the actual codebase.*
