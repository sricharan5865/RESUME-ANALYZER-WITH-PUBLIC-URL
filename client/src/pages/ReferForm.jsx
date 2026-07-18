import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Paperclip, CheckCircle2 } from 'lucide-react';

export default function ReferForm({ backendUrl }) {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [formData, setFormData] = useState({
    referrerName: '',
    referrerEmployeeId: '',
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    keySkills: '',
    jobId: ''
  });
  const [cvFile, setCvFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successTrackingId, setSuccessTrackingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetch(`${backendUrl}/api/public/jobs`)
      .then(r => r.json())
      .then(data => setJobs(data))
      .catch(err => console.error('Failed to fetch jobs', err));
  }, [backendUrl]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setCvFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      let cvFileRef = '';
      if (cvFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', cvFile);
        const uploadRes = await fetch(`${backendUrl}/api/public/cv`, { method: 'POST', body: formDataUpload });
        if (!uploadRes.ok) throw new Error('Failed to upload CV');
        const uploadData = await uploadRes.json();
        cvFileRef = uploadData.fileRef;
      }

      const submitRes = await fetch(`${backendUrl}/api/public/refer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, cvFileRef })
      });

      if (!submitRes.ok) throw new Error('Failed to submit referral');
      const submitData = await submitRes.json();
      
      setSuccessTrackingId(submitData.trackingId);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (successTrackingId) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', padding: '40px', background: 'var(--bg-secondary)', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--glass-border)' }}>
        <CheckCircle2 size={64} style={{ color: '#10b981', margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>Referral Submitted!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Thank you for referring {formData.candidateName}.
        </p>
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px dashed #6366f1', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Tracking ID</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#6366f1', letterSpacing: '1px' }}>{successTrackingId}</span>
        </div>
        <button onClick={() => navigate('/careers')} style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
          Return to Careers
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px' }}>Employee Referral</h1>
        <p style={{ color: '#64748b' }}>Refer a talented friend or colleague for an open position.</p>
      </header>

      <div style={{ background: 'var(--bg-secondary)', padding: '32px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', marginBottom: '16px' }}>Your Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Your Name *</label>
                <input name="referrerName" required value={formData.referrerName} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Employee ID *</label>
                <input name="referrerEmployeeId" required value={formData.referrerEmployeeId} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', marginBottom: '16px' }}>Candidate Details</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Position *</label>
              <select name="jobId" required value={formData.jobId} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                <option value="">Select a role</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Candidate Name *</label>
                <input name="candidateName" required value={formData.candidateName} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Candidate Email</label>
                <input name="candidateEmail" type="email" value={formData.candidateEmail} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Key Skills (comma separated)</label>
              <input name="keySkills" value={formData.keySkills} onChange={handleChange} placeholder="e.g. React, Node.js, Project Management" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Candidate Resume (Optional)</label>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--glass-border)', padding: '24px', borderRadius: '8px', cursor: 'pointer', background: 'var(--bg-primary)' }}>
                <Upload size={20} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Click to upload CV</span>
                <input type="file" style={{ display: 'none' }} onChange={handleFileChange} accept=".pdf,.doc,.docx" />
                {cvFile && (
                  <div style={{ marginTop: '12px', color: '#6366f1', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Paperclip size={12} /> {cvFile.name}
                  </div>
                )}
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            style={{ width: '100%', padding: '14px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '16px', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Submitting...' : 'Submit Referral'}
          </button>
        </form>
      </div>
    </div>
  );
}
