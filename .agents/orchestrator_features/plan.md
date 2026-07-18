# Scope: Orchestrator Features Implementation

## Architecture
- React (Vite) frontend + Express/Node.js backend + MongoDB (Mongoose).
- AI integration via `google/gemini-2.5-flash` or local Ollama.
- Cache layer: Memory map (max 500 entries) + MongoDB collection `AICache`.

## Milestones
| # | Name | Scope | Dependencies | Status | Conversation ID |
|---|------|-------|-------------|--------|-----------------|
| 1 | Hybrid AI Call Caching | Implement caching in server/models.js, server/geminiParser.js, server/emailCategorizer.js, server/server.js, client/src/components/Settings.jsx | None | IN_PROGRESS | TBD |
| 2 | Admin-Only Clear DB | Implement clear database endpoint and UI trigger in server/server.js, client/src/components/Settings.jsx | Milestone 1 | PLANNED | TBD |
| 3 | 24-Hour Login Session Expiry | Implement login session tracker in client/src/App.jsx | None | PLANNED | TBD |
| 4 | Verification & Audit | E2E testing of the features, adversarial coverage hardening, Forensic Auditor execution | M1, M2, M3 | PLANNED | TBD |

## Interface Contracts
- **POST** `/api/settings/clear-cache`
  - Returns: `{ success: true, message: string }`
  - Requires: Authentication (JWT token)
- **POST** `/api/admin/clear-database`
  - Returns: `{ success: true, deletedCounts: { Candidate: number, Job: number, ProcessedEmail: number, IngestionLog: number, EmailLog: number, ResumeChunk: number, AICache: number } }`
  - Requires: Authentication + Admin role
- `AICache` Schema:
  - `cacheKey`: String (unique)
  - `response`: Mixed
  - `type`: String
  - `createdAt`: Date (TTL expiry of 7 days)
