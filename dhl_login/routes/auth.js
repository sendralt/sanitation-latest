// Auth routes routes/auth.js
const express = require('express');
const passport = require('passport');
const router = express.Router();
const bcrypt = require('bcryptjs'); // For direct use if not fully relying on utils for some checks
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto'); // For temporary tokens if needed

const User = require('../models/user');
const {
    generateToken,
    hashPassword,
    comparePassword,
    getSecurityQuestions,
    getSecurityQuestionById,
    normalizeAnswer,
    hashAnswer,
    compareAnswer,
    PREDEFINED_SECURITY_QUESTIONS
} = require('../utils/auth');
const { authenticateJwt } = require('../middleware/authMiddleware');

// --- API Auth Routes (to be prefixed with /api/auth in app.js) ---

// Rate limiter for sensitive auth actions
// More lenient settings for test environment
const authApiLimiter = rateLimit({
    windowMs: process.env.NODE_ENV === 'test' ? 1000 : 15 * 60 * 1000, // 1 second in test, 15 minutes in production
    max: process.env.NODE_ENV === 'test' ? 100 : 10, // 100 requests in test, 10 in production
    message: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const registrationLimiter = rateLimit({
    windowMs: process.env.NODE_ENV === 'test' ? 1000 : 60 * 60 * 1000, // 1 second in test, 1 hour in production
    max: process.env.NODE_ENV === 'test' ? 100 : 5, // 100 requests in test, 5 in production
    message: { message: 'Too many registration attempts from this IP, please try again later.'},
    standardHeaders: true,
    legacyHeaders: false,
});

// 1. Get Security Questions: GET /security-questions
router.get('/security-questions', (req, res) => {
    const questions = getSecurityQuestions();
    res.status(200).json(questions);
});

// 2. Registration: POST /register
router.post('/register', registrationLimiter, async (req, res) => {
    const { username, password, securityAnswers } = req.body;

    // Validation (centralized)
    const { validateUsername, validatePassword, validateSecurityAnswers } = require('../utils/validation');
    const usernameErr = validateUsername(username);
    if (usernameErr) return res.status(400).json({ message: usernameErr });
    const passwordErr = validatePassword(password);
    if (passwordErr) return res.status(400).json({ message: passwordErr });
    const secErr = validateSecurityAnswers(securityAnswers);
    if (secErr) return res.status(400).json({ message: secErr });

    try {
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists.' });
        }

        const passwordHash = await hashPassword(password);
        const securityAnswer1Hash = await hashAnswer(securityAnswers[0].answer);
        const securityAnswer2Hash = await hashAnswer(securityAnswers[1].answer);

        const newUser = await User.create({
            username,
            passwordHash,
            securityQuestion1Id: securityAnswers[0].questionId,
            securityAnswer1Hash,
            securityQuestion2Id: securityAnswers[1].questionId,
            securityAnswer2Hash,
        });

        res.status(201).json({ message: 'User registered successfully.', userId: newUser.id });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'An error occurred during registration.' });
    }
});

// 3. Login: POST /login (API Login)
// Renamed to /login-api to avoid conflict with existing web /login POST route
// This route will be mounted under /api/auth, so full path is /api/auth/login-api
router.post('/login-api', authApiLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await comparePassword(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const token = generateToken(user);
        res.status(200).json({
            message: 'Login successful.',
            token,
            user: { id: user.id, username: user.username },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'An error occurred during login.' });
    }
});

// 4. Request Password Reset - Step 1: Get Security Questions for User
router.post('/request-password-reset-questions', authApiLimiter, async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ message: 'Username is required.' });
    }

    try {
        const user = await User.findOne({ where: { username } });
        if (!user) {
            // Generic message for security
            return res.status(404).json({ message: 'User not found or unable to reset password.' });
        }

        const q1 = getSecurityQuestionById(user.securityQuestion1Id);
        const q2 = getSecurityQuestionById(user.securityQuestion2Id);

        if (!q1 || !q2) {
             console.error(`User ${username} has invalid security question IDs: Q1ID=${user.securityQuestion1Id}, Q2ID=${user.securityQuestion2Id}`);
             return res.status(500).json({ message: 'Error retrieving security questions configuration for user.' });
        }

        res.status(200).json({
            username: user.username,
            questions: [
                { questionId: q1.id, text: q1.text },
                { questionId: q2.id, text: q2.text },
            ],
        });
    } catch (error) {
        console.error('Request password reset questions error:', error);
        res.status(500).json({ message: 'An error occurred.' });
    }
});

// Temporary store for password reset tokens (in a real app, use Redis or a database table)
const passwordResetTokens = new Map(); // { username: { token, expiresAt } }

// 5. Request Password Reset - Step 2: Verify Security Answers & Get Reset Token
router.post('/verify-security-answers', authApiLimiter, async (req, res) => {
    const { username, answers } = req.body;

    if (!username || !Array.isArray(answers) || answers.length !== 2) {
        return res.status(400).json({ message: 'Username and two answers are required.' });
    }

    try {
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' }); // Or generic
        }

        // Implement attempt throttling
        const now = new Date();
        // Check if lastPasswordResetAttempt is not null and is a valid date
        const lastAttemptTime = user.lastPasswordResetAttempt ? new Date(user.lastPasswordResetAttempt).getTime() : 0;
        
        if (user.passwordResetAttemptCount >= 5 && (now.getTime() - lastAttemptTime) < (15 * 60 * 1000) ) { // 15 min lockout after 5 attempts
             return res.status(429).json({ message: 'Too many attempts. Please try again after 15 minutes.' });
        }
        // Reset attempt count if lockout period has passed
        if (user.passwordResetAttemptCount >= 5 && (now.getTime() - lastAttemptTime) >= (15 * 60 * 1000)) {
            user.passwordResetAttemptCount = 0;
        }
        
        let matchedAnswers = 0;
        let answer1Correct = false;
        let answer2Correct = false;

        for (const ans of answers) {
            const questionId = parseInt(ans.questionId, 10);
            if (questionId === user.securityQuestion1Id) {
                if (await compareAnswer(ans.answer, user.securityAnswer1Hash)) {
                    answer1Correct = true;
                }
            } else if (questionId === user.securityQuestion2Id) {
                if (await compareAnswer(ans.answer, user.securityAnswer2Hash)) {
                    answer2Correct = true;
                }
            }
        }
        
        if (answer1Correct && answer2Correct) {
            matchedAnswers = 2;
        }


        if (matchedAnswers !== 2) {
            user.passwordResetAttemptCount += 1;
            user.lastPasswordResetAttempt = now;
            await user.save();
            return res.status(401).json({ message: 'Incorrect security answers.' });
        }

        // Reset attempts on success
        user.passwordResetAttemptCount = 0;
        user.lastPasswordResetAttempt = null;
        await user.save();

        const tempResetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 15 * 60 * 1000; // Token valid for 15 minutes
        passwordResetTokens.set(username, { token: tempResetToken, expiresAt });


        res.status(200).json({
            message: 'Security questions verified.',
            passwordResetToken: tempResetToken,
        });

    } catch (error) {
        console.error('Verify security answers error:', error);
        res.status(500).json({ message: 'An error occurred.' });
    }
});

// 6. Reset Password: POST /reset-password
router.post('/reset-password', authApiLimiter, async (req, res) => {
    const { username, passwordResetToken, newPassword } = req.body;

    if (!username || !passwordResetToken || !newPassword) {
        return res.status(400).json({ message: 'Username, reset token, and new password are required.' });
    }
    if (!validator.isLength(newPassword, { min: 8 })) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    try {
        const storedTokenData = passwordResetTokens.get(username);
        if (!storedTokenData || storedTokenData.token !== passwordResetToken || Date.now() > storedTokenData.expiresAt) {
            passwordResetTokens.delete(username); // Clean up expired/invalid token attempt
            return res.status(401).json({ message: 'Invalid or expired password reset token.' });
        }

        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.passwordHash = await hashPassword(newPassword);
        user.passwordResetAttemptCount = 0; 
        user.lastPasswordResetAttempt = null;
        await user.save();

        passwordResetTokens.delete(username); // Invalidate the token after successful use

        res.status(200).json({ message: 'Password has been reset successfully.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'An error occurred during password reset.' });
    }
});


// 7. Issue JWT for active session: GET /issue-jwt-for-session (Requires Session)
// This route will be mounted under /api/auth, so full path is /api/auth/issue-jwt-for-session
router.get('/issue-jwt-for-session', (req, res) => {
    console.log(`[Auth Router /issue-jwt-for-session] Received request. Path: ${req.path}`);
    const isAuthenticated = req.isAuthenticated && req.isAuthenticated(); // Call the function
    console.log(`[Auth Router /issue-jwt-for-session] req.isAuthenticated(): ${isAuthenticated}`);
    console.log(`[Auth Router /issue-jwt-for-session] req.user:`, req.user ? { id: req.user.id, username: req.user.username } : null);

    if (!isAuthenticated) {
        console.log('[Auth Router /issue-jwt-for-session] User NOT authenticated via session. Sending 401.');
        return res.status(401).json({ message: 'User not authenticated via session.' });
    }

    try {
        const user = req.user; // User object from session
        console.log('[Auth Router /issue-jwt-for-session] User IS authenticated. Issuing JWT for user:', user.username);
        const token = generateToken(user); // Use existing utility
        res.status(200).json({
            message: 'JWT issued successfully for active session.',
            token,
            user: {
                id: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
            }
        });
    } catch (error) {
        console.error('[Auth Router /issue-jwt-for-session] Error issuing JWT for session:', error);
        res.status(500).json({ message: 'An error occurred while issuing JWT for session.' });
    }
});

// 8. Protected Route Example: GET /me (Requires JWT)
// This route will be mounted under /api/auth, so full path is /api/auth/me
router.get('/me', authenticateJwt, (req, res) => {
    // req.user is populated by authenticateJwt middleware
    res.status(200).json({
        id: req.user.id,
        username: req.user.username,
    });
});

module.exports = router;