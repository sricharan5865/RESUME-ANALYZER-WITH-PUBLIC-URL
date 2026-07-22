import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Briefcase } from 'lucide-react';

export default function Careers({ backendUrl }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${backendUrl}/api/public/jobs`)
      .then(r => r.json())
      .then(data => {
        setJobs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch jobs', err);
        setLoading(false);
      });
  }, [backendUrl]);

  const filtered = jobs.filter(j => 
    j.title.toLowerCase().includes(search.toLowerCase()) || 
    j.department.toLowerCase().includes(search.toLowerCase())
  );

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

        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '16px' }}>Join Our Team</h1>
          <p style={{ fontSize: '18px' }}>We're looking for passionate people to join us on our mission.</p>
        </header>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search roles or departments..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field"
              style={{ width: '100%', paddingLeft: '44px' }}
            />
          </div>
          <button 
            onClick={() => navigate('/apply')}
            className="btn-brand"
          >
            Job Application Form
          </button>
          <button 
            onClick={() => navigate('/status')}
            className="btn-secondary-brand"
          >
            Check Application Status
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#bdbdbd' }}>Loading open positions...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filtered.length === 0 ? (
              <div className="portal-card" style={{ textAlign: 'center', padding: '40px' }}>
                No positions found matching your search.
              </div>
            ) : (
              filtered.map(job => (
                <div key={job.id} className="portal-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{job.title}</h3>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase size={14} style={{ color: '#4972c2' }} /> {job.department}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} style={{ color: '#4972c2' }} /> {job.location}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate(`/apply/${job.id}`)}
                    className="btn-brand"
                  >
                    Apply
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
