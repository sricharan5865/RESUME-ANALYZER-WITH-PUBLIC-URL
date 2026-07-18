# BRIEFING — 2026-07-15T17:06:39+05:30

## Mission
Review changes made by the worker in geminiParser.js and CandidateDetails.jsx to ensure correctness, prompt optimization, question word count limitations, correct UI flows, and that all 39 tests pass.

## 🔒 My Identity
- Archetype: reviewer/critic
- Roles: reviewer, critic
- Working directory: c:\Users\sri charan\Documents\projects\hr recruter\.agents\reviewer_ollama_opt_1
- Original parent: b08bc13e-9980-4f24-b08c-0f8135cd268c
- Milestone: Worker Implementation Review
- Instance: 1 of 1

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code (report findings/errors as review feedback, do not fix them yourself).
- Do not access external websites or services (CODE_ONLY network mode).

## Current Parent
- Conversation ID: b08bc13e-9980-4f24-b08c-0f8135cd268c
- Updated: not yet

## Review Scope
- **Files to review**:
  - `c:\Users\sri charan\Documents\projects\hr recruter\server\geminiParser.js`
  - `c:\Users\sri charan\Documents\projects\hr recruter\client\src\components\CandidateDetails.jsx`
- **Interface contracts**:
  - Button text: `"Construct questions according to JD Match"`
  - Questions under 15-20 words, direct, professional, no candidate history prefixes.
  - Ollama optimization: prompt compression, stripping schema descriptions, dynamic parameter tuning.
  - max_tokens/maxOutputTokens >= 8000/8192 for all providers.
- **Review criteria**: Correctness, performance, formatting limits, and passing the 39 tests.

## Key Decisions Made
- Initializing review environment.

## Review Checklist
- **Items reviewed**: [TBD]
- **Verdict**: pending
- **Unverified claims**: [TBD]

## Attack Surface
- **Hypotheses tested**: [TBD]
- **Vulnerabilities found**: [TBD]
- **Untested angles**: [TBD]

## Artifact Index
- `handoff.md` — Detailed review report
- `progress.md` — Liveness heartbeat and status tracker
