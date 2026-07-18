import fs from 'fs';
import { Readable } from 'stream';
import { createRequire } from 'module';

// Use built-in unzip approach via node:zlib + manual ZIP parsing
// Actually, let's just use a simple approach with the pdfjs we already have
// We'll parse the PPTX (which is a ZIP) manually

async function extractPPTText(filePath) {
  const { default: JSZip } = await import('jszip');
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  
  const slideFiles = Object.keys(zip.files)
    .filter(f => f.match(/ppt\/slides\/slide\d+\.xml$/))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/)[1]);
      const nb = parseInt(b.match(/slide(\d+)/)[1]);
      return na - nb;
    });

  console.log(`Total slides found: ${slideFiles.length}\n`);

  for (const slideFile of slideFiles) {
    const xml = await zip.files[slideFile].async('string');
    const texts = [];
    const regex = /<a:t>([^<]+)<\/a:t>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) {
      texts.push(m[1]);
    }
    const slideNum = slideFile.match(/slide(\d+)/)[1];
    console.log(`\n========== SLIDE ${slideNum} ==========`);
    console.log(texts.join('\n'));
  }
}

const filePath = process.argv[2] || 'C:/Users/sri charan/Downloads/TalentFlow_Core_Features_Presentation.pptx';
extractPPTText(filePath).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
