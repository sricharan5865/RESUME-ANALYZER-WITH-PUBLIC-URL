# Plan - Question Separation and E2E Test Setup Update

## Objective
Ensure candidate question generation keeps normal screening/personalized questions separate from JD-tailored questions, and update E2E tests to run on port 27018 using a local `mongodb-memory-server`.

## Milestones & Steps

### Milestone 1: Exploration and Analysis
- **Goal**: Identify files, logic, schema definitions, and E2E test setup files.
- **Action**: Spawn `teamwork_preview_explorer` to analyze:
  1. `server/geminiParser.js` (question generation, `mapAnalysisToQuestions` call logic, `regenerate-questions` route handling).
  2. Mongoose models/schemas (candidate definition, arrays for questions, `jdQuestions`).
  3. Frontend components (drawer UI, candidate detail page) to ensure JD questions are rendered in a distinct section.
  4. `tests/e2e/testServerEntry.js` and `tests/e2e/setup.js` (MongoDB configuration, port settings, memory server startup).
- **Deliverable**: Analysis report showing current state and detailed plan for changes.

### Milestone 2: Implementation of Fixes
- **Goal**: Apply the code modifications surgically without regressions.
- **Action**: Spawn `teamwork_preview_worker` to:
  1. Update backend `geminiParser.js` to ensure normal candidate questions (where `jobDescription` is null/absent) are always generated with `isJdMatch = false` and prepend the 7 cold-calling questions correctly.
  2. Verify schema stores `jdQuestions` properly.
  3. Verify/update client UI to display JD-relevant questions separately in the drawer or profile UI.
  4. Update `tests/e2e/testServerEntry.js` and `tests/e2e/setup.js` to configure and launch a local `mongodb-memory-server` on port 27018.
- **Deliverable**: Modified files list with verification that the server runs without errors.

### Milestone 3: Testing and Verification
- **Goal**: Run E2E test suite and manually verify question generation formats.
- **Action**: Spawn `teamwork_preview_worker` to:
  1. Start the test server/application.
  2. Run `npm run test:run` to verify that all 39 tests pass successfully on port 27018 with `mongodb-memory-server`.
  3. Verify resume parsing outputs 14 questions (7 fixed + 7 custom) and JD generation outputs separate questions.

### Milestone 4: Review and Audit
- **Goal**: Quality check and integrity validation.
- **Action**:
  1. Spawn `teamwork_preview_reviewer` to check codebase compliance, ensuring no unintended edits or regressions.
  2. Spawn `teamwork_preview_auditor` to run integrity checks (ensuring no hardcoding of test results or bypassing of logic).
- **Deliverable**: Clean audit reports.

### Milestone 5: Handoff and Completion
- **Goal**: Document outcomes and notify parent agent.
- **Action**: Write `handoff.md` and send completion message to `main agent`.
