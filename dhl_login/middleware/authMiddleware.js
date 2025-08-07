const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const User = require('../models/user'); // Adjust path as necessary

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await User.findByPk(jwt_payload.userId);
      if (user) {
        return done(null, user);
      }
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  })
);

// Middleware to protect routes
const authenticateJwt = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      // You can customize the error response
      let message = 'Unauthorized';
      if (info && info.name === 'JsonWebTokenError') {
        message = 'Invalid token.';
      } else if (info && info.name === 'TokenExpiredError') {
        message = 'Token expired.';
      }
      return res.status(401).json({ message });
    }
    req.user = user;
    return next();
  })(req, res, next);
};

// Middleware to ensure the user is an administrator
const ensureAdmin = (req, res, next) => {
  // Check if user is authenticated and is an admin
  // This assumes that req.user is populated by a prior authentication middleware (e.g., session-based or JWT)
  if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.isAdmin === true) {
    return next(); // User is admin, proceed to the next middleware/route handler
  }
  // If not authenticated or not an admin, redirect or send an error
  // For web pages, redirecting to login or a generic error page is common
  req.flash('error', 'Access denied. You do not have permission to view this page.');
  res.redirect('/login-page'); // Or consider redirecting to a more general access-denied page if you have one
};

module.exports = {
  initialize: passport.initialize(), // To initialize Passport in app.js
  authenticateJwt,
  ensureAdmin,
};