const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const User = require('../models/user');
const {
  getSecurityQuestionById,
  hashPassword,
  compareAnswer,
  normalizeAnswer
} = require('../utils/auth');

// Helper function to get CSRF token (handles test environment)
function getCsrfToken(req) {
  return req.csrfToken ? req.csrfToken() : 'test-csrf-token';
}

// Rate limiting for forgot password attempts
// More lenient settings for test environment and reasonable limits for production
const forgotPasswordLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1000 : 15 * 60 * 1000, // 1 second in test, 15 minutes in production
  max: process.env.NODE_ENV === 'test' ? 100 : 20, // 100 requests in test, 20 in production (allows multiple complete flows)
  message: 'Too many password reset attempts. Please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

// GET route - Display forgot password form (Step 1: Enter username)
router.get('/', (req, res) => {
  res.render('forgot-password', {
    title: 'Forgot Password',
    step: 1,
    username: '',
    questions: [],
    errorMessages: req.flash('error'),
    successMessages: req.flash('success'),
    _csrf: getCsrfToken(req)
  });
});

// POST route - Step 1: Validate username and show security questions
router.post('/', forgotPasswordLimiter, async (req, res) => {
  const { username } = req.body;

  if (!username || username.trim() === '') {
    req.flash('error', 'Username is required.');
    return res.redirect('/forgot-password');
  }

  try {
    const user = await User.findOne({ where: { username: username.trim() } });
    
    if (!user) {
      // Don't reveal if user exists or not for security
      req.flash('error', 'If this username exists, security questions will be displayed.');
      return res.redirect('/forgot-password');
    }

    // Check rate limiting for this specific user
    const now = new Date();
    const lastAttemptTime = user.lastPasswordResetAttempt ? new Date(user.lastPasswordResetAttempt).getTime() : 0;
    
    if (user.passwordResetAttemptCount >= 5 && (now.getTime() - lastAttemptTime) < (15 * 60 * 1000)) {
      req.flash('error', 'Too many reset attempts for this account. Please try again after 15 minutes.');
      return res.redirect('/forgot-password');
    }

    // Reset attempt count if lockout period has passed
    if (user.passwordResetAttemptCount >= 5 && (now.getTime() - lastAttemptTime) >= (15 * 60 * 1000)) {
      user.passwordResetAttemptCount = 0;
      await user.save();
    }

    const q1 = getSecurityQuestionById(user.securityQuestion1Id);
    const q2 = getSecurityQuestionById(user.securityQuestion2Id);

    if (!q1 || !q2) {
      console.error(`User ${username} has invalid security question IDs`);
      req.flash('error', 'Error retrieving security questions. Please contact support.');
      return res.redirect('/forgot-password');
    }

    // Store username in session for next step
    req.session.resetUsername = username.trim();

    res.render('forgot-password', {
      title: 'Forgot Password - Security Questions',
      step: 2,
      username: username.trim(),
      questions: [
        { id: q1.id, text: q1.text },
        { id: q2.id, text: q2.text }
      ],
      errorMessages: req.flash('error'),
      successMessages: req.flash('success'),
      _csrf: getCsrfToken(req)
    });

  } catch (error) {
    console.error('Forgot password step 1 error:', error);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/forgot-password');
  }
});

// POST route - Step 2: Verify security answers and show password reset form
router.post('/verify-answers', forgotPasswordLimiter, async (req, res) => {
  const { answer1, answer2, questionId1, questionId2 } = req.body;
  const username = req.session.resetUsername;

  if (!username) {
    req.flash('error', 'Session expired. Please start over.');
    return res.redirect('/forgot-password');
  }

  if (!answer1 || !answer2 || !questionId1 || !questionId2) {
    req.flash('error', 'Both security answers are required.');
    return res.redirect('/forgot-password');
  }

  try {
    const user = await User.findOne({ where: { username } });

    if (!user) {
      req.flash('error', 'User not found. Please start over.');
      delete req.session.resetUsername;
      return res.redirect('/forgot-password');
    }

    // Check rate limiting
    const now = new Date();
    const lastAttemptTime = user.lastPasswordResetAttempt ? new Date(user.lastPasswordResetAttempt).getTime() : 0;

    if (user.passwordResetAttemptCount >= 5 && (now.getTime() - lastAttemptTime) < (15 * 60 * 1000)) {
      req.flash('error', 'Too many reset attempts. Please try again after 15 minutes.');
      delete req.session.resetUsername;
      return res.redirect('/forgot-password');
    }

    // Verify security answers by matching question IDs to the correct stored hashes
    let answer1Correct = false;
    let answer2Correct = false;

    // Match answers to the correct stored hashes based on question IDs
    const q1Id = parseInt(questionId1, 10);
    const q2Id = parseInt(questionId2, 10);

    if (q1Id === user.securityQuestion1Id) {
      answer1Correct = await compareAnswer(answer1, user.securityAnswer1Hash);
    } else if (q1Id === user.securityQuestion2Id) {
      answer1Correct = await compareAnswer(answer1, user.securityAnswer2Hash);
    }

    if (q2Id === user.securityQuestion1Id) {
      answer2Correct = await compareAnswer(answer2, user.securityAnswer1Hash);
    } else if (q2Id === user.securityQuestion2Id) {
      answer2Correct = await compareAnswer(answer2, user.securityAnswer2Hash);
    }

    if (!answer1Correct || !answer2Correct) {
      // Increment attempt count
      user.passwordResetAttemptCount += 1;
      user.lastPasswordResetAttempt = now;
      await user.save();

      req.flash('error', 'Incorrect security answers. Please try again.');
      return res.redirect('/forgot-password');
    }

    // Reset attempts on success
    user.passwordResetAttemptCount = 0;
    user.lastPasswordResetAttempt = null;
    await user.save();

    // Mark session as verified for password reset
    req.session.resetVerified = true;

    res.render('forgot-password', {
      title: 'Reset Password',
      step: 3,
      username: username,
      questions: [],
      errorMessages: req.flash('error'),
      successMessages: req.flash('success'),
      _csrf: getCsrfToken(req)
    });

  } catch (error) {
    console.error('Forgot password verify answers error:', error);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/forgot-password');
  }
});

// POST route - Step 3: Reset password
router.post('/reset', forgotPasswordLimiter, async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  const username = req.session.resetUsername;
  const verified = req.session.resetVerified;

  if (!username || !verified) {
    req.flash('error', 'Session expired or not verified. Please start over.');
    return res.redirect('/forgot-password');
  }

  if (!newPassword || !confirmPassword) {
    req.flash('error', 'Both password fields are required.');
    return res.redirect('/forgot-password');
  }

  if (newPassword !== confirmPassword) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect('/forgot-password');
  }

  if (newPassword.length < 8) {
    req.flash('error', 'Password must be at least 8 characters long.');
    return res.redirect('/forgot-password');
  }

  try {
    const user = await User.findOne({ where: { username } });
    
    if (!user) {
      req.flash('error', 'User not found. Please start over.');
      delete req.session.resetUsername;
      delete req.session.resetVerified;
      return res.redirect('/forgot-password');
    }

    // Update password
    user.passwordHash = await hashPassword(newPassword);
    user.passwordResetAttemptCount = 0;
    user.lastPasswordResetAttempt = null;
    await user.save();

    // Clear session data
    delete req.session.resetUsername;
    delete req.session.resetVerified;

    req.flash('success', 'Password has been reset successfully. You can now log in with your new password.');
    res.redirect('/login-page');

  } catch (error) {
    console.error('Password reset error:', error);
    req.flash('error', 'An error occurred while resetting password. Please try again.');
    res.redirect('/forgot-password');
  }
});

module.exports = router;
