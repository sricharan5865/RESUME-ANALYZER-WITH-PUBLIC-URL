# Codebase Analysis: Question Separation and E2E Test Setup

## Executive Summary
This analysis details the codebase changes required to:
1. Ensure normal candidate questions (generated when `jobDescription` is null or absent) are processed with `isJdMatch = false` to retain the 14-question standard (7 screening + 7 personalized).
2. Validate that `candidate.jdQuestions` schema stores JD-tailored questions separately, and that they are displayed in a distinct section of the frontend drawer/profile UI.
3. Update the E2E test setup (`tests/e2e/testServerEntry.js` and `tests/e2e/setup.js`) to spin up and connect to a local `mongodb-memory-server` instance running on port 27018.

---

## 1. Candidate Questions Separation (`isJdMatch = false`)

### Direct Observation
In `server/geminiParser.js`, `generateQuestionsForCandidate` currently invokes `mapAnalysisToQuestions(parsedData, true)` when `jobDescription` is null or absent:

* **File**: `server/geminiParser.js`
* **Line Number**: 1913
* **Code snippet**:
  ```javascript
  const parsedData = await callAIProvider(finalPrompt, finalSystemInstruction, finalSchema);
  mapAnalysisToQuestions(parsedData, true);
  return parsedData;
  ```

In `mapAnalysisToQuestions` (line 1089), when `isJdMatch` is `true`, the `hrQuestions` array only includes the `slicedPersonalized` questions (7 questions). When `isJdMatch` is `false`, it combines the `fixedScreening` questions with the `slicedPersonalized` ones to produce the 14-question standard:

* **File**: `server/geminiParser.js`
* **Line Number**: 1089
* **Code snippet**:
  ```javascript
  const hrQuestions = isJdMatch ? slicedPersonalized : [...fixedScreening, ...slicedPersonalized];
  ```

### Proposed Change
Modify line 1913 in `server/geminiParser.js` to pass `false` instead of `true` to `mapAnalysisToQuestions` when the job description is absent.

* **Target File**: `server/geminiParser.js`
* **Lines**: 1912 - 1914
* **Before**:
  ```javascript
  const parsedData = await callAIProvider(finalPrompt, finalSystemInstruction, finalSchema);
  mapAnalysisToQuestions(parsedData, true);
  return parsedData;
  ```
* **After**:
  ```javascript
  const parsedData = await callAIProvider(finalPrompt, finalSystemInstruction, finalSchema);
  mapAnalysisToQuestions(parsedData, false);
  return parsedData;
  ```

---

## 2. JD-Tailored Questions Schema & Frontend Verification

### Direct Schema Observation
In `server/models.js`, the `Candidate` schema stores JD-tailored questions in a separate property `jdQuestions` structure, keeping them completely distinct from the general `hrQuestions` and `technicalQuestions`:

* **File**: `server/models.js`
* **Line Numbers**: 61 - 77
* **Code snippet**:
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

### Direct Frontend Observation
In `client/src/components/CandidateDetails.jsx`, the JD-tailored questions and general questions are rendered in two completely separate UI blocks:

1. **JD-Relevant Questions Section** (rendered only when `useJobMatch` is true, indicating a JD context):
   * **Line Numbers**: 899 - 950
   * **Code snippet**:
     ```javascript
     {/* JD-Specific Interview Questions (from JD Match) */}
     {useJobMatch && (job || candidate.jdRequirements) && (
       <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
         <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8' }}>
           📋 JD-Relevant Questions {(job?.title || candidate.jdTitle) ? `— ${job?.title || candidate.jdTitle}` : ''}
         </h3>
         ...
     ```

2. **General Tailored Interview Questions & Answers Section**:
   * **Line Numbers**: 952 - 1090
   * **Code snippet**:
     ```javascript
     {/* HR & Technical Interview Questions */}
     {((candidate.hrQuestions && candidate.hrQuestions.length > 0) || 
       (candidate.technicalQuestions && candidate.technicalQuestions.length > 0)) ? (
       <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
         <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-secondary)' }}>
           <Sparkles size={16} /> Tailored Interview Questions & Answers
         </h3>
         ...
     ```

### Verification
No database schema or frontend changes are needed here. The separation is already implemented correctly: `jdQuestions` stores JD-tailored questions separately in the DB, and the frontend renders them under a distinct "📋 JD-Relevant Questions" header.

---

## 3. E2E Test MongoDB Memory Server Configuration (Port 27018)

### Direct Observation
Currently, `tests/e2e/testServerEntry.js` and `tests/e2e/setup.js` attempt to connect to a default local MongoDB instance on port 27017 or whatever is provided in `process.env.MONGO_URI`. If no local MongoDB is running on port 27017, the test suite hangs or crashes with a buffering timeout error.

### Proposed Changes

#### A. Update `tests/e2e/testServerEntry.js`
Start `MongoMemoryServer` on port 27018 before importing the server entry point.

* **Target File**: `tests/e2e/testServerEntry.js`
* **Lines**: 1 - 7
* **Before**:
  ```javascript
  // Set test environments
  process.env.PORT = '5001';
  process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/talentflow_test?authSource=admin';
  process.env.AI_PROVIDER = 'gemini'; // Force to Gemini or whatever to hit the mock
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'dummy_gemini_api_key';
  process.env.NODE_ENV = 'test';
  ```
* **After**:
  ```javascript
  import { MongoMemoryServer } from 'mongodb-memory-server';

  // Set test environments
  process.env.PORT = '5001';
  process.env.AI_PROVIDER = 'gemini'; // Force to Gemini or whatever to hit the mock
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'dummy_gemini_api_key';
  process.env.NODE_ENV = 'test';

  console.log('Starting local mongodb-memory-server on port 27018...');
  let mongoServer;
  try {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27018,
        dbName: 'talentflow_test'
      }
    });
    process.env.MONGO_URI = mongoServer.getUri();
    console.log(`mongodb-memory-server started at: ${process.env.MONGO_URI}`);
  } catch (err) {
    console.warn("=== Could not start mongodb-memory-server in testServerEntry:", err.message);
    process.env.MONGO_URI = 'mongodb://127.0.0.1:27018/talentflow_test';
  }

  const handleExit = async () => {
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(0);
  };

  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
  ```

#### B. Update `tests/e2e/setup.js`
Modify the test setup to conditionally connect to the memory server on port 27018. If vitest is run alone, it will spin up `MongoMemoryServer` on port 27018; if the server is already running (e.g., started by `testServerEntry.js`), it will catch the `EADDRINUSE` error and connect to it directly.

* **Target File**: `tests/e2e/setup.js`
* **Lines**: 1 - 13
* **Before**:
  ```javascript
  import { beforeAll, beforeEach, afterAll } from 'vitest';
  import mongoose from 'mongoose';
  import { Candidate, Job, ProcessedEmail, Settings, IngestionLog, EmailLog, ResumeChunk, AICache } from '../../server/models.js';

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/talentflow_test?authSource=admin';

  beforeAll(async () => {
    console.log("=== setup.js beforeAll: Connecting to MongoDB ===");
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }
  });
  ```
* **After**:
  ```javascript
  import { beforeAll, beforeEach, afterAll } from 'vitest';
  import mongoose from 'mongoose';
  import { MongoMemoryServer } from 'mongodb-memory-server';
  import { Candidate, Job, ProcessedEmail, Settings, IngestionLog, EmailLog, ResumeChunk, AICache } from '../../server/models.js';

  let mongoServer;
  const MONGO_URI = 'mongodb://127.0.0.1:27018/talentflow_test';

  beforeAll(async () => {
    console.log("=== setup.js beforeAll: Connecting to MongoDB ===");
    try {
      mongoServer = await MongoMemoryServer.create({
        instance: {
          port: 27018,
          dbName: 'talentflow_test'
        }
      });
      console.log("=== Started local mongodb-memory-server on port 27018 ===");
    } catch (err) {
      if (err.message && err.message.includes('EADDRINUSE')) {
        console.log("=== Port 27018 is already in use, assuming mongodb-memory-server is already running ===");
      } else {
        console.warn("=== Could not start mongodb-memory-server: ", err.message);
      }
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }
  });
  ```

* **Lines**: 31 - 36
* **Before**:
  ```javascript
  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
  ```
* **After**:
  ```javascript
  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });
  ```
