import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Copy, Check, Share2, Briefcase, User, MapPin, Clock, FileText, 
  ExternalLink, Globe, Sparkles, AlertCircle, Building2, CheckCircle2,
  Mail, MessageSquare, ArrowRight, Search, X, Pencil, RotateCcw
} from 'lucide-react';

export default function ReferralGenerator({ backendUrl }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Preset default role templates (in case backend is empty)
  const defaultRoles = [
    {
      id: 'gis-pro-01',
      title: 'ArcGIS Pro Specialist',
      slug: 'arcgis-pro-specialist',
      exp: '3 - 5 Years',
      department: 'Geospatial Solutions',
      location: 'Hyderabad',
      jd: 'Responsible for leading spatial analysis, Esri ArcGIS Pro geodatabase management, Python script automation, 3D spatial analytics, and publishing map services for enterprise GIS clients.'
    },
    {
      id: 'ba-01',
      title: 'Business Analyst',
      slug: 'business-analyst',
      exp: '3 - 5 Years',
      department: 'Business Analysis & Strategy',
      location: 'Hyderabad / Remote',
      jd: 'Responsible for requirement gathering, client stakeholder consultations, business process modeling, functional specifications, and bridging business needs with GIS & AI software development teams.'
    },
    {
      id: 'se-02',
      title: 'Senior Software Engineer (Full Stack)',
      slug: 'senior-software-engineer',
      exp: '4 - 7 Years',
      department: 'Engineering',
      location: 'Chennai / Remote',
      jd: 'Designing and building scalable microservices, web applications using React, Node.js, and spatial database optimization.'
    },
    {
      id: 'gis-03',
      title: 'Senior GIS Specialist',
      slug: 'senior-gis-specialist',
      exp: '5 - 8 Years',
      department: 'Geospatial Solutions',
      location: 'Hyderabad / On-site',
      jd: 'Lead spatial analytics, Esri ArcGIS Enterprise configurations, Python automation, and 3D digital twin implementations.'
    },
    {
      id: 'sa-04',
      title: 'Solution Architect',
      slug: 'solution-architect',
      exp: '8 - 12 Years',
      department: 'Architecture & Technical Governance',
      location: 'Remote',
      jd: 'Architect enterprise location intelligence and AI platforms for high-throughput public sector and utility clients.'
    }
  ];

  // Preset list of internal employees with Employee IDs
  const defaultEmployees = [
    { name: 'Mohamed Sheik Ismail R', code: 'ABCD1', empId: 'IST-1092', role: 'Lead Business Analyst', dept: 'Strategy & Analysis' },
    { name: 'Sri Charan', code: 'SC882', empId: 'IST-1045', role: 'Senior Talent Partner', dept: 'Human Resources' },
    { name: 'Alex Johnson', code: 'AJ304', empId: 'IST-1102', role: 'Engineering Manager', dept: 'Engineering' },
    { name: 'Priya Sharma', code: 'PS519', empId: 'IST-1088', role: 'GIS Team Lead', dept: 'Geospatial Solutions' },
    { name: 'Rahul Verma', code: 'RV712', empId: 'IST-1150', role: 'Product Specialist', dept: 'Product Management' }
  ];

  const [roles, setRoles] = useState(defaultRoles);
  const [employees] = useState(defaultEmployees);

  // Search Console State
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Custom Employee State
  const [customName, setCustomName] = useState('');
  const [customEmpId, setCustomEmpId] = useState('');
  const [customRefCode, setCustomRefCode] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Role & Domain Selection inside Modal
  const [selectedRoleId, setSelectedRoleId] = useState('gis-pro-01');
  const [domainOption, setDomainOption] = useState('current'); // 'current' | 'ispatial' | 'custom'
  const [customDomain, setCustomDomain] = useState('https://ispatialtec.com');

  // Dedicated Announcement Customization State
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [customRoleTitle, setCustomRoleTitle] = useState('');
  const [customExp, setCustomExp] = useState('');
  const [customJd, setCustomJd] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [customRefCodeInput, setCustomRefCodeInput] = useState('');

  // Copy & Toast State
  const [copied, setCopied] = useState(false);
  const [copiedUrlOnly, setCopiedUrlOnly] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Fetch live jobs from backend
  useEffect(() => {
    fetch(`${backendUrl || ''}/api/public/jobs`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mappedJobs = data.map(j => ({
            id: j.id || j._id,
            title: j.title,
            slug: (j.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            exp: j.requiredExperience || j.exp || '3 - 5 Years',
            department: j.department || 'Engineering',
            location: j.location || 'Remote',
            jd: j.publicDescription || j.description || j.requirements || 'Responsible for executing key enterprise projects and collaborating across cross-functional teams.'
          }));
          
          if (!mappedJobs.some(j => j.title.toLowerCase().includes('business analyst'))) {
            mappedJobs.unshift(defaultRoles[1]);
          }
          setRoles(mappedJobs);
        }
      })
      .catch(err => {
        console.log('Using default role templates for referral page:', err);
      });
  }, [backendUrl]);

  // URL query params initialization (e.g. /referral?emp=IST-1092 or ?role=business-analyst)
  useEffect(() => {
    const roleParam = searchParams.get('role');
    const empParam = searchParams.get('emp') || searchParams.get('id');
    
    if (roleParam) {
      const match = roles.find(r => r.slug === roleParam || r.id === roleParam || r.title.toLowerCase().includes(roleParam.toLowerCase()));
      if (match) setSelectedRoleId(match.id);
    }

    if (empParam) {
      const empMatch = employees.find(e => 
        e.empId.toLowerCase() === empParam.toLowerCase() || 
        e.code.toLowerCase() === empParam.toLowerCase() ||
        e.name.toLowerCase().includes(empParam.toLowerCase())
      );
      if (empMatch) {
        setSelectedEmployee(empMatch);
        setIsModalOpen(true);
      }
    }
  }, [searchParams, roles, employees]);

  // Active Selected Role Object
  const activeRole = roles.find(r => r.id === selectedRoleId) || roles[0];
  
  const activeEmployee = selectedEmployee || (isCustomMode ? {
    name: customName || 'Internal Employee',
    empId: customEmpId || 'IST-EMP',
    code: customRefCode || 'REF100',
    role: 'Employee'
  } : employees[0]);

  const defaultRefCode = activeEmployee.code || 'ABCD1';

  // Synchronize Editable State when active role/employee selections change
  useEffect(() => {
    if (activeRole) {
      setCustomRoleTitle(activeRole.title);
      setCustomExp(activeRole.exp);
      setCustomJd(activeRole.jd);
      setCustomLocation(activeRole.location);
    }
  }, [selectedRoleId, roles]);

  useEffect(() => {
    if (activeEmployee) {
      setCustomRefCodeInput(activeEmployee.code || 'ABCD1');
    }
  }, [selectedEmployee, isCustomMode]);

  // Reset Edits back to default position info
  const resetEdits = () => {
    setCustomRoleTitle(activeRole.title);
    setCustomExp(activeRole.exp);
    setCustomJd(activeRole.jd);
    setCustomLocation(activeRole.location);
    setCustomRefCodeInput(defaultRefCode);
    triggerToast('Reset details to original position template.');
  };

  // Filter employees based on search console input
  const filteredEmployees = employees.filter(e => 
    e.empId.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    e.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    e.code.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    e.role.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  // Compute final Display Values (Custom overrides when isEditingDetails is true)
  const displayTitle = isEditingDetails ? customRoleTitle : activeRole.title;
  const displayExp = isEditingDetails ? customExp : activeRole.exp;
  const displayJd = isEditingDetails ? customJd : activeRole.jd;
  const displayLocation = isEditingDetails ? customLocation : activeRole.location;
  const displayRefCode = isEditingDetails ? customRefCodeInput : defaultRefCode;

  // Base URL & Apply URL calculation
  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://ispatialtec.com';
  const baseUrl = domainOption === 'current' 
    ? currentHost 
    : domainOption === 'ispatial' 
      ? 'https://ispatialtec.com' 
      : (customDomain.replace(/\/$/, '') || currentHost);

  const roleSlug = (displayTitle || activeRole.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const applyUrl = `${baseUrl}/careers/${roleSlug}`;

  // Formatted job post text block as specified in design
  const formattedJobPost = `Role:\n${displayTitle}\n\nExp:\n${displayExp}\n\nJD:\n${displayJd}\n\nLocation:\n${displayLocation}\n\nApply URL:\n${applyUrl}`;

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyJobOpening = () => {
    navigator.clipboard.writeText(formattedJobPost);
    setCopied(true);
    triggerToast('Job Opening & Referral Link Copied to Clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyUrlOnly = () => {
    navigator.clipboard.writeText(applyUrl);
    setCopiedUrlOnly(true);
    triggerToast('Apply URL Copied!');
    setTimeout(() => setCopiedUrlOnly(false), 2500);
  };

  const shareOnWhatsApp = () => {
    const waText = encodeURIComponent(`Hi! Check out this open position at iSpatialTec:\n\n${formattedJobPost}`);
    window.open(`https://api.whatsapp.com/send?text=${waText}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Job Opportunity at iSpatialTec: ${displayTitle}`);
    const body = encodeURIComponent(`Hi,\n\nI wanted to share this job opportunity at iSpatialTec with you:\n\n${formattedJobPost}\n\nBest regards,\n${activeEmployee.name}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const openEmployeeModal = (emp) => {
    setSelectedEmployee(emp);
    setIsCustomMode(false);
    setIsModalOpen(true);
  };

  return (
    <div className="public-portal" style={{ minHeight: '100vh', backgroundColor: '#070b14', color: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 2500,
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '14px 24px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '600',
          fontSize: '14px'
        }}>
          <CheckCircle2 size={18} />
          {toastMessage}
        </div>
      )}

      {/* 1. Navigation Header */}
      <nav style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100, padding: '16px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/careers')}>
            <div style={{ position: 'relative', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/world-logo.gif" alt="globe" style={{ width: '34px', height: '34px' }} />
              <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/logo-tick.png" alt="tick" style={{ position: 'absolute', width: '34px', height: '34px' }} />
            </div>
            <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/logo-text.svg" alt="iSpatial Techno Solutions" style={{ height: '26px' }} />
          </div>

          {/* Quick Nav Links */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>
              Internal Employee Portal
            </span>
            <button 
              onClick={() => navigate('/careers')}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              Careers Portal <ExternalLink size={14} />
            </button>
          </div>

        </div>
      </nav>

      {/* 2. Hero Section */}
      <section style={{ padding: '50px 24px 30px', background: 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.18) 0%, rgba(7, 11, 20, 0) 70%)', textAlign: 'center' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', backgroundColor: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
            <Sparkles size={14} /> Internal Employee Verification & Link Generator
          </div>
          
          <h1 style={{ fontSize: '34px', fontWeight: '800', lineHeight: 1.25, marginBottom: '16px', color: '#ffffff' }}>
            Select Employee ID to Generate Referral Code
          </h1>
          
          <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#94a3b8', maxWidth: '680px', margin: '0 auto' }}>
            Search for your Employee ID or Name below. Clicking your ID opens the Referral Generator console to select open positions and copy tracked referral links (`ref=...`).
          </p>
        </div>
      </section>

      {/* 3. STEP 1: Search Console Interface */}
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 60px' }}>
        
        <div style={{
          backgroundColor: '#0d1424',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={20} style={{ color: '#38bdf8' }} />
            Search Employee Console
          </h2>

          {/* Search Console Input Bar */}
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text"
              placeholder="Search by Employee ID (e.g. IST-1092, ABCD1, SC882) or Employee Name..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '48px',
                paddingRight: '16px',
                height: '52px',
                fontSize: '15px',
                borderRadius: '12px',
                backgroundColor: '#070b14',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                outline: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            />
          </div>

          {/* Quick Selection Tags */}
          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>
              Quick Employee ID Selection:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {employees.map(emp => (
                <button
                  key={emp.empId}
                  onClick={() => openEmployeeModal(emp)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#38bdf8';
                    e.currentTarget.style.color = '#070b14';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.1)';
                    e.currentTarget.style.color = '#38bdf8';
                  }}
                >
                  <span>{emp.empId}</span>
                  <span style={{ opacity: 0.8 }}>({emp.name.split(' ')[0]} - {emp.code})</span>
                </button>
              ))}

              <button
                onClick={() => {
                  setIsCustomMode(true);
                  setSelectedEmployee(null);
                  setIsModalOpen(true);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: '#a5b4fc',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                + Custom Employee ID
              </button>
            </div>
          </div>

          {/* Filtered Employee List Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {filteredEmployees.map(emp => (
              <div
                key={emp.empId}
                onClick={() => openEmployeeModal(emp)}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.backgroundColor = '#141d33';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.backgroundColor = '#0f172a';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>
                    ID: {emp.empId}
                  </span>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold' }}>
                    Code: {emp.code}
                  </span>
                </div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>
                  {emp.name}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {emp.role}
                </div>
                <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '12px', color: '#38bdf8', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  Select Position <ArrowRight size={14} />
                </div>
              </div>
            ))}
          </div>

        </div>

      </main>

      {/* 4. STEP 2: Separate Interactive Modal Screen */}
      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 1500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '20px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              padding: '32px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Employee Verified
                </span>

                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', margin: '8px 0 4px 0' }}>
                  {activeEmployee.name}
                </h2>
                <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', gap: '12px' }}>
                  <span>ID: <strong style={{ color: '#ffffff' }}>{activeEmployee.empId}</strong></span>
                  <span>•</span>
                  <span>Ref Code: <strong style={{ color: '#38bdf8' }}>{displayRefCode}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Custom Employee Inputs if Custom Mode */}
            {isCustomMode && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px', backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '14px', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Full Name</label>
                  <input 
                    type="text" 
                    value={customName} 
                    onChange={(e) => setCustomName(e.target.value)} 
                    placeholder="Mohamed Sheik"
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Employee ID</label>
                  <input 
                    type="text" 
                    value={customEmpId} 
                    onChange={(e) => setCustomEmpId(e.target.value)} 
                    placeholder="IST-1092"
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Ref Code</label>
                  <input 
                    type="text" 
                    value={customRefCode} 
                    onChange={(e) => setCustomRefCode(e.target.value)} 
                    placeholder="ABCD1"
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '12px' }}
                  />
                </div>
              </div>
            )}

            {/* Select Job Position Template */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1' }}>
                  Select Job Position *
                </label>

                {/* DEDICATED SEPARATE BUTTON TO CHANGE REFERRAL TOPIC / DETAILS */}
                <button
                  type="button"
                  onClick={() => setIsEditingDetails(!isEditingDetails)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    backgroundColor: isEditingDetails ? '#38bdf8' : 'rgba(56, 189, 248, 0.15)',
                    color: isEditingDetails ? '#070b14' : '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Pencil size={14} />
                  {isEditingDetails ? 'Done Editing' : 'Edit Referral Topic / JD'}
                </button>
              </div>

              <select 
                value={selectedRoleId} 
                onChange={(e) => setSelectedRoleId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#070b14',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.location})
                  </option>
                ))}
              </select>
            </div>

            {/* EXPANDABLE INLINE EDIT PANEL (Toggled via the dedicated button above) */}
            {isEditingDetails && (
              <div style={{
                backgroundColor: 'rgba(56, 189, 248, 0.06)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Pencil size={15} /> Edit Referral Announcement Fields
                  </span>
                  <button
                    onClick={resetEdits}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#94a3b8',
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RotateCcw size={12} /> Reset Defaults
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                      Role Title (e.g. ArcGIS Pro Specialist)
                    </label>
                    <input 
                      type="text" 
                      value={customRoleTitle}
                      onChange={(e) => setCustomRoleTitle(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#070b14', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#ffffff', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                      Experience (e.g. 3 - 5 Years)
                    </label>
                    <input 
                      type="text" 
                      value={customExp}
                      onChange={(e) => setCustomExp(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#070b14', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#ffffff', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                      Location (e.g. Hyderabad / Remote)
                    </label>
                    <input 
                      type="text" 
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#070b14', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#ffffff', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                    Job Description (JD Text Block)
                  </label>
                  <textarea 
                    value={customJd}
                    onChange={(e) => setCustomJd(e.target.value)}
                    rows={3}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#070b14', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#cbd5e1', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              </div>
            )}

            {/* Select Base Domain */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                Target Domain URL:
              </label>
              <select 
                value={domainOption} 
                onChange={(e) => setDomainOption(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#070b14',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#e2e8f0',
                  fontSize: '12px'
                }}
              >
                <option value="current">Current Host Origin ({currentHost})</option>
                <option value="ispatial">Company Production (https://ispatialtec.com)</option>
                <option value="custom">Custom Target Domain...</option>
              </select>

              {domainOption === 'custom' && (
                <input 
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="https://ispatialtec.com"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#070b14',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#38bdf8',
                    fontSize: '12px',
                    marginTop: '6px'
                  }}
                />
              )}
            </div>

            {/* Formatted Announcement & Referral Link Text Box */}
            <div style={{ 
              backgroundColor: '#070b14', 
              border: isEditingDetails ? '1px solid #38bdf8' : '1px solid rgba(99, 102, 241, 0.3)', 
              borderRadius: '12px', 
              padding: '20px', 
              fontFamily: 'Consolas, Monaco, monospace', 
              fontSize: '13px', 
              lineHeight: 1.65, 
              color: '#e2e8f0', 
              whiteSpace: 'pre-wrap', 
              marginBottom: '24px'
            }}>
              <div style={{ color: '#6366f1', fontWeight: 'bold' }}>Role:</div>
              <div style={{ color: '#ffffff', marginBottom: '12px' }}>{displayTitle}</div>
              
              <div style={{ color: '#6366f1', fontWeight: 'bold' }}>Exp:</div>
              <div style={{ color: '#ffffff', marginBottom: '12px' }}>{displayExp}</div>
              
              <div style={{ color: '#6366f1', fontWeight: 'bold' }}>JD:</div>
              <div style={{ color: '#cbd5e1', marginBottom: '12px' }}>{displayJd}</div>
              
              <div style={{ color: '#6366f1', fontWeight: 'bold' }}>Location:</div>
              <div style={{ color: '#ffffff', marginBottom: '12px' }}>{displayLocation}</div>
              
              <div style={{ color: '#6366f1', fontWeight: 'bold' }}>Apply URL:</div>
              <div style={{ color: '#38bdf8', wordBreak: 'break-all' }}>{applyUrl}</div>
            </div>

            {/* Primary Action Button: COPY JOB OPENING */}
            <button 
              onClick={handleCopyJobOpening}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: copied ? '#10b981' : '#6366f1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: copied ? '0 8px 20px rgba(16, 185, 129, 0.3)' : '0 8px 20px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.2s ease',
                marginBottom: '12px'
              }}
            >
              {copied ? (
                <>
                  <Check size={18} />
                  Copied Job Opening to Clipboard!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy Job Opening
                </>
              )}
            </button>

            {/* Secondary Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <button 
                onClick={handleCopyUrlOnly}
                style={{
                  padding: '10px',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {copiedUrlOnly ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                URL Only
              </button>

              <button 
                onClick={shareOnWhatsApp}
                style={{
                  padding: '10px',
                  backgroundColor: 'rgba(37, 211, 102, 0.15)',
                  border: '1px solid rgba(37, 211, 102, 0.3)',
                  borderRadius: '8px',
                  color: '#25d366',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <MessageSquare size={14} />
                WhatsApp
              </button>

              <button 
                onClick={shareViaEmail}
                style={{
                  padding: '10px',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '8px',
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Mail size={14} />
                Email
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '24px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
        © {new Date().getFullYear()} iSpatial Techno Solutions. All rights reserved. Internal Employee Referral Portal.
      </footer>

    </div>
  );
}
