## 2026-07-15T08:31:09Z
Role: Codebase Explorer
Working Directory: c:\Users\sri charan\Documents\projects\hr recruter\.agents\teamwork_preview_explorer_ollama_opt_3_gen3
Mission: Investigate the JD Match / RAG Search UI pages, settings, and general toggle configurations.

Specific tasks:
1. Locate the RAGSearch.jsx, PipelineBoard.jsx, or other views related to JD Match.
2. Analyze the global toggle "rank according to job description" (if it exists) and identify how it is configured and shared across components.
3. Investigate the candidate-job question generation backend endpoint and database schema mapping for candidate-job combination questions.
4. Detail the API signature needed for on-demand JD match question generation.
5. Identify where to hook the new backend endpoint /api/candidates/:id/generate-questions-jd or similar, ensuring it doesn't trigger automatically on ingestion.

Scope Boundaries: Do NOT edit any code. Read only.
Output: Write a detailed handoff.md in your working directory and message the parent with the results.
