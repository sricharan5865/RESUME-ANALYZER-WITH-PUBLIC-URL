# Handoff Report: Codebase & Configuration Audit

## 1. Observation
We examined all configuration and code files related to dependencies, runtime requirements, AI setups, and external services:
* **Dependencies**: Root `package.json` contains `mongoose` (^9.7.3) and `vitest` (^1.6.0). Client `package.json` includes `react` (^19.2.6), `lucide-react` (^1.16.0), and devDependencies like `vite` (^8.0.12). Server `package.json` lists 17 dependencies including `express` (^4.19.2), `mongoose` (^9.7.2), `imapflow` (^1.0.15), and PDF parsing libraries.
* **Runtime**: No `engines` fields found. `PROJECT_HANDOVER_GUIDE.md` specifies "Node.js (v20+)" and "Python 3" as requirements.
* **AI Configuration**: `server/models.js` Settings schema defines `aiProvider` with default `'gemini'` and Ollama URL defaulting to `'https://istgenai.smartgeoapps.com/'`. `server/geminiParser.js` sets temperature to `0.1` and max output tokens to `8192` across providers, with dynamic context sizing (`num_ctx`) of `4096` or `8192` for Ollama. Custom system instructions are defined in `getRecruiterSystemInstruction`.
* **Python OCR**: `server/ocr_fallback.py` imports `cv2`, `numpy`, `pytesseract`, and `fitz` (PyMuPDF). Tesseract command points to `C:\Program Files\Tesseract-OCR\tesseract.exe`.
* **External Services**: MongoDB connection string defaults to `mongodb://admin:password@localhost:27017/talentflow?authSource=admin` in `server/server.js`. Gmail IMAP uses `imap.gmail.com` on port 993 (`server/imapSourcing.js`). Outlook uses client credentials pointing to `login.microsoftonline.com` (`server/outlookApi.js`).

---

## 2. Logic Chain
1. By inspecting the three `package.json` files, we compiled the exact list of dependencies and devDependencies, noting the usage of Express for the backend, React/Vite for the frontend, and Mongoose for DB mapping.
2. Since no `engines` constraints are declared in package.json files, we searched documentation files and found the minimum requirements (`Node.js v20+` and `Python 3`) in `PROJECT_HANDOVER_GUIDE.md`.
3. By analyzing `server/models.js`, `server/.env`, `server/geminiParser.js`, `server/emailCategorizer.js`, and `server/embeddingService.js`, we located the Settings schema, API keys, models (such as `gemini-2.0-flash` on the direct endpoint, `gpt-4o`, `claude-3-5-sonnet-20241022`, and `llama3`), temperature config (`0.1`), max token constraints (`8192`), and context sizes (including dynamic sizing calculation for Ollama).
4. By viewing `server/ocr_fallback.py` and `server/parser.js`, we verified that `cv2`, `numpy`, `pytesseract`, and `fitz` are used for scanned resume OCR, and that the fallback is run via `child_process.spawn('python', ...)` for direct images and legacy files.
5. By scanning `server/server.js`, `server/imapSourcing.js`, and `server/outlookApi.js`, we found the MongoDB URI parameters, Gmail IMAP settings, and Microsoft Graph API parameters for Outlook.

---

## 3. Caveats
* The dynamic prompt compression and schema description stripping functions (`compressCandidateProfile` and `stripSchemaDescriptions`) defined in `server/ollamaOptimizer.js` are currently not imported or called directly inside `server/geminiParser.js` or `server/server.js`, although they exist in the codebase.
* The OCR fallback in `server/parser.js` is not active for PDF text extraction. If PDF text extraction fails, an error is thrown instead of executing the Python OCR fallback on the PDF page images.

---

## 4. Conclusion
The codebase and configuration audit is fully complete. The findings have been compiled into a structured, readable Markdown report at `c:\Users\sri charan\Documents\projects\hr recruter\.agents\teamwork_preview_explorer_audit_1\audit_report.md`.

---

## 5. Verification Method
* Inspect the compiled report file directly:
  `c:\Users\sri charan\Documents\projects\hr recruter\.agents\teamwork_preview_explorer_audit_1\audit_report.md`
* To verify that backend dependencies and testing configurations work, run:
  `cd server`
  `npm run dev`
  (or execute vitest tests via `npm run test:run` / `vitest` inside the tests directory).
