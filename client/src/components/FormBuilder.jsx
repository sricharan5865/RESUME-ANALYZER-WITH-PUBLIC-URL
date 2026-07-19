import React, { useState, useEffect } from 'react';

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
  const [selectedJobId, setSelectedJobId] = useState('');
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      const job = jobs.find(j => j.id === selectedJobId);
      if (job) {
        if (job.customFields && job.customFields.length > 0) {
          setFields(job.customFields);
        } else {
          setFields([...STANDARD_FIELDS]);
        }
      }
    } else {
      setFields([]);
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

  function move(i, dir) {
    const next = [...fields];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setFields(next);
  }

  async function handleSave() {
    if (!selectedJobId) return;
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const job = jobs.find(j => j.id === selectedJobId);
      const res = await fetch(`${backendUrl}/api/jobs/${selectedJobId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          title: job.title,
          description: job.description,
          customFields: fields
        })
      });
      if (res.ok) {
        setMessage('Form saved successfully!');
        fetchJobs(); // refresh
      } else {
        setMessage('Failed to save form.');
      }
    } catch (err) {
      setMessage('Error saving form.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '0px', maxWidth: '800px' }}>
      <header style={{ marginBottom: '12px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Design custom application forms for specific job roles.</p>
      </header>
      
      <div className="glass" style={{ padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Select Job to Edit Form</label>
          <select 
            value={selectedJobId} 
            onChange={e => setSelectedJobId(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            <option value="">-- Select a Job --</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedJobId && (
        <div className="glass" style={{ padding: '24px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Application Fields</h3>
            <button onClick={addField} style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
              + Add Field
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {fields.map((f, i) => (
              <div key={f.id || i} style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>▲</button>
                  <button onClick={() => move(i, 1)} disabled={i === fields.length - 1} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>▼</button>
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
            {message && <span style={{ color: message.includes('Error') || message.includes('Failed') ? '#ef4444' : '#10b981' }}>{message}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
