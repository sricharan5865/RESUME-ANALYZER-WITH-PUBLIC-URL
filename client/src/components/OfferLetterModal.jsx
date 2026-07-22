import React, { useState } from 'react';
import { X, Send, FileText, Calendar, DollarSign, Briefcase, Clock, UserCheck, AlertCircle, Eye, Edit3 } from 'lucide-react';

export default function OfferLetterModal({ candidate, job, onClose, onOfferSent, backendUrl, token }) {
  // Step: 1 = Form, 2 = Letter Preview
  const [step, setStep] = useState(1);
  
  // Default dates
  const defaultJoiningDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // 2 weeks out
    return d.toISOString().split('T')[0];
  })();

  const defaultDeadlineDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // 1 week out
    return d.toISOString().split('T')[0];
  })();

  // Form State
  const [jobTitle, setJobTitle] = useState(job?.title || 'Selected Position');
  const [department, setDepartment] = useState(job?.department || 'Engineering');
  const [joiningDate, setJoiningDate] = useState(defaultJoiningDate);
  const [offeredSalary, setOfferedSalary] = useState('');
  const [workMode, setWorkMode] = useState('Hybrid');
  const [location, setLocation] = useState(job?.location || 'Hyderabad');
  const [probationPeriod, setProbationPeriod] = useState('six months');
  const [offerDeadline, setOfferDeadline] = useState(defaultDeadlineDate);
  const [reportingManager, setReportingManager] = useState('');
  const [benefits, setBenefits] = useState('Group Health Cover (Self & Dependents up to Rs 3 Lakhs), Maternity Benefit');
  const [specialNotes, setSpecialNotes] = useState('This offer is subject to successful background verification.');

  // Annexure-I Salary Structure Breakdown State
  const [basicPay, setBasicPay] = useState('');
  const [hra, setHra] = useState('');
  const [standardAllowance, setStandardAllowance] = useState('');
  const [travelAllowance, setTravelAllowance] = useState('');
  const [specialPay, setSpecialPay] = useState('');
  const [pfContribution, setPfContribution] = useState('');
  const [healthInsurance, setHealthInsurance] = useState('Included (Group Cover up to Rs 3 Lakhs)');

  // Email Subject & Body state for Step 2 preview
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Auto-calculate Annexure-I breakdown based on CTC
  const autoCalculateBreakdown = (val) => {
    const ctcStr = val !== undefined ? val : offeredSalary;
    const num = parseFloat((ctcStr || '').toString().replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) return;

    const annualBasic = Math.round(num * 0.50);
    const annualHra = Math.round(num * 0.20);
    const annualStd = Math.round(num * 0.10);
    const annualTravel = Math.round(num * 0.08);
    const annualSpecial = Math.round(num * 0.07);
    const annualPf = Math.round(num * 0.05);

    setBasicPay(annualBasic.toString());
    setHra(annualHra.toString());
    setStandardAllowance(annualStd.toString());
    setTravelAllowance(annualTravel.toString());
    setSpecialPay(annualSpecial.toString());
    setPfContribution(annualPf.toString());
    setHealthInsurance('Group Cover up to Rs 3 Lakhs');
  };

  // Format letter template when moving to Step 2
  const generateOfferLetterText = () => {
    const companyName = 'iSpatial Techno Solutions Pvt. Ltd.';
    const formattedJoiningDate = joiningDate ? new Date(joiningDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '---------------------';
    const formattedDeadline = offerDeadline ? new Date(offerDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '---------------------';
    const refNo = `IST/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
    const todayDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const parseNum = (val) => {
      const n = parseFloat((val || '').toString().replace(/[^0-9.]/g, ''));
      return isNaN(n) ? 0 : n;
    };

    const bAnnual = parseNum(basicPay);
    const hAnnual = parseNum(hra);
    const sAnnual = parseNum(standardAllowance);
    const tAnnual = parseNum(travelAllowance);
    const spAnnual = parseNum(specialPay);
    const grossAnnual = bAnnual + hAnnual + sAnnual + tAnnual + spAnnual;
    const pfAnn = parseNum(pfContribution);

    const sub = `Employment Offer Letter - ${jobTitle} | ${companyName}`;
    const txt = `Ref: ${refNo}                                         Date: ${todayDate}

To,
Mr/Ms. ${candidate.name}
${candidate.email ? `Email: ${candidate.email}` : ''}
${candidate.phone ? `Phone: ${candidate.phone}` : ''}

Dear ${candidate.name},

This is with reference to our discussions; we are pleased to offer you the "${jobTitle}" position in our organization on the following terms & conditions:

1. You are required to join our organization by ${formattedJoiningDate}, beyond which this offer stands canceled unless otherwise, either party communicates the said delay beforehand.
2. You will be on probation for a period of ${probationPeriod || 'six months'} from the date of joining.
3. Your gross annual salary is Rs. ${offeredSalary || '------------------/-'}. Please refer to Annexure-I for breakup details.
4. Your detailed appointment letter will be issued to you at the time of your joining.
5. The organization views compensation details to be highly confidential and the same is expected from you.
6. You are required to submit the following documents to fulfill joining formalities on or before ${formattedJoiningDate}:
   a. 5 Passport Size Photos
   b. 2 Photocopies of ID Proof and Residence Proof
   c. Academic certificates – 10th to Highest qualification (Original Documents for verification)
   d. Experience & Relieving documents of previous companies

We are very happy to have you join our growing team and look forward to a long and mutually beneficial association. If this employment offer is acceptable to you, please sign a copy of this letter and return it to us by ${formattedDeadline}.

For iSpatial Techno Solutions Pvt. Ltd.

Antony John
Chief Operating Officer


================================================================================
ANNEXURE-I: SALARY STRUCTURE
================================================================================
Candidate Name : ${candidate.name}
Position       : ${jobTitle}
Department     : ${department}

Fixed Components                  Monthly (Rs.)        Annual (Rs.)
--------------------------------------------------------------------------------
Basic                            : ${bAnnual > 0 ? Math.round(bAnnual / 12).toLocaleString('en-IN') : '—'}              ${bAnnual > 0 ? bAnnual.toLocaleString('en-IN') : basicPay || '—'}
House Rent Allowance (HRA)       : ${hAnnual > 0 ? Math.round(hAnnual / 12).toLocaleString('en-IN') : '—'}              ${hAnnual > 0 ? hAnnual.toLocaleString('en-IN') : hra || '—'}
Standard Allowance               : ${sAnnual > 0 ? Math.round(sAnnual / 12).toLocaleString('en-IN') : '—'}              ${sAnnual > 0 ? sAnnual.toLocaleString('en-IN') : standardAllowance || '—'}
Travel / WFH Allowance           : ${tAnnual > 0 ? Math.round(tAnnual / 12).toLocaleString('en-IN') : '—'}              ${tAnnual > 0 ? tAnnual.toLocaleString('en-IN') : travelAllowance || '—'}
Special Pay                      : ${spAnnual > 0 ? Math.round(spAnnual / 12).toLocaleString('en-IN') : '—'}              ${spAnnual > 0 ? spAnnual.toLocaleString('en-IN') : specialPay || '—'}
--------------------------------------------------------------------------------
Gross Salary                     : ${grossAnnual > 0 ? Math.round(grossAnnual / 12).toLocaleString('en-IN') : '—'}              ${grossAnnual > 0 ? grossAnnual.toLocaleString('en-IN') : offeredSalary}
--------------------------------------------------------------------------------
Statutory & Annual Benefits:
PF (Employer's Contribution)     : ${pfAnn > 0 ? Math.round(pfAnn / 12).toLocaleString('en-IN') : '—'}              ${pfAnn > 0 ? pfAnn.toLocaleString('en-IN') : pfContribution || '—'}
Health Insurance Premium         : ${healthInsurance || 'Group Cover up to Rs 3 Lakhs'}
--------------------------------------------------------------------------------
ANNUAL CTC                       : Rs. ${offeredSalary}
--------------------------------------------------------------------------------
Deductions: As per applicable Statutory rules and regulations.

Other Benefits (Subject to change):
* Annual Insurance Premium for Group Cover:
  I. Hospitalization Insurance for self (If employee is unmarried) upto Rs 3 Lakhs
  II. Hospitalization Insurance for self & 3 dependents (Spouse & 4 children) upto Rs 3 Lakhs
  III. Maternity Benefit

Company Address:
iSpatial Techno Solutions Pvt. Ltd.
3rd Floor 3B, Trendz Metro, Plot No. 1/2 in Section 1,
Huda Techno Enclave, Image Hospital Road, Madhapur, Telangana 500081.
Tel: +91 40 2354 4535 | Email: hr@ispatialtec.com | Web: www.ispatialtec.com`;

    setSubject(sub);
    setBody(txt);
  };

  const handleGoToPreview = (e) => {
    e.preventDefault();
    if (!joiningDate) return alert('Please specify the Joining Date.');
    if (!offeredSalary) return alert('Please enter the Offered Salary / CTC.');
    generateOfferLetterText();
    setStep(2);
  };

  const handleSendOffer = async (sendEmailNow = true) => {
    try {
      setSending(true);
      setError('');

      const offerDetails = {
        jobTitle,
        department,
        joiningDate,
        offeredSalary,
        workMode,
        location,
        probationPeriod,
        offerDeadline,
        reportingManager,
        benefits,
        specialNotes,
        // Annexure-I Breakdown
        basicPay,
        hra,
        standardAllowance,
        travelAllowance,
        specialPay,
        pfContribution,
        healthInsurance
      };

      const res = await fetch(`${backendUrl}/api/candidates/${candidate.id}/send-offer-letter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          offerDetails,
          subject,
          body,
          sendEmailNow
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to process offer letter.');
      }

      const data = await res.json();
      onOfferSent(data.candidate, data.message);
      onClose();
    } catch (e) {
      console.error('Send offer letter error:', e);
      setError(e.message || 'Failed to process offer letter.');
    } finally {
      setSending(false);
    }
  };

  if (!candidate) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', zIndex: 1100, backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass" style={{ width: '100%', maxWidth: '780px', maxHeight: '92vh', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Employment Offer Details Form
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Candidate: <strong style={{ color: 'var(--accent-primary)' }}>{candidate.name}</strong> ({candidate.email || 'No Email'})
              </p>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose} disabled={sending}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '24px' }}>
          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: Detailed Offer Form */
            <form onSubmit={handleGoToPreview} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Basic Position Details */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', margin: 0, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  1. Position & Employment Terms
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Briefcase size={14} style={{ color: 'var(--accent-primary)' }} /> Position Title*
                    </label>
                    <input type="text" className="form-input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Briefcase size={14} style={{ color: 'var(--accent-primary)' }} /> Department
                    </label>
                    <input type="text" className="form-input" value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                      <Calendar size={14} /> Joining Date*
                    </label>
                    <input type="date" className="form-input" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Probation Period</label>
                    <input type="text" className="form-input" value={probationPeriod} onChange={(e) => setProbationPeriod(e.target.value)} placeholder="six months" />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} /> Offer Expiration Date*
                    </label>
                    <input type="date" className="form-input" value={offerDeadline} onChange={(e) => setOfferDeadline(e.target.value)} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Work Mode</label>
                    <select className="form-input" value={workMode} onChange={(e) => setWorkMode(e.target.value)}>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Office Location</label>
                    <input type="text" className="form-input" value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reporting Manager</label>
                    <input type="text" className="form-input" placeholder="e.g. Antony John (COO)" value={reportingManager} onChange={(e) => setReportingManager(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Annexure-I Salary & Compensation Breakdown */}
              <div style={{ background: 'rgba(16, 185, 129, 0.03)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', margin: 0, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    2. Salary Structure & Annexure-I Breakup
                  </h4>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ fontSize: '11px', padding: '4px 10px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                    onClick={() => autoCalculateBreakdown()}
                  >
                    ⚡ Auto-Calculate Breakup
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: '700' }}>
                    <DollarSign size={14} /> Total Gross Annual Salary / CTC (Rs.)*
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 1,200,000 or ₹1,200,000 PA" 
                    value={offeredSalary} 
                    onChange={(e) => {
                      setOfferedSalary(e.target.value);
                      autoCalculateBreakdown(e.target.value);
                    }} 
                    required 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Basic Salary (Annual Rs.)</label>
                    <input type="text" className="form-input" placeholder="e.g. 600,000" value={basicPay} onChange={(e) => setBasicPay(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">House Rent Allowance - HRA (Annual Rs.)</label>
                    <input type="text" className="form-input" placeholder="e.g. 240,000" value={hra} onChange={(e) => setHra(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Standard Allowance</label>
                    <input type="text" className="form-input" placeholder="e.g. 120,000" value={standardAllowance} onChange={(e) => setStandardAllowance(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Travel / WFH Allowance</label>
                    <input type="text" className="form-input" placeholder="e.g. 96,000" value={travelAllowance} onChange={(e) => setTravelAllowance(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Special Pay</label>
                    <input type="text" className="form-input" placeholder="e.g. 84,000" value={specialPay} onChange={(e) => setSpecialPay(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Statutory Benefits - Employer PF (Annual Rs.)</label>
                    <input type="text" className="form-input" placeholder="e.g. 60,000" value={pfContribution} onChange={(e) => setPfContribution(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Health Insurance Premium / Cover</label>
                    <input type="text" className="form-input" value={healthInsurance} onChange={(e) => setHealthInsurance(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Special Terms */}
              <div className="form-group">
                <label className="form-label">Special Terms & Notes</label>
                <textarea className="form-input" rows={2} value={specialNotes} onChange={(e) => setSpecialNotes(e.target.value)} placeholder="Enter any additional conditions or clauses..." />
              </div>

              {/* Action Buttons in Form */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={sending}>
                  Cancel
                </button>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    disabled={sending}
                    onClick={() => {
                      if (!joiningDate) return alert('Please specify the Joining Date.');
                      if (!offeredSalary) return alert('Please enter the Offered Salary / CTC.');
                      generateOfferLetterText();
                      handleSendOffer(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title="Save offer details to candidate profile without sending email now"
                  >
                    <Clock size={14} /> Save Offer (Send Email Later)
                  </button>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={sending}
                    style={{ padding: '10px 20px', background: '#10b981', borderColor: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Eye size={16} /> Preview & Send Email
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* STEP 2: Offer Letter Email Preview & Choice */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '600', margin: 0, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Eye size={16} /> Review & Edit Offer Letter Email
                </h4>
                <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => setStep(1)} disabled={sending}>
                  <Edit3 size={12} /> Edit Form Details
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Email Subject Line</label>
                <input type="text" className="form-input" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ fontWeight: '600' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Offer Letter Message Body</label>
                <textarea 
                  className="form-input" 
                  rows={16} 
                  value={body} 
                  onChange={(e) => setBody(e.target.value)} 
                  style={{ fontFamily: 'monospace', fontSize: '12.5px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}
                />
              </div>

              {/* Action Buttons in Step 2: Send Now vs Send Later */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)} disabled={sending}>
                  Back to Form
                </button>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => handleSendOffer(false)}
                    disabled={sending}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title="Save offer details and mark as email pending"
                  >
                    <Clock size={14} /> {sending ? 'Saving...' : 'Save & Send Email Later'}
                  </button>
                  
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={() => handleSendOffer(true)}
                    disabled={sending}
                    style={{ padding: '10px 24px', background: '#10b981', borderColor: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Send size={16} /> {sending ? 'Sending Offer Letter...' : 'Send Offer Email Now'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
