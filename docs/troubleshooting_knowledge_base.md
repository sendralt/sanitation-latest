# Troubleshooting Knowledge Base

## Table of Contents
- [Overview](#overview)
- [Issue Categories](#issue-categories)
- [Decision Trees](#decision-trees)
- [Documented Issues](#documented-issues)
- [Lessons Learned](#lessons-learned)
- [Maintenance Log](#maintenance-log)

## Overview

This knowledge base serves as a structured repository of technical issues and their proven solutions. Each entry follows a standardized format to ensure consistency and ease of reference during troubleshooting sessions.

### Entry Format Template
```markdown
## Issue ID: [UNIQUE-ID]
**Tags:** #category #technology #severity
**Date:** YYYY-MM-DD
**Environment:** OS, Browser, Framework versions

### Problem Description
Clear description of symptoms observed

### Root Cause Analysis
Underlying cause discovered through investigation

### Diagnostic Steps
1. Step-by-step process used to identify the issue
2. Include commands, tools, and verification methods
3. Note any false leads or ineffective approaches

### Solution Applied
Specific actions taken to resolve the issue

### Prevention Tips
How to avoid this issue in the future

### Related Issues
Cross-references to similar problems or solutions
```

## Issue Categories

### Browser Issues (#browser-issues)
- Caching problems
- Extension conflicts
- Security policy enforcement
- Cross-browser compatibility

### Server Configuration (#server-config)
- Port conflicts
- Environment variables
- Middleware configuration
- Security settings

### Networking (#networking)
- DNS resolution
- Firewall rules
- Proxy settings
- SSL/TLS issues

### Application Code (#app-code)
- Redirect logic
- Authentication flows
- Error handling
- Configuration management

## Decision Trees

### HTTP/HTTPS Redirect Issues
```
Is the redirect happening?
├── YES
│   ├── Check server logs → Server-side redirect?
│   │   ├── YES → Review application code
│   │   └── NO → Browser-side issue
│   │       ├── Test incognito mode
│   │       ├── Test different browser
│   │       └── Check browser extensions
│   └── NO → Issue resolved or misdiagnosed
```

### Port Access Issues
```
Can't access localhost:PORT?
├── Is application running?
│   ├── NO → Start application
│   └── YES → Check port binding
│       ├── netstat -ano | findstr :PORT
│       └── Verify correct port in config
├── Firewall blocking?
│   └── Check Windows Defender/antivirus
└── Browser cache?
    └── Clear cache and test incognito
```

## Documented Issues

## Issue ID: LOCALHOST-HTTPS-REDIRECT-001
**Tags:** #browser-issues #https #redirect #localhost #development
**Date:** 2025-06-28
**Environment:** Windows, Chrome/Firefox/Edge, Node.js Express app

### Problem Description
When accessing `http://localhost:3000`, browser automatically redirects to `https://localhost:3443/login_page`, resulting in "This site can't be reached" error. The redirect appears to bypass the application entirely.

### Root Cause Analysis
Browser-cached HTTPS redirect rules or browser extensions forcing HTTPS upgrades. The application server was correctly configured and responding properly to HTTP requests, but browsers were applying cached security policies that forced HTTPS redirects.

### Diagnostic Steps
1. **Server Verification** (Confirmed working):
   ```bash
   # Verify application running
   netstat -ano | findstr :3000
   
   # Test server response directly
   curl -v http://localhost:3000
   curl -v http://localhost:3000/login-page
   ```

2. **Application Code Review** (No issues found):
   - Checked app.js for hardcoded HTTPS redirects
   - Verified environment variables (BASE_URL=http://localhost:3000)
   - Confirmed no HTTPS-forcing middleware (helmet, HSTS)

3. **System Configuration** (Normal):
   - Windows hosts file: No unusual localhost entries
   - Port availability: Confirmed listening on 3000

4. **Browser Testing** (Identified root cause):
   - Incognito mode: Worked correctly
   - Different browsers: Issue browser-specific
   - Extension check: Found HTTPS-forcing extensions

### Solution Applied
1. Clear browser cache and cookies for localhost domain
2. Test in incognito/private browsing mode
3. Disable browser extensions that force HTTPS (e.g., HTTPS Everywhere)
4. For Chrome: Use `chrome://net-internals/#hsts` to delete domain security policies for localhost

### Prevention Tips
1. Use incognito mode for localhost development testing
2. Regularly clear browser cache in development environments
3. Be aware of browser extensions that modify HTTP behavior
4. Use curl or similar tools to verify server responses independently
5. Configure development browsers with relaxed security for localhost

### Related Issues
- SSL certificate issues on localhost
- Browser security policy conflicts
- Development environment setup best practices

### False Leads Encountered
- Initially suspected server-side CSRF protection causing redirects
- Investigated application middleware configuration unnecessarily
- Checked environment variables multiple times (were correct from start)

---

## Issue ID: RATE-LIMITING-TEST-INTERFERENCE-001
**Tags:** #testing #rate-limiting #express #medium
**Date:** 2025-07-04
**Environment:** Node.js, Express.js, Jest, express-rate-limit middleware

### Problem Description
Automated tests for forgot password functionality were failing with 429 "Too Many Requests" errors. The rate limiting middleware designed for production security was interfering with test execution, causing multiple test failures despite existing delays between tests.

### Symptoms Observed
- Tests failing with `expected 200 "OK", got 429 "Too Many Requests"`
- Multiple test failures in sequence after initial tests passed
- Rate limiting affecting tests despite 100ms and 200ms delays in beforeEach/afterEach hooks
- Production rate limits: 5 requests per 15 minutes per IP address
- Test suite making 9+ requests across multiple test cases

### Root Cause Analysis
The express-rate-limit middleware was configured with production-level restrictions (5 requests per 15 minutes) that were too restrictive for automated testing environments. The test delays (100-200ms) were insufficient for the 15-minute rate limiting window.

### Solution Applied
Modified rate limiting configuration to be environment-aware:

**Before:**
```javascript
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  // ...
});
```

**After:**
```javascript
const forgotPasswordLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1000 : 15 * 60 * 1000, // 1 second in test, 15 minutes in production
  max: process.env.NODE_ENV === 'test' ? 100 : 5, // 100 requests in test, 5 in production
  // ...
});
```

### Files Modified
- `dhl_login/routes/forgotPassword.js` - Updated rate limiting configuration
- `dhl_login/routes/auth.js` - Updated auth API rate limiting configuration

### Verification Steps
1. Run forgot password tests: `npm test -- --testPathPattern=forgotPassword`
2. Verify all 9 test cases pass consistently
3. Confirm production rate limiting still active (NODE_ENV !== 'test')

### Prevention Measures
- Always consider test environment requirements when implementing rate limiting
- Use environment-specific configurations for middleware that could interfere with testing
- Monitor test execution patterns to identify rate limiting conflicts early

### Related Issues
- Express.js middleware configuration in test environments
- Test environment setup and isolation
- Rate limiting best practices for development vs production

### False Leads Encountered
- Initially considered increasing test delays to 15+ minutes (impractical)
- Investigated test cleanup procedures (were already adequate)
- Considered disabling rate limiting entirely in tests (less secure approach)

---

## Lessons Learned

### Key Insights from LOCALHOST-HTTPS-REDIRECT-001

1. **Browser vs Server Distinction**: Always verify server behavior independently using tools like curl before diving into application code debugging.

2. **Systematic Approach**: Following a structured troubleshooting methodology (browser → system → application) helps isolate issues efficiently.

### Key Insights from RATE-LIMITING-TEST-INTERFERENCE-001

1. **Environment-Aware Configuration**: Middleware configurations should account for different environments (development, test, production) to prevent interference with automated testing.

2. **Test Environment Isolation**: Rate limiting and other security measures designed for production may need relaxed settings in test environments to allow proper test execution.

3. **Systematic Investigation**: Following the troubleshooting methodology helped quickly identify the root cause (rate limiting) rather than getting stuck on test timing or cleanup issues.

3. **Cache Impact**: Browser caching can persist security policies that override application configuration, especially for localhost development.

4. **Tool Verification**: Command-line tools (curl, netstat) provide objective verification of server behavior, eliminating browser variables.

5. **Documentation Value**: Real-time task tracking and systematic documentation accelerates problem resolution and knowledge transfer.

### General Troubleshooting Principles

1. **Isolate Variables**: Test each component independently (browser, network, server, application)
2. **Verify Assumptions**: Don't assume the obvious cause is correct; verify with objective tools
3. **Document False Leads**: Recording what didn't work prevents repeating ineffective approaches
4. **Environment Context**: Always note the specific environment details for future reference
5. **Prevention Focus**: Include prevention strategies to avoid recurring issues

---

## Issue ID: RATE-LIMITING-USER-LOCKOUT-002

### Date: 2025-07-04
### Severity: #medium
### Category: User Experience / Security

### Problem Description
Users were getting locked out after attempting to reset their password only once, receiving "Too many password reset attempts. Please try again after 15 minutes." This was causing significant user frustration and preventing legitimate password reset attempts.

### Symptoms
- Users locked out after minimal password reset activity
- Error message: "Too many password reset attempts. Please try again after 15 minutes."
- Lockout occurred even on first attempt or after simple navigation

### Root Cause Analysis
The system had dual rate limiting that was too restrictive:

1. **IP-based rate limiting**: 5 requests per 15 minutes per IP address
2. **User-specific rate limiting**: 5 failed attempts per user per 15 minutes

The IP-based limit was too low for normal password reset flow:
- GET `/forgot-password` (load form): 1 request
- POST `/forgot-password` (submit username): 2 requests
- POST `/forgot-password/verify-answers` (submit security answers): 3 requests
- POST `/forgot-password/reset` (submit new password): 4 requests
- Any mistake or retry: 5+ requests → LOCKOUT

### Solution Applied
Increased IP-based rate limiting to allow normal user flows while maintaining security:

**Before:**
```javascript
const forgotPasswordLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1000 : 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : 5, // Too restrictive
  // ...
});
```

**After:**
```javascript
const forgotPasswordLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1000 : 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : 20, // Allows multiple complete flows
  // ...
});
```

### Files Modified
- `dhl_login/routes/forgotPassword.js` - Updated IP-based rate limiting from 5 to 20 requests per 15 minutes

### Verification Steps
1. Run forgot password tests: `npm test -- --testPathPattern=forgotPassword`
2. Manual testing of complete password reset flow
3. Verify users can complete multiple attempts without premature lockout

### Prevention Measures
- Consider user flow requirements when setting rate limits
- Distinguish between IP-based abuse prevention and user-specific security measures
- Test rate limiting with realistic user scenarios
- Monitor rate limiting logs for false positives

### Lessons Learned
- **Dual rate limiting systems** need careful coordination to avoid over-restriction
- **IP-based rate limiting** should account for multi-step user flows
- **User experience testing** is essential for security features
- **Rate limiting should be proportional** to the complexity of the user flow

## Issue ID: EJS-LAYOUT-CONVERSION-001
**Tags:** #critical #ejs #express #templates #architecture
**Date:** 2025-07-05
**Environment:** Node.js, Express.js, EJS, express-ejs-layouts middleware

### Problem Description
Application completely broken with `ReferenceError: layout is not defined` error when accessing any EJS page after incorrectly converting standalone EJS templates to use layout system.

### Root Cause Analysis
- **Primary Issue:** Converted standalone EJS files to use `<% layout('layouts/main') %>` syntax without understanding existing architecture
- **Technical Error:** Application had `express-ejs-layouts` middleware configured but original templates were designed as standalone HTML documents
- **Scope:** 5 EJS files affected: dashboard.ejs, create-user.ejs, assign-checklist.ejs, manage-assignments.ejs, forgot-password.ejs

### Symptoms Observed
- `ReferenceError: layout is not defined` in browser console
- Complete inability to access dashboard or admin pages
- Login functionality broken
- Server running without errors but pages failing to render

### Investigation Steps Taken
1. ✅ **Identified affected files** - Found all files with `<% layout('layouts/main') %>` syntax
2. ✅ **Verified working files** - Confirmed login.ejs remained standalone and functional
3. ✅ **Systematic reversion** - Converted each file back to standalone HTML format
4. ✅ **Tested functionality** - Verified login and dashboard working after reversion

### Solution Applied
**Reverted all EJS files to standalone format:**
- Added complete HTML structure: `<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`
- Included navigation bar and flash message handling in each file
- Preserved CSS styling improvements while removing layout dependencies
- Added proper closing tags: `</body>`, `</html>`

### Prevention Strategies
1. **NEVER modify template architecture without understanding existing system**
2. **Test incrementally** - Change one file at a time and test before proceeding
3. **Check for layout middleware** - Verify if `express-ejs-layouts` is actually being used
4. **Backup working files** before making structural changes
5. **Understand the difference** between layout-based and standalone EJS templates

### Time Investment
- **Breaking:** 2 minutes (reckless bulk changes)
- **Investigation:** 15 minutes (identifying scope and root cause)
- **Resolution:** 45 minutes (systematic reversion of 5 files)
- **Total Impact:** 60+ minutes of downtime

### Related Issues
- None currently, but this establishes pattern for template modification protocols

### Code Examples
**❌ WRONG - Layout syntax that broke the app:**
```ejs
<% layout('layouts/main') %>
<div class="dashboard-container">
  <!-- content -->
</div>
```

**✅ CORRECT - Standalone format that works:**
```ejs
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dashboard - DHL Sanitation</title>
  <link rel="stylesheet" href="/css/dhl-styles.css">
</head>
<body>
  <nav class="navbar"><!-- nav content --></nav>
  <div class="dashboard-container">
    <!-- content -->
  </div>
</body>
</html>
```

### Lessons Learned
- **Architecture changes require deep understanding** of existing system
- **CSS improvements should be separate** from template structure changes
- **express-ejs-layouts being configured ≠ templates actually using layouts**
- **Working applications should be treated with extreme caution**

---

## Issue ID: SOLID-BAR-GRADIENT-001
**Tags:** #css #gradient #background #visual
**Date:** 2025-07-05
**Environment:** HTML/CSS, gradient backgrounds

### Problem Description
Solid color bar appears at the bottom of pages with gradient backgrounds, breaking the visual design requirement of full gradient coverage.

### Root Cause Analysis
- **Primary Issue:** Body element has gradient background but HTML element has default background
- **Technical Error:** Gap between body and viewport edges shows HTML element's default background
- **Visual Impact:** Solid yellow bar appears at bottom instead of seamless gradient

### Symptoms Observed
- Solid color bar (typically yellow #FFCC00) visible at bottom of page
- Gradient background appears to "cut off" before reaching viewport edge
- Page functionality works correctly but visual design is broken

### Investigation Steps Taken
1. ✅ **Verified body CSS** - Confirmed body has correct gradient and padding: 0
2. ✅ **Checked viewport coverage** - Body min-height: 100vh was present
3. ✅ **Identified HTML element gap** - HTML element background was default, not gradient

### Solution Applied
**Added gradient background to HTML element:**
```css
html {
  background: linear-gradient(to bottom, #FFCC00, white); /* Ensure html also has gradient */
}
```

### Prevention Strategies
1. **Always apply gradient to both HTML and BODY** when using full-page gradients
2. **Test on different viewport sizes** to ensure coverage
3. **Use browser dev tools** to inspect element backgrounds
4. **Standard pattern:** Both html and body should have same gradient background

### Time Investment
- **Investigation:** 5 minutes (identifying HTML vs body background issue)
- **Resolution:** 2 minutes (adding HTML gradient)
- **Total Impact:** 7 minutes

### Related Issues
- User preference: "never show a solid bar at bottom of any page"
- Part of overall gradient background consistency requirements

### Code Pattern for Future Use
**✅ CORRECT - Apply gradient to both HTML and BODY:**
```css
html, body {
  height: 100%;
  min-height: 100vh;
}

html {
  background: linear-gradient(to bottom, #FFCC00, white);
}

body {
  font-family: "Delivery", sans-serif;
  margin: 0;
  padding: 0;
  background: linear-gradient(to bottom, #FFCC00, white);
  color: #333333;
}
```

**❌ WRONG - Only body has gradient:**
```css
body {
  background: linear-gradient(to bottom, #FFCC00, white);
  /* HTML element will show default background in gaps */
}
```

### Files Fixed
- `Public/validate-checklist.html` - Added HTML gradient background

---

## Maintenance Log

### 2025-06-28
- **Created knowledge base** with initial structure and templates
- **Added Issue LOCALHOST-HTTPS-REDIRECT-001** from successful troubleshooting session
- **Established decision trees** for common HTTP/HTTPS and port access issues
- **Documented lessons learned** from systematic troubleshooting approach

### 2025-07-04
- **Added Issue RATE-LIMITING-TEST-INTERFERENCE-001** from forgot password troubleshooting session
- **Documented environment-aware rate limiting solution** for test vs production environments
- **Updated lessons learned** with insights about middleware configuration in test environments
- **Added Issue RATE-LIMITING-USER-LOCKOUT-002** from user experience improvement session
- **Documented IP-based rate limiting optimization** for multi-step user flows

### 2025-07-05
- **Added Issue EJS-LAYOUT-CONVERSION-001** from critical application failure
- **Documented template architecture modification protocols** to prevent future EJS conversion errors
- **Established prevention strategies** for working application modifications
- **Added code examples** showing correct vs incorrect EJS template patterns
- **Added Issue SOLID-BAR-GRADIENT-001** for gradient background coverage problems
- **Documented HTML/BODY gradient pattern** to prevent solid color bars at page bottom

### Future Maintenance Tasks
- [ ] Add more decision trees as patterns emerge
- [ ] Consolidate similar issues to identify broader patterns
- [ ] Create quick reference cards for common diagnostic commands
- [ ] Develop environment-specific troubleshooting guides
- [ ] Add integration with task management for complex issues

---

## Quick Reference Commands

### Network Diagnostics
```bash
# Check port usage
netstat -ano | findstr :PORT

# Test HTTP response
curl -v http://localhost:PORT

# DNS resolution
nslookup localhost
```

### Browser Debugging
```
# Chrome HSTS management
chrome://net-internals/#hsts

# Firefox security config
about:config

# Clear specific domain data
Developer Tools → Application → Storage
```

### Application Debugging
```bash
# Node.js debug logging
NODE_DEBUG=http,net node app.js

# Environment variable check
echo $PORT
echo $BASE_URL
```

## Issue Templates

### New Issue Template
```markdown
## Issue ID: [CATEGORY-DESCRIPTION-###]
**Tags:** #category #technology #severity
**Date:** YYYY-MM-DD
**Environment:** [OS, Browser, Framework versions]
**Reporter:** [Name/Team]

### Problem Description
[Clear description of symptoms observed]

### Root Cause Analysis
[To be filled after investigation]

### Diagnostic Steps
1. [Step-by-step process]
2. [Include commands and tools used]
3. [Note verification methods]

### Solution Applied
[Specific actions taken to resolve]

### Prevention Tips
[How to avoid this issue in the future]

### Related Issues
[Cross-references to similar problems]

### Time Investment
- **Investigation Time:** [Hours]
- **Resolution Time:** [Hours]
- **Total Impact:** [Hours/People affected]
```

### Severity Levels
- **Critical (#critical)**: System down, blocking all users
- **High (#high)**: Major functionality broken, affecting many users
- **Medium (#medium)**: Feature impaired, workarounds available
- **Low (#low)**: Minor issue, minimal impact

## Pattern Recognition

### Common Issue Patterns

#### Browser-Related Issues
**Symptoms:** Unexpected redirects, cached responses, extension conflicts
**First Steps:** Test incognito mode, try different browser, check extensions
**Tools:** Browser dev tools, curl for verification

#### Configuration Issues
**Symptoms:** Environment-specific failures, missing variables, wrong ports
**First Steps:** Verify config files, check environment variables, validate syntax
**Tools:** Config validators, environment dumps, diff tools

#### Network Issues
**Symptoms:** Connection timeouts, DNS failures, firewall blocks
**First Steps:** Test connectivity, check DNS, verify firewall rules
**Tools:** ping, nslookup, telnet, netstat

## Troubleshooting Workflows

### Standard Investigation Process
1. **Reproduce the Issue**
   - Document exact steps to reproduce
   - Note environment conditions
   - Capture error messages/screenshots

2. **Gather Information**
   - Check logs (application, system, browser)
   - Review recent changes
   - Identify affected scope

3. **Form Hypothesis**
   - Based on symptoms and patterns
   - Consider most likely causes first
   - Plan verification steps

4. **Test Systematically**
   - Isolate variables
   - Test one change at a time
   - Document results

5. **Implement Solution**
   - Apply minimal necessary changes
   - Verify fix works
   - Test for side effects

6. **Document and Prevent**
   - Update knowledge base
   - Implement prevention measures
   - Share learnings with team

### Emergency Response Process
1. **Assess Impact** (< 5 minutes)
2. **Implement Immediate Workaround** (< 15 minutes)
3. **Investigate Root Cause** (parallel to workaround)
4. **Apply Permanent Fix**
5. **Post-Incident Review**

## Integration Guidelines

### Task Management Integration
- Create task lists for complex issues (>2 hours estimated)
- Break down investigation into 20-minute tasks
- Track progress and update status regularly
- Use batch updates for efficiency

### Team Collaboration
- Share knowledge base entries with relevant team members
- Conduct post-resolution reviews for significant issues
- Maintain shared responsibility for knowledge base updates
- Regular team reviews of patterns and trends

### Continuous Improvement
- Monthly review of resolved issues for patterns
- Quarterly update of decision trees and workflows
- Annual review of knowledge base structure
- Feedback collection from knowledge base users
