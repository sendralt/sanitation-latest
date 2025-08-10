const express = require('express');
const router = express.Router();
const { ensureAdmin } = require('../middleware/authMiddleware');
const { getSecurityQuestions, getSecurityQuestionById } = require('../utils/auth');
const User = require('../models/user'); // Needed for checking username existence, etc.
const { hashPassword, hashAnswer } = require('../utils/auth');
const {
  manuallyAssignChecklist,
  getAssignableUsers,
  getAvailableChecklists,
  getCurrentAssignments
} = require('../utils/assignmentLogic');
const fs = require('fs');
const path = require('path');

// Helper function to get CSRF token (handles test environment)
function getCsrfToken(req) {
  return req.csrfToken ? req.csrfToken() : 'test-csrf-token';
}

// Authentication middleware for web-based admin routes
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Please log in to view that resource.');
  res.redirect('/login-page');
};

// Admin dashboard or landing page (optional, can be added later)
// router.get('/', ensureAuthenticated, ensureAdmin, (req, res) => {
//   res.render('admin/dashboard', { title: 'Admin Dashboard' });
// });

// GET route to display the new user creation form
router.get('/users/new', ensureAuthenticated, ensureAdmin, (req, res) => {
  try {
    const securityQuestions = getSecurityQuestions();
    // For the EJS template, we might need to pass an empty user object or default values
    // if the form is also used for editing or re-rendering with errors.
    res.render('admin/create-user', {
      title: 'Create New User',
      securityQuestions: securityQuestions,
      user: req.user, // Pass the logged-in admin user if needed by the layout
      formData: {}, // To hold onto form data if re-rendering after validation error
      errorMessages: req.flash('error'), // For displaying general errors
      validationErrors: {}, // To hold specific field validation errors
      _csrf: getCsrfToken(req) // Pass CSRF token to the view
    });
  } catch (error) {
    console.error('Error fetching security questions for admin create user form:', error);
    req.flash('error', 'Failed to load the user creation form.');
    res.redirect('/admin'); // Or some other appropriate admin error page or dashboard
  }
});

// POST route to handle new user creation
router.post('/users', ensureAuthenticated, ensureAdmin, async (req, res) => {
  const { username, password, firstName, lastName, securityQuestion1Id, securityAnswer1, securityQuestion2Id, securityAnswer2 } = req.body;
  const securityAnswers = [
    { questionId: parseInt(securityQuestion1Id, 10), answer: securityAnswer1 },
    { questionId: parseInt(securityQuestion2Id, 10), answer: securityAnswer2 }
  ];
  const formData = req.body; // To repopulate form on error
  let validationErrors = {};

  // --- Basic Validation ---
  if (!firstName || firstName.trim() === '') {
    validationErrors.firstName = 'First Name is required.';
  }
  if (!lastName || lastName.trim() === '') {
    validationErrors.lastName = 'Last Name is required.';
  }
  if (!username || username.trim().length < 3 || username.trim().length > 30) {
    validationErrors.username = 'Username must be 3-30 characters long.';
  }
  // Add more username validation if needed (e.g., alphanumeric)

  if (!password || password.length < 8) {
    validationErrors.password = 'Password must be at least 8 characters long.';
  }

  if (securityAnswers.length !== 2 || !securityAnswers[0].questionId || !securityAnswers[1].questionId ||
      securityAnswers[0].answer.trim() === '' || securityAnswers[1].answer.trim() === '') {
    validationErrors.securityAnswers = 'Two security questions and answers are required.';
  } else if (securityAnswers[0].questionId === securityAnswers[1].questionId) {
    validationErrors.securityAnswers = 'Security questions must be unique.';
  } else {
    const q1 = getSecurityQuestionById(securityAnswers[0].questionId);
    const q2 = getSecurityQuestionById(securityAnswers[1].questionId);
    if (!q1 || !q2) {
        validationErrors.securityAnswers = 'Invalid security question ID provided.';
    }
  }
  
  // Check if username already exists
  if (!validationErrors.username) {
    try {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        validationErrors.username = 'Username already exists.';
      }
    } catch (dbError) {
      console.error('Error checking existing username:', dbError);
      req.flash('error', 'An error occurred during validation.');
      // Re-render form with error
      const securityQuestions = getSecurityQuestions();
      return res.render('admin/create-user', {
        title: 'Create New User',
        securityQuestions,
        user: req.user,
        formData,
        errorMessages: req.flash('error'),
        validationErrors,
        _csrf: getCsrfToken(req) // Pass CSRF token
      });
    }
  }


  if (Object.keys(validationErrors).length > 0) {
    const securityQuestions = getSecurityQuestions();
    return res.render('admin/create-user', {
      title: 'Create New User',
      securityQuestions,
      user: req.user,
      formData, // Pass back the submitted data to repopulate the form
      errorMessages: req.flash('error'), // General flash messages
      validationErrors, // Specific field validation errors
      _csrf: getCsrfToken(req) // Pass CSRF token
    });
  }

  // --- If Validation Passes ---
  try {
    const passwordHash = await hashPassword(password);
    const securityAnswer1Hash = await hashAnswer(securityAnswers[0].answer);
    const securityAnswer2Hash = await hashAnswer(securityAnswers[1].answer);

    await User.create({
      username,
      firstName,
      lastName,
      passwordHash,
      securityQuestion1Id: securityAnswers[0].questionId,
      securityAnswer1Hash,
      securityQuestion2Id: securityAnswers[1].questionId,
      securityAnswer2Hash,
      isAdmin: false, // By default, users created via this form are not admins
                      // Add a checkbox in the form if admin creation is desired here
    });

    req.flash('success', `User '${username}' created successfully.`);
    res.redirect('/admin/users/new'); // Or redirect to a user list page: /admin/users
  } catch (error) {
    console.error('Error creating user:', error);
    req.flash('error', 'An error occurred while creating the user.');
    // Re-render form with error
    const securityQuestions = getSecurityQuestions();
    res.render('admin/create-user', {
      title: 'Create New User',
      securityQuestions,
      user: req.user,
      formData,
      errorMessages: req.flash('error'),
      validationErrors, // Keep any validation errors if they occurred before this catch
      _csrf: getCsrfToken(req) // Pass CSRF token
    });
  }
});

// --- Assignment Management Routes ---

// GET route to display the manual assignment form
router.get('/assignments/assign', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    // Get all non-admin users and available checklists
    const [users, checklists] = await Promise.all([
      getAssignableUsers(),
      getAvailableChecklists()
    ]);

    res.render('admin/assign-checklist', {
      title: 'Manual Checklist Assignment',
      user: req.user,
      users: users,
      checklists: checklists,
      formData: {},
      errorMessages: req.flash('error'),
      successMessages: req.flash('success'),
      validationErrors: {},
      _csrf: getCsrfToken(req)
    });
  } catch (error) {
    console.error('Error loading assignment form:', error);
    req.flash('error', 'Failed to load the assignment form.');
    res.redirect('/dashboard');
  }
});

// POST route to handle manual assignment submissions
router.post('/assignments/assign', ensureAuthenticated, ensureAdmin, async (req, res) => {
  const { userId, checklistId, overrideExisting } = req.body;
  const formData = req.body;
  let validationErrors = {};

  // Basic validation
  if (!userId || userId.trim() === '') {
    validationErrors.userId = 'Please select a user.';
  } else {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      validationErrors.userId = 'Invalid user selection.';
    }
  }

  if (!checklistId || checklistId.trim() === '') {
    validationErrors.checklistId = 'Please select a checklist.';
  } else {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(checklistId)) {
      validationErrors.checklistId = 'Invalid checklist selection.';
    }
  }

  // Prevent admin from assigning to themselves
  if (userId === req.user.id) {
    validationErrors.userId = 'You cannot assign checklists to yourself.';
  }

  // If validation fails, re-render form with errors
  if (Object.keys(validationErrors).length > 0) {
    try {
      const [users, checklists] = await Promise.all([
        getAssignableUsers(),
        getAvailableChecklists()
      ]);

      return res.render('admin/assign-checklist', {
        title: 'Manual Checklist Assignment',
        user: req.user,
        users: users,
        checklists: checklists,
        formData: formData,
        errorMessages: req.flash('error'),
        successMessages: req.flash('success'),
        validationErrors: validationErrors,
        _csrf: getCsrfToken(req)
      });
    } catch (error) {
      console.error('Error re-rendering assignment form:', error);
      req.flash('error', 'An error occurred while processing your request.');
      return res.redirect('/admin/assignments/assign');
    }
  }

  // Attempt to create the assignment
  try {
    const result = await manuallyAssignChecklist({
      userId: userId,
      checklistId: checklistId,
      adminUserId: req.user.id,
      overrideExisting: overrideExisting === 'on' || overrideExisting === true
    });

    if (result.success) {
      req.flash('success', result.message);
      if (result.overridePerformed) {
        req.flash('success', 'Previous assignment was cancelled and replaced.');
      }
      res.redirect('/admin/assignments/manage');
    } else {
      req.flash('error', result.error);

      // Provide additional context for different error types
      if (result.existingAssignment) {
        req.flash('error', `Existing assignment: ${result.existingAssignment.checklistTitle} (assigned ${new Date(result.existingAssignment.assignedAt).toLocaleDateString()})`);
      }

      if (result.recentCompletion) {
        req.flash('error', `Recent completion: ${result.recentCompletion.checklistTitle} (completed ${new Date(result.recentCompletion.completedAt).toLocaleDateString()})`);
      }

      // Add helpful suggestions based on error type
      if (result.error.includes('already has an active assignment')) {
        req.flash('error', 'Tip: Check the "Override existing assignment" option to replace the current assignment.');
      } else if (result.error.includes('recently completed')) {
        req.flash('error', 'Tip: Consider assigning a different checklist or wait before reassigning the same one.');
      }

      res.redirect('/admin/assignments/assign');
    }
  } catch (error) {
    console.error('Error creating manual assignment:', error);
    req.flash('error', 'An unexpected error occurred while creating the assignment.');
    res.redirect('/admin/assignments/assign');
  }
});

// GET route to display assignment management dashboard
router.get('/assignments/manage', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    // Get query parameters for filtering
    const { status, userId, search, dateFrom, dateTo } = req.query;

    // Build filters object
    const filters = {};
    if (status && status !== 'all') {
      filters.status = status;
    }
    if (userId && userId !== 'all') {
      filters.userId = userId;
    }
    if (dateFrom && dateFrom.trim() !== '') {
      filters.dateFrom = dateFrom.trim();
    }
    if (dateTo && dateTo.trim() !== '') {
      filters.dateTo = dateTo.trim();
    }

    // Get assignments and users for filtering
    const [assignments, users] = await Promise.all([
      getCurrentAssignments(filters),
      getAssignableUsers()
    ]);

    // Apply search filter if provided
    let filteredAssignments = assignments;
    if (search && search.trim() !== '') {
      const searchTerm = search.toLowerCase().trim();
      filteredAssignments = assignments.filter(assignment =>
        assignment.user.firstName.toLowerCase().includes(searchTerm) ||
        assignment.user.lastName.toLowerCase().includes(searchTerm) ||
        assignment.user.username.toLowerCase().includes(searchTerm) ||
        assignment.checklist.title.toLowerCase().includes(searchTerm)
      );
    }

    res.render('admin/manage-assignments', {
      title: 'Manage Assignments',
      user: req.user,
      assignments: filteredAssignments,
      users: users,
      filters: {
        status: status || 'all',
        userId: userId || 'all',
        search: search || '',
        dateFrom: dateFrom || '',
        dateTo: dateTo || ''
      },
      errorMessages: req.flash('error'),
      successMessages: req.flash('success')
    });
  } catch (error) {
    console.error('Error loading assignment management dashboard:', error);
    req.flash('error', 'Failed to load the assignment management dashboard.');
    res.redirect('/dashboard');
  }
});

// GET route to display submission data for completed/validated assignments
router.get('/assignments/submission-data/:filename', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename format for security
    if (!filename || !filename.match(/^data_\d+\.json$/)) {
      req.flash('error', 'Invalid submission file format.');
      return res.redirect('/admin/assignments/manage');
    }

    // Find the assignment to get context information
    const Assignment = require('../models/assignment');
    const User = require('../models/user');
    const Checklist = require('../models/checklist');

    const assignment = await Assignment.findOne({
      where: { submissionDataFilePath: filename },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: Checklist,
          as: 'checklist',
          attributes: ['id', 'title', 'filename', 'type']
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'username', 'firstName', 'lastName'],
          required: false
        }
      ]
    });

    if (!assignment) {
      req.flash('error', 'Assignment not found for this submission file.');
      return res.redirect('/admin/assignments/manage');
    }

    // Read the submission data file
    const dataDir = path.join(__dirname, '../../backend/data');
    const filePath = path.join(dataDir, filename);

    if (!fs.existsSync(filePath)) {
      req.flash('error', 'Submission data file not found.');
      return res.redirect('/admin/assignments/manage');
    }

    const submissionData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    res.render('admin/submission-data-view', {
      title: 'Submission Data View',
      user: req.user,
      assignment: assignment,
      submissionData: submissionData,
      filename: filename
    });

  } catch (error) {
    console.error('Error loading submission data:', error);
    req.flash('error', 'Failed to load submission data.');
    res.redirect('/admin/assignments/manage');
  }
});

module.exports = router;