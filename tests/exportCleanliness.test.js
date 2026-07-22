import { describe, test, expect } from 'vitest';
import { exportToCSV, prepareCandidateExportData } from '../client/src/utils/export.js';

describe('Excel Export Cleanliness & Deduplication', () => {
  test('prepareCandidateExportData backfills standard fields and removes redundant duplicate form answer columns', () => {
    const baseHeaders = {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      'extractedData.currentLocation': 'Location',
      'extractedData.totalYearsExperience': 'Experience (Years)',
      'extractedData.noticePeriod': 'Notice Period',
      stage: 'Stage',
      matchScore: 'ATS Score',
      createdAt: 'Applied Date'
    };

    const mockCandidates = [
      {
        id: 'cand1',
        name: 'SRI CHARAN',
        email: 'sricharan@example.com',
        phone: '9440000000',
        stage: 'Inbox',
        matchScore: 50,
        createdAt: '2026-07-21T18:37:56.000Z',
        extractedData: {
          currentLocation: 'Hyderabad',
          totalYearsExperience: 4,
          noticePeriod: '15 days',
          formAnswers: [
            { label: 'First Name', value: 'SRI CHARAN' },
            { label: 'Last Name', value: 'JAYAVARAPU' },
            { label: 'Email', value: 'sricharan@example.com' },
            { label: 'Phone Number', value: '9440000000' },
            { label: 'Current Location', value: 'Hyderabad' },
            { label: 'Total Years of Experience', value: '4' },
            { label: 'Notice Period', value: '15 days' },
            { label: 'Current CTC', value: '5 LPA' },
            { label: 'Expected CTC', value: '7 LPA' },
            { label: 'Earliest Join Date', value: '2026-07-23' },
            { label: 'Education', value: 'B.Tech' },
            { label: 'Key Skills', value: 'ArcGIS Pro' },
            { label: 'LinkedIn Profile', value: 'https://linkedin.com/in/example' }
          ]
        }
      }
    ];

    const { data, headers } = prepareCandidateExportData(mockCandidates, baseHeaders);

    // Verify Name is combined cleanly
    expect(data[0].name).toBe('SRI CHARAN JAYAVARAPU');

    // Verify header keys: standard headers are preserved
    expect(headers['name']).toBe('Name');
    expect(headers['email']).toBe('Email');
    expect(headers['phone']).toBe('Phone');

    // Verify redundant duplicate headers (First Name, Last Name, Email, Phone Number, Current Location, Total Years of Experience, Notice Period) are NOT added
    expect(headers['custom_First_Name']).toBeUndefined();
    expect(headers['custom_Last_Name']).toBeUndefined();
    expect(headers['custom_Email']).toBeUndefined();
    expect(headers['custom_Phone_Number']).toBeUndefined();
    expect(headers['custom_Current_Location']).toBeUndefined();
    expect(headers['custom_Total_Years_of_Experience']).toBeUndefined();
    expect(headers['custom_Notice_Period']).toBeUndefined();

    // Verify custom unique form headers ARE present
    expect(headers['custom_Current_CTC']).toBe('Current CTC');
    expect(headers['custom_Expected_CTC']).toBe('Expected CTC');
    expect(headers['custom_Earliest_Join_Date']).toBe('Earliest Join Date');
    expect(headers['custom_Education']).toBe('Education');
    expect(headers['custom_Key_Skills']).toBe('Key Skills');
    expect(headers['custom_LinkedIn_Profile']).toBe('LinkedIn Profile');
  });

  test('exportToCSV formats phone numbers with tab prefix and formats ISO dates cleanly', () => {
    let exportedContent = '';
    const originalBlob = globalThis.Blob;
    const originalURL = globalThis.URL;
    const originalDocument = globalThis.document;

    globalThis.Blob = class {
      constructor(content) {
        exportedContent = content[0];
      }
    };
    globalThis.URL = {
      createObjectURL: () => 'blob:dummy'
    };
    globalThis.document = {
      createElement: () => ({
        setAttribute: () => {},
        style: {},
        click: () => {}
      }),
      body: {
        appendChild: () => {},
        removeChild: () => {}
      }
    };

    const headers = {
      name: 'Name',
      phone: 'Phone Number',
      createdAt: 'Applied Date'
    };

    const mockData = [
      {
        name: 'Jane Doe',
        phone: '9440000000',
        createdAt: '2026-07-21T18:37:56.000Z'
      }
    ];

    exportToCSV(mockData, 'test_export', headers);

    // Phone number should have \t tab prefix to prevent scientific notation in Excel (9.44E+09)
    expect(exportedContent).toContain('"\t9440000000"');

    // ISO Date should be split at T to avoid Excel ### width errors
    expect(exportedContent).toContain('"2026-07-21"');
    expect(exportedContent).not.toContain('2026-07-21T18:37:56.000Z');

    globalThis.Blob = originalBlob;
    globalThis.URL = originalURL;
    globalThis.document = originalDocument;
  });
});
