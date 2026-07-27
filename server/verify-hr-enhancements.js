import mongoose from 'mongoose';
import { Candidate, Job } from './models.js';

console.log('--- Verifying HR Feedback Model Enhancements ---');

const testCand = new Candidate({
  id: 'cand-test-hr-1',
  name: 'Ananya Sharma',
  email: 'ananya.sharma@example.com',
  phone: '+91 9876543210',
  currentCtc: '14 LPA',
  expectedCtc: '18 LPA',
  noticePeriod: '30 days',
  jobId: 'job-gis-spec',
  skills: ['ArcGIS Pro', 'Spatial Analysis', 'Python']
});

console.log('✓ Candidate Schema initialized successfully');
console.log('  Name:', testCand.name);
console.log('  Current CTC:', testCand.currentCtc);
console.log('  Expected CTC:', testCand.expectedCtc);
console.log('  Notice Period:', testCand.noticePeriod);

if (testCand.currentCtc === '14 LPA' && testCand.expectedCtc === '18 LPA' && testCand.noticePeriod === '30 days') {
  console.log('✓ ALL MODEL FIELDS MATCH HR ENHANCEMENT REQUIREMENTS!');
  process.exit(0);
} else {
  console.error('✗ FIELD MISMATCH ENCOUNTERED!');
  process.exit(1);
}
