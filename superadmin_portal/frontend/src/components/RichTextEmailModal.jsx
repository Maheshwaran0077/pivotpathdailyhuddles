import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, Mail, Send, RefreshCw, AlertCircle, CheckCircle, Loader2
} from 'lucide-react';
import axios from 'axios';

// Backend API root config
const API_URL = 'http://localhost:8000';

const RichTextEmailModal = ({ hod, onClose, departmentSummary }) => {
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const editorRef = useRef(null);

  const riskColor = 
    hod.risk_level === 'Red' ? '#ef4444' : 
    hod.risk_level === 'Orange' ? '#f97316' : 
    hod.risk_level === 'Amber' ? '#f59e0b' : '#10b981';

  // Dynamic template builder based on current stats
  const buildDefaultBody = () => {
    const todayStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', 
      month: 'long', 
      year: 'numeric'
    });
    
    const roleLabel = hod.isSupervisor ? `Supervisor - Shift ${hod.shift}` : 'Head of Department';
    const actionStep3 = hod.isSupervisor 
      ? 'Perform checklist audits on your specific shift line and assets.' 
      : 'Conduct a brief check-in meeting with shift supervisors immediately.';
    
    return `
      <p>Dear <strong>${hod.hod_name}</strong> (${roleLabel}),</p>
      <p>&nbsp;</p>
      <p>I am writing to bring to your immediate attention the performance and telemetry metrics of the <strong>${hod.name}</strong> recorded on <strong>${todayStr}</strong>.</p>
      <p>&nbsp;</p>
      <p>Our operational pipeline has flagged your department with a risk status of <strong style="color: ${riskColor}; text-transform: uppercase;">${hod.risk_level}</strong> due to the following indicators:</p>
      <ul>
        <li><strong>Alert Count:</strong> <span style="color: #ef4444; font-weight: bold;">${hod.alert_count}</span> active alert events</li>
        <li><strong>Success Count:</strong> <span style="color: #10b981; font-weight: bold;">${hod.success_count}</span> successful logs</li>
        <li><strong>Error Count:</strong> <span style="color: #f97316; font-weight: bold;">${hod.error_count}</span> registered exceptions/downtimes</li>
      </ul>
      <p>&nbsp;</p>
      <p>As the ${roleLabel}, your immediate intervention is required to stabilize operations. Please execute the following actions:</p>
      <ol>
        <li>Perform a deep audit on all active shifts today.</li>
        <li>Isolate and resolve recurring mechanical or process deviations.</li>
        <li>${actionStep3}</li>
        <li>Report back to SuperAdmin with a corrective action checklist within 24 hours.</li>
      </ol>
      <p>&nbsp;</p>
      <p>You can review detailed analytics on the management console dashboard.</p>
      <p>&nbsp;</p>
      <p>Regards,</p>
      <p><strong>Superadministrator</strong><br/>Industrial Management Operations Dashboard</p>
    `;
  };

  useEffect(() => {
    // Generate default fields
    const targetRole = hod.isSupervisor ? 'Supervisor' : 'HOD';
    setSubject(`[URGENT] Operations Performance Alert to ${targetRole}: ${hod.name} | Status: ${hod.risk_level.toUpperCase()}`);
    if (editorRef.current) {
      editorRef.current.innerHTML = buildDefaultBody();
    }
  }, [hod]);

  // Execute styling commands inside contentEditable
  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleReset = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = buildDefaultBody();
    }
  };

  const handleSend = async () => {
    if (!editorRef.current) return;
    
    setSending(true);
    setError('');
    setSuccess(false);
    
    const emailBody = editorRef.current.innerHTML;

    try {
      const response = await axios.post(`${API_URL}/api/v1/admin/send-mail`, {
        recipient_email: hod.hod_email,
        subject: subject,
        body: emailBody
      });
      
      if (response.data.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          onClose(true); // Notify parent sending was completed
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'SMTP pipeline encountered a socket timeout. Verify backend SMTP credentials.');
    } finally {
      setSending(false);
    }
  };

  const recipientLabel = hod.isSupervisor ? `Supervisor (Shift ${hod.shift})` : 'HOD';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon">
              <Mail size={16} className="text-white" />
            </div>
            <div className="modal-title">
              <h3>Compose In-App Dispatch</h3>
              <p className="modal-subtitle">Direct {hod.isSupervisor ? 'Supervisor' : 'HOD'} Alert Pipeline</p>
            </div>
          </div>
          <button className="btn-modal-close" onClick={() => onClose()}>
            <X size={18} />
          </button>
        </div>

        {/* Info Rows */}
        <div className="modal-form-fields">
          <div className="form-row">
            <span className="form-label">To</span>
            <div className="form-input-box">
              <span className="form-input-text">{hod.hod_name} ({hod.hod_email})</span>
              <span className="risk-pill" style={{ marginLeft: 'auto', backgroundColor: `${riskColor}1A`, color: riskColor, border: `1px solid ${riskColor}33`, padding: '2px 8px', fontSize: '9px', borderRadius: '10px', fontWeight: '800' }}>
                {recipientLabel}
              </span>
            </div>
          </div>
          
          <div className="form-row">
            <span className="form-label">Subject</span>
            <div className="form-input-box">
              <input 
                type="text" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                placeholder="Enter email subject header..."
              />
            </div>
          </div>
        </div>

        {/* Editor Toolbar */}
        <div className="editor-toolbar">
          <button className="toolbar-btn" onClick={() => formatText('bold')} title="Bold">
            <Bold size={13} />
          </button>
          <button className="toolbar-btn" onClick={() => formatText('italic')} title="Italic">
            <Italic size={13} />
          </button>
          <button className="toolbar-btn" onClick={() => formatText('underline')} title="Underline">
            <Underline size={13} />
          </button>
          
          <div className="toolbar-divider"></div>
          
          <button className="toolbar-btn" onClick={() => formatText('justifyLeft')} title="Align Left">
            <AlignLeft size={13} />
          </button>
          <button className="toolbar-btn" onClick={() => formatText('justifyCenter')} title="Align Center">
            <AlignCenter size={13} />
          </button>
          <button className="toolbar-btn" onClick={() => formatText('justifyRight')} title="Align Right">
            <AlignRight size={13} />
          </button>
          
          <div className="toolbar-divider"></div>
          
          <button className="toolbar-btn" onClick={() => formatText('insertUnorderedList')} title="Bullet List">
            <List size={13} />
          </button>
          <button className="toolbar-btn" onClick={() => formatText('insertOrderedList')} title="Numbered List">
            <ListOrdered size={13} />
          </button>
          
          <div className="toolbar-divider"></div>
          
          {/* Colors */}
          <button className="toolbar-btn" style={{ color: '#ef4444' }} onClick={() => formatText('foreColor', '#ef4444')} title="Color Red">●</button>
          <button className="toolbar-btn" style={{ color: '#f59e0b' }} onClick={() => formatText('foreColor', '#f59e0b')} title="Color Amber">●</button>
          <button className="toolbar-btn" style={{ color: '#10b981' }} onClick={() => formatText('foreColor', '#10b981')} title="Color Green">●</button>
          <button className="toolbar-btn" style={{ color: '#e6f7f2' }} onClick={() => formatText('foreColor', '#e6f7f2')} title="Color Reset">●</button>

          <div className="toolbar-divider"></div>
          
          {/* Font Sizes */}
          <button className="toolbar-btn" onClick={() => formatText('fontSize', '2')} title="Small Text" style={{ fontSize: '10px' }}>A-</button>
          <button className="toolbar-btn" onClick={() => formatText('fontSize', '4')} title="Large Text" style={{ fontSize: '14px' }}>A+</button>
          
          <button className="btn-reset-template" onClick={handleReset}>
            <RefreshCw size={10} /> Reset
          </button>
        </div>

        {/* Text Area */}
        <div className="editor-container">
          <div 
            className="editor-textarea" 
            contentEditable 
            ref={editorRef}
            suppressContentEditableWarning
            style={{ fontFamily: "'Outfit', sans-serif" }}
          />
        </div>

        {/* Notification warnings */}
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderTop: '1px solid rgba(239, 68, 68, 0.2)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 24px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderTop: '1px solid rgba(16, 185, 129, 0.2)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', padding: '10px 24px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
            <CheckCircle size={14} style={{ flexShrink: 0 }} />
            <span>Transmission Successful! Mail dispatched silently.</span>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          <div className="footer-notice">
            <Mail size={12} className="text-emerald-500" />
            <span>Dispatched through backend SMTP relay</span>
          </div>
          
          <div className="modal-actions">
            <button className="btn-modal-cancel" onClick={() => onClose()} disabled={sending}>
              Cancel
            </button>
            <button 
              className="btn-modal-send" 
              onClick={handleSend} 
              disabled={sending || success}
            >
              {sending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Sending...
                </>
              ) : success ? (
                'Sent'
              ) : (
                <>
                  <Send size={13} />
                  Send Mail
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RichTextEmailModal;
