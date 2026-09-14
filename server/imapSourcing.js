import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { ProcessedEmail } from './models.js';

/**
 * Connects to Gmail IMAP and retrieves unread emails containing PDF attachments.
 */
export async function fetchIMAPEmails(config) {
  const user = config?.user || process.env.GMAIL_USER_EMAIL;
  const pass = config?.pass || process.env.GMAIL_APP_PASSWORD;
  const provider = config?.provider || 'gmail';

  if (!user || !pass) {
    throw new Error('Email sourcing credentials are not configured.');
  }

  let host = 'imap.gmail.com';

  const client = new ImapFlow({
    host,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false
  });

  const emailsList = [];

  try {
    await client.connect();
    
    // Lock INBOX to inspect messages safely
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Find messages from the last 7 days (unseen + recent)
      // Gmail auto-marks self-sent emails as read, so we search by date too
      const since = new Date();
      since.setDate(since.getDate() - 7);
      
      let uids = [];
      try {
        // First try unseen messages
        const unseenUids = await client.search({ unseen: true });
        uids.push(...unseenUids);
      } catch (e) {
        console.warn('IMAP unseen search failed:', e.message);
      }
      
      try {
        // Also search for recent emails (last 7 days) to catch self-sent and already-read emails
        const recentUids = await client.search({ since });
        // Merge without duplicates
        for (const uid of recentUids) {
          if (!uids.includes(uid)) {
            uids.push(uid);
          }
        }
      } catch (e) {
        console.warn('IMAP date search failed:', e.message);
      }
      
      // Filter out already processed UIDs first to prevent starvation by non-resume emails
      const processedDocs = await ProcessedEmail.find(
        { messageId: { $in: uids.map(u => u.toString()) } },
        { messageId: 1 }
      ).lean();
      const processedSet = new Set(processedDocs.map(d => d.messageId));
      const pendingUids = uids.filter(u => !processedSet.has(u.toString()));
      const targetUids = pendingUids.slice(-20);
      
      for (const uid of targetUids) {
        const uidStr = uid.toString();

        // Fetch raw email source stream
        const rawSource = await client.download(uid);
        const parsedMail = await simpleParser(rawSource.content);
        
        // Filter for PDF attachments
        const pdfAttachments = (parsedMail.attachments || [])
          .filter(att => att.contentType === 'application/pdf' || att.filename?.toLowerCase().endsWith('.pdf'))
          .map((att, idx) => ({
            attachmentId: `${uid}-att-${idx}`,
            filename: att.filename || `resume-${uid}.pdf`,
            contentType: att.contentType,
            size: att.size
            // NOTE: Binary content is NOT included in listing - fetched on demand via getIMAPAttachmentData
          }));

        // Only include emails that have PDF attachments (just like the python project)
        if (pdfAttachments.length > 0) {
          emailsList.push({
            id: uidStr,
            subject: parsedMail.subject || '(No Subject)',
            from: parsedMail.from?.text || 'Unknown Sender',
            date: parsedMail.date ? parsedMail.date.toISOString() : new Date().toISOString(),
            snippet: parsedMail.text?.substring(0, 200) || '',
            body: parsedMail.text || parsedMail.html || '',
            attachments: pdfAttachments
          });
        } else {
          // If the email has no PDF attachment, mark it as processed immediately 
          // so we don't waste connection bandwidth/time downloading it again on next check.
          await ProcessedEmail.create({ messageId: uidStr }).catch(() => {});
        }
      }
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error('IMAP fetch emails failed:', error);
    throw error;
  } finally {
    try {
      await client.logout();
    } catch (e) {}
  }

  // Sort descending by date
  return emailsList.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Marks a message with the specified UID as read.
 */
export async function markIMAPEmailAsRead(uid, config) {
  const user = config?.user || process.env.GMAIL_USER_EMAIL;
  const pass = config?.pass || process.env.GMAIL_APP_PASSWORD;
  const provider = config?.provider || 'gmail';

  if (!user || !pass) {
    throw new Error('Email sourcing credentials are not configured.');
  }

  let host = 'imap.gmail.com';

  const client = new ImapFlow({
    host,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      await client.messageFlagsAdd({ uid: parseInt(uid, 10) }, ['\\Seen']);
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error(`IMAP mark email as read failed for UID ${uid}:`, error);
    throw error;
  } finally {
    try {
      await client.logout();
    } catch (e) {}
  }
}

/**
 * Downloads a specific attachment from an email using IMAP.
 */
export async function getIMAPAttachmentData(uid, attachmentIdx, config) {
  const user = config?.user || process.env.GMAIL_USER_EMAIL;
  const pass = config?.pass || process.env.GMAIL_APP_PASSWORD;
  const provider = config?.provider || 'gmail';

  if (!user || !pass) {
    throw new Error('Email sourcing credentials are not configured.');
  }

  let host = 'imap.gmail.com';

  const client = new ImapFlow({
    host,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const rawSource = await client.download(parseInt(uid, 10));
      const parsedMail = await simpleParser(rawSource.content);
      
      const pdfAttachments = (parsedMail.attachments || [])
        .filter(att => att.contentType === 'application/pdf' || att.filename?.toLowerCase().endsWith('.pdf'));
      
      const targetAtt = pdfAttachments[parseInt(attachmentIdx, 10)];
      if (!targetAtt) {
        throw new Error(`Attachment at index ${attachmentIdx} not found for email UID ${uid}`);
      }
      
      return {
        filename: targetAtt.filename || `resume-${uid}.pdf`,
        buffer: targetAtt.content
      };
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error(`IMAP download attachment failed for UID ${uid}:`, error);
    throw error;
  } finally {
    try {
      await client.logout();
    } catch (e) {}
  }
}
