import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Briefcase, ArrowLeft, CheckCircle2, Upload, Paperclip, ChevronDown, 
  MapPin, Clock, Award, ShieldCheck, HeartHandshake, Building2, Globe, 
  Check, Send, Sparkles, AlertCircle, Gift
} from 'lucide-react';

export default function PublicApply({ backendUrl }) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const formRef = useRef(null);

  // Extract raw job parameter and referral info from URL path/params
  const urlJobId = params.jobId || params['*'] || '';

  // Extract referral code (e.g. from /careers/arcgis-pro-specialist/ref=ABCD1 or ?ref=ABCD1)
  let extractedRefCode = searchParams.get('ref') || '';
  if (!extractedRefCode && location.pathname.includes('/ref=')) {
    const match = location.pathname.match(/ref=([A-Za-z0-9_-]+)/);
    if (match) extractedRefCode = match[1];
  }
  
  // Clean job slug if path contains /ref=
  let cleanJobSlug = urlJobId;
  if (cleanJobSlug.includes('/ref=')) {
    cleanJobSlug = cleanJobSlug.split('/ref=')[0];
  }
  cleanJobSlug = cleanJobSlug.replace(/\/$/, '');

  const [jobsList, setJobsList] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(cleanJobSlug || '');
  const [referralCode] = useState(extractedRefCode);
  const [job, setJob] = useState(null);
  
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const [showApplyForm, setShowApplyForm] = useState(false);
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

        if (cleanJobSlug) {
          const match = activeJobs.find(j => 
            j.id === cleanJobSlug || 
            (j.title && j.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanJobSlug.toLowerCase()) ||
            (j.title && j.title.toLowerCase().replace(/[^a-z0-9]+/g, '') === cleanJobSlug.toLowerCase().replace(/[^a-z0-9]+/g, ''))
          );
          if (match) {
            setSelectedJobId(match.id);
          } else {
            setSelectedJobId(cleanJobSlug);
          }
        } else if (activeJobs.length > 0) {
          setSelectedJobId(activeJobs[0].id);
        }
      })
      .catch(err => {
        console.error('Failed to load active jobs:', err);
        setErrorMsg('Failed to load job positions.');
        setLoadingJobs(false);
      });
  }, [backendUrl, cleanJobSlug]);

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

  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (label, val) => {
    setFormData(prev => ({ ...prev, [label]: val }));
    if (fieldErrors[label]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[label];
        return next;
      });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (!['pdf', 'doc', 'docx'].includes(ext)) {
        setFieldErrors(prev => ({ ...prev, 'Upload CV': 'Invalid file format. Only PDF, DOC, and DOCX files are allowed.' }));
        setCvFile(null);
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setFieldErrors(prev => ({ ...prev, 'Upload CV': 'File size exceeds 10MB limit.' }));
        setCvFile(null);
        return;
      }
      setCvFile(selectedFile);
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next['Upload CV'];
        return next;
      });
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

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
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

    try {
      // Validation
      const errors = {};
      if (job && job.customFields) {
        job.customFields.forEach(field => {
          const label = field.label;
          const rawVal = formData[label];
          const val = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
          const lowerLabel = label.toLowerCase();
          const isRequired = field.isRequired;

          // 1. Required Check
          if (isRequired) {
            if (field.fieldType === 'CvUpload') {
              if (!cvFile) {
                errors[label] = 'Please attach your CV / Resume.';
              }
            } else if (field.fieldType === 'Checkbox') {
              if (val.toLowerCase() !== 'yes' && rawVal !== true) {
                errors[label] = 'You must check this box to proceed.';
              }
            } else if (field.fieldType === 'MultiSelect' || field.fieldType === 'Radio' || field.fieldType === 'Dropdown') {
              if (!val) {
                errors[label] = `Please select an option for ${label}.`;
              }
            } else {
              if (!val) {
                errors[label] = `${label} is required.`;
              }
            }
          }

          // 2. Format & Value Constraints
          if (val) {
            // Phone validation (+91 requires exactly 10 digits, other countries do not enforce 10 digits)
            if (field.fieldType === 'Phone' || lowerLabel.includes('phone') || lowerLabel.includes('mobile') || lowerLabel.includes('contact')) {
              if (!val.startsWith('+')) {
                errors[label] = 'Please include country code starting with + (e.g. +91 9876543210).';
              } else {
                const cleanStr = val.replace(/[\s\-\(\)]/g, '');
                const digitsOnly = cleanStr.replace(/[^0-9]/g, '');

                if (cleanStr.startsWith('+91')) {
                  const subscriberDigits = digitsOnly.substring(2);
                  if (subscriberDigits.length !== 10) {
                    errors[label] = 'Phone numbers with +91 country code must contain exactly 10 digits.';
                  }
                } else if (digitsOnly.length < 5 || digitsOnly.length > 15) {
                  errors[label] = 'Please enter a valid international phone number with country code.';
                }
              }
            }
            // Name validation
            else if (lowerLabel.includes('first name') || lowerLabel.includes('last name') || lowerLabel === 'name' || lowerLabel.includes('full name')) {
              if (val.length < 2) {
                errors[label] = 'Name must be at least 2 characters long.';
              }
            }
            // URL / LinkedIn validation
            else if (field.fieldType === 'Url' || lowerLabel.includes('linkedin') || lowerLabel.includes('url') || lowerLabel.includes('website') || lowerLabel.includes('portfolio')) {
              const urlPattern = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
              if (!urlPattern.test(val) && !val.toLowerCase().includes('linkedin.com')) {
                errors[label] = 'Please enter a valid web URL (e.g. https://linkedin.com/in/username).';
              }
            }
          }
        });
      }

      if (cvFile) {
        const ext = cvFile.name.split('.').pop().toLowerCase();
        if (!['pdf', 'doc', 'docx'].includes(ext)) {
          errors['Upload CV'] = 'Only PDF, DOC, or DOCX files are allowed.';
        } else if (cvFile.size > 10 * 1024 * 1024) {
          errors['Upload CV'] = 'CV file size must be 10MB or smaller.';
        }
      }

      setFieldErrors(errors);

      if (Object.keys(errors).length > 0) {
        setErrorMsg('Please fix the errors marked in red below before submitting your application.');
        setSubmitting(false);

        setTimeout(() => {
          const firstKey = Object.keys(errors)[0];
          const el = document.querySelector(`[data-field-label="${firstKey}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return;
      }

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

        if (!uploadRes.ok) {
          throw new Error('Failed to upload CV file. Please try again.');
        }

        const uploadData = await uploadRes.json();
        cvFileRef = uploadData.filename || uploadData.fileRef || uploadData.path;
        cvFileName = cvFile.name;
      }

      // 2. Submit candidate application
      const payload = {
        jobId: selectedJobId,
        formData: formData,
        cvFileRef: cvFileRef,
        cvFileName: cvFileName,
        refCode: referralCode || ''
      };

      const submitRes = await fetch(`${backendUrl}/api/public/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!submitRes.ok) {
        const errData = await submitRes.json();
        throw new Error(errData.error || 'Failed to submit candidate application.');
      }

      const submitData = await submitRes.json();
      setSuccessTrackingId(submitData.trackingId);
    } catch (err) {
      console.error('Submission error:', err);
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Extract structured responsibilities and qualifications from job description text
  const parseResponsibilities = (text) => {
    if (!text) return [
      "Lead the design, architecture, and implementation of enterprise GIS solutions based on ESRI technologies.",
      "Manage and mentor a team of GIS developers, analysts, and administrators.",
      "Translate business requirements into innovative geospatial solutions and actionable technical plans.",
      "Develop high-performance web GIS applications using ArcGIS API for JavaScript, ArcGIS Pro SDK, and Python.",
      "Oversee configuration and deployment of ArcGIS Enterprise (Server, Portal, Data Store).",
      "Integrate GIS applications with enterprise third-party systems and APIs.",
      "Ensure adherence to quality standards, best practices, and security policies in all GIS solutions."
    ];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
    return lines.length > 0 ? lines : [text];
  };

  if (successTrackingId) {
    return (
      <div className="public-portal" style={{ minHeight: '100vh', backgroundColor: '#070b14', color: '#f3f4f6', fontFamily: 'system-ui, sans-serif' }}>
        
        {/* Navigation */}
        <nav style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: '#0b0f19', padding: '16px 24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/careers')}>
              <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/world-logo.gif" alt="globe" style={{ width: '36px' }} />
              <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/logo-text.svg" alt="iSpatial Techno Solutions" style={{ height: '28px' }} />
            </div>
          </div>
        </nav>

        <div style={{ maxWidth: '640px', margin: '60px auto', padding: '0 24px' }}>
          <div className="portal-card" style={{ padding: '40px', textAlign: 'center', backgroundColor: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px' }}>
            <CheckCircle2 size={64} style={{ color: '#10b981', margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '12px', color: '#ffffff' }}>Application Submitted!</h2>
            <p style={{ marginBottom: '24px', color: '#94a3b8', fontSize: '15px' }}>
              Thank you for applying for the <strong style={{ color: '#ffffff' }}>{job?.title || 'selected'}</strong> position at iSpatialTec.
            </p>
            <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px dashed #38bdf8', padding: '20px', borderRadius: '12px', marginBottom: '28px' }}>
              <span style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px', color: '#94a3b8', letterSpacing: '1px' }}>Your Official Tracking ID</span>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8', letterSpacing: '2px' }}>{successTrackingId}</span>
            </div>
            <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '32px' }}>
              Please save this tracking ID. You can use it to track your recruitment status anytime on our portal.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => navigate('/careers')} className="btn-brand" style={{ flex: 1, padding: '12px' }}>
                Return to Careers
              </button>
              <button onClick={() => navigate(`/status/${successTrackingId}`)} className="btn-secondary-brand" style={{ flex: 1, padding: '12px' }}>
                Track Status Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-portal" style={{ minHeight: '100vh', backgroundColor: '#070b14', color: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. Official Navigation Header */}
      <nav style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(12px)', sticky: 'top', top: 0, zIndex: 100, padding: '16px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/careers')}>
            <div className="globe-wrapper" style={{ position: 'relative', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/world-logo.gif" alt="globe" style={{ width: '36px', height: '36px' }} />
              <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/logo-tick.png" alt="tick" style={{ position: 'absolute', width: '36px', height: '36px' }} />
            </div>
            <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/logo-text.svg" alt="iSpatial Techno Solutions" style={{ height: '28px' }} />
          </div>

          <button 
            onClick={() => navigate('/careers')}
            className="btn-secondary-brand"
            style={{ fontSize: '13px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={15} /> All Openings
          </button>

        </div>
      </nav>

      {/* 2. Breadcrumb Banner */}
      <div style={{ backgroundColor: '#0b1120', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', padding: '14px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/careers')}>Careers</span>
          <span>/</span>
          <span style={{ color: '#38bdf8', fontWeight: '600' }}>{job ? job.title : 'Position Details'}</span>
        </div>
      </div>

      {loadingDetails ? (
        <div style={{ maxWidth: '1100px', margin: '60px auto', textAlign: 'center', color: '#94a3b8' }}>
          Loading position details...
        </div>
      ) : job ? (
        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 60px' }}>
          
          {/* 3. Job Title & Quick Apply Header Card */}
          <div className="portal-card" style={{ padding: '36px', marginBottom: '32px', backgroundColor: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                {referralCode && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>
                    <Gift size={15} /> Referred Application (Ref Code: <strong style={{ textDecoration: 'underline' }}>{referralCode}</strong>)
                  </div>
                )}
                <br />
                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '6px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
                  {job.department || 'Engineering & GIS'}
                </span>
                <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#ffffff', margin: '0 0 16px 0' }}>
                  {job.title}
                </h1>
                
                <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#cbd5e1', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={16} style={{ color: '#38bdf8' }} /> {job.location || 'India (Remote / Hybrid)'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Briefcase size={16} style={{ color: '#38bdf8' }} /> {job.workMode || 'Full-time'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={16} style={{ color: '#38bdf8' }} /> Experience: {job.requiredExperience || '3 - 5 Years'}
                  </span>
                </div>
              </div>

              {showApplyForm && (
                <button 
                  onClick={() => setShowApplyForm(false)}
                  className="btn-secondary-brand"
                  style={{ padding: '10px 18px', fontSize: '13px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowLeft size={14} /> Back to Job Specifications
                </button>
              )}
            </div>
          </div>

          {!showApplyForm ? (
            /* Job Specifications View */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '40px' }}>
              
              {/* Qualification Requirement */}
              <div className="portal-card" style={{ padding: '32px', backgroundColor: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Award size={20} style={{ color: '#38bdf8' }} /> Qualification Requirement
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#94a3b8', fontSize: '15px', lineHeight: 1.8 }}>
                  <li style={{ marginBottom: '8px' }}>Bachelor’s or Master’s degree in Geoinformatics, Computer Science, Geography, Engineering, or related discipline.</li>
                  <li style={{ marginBottom: '8px' }}>ESRI Technical Certifications (e.g., Enterprise Administration, Web Application Developer, ArcGIS Pro) are a strong advantage.</li>
                  <li style={{ marginBottom: '8px' }}>Proven experience working with Smart City, Urban Planning, Infrastructure, Utilities, or Oil & Gas domains.</li>
                  <li style={{ marginBottom: '8px' }}>Strong communication skills with ability to engage with technical teams and business stakeholders effectively.</li>
                </ul>
              </div>

              {/* Job Responsibility */}
              <div className="portal-card" style={{ padding: '32px', backgroundColor: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Briefcase size={20} style={{ color: '#38bdf8' }} /> Job Responsibility
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#94a3b8', fontSize: '15px', lineHeight: 1.8 }}>
                  {parseResponsibilities(job.jobDescription).map((resp, idx) => (
                    <li key={idx} style={{ marginBottom: '8px' }}>{resp}</li>
                  ))}
                </ul>
              </div>

              {/* Benefits & Perks */}
              <div className="portal-card" style={{ padding: '32px', backgroundColor: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={20} style={{ color: '#38bdf8' }} /> Why Join iSpatialTec? (Benefits & Culture)
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#94a3b8', fontSize: '15px', lineHeight: 1.8, marginBottom: '24px' }}>
                  <li style={{ marginBottom: '8px' }}><strong>Competitive Compensation</strong>: Market-leading salary package based on experience and industry standards.</li>
                  <li style={{ marginBottom: '8px' }}><strong>Flexible Work Model</strong>: Support for hybrid and remote work options tailored to project requirements and operational needs.</li>
                  <li style={{ marginBottom: '8px' }}><strong>Medical Insurance</strong>: Comprehensive health coverage for employee, spouse, and dependent children.</li>
                  <li style={{ marginBottom: '8px' }}><strong>Quarterly Appraisals & Rewards</strong>: Yearly performance bonus, quarterly engagement activities, and career growth tracks.</li>
                  <li style={{ marginBottom: '8px' }}><strong>Learning & Development</strong>: Access to specialized ESRI certification programs and advanced Spatial AI workshops.</li>
                </ul>

                <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <button 
                    onClick={() => {
                      setShowApplyForm(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="btn-brand"
                    style={{ padding: '14px 36px', fontSize: '16px', fontWeight: '700', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    Apply for this Position <Send size={16} />
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* Candidate Application Form View */
            <div ref={formRef} className="portal-card" style={{ padding: '36px', backgroundColor: '#090e1a', border: '1px solid #38bdf8', borderRadius: '16px', boxShadow: '0 0 30px rgba(56, 189, 248, 0.1)', marginBottom: '40px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(56, 189, 248, 0.2)', padding: '8px', borderRadius: '8px', color: '#38bdf8' }}>
                    <Send size={20} />
                  </div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                    Candidate Application Form
                  </h2>
                </div>

                <button 
                  onClick={() => setShowApplyForm(false)}
                  className="btn-secondary-brand"
                  style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowLeft size={14} /> Back to Job Details
                </button>
              </div>
              
              <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '28px' }}>
                Submitting application for <strong style={{ color: '#ffffff' }}>{job.title}</strong>
              </p>

              {errorMsg && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="portal-grid">
                  
                  {/* Form Fields */}
                  {job.customFields && job.customFields
                    .filter(field => field.fieldType !== 'CvUpload')
                    .map(field => {
                      const isWide = field.fieldType === 'LongText' || field.fieldType === 'MultiSelect' || field.fieldType === 'Radio';
                      const fieldErr = fieldErrors[field.label];
                      const inputBorderStyle = {
                        width: '100%',
                        backgroundColor: '#040711',
                        border: fieldErr ? '1px solid #ef4444' : '1px solid #334155',
                        boxShadow: fieldErr ? '0 0 8px rgba(239, 68, 68, 0.2)' : 'none'
                      };

                      return (
                        <div key={field.id} data-field-label={field.label} className={isWide ? 'portal-grid-wide' : ''} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ display: 'block', fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>
                            {field.label} {field.isRequired && <span style={{ color: '#ef4444' }}>*</span>}
                          </label>
                          {field.fieldType === 'LongText' ? (
                            <textarea 
                              value={formData[field.label] || ''}
                              onChange={(e) => handleChange(field.label, e.target.value)}
                              rows={4}
                              className="input-field"
                              style={{ ...inputBorderStyle, resize: 'vertical' }}
                            />
                          ) : field.fieldType === 'Dropdown' ? (
                            <select
                              value={formData[field.label] || ''}
                              onChange={(e) => handleChange(field.label, e.target.value)}
                              className="input-field"
                              style={inputBorderStyle}
                            >
                              <option value="" style={{ background: '#040711' }}>Select option</option>
                              {(field.options || '')
                                .split(',')
                                .map(o => o.trim())
                                .filter(Boolean)
                                .map(o => (
                                  <option key={o} value={o} style={{ background: '#040711' }}>{o}</option>
                                ))
                              }
                            </select>
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
                              placeholder={
                                (field.fieldType === 'Phone' || field.label.toLowerCase().includes('phone') || field.label.toLowerCase().includes('mobile') || field.label.toLowerCase().includes('contact'))
                                  ? 'e.g. +91 9876543210'
                                  : undefined
                              }
                              className="input-field"
                              style={inputBorderStyle}
                            />
                          )}
                          {fieldErr && (
                            <span style={{ color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <AlertCircle size={13} /> {fieldErr}
                            </span>
                          )}
                        </div>
                      );
                    })}

                  {/* Standard Compensation & Availability Inputs if not present in customFields */}
                  {!job.customFields?.some(f => f.label.toLowerCase().includes('current ctc')) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ display: 'block', fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>Current CTC</label>
                      <input 
                        type="text" 
                        value={formData['Current CTC'] || ''} 
                        onChange={(e) => handleChange('Current CTC', e.target.value)} 
                        placeholder="e.g. 12 LPA" 
                        className="input-field" 
                        style={{ width: '100%', backgroundColor: '#040711', border: '1px solid #334155' }} 
                      />
                    </div>
                  )}

                  {!job.customFields?.some(f => f.label.toLowerCase().includes('expected ctc')) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ display: 'block', fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>Expected CTC</label>
                      <input 
                        type="text" 
                        value={formData['Expected CTC'] || ''} 
                        onChange={(e) => handleChange('Expected CTC', e.target.value)} 
                        placeholder="e.g. 16 LPA" 
                        className="input-field" 
                        style={{ width: '100%', backgroundColor: '#040711', border: '1px solid #334155' }} 
                      />
                    </div>
                  )}

                  {!job.customFields?.some(f => f.label.toLowerCase().includes('notice')) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ display: 'block', fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>Notice Period</label>
                      <select 
                        value={formData['Notice Period'] || ''} 
                        onChange={(e) => handleChange('Notice Period', e.target.value)} 
                        className="input-field" 
                        style={{ width: '100%', backgroundColor: '#040711', border: '1px solid #334155' }}
                      >
                        <option value="" style={{ background: '#040711' }}>Select Notice Period</option>
                        <option value="Immediate" style={{ background: '#040711' }}>Immediate</option>
                        <option value="15 days" style={{ background: '#040711' }}>15 days</option>
                        <option value="30 days" style={{ background: '#040711' }}>30 days</option>
                        <option value="45 days" style={{ background: '#040711' }}>45 days</option>
                        <option value="60 days" style={{ background: '#040711' }}>60 days</option>
                        <option value="90 days" style={{ background: '#040711' }}>90 days</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* CV Upload */}
                {job.customFields && job.customFields
                  .filter(field => field.fieldType === 'CvUpload')
                  .map(field => {
                    const cvErr = fieldErrors[field.label];
                    return (
                      <div key={field.id} data-field-label={field.label} style={{ marginTop: '8px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>
                          {field.label} {field.isRequired && <span style={{ color: '#ef4444' }}>*</span>}
                        </label>
                        <label className="upload-dropzone" style={{ backgroundColor: '#040711', border: cvErr ? '1px dashed #ef4444' : '1px dashed #334155', boxShadow: cvErr ? '0 0 8px rgba(239, 68, 68, 0.2)' : 'none' }}>
                          <Upload size={24} style={{ color: cvErr ? '#ef4444' : '#38bdf8', marginBottom: '8px' }} />
                          <span style={{ fontSize: '14px', color: '#e2e8f0' }}>Click to upload or drag and drop your CV</span>
                          <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>PDF, DOCX up to 10MB</span>
                          <input 
                            type="file" 
                            accept=".pdf,.docx,.doc" 
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {cvErr && (
                          <span style={{ color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                            <AlertCircle size={13} /> {cvErr}
                          </span>
                        )}
                        {cvFile && !cvErr && (
                          <div style={{ marginTop: '8px', fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Paperclip size={14} /> Attached: <strong>{cvFile.name}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}

                <div style={{ marginTop: '12px' }}>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="btn-brand"
                    style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: '700', borderRadius: '8px' }}
                  >
                    {submitting ? 'Submitting Application...' : `Submit Application for ${job.title}`}
                  </button>
                </div>
              </form>
            </div>
          )}

        </main>
      ) : (
        <div style={{ maxWidth: '1100px', margin: '60px auto', textAlign: 'center', color: '#94a3b8' }}>
          No job position selected or available.
        </div>
      )}

      {/* 6. Global Offices Footer */}
      <footer style={{ backgroundColor: '#030712', borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '60px 24px 30px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} style={{ color: '#38bdf8' }} /> Global Presence & Offices
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            <div>
              <h4 style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>USA</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>16225 Park Ten Place, Suite 500, Houston, Texas 77084</p>
              <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginTop: '4px' }}>+1 (858) 522 9799</span>
            </div>
            <div>
              <h4 style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>UAE</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>1002, C54 Building, Al Mamoura, Abu Dhabi, UAE</p>
              <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginTop: '4px' }}>+971 2635 5503</span>
            </div>
            <div>
              <h4 style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>NETHERLANDS</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>Akkrumerraklaan 170, 3544TV Utrecht</p>
              <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginTop: '4px' }}>+31 640 211 785</span>
            </div>
            <div>
              <h4 style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>BAHRAIN</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>Office 917, Bldg 33, Road 1802, Alhoora</p>
              <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginTop: '4px' }}>connectus@ispatialtec.com</span>
            </div>
            <div>
              <h4 style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>INDIA</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>3rd Floor 3B, Trendz Metro, Madhapur, Hyderabad 500081</p>
              <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginTop: '4px' }}>+91 40 2354 4535</span>
            </div>
          </div>

          <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
            © 2025 iSpatial Techno Solutions, All Rights Reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
