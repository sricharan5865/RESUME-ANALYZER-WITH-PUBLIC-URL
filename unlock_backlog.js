import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';

const payloadPath = path.join(process.cwd(), 'scratch', 'encrypted_payload.json');
const htmlPath = path.join(process.cwd(), 'pending_bugs_backlog.html');

let payload;
if (fs.existsSync(payloadPath)) {
  payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
} else if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const match = html.match(/const ENCRYPTED_DATA = ({.*?});/);
  if (match) payload = JSON.parse(match[1]);
}

if (!payload) {
  console.error('❌ Could not locate encrypted payload.');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('🔒 Enter password to decrypt pending bugs backlog: ', (password) => {
  rl.close();
  try {
    const salt = Buffer.from(payload.salt, 'hex');
    const iv = Buffer.from(payload.iv, 'hex');
    const tag = Buffer.from(payload.tag, 'hex');
    const ciphertext = Buffer.from(payload.ciphertext, 'hex');

    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext, null, 'utf8');
    decrypted += decipher.final('utf8');

    console.log('\n============================================================');
    console.log('  🔓 ACCESS GRANTED - PENDING BUGS BACKLOG');
    console.log('============================================================\n');
    console.log(decrypted);
  } catch (err) {
    console.error('\n❌ Access Denied: Incorrect password.');
  }
});
