import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Job } from './models.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mongoUri = process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/talentflow?authSource=admin';

async function seedJobs() {
  console.log('Connecting to MongoDB at:', mongoUri);
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
  } catch (err) {
    console.warn('Initial MongoDB connect failed, trying fallback URI...');
    await mongoose.connect('mongodb://127.0.0.1:27017/talentflow', { serverSelectionTimeoutMS: 5000 });
  }

  const jsonPath = path.join(__dirname, 'jds.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('jds.json file not found at:', jsonPath);
    process.exit(1);
  }

  const jobsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Found ${jobsData.length} job descriptions to seed.`);

  let inserted = 0;
  let updated = 0;

  for (const job of jobsData) {
    const res = await Job.updateOne(
      { id: job.id },
      { $set: job },
      { upsert: true }
    );
    if (res.upsertedCount > 0) {
      inserted++;
    } else {
      updated++;
    }
  }

  console.log(`\n🎉 Job Seeding Complete!`);
  console.log(`Total roles processed: ${jobsData.length}`);
  console.log(`New roles inserted: ${inserted}`);
  console.log(`Existing roles updated: ${updated}`);

  await mongoose.disconnect();
  process.exit(0);
}

seedJobs().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
