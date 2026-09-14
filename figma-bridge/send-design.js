/**
 * Antigravity <-> Figma Bridge CLI Client
 * Dispatches UI design requests to connected Figma plugins and listens for exports.
 * 
 * Usage:
 *   node send-design.js                 # Send default Candidate Card
 *   node send-design.js dashboard       # Send full Recruiter Dashboard screen
 *   node send-design.js table           # Send Candidate Data Table
 *   node send-design.js modal           # Send Interview Schedule Modal
 *   node send-design.js custom file.json # Send custom specification
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.FIGMA_BRIDGE_PORT || 3055;
const command = process.argv[2] || 'card';

const PRESETS = {
  card: {
    type: 'card',
    title: 'Sarah Jenkins',
    role: 'Senior Full Stack Engineer',
    matchScore: '96%',
    status: 'Shortlisted',
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'System Design'],
    summary: '8+ years leading cloud-native architectures, microservices, and high-throughput web applications with 99.99% reliability.'
  },
  dashboard: {
    type: 'dashboard',
    title: 'TalentFlow AI - Enterprise Recruitment Hub',
    metrics: [
      { label: 'Total Applicants', value: '2,840', change: '+24%', positive: true },
      { label: 'AI Matched (>85%)', value: '312', change: '+18%', positive: true },
      { label: 'Interviews Scheduled', value: '14', change: 'Today', positive: true },
      { label: 'Offers Accepted', value: '38', change: '+12%', positive: true }
    ],
    candidates: [
      { name: 'Sarah Jenkins', role: 'Staff Software Engineer', score: '96%' },
      { name: 'David Chen', role: 'Lead ML / AI Engineer', score: '93%' },
      { name: 'Maya Patel', role: 'Principal Cloud Architect', score: '91%' }
    ]
  },
  table: {
    type: 'table',
    title: 'Active Pipeline - Senior Engineering Candidates',
    rows: [
      { name: 'Sarah Jenkins', role: 'Staff Software Engineer', score: '96%', status: 'Shortlisted', bg: '#064E3B', fg: '#34D399' },
      { name: 'David Chen', role: 'Lead ML Engineer', score: '93%', status: 'Interview', bg: '#78350F', fg: '#FBBF24' },
      { name: 'Elena Rostova', role: 'Frontend Architect', score: '91%', status: 'Technical Review', bg: '#1E1B4B', fg: '#818CF8' },
      { name: 'Marcus Vance', role: 'DevOps Specialist', score: '88%', status: 'Screened', bg: '#1F2937', fg: '#9CA3AF' }
    ]
  },
  modal: {
    type: 'modal',
    title: 'Schedule Technical Assessment',
    confirmLabel: 'Confirm & Send Calendar Invite',
    fields: [
      { label: 'Candidate', value: 'Sarah Jenkins (sarah.jenkins@example.com)' },
      { label: 'Interview Type', value: 'Live System Design & Code Pairing (60 min)' },
      { label: 'Date & Time', value: 'Monday, Aug 18, 2026 at 11:00 AM IST' },
      { label: 'Primary Interviewer', value: 'Alex Morgan (Engineering Manager)' }
    ]
  }
};

function resolvePayload() {
  if (PRESETS[command]) {
    return PRESETS[command];
  }
  if (command === 'custom' && process.argv[3]) {
    const filePath = path.resolve(process.cwd(), process.argv[3]);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  }
  return PRESETS.card;
}

const payload = resolvePayload();
const postData = JSON.stringify(payload);

console.log(`[Bridge CLI] Dispatching "${payload.type || 'card'}" design specification to Figma bridge on port ${PORT}...`);

const req = http.request({
  hostname: 'localhost',
  port: PORT,
  path: '/api/request-design',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let responseBody = '';
  res.on('data', chunk => { responseBody += chunk; });
  res.on('end', () => {
    try {
      const response = JSON.parse(responseBody);
      console.log('\n========================================');
      console.log('✅ Response:', response.message || response);
      console.log('Request ID:', response.requestId);
      console.log('Connected Figma Plugins:', response.sentToPlugins);
      console.log('========================================\n');
    } catch (e) {
      console.log('Response:', responseBody);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Failed to connect to Figma bridge server:', err.message);
  console.error('Make sure the bridge server is running: `node server.js`');
});

req.write(postData);
req.end();
