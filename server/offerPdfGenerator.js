import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
 * Generates an Offer Letter PDF Buffer by cleanly overlaying filled values into
 * the exact blank spaces of template_offer_letter.pdf with 100% pixel perfection.
 */
export async function generateOfferLetterPDFBuffer(candidate, offerData = {}) {
  const templatePath = path.join(__dirname, 'template_offer_letter.pdf');

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Offer letter master template not found at ${templatePath}`);
  }

  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const textColor = rgb(0.05, 0.08, 0.15); // Deep crisp dark #0d1322

  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const page2 = pages[1] || page1;
  const pageHeight = page1.getHeight(); // 792 points

  const coverAndDraw = (page, text, x, pdfTopY, width = 100, boxHeight = 12, isBold = false, size = 9.0) => {
    // Convert top-down PDF Y coordinate to pdf-lib bottom-up Y coordinate
    const y = pageHeight - pdfTopY - 9;

    // Draw clean white rectangle to erase static template dashed line
    page.drawRectangle({
      x: x - 1,
      y: y - 2,
      width: width,
      height: boxHeight,
      color: rgb(1, 1, 1)
    });

    if (text && String(text).trim()) {
      page.drawText(String(text), {
        x: x,
        y: y,
        size: size,
        font: isBold ? fontBold : fontRegular,
        color: textColor
      });
    }
  };

  const parseNum = (val) => {
    const n = parseFloat((val || '').toString().replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  // Prepare dynamic values
  const today = new Date();
  const formattedToday = offerData.offerDate
    ? new Date(offerData.offerDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const joinDate = offerData.joiningDate
    ? new Date(offerData.joiningDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'August 5, 2026';

  const returnDate = offerData.offerDeadline
    ? new Date(offerData.offerDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '.'
    : (offerData.joiningDate
      ? new Date(new Date(offerData.joiningDate).getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '.'
      : 'July 29, 2026.');

  const ctcNum = parseNum(offerData.ctc || offerData.offeredSalary || candidate.ctc || 2000000);
  const ctcStr = formatIndianCurrency(ctcNum);
  const ctcWords = numberToWords(ctcNum);

  const rawId = candidate.id ? String(candidate.id).replace(/\D/g, '') : '1600';
  const refNo = offerData.refNo || `IST/2026/${rawId.slice(-4).padStart(4, '0')}`;
  const candidateName = (candidate.name || 'CANDIDATE NAME').toUpperCase();
  const positionStr = offerData.designation || offerData.jobTitle || candidate.position || 'ArcGIS Pro Specialist';

  // --- PAGE 1 OVERLAYS ---
  // Ref & Date
  coverAndDraw(page1, refNo, 76, 94.57, 130, 13, true, 9.0);
  coverAndDraw(page1, formattedToday, 428, 94.57, 120, 13, true, 9.0);

  // Candidate Name (after Mr/Ms.)
  coverAndDraw(page1, candidateName, 95, 134.09, 160, 13, true, 9.0);

  // Email & Phone under candidate name
  if (candidate.email) {
    coverAndDraw(page1, `Email: ${candidate.email}`, 53.5, 147.3, 160, 12, false, 8.5);
  }
  if (candidate.phone) {
    coverAndDraw(page1, `Phone: ${candidate.phone}`, 53.5, 160.5, 160, 12, false, 8.5);
  }

  // Position
  coverAndDraw(page1, positionStr, 390, 213.37, 120, 13, true, 9.0);

  // Joining Date (width = 98 to keep ', beyond' 100% intact)
  coverAndDraw(page1, `${joinDate},`, 310, 252.87, 98, 13, true, 9.0);

  // --- LINE 3 ERASE & DRAW ---
  // Erase entire static dashed region '------------------/-' (X = 254 to 342) and draw formatted salary with '/-'
  coverAndDraw(page1, `${ctcStr}/-`, 256, 292.64, 88, 13, true, 9.0);

  // Erase static dashed region '--------------------).' (X = 390 to 482) and redraw rupees words + ').'
  // Scale down font size dynamically for long numbers to prevent overlapping with static 'Please refer to' text
  const ctcWordsFull = `${ctcWords}).`;
  let ctcWordsSize = 9.0;
  if (ctcWordsFull.length > 35) {
    ctcWordsSize = 5.5;
  } else if (ctcWordsFull.length > 25) {
    ctcWordsSize = 7.0;
  } else if (ctcWordsFull.length > 18) {
    ctcWordsSize = 8.0;
  }
  coverAndDraw(page1, ctcWordsFull, 392, 292.64, 92, 13, true, ctcWordsSize);

  // Formalities submit deadline (width = 135 to erase all dashes '-----------------------.')
  coverAndDraw(page1, `${joinDate}.`, 53.5, 371.9, 135, 13, true, 9.0);

  // Offer return deadline
  coverAndDraw(page1, returnDate, 122, 490.69, 90, 13, true, 9.0);

  // --- PAGE 2 OVERLAYS (ACCEPTANCE & SALARY TABLE) ---
  coverAndDraw(page2, candidateName, 125, 173.59, 160, 13, true, 9.0);
  coverAndDraw(page2, formattedToday, 125, 200.12, 120, 13, false, 9.0);

  // Salary Table Cell Fillers (Annexure-I)
  const bAnnual = parseNum(offerData?.basicPay);
  const hAnnual = parseNum(offerData?.hra);
  const sAnnual = parseNum(offerData?.standardAllowance);
  const tAnnual = parseNum(offerData?.travelAllowance);
  const spAnnual = parseNum(offerData?.specialPay);
  const grossAnnual = bAnnual + hAnnual + sAnnual + tAnnual + spAnnual || ctcNum;
  const pfAnn = parseNum(offerData?.pfContribution);

  const fillTableCell = (page, val, x, y, width = 60, isBold = false) => {
    if (!val && val !== 0) return;
    const textStr = typeof val === 'number' ? val.toLocaleString('en-IN') : val.toString();
    page.drawRectangle({
      x: x - 2,
      y: y - 2,
      width: width,
      height: 12,
      color: rgb(1, 1, 1)
    });
    page.drawText(textStr, {
      x: x,
      y: y,
      size: 8.5,
      font: isBold ? fontBold : fontRegular,
      color: textColor
    });
  };

  const colMonthlyX = 345;
  const colAnnualX = 415;

  // Basic (Row 1)
  if (bAnnual > 0) {
    fillTableCell(page2, Math.round(bAnnual / 12), colMonthlyX, 498);
    fillTableCell(page2, bAnnual, colAnnualX, 498);
  }

  // HRA (Row 2)
  if (hAnnual > 0) {
    fillTableCell(page2, Math.round(hAnnual / 12), colMonthlyX, 482);
    fillTableCell(page2, hAnnual, colAnnualX, 482);
  }

  // Standard Allowance (Row 3)
  if (sAnnual > 0) {
    fillTableCell(page2, Math.round(sAnnual / 12), colMonthlyX, 466);
    fillTableCell(page2, sAnnual, colAnnualX, 466);
  }

  // Travel / WFH Allowance (Row 4)
  if (tAnnual > 0) {
    fillTableCell(page2, Math.round(tAnnual / 12), colMonthlyX, 450);
    fillTableCell(page2, tAnnual, colAnnualX, 450);
  }

  // Special Pay (Row 5)
  if (spAnnual > 0) {
    fillTableCell(page2, Math.round(spAnnual / 12), colMonthlyX, 434);
    fillTableCell(page2, spAnnual, colAnnualX, 434);
  }

  // Gross Salary (Row 6)
  if (grossAnnual > 0) {
    fillTableCell(page2, Math.round(grossAnnual / 12), colMonthlyX, 416, 60, true);
    fillTableCell(page2, grossAnnual, colAnnualX, 416, 60, true);
  }

  // PF Contribution (Row 10)
  if (pfAnn > 0) {
    fillTableCell(page2, Math.round(pfAnn / 12), colMonthlyX, 350);
    fillTableCell(page2, pfAnn, colAnnualX, 350);
  }

  // Annual CTC (Row 11)
  if (ctcNum > 0) {
    fillTableCell(page2, ctcNum, colAnnualX, 333, 60, true);
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
