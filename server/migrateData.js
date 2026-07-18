import fs from 'fs';
import mongoose from 'mongoose';
import { Candidate, Job, Settings, ProcessedEmail } from './models.js';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://admin:password@127.0.0.1:27017/talentflow?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for migration:', mongoUri);

    if (fs.existsSync('db.json')) {
      const data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
      
      // Migrate Jobs
      if (data.jobs && data.jobs.length > 0) {
        for (const job of data.jobs) {
          await Job.updateOne({ id: job.id }, { $set: job }, { upsert: true });
        }
        console.log(`Migrated ${data.jobs.length} jobs.`);
      }

      // Migrate Candidates
      if (data.candidates && data.candidates.length > 0) {
        for (const candidate of data.candidates) {
          await Candidate.updateOne({ id: candidate.id }, { $set: candidate }, { upsert: true });
        }
        console.log(`Migrated ${data.candidates.length} candidates.`);
      }

      // Migrate Settings
      if (data.settings) {
        await Settings.updateOne({ _id: 'global' }, { $set: data.settings }, { upsert: true });
        console.log('Migrated settings.');
      }
    }

    console.log('Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
