const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'server', 'server.js');
let code = fs.readFileSync(p, 'utf8');

// 1. Update imports
code = code.replace(
  /import \{.*?\} from '\.\/geminiParser\.js';/,
  `import { parseResume, scoreCandidate, generateTags, generateJobDescription, generateQuestionsForCandidate, extractChecklistFromJob, scoreCandidateAgainstChecklist } from './geminiParser.js';`
);

// 2. Remove scoreCandidateByOwnCategory from Promise.all in /api/upload
code = code.replace(
  /scoreCandidateByOwnCategory\(parsedData\)\.catch\(.*?\),\s*/g,
  ''
);
// And in /api/candidates/import
code = code.replace(
  /scoreCandidateByOwnCategory\(data\)\.catch\(.*?\),\s*/g,
  ''
);
// And in email categorizer
code = code.replace(
  /const ownCategoryResult = await scoreCandidateByOwnCategory\(parsedData\);\s*candidate\.ownCategoryScore = ownCategoryResult\.score \|\| 0;\s*candidate\.ownCategoryMatchingSkills = ownCategoryResult\.matchingSkills \|\| \[\];\s*candidate\.ownCategoryMissingSkills = ownCategoryResult\.missingSkills \|\| \[\];\s*candidate\.ownCategoryExplanation = ownCategoryResult\.reasoning \|\| '';/g,
  ''
);
code = code.replace(
  /const ownCategoryResult = await scoreCandidateByOwnCategory\(data\);\s*candidate\.ownCategoryScore = ownCategoryResult\.score \|\| 0;\s*candidate\.ownCategoryMatchingSkills = ownCategoryResult\.matchingSkills \|\| \[\];\s*candidate\.ownCategoryMissingSkills = ownCategoryResult\.missingSkills \|\| \[\];\s*candidate\.ownCategoryExplanation = ownCategoryResult\.reasoning \|\| '';/g,
  ''
);

// 3. Replace scoreCandidate with scoreCandidateAgainstChecklist
code = code.replace(/scoreCandidate\(([^,]+), ([^)]+)\)/g, 'scoreCandidateAgainstChecklist($1, $2)');

// 4. Update the if (results[0]) mapping
code = code.replace(
  /if \(results\[0\]\) ownCategoryResult = results\[0\];\s*if \(results\[1\]\) scoringResult = results\[1\];\s*if \(results\[2\]\) generatedTags = results\[2\];/g,
  `if (results[0]) scoringResult = results[0];
      if (results[1]) generatedTags = results[1];
      
      // Strict rule: If core skills failed, do not add to job list
      if (job && scoringResult && scoringResult.passedCoreSkills === false) {
        jobId = null;
        scoringResult.score = 0;
        scoringResult.reasoning = 'Rejected: Missing core technical requirements for this job.';
      }`
);

// 5. Remove all remaining ownCategory code
code = code.split('\n').filter(line => !line.includes('ownCategoryResult') && !line.includes('ownCategoryScore') && !line.includes('ownCategoryMatchingSkills') && !line.includes('ownCategoryMissingSkills') && !line.includes('ownCategoryExplanation') && !line.includes('scoreCandidateByOwnCategory')).join('\n');

// 6. Update the logic for passedCoreSkills in rematching
code = code.replace(
  /candidate\.matchScore = scoringResult\.score \|\| 0;\s+candidate\.matchingSkills = scoringResult\.matchingSkills \|\| \[\];\s+candidate\.missingSkills = scoringResult\.missingSkills \|\| \[\];\s+candidate\.matchExplanation = scoringResult\.reasoning \|\| '';/g,
  `if (scoringResult.passedCoreSkills !== false) {
        candidate.matchScore = scoringResult.score || 0;
        candidate.matchingSkills = scoringResult.matchingSkills || [];
        candidate.missingSkills = scoringResult.missingSkills || [];
        candidate.matchExplanation = scoringResult.reasoning || '';
        candidate.checklist = scoringResult.checklist || [];
      } else {
        candidate.jobId = null;
        candidate.matchScore = 0;
        candidate.matchExplanation = 'Rejected: Missing core technical requirements for this job.';
        candidate.checklist = scoringResult.checklist || [];
      }`
);

// 7. In JobMatch updateOne (if job)
code = code.replace(
  /if \(job\) \{\s+await JobMatch\.updateOne\(\s+\{ candidateId: candidate\.id, jobId: job\.id \},\s+\{\s+\$set: \{\s+matchScore: scoringResult\.score \|\| 0,\s+matchingSkills: scoringResult\.matchingSkills \|\| \[\],\s+missingSkills: scoringResult\.missingSkills \|\| \[\],\s+matchExplanation: scoringResult\.reasoning \|\| ''\s+\}\s+\},\s+\{ upsert: true \}\s+\);\s+\}/g,
  `if (job && scoringResult && scoringResult.passedCoreSkills !== false) {
      await JobMatch.updateOne(
        { candidateId: candidate.id, jobId: job.id },
        {
          $set: {
            matchScore: scoringResult.score || 0,
            matchingSkills: scoringResult.matchingSkills || [],
            missingSkills: scoringResult.missingSkills || [],
            matchExplanation: scoringResult.reasoning || '',
            checklist: scoringResult.checklist || []
          }
        },
        { upsert: true }
      );
    }`
);

// 8. Add checklist field to Candidate saving block
code = code.replace(/matchExplanation: scoringResult\.reasoning \|\| '',/g, "matchExplanation: scoringResult.reasoning || '',\n      checklist: scoringResult.checklist || [],");

fs.writeFileSync(p, code);
console.log('Restored changes to server.js');
