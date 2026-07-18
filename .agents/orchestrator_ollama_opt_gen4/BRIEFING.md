# BRIEFING — 2026-07-15T21:55:00+05:30

## Mission
Optimize candidate question generation, isolate JD questions on-demand with a dedicated button, and optimize Ollama prompts.

## 🔒 My Identity
- Archetype: Project Orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\sri charan\Documents\projects\hr recruter\.agents\orchestrator_ollama_opt_gen4
- Original parent: main agent
- Original parent conversation ID: 9cee601c-9b7a-48e2-b44a-869e6a0f5602

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: c:\Users\sri charan\Documents\projects\hr recruter\.agents\orchestrator_ollama_opt_gen4\plan.md
1. **Decompose**: We use the Direct Iteration Loop: Explorer -> Worker -> Reviewer -> Challenger -> Auditor.
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: Spawn subagents to verify the implementation, review it, challenge it, and perform forensic auditing.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at spawn count >= 16. Write handoff.md, spawn successor.
- **Work items**:
  1. Setup and initialization [done]
  2. Codebase verification (Review/Challenger/Auditing) [pending]
- **Current phase**: 2
- **Current focus**: Verification of existing code modifications via Reviewer, Challenger, and Auditor.

## 🔒 Key Constraints
- General candidate questions: under 15-20 words, professional, no verbose introductory prefixes.
- On-demand JD match questions: never generated on ingestion. Display "Construct questions according to JD Match" button on JD match context if not generated yet.
- Optimized Ollama prompts: highly optimized, compact prompts, concise questions under 15-20 words.
- Max tokens set to at least 8000/8192 for LLMs.
- Do not delete/overwrite existing web pages/components.
- Configure Ollama parameters (num_ctx, num_predict) appropriately.
- Maintain duplicate candidate resolution flow (Update, Delete & Import New, Delete Existing Only, Cancel).

## Current Parent
- Conversation ID: 9cee601c-9b7a-48e2-b44a-869e6a0f5602
- Updated: not yet

## Key Decisions Made
- Inherited implementation from Gen 3 worker.
- Need to spawn reviewer, challenger, and auditor to verify the existing changes and finalize the task.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_1 | teamwork_preview_explorer | Explore backend question generation / constraints | in-progress | c1c98012-e7c4-4ec9-932f-333bc56b6739 |
| explorer_2 | teamwork_preview_explorer | Explore frontend details drawer / RAG search | in-progress | b2bf7802-7185-4004-8703-52fc22743485 |
| explorer_3 | teamwork_preview_explorer | Explore Ollama config and duplicate flow preservation | in-progress | 271f5861-1913-4ca3-8d11-5fcddb145d3a |

## Succession Status
- Succession required: no
- Spawn count: 3 / 16
- Pending subagents: c1c98012-e7c4-4ec9-932f-333bc56b6739, b2bf7802-7185-4004-8703-52fc22743485, 271f5861-1913-4ca3-8d11-5fcddb145d3a
- Predecessor: orchestrator_ollama_opt_gen3
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: not started
- Safety timer: none

## Artifact Index
- c:\Users\sri charan\Documents\projects\hr recruter\.agents\orchestrator_ollama_opt_gen4\plan.md — Orchestrator plan
- c:\Users\sri charan\Documents\projects\hr recruter\.agents\orchestrator_ollama_opt_gen4\progress.md — Progress log
- c:\Users\sri charan\Documents\projects\hr recruter\.agents\orchestrator_ollama_opt_gen4\BRIEFING.md — Briefing file
