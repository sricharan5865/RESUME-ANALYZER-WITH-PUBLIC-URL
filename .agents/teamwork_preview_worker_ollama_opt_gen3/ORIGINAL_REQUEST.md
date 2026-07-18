## 2026-07-15T08:35:37Z
Role: Code Modifier and Verification Worker
Working Directory: c:\Users\sri charan\Documents\projects\hr recruter\.agents\teamwork_preview_worker_ollama_opt_gen3
Mission: Implement code modifications for professional, concise candidate questions, on-demand JD match questions with the "Construct questions according to JD Match" button, and optimized Ollama prompts.

Verbatim Integrity Warning:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Specific Files to Modify:
1. `client/src/components/CandidateDetails.jsx`
   - Locate line 446: `const useJobMatch = rankAccordingToJob && !isGeneralRole;`. Define the missing variable `isGeneralRole = !job;` right before it.
   - Locate lines 934-946 (button inside the hasJdQuestions placeholder): Change the button text from "Generate JD-Relevant Questions" (and loading text) to exactly "Construct questions according to JD Match" (and "Constructing..." during loading).
   
2. `server/geminiParser.js`
   - In `getRecruiterSystemInstruction(aiProvider)` (around line 1055), add a branch at the beginning of the function for `aiProvider === 'ollama'` to return a condensed, highly optimized system instruction. Make sure the returned string contains:
     - `NEGATIVE CONSTRAINT: NEVER begin a question with introductory phrases like "Given your experience with...", "Since you worked at...", "According to your resume...", "In your role as...". Start the question directly.`
     - The structured JSON sections mapping the resume parser schema: career_gaps, technical_depth_audit, domain_question_bank, project_deep_dive, hr_questions, red_flags, must_prepare_topics, fit_summary.
   - In `generateQuestionsForCandidate(candidateProfile, jobDescription = null)` (around line 1668), under `if (aiProvider === 'ollama')`, modify the `systemInstruction` to include the negative constraint ensuring questions start directly and are under 15-20 words:
     `- NEGATIVE CONSTRAINT: NEVER begin a question with introductory phrases like "Given your experience with...", "Since you worked at...", "According to your resume...", "In your role as...". Start the question directly.`
   - In `callAIProviderDirect` (around line 844), change `dynamicNumPredict = 3072` (for complex resume parsing/questions generation) to `2048` to match the AGENTS.md parameter rules.

Verification:
- Run Vitest tests to ensure all existing functionality is preserved:
  In the `server` directory, run:
  `npx vitest run ../tests/e2e/regenerateQuestions.test.js --config ../tests/e2e/vitest.config.js`
  and make sure it passes.
- Output: Write a detailed handoff.md report when you are done.
