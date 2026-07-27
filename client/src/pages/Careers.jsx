import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Briefcase, Mail, ArrowRight, ExternalLink, Globe, ShieldCheck, HeartHandshake, Building2 } from 'lucide-react';

export default function Careers({ backendUrl }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Fallback sample openings if backend jobs are empty
  const defaultSampleJobs = [
    { id: 'sample-1', title: 'GIS Technical Manager', requiredExperience: '10+ years', location: 'India (Remote)', department: 'Geospatial Solutions' },
    { id: 'sample-2', title: 'Carbon Accounting Specialist', requiredExperience: '8+ years', location: 'Hyderabad', department: 'Environmental Tech' },
    { id: 'sample-3', title: 'Business Analyst', requiredExperience: '4+ years', location: 'India (Remote)', department: 'Business Analysis' },
    { id: 'sample-4', title: 'GIS Project Manager (PMP Certified)', requiredExperience: '8+ years', location: 'UAE/Bahrain', department: 'Project Management' },
    { id: 'sample-5', title: 'Full Stack Team Lead – Development Centre', requiredExperience: '7+ Years', location: 'Ongole', department: 'Engineering' },
    { id: 'sample-6', title: 'GIS Enterprise Administrator', requiredExperience: '8+ years', location: 'UAE', department: 'Infrastructure & GIS' },
    { id: 'sample-7', title: 'Voice / Collaboration Engineer', requiredExperience: '8+ years', location: 'Hyderabad, India', department: 'IT Infrastructure' }
  ];

  useEffect(() => {
    fetch(`${backendUrl}/api/public/jobs`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setJobs(data);
        } else {
          setJobs(defaultSampleJobs);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch public jobs:', err);
        setJobs(defaultSampleJobs);
        setLoading(false);
      });
  }, [backendUrl]);

  const displayJobs = jobs.length > 0 ? jobs : defaultSampleJobs;

  const filtered = displayJobs.filter(j => 
    (j.title || '').toLowerCase().includes(search.toLowerCase()) || 
    (j.department || '').toLowerCase().includes(search.toLowerCase()) ||
    (j.location || '').toLowerCase().includes(search.toLowerCase()) ||
    (j.requiredExperience || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="public-portal" style={{ minHeight: '100vh', backgroundColor: '#070b14', color: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. Official Corporate Navigation Header */}
      <nav style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100, padding: '16px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/careers')}>
            <div className="globe-wrapper" style={{ position: 'relative', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/world-logo.gif" alt="globe" style={{ width: '36px', height: '36px' }} />
              <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/logo-tick.png" alt="tick" style={{ position: 'absolute', width: '36px', height: '36px' }} />
            </div>
            <img src="https://ispatialtec.com/wp-content/themes/ist-wp/images/logo-text.svg" alt="iSpatial Techno Solutions" style={{ height: '28px' }} />
          </div>

          {/* Top Quick Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => navigate('/status')}
              className="btn-secondary-brand"
              style={{ fontSize: '13px', padding: '10px 18px', borderRadius: '8px' }}
            >
              Check Status
            </button>
          </div>

        </div>
      </nav>

      {/* 2. Hero Section */}
      <section style={{ padding: '60px 24px 40px', background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.12) 0%, rgba(7, 11, 20, 0) 100%)', textAlign: 'center' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', fontSize: '13px', fontWeight: '600', marginBottom: '20px' }}>
            <Globe size={14} /> Global Enterprise GIS & AI Technology Leader
          </div>
          
          <h1 style={{ fontSize: '38px', fontWeight: '800', lineHeight: 1.25, marginBottom: '20px', color: '#ffffff' }}>
            Discover a world of innovation, learning, growth and equal opportunities.
          </h1>
          
          <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#94a3b8', marginBottom: '28px' }}>
            We are committed to attract, retain and motivate a diverse, bright, creative and talented workforce eager to learn and grow with us. We provide our team with opportunities to work on cutting-edge GIS, Location Intelligence, and Spatial AI technologies in an entrepreneurial and client-focused environment.
          </p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '12px 20px', borderRadius: '12px', backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '14px', color: '#e2e8f0' }}>
            <Mail size={16} style={{ color: '#38bdf8' }} />
            <span>Send your CV directly to <strong style={{ color: '#ffffff' }}>careers@ispatialtec.com</strong></span>
          </div>
        </div>
      </section>

      {/* 3. CURRENT OPENINGS Tabular Section (Matching Image 2) */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 24px 70px' }}>
        
        {/* Header Title */}
        <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#ffffff', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '32px' }}>
          CURRENT OPENINGS
        </h2>

        {/* Search Input Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="Search by title, location..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '38px',
                paddingRight: '14px',
                height: '38px',
                fontSize: '13px',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Tabular Form Container */}
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
        }}>
          {/* Table Header Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '3fr 1.5fr 2fr 1fr',
            padding: '16px 24px',
            backgroundColor: '#161f36',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            fontWeight: '700',
            fontSize: '14px'
          }}>
            <div>Job Title</div>
            <div>Experience</div>
            <div>Location</div>
            <div style={{ textAlign: 'right' }}></div>
          </div>

          {/* Table Body Rows */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
              Loading current openings...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
              No open positions found matching your search.
            </div>
          ) : (
            filtered.map((job, index) => (
              <div 
                key={job.id || index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '3fr 1.5fr 2fr 1fr',
                  padding: '18px 24px',
                  alignItems: 'center',
                  borderBottom: index === filtered.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.07)',
                  backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                }}
              >
                {/* Job Title */}
                <div style={{ fontSize: '15px', fontWeight: '500', color: '#ffffff' }}>
                  {job.title}
                </div>

                {/* Experience */}
                <div style={{ fontSize: '14px', color: '#cbd5e1' }}>
                  {job.requiredExperience || '4+ years'}
                </div>

                {/* Location */}
                <div style={{ fontSize: '14px', color: '#cbd5e1' }}>
                  {job.location || 'India (Remote)'}
                </div>

                {/* Action Button */}
                <div style={{ textAlign: 'right' }}>
                  <button 
                    onClick={() => navigate(`/apply/${job.id}`)}
                    style={{
                      padding: '8px 22px',
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(56, 189, 248, 0.5)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#38bdf8';
                      e.currentTarget.style.color = '#0f172a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                  >
                    Know More
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </section>

      {/* 4. Global Offices Footer */}
      <footer style={{ backgroundColor: '#030712', borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '60px 24px 30px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} style={{ color: '#38bdf8' }} /> Global Presence & Offices
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            
            {/* USA */}
            <div>
              <h4 style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>USA</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                16225 Park Ten Place, Suite 500, Houston, Texas 77084
              </p>
              <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginTop: '4px' }}>+1 (858) 522 9799</span>
            </div>

            {/* UAE */}
            <div>
              <h4 style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>UAE</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                1002, C54 Building, Al Mamoura, Abu Dhabi, UAE
              </p>
              <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginTop: '4px' }}>+971 2635 5503</span>
            </div>

            {/* Netherlands */}
            <div>
              <h4 style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>NETHERLANDS</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                Akkrumerraklaan 170, 3544TV Utrecht
              </p>
              <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginTop: '4px' }}>+31 640 211 785</span>
            </div>

            {/* Bahrain */}
            <div>
              <h4 style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>BAHRAIN</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                Office 917, Bldg 33, Road 1802, Alhoora
              </p>
              <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginTop: '4px' }}>connectus@ispatialtec.com</span>
            </div>

            {/* India */}
            <div>
              <h4 style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>INDIA</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                3rd Floor 3B, Trendz Metro, Madhapur, Hyderabad 500081
              </p>
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
