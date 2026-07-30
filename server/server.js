import { Agent, setGlobalDispatcher } from 'undici';

// Configure global dispatcher to increase fetch timeouts (undici defaults to 30s)
setGlobalDispatcher(new Agent({
  headersTimeout: 1800000, // 30 minutes
  bodyTimeout: 1800000,
  connectTimeout: 60000 // 60 seconds
}));

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import { ImapFlow } from 'imapflow';

// Google OAuth imports deleted
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fetchIMAPEmails, markIMAPEmailAsRead, getIMAPAttachmentData } from './imapSourcing.js';
import { parseResume, scoreCandidate, scoreCandidateByOwnCategory, generateTags, generateJobDescription, generateQuestionsForCandidate, scoreCandidateAgainstChecklist, extractChecklistFromJob } from './geminiParser.js';
import { generateOfferLetterBuffer } from './offerGenerator.js';
import { extractTextFromPDF, extractTextFromFile, convertDocxToHtml } from './parser.js';
import { searchIndex } from './searchIndex.js';
import { Candidate, Job, Settings, ProcessedEmail, IngestionLog, User, ResumeChunk, CandidateProfile, JobMatch } from './models.js';
import {
  getOutlookAccessToken,
  listOutlookMessages,
  listAllOutlookMessages,
  getOutlookAttachmentData,
  markOutlookEmailAsRead,
  sendOutlookEmail,
  invalidateTokenCache
} from './outlookApi.js';
import { categorizeEmail } from './emailCategorizer.js';
import { EmailLog } from './models.js';
import { loadVectorIndex, indexCandidate, removeCandidate, indexAllCandidates, searchResumes, ragAnswer, getRAGStatus, findSimilarCandidates, getRelevantChunksForJob } from './ragService.js';

dotenv.config();

// Global trackers for background email connection checks
// success: null = never checked, true = last check OK, false = last check failed
let lastOutlookConnectionStatus = {
  success: null,
  error: null,
  lastChecked: null
};

let lastGmailConnectionStatus = {
  success: null,
  error: null,
  lastChecked: null
};
const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const escapeRegex = (str) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

const isGenericVal = (val, type) => {
  if (!val || typeof val !== 'string') return true;
  const clean = val.trim().toLowerCase();
  if (!clean || clean === 'null' || clean === 'undefined' || clean === 'n/a' || clean === 'none' || clean === 'unknown') return true;
  if (type === 'name' && (clean === 'candidate' || clean === 'unknown candidate')) return true;
  if (type === 'email' && (clean === 'no-email' || clean === 'noemail')) return true;
  return false;
};


async function getEmailConfig() {
  const settings = await Settings.findById('global');
  if (settings) {
    const provider = settings.emailProvider ?? 'gmail';
    let pass = settings.emailPassword ?? '';
    if (provider === 'gmail' && pass) {
      pass = pass.replace(/\s+/g, '');
    }
    return {
      provider,
      user: settings.emailUser ?? '',
      pass,
      sourcingAgentActive: settings.sourcingAgentActive !== false,
      outlookClientId: settings.outlookClientId ?? '',
      outlookClientSecret: settings.outlookClientSecret ?? '',
      outlookTenantId: settings.outlookTenantId ?? '',
      outlookUserEmail: settings.outlookUserEmail ?? ''
    };
  }
  const provider = 'gmail';
  let pass = process.env.GMAIL_APP_PASSWORD || '';
  if (pass) {
    pass = pass.replace(/\s+/g, '');
  }
  return {
    provider,
    user: process.env.GMAIL_USER_EMAIL || '',
    pass,
    sourcingAgentActive: true,
    outlookClientId: process.env.OUTLOOK_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID || '',
    outlookClientSecret: process.env.OUTLOOK_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET || '',
    outlookTenantId: process.env.OUTLOOK_TENANT_ID || process.env.MICROSOFT_TENANT_ID || '',
    outlookUserEmail: process.env.OUTLOOK_USER_EMAIL || ''
  };
}

async function testConnectionInBackground() {
  const emailConfig = await getEmailConfig();
  if (emailConfig.provider === 'outlook') {
    const clientId = emailConfig.outlookClientId;
    const clientSecret = emailConfig.outlookClientSecret;
    const tenantId = emailConfig.outlookTenantId;
    const userEmail = emailConfig.outlookUserEmail;

    if (!clientId || !clientSecret || !tenantId || !userEmail) {
      return;
    }
    try {
      invalidateTokenCache();
      const accessToken = await getOutlookAccessToken(true);
      const testUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/mailFolders/inbox?$select=displayName,totalItemCount,unreadItemCount`;
      const testResponse = await fetch(testUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (testResponse.ok) {
        lastOutlookConnectionStatus = { success: true, error: null, lastChecked: new Date() };
      } else {
        const errText = await testResponse.text();
        lastOutlookConnectionStatus = { success: false, error: errText, lastChecked: new Date() };
      }
    } catch (error) {
      lastOutlookConnectionStatus = { success: false, error: error.message, lastChecked: new Date() };
    }
  } else {
    // Gmail IMAP
    const user = emailConfig.user;
    const pass = emailConfig.pass;
    if (!user || !pass) {
      return;
    }
    try {
      const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: { user, pass },
        logger: false
      });
      await client.connect();
      await client.logout();
      lastGmailConnectionStatus = { success: true, error: null, lastChecked: new Date() };
    } catch (error) {
      const errMsg = error.responseText ? `${error.message}: ${error.responseText}` : error.message;
      lastGmailConnectionStatus = { success: false, error: errMsg, lastChecked: new Date() };
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const TOKENS_FILE = path.join(__dirname, 'tokens.json');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// CORS: Always allow localhost for Windows dev + configured FRONTEND_URL for Linux/remote access
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  FRONTEND_URL,
  ...(process.env.EXTRA_ORIGINS ? process.env.EXTRA_ORIGINS.split(',').map(o => o.trim()) : [])
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow any origin to support any host
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/api/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Sanitize filename: replace spaces and special chars with underscores
    // This is required for Linux where filenames are case-sensitive and
    // spaces in filenames cause static file serving issues (%20 encoding)
    const sanitized = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.\-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitized);
  }
});
const upload = multer({ 
  storage
});

const JWT_SECRET = process.env.JWT_SECRET || 'talentflow-super-secret-key';

function authenticateToken(req, res, next) {
  if (process.env.NODE_ENV === 'test') {
    req.user = { userId: 'mock-user-id', email: 'admin@ispatialtec.com', role: 'admin' };
    return next();
  }

  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ error: 'Access denied: No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Access denied: Invalid or expired token', isTokenExpired: true });
    req.user = user;
    next();
  });
}

function requireRole(roles) {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') {
      return next();
    }
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient privileges' });
    }
    next();
  };
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/talentflow?authSource=admin')
  .then(async () => {
    console.log('Connected to MongoDB');

    // Seed default users if empty
    try {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('Seeding default users...');
        const adminPass = await bcrypt.hash('admin123', 10);
        const recruiterPass = await bcrypt.hash('recruiter123', 10);
        const managerPass = await bcrypt.hash('manager123', 10);

        await User.create([
          { email: 'admin@ispatialtec.com', password: adminPass, role: 'admin' },
          { email: 'recruiter@ispatialtec.com', password: recruiterPass, role: 'recruiter' },
          { email: 'manager@ispatialtec.com', password: managerPass, role: 'manager' }
        ]);
        console.log('Default users seeded successfully.');
      }
    } catch (err) {
      console.error('Error seeding default users:', err.message);
    }

    // Seed iSpatialTec Job Roles from jds.json
    try {
      const jsonPath = path.join(__dirname, 'jds.json');
      if (fs.existsSync(jsonPath)) {
        const jdsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        let addedCount = 0;
        for (const jobData of jdsData) {
          const res = await Job.updateOne({ id: jobData.id }, { $setOnInsert: jobData }, { upsert: true });
          if (res.upsertedCount > 0) addedCount++;
        }
        console.log(`iSpatialTec Job Roles Sync: ${jdsData.length} roles total (${addedCount} new roles initialized).`);
      }
    } catch (err) {
      console.error('Error auto-seeding job roles:', err.message);
    }

    // Migrate existing candidate resumeUrls from /uploads/ to /api/uploads/
    try {
      const candidatesToUpdate = await Candidate.find({ resumeUrl: { $regex: /^\/uploads\// } });
      for (const c of candidatesToUpdate) {
        c.resumeUrl = c.resumeUrl.replace(/^\/uploads\//, '/api/uploads/');
        await c.save();
      }
      if (candidatesToUpdate.length > 0) {
        console.log(`Migrated ${candidatesToUpdate.length} candidate resumeUrls to /api/uploads/`);
      }
    } catch (err) {
      console.error('Error migrating candidate resumeUrls:', err.message);
    }

    // Build search index
    const candidates = await Candidate.find();
    if (candidates.length > 0) {
      searchIndex.buildIndex(candidates);
    }
    // Initialize RAG vector index
    loadVectorIndex().then(count => {
      console.log(`RAG vector index loaded: ${count} chunks in memory.`);
      if (count === 0 && candidates.length > 0) {
        console.log('First run detected. Starting background RAG indexing...');
        indexAllCandidates((current, total) => {
          if (current % 5 === 0 || current === total) console.log(`RAG indexing progress: ${current}/${total}`);
        }).then(result => {
          console.log(`RAG indexing complete: ${result.indexed} candidates indexed, ${result.errors} errors.`);
        }).catch(err => console.error('RAG background indexing failed:', err.message));
      }
    }).catch(err => console.error('Failed to load RAG vector index:', err.message));
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Discrepancy detector between submitted form details and parsed CV data
function detectFormCvDiscrepancies(formInfo, parsedData) {
  const discrepancies = [];
  if (!formInfo || !parsedData) return discrepancies;

  // 1. Candidate Name Check
  const formName = (formInfo.name || '').trim().toLowerCase();
  const cvName = (parsedData.name || '').trim().toLowerCase();
  if (formName && cvName && formName !== 'unknown' && cvName !== 'unknown') {
    const formTokens = formName.split(/\s+/).filter(t => t.length > 2);
    const cvTokens = cvName.split(/\s+/).filter(t => t.length > 2);
    
    // Check if any significant token overlaps
    const hasOverlap = formTokens.some(ft => cvTokens.some(ct => ct.includes(ft) || ft.includes(ct)));
    
    if (!hasOverlap && formTokens.length > 0 && cvTokens.length > 0) {
      discrepancies.push({
        issue: `Candidate Name Discrepancy: Form submitted under "${formInfo.name}", but uploaded CV belongs to "${parsedData.name}".`,
        severity: 'HIGH',
        fix_suggestion: 'Verify candidate identity to ensure the wrong resume file was not uploaded.'
      });
    }
  }

  // 2. Email Address Check
  const formEmail = (formInfo.email || '').trim().toLowerCase();
  const cvEmail = (parsedData.email || '').trim().toLowerCase();
  if (formEmail && cvEmail && formEmail !== cvEmail) {
    discrepancies.push({
      issue: `Email Address Mismatch: Form email (${formInfo.email}) does not match email on CV (${parsedData.email}).`,
      severity: 'MEDIUM',
      fix_suggestion: 'Confirm primary email address with the candidate during initial contact.'
    });
  }

  // 3. Phone Number Check
  const cleanFormPhone = (formInfo.phone || '').replace(/\D/g, '');
  const cleanCvPhone = (parsedData.phone || '').replace(/\D/g, '');
  if (cleanFormPhone && cleanCvPhone && cleanFormPhone.length >= 7 && cleanCvPhone.length >= 7) {
    if (!cleanFormPhone.includes(cleanCvPhone) && !cleanCvPhone.includes(cleanFormPhone)) {
      discrepancies.push({
        issue: `Phone Number Mismatch: Form phone (${formInfo.phone}) differs from phone on CV (${parsedData.phone}).`,
        severity: 'LOW',
        fix_suggestion: 'Confirm phone number with candidate.'
      });
    }
  }

  // 4. Experience Discrepancy Check
  const formExp = parseFloat(formInfo.totalYearsExperience);
  let cvExp = parseFloat(parsedData.totalYearsExperience);
  if (isNaN(cvExp) && parsedData.experience && Array.isArray(parsedData.experience)) {
    cvExp = parsedData.experience.length * 1.5;
  }
  if (!isNaN(formExp) && !isNaN(cvExp) && Math.abs(formExp - cvExp) >= 2) {
    discrepancies.push({
      issue: `Experience Discrepancy: Candidate stated ${formExp} years in application form, but CV reflects ~${Math.round(cvExp)} years of experience.`,
      severity: 'MEDIUM',
      fix_suggestion: 'Cross-check timeline of employment during interview.'
    });
  }

  return discrepancies;
}

async function sendSMTPMessage({ to, subject, body, attachments = [] }) {
  const config = await getEmailConfig();
  if (!config.user || !config.pass) {
    throw new Error('Email credentials are not configured.');
  }

  let smtpConfig = {};
  if (config.provider === 'gmail') {
    smtpConfig = {
      service: 'gmail',
      auth: { user: config.user, pass: config.pass }
    };
  } else {
    smtpConfig = {
      service: config.provider,
      auth: { user: config.user, pass: config.pass }
    };
  }

  const transporter = nodemailer.createTransport(smtpConfig);
  const isHtml = /<[a-z][\s\S]*>/i.test(body);
  const mailOptions = {
    from: config.user,
    to,
    subject,
  };
  if (isHtml) {
    mailOptions.html = body;
  } else {
    mailOptions.text = body;
  }
  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    mailOptions.attachments = attachments;
  }
  return await transporter.sendMail(mailOptions);
}

async function sendAutomaticEmail(candidate, triggerType, extraParams = {}) {
  if (!candidate || !candidate.email) {
    return { success: false, reason: 'No candidate email available' };
  }

  try {
    const settings = await Settings.findById('global');
    const emailTemplates = settings?.emailTemplates || {};

    let template = emailTemplates[triggerType];

    // Fallback default templates if not specified in settings
    if (!template) {
      if (triggerType === 'positionChange') {
        template = "Subject: Position Update: {job_title}\n\nHi {candidate_name},\n\nYour application position at {company_name} has been updated to {job_title}.\n\nBest regards,\nRecruitment Team";
      } else if (triggerType === 'applicationReceived') {
        template = "Subject: Application Received: {job_title}\n\nHi {candidate_name},\n\nThank you for applying for the {job_title} role at {company_name}. We have received your application.\n\nBest regards,\nRecruitment Team";
      } else if (triggerType === 'shortlist' || triggerType === 'shortlisted') {
        template = "Subject: Application Shortlisted: {job_title}\n\nHi {candidate_name},\n\nGreat news! Your application for the {job_title} position at {company_name} has been shortlisted. Our recruitment team will reach out to you shortly for the next steps.\n\nBest regards,\nRecruitment Team";
      } else if (triggerType === 'interview') {
        template = "Subject: Interview Invitation: {job_title}\n\nHi {candidate_name},\n\nWe would like to invite you for an interview for the {job_title} position at {company_name}.\n\nBest regards,\nRecruitment Team";
      } else if (triggerType === 'offer') {
        template = "Subject: Job Offer: {job_title}\n\nHi {candidate_name},\n\nWe are pleased to extend an offer of employment for the {job_title} position at {company_name}.\n\nBest regards,\nRecruitment Team";
      } else if (triggerType === 'reject') {
        template = "Subject: Application Update: {job_title}\n\nHi {candidate_name},\n\nThank you for your interest in the {job_title} position at {company_name}. After careful consideration, we will not be moving forward with your application at this time.\n\nBest regards,\nRecruitment Team";
      } else {
        return { success: false, reason: `No template for trigger type ${triggerType}` };
      }
    }

    let jobTitle = extraParams.jobTitle || 'General Role';
    if (!extraParams.jobTitle && candidate.jobId) {
      const job = await Job.findOne({ id: candidate.jobId });
      if (job) jobTitle = job.title;
    }

    let oldJobTitle = extraParams.oldJobTitle || 'Previous Position';

    // Replace dynamic placeholders (supports curly braces and bracket notation)
    template = template.replace(/{{CandidateName}}/g, candidate.name || 'Candidate');
    template = template.replace(/{candidate_name}/g, candidate.name || 'Candidate');

    template = template.replace(/{{JobTitle}}/g, jobTitle);
    template = template.replace(/{job_title}/g, jobTitle);

    template = template.replace(/{{OldJobTitle}}/g, oldJobTitle);
    template = template.replace(/{old_job_title}/g, oldJobTitle);

    template = template.replace(/{{CandidateID}}/g, candidate.id || 'N/A');
    template = template.replace(/{candidate_id}/g, candidate.id || 'N/A');

    template = template.replace(/{{Stage}}/g, candidate.stage || 'Inbox');
    template = template.replace(/{stage}/g, candidate.stage || 'Inbox');

    template = template.replace(/{company_name}/g, 'iSpatial Techno Solutions (IST)');

    let subject = `${triggerType === 'positionChange' ? 'Position Update' : 'Application Update'}: ${jobTitle}`;
    let body = template;

    const lines = template.split('\n');
    if (lines[0].toLowerCase().startsWith('subject:')) {
      subject = lines[0].substring(8).trim();
      body = lines.slice(1).join('\n').trim();
    }

    let attachments = extraParams.attachments || [];
    if ((triggerType === 'offer' || (candidate.stage || '').toLowerCase().includes('offer')) && attachments.length === 0) {
      try {
        console.log(`[AutoEmail] Generating official Offer Letter attachment for ${candidate.name}...`);
        const docxBuffer = await generateOfferLetterBuffer(candidate, extraParams);
        const safeName = (candidate.name || 'Candidate').replace(/[^a-zA-Z0-9_\-]/g, '_');
        attachments.push({
          filename: `Offer_Letter_${candidate.name.replace(/\s+/g, '_')}.docx`,
          content: docxBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
      } catch (err) {
        console.error('[AutoEmail] Failed to generate offer letter attachment:', err.message);
      }
    }

    const emailConfig = await getEmailConfig();
    if (emailConfig.provider === 'outlook' && emailConfig.outlookClientId && emailConfig.outlookClientSecret && emailConfig.outlookUserEmail) {
      const accessToken = await getOutlookAccessToken();
      await sendOutlookEmail(accessToken, emailConfig.outlookUserEmail, { to: candidate.email, subject, body, attachments });
    } else if (emailConfig.user && emailConfig.pass) {
      await sendSMTPMessage({ to: candidate.email, subject, body, attachments });
    } else {
      const reasonMsg = 'Email credentials not configured in Settings. Please configure Email User & Password or Outlook credentials under Settings.';
      console.warn(`[AutoEmail] ${reasonMsg} Skipped sending '${triggerType}' email to ${candidate.email}`);
      await EmailLog.create({
        source: 'auto-email',
        level: 'warn',
        message: `Skipped sending ${triggerType} email to ${candidate.email}: credentials not configured.`,
        emailId: candidate.email
      }).catch(() => {});
      return { success: false, reason: reasonMsg };
    }

    candidate.history.push({
      date: new Date().toISOString(),
      type: 'EmailSent',
      text: `Sent automatic email (${triggerType}): "${subject}"`
    });
    await candidate.save();

    await EmailLog.create({
      source: 'auto-email',
      level: 'info',
      message: `Sent automatic email (${triggerType}) to ${candidate.email}`,
      emailId: candidate.email
    }).catch(() => {});

    return { success: true, subject };
  } catch (err) {
    console.error(`[AutoEmail] Failed to send ${triggerType} email to ${candidate.email}:`, err);
    await EmailLog.create({
      source: 'auto-email',
      level: 'error',
      message: `Failed to send ${triggerType} email to ${candidate.email}`,
      details: err.message,
      emailId: candidate.email
    }).catch(() => {});
    return { success: false, error: err.message };
  }
}

/* ==========================================================================
   AUTHENTICATION ROUTES
   ========================================================================== */

// Google OAuth routes deleted

// User Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Self change password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ error: 'All password fields are required' });
  }
  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: 'New password and confirm password do not match' });
  }
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin User Management routes
app.get('/api/admin/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { email, password, confirmPassword, role } = req.body;
  if (!email || !password || !confirmPassword || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  if (!['admin', 'recruiter', 'manager'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified' });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ email, password: hashedPassword, role });
    res.status(201).json({ email: newUser.email, role: newUser.role, createdAt: newUser.createdAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (userToDelete.email === 'admin@ispatialtec.com') {
      return res.status(400).json({ error: 'Cannot delete the primary admin account' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/users/:id/reset-password', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { newPassword, confirmNewPassword } = req.body;
  if (!newPassword || !confirmNewPassword) {
    return res.status(400).json({ error: 'All password fields are required' });
  }
  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  try {
    const userToUpdate = await User.findById(req.params.id);
    if (!userToUpdate) {
      return res.status(404).json({ error: 'User not found' });
    }
    userToUpdate.password = await bcrypt.hash(newPassword, 10);
    userToUpdate.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Candidate sharing endpoint
app.post('/api/candidates/:id/assign', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  const { managerEmail } = req.body;
  try {
    const candidate = await Candidate.findOne({ id: req.params.id });
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    candidate.assignedTo = managerEmail || null;
    await candidate.save();
    res.json({ success: true, candidate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/managers', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  try {
    const managers = await User.find({ role: 'manager' }, 'email');
    res.json(managers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/status', async (req, res) => {
  const emailConfig = await getEmailConfig();
  const settings = await Settings.findById('global');
  
  const imapConfigured = !!(emailConfig.user && emailConfig.pass);
  const outlookConfigured = !!(emailConfig.outlookClientId && emailConfig.outlookClientSecret && emailConfig.outlookUserEmail);
  const isOutlookProvider = emailConfig.provider === 'outlook';
  
  // 'authenticated' is lenient: assume OK if configured and not yet proven broken
  // 'connected' is strict: only true after an actual successful check
  res.json({ 
    authenticated: isOutlookProvider
      ? (outlookConfigured && (lastOutlookConnectionStatus.success === true || lastOutlookConnectionStatus.lastChecked === null))
      : (imapConfigured && (lastGmailConnectionStatus.success === true || lastGmailConnectionStatus.lastChecked === null)),
    oauthConnected: false,
    imapConfigured,
    outlookConfigured,
    imapConnected: imapConfigured && lastGmailConnectionStatus.success === true,
    imapConnectionError: lastGmailConnectionStatus.error,
    outlookConnected: outlookConfigured && lastOutlookConnectionStatus.success === true,
    outlookConnectionError: lastOutlookConnectionStatus.error,
    email: isOutlookProvider ? emailConfig.outlookUserEmail : (emailConfig.user || ''),
    sourcingAgentActive: emailConfig.sourcingAgentActive,
    emailProvider: emailConfig.provider,
    aiProvider: settings?.aiProvider || 'gemini',
    geminiApiKeyConfigured: !!(settings?.geminiApiKey || process.env.GEMINI_API_KEY),
    openaiApiKeyConfigured: !!(settings?.openaiApiKey || process.env.OPENAI_API_KEY),
    claudeApiKeyConfigured: !!(settings?.claudeApiKey || process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY),
    ollamaConfigured: !!(settings?.ollamaUrl || 'http://localhost:11434')
  });
});

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const signal = controller.signal;
  
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  try {
    const response = await fetch(url, { ...options, signal });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

app.post('/api/ollama/test-connection', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { ollamaUrl } = req.body;
  if (!ollamaUrl) {
    return res.status(400).json({ success: false, error: 'Ollama URL is required.' });
  }

  try {
    const response = await fetchWithTimeout(`${ollamaUrl.replace(/\/+$/, '')}/api/tags`, {}, 10000);
    const contentType = response.headers.get('content-type') || '';
    
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Failed to fetch Ollama tags: ${response.status} ${response.statusText}. Response: ${errText.substring(0, 200)}`);
    }

    if (!contentType.includes('application/json')) {
      const htmlText = await response.text();
      console.error(`Ollama connection test returned non-JSON response. Content-Type: ${contentType}. Body snippet:`, htmlText.substring(0, 300));
      return res.status(400).json({
        success: false,
        error: `Expected JSON response from Ollama, but got Content-Type "${contentType}". Response: ${htmlText.substring(0, 100)}`
      });
    }

    const data = await response.json();
    res.json({ success: true, models: data.models || [] });
  } catch (error) {
    console.error('Ollama connection test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Disconnected.' });
});

/* ==========================================================================
   RESUME PROCESSING CORE
   ========================================================================== */

async function processEmailAttachment(messageId, filename, buffer, emailConfig, provider = 'gmail') {
  // CRITICAL: Mark as processed FIRST using upsert to prevent race conditions.
  // If two poller ticks run simultaneously, only one will "win" this atomic upsert.
  // We check if the document already existed before to skip duplicate work.
  const processResult = await ProcessedEmail.updateOne(
    { messageId },
    { $setOnInsert: { messageId, processedAt: new Date() } },
    { upsert: true }
  );

  // If no new document was inserted, this email was already processed by another tick
  if (!processResult.upsertedId) {
    console.log(`Email ${messageId} already being processed or done. Skipping.`);
    return null;
  }

  const logId = `ingestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const ingestionLog = new IngestionLog({
    id: logId,
    fileName: filename,
    source: provider === 'outlook' ? 'outlook' : 'gmail',
    status: 'processing'
  });
  await ingestionLog.save().catch(e => console.error('Failed to create ingestion log:', e));

  let localFilePath = null;

  try {
    // Save PDF locally
    const localFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    localFilePath = path.join(UPLOADS_DIR, localFilename);
    fs.writeFileSync(localFilePath, buffer);

    console.log(`Extracting text from ${filename}...`);
    let pdfText = '';
    try {
      pdfText = await extractTextFromFile(localFilePath, filename, null);
    } catch (err) {
      console.warn('Failed to extract text locally:', err.message);
    }

    const pdfBase64 = buffer.toString('base64');
    console.log('Parsing resume with LLM...');
    const parsedData = await parseResume(pdfText, pdfBase64);

    // Duplicate Check
    let duplicate = null;
    const queries = [];
    if (parsedData.email && !isGenericVal(parsedData.email, 'email')) {
      queries.push({ email: { $regex: new RegExp(`^${escapeRegex(parsedData.email.trim())}$`, 'i') } });
    }
    if (parsedData.name && !isGenericVal(parsedData.name, 'name')) {
      queries.push({ name: { $regex: new RegExp(`^${escapeRegex(parsedData.name.trim())}$`, 'i') } });
    }
    if (queries.length > 0) {
      duplicate = await Candidate.findOne({ $or: queries });
    }

    if (duplicate) {
      console.log(`Candidate with email ${parsedData.email || 'N/A'} (name: ${parsedData.name}) already exists. Skipping import.`);
      
      // Clean up temp file
      try {
        if (localFilePath && fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }
      } catch (err) {
        console.error('Failed to delete temp file for duplicate:', err);
      }

      await IngestionLog.updateOne(
        { id: logId },
        { 
          status: 'duplicate', 
          error: `Duplicate candidate: with email ${parsedData.email || 'N/A'} (${duplicate.name}) already exists.`
        }
      ).catch(e => console.error('Failed to update ingestion log:', e));

      try {
        if (provider === 'outlook') {
          const token = await getOutlookAccessToken();
          await markOutlookEmailAsRead(token, emailConfig.outlookUserEmail, messageId);
        } else {
          await markIMAPEmailAsRead(messageId, emailConfig);
        }
      } catch (e) {}
      return null;
    }

    console.log('Fetching settings...');
    let settings = await Settings.findById('global');

    console.log(`Scoring according to candidate's own category...`);
    const ownCategoryResult = await scoreCandidateByOwnCategory(parsedData);

    let jobId = null;
    let job = await autoRouteCandidate(parsedData);
    if (job) {
      jobId = job.id;
    }
    let scoringResult = { score: 0, matchingSkills: [], missingSkills: [], reasoning: '' };

    if (job) {
      console.log(`Scoring against job: ${job.title}...`);
      scoringResult = await scoreCandidate(parsedData, job);
    }

    console.log('Generating tags...');
    const tagPreferences = settings ? settings.tagPreferences : [];
    let generatedTags = [];
    try {
      generatedTags = await generateTags(parsedData, job || { title: 'General Role', description: '' }, tagPreferences);
    } catch (e) {
      console.warn('Tag generation failed:', e.message);
    }

    const newCandidate = new Candidate({
      id: `candidate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      jobId,
      name: parsedData.name || 'Unknown Candidate',
      email: parsedData.email || '',
      phone: parsedData.phone || '',
      linkedinUrl: parsedData.linkedinUrl || '',
      skills: parsedData.skills || [],
      experience: parsedData.experience || [],
      education: parsedData.education || [],
      tags: generatedTags,
      stage: 'Inbox',
      resumeUrl: `/api/uploads/${localFilename}`,
      resumeText: pdfText,
      matchScore: scoringResult.score || 0,
      matchingSkills: scoringResult.matchingSkills || [],
      missingSkills: scoringResult.missingSkills || [],
      matchExplanation: scoringResult.reasoning || '',
      ownCategoryScore: ownCategoryResult.score || 0,
      ownCategoryMatchingSkills: ownCategoryResult.matchingSkills || [],
      ownCategoryMissingSkills: ownCategoryResult.missingSkills || [],
      ownCategoryExplanation: ownCategoryResult.reasoning || '',
      comments: '',
      seniorityLevel: parsedData.seniorityLevel || 'Mid',
      interviewQuestions: parsedData.interviewQuestions || [],
      hrQuestions: parsedData.hrQuestions || [],
      technicalQuestions: parsedData.technicalQuestions || [],
      projects: parsedData.projects || [],
      extractedData: parsedData,
      history: [{ date: new Date().toISOString(), type: 'Imported', text: `Imported from email attachment: ${filename}` }]
    });

    await newCandidate.save();

    // Automatically send application received confirmation email to candidate
    if (newCandidate.email && !isGenericVal(newCandidate.email, 'email')) {
      try {
        console.log(`[InboxImport] Sending application confirmation email to ${newCandidate.email}...`);
        await sendAutomaticEmail(newCandidate, 'applicationReceived');
      } catch (autoEmailErr) {
        console.error('[InboxImport] Auto-acknowledgement email failed:', autoEmailErr.message);
      }
    }

    // Update IngestionLog on success
    await IngestionLog.updateOne(
      { id: logId },
      { 
        status: 'success', 
        candidateId: newCandidate.id,
        candidateName: newCandidate.name,
        extractedData: parsedData
      }
    ).catch(e => console.error('Failed to update ingestion log:', e));

    // Mark read in email
    try {
      if (provider === 'outlook') {
        const token = await getOutlookAccessToken();
        await markOutlookEmailAsRead(token, emailConfig.outlookUserEmail, messageId);
      } else {
        await markIMAPEmailAsRead(messageId, emailConfig);
      }
    } catch (e) {
      console.error(`Failed to mark email ${messageId} as read:`, e.message);
    }

    // Rebuild index
    const candidates = await Candidate.find();
    searchIndex.buildIndex(candidates);

    // Async RAG indexing (non-blocking)
    indexCandidate(newCandidate).catch(err => console.error('RAG index failed for', newCandidate.name, err.message));

    console.log(`Successfully imported: ${newCandidate.name}`);
    return newCandidate;
  } catch (error) {
    console.error(`Failed to process attachment ${filename}:`, error);
    
    // Delete from ProcessedEmail so it can be retried on next poll/manual request
    await ProcessedEmail.deleteOne({ messageId }).catch(() => {});

    // Clean up temp file on failure
    try {
      if (localFilePath && fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (err) {}

    // Update IngestionLog on failure
    await IngestionLog.updateOne(
      { id: logId },
      { 
        status: 'failed', 
        error: error.message
      }
    ).catch(e => console.error('Failed to update ingestion log:', e));
  }
}

let isEmailPolling = false;

async function runEmailPoller() {
  if (isEmailPolling) return;
  isEmailPolling = true;
  try {
    const emailConfig = await getEmailConfig();
    
    if (!emailConfig.sourcingAgentActive) return;

    const provider = emailConfig.provider;

    if (provider === 'outlook') {
      // Outlook Graph API polling
      if (!emailConfig.outlookClientId || !emailConfig.outlookClientSecret || !emailConfig.outlookUserEmail) return;

      console.log('Automated Poller: Checking for new resumes via Outlook (Microsoft Graph)...');
      
      try {
        const accessToken = await getOutlookAccessToken();
        const emailsList = await listOutlookMessages(accessToken, emailConfig.outlookUserEmail);
        lastOutlookConnectionStatus = { success: true, error: null, lastChecked: new Date() };

        for (const email of emailsList) {
          const alreadyProcessed = await ProcessedEmail.exists({ messageId: email.id });
          if (alreadyProcessed) continue;

          // Categorize email
          let category = 'Other';
          try {
            const catResult = await categorizeEmail({
              subject: email.subject,
              from: email.from,
              body: email.snippet || email.body,
              hasAttachments: email.attachments.length > 0
            });
            category = catResult.category;
            console.log(`Email categorized as: ${category} (confidence: ${catResult.confidence})`);
          } catch (catErr) {
            console.warn('Email categorization failed:', catErr.message);
          }

          // Only process Resume-category emails with PDF attachments
          if (category === 'Spam') {
            await ProcessedEmail.updateOne(
              { messageId: email.id },
              { $setOnInsert: { messageId: email.id, processedAt: new Date() } },
              { upsert: true }
            );
            continue;
          }

          for (const att of email.attachments) {
            if (att.contentType === 'application/pdf' || att.filename?.toLowerCase().endsWith('.pdf')) {
              try {
                const freshToken = await getOutlookAccessToken();
                const attData = await getOutlookAttachmentData(freshToken, emailConfig.outlookUserEmail, email.id, att.attachmentId);
                await processEmailAttachment(email.id, attData.filename, attData.buffer, emailConfig, 'outlook');
              } catch (attErr) {
                console.error(`Failed to process Outlook attachment:`, attErr.message);
                await EmailLog.create({ level: 'error', source: 'outlook-poll', message: `Attachment processing failed: ${attErr.message}`, emailId: email.id });
              }
              break;
            }
          }

          await ProcessedEmail.updateOne(
            { messageId: email.id },
            { $setOnInsert: { messageId: email.id, processedAt: new Date() } },
            { upsert: true }
          );
        }
      } catch (outlookErr) {
        console.error('Outlook Poller Error:', outlookErr.message);
        lastOutlookConnectionStatus = { success: false, error: outlookErr.message, lastChecked: new Date() };
        await EmailLog.create({ level: 'error', source: 'outlook-poll', message: outlookErr.message }).catch(() => {});
      }
    } else {
      // Gmail IMAP polling (existing logic)
      const hasImapConfig = !!(emailConfig.user && emailConfig.pass);
      if (!hasImapConfig) return;

      console.log(`Automated Poller: Checking for new resumes via ${emailConfig.provider}...`);
      try {
        const emailsList = await fetchIMAPEmails(emailConfig);
        lastGmailConnectionStatus = { success: true, error: null, lastChecked: new Date() };

        for (const email of emailsList) {
          const alreadyProcessed = await ProcessedEmail.exists({ messageId: email.id });
          if (alreadyProcessed) continue;

          for (const att of email.attachments) {
            if (att.contentType === 'application/pdf' || att.filename?.toLowerCase().endsWith('.pdf')) {
              const parts = att.attachmentId.split('-att-');
              const idx = parts[1] || '0';
              const imapAtt = await getIMAPAttachmentData(email.id, idx, emailConfig);
              const buffer = imapAtt.buffer;
              await processEmailAttachment(email.id, att.filename, buffer, emailConfig, 'gmail');
              break;
            }
          }
          
          await ProcessedEmail.updateOne(
            { messageId: email.id },
            { $setOnInsert: { messageId: email.id, processedAt: new Date() } },
            { upsert: true }
          );
        }
      } catch (gmailErr) {
        console.error('Gmail Poller Error:', gmailErr.message);
        const errMsg = gmailErr.responseText ? `${gmailErr.message}: ${gmailErr.responseText}` : gmailErr.message;
        lastGmailConnectionStatus = { success: false, error: errMsg, lastChecked: new Date() };
        await EmailLog.create({ level: 'error', source: 'poller', message: errMsg }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Automated Poller Error:', err.message);
    try { await EmailLog.create({ level: 'error', source: 'poller', message: err.message }); } catch(e) {}
  } finally {
    isEmailPolling = false;
  }
}

// Background Poller
setInterval(runEmailPoller, 30000);
runEmailPoller();

/* ==========================================================================
   API ROUTES
   ========================================================================== */

app.get('/api/gmail/emails', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  const emailConfig = await getEmailConfig();

  if (emailConfig.provider === 'outlook') {
    // Use Outlook Graph API
    if (!emailConfig.outlookClientId || !emailConfig.outlookClientSecret || !emailConfig.outlookUserEmail) {
      return res.status(401).json({ error: 'Outlook credentials not configured.' });
    }
    try {
      const accessToken = await getOutlookAccessToken();
      const fetchedEmails = await listOutlookMessages(accessToken, emailConfig.outlookUserEmail);
      lastOutlookConnectionStatus = { success: true, error: null, lastChecked: new Date() };
      
      const emailList = [];
      for (const email of fetchedEmails) {
        const alreadyProcessed = await ProcessedEmail.exists({ messageId: email.id });
        if (!alreadyProcessed) {
          emailList.push(email);
        }
      }
      
      return res.json({ emails: emailList });
    } catch (error) {
      console.error('Outlook fetch error:', error.message);
      lastOutlookConnectionStatus = { success: false, error: error.message, lastChecked: new Date() };
      return res.status(500).json({ error: error.message });
    }
  }

  // Gmail IMAP (existing logic)
  const hasImapConfig = !!(emailConfig.user && emailConfig.pass);
  if (!hasImapConfig) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const fetchedEmails = await fetchIMAPEmails(emailConfig);
    lastGmailConnectionStatus = { success: true, error: null, lastChecked: new Date() };
    
    const emailList = [];
    for (const email of fetchedEmails) {
      const alreadyProcessed = await ProcessedEmail.exists({ messageId: email.id });
      if (!alreadyProcessed) {
        emailList.push(email);
      }
    }
    res.json({ emails: emailList });
  } catch (error) {
    console.error('Gmail fetch error:', error.message);
    const errMsg = error.responseText ? `${error.message}: ${error.responseText}` : error.message;
    lastGmailConnectionStatus = { success: false, error: errMsg, lastChecked: new Date() };
    res.status(500).json({ error: errMsg });
  }
});

// Fetch raw attachment to preview PDF before parsing
app.get('/api/gmail/attachment/:messageId/:attachmentId', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  const { messageId, attachmentId } = req.params;
  const emailConfig = await getEmailConfig();

  if (emailConfig.provider === 'outlook') {
    try {
      const accessToken = await getOutlookAccessToken();
      const attData = await getOutlookAttachmentData(accessToken, emailConfig.outlookUserEmail, messageId, attachmentId);
      res.setHeader('Content-Type', 'application/pdf');
      res.send(attData.buffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  // Gmail IMAP
  const hasImapConfig = !!(emailConfig.user && emailConfig.pass);
  if (!hasImapConfig) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const parts = attachmentId.split('-att-');
    const imapAtt = await getIMAPAttachmentData(messageId, parts[1] || '0', emailConfig);
    const buffer = imapAtt.buffer;
    res.setHeader('Content-Type', 'application/pdf');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual extraction trigger
app.post('/api/candidates/extract-gmail', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  const { messageId, attachmentId, jobId } = req.body;
  if (!messageId || !attachmentId) return res.status(400).json({ error: 'Missing parameters.' });
  
  const alreadyProcessed = await ProcessedEmail.exists({ messageId });
  if (alreadyProcessed) return res.status(400).json({ error: 'Email already processed.' });

  const emailConfig = await getEmailConfig();
  let filename, buffer;

  if (emailConfig.provider === 'outlook') {
    if (!emailConfig.outlookClientId || !emailConfig.outlookClientSecret || !emailConfig.outlookUserEmail) {
      return res.status(401).json({ error: 'Outlook credentials not configured.' });
    }
    try {
      const accessToken = await getOutlookAccessToken();
      const attData = await getOutlookAttachmentData(accessToken, emailConfig.outlookUserEmail, messageId, attachmentId);
      filename = attData.filename;
      buffer = attData.buffer;
    } catch (error) {
      return res.status(500).json({ error: `Outlook attachment download failed: ${error.message}` });
    }
  } else {
    const hasImapConfig = !!(emailConfig.user && emailConfig.pass);
    if (!hasImapConfig) return res.status(401).json({ error: 'Not authenticated.' });
    try {
      const parts = attachmentId.split('-att-');
      const imapAtt = await getIMAPAttachmentData(messageId, parts[1] || '0', emailConfig);
      filename = imapAtt.filename;
      buffer = imapAtt.buffer;
    } catch (error) {
      return res.status(500).json({ error: `Email attachment download failed: ${error.message}` });
    }
  }

  const logId = `ingestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const ingestionLog = new IngestionLog({
    id: logId,
    fileName: filename,
    source: emailConfig.provider === 'outlook' ? 'outlook' : 'gmail',
    status: 'processing'
  });
  await ingestionLog.save().catch(e => console.error('Failed to create ingestion log:', e));

  let localFilePath = null;

  try {
    const localFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    localFilePath = path.join(UPLOADS_DIR, localFilename);
    fs.writeFileSync(localFilePath, buffer);
    let pdfText = '';
    try {
      pdfText = await extractTextFromFile(localFilePath, filename, null);
    } catch (err) {
      console.warn('Failed to extract text locally:', err.message);
    }
    const pdfBase64 = buffer.toString('base64');
    const parsedData = await parseResume(pdfText, pdfBase64);

    // Duplicate Check
    let duplicate = null;
    const queries = [];
    if (parsedData.email && !isGenericVal(parsedData.email, 'email')) {
      queries.push({ email: { $regex: new RegExp(`^${escapeRegex(parsedData.email.trim())}$`, 'i') } });
    }
    if (parsedData.name && !isGenericVal(parsedData.name, 'name')) {
      queries.push({ name: { $regex: new RegExp(`^${escapeRegex(parsedData.name.trim())}$`, 'i') } });
    }
    if (queries.length > 0) {
      duplicate = await Candidate.findOne({ $or: queries });
    }

    if (duplicate) {
      // Clean up temp file
      try {
        if (localFilePath && fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }
      } catch (err) {
        console.error('Failed to delete temp file for duplicate:', err);
      }

      await IngestionLog.updateOne(
        { id: logId },
        { 
          status: 'duplicate', 
          error: `Duplicate candidate: with email ${parsedData.email || 'N/A'} (${duplicate.name}) already exists.`
        }
      ).catch(e => console.error('Failed to update ingestion log:', e));
      return res.status(409).json({ error: `Candidate with email ${parsedData.email || 'N/A'} (${duplicate.name}) already exists in the pipeline.` });
    }

    let settings = await Settings.findById('global');

    console.log(`Scoring according to candidate's own category...`);
    const ownCategoryResult = await scoreCandidateByOwnCategory(parsedData);

    let job = null;
    let scoringResult = { score: 0, matchingSkills: [], missingSkills: [], reasoning: '' };

    if (jobId) {
      job = await Job.findOne({ id: jobId });
    }
    
    // Auto-Routing: If no explicit jobId is provided, try to find the best match
    if (!jobId || !job) {
      job = await autoRouteCandidate(parsedData);
      if (job) {
        jobId = job.id;
      }
    }
    if (job) {
      console.log(`Scoring against job: ${job.title}...`);
      scoringResult = await scoreCandidate(parsedData, job);
    }

    let generatedTags = await generateTags(parsedData, job || { title: 'General Role', description: '' }, settings?.tagPreferences || []);

    const newCandidate = new Candidate({
      id: `candidate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, jobId, name: parsedData.name || 'Unknown',
      email: parsedData.email || '', phone: parsedData.phone || '',
      linkedinUrl: parsedData.linkedinUrl || '',
      skills: parsedData.skills || [], experience: parsedData.experience || [],
      education: parsedData.education || [], tags: generatedTags, stage: 'Inbox',
      resumeUrl: `/api/uploads/${localFilename}`, resumeText: pdfText, 
      matchScore: scoringResult.score || 0,
      matchingSkills: scoringResult.matchingSkills || [], missingSkills: scoringResult.missingSkills || [],
      matchExplanation: scoringResult.reasoning || '', 
      ownCategoryScore: ownCategoryResult.score || 0,
      ownCategoryMatchingSkills: ownCategoryResult.matchingSkills || [],
      ownCategoryMissingSkills: ownCategoryResult.missingSkills || [],
      ownCategoryExplanation: ownCategoryResult.reasoning || '',
      comments: '',
      seniorityLevel: parsedData.seniorityLevel || 'Mid',
      interviewQuestions: parsedData.interviewQuestions || [],
      hrQuestions: parsedData.hrQuestions || [],
      technicalQuestions: parsedData.technicalQuestions || [],
      projects: parsedData.projects || [],
      history: [{ date: new Date().toISOString(), type: 'Imported', text: `Imported via manual trigger: ${filename}` }]
    });

    await newCandidate.save();

    await IngestionLog.updateOne(
      { id: logId },
      { 
        status: 'success', 
        candidateId: newCandidate.id,
        candidateName: newCandidate.name,
        extractedData: parsedData
      }
    ).catch(e => console.error('Failed to update ingestion log:', e));

    await ProcessedEmail.create({ messageId });
    searchIndex.buildIndex(await Candidate.find());

    // Mark as read
    try {
      if (emailConfig.provider === 'outlook') {
        const token = await getOutlookAccessToken();
        await markOutlookEmailAsRead(token, emailConfig.outlookUserEmail, messageId);
      } else {
        await markIMAPEmailAsRead(messageId, emailConfig);
      }
    } catch (e) {}

    const candObj = newCandidate.toObject();
    res.json({
      ...candObj,
      candidate: candObj
    });
  } catch (error) {
    // Clean up temp file on failure
    try {
      if (localFilePath && fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (err) {}

    await IngestionLog.updateOne(
      { id: logId },
      { 
        status: 'failed', 
        error: error.message
      }
    ).catch(e => console.error('Failed to update ingestion log:', e));
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/candidates/:id/resume-html', authenticateToken, async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ id: req.params.id });
    if (!candidate || !candidate.resumeUrl) {
      return res.status(404).send('Resume not found.');
    }

    const filePath = path.join(UPLOADS_DIR, path.basename(candidate.resumeUrl));
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Resume file not found on server.');
    }

    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.docx') {
      const html = await convertDocxToHtml(filePath);
      const styledHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                color: #e5e7eb;
                background-color: #0f172a;
                padding: 32px;
                line-height: 1.7;
                margin: 0;
              }
              p { margin-bottom: 1.2em; }
              h1, h2, h3, h4, h5, h6 { 
                color: #ffffff; 
                margin-top: 1.8em; 
                margin-bottom: 0.6em; 
                font-weight: 600;
              }
              h1 { border-bottom: 1px solid #334155; padding-bottom: 8px; }
              ul, ol { margin-bottom: 1.2em; padding-left: 24px; }
              li { margin-bottom: 0.4em; }
              table { 
                border-collapse: collapse; 
                width: 100%; 
                margin-bottom: 1.5em; 
              }
              th, td { 
                border: 1px solid #334155; 
                padding: 10px; 
                text-align: left; 
              }
              th { background-color: #1e293b; }
            </style>
          </head>
          <body>
            ${html || '<p>Empty Document</p>'}
          </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      return res.send(styledHtml);
    } else if (ext === '.txt' || ext === '.rtf' || ext === '.md') {
      const text = fs.readFileSync(filePath, 'utf-8');
      const styledHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                color: #e5e7eb;
                background-color: #0f172a;
                padding: 32px;
                line-height: 1.7;
                white-space: pre-wrap;
                margin: 0;
                font-size: 14px;
              }
            </style>
          </head>
          <body>${text}</body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      return res.send(styledHtml);
    } else {
      return res.status(400).send('Only .docx, .txt, .rtf, .md files can be viewed as HTML.');
    }
  } catch (error) {
    console.error('Failed to convert resume to HTML:', error);
    return res.status(500).send(`Error converting resume: ${error.message}`);
  }
});

// --- Auto-Routing Helper ---
async function autoRouteCandidate(parsedData) {
  try {
    const activeJobs = await Job.find({ status: 'Active' });
    if (!activeJobs || activeJobs.length === 0) return null;
    
    let bestJob = null;
    let highestScore = 0;
    
    // Quick heuristic: keyword overlap between candidate skills and job requirements
    const candidateSkills = (parsedData.skills || []).map(s => s.toLowerCase());
    if (candidateSkills.length === 0) return null;
    
    for (const job of activeJobs) {
      let score = 0;
      const jobReqs = (job.requirementsChecklist || []).map(r => r.toLowerCase());
      const jobDesc = (job.requirements || '').toLowerCase() + ' ' + (job.description || '').toLowerCase();
      
      // 1. Check overlap with requirementsChecklist
      for (const req of jobReqs) {
        if (candidateSkills.some(skill => req.includes(skill) || skill.includes(req))) {
          score += 2; // high weight for checklist overlap
        }
      }
      
      // 2. Check overlap of candidate skills within job description text
      for (const skill of candidateSkills) {
        if (skill.length > 2 && jobDesc.includes(skill)) {
          score += 1;
        }
      }
      
      if (score > highestScore && score > 0) {
        highestScore = score;
        bestJob = job;
      }
    }
    
    if (bestJob) {
      console.log(`Auto-routed candidate '${parsedData.name}' to job '${bestJob.title}' (overlap score: ${highestScore})`);
      return bestJob;
    }
    return null;
  } catch (err) {
    console.error('Auto-routing failed:', err);
    return null;
  }
}

app.post('/api/candidates/upload', authenticateToken, requireRole(['admin', 'recruiter']), upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No resume file uploaded.' });
  global.lastUploadedFilename = req.file.originalname;
  let { jobId, logId } = req.body;

  let activeLogId = logId;
  let existingLog = null;
  if (logId) {
    existingLog = await IngestionLog.findOne({ id: logId });
  }

  if (!existingLog) {
    activeLogId = `ingestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ingestionLog = new IngestionLog({
      id: activeLogId,
      fileName: req.file.originalname,
      source: 'manual',
      status: 'processing'
    });
    await ingestionLog.save().catch(e => console.error('Failed to create ingestion log:', e));
  } else {
    existingLog.status = 'processing';
    existingLog.timestamp = new Date();
    await existingLog.save().catch(e => console.error('Failed to update ingestion log:', e));
  }

  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.pdf' && ext !== '.docx') {
      throw new Error(`Unsupported or unreadable file format: ${req.file.originalname}`);
    }
    let pdfText = '';
    try {
      pdfText = await extractTextFromFile(req.file.path, req.file.originalname, req.file.mimetype);
    } catch (err) {
      console.warn('Failed to extract text locally:', err.message);
    }
    const fileBuffer = fs.readFileSync(req.file.path);
    const pdfBase64 = fileBuffer.toString('base64');
    const parsedData = await parseResume(pdfText, pdfBase64);
    
    // Duplicate Check
    let duplicate = null;
    const queries = [];
    if (parsedData.email && !isGenericVal(parsedData.email, 'email')) {
      queries.push({ email: { $regex: new RegExp(`^${escapeRegex(parsedData.email.trim())}$`, 'i') } });
    }
    if (parsedData.name && !isGenericVal(parsedData.name, 'name')) {
      queries.push({ name: { $regex: new RegExp(`^${escapeRegex(parsedData.name.trim())}$`, 'i') } });
    }
    if (queries.length > 0) {
      duplicate = await Candidate.findOne({ $or: queries });
    }

    if (duplicate) {
      await IngestionLog.updateOne(
        { id: activeLogId },
        { 
          status: 'duplicate', 
          error: `Duplicate candidate: with email ${parsedData.email || 'N/A'} (${duplicate.name}) already exists.`
        }
      ).catch(e => console.error('Failed to update ingestion log:', e));

      return res.status(409).json({
        error: `Candidate with email ${parsedData.email || 'N/A'} (${duplicate.name}) already exists in the pipeline.`,
        duplicate: true,
        candidate: duplicate,
        tempFile: req.file.filename,
        parsedData: parsedData,
        pdfText: pdfText,
        jobId: jobId || null,
        logId: activeLogId
      });
    }

    let settings = await Settings.findById('global');

    let ownCategoryResult = { score: 0, matchingSkills: [], missingSkills: [], reasoning: '' };
    let scoringResult = { score: 0, matchingSkills: [], missingSkills: [], reasoning: '' };
    let generatedTags = [];

    let job = null;
    if (jobId) {
      job = await Job.findOne({ id: jobId });
    }
    
    // Auto-Routing: If no explicit jobId is provided, try to find the best match
    if (!jobId || !job) {
      job = await autoRouteCandidate(parsedData);
      if (job) {
        jobId = job.id;
      }
    }

    if (job && (!job.requirementsChecklist || job.requirementsChecklist.length === 0)) {
      console.log(`Auto-generating requirements checklist for job ${job.title}...`);
      const generatedChecklist = await extractChecklistFromJob(job);
      job.requirementsChecklist = generatedChecklist;
      await job.save().catch(e => console.error('Failed to save auto-generated checklist:', e));
    }

    let checklistResult = { score: 0, passedCoreSkills: true, matchedRequirements: [], unmatchedRequirements: [], reasoning: '', checklist: [] };
    let jdQuestions = null;

    try {
      console.log('Running analysis, scoring, and tag generation in parallel...');
      const results = await Promise.all([
        scoreCandidateByOwnCategory(parsedData).catch(e => { console.error('Own category score failed:', e.message); return null; }),
        job ? scoreCandidate(parsedData, job).catch(e => { console.error('Job match score failed:', e.message); return null; }) : Promise.resolve(null),
        generateTags(parsedData, job || { title: 'General', description: '' }, settings?.tagPreferences || []).catch(e => { console.error('Tag generation failed:', e.message); return null; }),
        job ? scoreCandidateAgainstChecklist(parsedData, job).catch(e => { console.error('Checklist score failed:', e.message); return null; }) : Promise.resolve(null),
      ]);
      if (results[0]) ownCategoryResult = results[0];
      if (results[1]) scoringResult = results[1];
      if (results[2]) generatedTags = results[2];
      if (results[3]) checklistResult = results[3];
      
      // Override primary holistic score with the checklist score if a checklist was generated and evaluated
      if (checklistResult.checklist && checklistResult.checklist.length > 0) {
        scoringResult = {
          score: checklistResult.score,
          matchingSkills: checklistResult.matchedRequirements,
          missingSkills: checklistResult.unmatchedRequirements,
          reasoning: checklistResult.reasoning
        };
      }

      const score = scoringResult.score || 0;
      if (job && score > 50) {
        console.log(`ATS score is ${score}% (> 50%). Generating Tailored Questions...`);
        jdQuestions = await generateQuestionsForCandidate(parsedData, job).catch(e => {
          console.error('JD question generation failed:', e.message);
          return null;
        });
      } else {
        console.log(`ATS score is ${score}% (<= 50%). Skipping tailored question generation to decrease load on Ollama.`);
      }
    } catch (err) {
      console.error('Parallel scoring/tagging failed:', err.message);
    }

    const newCandidate = new Candidate({
      id: `candidate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, jobId, name: parsedData.name || 'Unknown',
      email: parsedData.email || '', phone: parsedData.phone || '',
      linkedinUrl: parsedData.linkedinUrl || '',
      skills: parsedData.skills || [], experience: parsedData.experience || [],
      education: parsedData.education || [], tags: generatedTags, stage: 'Inbox',
      resumeUrl: `/api/uploads/${req.file.filename}`, resumeText: pdfText, 
      matchScore: scoringResult.score || 0,
      matchingSkills: scoringResult.matchingSkills || [], missingSkills: scoringResult.missingSkills || [],
      matchExplanation: scoringResult.reasoning || '', 
      ownCategoryScore: ownCategoryResult.score || 0,
      ownCategoryMatchingSkills: ownCategoryResult.matchingSkills || [],
      ownCategoryMissingSkills: ownCategoryResult.missingSkills || [],
      ownCategoryExplanation: ownCategoryResult.reasoning || '',
      comments: '',
      seniorityLevel: parsedData.seniorityLevel || 'Mid',
      interviewQuestions: parsedData.interviewQuestions || [],
      hrQuestions: jdQuestions?.hrQuestions || parsedData.hrQuestions || [],
      technicalQuestions: jdQuestions?.technicalQuestions || parsedData.technicalQuestions || [],
      redFlags: jdQuestions?.red_flags || parsedData.red_flags || [],
      projects: parsedData.projects || [],
      checklist: checklistResult.checklist || [],
      checklistScore: checklistResult.score || 0,
      matchedRequirements: checklistResult.matchedRequirements || [],
      unmatchedRequirements: checklistResult.unmatchedRequirements || [],
      passedCoreSkills: checklistResult.passedCoreSkills !== false,
      extractedData: parsedData,
      history: [{ date: new Date().toISOString(), type: 'Imported', text: `Manual upload: ${req.file.originalname}` }]
    });

    await newCandidate.save();

    // Automatically send application received confirmation email to candidate
    if (newCandidate.email && !isGenericVal(newCandidate.email, 'email')) {
      try {
        console.log(`[Upload] Sending application confirmation email to ${newCandidate.email}...`);
        await sendAutomaticEmail(newCandidate, 'applicationReceived');
      } catch (autoEmailErr) {
        console.error('[Upload] Auto-acknowledgement email failed:', autoEmailErr.message);
      }
    }

    // Re-calculate ranks for all candidates of the same job
    if (jobId) {
      const candidatesForJob = await Candidate.find({ jobId }).sort({ matchScore: -1 });
      const totalApplicants = candidatesForJob.length;
      for (let index = 0; index < candidatesForJob.length; index++) {
        const cand = candidatesForJob[index];
        cand.rank = index + 1;
        cand.totalApplicants = totalApplicants;
        await cand.save().catch(e => console.error('Failed to update candidate rank:', e));
      }
    }

    await IngestionLog.updateOne(
      { id: activeLogId },
      { 
        status: 'success', 
        candidateId: newCandidate.id,
        candidateName: newCandidate.name,
        extractedData: parsedData
      }
    ).catch(e => console.error('Failed to update ingestion log:', e));

    searchIndex.buildIndex(await Candidate.find());
    // Async RAG indexing (non-blocking)
    indexCandidate(newCandidate).catch(err => console.error('RAG index failed for', newCandidate.name, err.message));
    
    // Refresh Candidate object with updated rank
    const finalCandidateObj = await Candidate.findOne({ id: newCandidate.id });
    const candObj = finalCandidateObj ? finalCandidateObj.toObject() : newCandidate.toObject();
    res.json({
      ...candObj,
      candidate: candObj
    });
  } catch (error) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    await IngestionLog.updateOne(
      { id: activeLogId },
      { 
        status: 'failed', 
        error: error.message
      }
    ).catch(e => console.error('Failed to update ingestion log:', e));
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/candidates/upload/resolve', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  let { action, candidateId, tempFile, parsedData, pdfText, jobId, logId } = req.body;
  const data = (parsedData && typeof parsedData === 'object') ? parsedData : {};

  if (tempFile) {
    const rawResolvedPath = path.resolve(UPLOADS_DIR, tempFile);
    if (!rawResolvedPath.startsWith(UPLOADS_DIR)) {
      return res.status(400).json({ error: 'Invalid tempFile path.' });
    }
  }

  const sanitizedTempFile = tempFile ? path.basename(tempFile) : null;

  if (sanitizedTempFile) {
    const resolvedPath = path.resolve(UPLOADS_DIR, sanitizedTempFile);
    if (!resolvedPath.startsWith(UPLOADS_DIR)) {
      return res.status(400).json({ error: 'Invalid tempFile path.' });
    }
  }

  try {
    if (!['update', 'delete-before', 'remove', 'cancel'].includes(action)) {
      if (logId) {
        await IngestionLog.updateOne(
          { id: logId },
          { 
            status: 'failed', 
            error: 'Invalid action provided.'
          }
        ).catch(e => console.error('Failed to update ingestion log:', e));
      }
      return res.status(400).json({ error: 'Invalid action provided.' });
    }

    if (action === 'update') {
      const candidate = await Candidate.findOne({ id: candidateId });
      if (!candidate) {
        if (sanitizedTempFile) {
          const tempPath = path.join(UPLOADS_DIR, sanitizedTempFile);
          if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch (e) {}
          }
        }
        if (logId) {
          await IngestionLog.updateOne(
            { id: logId },
            { 
              status: 'failed', 
              error: 'Candidate not found.'
            }
          ).catch(e => console.error('Failed to update ingestion log:', e));
        }
        return res.status(404).json({ error: 'Candidate not found.' });
      }

      // Delete old file if exists
      if (candidate.resumeUrl) {
        const oldFilename = candidate.resumeUrl.replace('/api/uploads/', '').replace('/uploads/', '');
        const oldFilepath = path.join(UPLOADS_DIR, oldFilename);
        if (fs.existsSync(oldFilepath) && oldFilename !== sanitizedTempFile) {
          try { fs.unlinkSync(oldFilepath); } catch (e) {}
        }
      }

      // Update fields
      candidate.name = data.name || candidate.name;
      candidate.email = data.email || candidate.email;
      candidate.phone = data.phone || candidate.phone;
      candidate.linkedinUrl = data.linkedinUrl || candidate.linkedinUrl;
      candidate.currentCtc = data.currentCtc || candidate.currentCtc || '';
      candidate.expectedCtc = data.expectedCtc || candidate.expectedCtc || '';
      candidate.noticePeriod = data.noticePeriod || candidate.noticePeriod || '';
      candidate.skills = data.skills || candidate.skills;
      candidate.experience = data.experience || candidate.experience;
      candidate.education = data.education || candidate.education;
      candidate.resumeText = pdfText || candidate.resumeText;
      candidate.hrQuestions = data.hrQuestions || candidate.hrQuestions;
      candidate.technicalQuestions = data.technicalQuestions || candidate.technicalQuestions;
      candidate.redFlags = data.red_flags || candidate.redFlags;
      candidate.seniorityLevel = data.seniorityLevel || candidate.seniorityLevel;
      candidate.projects = data.projects || candidate.projects;
      if (sanitizedTempFile) {
        candidate.resumeUrl = `/api/uploads/${sanitizedTempFile}`;
      }
      if (jobId) {
        candidate.jobId = jobId;
      }

      let settings = await Settings.findById('global');

      // Re-score candidate
      const ownCategoryResult = await scoreCandidateByOwnCategory(data);
      candidate.ownCategoryScore = ownCategoryResult.score || 0;
      candidate.ownCategoryMatchingSkills = ownCategoryResult.matchingSkills || [];
      candidate.ownCategoryMissingSkills = ownCategoryResult.missingSkills || [];
      candidate.ownCategoryExplanation = ownCategoryResult.reasoning || '';

      let job = null;
      let scoringResult = { score: 0, matchingSkills: [], missingSkills: [], reasoning: '' };
      if (candidate.jobId) {
        job = await Job.findOne({ id: candidate.jobId });
      }
      if (job) {
        scoringResult = await scoreCandidate(data, job);
      }
      candidate.matchScore = scoringResult.score || 0;
      candidate.matchingSkills = scoringResult.matchingSkills || [];
      candidate.missingSkills = scoringResult.missingSkills || [];
      candidate.matchExplanation = scoringResult.reasoning || '';

      // Re-generate tags
      try {
        const generatedTags = await generateTags(data, job || { title: 'General', description: '' }, settings?.tagPreferences || []);
        candidate.tags = generatedTags;
      } catch (e) {
        console.warn('Tag generation failed during update:', e.message);
      }

      candidate.history.push({
        date: new Date().toISOString(),
        type: 'Updated',
        text: `Manual upload updated resume: ${sanitizedTempFile ? sanitizedTempFile.split('-').slice(2).join('-') : 'Updated'}`
      });

      await candidate.save();

      if (logId) {
        await IngestionLog.updateOne(
          { id: logId },
          { 
            status: 'success', 
            candidateId: candidate.id,
            candidateName: candidate.name,
            extractedData: data,
            error: ''
          }
        ).catch(e => console.error('Failed to update ingestion log:', e));
      }

      searchIndex.buildIndex(await Candidate.find());
      // Async RAG indexing (non-blocking)
      indexCandidate(candidate).catch(err => console.error('RAG index failed for', candidate.name, err.message));
      const candObj = candidate.toObject();
      return res.json({
        ...candObj,
        candidate: candObj
      });

    } else if (action === 'remove') {
      const candidate = await Candidate.findOne({ id: candidateId });
      if (candidate) {
        if (candidate.resumeUrl) {
          const filename = candidate.resumeUrl.replace('/api/uploads/', '').replace('/uploads/', '');
          const filepath = path.join(UPLOADS_DIR, filename);
          if (fs.existsSync(filepath)) {
            try { fs.unlinkSync(filepath); } catch (e) {}
          }
        }
        await Candidate.deleteOne({ id: candidateId });

        // Cascade delete related records
        await CandidateProfile.deleteMany({ candidateId: candidateId }).catch(() => {});
        await JobMatch.deleteMany({ candidateId: candidateId }).catch(() => {});
        await ResumeChunk.deleteMany({ candidateId: candidateId }).catch(() => {});

        removeCandidate(candidateId).catch(err => console.error('RAG removal failed:', err.message));
      }

      // Delete the new temp file
      if (sanitizedTempFile) {
        const tempPath = path.join(UPLOADS_DIR, sanitizedTempFile);
        if (fs.existsSync(tempPath)) {
          try { fs.unlinkSync(tempPath); } catch (e) {}
        }
      }

      if (logId) {
        await IngestionLog.updateOne(
          { id: logId },
          { 
            status: 'cancelled', 
            error: 'Duplicate candidate removed from pipeline.'
          }
        ).catch(e => console.error('Failed to update ingestion log:', e));
      }

      searchIndex.buildIndex(await Candidate.find());
      return res.json({ success: true, removed: true, candidateId });

    } else if (action === 'delete-before') {
      const candidate = await Candidate.findOne({ id: candidateId });
      if (candidate) {
        if (candidate.resumeUrl) {
          const filename = candidate.resumeUrl.replace('/api/uploads/', '').replace('/uploads/', '');
          const filepath = path.join(UPLOADS_DIR, filename);
          if (fs.existsSync(filepath)) {
            try { fs.unlinkSync(filepath); } catch (e) {}
          }
        }
        await Candidate.deleteOne({ id: candidateId });

        // Cascade delete related records
        await CandidateProfile.deleteMany({ candidateId: candidateId }).catch(() => {});
        await JobMatch.deleteMany({ candidateId: candidateId }).catch(() => {});
        await ResumeChunk.deleteMany({ candidateId: candidateId }).catch(() => {});

        removeCandidate(candidateId).catch(err => console.error('RAG removal failed:', err.message));
      }

      let settings = await Settings.findById('global');

      let ownCategoryResult = { score: 0, matchingSkills: [], missingSkills: [], reasoning: '' };
      let scoringResult = { score: 0, matchingSkills: [], missingSkills: [], reasoning: '' };
      let generatedTags = [];

      let job = null;
      if (jobId) {
        job = await Job.findOne({ id: jobId });
      }
      
      // Auto-Routing: If no explicit jobId is provided, try to find the best match
      if (!jobId || !job) {
        job = await autoRouteCandidate(data);
        if (job) {
          jobId = job.id;
        }
      }

      try {
        console.log('Running resolve delete-before scoring in parallel...');
        const results = await Promise.all([
          scoreCandidateByOwnCategory(data).catch(e => { console.error('Own category score failed:', e.message); return null; }),
          job ? scoreCandidate(data, job).catch(e => { console.error('Job match score failed:', e.message); return null; }) : Promise.resolve(null),
          generateTags(data, job || { title: 'General', description: '' }, settings?.tagPreferences || []).catch(e => { console.error('Tag generation failed:', e.message); return null; })
        ]);
        if (results[0]) ownCategoryResult = results[0];
        if (results[1]) scoringResult = results[1];
        if (results[2]) generatedTags = results[2];
      } catch (err) {
        console.error('Parallel resolve delete-before scoring failed:', err.message);
      }

      const newCandidate = new Candidate({
        id: `candidate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        jobId,
        name: data.name || 'Unknown',
        email: data.email || '',
        phone: data.phone || '',
        linkedinUrl: data.linkedinUrl || '',
        skills: data.skills || [],
        experience: data.experience || [],
        education: data.education || [],
        tags: generatedTags,
        stage: 'Inbox',
        resumeUrl: sanitizedTempFile ? `/api/uploads/${sanitizedTempFile}` : '',
        resumeText: pdfText,
        matchScore: scoringResult.score || 0,
        matchingSkills: scoringResult.matchingSkills || [],
        missingSkills: scoringResult.missingSkills || [],
        matchExplanation: scoringResult.reasoning || '',
        ownCategoryScore: ownCategoryResult.score || 0,
        ownCategoryMatchingSkills: ownCategoryResult.matchingSkills || [],
        ownCategoryMissingSkills: ownCategoryResult.missingSkills || [],
        ownCategoryExplanation: ownCategoryResult.reasoning || '',
        comments: '',
        seniorityLevel: data.seniorityLevel || 'Mid',
        hrQuestions: [],
        technicalQuestions: [],
        projects: data.projects || []
      });

      const duplicateScore = scoringResult.score || 0;
      if (job && duplicateScore > 50) {
        try {
          const qna = await generateQuestionsForCandidate(newCandidate, job);
          newCandidate.hrQuestions = qna.hrQuestions || [];
          newCandidate.technicalQuestions = qna.technicalQuestions || [];
        } catch (err) {
          console.error('LLM Q&A generation failed during resolve delete-before:', err.message);
        }
      } else {
        console.log(`Duplicate candidate score is ${duplicateScore}% (<= 50%). Skipping Q&A generation to decrease load on Ollama.`);
      }

      newCandidate.history.push({
        date: new Date().toISOString(),
        type: 'Created',
        text: `Sourced candidate from email ingestion: ${sanitizedTempFile ? sanitizedTempFile.split('-').slice(2).join('-') : 'Created'}`
      });

      await newCandidate.save();

      if (logId) {
        await IngestionLog.updateOne(
          { id: logId },
          { 
            status: 'success', 
            candidateId: newCandidate.id,
            candidateName: newCandidate.name,
            extractedData: data,
            error: ''
          }
        ).catch(e => console.error('Failed to update ingestion log:', e));
      }

      searchIndex.buildIndex(await Candidate.find());
      indexCandidate(newCandidate).catch(err => console.error('RAG index failed for', newCandidate.name, err.message));

      const candObj = newCandidate.toObject();
      return res.json({
        ...candObj,
        candidate: candObj
      });

    } else if (action === 'cancel') {
      if (sanitizedTempFile) {
        const tempPath = path.join(UPLOADS_DIR, sanitizedTempFile);
        if (fs.existsSync(tempPath)) {
          try { fs.unlinkSync(tempPath); } catch (e) {}
        }
      }

      if (logId) {
        await IngestionLog.updateOne(
          { id: logId },
          { 
            status: 'cancelled', 
            error: 'Discarded uploaded file.'
          }
        ).catch(e => console.error('Failed to update ingestion log:', e));
      }

      return res.json({ success: true, cancelled: true });
    }
  } catch (error) {
    console.error('Failed to resolve duplicate upload:', error);
    if (logId) {
      await IngestionLog.updateOne(
        { id: logId },
        { 
          status: 'failed', 
          error: error.message
        }
      ).catch(e => console.error('Failed to update ingestion log:', e));
    }
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const candidates = await Candidate.find();
    const jobs = await Job.find();

    const totalCvs = candidates.length;

    // 1. Total CVs received per day (last 30 days or all dates)
    const dailyMap = {};
    candidates.forEach(c => {
      const dateStr = c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : 'Unknown';
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + 1;
    });

    const dailyCvs = Object.keys(dailyMap)
      .sort()
      .map(date => ({ date, count: dailyMap[date] }));

    // 2. Number of CVs received for each position
    // 3. Number of CVs routed to each position folder
    const jobMap = {};
    const routedFolderMap = {};

    // Initialize map for all existing jobs
    jobs.forEach(j => {
      jobMap[j.id] = { jobId: j.id, jobTitle: j.title, count: 0 };
      routedFolderMap[j.id] = { jobId: j.id, jobTitle: j.title, count: 0 };
    });
    jobMap['general'] = { jobId: 'general', jobTitle: 'General / Unassigned', count: 0 };
    routedFolderMap['general'] = { jobId: 'general', jobTitle: 'General / Unassigned', count: 0 };

    candidates.forEach(c => {
      const jId = c.jobId || 'general';
      if (!jobMap[jId]) {
        jobMap[jId] = { jobId: jId, jobTitle: jId, count: 0 };
        routedFolderMap[jId] = { jobId: jId, jobTitle: jId, count: 0 };
      }
      jobMap[jId].count += 1;
      routedFolderMap[jId].count += 1;
    });

    const cvsPerPosition = Object.values(jobMap);
    const cvsRoutedPerFolder = Object.values(routedFolderMap);

    res.json({
      totalCvs,
      dailyCvs,
      cvsPerPosition,
      cvsRoutedPerFolder
    });
  } catch (error) {
    console.error('Failed to calculate dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/candidates', authenticateToken, async (req, res) => {
  if (req.user.role === 'manager') {
    return res.json(await Candidate.find({ assignedTo: req.user.email }));
  }
  res.json(await Candidate.find());
});

app.get('/api/candidates/:id', authenticateToken, async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ id: req.params.id });
    if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });

    // If manager, check assignment
    if (req.user.role === 'manager' && candidate.assignedTo !== req.user.email) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this candidate.' });
    }

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/candidates/:id/similar', authenticateToken, async (req, res) => {
  try {
    const candidateId = req.params.id;
    const topK = parseInt(req.query.limit) || 5;
    const similar = await findSimilarCandidates(candidateId, topK);
    res.json(similar);
  } catch (error) {
    console.error('Failed to find similar candidates:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/candidates/:id', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ id: req.params.id });
    if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });

    if (candidate.resumeUrl) {
      const filename = candidate.resumeUrl.replace('/api/uploads/', '').replace('/uploads/', '');
      const filepath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filepath)) {
        try { fs.unlinkSync(filepath); } catch (e) {}
      }
    }

    await Candidate.deleteOne({ id: req.params.id });

    // Cascade delete related records
    await CandidateProfile.deleteMany({ candidateId: req.params.id }).catch(() => {});
    await JobMatch.deleteMany({ candidateId: req.params.id }).catch(() => {});
    await ResumeChunk.deleteMany({ candidateId: req.params.id }).catch(() => {});

    const candidates = await Candidate.find();
    searchIndex.buildIndex(candidates);

    // Remove from RAG index
    removeCandidate(req.params.id).catch(err => console.error('RAG removal failed:', err.message));

    res.json({ success: true, message: 'Candidate deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/gmail/emails/:id/dismiss', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  try {
    const messageId = req.params.id;
    await ProcessedEmail.create({ messageId });
    res.json({ success: true, message: 'Email dismissed successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/candidates/:id/stage', async (req, res) => {
  try {
    const { stage } = req.body;
    const candidate = await Candidate.findOne({ id: req.params.id });
    if (!candidate) return res.status(404).json({ error: 'Not found.' });

    const oldStage = candidate.stage;
    if (oldStage === stage) {
      return res.json(candidate);
    }
    candidate.stage = stage;
    candidate.history.push({ date: new Date().toISOString(), type: 'StageChanged', text: `Moved from "${oldStage}" to "${stage}"` });
    
    await candidate.save();

    // Trigger automatic stage email if applicable
    let triggerType = null;
    const lowerStage = (stage || '').toLowerCase();
    if (lowerStage.includes('shortlist')) {
      triggerType = 'shortlist';
    } else if (lowerStage.includes('interview')) {
      triggerType = 'interview';
    } else if (lowerStage.includes('offer')) {
      triggerType = 'offer';
    } else if (lowerStage.includes('reject')) {
      triggerType = 'reject';
    }

    if (triggerType) {
      await sendAutomaticEmail(candidate, triggerType);
    }

    res.json(candidate);
  } catch (error) {
    console.error('Failed to change candidate stage:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/candidates/:id/position', async (req, res) => {
  try {
    const { jobId } = req.body;
    const candidate = await Candidate.findOne({ id: req.params.id });
    if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });

    let oldJobTitle = 'General Role';
    if (candidate.jobId) {
      const oldJob = await Job.findOne({ id: candidate.jobId });
      if (oldJob) oldJobTitle = oldJob.title;
    }

    let newJobTitle = 'General Role';
    let targetJob = null;
    if (jobId) {
      targetJob = await Job.findOne({ id: jobId });
      if (targetJob) newJobTitle = targetJob.title;
    }

    candidate.jobId = jobId || null;
    candidate.history.push({
      date: new Date().toISOString(),
      type: 'PositionChanged',
      text: `Position updated from "${oldJobTitle}" to "${newJobTitle}"`
    });

    // Re-score candidate against the new job position
    const parsedData = {
      name: candidate.name,
      email: candidate.email,
      skills: candidate.skills,
      experience: candidate.experience,
      education: candidate.education,
      seniorityLevel: candidate.seniorityLevel,
      projects: candidate.projects
    };

    if (targetJob) {
      const ragChunks = await getRelevantChunksForJob(candidate.id, targetJob.description || targetJob.requirements);
      const scoringResult = await scoreCandidate(parsedData, targetJob, ragChunks);
      candidate.matchScore = scoringResult.score || 0;
      candidate.matchingSkills = scoringResult.matchingSkills || [];
      candidate.missingSkills = scoringResult.missingSkills || [];
      candidate.matchExplanation = scoringResult.reasoning || '';
    } else {
      const ownCategoryResult = await scoreCandidateByOwnCategory(parsedData);
      candidate.matchScore = ownCategoryResult.score || 0;
      candidate.matchingSkills = ownCategoryResult.matchingSkills || [];
      candidate.missingSkills = ownCategoryResult.missingSkills || [];
      candidate.matchExplanation = ownCategoryResult.reasoning || '';
    }

    await candidate.save();

    // Trigger automatic position change email notification
    const emailResult = await sendAutomaticEmail(candidate, 'positionChange', {
      oldJobTitle,
      jobTitle: newJobTitle
    });

    res.json({
      candidate,
      emailSent: emailResult.success,
      emailReason: emailResult.reason || emailResult.error || null
    });
  } catch (error) {
    console.error('Failed to change candidate position:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/candidates/:id/extracted-data', authenticateToken, async (req, res) => {
  try {
    const { currentLocation, totalYearsExperience, noticePeriod, currentCtc, expectedCtc, formAnswers, name, email, phone, skills } = req.body;
    const candidate = await Candidate.findOne({ id: req.params.id });
    if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });

    if (!candidate.extractedData) {
      candidate.extractedData = {};
    }
    
    if (name !== undefined) candidate.name = name;
    if (email !== undefined) candidate.email = email;
    if (phone !== undefined) candidate.phone = phone;
    if (skills !== undefined && Array.isArray(skills)) candidate.skills = skills;
    if (currentCtc !== undefined) candidate.currentCtc = currentCtc;
    if (expectedCtc !== undefined) candidate.expectedCtc = expectedCtc;
    if (noticePeriod !== undefined) candidate.noticePeriod = noticePeriod;

    candidate.extractedData = {
      ...candidate.extractedData,
      currentLocation: currentLocation !== undefined ? currentLocation : candidate.extractedData.currentLocation,
      totalYearsExperience: totalYearsExperience !== undefined ? totalYearsExperience : candidate.extractedData.totalYearsExperience,
      noticePeriod: noticePeriod !== undefined ? noticePeriod : (candidate.extractedData.noticePeriod || candidate.noticePeriod),
      currentCtc: currentCtc !== undefined ? currentCtc : (candidate.extractedData.currentCtc || candidate.currentCtc),
      expectedCtc: expectedCtc !== undefined ? expectedCtc : (candidate.extractedData.expectedCtc || candidate.expectedCtc),
      formAnswers: formAnswers !== undefined ? formAnswers : candidate.extractedData.formAnswers
    };
    
    candidate.markModified('extractedData');
    candidate.history.push({
      date: new Date().toISOString(),
      type: 'Status',
      text: `Manual update of profile: CTC='${candidate.currentCtc || 'N/A'}/${candidate.expectedCtc || 'N/A'}', Notice='${candidate.noticePeriod || 'N/A'}'`
    });

    await candidate.save();
    res.json(candidate);
  } catch (error) {
    console.error('Failed to update candidate details:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/candidates/:id/send-email', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  const { subject, body, attachOfferPdf } = req.body;
  const emailConfig = await getEmailConfig();

  const candidate = await Candidate.findOne({ id: req.params.id });
  if (!candidate) return res.status(404).json({ error: 'Not found.' });
  if (!candidate.email) return res.status(400).json({ error: 'No email specified.' });

  // Determine if offer letter attachment should be attached automatically
  const isOfferedStage = candidate.stage && candidate.stage.toLowerCase() === 'offered';
  const isOfferSubject = subject && /offer/i.test(subject);
  const shouldAttachOffer = attachOfferPdf !== false && (attachOfferPdf === true || isOfferedStage || isOfferSubject);

  let attachments = [];
  if (shouldAttachOffer) {
    try {
      const docxBuffer = await generateOfferLetterBuffer(candidate, candidate.offerDetails || {});
      const docxFilename = `Offer_Letter_${(candidate.name || 'Candidate').replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      attachments.push({
        filename: docxFilename,
        content: docxBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      console.log(`[SendEmail] Attached Offer Letter: ${docxFilename}`);
    } catch (err) {
      console.error('[SendEmail] Failed to generate offer attachment:', err);
    }
  }

  try {
    if (emailConfig.provider === 'outlook' && emailConfig.outlookClientId && emailConfig.outlookClientSecret && emailConfig.outlookUserEmail) {
      const accessToken = await getOutlookAccessToken();
      await sendOutlookEmail(accessToken, emailConfig.outlookUserEmail, { to: candidate.email, subject, body, attachments });
    } else {
      const hasImapConfig = !!(emailConfig.user && emailConfig.pass);
      if (!hasImapConfig) return res.status(401).json({ error: 'Not authenticated.' });
      await sendSMTPMessage({ to: candidate.email, subject, body, attachments });
    }

    const emailNote = attachments.length > 0 ? ` (with ${attachments[0].filename} attached)` : '';
    candidate.history.push({ date: new Date().toISOString(), type: 'EmailSent', text: `Sent email: "${subject}"${emailNote}` });
    await candidate.save();
    res.json({ success: true, message: 'Email sent successfully.', hasAttachment: attachments.length > 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/candidates/:id/send-offer-letter', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  try {
    const { offerDetails, subject, body, sendEmailNow } = req.body;
    const candidate = await Candidate.findOne({ id: req.params.id });
    if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });

    const shouldSendEmail = sendEmailNow !== false;
    let emailSent = false;
    let emailReason = '';

    // Generate official Docx Attachment
    let attachments = [];
    try {
      const docxBuffer = await generateOfferLetterBuffer(candidate, offerDetails);
      const filename = `Offer_Letter_${candidate.name.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      attachments.push({
        filename: filename,
        content: docxBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
    } catch (err) {
      console.error('Failed to generate offer docx:', err);
    }

    if (shouldSendEmail && subject && body && candidate.email) {
      try {
        const emailConfig = await getEmailConfig();
        if (emailConfig.provider === 'outlook' && emailConfig.outlookClientId && emailConfig.outlookClientSecret && emailConfig.outlookUserEmail) {
          const accessToken = await getOutlookAccessToken();
          await sendOutlookEmail(accessToken, emailConfig.outlookUserEmail, { to: candidate.email, subject, body, attachments });
          emailSent = true;
        } else if (emailConfig.user && emailConfig.pass) {
          await sendSMTPMessage({ to: candidate.email, subject, body, attachments });
          emailSent = true;
        } else {
          emailReason = 'Email credentials not configured in Settings. Offer saved to candidate profile.';
          console.warn(`[SendOffer] ${emailReason}`);
        }
      } catch (err) {
        console.error('[SendOffer] Failed to send email:', err.message);
        emailReason = `Email delivery failed: ${err.message}`;
      }
    }

    const emailStatus = shouldSendEmail ? (emailSent ? 'Sent' : 'Failed') : 'Pending';

    candidate.offerDetails = {
      ...(offerDetails || {}),
      emailStatus,
      sentAt: emailSent ? new Date().toISOString() : (candidate.offerDetails?.sentAt || null),
      lastUpdated: new Date().toISOString()
    };
    candidate.stage = 'Offered';

    const joiningDate = offerDetails?.joiningDate || 'Not Specified';
    const salary = offerDetails?.offeredSalary || 'Not Specified';
    
    candidate.history.push({
      date: new Date().toISOString(),
      type: 'Offer Extended',
      text: shouldSendEmail 
        ? (emailSent ? `Official Offer Letter sent via email (Joining Date: ${joiningDate}, Offered Salary: ${salary})` : `Offer saved to profile (Email delivery failed: ${emailReason})`)
        : `Offer saved to candidate profile (Email scheduled for later)`
    });

    await candidate.save();

    let userMessage = '';
    if (!shouldSendEmail) {
      userMessage = `Offer details for ${candidate.name} saved! Official Docx generated & email set to be sent later.`;
    } else if (emailSent) {
      userMessage = `🎉 Official Offer Letter successfully sent to ${candidate.name}!`;
    } else {
      userMessage = `Offer saved for ${candidate.name}. (${emailReason || 'Email not sent'})`;
    }

    res.json({
      success: true,
      candidate,
      emailSent,
      emailStatus,
      emailReason,
      message: userMessage
    });
  } catch (error) {
    console.error('Failed to send offer letter:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/candidates/:id/offer-letter-download', authenticateToken, async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ id: req.params.id });
    if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });

    const docxBuffer = await generateOfferLetterBuffer(candidate, candidate.offerDetails || {});
    const filename = `Offer_Letter_${candidate.name.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(docxBuffer);
  } catch (err) {
    console.error('Failed to stream offer docx:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/candidates/:id/re-score', authenticateToken, async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ id: req.params.id });
    if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });

    console.log(`Re-scoring candidate ${candidate.name}...`);
    
    const parsedData = {
      name: candidate.name,
      email: candidate.email,
      skills: candidate.skills,
      experience: candidate.experience,
      education: candidate.education,
      seniorityLevel: candidate.seniorityLevel,
      projects: candidate.projects
    };

    const ownCategoryResult = await scoreCandidateByOwnCategory(parsedData);
    candidate.ownCategoryScore = ownCategoryResult.score || 0;
    candidate.ownCategoryMatchingSkills = ownCategoryResult.matchingSkills || [];
    candidate.ownCategoryMissingSkills = ownCategoryResult.missingSkills || [];
    candidate.ownCategoryExplanation = ownCategoryResult.reasoning || '';

    let job = null;
    if (candidate.jobId) {
      job = await Job.findOne({ id: candidate.jobId });
    }
    if (!job) {
      job = await Job.findOne({ status: 'Active' });
    }

    if (job) {
      // RAG-Enhanced JD Matching: fetch specific relevant chunks for the scoring prompt
      const ragChunks = await getRelevantChunksForJob(candidate.id, job.description || job.requirements);
      const scoringResult = await scoreCandidate(parsedData, job, ragChunks);
      candidate.matchScore = scoringResult.score || 0;
      candidate.matchingSkills = scoringResult.matchingSkills || [];
      candidate.missingSkills = scoringResult.missingSkills || [];
      candidate.matchExplanation = scoringResult.reasoning || '';
    }

    await candidate.save();
    res.json(candidate);
  } catch (error) {
    console.error('Failed to re-score candidate:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/candidates/:id/generate-questions', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ id: req.params.id });
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    let job = null;
    if (candidate.jobId) {
      job = await Job.findOne({ id: candidate.jobId });
    }

    let hrQuestions = [];
    let technicalQuestions = [];

    try {
      const qna = await generateQuestionsForCandidate(candidate, job);
      hrQuestions = qna.hrQuestions || [];
      technicalQuestions = qna.technicalQuestions || [];
    } catch (err) {
      console.error('LLM Q&A generation failed, using fallbacks:', err.message);
      hrQuestions = [
        { question: "Can you walk me through your background and key experiences?", answer: "A strong candidate should walk through their resume timeline, highlighting relevant projects and roles." },
        { question: "Why are you interested in this position and our organization?", answer: "The candidate should demonstrate knowledge of the company and align it with their career goals." },
        { question: "Describe a challenging workplace situation and how you resolved it.", answer: "The candidate should use the STAR method to describe a conflict or obstacle and a positive outcome." },
        { question: "What are your key professional strengths and areas for growth?", answer: "The candidate should list 2-3 genuine strengths and a growth area they are actively working on." },
        { question: "Where do you see yourself professionally in the next five years?", answer: "The candidate should show ambition, interest in growth, and connection to the industry/role." }
      ];
      technicalQuestions = [
        { question: "What is your primary programming language or technology stack, and why?", answer: "The candidate should explain their stack preferences and the trade-offs of their choices." },
        { question: "Explain a technical challenge you faced on a project and how you solved it.", answer: "The candidate should detail the technical problem, their architectural or code-level solution, and the result." },
        { question: "How do you ensure code quality, readability, and testability in your work?", answer: "The candidate should mention testing frameworks, code reviews, design patterns, and clean code practices." },
        { question: "What is your approach to optimizing performance or scalability in an application?", answer: "The candidate should discuss caching, database query optimization, load balancing, or profiling tools." },
        { question: "Describe how you keep up-to-date with new technologies and industry trends.", answer: "The candidate should mention blogs, newsletters, side projects, open source, or professional courses." }
      ];
    }

    const updatedCandidate = await Candidate.findOneAndUpdate(
      { id: req.params.id },
      {
        $set: {
          hrQuestions,
          technicalQuestions
        },
        $push: {
          history: {
            date: new Date().toISOString(),
            type: 'QnAGenerated',
            text: 'Regenerated HR and Technical interview questions.'
          }
        }
      },
      { returnDocument: 'after' }
    );
    res.json(updatedCandidate);
  } catch (error) {
    console.error('Failed to generate questions:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/jobs', authenticateToken, async (req, res) => {
  try {
    const jobs = await Job.find();
    const formattedJobs = [];

    for (let job of jobs) {
      const jobObj = job.toObject();
      if (!jobObj.createdAt) {
        let derivedDate = new Date();
        if (job._id) {
          try {
            const hex = job._id.toString().substring(0, 8);
            derivedDate = new Date(parseInt(hex, 16) * 1000);
          } catch (e) {}
        }
        jobObj.createdAt = derivedDate;
        Job.updateOne({ _id: job._id }, { $set: { createdAt: derivedDate } }).catch(() => {});
      }
      formattedJobs.push(jobObj);
    }
    res.json(formattedJobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  try {
    const { id, title, department, location, description, requirements, publicDescription, jobResponsibility, qualificationRequirement, benefits, postings, workMode, requiredExperience, closingDate, customFields, publishToCareers } = req.body;

    if (id) {
      const existingJob = await Job.findOne({ id });
      if (existingJob) {
        existingJob.title = title || existingJob.title;
        existingJob.department = department || existingJob.department;
        existingJob.location = location || existingJob.location;
        existingJob.description = description || existingJob.description;
        existingJob.requirements = requirements || existingJob.requirements;
        existingJob.publicDescription = publicDescription || existingJob.publicDescription;
        existingJob.jobResponsibility = jobResponsibility !== undefined ? jobResponsibility : existingJob.jobResponsibility;
        existingJob.qualificationRequirement = qualificationRequirement !== undefined ? qualificationRequirement : existingJob.qualificationRequirement;
        existingJob.benefits = benefits !== undefined ? benefits : existingJob.benefits;
        if (postings) existingJob.postings = postings;
        existingJob.workMode = workMode || existingJob.workMode;
        existingJob.requiredExperience = requiredExperience || existingJob.requiredExperience;
        existingJob.closingDate = closingDate || existingJob.closingDate;
        existingJob.customFields = customFields || existingJob.customFields;
        existingJob.publishToCareers = publishToCareers !== undefined ? publishToCareers : existingJob.publishToCareers;
        if (publishToCareers && !existingJob.publicSlug) {
          existingJob.publicSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);
        }
        await existingJob.save();
        return res.json(existingJob);
      }
    }

    let publicSlug = null;
    if (publishToCareers) {
      publicSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);
    }
    const defaultFields = [
      { id: 'fn', label: 'First Name', fieldType: 'ShortText', isRequired: true },
      { id: 'ln', label: 'Last Name', fieldType: 'ShortText', isRequired: true },
      { id: 'em', label: 'Email', fieldType: 'Email', isRequired: true },
      { id: 'ph', label: 'Phone Number', fieldType: 'Phone', isRequired: true },
      { id: 'cl', label: 'Current Location', fieldType: 'ShortText', isRequired: true },
      { id: 'ex', label: 'Total Years of Experience', fieldType: 'Number', isRequired: true },
      { id: 'np', label: 'Notice Period', fieldType: 'Dropdown', options: 'Immediate, 15 days, 30 days, 45 days, 60 days, 90 days, More than 90 days', isRequired: true },
      { id: 'jd', label: 'Earliest Joining Date', fieldType: 'Date', isRequired: true },
      { id: 'eq', label: 'Education Qualification', fieldType: 'ShortText', isRequired: true },
      { id: 'ks', label: 'Key Skills', fieldType: 'ShortText', isRequired: true },
      { id: 'li', label: 'LinkedIn Profile', fieldType: 'Url', isRequired: true },
      { id: 'cv', label: 'Upload CV', fieldType: 'CvUpload', isRequired: true }
    ];

    const newJob = new Job({ 
      id: id || `job-${Date.now()}`, 
      title, 
      department, 
      location, 
      description, 
      requirements,
      publicDescription,
      jobResponsibility,
      qualificationRequirement,
      benefits,
      postings: postings || { linkedIn: false, indeed: false, zipRecruiter: false, internalCareer: false },
      workMode,
      requiredExperience,
      closingDate,
      customFields: (customFields && customFields.length > 0) ? customFields : defaultFields,
      publishToCareers,
      publicSlug
    });
    await newJob.save();
    res.json(newJob);
  } catch (error) {
    console.error('Failed to create job:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/jobs/:id', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  try {
    const { title, jobRole, department, location, description, jobDescription, requirements, publicDescription, jobResponsibility, qualificationRequirement, benefits, postings, workMode, requiredExperience, closingDate, customFields, publishToCareers } = req.body;
    
    // Support bulk update for all jobs when id is 'all'
    if (req.params.id === 'all') {
      if (customFields) {
        await Job.updateMany({}, { $set: { customFields } });
        await Settings.findByIdAndUpdate(
          'global',
          { $set: { defaultCustomFields: customFields } },
          { upsert: true }
        ).catch(() => {});
      }
      return res.json({ success: true, message: 'Updated default application form for all job positions.' });
    }

    // Support payloads coming from both Settings.jsx (title, description) and FormBuilder.jsx (jobRole, jobDescription)
    const finalTitle = title || jobRole;
    const finalDescription = description || jobDescription;

    const updateData = {
      title: finalTitle,
      department,
      location,
      description: finalDescription,
      requirements,
      publicDescription,
      jobResponsibility,
      qualificationRequirement,
      benefits,
      workMode,
      requiredExperience,
      closingDate,
      customFields,
      publishToCareers
    };

    if (postings) updateData.postings = postings;
    
    // Regenerate public slug if it's being published and doesn't have one
    if (publishToCareers) {
      const existingJob = await Job.findOne({ id: req.params.id });
      if (!existingJob.publicSlug) {
        updateData.publicSlug = finalTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);
      }
    }

    const updatedJob = await Job.findOneAndUpdate(
      { id: req.params.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!updatedJob) return res.status(404).json({ error: 'Job not found' });
    res.json(updatedJob);
  } catch (error) {
    console.error('Failed to update job:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/jobs/generate', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  try {
    const { title, department, location, skills } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Job title is required.' });
    }
    const result = await generateJobDescription(title, department, location, skills);
    res.json(result);
  } catch (error) {
    console.error('Failed to generate job description:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/jobs/:id/postings', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  try {
    const { postings } = req.body;
    const job = await Job.findOneAndUpdate(
      { id: req.params.id },
      { $set: { postings } },
      { returnDocument: 'after' }
    );
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) {
    console.error('Failed to update job postings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/jobs/:id/publish', async (req, res) => {
  try {
    const job = await Job.findOne({ id: req.params.id });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const { publishToCareers } = req.body;
    job.publishToCareers = publishToCareers !== undefined ? publishToCareers : !job.publishToCareers;

    if (job.publishToCareers) {
      job.status = 'Active';
      if (!job.publicSlug) {
        const baseSlug = (job.title || 'job').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        job.publicSlug = `${baseSlug}-${Date.now().toString(36)}`;
      }
    }

    await job.save();
    res.json({
      success: true,
      job,
      message: job.publishToCareers ? `Position "${job.title}" published successfully.` : `Position "${job.title}" unpublished.`
    });
  } catch (error) {
    console.error('Failed to update publish status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/jobs/:id', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  try {
    const jobId = req.params.id;
    
    // Find all candidates associated with this job
    const candidates = await Candidate.find({ jobId });
    
    for (const candidate of candidates) {
      // Delete resume file if it exists
      if (candidate.resumeUrl) {
        const filename = candidate.resumeUrl.replace('/api/uploads/', '').replace('/uploads/', '');
        const filepath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(filepath)) {
          try { fs.unlinkSync(filepath); } catch (e) {}
        }
      }
      
      // Remove candidate from database
      await Candidate.deleteOne({ id: candidate.id });
      
      // Cascade delete candidate's related records
      await CandidateProfile.deleteMany({ candidateId: candidate.id }).catch(() => {});
      await JobMatch.deleteMany({ candidateId: candidate.id }).catch(() => {});
      await ResumeChunk.deleteMany({ candidateId: candidate.id }).catch(() => {});
      
      // Remove from RAG index
      removeCandidate(candidate.id).catch(err => console.error('RAG removal failed:', err.message));
    }
    
    // Delete the job itself
    await Job.deleteOne({ id: jobId });

    // Clean up any remaining JobMatch records for this job
    await JobMatch.deleteMany({ jobId }).catch(() => {});
    
    // Rebuild search index for remaining candidates
    const remainingCandidates = await Candidate.find();
    searchIndex.buildIndex(remainingCandidates);
    
    res.json({ success: true, deletedCandidates: candidates.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/settings', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const settings = await Settings.findById('global');
    if (!settings) return res.json({});
    const safeSettings = settings.toObject();
    if (safeSettings.emailPassword) safeSettings.emailPassword = '••••••••';
    if (safeSettings.geminiApiKey) safeSettings.geminiApiKey = '••••••••';
    if (safeSettings.openaiApiKey) safeSettings.openaiApiKey = '••••••••';
    if (safeSettings.claudeApiKey) safeSettings.claudeApiKey = '••••••••';
    if (safeSettings.outlookClientSecret) safeSettings.outlookClientSecret = '••••••••';
    res.json(safeSettings);
  } catch (error) {
    console.error('Failed to get settings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const allowedSettingsKeys = [
      'tagPreferences', 'sourcingAgentActive', 'emailProvider', 'emailUser', 'emailPassword',
      'outlookClientId', 'outlookTenantId', 'outlookClientSecret', 'outlookUserEmail',
      'aiProvider', 'geminiApiKey', 'openaiApiKey', 'claudeApiKey',
      'ollamaUrl', 'ollamaModel', 'ollamaEmbeddingModel',
      'rankAccordingToJob', 'emailTemplates'
    ];

    const updateData = {};
    for (const key of allowedSettingsKeys) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    const settings = await Settings.findOneAndUpdate(
      { _id: 'global' }, 
      { $set: updateData }, 
      { returnDocument: 'after', upsert: true }
    );
    
    // Trigger background connection test immediately
    testConnectionInBackground().catch(err => console.error('Background connection test failed:', err));

    const safeSettings = settings.toObject();
    if (safeSettings.emailPassword) safeSettings.emailPassword = '••••••••';
    if (safeSettings.geminiApiKey) safeSettings.geminiApiKey = '••••••••';
    if (safeSettings.openaiApiKey) safeSettings.openaiApiKey = '••••••••';
    if (safeSettings.claudeApiKey) safeSettings.claudeApiKey = '••••••••';
    if (safeSettings.outlookClientSecret) safeSettings.outlookClientSecret = '••••••••';
    res.json(safeSettings);
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search/tags', authenticateToken, (req, res) => res.json({ matches: searchIndex.searchTags(req.query.q) }));
app.get('/api/search/suggestions', authenticateToken, (req, res) => res.json({ suggestions: searchIndex.getSuggestions(req.query.prefix || '') }));
app.get('/api/search/tag-cloud', authenticateToken, (req, res) => res.json({ cloud: searchIndex.getTagCloud() }));

// ==================== RAG SEARCH ROUTES ====================

app.post('/api/rag/search', authenticateToken, async (req, res) => {
  try {
    const { query, topK = 10, jobId = null } = req.body;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required.' });
    }
    const results = await searchResumes(query.trim(), topK, jobId);
    res.json(results);
  } catch (error) {
    console.error('RAG search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rag/jd-search', authenticateToken, async (req, res) => {
  try {
    const { jdTitle, jdRequirements, jdDescription, startDate, endDate, topK = 5 } = req.body;
    if (!jdTitle && !jdRequirements && !jdDescription) {
      return res.status(400).json({ error: 'At least one Job Description field is required.' });
    }
    
    // Step 1: RAG Search — find semantically relevant candidates first
    const query = [jdTitle, jdRequirements, jdDescription].filter(Boolean).join(' ');
    const searchResult = await searchResumes(query, 50);
    const matchedCandidates = searchResult.results || [];
    
    // Step 2: Filter by RAG relevance — only candidates with meaningful semantic match
    const relevantCandidates = matchedCandidates.filter(c => c.relevanceScore >= 0.35);
    console.log(`JD Search: ${matchedCandidates.length} RAG matches → ${relevantCandidates.length} above relevance threshold (0.35)`);
    
    if (relevantCandidates.length === 0) {
      return res.json([]);
    }
    
    // Step 3: Apply date filter on relevant candidates only
    const dateQuery = { id: { $in: relevantCandidates.map(c => c.candidateId) } };
    if (startDate || endDate) {
      dateQuery.createdAt = {};
      if (startDate) {
        dateQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.createdAt.$lte = end;
      }
    }
    
    const candidateDocs = await Candidate.find(dateQuery);
    const candidateDocMap = new Map(candidateDocs.map(c => [c.id, c]));
    
    // Keep only matched candidates present in the filtered doc map
    const filteredMatches = relevantCandidates.filter(item => candidateDocMap.has(item.candidateId));
    
    // Construct a job object for scoring
    const mockJob = {
      title: jdTitle || 'Role',
      requirements: jdRequirements || '',
      description: jdDescription || ''
    };

    // Extract core skills from jdRequirements for local filtering
    const requiredSkills = [];
    if (jdRequirements) {
      jdRequirements.split(/[,\n;]/).forEach(s => {
        const cleaned = s.trim().replace(/^[-*•\d.\s]+/, '').trim();
        const lower = cleaned.toLowerCase();
        const isExperienceOrMeta = lower.includes('year') || lower.includes('experience') || lower.includes('degree') || lower.includes('plus') || lower.includes('qualifications') || lower.includes('projects done');
        if (cleaned.length > 1 && !isExperienceOrMeta) {
          requiredSkills.push(lower);
        }
      });
    }
    
    // Step 4: AI-score ONLY the RAG-relevant, date-filtered candidates
    const scoredCandidates = await Promise.all(
      filteredMatches.slice(0, Math.max(topK, 5)).map(async (item) => {
        try {
          const candidate = candidateDocMap.get(item.candidateId);
          if (!candidate) return null;
          
          const parsedCandidate = candidate.toObject();
          
          // Strip to relevant fields only
          const candidateForScoring = {
            name: parsedCandidate.name || '',
            email: parsedCandidate.email || '',
            phone: parsedCandidate.phone || '',
            skills: parsedCandidate.skills || [],
            experience: parsedCandidate.experience || [],
            education: parsedCandidate.education || [],
            projects: parsedCandidate.projects || [],
            seniorityLevel: parsedCandidate.seniorityLevel || '',
            currentCompany: parsedCandidate.currentCompany || '',
            currentRole: parsedCandidate.currentRole || '',
            location: parsedCandidate.location || ''
          };
          
          let scoreResult = null;

          // Local pre-filtering check: if requirements has specific technical skills, candidate must match at least one
          if (requiredSkills.length > 0) {
            const candidateSkills = (parsedCandidate.skills || []).map(s => s.toLowerCase());
            const projectSkills = (parsedCandidate.projects || []).flatMap(p => p.matchingSkills || []).map(s => s.toLowerCase());
            const allCandidateSkills = new Set([...candidateSkills, ...projectSkills]);
            
            const matchingRequired = requiredSkills.filter(reqSkill => {
              return Array.from(allCandidateSkills).some(candSkill => 
                candSkill.includes(reqSkill) || reqSkill.includes(candSkill)
              ) || (parsedCandidate.resumeText && parsedCandidate.resumeText.toLowerCase().includes(reqSkill));
            });
            
            if (matchingRequired.length === 0) {
              const missingStringList = requiredSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1));
              scoreResult = {
                score: 0,
                matchingSkills: [],
                missingSkills: missingStringList,
                reasoning: `Candidate lacks key required skills such as ${requiredSkills.join(', ')}.`
              };
              console.log(`JD Search: Candidate ${candidate.id} (${candidate.name}) skipped AI scoring (no skill overlap).`);
            }
          }

          if (!scoreResult) {
            try {
              scoreResult = await scoreCandidate(candidateForScoring, mockJob);
            } catch (err) {
              console.error(`Failed to score candidate ${candidate.id} (attempt 1):`, err.message);
              try {
                const condensedProfile = {
                  name: candidateForScoring.name,
                  skills: candidateForScoring.skills,
                  experience: (candidateForScoring.experience || []).map(e => ({
                    role: e.role || e.title || '',
                    company: e.company || '',
                    startDate: e.startDate || '',
                    endDate: e.endDate || ''
                  })),
                  education: candidateForScoring.education,
                  seniorityLevel: candidateForScoring.seniorityLevel
                };
                scoreResult = await scoreCandidate(condensedProfile, mockJob);
              } catch (retryErr) {
                console.error(`Failed to score candidate ${candidate.id} (attempt 2):`, retryErr.message);
                scoreResult = { score: 0, matchingSkills: [], missingSkills: [], reasoning: 'Evaluation failed - AI provider error' };
              }
            }
          }
          
          return {
            ...parsedCandidate,
            matchScore: scoreResult.score || 0,
            matchingSkills: scoreResult.matchingSkills || [],
            missingSkills: scoreResult.missingSkills || [],
            explanation: scoreResult.reasoning || '',
            ragScore: item.relevanceScore,
            matchedSections: item.matchedSections || [],
            questions: null
          };
        } catch (err) {
          console.error('Error processing candidate match item:', err);
          return null;
        }
      })
    );
    
    // Sort by matchScore descending
    const validCandidates = scoredCandidates.filter(Boolean);
    validCandidates.sort((a, b) => b.matchScore - a.matchScore);
    
    res.json(validCandidates);
  } catch (error) {
    console.error('JD search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/candidates/:id/generate-jd-questions', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ id: req.params.id });
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    const { jdTitle, jdRequirements, jdDescription } = req.body;
    const mockJob = {
      title: jdTitle || 'Role',
      requirements: jdRequirements || '',
      description: jdDescription || ''
    };

    const questionsResult = await generateQuestionsForCandidate(candidate.toObject(), mockJob).catch(err => {
      console.error(`Failed to generate custom JD questions for candidate ${candidate.id}:`, err);
      return { hrQuestions: [], technicalQuestions: [] };
    });

    res.json(questionsResult);
  } catch (error) {
    console.error('Custom JD question generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rag/ask', authenticateToken, async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required.' });
    }
    const result = await ragAnswer(query.trim(), topK);
    res.json(result);
  } catch (error) {
    console.error('RAG ask error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rag/reindex', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  try {
    res.json({ message: 'Reindexing started in background.' });
    // Run in background after response is sent
    indexAllCandidates((current, total) => {
      if (current % 5 === 0 || current === total) console.log(`RAG reindex: ${current}/${total}`);
    }).then(result => {
      console.log(`RAG reindex complete: ${result.indexed} indexed, ${result.errors} errors.`);
    }).catch(err => console.error('RAG reindex failed:', err.message));
  } catch (error) {
    console.error('RAG reindex error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rag/status', authenticateToken, async (req, res) => {
  try {
    const status = await getRAGStatus();
    res.json(status);
  } catch (error) {
    console.error('RAG status error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/settings/tag-preferences', authenticateToken, async (req, res) => {
  try {
    const settings = await Settings.findById('global');
    res.json(settings?.tagPreferences || []);
  } catch (error) {
    console.error('Failed to get tag preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings/tag-preferences', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { _id: 'global' }, 
      { $set: { tagPreferences: req.body.tagPreferences || [] } }, 
      { returnDocument: 'after', upsert: true }
    );
    res.json(settings.tagPreferences);
  } catch (error) {
    console.error('Failed to update tag preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gmail connection test
app.post('/api/gmail/test-connection', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const emailConfig = await getEmailConfig();
    const user = emailConfig.user;
    const pass = emailConfig.pass;

    if (!user || !pass) {
      return res.status(400).json({ success: false, error: 'Gmail credentials are not configured.' });
    }

    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user, pass },
      logger: false
    });

    await client.connect();
    
    const lock = await client.getMailboxLock('INBOX');
    let totalItems = 0;
    let unreadItems = 0;
    try {
      const status = await client.status('INBOX', { messages: true });
      totalItems = status.messages || 0;
      const unseenUids = await client.search({ unseen: true });
      unreadItems = unseenUids.length || 0;
    } finally {
      lock.release();
    }
    
    await client.logout();

    lastGmailConnectionStatus = { success: true, error: null, lastChecked: new Date() };
    res.json({
      success: true,
      message: 'Connection test passed! Gmail IMAP server is fully accessible.',
      mailbox: {
        displayName: 'INBOX',
        totalItems: totalItems,
        unreadItems: unreadItems
      }
    });
  } catch (error) {
    console.error('Gmail connection test failed:', error.message);
    const errMsg = error.responseText ? `${error.message}: ${error.responseText}` : error.message;
    lastGmailConnectionStatus = { success: false, error: errMsg, lastChecked: new Date() };
    res.status(500).json({ success: false, error: errMsg });
  }
});

// Outlook connection test
app.post('/api/outlook/test-connection', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const settings = await Settings.findById('global');
    const clientId = settings?.outlookClientId || process.env.OUTLOOK_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = settings?.outlookClientSecret || process.env.OUTLOOK_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET;
    const tenantId = settings?.outlookTenantId || process.env.OUTLOOK_TENANT_ID || process.env.MICROSOFT_TENANT_ID;
    const userEmail = settings?.outlookUserEmail || process.env.OUTLOOK_USER_EMAIL || '';

    if (!clientId || !clientSecret || !tenantId) {
      return res.status(400).json({ success: false, error: 'Outlook credentials are not fully configured.' });
    }

    // Force fresh token
    invalidateTokenCache();
    const accessToken = await getOutlookAccessToken(true);

    if (!userEmail) {
      return res.json({ success: true, message: 'Authentication successful! Token acquired. Configure a mailbox email to start reading emails.' });
    }

    // Try to access the user's mailbox
    const testUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/mailFolders/inbox?$select=displayName,totalItemCount,unreadItemCount`;
    const testResponse = await fetch(testUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!testResponse.ok) {
      const errText = await testResponse.text();
      return res.status(400).json({ success: false, error: `Token OK, but mailbox access failed: ${testResponse.status} - ${errText}` });
    }

    const testData = await testResponse.json();
    lastOutlookConnectionStatus = { success: true, error: null, lastChecked: new Date() };
    res.json({
      success: true,
      message: 'Connection test passed! Outlook mailbox is fully accessible.',
      mailbox: {
        displayName: testData.displayName || 'Inbox',
        totalItems: testData.totalItemCount || 0,
        unreadItems: testData.unreadItemCount || 0
      }
    });
  } catch (error) {
    console.error('Outlook connection test failed:', error.message);
    lastOutlookConnectionStatus = { success: false, error: error.message, lastChecked: new Date() };
    res.status(500).json({ success: false, error: error.message });
  }
});

// Email logs endpoint
app.get('/api/email-logs', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const logs = await EmailLog.find().sort({ timestamp: -1 }).limit(100);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pre-register Ingestion Logs for batch upload
app.post('/api/ingestion-logs/pre-register', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  try {
    const { files } = req.body; // Array of { fileName, source }
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'files array is required' });
    }

    const registeredLogs = [];
    for (const f of files) {
      const logId = `ingestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newLog = new IngestionLog({
        id: logId,
        fileName: f.fileName,
        source: f.source || 'manual',
        status: 'processing'
      });
      await newLog.save();
      registeredLogs.push({ id: logId, fileName: f.fileName });
    }

    res.json({ logs: registeredLogs });
  } catch (error) {
    console.error('Failed to pre-register ingestion logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ingestion logs endpoint
app.get('/api/ingestion-logs', authenticateToken, requireRole(['admin', 'recruiter']), async (req, res) => {
  try {
    const logs = await IngestionLog.find().sort({ timestamp: -1 }).limit(200);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// SMART HR HUB PORTED ROUTES (PUBLIC)
// ==========================================

app.get('/api/public/jobs', async (req, res) => {
  try {
    const jobs = await Job.find({
      publishToCareers: true,
      $or: [{ status: 'Active' }, { status: { $exists: false } }, { status: null }, { status: '' }]
    });
    const mapped = jobs.map(j => ({
      id: j.id,
      title: j.title,
      jobRole: j.title,
      department: j.department,
      location: j.location,
      workMode: j.workMode || 'On-site',
      requiredExperience: j.requiredExperience || 'N/A',
      publicSlug: j.publicSlug || j.id,
      description: j.publicDescription || j.description,
      requirements: j.requirements,
      createdAt: j.createdAt
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/public/jobs/:id', async (req, res) => {
  try {
    const idOrSlug = req.params.id;
    const queryCondition = {
      publishToCareers: true,
      $or: [{ status: 'Active' }, { status: { $exists: false } }, { status: null }, { status: '' }]
    };
    let job = await Job.findOne({ id: idOrSlug, ...queryCondition });
    
    if (!job) {
      // Fuzzy / slug search in DB
      const allActiveJobs = await Job.find(queryCondition);
      job = allActiveJobs.find(j => 
        j.id === idOrSlug ||
        j.publicSlug === idOrSlug ||
        (j.title && j.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === idOrSlug.toLowerCase()) ||
        (j.title && j.title.toLowerCase().replace(/[^a-z0-9]+/g, '') === idOrSlug.toLowerCase().replace(/[^a-z0-9]+/g, ''))
      );
    }

    const defaultFields = [
      { id: 'fn', label: 'First Name', fieldType: 'ShortText', isRequired: true },
      { id: 'ln', label: 'Last Name', fieldType: 'ShortText', isRequired: true },
      { id: 'em', label: 'Email', fieldType: 'Email', isRequired: true },
      { id: 'ph', label: 'Phone Number', fieldType: 'Phone', isRequired: true },
      { id: 'cl', label: 'Current Location', fieldType: 'ShortText', isRequired: true },
      { id: 'ex', label: 'Total Years of Experience', fieldType: 'Number', isRequired: true },
      { id: 'np', label: 'Notice Period', fieldType: 'Dropdown', options: 'Immediate, 15 days, 30 days, 45 days, 60 days, 90 days, More than 90 days', isRequired: true },
      { id: 'jd', label: 'Earliest Joining Date', fieldType: 'Date', isRequired: true },
      { id: 'eq', label: 'Education Qualification', fieldType: 'ShortText', isRequired: true },
      { id: 'ks', label: 'Key Skills', fieldType: 'ShortText', isRequired: true },
      { id: 'li', label: 'LinkedIn Profile', fieldType: 'Url', isRequired: true },
      { id: 'cv', label: 'Upload CV', fieldType: 'CvUpload', isRequired: true }
    ];

    if (!job) {
      return res.status(404).json({ error: 'Job position not found or no longer active' });
    }

    let fieldsToReturn = job.customFields;
    if (!fieldsToReturn || fieldsToReturn.length === 0) {
      fieldsToReturn = defaultFields;
    }
    
    res.json({
      id: job.id,
      title: job.title,
      jobRole: job.title,
      department: job.department,
      location: job.location,
      workMode: job.workMode || 'On-site',
      jobDescription: job.publicDescription || job.description || job.requirements,
      jobResponsibility: job.jobResponsibility || '',
      qualificationRequirement: job.qualificationRequirement || '',
      requirements: job.requirements || '',
      benefits: job.benefits || '',
      requiredExperience: job.requiredExperience || '',
      closingDate: job.closingDate || null,
      customFields: fieldsToReturn
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// A helper to generate tracking IDs
function generateTrackingId() {
  return `IST-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
}

// Temporary file upload for public routes
app.post('/api/public/cv', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  // For simplicity, we're returning the path. 
  // In a real app, this should go to a temp bucket and get moved on submit.
  res.json({ fileRef: req.file.path, fileName: req.file.originalname });
});

// R4: Shared helper — extract a value from ansMap by exact keys or fuzzy substring match
function getAnswerByKeywords(ansMap, exactKeys, fuzzyKeyword) {
  for (const key of exactKeys) {
    if (ansMap[key] && String(ansMap[key]).trim() !== '') return ansMap[key];
  }
  const fuzzyKey = Object.keys(ansMap).find(k => k.toLowerCase().includes(fuzzyKeyword));
  return fuzzyKey ? (ansMap[fuzzyKey] || '') : '';
}

app.post('/api/public/apply', async (req, res) => {
  try {
    const { jobId, cvFileRef, cvFileName, answers, formData, refCode, referrerName, referrerEmployeeId } = req.body;
    
    // Known employee referral code mapping
    const knownReferrers = {
      'ABCD1': { name: 'Mohamed Sheik Ismail R', empId: 'IST-1092' },
      'SC882': { name: 'Sri Charan', empId: 'IST-1045' },
      'AJ304': { name: 'Alex Johnson', empId: 'IST-1102' },
      'PS519': { name: 'Priya Sharma', empId: 'IST-1088' },
      'RV712': { name: 'Rahul Verma', empId: 'IST-1150' }
    };

    const incomingRef = (refCode || req.body.referrerCode || req.query.ref || '').trim();
    let isReferral = false;
    let finalReferrerName = referrerName || '';
    let finalReferrerId = referrerEmployeeId || '';

    if (incomingRef || referrerName) {
      isReferral = true;
      const cleanCode = incomingRef.toUpperCase();
      if (knownReferrers[cleanCode]) {
        finalReferrerName = knownReferrers[cleanCode].name;
        finalReferrerId = knownReferrers[cleanCode].empId;
      } else if (!finalReferrerName && incomingRef) {
        finalReferrerName = `Employee (${incomingRef})`;
        finalReferrerId = incomingRef;
      }
    }

    // Convert answers array or formData object to map & unified answers list
    const ansMap = {};
    const finalAnswersList = [];

    if (formData && typeof formData === 'object') {
      Object.entries(formData).forEach(([label, value]) => {
        if (value !== undefined && value !== null) {
          ansMap[label] = value;
          finalAnswersList.push({ label, value: String(value) });
        }
      });
    }
    if (answers && Array.isArray(answers)) {
      answers.forEach(a => {
        if (a && a.label) {
          ansMap[a.label] = a.value;
          if (!finalAnswersList.some(item => item.label === a.label)) {
            finalAnswersList.push({ label: a.label, value: String(a.value || '') });
          }
        }
      });
    }
    
    const firstName = getAnswerByKeywords(ansMap, ['First Name', 'Given Name'], 'first name');
    const lastName = getAnswerByKeywords(ansMap, ['Last Name', 'Surname', 'Family Name'], 'last name');
    const fullName = getAnswerByKeywords(ansMap, ['Full Name', 'Name', 'Candidate Name'], 'name');
    
    let constructedName = (firstName + ' ' + lastName).trim();
    if (!constructedName) constructedName = fullName || req.body.name || req.body.candidateName;
    const finalName = constructedName || 'Unknown Candidate';
    
    const finalEmail = getAnswerByKeywords(ansMap, ['Email', 'Email Address', 'E-mail', 'Email ID'], 'email') || req.body.email || req.body.candidateEmail;
    const finalPhone = getAnswerByKeywords(ansMap, ['Phone Number', 'Phone', 'Mobile', 'Mobile Number', 'Contact Number', 'Contact'], 'phone') || req.body.phone || req.body.candidatePhone;
    
    const skillsAnswer = getAnswerByKeywords(ansMap, ['Key Skills', 'Skills', 'Technical Skills'], 'skill');
    let formSkills = [];
    if (skillsAnswer) {
      formSkills = skillsAnswer.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    } else if (req.body.skills) {
      formSkills = Array.isArray(req.body.skills) ? req.body.skills : req.body.skills.split(',').map(s => s.trim());
    }

    // R1: Normalized label matching using shared helper
    const initialLocation = getAnswerByKeywords(ansMap, ['Current Location', 'Location'], 'location');
    const initialExp = getAnswerByKeywords(ansMap, ['Total Years of Experience', 'Total Experience (years)', 'Experience', 'Total Experience'], 'experience');
    const initialNotice = getAnswerByKeywords(ansMap, ['Notice Period', 'Notice'], 'notice') || req.body.noticePeriod || '';
    const initialCurrentCtc = getAnswerByKeywords(ansMap, ['Current CTC', 'Current Salary', 'CTC'], 'current ctc') || req.body.currentCtc || '';
    const initialExpectedCtc = getAnswerByKeywords(ansMap, ['Expected CTC', 'Expected Salary'], 'expected ctc') || req.body.expectedCtc || '';

    // R3: Duplicate candidate detection — check if same email already applied to same job
    let existingCandidate = null;
    if (finalEmail && !isGenericVal(finalEmail, 'email') && jobId) {
      existingCandidate = await Candidate.findOne({ email: { $regex: new RegExp(`^${escapeRegex(finalEmail.trim())}$`, 'i') }, jobId: jobId });
    }

    let candidateId, trackingId;

    if (existingCandidate) {
      // Update existing candidate instead of creating a duplicate
      candidateId = existingCandidate.id;
      trackingId = existingCandidate.trackingId || generateTrackingId();

      existingCandidate.name = finalName !== 'Unknown Candidate' ? finalName : existingCandidate.name;
      existingCandidate.email = finalEmail || existingCandidate.email;
      existingCandidate.phone = finalPhone || existingCandidate.phone;
      existingCandidate.currentCtc = initialCurrentCtc || existingCandidate.currentCtc;
      existingCandidate.expectedCtc = initialExpectedCtc || existingCandidate.expectedCtc;
      existingCandidate.noticePeriod = initialNotice || existingCandidate.noticePeriod;
      existingCandidate.skills = formSkills.length > 0 ? formSkills : existingCandidate.skills;
      existingCandidate.resumeUrl = cvFileRef ? `/api/uploads/${path.basename(cvFileRef)}` : existingCandidate.resumeUrl;
      existingCandidate.isProcessing = cvFileRef ? true : false;
      existingCandidate.trackingId = trackingId;
      if (isReferral) {
        existingCandidate.source = 'referral';
        existingCandidate.referrerName = finalReferrerName || existingCandidate.referrerName;
        existingCandidate.referrerEmployeeId = finalReferrerId || existingCandidate.referrerEmployeeId;
        existingCandidate.bonusEligible = true;
      }
      existingCandidate.extractedData = {
        ...(existingCandidate.extractedData || {}),
        currentLocation: initialLocation || existingCandidate.extractedData?.currentLocation || '',
        totalYearsExperience: initialExp || existingCandidate.extractedData?.totalYearsExperience || '',
        noticePeriod: initialNotice || existingCandidate.extractedData?.noticePeriod || '',
        currentCtc: initialCurrentCtc || existingCandidate.extractedData?.currentCtc || '',
        expectedCtc: initialExpectedCtc || existingCandidate.extractedData?.expectedCtc || '',
        formAnswers: finalAnswersList
      };
      existingCandidate.markModified('extractedData');
      existingCandidate.history.push({ date: new Date().toISOString(), type: 'Status', text: isReferral ? `Re-submitted via referral link by ${finalReferrerName}` : 'Application re-submitted. Previous data updated.' });
      await existingCandidate.save();
      console.log(`[Public Apply] Duplicate detected for ${finalEmail} on job ${jobId}. Updated existing candidate ${candidateId}.`);
    } else {
      trackingId = generateTrackingId();
      candidateId = `cand_${Date.now()}`;

      // 1. Create candidate immediately in 'processing' state
      const newCandidate = new Candidate({
        id: candidateId,
        trackingId,
        source: isReferral ? 'referral' : 'direct_apply',
        referrerName: isReferral ? finalReferrerName : '',
        referrerEmployeeId: isReferral ? finalReferrerId : '',
        bonusEligible: isReferral ? true : false,
        jobId: jobId,
        name: finalName,
        email: finalEmail,
        phone: finalPhone,
        currentCtc: initialCurrentCtc,
        expectedCtc: initialExpectedCtc,
        noticePeriod: initialNotice,
        skills: formSkills,
        resumeUrl: cvFileRef ? `/api/uploads/${path.basename(cvFileRef)}` : '',
        isProcessing: cvFileRef ? true : false,
        stage: 'Inbox',
        extractedData: {
          currentLocation: initialLocation,
          totalYearsExperience: initialExp,
          noticePeriod: initialNotice,
          currentCtc: initialCurrentCtc,
          expectedCtc: initialExpectedCtc,
          formAnswers: finalAnswersList
        },
        history: [{ date: new Date().toISOString(), type: 'Status', text: isReferral ? `Referred application by ${finalReferrerName} (${finalReferrerId})` : 'Application submitted. AI Analysis in progress...' }]
      });
      
      await newCandidate.save();
    } // end of else (new candidate)

    // 2. Create Ingestion Log immediately
    const logId = `log-${Date.now()}`;
    const ingestionLog = new IngestionLog({
      id: logId,
      fileName: cvFileName || (cvFileRef ? path.basename(cvFileRef) : 'Resume.pdf'),
      source: 'direct_apply', // Public portal apply
      status: 'processing',
      candidateId: candidateId,
      candidateName: finalName
    });
    await ingestionLog.save().catch(e => console.error('Failed to create ingestion log for public apply:', e));

    // Send automatic application received confirmation email for the specific job role
    const activeCandidate = existingCandidate || await Candidate.findOne({ id: candidateId });
    if (activeCandidate && activeCandidate.email && !isGenericVal(activeCandidate.email, 'email')) {
      let jobTitle = 'General Role';
      if (jobId) {
        const targetJob = await Job.findOne({ id: jobId });
        if (targetJob) jobTitle = targetJob.title;
      }
      console.log(`[Public Apply] Sending application received confirmation email to ${activeCandidate.email} for role "${jobTitle}"...`);
      sendAutomaticEmail(activeCandidate, 'applicationReceived', { jobTitle }).catch(e => {
        console.error('[Public Apply] Automatic confirmation email failed:', e.message);
      });
    }

    // 3. Process LLM parser & scoring in background
    setTimeout(async () => {
      let pdfText = '';
      let parsedData = {};
      let ownCategoryResult = { score: 0, matchingSkills: [], missingSkills: [], reasoning: '' };
      let scoringResult = { score: 0, matchingSkills: [], missingSkills: [], reasoning: '' };
      let generatedTags = [];

      try {
        if (cvFileRef && fs.existsSync(cvFileRef)) {
          console.log(`Extracting text from public upload: ${cvFileRef}`);
          try {
            pdfText = await extractTextFromFile(cvFileRef, cvFileName || path.basename(cvFileRef), null);
          } catch (err) {
            console.warn('Failed to extract text locally for public apply:', err.message);
          }
          
          const fileBuffer = fs.readFileSync(cvFileRef);
          const pdfBase64 = fileBuffer.toString('base64');
          console.log('Parsing resume with LLM for public apply...');
          parsedData = await parseResume(pdfText, pdfBase64);
          if (!parsedData || Object.keys(parsedData).length === 0) {
            throw new Error('LLM parser returned empty structured data.');
          }
        }

        let job = null;
        if (jobId) {
          job = await Job.findOne({ id: jobId });
          if (job && (!job.requirementsChecklist || job.requirementsChecklist.length === 0)) {
            console.log(`Auto-generating requirements checklist for job ${job.title}...`);
            const generatedChecklist = await extractChecklistFromJob(job);
            job.requirementsChecklist = generatedChecklist;
            await job.save().catch(e => console.error('Failed to save auto-generated checklist:', e));
          }
        }
        
        const settings = await Settings.findById('global');
        let checklistResult = { score: 0, passedCoreSkills: true, matchedRequirements: [], unmatchedRequirements: [], reasoning: '', checklist: [] };
        let jdQuestions = null;
        
        try {
          console.log('Running analysis, scoring, and tag generation in parallel for public apply...');
          const results = await Promise.all([
            scoreCandidateByOwnCategory(parsedData).catch(e => { console.error('Own category score failed:', e.message); return null; }),
            job ? scoreCandidate(parsedData, job).catch(e => { console.error('Job match score failed:', e.message); return null; }) : Promise.resolve(null),
            generateTags(parsedData, job || { title: 'General', description: '' }, settings?.tagPreferences || []).catch(e => { console.error('Tag generation failed:', e.message); return null; }),
            job ? scoreCandidateAgainstChecklist(parsedData, job).catch(e => { console.error('Checklist score failed:', e.message); return null; }) : Promise.resolve(null)
          ]);
          if (results[0]) ownCategoryResult = results[0];
          if (results[1]) scoringResult = results[1];
          if (results[2]) generatedTags = results[2];
          if (results[3]) checklistResult = results[3];
          
          // Override primary holistic score with the checklist score if a checklist was generated and evaluated
          if (checklistResult.checklist && checklistResult.checklist.length > 0) {
            scoringResult = {
              score: checklistResult.score,
              matchingSkills: checklistResult.matchedRequirements,
              missingSkills: checklistResult.unmatchedRequirements,
              reasoning: checklistResult.reasoning
            };
          }

          const score = scoringResult.score || 0;
          if (job && score > 50) {
            console.log(`ATS score is ${score}% (> 50%) for public apply. Generating Tailored Questions...`);
            jdQuestions = await generateQuestionsForCandidate({ ...parsedData, formAnswers: answers }, job).catch(e => {
              console.error('JD question generation failed for public apply:', e.message);
              return null;
            });
          } else {
            console.log(`ATS score is ${score}% (<= 50%) for public apply. Skipping tailored question generation to decrease load on Ollama.`);
          }
        } catch (err) {
          console.error('Parallel scoring/tagging failed for public apply:', err.message);
        }

        const formDiscrepancies = detectFormCvDiscrepancies({
          name: finalName,
          email: finalEmail,
          phone: finalPhone,
          totalYearsExperience: getAnswerByKeywords(ansMap, ['Total Years of Experience', 'Total Experience (years)', 'Experience', 'Total Experience'], 'experience')
        }, parsedData);

        const mergedRedFlags = [
          ...formDiscrepancies,
          ...(jdQuestions?.red_flags || parsedData.red_flags || [])
        ];

        // Update candidate in DB
        const updatedCandidate = await Candidate.findOneAndUpdate(
          { id: candidateId },
          {
            $set: {
              name: (finalName && finalName !== 'Unknown Candidate' && finalName.trim() !== '') ? finalName : (parsedData.name || 'Unknown'),
              email: (finalEmail && finalEmail.trim() !== '') ? finalEmail : (parsedData.email || ''),
              phone: (finalPhone && finalPhone.trim() !== '') ? finalPhone : (parsedData.phone || ''),
              linkedinUrl: parsedData.linkedinUrl || '',
              skills: formSkills.length > 0 ? formSkills : (parsedData.skills || []),
              experience: parsedData.experience || [],
              education: parsedData.education || [],
              tags: generatedTags,
              resumeText: pdfText,
              matchScore: scoringResult.score || 0,
              matchingSkills: scoringResult.matchingSkills || [],
              missingSkills: scoringResult.missingSkills || [],
              matchExplanation: scoringResult.reasoning || '',
              ownCategoryScore: ownCategoryResult.score || 0,
              ownCategoryMatchingSkills: ownCategoryResult.matchingSkills || [],
              ownCategoryMissingSkills: ownCategoryResult.missingSkills || [],
              ownCategoryExplanation: ownCategoryResult.reasoning || '',
              seniorityLevel: parsedData.seniorityLevel || 'Mid',
              interviewQuestions: parsedData.interviewQuestions || [],
              hrQuestions: jdQuestions?.hrQuestions || parsedData.hrQuestions || [],
              technicalQuestions: jdQuestions?.technicalQuestions || parsedData.technicalQuestions || [],
              projects: parsedData.projects || [],
              redFlags: mergedRedFlags,
              extractedData: {
                currentLocation: getAnswerByKeywords(ansMap, ['Current Location', 'Location'], 'location') || parsedData.currentLocation || '',
                totalYearsExperience: getAnswerByKeywords(ansMap, ['Total Years of Experience', 'Total Experience (years)', 'Experience', 'Total Experience'], 'experience') || parsedData.totalYearsExperience || '',
                noticePeriod: getAnswerByKeywords(ansMap, ['Notice Period'], 'notice') || parsedData.noticePeriod || '',
                formAnswers: finalAnswersList
              },
              checklist: checklistResult.checklist || [],
              checklistScore: checklistResult.score || 0,
              matchedRequirements: checklistResult.matchedRequirements || [],
              unmatchedRequirements: checklistResult.unmatchedRequirements || [],
              passedCoreSkills: checklistResult.passedCoreSkills !== false,
              isProcessing: false
            },
            $push: {
              history: { date: new Date().toISOString(), type: 'Status', text: 'AI parsing and scoring complete.' }
            }
          },
          { returnDocument: 'after' }
        );

        // Re-calculate ranks for all candidates of the same job
        if (jobId) {
          const candidatesForJob = await Candidate.find({ jobId }).sort({ matchScore: -1 });
          const totalApplicants = candidatesForJob.length;
          for (let index = 0; index < candidatesForJob.length; index++) {
            const cand = candidatesForJob[index];
            cand.rank = index + 1;
            cand.totalApplicants = totalApplicants;
            await cand.save().catch(e => console.error('Failed to update candidate rank:', e));
          }
        }

        // Update Ingestion Log to success
        await IngestionLog.updateOne(
          { id: logId },
          { 
            status: 'success', 
            candidateId: candidateId,
            candidateName: updatedCandidate ? updatedCandidate.name : finalName,
            extractedData: parsedData
          }
        ).catch(e => console.error('Failed to update ingestion log to success:', e));

        // Rebuild index and RAG
        if (updatedCandidate) {
          if (updatedCandidate.email && !isGenericVal(updatedCandidate.email, 'email')) {
            let jobTitle = 'General Role';
            if (jobId) {
              const targetJob = await Job.findOne({ id: jobId });
              if (targetJob) jobTitle = targetJob.title;
            }
            sendAutomaticEmail(updatedCandidate, 'applicationReceived', { jobTitle }).catch(e => {
              console.error('[Public Apply Background] Auto-reply email error:', e.message);
            });
          }
          Candidate.find().then(allCands => searchIndex.buildIndex(allCands)).catch(e => console.error('Failed to rebuild search index:', e));
          indexCandidate(updatedCandidate).catch(err => console.error('RAG index failed for', updatedCandidate.name, err.message));
        }

      } catch (err) {
        console.error('Background processing failed:', err);
        // Update candidate isProcessing to false so it doesn't stay stuck
        await Candidate.updateOne({ id: candidateId }, { $set: { isProcessing: false } }).catch(e => console.error('Failed to reset candidate isProcessing:', e));
        // Update Ingestion Log to failed
        await IngestionLog.updateOne(
          { id: logId },
          { 
            status: 'failed', 
            error: err.message
          }
        ).catch(e => console.error('Failed to update ingestion log to failed:', e));
      }
    }, 0);


    
    // Send confirmation email if configured
    try {
      if (newCandidate.email) {
        const settings = await Settings.findById('global');
        if (settings && settings.emailTemplates && settings.emailTemplates.applicationReceived) {
          const emailConfig = await getEmailConfig();
          
          let template = settings.emailTemplates.applicationReceived;
          let jobTitle = 'General Role';
          if (jobId) {
            const job = await Job.findOne({ id: jobId });
            if (job) jobTitle = job.title;
          }

          // Template variable replacements (handles both double curly and bracket styles)
          template = template.replace(/{{CandidateName}}/g, newCandidate.name || 'Candidate');
          template = template.replace(/{candidate_name}/g, newCandidate.name || 'Candidate');
          
          template = template.replace(/{{JobTitle}}/g, jobTitle);
          template = template.replace(/{job_title}/g, jobTitle);
          
          template = template.replace(/{{CandidateID}}/g, newCandidate.id || 'N/A');
          template = template.replace(/{candidate_id}/g, newCandidate.id || 'N/A');
          
          template = template.replace(/{company_name}/g, 'iSpatial Techno Solutions (IST)');
          
          let subject = `Application Received: ${jobTitle}`;
          let body = template;
          
          // Parse Subject line from template if it exists
          const lines = template.split('\n');
          if (lines[0].toLowerCase().startsWith('subject:')) {
            subject = lines[0].substring(8).trim();
            body = lines.slice(1).join('\n').trim();
          }
          
          if (emailConfig.provider === 'outlook' && emailConfig.outlookClientId && emailConfig.outlookClientSecret && emailConfig.outlookUserEmail) {
            const { getOutlookToken } = await import('./outlookAuth.js');
            const accessToken = await getOutlookToken(
              emailConfig.outlookClientId,
              emailConfig.outlookTenantId,
              emailConfig.outlookClientSecret
            );
            await sendOutlookEmail(accessToken, emailConfig.outlookUserEmail, { to: newCandidate.email, subject, body });
          } else if (emailConfig.user && emailConfig.pass) {
            await sendSMTPMessage({ to: newCandidate.email, subject, body });
          }
          newCandidate.history.push({ date: new Date().toISOString(), type: 'EmailSent', text: 'Sent Application Received auto-reply' });
          await newCandidate.save();
        }
      }
    } catch (emailErr) {
      console.error('Failed to send auto-reply email:', emailErr);
    }
    
    res.json({ trackingId, message: 'Your application has been received successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/public/status/:trackingId', async (req, res) => {
  try {
    const cand = await Candidate.findOne({ trackingId: req.params.trackingId });
    if (!cand) return res.status(404).json({ error: 'Not found' });
    
    let jobTitle = 'General Role';
    if (cand.jobId) {
      const job = await Job.findOne({ id: cand.jobId });
      if (job) jobTitle = job.title;
    }
    
    res.json({
      trackingId: cand.trackingId,
      role: jobTitle,
      status: cand.stage,
      appliedOn: cand.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/public/refer', async (req, res) => {
  try {
    const { 
      referrerName, referrerEmployeeId, candidateName, candidateEmail, 
      candidatePhone, keySkills, jobId, cvFileRef 
    } = req.body;
    
    const trackingId = generateTrackingId();
    const candidateId = `cand_${Date.now()}`;
    
    const newCandidate = new Candidate({
      id: candidateId,
      trackingId,
      source: 'referral',
      referrerName,
      referrerEmployeeId,
      jobId: jobId,
      name: candidateName,
      email: candidateEmail || '',
      phone: candidatePhone || '',
      skills: (keySkills || '').split(',').map(s => s.trim()),
      resumeUrl: cvFileRef || '',
      stage: 'Inbox',
      history: [{ date: new Date().toISOString(), type: 'Status', text: `Referred by ${referrerName}` }]
    });
    
    await newCandidate.save();
    
    res.json({ trackingId, message: 'Referral submitted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SMART HR HUB PORTED ROUTES (INTERNAL)
// ==========================================

app.get('/api/placements', authenticateToken, async (req, res) => {
  try {
    const placed = await Candidate.find({ stage: 'Placed' });
    const formatted = placed.map(c => ({
      id: c.id,
      applicantId: c.id,
      name: c.name,
      trackingId: c.trackingId || 'N/A',
      rolePlaced: (c.placementData && c.placementData.rolePlaced) ? c.placementData.rolePlaced : 'Unknown',
      department: 'N/A',
      previousSalary: (c.placementData && c.placementData.previousSalary) ? c.placementData.previousSalary : null,
      newSalary: (c.placementData && c.placementData.newSalary) ? c.placementData.newSalary : null,
      increase: (c.placementData && c.placementData.newSalary && c.placementData.previousSalary) 
                ? c.placementData.newSalary - c.placementData.previousSalary : 0,
      placementDate: (c.placementData && c.placementData.placementDate) ? c.placementData.placementDate : c.updatedAt,
      sourceChannel: c.source || 'manual'
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/placements/analytics', authenticateToken, async (req, res) => {
  try {
    const placed = await Candidate.find({ stage: 'Placed' });
    
    let totalPlacements = placed.length;
    let placementsThisMonth = 0;
    let totalIncrease = 0;
    let candidatesWithIncrease = 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const byMonthMap = {};
    const byDepartmentMap = {};
    const byChannelMap = {};

    placed.forEach(c => {
      // Calculate this month
      const date = new Date((c.placementData && c.placementData.placementDate) ? c.placementData.placementDate : c.updatedAt);
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        placementsThisMonth++;
      }

      // Calculate increase
      const prevSalary = c.placementData?.previousSalary || 0;
      const newSalary = c.placementData?.newSalary || 0;
      if (newSalary > 0 && prevSalary > 0) {
        totalIncrease += (newSalary - prevSalary);
        candidatesWithIncrease++;
      }

      // By month
      const monthStr = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
      byMonthMap[monthStr] = (byMonthMap[monthStr] || 0) + 1;

      // By department
      // We don't have department easily accessible in Candidate, but let's mock or use job info if available
      const dept = 'Engineering'; // Fallback
      byDepartmentMap[dept] = (byDepartmentMap[dept] || 0) + 1;

      // By channel
      const channel = c.source || 'manual';
      if (!byChannelMap[channel]) byChannelMap[channel] = { count: 0, totalInc: 0, incCount: 0 };
      byChannelMap[channel].count++;
      if (newSalary > 0 && prevSalary > 0) {
        byChannelMap[channel].totalInc += (newSalary - prevSalary);
        byChannelMap[channel].incCount++;
      }
    });

    const avgSalaryIncrease = candidatesWithIncrease > 0 ? (totalIncrease / candidatesWithIncrease) : 0;
    
    const byMonth = Object.keys(byMonthMap).map(k => ({ month: k, count: byMonthMap[k] }));
    const byDepartment = Object.keys(byDepartmentMap).map(k => ({ department: k, count: byDepartmentMap[k] }));
    const byChannel = Object.keys(byChannelMap).map(k => ({
      channel: k,
      count: byChannelMap[k].count,
          avgIncrease: byChannelMap[k].incCount > 0 ? (byChannelMap[k].totalInc / byChannelMap[k].incCount) : 0
    }));

    res.json({
      totalPlacements,
      placementsThisMonth,
      avgSalaryIncrease,
      byMonth,
      byDepartment,
      byChannel
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/referrals', authenticateToken, async (req, res) => {
  try {
    const { search, bonusOnly } = req.query;
    
    let filter = { $or: [{ source: 'referral' }, { referrerName: { $exists: true, $ne: '' } }] };
    if (bonusOnly === 'true') {
      filter.bonusEligible = true;
    }
    
    const refs = await Candidate.find(filter);
    const allJobs = await Job.find({});
    const jobMap = {};
    allJobs.forEach(j => { 
      jobMap[j.id] = j.title; 
      if (j.publicSlug) jobMap[j.publicSlug] = j.title;
    });
    
    let formatted = refs.map(c => {
      let roleTitle = jobMap[c.jobId] || c.jobId || 'General Role';
      if (roleTitle.includes('-') && !roleTitle.includes(' ')) {
        roleTitle = roleTitle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
      return {
        id: c.id,
        applicantId: c.id,
        referrerName: c.referrerName || 'Internal Employee',
        referrerEmployeeId: c.referrerEmployeeId || null,
        candidateName: c.name || 'Unknown',
        candidateEmail: c.email || null,
        candidatePhone: c.phone || null,
        roleReferredFor: roleTitle,
        createdAt: c.createdAt,
        status: c.stage || 'Inbox',
        ats: (c.matchScore !== undefined && c.matchScore !== null) ? c.matchScore : (c.ownCategoryScore || 0),
        hasCv: !!c.resumeUrl,
        resumeUrl: c.resumeUrl || null,
        skills: c.skills || [],
        experienceYears: c.experienceYears || c.extractedData?.totalExperience || null,
        bonusEligible: c.bonusEligible !== false
      };
    });

    if (search) {
      const lowerSearch = search.toLowerCase();
      formatted = formatted.filter(r => 
        (r.candidateName && r.candidateName.toLowerCase().includes(lowerSearch)) ||
        (r.referrerName && r.referrerName.toLowerCase().includes(lowerSearch)) ||
        (r.referrerEmployeeId && r.referrerEmployeeId.toLowerCase().includes(lowerSearch)) ||
        (r.roleReferredFor && r.roleReferredFor.toLowerCase().includes(lowerSearch))
      );
    }

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/referrals/dashboard', authenticateToken, async (req, res) => {
  try {
    const refs = await Candidate.find({ $or: [{ source: 'referral' }, { referrerName: { $exists: true, $ne: '' } }] });
    
    let total = refs.length;
    let thisMonth = 0;
    let bonusEligible = 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const byEmployeeMap = {};
    const byMonthMap = {};

    refs.forEach(c => {
      if (c.bonusEligible !== false) bonusEligible++;
      
      const date = new Date(c.createdAt || Date.now());
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        thisMonth++;
      }

      // By employee
      const empKey = c.referrerName || 'Internal Employee';
      if (!byEmployeeMap[empKey]) byEmployeeMap[empKey] = { referrerName: empKey, referrerEmployeeId: c.referrerEmployeeId || null, total: 0, bonusEligible: 0 };
      byEmployeeMap[empKey].total++;
      if (c.bonusEligible !== false) byEmployeeMap[empKey].bonusEligible++;

      // By month
      const monthStr = date.toLocaleString('default', { month: 'short' });
      const labelStr = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
      if (!byMonthMap[labelStr]) byMonthMap[labelStr] = { month: monthStr, label: labelStr, count: 0 };
      byMonthMap[labelStr].count++;
    });

    const uniqueReferrers = Object.keys(byEmployeeMap).length;
    const byEmployee = Object.values(byEmployeeMap);
    const byMonth = Object.values(byMonthMap);

    res.json({
      total, thisMonth, bonusEligible, uniqueReferrers,
      byEmployee, byMonth
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/referrals', authenticateToken, async (req, res) => {
  try {
    const { referrerName, referrerEmployeeId, candidateName, candidateEmail, candidatePhone, jobId, keySkills } = req.body;
    
    const candidateId = `cand_${Date.now()}`;

    // Create new candidate
    const newCandidate = new Candidate({
      id: candidateId,
      name: candidateName,
      email: candidateEmail,
      phone: candidatePhone,
      source: 'referral',
      stage: 'Inbox',
      jobId: jobId || null,
      skills: keySkills ? keySkills.split(',').map(s => s.trim()) : [],
      referrerName: referrerName,
      referrerEmployeeId: referrerEmployeeId,
      bonusEligible: true,
      trackingId: 'REF-' + Math.floor(100000 + Math.random() * 900000)
    });
    
    await newCandidate.save();
    res.json({ success: true, candidate: newCandidate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pending-cvs', authenticateToken, async (req, res) => {
  try {
    // Return candidates in early stages
    const pending = await Candidate.find({ stage: { $in: ['Inbox', 'AI Processed'] } });
    const formatted = pending.map(c => {
      const daysPending = Math.floor((Date.now() - new Date(c.createdAt).getTime()) / (1000 * 3600 * 24));
      return {
        id: c.id,
        name: c.name,
        jobRole: 'Unknown',
        formTitle: 'Unknown',
        currentLocation: 'Unknown',
        noticePeriod: 'Unknown',
      };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(` TalentFlow server running at http://localhost:${PORT}`);
  console.log(` MongoDB Connected & Ready.`);
  console.log(`=================================================\n`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] Port ${PORT} is already in use by another process!`);
    console.error(`Please kill the existing process or run: taskkill /f /im node.exe\n`);
    process.exit(1);
  } else {
    console.error('[ERROR] Server startup error:', err);
  }
});
server.timeout = 600000; // 10 minutes to support long Ollama parsing tasks

// Set server timeouts to 30 minutes (1,800,000 ms) for slow local LLMs
server.timeout = 1800000;
server.headersTimeout = 1801000;
server.requestTimeout = 1800000;
server.keepAliveTimeout = 1800000;

