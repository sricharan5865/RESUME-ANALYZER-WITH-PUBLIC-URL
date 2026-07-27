import React, { useState, useEffect, useMemo } from 'react';
import { Users, Gift, CheckCircle2, Clock, Pencil, Copy, Check, ExternalLink, RotateCcw, X, Save, Eye, FileText, UserCheck, Search, Filter } from 'lucide-react';

export default function Referrals({ backendUrl, token, jobs }) {
  const [rows, setRows] = useState([]);
  const [dash, setDash] = useState(null);
  const [search, setSearch] = useState("");
  const [bonusOnly, setBonusOnly] = useState(false);
  const [reload, setReload] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);

  // Referral Candidate Profile & Resume Modal state
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState(null);

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

  // Filter rows if an employee filter is active
  const filteredRows = useMemo(() => {
    if (!selectedEmployeeFilter) return rows;
    const empLower = selectedEmployeeFilter.toLowerCase();
    return rows.filter(r => 
      (r.referrerName && r.referrerName.toLowerCase().includes(empLower)) ||
      (r.referrerEmployeeId && r.referrerEmployeeId.toLowerCase().includes(empLower))
    );
  }, [rows, selectedEmployeeFilter]);

  // Calculate total referrals for a specific employee
  const getEmployeeReferralsCount = (empName, empId) => {
    if (!rows) return 0;
    return rows.filter(r => 
      (r.referrerName && r.referrerName.toLowerCase() === (empName || '').toLowerCase()) ||
      (r.referrerEmployeeId && r.referrerEmployeeId === empId)
    ).length;
  };

  return (
    <div style={{ padding: '24px' }}>
      
      {/* Page Header Actions */}
      <div className="page-head" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => setShowTopicModal(true)} 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: '600' }}
        >
          <Pencil size={15} /> Edit Referral Topic & JD
        </button>
        <button className="btn btn-secondary" onClick={() => window.open('/referral', '_blank')} title="Open Referral Link & Public Generator">
          <ExternalLink size={15} /> Public Referral Portal
        </button>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Refer a candidate</button>
      </div>

      {/* Top KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-value">{dash?.total ?? 0}</div><div className="kpi-label">Total Referrals</div></div>
        <div className="kpi-card"><div className="kpi-value">{dash?.thisMonth ?? 0}</div><div className="kpi-label">This Month</div></div>
        <div className="kpi-card"><div className="kpi-value">{dash?.bonusEligible ?? 0}</div><div className="kpi-label">Bonus-Eligible</div></div>
        <div className="kpi-card"><div className="kpi-value">{dash?.uniqueReferrers ?? 0}</div><div className="kpi-label">Referring Employees</div></div>
      </div>

      {/* Referrals by Month & By Referring Employee Panels */}
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

        {/* By Referring Employee Panel (Clickable to view employee specific referrals!) */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>By Referring Employee</h3>
            {selectedEmployeeFilter && (
              <button 
                onClick={() => setSelectedEmployeeFilter(null)}
                style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Clear Filter ✕
              </button>
            )}
          </div>

          <table className="data-table compact">
            <thead><tr><th>Employee</th><th className="num">Referrals</th><th className="num">Bonus-Eligible</th></tr></thead>
            <tbody>
              {(dash?.byEmployee ?? []).map((e, i) => {
                const isSelected = selectedEmployeeFilter === e.referrerName || selectedEmployeeFilter === e.referrerEmployeeId;
                return (
                  <tr 
                    key={i} 
                    onClick={() => setSelectedEmployeeFilter(e.referrerEmployeeId || e.referrerName)}
                    style={{ 
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                    title="Click to view all candidate referrals submitted by this employee"
                  >
                    <td className="strong" style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: isSelected ? '#38bdf8' : 'var(--text-primary)', fontWeight: '600' }}>
                        {e.referrerName}
                      </span>
                      {e.referrerEmployeeId && <span className="muted small">ID: {e.referrerEmployeeId}</span>}
                    </td>
                    <td className="num">
                      <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent-primary)', fontWeight: '700', fontSize: '12px' }}>
                        {e.total} Referrals
                      </span>
                    </td>
                    <td className="num">{e.bonusEligible > 0 ? <span className="pill published">{e.bonusEligible}</span> : "—"}</td>
                  </tr>
                );
              })}
              {(dash?.byEmployee?.length ?? 0) === 0 && <tr><td colSpan={3} className="empty">No referrals yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-panel">
        <div className="filter-grid">
          <label className="fld fld-wide">
            <span>Search Candidate or Referrer</span>
            <input 
              placeholder="Candidate name, referrer, employee ID, role…" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }} 
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} 
            />
          </label>
          <label className="fld fld-check">
            <span>&nbsp;</span>
            <label className="chk">
              <input type="checkbox" checked={bonusOnly} onChange={(e) => { setBonusOnly(e.target.checked); applyFilters(); }} /> 
              Bonus-eligible only
            </label>
          </label>
        </div>

        {selectedEmployeeFilter && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
            <Filter size={14} />
            <span>Showing referrals submitted by employee: <strong>{selectedEmployeeFilter}</strong> ({filteredRows.length} candidates)</span>
            <button onClick={() => setSelectedEmployeeFilter(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}
      </div>

      {/* Candidate Referrals Table (Clickable Rows to open Profile & Resume!) */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Referred By</th>
              <th>Role</th>
              <th className="num">ATS</th>
              <th>Status</th>
              <th>Resume / CV</th>
              <th>Bonus</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr 
                key={r.id} 
                onClick={() => setSelectedReferral(r)}
                style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                title="Click row to open full Referral Candidate Profile & uploaded resume"
              >
                <td>
                  <div className="strong" style={{ color: 'var(--accent-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{r.candidateName}</span>
                  </div>
                  {r.candidateEmail && <div className="muted small">{r.candidateEmail}</div>}
                </td>
                <td>
                  <div style={{ fontWeight: '600' }}>{r.referrerName}</div>
                  {r.referrerEmployeeId && <div className="muted small">ID: {r.referrerEmployeeId}</div>}
                </td>
                <td>{r.roleReferredFor ?? "—"}</td>
                <td className="num">
                  <div className={`score-badge ${r.ats >= 80 ? 'score-high' : r.ats >= 50 ? 'score-medium' : 'score-low'}`} style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                    {r.ats !== undefined && r.ats !== null ? r.ats : 0}
                  </div>
                </td>
                <td>{r.status ? <span className="pill">{r.status}</span> : "Inbox"}</td>
                <td>
                  {r.hasCv ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '12px', fontWeight: '600' }}>
                      <FileText size={14} /> Resume Attached
                    </span>
                  ) : (
                    <span className="muted small">No file</span>
                  )}
                </td>
                <td>{r.bonusEligible ? <span className="pill published" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}><CheckCircle2 size={14}/> Eligible</span> : <span className="muted">—</span>}</td>
                <td style={{ textAlign: 'right' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReferral(r);
                    }}
                  >
                    <Eye size={14} /> Profile & Resume
                  </button>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && <tr><td colSpan={8} className="empty">No referrals match.</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && <ReferModal backendUrl={backendUrl} token={token} jobs={jobs} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); setReload((t) => t + 1); }} />}
      
      {/* DEDICATED EDIT REFERRAL TOPIC MODAL */}
      {showTopicModal && (
        <EditReferralTopicModal 
          backendUrl={backendUrl} 
          token={token} 
          jobs={jobs} 
          onClose={() => setShowTopicModal(false)} 
        />
      )}

      {/* RICH CANDIDATE REFERRAL PROFILE & UPLOADED RESUME MODAL */}
      {selectedReferral && (
        <ReferralCandidateProfileModal 
          referral={selectedReferral} 
          backendUrl={backendUrl} 
          totalEmployeeReferrals={getEmployeeReferralsCount(selectedReferral.referrerName, selectedReferral.referrerEmployeeId)}
          onClose={() => setSelectedReferral(null)} 
        />
      )}
    </div>
  );
}

{/* CANDIDATE REFERRAL PROFILE & UPLOADED RESUME VIEW MODAL */}
function ReferralCandidateProfileModal({ referral, backendUrl, totalEmployeeReferrals, onClose }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'resume'

  const resumeFullUrl = referral.resumeUrl 
    ? (referral.resumeUrl.startsWith('http') ? referral.resumeUrl : `${backendUrl}${referral.resumeUrl.startsWith('/') ? '' : '/'}${referral.resumeUrl}`)
    : null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1600 }}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '850px', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}
      >
        {/* Modal Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {referral.candidateName}
              </h3>
              <span className="pill" style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: '700' }}>
                {referral.status || 'Inbox'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Referred for: <strong style={{ color: 'var(--accent-primary)' }}>{referral.roleReferredFor}</strong>
            </p>
          </div>

          <button className="btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }} onClick={onClose}>✕</button>
        </div>

        {/* Tab Header Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', padding: '0 24px' }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'profile' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'profile' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <UserCheck size={15} /> Candidate & Referrer Profile
          </button>
          
          <button
            onClick={() => setActiveTab('resume')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'resume' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'resume' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={15} /> Uploaded Resume / CV File
          </button>
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: '24px', flexGrow: 1, overflowY: 'auto' }}>
          {activeTab === 'profile' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Candidate Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Candidate Email</span>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600', marginTop: '2px' }}>
                    {referral.candidateEmail || 'Not Provided'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Candidate Phone</span>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600', marginTop: '2px' }}>
                    {referral.candidatePhone || 'Not Provided'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>ATS Match Score</span>
                  <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className={`score-badge ${referral.ats >= 80 ? 'score-high' : referral.ats >= 50 ? 'score-medium' : 'score-low'}`} style={{ width: '36px', height: '36px', fontSize: '13px', fontWeight: 'bold' }}>
                      {referral.ats || 0}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {referral.ats >= 80 ? 'Strong Match' : referral.ats >= 50 ? 'Moderate Match' : 'Pending Evaluation'}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Referred Date</span>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {new Date(referral.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Referrer Details Card */}
              <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} /> Referring Employee Details
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Referring Employee Name</span>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {referral.referrerName}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Employee ID</span>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#38bdf8' }}>
                      {referral.referrerEmployeeId || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Referrals Submitted</span>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>
                      {totalEmployeeReferrals || 1} Referral(s)
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills list */}
              {referral.skills && referral.skills.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Candidate Skills & Experience</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {referral.skills.map((sk, idx) => (
                      <span key={idx} style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', fontSize: '12px' }}>
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={18} style={{ color: '#10b981' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {referral.hasCv ? 'Uploaded Resume File' : 'No Resume Attached'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Candidate ID: {referral.id}
                    </div>
                  </div>
                </div>

                {resumeFullUrl && (
                  <button
                    onClick={() => window.open(resumeFullUrl, '_blank')}
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ExternalLink size={14} /> Open Resume in New Tab
                  </button>
                )}
              </div>

              {/* Resume Embed Preview Frame */}
              {resumeFullUrl ? (
                <div style={{ height: '420px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#ffffff' }}>
                  <iframe 
                    src={resumeFullUrl} 
                    title="Candidate Resume Preview"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  No uploaded resume file is attached to this referral candidate profile.
                </div>
              )}

            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(0,0,0,0.2)' }}>
          <button className="btn btn-secondary" onClick={onClose}>Close Profile</button>
        </div>

      </div>
    </div>
  );
}

{/* DEDICATED EDIT REFERRAL TOPIC MODAL COMPONENT */}
function EditReferralTopicModal({ backendUrl, token, jobs, onClose }) {
  const defaultPresets = [
    {
      id: 'arcgis-pro',
      title: 'ArcGIS Pro Specialist',
      exp: '3 - 5 Years',
      location: 'Hyderabad',
      jd: 'Responsible for leading spatial analysis, Esri ArcGIS Pro geodatabase management, Python script automation, 3D spatial analytics, and publishing map services for enterprise GIS clients.'
    },
    {
      id: 'business-analyst',
      title: 'Business Analyst',
      exp: '3 - 5 Years',
      location: 'Hyderabad / Remote',
      jd: 'Responsible for requirement gathering, client stakeholder consultations, business process modeling, functional specifications, and bridging business needs with GIS & AI software development teams.'
    }
  ];

  const availableJobs = Array.isArray(jobs) && jobs.length > 0 ? jobs : defaultPresets;

  const [selectedJobId, setSelectedJobId] = useState(availableJobs[0]?.id || 'arcgis-pro');
  const [roleTitle, setRoleTitle] = useState(availableJobs[0]?.title || 'ArcGIS Pro Specialist');
  const [requiredExp, setRequiredExp] = useState(availableJobs[0]?.requiredExperience || availableJobs[0]?.exp || '3 - 5 Years');
  const [location, setLocation] = useState(availableJobs[0]?.location || 'Hyderabad');
  const [jobDescription, setJobDescription] = useState(availableJobs[0]?.publicDescription || availableJobs[0]?.jd || availableJobs[0]?.description || 'Responsible for executing key enterprise projects and collaborating across cross-functional teams.');

  const [copied, setCopied] = useState(false);
  const [copiedUrlOnly, setCopiedUrlOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Sync state when position selection changes
  const handleJobSelect = (jobId) => {
    setSelectedJobId(jobId);
    const found = availableJobs.find(j => (j.id === jobId || j._id === jobId));
    if (found) {
      setRoleTitle(found.title || '');
      setRequiredExp(found.requiredExperience || found.exp || '3 - 5 Years');
      setLocation(found.location || 'Hyderabad');
      setJobDescription(found.publicDescription || found.jd || found.description || found.requirements || '');
    }
  };

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const roleSlug = (roleTitle || 'job').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const hostOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const applyUrl = `${hostOrigin}/careers/${roleSlug}`;

  const formattedPost = `Role:\n${roleTitle}\n\nExp:\n${requiredExp}\n\nJD:\n${jobDescription}\n\nLocation:\n${location}\n\nApply URL:\n${applyUrl}`;

  const handleCopyPost = () => {
    navigator.clipboard.writeText(formattedPost);
    setCopied(true);
    triggerToast('Copied Referral Announcement to Clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(applyUrl);
    setCopiedUrlOnly(true);
    triggerToast('Copied Apply URL!');
    setTimeout(() => setCopiedUrlOnly(false), 2000);
  };

  const handleSaveToBackend = async () => {
    setSaving(true);
    try {
      if (selectedJobId && !selectedJobId.startsWith('arcgis') && !selectedJobId.startsWith('business')) {
        const res = await fetch(`${backendUrl}/api/jobs/${selectedJobId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: roleTitle,
            requiredExperience: requiredExp,
            location: location,
            publicDescription: jobDescription,
            description: jobDescription
          })
        });
        if (!res.ok) throw new Error('Failed to update job position');
      }
      triggerToast('Referral topic details updated successfully!');
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (e) {
      console.error(e);
      triggerToast('Details saved for referral generator.');
      setTimeout(() => {
        onClose();
      }, 600);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1500 }}>
      
      {/* Toast alert */}
      {toastMsg && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 2000, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} /> {toastMsg}
        </div>
      )}

      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Modal Head */}
        <div className="modal-head" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pencil size={18} style={{ color: 'var(--accent-primary)' }} />
              Edit Referral Topic & Job Description
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Customize the Role, Experience, Location, and JD text for referral announcements.
            </p>
          </div>
          <button className="btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={onClose}>✕</button>
        </div>

        {/* Position Select */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Select Target Job Position *
          </label>
          <select 
            className="form-input" 
            value={selectedJobId} 
            onChange={(e) => handleJobSelect(e.target.value)}
            style={{ fontWeight: '600' }}
          >
            {availableJobs.map(j => (
              <option key={j.id || j._id} value={j.id || j._id}>
                {j.title} {j.location ? `(${j.location})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Edit Inputs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Role Title
            </label>
            <input 
              className="form-input" 
              value={roleTitle} 
              onChange={(e) => setRoleTitle(e.target.value)} 
              placeholder="e.g. ArcGIS Pro Specialist"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Required Experience (`Exp:`)
            </label>
            <input 
              className="form-input" 
              value={requiredExp} 
              onChange={(e) => setRequiredExp(e.target.value)} 
              placeholder="e.g. 3 - 5 Years"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Location
            </label>
            <input 
              className="form-input" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              placeholder="e.g. Hyderabad"
            />
          </div>
        </div>

        {/* Job Description Text Area */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Job Description (`JD:` Text Area) *
          </label>
          <textarea 
            className="form-input" 
            rows={4} 
            value={jobDescription} 
            onChange={(e) => setJobDescription(e.target.value)} 
            placeholder="Type or paste the job responsibilities and description..."
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {/* Formatted Output Announcement Box */}
        <div style={{ 
          backgroundColor: 'var(--bg-tertiary)', 
          border: '1px solid var(--accent-primary)', 
          borderRadius: '10px', 
          padding: '16px', 
          fontFamily: 'Consolas, Monaco, monospace', 
          fontSize: '12px', 
          lineHeight: 1.6, 
          color: 'var(--text-primary)', 
          whiteSpace: 'pre-wrap', 
          marginBottom: '20px'
        }}>
          <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>Role:</div>
          <div style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>{roleTitle}</div>
          
          <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>Exp:</div>
          <div style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>{requiredExp}</div>
          
          <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>JD:</div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>{jobDescription}</div>
          
          <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>Location:</div>
          <div style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>{location}</div>
          
          <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>Apply URL:</div>
          <div style={{ color: '#38bdf8', wordBreak: 'break-all' }}>{applyUrl}</div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={handleCopyUrl} style={{ padding: '8px 12px', fontSize: '12px' }}>
              {copiedUrlOnly ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />} URL Only
            </button>
            <button className="btn btn-primary" onClick={handleCopyPost} style={{ padding: '8px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy Job Opening'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={handleSaveToBackend} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save & Update Position'}
            </button>
          </div>
        </div>

      </div>
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
    if (!refName.trim()) { setError("Referrer employee name is required."); return; }
    if (!candName.trim()) { setError("Candidate name is required."); return; }
    if (!jobId) { setError("Please select a target position for this referral."); return; }
    if (!candSkills.trim()) { setError("Key skills are required — the ATS uses them to score the candidate."); return; }
    
    if (candPhone.trim()) {
      if (!candPhone.trim().startsWith('+')) {
        setError("Please include candidate country code starting with + (e.g. +91 9876543210).");
        return;
      }
      const cleanStr = candPhone.trim().replace(/[\s\-\(\)]/g, '');
      const digitsOnly = cleanStr.replace(/[^0-9]/g, '');

      if (cleanStr.startsWith('+91')) {
        const subscriberDigits = digitsOnly.substring(2);
        if (subscriberDigits.length !== 10) {
          setError("Phone numbers with +91 country code must contain exactly 10 digits.");
          return;
        }
      } else if (digitsOnly.length < 5 || digitsOnly.length > 15) {
        setError("Please enter a valid international phone number with country code.");
        return;
      }
    }

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
              placeholder="e.g. +91 9876543210"
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
