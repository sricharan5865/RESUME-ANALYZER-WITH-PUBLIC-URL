## 2026-07-16T10:52:36Z
You are an Implementation Worker for Question Separation and Port 27018 E2E Test.
Your working directory is c:\Users\sri charan\Documents\projects\hr recruter\.agents\teamwork_preview_worker_sep_m2.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please execute the following code changes:

1. Update `server/geminiParser.js`:
   At line 1913, change mapAnalysisToQuestions call from:
   `mapAnalysisToQuestions(parsedData, true);`
   to:
   `mapAnalysisToQuestions(parsedData, false);`
   This ensures that regenerating normal candidate questions keeps isJdMatch = false and retains the 14 questions (7 screening + 7 personalized).

2. Update `tests/e2e/testServerEntry.js`:
   Import `MongoMemoryServer` and start it on port 27018 before importing the server. Set `process.env.MONGO_URI` to the URI of the started in-memory MongoDB. Register SIGINT/SIGTERM handlers to stop the MongoMemoryServer.
   Here is the code layout:
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

3. Update `tests/e2e/setup.js`:
   Modify beforeAll and afterAll to start MongoMemoryServer on port 27018 (handling EADDRINUSE if testServerEntry already started it) and stop it at the end:
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
   And change afterAll:
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

4. Update `client/src/components/CandidateDetails.jsx`:
   - Declare state `const [loadingQuestions, setLoadingQuestions] = useState(false);`
   - Implement `handleGenerateQuestions` handler:
     ```javascript
     const handleGenerateQuestions = async () => {
       setLoadingQuestions(true);
       try {
         const res = await fetch(`${backendUrl}/api/candidates/${candidate.id}/generate-questions`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${token}`
           }
         });
         if (res.ok) {
           const updatedCandidate = await res.json();
           setCandidate(updatedCandidate);
         } else {
           console.error('Failed to regenerate questions:', res.statusText);
         }
       } catch (err) {
         console.error('Failed to regenerate questions:', err);
       } finally {
         setLoadingQuestions(false);
       }
     };
     ```
   - Render the "Regenerate Questions" button in the general "Tailored Interview Questions & Answers" section header. Check if currentRole !== 'Hiring Manager' before rendering.

After applying the changes, run the E2E tests:
- Navigate to `c:\Users\sri charan\Documents\projects\hr recruter\server` and run `npm run test:e2e` to verify that all E2E tests pass correctly on the local port 27018 MongoDB in-memory database instance.
Write your changes and test execution outputs to c:\Users\sri charan\Documents\projects\hr recruter\.agents\teamwork_preview_worker_sep_m2\handoff.md. Notify the orchestrator (conversation ID: de87e3b0-5952-4126-8eb5-e9c7485b49e2) when complete.
