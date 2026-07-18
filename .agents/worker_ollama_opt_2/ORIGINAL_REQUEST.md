## 2026-07-15T11:30:00Z
You are a Codebase Worker. Your working directory is c:\Users\sri charan\Documents\projects\hr recruter\.agents\worker_ollama_opt_2.
Please implement the following requirements:

1. R1: General candidate questions (both HR and Technical) must be short, professional, and strictly under 15-20 words, with no verbose introductory prefixes detailing candidate history. Update the recruiter system instructions in `server/geminiParser.js`.
2. R2: Implement the "Construct questions according to JD Match" button on-demand flow. In `client/src/components/CandidateDetails.jsx`:
   - Define `const isGeneralRole = !job;` (before line 446).
   - Change `useJobMatch` to be:
     `const useJobMatch = (rankAccordingToJob && !isGeneralRole) || !!(candidate.jdRequirements || candidate.jdDescription);`
   - Update the generate JD questions button text to be exactly `"Construct questions according to JD Match"`. (For example: `{loadingJdQuestions ? 'Constructing...' : 'Construct questions according to JD Match'}`).
3. R3: Optimize the prompts, system instruction, and schema sent to Ollama for JD questions in `server/geminiParser.js`. Make the Ollama prompt compact and context-stripped to minimize pre-processing latency. Use `stripSchemaDescriptions` to strip descriptions from `jdSchema` before calling `getCompactSchemaInstructions`.
4. Parameters Optimization: In `server/geminiParser.js` inside the Ollama execution block, tune parameters `num_ctx` and `num_predict` dynamically. If the schema has array fields (like questions lists), allocate `num_ctx = 8192` and `num_predict = 2048` to prevent truncation. For simple schemas (< 5 properties, no arrays), keep `num_ctx = 2048` and `num_predict = 256`.
5. Max token configuration: Set `max_tokens`/`maxOutputTokens` to at least 8000/8192 across providers.
6. Verify your implementation by running automated E2E tests:
   `npx vitest run --config tests/e2e/vitest.config.js`
   Ensure all tests pass and document the test command and output.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please write a detailed handoff report in c:\Users\sri charan\Documents\projects\hr recruter\.agents\worker_ollama_opt_2\handoff.md and update progress.md in your directory. When you are done, send a message to the orchestrator (conversation ID: b08bc13e-9980-4f24-b08c-0f8135cd268c).
