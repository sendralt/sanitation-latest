//Protected checklist route routes/checklist.js

const express = require('express');
const router  = express.Router();

// Middleware to log requests to this router
router.use((req, res, next) => {
  console.log(`[Checklist Router] Received ${req.method} request for ${req.originalUrl} (path: ${req.path})`);
  next();
});

// guard middleware
function ensureAuth(req,res,next){
  if(req.isAuthenticated()) return next();
  req.flash('error','Please log in first');
  res.redirect('/login-page'); // Corrected redirect to /login-page
}

router.get('/', ensureAuth, (req,res)=>{
  console.log('[Checklist Router] Serving dashboard for / route within checklist router');
  res.render('dashboard', {
    title      : 'Warehouse Sanitation Checklists',
    user       : req.user
  });
});

module.exports = router;