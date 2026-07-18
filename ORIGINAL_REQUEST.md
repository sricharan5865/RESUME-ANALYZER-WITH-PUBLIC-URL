# Original User Request

## Initial Request — 2026-06-15T21:08:44+05:30

Extend the TalentFlow recruitment automation platform to generate two separate lists of questions and answers (one for HR questions, and one for Technical questions) when a candidate's resume is analyzed, storing them in the database and showing them in the UI.

Working directory: c:\Users\sri charan\Documents\projects\hr recruter
Integrity mode: development

## Requirements

### R1. DB Schema Update
- Extend the Candidate database schema to store two separate arrays/structures of Q&As:
  - `hrQuestions`: A list of questions and answers focused on HR, cultural fit, and behavioral aspects.
  - `technicalQuestions`: A list of questions and answers focused on technical skills, experience, and domain knowledge.

### R2. Backend Parser Integration
- Integrate the Q&A generation into the existing backend parser (geminiParser.js) using the configured Gemini model (`google/gemini-2.5-flash`).
- When a resume is analyzed, ask the LLM to generate custom HR and Technical Q&As based on the resume content.
- Provide a backend API endpoint `/api/candidates/:id/generate-questions` to allow generating/regenerating the Q&As for existing candidates.

### R3. Frontend UI Integration
- Update the candidate's profile/detail view in the client UI to present the HR questions & answers and Technical questions & answers in two clean, distinct sections or tabs.
- Add a button in the UI to trigger regeneration/generation of the questions for an existing candidate.

## Acceptance Criteria

### Schema & Data Storage
- [ ] Database Schema stores `hrQuestions` and `technicalQuestions` (each containing `question` and `answer` fields).
- [ ] A candidate's document in MongoDB populated after parser execution contains non-empty lists for both categories.

### Parser & API Execution
- [ ] Uploading a new resume successfully generates and saves both HR and Technical Q&As.
- [ ] Calling `/api/candidates/:id/generate-questions` updates the candidate document with newly generated Q&As.

### UI Delivery
- [ ] Candidate detail page displays "HR Questions & Answers" and "Technical Questions & Answers" in separate sections.
- [ ] The UI allows requesting a manual regeneration of these questions for the active candidate.

## Follow-up — 2026-06-30T19:18:43+05:30

Implementing Role-Based Access Control (RBAC) in the TalentFlow Q&A application, dividing functionality among Administrator, HR Recruiter, and Hiring Manager, plus allowing administrators to manage users and permissions.

Working directory: c:\Users\sri charan\Documents\projects\hr recruter
Integrity mode: development

## Requirements

### R1. User Authentication & Login
Introduce login functionality with predefined or dynamic accounts for the three roles.

### R2. Role-Based Access Control (RBAC) & Privileges
Limit dashboard views, candidate operations, API routes, and database access based on user role: Administrator, HR Recruiter, and Hiring Manager. Additionally, enable Administrators and HR Recruiters to send/assign selected candidate resumes directly to a specific Hiring Manager (e.g., through a "Share" or "Assign to Manager" UI action).

### R3. User & Permission Management (Admin Only)
Allow Administrators to create, update, assign roles/permissions to, and delete other user accounts from the application. Additionally, Administrators can reset a user's password.

### R4. Password & Profile Management
Enable users to change their own passwords. All password change or reset forms (for both user self-change and administrator reset) must require entering the new password twice ("New Password" and "Confirm New Password") to validate they match.

## Acceptance Criteria

### Security & Access Control
- Login screen prevents unauthenticated access to the main dashboard.
- Users can log in with role-specific credentials.
- Administrator role has full access to all features (including settings, user management, and DB tools).
- Administrator can create new users, modify their roles/permissions, and delete them via a User Management panel.
- Administrator can reset passwords for any user profile.
- HR Recruiter role can upload, view, parse resumes, and manage candidates.
- Hiring Manager role can view parsed candidates and their generated Q&As, but cannot upload/delete resumes or trigger manual parsing/regeneration.
- Administrators and HR Recruiters can assign/send candidate profiles to a specific Hiring Manager from the dashboard.
- Hiring Managers can only view candidates that have been shared/assigned to them (or all if configured, but specifically can access shared profiles).
- Users can update their own passwords.
- Any password reset or change action includes a mandatory "Confirm New Password" field with matching validation.
- Frontend routes/UI elements and backend API endpoints are secured appropriately per role.

## Follow-up — 2026-07-01T18:34:28+05:30

Audit the full codebase to identify and fix all potential JSON parsing vulnerabilities related to local Ollama LLM integration, ensuring seamless resume parsing, email classification, and frontend API data handling operations without altering baseline behavior.

Working directory: c:\Users\sri charan\Documents\projects\hr recruter
Integrity mode: development

## Requirements

### R1. Full Codebase JSON Integrity Audit
- Audit all files (backend and frontend) interacting with, receiving, or parsing JSON payloads from Ollama or local API endpoints.
- Harden the parser, email categorizer, and embedding service against truncated, unescaped, or malformed JSON payloads.

### R2. Core Functionality Preservation
# Original User Request

## Initial Request — 2026-06-15T21:08:44+05:30

Extend the TalentFlow recruitment automation platform to generate two separate lists of questions and answers (one for HR questions, and one for Technical questions) when a candidate's resume is analyzed, storing them in the database and showing them in the UI.

Working directory: c:\Users\sri charan\Documents\projects\hr recruter
Integrity mode: development

## Requirements

### R1. DB Schema Update
- Extend the Candidate database schema to store two separate arrays/structures of Q&As:
  - `hrQuestions`: A list of questions and answers focused on HR, cultural fit, and behavioral aspects.
  - `technicalQuestions`: A list of questions and answers focused on technical skills, experience, and domain knowledge.

### R2. Backend Parser Integration
- Integrate the Q&A generation into the existing backend parser (geminiParser.js) using the configured Gemini model (`google/gemini-2.5-flash`).
- When a resume is analyzed, ask the LLM to generate custom HR and Technical Q&As based on the resume content.
- Provide a backend API endpoint `/api/candidates/:id/generate-questions` to allow generating/regenerating the Q&As for existing candidates.

### R3. Frontend UI Integration
- Update the candidate's profile/detail view in the client UI to present the HR questions & answers and Technical questions & answers in two clean, distinct sections or tabs.
- Add a button in the UI to trigger regeneration/generation of the questions for an existing candidate.

## Acceptance Criteria

### Schema & Data Storage
- [ ] Database Schema stores `hrQuestions` and `technicalQuestions` (each containing `question` and `answer` fields).
- [ ] A candidate's document in MongoDB populated after parser execution contains non-empty lists for both categories.

### Parser & API Execution
- [ ] Uploading a new resume successfully generates and saves both HR and Technical Q&As.
- [ ] Calling `/api/candidates/:id/generate-questions` updates the candidate document with newly generated Q&As.

### UI Delivery
- [ ] Candidate detail page displays "HR Questions & Answers" and "Technical Questions & Answers" in separate sections.
- [ ] The UI allows requesting a manual regeneration of these questions for the active candidate.

## Follow-up — 2026-06-30T19:18:43+05:30

Implementing Role-Based Access Control (RBAC) in the TalentFlow Q&A application, dividing functionality among Administrator, HR Recruiter, and Hiring Manager, plus allowing administrators to manage users and permissions.

Working directory: c:\Users\sri charan\Documents\projects\hr recruter
Integrity mode: development

## Requirements

### R1. User Authentication & Login
Introduce login functionality with predefined or dynamic accounts for the three roles.

### R2. Role-Based Access Control (RBAC) & Privileges
Limit dashboard views, candidate operations, API routes, and database access based on user role: Administrator, HR Recruiter, and Hiring Manager. Additionally, enable Administrators and HR Recruiters to send/assign selected candidate resumes directly to a specific Hiring Manager (e.g., through a "Share" or "Assign to Manager" UI action).

### R3. User & Permission Management (Admin Only)
Allow Administrators to create, update, assign roles/permissions to, and delete other user accounts from the application. Additionally, Administrators can reset a user's password.

### R4. Password & Profile Management
Enable users to change their own passwords. All password change or reset forms (for both user self-change and administrator reset) must require entering the new password twice ("New Password" and "Confirm New Password") to validate they match.

## Acceptance Criteria

### Security & Access Control
- Login screen prevents unauthenticated access to the main dashboard.
- Users can log in with role-specific credentials.
- Administrator role has full access to all features (including settings, user management, and DB tools).
- Administrator can create new users, modify their roles/permissions, and delete them via a User Management panel.
- Administrator can reset passwords for any user profile.
- HR Recruiter role can upload, view, parse resumes, and manage candidates.
- Hiring Manager role can view parsed candidates and their generated Q&As, but cannot upload/delete resumes or trigger manual parsing/regeneration.
- Administrators and HR Recruiters can assign/send candidate profiles to a specific Hiring Manager from the dashboard.
- Hiring Managers can only view candidates that have been shared/assigned to them (or all if configured, but specifically can access shared profiles).
- Users can update their own passwords.
- Any password reset or change action includes a mandatory "Confirm New Password" field with matching validation.
- Frontend routes/UI elements and backend API endpoints are secured appropriately per role.

## Follow-up — 2026-07-01T18:34:28+05:30

Audit the full codebase to identify and fix all potential JSON parsing vulnerabilities related to local Ollama LLM integration, ensuring seamless resume parsing, email classification, and frontend API data handling operations without altering baseline behavior.

Working directory: c:\Users\sri charan\Documents\projects\hr recruter
Integrity mode: development

## Requirements

### R1. Full Codebase JSON Integrity Audit
- Audit all files (backend and frontend) interacting with, receiving, or parsing JSON payloads from Ollama or local API endpoints.
- Harden the parser, email categorizer, and embedding service against truncated, unescaped, or malformed JSON payloads.

### R2. Core Functionality Preservation
- Ensure all existing JWT auth, manual upload constraints, and baseline parsing logic flows remain completely undisturbed and operational.

## Acceptance Criteria

### JSON Error Resilience
- [ ] Verification script running uploads of complex resumes via Ollama succeeds without triggering unhandled JSON parsing syntax exceptions.
- [ ] No unhandled JSON parsing errors occur on any API endpoint during manual resume upload or email sourcing.
- [ ] All 27 existing E2E tests pass with 100% success rate.

## Follow-up — 2026-07-01T13:09:03Z

Check the Ollama integration specifically to ensure that all user roles (HR recruiter, administrator, others) can analyze resumes without hitting tokenization limits that truncate output or halt the resume analyzing process. Make sure to audit and lift any restrictive tokenization limits for all roles, keeping it robust.

## Follow-up — 2026-07-02T15:11:13Z

Audit the Node.js backend codebase and verify the Ollama integration for any timeouts, performance bottlenecks, and configuration errors, ensuring smooth resume processing.

Working directory: c:\Users\sri charan\Documents\projects\hr recruter

## Requirements

### R1. Ollama Integration Audit
Verify all Ollama integration points (resume parsing, email categorization) for timeout handling, performance configurations (such as context window and prediction parameters), and response validation.

### R2. Database and Connection Validation
Check Mongoose models and queries for deprecation warnings, structural errors, and performance improvements during document updates and creation.

## Acceptance Criteria

### Performance & Timeouts
- [ ] No hardcoded short timeouts on Ollama API requests that cause premature 504 errors.
- [ ] Mongoose calls use the modern `returnDocument` parameter instead of the deprecated `new` option.
- [ ] Ollama request parameters (`num_ctx`, `num_predict`) are optimized for local/GPU environments to prevent high latency or VRAM exhaustion.

## Follow-up — 2026-07-02T16:47:38Z

Optimize local Ollama setups to eliminate performance bottlenecks and reduce latency for long prompts, ensuring immediate delivery of actionable solutions.

Working directory: c:\Users\sri charan\Documents\projects\hr recruter

## Requirements

### R1. System Configurations Audit
Create optimization guidelines and configuration modifications to tune Ollama system service parameters (e.g., systemd environment settings, thread count, batch sizing, context settings) for local GPU/CPU hardware.

### R2. Context Window and Prompt Compression Logic
Design and write modular utility code to dynamically compress prompts and optimize context windows (`num_ctx`, `num_predict`) for any custom LLM pipelines running on local instances.

## Acceptance Criteria

### Execution & Performance
- [ ] Prompt pre-processing latency is reduced by at least 50% for typical resume processing payloads.
- [ ] System handles inputs without memory/VRAM exhaustion on standard hardware.
- [ ] Configuration scripts/files are fully verified and ready for deployment.

## Follow-up — 2026-07-06T14:35:39Z

Enhance the TalentFlow HR Recruitment platform with four improvements: filtered Excel export with stage selection dialog, smarter AI/RAG search that accepts a job description and scores/ranks candidates against it with JD-tailored questions, de-duplicated recruitment logs that prevent same-stage entries, and standardized HR cold-calling questions prepended to the question bank.

Working directory: c:\Users\sri charan\Documents\projects\hr recruter
Integrity mode: development

> IMPORTANT: Existing Code Rules (from project AGENTS.md):
> - Do NOT delete or overwrite existing web pages, components, views, or routing files.
> - Preserve all existing functionality — these are additive enhancements.
> - When calling LLMs (OpenRouter, Gemini, Ollama), always set max_tokens / maxOutputTokens to at least 8000/8192 to prevent truncation.
> - The system uses MongoDB via Mongoose. In-memory vector index for RAG.
> - The project runs on Node.js (server) + Vite/React (client).
> - The backend AI provider is configured in Settings (Gemini, Claude, OpenAI, or Ollama). Use the existing callAIProvider() function in geminiParser.js for any new LLM calls.

## Requirements

### R1. Export to Excel — Stage Filter Dialog
When the "Export to Excel" button is clicked on the Pipeline Kanban page (client/src/components/PipelineBoard.jsx), instead of immediately exporting all candidates, show a modal/dialog that lets the user choose which pipeline stages to include in the export. The options should be checkboxes for: Inbox, Shortlist, Interview, Offered, Rejected (and an "All" option). Only candidates matching the selected stages should be exported. The current export function (handleExport at lines 29-57) exports sortedCandidates without any stage filtering — this must be enhanced to filter by the selected stages before passing to exportToCSV().

### R2. AI Search — JD-Based Candidate Scoring, Ranking & Question Generation
In the AI Search page (client/src/components/RAGSearch.jsx), enhance the "Ask AI" mode so that when a user pastes a job description with required qualifications:

1. Find candidates via RAG: Use the existing vector search (searchResumes() in server/ragService.js) to find candidates whose resume content is semantically relevant to the JD text.

2. Score & Rank against the JD: For each matched candidate, use the existing scoring model (scoreCandidate() in server/geminiParser.js) or a similar AI call to analyze the candidate's qualities against the JD requirements and produce a match score (0-100), matching skills, missing skills, and an explanation. Return the candidates ranked by this score.

3. Generate JD-tailored interview questions: For the top matched candidates, automatically generate new interview questions that are tailored to the job description (using the existing generateQuestionsForCandidate() function which already accepts a job description parameter). The AI Search results should show these JD-specific questions or indicate that questions have been regenerated for the JD context.

The backend endpoint for this can be a new route (e.g. POST /api/rag/jd-search) or an enhancement to the existing /api/rag/ask endpoint. The frontend should display the ranked candidates with their JD match scores, matching/missing skills, and the generated questions.

### R3. Recruitment Log — No Duplicate Same-Stage Entries
In the candidate stage change endpoint (server.js PATCH /api/candidates/:id/stage around line 1792), add a guard so that if the new stage is identical to the current stage, the server returns the candidate unchanged without adding a history entry. This prevents duplicate log entries like "Moved from Shortlist to Shortlist". Also add the same guard on the frontend side in PipelineBoard.jsx (handleDrop around line 132) and CandidateDetails.jsx (handleStageSelect) so the API is not called at all when the stage hasn't changed.

### R4. HR Questions — Standardized Cold-Calling Questions + Tailored Questions (14 total)
Modify the HR question generation in server/geminiParser.js so that the final hrQuestions array contains exactly 14 questions (not 7). The first 7 must always be these fixed cold-calling screening questions (with generic sample answers):

1. "Are you looking for a job?"
2. "How many years of experience do you have?"
3. "What is the reason for your job change?"
4. "What is your current CTC?"
5. "What is your expected CTC?"
6. "What is your notice period?"
7. "Is your notice period negotiable? (If the notice period is 30, 60, or 90 days)"

The remaining 7 should be the AI-generated, candidate-personalized HR questions that the system already produces (from mapAnalysisToQuestions() lines 757-876 and the LLM prompt section 5). Update the mapAnalysisToQuestions() function to prepend the 7 fixed questions and then append up to 7 AI-generated ones. The CandidateDetails.jsx UI that renders HR questions should display all 14 properly.

## Acceptance Criteria

### Export to Excel
- [ ] Clicking "Export to Excel" on the Pipeline Kanban shows a stage selection dialog before exporting
- [ ] The dialog has checkboxes for Inbox, Shortlist, Interview, Offered, Rejected, and an "All" toggle
- [ ] Selecting specific stages and confirming exports only candidates in those stages
- [ ] Selecting "All" or all checkboxes exports the same data as the old behavior
- [ ] The dialog can be cancelled without exporting

### AI Search with JD Scoring
- [ ] Pasting a job description into the Ask AI search box triggers a JD-based candidate search
- [ ] Each matched candidate is scored (0-100) against the JD with matching skills, missing skills, and explanation displayed
- [ ] Candidates are ranked by their JD match score (highest first)
- [ ] JD-tailored interview questions are generated or available for the top matched candidates
- [ ] The UI clearly shows the JD analysis results distinct from regular search results

### Recruitment Log De-duplication
- [ ] Dragging a candidate to the same column they are already in does NOT create a new history entry
- [ ] Changing the stage dropdown in CandidateDetails to the same value does NOT create a log
- [ ] The server endpoint returns the candidate unchanged when old stage equals new stage
- [ ] Actual stage changes (e.g., Inbox to Shortlist) still log correctly

### HR Questions
- [ ] Every newly parsed candidate has exactly 14 HR questions (not 7)
- [ ] The first 7 questions are always the standardized cold-calling questions in the exact order specified
- [ ] Questions 8-14 are AI-generated and personalized to the candidate's resume
- [ ] The HR questions section in the candidate profile UI displays all 14 questions properly
- [ ] Previously parsed candidates are unaffected (their existing questions remain)

## Verification Plan

### Automated Tests
- After changes, start the dev server (npm run dev in client, node server.js in server) and verify no startup errors
- Upload a test resume and verify 14 HR questions are generated with the first 7 being the cold-calling script

### Manual Verification
- Test Export to Excel: click button then verify dialog appears, select Shortlist only, verify exported CSV contains only Shortlist candidates
- Test AI Search: paste a GIS Analyst job description, verify candidates appear ranked with scores, matching/missing skills, and tailored questions
- Test duplicate logs: drag a candidate to its current column, verify no new log entry appears
- Test HR questions: open a newly parsed candidate, verify first 7 are the cold-calling questions

## Follow-up — 2026-07-09T08:47:01+05:30

The goal is to build and implement comprehensive automated E2E tests and perform an audit on the duplicate candidate upload and resolution pipeline (Update, Delete & Re-import, Delete Only, and Cancel) on the existing recruitment platform.

Working directory: c:\Users\sri charan\Documents\projects\hr recruter
Integrity mode: development

## Requirements

### R1. E2E Tests for Duplicate Resolution Options
Create automated E2E tests using Vitest to verify all four duplicate resolution choices:
1. Update: Overwrites existing candidate fields and resume URL, preserving the candidate ID.
2. Delete Existing & Import New: Deletes the old candidate profile and indexes, then parses and imports the new resume as a fresh candidate.
3. Delete Existing Only (Halt Import): Deletes the existing candidate and does not import the new file.
4. Cancel (Discard Uploaded File): Discards the incoming temp file and leaves the database unmodified.

### R2. Verification of Ingestion Log Statuses
Verify that the IngestionLog status is correctly updated to 'success', 'cancelled', or 'failed' according to the selected resolution action.

## Acceptance Criteria

### E2E Test Suite
- [ ] Implement automated test cases in `tests/e2e/duplicateResolution.test.js` covering all 4 resolution actions.
- [ ] The test server should mock LLM parser calls correctly for duplicate scenarios.
- [ ] Running `npm run test:e2e` runs all tests, including the new tests, successfully.

## Follow-up — 2026-07-10T15:50:10+05:30

Optimize the light mode color branding, scheming, and palette of the TalentFlow web application by researching popular sites and running an iterative design-evaluation loop until the design scores 9/10.

Working directory: c:/Users/sri charan/Documents/projects/hr recruter
Integrity mode: development

## Requirements

### R1. Color Research & Selection
The team must research and analyze the light mode color palettes of at least 10–15 industry-leading web applications (e.g., Vercel, Linear, Stripe, Tailwind CSS, GitHub, Framer, Figma, Notion, Slack, Shopify) to identify patterns in text contrast, border structure, card shading, and accent harmony.

### R2. Color Palette Implementation
Update the `.light-theme` CSS variables in c:/Users/sri charan/Documents/projects/hr recruter/client/src/index.css to apply the optimized scheme. No functional code or JSX layout files should be modified.

### R3. Iterative Feedback Loop (AI Critic)
Configure an independent AI Critic Agent equipped with a strict design evaluation rubric (assessing text contrast, visual hierarchy, color harmony, and overall premium polish). The critic must rate the updated palette on a scale of 1–10. The team must loop, research, adjust, and re-evaluate until the design scores a 9/10 or higher.

## Acceptance Criteria

### Research & Analysis
- Document the light mode analysis of 10-15 popular websites in a markdown research report, outlining their color choices.

### High Contrast & Cohesion
- No washed-out colors or low-contrast text elements.
- Cards, sidebars, and main content panes must have crisp, clear, modern division lines.

### Iteration & Rating
- The critique history of each iteration loop must be documented in a log file, showing the progressive scores.
- The final palette iteration must receive a score of 9/10 or higher from the independent AI Critic agent.

## Follow-up — 2026-07-12T10:06:49+05:30

# Teamwork Project Prompt

## Project Description
Perform a comprehensive audit of the TalentFlow recruitment codebase, compare it against the current configuration baseline, assess upgrade viability for key technologies (Node, React, Mongoose, Vite, LLMs), and produce a detailed improvements roadmap. All recommendations must prioritize free-of-cost operation.

Working directory: c:\Users\sri charan\Documents\projects\hr recruter
Integrity mode: development

## Requirements

### R1. Codebase & Configuration Audit
Audit the current configuration of the project, detailing framework versions, dependencies (Node, Express, React, Vite, Mongoose, Python OCR), and AI settings.

### R2. Upgrade Viability Assessment
Evaluate upgrading core dependencies (e.g. Node, React, Vite, MongoDB/Mongoose, Gemini API, Ollama models) with respect to the latest stable versions. Provide a structured pros/cons analysis for each.

### R3. Free-of-Cost Optimization Strategy
Design an execution strategy that keeps setup and operational costs at zero (leveraging local Ollama configurations, free-tier Gemini API, MongoDB Atlas Free tier, and Render free tier).

### R4. Improvement Recommendations & Risk Analysis
Recommend concrete software and system-level improvements (e.g., performance optimizations, deprecation warnings, timeout safeguards) along with a risk assessment.

### R5. Prioritized Implementation Roadmap
Detail a prioritized, milestone-based roadmap for implementing the suggested improvements.

## Acceptance Criteria

### Content & Structure
- [ ] The final report contains all requested sections: Executive Summary, Current State Baseline, Upgrade Assessment, Cost Optimization, Recommendations, Risk Assessment, and Implementation Roadmap.
- [ ] Baseline configuration lists current versions from `package.json` files and Python/system config files.
- [ ] Recommendations are aligned with keeping the platform free of cost.
- [ ] No implementation code is modified or deleted.

### Delivery Format
- [ ] The comprehensive report is returned in full directly in the conversation chat response.

## Follow-up — 2026-07-14T22:42:38+05:30

Add three features to an existing, fully working Node.js/React recruitment platform (TalentFlow): (1) hybrid AI call caching to reduce LLM token usage, (2) an admin-only "Clear Database" button with typing confirmation, and (3) a 24-hour login session expiry popup.

Working directory: c:\Users\sri charan\Documents\projects\hr recruter
Integrity mode: development

CRITICAL: This is a working production application. Every existing feature works perfectly. Make only the minimal, surgical code changes described below. Do NOT refactor, restructure, rename, reformat, or delete any existing code that is unrelated to these three features. If you are unsure whether a change is needed, do NOT make it.

## Requirements

### R1. Hybrid AI Call Caching (In-Memory + MongoDB)

Add a caching layer to the centralized AI dispatch functions to avoid redundant LLM API calls. When the same prompt+context combination is sent to an AI provider, return the cached result instead of making a new API call. The cache must survive server restarts (persistent MongoDB storage) and also provide fast in-memory lookups during a running session.

**Files to modify (and ONLY these sections):**

- `server/models.js` — Add a new `AICache` Mongoose schema/model at the end of the file. Schema: `cacheKey` (String, unique), `response` (Mixed), `type` (String), `createdAt` (Date, with MongoDB TTL expiry of 7 days). Export it alongside existing models.

- `server/geminiParser.js` — Import `crypto` (Node.js built-in) and the new `AICache` model. Add a module-level `Map` for in-memory caching (max 500 entries). Add a `generateCacheKey()` helper that creates a SHA-256 hash of: `prompt + systemInstruction + JSON.stringify(schema) + (pdfBase64 || '') + aiProvider`. Modify the `callAIProvider` function to: (a) compute the cache key using the current `aiProvider` from settings, (b) check in-memory cache first, (c) if miss, check MongoDB `AICache` collection, (d) if miss, execute the existing AI call as-is, (e) store the result in both caches. Add an optional `bypassCache` parameter (default `false`) that skips cache lookup when true. **Do NOT change any of the existing AI provider logic (fetch calls, response parsing, error handling, retry logic). Only wrap the existing logic with cache check/save.**

- `server/emailCategorizer.js` — Apply the same caching pattern to `callAIProviderForClassification`. Add a separate in-memory `Map` and use `AICache` for persistence. **Do NOT change any existing classification logic, prompt construction, or JSON repair utilities.**

- `server/server.js` — Add one new route: `POST /api/settings/clear-cache` (protected by `authenticateToken`). This route should clear the in-memory caches (by importing a `clearAICaches()` function exported from `geminiParser.js` and a `clearClassificationCache()` from `emailCategorizer.js`) and call `AICache.deleteMany({})`. **Do NOT modify any existing routes or middleware.**

- `client/src/components/Settings.jsx` — In the AI configuration sub-tab (`activeSubTab === 'ai'`), add a small card/section with a "Clear AI Cache" button. On click, it calls `POST /api/settings/clear-cache` and shows a success/error toast. **Do NOT modify any existing UI elements, forms, or state variables.**

### R2. Admin-Only "Clear Database" Button

Add a protected endpoint and UI element that allows only the main admin to wipe all candidate/job data from the database while preserving user accounts and settings.

**Files to modify (and ONLY these sections):**

- `server/server.js` — Add one new route: `POST /api/admin/clear-database` (protected by `authenticateToken` and `requireRole(['admin'])`). This route deletes all documents from: `Candidate`, `Job`, `ProcessedEmail`, `IngestionLog`, `EmailLog`, `ResumeChunk`, and `AICache`. It must NOT delete `User` or `Settings` documents. Return a JSON summary of deleted counts. **Do NOT modify any existing routes.**

- `client/src/components/Settings.jsx` — At the bottom of the Settings view, add a "Danger Zone" section that is ONLY rendered when `currentRole === 'Admin'`. It should contain a red-bordered card with a "Clear Entire Database" button. Clicking it opens a confirmation modal where the user must type "CLEAR" into a text input before the delete button becomes active. On successful deletion, call `onSettingsSaved()` to refresh the app state and show a success message. **Do NOT modify any existing UI elements.**

### R3. 24-Hour Login Session Expiry Popup

Add a client-side check that detects when a user's login session is older than 24 hours and displays a popup message.

**Files to modify (and ONLY these sections):**

- `client/src/App.jsx` — Three small changes:
  1. **On Login** (where `localStorage.setItem('token', newToken)` is called around line 319-320): Add `localStorage.setItem('loginTime', Date.now().toString());` immediately after.
  2. **On Load** (add a new `useEffect` near the existing auth effects): If `token` exists, read `loginTime` from localStorage. If `Date.now() - parseInt(loginTime, 10) > 24 * 60 * 60 * 1000`, show an alert or styled modal with the message: `"Please logout and log in to access "`.
  3. **On Logout** (where `localStorage.removeItem('token')` is called around lines 122-123 and 627-628): Add `localStorage.removeItem('loginTime');` alongside.
  
  **Do NOT modify any existing state, routing, component rendering, or any other logic.**

## Acceptance Criteria

### Caching
- [ ] Uploading the same resume PDF twice results in an AI cache hit on the second upload (verify by checking server console logs for cache hit messages or by observing significantly faster processing time)
- [ ] The `AICache` MongoDB collection contains documents after a resume upload
- [ ] Clicking "Clear AI Cache" in Settings empties the `AICache` collection and the in-memory caches
- [ ] Changing the AI provider in settings and re-uploading produces a fresh AI call (different cache key due to different provider)

### Database Clear
- [ ] The "Danger Zone" section is NOT visible when logged in as a Recruiter or Manager
- [ ] The "Danger Zone" section IS visible when logged in as Admin
- [ ] Typing anything other than "CLEAR" keeps the delete button disabled
- [ ] After typing "CLEAR" and confirming, all Candidates, Jobs, ProcessedEmails, IngestionLogs, EmailLogs, ResumeChunks are deleted
- [ ] Users and Settings documents are preserved after the clear operation
- [ ] The admin remains logged in after the clear operation

### Login Expiry
- [ ] After logging in, `loginTime` is present in localStorage
- [ ] If `loginTime` is manually set to 25 hours ago in browser devtools and the page is refreshed, the popup message `"Please logout and log in to access "` is displayed
- [ ] After logging out and logging back in, `loginTime` is reset to the current timestamp

### No Regressions
- [ ] The application starts without errors (`npm run dev` for both client and server)
- [ ] Existing resume upload, parsing, scoring, search, pipeline, and settings features work exactly as before
- [ ] No existing files are deleted or renamed
- [ ] No existing functions are refactored or restructured

## Follow-up — 2026-07-16T10:46:57Z

Verify and correct the question generation implementation to ensure that normal candidate analysis questions (with 7 fixed screening questions prepended) and JD-tailored questions (which are generated on-demand and have no screening questions) are kept completely distinct and never combined.

Working directory: c:\Users\sri charan\Documents\projects\hr recruter
Integrity mode: development

## Requirements

### R1. Separate Normal Analyzing Questions and JD Match Questions
- In `server/geminiParser.js`, ensure that regenerating normal candidate questions (when `jobDescription` is `null`) does NOT call `mapAnalysisToQuestions` with `isJdMatch = true`. Passing `true` skips the 7 standardized screening questions, causing them to be lost on regeneration. Ensure normal questions are always processed with `isJdMatch = false` so the 14-question standard (7 screening + 7 personalized) is preserved.
- Verify that JD-tailored questions (generated on-demand when `jobDescription` is present) remain strictly separated in the database schema under `candidate.jdQuestions` and are displayed in their own section in the frontend drawer UI, completely distinct from the general candidate analysis questions.

### R2. Test Infrastructure Self-Containment
- Modify the E2E test setup (`tests/e2e/testServerEntry.js` and `tests/e2e/setup.js`) to run a local `mongodb-memory-server` instance on port 27018. This resolves connection issues (like `ECONNREFUSED` on port 27017) and makes the E2E test suite fully self-contained without requiring external database configuration.

## Acceptance Criteria

### Question Separation & Formats
- [ ] Uploading a resume generates exactly 14 HR questions (7 standardized cold-calling questions + 7 personalized ones).
- [ ] Clicking "Regenerate Questions" in the Tailored questions section updates the candidate's `hrQuestions` and retains exactly 14 questions, starting with the 7 fixed screening questions.
- [ ] Custom JD-tailored questions are generated on-demand, saved under `candidate.jdQuestions`, and displayed in the UI under "JD-Relevant Questions" without any screening questions combined.

### E2E Verification
- [ ] Running `npm run test:run` (while the test server is running on port 5001) successfully runs and passes all 39 tests across the 6 test files on the in-memory test database.
