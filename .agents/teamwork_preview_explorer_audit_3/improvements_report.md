# TalentFlow System Architecture Audit & Optimization Report

This report presents a comprehensive, zero-cost optimization strategy, details critical system-level and software-level improvements, provides a risk assessment, and outlines a prioritized roadmap for the TalentFlow recruitment automation platform.

---

## 1. Local Ollama Integration & Optimization Strategy

TalentFlow allows utilizing local Ollama instances for resume parsing, email categorization, and embedding generation. However, local deployments on consumer-grade hardware (CPU or hybrid CPU/GPU) require careful memory and prompt engineering to prevent token thrashing, high latency, or truncation.

### Current Ollama Integration Analysis
* **Configuration**: Configurable via settings collection (defaults to `https://istgenai.smartgeoapps.com/` proxy but can be pointed to `http://localhost:11434`).
* **Endpoints Used**:
  * `/api/chat`: Resume parsing (`geminiParser.js`) and email classification (`emailCategorizer.js`).
  * `/api/embed` & `/api/embeddings` (legacy): Embedding generation (`embeddingService.js`).
* **Context & Token Parameters**:
  * Resume parsing uses dynamic `num_ctx` (4096 or 8192) based on an estimated token count, and a fixed `num_predict: 2048`.
  * Email categorization uses static `num_ctx: 2048` and `num_predict: 256`.

### Identified Gaps & Vulnerabilities
1. **Unused Optimization Module**: The utility file `server/ollamaOptimizer.js` contains two highly effective functions—`compressCandidateProfile` (for stripping large generated fields) and `stripSchemaDescriptions` (for removing verbose descriptions from JSON schemas). **Neither of these functions is imported or utilized anywhere in the codebase.**
2. **Profile Bloat during Scoring**: In `geminiParser.js`, both `scoreCandidate` and `scoreCandidateByOwnCategory` pass candidate profiles to the LLM. `scoreCandidateByOwnCategory` does not strip any fields from the profile, meaning it passes the entire candidate document including raw `resumeText` (thousands of words), full historical action logs, previously generated `hrQuestions`, and `technicalQuestions`. This causes massive token waste and high pre-processing times (evaluation latency) in Ollama.
3. **Empty/Failed JSON Handling**: When Ollama fails to return valid JSON or times out under heavy load, the manual upload route silently catches the error and sets candidate scores to `0` and empty lists (via `Promise.all` catch blocks). The user is left with a corrupted database entry with no notification.
4. **Hardcoded Model Configurations**: Default models (e.g., `llama3` for chat, `gpt-oss:20b` for embeddings) are hardcoded, which limits users from easily swapping in modern, faster models (e.g., `qwen2.5` or `nomic-embed-text`).

### Recommendations for Speed, Memory, and Context Tuning

#### A. Speed & Memory Optimizations (System-Level)
* **Flash Attention**: Enable Flash Attention to reduce memory footprint and increase inference speed by up to 2x. This is activated by launching Ollama with the environment variable:
  ```env
  OLLAMA_FLASH_ATTENTION=1
  ```
* **Thread Pinning**: CPU execution should limit threads to physical cores minus 2 (`N - 2`) to avoid thread thrashing and keep the OS, MongoDB, and Express servers responsive:
  ```env
  OLLAMA_NUM_PARALLEL=1
  OLLAMA_MAX_LOADED_MODELS=2
  OLLAMA_KEEP_ALIVE=60m
  ```
* **Quantized Model Selection**: Recommend using standard `Q4_K_M` (4-bit) quantizations (e.g., `qwen2.5:7b-instruct-q4_K_M` or `llama3:8b-instruct-q4_K_M`) which preserve ~99% of model accuracy while slashing RAM requirements in half.

#### B. Dynamic Prompt & Schema Compression
* **Strip Schema Descriptions**: Strip descriptions from the JSON schema before passing it to `getCompactSchemaInstructions`. In `geminiParser.js`, when `aiProvider === 'ollama'`, run the schema through the unused `stripSchemaDescriptions` utility:
  ```javascript
  import { stripSchemaDescriptions } from './ollamaOptimizer.js';
  // Inside callAIProvider for Ollama
  const cleanSchema = stripSchemaDescriptions(schema);
  userContent += getCompactSchemaInstructions(cleanSchema);
  ```
  This reduces prompt token overhead by up to 40% for complex schemas.
* **Compress Candidate Profile**: In `scoreCandidate` and `scoreCandidateByOwnCategory`, import and run `compressCandidateProfile` from `ollamaOptimizer.js` to exclude raw resume texts, logs, and pre-existing question arrays:
  ```javascript
  import { compressCandidateProfile } from './ollamaOptimizer.js';
  // Before passing candidateProfile to scoring API
  const cleanProfile = compressCandidateProfile(candidateProfile);
  ```
* **Condense System Instructions**: Replace the verbose, cloud-centric system instruction (~500+ words) in `getRecruiterSystemInstruction` with a highly condensed, rule-based instructions version for Ollama (~100 words), focusing strictly on output format constraints.

#### C. Context & Completion Limit Tuning
* **Resume Parsing**: Explicitly lock `num_ctx: 8192` (instead of dynamic calculation) and `num_predict: 2048` to guarantee that long resumes are never truncated.
* **Email Classification**: Maintain `num_ctx: 2048` and `num_predict: 256` for speed.
* **Scoring/Matching**: Tune `num_ctx: 4096` and `num_predict: 512` (since outputs are brief ratings and short rationales).

---

## 2. Strategy for Keeping Setup & Operational Costs at Zero

To ensure the system can be deployed and run with $0.00 setup and recurring costs, the architecture must adapt to the constraints of free-tier cloud services.

### A. Gemini API Free Tier (Google AI Studio)
* **Limits**: 15 Requests Per Minute (RPM), 1,500 Requests Per Day (RPD), 1 Million Tokens Per Minute (TPM).
* **Zero-Cost Strategy**:
  1. **Sequential Sourcing Loop with Delay**: The automated email poller currently runs every 30 seconds. If there are 5 attachments, processing them in parallel will immediately hit the 15 RPM limit. We must process attachments **sequentially** and inject a **5-second sleep/delay** between each candidate processing run.
  2. **Rate Limit Retry (Exponential Backoff)**: Wrap all Gemini API requests in an exponential backoff loop that listens for HTTP `429 Too Many Requests` responses and retries after a brief, progressive delay (e.g., 2s, 4s, 8s).
  3. **Conditional Sourcing**: Ensure email polling only executes when `sourcingAgentActive` is true in Settings, and skip processing already indexed message IDs by keeping the `ProcessedEmail` collection updated first.

### B. MongoDB Atlas Free Tier (M0 Shared Cluster)
* **Limits**: 512 MB Storage, 500 max connections, limited read/write operations per second.
* **Zero-Cost Strategy**:
  1. **Log Data TTL (Time-To-Live) Indexing**: `EmailLog` and `IngestionLog` collect detailed diagnostics on every poller run and file upload. If left unchecked, they will exhaust the 512 MB database limit within weeks. Add TTL indexes to automatic prune logs:
     ```javascript
     // models.js
     emailLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 }); // 7 Days
     ingestionLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }); // 30 Days
     ```
  2. **Processed Email Pruning**: Add a 90-day TTL index on `ProcessedEmail` (`processedAt: 1`) to ensure old email tracking entries do not consume database space.
  3. **Chunk Limit & Cleanups**: In `ragService.js`, delete old `ResumeChunk` items for a candidate when that candidate is deleted or updated (see RAG sync fixes below).

### C. Render Free Tier
* **Limits**:
  * **Backend Web Service**: Sleeps after 15 minutes of inactivity (causing 50+ second cold start latency). 512 MB RAM / 0.1 CPU quota. Ephemeral local disk space (files in `uploads/` are deleted when container sleeps or restarts).
  * **Static Frontend Site**: 100 GB bandwidth, build minute limits.
* **Zero-Cost Strategy**:
  1. **Uptime Keep-Awake Ping**: Set up a free external cron/monitoring service (like **UptimeRobot** or **Cron-job.org**) to ping a lightweight health endpoint (`/api/health`) every 14 minutes. This prevents the Render backend from sleeping, eliminating cold starts entirely.
  2. **Persistent CV Storage Fallback (Database-Backed)**: Because Render’s file system is ephemeral, uploaded PDF files in `uploads/` will disappear when the container restarts, leading to 404 errors when clicking "View CV". To solve this without paid S3 storage:
     * Add a `resumeBase64` or `resumeBinary` field to the Candidate database schema.
     * Save the base64 string of the PDF directly in MongoDB Atlas. Since a clean text PDF is only ~100-200 KB, the 512 MB database can hold 2,500+ resumes safely.
     * Serve the file directly from MongoDB when `/api/uploads/:filename` is requested.
     * *Alternative*: Setup a free-tier Cloudinary (25 GB free space) or Supabase Storage (500 MB free space) account to persist files.
  3. **Node.js Memory Limit Configuration**: Set the start command in `server/package.json` to configure V8's garbage collector to run aggressively within Render's 512 MB limit:
     ```json
     "start": "node --max-old-space-size=400 server.js"
     ```

---

## 3. Software-Level & System-Level Improvements

### A. RAG Vector Index Chunk Leakage (Database Sync Bug)
* **Problem**: In `server/ragService.js`, the `indexCandidate` function updates the in-memory vector index correctly by filtering out the candidate's old chunks. However, in MongoDB, it writes the new chunks via `ResumeChunk.bulkWrite` without deleting the old ones. If the new resume version has fewer chunks (e.g., fewer experience items), the extra old chunks are orphaned in MongoDB and loaded back into memory on server restart.
* **Fix**: Call `ResumeChunk.deleteMany({ candidateId: candidate.id })` at the beginning of `indexCandidate` to guarantee a clean slate before writing new chunks.

### B. Timeout Safeguards for Outbound HTTP Requests
* **Problem**: `server/outlookApi.js` and several connection checks in `server/server.js` use Node's native `fetch` directly without setting a timeout. If Microsoft Graph APIs or network paths are congested, these calls will block the single-threaded Node.js event loop, causing the entire API to freeze.
* **Fix**: Centralize the `fetchWithTimeout` helper function into a utility file (e.g., `server/utils.js`) and import/apply it to all external requests, setting a strict 10-second timeout for status/auth checks and 30-second timeout for Graph API data fetches.

### C. Error-Handling Resilience in Parallel Operations
* **Problem**: In `server/server.js` (manual upload route), `Promise.all` runs three AI calls (`scoreCandidateByOwnCategory`, `scoreCandidate`, and `generateTags`) in parallel. If any call fails (due to Gemini rate limits or timeouts), the error is caught silently, returns `null`, and saves the candidate profile with empty tags or `0` match scores. The user receives no warning about the failed analysis.
* **Fix**: If any scoring or tagging call fails, return a partial success state, save history logs indicating the failure, and flag the candidate in the UI with a "Re-analyze" badge. Introduce a UI notification and button to retry candidate evaluation.

### D. Centralizing Duplicate Check Logic
* **Problem**: The duplicate check query logic is copy-pasted in multiple places in `server.js` (e.g., email attachment parsing, manual uploads, duplicate resolution).
* **Fix**: Refactor this into a reusable helper function in `server/models.js` or `server/utils.js`:
  ```javascript
  export async function findDuplicateCandidate(email, name) {
    const queries = [];
    if (email) queries.push({ email: { $regex: new RegExp(`^${escapeRegex(email.trim())}$`, 'i') } });
    if (name) queries.push({ name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') } });
    return queries.length > 0 ? Candidate.findOne({ $or: queries }) : null;
  }
  ```

---

## 4. Risk Assessment of Suggested Improvements

| Suggested Improvement | Impact | Likelihood of Failure | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Log Data TTL Indexing** | High | Very Low | Run a one-off database migration check to ensure MongoDB creates the indices without locking the database during heavy usage. |
| **Keep-Awake Ping Setup** | High | Low | Create a dedicated `/api/health` endpoint that returns a tiny JSON object to prevent heavy load or log output during recurrent pings. |
| **Database-Backed CV Storage** | High | Medium (due to Atlas 512MB limit) | Compress PDFs on upload or use free-tier Cloudinary storage as a secondary option if candidate volume exceeds 2,500 profiles. |
| **Ollama Schema & Profile Compression** | High | Low | Verify that critical evaluation fields (such as `experience` and `skills`) are preserved, and write unit tests for the compression utilities. |
| **Sequential Sourcing Loop & Backoff Retry**| High | Low | Test queue behavior with batch email uploads to ensure emails aren't lost if processing is delayed. |
| **Unified Request Timeout Utility** | Medium| Low | Keep timeouts generous (30s) for data retrieval, but aggressive (10s) for health and token checks. |
| **RAG Sync (deleteMany on chunk update)** | High | Low | Wrap the deletion and bulkWrite operations in a MongoDB session transaction to avoid partial RAG states. |

---

## 5. Prioritized, Milestone-Based Roadmap

```
+-----------------------------------------------------------------------+
|  MILESTONE 1: Memory & Prompt Optimization for local Ollama          |
|  - Enable Flash Attention & configure physical CPU thread pinning.     |
|  - Integrate compressCandidateProfile in scoring pathways.            |
|  - Apply stripSchemaDescriptions to Ollama schemas.                   |
|  - Condense recruiter system instructions for local models.          |
+------------------------------------+----------------------------------+
                                     |
                                     v
+------------------------------------+----------------------------------+
|  MILESTONE 2: Storage Preservation & Zero-Cost Persistence            |
|  - Add 7-day TTL on EmailLog and 30-day TTL on IngestionLog.          |
|  - Add 90-day TTL on ProcessedEmail.                                  |
|  - Implement Database-Backed Base64 CV storage in MongoDB schema.      |
|  - Redirect static upload routes to serve PDFs from MongoDB.          |
+------------------------------------+----------------------------------+
                                     |
                                     v
+------------------------------------+----------------------------------+
|  MILESTONE 3: System Resilience & Timeout Safeguards                  |
|  - Centralize fetchWithTimeout to server/utils.js.                    |
|  - Apply timeouts to all Outlook Graph API & check-status calls.     |
|  - Add a lightweight /api/health endpoint.                            |
|  - Setup UptimeRobot keep-awake pings to prevent Render sleeping.     |
|  - Fix RAG chunk leakage by deleting old candidate chunks in MongoDB.|
+------------------------------------+----------------------------------+
                                     |
                                     v
+------------------------------------+----------------------------------+
|  MILESTONE 4: Rate-Limit Safeguards & Ingestion Queue                |
|  - Wrap Gemini API calls in exponential backoff retry handler.        |
|  - Refactor automated poller to process email attachments sequentially|
|    with a 5-second delay.                                             |
|  - Add UI visual status for candidate evaluation failures.           |
+-----------------------------------------------------------------------+
```

### Verification & Testing Plan
To verify the implementation of these milestones:
1. **Ollama Optimizations**: Benchmark resume parsing times with local Ollama before and after compression. Verify context size reduction in Ollama server logs.
2. **Database TTLs**: Insert test documents with a 60-second TTL index in MongoDB and verify automatic deletion.
3. **Keep-Awake & Storage**: Trigger a manual container restart in Render and verify that candidate resume PDFs can still be viewed in the UI. Ensure Render dashboard shows the web service active 24/7.
4. **Resilience & Rate-Limits**: Simulate 10 simultaneous resume uploads. Verify that the system executes them sequentially and handles rate limits (retrying 429 errors) without returning `0` scores or blank tags.
5. **RAG Index**: Run Vitest spec files:
   ```bash
   npm run test:e2e
   ```
   Ensure the existing E2E test suite passes perfectly.
