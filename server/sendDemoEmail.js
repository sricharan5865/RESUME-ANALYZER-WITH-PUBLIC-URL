import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function sendDemoRequest() {
  console.log('\n========================================');
  console.log(' TalentFlow - Send Demo Request Email');
  console.log('========================================\n');

  const userEmail = process.env.GMAIL_USER_EMAIL;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (!userEmail || !appPassword) {
    console.error('ERROR: GMAIL_USER_EMAIL or GMAIL_APP_PASSWORD not set in server/.env');
    console.log('\nPlease run the command provided in the chat to save credentials, or add them manually to server/.env:');
    console.log('GMAIL_USER_EMAIL=your_email@gmail.com');
    console.log('GMAIL_APP_PASSWORD=your_app_password\n');
    process.exit(1);
  }

  const recipient = process.argv[2] || 'sricharan586511@gmail.com';
  console.log(`[1/2] Connecting to Gmail SMTP (${userEmail})...`);
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: userEmail,
      pass: appPassword
    }
  });

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1e293b;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
          color: #ffffff;
          padding: 30px 40px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.025em;
          text-transform: uppercase;
        }
        .header p {
          margin: 5px 0 0 0;
          font-size: 14px;
          color: #c7d2fe;
          font-weight: 500;
        }
        .content {
          padding: 40px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 20px;
        }
        .intro {
          font-size: 15px;
          margin-bottom: 30px;
          color: #334155;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #4f46e5;
          border-bottom: 2px solid #f1f5f9;
          padding-bottom: 8px;
          margin-top: 30px;
          margin-bottom: 15px;
        }
        .feature-card {
          margin-bottom: 20px;
          padding: 16px 20px;
          background-color: #f8fafc;
          border-left: 4px solid #4f46e5;
          border-radius: 0 8px 8px 0;
        }
        .feature-name {
          font-weight: 700;
          font-size: 15px;
          color: #0f172a;
          margin-bottom: 6px;
        }
        .feature-desc {
          font-size: 14px;
          color: #475569;
          margin: 0;
        }
        .cta-box {
          margin-top: 40px;
          padding: 25px;
          background: #f5f3ff;
          border: 1px solid #ddd6fe;
          border-radius: 8px;
          text-align: center;
        }
        .cta-box p {
          margin: 0 0 15px 0;
          font-size: 15px;
          font-weight: 600;
          color: #4338ca;
        }
        .cta-btn {
          display: inline-block;
          background-color: #4f46e5;
          color: #ffffff !important;
          text-decoration: none;
          padding: 12px 28px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        .signature {
          margin-top: 40px;
          font-size: 15px;
          color: #334155;
          border-top: 1px solid #f1f5f9;
          padding-top: 20px;
        }
        .footer {
          background-color: #f1f5f9;
          padding: 20px 40px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TalentFlow</h1>
          <p>Enterprise AI Sourcing & Recruitment Command Center</p>
        </div>
        <div class="content">
          <div class="greeting">Dear Team / Hiring Manager,</div>
          <div class="intro">
            I would like to request a brief 15-minute meeting to show you a live demonstration of <strong>TalentFlow</strong>, 
            an enterprise-grade AI-powered recruitment automation platform. I built this software to eliminate 
            sourcing bottlenecks, reduce screening overhead, and bring conceptual intelligence to candidate matching.
            <br/><br/>
            Here is a summary of the core business capabilities implemented in the platform:
          </div>

          <div class="section-title">Workflow Process & Capabilities</div>

          <div class="feature-card">
            <div class="feature-name">1. Omni-Channel Ingestion & OCR Fallback</div>
            <p class="feature-desc">
              Resumes are automatically sourced through background email polling (Gmail/Outlook integration) or uploaded manually via the web portal. If a scanned or low-contrast PDF is detected, a Python OCR fallback (OpenCV, PyMuPDF, Tesseract-OCR) automatically runs to extract the text.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-name">2. AI-Driven Parsing & Profiling</div>
            <p class="feature-desc">
              The extracted text is processed using 'google/gemini-2.5-flash' to parse unstructured data into structured JSON profiles, capturing key candidate information, contact details, seniority level, core tech stack, and full experience history.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-name">3. Semantic Matching & RAG Search</div>
            <p class="feature-desc">
              Recruiters can paste natural-language Job Descriptions (JDs) to run vector search indexing. The system calculates a similarity score (0-100) and displays a side-by-side comparison of "Matching Skills" vs. "Missing Skills" in the candidate UI.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-name">4. Structured Interview Preparation</div>
            <p class="feature-desc">
              The platform automatically prepares dual question banks to assist screening calls: 14 HR screening questions (7 standardized onboarding questions prepended, and 7 personalized CV history questions appended) and custom experience-specific tech audit questions.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-name">5. Kanban Pipeline & State Retention</div>
            <p class="feature-desc">
              Candidates progress through a glassmorphic Kanban Board (Inbox, Shortlist, Interview, Offered, Rejected) with drag-and-drop actions. Single-page navigation preserves tab mounting in the DOM, keeping inputs and PDF preview states intact when switching views.
            </p>
          </div>

          <div class="cta-box">
            <p>I would be glad to show you a live demonstration of these capabilities.</p>
            <a href="mailto:sricharan586511@gmail.com?subject=Re:%20TalentFlow%20Demo" class="cta-btn">Confirm Demo Call Interest</a>
          </div>

          <div class="signature">
            Best regards,<br/>
            <strong>Sri Charan</strong><br/>
            Software Engineer / Project Creator
          </div>
        </div>
        <div class="footer">
          Delivered via TalentFlow Automated Sourcing Suite.
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Sri Charan" <${userEmail}>`,
    to: recipient,
    subject: 'Project Demo Request: AI-Powered Recruitment Platform (TalentFlow)',
    html: emailHtml,
    text: `Dear Team / Hiring Manager,\n\nI would love to request a brief 15-minute meeting to show you a live demonstration of my project, TalentFlow. I built this software to streamline recruitment and candidate sourcing using modern LLMs, semantic indexing, and robust data workflows.\n\nHere is a summary of the workflow process and capabilities:\n\n` +
          `1. Omni-Channel Ingestion & OCR Fallback: Auto-sources email attachments/uploads, routing scanned PDFs to a Python OCR subsystem.\n` +
          `2. AI-Driven Parsing & Profiling: Converts unstructured text into structured JSON profiles (seniority, tech stack, work history) using LLM APIs.\n` +
          `3. Semantic Matching & RAG Search: Calculates 0-100 match scores and displays side-by-side matching/missing skills against natural-language JDs.\n` +
          `4. Structured Interview Preparation: Automatically builds candidate-specific pre-screening question banks (HR and Technical).\n` +
          `5. Kanban Pipeline & State Retention: Organizes applications in a drag-and-drop board with zero-reset DOM tab-state retention.\n\n` +
          `Please let me know if you are available for a brief walkthrough.\n\nBest regards,\nSri Charan`
  };

  console.log(`[2/2] Sending email to ${recipient}...`);
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`\n✅ SUCCESS! Email sent successfully.`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Sent to: ${recipient}`);
  } catch (error) {
    console.error(`\n❌ FAILED to send email:`, error.message);
    process.exit(1);
  }
}

sendDemoRequest();
