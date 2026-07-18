# BRIEFING — 2026-07-15T08:32:00Z

## Mission
Investigate candidate profile frontend components to understand questions rendering/triggering and design JD-based question construction.

## 🔒 My Identity
- Archetype: Codebase Explorer
- Roles: Read-only investigator
- Working directory: c:\Users\sri charan\Documents\projects\hr recruter\.agents\teamwork_preview_explorer_ollama_opt_2_gen3
- Original parent: e3496418-aaab-4b82-8c2b-16e501309f85
- Milestone: Candidate Profile & JD Questions Integration

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- NO editing of source code

## Current Parent
- Conversation ID: e3496418-aaab-4b82-8c2b-16e501309f85
- Updated: 2026-07-15T08:32:00Z

## Investigation State
- **Explored paths**:
  - `client/src/components/CandidateDetails.jsx` - Core candidate profile / detail view component.
  - `client/src/App.jsx` - Component instantiation and parameter management.
  - `client/src/components/RAGSearch.jsx` - Job matching and alternative question trigger.
  - `server/server.js` - Backend endpoints for question generation (`/api/candidates/:id/generate-questions` and `/api/candidates/:id/generate-jd-questions`).
  - `tests/e2e/regenerateQuestions.test.js` - E2E tests for the backend questions regeneration route.
- **Key findings**:
  - Located CandidateDetails component. Identified how it maps general vs. JD-specific questions.
  - General questions are rendered via tabs from `candidate.hrQuestions` and `candidate.technicalQuestions`.
  - JD-specific questions are rendered from `candidate.jdQuestions` when `useJobMatch` is true.
  - `isGeneralRole` is referenced on line 446 of `CandidateDetails.jsx` but is undefined (representing a bug). It should be defined as `!job`.
  - General questions regeneration is NOT wired to any button/action in the UI currently, though backend route `/api/candidates/:id/generate-questions` exists.
  - JD questions generation/regeneration is wired to a button when `hasJdQuestions` is false, but not when it is true (making on-demand regeneration impossible once they are generated).
- **Unexplored areas**: None. The frontend and backend components related to candidate detail view and questions are completely mapped.

## Key Decisions Made
- Scanned frontend JSX and backend server to build full trace of candidate questions flow.
- Designed placement and conditions for the "Construct questions according to JD Match" button.

## Artifact Index
- c:\Users\sri charan\Documents\projects\hr recruter\.agents\teamwork_preview_explorer_ollama_opt_2_gen3\handoff.md — Analysis handoff report
