# BRIEFING — 2026-07-15T08:33:00Z

## Mission
Investigate the backend candidate questions generation, LLM call logic, prompts, settings structure, and Ollama integration parameters.

## 🔒 My Identity
- Archetype: Codebase Explorer
- Roles: Explorer
- Working directory: c:\Users\sri charan\Documents\projects\hr recruter\.agents\teamwork_preview_explorer_ollama_opt_1_gen3
- Original parent: e3496418-aaab-4b82-8c2b-16e501309f85
- Milestone: Ollama integration and question generation analysis

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Verify all findings before documenting

## Current Parent
- Conversation ID: e3496418-aaab-4b82-8c2b-16e501309f85
- Updated: 2026-07-15T08:33:00Z

## Investigation State
- **Explored paths**:
  - `server/server.js` - API endpoints and candidate duplicate resolution logic
  - `server/geminiParser.js` - Candidate questions generation, LLM call logic, Ollama prompts & configurations
  - `server/models.js` - Database models for Candidate and Settings
  - `server/ollamaOptimizer.js` - Profile compression & schema cleaning functions
  - `server/embeddingService.js` - RAG embeddings integration with Ollama
  - `client/src/components/Settings.jsx` - Frontend settings component existence check
- **Key findings**:
  - Candidate questions (`hrQuestions`, `technicalQuestions`, `jdQuestions`) are stored in Mongoose models and generated via `generateQuestionsForCandidate`.
  - Ollama integration uses dynamic `num_ctx` (2048 to 8192) and `num_predict` (256 to 3072, with 4096 retry limit).
  - General system instruction is not optimized/condensed for Ollama, leading to higher pre-processing latency.
  - Recommended optimizations to prompt structure using few-shot negative constraints to enforce direct questioning under 15-20 words.
- **Unexplored areas**: None, the backend candidate questions generation, parameters, and endpoints have been fully investigated and verified.

## Key Decisions Made
- Focused on code-level verification using exact file views.
- Identified optimization gaps in `getRecruiterSystemInstruction`.

## Artifact Index
- c:\Users\sri charan\Documents\projects\hr recruter\.agents\teamwork_preview_explorer_ollama_opt_1_gen3\ORIGINAL_REQUEST.md — Original request details
- c:\Users\sri charan\Documents\projects\hr recruter\.agents\teamwork_preview_explorer_ollama_opt_1_gen3\handoff.md — Detailed report
