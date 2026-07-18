const fs = require('fs');
const path = require('path');

const filePath = path.resolve('geminiParser.js');
const content = fs.readFileSync(filePath, 'utf-8');

// 1. Verify system instructions contain length and prefix restrictions
const hasWordLimitRule = content.includes('15-20 words');
const hasNegativeConstraint = content.includes('NEGATIVE CONSTRAINT');
const hasPrefixConstraint = content.includes('introductory phrases') || content.includes('introductory prefixes');

console.log('--- System Instructions Verification ---');
console.log('Has 15-20 words rule:', hasWordLimitRule);
console.log('Has NEGATIVE CONSTRAINT rule:', hasNegativeConstraint);
console.log('Has prefix constraint rule:', hasPrefixConstraint);

if (!hasWordLimitRule || !hasNegativeConstraint || !hasPrefixConstraint) {
  console.error('FAIL: System instructions in geminiParser.js are missing the required constraints!');
  process.exit(1);
}

// 2. Extract standard/default questions from mapAnalysisToQuestions
console.log('--- Standard Questions Verification ---');

// We'll extract defaultHr, defaultTech, and fixedScreening arrays using regex or manual search
const defaultHrQuestions = [];
const defaultTechQuestions = [];
const fixedScreeningQuestions = [];

// We can parse the arrays by locating their blocks
const defaultHrBlock = content.match(/const defaultHr = \[\s*([\s\S]+?)\s*\];/);
const defaultTechBlock = content.match(/const defaultTech = \[\s*([\s\S]+?)\s*\];/);
const fixedScreeningBlock = content.match(/const fixedScreening = \[\s*([\s\S]+?)\s*\];/);

function extractQuestions(blockText) {
  const qs = [];
  const regex = /question:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(blockText)) !== null) {
    qs.push(match[1]);
  }
  return qs;
}

const hrQs = defaultHrBlock ? extractQuestions(defaultHrBlock[1]) : [];
const techQs = defaultTechBlock ? extractQuestions(defaultTechBlock[1]) : [];
const screeningQs = fixedScreeningBlock ? extractQuestions(fixedScreeningBlock[1]) : [];

console.log(`Extracted ${hrQs.length} default HR questions.`);
console.log(`Extracted ${techQs.length} default Tech questions.`);
console.log(`Extracted ${screeningQs.length} fixed Screening questions.`);

const allStandardQuestions = [...hrQs, ...techQs, ...screeningQs];
let allPassed = true;

const forbiddenPrefixes = [
  "given your experience",
  "since you worked",
  "according to your resume",
  "in your role as",
  "based on your experience",
  "i see that you",
  "since you worked with"
];

allStandardQuestions.forEach(q => {
  const words = q.trim().split(/\s+/);
  const wordCount = words.length;
  const lowercaseQ = q.toLowerCase();
  
  const hasForbiddenPrefix = forbiddenPrefixes.some(prefix => lowercaseQ.startsWith(prefix));
  
  const isLengthOk = wordCount <= 20;
  
  if (!isLengthOk || hasForbiddenPrefix) {
    console.error(`FAIL: Question "${q}" fails constraints! Word count: ${wordCount}, Has forbidden prefix: ${hasForbiddenPrefix}`);
    allPassed = false;
  } else {
    console.log(`PASS: "${q}" (${wordCount} words)`);
  }
});

if (allPassed) {
  console.log('SUCCESS: All standard questions satisfy word count (under 15-20 words) and exclude introductory prefixes.');
} else {
  console.error('FAIL: One or more standard questions did not satisfy constraints.');
  process.exit(1);
}
