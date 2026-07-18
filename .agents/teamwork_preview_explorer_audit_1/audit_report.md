# TalentFlow Recruitment Codebase & Configuration Audit Report

This report presents a comprehensive codebase and configuration audit of the **TalentFlow** recruitment automation platform. The audit covers package dependencies, runtime requirements, AI engine configurations (Gemini, OpenAI, Claude, and Ollama), Python OCR fallback capabilities, and external services integration.

---

## 1. Package Dependencies & Core Libraries

The TalentFlow project is structured as a monorepo with three separate `package.json` configurations: the workspace root, the frontend client (`client/package.json`), and the backend server (`server/package.json`).

### A. Root Dependency Summary
* **Path**: `package.json`
* **Dependencies**:
  | Package | Version | Type | Description |
  |---|---|---|---|
  | `mongoose` | `^9.7.3` | Dependency | Object Data Modeling (ODM) for MongoDB |
  | `vitest` | `^1.6.0` | Dependency | Testing Framework |

---

### B. Frontend Client Dependency Summary
* **Path**: `client/package.json`
* **Dependencies**:
  | Package | Version | Type | Description |
  |---|---|---|---|
  | `lucide-react` | `^1.16.0` | Dependency | SVG icons library for React |
  | `react` | `^19.2.6` | Dependency | Frontend UI Framework |
  | `react-dom` | `^19.2.6` | Dependency | React renderer for the DOM |
  | `@eslint/js` | `^10.0.1` | DevDependency | ESLint Javascript configuration rules |
  | `@types/react` | `^19.2.14` | DevDependency | TypeScript types for React |
  | `@types/react-dom` | `^19.2.3` | DevDependency | TypeScript types for React DOM |
  | `@vitejs/plugin-react` | `^6.0.1` | DevDependency | Vite plugin for React Support |
  | `eslint` | `^10.3.0` | DevDependency | Static code linter |
  | `eslint-plugin-react-hooks` | `^7.1.1` | DevDependency | ESLint checks for React Hooks rules |
  | `eslint-plugin-react-refresh` | `^0.5.2` | DevDependency | ESLint rules for Vite HMR |
  | `globals` | `^17.6.0` | DevDependency | Global variable declarations for ESLint |
  | `vite` | `^8.0.12` | DevDependency | Modern frontend builder & dev server |

---

### C. Backend Server Dependency Summary
* **Path**: `server/package.json`
* **Dependencies**:
  | Package | Version | Type | Description |
  |---|---|---|---|
  | `bcryptjs` | `^3.0.3` | Dependency | Password hashing utility |
  | `cors` | `^2.8.5` | Dependency | Express Middleware to handle CORS |
  | `dotenv` | `^16.4.5` | Dependency | Load environment variables from `.env` |
  | `express` | `^4.19.2` | Dependency | Web framework / REST APIs host |
  | `googleapis` | `^137.0.0` | Dependency | Google API Client (e.g. Gmail integration) |
  | `imapflow` | `^1.0.15` | Dependency | IMAP client to fetch emails (Gmail/other) |
  | `jsonwebtoken` | `^9.0.3` | Dependency | JWT creation and verification |
  | `mailparser` | `^3.7.1` | Dependency | Node email parser (used with `imapflow`) |
  | `mammoth` | `^1.12.0` | Dependency | Extracts text/HTML from `.docx` files |
  | `mongoose` | `^9.7.2` | Dependency | ODM library for MongoDB schema management |
  | `multer` | `^1.4.5-lts.1` | Dependency | Middleware for file uploads (multipart/form-data) |
  | `nodemailer` | `^6.9.13` | Dependency | Sends transactional emails |
  | `pdf-parse` | `^1.1.1` | Dependency | Primary text extraction library for PDF files |
  | `pdf2json` | `^4.0.3` | Dependency | Secondary PDF text parsing library |
  | `pdfjs-dist` | `^3.11.174` | Dependency | PDF rendering/extraction (Legacy fallback) |
  | `pdfkit` | `^0.18.0` | Dependency | Programmatic PDF generator library |
  | `undici` | `^5.28.4` | Dependency | High performance HTTP/1.1 client for Node.js |
  | `start-server-and-test` | `^2.0.3` | DevDependency | Orchestrates starting dev server and running tests |
  | `vitest` | `^1.6.0` | DevDependency | Testing Framework |

---

## 2. Runtime Version Requirements

* **Node.js**:
  * There are **no** `engines` constraints configured inside the `package.json` files.
  * However, `PROJECT_HANDOVER_GUIDE.md` specifies **Node.js (v20+)** as the required JavaScript runtime environment.
* **Python**:
  * There is no `requirements.txt` or system-level configuration file.
  * `PROJECT_HANDOVER_GUIDE.md` indicates **Python 3** is required for the scanned PDF/image OCR fallback capabilities.

---

## 3. AI & LLM Engine Configuration

AI capabilities are configured across three main service files: `server/geminiParser.js` (resume parsing & question generation), `server/emailCategorizer.js` (email categorization), and `server/embeddingService.js` (vector embeddings).

### A. Environment Configuration & Settings DB Schema
LLM parameters are defined in `.env` (environment fallbacks) and stored in a Mongoose schema (`Settings`) for real-time UI customization.
* **Mongoose Schema (`Settings` in `server/models.js`)**:
  * `aiProvider`: Defaults to `'gemini'` (choices: `'gemini'`, `'openai'`, `'claude'`, `'ollama'`).
  * `geminiApiKey`: Defaults to `''`.
  * `openaiApiKey`: Defaults to `''`.
  * `claudeApiKey`: Defaults to `''`.
  * `ollamaUrl`: Defaults to `'https://istgenai.smartgeoapps.com/'` (note: `geminiParser.js` code falls back to `http://localhost:11434` if not set).
  * `ollamaModel`: Defaults to `'llama3'`.
  * `ollamaEmbeddingModel`: Defaults to `'gpt-oss:20b'`.

---

### B. Models and Endpoints
Depending on the configured `aiProvider`, different models and endpoint endpoints are requested:

1. **Gemini**:
   * *Direct Endpoint*: Uses URL `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}` (Note: despite the handover document stating it was updated to `gemini-2.5-flash`, the URL hardcodes `gemini-2.0-flash`).
   * *OpenRouter Fallback*: If API key starts with `sk-or-`, queries `https://openrouter.ai/api/v1/chat/completions` using `process.env.AI_MODEL` or default model `x-ai/grok-4.5`.
   * *Embeddings*: Uses `models/text-embedding-004` direct endpoint (`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents`).

2. **OpenAI**:
   * *Endpoint*: `https://api.openai.com/v1/chat/completions` (or OpenRouter: `https://openrouter.ai/api/v1/chat/completions`).
   * *Model*: `gpt-4o` (or `openai/gpt-4o` for OpenRouter).
   * *Embeddings*: `openai/text-embedding-3-small` (dimensions: 768) via OpenRouter endpoint (`https://openrouter.ai/api/v1/embeddings`).

3. **Claude**:
   * *Endpoint*: `https://api.anthropic.com/v1/messages` (or OpenRouter: `https://openrouter.ai/api/v1/chat/completions`).
   * *Model*: `claude-3-5-sonnet-20241022` (or `anthropic/claude-3.5-sonnet` for OpenRouter).

4. **Ollama**:
   * *Endpoint*: `/api/chat` (e.g., `http://localhost:11434/api/chat` or configured settings URL).
   * *Model*: Configured in settings (defaults to `'llama3'`).
   * *Embeddings*: Uses batch endpoint `/api/embed` or fallback `/api/embeddings`. Model: settings-configured embedding model (defaults to `'gpt-oss:20b'`).

---

### C. Temperature Settings
* Set to **`0.1`** globally across all providers and tasks (chat generation, email classification, and embeddings) to guarantee highly deterministic, structured JSON outputs.

---

### D. Custom System Instructions & Prompts
* **Resume Parsing**:
  * System instructions are defined in `getRecruiterSystemInstruction(aiProvider)` (`geminiParser.js`). It acts as a "senior technical recruiter", enforcing strict rules:
    * No generic questions. Every question must reference the candidate's resume directly.
    * Calibrate difficulty levels within each category (increasing difficulty).
    * No repeat questions.
    * Specific question categorization logic (e.g. Technology Verification, Scenario-based, Architecture, Behavioral).
  * For Ollama, it appends a critical instruction: `Do NOT write any thinking process, reasoning, chain-of-thought, or <thinking> tags. Skip thinking entirely. Directly output the raw JSON object.`
* **JD Question Generation**:
  * System instructions in `generateQuestionsForCandidate(candidateProfile, jobDescription)` instruct the AI to align resume claims directly against job requirements and identify gap-assessment questions for missing requirements.
* **Email Classification**:
  * Instructs the AI in `emailCategorizer.js` to act as an "email classifier for an HR recruitment platform". It categorizes incoming emails into exactly one of: `Resume`, `HR`, `Spam`, `Client`, `Interview`, `Notification`, `Other`.

---

### E. Context Size & Token Optimization
* **Cloud Models**: `max_tokens` (or `maxOutputTokens`) is explicitly configured to `8192` across providers in `geminiParser.js` to avoid JSON truncation issues, and `1000` / `2000` inside `emailCategorizer.js`.
* **Ollama (Local)**:
  * Uses a **Dynamic Context Size (`num_ctx`)** based on prompt length in `geminiParser.js`:
    $$\text{estimatedTokens} = \frac{\text{systemInstruction.length} + \text{userContent.length}}{3.5}$$
    * If `estimatedTokens > 3500`, sets `num_ctx: 8192`.
    * Otherwise, sets `num_ctx: 4096`.
  * `num_predict` is explicitly set to `2048` (for resume parsing) or `256` (for email categorization).
  * An optimization utility in `server/ollamaOptimizer.js` exposes functions (though currently defined and not imported directly by default codebase entry points) to compress candidate profile payloads (`compressCandidateProfile`) and strip description keys from JSON schema objects (`stripSchemaDescriptions`) to conserve local model context window space.

---

## 4. Python OCR & Text Extraction

If scanned PDFs or image uploads are processed, the system triggers the Python OCR fallback handler.

* **File Location**: `server/ocr_fallback.py`
* **Python Libraries Used**:
  * `cv2` (`opencv-python`): Preprocesses images (grayscale conversion `cv2.cvtColor`) to enhance text recognition contrast.
  * `numpy`: Handles buffer-to-array transformations (`np.frombuffer` / `cv2.imdecode`).
  * `pytesseract`: Wraps the local Tesseract-OCR binary engine to execute character recognition.
  * `fitz` (`PyMuPDF`): Reads PDF documents and extracts pages as high-resolution PNG images via `page.get_pixmap(matrix=fitz.Matrix(2, 2))`.
* **OCR Configurations**:
  * Windows binary default path: `C:\Program Files\Tesseract-OCR\tesseract.exe` (automatically registered as `pytesseract.pytesseract.tesseract_cmd` if the file exists).
  * Tesseract engine configuration: Run with `--oem 1 --psm 3` (standard document layout analysis and LSTM OCR engine).
* **Node.js Integration (`server/parser.js`)**:
  * OCR is executed via `child_process.spawn('python', ['ocr_fallback.py', filePath])`.
  * Triggers:
    1. Direct image files: `.png`, `.jpg`, `.jpeg`, `.bmp`, `.tiff`, `.gif`.
    2. Last-resort fallback: If standard text readers fail or return no contents.
  * *Important Note*: Standard PDF extraction (`extractTextFromPDF` in `server/parser.js`) does **not** call the OCR fallback. If both `pdf-parse` and `pdfjs-dist` fail or return empty strings, it immediately throws `Failed to parse PDF file contents: PDF contains no text (OCR fallback disabled for PDF).`

---

## 5. External Services Configuration

### A. MongoDB Database
* **Local Default**: `mongodb://admin:password@localhost:27017/talentflow?authSource=admin`
* **Connection code (`server/server.js`)**:
  ```javascript
  mongoose.connect(process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/talentflow?authSource=admin')
  ```
* **Production Atlas Configuration**: Configured with host credentials pointing to `cluster0.p7dzk.mongodb.net` using user `sricharanjayavarapu_db_user`.

### B. Authentication (Google OAuth)
Google Auth endpoints are configured using environment parameters:
* `GOOGLE_CLIENT_ID`
* `GOOGLE_CLIENT_SECRET`
* `GOOGLE_REDIRECT_URI` (defaults to `http://localhost:5000/api/auth/google/callback`)

### C. Sourcing Email Servers (IMAP & Microsoft Graph API)
Sourcing configurations can either be loaded from the database settings document or the `.env` file:
* **Gmail Sourcing (IMAP)**:
  * Host: Hardcoded to `'imap.gmail.com'` on Port `993` with SSL enabled.
  * Credentials: `process.env.GMAIL_USER_EMAIL` / `process.env.GMAIL_APP_PASSWORD` or DB values.
* **Outlook Sourcing (Microsoft Graph API)**:
  * Authentication: Client credentials OAuth flow pointing to:
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
  * Graph API endpoints: Accesses mail folders and attachments via the Microsoft Graph REST API.
  * Credentials: `OUTLOOK_CLIENT_ID` / `OUTLOOK_CLIENT_SECRET` / `OUTLOOK_TENANT_ID` / `OUTLOOK_USER_EMAIL` or DB values.
