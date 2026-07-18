import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Briefcase, ArrowLeft, CheckCircle2, Upload, Paperclip } from 'lucide-react';

export default function PublicApply({ backendUrl }) {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({});
  const [cvFile, setCvFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successTrackingId, setSuccessTrackingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetch(`${backendUrl}/api/public/jobs/${jobId}`)
      .then(r => {
        if (!r.ok) throw new Error('Job not found');
        return r.json();
      })
      .then(data => {
        setJob(data);
        const initial = {};
        data.customFields.forEach(f => {
          if (f.fieldType !== 'CvUpload') initial[f.label] = '';
        });
        setFormData(initial);
        setLoading(false);
      })
      .catch(err => {
        setErrorMsg(err.message);
        setLoading(false);
      });
  }, [backendUrl, jobId]);

  const handleChange = (label, val) => {
    setFormData(prev => ({ ...prev, [label]: val }));
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

    // Custom Validation for required fields
    const validationErrors = [];
    job.customFields.forEach(field => {
      if (field.isRequired) {
        if (field.fieldType === 'CvUpload') {
          if (!cvFile) {
            validationErrors.push(`${field.label} is required.`);
          }
        } else if (field.fieldType === 'Checkbox') {
          if (formData[field.label] !== 'Yes') {
            validationErrors.push(`${field.label} must be checked.`);
          }
        } else if (field.fieldType === 'MultiSelect' || field.fieldType === 'Radio') {
          if (!formData[field.label] || !formData[field.label].trim()) {
            validationErrors.push(`Please select an option for ${field.label}.`);
          }
        } else {
          if (!formData[field.label] || !formData[field.label].trim()) {
            validationErrors.push(`${field.label} is required.`);
          }
        }
      }
    });

    if (validationErrors.length > 0) {
      setErrorMsg(validationErrors.join(' '));
      setSubmitting(false);
      return;
    }

    try {
      // 1. Upload CV if present
      let cvFileRef = '';
      let cvFileName = '';
      if (cvFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', cvFile);
        const uploadRes = await fetch(`${backendUrl}/api/public/cv`, {
          method: 'POST',
          body: formDataUpload
        });
        if (!uploadRes.ok) throw new Error('Failed to upload CV');
        const uploadData = await uploadRes.json();
        cvFileRef = uploadData.fileRef;
        cvFileName = uploadData.fileName;
      }

      // 2. Submit Application
      const answers = Object.entries(formData).map(([label, value]) => ({ label, value }));
      const submitRes = await fetch(`${backendUrl}/api/public/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          cvFileRef,
          cvFileName,
          answers
        })
      });

      if (!submitRes.ok) throw new Error('Failed to submit application');
      const submitData = await submitRes.json();
      
      setSuccessTrackingId(submitData.trackingId);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="public-portal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ padding: '80px', fontSize: '18px' }}>Loading...</div>
    </div>
  );
  
  if (errorMsg && !job) return (
    <div className="public-portal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ padding: '80px', fontSize: '18px', color: '#ef4444' }}>{errorMsg}</div>
    </div>
  );
 
  if (successTrackingId) {
    return (
      <div className="public-portal">
        <div className="portal-content" style={{ maxWidth: '600px' }}>
          {/* iSpatialTec Branding Header */}
          <div className="logo-container">
            <div className="globe-wrapper">
              <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/world-logo.gif" alt="globe" className="globe" />
              <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/logo-tick.png" alt="tick" className="tick" />
            </div>
            <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/logo-text.svg" alt="iSpatial Techno Solutions" style={{ height: '32px' }} />
          </div>

          <div className="portal-card" style={{ padding: '40px', textAlign: 'center' }}>
            <CheckCircle2 size={64} style={{ color: '#10b981', margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>Application Submitted!</h2>
            <p style={{ marginBottom: '24px' }}>
              Thank you for applying to the <strong>{job.title}</strong> position.
            </p>
            <div style={{ background: 'rgba(73, 114, 194, 0.1)', border: '1px dashed #4972c2', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
              <span style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px' }}>Your Tracking ID</span>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#4972c2', letterSpacing: '1px' }}>{successTrackingId}</span>
            </div>
            <p style={{ fontSize: '14px', marginBottom: '32px' }}>
              Please save this tracking ID. You can use it to check your application status at any time.
            </p>
            <button 
              onClick={() => navigate('/careers')}
              className="btn-brand"
              style={{ width: '100%' }}
            >
              Return to Careers
            </button>
          </div>
        </div>
      </div>
    );
  }
 
  return (
    <div className="public-portal">
      <div className="portal-content">
        {/* iSpatialTec Branding Header */}
        <div className="logo-container">
          <div className="globe-wrapper">
            <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/world-logo.gif" alt="globe" className="globe" />
            <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/logo-tick.png" alt="tick" className="tick" />
          </div>
          <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/logo-text.svg" alt="iSpatial Techno Solutions" style={{ height: '32px' }} />
        </div>

        <button 
          onClick={() => navigate('/careers')}
          className="btn-secondary-brand"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}
        >
          <ArrowLeft size={16} /> Back to Openings
        </button>
 
        <div className="portal-card" style={{ padding: '32px', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>{job.title}</h1>
          <div style={{ display: 'flex', gap: '16px', fontSize: '14px', marginBottom: '24px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase size={16} style={{ color: '#4972c2' }} /> {job.department}</span>
          </div>
          <div style={{ fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#e0e0e0' }}>
            {job.jobDescription}
          </div>
        </div>
 
        <div className="portal-card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Submit Your Application</h2>
          
          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
              {errorMsg}
            </div>
          )}
 
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="portal-grid">
              {job.customFields
                .filter(field => field.fieldType !== 'CvUpload')
                .map(field => {
                  const isWide = field.fieldType === 'LongText' || field.fieldType === 'MultiSelect' || field.fieldType === 'Radio';
                  return (
                    <div key={field.id} className={isWide ? 'portal-grid-wide' : ''} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ display: 'block', fontWeight: '500', fontSize: '14px' }}>
                        {field.label} {field.isRequired && <span style={{ color: '#ef4444' }}>*</span>}
                      </label>
                      {field.fieldType === 'LongText' ? (
                        <textarea 
                          value={formData[field.label] || ''}
                          onChange={(e) => handleChange(field.label, e.target.value)}
                          rows={4}
                          className="input-field"
                          style={{ width: '100%', resize: 'vertical' }}
                        />
                      ) : field.fieldType === 'Dropdown' ? (
                        <select
                          value={formData[field.label] || ''}
                          onChange={(e) => handleChange(field.label, e.target.value)}
                          className="input-field"
                          style={{ width: '100%' }}
                        >
                          <option value="" style={{ background: '#090e1a' }}>Select option</option>
                          {(field.options || '')
                            .split(',')
                            .map(o => o.trim())
                            .filter(Boolean)
                            .map(o => (
                              <option key={o} value={o} style={{ background: '#090e1a' }}>{o}</option>
                            ))
                          }
                        </select>
                      ) : field.fieldType === 'Checkbox' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px' }}>
                          <input 
                            type="checkbox"
                            checked={formData[field.label] === 'Yes'}
                            onChange={(e) => handleChange(field.label, e.target.checked ? 'Yes' : 'No')}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '14px', color: '#bdbdbd' }}>Yes</span>
                        </div>
                      ) : field.fieldType === 'Radio' ? (
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', minHeight: '44px', alignItems: 'center' }}>
                          {(field.options || '')
                            .split(',')
                            .map(o => o.trim())
                            .filter(Boolean)
                            .map(o => (
                              <label key={o} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', color: '#bdbdbd' }}>
                                <input 
                                  type="radio"
                                  name={field.id}
                                  value={o}
                                  checked={formData[field.label] === o}
                                  onChange={() => handleChange(field.label, o)}
                                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                {o}
                              </label>
                            ))
                          }
                        </div>
                      ) : field.fieldType === 'MultiSelect' ? (
                        <div style={{ display: 'flex', gap: '12px 18px', flexWrap: 'wrap', padding: '6px 0' }}>
                          {(field.options || '')
                            .split(',')
                            .map(o => o.trim())
                            .filter(Boolean)
                            .map(o => {
                              const currentVals = (formData[field.label] || '').split(',').map(v => v.trim()).filter(Boolean);
                              const isChecked = currentVals.includes(o);
                              return (
                                <label key={o} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', color: '#bdbdbd' }}>
                                  <input 
                                    type="checkbox"
                                    value={o}
                                    checked={isChecked}
                                    onChange={(e) => {
                                      let newVals;
                                      if (e.target.checked) {
                                        newVals = [...currentVals, o];
                                      } else {
                                        newVals = currentVals.filter(v => v !== o);
                                      }
                                      handleChange(field.label, newVals.join(', '));
                                    }}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                  />
                                  {o}
                                </label>
                              );
                            })
                          }
                        </div>
                      ) : (
                        <input 
                          type={
                            field.fieldType === 'Email' ? 'email' : 
                            field.fieldType === 'Phone' ? 'tel' : 
                            field.fieldType === 'Number' ? 'number' : 
                            field.fieldType === 'Date' ? 'date' : 
                            field.fieldType === 'Url' ? 'url' : 'text'
                          }
                          value={formData[field.label] || ''}
                          onChange={(e) => handleChange(field.label, e.target.value)}
                          className="input-field"
                          style={{ width: '100%' }}
                        />
                      )}
                    </div>
                  );
                })}
            </div>

            {job.customFields
              .filter(field => field.fieldType === 'CvUpload')
              .map(field => (
                <div key={field.id} style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                    {field.label} {field.isRequired && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <label className="upload-dropzone">
                    <Upload size={24} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                    <span style={{ fontSize: '14px' }}>Click to upload or drag and drop</span>
                    <span style={{ fontSize: '12px', marginTop: '4px' }}>PDF, DOCX up to 10MB</span>
                    <input type="file" style={{ display: 'none' }} onChange={handleFileChange} accept=".pdf,.doc,.docx" />
                    {cvFile && (
                      <div style={{ marginTop: '16px', padding: '8px 12px', background: 'rgba(73, 114, 194, 0.15)', color: '#4972c2', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(73, 114, 194, 0.3)' }}>
                        <Paperclip size={14} /> {cvFile.name}
                      </div>
                    )}
                  </label>
                </div>
              ))}
 
            <div style={{ marginTop: '8px' }}>
              <button 
                type="submit" 
                disabled={submitting}
                className="btn-brand"
                style={{ width: '100%', padding: '14px', fontSize: '16px' }}
              >
                {submitting ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
