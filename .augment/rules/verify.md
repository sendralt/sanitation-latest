---
type: "always_apply"
---

🔍 Verification Strategies
1. Always Use Tools First
Before making any claims, I should:

2. Explicit Verification Commands
For specific claims, I should run verification commands:

**For File/Directory Claims:**
- `view [path] directory` - to verify directory contents and structure
- `view [file]` - to check file existence and contents
- `codebase-retrieval "search for [specific feature/function]"` - to find implementations

**For Code Functionality Claims:**
- `view [file] search_query_regex "[pattern]"` - to find specific code patterns
- `launch-process "grep -r '[pattern]' [directory]"` - to search across multiple files
- `launch-process "find [directory] -name '*.js' | wc -l"` - to count files of specific types

**For Configuration/Setup Claims:**
- `view package.json` - to verify dependencies and scripts
- `view .env.example` - to check environment configuration
- `launch-process "npm list"` - to verify installed packages

**For Database/Schema Claims:**
- `view [schema-file]` - to check database structure
- `codebase-retrieval "database schema or models"` - to find data models

**For API/Route Claims:**
- `view [routes-file]` - to verify endpoint definitions
- `codebase-retrieval "API endpoints or routes"` - to find all route definitions

3. Cross-Reference Multiple Sources
Check both the actual files AND the code that references them
Verify configuration in multiple places (package.json, .env examples, actual usage)
4. Use Specific File Paths
Instead of saying "the system has X features," I should say:

"Based on files in Public/checklists/, there are X checklists"
"According to backend/server.js line Y, the email configuration is..."
"The admin routes in dhl_login/routes/admin.js include..."
5. Acknowledge Limitations
When I can't verify something completely:

"Based on the files I can see in [specific directory]..."
"According to [specific file:line], but this may not be complete..."
"I found X items, but there may be more I haven't discovered"

6. Before claiming that any code, application, or system is "production ready" or "ready to run," I must:

1. **Write comprehensive tests** that cover the main functionality being claimed as ready
2. **Successfully execute those tests** and verify they pass
3. **Document the test results** by showing the actual test output or execution logs
4. **Verify the tests cover critical paths** including error handling, edge cases, and integration points

**Only after completing these verification steps should I state that code/applications are production ready. Use specific language like:
- "After writing and running tests that verify [specific functionality], the code is now ready for production"
- "Based on successful test execution showing [specific results], the application is ready to run"

Avoid making readiness claims based solely on guesses, assumptions, code review, static analysis, or theoretical assessment without actual test execution and verification.

7. You Can Help By:
Challenging specific claims (like you just did with the checklist count)
Asking for sources ("Where did you see that?")
Requesting verification ("Can you check that directory/file?")
8. Better Workflow for Me:
Gather facts using tools first
State sources explicitly
Make claims only about what I can verify
Use qualifiers when uncertain