import { beforeAll, beforeEach, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Candidate, Job, ProcessedEmail, Settings, IngestionLog, EmailLog, ResumeChunk } from '../../server/models.js';

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

beforeEach(async () => {
  console.log("=== setup.js beforeEach: Clearing collections ===");
  if (mongoose.connection.readyState !== 0) {
    await Promise.all([
      Candidate.deleteMany({}),
      Job.deleteMany({}),
      ProcessedEmail.deleteMany({}),
      Settings.deleteMany({}),
      IngestionLog.deleteMany({}),
      EmailLog.deleteMany({}),
      ResumeChunk.deleteMany({})
    ]);
    console.log("=== setup.js beforeEach: Collections cleared successfully ===");
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});
