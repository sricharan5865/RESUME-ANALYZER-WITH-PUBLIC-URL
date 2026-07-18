# Codebase Investigation Handoff Report — Candidate Profile & JD Questions Integration

This report details the frontend candidate profile component investigation, specifically focusing on how questions are rendered, where they are triggered or regenerated, and how to integrate the "Construct questions according to JD Match" button on-demand under the JD match context.

---

## 1. Observation

### 1.1 Candidate Profile/Details Component Location and Instantiation
- **File Path**: `client/src/components/CandidateDetails.jsx`
- **Instantiation**: In `client/src/App.jsx` at lines 841-858, under the drawer overlay:
  ```jsx
  {/* Drawer Overlay: Candidate Details */}
  {selectedCandidate && (
    <CandidateDetails 
      candidate={selectedCandidate}
      job={jobs.find(j => j.id === selectedCandidate.jobId)}
      onClose={() => setSelectedCandidate(null)}
      onOpenEmailModal={(c) => {
        setSelectedCandidate(null);
        setEmailCandidate(c);
      }}
      onStageChanged={handleStageChanged}
      onCandidateDeleted={handleCandidateDeleted}
      backendUrl={BACKEND_URL}
      rankAccordingToJob={rankAccordingToJob}
      currentRole={mappedRole}
      token={token}
    />
  )}
  ```

### 1.2 Rendering of Behavioral & Technical Questions
Within `client/src/components/CandidateDetails.jsx`:
- **JD-Specific Questions (Section A)** (lines 899-950):
  Renders if `useJobMatch` is `true` (see bug note below) and either `job` or `candidate.jdRequirements` is present.
  - If `hasJdQuestions` is `true` (meaning `candidate.jdQuestions` has populated arrays), it maps:
    - `candidate.jdQuestions.hrQuestions` (lines 911-917): Displays question and expected answer (violet-themed).
    - `candidate.jdQuestions.technicalQuestions` (lines 924-930): Displays question and expected answer (green-themed).
  - If `hasJdQuestions` is `false`, it renders a placeholder card (lines 934-946) with a button "Generate JD-Relevant Questions".
- **General Questions (Section B)** (lines 952-1154):
  Renders if `candidate.hrQuestions` or `candidate.technicalQuestions` is populated. Uses a sub-tab toggle state `qaSubTab` ('hr' or 'tech') to toggle between:
  - Behavioral & HR questions mapped from `candidate.hrQuestions` (lines 1007-1071).
  - Technical & Domain questions mapped from `candidate.technicalQuestions` (lines 1073-1137).
  - Importance styling is evaluated via `getQuestionStyles(q.importance)` (lines 4-64).

### 1.3 Question Generation Triggers
- **JD-Specific Questions**:
  1. In `CandidateDetails.jsx` (lines 938-945), when `hasJdQuestions` is false, clicking "Generate JD-Relevant Questions" calls `handleGenerateJdQuestions`.
  2. In `client/src/components/RAGSearch.jsx` (lines 74-104), expanding a candidate in the JD results automatically calls the backend tail-end endpoint:
     `POST ${BACKEND_URL}/api/candidates/${candidateId}/generate-jd-questions`
- **General Questions**:
  - The backend defines `POST /api/candidates/:id/generate-questions` (in `server/server.js` at line 1875).
  - However, **this endpoint is NOT called anywhere in the frontend client source code**. General candidate questions are only generated during initial resume parser ingestion (returned by `parseResume()` in `server/server.js`). There is currently no manual regeneration button in the UI for general questions.

### 1.4 Code Bug Identified
- **File**: `client/src/components/CandidateDetails.jsx`
- **Line 446**:
  ```javascript
  const useJobMatch = rankAccordingToJob && !isGeneralRole;
  ```
- **Finding**: `isGeneralRole` is used on line 446 but is **not defined** anywhere in the file or client scope, resulting in an undefined ReferenceError or incorrect state evaluation.

---

## 2. Logic Chain

1. **Bug Resolution**:
   - The UI header at line 591 specifies: `job ? job.title : 'General Role'`.
   - Therefore, a candidate is in a General Role when no active job matching context is loaded (i.e. `job` is null or undefined).
   - *Conclusion*: We must define `const isGeneralRole = !job;` prior to line 446.

2. **Conditions for the "Construct questions according to JD Match" Button**:
   - The button should be available in JD match context.
   - The JD match context is determined by `useJobMatch` evaluating to `true`.
   - Currently, the button is only shown inside a placeholder when `hasJdQuestions` is `false`. Once generated, the placeholder disappears, and the button is hidden.
   - To support "on-demand" regeneration, we must expose the button even when `hasJdQuestions` is `true`.
   - *Conclusion*: The button should render under the `useJobMatch` block, positioned next to or inside the section header, regardless of `hasJdQuestions` status.

3. **Backend Communication on Button Click**:
   - `CandidateDetails.jsx` already has a handler method `handleGenerateJdQuestions` (lines 246-279) which correctly calls `POST /api/candidates/:id/generate-jd-questions` passing `jdTitle`, `jdRequirements`, and `jdDescription`.
   - *Conclusion*: Clicking the new button should trigger this existing `handleGenerateJdQuestions` handler.

---

## 3. Caveats
- This investigation is strictly read-only; no code was modified.
- The backend `/api/candidates/:id/generate-questions` (general questions regeneration) remains unmapped in the frontend UI. If the orchestrator also wishes to allow manual regeneration of general questions, a separate button should be added to the behavioral/technical tab section (Section B) pointing to that endpoint.

---

## 4. Conclusion
To display the "Construct questions according to JD Match" button on-demand under the JD match context:
1. Define the missing variable `isGeneralRole` inside `CandidateDetails.jsx`:
   ```javascript
   const isGeneralRole = !job;
   ```
2. Modify the "JD-Relevant Questions" header in `CandidateDetails.jsx` (lines 899-903) to a flex container and display the button:
   ```jsx
   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
     <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', margin: 0 }}>
       📋 JD-Relevant Questions {(job?.title || candidate.jdTitle) ? `— ${job?.title || candidate.jdTitle}` : ''}
     </h3>
     <button 
       className="btn btn-secondary"
       style={{ 
         padding: '6px 12px', 
         fontSize: '11px', 
         display: 'flex', 
         alignItems: 'center', 
         gap: '6px',
         border: '1px solid rgba(129, 140, 248, 0.3)',
         background: 'rgba(129, 140, 248, 0.1)',
         color: '#818cf8',
         fontWeight: '600'
       }}
       onClick={handleGenerateJdQuestions}
       disabled={loadingJdQuestions}
     >
       <Sparkles size={12} />
       {loadingJdQuestions ? 'Constructing...' : 'Construct questions according to JD Match'}
     </button>
   </div>
   ```
3. Rendering Conditions:
   - Render the button when `useJobMatch` is `true`.
   - Render the button irrespective of the value of `hasJdQuestions`, enabling manual on-demand updates.

---

## 5. Verification Method

### 5.1 Independent Code Inspection
- Inspect `client/src/components/CandidateDetails.jsx` around lines 440-447 to verify `isGeneralRole` usage.
- Inspect `client/src/components/CandidateDetails.jsx` around lines 898-950 to verify the JD-Relevant Questions section layout.

### 5.2 Verification of Backend Route
- Ensure the server is running, and run the E2E tests:
  ```bash
  cd server
  npm run test:e2e
  ```
  Specifically, `tests/e2e/regenerateQuestions.test.js` covers endpoint verification.
