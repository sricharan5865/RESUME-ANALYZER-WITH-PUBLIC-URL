# BRIEFING — 2026-07-15T08:36:00Z

## Mission
Optimize candidate questions generation, JD on-demand button matching, and Ollama/Gemini token parameters.

## 🔒 My Identity
- Archetype: Codebase Worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\sri charan\Documents\projects\hr recruter\.agents\worker_ollama_opt_1
- Original parent: b08bc13e-9980-4f24-b08c-0f8135cd268c
- Milestone: Ollama Optimization

## 🔒 Key Constraints
- General candidate questions: under 15-20 words, no verbose introductory prefixes.
- On-demand button: text exactly "Construct questions according to JD Match".
- Ollama prompts: optimized, compact, context-stripped, description-stripped schema (using `stripSchemaDescriptions`).
- Ollama parameters: `num_ctx` & `num_predict` dynamically tuned (8192/2048 for arrays; 2048/256 for simple schemas).
- Max token config: at least 8000/8192 across all providers.
- E2E tests: `npx vitest run --config tests/e2e/vitest.config.js`.

## Current Parent
- Conversation ID: b08bc13e-9980-4f24-b08c-0f8135cd268c
- Updated: not yet

## Task Summary
- **What to build**: Short candidate questions, JD matching button logic, compact Ollama schemas, parameter tuning, token limit adjustment, and E2E verification.
- **Success criteria**: All automated E2E tests pass, Ollama prompt latencies are reduced, and questions are generated in the correct formats.
- **Interface contracts**: `server/geminiParser.js`, `client/src/components/CandidateDetails.jsx`
- **Code layout**: Client and Server source directories.

## Key Decisions Made
- [TBD]

## Artifact Index
- [TBD]
