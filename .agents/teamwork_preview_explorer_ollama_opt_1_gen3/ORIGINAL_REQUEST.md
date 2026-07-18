## 2026-07-15T08:31:09Z
Role: Codebase Explorer
Working Directory: c:\Users\sri charan\Documents\projects\hr recruter\.agents\teamwork_preview_explorer_ollama_opt_1_gen3
Mission: Investigate the backend candidate questions generation, LLM call logic, prompts, settings structure, and Ollama integration parameters.

Specific tasks:
1. Locate where candidate questions are generated in the backend (e.g., server/geminiParser.js).
2. Analyze the current LLM prompt format and parameters used for Ollama (e.g., num_ctx, num_predict).
3. Find where hrQuestions and technicalQuestions are stored and generated.
4. Recommend how to optimize Ollama prompts to reduce pre-processing latency and enforce question lengths strictly under 15-20 words, with no verbose introductory prefixes.
5. Identify the current backend API endpoints related to question generation or candidate details.

Scope Boundaries: Do NOT edit any code. Read only.
Output: Write a detailed handoff.md in your working directory and message the parent with the results.
