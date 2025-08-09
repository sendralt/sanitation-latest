// Server bootstrap app.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash   = require('connect-flash');
const passport= require('passport');
const ejsLayouts = require('express-ejs-layouts');
const path = require('path'); // <--- Add this
const lusca = require('lusca');

const { assignNextChecklist } = require('./utils/assignmentLogic');
const { Assignment, Checklist } = require('./models');
require('./config/passport')(passport);           // ➜ configure strategy

const app = express();


// Trust proxy so secure cookies work behind nginx/SSL
app.set('trust proxy', 1);

// --- view engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(ejsLayouts);
app.set('layout', 'layouts/main'); // Explicitly set the default layout

// --- body parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // For parsing application/json API request bodies

// --- JWT-authenticated API endpoints (before CSRF protection) ---
const { authenticateJwt } = require('./middleware/authMiddleware');

// Test endpoint to check validated assignments
app.get('/api/test/validated-assignments', async (req, res) => {
  try {
    const { Assignment, User, Checklist } = require('./models');

    const validatedAssignments = await Assignment.findAll({
      where: { status: 'validated' },
      include: [
        { model: User, as: 'user', attributes: ['username', 'firstName', 'lastName'] },
        { model: Checklist, as: 'checklist', attributes: ['title', 'filename'] }
      ],
      order: [['validatedAt', 'DESC']]
    });

    res.json({
      count: validatedAssignments.length,
      assignments: validatedAssignments.map(a => ({
        id: a.id,
        user: `${a.user.firstName} ${a.user.lastName} (${a.user.username})`,
        checklist: a.checklist.title,
        validatedAt: a.validatedAt,
        submissionDataFilePath: a.submissionDataFilePath
      }))
    });
  } catch (error) {
    console.error('Error fetching validated assignments:', error);
    res.status(500).json({ error: 'Failed to fetch validated assignments' });
  }
});

// Test endpoint to create a validated assignment for testing
app.post('/api/test/create-validated-assignment', async (req, res) => {
  try {
    const { Assignment, User, Checklist } = require('./models');

    // Find a user and checklist to create test data
    const user = await User.findOne({ where: { isAdmin: false } });
    const checklist = await Checklist.findOne();

    if (!user || !checklist) {
      return res.status(404).json({ error: 'No user or checklist found for testing' });
    }

    // Create a test assignment
    const assignment = await Assignment.create({
      userId: user.id,
      checklistId: checklist.id,
      status: 'validated',
      completedAt: new Date(Date.now() - 60000), // 1 minute ago
      validatedAt: new Date(),
      submissionDataFilePath: `data_${Date.now()}.json`,
      validationStatus: 'approved'
    });

    res.json({
      message: 'Test validated assignment created',
      assignmentId: assignment.id,
      user: user.username,
      checklist: checklist.title
    });
  } catch (error) {
    console.error('Error creating test assignment:', error);
    res.status(500).json({ error: 'Failed to create test assignment' });
  }
});

app.post('/api/assignments/complete-checklist', authenticateJwt, async (req, res) => {
  console.log('[DEBUG] /api/assignments/complete-checklist called');
  console.log('[DEBUG] Request body:', req.body);
  console.log('[DEBUG] User:', req.user.username, 'ID:', req.user.id);

  try {
    const { checklistFilename } = req.body;
    const userId = req.user.id;

    if (!checklistFilename) {
      console.log('[DEBUG] Missing checklist filename');
      return res.status(400).json({
        error: 'Checklist filename is required'
      });
    }

    // Find the user's active assignment for this checklist
    const assignment = await Assignment.findOne({
      where: {
        userId: userId,
        completedAt: null // Only incomplete assignments
      },
      include: [{
        model: Checklist,
        as: 'checklist',
        where: {
          filename: checklistFilename
        }
      }]
    });

    if (!assignment) {
      return res.status(404).json({
        error: 'No active assignment found for this checklist'
      });
    }

    // Mark the assignment as completed
    await assignment.update({
      completedAt: new Date(),
      status: 'completed'
    });

    console.log(`Assignment ${assignment.id} marked as completed for user ${req.user.username}`);

    // Assign the next checklist to the user
    await assignNextChecklist(req.user);

    res.status(200).json({
      message: 'Assignment marked as completed successfully',
      assignmentId: assignment.id
    });

  } catch (error) {
    console.error('Error completing assignment:', error);
    res.status(500).json({
      error: 'Failed to complete assignment'
    });
  }
});

// --- sessions
app.use(session({
  secret            : process.env.SESSION_SECRET,
  resave            : false,
  saveUninitialized : false,
  cookie            : {
    maxAge: 1000 * 60 * 60, // 1h
    sameSite: 'Lax', // Explicitly set SameSite policy
    secure: process.env.NODE_ENV === 'production' // Set to true only in production (if using HTTPS)
  }
}));

// --- passport
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use(flash());

// --- Validation API routes for supervisors (no authentication or CSRF required) ---
// These routes must be placed BEFORE CSRF middleware to allow supervisor access
const fs = require('fs');

// GET route to fetch validation data
app.get('/api/validate/:id', (req, res) => {
    console.log(`[DEBUG] GET /api/validate/:id - START - ID: ${req.params.id}`);
    const fileId = req.params.id;

    // Construct the file path based on the ID
    const filePath = path.join(__dirname, '..', 'backend', 'data', `data_${fileId}.json`);

    // Check if the file exists
    if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath, 'utf8');
        const formData = JSON.parse(fileData);

        // Check if this validation link has already been accessed
        if (formData.validationLinkAccessed) {
            return res.status(410).json({
                message: 'This validation link has already been used and is no longer valid.',
                alreadyUsed: true
            });
        }

        // Check if the checklist has already been validated
        if (formData.supervisorValidation) {
            return res.status(410).json({
                message: 'This checklist has already been validated.',
                alreadyValidated: true,
                validatedBy: formData.supervisorValidation.supervisorName,
                validatedAt: formData.supervisorValidation.validatedAt
            });
        }

        // Check if randomCheckboxes is available and is an array
        if (!formData.randomCheckboxes || !Array.isArray(formData.randomCheckboxes)) {
            return res.status(400).json({ message: 'Random checkboxes not found in the checklist data.' });
        }

        // Mark the validation link as accessed
        formData.validationLinkAccessed = true;
        formData.validationLinkAccessedAt = new Date().toISOString();

        // Save the updated data to mark the link as used
        fs.writeFileSync(filePath, JSON.stringify(formData, null, 2));

        // Send the relevant parts of formData as JSON
        res.status(200).json({
            fileId: fileId,
            title: formData.title,
            checkboxes: formData.checkboxes,
            randomCheckboxes: formData.randomCheckboxes
        });
    } else {
        res.status(404).json({ message: 'Checklist not found.' });
    }
    console.log(`[DEBUG] GET /api/validate/:id - END - ID: ${req.params.id}`);
});

// POST route to handle supervisor validation submission
app.post('/api/validate/:id', async (req, res) => {
    console.log(`[DEBUG] POST /api/validate/:id - START - ID: ${req.params.id}`);
    const fileId = req.params.id;
    const validationData = req.body;

    // Construct the file path based on the ID
    const filePath = path.join(__dirname, '..', 'backend', 'data', `data_${fileId}.json`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Checklist not found.' });
    }

    // Read the original checklist data from the file
    const fileData = fs.readFileSync(filePath, 'utf8');
    const formData = JSON.parse(fileData);

    // Update checkboxes based on the validation data
    validationData.validatedCheckboxes.forEach((validatedCb) => {
        const { id: validatedId, checked: newCheckedState } = validatedCb;
        let itemUpdated = false;

        // Iterate through headings to find the validated checkbox ID
        for (const headingKey in formData.checkboxes) {
            if (formData.checkboxes[headingKey] && formData.checkboxes[headingKey][validatedId]) {
                formData.checkboxes[headingKey][validatedId].checked = newCheckedState;
                itemUpdated = true;
                break;
            }
        }
        if (!itemUpdated) {
            console.warn(`Validated checkbox ID ${validatedId} not found in original checklist data under any heading.`);
        }
    });

    // Add supervisor feedback to the formData
    formData.supervisorValidation = {
        supervisorName: validationData.supervisorName,
        validatedAt: new Date().toISOString(),
        validatedCheckboxes: validationData.validatedCheckboxes.reduce((acc, cb) => {
            acc[cb.id] = cb.checked;
            return acc;
        }, {})
    };

    // Save the updated checklist data back to the file
    fs.writeFileSync(filePath, JSON.stringify(formData, null, 2));

    try {
        // Update the assignment status to 'validated'
        const { Assignment, User } = require('./models');
        const filename = `data_${fileId}.json`;

        // Find the assignment by the submission data file path
        const assignment = await Assignment.findOne({
            where: {
                submissionDataFilePath: filename,
                status: 'completed'
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'firstName', 'lastName']
            }]
        });

        if (assignment) {
            // Find the supervisor user by name
            const supervisor = await User.findOne({
                where: {
                    firstName: validationData.supervisorName.split(' ')[0] || validationData.supervisorName,
                    isAdmin: true
                }
            });

            await assignment.update({
                status: 'validated',
                validatedAt: new Date(),
                validatedByUserId: supervisor ? supervisor.id : null,
                validationStatus: 'approved'
            });

            console.log(`Assignment ${assignment.id} marked as validated by supervisor: ${validationData.supervisorName}`);
        } else {
            console.warn(`No assignment found with submission data file path: ${filename}`);
        }
    } catch (error) {
        console.error('Error updating assignment validation status:', error);
        // Don't fail the validation if this update fails
    }

    res.status(200).json({ message: 'Validation completed successfully.' });
    console.log(`[DEBUG] POST /api/validate/:id - END - ID: ${req.params.id}`);
});

// --- CSRF protection with lusca (disabled in test environment)
// Apply CSRF protection globally. This should be after session and body-parser.
// For specific routes, you can apply it selectively in the router.
// However, for general safety with forms, global is often a good start.
if (process.env.NODE_ENV !== 'test') {
  app.use(lusca.csrf()); // Default configuration uses session-based tokens

  // Middleware to make CSRF token available to all views
  app.use((req, res, next) => {
    if (req.csrfToken) { // Lusca should add this function to the request
      const token = req.csrfToken(); // Get the token
      console.log('CSRF Token Generated for res.locals:', token); // Log the token
      res.locals._csrf = token; // Set it in locals
    } else {
      console.log('req.csrfToken function NOT FOUND on request object for res.locals middleware');
    }
    next();
  });
} else {
  // In test environment, provide a dummy CSRF token for templates
  app.use((req, res, next) => {
    res.locals._csrf = 'test-csrf-token';
    next();
  });
}

// --- static assets (css, logos, etc.)
app.use(express.static(__dirname + '/public'));

// --- Serve Delivery fonts from root Delivery directory
app.use('/Delivery', express.static(path.join(__dirname, '..', 'Delivery')));

// --- flash middleware: expose to all templates
app.use((req,res,next)=>{
  res.locals.success = req.flash('success');
  res.locals.error   = req.flash('error');
  next();
});

// Serve the logo specifically
app.get('/dhl-logo.svg', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'layouts', 'dhl-logo.svg'));
});

// --- Authentication Middleware for Web Pages ---
const ensureWebAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.session.returnTo = req.originalUrl; // Store the original URL
  console.log(`[ensureWebAuthenticated] Set req.session.returnTo to: ${req.session.returnTo}. Full session: ${JSON.stringify(req.session)}`);
  req.flash('error', 'Please log in to view that resource.');
  res.redirect('/login-page');
};

// --- Specific route for Supervisor Validation page ---
// This ensures that any path like /app/validate-checklist/someID serves the validate-checklist.html file.
// No authentication required to allow supervisors to access validation links from emails.
app.get('/app/validate-checklist/:id', (req, res) => {
    console.log(`[DEBUG] Validation route hit for ID: ${req.params.id}`);
    res.sendFile(path.join(__dirname, '..', 'Public', 'validate-checklist.html'));
});



// --- Serve SanitationChecks Application (Protected) ---
// This serves static files from the main 'Public' directory under the '/app' path for other /app/* routes.
// Access is protected by ensureWebAuthenticated.
// This should come AFTER specific /app/ routes like the one above.

// ADDED: Logging for /app requests to test if HTML files are being requested
app.use('/app', (req, res, next) => {
  console.log(`[App Static Middleware] Received request for: ${req.method} ${req.originalUrl}`);
  if (req.originalUrl.endsWith('.html')) {
    console.log(`[App Static Middleware] Attempting to serve HTML file: ${req.originalUrl}. User authenticated: ${req.isAuthenticated()}`);
  }
  next();
});
// END ADDED

app.use('/app', ensureWebAuthenticated, express.static(path.join(__dirname, '..', 'Public')));


// --- routes
// --- Web Page Routes ---
app.get('/', (req, res) => {
  res.redirect('/login-page');
});

app.get('/login-page', (req, res) => {
  console.log(`[GET /login-page] Arrived at login page. req.session content: ${JSON.stringify(req.session)}`);
  // Ensure 'login' is the correct name of your EJS template for the login page
  res.render('login', { title: 'Login', user: req.user });
});

app.post('/login-page', (req, res, next) => {
  console.log('[Login POST Start] req.session before passport.authenticate:', JSON.stringify(req.session));
  passport.authenticate('local', (err, user, info) => {
    console.log('[Login POST passport.authenticate callback] req.session:', JSON.stringify(req.session));
    if (err) { return next(err); }
    if (!user) {
      req.flash('error', info.message || 'Login failed. Please try again.');
      return res.redirect('/login-page');
    }

    // Capture returnTo BEFORE req.logIn, as req.logIn might regenerate the session
    const capturedReturnTo = req.session.returnTo;
    console.log(`[Login POST passport.authenticate callback] Captured req.session.returnTo before req.logIn: ${capturedReturnTo}`);

    req.logIn(user, async (err) => {
      if (err) { return next(err); }

      await assignNextChecklist(user);

      // req.session might have been regenerated by req.logIn(), so req.session.returnTo might be gone.
      // Use the capturedReturnTo value.
      console.log(`[Login POST req.logIn callback] req.session AFTER req.logIn:`, JSON.stringify(req.session));
      console.log(`[Login POST req.logIn callback] Using capturedReturnTo: ${capturedReturnTo}`);

      // It's good practice to delete the original if it somehow survived, though unlikely here.
      if (req.session && req.session.returnTo) {
          delete req.session.returnTo;
      }

      console.log(`[Login POST req.logIn callback] Redirecting to: ${capturedReturnTo || '/dashboard'}`);
      return res.redirect(capturedReturnTo || '/dashboard');
    });
  })(req, res, next);
});

app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash('success', 'You have successfully logged out.');
    res.redirect('/login-page');
  });
});

// --- Dashboard Route ---
app.get('/dashboard', ensureWebAuthenticated, async (req, res) => {
  try {
    // Get user's current assignments
    const assignments = await Assignment.findAll({
      where: {
        userId: req.user.id,
        completedAt: null, // Only get incomplete assignments
        status: 'assigned' // Exclude cancelled assignments from dashboard
      },
      include: [{
        model: Checklist,
        as: 'checklist',
        attributes: ['id', 'title', 'filename', 'type']
      }],
      order: [['assignedAt', 'DESC']] // Most recent first
    });

    res.render('dashboard', {
      title: 'Dashboard',
      assignments: assignments
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.render('dashboard', {
      title: 'Dashboard',
      assignments: []
    });
  }
});


// --- API Routes ---
app.use('/api/auth', require('./routes/auth')); // Mount API auth routes



// --- Admin Routes ---
app.use('/admin', require('./routes/admin')); // Mount Admin routes

// --- Forgot Password Routes ---
app.use('/forgot-password', require('./routes/forgotPassword')); // Mount forgot password routes

// --- Other Protected Routes ---
app.use('/checklists', require('./routes/checklist')); // protected

// --- Export app for testing ---
module.exports = app;

// --- start server (only if this file is run directly, not when required for testing)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, ()=> console.log(`Server running on http://localhost:${PORT}`));
}