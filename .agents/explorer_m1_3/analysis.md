# Technical Analysis and Implementation Plan

This report outlines the analysis of the TalentFlow codebase and provides a detailed implementation plan for three new features:
1. **Hybrid AI Call Caching (In-Memory + MongoDB)** to optimize AI model usage and reduce API cost/latency.
2. **Admin-only 'Clear Database'** mechanism to wipe candidates, jobs, logs, vector chunks, memory indices, and files while keeping settings and user accounts intact.
3. **24-Hour Login Session Expiry Popup** in the frontend to gracefully handle JWT expirations and warn users before they are logged out.

---

## 1. Hybrid AI Call Caching (In-Memory + MongoDB)

### Overview
To avoid repeating redundant queries to Gemini, OpenAI, Claude, or Ollama, we will implement a two-tiered cache:
- **L1 Cache (In-Memory)**: Fast JavaScript `Map` inside the Node.js server process.
- **L2 Cache (MongoDB)**: Persistent `AICache` collection that survives server restarts.

### 1.1 Schema Modification (`server/models.js`)
We will add `aiCacheEnabled` to the singleton Settings schema and define the new `AICache` model.

**Proposed Changes in `server/models.js`:**
```javascript
// Add to settingsSchema (line 98)
const settingsSchema = new mongoose.Schema({
  // ... existing fields ...
  rankAccordingToJob: { type: Boolean, default: true },
  aiCacheEnabled: { type: Boolean, default: true } // NEW field to toggle cache
});

// Add new cache Schema (near line 164)
const aiCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true }, // SHA-256 hash of query params
  provider: { type: String, required: true },
  model: { type: String },
  prompt: { type: String }, // Partial/debug prompt
  systemInstruction: { type: String },
  response: { type: mongoose.Schema.Types.Mixed, required: true }, // The final string or parsed object
  createdAt: { type: Date, default: Date.now }
});

aiCacheSchema.index({ cacheKey: 1 });

// Export the model (near line 174)
export const AICache = mongoose.model('AICache', aiCacheSchema);
```

### 1.2 Dedicated Cache Utility (`server/aiCache.js`)
Create a new file `server/aiCache.js` to manage the cache state, compute unique keys, and handle L1/L2 hits/misses.

**Proposed Content for `server/aiCache.js`:**
```javascript
import crypto from 'crypto';
import { AICache, Settings } from './models.js';

// L1 In-Memory Cache
const inMemoryCache = new Map();

/**
 * Calculates a unique SHA-256 hash for AI query parameters.
 */
export function calculateCacheKey(provider, model, prompt, systemInstruction = '', schema = null, pdfBase64 = null) {
  const payload = {
    provider,
    model,
    prompt,
    systemInstruction,
    schema,
    pdfHash: pdfBase64 ? crypto.createHash('md5').update(pdfBase64).digest('hex') : null
  };
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

/**
 * Checks if caching is globally enabled.
 */
async function isCacheEnabled() {
  try {
    const settings = await Settings.findById('global');
    return settings?.aiCacheEnabled !== false;
  } catch (error) {
    console.error('[Cache] Error loading settings, defaulting to true:', error.message);
    return true;
  }
}

/**
 * Hybrid cache resolver (L1 Map -> L2 MongoDB -> Miss)
 */
export async function getCachedResponse(provider, model, prompt, systemInstruction = '', schema = null, pdfBase64 = null) {
  if (!(await isCacheEnabled())) return null;

  const cacheKey = calculateCacheKey(provider, model, prompt, systemInstruction, schema, pdfBase64);

  // 1. L1 Hit
  if (inMemoryCache.has(cacheKey)) {
    console.log(`[Cache Hit - L1 Memory] Key: ${cacheKey}`);
    return inMemoryCache.get(cacheKey);
  }

  // 2. L2 Hit
  try {
    const cachedDoc = await AICache.findOne({ cacheKey });
    if (cachedDoc) {
      console.log(`[Cache Hit - L2 MongoDB] Key: ${cacheKey}`);
      inMemoryCache.set(cacheKey, cachedDoc.response);
      return cachedDoc.response;
    }
  } catch (err) {
    console.error('[Cache] MongoDB lookup failed:', err.message);
  }

  return null;
}

/**
 * Populates L1 and L2 caches with new response.
 */
export async function setCachedResponse(provider, model, prompt, systemInstruction = '', schema = null, pdfBase64 = null, response) {
  if (!(await isCacheEnabled())) return;

  const cacheKey = calculateCacheKey(provider, model, prompt, systemInstruction, schema, pdfBase64);

  // L1 Save
  inMemoryCache.set(cacheKey, response);

  // L2 Save
  try {
    await AICache.findOneAndUpdate(
      { cacheKey },
      {
        provider,
        model,
        prompt: typeof prompt === 'string' ? prompt.substring(0, 1000) : '',
        systemInstruction,
        response,
        createdAt: new Date()
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('[Cache] MongoDB save failed:', err.message);
  }
}

export async function clearCache() {
  inMemoryCache.clear();
  await AICache.deleteMany({});
  console.log('[Cache] Memory and MongoDB caches successfully cleared.');
}

export async function getCacheStats() {
  try {
    const mongoCount = await AICache.countDocuments();
    return {
      memoryCount: inMemoryCache.size,
      mongoCount
    };
  } catch (err) {
    return { memoryCount: inMemoryCache.size, mongoCount: 0, error: err.message };
  }
}
```

### 1.3 Integration in `server/geminiParser.js`
We will import our cache utility and wrap the `callAIProvider` logic.

**Proposed Changes in `server/geminiParser.js`:**
```javascript
// Import at top of file
import { getCachedResponse, setCachedResponse } from './aiCache.js';

// Rename the original callAIProvider to _callAIProviderDirect
async function _callAIProviderDirect(prompt, systemInstruction = '', schema = null, pdfBase64 = null) {
  // ... Keep the entire existing content of callAIProvider here ...
}

// Define the wrapper callAIProvider that implements caching
export async function callAIProvider(prompt, systemInstruction = '', schema = null, pdfBase64 = null) {
  let settings = null;
  try {
    settings = await Settings.findById('global');
  } catch (e) {
    console.error('Failed to retrieve settings from DB, using fallback env variables:', e.message);
  }

  const aiProvider = settings?.aiProvider || 'gemini';
  
  // Resolve model name for unique caching
  let modelName = '';
  if (aiProvider === 'gemini') {
    const apiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY;
    const isOpenRouter = apiKey?.startsWith('sk-or-');
    modelName = isOpenRouter ? (process.env.AI_MODEL || 'x-ai/grok-4.5') : 'gemini-2.0-flash';
  } else if (aiProvider === 'openai') {
    const apiKey = settings?.openaiApiKey || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    const isOpenRouter = apiKey?.startsWith('sk-or-');
    modelName = isOpenRouter ? 'openai/gpt-4o' : 'gpt-4o';
  } else if (aiProvider === 'claude') {
    const apiKey = settings?.claudeApiKey || process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    const isOpenRouter = apiKey?.startsWith('sk-or-');
    modelName = isOpenRouter ? 'anthropic/claude-3.5-sonnet' : 'claude-3-5-sonnet-20241022';
  } else if (aiProvider === 'ollama') {
    modelName = settings?.ollamaModel || 'llama3';
  }

  // Cache Lookup
  const cachedResponse = await getCachedResponse(aiProvider, modelName, prompt, systemInstruction, schema, pdfBase64);
  if (cachedResponse !== null) {
    return cachedResponse;
  }

  // Call the Direct Provider
  const response = await _callAIProviderDirect(prompt, systemInstruction, schema, pdfBase64);

  // Populate Cache
  await setCachedResponse(aiProvider, modelName, prompt, systemInstruction, schema, pdfBase64, response);

  return response;
}
```

### 1.4 Integration in `server/emailCategorizer.js`
We will similarly wrap the classification call.

**Proposed Changes in `server/emailCategorizer.js`:**
```javascript
// Import at top of file
import { getCachedResponse, setCachedResponse } from './aiCache.js';

// Rename the original callAIProviderForClassification
async function _callAIProviderForClassificationDirect(prompt, systemInstruction) {
  // ... Keep the entire existing content of callAIProviderForClassification here ...
}

// Define the wrapper callAIProviderForClassification that implements caching
async function callAIProviderForClassification(prompt, systemInstruction) {
  let settings = null;
  try {
    settings = await Settings.findById('global');
  } catch (e) {
    console.error('Failed to retrieve settings from DB for email categorization:', e.message);
  }

  const aiProvider = settings?.aiProvider || 'gemini';
  
  let modelName = '';
  if (aiProvider === 'gemini') {
    const apiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY;
    const isOpenRouter = apiKey?.startsWith('sk-or-');
    modelName = isOpenRouter ? (process.env.AI_MODEL || 'x-ai/grok-4.5') : 'gemini-2.0-flash';
  } else if (aiProvider === 'openai') {
    modelName = 'gpt-4o';
  } else if (aiProvider === 'claude') {
    modelName = 'claude-3-5-sonnet-20241022';
  } else if (aiProvider === 'ollama') {
    modelName = settings?.ollamaModel || 'llama3';
  }

  // Cache Lookup
  const cachedResponse = await getCachedResponse(aiProvider, modelName, prompt, systemInstruction, emailCategorySchema, null);
  if (cachedResponse !== null) {
    return cachedResponse;
  }

  // Call the Direct Provider
  const response = await _callAIProviderForClassificationDirect(prompt, systemInstruction);

  // Populate Cache
  await setCachedResponse(aiProvider, modelName, prompt, systemInstruction, emailCategorySchema, null, response);

  return response;
}
```

### 1.5 API Endpoints (`server/server.js`)
We will add `aiCacheEnabled` to the settings keys list and define stats and clearing routes.

**Proposed Changes in `server/server.js`:**
```javascript
// Add import at top
import { getCacheStats, clearCache } from './aiCache.js';

// Modify POST /api/settings allowedSettingsKeys (around line 2020)
const allowedSettingsKeys = [
  'tagPreferences', 'sourcingAgentActive', 'emailProvider', 'emailUser', 'emailPassword',
  'outlookClientId', 'outlookTenantId', 'outlookClientSecret', 'outlookUserEmail',
  'aiProvider', 'geminiApiKey', 'openaiApiKey', 'claudeApiKey',
  'ollamaUrl', 'ollamaModel', 'ollamaEmbeddingModel',
  'rankAccordingToJob', 'aiCacheEnabled' // Added aiCacheEnabled here
];

// Add cache stats API endpoint
app.get('/api/settings/cache-stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const stats = await getCacheStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add cache clearing API endpoint
app.post('/api/settings/clear-cache', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    await clearCache();
    res.json({ success: true, message: 'Cache successfully cleared.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 1.6 Frontend Controls (`client/src/components/Settings.jsx`)
Expose toggle controls, current hit stats, and a manual clearing button.

**Proposed Changes in `client/src/components/Settings.jsx`:**
```javascript
// 1. Add state variables inside SettingsView (around line 34)
const [aiCacheEnabled, setAiCacheEnabled] = useState(true);
const [cacheStats, setCacheStats] = useState({ memoryCount: 0, mongoCount: 0 });
const [clearingCache, setClearingCache] = useState(false);

// 2. Fetch cache status in fetchSourcingAndAISettings
setAiCacheEnabled(data.aiCacheEnabled !== false);
if (currentRole === 'Admin') {
  fetchCacheStats();
}

// 3. Define fetchCacheStats function
const fetchCacheStats = async () => {
  try {
    const res = await fetch(`${backendUrl}/api/settings/cache-stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const stats = await res.json();
      setCacheStats(stats);
    }
  } catch (e) {
    console.error('Failed to load cache stats:', e);
  }
};

// 4. Update save settings handler (handleSaveSourcingAndAISettings)
const updateData = {
  sourcingAgentActive,
  emailProvider,
  emailUser,
  aiCacheEnabled // ADDED
};

// 5. Define cache clearing function
const handleClearCache = async () => {
  if (!window.confirm('Are you sure you want to clear the AI Call Cache? This will force the system to make new requests to external AI APIs, which may incur costs.')) return;
  setClearingCache(true);
  try {
    const res = await fetch(`${backendUrl}/api/settings/clear-cache`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      alert('Cache cleared successfully!');
      fetchCacheStats();
    } else {
      alert('Failed to clear cache');
    }
  } catch (e) {
    console.error(e);
    alert('Error clearing cache');
  } finally {
    setClearingCache(false);
  }
};

// 6. Render UI Section in JSX (Inside credentials tab layout - around line 1250)
{/* Add this inside activeSubTab === 'credentials' card stack */}
<div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>AI Call Caching (Hybrid)</h4>
    <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '700', textTransform: 'uppercase' }}>Performance & Cost</span>
  </div>
  
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
    <div>
      <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Enable AI Call Caching</h4>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
        Stores responses from Gemini, OpenAI, Claude, and Ollama in-memory and MongoDB to avoid redundant API queries.
      </p>
    </div>
    <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', width: '180px' }}>
      <button type="button" onClick={() => setAiCacheEnabled(true)} style={{ flex: 1, padding: '6px 12px', borderRadius: '6px', border: 'none', background: aiCacheEnabled ? 'var(--status-offered)' : 'transparent', color: aiCacheEnabled ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '12px', transition: 'all 0.2s' }}>Enabled</button>
      <button type="button" onClick={() => setAiCacheEnabled(false)} style={{ flex: 1, padding: '6px 12px', borderRadius: '6px', border: 'none', background: !aiCacheEnabled ? 'rgba(244, 63, 94, 0.2)' : 'transparent', color: !aiCacheEnabled ? 'var(--status-rejected)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '12px', transition: 'all 0.2s' }}>Disabled</button>
    </div>
  </div>
  
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
    <div>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>In-Memory Cached Queries</span>
      <strong style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{cacheStats.memoryCount}</strong>
    </div>
    <div>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>MongoDB Cached Queries</span>
      <strong style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{cacheStats.mongoCount}</strong>
    </div>
  </div>

  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
    <button type="button" className="btn btn-secondary" onClick={fetchCacheStats} style={{ fontSize: '12px' }}>
      Refresh Cache Stats
    </button>
    {currentRole === 'Admin' && (
      <button type="button" className="btn btn-danger" onClick={handleClearCache} disabled={clearingCache} style={{ fontSize: '12px' }}>
        {clearingCache ? 'Clearing...' : 'Clear AI Cache'}
      </button>
    )}
  </div>
</div>
```

---

## 2. Admin-Only 'Clear Database' Button

### Overview
Wiping out the candidate database during test-runs is a common requirement. The system must drop candidates, jobs, vector segments, indices, and uploaded resume files on the server, while preserving configuration settings and users.

### 2.1 Export Vector Index Reset (`server/ragService.js`)
We must clear the in-memory RAG index when database tables are wiped.

**Proposed Changes in `server/ragService.js`:**
```javascript
// Export a new function at the bottom of the file
export function clearVectorIndex() {
  vectorIndex = [];
  lastIndexedAt = null;
  lastReindexError = null;
  console.log('RAG: Vector index successfully cleared from memory.');
}
```

### 2.2 Wipe Database API Endpoint (`server/server.js`)
This endpoint will perform atomic wipes on candidate tables, reset indexers, and delete uploaded files.

**Proposed Changes in `server/server.js`:**
```javascript
// Import clearVectorIndex (around line 40)
import { loadVectorIndex, indexCandidate, removeCandidate, indexAllCandidates, searchResumes, ragAnswer, getRAGStatus, clearVectorIndex } from './ragService.js';

// Add database clear endpoint (requires Admin role)
app.post('/api/admin/clear-database', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log(`[Clear Database] Initiated by Admin: ${req.user.email}`);

    // 1. Wipe database collections (excluding User accounts and system Settings)
    await Candidate.deleteMany({});
    await Job.deleteMany({});
    await IngestionLog.deleteMany({});
    await ProcessedEmail.deleteMany({});
    await EmailLog.deleteMany({});
    await ResumeChunk.deleteMany({});

    // 2. Clear RAG Vector index from memory
    clearVectorIndex();

    // 3. Clear AI Cache
    await clearCache();

    // 4. Reset standard in-memory search index
    searchIndex.buildIndex([]);

    // 5. Clean up uploads directory (excluding system files)
    const files = fs.readdirSync(UPLOADS_DIR);
    let deletedFilesCount = 0;
    for (const file of files) {
      if (file === '.gitignore' || file === 'README.md') continue;
      try {
        fs.unlinkSync(path.join(UPLOADS_DIR, file));
        deletedFilesCount++;
      } catch (err) {
        console.error(`[Clear Database] Failed to delete file ${file}:`, err.message);
      }
    }

    console.log(`[Clear Database] Finished. Dropped candidate tables. Unlinked ${deletedFilesCount} files.`);
    res.json({ success: true, message: 'Database cleared and uploads directory purged.' });
  } catch (error) {
    console.error('[Clear Database] Critical failure:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 2.3 Danger Zone Button in UI (`client/src/components/Settings.jsx`)
We will add a secure double-confirmation dialog and clear button at the bottom of the Settings view, visible only to admins.

**Proposed Changes in `client/src/components/Settings.jsx`:**
```javascript
// 1. Define handleClearDatabase (inside SettingsView)
const handleClearDatabase = async () => {
  const confirm1 = window.confirm(
    "WARNING: You are about to clear the entire candidate database, job positions, ingestion tracker, email logs, search indices, and all uploaded files.\n\nAre you absolutely sure you want to proceed?"
  );
  if (!confirm1) return;

  const confirm2 = window.prompt(
    "To confirm deletion, type 'DELETE ALL' in the box below:"
  );
  if (confirm2 !== "DELETE ALL") {
    alert("Incorrect confirmation text. Database clear operation aborted.");
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/api/admin/clear-database`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.ok) {
      alert("Database and uploaded files have been cleared successfully!");
      if (onSettingsSaved) onSettingsSaved(); // Force parent component data reload
    } else {
      const err = await res.json().catch(() => ({}));
      alert("Failed to clear database: " + (err.error || res.statusText));
    }
  } catch (e) {
    console.error(e);
    alert("Error clearing database: " + e.message);
  }
};

// 2. Render UI (under activeSubTab === 'credentials')
{/* Add Danger Zone at the bottom of the tab */}
{currentRole === 'Admin' && (
  <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px', border: '1px solid rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.02)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--status-rejected)' }}>Danger Zone</h4>
      <span style={{ fontSize: '11px', color: 'var(--status-rejected)', fontWeight: '700', textTransform: 'uppercase' }}>Admin Only</span>
    </div>
    <div>
      <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Clear Entire System Database</h4>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
        This action will permanently delete all candidates, job postings, ingestion logs, email logs, search indices, cached AI queries, and local upload files. User accounts are preserved. <strong>This cannot be undone!</strong>
      </p>
    </div>
    <div>
      <button
        type="button"
        className="btn btn-danger"
        onClick={handleClearDatabase}
        style={{ padding: '10px 20px', fontSize: '13px', fontWeight: '700' }}
      >
        🗑 Clear Database
      </button>
    </div>
  </div>
)}
```

---

## 3. 24-Hour Login Session Expiry Popup

### Overview
The JWT tokens issued by the server automatically expire in 24 hours. The frontend should track the login duration, alert the user when their session is expiring within the last 5 minutes, and force a clean logout when it has fully run out.

### 3.1 Session Tracking & Modal (`client/src/App.jsx`)
We will track session durations using `localStorage`, set up background timers, and render a warning overlay.

**Proposed Changes in `client/src/App.jsx`:**
```javascript
// 1. Initialize state variables (around line 60)
const [showSessionExpiryWarning, setShowSessionExpiryWarning] = useState(false);
const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0); // in seconds

// 2. Set loginTime in localStorage on successful login
// Inside <Login onLoginSuccess={...}> (around line 318)
onLoginSuccess={(newToken, loggedInUser) => {
  localStorage.setItem('token', newToken);
  localStorage.setItem('user', JSON.stringify(loggedInUser));
  localStorage.setItem('loginTime', Date.now().toString()); // NEW
  setToken(newToken);
  setUser(loggedInUser);
  showToast(`Welcome back, ${loggedInUser.email}!`, 'success');
}}

// 3. Clear loginTime on manual logout (around line 628)
<button
  onClick={() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime'); // NEW
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
    showToast('Logged out successfully', 'success');
  }}
>

// 4. Also clear loginTime when an API call fails with 401/403 (around line 122)
if (authRes.status === 401 || authRes.status === 403) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('loginTime'); // NEW
  setToken(null);
  setUser(null);
  setActiveTab('dashboard');
  return;
}

// 5. Define check & countdown Effects
useEffect(() => {
  if (!token) return;

  const checkSessionExpiry = () => {
    const loginTimeStr = localStorage.getItem('loginTime');
    if (!loginTimeStr) {
      localStorage.setItem('loginTime', Date.now().toString());
      return;
    }

    const loginTime = parseInt(loginTimeStr, 10);
    const now = Date.now();
    const elapsedMs = now - loginTime;
    const totalSessionMs = 24 * 60 * 60 * 1000; // 24 hours
    const remainingMs = totalSessionMs - elapsedMs;

    if (remainingMs <= 0) {
      handleLogoutDueToExpiry();
    } else if (remainingMs <= 5 * 60 * 1000) {
      // Show warning modal when 5 minutes or less are remaining
      setSessionTimeRemaining(Math.ceil(remainingMs / 1000));
      setShowSessionExpiryWarning(true);
    } else {
      setShowSessionExpiryWarning(false);
    }
  };

  checkSessionExpiry();
  const interval = setInterval(checkSessionExpiry, 30000); // Check absolute time every 30s

  return () => clearInterval(interval);
}, [token]);

// Countdown ticker when warning modal is active
useEffect(() => {
  if (!showSessionExpiryWarning) return;

  const timer = setInterval(() => {
    setSessionTimeRemaining(prev => {
      if (prev <= 1) {
        clearInterval(timer);
        handleLogoutDueToExpiry();
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(timer);
}, [showSessionExpiryWarning]);

const handleLogoutDueToExpiry = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('loginTime');
  setToken(null);
  setUser(null);
  setShowSessionExpiryWarning(false);
  setActiveTab('dashboard');
  alert("Your 24-hour login session has expired. Please log in again to continue.");
};

// 6. Render Modal UI in JSX (inside App component return, near line 940)
{/* Session Expiry Warning Modal Overlay */}
{showSessionExpiryWarning && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200
  }}>
    <div style={{
      backgroundColor: '#1e293b',
      border: '1px solid #e11d48',
      borderRadius: '12px',
      padding: '2rem',
      width: '100%',
      maxWidth: '450px',
      color: '#fff',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)'
    }}>
      <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#f43f5e' }}>
        <AlertCircle size={24} /> Session Expiry Warning
      </h3>
      
      <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 1.5rem 0' }}>
        For security purposes, your login session is limited to 24 hours. Your secure session will expire in <strong>{Math.floor(sessionTimeRemaining / 60)}m {sessionTimeRemaining % 60}s</strong>.
      </p>
      
      <div style={{ padding: '10px 14px', backgroundColor: 'rgba(244, 63, 94, 0.1)', borderRadius: '6px', fontSize: '0.85rem', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.2)', marginBottom: '1.5rem' }}>
        Please save any active work or settings before your session expires.
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={() => setShowSessionExpiryWarning(false)}
          style={{ flex: 1, padding: '0.6rem', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          Keep Working
        </button>
        <button
          type="button"
          onClick={handleLogoutDueToExpiry}
          style={{ padding: '0.6rem 1.2rem', backgroundColor: '#e11d48', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          Log Out
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 4. Verification and Testing Plan

### 4.1 Hybrid AI Call Caching
1. **Enable Caching**: Toggle caching to "Enabled" in the settings panel.
2. **First Run (Cache Miss)**: Upload a resume. Check server console logs to verify that the request goes to the external LLM provider API.
3. **Database Check**: Inspect the `aicaches` MongoDB collection (`db.aicaches.find()`). Ensure a document has been saved with the request's SHA-256 hash as the key.
4. **Second Run (Cache Hit)**: Upload the same resume (or delete and re-import). Verify that the request is resolved instantly without hitting the external provider. Check server console logs for `[Cache Hit - L1 Memory]` or `[Cache Hit - L2 MongoDB]`.
5. **Disable Caching**: Toggle caching to "Disabled". Verify that re-uploading the same resume triggers a direct API call rather than a cache hit.
6. **Clearing Cache**: Click the "Clear AI Cache" button as an Admin. Verify that the statistics drop to `0` and the MongoDB collection is emptied.

### 4.2 Clear Database Action
1. **Prepare Data**: Import several candidates, create jobs, and upload resumes. Verify they appear in the UI and their files are written to `server/uploads`.
2. **Trigger Clear**: Log in as an Admin, click "Clear Database" in settings, and type "DELETE ALL" in the verification prompt.
3. **Wipe Verification**:
   - Inspect the database collections in Mongo: Candidate, Job, IngestionLog, ProcessedEmail, EmailLog, ResumeChunk, and AICache should be empty.
   - User collections (`rbac_users`) and the settings collection should remain populated.
   - Verify that the `server/uploads` directory has been unlinked of all candidate files (preserving configuration files like `.gitignore`).
   - Check the in-memory indices (RAG vector index and standard search index) to ensure they are empty.

### 4.3 24-Hour Login Session Expiry Popup
1. **Initial Verification**: Log in. Ensure that `loginTime` is saved in the browser's `localStorage` and contains a valid timestamp.
2. **Simulation (Warning State)**: 
   - Manually modify the `loginTime` key in the browser console:
     `localStorage.setItem('loginTime', (Date.now() - 23.95 * 60 * 60 * 1000).toString())`
   - Wait up to 30 seconds. Verify that the "Session Expiry Warning" modal pops up, showing less than 3 minutes remaining, and counts down second-by-second.
   - Click "Keep Working". The modal should hide, but remain active in the background.
3. **Simulation (Expired State)**:
   - Manually set the session as expired:
     `localStorage.setItem('loginTime', (Date.now() - 24.1 * 60 * 60 * 1000).toString())`
   - Verify that the user is immediately redirected to the login view, the browser storage is cleared, and an alert is displayed.
