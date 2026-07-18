# plan.md

## Goal
Implement Requirements R1, R2, and R3 for TalentFlow candidate questions and Ollama optimization.

## Strategy
Use a Direct Iteration Loop (Explorer -> Worker -> Reviewer -> Challenger -> Auditor) to analyze, implement, and verify the changes.

## Phase Breakdown
- **Phase 1: Exploration**: Explorer investigates backend (Ollama integration, prompt construction, candidate questions schema/generation) and frontend (CandidateDetails component, RAGSearch component, JD match view, toggle state) to identify necessary code modifications.
- **Phase 2: Implementation**: Worker implements professional/concise questions, JD Match button rendering/behavior, API endpoint for JD-based question construction on-demand, and optimized Ollama prompts.
- **Phase 3: Review**: Reviewers check code correctness, security, performance, and adherence to custom rules.
- **Phase 4: Challenger**: Challenger runs E2E and unit tests, and conducts adversarial testing.
- **Phase 5: Forensic Audit**: Auditor performs final integrity check.
