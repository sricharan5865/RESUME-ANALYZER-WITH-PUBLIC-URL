# Analysis and Implementation Plan: Caching, Database Clean, and Session Expiry

This report details the code investigation and provides a step-by-step implementation plan for introducing:
1. Hybrid AI Call Caching (In-Memory + MongoDB)
2. Admin-Only "Clear Database" Button
3. 24-Hour Login Session Expiry Popup

---

## 1. Hybrid AI Call Caching (In-Memory + MongoDB)

### Objectives
- Prevent duplicate/redundant LLM calls by hashing the inputs (prompt, system instruction, schema, pdf base64, and the current AI provider).
- Implement a two-tier hybrid cache:
  - **In-memory cache**: A fast in-memory `Map` (max 500 entries) residing in `geminiParser.js` and `emailCategorizer.js` with LRU-style eviction.
  - **Persistent database cache**: A MongoDB collection `AICache` with a 7-day TTL index to automatically purge old records.
- Provide a mechanism to bypass caching for testing or special flows.
- Expose an endpoint and settings UI to purge all caches.

### Proposed Code Modifications

#### A. `server/models.js`
- **File Path**: `server/models.js`
- **Details**: Define and export the `AICache` model at the bottom of the file with `cacheKey` (unique), `response` (Mixed), `type` (String), and `createdAt` (Date, expires after 7 days).
- **Proposed Diff**:
```javascript
// At the end of server/models.js, right before any exports (or alongside existing models):

const aiCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true },
  response: { type: mongoose.Schema.Types.Mixed, required: true },
  type: { type: String },
  createdAt: { type: Date, default: Date.now, expires: 604800 } // 7 days in seconds (7 * 24 * 60 * 60)
});

export const AICache = mongoose.model('AICache', aiCacheSchema);
```

#### B. `server/geminiParser.js`
- **File Path**: `server/geminiParser.js`
- **Details**:
  - Import `crypto` (Node.js built-in) and `AICache` from `./models.js`.
  - Implement a module-level `Map` for in-memory cache with size-limit logic (max 500 entries) and LRU eviction (refreshing accessed keys).
  - Add `generateCacheKey` helper.
  - Modify `callAIProvider` to accept `bypassCache = false` as an optional 5th parameter.
  - Add cache lookup (Memory first, then Mongo) and cache store (Memory + Mongo).
  - Export `clearAICaches()` to clear the memory map.
- **Proposed Diff**:
```javascript
// Import additions at the top:
import crypto from 'crypto';
import { Settings, AICache } from './models.js'; // Replace import { Settings } with this

// Module-level in-memory cache definition:
const aiCallCache = new Map();
const CACHE_MAX_SIZE = 500;

function getFromMemoryCache(key) {
  if (aiCallCache.has(key)) {
    const cached = aiCallCache.get(key);
    aiCallCache.delete(key);
    aiCallCache.set(key, cached);
    return cached;
  }
  return null;
}

function setInMemoryCache(key, value) {
  if (aiCallCache.has(key)) {
    aiCallCache.delete(key);
  } else if (aiCallCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = aiCallCache.keys().next().value;
    aiCallCache.delete(oldestKey);
  }
  aiCallCache.set(key, value);
}

function generateCacheKey(prompt, systemInstruction = '', schema = null, pdfBase64 = null, aiProvider = 'gemini') {
  const schemaStr = schema ? JSON.stringify(schema) : '';
  const pdfStr = pdfBase64 || '';
  const combined = prompt + systemInstruction + schemaStr + pdfStr + aiProvider;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

export function clearAICaches() {
  aiCallCache.clear();
  console.log('[AI Cache] In-Memory parser cache cleared');
}

// Modify callAIProvider to wrap the existing logic:
async function callAIProvider(prompt, systemInstruction = '', schema = null, pdfBase64 = null, bypassCache = false) {
  let settings = null;
  try {
    settings = await Settings.findById('global');
  } catch (e) {
    console.error('Failed to retrieve settings from DB, using fallback env variables:', e.message);
  }

  const aiProvider = settings?.aiProvider || 'gemini';
  const cacheKey = generateCacheKey(prompt, systemInstruction, schema, pdfBase64, aiProvider);

  if (!bypassCache) {
    // 1. Check in-memory cache
    const memCached = getFromMemoryCache(cacheKey);
    if (memCached) {
      console.log(`[AI Cache] In-Memory hit for provider ${aiProvider}`);
      return memCached;
    }

    // 2. Check MongoDB cache
    try {
      const dbCached = await AICache.findOne({ cacheKey });
      if (dbCached) {
        console.log(`[AI Cache] MongoDB hit for provider ${aiProvider}`);
        setInMemoryCache(cacheKey, dbCached.response);
        return dbCached.response;
      }
    } catch (e) {
      console.error('[AI Cache] Error reading from MongoDB cache:', e.message);
    }
  }

  // Wrap the existing AI provider API calls in an immediately-invoked function
  const result = await (async () => {
    // === EXISTING AI PROVIDER CALL LOGIC (START) ===
    if (aiProvider === 'gemini') {
      // ... existing code for gemini ...
    } else if (aiProvider === 'openai') {
      // ... existing code for openai ...
    } else if (aiProvider === 'claude') {
      // ... existing code for claude ...
    } else if (aiProvider === 'ollama') {
      // ... existing code for ollama ...
    } else {
      throw new Error(`Unsupported AI Provider: ${aiProvider}`);
    }
    // === EXISTING AI PROVIDER CALL LOGIC (END) ===
  })();

  if (!bypassCache) {
    // Store in both memory and DB cache
    setInMemoryCache(cacheKey, result);
    try {
      await AICache.findOneAndUpdate(
        { cacheKey },
        { cacheKey, response: result, type: 'parser', createdAt: new Date() },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.error('[AI Cache] Error saving to MongoDB cache:', e.message);
    }
  }

  return result;
}

// Modify the export list at the bottom:
export { callAIProvider, clearAICaches };
```

#### C. `server/emailCategorizer.js`
- **File Path**: `server/emailCategorizer.js`
- **Details**: Apply the same caching wrapper to `callAIProviderForClassification` using a separate in-memory `Map`. Export `clearClassificationCache()` to clear this memory map.
- **Proposed Diff**:
```javascript
// Import additions:
import crypto from 'crypto';
import { Settings, AICache } from './models.js'; // Replace import { Settings }

// Module-level in-memory cache definition:
const classificationCache = new Map();
const CACHE_MAX_SIZE = 500;

function getFromMemoryCache(key) {
  if (classificationCache.has(key)) {
    const cached = classificationCache.get(key);
    classificationCache.delete(key);
    classificationCache.set(key, cached);
    return cached;
  }
  return null;
}

function setInMemoryCache(key, value) {
  if (classificationCache.has(key)) {
    classificationCache.delete(key);
  } else if (classificationCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = classificationCache.keys().next().value;
    classificationCache.delete(oldestKey);
  }
  classificationCache.set(key, value);
}

function generateCacheKey(prompt, systemInstruction = '', aiProvider = 'gemini') {
  const combined = prompt + systemInstruction + aiProvider;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

export function clearClassificationCache() {
  classificationCache.clear();
  console.log('[Classification Cache] In-Memory classification cache cleared');
}

// Modify callAIProviderForClassification to wrap the existing logic:
async function callAIProviderForClassification(prompt, systemInstruction, bypassCache = false) {
  let settings = null;
  try {
    settings = await Settings.findById('global');
  } catch (e) {
    console.error('Failed to retrieve settings from DB for email categorization:', e.message);
  }

  const aiProvider = settings?.aiProvider || 'gemini';
  const cacheKey = generateCacheKey(prompt, systemInstruction, aiProvider);

  if (!bypassCache) {
    // 1. Check in-memory cache
    const memCached = getFromMemoryCache(cacheKey);
    if (memCached) {
      console.log(`[Classification Cache] In-Memory hit for provider ${aiProvider}`);
      return memCached;
    }

    // 2. Check MongoDB cache
    try {
      const dbCached = await AICache.findOne({ cacheKey });
      if (dbCached) {
        console.log(`[Classification Cache] MongoDB hit for provider ${aiProvider}`);
        setInMemoryCache(cacheKey, dbCached.response);
        return dbCached.response;
      }
    } catch (e) {
      console.error('[Classification Cache] Error reading from cache:', e.message);
    }
  }

  // Wrap the existing classification provider API calls:
  const result = await (async () => {
    // === EXISTING CLASSIFICATION CALL LOGIC (START) ===
    if (aiProvider === 'gemini') {
      // ... existing code ...
    } else if (aiProvider === 'openai') {
      // ... existing code ...
    } else if (aiProvider === 'claude') {
      // ... existing code ...
    } else if (aiProvider === 'ollama') {
      // ... existing code ...
    } else {
      throw new Error(`Unsupported AI Provider: ${aiProvider}`);
    }
    // === EXISTING CLASSIFICATION CALL LOGIC (END) ===
  })();

  if (!bypassCache) {
    setInMemoryCache(cacheKey, result);
    try {
      await AICache.findOneAndUpdate(
        { cacheKey },
        { cacheKey, response: result, type: 'categorizer', createdAt: new Date() },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.error('[Classification Cache] Error saving to cache:', e.message);
    }
  }

  return result;
}

// Make sure clearClassificationCache is exported:
export { categorizeEmail, clearClassificationCache };
```

#### D. `server/server.js`
- **File Path**: `server/server.js`
- **Details**:
  - Import `AICache` from `models.js`.
  - Import `clearAICaches` from `./geminiParser.js` and `clearClassificationCache` from `./emailCategorizer.js`.
  - Add route `POST /api/settings/clear-cache` protected by `authenticateToken`.
- **Proposed Diff**:
```javascript
// Import updates:
import { Candidate, Job, Settings, ProcessedEmail, IngestionLog, User, AICache } from './models.js'; // Added AICache
import { parseResume, scoreCandidate, scoreCandidateByOwnCategory, generateTags, generateJobDescription, generateQuestionsForCandidate, clearAICaches } from './geminiParser.js'; // Added clearAICaches
import { categorizeEmail, clearClassificationCache } from './emailCategorizer.js'; // Added clearClassificationCache

// Add cache clear route:
app.post('/api/settings/clear-cache', authenticateToken, async (req, res) => {
  try {
    clearAICaches();
    clearClassificationCache();
    await AICache.deleteMany({});
    res.json({ success: true, message: 'AI call cache cleared successfully.' });
  } catch (error) {
    console.error('Failed to clear AI cache:', error);
    res.status(500).json({ error: error.message });
  }
});
```

#### E. `client/src/components/Settings.jsx` (Cache Clearing Tab)
- **File Path**: `client/src/components/Settings.jsx`
- **Details**:
  - Add a new sidebar button for `'ai'` to set `activeSubTab` to `'ai'`.
  - Render a section for clearing the AI cache when `activeSubTab === 'ai'`.
  - Define `handleClearAiCache` to fetch `POST /api/settings/clear-cache`.
- **Proposed Diff**:
```javascript
// 1. In imports, add Cpu or use Sparkles / Tag / Info for the icon:
import { Shield, Briefcase, Mail, Plus, Trash2, Info, AlertTriangle, Tag, Cpu } from 'lucide-react';

// 2. In sidebar render list (around line 496):
        <button 
          className="btn" 
          style={{ 
            justifyContent: 'flex-start', 
            background: activeSubTab === 'ai' ? 'var(--accent-gradient)' : 'transparent',
            color: activeSubTab === 'ai' ? 'white' : 'var(--text-secondary)'
          }}
          onClick={() => setActiveSubTab('ai')}
        >
          <Cpu size={16} /> AI Optimization
        </button>

// 3. Inside the Settings Display container (around line 1256):
        {activeSubTab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>AI Caching & Performance</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Manage caching to optimize parsing speed and reduce third-party API token costs.
              </p>
            </div>

            <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>AI Call Cache</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Clears both in-memory speed caches and database caches. Active caches will be completely rebuilt on subsequent candidate processing or categorizing tasks.
              </p>
              <div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(`${backendUrl}/api/settings/clear-cache`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      if (res.ok) {
                        alert('AI call cache cleared successfully!');
                      } else {
                        const data = await res.json();
                        alert('Failed to clear cache: ' + (data.error || 'Unknown error'));
                      }
                    } catch (e) {
                      alert('Error clearing cache: ' + e.message);
                    }
                  }}
                  className="btn btn-primary"
                  style={{ background: 'var(--accent-gradient)', color: 'white', border: 'none', padding: '10px 20px' }}
                >
                  Clear AI Cache
                </button>
              </div>
            </div>
          </div>
        )}
```

---

## 2. Admin-Only "Clear Database" Button

### Objectives
- Provide a button at the bottom of the Settings view to completely wipe candidate and job data, while leaving user records and global configuration settings intact.
- Enforce that this button is strictly visible to users with role `'Admin'`.
- Prompt the user with a confirmation dialog requiring them to type `"CLEAR"` before the deletion request is submitted.

### Proposed Code Modifications

#### A. `server/server.js`
- **File Path**: `server/server.js`
- **Details**:
  - Import `ResumeChunk` from `models.js` if it isn't already (along with `AICache`).
  - Add the route `POST /api/admin/clear-database` protected by both token authentication and admin-only role check.
  - Delete all records in: `Candidate`, `Job`, `ProcessedEmail`, `IngestionLog`, `EmailLog`, `ResumeChunk`, and `AICache`.
  - Re-run/reload the in-memory search index (`searchIndex.buildIndex([])`) and RAG vector index (`loadVectorIndex()`) so their memory representations reflect the cleared state.
- **Proposed Diff**:
```javascript
// Import addition:
import { Candidate, Job, Settings, ProcessedEmail, IngestionLog, User, ResumeChunk, AICache } from './models.js'; // Ensure ResumeChunk is imported

// Clear Database Route:
app.post('/api/admin/clear-database', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const candidateDel = await Candidate.deleteMany({});
    const jobDel = await Job.deleteMany({});
    const emailDel = await ProcessedEmail.deleteMany({});
    const ingestDel = await IngestionLog.deleteMany({});
    const logDel = await EmailLog.deleteMany({});
    const chunkDel = await ResumeChunk.deleteMany({});
    const cacheDel = await AICache.deleteMany({});

    // Reset local/in-memory indexes
    searchIndex.buildIndex([]);
    try {
      await loadVectorIndex();
    } catch (e) {
      console.error('Failed to reload RAG vector index after DB clear:', e);
    }

    // Flush in-memory AI caches
    clearAICaches();
    clearClassificationCache();

    res.json({
      success: true,
      message: 'Database cleared successfully.',
      deletedCounts: {
        Candidate: candidateDel.deletedCount || 0,
        Job: jobDel.deletedCount || 0,
        ProcessedEmail: emailDel.deletedCount || 0,
        IngestionLog: ingestDel.deletedCount || 0,
        EmailLog: logDel.deletedCount || 0,
        ResumeChunk: chunkDel.deletedCount || 0,
        AICache: cacheDel.deletedCount || 0
      }
    });
  } catch (error) {
    console.error('Failed to clear database:', error);
    res.status(500).json({ error: error.message });
  }
});
```

#### B. `client/src/components/Settings.jsx`
- **File Path**: `client/src/components/Settings.jsx`
- **Details**:
  - Add state hooks for confirmation text and modal visibility.
  - Implement a Modal inside Settings view for confirmation and typing confirmation.
  - Add a styled Danger Zone section at the bottom of the Settings view, rendered if `currentRole === 'Admin'`.
- **Proposed Diff**:
```javascript
// 1. Near top state definitions:
  const [showClearDbModal, setShowClearDbModal] = useState(false);
  const [clearConfirmationText, setClearConfirmationText] = useState('');
  const [clearingDb, setClearingDb] = useState(false);

// 2. Add danger zone rendering at the bottom of the Settings view (after the main display tabs):
// Inside `return ( ... )` at the bottom of the Main Settings Display (before closing the main grid/flex div):
        {currentRole === 'Admin' && (
          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(244, 63, 94, 0.2)' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--status-rejected)', marginBottom: '8px' }}>Danger Zone</h4>
            <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Clear Entire Database</h5>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Wipe all candidate listings, job listings, email history logs, and file chunks. User credentials and settings are preserved.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowClearDbModal(true)} 
                className="btn" 
                style={{ background: 'var(--status-rejected)', color: 'white', border: 'none', padding: '8px 16px', fontWeight: '600' }}
              >
                Clear Database
              </button>
            </div>
          </div>
        )}

// 3. Render Modal conditionally at the end of JSX wrapper:
      {showClearDbModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="glass" style={{
            padding: '32px', borderRadius: 'var(--radius-lg)', width: '450px',
            display: 'flex', flexDirection: 'column', gap: '20px',
            border: '1px solid rgba(244, 63, 94, 0.3)', background: 'var(--bg-secondary)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Clear Entire Database</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Are you absolutely sure? This action will permanently delete all Candidates, Jobs, Processed Emails, Ingestion Logs, Email Logs, Resume Chunks, and AI Caches. This cannot be undone.
            </p>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="form-label" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                Please type <strong style={{ color: 'var(--status-rejected)' }}>CLEAR</strong> to confirm:
              </label>
              <input
                type="text"
                className="form-input"
                value={clearConfirmationText}
                onChange={(e) => setClearConfirmationText(e.target.value)}
                placeholder="Type CLEAR"
                style={{
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  background: 'var(--bg-tertiary)'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setShowClearDbModal(false);
                  setClearConfirmationText('');
                }}
                style={{ background: 'transparent', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                disabled={clearConfirmationText !== 'CLEAR' || clearingDb}
                onClick={async () => {
                  if (clearConfirmationText !== 'CLEAR') return;
                  setClearingDb(true);
                  try {
                    const res = await fetch(`${backendUrl}/api/admin/clear-database`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    });
                    if (res.ok) {
                      alert('Database cleared successfully!');
                      setShowClearDbModal(false);
                      setClearConfirmationText('');
                      if (typeof onSettingsSaved === 'function') {
                        onSettingsSaved(); // Refresh the app state
                      }
                    } else {
                      const data = await res.json();
                      alert('Failed to clear database: ' + (data.error || 'Unknown error'));
                    }
                  } catch (e) {
                    alert('Error clearing database: ' + e.message);
                  } finally {
                    setClearingDb(false);
                  }
                }}
                style={{
                  background: clearConfirmationText === 'CLEAR' ? 'var(--status-rejected)' : 'rgba(244, 63, 94, 0.2)',
                  color: 'white',
                  cursor: clearConfirmationText === 'CLEAR' ? 'pointer' : 'not-allowed',
                  opacity: clearConfirmationText === 'CLEAR' ? 1 : 0.6
                }}
              >
                {clearingDb ? 'Clearing...' : 'Clear Database'}
              </button>
            </div>
          </div>
        </div>
      )}
```

---

## 3. 24-Hour Login Session Expiry Popup

### Objectives
- Detect when a user's session is older than 24 hours and notify them.
- Alert the user to log out and log back in to renew their session.

### Proposed Code Modifications

#### A. `client/src/App.jsx`
- **File Path**: `client/src/App.jsx`
- **Details**:
  - Save `loginTime` to `localStorage` when user logs in successfully.
  - Monitor/read `loginTime` on mount/load and trigger alert if expired (greater than 24 hours).
  - Clear `loginTime` from `localStorage` on logout.
- **Proposed Diff**:
```javascript
// 1. On Login: Add loginTime save around line 321
    return <Login backendUrl={BACKEND_URL} onLoginSuccess={(newToken, loggedInUser) => {
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      localStorage.setItem('loginTime', Date.now().toString()); // Add this line
      setToken(newToken);
      setUser(loggedInUser);
      showToast(`Welcome back, ${loggedInUser.email}!`, 'success');
    }} />;

// 2. On Load: Add useEffect for check after existing theme/auth effects (around line 103)
  useEffect(() => {
    if (token) {
      const loginTime = localStorage.getItem('loginTime');
      if (loginTime) {
        const timeElapsed = Date.now() - parseInt(loginTime, 10);
        if (timeElapsed > 24 * 60 * 60 * 1000) {
          alert("Please logout and log in to access ");
        }
      }
    }
  }, [token]);

// 3. On Logout: Add loginTime removal around line 123 (fetchData token invalidation) and line 628 (User Click Logout)
// In fetchData token invalidation:
      if (authRes.status === 401 || authRes.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime'); // Add this line
        setToken(null);
        setUser(null);
        setActiveTab('dashboard');
        return;
      }

// In user click logout button:
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  localStorage.removeItem('loginTime'); // Add this line
                  setToken(null);
                  setUser(null);
                  setActiveTab('dashboard');
                  showToast('Logged out successfully', 'success');
                }}
```

---

## 4. Verification Methods

1. **Verify Caching**:
   - Perform a resume upload and check terminal logs for cache insertion: `[AI Cache] MongoDB hit/saved` messages.
   - Upload the exact same resume and verify the console log displays `[AI Cache] In-Memory hit for provider gemini` or `[AI Cache] MongoDB hit for provider gemini`.
   - Go to `Settings -> AI Optimization` and click "Clear AI Cache". Try uploading the resume again, and confirm it runs a fresh analysis (i.e. cache miss).
2. **Verify Database Clear**:
   - Log in as Recruiter/Manager role and confirm "Danger Zone" card is not rendered.
   - Log in as Admin role and confirm "Danger Zone" is rendered.
   - Click "Clear Database". Try typing "INVALID" and verify the delete button remains disabled.
   - Type "CLEAR", confirm, and verify the candidates and jobs lists are empty, but settings are preserved and you remain logged in.
3. **Verify Session Expiry**:
   - Log in, open developer tools, and set the value of `loginTime` in localStorage to `Date.now() - 25 * 60 * 60 * 1000` (representing 25 hours ago).
   - Refresh the page and confirm the alert pop-up `"Please logout and log in to access "` is shown.
