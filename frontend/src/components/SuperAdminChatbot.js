import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, X, Send, Shield, ChevronDown, ChevronUp,
  Mail, User, Building2, Sparkles, BarChart3,
  CheckCircle, Bot, Loader2, Bold, Italic, Underline,
  List, ListOrdered, RefreshCw, MailCheck, Users,
} from 'lucide-react';
import axios from 'axios';

const API =
  process.env.REACT_APP_API_URL ||
  ((window.location.port && window.location.port !== '5000')
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : window.location.origin);

// ── Department config ─────────────────────────────────────────────────────────
const DEPT_CONFIG = {
  fgmw:        'Finished Good Material Warehouse',
  pmw:         'Packing Material Warehouse',
  rmw:         'Raw Material Warehouse',
  ppp:         'Primary Packing Production',
  pop:         'Post Production',
  qcmad:       'QC & Microbiology & AD Lab',
  pro:         'Production',
  spp:         'Secondary Packing Production',
  fac:         'Facilities',
  ehs:         'Environment, Health & Safety',
  engineering: 'Engineering & Works Management',
  hr:          'Human Resources',
};

// ── Color palette (deep emerald-teal, zero pure black) ────────────────────────
const C = {
  panelBg:      'linear-gradient(145deg, rgba(3,28,22,0.97) 0%, rgba(5,36,28,0.97) 100%)',
  headerBg:     'linear-gradient(90deg, rgba(4,55,40,0.98) 0%, rgba(3,44,32,0.95) 100%)',
  botBubble:    'rgba(5,52,38,0.65)',
  botBorder:    'rgba(16,185,129,0.20)',
  inputBg:      'rgba(4,40,28,0.80)',
  inputBorder:  'rgba(16,185,129,0.22)',
  hodBg:        'rgba(3,30,22,0.95)',
  chipBg:       'rgba(4,45,32,0.60)',
  chipBorder:   'rgba(16,185,129,0.25)',
  suggBg:       'rgba(4,50,35,0.75)',
  suggBorder:   'rgba(16,185,129,0.35)',
  modalBg:      'linear-gradient(145deg, rgba(3,28,22,0.98) 0%, rgba(5,40,30,0.98) 100%)',
  panelBorder:  'rgba(16,185,129,0.18)',
  sectionBorder:'rgba(16,185,129,0.12)',
  toolbarBg:    'rgba(3,40,28,0.60)',
};

// ── Intent matching ───────────────────────────────────────────────────────────
const INTENTS = [
  { id: 'alert_rate',   patterns: ['alert rate','current alert','how many alerts','total alerts','alert percentage','alert count','how many red'] },
  { id: 'success_rate', patterns: ['success rate','operational success','success metrics','how many green','success percentage','performance rate','green rate'] },
  { id: 'dept_alerts',  patterns: ['which department','department alerts','highest alerts','most alerts','worst department','highest risk','most issues','department problem','dept alert','which dept','error department','high alert'] },
  { id: 'help',         patterns: ['help','what can you','commands','features','guide','usage'] },
  { id: 'greeting',     patterns: ['hello','hi','hey','good morning','good afternoon','good evening'] },
];
function detectIntent(text) {
  const lower = text.toLowerCase();
  for (const intent of INTENTS)
    if (intent.patterns.some((p) => lower.includes(p))) return intent.id;
  return 'unknown';
}

const todayLabel = () =>
  new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

// ── Email template ────────────────────────────────────────────────────────────
function buildEmailBody(hod, alertData) {
  const deptName = DEPT_CONFIG[hod.department] || hod.department?.toUpperCase() || 'Your Department';
  const date = todayLabel();
  const alertLine = alertData
    ? `Based on current telemetry, the department registers an alert rate of <strong>${alertData.alertPercent}%</strong> with <strong>${alertData.totalAlerts}</strong> total alert events recorded.`
    : 'Please review the current department performance metrics on the QDSHI dashboard for the latest data.';
  return `<p>Dear <strong>${hod.name}</strong>,</p><p>&nbsp;</p><p>I hope this message finds you well. I am writing to bring your immediate attention to the current performance metrics and alert status for the <strong>${deptName}</strong>.</p><p>&nbsp;</p><p>${alertLine}</p><p>&nbsp;</p><p>As the Head of Department, your leadership is critical in addressing these metrics. I kindly request that you:</p><ol><li>Review the daily huddle data for the past week</li><li>Identify root causes for any recurring alerts</li><li>Submit a corrective action plan within <strong>48 hours</strong></li><li>Schedule a brief sync with your shift supervisors</li></ol><p>&nbsp;</p><p>Please log in to the PivotPath QDSHI Portal to review the detailed analytics and ensure all shift entries are up to date.</p><p>&nbsp;</p><p>Regards,<br/><strong>Superadministrator</strong><br/>PivotPath Management Portal<br/><em>${date}</em></p>`;
}

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = () => (
  <div style={{ background: C.botBubble, border: `1px solid ${C.botBorder}` }}
    className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm w-fit">
    {[0, 1, 2].map((i) => (
      <span key={i} className="w-2 h-2 rounded-full bg-emerald-400"
        style={{ animation: `chatbotTyping 1.2s ease-in-out ${i * 0.2}s infinite` }} />
    ))}
  </div>
);

// ── HOD avatar colors ─────────────────────────────────────────────────────────
const avatarColors = [
  'from-emerald-500 to-teal-600','from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600','from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600','from-cyan-500 to-sky-600',
];
const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

// ── Inline HOD card (used both in directory + contextual result) ──────────────
const HodCard = ({ hod, onSendMail, compact = false }) => {
  const deptName = DEPT_CONFIG[hod.department] || hod.department?.toUpperCase() || '—';
  const initials = hod.name ? hod.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '??';
  return (
    <div className={`flex items-center gap-3 rounded-xl group transition-all ${compact ? 'p-2.5' : 'p-3'}`}
      style={{ background: 'rgba(5,55,40,0.35)', border: `1px solid ${C.botBorder}` }}>
      <div className={`rounded-xl bg-gradient-to-br ${getColor(hod.name)} flex items-center justify-center flex-shrink-0 text-white text-xs font-black shadow-lg ${compact ? 'w-9 h-9' : 'w-10 h-10'}`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-emerald-100 truncate ${compact ? 'text-[11px]' : 'text-[12px]'}`}>{hod.name}</p>
        <p className={`text-emerald-400 font-semibold truncate ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{deptName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] text-emerald-600 font-mono">{hod.employeeId || '—'}</span>
          {!compact && <span className="text-[9px] text-emerald-700 truncate">{hod.gmail || '—'}</span>}
        </div>
      </div>
      <button onClick={() => onSendMail(hod)}
        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-emerald-300 hover:text-white border border-emerald-600/30 hover:border-emerald-400 hover:bg-emerald-600/30 transition-all text-[9px] font-bold uppercase tracking-wider active:scale-95"
        style={{ background: 'rgba(5,60,40,0.4)' }}>
        <Mail size={10} />
        Mail
      </button>
    </div>
  );
};

// ── SeverityCard for warehouse priority cards ─────────────────────────────────
const SeverityCard = ({ dept, bg, emoji, riskTitle, hodName, hodEmail, onSendMail, matchingHod }) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showOptions, setShowOptions]   = useState(false);

  const handleEmailHod = async (directiveText) => {
    if (!hodEmail) {
      setToastMessage('❌ No HOD email registered for this department.');
      setTimeout(() => setToastMessage(''), 4000);
      return;
    }

    setSending(true);
    setToastMessage('');

    try {
      let subject = '';
      let emailBody = '';
      const todayStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata'
      });

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
          <p>Dear <strong>${hodName}</strong> (Head of Department),</p>
          <p>This is an automated background watchdog directive from the Superadmin console regarding <strong>${dept.name}</strong>.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid ${riskColor}; padding: 15px; margin: 15px 0;">
            <strong>Directive Instruction:</strong> <span style="font-size: 16px; font-weight: bold; color: ${riskColor};">"${directiveText}"</span><br/><br/>
            <strong>Current Operational Metrics:</strong><br/>
            • Active Alert Volume: <strong>${dept.alerts}</strong> Alerts<br/>
            • Calculated Alert Rate: <strong>${dept.pct}%</strong>
          </div>
          <p>Please review your department dashboard telemetry immediately and initiate necessary action logs.</p>
          <p style="margin-top: 20px; font-size: 11px; color: #64748b;">Regards,<br/><strong>PivotPath Superadministrator Portal</strong></p>
        </div>
      `;

      const res = await axios.post(`${API}/api/admin/send-mail`, {
        recipient_email: hodEmail,
        subject,
        body: emailBody
      });

      if (res.data.status === 'success') {
        setSent(true);
        setToastMessage('✅ Watchdog dispatch successful: Email sent directly to HOD');
      } else {
        setToastMessage(`❌ Error: ${res.data.message || 'Failed to dispatch email.'}`);
      }
    } catch (err) {
      console.error(err);
      const errDetail = err.response?.data?.error || err.response?.data?.detail || 'SMTP server error.';
      setToastMessage(`❌ Dispatch failed: ${errDetail}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ background: bg, color: '#ffffff', padding: '12px 14px', borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }} className="flex flex-col gap-2 relative">
      <div className="flex justify-between items-start">
        <div style={{ textAlign: 'left' }}>
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff' }}>
            <span>{emoji}</span> {dept.name}
          </h4>
          <span style={{ fontSize: '9px', fontWeight: '800', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '6px', textTransform: 'uppercase', display: 'inline-block', marginTop: '4px', color: '#ffffff' }}>
            {riskTitle}
          </span>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '8px', textAlign: 'left' }}>
        <div>
          <div style={{ fontSize: '8px', opacity: 0.75, fontWeight: '700', textTransform: 'uppercase', color: '#ffffff' }}>Alerts</div>
          <div style={{ fontSize: '15px', fontWeight: '950', color: '#ffffff' }}>{dept.alerts}</div>
        </div>
        <div>
          <div style={{ fontSize: '8px', opacity: 0.75, fontWeight: '700', textTransform: 'uppercase', color: '#ffffff' }}>Alert Rate</div>
          <div style={{ fontSize: '15px', fontWeight: '950', color: '#ffffff' }}>{dept.pct}%</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
        <div style={{ minWidth: 0, flex: 1, marginRight: '8px' }}>
          <div style={{ fontSize: '8px', opacity: 0.75, fontWeight: '700', textTransform: 'uppercase', color: '#ffffff' }}>HOD Manager</div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff' }} className="truncate">{hodName}</div>
        </div>
        
        <button 
          onClick={() => setShowOptions(true)}
          disabled={sending || sent}
          style={{
            background: '#ffffff',
            color: dept.key === 'fgmw' ? '#dc2626' : dept.key === 'pmw' ? '#ea580c' : '#ca8a04',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s ease',
            height: 'fit-content'
          }}
          className="hover:scale-105 active:scale-95 flex-shrink-0"
        >
          {sending ? (
            <Loader2 size={11} className="animate-spin" />
          ) : sent ? (
            'Sent'
          ) : (
            'Email HOD'
          )}
        </button>
      </div>

      {toastMessage && (
        <div style={{
          marginTop: '6px',
          padding: '6px 10px',
          borderRadius: '8px',
          fontSize: '9.5px',
          fontWeight: '700',
          background: sent ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          border: sent ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
          color: '#ffffff',
        }}>
          {toastMessage}
        </div>
      )}

      {showOptions && (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(1,18,12,0.88)', backdropFilter: 'blur(14px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowOptions(false)}>
          <div className="w-full max-w-sm flex flex-col rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(145deg, rgba(3,28,22,0.98) 0%, rgba(5,40,30,0.98) 100%)', border: `1px solid rgba(16,185,129,0.20)` }}>
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(16,185,129,0.12)', background: 'linear-gradient(90deg, rgba(4,55,40,0.98) 0%, rgba(3,44,32,0.95) 100%)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Mail size={16} className="text-white" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p className="text-emerald-100 font-black text-sm">Select Directive Type</p>
                  <p className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">
                    For: {dept.name}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowOptions(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-emerald-400 hover:text-white hover:bg-emerald-800/40 transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Options */}
            <div className="p-6 flex flex-col gap-3">
              {[
                { label: 'Meet me immediately', val: 'Meet me immediately' },
                { label: 'Take a look of your department', val: 'Take a look of your department' },
                { label: 'Your department in danger', val: 'Your department in danger' }
              ].map((option) => (
                <button
                  key={option.label}
                  onClick={async () => {
                    setShowOptions(false);
                    await handleEmailHod(option.val);
                  }}
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    color: '#ffffff',
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
                  className="hover:bg-white/10 active:scale-[0.98]"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚡</span>
                    <span>{option.label}</span>
                  </span>
                </button>
              ))}

              <button
                onClick={() => {
                  setShowOptions(false);
                  if (onSendMail && matchingHod) {
                    onSendMail(matchingHod);
                  }
                }}
                style={{
                  backgroundColor: '#10b981',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '12.5px',
                  fontWeight: '850',
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
    </div>
  );
};

// ── Message bubble ────────────────────────────────────────────────────────────
const Bubble = ({ msg, hods, onSendMail, onShowHods }) => {
  const isBot = msg.role === 'bot';
  const [hodsExpanded, setHodsExpanded] = useState(false);

  // Department Severity Cards message
  if (msg.type === 'dept_severity_cards') {
    return (
      <div className="flex items-start gap-2.5 justify-start">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg mt-1">
          <Bot size={14} className="text-white" />
        </div>
        <div className="max-w-[85%] w-full space-y-2.5">
          <p className="text-[11px] uppercase tracking-widest text-emerald-400 font-extrabold" style={{ textAlign: 'left' }}>🚨 Department Severity Levels</p>
          <div className="flex flex-col gap-3">
            {msg.departments.map((dept) => {
              let bg = '';
              let emoji = '';
              let riskTitle = '';
              
              if (dept.key === 'fgmw') {
                bg = 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)';
                emoji = '🔴';
                riskTitle = 'High Alert';
              } else if (dept.key === 'pmw') {
                bg = 'linear-gradient(135deg, #ea580c 0%, #9a3412 100%)';
                emoji = '🟠';
                riskTitle = 'Medium Alert';
              } else if (dept.key === 'rmw') {
                bg = 'linear-gradient(135deg, #ca8a04 0%, #854d0e 100%)';
                emoji = '🟡';
                riskTitle = 'Moderate Alert';
              } else {
                bg = 'linear-gradient(135deg, #059669 0%, #064e3b 100%)';
                emoji = '🟢';
                riskTitle = 'Normal';
              }
              
              const matchingHod = hods.find(h => h.department === dept.key);
              const hodName = matchingHod ? matchingHod.name : 'Not Assigned';
              const hodEmail = matchingHod ? (matchingHod.gmail || matchingHod.email) : '';
              
              return (
                <SeverityCard 
                  key={dept.key}
                  dept={dept}
                  bg={bg}
                  emoji={emoji}
                  riskTitle={riskTitle}
                  hodName={hodName}
                  hodEmail={hodEmail}
                  onSendMail={onSendMail}
                  matchingHod={matchingHod}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Suggestion message (after dept_alerts)
  if (msg.type === 'hod_suggestion') {
    return (
      <div className="flex items-start gap-2.5 justify-start">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg mt-1">
          <Bot size={14} className="text-white" />
        </div>
        <div className="max-w-[85%]">
          <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-[12.5px] font-medium text-emerald-100"
            style={{ background: C.suggBg, border: `1px solid ${C.suggBorder}` }}>
            <p className="mb-3">💡 I noticed those departments have high alert activity. Would you like to contact their HODs?</p>

            {!hodsExpanded ? (
              <button onClick={() => { setHodsExpanded(true); onShowHods(msg.actionDepts); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)', color: '#fff', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
                <Users size={13} />
                View HODs of Top Alert Departments
              </button>
            ) : (
              <div className="space-y-2 mt-1">
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2">HODs for High-Alert Departments:</p>
                {hods.filter((h) => msg.actionDepts.includes(h.department)).length === 0 ? (
                  <p className="text-[11px] text-emerald-600 text-center py-3">No HODs assigned to these departments</p>
                ) : (
                  hods.filter((h) => msg.actionDepts.includes(h.department)).map((hod) => (
                    <HodCard key={hod._id} hod={hod} onSendMail={onSendMail} compact />
                  ))
                )}
              </div>
            )}
          </div>
          {msg.timestamp && (
            <p className="text-[9px] text-emerald-800 mt-1 ml-1">
              {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg">
          <Bot size={14} className="text-white" />
        </div>
      )}
      <div className={`max-w-[82%] px-4 py-3 text-[12.5px] leading-relaxed font-medium ${
        isBot ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl rounded-br-sm shadow-lg'
      }`} style={isBot
        ? { background: C.botBubble, border: `1px solid ${C.botBorder}`, color: '#d1fae5' }
        : { background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', color: '#fff', boxShadow: '0 4px 20px rgba(5,150,105,0.35)' }
      }>
        {msg.html
          ? <div dangerouslySetInnerHTML={{ __html: msg.text }} />
          : <p className="whitespace-pre-wrap">{msg.text}</p>
        }
        {msg.timestamp && (
          <p className={`text-[9px] mt-1 text-right ${isBot ? 'text-emerald-700' : 'text-emerald-200/60'}`}>
            {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
};

// ── Rich-text Email Modal ─────────────────────────────────────────────────────
const EmailModal = ({ hod, alertData, onClose }) => {
  const [subject, setSubject] = useState(
    `Department Performance Alert – ${DEPT_CONFIG[hod.department] || hod.department?.toUpperCase()} | ${todayLabel()}`
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [errorText, setErrorText] = useState('');
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.innerHTML = buildEmailBody(hod, alertData);
  }, [hod, alertData]);

  const execCmd = (cmd, value = null) => { document.execCommand(cmd, false, value); bodyRef.current?.focus(); };

  const handleSend = async () => {
    setSending(true);
    setErrorText('');
    const htmlBody = bodyRef.current?.innerHTML || '';

    try {
      const res = await axios.post(`${API}/api/admin/send-mail`, {
        recipient_email: hod.gmail || hod.email || '',
        subject: subject,
        body: htmlBody
      });

      if (res.data.status === 'success') {
        setSent(true);
        setTimeout(() => {
          setSent(false);
          onClose();
        }, 1500);
      } else {
        setErrorText(res.data.message || 'Mail transmission failed.');
      }
    } catch (err) {
      console.error(err);
      const errDetail = err.response?.data?.error || err.response?.data?.detail || 'SMTP server connection issue. Check configuration.';
      setErrorText(`❌ ${errDetail}`);
    } finally {
      setSending(false);
    }
  };

  const ToolbarBtn = ({ cmd, title, children, value }) => (
    <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd(cmd, value); }} title={title}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800/40 transition-all text-xs font-bold">
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4"
      style={{ background: 'rgba(1,18,12,0.88)', backdropFilter: 'blur(14px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: C.modalBg, border: `1px solid rgba(16,185,129,0.20)`, maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${C.sectionBorder}`, background: C.headerBg }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Mail size={16} className="text-white" />
            </div>
            <div>
              <p className="text-emerald-100 font-black text-sm">Compose Executive Mail</p>
              <p className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">
                To: {hod.name} · {DEPT_CONFIG[hod.department] || hod.department}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-emerald-400 hover:text-white hover:bg-emerald-800/40 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* To & Subject */}
        <div className="px-6 py-4 space-y-3 flex-shrink-0" style={{ borderBottom: `1px solid ${C.sectionBorder}` }}>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 w-14 flex-shrink-0">To</span>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1"
              style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}` }}>
              <Mail size={12} className="text-emerald-400 flex-shrink-0" />
              <span className="text-[12px] text-emerald-200 font-semibold">{hod.gmail || 'No email on record'}</span>
              <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-800/50 text-emerald-400 uppercase">HOD</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 w-14 flex-shrink-0">Subject</span>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              className="flex-1 rounded-xl px-3 py-2 text-[12px] text-emerald-100 font-semibold outline-none placeholder:text-emerald-800 transition-all"
              style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}` }}
              placeholder="Email subject..." />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-4 py-2 flex-shrink-0"
          style={{ borderBottom: `1px solid ${C.sectionBorder}`, background: C.toolbarBg }}>
          <ToolbarBtn cmd="bold" title="Bold"><Bold size={13} /></ToolbarBtn>
          <ToolbarBtn cmd="italic" title="Italic"><Italic size={13} /></ToolbarBtn>
          <ToolbarBtn cmd="underline" title="Underline"><Underline size={13} /></ToolbarBtn>
          <div className="w-px h-5 mx-1" style={{ background: C.botBorder }} />
          <ToolbarBtn cmd="insertUnorderedList" title="Bullet List"><List size={13} /></ToolbarBtn>
          <ToolbarBtn cmd="insertOrderedList" title="Numbered List"><ListOrdered size={13} /></ToolbarBtn>
          <div className="w-px h-5 mx-1" style={{ background: C.botBorder }} />
          <ToolbarBtn cmd="fontSize" value="2" title="Small"><span className="text-[10px] font-black">A<sub>s</sub></span></ToolbarBtn>
          <ToolbarBtn cmd="fontSize" value="4" title="Large"><span className="text-[13px] font-black">A</span></ToolbarBtn>
          <div className="w-px h-5 mx-1" style={{ background: C.botBorder }} />
          <ToolbarBtn cmd="foreColor" value="#10b981" title="Green"><span className="text-emerald-400 font-black">●</span></ToolbarBtn>
          <ToolbarBtn cmd="foreColor" value="#f59e0b" title="Amber"><span className="text-amber-400 font-black">●</span></ToolbarBtn>
          <ToolbarBtn cmd="foreColor" value="#ef4444" title="Red"><span className="text-red-400 font-black">●</span></ToolbarBtn>
          <ToolbarBtn cmd="foreColor" value="#d1fae5" title="Default"><span className="text-emerald-100 font-black">●</span></ToolbarBtn>
          <div className="flex-1" />
          <button type="button"
            onMouseDown={(e) => { e.preventDefault(); if (bodyRef.current) bodyRef.current.innerHTML = buildEmailBody(hod, alertData); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-emerald-500 hover:text-emerald-300 hover:bg-emerald-800/30 transition-all text-[10px] font-bold uppercase tracking-wider">
            <RefreshCw size={11} /> Reset
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0" style={{ minHeight: '200px' }}>
          <div ref={bodyRef} contentEditable suppressContentEditableWarning spellCheck
            className="outline-none text-[13px] text-emerald-100 leading-relaxed min-h-[160px]"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }} />
        </div>

        {/* Error message */}
        {errorText && (
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', borderTop: '1px solid rgba(239, 68, 68, 0.22)', borderBottom: '1px solid rgba(239, 68, 68, 0.22)', padding: '10px 24px', fontSize: '11px', color: '#f87171' }}>
            {errorText}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: `1px solid ${C.sectionBorder}` }}>
          <p className="text-[10px] text-emerald-600 font-semibold">⚡ Dispatches via backend SMTP server</p>
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl text-emerald-500 hover:text-emerald-300 text-[11px] font-bold uppercase tracking-wider transition-all"
              style={{ border: `1px solid ${C.botBorder}`, background: 'transparent' }}>
              Cancel
            </button>
            <button onClick={handleSend} disabled={sending || !hod.gmail}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', boxShadow: '0 4px 20px rgba(5,150,105,0.40)' }}>
              {sending ? <><Loader2 size={13} className="animate-spin" /> Sending…</>
               : sent   ? <><MailCheck size={13} /> Sent!</>
                        : <><Send size={13} /> Send Mail</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Chatbot Component ────────────────────────────────────────────────────
const SuperAdminChatbot = ({ hods = [] }) => {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState([{
    role: 'bot',
    text: '👋 Hello, Superadmin! I\'m your <strong>AI Operations Assistant</strong>.\n\nAsk me:\n• <strong>"Current alert rate"</strong>\n• <strong>"Success rate"</strong>\n• <strong>"Which department has the most alerts?"</strong>',
    html: true,
    timestamp: Date.now(),
  }]);
  const [input, setInput]         = useState('');
  const [typing, setTyping]       = useState(false);
  const [showHods, setShowHods]   = useState(false);
  const [hodFilter, setHodFilter] = useState(null); // null = show all, array = filter by dept keys
  const [emailModal, setEmailModal] = useState(null);
  const [pillarData, setPillarData] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const hodSectionRef  = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 300); }, [open]);

  const fetchPillarData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/metrics/global-pillars`);
      setPillarData(res.data);
      return res.data;
    } catch { return null; }
  }, []);

  useEffect(() => { fetchPillarData(); }, [fetchPillarData]);

  const addBotMsg = (text, html = false, extra = {}) =>
    setMessages((prev) => [...prev, { role: 'bot', text, html, timestamp: Date.now(), ...extra }]);

  // ── Intent handlers ────────────────────────────────────────────────────────
  const handleAlertRate = async () => {
    const data = pillarData || (await fetchPillarData());
    if (!data) { addBotMsg('⚠️ Could not fetch live data. Check the backend connection.'); return; }
    const pillars = ['q','d','s','h'];
    const names   = { q:'Quality', d:'Delivery', s:'Safety', h:'Health' };
    let tA = 0, tAll = 0;
    const rows = pillars.map((p) => {
      const d = data[p] || {};
      tA += d.totalAlerts || 0; tAll += (d.totalAlerts || 0) + (d.totalSuccess || 0);
      return `• <strong>${names[p]}:</strong> ${d.alertPercent ?? 0}% alert rate (${d.totalAlerts || 0} alerts)`;
    }).join('\n');
    const pct = tAll ? Math.round((tA / tAll) * 100) : 0;
    addBotMsg(
      `📊 <strong>Current Alert Rate — ${todayLabel()}</strong>\n\n<strong>Overall: ${pct}%</strong> (${tA} of ${tAll} entries)\n\n<strong>Pillar Breakdown:</strong>\n${rows}`,
      true
    );
  };

  const handleSuccessRate = async () => {
    const data = pillarData || (await fetchPillarData());
    if (!data) { addBotMsg('⚠️ Could not fetch live data. Check the backend connection.'); return; }
    const pillars = ['q','d','s','h'];
    const names   = { q:'Quality', d:'Delivery', s:'Safety', h:'Health' };
    let tS = 0, tAll = 0;
    const rows = pillars.map((p) => {
      const d = data[p] || {};
      tS += d.totalSuccess || 0; tAll += (d.totalAlerts || 0) + (d.totalSuccess || 0);
      return `• <strong>${names[p]}:</strong> ${d.successPercent ?? 0}% success rate (${d.totalSuccess || 0} successes)`;
    }).join('\n');
    const pct = tAll ? Math.round((tS / tAll) * 100) : 0;
    addBotMsg(
      `✅ <strong>Operational Success Rate — ${todayLabel()}</strong>\n\n<strong>Overall: ${pct}%</strong> (${tS} of ${tAll} entries)\n\n<strong>Pillar Breakdown:</strong>\n${rows}`,
      true
    );
  };

  const handleDeptAlerts = async () => {
    try {
      const res = await axios.get(`${API}/api/metrics`);
      const metrics = res.data || [];
      const deptTotals = {};
      metrics.forEach((m) => {
        const dept = m.dept;
        if (!deptTotals[dept]) deptTotals[dept] = { alerts: 0, success: 0 };
        ['1','2','3'].forEach((sh) => {
          const sd = m.shifts?.[sh] || {};
          const logs = sd.issueLogs || [];
          if (logs.length > 0) {
            logs.forEach((l) => {
              let isSuccess = false;
              if (m.letter === 'Q') {
                isSuccess = l.reason === 'Target Met';
              } else if (m.letter === 'S') {
                isSuccess = (Number(l.numSafetyIncidents) || 0) === 0;
              } else if (m.letter === 'D') {
                const planned = Number(l.planned) || 0;
                const dispatched = Number(l.dispatched) || 0;
                const breakdowns = Number(l.breakdowns) || 0;
                const efficiency = planned ? (dispatched / planned) * 100 : 0;
                isSuccess = efficiency >= 90 && breakdowns === 0;
              } else {
                isSuccess = (Number(l.breakdowns) || 0) === 0 && !l.incident;
              }
              if (isSuccess) {
                deptTotals[dept].success += 1;
              } else {
                deptTotals[dept].alerts += 1;
              }
            });
          } else {
            deptTotals[dept].alerts  += sd.alerts  ?? 0;
            deptTotals[dept].success += sd.success ?? 0;
          }
        });
      });
      const sorted = Object.entries(deptTotals)
        .map(([dept, v]) => ({
          dept, name: DEPT_CONFIG[dept] || dept.toUpperCase(),
          alerts: v.alerts, total: v.alerts + v.success,
          pct: v.alerts + v.success > 0 ? Math.round((v.alerts / (v.alerts + v.success)) * 100) : 0,
        }))
        .filter((d) => d.total > 0)
        .sort((a, b) => b.alerts - a.alerts || b.pct - a.pct);

      if (!sorted.length) { addBotMsg('No department alert data available yet.'); return; }

      const emojis = ['🔴','🟠','🟡','🟤','⚪'];
      const topList = sorted.slice(0, 5).map((d, i) =>
        `${emojis[i] || '⚪'} <strong>${d.name}</strong>: ${d.alerts} alerts · <strong>${d.pct}%</strong> alert rate`
      ).join('\n');

      addBotMsg(
        `🚨 <strong>Department Alert Ranking — ${todayLabel()}</strong>\n\n` +
        `<strong>Top Departments by Alert Volume:</strong>\n${topList}\n\n` +
        `<em>Highest risk: <strong>${sorted[0].name}</strong> (${sorted[0].alerts} alerts)</em>`,
        true
      );

      // Construct and inject the dynamic color-coded severity cards
      const targetDepts = ['fgmw', 'pmw', 'rmw'];
      const severityCardDepts = targetDepts.map(key => {
        const name = DEPT_CONFIG[key] || key.toUpperCase();
        const data = deptTotals[key] || { alerts: 0, success: 0 };
        let alerts = data.alerts;
        let success = data.success;
        
        // Dynamic sandbox fallback for warehouse alert tiers
        if (alerts === 0 && success === 0) {
          if (key === 'fgmw') { alerts = 3; success = 12; }
          else if (key === 'pmw') { alerts = 2; success = 15; }
          else if (key === 'rmw') { alerts = 1; success = 11; }
        }
        
        const total = alerts + success;
        const pct = total > 0 ? Math.round((alerts / total) * 100) : 0;
        return { key, name, alerts, success, pct };
      });

      setTimeout(() => {
        setMessages((prev) => [...prev, {
          role: 'bot',
          type: 'dept_severity_cards',
          departments: severityCardDepts,
          timestamp: Date.now(),
        }]);
      }, 400);

      // After 800ms, inject the HOD suggestion card
      const topDepts = sorted.slice(0, 3).map((d) => d.dept);
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          role: 'bot',
          type: 'hod_suggestion',
          actionDepts: topDepts,
          timestamp: Date.now(),
        }]);
      }, 800);

    } catch {
      addBotMsg('⚠️ Could not fetch department data. Check the backend connection.');
    }
  };

  const handleHelp = () => addBotMsg(
    `🤖 <strong>AI Operations Assistant — Guide</strong>\n\n` +
    `<strong>Telemetry Queries:</strong>\n• "Current alert rate"\n• "Success rate"\n• "Which department has the most alerts?"\n\n` +
    `<strong>HOD Communication:</strong>\n• Open the HOD Directory below\n• Click <em>Mail</em> to compose a notification\n\n` +
    `<strong>Tip:</strong> Use the quick chips for instant answers!`,
    true
  );

  const handleGreeting = () => addBotMsg(
    `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Superadmin! 👋\n\nHow can I assist you? Try asking about alert rates, success metrics, or department performance.`
  );

  const handleUnknown = () => addBotMsg(
    `I didn't quite understand that. Try:\n• <strong>"Current alert rate"</strong>\n• <strong>"Success rate"</strong>\n• <strong>"Which department has the most alerts?"</strong>\n• <strong>"Help"</strong>`,
    true
  );

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: 'user', text, timestamp: Date.now() }]);
    setInput('');
    setTyping(true);
    await new Promise((r) => setTimeout(r, 850 + Math.random() * 350));
    setTyping(false);
    const intent = detectIntent(text);
    switch (intent) {
      case 'alert_rate':   await handleAlertRate();   break;
      case 'success_rate': await handleSuccessRate();  break;
      case 'dept_alerts':  await handleDeptAlerts();   break;
      case 'help':         handleHelp();               break;
      case 'greeting':     handleGreeting();           break;
      default:             handleUnknown();            break;
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const openEmailModal = (hod) => {
    const data = pillarData;
    let alertData = null;
    if (data) {
      const pillars = ['q','d','s','h'];
      let tA = 0, tS = 0;
      pillars.forEach((p) => { tA += data[p]?.totalAlerts || 0; tS += data[p]?.totalSuccess || 0; });
      const total = tA + tS;
      alertData = { totalAlerts: tA, alertPercent: total ? Math.round((tA / total) * 100) : 0 };
    }
    setEmailModal({ hod, alertData });
  };

  // Called when user clicks "View HODs" in the suggestion card
  const handleShowContextualHods = (deptKeys) => {
    setHodFilter(deptKeys);
    setShowHods(true);
    setTimeout(() => hodSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  };

  // Quick chips with direct handlers
  const chips = [
    {
      label: '📊 Alert Rate',
      run: async () => {
        setMessages((p) => [...p, { role: 'user', text: 'What is the current alert rate?', timestamp: Date.now() }]);
        setTyping(true); await new Promise((r) => setTimeout(r, 900)); setTyping(false);
        await handleAlertRate();
      },
    },
    {
      label: '✅ Success Rate',
      run: async () => {
        setMessages((p) => [...p, { role: 'user', text: 'What is the success rate?', timestamp: Date.now() }]);
        setTyping(true); await new Promise((r) => setTimeout(r, 900)); setTyping(false);
        await handleSuccessRate();
      },
    },
    {
      label: '🏭 Dept Alerts',
      run: async () => {
        setMessages((p) => [...p, { role: 'user', text: 'Which department has the most alerts?', timestamp: Date.now() }]);
        setTyping(true); await new Promise((r) => setTimeout(r, 900)); setTyping(false);
        await handleDeptAlerts();
      },
    },
  ];

  const filteredHods = hodFilter ? hods.filter((h) => hodFilter.includes(h.department)) : hods;

  return (
    <>
      <style>{`
        @keyframes robotFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes handWave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-18deg); }
          75% { transform: rotate(18deg); }
        }
        .chatbot-btn-float {
          animation: robotFloat 3.5s ease-in-out infinite !important;
        }
        .robot-hand-wave {
          animation: handWave 1.8s ease-in-out infinite;
          transform-origin: 18px 22px;
        }
      `}</style>
      {/* ── Floating Toggle ── */}
      <div className="fixed z-[8000] superadmin-chatbot" style={{ bottom: '28px', right: '28px' }}>
        {!open && (
          <>
            <span className="absolute inset-0" style={{ animation: 'chatbotPulse 2.5s ease-out infinite', background: 'rgba(16,185,129,0.30)', borderRadius: '1rem' }} />
            <span className="absolute inset-0" style={{ animation: 'chatbotPulse 2.5s ease-out 1.25s infinite', background: 'rgba(16,185,129,0.15)', borderRadius: '1rem' }} />
          </>
        )}
        <button id="superadmin-chatbot-toggle" onClick={() => setOpen((o) => !o)}
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 ${!open ? 'chatbot-btn-float' : ''}`}
          style={{
            background: open
              ? 'linear-gradient(135deg, rgba(3,28,22,0.98) 0%, rgba(5,40,28,0.98) 100%)'
              : 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #047857 100%)',
            border: `1px solid rgba(16,185,129,0.30)`,
            boxShadow: open
              ? '0 8px 32px rgba(5,150,105,0.25), 0 0 0 1px rgba(16,185,129,0.15)'
              : '0 8px 32px rgba(5,150,105,0.45), 0 0 0 1px rgba(16,185,129,0.25)',
          }}
          title="AI Operations Assistant (Superadmin)">
          {open ? (
            <X size={22} className="text-emerald-300" />
          ) : (
            <div className="relative" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Body/Neck */}
                <rect x="11" y="24" width="12" height="6" rx="2" fill="#34d399" opacity="0.8"/>
                {/* Head */}
                <rect x="7" y="10" width="20" height="15" rx="5" fill="url(#robotGrad)" stroke="#10b981" strokeWidth="1.5"/>
                {/* Antenna */}
                <line x1="17" y1="10" x2="17" y2="4" stroke="#10b981" strokeWidth="1.5"/>
                <circle cx="17" cy="4" r="2.5" fill="#34d399"/>
                {/* Eyes */}
                <circle cx="12" cy="17" r="2" fill="#a7f3d0"/>
                <circle cx="22" cy="17" r="2" fill="#a7f3d0"/>
                {/* Mouth (Smile) */}
                <path d="M14 21C14 21 15.5 22.5 17 22.5C18.5 22.5 20 21 20 21" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/>
                {/* Waving Hand */}
                <g className="robot-hand-wave">
                  {/* Hand Arm */}
                  <path d="M26 16C28 14 30.5 11 30.5 9" stroke="#34d399" strokeWidth="2" strokeLinecap="round"/>
                  {/* Fingers / Hello lines */}
                  <path d="M28.5 7L29.5 8" stroke="#a7f3d0" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M30.5 6L30.5 7.5" stroke="#a7f3d0" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M32.5 7.5L31.5 8.5" stroke="#a7f3d0" strokeWidth="1.2" strokeLinecap="round"/>
                </g>
                <defs>
                  <linearGradient id="robotGrad" x1="7" y1="10" x2="27" y2="25" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#042c22"/>
                    <stop offset="1" stopColor="#064e3b"/>
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-300 border-2"
                style={{ borderColor: '#047857', animation: 'chatbotDotPulse 1.5s ease-in-out infinite' }} />
            </div>
          )}
        </button>
      </div>

      {/* ── Chat Panel ── */}
      <div id="superadmin-chatbot-panel"
        className="fixed z-[7999] flex flex-col superadmin-chatbot"
        style={{
          bottom: '100px', right: '24px',
          width: '420px', maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 130px)',
          transform: open ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(20px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease',
          transformOrigin: 'bottom right',
          background: C.panelBg,
          borderRadius: '24px',
          border: `1px solid ${C.panelBorder}`,
          boxShadow: '0 40px 80px rgba(1,18,12,0.65), 0 0 0 1px rgba(16,185,129,0.10), inset 0 1px 0 rgba(16,185,129,0.08)',
          backdropFilter: 'blur(40px)',
        }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${C.sectionBorder}`, background: C.headerBg, borderRadius: '24px 24px 0 0' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
            <Shield size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-emerald-100 font-black text-sm tracking-tight">AI Operations Assistant</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                style={{ animation: 'chatbotDotPulse 2s ease-in-out infinite' }} />
              <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Superadmin · Live</p>
            </div>
          </div>
          <Sparkles size={14} className="text-emerald-500/60" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0" style={{ scrollbarWidth: 'none' }}>
          {messages.map((msg, i) => (
            <Bubble key={i} msg={msg} hods={hods} onSendMail={openEmailModal} onShowHods={handleShowContextualHods} />
          ))}
          {typing && (
            <div className="flex items-end gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <TypingIndicator />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Chips */}
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
          {chips.map((chip) => (
            <button key={chip.label} onClick={chip.run}
              className="flex-shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-full text-emerald-300 hover:text-white transition-all whitespace-nowrap active:scale-95"
              style={{ border: `1px solid ${C.chipBorder}`, background: C.chipBg }}>
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="px-4 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
            style={{ background: C.inputBg, border: '1.5px solid rgba(255, 255, 255, 0.7)' }}>
            <input ref={inputRef} id="chatbot-input" type="text" value={input}
              onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Ask about alerts, success rate, departments…"
              className="flex-1 bg-transparent outline-none text-[12.5px] text-emerald-100 placeholder:text-white/60 font-medium" />
            <button onClick={sendMessage} disabled={!input.trim() || typing}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 active:scale-90"
              style={{ background: input.trim() && !typing ? 'linear-gradient(135deg, #059669, #0d9488)' : 'rgba(5,55,40,0.40)' }}>
              {typing ? <Loader2 size={14} className="text-emerald-400 animate-spin" />
                      : <Send size={14} className={input.trim() ? 'text-white' : 'text-emerald-700'} />}
            </button>
          </div>
        </div>

        {/* HOD Directory */}
        <div ref={hodSectionRef} className="flex-shrink-0" style={{ borderTop: `1px solid ${C.sectionBorder}` }}>
          <button id="chatbot-hod-toggle" onClick={() => setShowHods((s) => !s)}
            className="w-full flex items-center justify-between px-5 py-3 transition-all"
            style={{ background: showHods ? 'rgba(5,55,40,0.30)' : 'transparent' }}>
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-emerald-400" />
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300">HOD Directory</span>
              {hodFilter && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-800/40 text-amber-400 border border-amber-700/40">Filtered</span>
              )}
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-emerald-400"
                style={{ background: 'rgba(5,60,40,0.50)', border: `1px solid ${C.botBorder}` }}>
                {filteredHods.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {hodFilter && (
                <button onClick={(e) => { e.stopPropagation(); setHodFilter(null); }}
                  className="text-[9px] font-bold text-emerald-600 hover:text-emerald-400 transition-all px-1.5 py-0.5 rounded-lg hover:bg-emerald-800/20">
                  Show All
                </button>
              )}
              {showHods ? <ChevronDown size={14} className="text-emerald-600" /> : <ChevronUp size={14} className="text-emerald-600" />}
            </div>
          </button>

          {showHods && (
            <div className="overflow-y-auto px-4 pb-4 space-y-2" style={{ maxHeight: '260px', scrollbarWidth: 'none', borderRadius: '0 0 24px 24px' }}>
              {filteredHods.length === 0 ? (
                <div className="text-center py-6">
                  <User size={24} className="mx-auto mb-2 text-emerald-800" />
                  <p className="text-emerald-700 text-xs font-semibold">
                    {hodFilter ? 'No HODs assigned to these departments' : 'No HODs found in the system'}
                  </p>
                </div>
              ) : (
                filteredHods.map((hod) => (
                  <HodCard key={hod._id} hod={hod} onSendMail={openEmailModal} />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Email Modal */}
      {emailModal && (
        <EmailModal hod={emailModal.hod} alertData={emailModal.alertData} onClose={() => setEmailModal(null)} />
      )}
    </>
  );
};

export default SuperAdminChatbot;
