1. Pre-Investigation Protocol (Automatic)
When users present technical issues, I should automatically:

**Step 1: Knowledge Base Pattern Check**
- Search troubleshooting_knowledge_base.md for similar symptoms/tags
- Reference relevant decision trees before starting investigation
- Identify if this matches known patterns

**Step 2: Issue Classification & Planning**
- Estimate complexity/resolution time
- If >20 minutes: Create structured task list automatically
- Apply appropriate severity level (#critical, #high, #medium, #low)
- Note environment context (OS, browser, framework versions)

**Step 3: Systematic Investigation Launch**
- Follow documented decision trees (HTTP/HTTPS, port access, etc.)
- Use standardized diagnostic commands from quick reference
- Track investigation approach and false leads in real-time

2. During Investigation Protocol (Continuous)
Throughout troubleshooting sessions, I should automatically:

**Real-Time Documentation**
- Track each diagnostic step and its outcome
- Note false leads immediately: "Investigated X, ruled out because Y"
- Document environment details as discovered
- Cross-reference similar issues found in knowledge base

**Systematic Verification**
- Use curl/netstat/browser tools per established patterns
- Follow decision tree branches methodically
- Verify assumptions with objective tools before proceeding

**Progress Tracking**
- Update task status for complex issues
- Batch task updates efficiently
- Note time investment and impact scope

3. Post-Resolution Protocol (Automatic)
After each successful troubleshooting session, I should automatically:

**Immediate Knowledge Base Update Prompt**
"I'll now update the troubleshooting knowledge base with our findings. This session revealed [key insights] that should be documented for future reference."

**Structured Entry Creation**
- Generate unique Issue ID (CATEGORY-DESCRIPTION-###)
- Apply appropriate tags based on issue type
- Document complete diagnostic journey including false leads
- Include prevention strategies and related issues
- Note time investment and impact metrics

**Pattern Recognition Analysis**
- Compare with existing entries for patterns
- Suggest consolidation opportunities if similar issues exist
- Recommend decision tree updates if new patterns emerge

4. Continuous Improvement Integration (Proactive)
I should regularly suggest:

**Pattern Recognition Opportunities**
- "This is the 3rd browser caching issue this month - should we create a prevention checklist?"
- "Similar port conflict patterns suggest updating our development setup guide"

**Knowledge Base Maintenance**
- Monthly: "Let's review recent entries for consolidation opportunities"
- Quarterly: "Decision trees should be updated based on new patterns"
- When patterns emerge: "This suggests a new category for the knowledge base"

**Prevention Strategy Implementation**
- After recurring issues: "This pattern suggests we need a prevention workflow"
- Environment-specific: "Consider adding this to development environment setup"
- Team process: "This indicates a gap in our standard procedures"

5. Workflow Integration Examples
Example 1: User Reports "Can't access localhost"
    Auto-Response:
1. "Let me check our knowledge base for similar localhost access issues..."
2. "Found pattern LOCALHOST-HTTPS-REDIRECT-001 - let's verify if this matches"
3. "This appears to be >20 min complexity - creating structured task list"
4. "Following our port access decision tree: First checking if application is running..."
Example 2: After Resolving Database Connection Issue
   Auto-Response:
1. "Issue resolved! I'll now document this in our knowledge base."
2. "Creating entry: DATABASE-CONNECTION-TIMEOUT-002"
3. "Key findings: Connection pool exhaustion due to unclosed connections"
4. "This relates to DATABASE-CONNECTION-POOL-001 - suggesting pattern consolidation"
5. "Prevention strategy: Add connection monitoring to development checklist" 

6. Implementation Triggers
Automatic Knowledge Base Check Triggers:
    User mentions error messages, connection issues, redirect problems
    Keywords: "not working", "can't access", "error", "timeout", "redirect"
    Technical terms: localhost, port, HTTPS, SSL, database, authentication

Task List Creation Triggers:

    Multiple diagnostic steps required
    System + application + browser investigation needed
    Estimated resolution time >20 minutes
    User requests structured approach
Documentation Update Triggers:

    Issue successfully resolved
    New diagnostic approach discovered
    False lead identified and ruled out
    Prevention strategy developed

7. Quality Assurance Integration

Automatic Validation:

    Ensure all knowledge base entries follow standardized format
    Verify tags are applied consistently
    Check that prevention tips are actionable
    Confirm cross-references are valid

Continuous Learning:

    Track which decision trees are most effective
    Monitor which diagnostic commands provide best insights
    Identify gaps in current knowledge base coverage
    Suggest new categories based on emerging patterns

🎯 Expected Outcomes

With this integrated approach:

1. Faster Resolution: Automatic pattern matching reduces investigation time
2. Consistent Quality: Standardized workflows ensure thorough documentation
3. Knowledge Retention: Immediate updates prevent knowledge loss
4. Team Learning: Structured entries enable knowledge sharing
5. Prevention Focus: Proactive identification of recurring issues
6. Self-Improvement: Knowledge base evolves automatically with each session

This framework transforms troubleshooting from reactive problem-solving into a systematic, learning-oriented process that builds organizational diagnostic expertise over time.

🔄 Workflow Invocation Methods
1. Automatic Triggers (Preferred - No Manual Action Required)
The workflow should activate automatically when you present technical issues using these trigger phrases/patterns:
    **Error/Problem Indicators:**
- "not working", "can't access", "error", "timeout", "redirect"
- "blank screen", "won't load", "connection failed"
- "getting an error", "something's wrong with"

**Technical Terms:**
- localhost, port, HTTPS, SSL, database, authentication
- React, Node.js, Express, API, server
- browser, Chrome, Firefox, network

**Question Patterns:**
- "Why is my [technology] doing [unexpected behavior]?"
- "I'm getting [error message] when I try to [action]"
- "[Application] was working yesterday but now [problem]"

2. Explicit Invocation (When You Want Structured Approach)
You can manually trigger it by saying:
- "Can you help troubleshoot this systematically?"
- "Let's use the structured troubleshooting approach"
- "Create a task list for this issue"
- "Check the knowledge base for similar problems"

3. Current Implementation Status
Right now, this is partially automated based on my memory of your preferences. Here's what happens automatically:

✅ Currently Automatic:

Knowledge base updates after successful troubleshooting
Structured documentation approach
Task list creation for complex issues
🔄 Needs Manual Trigger:

Initial knowledge base pattern checking
Decision tree following
Systematic diagnostic command usage

🎯 How to Make It Fully Automatic
To make this completely seamless, you would need to:

Option 1: Update My System Instructions (Recommended)
Add this to my core instructions:
When users present technical issues, automatically:
1. Check troubleshooting_knowledge_base.md for similar patterns
2. Create structured task lists for issues >20 minutes complexity
3. Follow documented decision trees and diagnostic workflows
4. Use standardized commands from knowledge base
5. Track false leads and document findings in real-time
6. Prompt for knowledge base updates after resolution

Option 2: Use Trigger Phrases (Immediate Solution)
Start your troubleshooting requests with:

"Help me troubleshoot..."
"I'm having an issue with..."
"Something's not working with..."

Option 3: Explicit Request (When Needed)
Simply say: "Use the structured troubleshooting methodology"

🚀 Demonstration: How It Should Work Automatically
Your Message: "My database connection keeps timing out"


My Automatic Response:
Let me check our knowledge base for similar database timeout patterns...

[Searches troubleshooting_knowledge_base.md]

Found related pattern: DATABASE-CONNECTION-POOL-001
This appears to be >20 minute complexity - creating structured task list:

1. [ ] Verify database server status
2. [ ] Check connection pool configuration  
3. [ ] Test direct database connectivity
4. [ ] Review application logs for timeout details
5. [ ] Check network connectivity to database host

Following our database troubleshooting decision tree...

💡 Recommendation
For the best experience, I suggest:

Start using trigger phrases in your technical questions
I'll automatically apply the methodology when I detect troubleshooting scenarios
You can always explicitly request the structured approach if I don't catch it
After a few sessions, the pattern recognition will become more refined
Try it now! Present any technical issue using natural language, and I'll demonstrate the automatic workflow activation.