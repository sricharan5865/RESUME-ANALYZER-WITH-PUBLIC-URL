import React, { useState, useEffect } from 'react';
import { Search, Download, Eye, FileSpreadsheet, Sparkles, Filter, Trash2, Calendar, GitCompare, Loader } from 'lucide-react';
import { exportToCSV } from '../utils/export';

const NOTICE_PERIODS = ["Immediate", "15 days", "30 days", "45 days", "60 days", "90 days", "More than 90 days"];
const STAGES = ["Inbox", "Shortlist", "Interview", "Offered", "Rejected"];

export default function Applicants({ 
  candidates, 
  jobs, 
  onStageChanged, 
  onSelectCandidate, 
  onCompare, 
  backendUrl, 
  token 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [noticeFilter, setNoticeFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [updatingBulk, setUpdatingBulk] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  // Filter candidates
  const filteredCandidates = candidates.filter(c => {
    // 1. Search (name, email, phone, id)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const nameMatch = (c.name || '').toLowerCase().includes(term);
      const emailMatch = (c.email || '').toLowerCase().includes(term);
      const phoneMatch = (c.phone || '').toLowerCase().includes(term);
      const idMatch = (c.id || '').toLowerCase().includes(term);
      if (!nameMatch && !emailMatch && !phoneMatch && !idMatch) return false;
    }

    // 2. Job Role / Position
    if (selectedJobId && c.jobId !== selectedJobId) return false;

    // 3. Location
    if (locationFilter) {
      const loc = (c.extractedData?.currentLocation || '').toLowerCase();
      if (!loc.includes(locationFilter.toLowerCase())) return false;
    }

    // 4. Skills
    if (skillsFilter) {
      const candSkills = (c.skills || []).map(s => s.toLowerCase());
      const querySkills = skillsFilter.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const match = querySkills.every(qs => candSkills.some(cs => cs.includes(qs)));
      if (!match) return false;
    }

    // 5. Notice Period
    if (noticeFilter && c.extractedData?.noticePeriod !== noticeFilter) return false;

    // 6. Stage / Status
    if (stageFilter && c.stage?.toLowerCase() !== stageFilter.toLowerCase()) return false;

    // 7. Min Score
    if (minScore) {
      const score = c.matchScore || 0;
      if (score < parseInt(minScore)) return false;
    }

    // 8. Applied Date Range
    if (fromDate || toDate) {
      if (!c.createdAt) return false;
      const created = new Date(c.createdAt);
      if (fromDate && created < new Date(fromDate)) return false;
      if (toDate) {
        const toLimit = new Date(toDate);
        toLimit.setHours(23, 59, 59, 999);
        if (created > toLimit) return false;
      }
    }

    return true;
  });

  // Sort candidates
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (sortBy === 'createdAt') {
      valA = new Date(a.createdAt || 0);
      valB = new Date(b.createdAt || 0);
    } else if (sortBy === 'matchScore') {
      valA = a.matchScore || 0;
      valB = b.matchScore || 0;
    } else if (sortBy === 'name') {
      valA = (a.name || '').toLowerCase();
      valB = (b.name || '').toLowerCase();
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedCandidates.length === sortedCandidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(sortedCandidates.map(c => c.id));
    }
  };

  const handleToggleSelectCandidate = (id) => {
    if (selectedCandidates.includes(id)) {
      setSelectedCandidates(selectedCandidates.filter(item => item !== id));
    } else {
      setSelectedCandidates([...selectedCandidates, id]);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedCandidates.length === 0) return;
    if (!window.confirm(`Change stage of ${selectedCandidates.length} candidate(s) to "${bulkStatus}"?`)) return;

    setUpdatingBulk(true);
    try {
      for (const id of selectedCandidates) {
        // Update local state in App
        onStageChanged(id, bulkStatus);
        
        // Update backend
        await fetch(`${backendUrl}/api/candidates/${id}/stage`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ stage: bulkStatus })
        });
      }
      setSelectedCandidates([]);
      setBulkStatus('');
    } catch (err) {
      console.error('Error updating bulk status', err);
      alert('Error updating status for some candidates');
    } finally {
      setUpdatingBulk(false);
    }
  };

  const handleExport = () => {
    const dataToExport = selectedCandidates.length > 0 
      ? candidates.filter(c => selectedCandidates.includes(c.id))
      : sortedCandidates;

    if (dataToExport.length === 0) {
      alert("No candidates to export.");
      return;
    }

    const headers = {
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

    exportToCSV(dataToExport, `applicants_${new Date().toISOString().slice(0, 10)}`, headers);
  };

  const handleCompare = () => {
    if (selectedCandidates.length < 1 || selectedCandidates.length > 4) {
      alert("Please select between 1 and 4 candidates to compare.");
      return;
    }
    onCompare(selectedCandidates);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedJobId('');
    setLocationFilter('');
    setSkillsFilter('');
    setNoticeFilter('');
    setStageFilter('');
    setMinScore('');
    setFromDate('');
    setToDate('');
  };

  const hasActiveFilters = searchTerm || selectedJobId || locationFilter || skillsFilter || noticeFilter || stageFilter || minScore || fromDate || toDate;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Applicants Database</h2>
          <p style={{ color: 'var(--text-secondary)' }}>View, search, filter, and bulk action all applicants in one place.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleExport}>
            <FileSpreadsheet size={16} /> Export to CSV
          </button>
        </div>
      </header>

      {/* Bulk actions bar */}
      {selectedCandidates.length > 0 && (
        <div style={{ background: 'var(--primary)', color: 'white', padding: '12px 24px', borderRadius: '8px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontWeight: '500' }}>
            {selectedCandidates.length} candidate(s) selected
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select 
              value={bulkStatus} 
              onChange={e => setBulkStatus(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '4px', background: 'white', color: '#1f2937', border: 'none', fontSize: '13px', outline: 'none' }}
              disabled={updatingBulk}
            >
              <option value="">Move to Stage...</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button 
              className="btn" 
              onClick={handleBulkStatusUpdate}
              disabled={!bulkStatus || updatingBulk}
              style={{ background: 'white', color: 'var(--primary)', border: 'none', padding: '6px 14px', borderRadius: '4px', fontWeight: 'bold' }}
            >
              {updatingBulk ? 'Applying...' : 'Apply'}
            </button>
            <button 
              className="btn" 
              onClick={handleCompare}
              disabled={selectedCandidates.length > 4}
              style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '6px 14px', borderRadius: '4px' }}
            >
              <GitCompare size={14} /> Compare ({selectedCandidates.length})
            </button>
            <button 
              onClick={() => setSelectedCandidates([])}
              style={{ background: 'transparent', border: 'none', color: 'white', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Filters panel */}
      <div className="glass" style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Search Query</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Name, email, phone..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px', height: '36px' }}
              />
            </div>
          </div>
          
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Job Position</label>
            <select 
              value={selectedJobId} 
              onChange={e => setSelectedJobId(e.target.value)}
              className="form-input"
              style={{ height: '36px' }}
            >
              <option value="">All positions</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Location</label>
            <input 
              type="text" 
              placeholder="e.g. Hyderabad" 
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              className="form-input"
              style={{ height: '36px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Skills (comma separated)</label>
            <input 
              type="text" 
              placeholder="e.g. Python, SQL" 
              value={skillsFilter}
              onChange={e => setSkillsFilter(e.target.value)}
              className="form-input"
              style={{ height: '36px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Notice Period</label>
            <select 
              value={noticeFilter} 
              onChange={e => setNoticeFilter(e.target.value)}
              className="form-input"
              style={{ height: '36px' }}
            >
              <option value="">Any notice period</option>
              {NOTICE_PERIODS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Pipeline Stage</label>
            <select 
              value={stageFilter} 
              onChange={e => setStageFilter(e.target.value)}
              className="form-input"
              style={{ height: '36px' }}
            >
              <option value="">All stages</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Min ATS Score</label>
            <input 
              type="number" 
              placeholder="e.g. 70" 
              value={minScore}
              onChange={e => setMinScore(e.target.value)}
              className="form-input"
              style={{ height: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>From</label>
              <input 
                type="date" 
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="form-input"
                style={{ height: '36px', padding: '6px 8px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>To</label>
              <input 
                type="date" 
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="form-input"
                style={{ height: '36px', padding: '6px 8px' }}
              />
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Candidates table */}
      <div className="glass" style={{ flexGrow: 1, overflowX: 'auto', overflowY: 'auto', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1, borderBottom: '1px solid var(--glass-border)' }}>
            <tr>
              <th style={{ padding: '16px', width: '48px' }}>
                <input 
                  type="checkbox" 
                  checked={sortedCandidates.length > 0 && selectedCandidates.length === sortedCandidates.length}
                  onChange={handleToggleSelectAll}
                />
              </th>
              <th style={{ padding: '16px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleSort('name')}>
                Name {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
              </th>
              <th style={{ padding: '16px', fontWeight: 'bold' }}>Job Role</th>
              <th style={{ padding: '16px', fontWeight: 'bold' }}>Location</th>
              <th style={{ padding: '16px', fontWeight: 'bold' }}>Total Experience</th>
              <th style={{ padding: '16px', fontWeight: 'bold' }}>Notice Period</th>
              <th style={{ padding: '16px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleSort('matchScore')}>
                ATS Match Score {sortBy === 'matchScore' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
              </th>
              <th style={{ padding: '16px', fontWeight: 'bold' }}>Stage</th>
              <th style={{ padding: '16px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleSort('createdAt')}>
                Applied Date {sortBy === 'createdAt' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
              </th>
              <th style={{ padding: '16px', fontWeight: 'bold', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedCandidates.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No candidates found matching the active filters.
                </td>
              </tr>
            ) : (
              sortedCandidates.map((c) => {
                const job = jobs.find(j => j.id === c.jobId);
                const isSelected = selectedCandidates.includes(c.id);
                const score = c.matchScore || 0;
                const scoreColorClass = score >= 80 ? 'score-high' : score >= 50 ? 'score-medium' : 'score-low';

                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--glass-border)', background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '16px' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleToggleSelectCandidate(c.id)}
                      />
                    </td>
                    <td style={{ padding: '16px', fontWeight: '600' }}>
                      <span 
                        onClick={() => onSelectCandidate(c)}
                        style={{ cursor: 'pointer', color: 'var(--accent-primary)', textDecoration: 'underline' }}
                        title="Click to view candidate details"
                      >
                        {c.name}
                      </span>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '2px' }}>{c.email}</div>
                    </td>
                    <td style={{ padding: '16px' }}>{job ? job.title : 'General'}</td>
                    <td style={{ padding: '16px' }}>{c.isProcessing ? <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>Processing...</span> : (c.extractedData?.currentLocation || '—')}</td>
                    <td style={{ padding: '16px' }}>{c.isProcessing ? <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>Processing...</span> : (c.extractedData?.totalYearsExperience != null ? `${c.extractedData.totalYearsExperience} yrs` : '—')}</td>
                    <td style={{ padding: '16px' }}>{c.isProcessing ? <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>Processing...</span> : (c.extractedData?.noticePeriod || '—')}</td>
                    <td style={{ padding: '16px' }}>
                      {c.isProcessing ? (
                        <span className="score-badge" style={{ width: '28px', height: '28px', fontSize: '11px', display: 'inline-flex', background: 'transparent', border: '1px dashed var(--glass-border)', color: 'var(--text-muted)' }} title="AI parsing in progress...">
                          <Loader size={12} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                        </span>
                      ) : (
                        <span className={`score-badge ${scoreColorClass}`} style={{ width: '28px', height: '28px', fontSize: '11px', display: 'inline-flex' }}>
                          {score}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '500',
                        background: c.stage === 'Offered' ? 'rgba(16, 185, 129, 0.1)' : c.stage === 'Rejected' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255,255,255,0.05)',
                        color: c.stage === 'Offered' ? 'var(--status-offered)' : c.stage === 'Rejected' ? 'var(--status-rejected)' : 'var(--text-primary)'
                      }}>
                        {c.stage}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => onSelectCandidate(c)} 
                          className="btn btn-secondary" 
                          style={{ padding: '6px', borderRadius: '4px' }}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {c.resumeUrl && (
                          <a 
                            href={`${backendUrl}${c.resumeUrl}`} 
                            download 
                            className="btn btn-secondary" 
                            style={{ padding: '6px', borderRadius: '4px', display: 'inline-flex' }}
                            title="Download CV"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
