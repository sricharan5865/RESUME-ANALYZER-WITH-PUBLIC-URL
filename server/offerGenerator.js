import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Number to Indian Rupees Words converter
 */
function numberToWords(num) {
  if (!num || isNaN(num)) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  }

  const result = inWords(Math.floor(num));
  return result ? result + ' Only' : '';
}

/**
 * Formats currency in Indian format
 */
function formatIndianCurrency(amount) {
  if (!amount && amount !== 0) return '0';
  const num = Math.round(Number(amount));
  return num.toLocaleString('en-IN');
}

/**
 * Generates an Offer Letter DOCX Buffer by replacing tags in template_offer_letter.docx
 */
export async function generateOfferLetterBuffer(candidate, offerData = {}) {
  const templatePath = path.join(__dirname, 'template_offer_letter.docx');

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Offer letter docx template not found at ${templatePath}`);
  }

  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const parseNum = (val) => {
    const n = parseFloat((val || '').toString().replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const today = new Date();
  const formattedToday = offerData.offerDate
    ? new Date(offerData.offerDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const joinDate = offerData.joiningDate
    ? new Date(offerData.joiningDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'August 5, 2026';

  const returnDate = offerData.offerDeadline
    ? new Date(offerData.offerDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : (offerData.joiningDate
      ? new Date(new Date(offerData.joiningDate).getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'July 29, 2026');

  const ctcNum = parseNum(offerData.ctc || offerData.offeredSalary || candidate.ctc || 2000000);
  const ctcStr = formatIndianCurrency(ctcNum);
  const ctcWords = numberToWords(ctcNum);

  const rawId = candidate.id ? String(candidate.id).replace(/\D/g, '') : '1600';
  const refNo = offerData.refNo || `IST/2026/${rawId.slice(-4).padStart(4, '0')}`;
  const candidateName = (candidate.name || 'CANDIDATE NAME').toUpperCase();
  const positionStr = offerData.designation || offerData.jobTitle || candidate.position || 'ArcGIS Pro Specialist';

  const bAnnual = parseNum(offerData?.basicPay);
  const hAnnual = parseNum(offerData?.hra);
  const sAnnual = parseNum(offerData?.standardAllowance);
  const tAnnual = parseNum(offerData?.travelAllowance);
  const spAnnual = parseNum(offerData?.specialPay);
  const grossAnnual = bAnnual + hAnnual + sAnnual + tAnnual + spAnnual || ctcNum;
  const pfAnn = parseNum(offerData?.pfContribution);

  const formatMonthly = (annual) => (annual > 0 ? formatIndianCurrency(Math.round(annual / 12)) : '');
  const formatAnnual = (annual) => (annual > 0 ? formatIndianCurrency(annual) : '');

  const templateData = {
    refNo,
    formattedToday,
    candidateName,
    email: candidate.email || '',
    phone: candidate.phone || '',
    position: positionStr,
    joinDate,
    returnDate,
    ctcStr,
    ctcWords,
    bMonthly: formatMonthly(bAnnual),
    bAnnual: formatAnnual(bAnnual),
    hMonthly: formatMonthly(hAnnual),
    hAnnual: formatAnnual(hAnnual),
    sMonthly: formatMonthly(sAnnual),
    sAnnual: formatAnnual(sAnnual),
    tMonthly: formatMonthly(tAnnual),
    tAnnual: formatAnnual(tAnnual),
    spMonthly: formatMonthly(spAnnual),
    spAnnual: formatAnnual(spAnnual),
    grossMonthly: formatMonthly(grossAnnual),
    grossAnnual: formatAnnual(grossAnnual),
    pfMonthly: formatMonthly(pfAnn),
    pfAnnual: formatAnnual(pfAnn),
    ctcAnnual: formatAnnual(ctcNum)
  };

  doc.render(templateData);
  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return buf;
}
