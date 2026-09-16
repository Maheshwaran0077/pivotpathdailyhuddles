import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, BarChart3, AlertCircle, CheckCircle, Flame, 
  Settings, Mail, RefreshCw, MessageSquare, Terminal, ServerOff, Check, Loader2
} from 'lucide-react';
import axios from 'axios';
import ChatbotWidget from './components/ChatbotWidget';
import RichTextEmailModal from './components/RichTextEmailModal';

// API configuration
const API_URL = (window.location.port && window.location.port !== '8000')
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : window.location.origin;

const EXPRESS_API = (window.location.port && window.location.port !== '5000')
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : 'http://localhost:5000';

const App = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('board');
  const [selectedHodForModal, setSelectedHodForModal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [dispatchingKey, setDispatchingKey] = useState(null);
  const [activePopupDept, setActivePopupDept] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleWatchdogDispatch = async (dept, directiveText) => {
    if (!dept.hod_email) {
      showToast('❌ HOD email not configured for this department.', 'error');
      return;
    }

    setDispatchingKey(`${dept.key}-${directiveText}`);

    const todayStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata'
    });

    const totalCount = dept.alert_count + dept.success_count;
    const alertRate = totalCount > 0 ? Math.round((dept.alert_count / totalCount) * 100) : 0;

    let subject = '';
    let emailBody = '';
    let riskColor = '';
    let riskLabel = '';

    if (dept.key === 'fgmw') {
      subject = `[CRITICAL HIGH PRIORITY WATCHDOG] Immediate Directive - ${dept.name} | ${todayStr}`;
      riskColor = '#dc2626';
      riskLabel = 'CRITICAL HIGH PRIORITY';
    } else if (dept.key === 'pmw') {
      subject = `[WARNING MEDIUM PRIORITY WATCHDOG] Action Required - ${dept.name} | ${todayStr}`;
      riskColor = '#ea580c';
      riskLabel = 'WARNING MEDIUM PRIORITY';
    } else {
      subject = `[NOTICE MODERATE PRIORITY WATCHDOG] Status Check - ${dept.name} | ${todayStr}`;
      riskColor = '#ca8a04';
      riskLabel = 'NOTICE MODERATE PRIORITY';
    }

    emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid ${riskColor}; border-radius: 8px; color: #333;">
        <h2 style="color: ${riskColor}; margin-top: 0;">🚨 ${riskLabel} WATCHDOG ALERT</h2>
        <p>Dear <strong>${dept.hod_name}</strong> (Head of Department),</p>
        <p>This is an automated background watchdog directive from the Superadmin console regarding <strong>${dept.name}</strong>.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid ${riskColor}; padding: 15px; margin: 15px 0;">
          <strong>Directive Instruction:</strong> <span style="font-size: 16px; font-weight: bold; color: ${riskColor};">"${directiveText}"</span><br/><br/>
          <strong>Current Operational Metrics:</strong><br/>
          • Active Alert Volume: <strong>${dept.alert_count}</strong> Alerts<br/>
          • Calculated Alert Rate: <strong>${alertRate}%</strong><br/>
          • Log Checkpoints Success: <strong>${dept.success_count}</strong> logs
        </div>
        <p>Please review your department dashboard telemetry immediately and initiate necessary action logs.</p>
        <p style="margin-top: 20px; font-size: 11px; color: #64748b;">Regards,<br/><strong>PivotPath Superadministrator Portal</strong></p>
      </div>
    `;

    try {
      let response;
      try {
        response = await axios.post(`${API_URL}/api/v1/admin/send-mail`, {
          recipient_email: dept.hod_email,
          subject,
          body: emailBody
        });
      } catch (err) {
        console.warn('FastAPI send-mail failed, trying Express port 5000 fallback...');
        response = await axios.post(`${EXPRESS_API}/api/admin/send-mail`, {
          recipient_email: dept.hod_email,
          subject,
          body: emailBody
        });
      }

      if (response.data.status === 'success') {
        showToast('✅ Watchdog dispatch successful: Email sent directly to HOD', 'success');
      } else {
        showToast(`❌ Watchdog dispatch failed: ${response.data.message || 'Server error.'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      const errDetail = err.response?.data?.error || err.response?.data?.detail || 'SMTP connection timeout.';
      showToast(`❌ Watchdog dispatch failed: ${errDetail}`, 'error');
    } finally {
      setDispatchingKey(null);
    }
  };

  // Fetch summary data from python FastAPI endpoint
  const fetchSummary = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await axios.get(`${API_URL}/api/v1/admin/summary`);
      setSummaryData(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching summary:', err);
      setError('Could not connect to Python backend server on port 8000. Start backend using uvicorn.');
      
      // Fallback mock data structure for a premium visual presentation in offline modes
      setSummaryData({
        date: new Date().toISOString().split('T')[0],
        date_formatted: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        alert_count: 13,
        success_count: 63,
        error_count: 4,
        data_source: 'Hybrid Local Sandbox (Offline Fallback)',
        departments: [
          { key: 'ppp', name: 'Primary Packing Production', risk_level: 'Red', alert_count: 4, success_count: 2, error_count: 1, hod_name: 'Sanjay Mehta', hod_email: 'sanjay.mehta@arcolab.com' },
          { key: 'pro', name: 'Production', risk_level: 'Red', alert_count: 3, success_count: 5, error_count: 2, hod_name: 'Dr. Ananya Iyer', hod_email: 'ananya.iyer@arcolab.com' },
          { key: 'pmw', name: 'Packing Material Warehouse', risk_level: 'Orange', alert_count: 2, success_count: 6, error_count: 0, hod_name: 'Ramesh Patel', hod_email: 'ramesh.patel@arcolab.com' },
          { key: 'qcmad', name: 'QC & Microbiology Lab', risk_level: 'Orange', alert_count: 2, success_count: 8, error_count: 1, hod_name: 'Vikram Malhotra', hod_email: 'vikram.malhotra@arcolab.com' },
          { key: 'rmw', name: 'Raw Material Warehouse', risk_level: 'Amber', alert_count: 1, success_count: 7, error_count: 0, hod_name: 'Amit Sharma', hod_email: 'amit.sharma@arcolab.com' },
          { key: 'fgmw', name: 'Finished Goods Warehouse', risk_level: 'Amber', alert_count: 1, success_count: 8, error_count: 0, hod_name: 'Karthik Raja', hod_email: 'karthik.raja@arcolab.com' },
          { key: 'pop', name: 'Post Production', risk_level: 'Green', alert_count: 0, success_count: 9, error_count: 0, hod_name: 'Dr. Mahesh Kumar', hod_email: 'mahesh.kumar@arcolab.com' },
          { key: 'fac', name: 'Facilities', risk_level: 'Green', alert_count: 0, success_count: 10, error_count: 0, hod_name: 'Preeti Singh', hod_email: 'preeti.singh@arcolab.com' },
          { key: 'spp', name: 'Secondary Packing Production', risk_level: 'Green', alert_count: 0, success_count: 11, error_count: 0, hod_name: 'Suresh Raina', hod_email: 'suresh.raina@arcolab.com' }
        ]
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Open the rich text modal composer
  const handleOpenRichText = (hod) => {
    setSelectedHodForModal(hod);
    setShowModal(true);
  };

  const handleCloseModal = (wasSent = false) => {
    setShowModal(false);
    setSelectedHodForModal(null);
    if (wasSent) {
      fetchSummary(); // Reload statistics if email changed state
    }
  };

  // Yield percentage calculation
  const calculateYield = () => {
    if (!summaryData) return 0;
    const total = summaryData.success_count + summaryData.alert_count;
    if (total === 0) return 100;
    return Math.round((summaryData.success_count / total) * 100);
  };

  return (
    <div className="app-container">
      {/* Sidebar Shell */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Shield size={20} className="text-white" />
          </div>
          <div className="logo-text">
            <h1>PivotPath</h1>
            <p>SuperAdmin Portal</p>
          </div>
        </div>

        <nav className="sidebar-menu">
          <button 
            className={`menu-item ${activeTab === 'board' ? 'active' : ''}`}
            onClick={() => setActiveTab('board')}
          >
            <BarChart3 size={16} />
            <span>Operational Board</span>
          </button>
          
          <button 
            className={`menu-item ${activeTab === 'hods' ? 'active' : ''}`}
            onClick={() => setActiveTab('hods')}
          >
            <Mail size={16} />
            <span>HOD Communications</span>
          </button>
        </nav>
        
        {/* Connection status card */}
        <div style={{ marginTop: 'auto', padding: '16px', background: 'rgba(4, 20, 15, 0.6)', borderRadius: '16px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pulse-dot" style={{ backgroundColor: error ? '#ef4444' : '#10b981', boxShadow: error ? '0 0 10px #ef4444' : '0 0 10px #10b981' }}></span>
            <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: error ? '#f87171' : '#34d399' }}>
              {error ? 'OFFLINE' : 'ONLINE'}
            </span>
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            {error ? 'Visualizing fallback dashboard mode.' : 'Successfully connected to SMTP mail & MongoDB APIs.'}
          </p>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {/* Toast Notification */}
        {toast.show && (
          <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 24px',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            border: toast.type === 'error' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
            backgroundColor: toast.type === 'error' ? '#7f1d1d' : '#064e3b',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: '700'
          }}>
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        )}
        {/* Header */}
        <header className="app-header">
          <div className="header-title">
            <h2>SuperAdmin Analytics Console</h2>
            <p>Today's Telemetry overview and instant pipeline dispatch control</p>
          </div>

          <div className="header-actions">
            <button 
              className="btn-contact" 
              onClick={fetchSummary}
              disabled={refreshing}
              style={{ padding: '8px 16px', borderRadius: '10px' }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh Metrics</span>
            </button>
            <div className="badge-live">
              <span className="pulse-dot"></span>
              <span>Live Feed</span>
            </div>
          </div>
        </header>

        {/* Viewport Dashboard */}
        <div className="dashboard-viewport">
          
          {/* Offline Banner */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px', color: '#f87171', fontSize: '12.5px' }}>
              <ServerOff size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Stat Cards */}
          {summaryData && (
            <div className="stats-grid">
              
              <div className="stat-card">
                <div className="stat-card-header">
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Active Alerts</span>
                  <div className="stat-icon-wrap alert">
                    <AlertCircle size={18} />
                  </div>
                </div>
                <div className="stat-card-body">
                  <h3>{summaryData.alert_count}</h3>
                  <p>Telemetries flagging thresholds</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Operation Successes</span>
                  <div className="stat-icon-wrap success">
                    <CheckCircle size={18} />
                  </div>
                </div>
                <div className="stat-card-body">
                  <h3>{summaryData.success_count}</h3>
                  <p>Checkpoints reporting normal</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Downtime Failures</span>
                  <div className="stat-icon-wrap error">
                    <Flame size={18} />
                  </div>
                </div>
                <div className="stat-card-body">
                  <h3>{summaryData.error_count}</h3>
                  <p>Process exceptions logged</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Operations Yield Index</span>
                  <div className="stat-icon-wrap yield">
                    <BarChart3 size={18} />
                  </div>
                </div>
                <div className="stat-card-body">
                  <h3>{calculateYield()}%</h3>
                  <p>Success vs anomaly ratio</p>
                </div>
              </div>

            </div>
          )}

          {/* Department Breakdown Section */}
          {activeTab === 'board' && summaryData && (
            <div className="board-section">
              <div className="board-header">
                <h3>Plant Risk Breakdown</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Sorted by risk severity index
                </span>
              </div>

              <div className="board-grid">
                {summaryData.departments?.map(dept => {
                  const isWarehouse = ['fgmw', 'pmw', 'rmw'].includes(dept.key);
                  const totalCount = dept.alert_count + dept.success_count;
                  const alertRate = totalCount > 0 ? Math.round((dept.alert_count / totalCount) * 100) : 0;
                  
                  let cardBg = '';
                  let cardStyle = {};
                  let textStyle = {};
                  let riskLabelText = dept.risk_level;
                  
                  if (dept.key === 'fgmw') {
                    cardBg = 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)';
                    riskLabelText = 'High Alert';
                  } else if (dept.key === 'pmw') {
                    cardBg = 'linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)';
                    riskLabelText = 'Medium Alert';
                  } else if (dept.key === 'rmw') {
                    cardBg = 'linear-gradient(135deg, #a16207 0%, #713f12 100%)';
                    riskLabelText = 'Moderate Alert';
                  }

                  if (isWarehouse) {
                    cardStyle = {
                      background: cardBg,
                      color: '#ffffff',
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                    };
                    textStyle = {
                      color: '#ffffff',
                    };
                  }

                  return (
                    <div key={dept.key} className={`dept-card ${dept.risk_level}`} style={cardStyle}>
                      
                      <div className="dept-header-wrap">
                        <div className="dept-meta">
                          <h4 className="dept-name" style={textStyle}>{dept.name}</h4>
                          <span className="dept-code" style={isWarehouse ? { color: 'rgba(255,255,255,0.7)' } : {}}>{dept.key}</span>
                        </div>
                        <span className={`risk-pill ${dept.risk_level}`} style={isWarehouse ? { backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.3)' } : {}}>
                          {riskLabelText}
                        </span>
                      </div>

                      <div className="dept-stats" style={isWarehouse ? { backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}>
                        <div className="dept-stat-item">
                          <span className="dept-stat-label" style={isWarehouse ? { color: '#fca5a5' } : {}}>Alerts</span>
                          <span className="dept-stat-val alert" style={isWarehouse ? { color: '#ffffff' } : {}}>{dept.alert_count}</span>
                        </div>
                        <div style={{ width: '1px', height: '24px', background: isWarehouse ? 'rgba(255, 255, 255, 0.2)' : 'rgba(16, 185, 129, 0.15)' }}></div>
                        <div className="dept-stat-item">
                          <span className="dept-stat-label" style={isWarehouse ? { color: '#fca5a5' } : {}}>Alert Rate</span>
                          <span className="dept-stat-val success" style={isWarehouse ? { color: '#ffffff' } : {}}>{alertRate}%</span>
                        </div>
                        <div style={{ width: '1px', height: '24px', background: isWarehouse ? 'rgba(255, 255, 255, 0.2)' : 'rgba(16, 185, 129, 0.15)' }}></div>
                        <div className="dept-stat-item">
                          <span className="dept-stat-label" style={isWarehouse ? { color: '#fca5a5' } : {}}>Errors</span>
                          <span className="dept-stat-val error" style={isWarehouse ? { color: '#ffffff' } : {}}>{dept.error_count}</span>
                        </div>
                      </div>

                      <div className="dept-hod-footer" style={{ borderTop: isWarehouse ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="hod-info" style={{ textAlign: 'left' }}>
                            <span className="hod-label" style={isWarehouse ? { color: '#fca5a5' } : {}}>HOD MANAGER</span>
                            <span className="hod-name" style={isWarehouse ? { color: '#ffffff' } : {}}>{dept.hod_name}</span>
                            <span style={{ fontSize: '9px', display: 'block', color: isWarehouse ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)', fontFamily: 'var(--font-family-mono)', marginTop: '2px' }}>
                              {dept.hod_email}
                            </span>
                          </div>

                          <button 
                            className="btn-contact"
                            onClick={() => setActivePopupDept(dept)}
                            style={isWarehouse ? { backgroundColor: '#ffffff', color: dept.key === 'fgmw' ? '#b91c1c' : dept.key === 'pmw' ? '#c2410c' : '#a16207', borderColor: 'transparent' } : {}}
                          >
                            <Mail size={12} />
                            <span>Email HOD</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* HOD List View Tab */}
          {activeTab === 'hods' && summaryData && (
            <div className="board-section">
              <div className="board-header">
                <h3>Executive Department Directory</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Send instant directives directly to manager emails silently via backend SMTP relay.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-card)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(20px)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(16, 185, 129, 0.15)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: '700' }}>HOD Manager</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700' }}>Assigned Department</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700' }}>Email Address</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700' }}>Risk Context</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.departments?.map(dept => {
                      const badgeColor = 
                        dept.risk_level === 'Red' ? '#ef4444' : 
                        dept.risk_level === 'Orange' ? '#f97316' : 
                        dept.risk_level === 'Amber' ? '#f59e0b' : '#10b981';

                      return (
                        <tr key={dept.key} style={{ borderBottom: '1px solid rgba(16, 185, 129, 0.06)', transition: 'all 0.2s' }} className="table-row-hover">
                          <td style={{ padding: '16px', fontWeight: '700' }}>{dept.hod_name}</td>
                          <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{dept.name} ({dept.key.toUpperCase()})</td>
                          <td style={{ padding: '16px', fontFamily: 'var(--font-family-mono)', color: 'var(--text-muted)' }}>{dept.hod_email}</td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ fontSize: '9.5px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', background: `${badgeColor}15`, color: badgeColor, border: `1px solid ${badgeColor}33`, textTransform: 'uppercase' }}>
                              {dept.risk_level}
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <button 
                              className="btn-contact"
                              style={{ display: 'inline-flex', marginLeft: 'auto' }}
                              onClick={() => handleOpenRichText(dept)}
                            >
                              <Mail size={12} />
                              <span>Compose Directive</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Floating Chatbot Assistant Widget */}
        <ChatbotWidget 
          summaryData={summaryData} 
          onOpenRichText={handleOpenRichText}
          onRefreshSummary={fetchSummary}
        />

        {/* Compose Rich Text Direct Mail Modal Overlay */}
        {showModal && selectedHodForModal && (
          <RichTextEmailModal 
            hod={selectedHodForModal} 
            onClose={handleCloseModal}
            departmentSummary={summaryData}
          />
        )}

        {/* HOD Directive Options Popup Modal */}
        {activePopupDept && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setActivePopupDept(null)}>
            <div className="modal-content" style={{ maxWidth: '420px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #059669, #0d9488)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)'
                  }}>
                    <Mail size={16} className="text-white" />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email HOD Directive</h3>
                    <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Select directive type for {activePopupDept.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActivePopupDept(null)} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  className="hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Meet me immediately', val: 'Meet me immediately' },
                  { label: 'Take a look of your department', val: 'Take a look of your department' },
                  { label: 'Your department in danger', val: 'Your department in danger' }
                ].map((opt) => {
                  const isDispatching = dispatchingKey === `${activePopupDept.key}-${opt.val}`;
                  return (
                    <button
                      key={opt.label}
                      disabled={!!dispatchingKey}
                      onClick={async () => {
                        await handleWatchdogDispatch(activePopupDept, opt.val);
                        setActivePopupDept(null);
                      }}
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                        color: 'var(--text-primary)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      className="hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚡</span>
                        <span>{opt.label}</span>
                      </span>
                      {isDispatching && <Loader2 size={14} className="animate-spin text-emerald-400" />}
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    handleOpenRichText(activePopupDept);
                    setActivePopupDept(null);
                  }}
                  style={{
                    backgroundColor: 'var(--primary)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  className="hover:bg-emerald-500 active:scale-[0.98]"
                >
                  <span>✍️</span>
                  <span>Custom</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
