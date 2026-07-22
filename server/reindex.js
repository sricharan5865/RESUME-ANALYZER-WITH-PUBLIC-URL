import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Candidate } from './models.js';
import { indexCandidate } from './ragService.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  const candidates = await Candidate.find();
  console.log(`Found ${candidates.length} candidates. Re-indexing...`);
  
  for (const cand of candidates) {
    try {
      const chunks = await indexCandidate(cand);
      console.log(`Indexed ${cand.name}: ${chunks} chunks generated.`);
    } catch (e) {
      console.error(`Failed to index ${cand.name}:`, e.message);
    }
  }
  
  console.log('Done!');
  process.exit(0);
}

run();
