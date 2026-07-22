/**
 * Deduplicates candidate fields and prepares clean headers/data array for export.
 * Backfills standard candidate fields from formAnswers and prevents duplicate standard columns.
 * 
 * @param {Array} candidates Candidates array
 * @param {Object} baseHeaders Standard headers key-value map
 * @returns {Object} { data: Array, headers: Object }
 */
export function prepareCandidateExportData(candidates, baseHeaders) {
  const isStandardLabel = (label) => {
    if (!label) return true;
    const norm = label.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const standardNorms = [
      'firstname', 'lastname', 'fullname', 'name', 'candidatename',
      'email', 'emailaddress',
      'phone', 'phonenumber', 'contactnumber', 'mobile', 'mobilenumber', 'contact',
      'location', 'currentlocation', 'city',
      'experience', 'totalyears', 'totalyearsofexperience', 'totalexperience', 'workexperience', 'experienceyears', 'yearsofexperience',
      'noticeperiod', 'notice',
      'uploadcv', 'cvupload', 'uploadresume', 'resume', 'cv'
    ];
    return standardNorms.includes(norm);
  };

  const dynamicHeaders = {};

  const clonedData = candidates.map(c => {
    const clone = { ...c };
    
    if (clone.extractedData) {
      clone.extractedData = { ...clone.extractedData };
    } else {
      clone.extractedData = {};
    }

    if (c.extractedData && Array.isArray(c.extractedData.formAnswers)) {
      let firstName = '';
      let lastName = '';

      c.extractedData.formAnswers.forEach(ans => {
        if (!ans.label) return;
        const norm = ans.label.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const val = ans.value ? String(ans.value).trim() : '';

        if (norm === 'firstname') firstName = val;
        if (norm === 'lastname') lastName = val;

        if ((norm === 'email' || norm === 'emailaddress') && !clone.email && val) {
          clone.email = val;
        }
        if ((norm === 'phone' || norm === 'phonenumber' || norm === 'contactnumber' || norm === 'mobile' || norm === 'mobilenumber') && !clone.phone && val) {
          clone.phone = val;
        }
        if ((norm === 'location' || norm === 'currentlocation' || norm === 'city') && !clone.extractedData.currentLocation && val) {
          clone.extractedData.currentLocation = val;
        }
        if ((norm === 'experience' || norm === 'totalyears' || norm === 'totalyearsofexperience' || norm === 'totalexperience') && !clone.extractedData.totalYearsExperience && val) {
          clone.extractedData.totalYearsExperience = val;
        }
        if ((norm === 'noticeperiod' || norm === 'notice') && !clone.extractedData.noticePeriod && val) {
          clone.extractedData.noticePeriod = val;
        }

        if (!isStandardLabel(ans.label)) {
          const safeKey = `custom_${ans.label.trim().replace(/\s+/g, '_')}`;
          if (!dynamicHeaders[safeKey]) {
            dynamicHeaders[safeKey] = ans.label.trim();
          }
          clone[safeKey] = val || '—';
        }
      });

      if (firstName && lastName) {
        const combined = `${firstName} ${lastName}`.trim();
        if (!clone.name || clone.name.trim() === firstName) {
          clone.name = combined;
        }
      }
    }

    return clone;
  });

  const finalHeaders = { ...baseHeaders, ...dynamicHeaders };
  return { data: clonedData, headers: finalHeaders };
}

/**
 * Exports data to a CSV file and triggers a browser download.
 * Handles escaping strings and lists of items (arrays).
 * 
 * @param {Array} data Array of objects containing the row data
 * @param {String} fileName Output file name without extension
 * @param {Object} headers Key-value map of header key to display column title
 */
export function exportToCSV(data, fileName, headers) {
  const headerKeys = Object.keys(headers);
  const csvRows = [];
  
  // 1. Add header row
  csvRows.push(headerKeys.map(key => `"${headers[key].replace(/"/g, '""')}"`).join(','));
  
  // 2. Add data rows
  for (const row of data) {
    const values = headerKeys.map(key => {
      // Handle nested properties (e.g. nested.key)
      let val = row;
      const keyParts = key.split('.');
      for (const part of keyParts) {
        if (val === null || val === undefined) {
          val = '';
          break;
        }
        val = val[part];
      }

      let valStr = '';
      if (val === null || val === undefined) {
        valStr = '';
      } else if (Array.isArray(val)) {
        // If it is an array of objects (like education/experience)
        if (val.length > 0 && typeof val[0] === 'object') {
          valStr = val.map(item => {
            return Object.entries(item)
              .filter(([k]) => k !== '_id')
              .map(([k, v]) => `${k}: ${v}`)
              .join(' | ');
          }).join('; ');
        } else {
          valStr = val.join('; ');
        }
      } else if (typeof val === 'object') {
        valStr = JSON.stringify(val);
      } else {
        valStr = String(val);
      }
      
      // Clean ISO date strings (e.g. 2026-07-21T18:37:56.000Z -> 2026-07-21) to prevent Excel ### width issues
      if (typeof valStr === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valStr)) {
        valStr = valStr.split('T')[0];
      }

      // Format phone numbers as plain text using tab prefix so Excel does not parse into scientific notation (e.g. 9.44E+09)
      const headerTitle = (headers[key] || '').toLowerCase();
      const isPhoneField = key.toLowerCase().includes('phone') || headerTitle.includes('phone') || headerTitle.includes('contact') || headerTitle.includes('mobile');
      const isPureNumericPhone = /^\+?[0-9]{9,15}$/.test(valStr.replace(/[\s\-\(\)]/g, ''));

      if (valStr && (isPhoneField || isPureNumericPhone)) {
        valStr = `\t${valStr}`;
      }

      // Clean value to escape quotes and make CSV safe
      return `"${valStr.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  
  // Create Blob and trigger download (Excel safe UTF-8 BOM prefix)
  const blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Helper to safely extract nested property values
 */
function getRowValue(row, key) {
  let val = row;
  const keyParts = key.split('.');
  for (const part of keyParts) {
    if (val === null || val === undefined) return '';
    val = val[part];
  }
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) {
    if (val.length > 0 && typeof val[0] === 'object') {
      return val.map(item => Object.entries(item).filter(([k]) => k !== '_id').map(([k, v]) => `${k}: ${v}`).join(' | ')).join('; ');
    }
    return val.join('; ');
  }
  if (typeof val === 'object') return JSON.stringify(val);
  let str = String(val);
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    str = str.split('T')[0];
  }
  return str;
}

/**
 * Escapes XML special characters for MS Excel Spreadsheet XML format
 */
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Exports data directly to an Excel Spreadsheet (.xls) with custom styling and formatting.
 * 
 * @param {Array} data Array of objects containing row data
 * @param {String} fileName Output file name without extension
 * @param {Object} headers Key-value map of header key to display column title
 */
export function exportToExcel(data, fileName, headers) {
  const headerKeys = Object.keys(headers);

  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="HeaderStyle">
   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:FontName="Segoe UI"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="CellStyle">
   <Font ss:FontName="Segoe UI"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Candidates">
  <Table>
`;

  // Column Widths
  headerKeys.forEach(() => {
    xml += '   <Column ss:AutoFitWidth="1" ss:Width="120"/>\n';
  });

  // Headers
  xml += '   <Row ss:Height="26">\n';
  headerKeys.forEach(key => {
    const title = headers[key] || key;
    xml += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(title)}</Data></Cell>\n`;
  });
  xml += '   </Row>\n';

  // Rows
  for (const row of data) {
    xml += '   <Row ss:Height="22">\n';
    for (const key of headerKeys) {
      const cellVal = getRowValue(row, key);
      xml += `    <Cell ss:StyleID="CellStyle"><Data ss:Type="String">${escapeXml(cellVal)}</Data></Cell>\n`;
    }
    xml += '   </Row>\n';
  }

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


