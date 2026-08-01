import React, { useState } from 'react';
import { Briefcase, Plus, Trash2, Edit2, X, Save, Link, Globe, CheckCircle2, Search, ExternalLink, Eye, Users, UserCheck, Clock, User, Sparkles, Filter } from 'lucide-react';
import { getCandidateNoticePeriod, getCandidateLocation, getCandidateExperience } from '../utils/candidateHelpers';

const STAGES = ["Inbox", "Shortlist", "Interview", "Offered", "Rejected"];

const DEPARTMENTS = [
  "Project Management",
  "Software Development",
  "GIS",
  "Data Science & AI",
  "Design",
  "Digital Marketing",
  "Human Resource (HR)",
  "Business Development",
  "Environment & Sustainability",
  "Consultant",
  "Admin"
];

const LOCATIONS = [
  "Abu Dhabi, UAE",
  "Hyderabad, India",
  "Texas, USA",
  "Remote (Work from Home)"
];

function getNoticeDays(candidate) {
  const noticeStr = getCandidateNoticePeriod(candidate);
  if (!noticeStr || noticeStr === '—') return null;
  const lower = String(noticeStr).toLowerCase().trim();
  
  if (
    lower.includes('immed') || 
    lower.includes('serving') || 
    lower.includes('buyout') || 
    lower.includes('ready') || 
    lower.includes('0 day') || 
    lower === '0'
  ) {
    return 0;
  }
  
  if (lower.includes('1 week') || lower.includes('7 day') || lower.includes('7days')) return 7;
  if (lower.includes('2 week') || lower.includes('14 day') || lower.includes('14days') || lower.includes('15 day')) return 14;
  if (lower.includes('3 week') || lower.includes('21 day')) return 21;
  if (lower.includes('1 month') || lower.includes('30 day')) return 30;
  if (lower.includes('2 month') || lower.includes('60 day')) return 60;
  if (lower.includes('3 month') || lower.includes('90 day')) return 90;

  const match = lower.match(/(\d+)/);
  if (match) {
    let num = parseInt(match[1], 10);
    if (lower.includes('week')) num = num * 7;
    if (lower.includes('month')) num = num * 30;
    return num;
  }
  return null;
}

function getJobApplicantsList(job, candidatesList) {
  if (!candidatesList || !Array.isArray(candidatesList)) return [];
  return candidatesList.filter(c => {
    if (!c) return false;
    if (c.jobId && (String(c.jobId) === String(job.id) || String(c.jobId) === String(job._id))) return true;
    if (c.position && String(c.position).toLowerCase().trim() === String(job.title).toLowerCase().trim()) return true;
    if (c.jobRole && String(c.jobRole).toLowerCase().trim() === String(job.title).toLowerCase().trim()) return true;
    if (c.extractedData?.jobRole && String(c.extractedData.jobRole).toLowerCase().trim() === String(job.title).toLowerCase().trim()) return true;
    return false;
  });
}

function getJobApplicantStats(job, candidatesList) {
  const jobApplicants = getJobApplicantsList(job, candidatesList);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  let oldApplicants = 0;
  let newApplicants = 0;
  let immediate7 = 0;
  let joiners14 = 0;

  jobApplicants.forEach(c => {
    let candidateDate = null;
    if (c.createdAt) candidateDate = new Date(c.createdAt);
    else if (c.appliedDate) candidateDate = new Date(c.appliedDate);
    else if (c._id && /^[0-9a-fA-F]{24}$/.test(String(c._id))) {
      candidateDate = new Date(parseInt(String(c._id).substring(0, 8), 16) * 1000);
    }
    
    const noticeDays = getNoticeDays(c);

    if ((noticeDays !== null && noticeDays <= 7) || (candidateDate && candidateDate >= sevenDaysAgo)) {
      immediate7++;
    }

    if ((noticeDays !== null && noticeDays <= 14) || (candidateDate && candidateDate >= fourteenDaysAgo)) {
      joiners14++;
    }

    if (candidateDate && !isNaN(candidateDate.getTime())) {
      if (candidateDate >= fourteenDaysAgo) {
        newApplicants++;
      } else {
        oldApplicants++;
      }
    } else {
      newApplicants++;
    }
  });

  return {
    total: jobApplicants.length,
    oldApplicants,
    newApplicants,
    immediate7,
    joiners14
  };
}

function formatJobCreatedDate(job) {
  if (!job) return 'Jul 24, 2026';
  let rawDate = job.createdAt || job.createdDate || job.date || job.createdAtTimestamp;
  
  // 1. Try extracting timestamp from MongoDB ObjectId (_id)
  if (!rawDate && job._id) {
    try {
      const idStr = String(job._id);
      if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
        rawDate = new Date(parseInt(idStr.substring(0, 8), 16) * 1000);
      }
    } catch (e) {}
  }

  // 2. Try extracting timestamp from job.id (e.g. job-1721820000000)
  if (!rawDate && job.id && typeof job.id === 'string') {
    const match = job.id.match(/\d{10,13}/);
    if (match) {
      const ts = parseInt(match[0], 10);
      rawDate = new Date(ts > 1e11 ? ts : ts * 1000);
    }
  }

  if (!rawDate) rawDate = new Date();

  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return 'Jul 24, 2026';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return 'Jul 24, 2026';
  }
}

export default function JobPositions({ 
  token, 
  jobs = [], 
  candidates = [], 
  onJobCreated, 
  onJobDeleted, 
  onJobUpdated, 
  onSelectCandidate,
  onStageChanged,
  onViewApplicants,
  backendUrl, 
  currentRole 
}) {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDept, setJobDept] = useState('Software Development');
  const [jobLoc, setJobLoc] = useState('Hyderabad, India');
  const [jobResponsibility, setJobResponsibility] = useState('');
  const [qualificationRequirement, setQualificationRequirement] = useState('');
  const [jobReqs, setJobReqs] = useState('');
  const [benefits, setBenefits] = useState('');
  const [jobPublicDesc, setJobPublicDesc] = useState('');
  const [generatingJD, setGeneratingJD] = useState(false);
  const [jdKeywords, setJdKeywords] = useState('');
  const [editingJobId, setEditingJobId] = useState(null);
  const [editForm, setEditForm] = useState({ 
    title: '', 
    department: 'Software Development', 
    location: 'Hyderabad, India', 
    jobResponsibility: '', 
    qualificationRequirement: '', 
    requirements: '', 
    benefits: '', 
    publicDescription: '' 
  });
  const [publishingId, setPublishingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Create Job Modal Popup State
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Dedicated eCube Applicants Modal state
  const [selectedModalJob, setSelectedModalJob] = useState(null);
  const [modalFilterTab, setModalFilterTab] = useState('all'); // 'all', 'immediate7', 'joiners14'
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  const openApplicantsModal = (job, filterTab = 'all') => {
    setSelectedModalJob(job);
    setModalFilterTab(filterTab);
    setModalSearchQuery('');
  };

  const closeApplicantsModal = () => {
    setSelectedModalJob(null);
  };

  const handleCreateJob = async (e, publishImmediately = true) => {
    if (e) e.preventDefault();
    if (!jobTitle) return alert('Role (Job Title) is required');
    try {
      const computedDesc = jobPublicDesc || `Job Responsibilities:\n${jobResponsibility}\n\nQualifications:\n${qualificationRequirement}\n\nBenefits:\n${benefits}`;
      const res = await fetch(`${backendUrl}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: jobTitle,
          department: jobDept,
          location: jobLoc,
          jobResponsibility,
          qualificationRequirement,
          requirements: jobReqs,
          benefits,
          description: computedDesc,
          publicDescription: computedDesc,
          publishToCareers: publishImmediately
        })
      });

      if (!res.ok) throw new Error('Failed to create job');
      const newJob = await res.json();
      onJobCreated(newJob);
      
      setJobTitle('');
      setJobDept('Software Development');
      setJobLoc('Hyderabad, India');
      setJobResponsibility('');
      setQualificationRequirement('');
      setJobReqs('');
      setBenefits('');
      setJobPublicDesc('');
      setShowCreateModal(false);

      if (publishImmediately) {
        const publicUrl = `${window.location.origin}/apply/${newJob.id}`;
        navigator.clipboard.writeText(publicUrl).catch(() => {});
        alert(`🎉 Position "${newJob.title}" created & PUBLISHED live to Careers Portal!\n\nPublic Link copied to clipboard:\n${publicUrl}`);
      } else {
        alert(`Job position "${newJob.title}" created as draft.`);
      }
    } catch (e) {
      console.error(e);
      alert('Error creating job posting.');
    }
  };

  const handlePublishJob = async (job, targetPublishState = null) => {
    const nextState = targetPublishState !== null ? targetPublishState : !job.publishToCareers;
    setPublishingId(job.id);
    try {
      const res = await fetch(`${backendUrl}/api/jobs/${job.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ publishToCareers: nextState })
      });

      if (!res.ok) throw new Error('Failed to update publish status');
      const data = await res.json();
      const updatedJob = data.job || { ...job, publishToCareers: nextState };
      onJobUpdated(updatedJob);

      if (nextState) {
        const publicUrl = `${window.location.origin}/apply/${job.id}`;
        navigator.clipboard.writeText(publicUrl).catch(() => {});
        alert(`🎉 Position "${job.title}" is now PUBLISHED live to Careers Portal!\n\nPublic Application URL:\n${publicUrl}\n(Link copied to clipboard)`);
      } else {
        alert(`Position "${job.title}" has been UNPUBLISHED.`);
      }
    } catch (e) {
      console.error(e);
      alert(e.message || 'Error updating publish status');
    } finally {
      setPublishingId(null);
    }
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job posting? All candidates associated with this job will also be deleted.')) return;
    if (!window.confirm('Are you absolutely sure you want to delete this job posting? This cannot be undone.')) return;
    try {
      await fetch(`${backendUrl}/api/jobs/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      onJobDeleted(id);
    } catch (e) {
      console.error(e);
    }
  };

  const startEditing = (job) => {
    setEditingJobId(job.id);
    setEditForm({
      title: job.title || '',
      department: job.department || 'Software Development',
      location: job.location || 'Hyderabad, India',
      jobResponsibility: job.jobResponsibility || '',
      qualificationRequirement: job.qualificationRequirement || '',
      requirements: job.requirements || '',
      benefits: job.benefits || '',
      publicDescription: job.publicDescription || job.description || ''
    });
  };

  const cancelEditing = () => {
    setEditingJobId(null);
  };

  const handleUpdateJob = async (e, id) => {
    e.preventDefault();
    if (!editForm.title) return alert('Role (Job Title) is required');
    try {
      const computedDesc = editForm.publicDescription || `Job Responsibilities:\n${editForm.jobResponsibility}\n\nQualifications:\n${editForm.qualificationRequirement}\n\nBenefits:\n${editForm.benefits}`;
      const payload = {
        ...editForm,
        description: computedDesc,
        publicDescription: computedDesc
      };
      const res = await fetch(`${backendUrl}/api/jobs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update job');
      const updatedJob = await res.json();
      onJobUpdated(updatedJob);
      setEditingJobId(null);
    } catch (e) {
      console.error(e);
      alert('Error updating job posting.');
    }
  };

  const handleGenerateJD = async () => {
    if (!jobTitle) {
      alert('Please enter a Job Title first.');
      return;
    }
    setGeneratingJD(true);
    try {
      const res = await fetch(`${backendUrl}/api/jobs/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: jobTitle,
          department: jobDept,
          location: jobLoc,
          skills: jdKeywords
        })
      });
      if (!res.ok) throw new Error('AI Generation failed');
      const data = await res.json();
      setJobDesc(data.description || '');
      setJobReqs(data.requirements || '');
    } catch (e) {
      console.error(e);
      alert('Failed to generate Job Description with AI.');
    } finally {
      setGeneratingJD(false);
    }
  };

  const filteredJobs = jobs.filter(j => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (j.title && j.title.toLowerCase().includes(term)) ||
      (j.department && j.department.toLowerCase().includes(term)) ||
      (j.location && j.location.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ padding: '0px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <header style={{ marginBottom: '16px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Job Openings</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Manage active job positions, applicant metrics, and publish/unpublish openings.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search job title or dept..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '30px', height: '36px', fontSize: '12px' }}
            />
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => window.open(`${window.location.origin}/careers`, '_blank')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 14px', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}
            title="Open live public Careers portal in a new tab"
          >
            <Globe size={14} /> View Careers Portal
          </button>
          {currentRole !== 'Hiring Manager' && (
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={() => setShowCreateModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 16px', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}
            >
              <Plus size={16} /> Create New Job
            </button>
          )}
        </div>
      </header>

      <div style={{ flexGrow: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingRight: '12px' }}>
          
          {/* Edit Modal Popup */}
          {editingJobId && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px'
              }}
              onClick={cancelEditing}
            >
              <div 
                style={{
                  width: '95%',
                  maxWidth: '850px',
                  maxHeight: '90vh',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--accent-primary)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Edit Job Position
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Update position details, requirements, and candidate-facing description.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={cancelEditing}>
                      <X size={14} /> Cancel
                    </button>
                    <button type="button" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={(e) => handleUpdateJob(e, editingJobId)}>
                      <Save size={14} /> Save Changes
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <form onSubmit={(e) => handleUpdateJob(e, editingJobId)} style={{ flexGrow: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Role (Job Title)*</label>
                      <input type="text" className="form-input" value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} placeholder="e.g. Solution Architect" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Department*</label>
                      <select className="form-input" value={editForm.department} onChange={(e) => setEditForm({...editForm, department: e.target.value})}>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Location*</label>
                      <select className="form-input" value={editForm.location} onChange={(e) => setEditForm({...editForm, location: e.target.value})}>
                        {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Job Responsibility</label>
                    <textarea className="form-input" rows={4} value={editForm.jobResponsibility || ''} onChange={(e) => setEditForm({...editForm, jobResponsibility: e.target.value})} placeholder="List key job responsibilities..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Qualification Requirement</label>
                    <textarea className="form-input" rows={3} value={editForm.qualificationRequirement || ''} onChange={(e) => setEditForm({...editForm, qualificationRequirement: e.target.value})} placeholder="Required degrees, certifications, and background..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Requirements Criteria* (One per line or comma-separated)</label>
                    <textarea className="form-input" rows={3} value={editForm.requirements || ''} onChange={(e) => setEditForm({...editForm, requirements: e.target.value})} placeholder="e.g. 5+ years GIS experience&#10;PMP Certification&#10;Agile methodology" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Benefits</label>
                    <textarea className="form-input" rows={3} value={editForm.benefits || ''} onChange={(e) => setEditForm({...editForm, benefits: e.target.value})} placeholder="Medical Insurance, Flexible Working Model, Appraisals..." />
                  </div>
                </form>

                {/* Modal Footer */}
                <div style={{ padding: '14px 24px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: 'rgba(255, 255, 255, 0.02)' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={cancelEditing}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }} onClick={(e) => handleUpdateJob(e, editingJobId)}>
                    <Save size={14} /> Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Job Position Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: 0 }}>
                Job Position Table ({filteredJobs.length})
              </h4>
            </div>

            {filteredJobs.length === 0 ? (
              <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active job positions found. Click <strong>"+ Create New Job"</strong> above to create one.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-secondary)', width: '60px', textAlign: 'center' }}>Sl. No</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Job Title</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'center' }}>No. of applicants</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'center' }}>Immediate joiners (7 days)</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'center' }}>Joiners with in 14 days</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'center' }}>Old Applicants</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Created Date</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'center' }}>Publish and Unpublish</th>
                      {currentRole !== 'Hiring Manager' && (
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job, idx) => {
                      const stats = getJobApplicantStats(job, candidates);
                      const isPublished = Boolean(job.publishToCareers);
                      const createdStr = formatJobCreatedDate(job);

                      return (
                        <tr 
                          key={job.id} 
                          style={{ 
                            borderBottom: '1px solid var(--glass-border)', 
                            transition: 'background 0.2s',
                          }}
                        >
                          <td 
                            style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'center', cursor: 'pointer' }}
                            onClick={() => openApplicantsModal(job, 'all')}
                          >
                            {idx + 1}
                          </td>

                          {/* Role (Job Title) Cell */}
                          <td 
                            style={{ padding: '14px 16px', cursor: 'pointer' }}
                            onClick={() => openApplicantsModal(job, 'all')}
                            title="Click to open candidate applicants list"
                          >
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{job.title}</span>
                              <Users size={13} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {job.department && job.location 
                                ? `${job.department} • ${job.location}` 
                                : (job.department || job.location || '')}
                            </div>
                          </td>

                          {/* No. of applicants Cell */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span 
                              onClick={() => openApplicantsModal(job, 'all')}
                              style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 12px',
                                borderRadius: '12px',
                                background: stats.total > 0 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                color: stats.total > 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
                                fontWeight: stats.total > 0 ? '700' : '400',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                              title="Click to view total applicants"
                            >
                              <Users size={12} /> {stats.total}
                            </span>
                          </td>

                          {/* Immediate joiners (7 days) Cell */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span 
                              onClick={() => openApplicantsModal(job, 'immediate7')}
                              style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 12px',
                                borderRadius: '12px',
                                background: stats.immediate7 > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                color: stats.immediate7 > 0 ? '#10b981' : 'var(--text-muted)',
                                fontWeight: stats.immediate7 > 0 ? '700' : '400',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                              title="Click to view immediate joiners (<= 7 days)"
                            >
                              <Clock size={12} /> {stats.immediate7}
                            </span>
                          </td>

                          {/* Joiners with in 14 days Cell */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span 
                              onClick={() => openApplicantsModal(job, 'joiners14')}
                              style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 12px',
                                borderRadius: '12px',
                                background: stats.joiners14 > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                color: stats.joiners14 > 0 ? '#3b82f6' : 'var(--text-muted)',
                                fontWeight: stats.joiners14 > 0 ? '700' : '400',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                              title="Click to view joiners within 14 days"
                            >
                              <User size={12} /> {stats.joiners14}
                            </span>
                          </td>

                          {/* Old Applicants Cell */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span 
                              onClick={() => openApplicantsModal(job, 'old')}
                              style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 12px',
                                borderRadius: '12px',
                                background: stats.oldApplicants > 0 ? 'rgba(148, 163, 184, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                color: stats.oldApplicants > 0 ? '#94a3b8' : 'var(--text-muted)',
                                fontWeight: stats.oldApplicants > 0 ? '700' : '400',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                              title="Click to view old applicants (> 14 days)"
                            >
                              <User size={12} /> {stats.oldApplicants}
                            </span>
                          </td>

                          {/* Created Date */}
                          <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                            {createdStr}
                          </td>

                          {/* Publish and Unpublish */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            {currentRole !== 'Hiring Manager' ? (
                              <button
                                type="button"
                                className={`btn ${isPublished ? 'btn-secondary' : 'btn-primary'}`}
                                disabled={publishingId === job.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePublishJob(job);
                                }}
                                style={{
                                  padding: '5px 12px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: isPublished ? 'rgba(16, 185, 129, 0.15)' : 'var(--accent-primary)',
                                  color: isPublished ? '#10b981' : '#ffffff',
                                  border: isPublished ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                                  borderRadius: 'var(--radius-md)',
                                  cursor: 'pointer'
                                }}
                                title={isPublished ? "Click to unpublish position" : "Click to publish position"}
                              >
                                {publishingId === job.id ? (
                                  'Updating...'
                                ) : isPublished ? (
                                  <>
                                    <CheckCircle2 size={13} /> Published
                                  </>
                                ) : (
                                  <>
                                    <Globe size={13} /> Publish
                                  </>
                                )}
                              </button>
                            ) : (
                              <span style={{ fontSize: '12px', color: isPublished ? '#10b981' : 'var(--text-muted)', fontWeight: '600' }}>
                                {isPublished ? 'Published' : 'Unpublished'}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          {currentRole !== 'Hiring Manager' && (
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(job);
                                }} title="Edit Position">
                                  <Edit2 size={13} />
                                </button>
                                <button className="btn btn-danger" style={{ padding: '6px' }} onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteJob(job.id);
                                }} title="Delete Position">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE NEW JOB POPUP MODAL */}
      {showCreateModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            style={{
              width: '95%',
              maxWidth: '850px',
              maxHeight: '90vh',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Add New Job Position
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Create a new job opening or generate description using AI.
                </p>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '6px' }} 
                onClick={() => setShowCreateModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateJob} style={{ flexGrow: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Role (Job Title)*</label>
                  <input type="text" className="form-input" placeholder="e.g. Solution Architect" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Department*</label>
                  <select className="form-input" value={jobDept} onChange={(e) => setJobDept(e.target.value)}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Location*</label>
                  <select className="form-input" value={jobLoc} onChange={(e) => setJobLoc(e.target.value)}>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">AI Generator Keywords / Core Skills</label>
                  <input type="text" className="form-input" placeholder="e.g. Microservices, AWS, Docker" value={jdKeywords} onChange={(e) => setJdKeywords(e.target.value)} />
                </div>
                <button type="button" className="btn btn-secondary" onClick={handleGenerateJD} disabled={generatingJD} style={{ height: '38px', padding: '0 20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} /> {generatingJD ? 'Generating...' : 'Generate JD with AI'}
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Job Responsibility</label>
                <textarea className="form-input" rows={3} placeholder="List key job responsibilities..." value={jobResponsibility} onChange={(e) => setJobResponsibility(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Qualification Requirement</label>
                <textarea className="form-input" rows={3} placeholder="Required degrees, certifications, and background..." value={qualificationRequirement} onChange={(e) => setQualificationRequirement(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Requirements Criteria* (One per line or comma-separated)</label>
                <textarea className="form-input" rows={3} placeholder="e.g. 5+ years experience, PMP Certification, Agile methodology" value={jobReqs} onChange={(e) => setJobReqs(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Benefits</label>
                <textarea className="form-input" rows={3} placeholder="Medical Insurance, Flexible Working Model, Appraisals..." value={benefits} onChange={(e) => setBenefits(e.target.value)} />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={(e) => handleCreateJob(e, false)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={14} /> Save as Draft (Unpublished)
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
                >
                  <Globe size={16} /> Publish Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEDICATED eCUBE JOB APPLICANTS MODAL */}
      {selectedModalJob && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
          onClick={closeApplicantsModal}
        >
          <div 
            style={{
              width: '95%',
              maxWidth: '1100px',
              maxHeight: '88vh',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Applicants: {selectedModalJob.title}
                  </h3>
                  <span style={{ padding: '3px 10px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent-primary)', fontSize: '12px', fontWeight: '700' }}>
                    {getJobApplicantsList(selectedModalJob, candidates).length} Candidates
                  </span>
                </div>
                {(selectedModalJob.department || selectedModalJob.location) && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {[selectedModalJob.department, selectedModalJob.location].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {onViewApplicants && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      const jId = selectedModalJob.id;
                      closeApplicantsModal();
                      onViewApplicants(jId);
                    }}
                  >
                    <ExternalLink size={14} /> Open in Applicants Manager
                  </button>
                )}
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '6px' }} 
                  onClick={closeApplicantsModal}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Filter & Search Bar */}
            {(() => {
              const allApps = getJobApplicantsList(selectedModalJob, candidates);
              const stats = getJobApplicantStats(selectedModalJob, candidates);

              const filteredApps = allApps.filter(c => {
                // Filter tab
                if (modalFilterTab === 'immediate7') {
                  const days = getNoticeDays(c);
                  if (days === null || days > 7) return false;
                }
                if (modalFilterTab === 'joiners14') {
                  const days = getNoticeDays(c);
                  if (days === null || days <= 7 || days > 14) return false;
                }
                if (modalFilterTab === 'old') {
                  let candidateDate = null;
                  if (c.createdAt) candidateDate = new Date(c.createdAt);
                  else if (c.appliedDate) candidateDate = new Date(c.appliedDate);
                  else if (c._id && /^[0-9a-fA-F]{24}$/.test(String(c._id))) {
                    candidateDate = new Date(parseInt(String(c._id).substring(0, 8), 16) * 1000);
                  }
                  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
                  if (!candidateDate || isNaN(candidateDate.getTime()) || candidateDate >= fourteenDaysAgo) {
                    return false;
                  }
                }
                // Search query
                if (modalSearchQuery) {
                  const q = modalSearchQuery.toLowerCase();
                  const name = (c.name || '').toLowerCase();
                  const email = (c.email || '').toLowerCase();
                  const skills = Array.isArray(c.skills) ? c.skills.join(' ').toLowerCase() : '';
                  const stage = (c.stage || '').toLowerCase();
                  if (!name.includes(q) && !email.includes(q) && !skills.includes(q) && !stage.includes(q)) {
                    return false;
                  }
                }
                return true;
              });

              return (
                <>
                  <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.01)', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setModalFilterTab('all')}
                        style={{
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: '600',
                          borderRadius: 'var(--radius-md)',
                          background: modalFilterTab === 'all' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                          color: modalFilterTab === 'all' ? '#ffffff' : 'var(--text-secondary)',
                          border: 'none'
                        }}
                      >
                        All Applicants ({stats.total})
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setModalFilterTab('immediate7')}
                        style={{
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: '600',
                          borderRadius: 'var(--radius-md)',
                          background: modalFilterTab === 'immediate7' ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                          color: modalFilterTab === 'immediate7' ? '#ffffff' : 'var(--text-secondary)',
                          border: 'none'
                        }}
                      >
                        ⚡ Immediate (7 days) ({stats.immediate7})
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setModalFilterTab('joiners14')}
                        style={{
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: '600',
                          borderRadius: 'var(--radius-md)',
                          background: modalFilterTab === 'joiners14' ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                          color: modalFilterTab === 'joiners14' ? '#ffffff' : 'var(--text-secondary)',
                          border: 'none'
                        }}
                      >
                        📅 Joiners in 14 days ({stats.joiners14})
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setModalFilterTab('old')}
                        style={{
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: '600',
                          borderRadius: 'var(--radius-md)',
                          background: modalFilterTab === 'old' ? '#94a3b8' : 'rgba(255, 255, 255, 0.05)',
                          color: modalFilterTab === 'old' ? '#ffffff' : 'var(--text-secondary)',
                          border: 'none'
                        }}
                      >
                        📂 Old Applicants ({stats.oldApplicants})
                      </button>
                    </div>

                    <div style={{ position: 'relative', width: '240px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search candidate name..."
                        value={modalSearchQuery}
                        onChange={(e) => setModalSearchQuery(e.target.value)}
                        style={{ paddingLeft: '30px', height: '32px', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  {/* Modal Body Content */}
                  <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px 24px' }}>
                    {filteredApps.length === 0 ? (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Users size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                        <p style={{ margin: 0, fontSize: '14px' }}>No candidate applicants match your search/filter criteria.</p>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                              <th style={{ padding: '10px 16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Candidate</th>
                              <th style={{ padding: '10px 16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'center' }}>ATS Match</th>
                              <th style={{ padding: '10px 16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Stage</th>
                              <th style={{ padding: '10px 16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Notice Period</th>
                              <th style={{ padding: '10px 16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Location</th>
                              <th style={{ padding: '10px 16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Total Experience</th>
                              <th style={{ padding: '10px 16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredApps.map(c => {
                              const score = c.matchScore || c.score || 0;
                              const notice = getCandidateNoticePeriod(c);
                              const loc = getCandidateLocation(c);
                              const exp = getCandidateExperience(c);

                              return (
                                <tr key={c.id || c._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}>
                                  <td style={{ padding: '12px 16px' }}>
                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' }}>{c.name || 'Unnamed Candidate'}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{c.email || 'No Email'}</div>
                                  </td>
                                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                    <span style={{
                                      padding: '3px 10px',
                                      borderRadius: '10px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      background: score >= 80 ? 'rgba(16, 185, 129, 0.2)' : score >= 60 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                      color: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
                                    }}>
                                      {score}%
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 16px' }}>
                                    {onStageChanged ? (
                                      <select
                                        className="form-input"
                                        value={c.stage || 'Inbox'}
                                        onChange={(e) => onStageChanged(c.id || c._id, e.target.value)}
                                        style={{ padding: '3px 8px', height: '28px', fontSize: '11px', width: '110px' }}
                                      >
                                        {STAGES.map(s => (
                                          <option key={s} value={s}>{s}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{c.stage || 'Inbox'}</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                    {notice}
                                  </td>
                                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                    {loc}
                                  </td>
                                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                    {exp}
                                  </td>
                                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                    {onSelectCandidate && (
                                      <button
                                        type="button"
                                        className="btn btn-primary"
                                        style={{ padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                        onClick={() => {
                                          closeApplicantsModal();
                                          onSelectCandidate(c);
                                        }}
                                      >
                                        <Eye size={12} /> View Profile
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Modal Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(255, 255, 255, 0.02)' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '6px 18px', fontSize: '12px' }} 
                onClick={closeApplicantsModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
