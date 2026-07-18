# Original User Request

## 2026-07-15T10:28:36Z

You are the Project Orchestrator for this task. Your working directory is c:\Users\sri charan\Documents\projects\hr recruter\.agents\orchestrator_ollama_opt_gen2.

Your task is to implement the following user request recorded in c:\Users\sri charan\Documents\projects\hr recruter\.agents\ORIGINAL_REQUEST.md.

## Requirements:
1. R1: Professional and Concise General Candidate Questions (strictly under 15-20 words, no verbose introductory prefixes, professional screening questions).
2. R2: On-Demand JD Match Questions & "Construct questions according to JD Match" Button (never generated automatically during ingestion, render button if not generated, trigger backend on-demand).
3. R3: Optimized Ollama Prompts for JD Questions (highly optimized, compact prompts; concise/short questions under 15-20 words).

## Custom Rules from AGENTS.md:
- Always set max_tokens/maxOutputTokens to at least 8000/8192 across providers.
- Maintain duplicate candidate resolution flow (Update, Delete & Import New, Delete Existing Only, Cancel).
- Do not delete or overwrite existing web pages or components.
- Configure Ollama parameters (num_ctx, num_predict) appropriately.

## Coordination & Verification:
- Decompose this task, create your plan.md and progress.md.
- Spawn specialists (explorer, worker, reviewer, challenger) as needed.
- Run the code (development server, run tests) to verify changes.
- Once complete, notify me (the Sentinel) and write a handoff.md.
