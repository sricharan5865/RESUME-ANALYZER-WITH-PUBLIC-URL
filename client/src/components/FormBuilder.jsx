import React, { useState, useEffect, useRef } from 'react';

const STANDARD_FIELDS = [
  { id: 'fn', fieldType: 'ShortText', label: 'First Name', isRequired: true },
  { id: 'ln', fieldType: 'ShortText', label: 'Last Name', isRequired: true },
  { id: 'em', fieldType: 'Email', label: 'Email', isRequired: true },
  { id: 'ph', fieldType: 'Phone', label: 'Phone Number', isRequired: true },
  { id: 'cl', fieldType: 'ShortText', label: 'Current Location', isRequired: false },
  { id: 'ex', fieldType: 'Number', label: 'Total Years of Experience', isRequired: true },
  { id: 'np', fieldType: 'Dropdown', label: 'Notice Period', isRequired: false, options: 'Immediate, 15 days, 30 days, 45 days, 60 days, 90 days, More than 90 days' },
  { id: 'jd', fieldType: 'Date', label: 'Earliest Joining Date', isRequired: false },
  { id: 'eq', fieldType: 'ShortText', label: 'Education Qualification', isRequired: false },
  { id: 'ks', fieldType: 'LongText', label: 'Key Skills', isRequired: true },
  { id: 'li', fieldType: 'Url', label: 'LinkedIn Profile', isRequired: false },
  { id: 'cv', fieldType: 'CvUpload', label: 'Upload CV', isRequired: true }
];

const FIELD_TYPES = [
  "ShortText", "LongText", "Number", "Email", "Phone", "Date",
  "Dropdown", "MultiSelect", "Radio", "Checkbox", "Url", "CvUpload"
];

export default function FormBuilder() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('all');
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJobId === 'all') {
      // Find if any existing job has custom fields, or default to STANDARD_FIELDS
      const jobWithCustom = jobs.find(j => j.customFields && j.customFields.length > 0);
      if (jobWithCustom) {
        setFields(jobWithCustom.customFields);
      } else {
        setFields([...STANDARD_FIELDS]);
      }
    } else if (selectedJobId) {
      const job = jobs.find(j => j.id === selectedJobId);
      if (job && job.customFields && job.customFields.length > 0) {
        setFields(job.customFields);
      } else {
        setFields([...STANDARD_FIELDS]);
      }
    } else {
      setFields([...STANDARD_FIELDS]);
    }
  }, [selectedJobId, jobs]);

  async function fetchJobs() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/api/jobs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    }
  }

  function updateField(i, patch) {
    const next = [...fields];
    next[i] = { ...next[i], ...patch };
    setFields(next);
  }

  function addField() {
    setFields([...fields, { id: `cf_${Date.now()}`, fieldType: 'ShortText', label: 'New Field', isRequired: false }]);
  }

  function removeField(i) {
    setFields(fields.filter((_, idx) => idx !== i));
  }

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const _fields = [...fields];
    const draggedItemContent = _fields.splice(dragItem.current, 1)[0];
    _fields.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setDragOverIndex(null);
    setFields(_fields);
  };

  const handleDrag = (e) => {
    if (e.clientY === 0) return;
    const buffer = 100;
    const speed = 15;
    const scrollContainer = document.querySelector('.content-pane') || document.documentElement;
    if (!scrollContainer) return;
    
    const rect = scrollContainer.getBoundingClientRect ? scrollContainer.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    
    if (e.clientY - rect.top < buffer) {
      scrollContainer.scrollBy ? scrollContainer.scrollBy(0, -speed) : window.scrollBy(0, -speed);
    } else if (rect.bottom - e.clientY < buffer) {
      scrollContainer.scrollBy ? scrollContainer.scrollBy(0, speed) : window.scrollBy(0, speed);
    }
  };

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      let targetUrl = `${backendUrl}/api/jobs/all`;
      let payload = { customFields: fields };

      if (selectedJobId && selectedJobId !== 'all') {
        const job = jobs.find(j => j.id === selectedJobId);
        targetUrl = `${backendUrl}/api/jobs/${selectedJobId}`;
        payload = {
          title: job?.title,
          description: job?.description,
          customFields: fields
        };
      }

      const res = await fetch(targetUrl, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setMessage(selectedJobId === 'all' 
          ? 'Default application form saved for ALL jobs successfully!' 
          : 'Custom application form saved for this position successfully!');
        fetchJobs();
      } else {
        setMessage('Failed to save form.');
      }
    } catch (err) {
      setMessage('Error saving form.');
    } finally {
      setSaving(false);
    }
  }

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div style={{ padding: '0px', maxWidth: '800px' }}>
      <header style={{ marginBottom: '12px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Design global or position-specific job application forms.</p>
      </header>
      
      <div className="glass" style={{ padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
            Application Form Target
          </label>
          <select 
            value={selectedJobId} 
            onChange={e => setSelectedJobId(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}
          >
            <option value="all">⚡ Form for All Jobs (Default Application Form)</option>
            {jobs.length > 0 && <option disabled>──────────────────────────────</option>}
            {jobs.map(j => (
              <option key={j.id} value={j.id}>📌 Customize Form for: {j.title}</option>
            ))}
          </select>
        </div>

        {selectedJobId === 'all' ? (
          <div style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>ℹ️</span> Editing default application form. Changes will apply across <strong>all job positions</strong>.
          </div>
        ) : (
          <div style={{ background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', color: '#fde047', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>🎯 Customizing application form specifically for: <strong>{selectedJob?.title}</strong></span>
            <button 
              onClick={() => setSelectedJobId('all')} 
              style={{ background: 'transparent', border: 'none', color: '#fde047', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
            >
              Switch to All Jobs Form
            </button>
          </div>
        )}
      </div>

      <div className="glass" style={{ padding: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Application Fields</h3>
            <button onClick={addField} style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
              + Add Field
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {fields.map((f, i) => (
              <div 
                key={f.id || i} 
                draggable
                onDrag={handleDrag}
                onDragStart={(e) => {
                  dragItem.current = i;
                }}
                onDragEnter={(e) => {
                  dragOverItem.current = i;
                  setDragOverIndex(i);
                }}
                onDragEnd={handleSort}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => {
                  if (dragOverIndex === i) {
                    setDragOverIndex(null);
                  }
                }}
                style={{ 
                  padding: '16px', 
                  background: 'var(--bg-card)', 
                  borderRadius: '8px', 
                  border: dragOverIndex === i ? '2px dashed var(--primary)' : '1px solid var(--border-color)', 
                  display: 'flex', 
                  gap: '16px', 
                  alignItems: 'flex-start',
                  cursor: 'grab',
                  opacity: dragOverIndex === i ? 0.7 : 1,
                  transform: dragOverIndex === i ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', cursor: 'grab', padding: '4px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                </div>
                
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Label</label>
                    <input 
                      value={f.label} 
                      onChange={e => updateField(i, { label: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Type</label>
                    <select 
                      value={f.fieldType} 
                      onChange={e => updateField(i, { fieldType: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                    >
                      {FIELD_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  {(f.fieldType === 'Dropdown' || f.fieldType === 'MultiSelect' || f.fieldType === 'Radio') && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Options (comma separated)</label>
                      <input 
                        value={f.options || ''} 
                        onChange={e => updateField(i, { options: e.target.value })}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  )}
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <input 
                        type="checkbox" 
                        checked={f.isRequired} 
                        onChange={e => updateField(i, { isRequired: e.target.checked })}
                      /> Required
                    </label>
                    <button onClick={() => removeField(i)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={handleSave} 
              disabled={saving}
              style={{ padding: '10px 24px', background: 'var(--primary)', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {saving ? 'Saving...' : 'Save Form Configuration'}
            </button>
          </div>
        </div>
    </div>
  );
}
