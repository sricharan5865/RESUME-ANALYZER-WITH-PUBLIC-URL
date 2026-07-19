import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock } from 'lucide-react';

export default function PendingCvs({ backendUrl, token }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${backendUrl}/api/pending-cvs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setPending(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [backendUrl, token]);

  return (
    <div style={{ padding: '0px' }}>
      <header style={{ marginBottom: '12px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Candidates in Inbox or AI Processed stages requiring review.</p>
      </header>

      <div className="glass" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
            <tr>
              <th style={{ padding: '16px', fontWeight: '600' }}>Candidate</th>
              <th style={{ padding: '16px', fontWeight: '600' }}>Skills</th>
              <th style={{ padding: '16px', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '16px', fontWeight: '600' }}>Time in Stage</th>
              <th style={{ padding: '16px', fontWeight: '600' }}>Match Score</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center' }}>Loading...</td></tr>
            ) : pending.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center' }}>No pending CVs found. You're all caught up!</td></tr>
            ) : (
              pending.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px', fontWeight: '500' }}>{c.name}</td>
                  <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.keySkills}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '4px 8px', background: 'var(--bg-primary)', borderRadius: '4px', fontSize: '12px' }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {c.isAging ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: '500', fontSize: '13px' }}>
                        <AlertCircle size={14} /> {c.daysPending} days
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        <Clock size={14} /> {c.daysPending} days
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '60px', height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${c.ats}%`, background: c.ats > 70 ? '#10b981' : c.ats > 40 ? '#f59e0b' : '#ef4444' }}></div>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>{c.ats}%</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
