import React, { useState, useEffect, useRef } from 'react';
import { X, Briefcase, Mail, Phone, GraduationCap, Building2, Calendar, Sparkles, Check, CheckCircle2, XCircle, AlertCircle, Send, ArrowRight, Tag, Trash2, Eye, FileText, DollarSign, Clock, UserCheck, Download } from 'lucide-react';

const getQuestionStyles = (importance) => {
  const imp = (importance || '').toUpperCase();
  switch (imp) {
    case 'MUST ASK':
      return {
        badgeText: '🔴 MUST ASK',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        badgeColor: '#f87171',
        badgeBorder: '1px solid rgba(239, 68, 68, 0.25)',
        cardBg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.01) 100%)',
        cardBorder: '1px solid rgba(239, 68, 68, 0.35)',
        indicatorColor: '#ef4444',
        shadow: '0 0 12px rgba(239, 68, 68, 0.05)'
      };
    case 'VERY IMPORTANT':
      return {
        badgeText: '🔴 VERY IMPORTANT',
        badgeBg: 'rgba(244, 63, 94, 0.15)',
        badgeColor: '#fb7185',
        badgeBorder: '1px solid rgba(244, 63, 94, 0.25)',
        cardBg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.05) 0%, rgba(244, 63, 94, 0.01) 100%)',
        cardBorder: '1px solid rgba(244, 63, 94, 0.35)',
        indicatorColor: '#f43f5e',
        shadow: '0 0 12px rgba(244, 63, 94, 0.05)'
      };
    case 'IMPORTANT':
      return {
        badgeText: '🟠 IMPORTANT',
        badgeBg: 'rgba(249, 115, 22, 0.15)',
        badgeColor: '#fdba74',
        badgeBorder: '1px solid rgba(249, 115, 22, 0.25)',
        cardBg: 'linear-gradient(135deg, rgba(249, 115, 22, 0.04) 0%, rgba(249, 115, 22, 0.01) 100%)',
        cardBorder: '1px solid rgba(249, 115, 22, 0.3)',
        indicatorColor: '#f97316',
        shadow: 'none'
      };
    case 'GOOD TO ASK':
      return {
        badgeText: '🟡 GOOD TO ASK',
        badgeBg: 'rgba(234, 179, 8, 0.15)',
        badgeColor: '#fef08a',
        badgeBorder: '1px solid rgba(234, 179, 8, 0.2)',
        cardBg: 'linear-gradient(135deg, rgba(234, 179, 8, 0.03) 0%, rgba(234, 179, 8, 0.01) 100%)',
        cardBorder: '1px solid rgba(234, 179, 8, 0.25)',
        indicatorColor: '#eab308',
        shadow: 'none'
      };
    case 'SCREENING':
      return {
        badgeText: '🔵 SCREENING',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        badgeColor: '#93c5fd',
        badgeBorder: '1px solid rgba(59, 130, 246, 0.25)',
        cardBg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.01) 100%)',
        cardBorder: '1px solid rgba(59, 130, 246, 0.35)',
        indicatorColor: '#3b82f6',
        shadow: '0 0 12px rgba(59, 130, 246, 0.05)'
      };
    case 'OPTIONAL':
    default:
      return {
        badgeText: '🟢 OPTIONAL',
        badgeBg: 'rgba(34, 197, 94, 0.12)',
        badgeColor: '#86efac',
        badgeBorder: '1px solid rgba(34, 197, 94, 0.15)',
        cardBg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.02) 0%, rgba(34, 197, 94, 0.005) 100%)',
        cardBorder: '1px solid rgba(34, 197, 94, 0.2)',
        indicatorColor: '#22c55e',
        shadow: 'none'
      };
  }
};

export default function CandidateDetails({ candidate: propCandidate, job, jobs = [], onClose, onOpenEmailModal, onOpenOfferModal, onStageChanged, onCandidateDeleted, onCandidateUpdated, backendUrl, rankAccordingToJob, currentRole, token }) {
  const [candidate, setCandidate] = useState(() => {
    const cid = propCandidate?.id || propCandidate?.candidateId;
    return propCandidate ? { ...propCandidate, id: cid } : null;
  });
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [similarCandidates, setSimilarCandidates] = useState([]);

  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editedAnswers, setEditedAnswers] = useState({});
  const [savingMetadata, setSavingMetadata] = useState(false);

  const [changingPosition, setChangingPosition] = useState(false);
  const [positionSuccessMsg, setPositionSuccessMsg] = useState('');

  const handlePositionChange = async (e) => {
    const newJobId = e.target.value;
    const oldJobId = candidate.jobId;
    if ((!oldJobId && !newJobId) || oldJobId === newJobId) return;

    setChangingPosition(true);
    setPositionSuccessMsg('');
    try {
      const res = await fetch(`${backendUrl}/api/candidates/${candidate.id}/position`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId: newJobId || null })
      });

      if (!res.ok) {
        throw new Error('Server rejected position change');
      }

      const data = await res.json();
      setCandidate(data.candidate);
      if (typeof onCandidateUpdated === 'function') {
        onCandidateUpdated(data.candidate);
      }

      const selectedJob = jobs.find(j => j.id === newJobId);
      const title = selectedJob ? selectedJob.title : 'General Role';
      if (data.emailSent) {
        setPositionSuccessMsg(`Position updated to "${title}" (Automatic email sent to ${data.candidate?.email || 'candidate'})`);
      } else {
        const reason = data.emailReason || 'Check email configuration in Settings';
        setPositionSuccessMsg(`Position updated to "${title}". Warning: Email not sent (${reason})`);
      }
      setTimeout(() => setPositionSuccessMsg(''), 7000);
    } catch (err) {
      console.error('Failed to change candidate position:', err);
      alert(err.message || 'Failed to update candidate position');
    } finally {
      setChangingPosition(false);
    }
  };

  // Gather all submitted form answer labels & job custom fields
  const submittedAnswers = candidate?.extractedData?.formAnswers || [];
  const customFormFields = (job?.customFields || []).filter(f => 
    !['Upload CV', 'CV Upload', 'Upload Resume', 'Resume'].includes(f.label)
  );

  const combinedLabels = new Set();
  const fieldsToRender = [];

  // 1. Add fields configured for the job
  customFormFields.forEach(f => {
    combinedLabels.add(f.label);
    fieldsToRender.push({ id: f.id || f.label, label: f.label, fieldType: f.fieldType || 'ShortText' });
  });

  // 2. Add any submitted form answers that weren't in job customFields
  submittedAnswers.forEach(ans => {
    if (ans.label && !combinedLabels.has(ans.label) && !['Upload CV', 'CV Upload', 'Upload Resume', 'Resume'].includes(ans.label)) {
      combinedLabels.add(ans.label);
      fieldsToRender.push({ id: ans.label, label: ans.label, fieldType: 'ShortText' });
    }
  });

  // 3. Fallback defaults if no custom fields or answers exist yet
  if (fieldsToRender.length === 0) {
    fieldsToRender.push(
      { id: 'loc', label: 'Location', fieldType: 'ShortText' },
      { id: 'exp', label: 'Experience', fieldType: 'ShortText' },
      { id: 'cctc', label: 'Current CTC', fieldType: 'ShortText' },
      { id: 'ectc', label: 'Expected CTC', fieldType: 'ShortText' },
      { id: 'not', label: 'Notice Period', fieldType: 'ShortText' }
    );
  }

  useEffect(() => {
    if (candidate) {
      const initialAnswers = {};
      
      // 1. Gather any existing answers from candidate.extractedData.formAnswers
      const existingAnswers = candidate.extractedData?.formAnswers || [];
      existingAnswers.forEach(ans => {
        if (ans && ans.label) {
          initialAnswers[ans.label] = ans.value;
        }
      });

      // Helper for fuzzy finding in existingAnswers array
      const findFormAnswer = (keywords) => {
        const found = existingAnswers.find(a => a?.label && keywords.some(kw => a.label.toLowerCase().includes(kw)));
        return found ? found.value : null;
      };

      // 2. Fallbacks from top level extracted data
      if (candidate.extractedData?.currentLocation) {
        initialAnswers['Location'] = initialAnswers['Location'] || candidate.extractedData.currentLocation;
        initialAnswers['Current Location'] = initialAnswers['Current Location'] || candidate.extractedData.currentLocation;
      }
      if (candidate.extractedData?.totalYearsExperience) {
        initialAnswers['Experience'] = initialAnswers['Experience'] || candidate.extractedData.totalYearsExperience;
        initialAnswers['Total Experience (years)'] = initialAnswers['Total Experience (years)'] || candidate.extractedData.totalYearsExperience;
        initialAnswers['Total Years of Experience'] = initialAnswers['Total Years of Experience'] || candidate.extractedData.totalYearsExperience;
      }
      if (candidate.extractedData?.noticePeriod) {
        initialAnswers['Notice Period'] = initialAnswers['Notice Period'] || candidate.extractedData.noticePeriod;
      }

      // Name breakdown helper
      const fullCandidateName = (candidate.name && candidate.name !== 'Unknown Candidate' && candidate.name !== 'Unknown') ? candidate.name.trim() : '';
      const nameParts = fullCandidateName ? fullCandidateName.split(/\s+/) : [];
      const firstNameVal = nameParts[0] || '';
      const lastNameVal = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Education summary helper
      let educationVal = '';
      if (candidate.education && Array.isArray(candidate.education) && candidate.education.length > 0) {
        const primaryEdu = candidate.education[0];
        if (typeof primaryEdu === 'string') {
          educationVal = primaryEdu;
        } else if (primaryEdu) {
          const deg = primaryEdu.degree || '';
          const inst = primaryEdu.institution || primaryEdu.school || '';
          educationVal = [deg, inst].filter(Boolean).join(' - ');
        }
      }

      // 3. Dynamic match of job custom fields against parsed candidate properties
      fieldsToRender.forEach(f => {
        const label = f.label;
        if (initialAnswers[label] === undefined || initialAnswers[label] === null || initialAnswers[label] === '') {
          const lowerLabel = label.toLowerCase();
          
          if (lowerLabel.includes('first name')) {
            initialAnswers[label] = findFormAnswer(['first name']) || firstNameVal;
          } else if (lowerLabel.includes('last name')) {
            initialAnswers[label] = findFormAnswer(['last name']) || lastNameVal;
          } else if (lowerLabel === 'name' || lowerLabel.includes('full name') || lowerLabel.includes('candidate name')) {
            initialAnswers[label] = findFormAnswer(['full name', 'candidate name', 'name']) || fullCandidateName;
          } else if (lowerLabel.includes('email')) {
            initialAnswers[label] = findFormAnswer(['email']) || candidate.email || '';
          } else if (lowerLabel.includes('phone') || lowerLabel.includes('mobile') || lowerLabel.includes('contact')) {
            initialAnswers[label] = findFormAnswer(['phone', 'mobile', 'contact']) || candidate.phone || '';
          } else if (lowerLabel.includes('linkedin')) {
            initialAnswers[label] = findFormAnswer(['linkedin']) || candidate.linkedinUrl || '';
          } else if (lowerLabel.includes('skills')) {
            initialAnswers[label] = findFormAnswer(['skill']) || (candidate.skills || []).join(', ');
          } else if (lowerLabel.includes('location')) {
            initialAnswers[label] = findFormAnswer(['location']) || candidate.extractedData?.currentLocation || candidate.location || '';
          } else if (lowerLabel.includes('experience')) {
            initialAnswers[label] = findFormAnswer(['experience']) || candidate.extractedData?.totalYearsExperience || '';
          } else if (lowerLabel.includes('notice') || lowerLabel.includes('joining') || lowerLabel.includes('available')) {
            initialAnswers[label] = findFormAnswer(['notice', 'joining', 'available']) || candidate.extractedData?.noticePeriod || '';
          } else if (lowerLabel.includes('education') || lowerLabel.includes('degree') || lowerLabel.includes('qualification')) {
            initialAnswers[label] = findFormAnswer(['education', 'qualification', 'degree']) || educationVal;
          } else {
            initialAnswers[label] = findFormAnswer([lowerLabel]) || '';
          }
        }
      });

      setEditedAnswers(initialAnswers);
    }
  }, [candidate?.id, candidate?.extractedData, job?.customFields]);

  const handleSaveMetadata = async () => {
    setSavingMetadata(true);
    try {
      const formAnswers = Object.entries(editedAnswers).map(([label, value]) => ({ label, value }));

      const locationKey = Object.keys(editedAnswers).find(k => k.toLowerCase().includes('location')) || 'Current Location';
      const experienceKey = Object.keys(editedAnswers).find(k => k.toLowerCase().includes('experience')) || 'Total Years of Experience';
      const noticeKey = Object.keys(editedAnswers).find(k => k.toLowerCase().includes('notice')) || 'Notice Period';
      const currentCtcKey = Object.keys(editedAnswers).find(k => k.toLowerCase().includes('current ctc') || k.toLowerCase() === 'ctc') || 'Current CTC';
      const expectedCtcKey = Object.keys(editedAnswers).find(k => k.toLowerCase().includes('expected ctc')) || 'Expected CTC';

      const res = await fetch(`${backendUrl}/api/candidates/${candidate.id}/extracted-data`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentLocation: editedAnswers[locationKey] || '',
          totalYearsExperience: editedAnswers[experienceKey] || '',
          noticePeriod: editedAnswers[noticeKey] || '',
          currentCtc: editedAnswers[currentCtcKey] || candidate.currentCtc || '',
          expectedCtc: editedAnswers[expectedCtcKey] || candidate.expectedCtc || '',
          formAnswers: formAnswers
        })
      });

      if (!res.ok) throw new Error('Failed to update candidate details');
      const updatedCandidate = await res.json();
      
      setCandidate(updatedCandidate);
      if (onCandidateUpdated) {
        onCandidateUpdated(updatedCandidate);
      }
      setIsEditingMetadata(false);
    } catch (e) {
      console.error(e);
      alert('Error updating details: ' + e.message);
    } finally {
      setSavingMetadata(false);
    }
  };

  useEffect(() => {
    if (!propCandidate) return;
    const cid = propCandidate.id || propCandidate.candidateId;
    const isSparse = !propCandidate.experience || propCandidate.experience.length === 0 || !propCandidate.resumeText;
    
    if (cid && isSparse) {
      setLoadingDetails(true);
      fetch(`${backendUrl}/api/candidates/${cid}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Failed to fetch full candidate profile');
        })
        .then(data => {
          setCandidate({
            ...data,
            jdQuestions: propCandidate.jdQuestions || data.jdQuestions,
            jdTitle: propCandidate.jdTitle || data.jdTitle,
            jdRequirements: propCandidate.jdRequirements || data.jdRequirements,
            jdDescription: propCandidate.jdDescription || data.jdDescription,
            matchScore: propCandidate.matchScore !== undefined ? propCandidate.matchScore : data.matchScore,
            matchExplanation: propCandidate.matchExplanation || data.matchExplanation,
            matchingSkills: propCandidate.matchingSkills || data.matchingSkills,
            missingSkills: propCandidate.missingSkills || data.missingSkills
          });
        })
        .catch(err => {
          console.error('Error fetching full candidate profile:', err);
          setCandidate({ ...propCandidate, id: cid });
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    } else {
      setCandidate({ ...propCandidate, id: cid });
    }
  }, [propCandidate, backendUrl, token]);

  const hasPdf = candidate?.resumeUrl || (window.localResumeUrls && window.localResumeUrls[candidate?.id]);
  const [rightTab, setRightTab] = useState(hasPdf ? 'pdf' : 'text');
  const [qaSubTab, setQaSubTab] = useState(candidate?.hrQuestions && candidate?.hrQuestions.length > 0 ? 'hr' : 'tech');
  const [managers, setManagers] = useState([]);
  const [assignedManager, setAssignedManager] = useState(candidate?.assignedTo || '');
  const [loadingJdQuestions, setLoadingJdQuestions] = useState(false);
  const reScoreLockRef = useRef(null);

  useEffect(() => {
    if (!candidate) return;
    const hasPdfNow = candidate.resumeUrl || (window.localResumeUrls && window.localResumeUrls[candidate.id]);
    setRightTab(hasPdfNow ? 'pdf' : 'text');
    setQaSubTab(candidate.hrQuestions && candidate.hrQuestions.length > 0 ? 'hr' : 'tech');
  }, [candidate?.id, candidate?.resumeUrl]);

  // Auto re-score on details open if details are empty
  useEffect(() => {
    if (candidate?.id) {
      fetch(`${backendUrl}/api/candidates/${candidate.id}/similar?limit=3`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(data => {
         if (Array.isArray(data)) setSimilarCandidates(data);
      })
      .catch(err => console.error("Failed to load similar candidates", err));
    }
  }, [candidate?.id, backendUrl, token]);

  useEffect(() => {
    if (!candidate) return;
    if (reScoreLockRef.current === candidate.id) return;
    
    // Only re-score if we have loaded a non-sparse candidate profile
    const isSparse = !candidate.experience || candidate.experience.length === 0 || !candidate.resumeText;
    if (isSparse) return;

    const checkAndReScore = async () => {
      const hasNoScore = !candidate.ownCategoryExplanation || candidate.ownCategoryExplanation.trim().length === 0;
      if (hasNoScore) {
        reScoreLockRef.current = candidate.id;
        console.log('Competency details missing. Triggering auto re-score...');
        try {
          const res = await fetch(`${backendUrl}/api/candidates/${candidate.id}/re-score`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const updatedCandidate = await res.json();
            setCandidate(prev => ({
              ...updatedCandidate,
              jdQuestions: prev?.jdQuestions,
              jdTitle: prev?.jdTitle,
              matchScore: prev?.matchScore,
              matchExplanation: prev?.matchExplanation,
              matchingSkills: prev?.matchingSkills,
              missingSkills: prev?.missingSkills
            }));
            // Propagate stage or metadata changes if needed
            if (onStageChanged) {
              onStageChanged(updatedCandidate.id, updatedCandidate.stage);
            }
          }
        } catch (e) {
          console.error('Auto re-score failed:', e);
        }
      }
    };
    checkAndReScore();
  }, [candidate?.id, candidate?.experience, candidate?.resumeText]);

  useEffect(() => {
    if (currentRole !== 'Hiring Manager') {
      fetchManagers();
    }
  }, [currentRole]);

  const fetchManagers = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/auth/managers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setManagers(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch managers:', e);
    }
  };

  if (!candidate) return null;

  const handleGenerateJdQuestions = async () => {
    const activeJdTitle = job?.title || candidate.jdTitle || 'Role';
    const activeJdRequirements = job?.requirements || candidate.jdRequirements || '';
    const activeJdDescription = job?.description || candidate.jdDescription || '';
    
    setLoadingJdQuestions(true);
    try {
      const res = await fetch(`${backendUrl}/api/candidates/${candidate.id}/generate-jd-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jdTitle: activeJdTitle,
          jdRequirements: activeJdRequirements,
          jdDescription: activeJdDescription
        })
      });
      if (res.ok) {
        const questionsResult = await res.json();
        setCandidate(prev => ({
          ...prev,
          jdQuestions: questionsResult,
          hrQuestions: questionsResult.hrQuestions || [],
          technicalQuestions: questionsResult.technicalQuestions || []
        }));
      } else {
        console.error('Failed to generate JD questions:', res.statusText);
      }
    } catch (err) {
      console.error('Failed to generate JD questions:', err);
    } finally {
      setLoadingJdQuestions(false);
    }
  };

  const handleAssignManager = async (e) => {
    const managerEmail = e.target.value;
    setAssignedManager(managerEmail);
    try {
      const res = await fetch(`${backendUrl}/api/candidates/${candidate.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ managerEmail })
      });
      if (!res.ok) throw new Error('Failed to assign manager');
    } catch (err) {
      console.error(err);
      alert('Failed to assign hiring manager');
    }
  };

  const parseDateString = (str) => {
    if (!str) return null;
    const clean = str.trim().toLowerCase();
    if (
      clean.includes('present') || 
      clean.includes('current') || 
      clean.includes('now') || 
      clean.includes('date') || 
      clean.includes('ongoing') || 
      clean.includes('today')
    ) {
      return new Date();
    }

    // 1. Try matching numeric format like MM/YY, MM/YYYY, MM.YY, etc.
    const numericDateMatch = clean.match(/\b(0?[1-9]|1[0-2])[-.\/\s']+(\d{2,4})\b/);
    if (numericDateMatch) {
      const month = parseInt(numericDateMatch[1], 10) - 1;
      const yearText = numericDateMatch[2];
      let year = parseInt(yearText, 10);
      if (yearText.length === 2) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }
      return new Date(year, month, 1);
    }

    // 2. Try matching month names and years
    const monthMap = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11
    };

    let month = 0;
    for (const [key, val] of Object.entries(monthMap)) {
      if (clean.includes(key)) {
        month = val;
        break;
      }
    }

    // Look for 4-digit year
    const yearMatch = clean.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      return new Date(parseInt(yearMatch[0], 10), month, 1);
    }

    // Look for 2-digit year (preceded by space, quote, or boundary)
    const twoDigitYearMatch = clean.match(/(?:\s+|'|\b)(\d{2})\b/);
    if (twoDigitYearMatch) {
      let year = parseInt(twoDigitYearMatch[1], 10);
      year = year < 50 ? 2000 + year : 1900 + year;
      return new Date(year, month, 1);
    }

    return null;
  };

  // Parse experience ranges
  const experiences = candidate.experience || [];
  const parsedJobs = experiences
    .map(exp => {
      const duration = exp.duration || '';
      const parts = duration.split(/\s*(?:-|-|–|—|to)\s*/i);
      if (parts.length === 0) return null;
      const start = parseDateString(parts[0]);
      const end = parts.length > 1 ? parseDateString(parts[1]) : start;
      if (!start || !end) return null;
      return {
        role: exp.role,
        company: exp.company,
        start,
        end
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);

  // Calculate total experience duration
  let totalMs = 0;
  parsedJobs.forEach(job => {
    const diff = job.end - job.start;
    // Add 1 month to include start month in duration
    totalMs += diff + (30.4375 * 24 * 60 * 60 * 1000);
  });

  const totalMonths = Math.round(totalMs / (30.4375 * 24 * 60 * 60 * 1000));
  const expYears = Math.floor(totalMonths / 12);
  const expMonths = totalMonths % 12;

  let totalExpString = '';
  if (expYears > 0) {
    totalExpString += `${expYears} yr${expYears > 1 ? 's' : ''} `;
  }
  if (expMonths > 0 || totalExpString === '') {
    totalExpString += `${expMonths} mo${expMonths > 1 ? 's' : ''}`;
  }

  // Calculate gaps between successive experiences
  const gaps = [];
  for (let i = 0; i < parsedJobs.length - 1; i++) {
    const currentJob = parsedJobs[i];
    const nextJob = parsedJobs[i + 1];

    if (nextJob.start > currentJob.end) {
      const gapMs = nextJob.start - currentJob.end;
      const gapMonthsFloat = gapMs / (30.4375 * 24 * 60 * 60 * 1000);
      const gapMonths = Math.round(gapMonthsFloat) - 1;

      if (gapMonths >= 1) {
        const gapYears = Math.floor(gapMonths / 12);
        const remainingMonths = gapMonths % 12;
        let gapDurationStr = '';
        if (gapYears > 0) {
          gapDurationStr += `${gapYears} yr${gapYears > 1 ? 's' : ''} `;
        }
        if (remainingMonths > 0) {
          gapDurationStr += `${remainingMonths} mo${remainingMonths > 1 ? 's' : ''}`;
        }

        const formatMonthYear = (date) => {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${months[date.getMonth()]} ${date.getFullYear()}`;
        };

        gaps.push(`${gapDurationStr.trim()} between "${currentJob.role}" and "${nextJob.role}" (${formatMonthYear(currentJob.end)} – ${formatMonthYear(nextJob.start)})`);
      }
    }
  }


  // Dynamically select parameters based on active ranking mode
  // If the candidate is not assigned to a specific job (General Role), always show their profile competency analysis.
  const isGeneralRole = !candidate.jobId || !job;
  const useJobMatch = !isGeneralRole || !!candidate.jdQuestions;

  const score = useJobMatch 
    ? candidate.matchScore 
    : (candidate.ownCategoryScore > 0 
        ? candidate.ownCategoryScore 
        : (candidate.matchScore || 0));

  const reasoning = useJobMatch 
    ? candidate.matchExplanation 
    : (candidate.ownCategoryExplanation && candidate.ownCategoryExplanation.trim().length > 0 
        ? candidate.ownCategoryExplanation 
        : (candidate.matchExplanation || 'No evaluation details generated.'));

  const matchingSkills = useJobMatch 
    ? candidate.matchingSkills 
    : (candidate.ownCategoryMatchingSkills && candidate.ownCategoryMatchingSkills.length > 0 
        ? candidate.ownCategoryMatchingSkills 
        : (candidate.matchingSkills || []));

  const missingSkills = useJobMatch 
    ? candidate.missingSkills 
    : (candidate.ownCategoryMissingSkills && candidate.ownCategoryMissingSkills.length > 0 
        ? candidate.ownCategoryMissingSkills 
        : (candidate.missingSkills || []));

  const scoreColorClass = score >= 80 ? 'score-high' : score >= 50 ? 'score-medium' : 'score-low';

  // Comprehensive aggregation of ALL skills belonging to the candidate
  const allCandidateSkills = (() => {
    const skillSet = new Set();
    const addSkill = (s) => {
      if (!s || typeof s !== 'string') return;
      const clean = s.includes(':') ? s.split(':')[1] : s;
      clean.split(/[,;\n•·|]/).forEach(item => {
        const trimmed = item.trim();
        if (trimmed && trimmed.length > 1) {
          const formatted = (trimmed.length > 2 && trimmed === trimmed.toLowerCase())
            ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
            : trimmed;
          skillSet.add(formatted);
        }
      });
    };

    if (Array.isArray(candidate?.skills)) candidate.skills.forEach(addSkill);
    else if (typeof candidate?.skills === 'string') addSkill(candidate.skills);

    if (Array.isArray(candidate?.extractedData?.skills)) {
      candidate.extractedData.skills.forEach(addSkill);
    } else if (typeof candidate?.extractedData?.skills === 'string') {
      addSkill(candidate.extractedData.skills);
    }

    if (Array.isArray(candidate?.extractedData?.technical_depth_audit)) {
      candidate.extractedData.technical_depth_audit.forEach(item => {
        if (item?.skill) addSkill(item.skill);
        if (item?.topic) addSkill(item.topic);
      });
    }

    (candidate?.matchingSkills || []).forEach(addSkill);
    (candidate?.ownCategoryMatchingSkills || []).forEach(addSkill);

    if (Array.isArray(candidate?.tags)) {
      candidate.tags.forEach(t => { if (t?.value) addSkill(t.value); });
    }

    if (Array.isArray(candidate?.projects)) {
      candidate.projects.forEach(p => {
        (p.matchingSkills || []).forEach(addSkill);
        (p.skills || []).forEach(addSkill);
      });
    }

    return Array.from(skillSet);
  })();

  const handleStageSelect = async (e) => {
    const newStage = e.target.value;
    const oldStage = candidate.stage;
    if (oldStage && oldStage.toLowerCase() === newStage.toLowerCase()) {
      return;
    }
    if (newStage.toLowerCase() === 'offered' && onOpenOfferModal) {
      onOpenOfferModal(candidate);
      return;
    }
    try {
      onStageChanged(candidate.id, newStage);
      const res = await fetch(`${backendUrl}/api/candidates/${candidate.id}/stage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stage: newStage })
      });
      if (!res.ok) {
        throw new Error('Server rejected stage update');
      }
    } catch (err) {
      console.error('Failed to update candidate stage:', err);
      onStageChanged(candidate.id, oldStage);
      alert(`Failed to update candidate stage on server. Reverting to original stage.`);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!window.confirm(`Are you sure you want to delete candidate "${candidate.name}"?`)) return;
    if (!window.confirm(`Are you absolutely sure? This will permanently delete candidate "${candidate.name}" from the system and cannot be undone.`)) return;
    try {
      const res = await fetch(`${backendUrl}/api/candidates/${candidate.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete candidate');
      }
      onCandidateDeleted(candidate.id);
    } catch (e) {
      console.error(e);
      alert(e.message || 'Error deleting candidate');
    }
  };

  const renderResumeContent = () => {
    if (!candidate.resumeUrl && !(window.localResumeUrls && window.localResumeUrls[candidate.id])) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
          No Resume Available
        </div>
      );
    }

    const getFileType = () => {
      if (candidate.resumeUrl) {
        const parts = candidate.resumeUrl.split('?')[0].split('/');
        const filename = parts[parts.length - 1];
        if (filename.includes('.')) {
          return filename.split('.').pop().toLowerCase();
        }
      }
      const localUrl = window.localResumeUrls && window.localResumeUrls[candidate.id];
      if (localUrl && !localUrl.startsWith('blob:')) {
        const parts = localUrl.split('?')[0].split('/');
        const filename = parts[parts.length - 1];
        if (filename.includes('.')) {
          return filename.split('.').pop().toLowerCase();
        }
      }
      return '';
    };

    const resumeSrc = (window.localResumeUrls && window.localResumeUrls[candidate.id]) 
      ? window.localResumeUrls[candidate.id]
      : `${backendUrl}${candidate.resumeUrl}`;
    const ext = getFileType();

    if (ext === 'pdf') {
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
          <iframe 
            src={`${resumeSrc}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&view=FitH`} 
            className="pdf-viewer" 
            title="Resume PDF Viewer"
            style={{ border: 'none', width: '100%', height: '100%' }}
          />
        </div>
      );
    } else if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp'].includes(ext)) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', height: '100%', overflowY: 'auto', padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
          <img src={resumeSrc} alt="Original Resume" style={{ maxWidth: '100%', height: 'auto', borderRadius: 'var(--radius-sm)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
        </div>
      );
    } else {
      return (
        <iframe 
          src={`${backendUrl}/api/candidates/${candidate.id}/resume-html?token=${token}`} 
          className="pdf-viewer" 
          title="Resume Viewer"
        />
      );
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="glass drawer-content" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* Drawer Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Candidate Profile</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Assigned to: <strong style={{ color: 'var(--text-primary)' }}>{job ? job.title : 'General Role'}</strong>
            </span>
            {positionSuccessMsg && (
              <div style={{ 
                marginTop: '6px', 
                fontSize: '12px', 
                color: positionSuccessMsg.includes('Warning') || positionSuccessMsg.includes('not sent') ? '#f59e0b' : '#10b981', 
                fontWeight: '600' 
              }}>
                {positionSuccessMsg.includes('Warning') ? '⚠️ ' : '✓ '}{positionSuccessMsg}
              </div>
            )}
          </div>
          <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Split View Container */}
        <div className="split-view-container">
          
          {/* Left Column: Details */}
          <div className="split-view-left">
          
          {/* Top Profile Summary Card */}
          <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
            <div>
              <h2 style={{ fontSize: '22px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {candidate.name}
                <span className="tag-badge tag-seniority" style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', fontWeight: '600' }}>
                  {candidate.seniorityLevel || 'Mid'}
                </span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={12} /> {candidate.email || editedAnswers['Email'] || editedAnswers['Email Address'] || editedAnswers['E-mail'] || 'No email specified'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={12} /> {candidate.phone || editedAnswers['Phone Number'] || editedAnswers['Phone'] || editedAnswers['Contact Number'] || editedAnswers['Contact'] || editedAnswers['Mobile'] || 'No phone specified'}
                </span>
                {candidate.linkedinUrl && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0077b5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                      <rect x="2" y="9" width="4" height="12"></rect>
                      <circle cx="4" cy="4" r="2"></circle>
                    </svg>
                    <a 
                      href={candidate.linkedinUrl.startsWith('http') ? candidate.linkedinUrl : `https://${candidate.linkedinUrl}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{ color: 'var(--accent-primary)', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}
                    >
                      {candidate.linkedinUrl}
                    </a>
                  </span>
                )}

                {/* Total Experience and Employment Gaps */}
                {(() => {
                  const formAnswersArr = Array.isArray(candidate?.extractedData?.formAnswers) ? candidate.extractedData.formAnswers : [];
                  const formExpVal = candidate?.extractedData?.totalYearsExperience || formAnswersArr.find(a => a?.label?.toLowerCase().includes('experience'))?.value;
                  const formExpNum = parseFloat(formExpVal);
                  const isExpMismatch = !isNaN(formExpNum) && expYears > 0 && Math.abs(formExpNum - expYears) >= 2;

                  return (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', flexWrap: 'wrap' }}>
                        <Briefcase size={12} style={{ color: 'var(--accent-primary)' }} />
                        <span>Total Experience (CV): <strong style={{ color: 'var(--text-primary)' }}>{totalExpString}</strong></span>
                        {formExpVal && (
                          <span style={{ fontSize: '11px', fontWeight: '600', color: isExpMismatch ? '#f87171' : 'var(--text-muted)', background: isExpMismatch ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '4px', border: isExpMismatch ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--glass-border)' }}>
                            {isExpMismatch ? '⚠️ Form Stated: ' : 'Form: '}{formExpVal} yrs{isExpMismatch ? ' (Discrepancy)' : ''}
                          </span>
                        )}
                      </span>
                      {gaps.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '12px', fontWeight: '600' }}>
                            <AlertCircle size={12} />
                            <span>Employment Gaps Found:</span>
                          </span>
                          <ul style={{ margin: '0 0 0 16px', padding: 0, fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {gaps.map((gap, i) => (
                              <li key={i} style={{ lineHeight: '1.4' }}>{gap}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '12px', fontWeight: '500' }}>
                          <CheckCircle2 size={12} />
                          <span>No significant employment gaps</span>
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Application metadata fields (Location, Experience, Notice) */}
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Application Form Details</h4>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '2px 8px', fontSize: '11px', height: '22px' }}
                      onClick={() => {
                        if (isEditingMetadata) {
                          setIsEditingMetadata(false);
                        } else {
                          setIsEditingMetadata(true);
                        }
                      }}
                      disabled={savingMetadata}
                    >
                      {isEditingMetadata ? 'Cancel' : 'Edit Details'}
                    </button>
                  </div>

                  {isEditingMetadata ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                      {fieldsToRender.map(f => (
                        <div key={f.id || f.label}>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>{f.label}</label>
                          <input 
                            type="text" 
                            value={editedAnswers[f.label] || ''} 
                            onChange={e => setEditedAnswers(prev => ({ ...prev, [f.label]: e.target.value }))} 
                            className="form-input" 
                            style={{ height: '28px', padding: '4px 8px', fontSize: '12px', width: '100%' }}
                          />
                        </div>
                      ))}
                      <button 
                        className="btn btn-primary" 
                        style={{ height: '28px', fontSize: '12px', padding: '4px 12px', marginTop: '4px' }}
                        onClick={handleSaveMetadata}
                        disabled={savingMetadata}
                      >
                        {savingMetadata ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                      {fieldsToRender.map(f => (
                        <div key={f.id || f.label} style={{ background: 'rgba(255,255,255,0.01)', padding: '6px 8px', borderRadius: '4px', border: '1px dashed var(--glass-border)', minWidth: '80px', overflow: 'hidden' }}>
                          <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={f.label}>{f.label}</span>
                          <strong style={{ fontSize: '12px', color: editedAnswers[f.label] ? 'var(--text-primary)' : 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={editedAnswers[f.label] || 'Not provided / No field found'}>
                            {editedAnswers[f.label] || 'Not provided'}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Score HUD Circle */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div className={`score-badge ${scoreColorClass}`} style={{ width: '56px', height: '56px', fontSize: '18px' }}>
                {score}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                {useJobMatch ? 'Match Score' : 'Competency Score'}
              </span>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Position:</span>
                <select 
                  className="form-input" 
                  style={{ width: '180px', padding: '6px 12px', fontSize: '12px' }}
                  value={candidate.jobId || ''}
                  onChange={handlePositionChange}
                  disabled={changingPosition || currentRole === 'Hiring Manager'}
                >
                  <option value="">General Role (Unassigned)</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Current Stage:</span>
                <select 
                  className="form-input" 
                  style={{ width: '120px', padding: '6px 12px', fontSize: '12px' }}
                  value={candidate.stage}
                  onChange={handleStageSelect}
                  disabled={currentRole === 'Hiring Manager'}
                >
                  <option value="Inbox">Inbox</option>
                  <option value="Shortlist">Shortlist</option>
                  <option value="Interview">Interview</option>
                  <option value="Offered">Offered</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {currentRole !== 'Hiring Manager' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Assign Manager:</span>
                  <select 
                    className="form-input" 
                    style={{ width: '180px', padding: '6px 12px', fontSize: '12px' }}
                    value={assignedManager}
                    onChange={handleAssignManager}
                  >
                    <option value="">Unassigned</option>
                    {managers.map(m => (
                      <option key={m._id} value={m.email}>{m.email}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <a 
                className="btn btn-secondary" 
                style={{ padding: '8px 14px', fontSize: '12px' }}
                href={candidate.resumeUrl ? `${backendUrl}${candidate.resumeUrl}` : '#'}
                target="_blank"
                rel="noreferrer"
              >
                Open PDF in Tab
              </a>
              {currentRole !== 'Hiring Manager' && (
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '8px 14px', fontSize: '12px', background: '#10b981', borderColor: '#10b981', fontWeight: '600' }}
                  onClick={() => onOpenOfferModal ? onOpenOfferModal(candidate) : onOpenEmailModal(candidate)}
                  title="Generate and Send Employment Offer Letter"
                >
                  <FileText size={14} /> Send Offer Letter
                </button>
              )}
              {currentRole !== 'Hiring Manager' && (
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '8px 14px', fontSize: '12px' }}
                  onClick={() => onOpenEmailModal(candidate)}
                >
                  <Send size={12} /> Send Email
                </button>
              )}
              {currentRole !== 'Hiring Manager' && (
                <button 
                  className="btn btn-danger" 
                  style={{ padding: '8px 14px', fontSize: '12px' }}
                  onClick={handleDeleteCandidate}
                >
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>
          </div>

          {/* Offer Details Card if Extended */}
          {candidate.offerDetails && (
            <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: candidate.offerDetails.emailStatus === 'Sent' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)', border: candidate.offerDetails.emailStatus === 'Sent' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: candidate.offerDetails.emailStatus === 'Sent' ? '#10b981' : '#f59e0b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} /> Official Offer Record
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <a 
                    href={`${backendUrl}/api/candidates/${candidate.id}/offer-letter-pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="Download / View official offer letter PDF"
                  >
                    <Download size={12} /> Download PDF
                  </a>

                  {/* Email Delivery Status Badge */}
                  {candidate.offerDetails.emailStatus === 'Sent' ? (
                    <span className="tag-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: '600', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Email Delivered ({candidate.offerDetails.sentAt ? new Date(candidate.offerDetails.sentAt).toLocaleDateString() : 'Recently'})
                    </span>
                  ) : candidate.offerDetails.emailStatus === 'Failed' ? (
                    <span className="tag-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: '600', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <XCircle size={12} /> Email Delivery Failed
                    </span>
                  ) : (
                    <span className="tag-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontWeight: '600', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> Email Not Sent Yet (Saved for Later)
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block' }}>Joining Date</span>
                  <strong style={{ color: '#10b981' }}>{candidate.offerDetails.joiningDate || 'TBD'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block' }}>Offered Salary / CTC</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{candidate.offerDetails.offeredSalary || 'As agreed'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block' }}>Work Mode</span>
                  <span>{candidate.offerDetails.workMode || 'Hybrid'} ({candidate.offerDetails.location || 'Main Office'})</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block' }}>Probation Period</span>
                  <span>{candidate.offerDetails.probationPeriod || '3 Months'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block' }}>Offer Expiration</span>
                  <span>{candidate.offerDetails.offerDeadline || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block' }}>Reporting Manager</span>
                  <span>{candidate.offerDetails.reportingManager || 'Unassigned'}</span>
                </div>
              </div>

              {candidate.offerDetails.specialNotes && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: '4px', marginTop: '4px' }}>
                  <strong>Special Terms:</strong> {candidate.offerDetails.specialNotes}
                </div>
              )}

              {/* Action if email not sent yet */}
              {candidate.offerDetails.emailStatus !== 'Sent' && currentRole !== 'Hiring Manager' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(245, 158, 11, 0.1)', padding: '10px 14px', borderRadius: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '500' }}>
                    ⚠️ Offer details are saved on candidate profile. Click button to send offer email now.
                  </span>
                  <button 
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px', background: '#10b981', borderColor: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => onOpenOfferModal && onOpenOfferModal(candidate)}
                  >
                    <Send size={12} /> Send Email Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Key Skills */}
          {allCandidateSkills.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--accent-primary)' }} /> Key Skills ({allCandidateSkills.length})
              </h3>
              <div className="glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', flexWrap: 'wrap', gap: '8px', background: 'rgba(99, 102, 241, 0.02)' }}>
                {allCandidateSkills.map((skill, idx) => (
                  <span 
                    key={idx} 
                    className="tag-badge tag-tech"
                    style={{ 
                      fontSize: '12px', 
                      padding: '5px 12px', 
                      fontWeight: '600',
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--accent-primary)',
                      border: '1px solid rgba(99, 102, 241, 0.15)',
                      borderRadius: '4px'
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Generated Tags */}
          {candidate.tags && candidate.tags.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-secondary)' }}>
                <Tag size={16} /> AI Extracted Tags
              </h3>
              
              <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {candidate.tags.map((tag, idx) => {
                  const catLower = (tag.category || '').toLowerCase();
                  let catClass = 'tag-default';
                  if (catLower.includes('seniority')) catClass = 'tag-seniority';
                  else if (catLower.includes('domain') || catLower.includes('role')) catClass = 'tag-domain';
                  else if (catLower.includes('stack') || catLower.includes('tech')) catClass = 'tag-tech';
                  else if (catLower.includes('experience')) catClass = 'tag-experience';

                  return (
                    <div 
                      key={idx} 
                      className={`tag-badge ${catClass}`}
                      style={{ 
                        fontSize: '12px', 
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      title={`Confidence: ${tag.confidence}%`}
                    >
                      <span style={{ fontWeight: '600' }}>{tag.value}</span>
                      <span style={{ fontSize: '10px', opacity: 0.7, borderLeft: '1px solid currentColor', paddingLeft: '8px' }}>
                        {tag.category}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Scoring Analysis (Reasoning & Skill Matrix) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-secondary)' }}>
              <Sparkles size={16} /> {useJobMatch ? 'AI Match Analysis' : 'AI Competency Analysis'}
            </h3>
            
            <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'rgba(139, 92, 246, 0.03)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '16px', fontStyle: 'italic' }}>
                "{reasoning || 'No evaluation details generated.'}"
              </p>

              {/* Skills Matrix Divider */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
                {/* Matching Skills */}
                <div>
                  <h4 style={{ fontSize: '12px', color: 'var(--status-offered)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <CheckCircle2 size={12} /> Matching Skills
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {matchingSkills && matchingSkills.length > 0 ? (
                      matchingSkills.map((s, i) => (
                        <span key={i} style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          {s}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>None identified</span>
                    )}
                  </div>
                </div>

                {/* Missing Skills */}
                <div>
                  <h4 style={{ fontSize: '12px', color: 'var(--status-rejected)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <AlertCircle size={12} /> Missing Skills
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {missingSkills && missingSkills.length > 0 ? (
                      missingSkills.map((s, i) => (
                        <span key={i} style={{ fontSize: '11px', background: 'rgba(244, 63, 94, 0.1)', color: '#fb7185', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                          {s}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>None identified</span>
                    )}
                  </div>
                </div>

                {/* Candidate Skills (All) */}
                <div style={{ gridColumn: 'span 2', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--glass-border)' }}>
                  <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <CheckCircle2 size={12} /> Candidate Skills (All)
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {candidate.skills && candidate.skills.length > 0 ? (
                      candidate.skills.map((s, i) => {
                        const isMatch = matchingSkills?.some(ms => ms.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(ms.toLowerCase()));
                        return (
                          <span key={i} style={{ 
                            fontSize: '11px', 
                            background: isMatch ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)', 
                            color: isMatch ? '#34d399' : 'var(--text-secondary)', 
                            padding: '3px 8px', 
                            borderRadius: '4px', 
                            border: isMatch ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--glass-border)' 
                          }}>
                            {s}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>None identified</span>
                    )}
                  </div>
                </div>
              </div>

              {(() => {
                const validRedFlags = (candidate.redFlags || []).filter(flag => 
                  (flag.flag && flag.flag.trim() !== '') || 
                  (flag.issue && flag.issue.trim() !== '') || 
                  (flag.explanation && flag.explanation.trim() !== '') || 
                  (flag.fix_suggestion && flag.fix_suggestion.trim() !== '')
                );
                if (validRedFlags.length === 0) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)', marginTop: '16px' }}>
                    <h4 style={{ fontSize: '12px', color: 'var(--status-rejected)', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <AlertCircle size={14} /> Red Flags / Discrepancies Detected
                    </h4>
                    {validRedFlags.map((flag, idx) => {
                      const sevColor = flag.severity?.toLowerCase() === 'high' ? '#f87171' : flag.severity?.toLowerCase() === 'medium' ? '#fb923c' : '#fbbf24';
                      const sevBg = flag.severity?.toLowerCase() === 'high' ? 'rgba(239, 68, 68, 0.05)' : flag.severity?.toLowerCase() === 'medium' ? 'rgba(249, 115, 22, 0.05)' : 'rgba(245, 158, 11, 0.05)';
                      const sevBorder = flag.severity?.toLowerCase() === 'high' ? 'rgba(239, 68, 68, 0.2)' : flag.severity?.toLowerCase() === 'medium' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(245, 158, 11, 0.2)';

                      return (
                        <div key={idx} style={{ background: sevBg, padding: '12px', borderRadius: 'var(--radius-sm)', border: `1px solid ${sevBorder}` }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: sevColor }}>{flag.flag || flag.issue}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}><strong>Severity:</strong> {flag.severity}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}><strong>Explanation:</strong> {flag.explanation || flag.fix_suggestion}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}


            </div>
          </div>



          {/* HR & Technical Interview Questions */}
          {((candidate.hrQuestions && candidate.hrQuestions.length > 0) || 
            (candidate.technicalQuestions && candidate.technicalQuestions.length > 0)) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-secondary)' }}>
                <Sparkles size={16} /> Tailored Interview Questions & Answers
              </h3>

              {/* Sub-tab Toggle Buttons */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
                <button
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: qaSubTab === 'hr' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color: qaSubTab === 'hr' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    border: qaSubTab === 'hr' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onClick={() => setQaSubTab('hr')}
                >
                  HR & Screening ({candidate.hrQuestions?.length || 0})
                </button>
                <button
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: qaSubTab === 'tech' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                    color: qaSubTab === 'tech' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                    border: qaSubTab === 'tech' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onClick={() => setQaSubTab('tech')}
                >
                  Technical & Domain ({candidate.technicalQuestions?.length || 0})
                </button>
              </div>
              
              {qaSubTab === 'hr' && candidate.hrQuestions && candidate.hrQuestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {candidate.hrQuestions.map((q, idx) => {
                    const styles = getQuestionStyles(q.importance);
                    return (
                      <div 
                        key={idx} 
                        className="glass" 
                        style={{ 
                          padding: '16px', 
                          borderRadius: 'var(--radius-md)', 
                          background: styles.cardBg, 
                          border: styles.cardBorder,
                          boxShadow: styles.shadow
                        }}
                      >
                        <p style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.4' }}>
                          Q: {q.question}
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            background: styles.badgeBg, 
                            color: styles.badgeColor, 
                            fontSize: '9px', 
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            marginLeft: '8px',
                            border: styles.badgeBorder,
                            verticalAlign: 'middle'
                          }}>
                            {styles.badgeText}
                          </span>
                        </p>
                        {(q.sample_answer || q.answer) && (
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, paddingLeft: '12px', borderLeft: `3px solid ${styles.indicatorColor}`, lineHeight: '1.5' }}>
                            <strong>Suggested Prep:</strong> {q.sample_answer || q.answer}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {qaSubTab === 'tech' && candidate.technicalQuestions && candidate.technicalQuestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {candidate.technicalQuestions.map((q, idx) => {
                    const styles = getQuestionStyles(q.importance);
                    return (
                      <div 
                        key={idx} 
                        className="glass" 
                        style={{ 
                          padding: '16px', 
                          borderRadius: 'var(--radius-md)', 
                          background: styles.cardBg, 
                          border: styles.cardBorder,
                          boxShadow: styles.shadow
                        }}
                      >
                        <p style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.4' }}>
                          Q: {q.question}
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            background: styles.badgeBg, 
                            color: styles.badgeColor, 
                            fontSize: '9px', 
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            marginLeft: '8px',
                            border: styles.badgeBorder,
                            verticalAlign: 'middle'
                          }}>
                            {styles.badgeText}
                          </span>
                        </p>
                        {(q.sample_answer || q.answer) && (
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, paddingLeft: '12px', borderLeft: `3px solid ${styles.indicatorColor}`, lineHeight: '1.5' }}>
                            <strong>Suggested Prep:</strong> {q.sample_answer || q.answer}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            (candidate.matchScore <= 50) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-secondary)' }}>
                  <Sparkles size={16} /> HR & Technical Interview Questions
                </h3>
                <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', background: 'rgba(239, 68, 68, 0.02)', border: '1px solid rgba(239, 68, 68, 0.15)', textAlign: 'center' }}>
                  <div style={{ color: '#ef4444', fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>ATS Match Score is 50% or Below ({candidate.matchScore}%)</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 16px auto', lineHeight: '1.5' }}>
                    Automated interview question generation was skipped during upload to decrease the load on your Ollama server. You can generate them manually now if desired.
                  </p>
                  <button
                    onClick={handleGenerateJdQuestions}
                    disabled={loadingJdQuestions}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: '600' }}
                  >
                    {loadingJdQuestions ? 'Generating...' : 'Create HR & Technical Questions'}
                  </button>
                </div>
              </div>
            ) : (
              candidate.interviewQuestions && candidate.interviewQuestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-secondary)' }}>
                    <Sparkles size={16} /> HR & Technical Interview Questions
                  </h3>
                  <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                    <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-primary)' }}>
                      {candidate.interviewQuestions.map((q, idx) => (
                        <li key={idx} style={{ lineHeight: '1.5' }}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            )
          )}

          {/* Professional Experience */}
          <div>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Building2 size={16} style={{ color: 'var(--accent-primary)' }} /> Work Experience
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {candidate.experience && candidate.experience.length > 0 ? (
                candidate.experience.map((exp, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', position: 'relative', paddingBottom: idx < candidate.experience.length - 1 ? '16px' : '0' }}>
                    
                    {/* Timeline Line */}
                    {idx < candidate.experience.length - 1 && (
                      <div style={{ position: 'absolute', top: '24px', left: '11px', width: '2px', bottom: 0, background: 'var(--glass-border)' }}></div>
                    )}
                    
                    <div style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                      <Briefcase size={12} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600' }}>{exp.role} at {exp.company}</h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', margin: '4px 0' }}>
                        <Calendar size={10} /> {exp.duration}
                      </span>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginTop: '6px' }}>
                        {exp.description}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px dashed var(--glass-border)' }}>
                  No work experience details found in resume.
                </div>
              )}
            </div>
          </div>

          {/* Projects */}
          <div>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sparkles size={16} style={{ color: 'var(--accent-secondary)' }} /> Projects
            </h3>
            {candidate.projects && candidate.projects.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {candidate.projects.map((proj, idx) => (
                  <div key={idx} className="glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.01)', border: '1px solid var(--glass-border)' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                      {proj.name}
                    </h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 10px 0' }}>
                      {proj.description}
                    </p>
                    {proj.matchingSkills && proj.matchingSkills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {proj.matchingSkills.map((skill, sIdx) => (
                          <span key={sIdx} style={{ fontSize: '11px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px dashed var(--glass-border)' }}>
                No project details found in resume.
              </div>
            )}
          </div>

          {/* Education */}
          <div>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <GraduationCap size={16} style={{ color: 'var(--accent-primary)' }} /> Education
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {candidate.education && candidate.education.length > 0 ? (
                candidate.education.map((edu, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <GraduationCap size={12} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600' }}>{edu.degree}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {edu.institution} {edu.year ? `• Class of ${edu.year}` : ''}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px dashed var(--glass-border)' }}>
                  No education details found in resume.
                </div>
              )}
            </div>
          </div>

          {/* Recruitment Timeline Logs */}
          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '24px' }}>
            <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Recruitment Log</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {candidate.history && candidate.history.map((log, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)', flexGrow: 1, paddingRight: '12px' }}>
                    {log.text}
                  </span>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    {new Date(log.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
        
        {/* Right Column: PDF Viewer / Text Resume */}
        <div className="split-view-right" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Tab Header */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--glass-border)',
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '8px 16px 0 16px',
            gap: '8px'
          }}>
            <button
              className={`rag-mode-btn ${rightTab === 'pdf' ? 'rag-mode-active' : ''}`}
              style={{
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '500',
                borderBottom: rightTab === 'pdf' ? '2px solid var(--accent-primary)' : 'none',
                background: rightTab === 'pdf' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                color: rightTab === 'pdf' ? 'var(--text-primary)' : 'var(--text-secondary)'
              }}
              onClick={() => setRightTab('pdf')}
              disabled={!candidate.resumeUrl && !(window.localResumeUrls && window.localResumeUrls[candidate.id])}
            >
              Original Resume
            </button>
            <button
              className={`rag-mode-btn ${rightTab === 'text' ? 'rag-mode-active' : ''}`}
              style={{
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '500',
                borderBottom: rightTab === 'text' ? '2px solid var(--accent-primary)' : 'none',
                background: rightTab === 'text' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                color: rightTab === 'text' ? 'var(--text-primary)' : 'var(--text-secondary)'
              }}
              onClick={() => setRightTab('text')}
            >
              Extracted Text
            </button>
          </div>

          {/* Tab Body */}
          <div style={{ flexGrow: 1, overflow: 'hidden', height: '100%' }}>
            {rightTab === 'pdf' && renderResumeContent()}

            {rightTab === 'text' && (
              <div style={{ 
                height: '100%', 
                overflowY: 'auto', 
                padding: '24px', 
                whiteSpace: 'pre-wrap', 
                fontFamily: 'monospace',
                fontSize: '13px',
                color: 'var(--text-primary)',
                background: 'rgba(0, 0, 0, 0.15)',
                lineHeight: '1.6'
              }}>
                {candidate.resumeText && candidate.resumeText.trim() ? (
                  candidate.resumeText
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    No Resume Text Content Available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        </div>
      </div>
    </div>
  );
}
