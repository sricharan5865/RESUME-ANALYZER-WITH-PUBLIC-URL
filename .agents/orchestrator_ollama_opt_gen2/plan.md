# Orchestrator Plan

## Goal
Optimize candidate question generation, isolate JD questions on-demand with a dedicated button, and optimize Ollama prompts.

## Status
- Setup and initialization: DONE
- Codebase exploration: DONE
- Code modification and implementation: IN_PROGRESS
- Code review and verification: PLANNED
- Challenger testing: PLANNED
- Forensic audit: PLANNED

## Implementation Steps
1. Define `isGeneralRole = !job;` in `client/src/components/CandidateDetails.jsx`.
2. Update `useJobMatch` in `client/src/components/CandidateDetails.jsx` to be true in either ranking mode or JD match page context:
   `const useJobMatch = (rankAccordingToJob && !isGeneralRole) || !!(candidate.jdRequirements || candidate.jdDescription);`
3. Update the JD questions generate button in `CandidateDetails.jsx` to render exactly `"Construct questions according to JD Match"`.
4. Ensure general candidate questions (`hrQuestions` and `technicalQuestions`) are short, professional, and strictly under 15-20 words, with no verbose introductory prefixes detailing candidate history. Enhance the instructions in `getRecruiterSystemInstruction` in `server/geminiParser.js`.
5. Optimize the prompt sent to Ollama for JD-specific question generation in `generateQuestionsForCandidate` in `server/geminiParser.js` to be highly compact, context-stripped, and use `stripSchemaDescriptions` to save token overhead.
6. Configure Ollama parameters `num_ctx` and `num_predict` dynamically in `callAIProviderDirect` in `server/geminiParser.js` to allocate `8192` context size and `2048` prediction limit for nested question arrays to avoid truncation, while keeping classification at `2048` / `256`.
7. Verify all changes by running automated tests.

