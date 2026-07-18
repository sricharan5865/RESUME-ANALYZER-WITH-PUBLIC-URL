# explorer_m1_3 Handoff Report

## 1. Observation
The following source code and settings configurations were observed in the codebase:
- **`server/models.js`**: Contains definitions of candidate, job, settings, and other collections. Line 98 defines `settingsSchema` which contains settings for providers. Line 182 defines the RbacUser model: `export const User = mongoose.model('RbacUser', userSchema, 'rbac_users');`.
- **`server/geminiParser.js`**: Contains the direct AI invocation logic. Lines 475 to 849 implement `callAIProvider`, which is used to call the selected AI model and returns parsed JSON (if a schema is provided) or clean text.
- **`server/emailCategorizer.js`**: Lines 298 to 481 implement `callAIProviderForClassification`, which classifies incoming emails.
- **`server/server.js`**: Defines the express server, routing endpoints, database connections, and initialization logic.
  - Line 2001: `app.get('/api/settings', authenticateToken, requireRole(['admin']), async (req, res) => { ... }` fetches global configurations.
  - Line 2018: `app.post('/api/settings', authenticateToken, requireRole(['admin']), async (req, res) => { ... }` updates global configurations with an allowed keys array.
  - Line 233: Wipes and migrates parts of the database on boot, builds initial indices, and invokes RAG indexing.
- **`client/src/components/Settings.jsx`**: Implement configuration screens. Line 4 defines the `SettingsView` component with tabs, and line 302 defines `handleSaveSourcingAndAISettings` which submits form data to `/api/settings`.
- **`client/src/App.jsx`**: Coordinates the React application. Handles manual logout at line 625 and checks token responses for auth errors (redirecting to `<Login />` if a 401 or 403 status is returned).

---

## 2. Logic Chain
Based on the observations:
1. **Hybrid AI Caching**:
   - Because `callAIProvider` in `geminiParser.js` and `callAIProviderForClassification` in `emailCategorizer.js` retrieve settings from the database, they can check if a custom cache-key exists in MongoDB or a local Node.js Map before querying external LLM providers.
   - Using a SHA-256 hash of the provider, model, prompt, system instructions, schema, and base64 file hash prevents storing massive, duplicate strings as indexing keys.
   - This in-memory + database approach ensures that both transient restarts (which clear L1 RAM) and active requests (which hit L1 RAM) are optimized.
2. **Admin-only 'Clear Database'**:
   - Because admins need to reset test environments cleanly, we must delete all candidates, job titles, processed email tracking states, logs, and RAG vector chunks.
   - We must un-hydrate `vectorIndex` inside `server/ragService.js` and rebuild the search index `searchIndex` using empty candidate arrays.
   - Deleting candidate files in `server/uploads` avoids orphaned artifacts filling up server disk space.
   - We must exclude users (`rbac_users` collection) and core system `Settings` from deletion to preserve access and environment tokens.
3. **24-Hour Session Expiry Warning**:
   - Because the backend issues JWT tokens with an absolute `expiresIn: '24h'` duration, the client can store a `loginTime` timestamp upon authentication.
   - Periodically checking the difference between `Date.now()` and `loginTime` using absolute system time makes the expiration check resilient against machine sleep/hibernation.
   - Implementing a sub-timer when there is less than 5 minutes remaining provides smooth visual feedback (countdown) to warn users to save active work.

---

## 3. Caveats
- **Local Storage Tampering**: If a user manually alters or deletes the `loginTime` value in their browser's local storage, the frontend expiry warnings could trigger prematurely or be bypassed. However, the backend's 24h JWT expiration check remains a hard wall, returning a 401/403 code on the next API call to protect the system.
- **Concurrency**: Clearing the database during concurrent operations (e.g. while an email poll is parsing an active attachment) might cause a transient database write error, but normal operations will recover immediately once cleared.

---

## 4. Conclusion
The codebase is structurally prepared to receive these updates. All proposed changes have been detailed in `analysis.md` with explicit code modifications, styling alignment, and verification procedures. The implementation is ready to be transferred to the Implementer agent.

---

## 5. Verification Method
To verify that these plans are correct:
1. Review the proposed code modifications in `analysis.md` and check that they align with the line numbers and signatures of `server/models.js`, `server/geminiParser.js`, `server/emailCategorizer.js`, `server/server.js`, `client/src/components/Settings.jsx`, and `client/src/App.jsx`.
2. Inspect the test script command `npm test` or specific integration suites to verify no breaking imports are introduced.
3. Follow the detailed verification walkthroughs in Section 4 of `analysis.md` to run runtime checks on the cache, danger zone confirmation, and countdown timers.
