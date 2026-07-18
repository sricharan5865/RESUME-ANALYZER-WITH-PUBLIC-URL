# Analysis and Implementation Plan: Caching, Maintenance, and Session Expiry

This report outlines the analysis of the TalentFlow codebase and presents the design and proposed changes for three key features:
1. **Hybrid AI Call Caching (In-Memory + MongoDB)**: Cache identical prompts, system instructions, schemas, and PDF contents to speed up execution and reduce token consumption.
2. **Admin-only 'Clear Database' maintenance button**: Securely purge all pipeline data, indexing logs, and vector stores without deleting RBAC users or global configurations.
3. **24-Hour Login Session Expiry Popup**: Periodically check session longevity and display a secure backdrop-blur modal to log out users whose sessions have expired.

---

## 1. Hybrid AI Call Caching (In-Memory + MongoDB)

### Design & Architecture
The hybrid caching layer operates on two tiers:
- **In-Memory Cache (L1)**: Built using a Node.js `Map` object. Cache hits are resolved instantly in micro-seconds without any database round-trips.
- **MongoDB Cache (L2)**: Utilizes a persistent collection `AiCache` to persist cache hits across server restarts.

#### Cache Keys
To ensure uniqueness, cache keys are generated using a SHA-256 hash of the combined string representation of all inputs:
- Prompt
- System Instruction
- Schema definition (stringified)
- Base64 PDF content (if uploaded)

```
Cache Key = SHA256( prompt + systemInstruction + stringify(schema) + pdfBase64 )
```

#### Control Flow
1. Generate unique cache key.
2. If `aiCacheEnabled` setting is `false`, call AI provider API directly and skip caching.
3. Check **In-Memory Map**. If hit, return cached object.
4. Check **MongoDB `AiCache` collection**. If hit:
   - Save response to In-Memory Map.
   - Return response.
5. If miss, invoke the AI Provider (Gemini, Claude, OpenAI, or Ollama).
6. Save successful response to both In-Memory Map and MongoDB.
7. Return response.

---

## 2. Admin-only 'Clear Database' Button

### Design & Architecture
A system reset capability is required for administrators to purge experimental or old pipeline data. The following data points will be cleared:
- **MongoDB Collections**: `Candidate`, `Job`, `IngestionLog`, `ProcessedEmail`, `EmailLog`, `ResumeChunk`, `AiCache`.
- **Filesystem**: Clear files inside the `uploads/` directory, while preserving the directory structure (and `.gitkeep` file).
- **In-Memory Indexes**: Resets `searchIndex` (fuzzy search inverted index) and `vectorIndex` (RAG vector index in `ragService.js`).

**Strict Security & Accidental Protection**:
- **Authentication**: Endpoint is protected by JWT validation (`authenticateToken`) and RBAC checks (`requireRole(['admin'])`).
- **UI Safety**: Requires triple confirmation in the frontend:
  1. Generic window confirmation.
  2. Absolute confirmation warning.
  3. Forced typing verification where the administrator must type exactly `"RESET SYSTEM"` in a prompt modal.

---

## 3. 24-Hour Login Session Expiry Popup

### Design & Architecture
- When a user logs in successfully, the application records a UTC timestamp `loginTimestamp` to `localStorage`.
- A continuous `useEffect` monitor in `client/src/App.jsx` checks the difference between the current time and `loginTimestamp` on mount and then every 60 seconds.
- If `Date.now() - loginTimestamp >= 86,400,000` (24 hours), the state `showSessionExpiredModal` is set to `true`.
- The modal renders as a full-screen absolute backdrop overlay with a blur effect (`backdrop-filter: blur(8px)`) blocking any interaction with the dashboard.
- Clicking the confirmation button performs a logout operation, wiping the token, user details, and timestamp from storage, and redirecting the client to the login screen.

---

## Proposed Code Modifications

### 1. `server/models.js`

#### Target Line: 121 (Inside `settingsSchema`)
```javascript
  ollamaEmbeddingModel: { type: String, default: 'gpt-oss:20b' },
  rankAccordingToJob: { type: Boolean, default: true }
```

#### Proposed Change:
Add `aiCacheEnabled` to `settingsSchema` and define the `AiCache` model:
```javascript
  ollamaEmbeddingModel: { type: String, default: 'gpt-oss:20b' },
  rankAccordingToJob: { type: Boolean, default: true },
  aiCacheEnabled: { type: Boolean, default: true }
});
```

#### Target Line: 173 (After `ResumeChunk` model export)
```javascript
export const ResumeChunk = mongoose.model('ResumeChunk', resumeChunkSchema);
```

#### Proposed Change:
Define and export the `AiCache` model and schema:
```javascript
export const ResumeChunk = mongoose.model('ResumeChunk', resumeChunkSchema);

const aiCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true },
  response: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now }
});
aiCacheSchema.index({ cacheKey: 1 });

export const AiCache = mongoose.model('AiCache', aiCacheSchema);
```

---

### 2. `server/geminiParser.js`

#### Target Line: 1 (Start of file)
```javascript
import dotenv from 'dotenv';
import { Settings } from './models.js';
dotenv.config();
```

#### Proposed Change:
Import `crypto` and `AiCache` from models:
```javascript
import dotenv from 'dotenv';
import crypto from 'crypto';
import { Settings, AiCache } from './models.js';
dotenv.config();

// In-Memory cache map
const inMemoryCache = new Map();

/**
 * Generates a unique cache key based on the parameters
 */
export function generateCacheKey(prompt, systemInstruction = '', schema = null, pdfBase64 = null) {
  const hash = crypto.createHash('sha256');
  hash.update(prompt || '');
  hash.update(systemInstruction || '');
  if (schema) {
    hash.update(JSON.stringify(schema));
  }
  if (pdfBase64) {
    hash.update(pdfBase64);
  }
  return hash.digest('hex');
}

/**
 * Retrieves a response from the cache if enabled
 */
export async function getCachedResponse(key) {
  try {
    const settings = await Settings.findById('global');
    if (settings && settings.aiCacheEnabled === false) {
      return null;
    }
  } catch (e) {
    console.error('Error checking aiCacheEnabled setting:', e);
  }

  if (inMemoryCache.has(key)) {
    console.log(`[L1 Cache Hit] In-Memory key: ${key}`);
    return inMemoryCache.get(key);
  }

  try {
    const cached = await AiCache.findOne({ cacheKey: key });
    if (cached) {
      console.log(`[L2 Cache Hit] MongoDB key: ${key}`);
      inMemoryCache.set(key, cached.response);
      return cached.response;
    }
  } catch (err) {
    console.error('Failed to read from MongoDB AI cache:', err);
  }
  return null;
}

/**
 * Saves a response to both In-Memory and MongoDB cache
 */
export async function setCachedResponse(key, response) {
  try {
    const settings = await Settings.findById('global');
    if (settings && settings.aiCacheEnabled === false) {
      return;
    }
  } catch (e) {
    console.error('Error checking aiCacheEnabled setting:', e);
  }

  inMemoryCache.set(key, response);

  try {
    await AiCache.updateOne(
      { cacheKey: key },
      { $set: { response, createdAt: new Date() } },
      { upsert: true }
    );
    console.log(`[Cache Saved] Saved response for key: ${key}`);
  } catch (err) {
    console.error('Failed to write to MongoDB AI cache:', err);
  }
}

/**
 * Clears the in-memory cache map
 */
export function clearInMemoryCache() {
  inMemoryCache.clear();
}
```

#### Target Line: 475 (Inside `callAIProvider`)
```javascript
async function callAIProvider(prompt, systemInstruction = '', schema = null, pdfBase64 = null) {
  let settings = null;
  try {
    settings = await Settings.findById('global');
  } catch (e) {
```

#### Proposed Change:
Generate key, look up cache, and wrap results to write to cache:
```javascript
async function callAIProvider(prompt, systemInstruction = '', schema = null, pdfBase64 = null) {
  const cacheKey = generateCacheKey(prompt, systemInstruction, schema, pdfBase64);
  const cachedResult = await getCachedResponse(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  let settings = null;
  try {
    settings = await Settings.findById('global');
  } catch (e) {
```

Then, before each return in `callAIProvider`:
*Lines 519, 568, 629, 721, 845* - Save resolved output to cache:
```javascript
      // Example for Gemini OpenRouter choice
      const resultValue = schema ? safeExtractAndParseJson(text, schema) : cleanJsonResponse(text);
      await setCachedResponse(cacheKey, resultValue);
      return resultValue;
```

---

### 3. `server/emailCategorizer.js`

#### Target Line: 1 (Start of file)
```javascript
import dotenv from 'dotenv';
import { Settings } from './models.js';
```

#### Proposed Change:
Import cache utilities from geminiParser:
```javascript
import dotenv from 'dotenv';
import { Settings } from './models.js';
import { generateCacheKey, getCachedResponse, setCachedResponse } from './geminiParser.js';
```

#### Target Line: 298 (Inside `callAIProviderForClassification`)
```javascript
async function callAIProviderForClassification(prompt, systemInstruction) {
  let settings = null;
```

#### Proposed Change:
Incorporate caching wrapper:
```javascript
async function callAIProviderForClassification(prompt, systemInstruction) {
  const cacheKey = generateCacheKey(prompt, systemInstruction, emailCategorySchema, null);
  const cachedResult = await getCachedResponse(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  let settings = null;
```

Then, before each return in `callAIProviderForClassification`:
*Lines 345, 376, 411, 443, 477* - Save resolved classification to cache:
```javascript
      // Example:
      const parsedRes = safeExtractAndParseJson(text, emailCategorySchema, emailCategoryFallback);
      await setCachedResponse(cacheKey, parsedRes);
      return parsedRes;
```

---

### 4. `server/server.js`

#### Target Line: 28 (Imports from models)
```javascript
import { Candidate, Job, Settings, ProcessedEmail, IngestionLog, User } from './models.js';
```

#### Proposed Change:
Import `AiCache`, `ResumeChunk`, and the `clearInMemoryCache` utility:
```javascript
import { Candidate, Job, Settings, ProcessedEmail, IngestionLog, User, AiCache, ResumeChunk } from './models.js';
import { clearInMemoryCache } from './geminiParser.js';
```

#### Target Line: 2020 (Inside `allowedSettingsKeys` array)
```javascript
    const allowedSettingsKeys = [
      'tagPreferences', 'sourcingAgentActive', 'emailProvider', 'emailUser', 'emailPassword',
      'outlookClientId', 'outlookTenantId', 'outlookClientSecret', 'outlookUserEmail',
      'aiProvider', 'geminiApiKey', 'openaiApiKey', 'claudeApiKey',
      'ollamaUrl', 'ollamaModel', 'ollamaEmbeddingModel',
      'rankAccordingToJob'
    ];
```

#### Proposed Change:
Include `aiCacheEnabled` setting:
```javascript
    const allowedSettingsKeys = [
      'tagPreferences', 'sourcingAgentActive', 'emailProvider', 'emailUser', 'emailPassword',
      'outlookClientId', 'outlookTenantId', 'outlookClientSecret', 'outlookUserEmail',
      'aiProvider', 'geminiApiKey', 'openaiApiKey', 'claudeApiKey',
      'ollamaUrl', 'ollamaModel', 'ollamaEmbeddingModel',
      'rankAccordingToJob', 'aiCacheEnabled'
    ];
```

#### Target Line: 2016 (Inside `app.get('/api/settings')` and `app.post('/api/settings')`)
Insert the Clear Cache and Clear Database endpoints directly below:
```javascript
// Clear AI Call Cache (Admin Only)
app.post('/api/settings/clear-cache', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    await AiCache.deleteMany({});
    clearInMemoryCache();
    res.json({ success: true, message: 'AI Call Cache cleared successfully.' });
  } catch (error) {
    console.error('Failed to clear AI cache:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear Entire Database (Admin Only)
app.post('/api/admin/clear-database', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // 1. Wipe collections (Preserving RBAC users and settings configuration)
    await Candidate.deleteMany({});
    await Job.deleteMany({});
    await IngestionLog.deleteMany({});
    await ProcessedEmail.deleteMany({});
    await EmailLog.deleteMany({});
    await ResumeChunk.deleteMany({});
    await AiCache.deleteMany({});

    // 2. Delete uploads folder files (excluding .gitkeep if present)
    const uploadsDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = await fs.promises.readdir(uploadsDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          await fs.promises.unlink(path.join(uploadsDir, file)).catch(err => {
            console.warn(`Could not delete file ${file}:`, err.message);
          });
        }
      }
    }

    // 3. Reset in-memory indices
    searchIndex.buildIndex([]);
    await loadVectorIndex();
    clearInMemoryCache();

    res.json({ success: true, message: 'Entire pipeline database wiped successfully (RBAC users and global settings preserved).' });
  } catch (error) {
    console.error('Failed to wipe database:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### 5. `client/src/components/Settings.jsx`

#### Target Line: 34 (Inside `SettingsView` component states)
```javascript
  const [savingSettings, setSavingSettings] = useState(false);
```

#### Proposed Change:
Add new states for caching control and database maintenance:
```javascript
  const [savingSettings, setSavingSettings] = useState(false);
  const [aiCacheEnabled, setAiCacheEnabled] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);
  const [clearingDatabase, setClearingDatabase] = useState(false);
```

#### Target Line: 111 (Inside `fetchSourcingAndAISettings`)
```javascript
          setOutlookTenantId(data.outlookTenantId || '');
          setOutlookUserEmail(data.outlookUserEmail || '');
        }
```

#### Proposed Change:
Bind the server's cache configuration state:
```javascript
          setOutlookTenantId(data.outlookTenantId || '');
          setOutlookUserEmail(data.outlookUserEmail || '');
          setAiCacheEnabled(data.aiCacheEnabled !== false);
        }
```

#### Target Line: 335 (Inside `handleSaveSourcingAndAISettings`)
```javascript
      updateData.outlookTenantId = outlookTenantId;
      updateData.outlookUserEmail = outlookUserEmail;
```

#### Proposed Change:
Include the toggle state during saves:
```javascript
      updateData.outlookTenantId = outlookTenantId;
      updateData.outlookUserEmail = outlookUserEmail;
      updateData.aiCacheEnabled = aiCacheEnabled;
```

#### Target Line: 446 (Directly before the return statement)
Add functions to call the API endpoints:
```javascript
  const handleClearCache = async () => {
    if (!window.confirm('Are you sure you want to clear the AI call cache? Subsequent resume parses and matches will require fresh LLM calls.')) return;
    setClearingCache(true);
    try {
      const res = await fetch(`${backendUrl}/api/settings/clear-cache`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to clear cache');
      alert('AI call cache cleared successfully!');
    } catch (e) {
      alert('Error clearing cache: ' + e.message);
    } finally {
      setClearingCache(false);
    }
  };

  const handleClearDatabase = async () => {
    const confirmation1 = window.confirm(
      'WARNING: You are about to clear the entire database. This will delete all candidates, jobs, logs, and indexing data. This action is irreversible.\n\nDo you want to proceed?'
    );
    if (!confirmation1) return;

    const confirmation2 = window.confirm(
      'Are you absolutely sure? Type "DELETE ALL" in the prompt if you are sure.'
    );
    if (!confirmation2) return;

    const textConfirm = window.prompt('Please type "RESET SYSTEM" to confirm system wipe:');
    if (textConfirm !== 'RESET SYSTEM') {
      alert('System wipe cancelled: Confirmation string did not match.');
      return;
    }

    setClearingDatabase(true);
    try {
      const res = await fetch(`${backendUrl}/api/admin/clear-database`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${res.status}`);
      }
      alert('Database cleared successfully! The page will now reload.');
      window.location.reload();
    } catch (e) {
      alert('Failed to clear database: ' + e.message);
    } finally {
      setClearingDatabase(false);
    }
  };
```

#### Target Line: 1248 (Inside "AI Processing Agent" block configuration)
```javascript
                  </span>
                </div>
              )}

            </div>
```

#### Proposed Change:
Embed the AI Cache setting inside the AI Processing block:
```javascript
                  </span>
                </div>
              )}

              {/* AI Call Cache Control */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px dashed var(--glass-border)', paddingTop: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h5 style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>Hybrid AI Call Cache</h5>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                      Caches AI call results to speed up resume parsing/scoring and reduce token costs.
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={aiCacheEnabled} 
                      onChange={(e) => setAiCacheEnabled(e.target.checked)}
                      disabled={currentRole !== 'Admin'}
                    />
                    <span style={{ fontSize: '12px', fontWeight: '600' }}>Enabled</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleClearCache}
                  disabled={clearingCache || currentRole !== 'Admin'}
                  className="btn btn-secondary"
                  style={{ alignSelf: 'flex-start', fontSize: '11px', padding: '6px 12px' }}
                >
                  {clearingCache ? 'Clearing Cache...' : 'Clear AI Cache'}
                </button>
              </div>

            </div>
```

#### Target Line: 1255 (Directly under the credentials view form ends)
```javascript
            </button>
          </form>
        )}

      </div>
```

#### Proposed Change:
Append the Danger Zone section for system resets:
```javascript
            </button>
          </form>
        )}

        {/* DANGER ZONE (Admin Only) */}
        {activeSubTab === 'credentials' && currentRole === 'Admin' && (
          <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(244, 63, 94, 0.3)', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '32px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--status-rejected)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} /> Danger Zone
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Reset the system to its initial state. This will delete all candidates, jobs, indexing logs, processed emails, email logs, and search/vector embeddings. Settings and RBAC user accounts will be preserved.
            </p>
            <button
              type="button"
              onClick={handleClearDatabase}
              disabled={clearingDatabase}
              className="btn btn-danger"
              style={{ alignSelf: 'flex-start', padding: '10px 20px', fontWeight: '600' }}
            >
              {clearingDatabase ? 'Clearing Database...' : 'Clear Entire Database'}
            </button>
          </div>
        )}

      </div>
```

---

### 6. `client/src/App.jsx`

#### Target Line: 67 (Inside `App` component states)
```javascript
  const [passwordSuccess, setPasswordSuccess] = useState('');
```

#### Proposed Change:
Add session expired state:
```javascript
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
```

#### Target Line: 102 (End of the main token fetching `useEffect`)
```javascript
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token]);
```

#### Proposed Change:
Include the session longevity validation effect hook:
```javascript
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token]);

  // Session longevity validator (24 Hours Expiry)
  useEffect(() => {
    if (!token) return;

    const checkSessionExpiry = () => {
      const loginTimestamp = localStorage.getItem('loginTimestamp');
      if (loginTimestamp) {
        const age = Date.now() - parseInt(loginTimestamp, 10);
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (age >= twentyFourHours) {
          setShowSessionExpiredModal(true);
        }
      } else {
        // Fallback to prevent sudden logouts on update
        localStorage.setItem('loginTimestamp', Date.now().toString());
      }
    };

    checkSessionExpiry();
    const interval = setInterval(checkSessionExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [token]);

  const handleSessionExpiredConfirm = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTimestamp');
    setToken(null);
    setUser(null);
    setShowSessionExpiredModal(false);
    setActiveTab('dashboard');
  };
```

#### Target Line: 323 (Inside `Login` component success handler)
```javascript
    return <Login backendUrl={BACKEND_URL} onLoginSuccess={(newToken, loggedInUser) => {
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      setToken(newToken);
      setUser(loggedInUser);
      showToast(`Welcome back, ${loggedInUser.email}!`, 'success');
    }} />;
```

#### Proposed Change:
Store session start time on successful log-in:
```javascript
    return <Login backendUrl={BACKEND_URL} onLoginSuccess={(newToken, loggedInUser) => {
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      localStorage.setItem('loginTimestamp', Date.now().toString());
      setToken(newToken);
      setUser(loggedInUser);
      showToast(`Welcome back, ${loggedInUser.email}!`, 'success');
    }} />;
```

#### Target Line: 948 (Bottom of App container JSX structure)
```javascript
    </div>
  );
}
```

#### Proposed Change:
Embed the session expired modal popup as an absolute overlay:
```javascript
      {/* Session Expired Pop-up */}
      {showSessionExpiredModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass" style={{
            padding: '32px',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            border: '1px solid rgba(251, 191, 36, 0.3)'
          }}>
            <div style={{
              background: 'rgba(251, 191, 36, 0.1)',
              color: '#fbbf24',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}>
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Session Expired</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                Your login session has expired after 24 hours. Please log in again to continue working on TalentFlow.
              </p>
            </div>
            <button
              onClick={handleSessionExpiredConfirm}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontWeight: '600',
                justifyContent: 'center',
                background: 'var(--accent-gradient)'
              }}
            >
              Log In Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Edge Case Analysis

1. **Large PDF Base64 strings causing huge hashes or Out of Memory**: We pass the string directly to Node.js `crypto` hashing streams which process data sequentially, preventing memory pressure.
2. **Concurrent same-prompt AI Calls hitting the cache simultaneously**: There is a brief window where two uploads of the exact same resume could trigger simultaneous AI calls before the first call is saved to MongoDB. The in-memory cache Map and MongoDB index key uniqueness (`unique: true`) prevent duplicate insertions, resolving gracefully.
3. **Session Expiry occurring mid-operation**: If a user has a session active in their browser tab but goes offline, or has a background fetch running, the JWT token on the server might theoretically still be valid. The frontend validator popup acts as a secure shield by forcing logout and resetting active tabs on confirmation.
4. **Incorrect deletion of critical accounts during Reset**: By explicitly deleting only Candidate, Job, IngestionLog, ProcessedEmail, EmailLog, ResumeChunk, and AiCache, the system keeps the admin user logged in and preserves their credentials, avoiding login lockouts.
