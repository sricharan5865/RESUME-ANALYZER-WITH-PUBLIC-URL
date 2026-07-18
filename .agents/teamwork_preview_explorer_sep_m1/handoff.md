# Handoff Report — Question Separation and E2E Test MongoDB Configuration

## 1. Observation
1. **Normal Candidate Question Processing**:
   * File `server/geminiParser.js` at line 1913 calls `mapAnalysisToQuestions(parsedData, true);` in `generateQuestionsForCandidate`.
   * File `server/geminiParser.js` at line 1089 defines:
     `const hrQuestions = isJdMatch ? slicedPersonalized : [...fixedScreening, ...slicedPersonalized];`
2. **Database Schema & Frontend Drawer**:
   * File `server/models.js` at lines 61-77 defines `candidate.jdQuestions` with `hrQuestions`, `technicalQuestions`, and `jdTitle`.
   * File `client/src/components/CandidateDetails.jsx` at line 899 renders the JD questions section under the condition:
     `{useJobMatch && (job || candidate.jdRequirements) && (`
     And at line 952 renders general questions under the condition:
     `{((candidate.hrQuestions && candidate.hrQuestions.length > 0) || (candidate.technicalQuestions && candidate.technicalQuestions.length > 0)) ? (`
3. **E2E Test Connections**:
   * File `tests/e2e/testServerEntry.js` at line 3 sets:
     `process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/talentflow_test?authSource=admin';`
   * File `tests/e2e/setup.js` at line 5 sets:
     `const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/talentflow_test?authSource=admin';`
   * Running `npm run test:e2e` outputted:
     `MongooseError: Operation settings.findOne() buffering timed out after 10000ms` because no MongoDB instance is running on port 27017.

---

## 2. Logic Chain
1. When a candidate has no job associated or we generate general questions, `generateQuestionsForCandidate(candidate, null)` is called.
2. Because the second argument of `mapAnalysisToQuestions(parsedData, true)` in `generateQuestionsForCandidate` is hardcoded to `true`, the function sets `isJdMatch = true`.
3. Consequently, the mapping uses `hrQuestions = slicedPersonalized` (7 questions) instead of `[...fixedScreening, ...slicedPersonalized]` (14 questions).
4. Changing the second parameter to `false` at line 1913 will correct this behaviour, ensuring general questions have the full 14-question set (7 screening + 7 personalized).
5. The `Candidate` model's `jdQuestions` schema and the frontend UI in `CandidateDetails.jsx` are already correctly structured and separated.
6. Spinning up `mongodb-memory-server` on port 27018 in both `testServerEntry.js` and `setup.js` (with a try-catch EADDRINUSE block to prevent conflicts between the processes) will provide a reliable, isolated test database instance on port 27018.

---

## 3. Caveats
- No direct source code changes were made to source or test files as this is a read-only investigation.
- It is assumed that `mongodb-memory-server` is in the `devDependencies` of `server/package.json` (verified: version `^11.2.0` is present).

---

## 4. Conclusion
The implementation plan is straightforward and requires:
1. Updating `server/geminiParser.js` to call `mapAnalysisToQuestions(parsedData, false)` when `jobDescription` is null or absent.
2. Updating `tests/e2e/testServerEntry.js` and `tests/e2e/setup.js` to initialize `MongoMemoryServer` on port 27018 and set the `MONGO_URI` to `mongodb://127.0.0.1:27018/talentflow_test`.

---

## 5. Verification Method
1. **Test Commands**:
   * Run the server test harness using `npm run start:test` from the `server` directory.
   * Run the test suite using `npm run test:e2e` from the `server` directory.
2. **Files to Inspect**:
   * Inspect the `analysis.md` report in this agent folder for the exact code blocks and proposed diffs.
3. **Invalidation Conditions**:
   * If `npm run test:e2e` fails with `MongooseError` timeouts, or if port 27018 throws conflict errors, the configuration of the memory server must be verified.
