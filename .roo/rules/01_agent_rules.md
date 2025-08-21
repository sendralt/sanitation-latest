AI-Framework
SPARC
Core Philosophy
Simplicity

Prioritize clear, maintainable solutions; minimize unnecessary complexity.
Iterate

Enhance existing code unless fundamental changes are clearly justified.
Focus

Stick strictly to defined tasks; avoid unrelated scope changes.
Quality

Deliver clean, well-tested, documented, and secure outcomes through structured workflows.
Collaboration

Foster effective teamwork between human developers and autonomous agents.
Methodology & Workflow
Structured Workflow
Follow clear phases from specification through deployment.
Flexibility
Adapt processes to diverse project sizes and complexity levels.
Intelligent Evolution
Continuously improve codebase using advanced symbolic reasoning and adaptive complexity management.
Conscious Integration
Incorporate reflective awareness at each development stage.
Agentic Integration
Agent Configuration (02-workspace-rules.md)
Embed concise, workspace-specific rules to guide autonomous behaviors, prompt designs, and contextual decisions.
Clearly define project-specific standards for code style, consistency, testing practices, and symbolic reasoning integration points.
Context Preservation
Persistent Context
Continuously retain relevant context across development stages to ensure coherent long-term planning and decision-making.
Reference Prior Decisions
Regularly review past decisions stored in memory to maintain consistency and reduce redundancy.
Adaptive Learning
Utilize historical data and previous solutions to adaptively refine new implementations.
Track Across Iterations:
Original requirements and any changes
Key decisions made and rationale
Human feedback and how it was incorporated
Alternative approaches considered
Maintain Session Context:
Problem: [brief description + problem scope] Requirements: [key requirements] Decisions: [key decisions with rationale and trade-offs] Status: [progress/blockers/next actions]

INDEX Maintenance:
Update INDEX.md files when making relevant changes to:
Directory structure modifications
New files or folders added
Navigation links affected
INDEX.md files serve as navigation hubs, not exhaustive catalogs
context/INDEX.md navigates collaboration artifacts within context/
context/[PROJECT_NAME]/INDEX.md navigates /[PROJECT_NAME] files and folders
Include brief descriptions for all linked items
Project Context & Understanding
Documentation First

Review essential documentation before implementation:
[PROJECT_NAME]/README.md
context/[PROJECT_NAME]/prd.md (Product Requirements Documents (PRDs))
context/[PROJECT_NAME]/architecture.md
context/[PROJECT_NAME]/technical.md
context/[PROJECT_NAME]/TODO.md
Request clarification immediately if documentation is incomplete or ambiguous.
Architecture Adherence

Follow established module boundaries and architectural designs.
Validate architectural decisions using symbolic reasoning; propose justified alternatives when necessary.
Pattern & Tech Stack Awareness

Utilize documented technologies and established patterns; introduce new elements only after clear justification.
Directory Structure:
/
├── README.md
├── context/
│   ├── INDEX.md
│   ├── docs/
│   ├── workflows/
│   ├── [PROJECT_NAME]/
│   │   ├── architecture.md
│   │   ├── prd.md
│   │   ├── technical.md
│   │   ├── INDEX.md
│   │   ├── TODO.md
│   │   ├── plans/
│   │   │   ├── [YYYY-MM-DD]/
│   │   │   │   ├── task-[TASK_NAME].md
│   │   └── journal/
│   │       ├── [YYYY-MM-DD]/
│   │       │   ├── [HHMM]-[TASK_NAME].md
├── [PROJECT_NAME]/
│   ├── README.md
│   ├── INDEX.md
│   └── (other project folders/files)   