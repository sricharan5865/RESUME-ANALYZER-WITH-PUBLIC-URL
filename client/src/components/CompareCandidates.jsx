import React from 'react';
import { getCandidateLocation, getCandidateExperience, getCandidateNoticePeriod } from '../utils/candidateHelpers';

export default function CompareCandidates({ candidates, compareIds, onBack }) {
  if (!compareIds || compareIds.length === 0) {
    return (
      <div style={{ padding: '24px' }}>
        <header style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Candidate Comparison</h2>
          <button onClick={onBack} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginTop: '12px' }}>← Back to Pipeline</button>
        </header>
        <div className="glass" style={{ padding: '40px', textAlign: 'center', borderRadius: '12px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No candidates selected. Go to the Pipeline board and select candidates to compare.</p>
        </div>
      </div>
    );
  }

  const cands = candidates.filter(c => compareIds.includes(c.id));
  const bestScore = Math.max(...cands.map(c => c.matchScore || 0));

  const rows = [
    { label: "Job Match Score", render: c => <span style={{ fontWeight: 'bold', color: c.matchScore >= 80 ? 'var(--status-offered)' : 'inherit' }}>{c.matchScore}%</span>, highlight: true },
    { label: "Competency Score", render: c => `${c.ownCategoryScore || 0}%` },
    { label: "Current Stage", render: c => <span style={{ background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{c.stage}</span> },
    { label: "Location", render: c => getCandidateLocation(c) },
    { label: "Notice Period", render: c => getCandidateNoticePeriod(c) },
    { label: "Total Experience", render: c => getCandidateExperience(c) },
    { label: "Education", render: c => c.education?.length ? c.education.map(e => e.degree).join(', ') : "—" },
    { label: "Key Skills", render: c => c.skills?.join(', ') || "—" },
    { label: "Matching Skills", render: c => <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--status-offered)' }}>{(c.matchingSkills || []).map((s, i) => <li key={i}>{s}</li>)}</ul> },
    { label: "Missing Skills", render: c => <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--status-rejected)' }}>{(c.missingSkills || []).map((s, i) => <li key={i}>{s}</li>)}</ul> },
    { label: "AI Summary", render: c => <span style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.4' }}>{c.matchExplanation || "—"}</span> },
  ];

  return (
    <div style={{ padding: '0px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <header style={{ marginBottom: '12px', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', margin: 0 }}>← Back to Pipeline</button>
      </header>

      <div className="glass" style={{ flexGrow: 1, overflowX: 'auto', overflowY: 'auto', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-main)', zIndex: 1 }}>
            <tr>
              <th style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', minWidth: '150px' }}>Attribute</th>
              {cands.map((c) => (
                <th key={c.id} style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', minWidth: '250px', background: c.matchScore === bestScore && bestScore > 0 ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{c.email}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{c.phone}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                  {r.label}
                </td>
                {cands.map((c) => (
                  <td key={c.id} style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', background: r.highlight && c.matchScore === bestScore && bestScore > 0 ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                    {r.render(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
