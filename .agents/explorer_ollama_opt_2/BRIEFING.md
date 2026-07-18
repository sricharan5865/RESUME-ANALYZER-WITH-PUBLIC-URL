# BRIEFING — 2026-07-15T14:15:20+05:30

## Mission
Explore the codebase to locate files, lines, and logic related to Ollama configuration, candidate/screening questions, ingestion routes, database mapping, and frontend components.

## 🔒 My Identity
- Archetype: Codebase Explorer
- Roles: Investigator, Analyst
- Working directory: c:\Users\sri charan\Documents\projects\hr recruter\.agents\explorer_ollama_opt_2
- Original parent: b08bc13e-9980-4f24-b08c-0f8135cd268c
- Milestone: Ollama Optimization and Screening Questions Audit

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Verify everything using code/file search and view_file

## Current Parent
- Conversation ID: b08bc13e-9980-4f24-b08c-0f8135cd268c
- Updated: 2026-07-15T14:15:20+05:30

## Investigation State
- **Explored paths**:
  - `server/geminiParser.js`
  - `server/server.js`
  - `server/models.js`
  - `server/ollamaOptimizer.js`
  - `client/src/App.jsx`
  - `client/src/components/CandidateDetails.jsx`
- **Key findings**:
  - Regular resume ingestion parses candidate files, maps general questions and prepends 7 standard screening questions.
  - JD-relevant questions are not auto-generated on ingestion; they are created on-demand via the UI or `/api/candidates/:id/generate-jd-questions`.
  - Ollama optimizations include dynamic context and prediction limits, profile compression, schema compaction, and robust JSON repair mechanisms.
  - Found that `stripSchemaDescriptions` is imported but not called, which represents a potential token optimization gap.
- **Unexplored areas**: None

## Key Decisions Made
- Performed detailed review of Express route handlers and AI utility logic in `server/` to construct the evidence chain.
- Analyzed the React frontend settings toggling and rendering logic to map the UI flow.

## Artifact Index
- `c:\Users\sri charan\Documents\projects\hr recruter\.agents\explorer_ollama_opt_2\handoff.md` — Detailed investigation findings report.
- `c:\Users\sri charan\Documents\projects\hr recruter\.agents\explorer_ollama_opt_2\progress.md` — Progress tracker.
