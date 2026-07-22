import React, { useState, useEffect, useMemo } from 'react';
import { Users, Gift, CheckCircle2, Clock } from 'lucide-react';

export default function Referrals({ backendUrl, token, jobs }) {
  const [rows, setRows] = useState([]);
  const [dash, setDash] = useState(null);
  const [search, setSearch] = useState("");
  const [bonusOnly, setBonusOnly] = useState(false);
  const [reload, setReload] = useState(0);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (bonusOnly) p.set("bonusOnly", "true");

    fetch(`${backendUrl}/api/referrals?${p}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch(`${backendUrl}/api/referrals/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setDash)
      .catch(console.error);
  }, [reload, backendUrl, token, search, bonusOnly]);

  const applyFilters = () => setReload((t) => t + 1);
  const monthMax = useMemo(() => Math.max(1, ...(dash?.byMonth?.map((m) => m.count) ?? [1])), [dash]);

  return (
    <div style={{ padding: '24px' }}>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Refer a candidate</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-value">{dash?.total ?? 0}</div><div className="kpi-label">Total Referrals</div></div>
        <div className="kpi-card"><div className="kpi-value">{dash?.thisMonth ?? 0}</div><div className="kpi-label">This Month</div></div>
        <div className="kpi-card"><div className="kpi-value">{dash?.bonusEligible ?? 0}</div><div className="kpi-label">Bonus-Eligible</div></div>
        <div className="kpi-card"><div className="kpi-value">{dash?.uniqueReferrers ?? 0}</div><div className="kpi-label">Referring Employees</div></div>
      </div>

      <div className="ref-cols">
        <div className="panel">
          <h3 style={{ marginBottom: '16px' }}>Referrals by Month</h3>
          <div className="bars">
            {(dash?.byMonth ?? []).map((m) => (
              <div key={m.month} className="bar-row">
                <span className="bar-label">{m.label}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(m.count / monthMax) * 100}%` }} /></div>
                <span className="bar-count">{m.count}</span>
              </div>
            ))}
            {(dash?.byMonth?.length ?? 0) === 0 && <div className="empty">No data yet.</div>}
          </div>
        </div>

        <div className="panel">
          <h3 style={{ marginBottom: '16px' }}>By Referring Employee</h3>
          <table className="data-table compact">
            <thead><tr><th>Employee</th><th className="num">Referrals</th><th className="num">Bonus-Eligible</th></tr></thead>
            <tbody>
              {(dash?.byEmployee ?? []).map((e, i) => (
                <tr key={i}>
                  <td className="strong" style={{ display: 'flex', flexDirection: 'column' }}>
                    {e.referrerName}
                    {e.referrerEmployeeId && <span className="muted small">ID: {e.referrerEmployeeId}</span>}
                  </td>
                  <td className="num">{e.total}</td>
                  <td className="num">{e.bonusEligible > 0 ? <span className="pill published">{e.bonusEligible}</span> : "—"}</td>
                </tr>
              ))}
              {(dash?.byEmployee?.length ?? 0) === 0 && <tr><td colSpan={3} className="empty">No referrals yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="filter-panel">
        <div className="filter-grid">
          <label className="fld fld-wide">
            <span>Search</span>
            <input placeholder="Candidate, referrer, employee ID, role…" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
          </label>
          <label className="fld fld-check">
            <span>&nbsp;</span>
            <label className="chk"><input type="checkbox" checked={bonusOnly} onChange={(e) => { setBonusOnly(e.target.checked); applyFilters(); }} /> Bonus-eligible only</label>
          </label>
        </div>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr><th>Candidate</th><th>Referred By</th><th>Role</th><th className="num">ATS</th><th>Status</th><th>Bonus</th><th>Referred On</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="strong">{r.candidateName}</div>
                  {r.candidateEmail && <div className="muted small">{r.candidateEmail}</div>}
                </td>
                <td>
                  <div>{r.referrerName}</div>
                  {r.referrerEmployeeId && <div className="muted small">ID: {r.referrerEmployeeId}</div>}
                </td>
                <td>{r.roleReferredFor ?? "—"}</td>
                <td className="num">
                  <div className={`score-badge ${r.ats >= 80 ? 'score-high' : r.ats >= 50 ? 'score-medium' : 'score-low'}`} style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                    {r.ats || 0}
                  </div>
                </td>
                <td>{r.status ? <span className="pill">{r.status}</span> : "—"}</td>
                <td>{r.bonusEligible ? <span className="pill published" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}><CheckCircle2 size={14}/> Eligible</span> : <span className="muted">—</span>}</td>
                <td>{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="empty">No referrals match.</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && <ReferModal backendUrl={backendUrl} token={token} jobs={jobs} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); setReload((t) => t + 1); }} />}
    </div>
  );
}

function ReferModal({ backendUrl, token, jobs, onClose, onSaved }) {
  const [refName, setRefName] = useState(""); 
  const [refId, setRefId] = useState("");
  const [candName, setCandName] = useState(""); 
  const [candEmail, setCandEmail] = useState(""); 
  const [candPhone, setCandPhone] = useState("");
  const [jobId, setJobId] = useState("");
  const [candSkills, setCandSkills] = useState("");
  const [busy, setBusy] = useState(false); 
  const [error, setError] = useState("");

  async function save() {
    setError("");
    if (!refName.trim() || !candName.trim() || !jobId) { setError("Referrer name, candidate name and position are required."); return; }
    if (!candSkills.trim()) { setError("Key skills are required — the ATS uses them to score the candidate."); return; }
    setBusy(true);
    try {
      const res = await fetch(`${backendUrl}/api/referrals`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          referrerName: refName, 
          referrerEmployeeId: refId || null,
          candidateName: candName, 
          candidateEmail: candEmail || null, 
          candidatePhone: candPhone || null,
          keySkills: candSkills || null,
          jobId, 
        })
      });
      
      if (!res.ok) {
        throw new Error("Could not save the referral.");
      }
      onSaved();
    } catch (e) { 
      setError(e.message || "Could not save the referral."); 
    } finally { 
      setBusy(false); 
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontSize: '20px', fontWeight: '600' }}>Refer a candidate</h3>
          <button className="btn" style={{ background: 'transparent', border: 'none' }} onClick={onClose}>✕</button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Referring employee *</label>
            <input className="form-input" value={refName} onChange={(e) => setRefName(e.target.value)} placeholder="Employee name" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Employee ID</label>
            <input className="form-input" value={refId} onChange={(e) => setRefId(e.target.value)} placeholder="Optional" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Candidate name *</label>
            <input className="form-input" value={candName} onChange={(e) => setCandName(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Candidate email</label>
            <input className="form-input" type="email" value={candEmail} onChange={(e) => setCandEmail(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Candidate phone</label>
            <input 
              className="form-input" 
              type="tel" 
              value={candPhone} 
              onChange={(e) => setCandPhone(e.target.value.replace(/[^0-9+\-\s()]/g, ''))} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Position *</label>
            <select className="form-input" value={jobId} onChange={(e) => setJobId(e.target.value)}>
              <option value="">Choose a position</option>
              {(jobs || []).map((j) => <option key={j.id} value={j.id}>{j.title}{j.location ? ` · ${j.location}` : ""}</option>)}
            </select>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Key skills *</label>
          <textarea className="form-input" value={candSkills} onChange={(e) => setCandSkills(e.target.value)} placeholder="e.g. React, Node.js, Python" style={{ minHeight: '80px', resize: 'vertical' }} />
        </div>
        
        {error && <div style={{ color: 'var(--status-rejected)', background: 'rgba(244, 63, 94, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Submit referral"}</button>
        </div>
      </div>
    </div>
  );
}
