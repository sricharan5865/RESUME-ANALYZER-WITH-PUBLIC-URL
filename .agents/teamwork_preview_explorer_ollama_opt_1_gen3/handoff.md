# Handoff Report — Codebase Investigation for Candidate Questions and Ollama Integration

## 1. Observation

### Candidate Questions Generation Backend Logic
- **Primary Generator Function**: Defined in `server/geminiParser.js` at line 1644:
  ```javascript
  export async function generateQuestionsForCandidate(candidateProfile, jobDescription = null) {
  ```
- **Job Description Path** (Lines 1651–1747): Direct comparison between the candidate's resume and the JD requirements. The LLM response is requested under the schema `jdSchema` (lines 1680–1711), structured with `hrQuestions` and `technicalQuestions` directly.
- **General/No Job Description Path** (Lines 1749–1866): Invokes the full 7-part recruiter analysis schema (`career_gaps`, `technical_depth_audit`, `domain_question_bank`, `project_deep_dive`, `hr_questions`, `red_flags`, `must_prepare_topics`, `fit_summary`). After parsing the LLM response, it calls `mapAnalysisToQuestions(parsedData, true)` (line 1864) to parse and map the fields into `hrQuestions` and `technicalQuestions`.
- **Initial Upload Mapping**: Handled via `parseResume(resumeText, pdfBase64)` (line 1089) which runs the 7-part recruiter analysis and calls `mapAnalysisToQuestions(parsedData)` (line 1290) before returning the candidate profile data to be saved on ingestion.

### LLM Prompt Format and Ollama Parameters
- **System Instruction**: Loaded via `getRecruiterSystemInstruction(aiProvider)` (line 1104, 1749). It provides a verbose description (~450 words) of the rules and 7 analysis sections.
  - **Ollama Job-specific Override**: If `aiProvider === 'ollama'`, the JD system instruction is overridden with a condensed version:
    ```javascript
    systemInstruction = `Senior interviewer: Compare resume to JD. Generate 8-12 unique custom questions.
- Every question must be concise, direct, and short (strictly under 15-20 words). Avoid long prefixes detailing candidate history.
- Must reference details from resume and tie to JD requirements. No generic/repeated/screening questions.
- Tech Verification (lists tech), Scenario (experience claims), Architecture (projects), Behavioral (leadership/gaps). Do NOT write thinking process or <thinking> tags. Output JSON only.`;
    ```
- **Ollama Specific User/System Prompts**: In `server/geminiParser.js` (lines 804–951):
  - Injects schema instructions: `userContent += getCompactSchemaInstructions(schema);` (line 818).
  - Enforces JSON output and restricts thinking: `CRITICAL: Do NOT write any thinking process, reasoning, chain-of-thought, or <thinking> tags...` (lines 822, 826).
- **Ollama Request Body Options** (Lines 860–864):
  - `temperature`: 0.1
  - `num_ctx`: Dynamically computed:
    - Default: 4096.
    - Complex generation (resume parsing with properties > 10): 8192 (or if estimated token count > 3500, sets `num_ctx` to 8192).
    - Simple classification (properties < 5): 2048 (e.g., email categorizer uses `2048`).
  - `num_predict`: Dynamically computed:
    - Default: 2048.
    - Complex generation: 3072.
    - Simple classification: 256.
    - Retried generation (if JSON is truncated and repair fails): retries with `num_predict = 4096` (line 931).

### Storage of hrQuestions and technicalQuestions
- **Database Model**: Defined in `server/models.js`:
  - `hrQuestions` is stored inside the Candidate document (lines 47–53) as an array of objects containing `question`, `answer`, and `importance` (default 'Standard').
  - `technicalQuestions` is stored inside the Candidate document (lines 54–60) as an array of objects containing `question`, `answer`, and `importance` (default 'Standard').
  - `jdQuestions` is stored inside the Candidate document (lines 61–77) as a subdocument containing `hrQuestions` (array of `{ question, answer, category }`), `technicalQuestions` (array of `{ question, answer, category }`), and `jdTitle`.

### Backend API Endpoints
- **Questions Generation & Ingestion**:
  1. `POST /api/candidates/:id/generate-questions`: Regenerates general questions.
  2. `POST /api/candidates/:id/generate-jd-questions`: Generates custom questions mapped to a JD description from the request body.
  3. `POST /api/candidates/upload`: Manual resume upload endpoint.
  4. `POST /api/candidates/upload/resolve`: Handles duplicate candidate resolution.
  5. `POST /api/candidates/extract-gmail`: Processes email attachments and imports resumes.
- **Candidate Detail Endpoints**:
  6. `GET /api/candidates`: List all candidates.
  7. `GET /api/candidates/:id`: Details of a specific candidate.
  8. `DELETE /api/candidates/:id`: Deletes candidate.
  9. `PATCH /api/candidates/:id/stage`: Updates candidate pipeline stage.
  10. `POST /api/candidates/:id/re-score`: Triggers re-scoring of candidate.
- **Ollama Specific Endpoints**:
  11. `POST /api/ollama/test-connection`: Tests connection to the configured Ollama URL (uses 10,000ms timeout).
  12. `GET /api/settings` and `POST /api/settings`: Read and write settings (including `ollamaUrl`, `ollamaModel`, and `ollamaEmbeddingModel`).
  13. `POST /api/rag/ask`: Interacts with the local RAG search index using Ollama embeddings.

---

## 2. Logic Chain

1. **Generation & Flow**: `parseResume` is called during manual upload or Gmail extraction. It delegates to `callAIProvider` using the large system instruction from `getRecruiterSystemInstruction(aiProvider)`. After obtaining the parsed JSON, it translates the 7-part analysis into `hrQuestions` and `technicalQuestions` using `mapAnalysisToQuestions(parsedData)`.
2. **On-Demand Flow**: When a user triggers `/generate-questions` or `/generate-jd-questions`, the system either runs the 7-part analysis or JD comparison path, returning structured questions to be stored in the database Candidate schema.
3. **Ollama Pre-processing Latency**: The system instruction for the general parsing path is ~450 words (~600 tokens) because `getRecruiterSystemInstruction` does not branch on `aiProvider === 'ollama'`. This large system prompt has to be pre-processed on every request by local Ollama instances, adding overhead.
4. **Question Length Enforcement**: Prompt rules ask for "concise, direct, and short (strictly under 15-20 words)" questions, but local models are prone to generating introductory conversational prefixes, which increases word count beyond the target length.

---

## 3. Caveats

- We did not connect to a running local Ollama instance or execute the parsing pipeline live during this investigation, relying instead on static code path analysis.
- Prompt performance changes depending on the specific local model selected (e.g., Llama3 vs. Qwen2 vs. DeepSeek).

---

## 4. Conclusion & Recommendations

### Recommendations to Optimize Ollama Prompts & Reduce Latency
1. **Implement Dynamic System Prompt Compression**:
   Update `getRecruiterSystemInstruction(aiProvider)` to return a condensed instruction when `aiProvider === 'ollama'`. This can save ~350 tokens per request:
   ```javascript
   if (aiProvider === 'ollama') {
     return `You are a senior technical interviewer. Date: ${todayDateString}. Analyze the candidate's resume and output structured JSON.
   ABSOLUTE RULES:
   - Make every question concise, direct, and short (strictly under 15-20 words). No long explanatory prefixes detailing candidate history.
   - Questions must reference specific resume details (skills, roles, projects). No generic/screening questions.
   - Generate questions in increasing difficulty.
   - Do NOT write thinking process or <thinking> tags. Output valid JSON only.
   
   Sections to generate in JSON:
   1. career_gaps: Array of objects with period, length, interview_question, sample_answer.
   2. technical_depth_audit: Array of objects with skill, has_depth (boolean), probing_question, answer_template.
   3. domain_question_bank: exactly 7 technical questions with question, model_answer, level.
   4. project_deep_dive: Array of objects with claim, follow_up_questions (array of question, model_answer).
   5. hr_questions: exactly 7 personalized behavioral/scenario questions (excluding generic/CTC questions) with question, sample_answer, personalization_note.
   6. red_flags: Array of objects with issue, severity, fix_suggestion.
   7. must_prepare_topics: Array of strings (6-10 topics).
   8. fit_summary: 2-3 sentence pitch.`;
   }
   ```
2. **Enforce Strictly Direct Questions (No Prefixes)**:
   Add explicit negative constraints and few-shot formatting examples to the Ollama prompt to prevent conversational filler:
   - *Negative Constraint*: `NEGATIVE CONSTRAINT: NEVER begin a question with introductory phrases like "Given your experience with...", "Since you worked at...", "According to your resume...", "In your role as...". Start the question directly.`
   - *Few-shot Examples*:
     - `Incorrect (do NOT generate): "Given your experience with React at ACME, how do you handle state management?"`
     - `Correct (generate): "How do you optimize state management in a large React application?"`
3. **Align `num_predict` parameter with guidelines**:
   Change `dynamicNumPredict = 3072` (in `server/geminiParser.js` line 844) to `2048` for complex resume parsing tasks to avoid unnecessary token generation latency.

---

## 5. Verification Method

To verify the endpoints, database schema, and test integration:
1. **Inspect Mongoose Schema**: Verify file `server/models.js` to inspect `hrQuestions` (line 47), `technicalQuestions` (line 54), and `jdQuestions` (line 61) schemas.
2. **Verify Endpoints**: Verify that tests run successfully by navigating to `/server` and executing:
   ```bash
   npm run test:e2e
   ```
   Or run the specific unit/integration test for question generation:
   ```bash
   npx vitest run ../tests/e2e/regenerateQuestions.test.js --config ../tests/e2e/vitest.config.js
   ```
