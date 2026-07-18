import mongoose from 'mongoose';
import { Candidate, Job } from './models.js';
import { scoreCandidate } from './geminiParser.js';

mongoose.connect('mongodb://admin:password@localhost:27017/talentflow?authSource=admin')
  .then(async () => {
    console.log('Connected to DB!');
    
    // Find all candidates currently assigned to any job
    const assignedCandidates = await Candidate.find({ 
      jobId: { $ne: null, $exists: true, $ne: "" }
    });

    console.log(`Found ${assignedCandidates.length} assigned candidates to re-evaluate...`);

    for (const candidate of assignedCandidates) {
      console.log(`Re-scoring candidate: ${candidate.name} for job: ${candidate.jobId}...`);
      
      const job = await Job.findOne({ id: candidate.jobId });
      if (!job) {
        console.log(`- Job ${candidate.jobId} not found, skipping.`);
        continue;
      }

      const parsedData = {
        name: candidate.name,
        email: candidate.email,
        skills: candidate.skills,
        experience: candidate.experience,
        education: candidate.education,
        seniorityLevel: candidate.seniorityLevel,
        projects: candidate.projects
      };

      try {
        const scoringResult = await scoreCandidate(parsedData, job);
        console.log(`- New match score: ${scoringResult.score}%`);
        console.log(`- Properties evaluated: ${JSON.stringify(scoringResult.properties, null, 2)}`);

        candidate.matchScore = scoringResult.score || 0;
        candidate.matchingSkills = scoringResult.matchingSkills || [];
        candidate.missingSkills = scoringResult.missingSkills || [];
        candidate.matchExplanation = scoringResult.reasoning || '';
        candidate.matchProperties = scoringResult.properties || [];

        // If the candidate no longer matches (score < 50%), should we unassign them or keep them?
        // Let's keep the assignment but record the correct score and checklist.
        // Also, if they score < 50%, add to ineligibilityReasons so it's logged
        if (scoringResult.score < 50) {
          candidate.ineligibilityReasons = (candidate.ineligibilityReasons || []).filter(r => r.jobId !== job.id);
          candidate.ineligibilityReasons.push({
            jobId: job.id,
            jobTitle: job.title,
            score: scoringResult.score || 0,
            reason: scoringResult.reasoning || 'Did not meet the job requirements (Score below 50%).'
          });
          // Unassign from the job since they are no longer eligible!
          candidate.jobId = null;
          console.log(`=> Candidate ${candidate.name} unassigned from "${job.title}" due to score falling to ${scoringResult.score}%`);
        } else {
          // Remove from ineligibilityReasons if they are eligible
          candidate.ineligibilityReasons = (candidate.ineligibilityReasons || []).filter(r => r.jobId !== job.id);
        }

        await candidate.save();
        console.log(`- Candidate ${candidate.name} updated successfully!`);
      } catch (err) {
        console.error(`- Failed to re-score candidate ${candidate.name}:`, err.message);
      }
    }

    console.log('Migration complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
