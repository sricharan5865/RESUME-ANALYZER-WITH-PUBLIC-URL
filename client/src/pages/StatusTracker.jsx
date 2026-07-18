import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Activity, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function StatusTracker({ backendUrl }) {
  const { trackingId: urlTrackingId } = useParams();
  const navigate = useNavigate();
  const [trackingId, setTrackingId] = useState(urlTrackingId || '');
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (urlTrackingId) {
      handleSearch(urlTrackingId);
    }
  }, [urlTrackingId]);

  const handleSearch = async (idToSearch = trackingId) => {
    if (!idToSearch.trim()) return;
    setLoading(true);
    setErrorMsg('');
    setStatusData(null);
    try {
      const res = await fetch(`${backendUrl}/api/public/status/${idToSearch}`);
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'No application found with this Tracking ID.' : 'Failed to fetch status');
      }
      const data = await res.json();
      setStatusData(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Offer Accepted':
      case 'Placed':
        return <CheckCircle2 size={48} style={{ color: '#10b981' }} />;
      case 'Rejected':
        return <XCircle size={48} style={{ color: '#ef4444' }} />;
      case 'Inbox':
      case 'AI Processed':
        return <Clock size={48} style={{ color: '#f59e0b' }} />;
      default:
        return <Activity size={48} style={{ color: '#6366f1' }} />;
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'Inbox':
        return 'Your application has been received and is pending review.';
      case 'AI Processed':
        return 'Your profile is currently under review by our AI matching engine.';
      case 'HR Screen':
      case 'Technical Screen':
      case 'Final Interview':
        return 'You are currently in the interviewing stage. Our team will contact you shortly.';
      case 'Offer Extended':
        return 'Congratulations! We have extended an offer. Please check your email.';
      case 'Offer Accepted':
      case 'Placed':
        return 'Welcome to the team! Your application process is complete.';
      case 'Rejected':
        return 'Thank you for your interest. Unfortunately, we will not be moving forward with your application at this time.';
      default:
        return `Your application is in the "${status}" stage.`;
    }
  };

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

        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px' }}>Track Application</h1>
          <p>Enter your Tracking ID to view the status of your application.</p>
        </header>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          <input 
            type="text" 
            placeholder="e.g. IST-2026-123456" 
            value={trackingId}
            onChange={e => setTrackingId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="input-field"
            style={{ flex: 1 }}
          />
          <button 
            onClick={() => handleSearch()}
            disabled={loading}
            className="btn-brand"
          >
            {loading ? 'Searching...' : <><Search size={18} /> Search</>}
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '8px', textAlign: 'center', marginBottom: '24px' }}>
            {errorMsg}
          </div>
        )}

        {statusData && (
          <div className="portal-card" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', background: 'rgba(11, 21, 49, 0.6)', padding: '20px', borderRadius: '50%', marginBottom: '24px', border: '1px solid rgba(81, 89, 102, 0.3)' }}>
              {getStatusIcon(statusData.status)}
            </div>
            
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
              {statusData.status}
            </h2>
            <p style={{ marginBottom: '24px', lineHeight: '1.5' }}>
              {getStatusMessage(statusData.status)}
            </p>

            <div style={{ borderTop: '1px solid rgba(81, 89, 102, 0.3)', margin: '24px 0' }}></div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'left' }}>
              <div>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Role</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>{statusData.role}</span>
              </div>
              <div>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Applied On</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
                  {new Date(statusData.appliedOn).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button 
            onClick={() => navigate('/careers')}
            className="btn-secondary-brand"
            style={{ border: 'none', background: 'none', textDecoration: 'underline' }}
          >
            View all open positions
          </button>
        </div>
      </div>
    </div>
  );
}
