import React, { useState, useEffect } from 'react';
import { Search, Download, Eye, FileSpreadsheet, Sparkles, Filter, Trash2, Calendar, GitCompare, Loader, FileText, SlidersHorizontal, X, Check } from 'lucide-react';
import { exportToCSV, exportToExcel, prepareCandidateExportData } from '../utils/export';
import { getCandidateLocation, getCandidateExperience, getCandidateNoticePeriod } from '../utils/candidateHelpers';

const NOTICE_PERIODS = ["Immediate", "15 days", "30 days", "45 days", "60 days", "90 days", "More than 90 days"];
const STAGES = ["Inbox", "Shortlist", "Interview", "Offered", "Rejected"];

const ALL_COLUMNS = [
  { id: 'name', label: 'Name & Email', defaultVisible: true, required: true },
  { id: 'jobRole', label: 'Job Role', defaultVisible: true },
  { id: 'location', label: 'Location', defaultVisible: true },
  { id: 'experience', label: 'Total Experience', defaultVisible: true },
  { id: 'noticePeriod', label: 'Notice Period', defaultVisible: true },
  { id: 'matchScore', label: 'ATS Match Score', defaultVisible: true },
  { id: 'stage', label: 'Stage', defaultVisible: true },
  { id: 'appliedDate', label: 'Applied Date', defaultVisible: true },
  { id: 'skills', label: 'Key Skills', defaultVisible: false },
  { id: 'phone', label: 'Phone', defaultVisible: false },
  { id: 'actions', label: 'Actions', defaultVisible: true, required: true }
];

export default function Applicants({ 
  candidates, 
  jobs, 
  onStageChanged, 
  onSelectCandidate, 
  onOpenOfferModal,
  onCompare, 
  selectedJobFilter = '',
  setSelectedJobFilter,
  backendUrl, 
  token 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobId, setSelectedJobId] = useState(selectedJobFilter || '');

  useEffect(() => {
    if (selectedJobFilter !== undefined && selectedJobFilter !== null) {
      setSelectedJobId(selectedJobFilter);
    }
  }, [selectedJobFilter]);
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

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('applicants_visible_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return ['name', 'jobRole', 'location', 'experience', 'noticePeriod', 'matchScore', 'stage', 'appliedDate', 'actions'];
  });

  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);

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
      const loc = getCandidateLocation(c).toLowerCase();
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
    if (noticeFilter && getCandidateNoticePeriod(c).toLowerCase() !== noticeFilter.toLowerCase()) return false;

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
    const rawDataToExport = selectedCandidates.length > 0 
      ? candidates.filter(c => selectedCandidates.includes(c.id))
      : sortedCandidates;

    if (rawDataToExport.length === 0) {
      alert("No candidates to export.");
      return;
    }

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

    const { data: cleanedData, headers: finalHeaders } = prepareCandidateExportData(rawDataToExport, baseHeaders);
    const fileName = `applicants_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(cleanedData, fileName, finalHeaders);
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
    <div style={{ padding: '0px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <header style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>View, search, filter, and bulk action all applicants in one place.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setShowColumnCustomizer(!showColumnCustomizer)}>
            <SlidersHorizontal size={14} /> Customize Columns
          </button>

          <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }} onClick={handleExport}>
            <FileSpreadsheet size={14} /> Export to Excel (.xls)
          </button>

          {/* Column Customizer Popover Modal */}
          {showColumnCustomizer && (
            <div 
              className="glass" 
              style={{ 
                position: 'absolute', 
                top: '42px', 
                right: '0', 
                zIndex: 100, 
                padding: '16px 20px', 
                borderRadius: 'var(--radius-md)', 
                width: '260px', 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--glass-border)', 
                boxShadow: '0 15px 30px rgba(0, 0, 0, 0.5)' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                  <SlidersHorizontal size={14} style={{ color: 'var(--accent-primary)' }} /> Select Columns
                </h4>
                <button 
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                  onClick={() => setShowColumnCustomizer(false)}
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                {ALL_COLUMNS.map(col => (
                  <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: col.required ? 'not-allowed' : 'pointer', opacity: col.required ? 0.7 : 1, color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.id)}
                      disabled={col.required}
                      onChange={(e) => {
                        let updated;
                        if (e.target.checked) {
                          updated = [...visibleColumns, col.id];
                        } else {
                          updated = visibleColumns.filter(id => id !== col.id);
                        }
                        setVisibleColumns(updated);
                        localStorage.setItem('applicants_visible_columns', JSON.stringify(updated));
                      }}
                    />
                    <span>{col.label} {col.required && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Required)</span>}</span>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: '14px', borderTop: '1px solid var(--glass-border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => {
                    const defaults = ['name', 'jobRole', 'location', 'experience', 'noticePeriod', 'matchScore', 'stage', 'appliedDate', 'actions'];
                    setVisibleColumns(defaults);
                    localStorage.setItem('applicants_visible_columns', JSON.stringify(defaults));
                  }}
                >
                  Reset Defaults
                </button>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '11px', padding: '4px 12px' }}
                  onClick={() => setShowColumnCustomizer(false)}
                >
                  Done
                </button>
              </div>
            </div>
          )}
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
              {visibleColumns.includes('name') && (
                <th style={{ padding: '16px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleSort('name')}>
                  Name {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
              )}
              {visibleColumns.includes('jobRole') && (
                <th style={{ padding: '16px', fontWeight: 'bold' }}>Job Role</th>
              )}
              {visibleColumns.includes('location') && (
                <th style={{ padding: '16px', fontWeight: 'bold' }}>Location</th>
              )}
              {visibleColumns.includes('experience') && (
                <th style={{ padding: '16px', fontWeight: 'bold' }}>Total Experience</th>
              )}
              {visibleColumns.includes('noticePeriod') && (
                <th style={{ padding: '16px', fontWeight: 'bold' }}>Notice Period</th>
              )}
              {visibleColumns.includes('matchScore') && (
                <th style={{ padding: '16px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleSort('matchScore')}>
                  ATS Match Score {sortBy === 'matchScore' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
              )}
              {visibleColumns.includes('stage') && (
                <th style={{ padding: '16px', fontWeight: 'bold' }}>Stage</th>
              )}
              {visibleColumns.includes('appliedDate') && (
                <th style={{ padding: '16px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleSort('createdAt')}>
                  Applied Date {sortBy === 'createdAt' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
              )}
              {visibleColumns.includes('skills') && (
                <th style={{ padding: '16px', fontWeight: 'bold' }}>Key Skills</th>
              )}
              {visibleColumns.includes('phone') && (
                <th style={{ padding: '16px', fontWeight: 'bold' }}>Phone</th>
              )}
              {visibleColumns.includes('actions') && (
                <th style={{ padding: '16px', fontWeight: 'bold', textAlign: 'center' }}>Actions</th>
              )}
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
                const isGeneralRole = !c.jobId || !job;
                const useJobMatch = !isGeneralRole || !!c.jdQuestions;
                
                const score = useJobMatch 
                  ? (c.matchScore || 0)
                  : (c.ownCategoryScore > 0 
                      ? c.ownCategoryScore 
                      : (c.matchScore || 0));
                
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

                    {visibleColumns.includes('name') && (
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
                    )}

                    {visibleColumns.includes('jobRole') && (
                      <td style={{ padding: '16px' }}>
                        <span className="tag-badge" style={{ fontSize: '12px', padding: '4px 10px', background: 'rgba(99, 102, 241, 0.08)', color: 'var(--accent-primary)', border: '1px solid rgba(99, 102, 241, 0.2)', fontWeight: '500' }}>
                          {job ? job.title : 'General Role'}
                        </span>
                      </td>
                    )}

                    {visibleColumns.includes('location') && (
                      <td style={{ padding: '16px' }}>{getCandidateLocation(c)}</td>
                    )}

                    {visibleColumns.includes('experience') && (
                      <td style={{ padding: '16px' }}>{getCandidateExperience(c)}</td>
                    )}

                    {visibleColumns.includes('noticePeriod') && (
                      <td style={{ padding: '16px' }}>{getCandidateNoticePeriod(c)}</td>
                    )}

                    {visibleColumns.includes('matchScore') && (
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
                    )}

                    {visibleColumns.includes('stage') && (
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
                    )}

                    {visibleColumns.includes('appliedDate') && (
                      <td style={{ padding: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                      </td>
                    )}

                    {visibleColumns.includes('skills') && (
                      <td style={{ padding: '16px', maxWidth: '200px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(c.skills || []).slice(0, 3).map((s, i) => (
                            <span key={i} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>{s}</span>
                          ))}
                          {(c.skills || []).length > 3 && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+{(c.skills || []).length - 3}</span>}
                        </div>
                      </td>
                    )}

                    {visibleColumns.includes('phone') && (
                      <td style={{ padding: '16px', fontSize: '12px' }}>{c.phone || '—'}</td>
                    )}

                    {visibleColumns.includes('actions') && (
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
                          {onOpenOfferModal && (
                            <button 
                              onClick={() => onOpenOfferModal(c)} 
                              className="btn btn-secondary" 
                              style={{ padding: '6px', borderRadius: '4px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                              title="Generate & Send Offer Letter"
                            >
                              <FileText size={14} />
                            </button>
                          )}
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
                    )}
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
