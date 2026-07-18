## 2026-07-14T22:48:00Z
Please read c:\Users\sri charan\Documents\projects\hr recruter\.agents\explorer_m1_3\analysis.md and implement the three requested features.

Ensure you adhere to the following specific details:

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

1. Hybrid AI Call Caching:
   - server/models.js: Add AICache model at the end of the file. Schema fields:
     cacheKey (String, unique), response (Mixed, required), type (String), createdAt (Date, default Date.now, expires: 7*24*60*60).
     Export AICache alongside other models.
   - server/geminiParser.js:
     - Import crypto and AICache from `./models.js`.
     - Define a module-level Map 'parserCacheMap' (max 500 entries, FIFO eviction).
     - Add helper function `generateCacheKey(prompt, systemInstruction = '', schema = null, pdfBase64 = null, aiProvider)` that computes SHA-256 hash of `prompt + systemInstruction + JSON.stringify(schema) + (pdfBase64 || '') + aiProvider`.
     - Modify `callAIProvider` to wrap it with L1 (memory) and L2 (MongoDB) caching. Store parsed response with `type: 'parser'`. Add optional `bypassCache` (default false).
     - Export function `clearAICaches()` that clears `parserCacheMap`.
   - server/emailCategorizer.js:
     - Import crypto and AICache.
     - Define a module-level Map 'classificationCacheMap' (max 500 entries).
     - Implement `generateCacheKey` helper identically.
     - Wrap `callAIProviderForClassification` with L1 and L2 caching (store response with `type: 'classification'`). Add optional `bypassCache` (default false).
     - Export function `clearClassificationCache()` that clears `classificationCacheMap`.
   - server/server.js:
     - Import clearAICaches, clearClassificationCache, and AICache.
     - Add `POST /api/settings/clear-cache` route protected by `authenticateToken`. It should clear memory caches and delete all documents in AICache.
   - client/src/components/Settings.jsx:
     - Import Cpu from lucide-react.
     - Add sidebar button for 'ai' sub-tab that sets activeSubTab to 'ai'.
     - Render card/section when activeSubTab === 'ai' containing a "Clear AI Cache" button.
     - On click, call POST /api/settings/clear-cache and show success/error feedback.

2. Admin-Only "Clear Database" button:
   - server/ragService.js: Export function `clearVectorIndex()` which clears in-memory RAG index: `vectorIndex = [];` etc.
   - server/server.js:
     - Import clearVectorIndex.
     - Add `POST /api/admin/clear-database` endpoint protected by authenticateToken and requireRole(['admin']).
     - It must delete all documents from Candidate, Job, ProcessedEmail, IngestionLog, EmailLog, ResumeChunk, and AICache.
     - It must call clearVectorIndex(), clearAICaches(), clearClassificationCache(), reset search index (searchIndex.buildIndex([])), and delete all files in server/uploads except system files (e.g., .gitignore). Return JSON summary of counts.
   - client/src/components/Settings.jsx:
     - Render a "Danger Zone" card at the bottom of settings view (only when currentRole === 'Admin').
     - Add a "Clear Entire Database" button.
     - Clicking it opens a confirmation modal where the user must type "CLEAR" into a text input. The delete button in the modal should remain disabled until "CLEAR" is typed.
     - On successful deletion, call onSettingsSaved() to refresh parent and show a success alert/message.

3. 24-Hour Login Session Expiry Popup:
   - client/src/App.jsx:
     - On Login: set localStorage 'loginTime' to Date.now().toString() immediately after setting token.
     - On Logout (both places): remove localStorage 'loginTime'.
     - On Load (useEffect near auth effects): if token exists, read loginTime. If Date.now() - parseInt(loginTime, 10) > 24 * 60 * 60 * 1000, show an alert or styled modal with the exact message: "Please logout and log in to access " (note the trailing space).

After implementing, run server and client build/dev environments and run E2E test suite (npm run test:e2e) from server directory to verify correctness. Verify that no regressions are introduced. Write a detailed handoff.md in your working directory c:\Users\sri charan\Documents\projects\hr recruter\.agents\worker_features.
