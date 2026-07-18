# Codebase Audit Handoff Report — Ollama Optimization & Questions Audit

This report details the findings from a read-only investigation of the codebase regarding candidate question generation (HR & Technical), screening questions, ingestion routes, job description (JD) matching questions, frontend components, and Ollama optimizations.

---

## 1. Observation

We have directly inspected the following files in the project workspace:
* `server/geminiParser.js` — General/JD question generation logic and AI provider connections (including Ollama).
* `server/server.js` — Express backend endpoints, upload/email ingestion routes, duplicate resolution flow.
* `server/models.js` — Mongoose database schemas.
* `server/ollamaOptimizer.js` — Ollama prompt/schema optimization utilities.
* `client/src/App.jsx` — Frontend layout, settings storage, ranking toggle.
* `client/src/components/CandidateDetails.jsx` — Drawer component displaying questions and trigger buttons.

Below are verbatim code segments observed:

### General & Screening Questions Mapping (Regular Ingestion)
In `server/geminiParser.js`, `mapAnalysisToQuestions` maps parsed data to `hrQuestions` and `technicalQuestions`. It also defines and prepends fixed screening questions:
```javascript
function mapAnalysisToQuestions(parsedData, isJdMatch = false) {
  let personalizedHrQuestions = [];
  let technicalQuestions = [];

  // 1. Map Career Gaps → Behavioral (MUST ASK)
  if (parsedData.career_gaps && Array.isArray(parsedData.career_gaps)) {
    parsedData.career_gaps.forEach(gap => {
      if (gap.interview_question && gap.sample_answer) {
        personalizedHrQuestions.push({
          question: gap.interview_question,
          answer: gap.sample_answer,
          importance: 'MUST ASK',
          category: 'SCENARIO'
        });
      }
    });
  }

  // 2. Map HR/Behavioral Questions
  if (parsedData.hr_questions && Array.isArray(parsedData.hr_questions)) {
    parsedData.hr_questions.forEach(q => {
      if (q.question && q.sample_answer) {
        personalizedHrQuestions.push({
          question: q.question,
          answer: q.sample_answer,
          importance: 'IMPORTANT',
          category: 'BEHAVIORAL'
        });
      }
    });
  }

  // 3. Map Technical Depth Audit → Technology Verification
  if (parsedData.technical_depth_audit && Array.isArray(parsedData.technical_depth_audit)) {
    parsedData.technical_depth_audit.forEach(audit => {
      if (!audit.has_depth && audit.probing_question && audit.answer_template) {
        technicalQuestions.push({
          question: audit.probing_question,
          answer: audit.answer_template,
          importance: 'VERY IMPORTANT',
          category: 'TECH VERIFICATION'
        });
      }
    });
  }

  // 4. Map Domain Question Bank
  if (parsedData.domain_question_bank && Array.isArray(parsedData.domain_question_bank)) {
    parsedData.domain_question_bank.forEach(q => {
      if (q.question && q.model_answer) {
        technicalQuestions.push({
          question: q.question,
          answer: q.model_answer,
          importance: 'IMPORTANT',
          category: 'SCENARIO'
        });
      }
    });
  }

  // 5. Map Project Deep-Dive → Architecture questions
  if (parsedData.project_deep_dive && Array.isArray(parsedData.project_deep_dive)) {
    parsedData.project_deep_dive.forEach(proj => {
      if (proj.follow_up_questions && Array.isArray(proj.follow_up_questions)) {
        proj.follow_up_questions.forEach(q => {
          if (q.question && q.model_answer) {
            technicalQuestions.push({
              question: q.question,
              answer: q.model_answer,
              importance: 'IMPORTANT',
              category: 'ARCHITECTURE'
            });
          }
        });
      }
    });
  }

  let slicedPersonalized = personalizedHrQuestions;

  const fixedScreening = [
    { question: "Are you looking for a job?", answer: "Yes, I am actively exploring new career opportunities that align with my skillset and growth goals.", importance: "SCREENING", category: "SCREENING" },
    { question: "How many years of experience do you have?", answer: "I have professional experience as detailed in my resume, spanning my key roles.", importance: "SCREENING", category: "SCREENING" },
    { question: "What is the reason for your job change?", answer: "I am seeking a new challenge where I can contribute to impactful projects and continue growing professionally.", importance: "SCREENING", category: "SCREENING" },
    { question: "What is your current CTC?", answer: "My current compensation is aligned with the industry standard for my level, and I can discuss details as we proceed.", importance: "SCREENING", category: "SCREENING" },
    { question: "What is your expected CTC?", answer: "I am looking for a competitive offer that reflects the role's responsibilities and my experience.", importance: "SCREENING", category: "SCREENING" },
    { question: "What is your notice period?", answer: "My notice period is standard, but I will check if there is any flexibility for an early release.", importance: "SCREENING", category: "SCREENING" },
    { question: "Is your notice period negotiable? (If the notice period is 30, 60, or 90 days)", answer: "I am open to negotiating the notice period or using accrued leaves to facilitate a smooth and faster transition.", importance: "SCREENING", category: "SCREENING" }
  ];

  const hrQuestions = isJdMatch ? slicedPersonalized : [...fixedScreening, ...slicedPersonalized];

  parsedData.hrQuestions = hrQuestions;
  parsedData.technicalQuestions = technicalQuestions;
}
```

### Ingestion Routes
In `server/server.js`, manual resume upload is handled by `/api/candidates/upload` (lines 1255–1409). It extracts PDF text and calls `parseResume`:
```javascript
const parsedData = await parseResume(pdfText, pdfBase64);
```
It does not invoke JD question generation. Candidates' `hrQuestions` and `technicalQuestions` are directly populated from `parsedData` (lines 1372–1373):
```javascript
      hrQuestions: parsedData.hrQuestions || [],
      technicalQuestions: parsedData.technicalQuestions || [],
```

The email sourcing/sourcing poller (`processEmailAttachment`, lines 563-733) and manual email parsing (`/api/candidates/extract-gmail`, lines 980-1090) behave identically, mapping only the general questions returned from `parseResume`.

In the duplicate resolution endpoint `/api/candidates/upload/resolve` (lines 1411–1705):
* **`update` Action**: Retains the existing candidate profile and updates standard fields but does **NOT** overwrite the previous questions (`hrQuestions` and `technicalQuestions` are not updated).
* **`delete-before` Action**: Deletes the old candidate and creates a new candidate with the new `parsedData`:
  ```javascript
  hrQuestions: data.hrQuestions || [],
  technicalQuestions: data.technicalQuestions || [],
  ```
  No JD-specific questions are generated automatically in this flow either.

### JD-Specific Question Generation & Storage
JD questions are generated on-demand. In `server/server.js` (lines 2235–2267):
```javascript
app.post('/api/candidates/:id/generate-jd-questions', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ id: req.params.id });
    // ...
    const { jdTitle, jdRequirements, jdDescription } = req.body;
    const mockJob = { title: jdTitle || 'Role', requirements: jdRequirements || '', description: jdDescription || '' };

    const questionsResult = await generateQuestionsForCandidate(candidate.toObject(), mockJob).catch(err => {
      return { hrQuestions: [], technicalQuestions: [] };
    });

    candidate.jdQuestions = {
      hrQuestions: questionsResult.hrQuestions || [],
      technicalQuestions: questionsResult.technicalQuestions || [],
      jdTitle: mockJob.title
    };
    await candidate.save();
    res.json(questionsResult);
  } catch (error) { ... }
});
```

In `server/geminiParser.js` (lines 1644–1747), `generateQuestionsForCandidate` handles JD matching:
```javascript
export async function generateQuestionsForCandidate(candidateProfile, jobDescription = null) {
  // ...
  if (jobDescription) {
    let systemInstruction = `You are a senior technical interviewer...`;
    if (aiProvider === 'ollama') {
      systemInstruction = `Senior interviewer: Compare resume to JD. Generate 8-12 unique custom questions...`;
    }
    const existingGeneralQuestions = [
      ...(candidateProfile.hrQuestions || []).map(q => q.question),
      ...(candidateProfile.technicalQuestions || []).map(q => q.question)
    ];
    const jdSchema = {
      type: 'OBJECT',
      properties: {
        hrQuestions: { ... },
        technicalQuestions: { ... }
      },
      required: ['hrQuestions', 'technicalQuestions']
    };
    const prompt = `...`;
    return await callAIProvider(prompt, systemInstruction, jdSchema);
  }
  // ... (general questions branch)
}
```

Database schema representation in `server/models.js` (lines 61-77):
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
  },
```

### Frontend UI Components & Ranking Mode
In `client/src/App.jsx`, `rankAccordingToJob` is maintained as a state:
```javascript
const [rankAccordingToJob, setRankAccordingToJob] = useState(false);
// Toggle handles saving settings via backend and switching state
const handleToggleRankingMode = async () => {
  const newVal = !rankAccordingToJob;
  setRankAccordingToJob(newVal);
  await fetch(`${BACKEND_URL}/api/settings`, {
    method: 'POST',
    // ...
    body: JSON.stringify({ rankAccordingToJob: newVal })
  });
};
```
This is passed to `CandidateDetails.jsx`, where `useJobMatch` is calculated dynamically (lines 440–470):
```javascript
const hasJdQuestions = candidate.jdQuestions && 
  ((candidate.jdQuestions.hrQuestions && candidate.jdQuestions.hrQuestions.length > 0) || 
   (candidate.jdQuestions.technicalQuestions && candidate.jdQuestions.technicalQuestions.length > 0));

const useJobMatch = rankAccordingToJob && !isGeneralRole;
```
If `useJobMatch` is `true`, it displays "📋 JD-Relevant Questions". If `hasJdQuestions` is `false`, it shows a dashed-border card containing a **"Generate JD-Relevant Questions"** button that fires `handleGenerateJdQuestions` (calling `/api/candidates/:id/generate-jd-questions`).

In `client/src/components/Dashboard.jsx`, `PipelineBoard.jsx`, and `TagSearch.jsx`, `rankAccordingToJob` is used to determine which candidate score to display/sort by:
```javascript
const score = rankAccordingToJob ? c.matchScore : (c.ownCategoryScore ?? c.matchScore);
```

### Ollama Configurations & Optimization Audit
In `server/geminiParser.js`, inside `callAIProviderDirect` (lines 804–951):
* **Liveness check**: Calls `checkOllamaLiveness(ollamaUrl)`.
* **Prompt Construction**:
  * Appends a compact representation of the JSON schema:
    ```javascript
    let userContent = prompt;
    if (schema) {
      userContent += getCompactSchemaInstructions(schema);
    }
    ```
  * Appends instructions to avoid thinking tags:
    ```javascript
    userContent += "\n\nCRITICAL: Do NOT write any thinking process, reasoning, chain-of-thought, or <thinking> tags. Skip thinking entirely...";
    ```
* **Dynamic Parameter Sizing (`num_ctx`, `num_predict`)**:
  * Default settings: `num_ctx = 4096`, `num_predict = 2048`.
  * For complex schemas (`numProps > 10` e.g., resume parsing):
    ```javascript
    dynamicNumCtx = 8192;
    dynamicNumPredict = 3072;
    ```
  * For simple schemas (`numProps < 5` e.g., grading/tagging/scoring):
    ```javascript
    dynamicNumCtx = 2048;
    dynamicNumPredict = 256;
    ```
  * Overrides context length to `8192` if the estimated token count exceeds `3500`.
* **Format & Fallback**:
  * Uses `format: 'json'` on the first attempt if a schema is present.
  * If the response is empty, it retries without the `format: 'json'` constraint (deleting the parameter and adding a text description warning).
  * If the response JSON is truncated, it performs `statefulJsonRepair` locally.
  * If the repair fails, it retries the API request with `num_predict = 4096`.
* **Ollama Usage in Other Services**:
  * `server/emailCategorizer.js` (lines 513–546): Calls Ollama for email classification. Uses `num_ctx: 2048`, `num_predict: 256`, and `format: 'json'` constraint.
  * `server/embeddingService.js` (lines 109–159): Calls Ollama `/api/embed` (batch) or `/api/embeddings` (legacy fallback) for generating vector embeddings using `settings.ollamaEmbeddingModel` or `settings.ollamaModel`.
* **Optimization Gaps**:
  * `stripSchemaDescriptions` from `ollamaOptimizer.js` is imported in `geminiParser.js` but is **never invoked**, meaning schema descriptions are still being sent to Ollama, adding token overhead.

---

## 2. Logic Chain

1. **Candidate Parsing Flow**: Regular candidate resume upload (`POST /api/candidates/upload`), manually pulled emails (`POST /api/candidates/extract-gmail`), and poller-sourced emails (`processEmailAttachment`) all run `parseResume(pdfText, pdfBase64)` to generate general interview questions.
2. **Screening Questions Prepending**: The `parseResume` flow calls `mapAnalysisToQuestions(parsedData)` without a second argument, letting `isJdMatch` default to `false`. Therefore, the 7 standard `fixedScreening` questions (relating to job seeking, years of experience, job change reason, current/expected CTC, and notice period details) are prepended to the personalized HR questions.
3. **No Automatic JD Question Generation**: The ingestion routes construct the new Candidate document and save standard properties + general parsed questions, but never invoke `generateQuestionsForCandidate` with a job description. Scoring is done, but JD-specific questions are left empty (`jdQuestions` is not seeded).
4. **JD-Specific Generation is On-Demand**: Only when a user has the "Rank according to JD" toggle active, views the candidate drawer, and clicks the button does the application fire `/api/candidates/:id/generate-jd-questions`. This endpoint invokes `generateQuestionsForCandidate(candidate, mockJob)` and saves the result in `candidate.jdQuestions` in the database.
5. **UI Score Toggling**: The `rankAccordingToJob` state in `App.jsx` controls whether `matchScore` (against JD) or `ownCategoryScore` (profile competency score) is shown/sorted in lists. It also determines if JD-specific questions are rendered in the drawer.
6. **Ollama Optimizations**:
   * Token length overhead is addressed via `compressCandidateProfile` (removes old Q&As and redundant fields) and `getCompactSchemaInstructions` (compacts JSON schemas).
   * Context limit issues are resolved by dynamic sizing (`num_ctx` ranges from 2048 to 8192).
   * Token truncation is prevented by blocking thinking/reasoning tags, utilizing `statefulJsonRepair` to recover truncated outputs, and retrying once with an increased `num_predict` (up to 4096) if repair fails.
   * `stripSchemaDescriptions` is imported but not called, which represents a remaining source of token overhead when using Ollama.

---

## 3. Caveats

* We have not run local performance benchmarks of the Ollama parser execution speed (this requires setting up a local Ollama instance and executing the python/JS test scripts).
* We assume the MongoDB database contains matching models and records structure as described in `models.js` and `db.json`.
* We did not explore alternative AI models besides Gemini, OpenAI, Claude, and Ollama.

---

## 4. Conclusion

1. **Parsing & Screening Questions**: General candidate questions are generated by the LLM during ingestion, and standard screening questions are prepended to the HR list only in the general parsing flow (where `isJdMatch` is `false`).
2. **Ingestion & JD Auto-generation**: Ingestion routes do not automatically generate JD questions. They must be triggered on-demand via the UI or by making a POST call to `/api/candidates/:id/generate-jd-questions`.
3. **Storage**: Mapped questions are stored in `hrQuestions` and `technicalQuestions` arrays inside the `Candidate` schema. JD-specific questions are stored in a dedicated `jdQuestions` sub-document with its own `hrQuestions` and `technicalQuestions` sub-arrays.
4. **Ollama Execution Performance**: The current setup optimizes prompt sizes by compressing candidate profiles and compacting JSON schema instructions. However, `stripSchemaDescriptions` is not actively used. Sizing and prediction boundaries are dynamically scaled based on request complexity, and truncated JSON recovery is handled robustly via a custom scanner (`statefulJsonRepair`).

---

## 5. Verification Method

To verify these findings:
1. **Inspection**:
   * Confirm the screening questions phrasing in `server/geminiParser.js` lines 1039–1047.
   * Confirm the `isJdMatch` evaluation condition at `server/geminiParser.js` line 1049.
   * Verify the `/api/candidates/:id/generate-jd-questions` endpoint definition in `server/server.js` lines 2235–2267.
   * Inspect the `CandidateDetails.jsx` drawer rendering sections for `useJobMatch` and `hasJdQuestions` at lines 898–949.
   * Verify that `stripSchemaDescriptions` is imported on line 4 of `server/geminiParser.js` but is not referenced elsewhere in the file.
2. **Running Tests**:
   * Navigate to `server/` directory and run vitest E2E tests:
     ```bash
     npm run test:e2e
     ```
   * To run specific E2E tests:
     ```bash
     npx vitest run ../tests/e2e/regenerateQuestions.test.js --config ../tests/e2e/vitest.config.js
     npx vitest run ../tests/e2e/duplicateResolution.test.js --config ../tests/e2e/vitest.config.js
     ```
