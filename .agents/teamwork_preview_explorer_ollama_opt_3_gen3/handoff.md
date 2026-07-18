# Handoff Report — JD Match and On-Demand Question Gen Exploration

## 1. Observation

During our codebase exploration, we observed the following components, lines of code, and configurations:

### A. UI Components for JD Match & Toggle Configs
* **`client/src/components/RAGSearch.jsx` (Lines 74–104)**: Initiates on-demand JD match question generation via the `toggleQuestions` function:
  ```javascript
  const toggleQuestions = async (candidateId) => {
    // ...
    const res = await fetch(`${BACKEND_URL}/api/candidates/${candidateId}/generate-jd-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ jdTitle, jdRequirements, jdDescription })
    });
    // ...
  };
  ```
  It also runs the core matching via `/api/rag/jd-search` (Lines 117–130) which returns matched candidates with `questions: null` (lazy-loaded).

* **`client/src/App.jsx` (Lines 58, 253–270, 701–735)**:
  * Manages the global ranking toggle state: `const [rankAccordingToJob, setRankAccordingToJob] = useState(false);`
  * Updates settings on the backend via `/api/settings` POST call inside `handleToggleRankingMode`:
    ```javascript
    const handleToggleRankingMode = async () => {
      const newVal = !rankAccordingToJob;
      setRankAccordingToJob(newVal);
      await fetch(`${BACKEND_URL}/api/settings`, {
        method: 'POST',
        headers: { ... },
        body: JSON.stringify({ rankAccordingToJob: newVal })
      });
    };
    ```
  * Distributes this toggle state to child views: `PipelineBoard`, `CandidateDetails`, `Dashboard`, and `TagSearch` as a prop.

* **`client/src/components/PipelineBoard.jsx` (Lines 143–146)**:
  * Sorts and scores candidates based on the ranking mode:
    ```javascript
    const getCandidateScore = (c) => {
      return rankAccordingToJob ? c.matchScore : (c.ownCategoryScore ?? c.matchScore);
    };
    ```

* **`client/src/components/CandidateDetails.jsx` (Lines 446–470)**:
  * Dynamically swaps display fields in the detailed candidate modal sidebar depending on `rankAccordingToJob`:
    ```javascript
    const useJobMatch = rankAccordingToJob && !isGeneralRole;
    const score = useJobMatch ? candidate.matchScore : (candidate.ownCategoryScore || candidate.matchScore);
    const reasoning = useJobMatch ? candidate.matchExplanation : (candidate.ownCategoryExplanation || candidate.matchExplanation);
    ```

---

### B. Database Schema Mapping
* **`server/models.js` (Lines 61–77)**:
  Shows the exact schema mapping of candidate-job combination questions (`jdQuestions`) under the `Candidate` schema:
  ```javascript
  jdQuestions: {
    hrQuestions: [
      {
        question: String,
        answer: String,
        category: String
      }
    ],
    technicalQuestions: [
      {
        question: String,
        answer: String,
        category: String
      }
    ],
    jdTitle: String
  }
  ```
* **`server/models.js` (Line 138)**:
  Shows `rankAccordingToJob` in the global `Settings` schema:
  ```javascript
  rankAccordingToJob: { type: Boolean, default: true }
  ```

---

### C. Backend API & Ingestion Logic
* **`server/server.js` (Lines 2235–2267)**:
  Defines the endpoint `/api/candidates/:id/generate-jd-questions` that handles JD-specific questions generation:
  ```javascript
  app.post('/api/candidates/:id/generate-jd-questions', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
    // Fetches candidate and extracts { jdTitle, jdRequirements, jdDescription } from req.body
    // Calls generateQuestionsForCandidate(candidate, mockJob)
    // Saves into candidate.jdQuestions and returns questionsResult JSON
  });
  ```
* **`server/geminiParser.js` (Lines 1644–1747)**:
  Contains the `generateQuestionsForCandidate(candidateProfile, jobDescription)` method. If `jobDescription` is supplied, it builds a prompt comparing the candidate profile directly against the job requirements and calls the LLM with a structured JSON schema mapping `hrQuestions` and `technicalQuestions`.

* **Ingestion Flows in `server/server.js`**:
  * Manual single upload (Lines 1037–1111)
  * Manual drag-and-drop / upload (Lines 1294–1317)
  * Automated email polling/sourcing (Lines 605–707)
  
  Across all three ingestion pathways, candidates are scored using general category parameters (`scoreCandidateByOwnCategory`) and mapped to active jobs (`scoreCandidate`), but **no JD-specific interview questions are generated during ingestion**. The fields `interviewQuestions`, `hrQuestions`, and `technicalQuestions` populated during ingestion are candidate-only general screening questions.

---

## 2. Logic Chain

1. **Global Toggle sharing**:
   * *Observation*: `rankAccordingToJob` is maintained as React state in `App.jsx`, persisted to MongoDB via the `/api/settings` route, and passed down as a prop to components.
   * *Inference*: Changes to this toggle dynamically alter candidate sorting criteria on the `PipelineBoard`, `Dashboard`, and `TagSearch`, and toggle the evaluation display (JD-specific matching details vs. general competency details) in `CandidateDetails`.

2. **Database mapping**:
   * *Observation*: `Candidate.jdQuestions` schema maps `hrQuestions` and `technicalQuestions` (each containing `question`, `answer`, `category`) along with a `jdTitle` string.
   * *Inference*: This sub-document stores candidate-job combination questions separately from `Candidate.hrQuestions` and `Candidate.technicalQuestions` (which represent general resume-only screening questions).

3. **Ingestion Separation**:
   * *Observation*: Ingestion flows (lines 605, 1037, 1294) trigger general parsing and resume scoring, but never call the JD-specific question generation route or core function (`generateQuestionsForCandidate(candidate, mockJob)`).
   * *Inference*: On-demand JD-relevant questions are decoupled from ingestion, preventing latency spikes and excessive token usage during candidate imports.

4. **Endpoint Integration**:
   * *Observation*: There is already an endpoint `/api/candidates/:id/generate-jd-questions` that generates tailored JD questions on demand.
   * *Inference*: If a new backend endpoint `/api/candidates/:id/generate-questions-jd` is requested, it can be registered in `server/server.js` alongside `/api/candidates/:id/generate-jd-questions` or `/api/candidates/:id/generate-questions` (line 1930). It should invoke `generateQuestionsForCandidate(candidate, mockJob)` with parameters extracted from `req.body`.

---

## 3. Caveats

* **Other AI Providers**: The system checks `settings.aiProvider` and supports `gemini`, `openai`, `claude`, and `ollama`. System instructions are optimized slightly depending on whether local `ollama` is used.
* **Role Permissions**: Candidate question generation routes require authentication and specific RBAC roles (`admin`, `recruiter`), so any new endpoint must apply the `authenticateToken` and `requireRole(['admin', 'recruiter'])` middlewares.

---

## 4. Conclusion

1. **JD Match Views**: Handled in the frontend by `RAGSearch.jsx` (providing the JD Match form and lazy-loading questions when expanding candidate matches) and `CandidateDetails.jsx` (rendering evaluation details).
2. **Global Toggle**: Managed in `App.jsx` as `rankAccordingToJob`, stored in database Settings, and distributed as props.
3. **Database Schema**: Questions are stored in `Candidate.jdQuestions` with distinct technical and HR lists, plus the matched `jdTitle`.
4. **On-Demand Generation Signature**:
   * **Method**: `POST`
   * **Route**: `/api/candidates/:id/generate-questions-jd` or `/api/candidates/:id/generate-jd-questions`
   * **Headers**: `Content-Type: application/json`, `Authorization: Bearer <token>`
   * **Body**: `{ "jdTitle": "...", "jdRequirements": "...", "jdDescription": "..." }`
   * **Response**: JSON matching the `jdSchema` (`hrQuestions` and `technicalQuestions` arrays).
5. **Ingestion Hooking**: Decoupling is already achieved since question generation is only called in dedicated POST routes, keeping the ingestion pipelines completely free from job-specific interview question LLM queries.

---

## 5. Verification Method

1. **Verify schemas**:
   Inspect `server/models.js` and verify that the `Candidate` schema contains `jdQuestions` (lines 61-77).
2. **Verify endpoints**:
   Inspect `server/server.js` and verify the `/api/candidates/:id/generate-jd-questions` route exists at line 2235.
3. **Verify ingestion flows**:
   Trace the routes `/api/candidates/upload` (line 1255) and email-sourcing routes (lines 605, 1037) to verify that `generateQuestionsForCandidate` is never called with a job object during ingestion.
