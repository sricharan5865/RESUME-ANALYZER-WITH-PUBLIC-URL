# Scope: Candidate Questions & Ollama Optimization

## Architecture
- Frontend: client (React/Vite).
- Backend: server (Express, Node, MongoDB, geminiParser.js, server.js).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration | Locate and analyze candidate questions, JD parsing, and LLM routes | None | DONE |
| 2 | Implementation | Implement Requirements R1, R2, and R3 | Exploration | IN_PROGRESS |
| 3 | Review | Verify logic correctness, formatting, and constraints | Implementation | PLANNED |
| 4 | Challenger | Run adversarial testing on question formatting and button flow | Review | PLANNED |
| 5 | Forensic Audit | Verify integrity of solution | Challenger | PLANNED |

## Interface Contracts
- Button click: calls backend to generate JD questions on-demand.
- JD questions generated: stored in candidate record for candidate-job combination, and rendered.
- Ollama Parameters: num_ctx (context window) configured to 8192 for resume parsing/questions generation, num_predict to 2048 (complex) or 256 (simple).
