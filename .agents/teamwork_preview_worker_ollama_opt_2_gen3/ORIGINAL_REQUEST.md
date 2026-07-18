## 2026-07-15T11:30:42Z
Role: Code Modification and Verification Worker (Replacement)
Working Directory: c:\Users\sri charan\Documents\projects\hr recruter\.agents\teamwork_preview_worker_ollama_opt_2_gen3
Mission: Complete the codebase changes for candidate questions and Ollama optimization.

Context: The previous worker (id 83fdf32b-1ba8-4780-911e-3dfd7edcff4a) successfully completed the frontend modifications in `client/src/components/CandidateDetails.jsx` but was terminated due to a 429 quota error before it could modify the backend files and verify changes.

Your tasks:
1. Verify the frontend changes in `client/src/components/CandidateDetails.jsx` are already correct:
   - `isGeneralRole` is defined as `!job` on line 446.
   - The button text is exactly "Construct questions according to JD Match".
   If anything is wrong or missing, fix it.

2. Modify `server/geminiParser.js` to implement:
   - R1: General candidate questions must be short, direct, and concise (strictly under 15-20 words) and must NOT contain verbose explanatory setups. Add the following negative constraint rule to the system instructions.
   - R3: Optimize the Ollama prompt for general resume parsing by editing `getRecruiterSystemInstruction(aiProvider)` to return a condensed prompt if `aiProvider === 'ollama'`. This condensed prompt must define the expected JSON sections (career_gaps, technical_depth_audit, domain_question_bank, project_deep_dive, hr_questions, red_flags, must_prepare_topics, fit_summary) and enforce:
     - `NEGATIVE CONSTRAINT: NEVER begin a question with introductory phrases like "Given your experience with...", "Since you worked at...", "According to your resume...", "In your role as...". Start the question directly.`
     - Question lengths must be strictly under 15-20 words.
   - Under `generateQuestionsForCandidate(candidateProfile, jobDescription = null)`, inside the `if (aiProvider === 'ollama')` block, modify the systemInstruction to also include the negative constraint and the 15-20 words length constraint.
   - In `callAIProviderDirect` under `aiProvider === 'ollama'` (around line 844), change `dynamicNumPredict = 3072` (for complex resume parsing/questions generation) to `2048` to match the AGENTS.md parameter rules.

Verbatim Integrity Warning:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Verification:
- Run Vitest tests to ensure all existing functionality is preserved:
  In the `server` directory, run:
  `npx vitest run ../tests/e2e/regenerateQuestions.test.js --config ../tests/e2e/vitest.config.js`
  and make sure it passes.
- Output: Write a detailed handoff.md report when you are done.
