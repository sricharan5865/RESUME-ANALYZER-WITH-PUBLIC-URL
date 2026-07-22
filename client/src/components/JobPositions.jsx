import React, { useState } from 'react';
import { Briefcase, Plus, Trash2, Edit2, X, Save, Link, Globe, CheckCircle2 } from 'lucide-react';

export default function JobPositions({ token, jobs, onJobCreated, onJobDeleted, onJobUpdated, backendUrl, currentRole }) {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDept, setJobDept] = useState('');
  const [jobLoc, setJobLoc] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobReqs, setJobReqs] = useState('');
  const [jobPublicDesc, setJobPublicDesc] = useState('');
  const [generatingJD, setGeneratingJD] = useState(false);
  const [jdKeywords, setJdKeywords] = useState('');
  const [editingJobId, setEditingJobId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', department: '', location: '', description: '', requirements: '' });
  const [publishingId, setPublishingId] = useState(null);

  const handleCreateJob = async (e, publishImmediately = true) => {
    if (e) e.preventDefault();
    if (!jobTitle) return alert('Title is required');
    if (!jobPublicDesc) return alert('Public Job Description is required');
    try {
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
          description: jobDesc,
          requirements: jobReqs,
          publicDescription: jobPublicDesc,
          publishToCareers: publishImmediately
        })
      });

      if (!res.ok) throw new Error('Failed to create job');
      const newJob = await res.json();
      onJobCreated(newJob);
      
      setJobTitle('');
      setJobDept('');
      setJobLoc('');
      setJobDesc('');
      setJobReqs('');
      setJobPublicDesc('');

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
      department: job.department || '',
      location: job.location || '',
      description: job.description || '',
      requirements: job.requirements || '',
      publicDescription: job.publicDescription || ''
    });
  };

  const cancelEditing = () => {
    setEditingJobId(null);
  };

  const handleUpdateJob = async (e, id) => {
    e.preventDefault();
    if (!editForm.title) return alert('Title is required');
    if (!editForm.publicDescription) return alert('Public Job Description is required');
    try {
      const res = await fetch(`${backendUrl}/api/jobs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
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

  const handleTogglePosting = async (job, platform) => {
    const currentPostings = job.postings || { linkedIn: false, indeed: false, zipRecruiter: false, internalCareer: false };
    const updatedPostings = {
      ...currentPostings,
      [platform]: !currentPostings[platform]
    };
    try {
      const res = await fetch(`${backendUrl}/api/jobs/${job.id}/postings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postings: updatedPostings })
      });
      if (!res.ok) throw new Error('Failed to update postings');
      const updatedJob = await res.json();
      onJobUpdated(updatedJob);
    } catch (e) {
      console.error(e);
      alert('Failed to update posting status.');
    }
  };

  return (
    <div style={{ padding: '0px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <header style={{ marginBottom: '12px', flexShrink: 0 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Manage the job descriptions used by the AI engine to calculate candidate match scores.</p>
      </header>

      <div style={{ flexGrow: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingRight: '12px' }}>
          
          {/* List active jobs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Active Positions ({jobs.length})</h4>
            {jobs.length === 0 ? (
              <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active job postings. Create one below to begin matching.
              </div>
            ) : (
              jobs.map(job => (
                <div key={job.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)' }}>
                  
                  {editingJobId === job.id ? (
                    <form onSubmit={(e) => handleUpdateJob(e, job.id)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '600' }}>Edit Position</h4>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="button" className="btn btn-secondary" style={{ padding: '6px' }} onClick={cancelEditing}>
                            <X size={14} /> Cancel
                          </button>
                          <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px' }}>
                            <Save size={14} /> Save
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                          <label className="form-label">Job Title*</label>
                          <input type="text" className="form-input" value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Department</label>
                          <input type="text" className="form-input" value={editForm.department} onChange={(e) => setEditForm({...editForm, department: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Location</label>
                          <input type="text" className="form-input" value={editForm.location} onChange={(e) => setEditForm({...editForm, location: e.target.value})} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Job Description Summary*</label>
                        <textarea className="form-input" rows={6} value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Requirements Criteria*</label>
                        <textarea className="form-input" rows={8} value={editForm.requirements} onChange={(e) => setEditForm({...editForm, requirements: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Public Job Description (For Candidates)*</label>
                        <textarea className="form-input" rows={8} value={editForm.publicDescription || ''} onChange={(e) => setEditForm({...editForm, publicDescription: e.target.value})} placeholder="Enter the description to be displayed on the public careers portal..." />
                      </div>
                    </form>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ fontSize: '15px', fontWeight: '600' }}>{job.title}</h4>
                          { (job.department || job.location) && (
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {[job.department, job.location].filter(Boolean).join(' • ')}
                            </p>
                          )}
                        </div>
                        {currentRole !== 'Hiring Manager' && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              className={`btn ${job.publishToCareers ? 'btn-secondary' : 'btn-primary'}`}
                              disabled={publishingId === job.id}
                              onClick={() => handlePublishJob(job)}
                              style={{
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: '600',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: job.publishToCareers ? 'rgba(16, 185, 129, 0.15)' : 'var(--accent-primary)',
                                color: job.publishToCareers ? '#10b981' : '#ffffff',
                                border: job.publishToCareers ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer'
                              }}
                              title={job.publishToCareers ? "Click to unpublish position" : "Publish position to careers portal"}
                            >
                              {publishingId === job.id ? (
                                'Updating...'
                              ) : job.publishToCareers ? (
                                <>
                                  <CheckCircle2 size={14} /> Published
                                </>
                              ) : (
                                <>
                                  <Globe size={14} /> Publish Position
                                </>
                              )}
                            </button>

                            <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => {
                              const link = `${window.location.origin}/apply/${job.id}`;
                              navigator.clipboard.writeText(link);
                              alert(`Application link copied to clipboard!\n${link}`);
                            }} title="Copy Public Apply Link">
                              <Link size={14} />
                            </button>
                            <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => startEditing(job)} title="Edit Position">
                              <Edit2 size={14} />
                            </button>
                            <button className="btn btn-danger" style={{ padding: '6px' }} onClick={() => handleDeleteJob(job.id)} title="Delete Position">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      

                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add Job Form */}
          {currentRole !== 'Hiring Manager' && (
            <form onSubmit={handleCreateJob} style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontSize: '15px' }}>Add New Position</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Job Title*</label>
                  <input type="text" className="form-input" placeholder="e.g. Node Backend Engineer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input type="text" className="form-input" placeholder="e.g. Engineering" value={jobDept} onChange={(e) => setJobDept(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input type="text" className="form-input" placeholder="e.g. Remote / Hyderabad" value={jobLoc} onChange={(e) => setJobLoc(e.target.value)} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">AI Generator Keywords / Core Skills</label>
                  <input type="text" className="form-input" placeholder="e.g. 5 years Experience, Microservices, AWS" value={jdKeywords} onChange={(e) => setJdKeywords(e.target.value)} />
                </div>
                <button type="button" className="btn btn-secondary" onClick={handleGenerateJD} disabled={generatingJD} style={{ height: '38px', padding: '0 20px' }}>
                  {generatingJD ? 'Generating...' : 'Generate JD with AI'}
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Job Description Summary*</label>
                <textarea className="form-input" rows={6} placeholder="Describe the role responsibilities..." value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Requirements Criteria* (One per line or comma-separated)</label>
                <textarea className="form-input" rows={8} placeholder="e.g. React.js, Node.js, 3+ years of experience, Docker, AWS..." value={jobReqs} onChange={(e) => setJobReqs(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Public Job Description (For Candidates)*</label>
                <textarea className="form-input" rows={8} placeholder="Enter the description to be displayed on the public careers portal..." value={jobPublicDesc} onChange={(e) => setJobPublicDesc(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: '600' }}
                >
                  <Globe size={16} /> Publish Position
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={(e) => handleCreateJob(e, false)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
                >
                  <Plus size={14} /> Save as Draft (Unpublished)
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
