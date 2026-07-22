import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Briefcase, ArrowLeft, CheckCircle2, Upload, Paperclip, ChevronDown } from 'lucide-react';

export default function PublicApply({ backendUrl }) {
  const { jobId: urlJobId } = useParams();
  const navigate = useNavigate();
  
  const [jobsList, setJobsList] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(urlJobId || '');
  const [job, setJob] = useState(null);
  
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const [formData, setFormData] = useState({});
  const [cvFile, setCvFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successTrackingId, setSuccessTrackingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // 1. Fetch all available active job positions
  useEffect(() => {
    fetch(`${backendUrl}/api/public/jobs`)
      .then(r => r.json())
      .then(data => {
        const activeJobs = Array.isArray(data) ? data : [];
        setJobsList(activeJobs);
        setLoadingJobs(false);

        // If URL had a jobId and it exists in list, keep it; otherwise default to first available position
        if (urlJobId && activeJobs.some(j => j.id === urlJobId)) {
          setSelectedJobId(urlJobId);
        } else if (activeJobs.length > 0) {
          setSelectedJobId(activeJobs[0].id);
        }
      })
      .catch(err => {
        console.error('Failed to load active jobs:', err);
        setErrorMsg('Failed to load job positions.');
        setLoadingJobs(false);
      });
  }, [backendUrl, urlJobId]);

  // 2. Fetch specific job details when selectedJobId changes
  useEffect(() => {
    if (!selectedJobId) {
      setJob(null);
      return;
    }

    setLoadingDetails(true);
    setErrorMsg(null);

    fetch(`${backendUrl}/api/public/jobs/${selectedJobId}`)
      .then(r => {
        if (!r.ok) throw new Error('Selected job details not found');
        return r.json();
      })
      .then(data => {
        setJob(data);
        const initial = {};
        if (data.customFields && Array.isArray(data.customFields)) {
          data.customFields.forEach(f => {
            if (f.fieldType !== 'CvUpload') initial[f.label] = '';
          });
        }
        setFormData(initial);
        setLoadingDetails(false);
      })
      .catch(err => {
        console.error('Error loading job details:', err);
        setErrorMsg(err.message);
        setLoadingDetails(false);
      });
  }, [backendUrl, selectedJobId]);

  const handleChange = (label, val) => {
    setFormData(prev => ({ ...prev, [label]: val }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setCvFile(e.target.files[0]);
    }
  };

  const handleJobSelectChange = (e) => {
    const newJobId = e.target.value;
    setSelectedJobId(newJobId);
    if (newJobId) {
      navigate(`/apply/${newJobId}`, { replace: true });
    } else {
      navigate(`/apply`, { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJobId) {
      setErrorMsg('Please select a job position to apply for.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    // Custom Validation for required fields
    const validationErrors = [];
    if (job && job.customFields) {
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
    }

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
        if (!uploadRes.ok) throw new Error('Failed to upload CV file');
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
          jobId: selectedJobId,
          cvFileRef,
          cvFileName,
          answers
        })
      });

      if (!submitRes.ok) throw new Error('Failed to submit application.');
      const submitData = await submitRes.json();
      
      setSuccessTrackingId(submitData.trackingId);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJobs) return (
    <div className="public-portal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ padding: '80px', fontSize: '18px', color: '#94a3b8' }}>Loading open job positions...</div>
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
              Thank you for applying to the <strong>{job?.title || 'selected'}</strong> position.
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

        {/* Universal Position Selection Header Card */}
        <div className="portal-card" style={{ padding: '28px', marginBottom: '24px', border: '1px solid rgba(73, 114, 194, 0.4)', background: 'linear-gradient(135deg, #0d1527 0%, #111c35 100%)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: '#ffffff' }}>
            Job Application Form
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px' }}>
            Select the position you wish to apply for from the active job openings below:
          </p>

          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '8px', color: '#38bdf8' }}>
              Select Job Position / Role <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={selectedJobId}
              onChange={handleJobSelectChange}
              className="input-field"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '15px',
                fontWeight: '600',
                borderRadius: '8px',
                border: '1px solid #4972c2',
                background: '#090e1a',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <option value="" disabled style={{ background: '#090e1a' }}>-- Select a Job Position --</option>
              {jobsList.map(j => (
                <option key={j.id} value={j.id} style={{ background: '#090e1a' }}>
                  {j.title} — ({j.department || 'General Role'} | {j.location || 'Hybrid/On-site'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingDetails ? (
          <div className="portal-card" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            Loading position details...
          </div>
        ) : job ? (
          <>
            <div className="portal-card" style={{ padding: '32px', marginBottom: '32px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '8px' }}>{job.title}</h1>
              <div style={{ display: 'flex', gap: '16px', fontSize: '14px', marginBottom: '24px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Briefcase size={16} style={{ color: '#4972c2' }} /> {job.department}
                </span>
                {job.location && (
                  <span style={{ color: '#94a3b8' }}>• {job.location}</span>
                )}
              </div>
              <div style={{ fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#e0e0e0' }}>
                {job.jobDescription}
              </div>
            </div>

            <div className="portal-card" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Submit Your Details</h2>
              
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
                              onChange={(e) => {
                                let val = e.target.value;
                                if (field.fieldType === 'Phone') {
                                  val = val.replace(/[^0-9+\-\s()]/g, '');
                                }
                                handleChange(field.label, val);
                              }}
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
                    {submitting ? 'Submitting Application...' : `Submit Application for ${job.title}`}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="portal-card" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No open job position selected or available.
          </div>
        )}
      </div>
    </div>
  );
}
