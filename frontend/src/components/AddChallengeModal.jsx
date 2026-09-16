import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Sparkles, Loader2, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL ||
  ((window.location.port && window.location.port !== '5000')
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : window.location.origin);

// ─── Alert / Incident Options ─────────────────────────────────────────────
const ALERT_OPTIONS = [
  'Target Met',
  'Target Missed',
  'Machine Failure',
  'No Power',
  'No Employee / Manpower Shortage',
  'Material Not Available',
  'Equipment Unavailable',
  'Process Delay',
  'Quality Issue',
  'Safety Issue',
  'Other',
];

// ─── Department-specific FDA questions ───────────────────────────────────
const DEPT_FDA_QUESTIONS = {
  q: [
    { id: 'DQ1', text: 'Was the applicable SOP followed?',         type: 'yesno_na' },
    { id: 'DQ2', text: 'Was any product/batch/test result affected?', type: 'yesno_na' },
    { id: 'DQ3', text: 'Was this issue previously observed?',      type: 'yesno' },
    { id: 'DQ4', text: 'Was immediate containment performed?',     type: 'yesno' },
    { id: 'DQ5', text: 'Was the root cause identified?',           type: 'yesno_investigation' },
    { id: 'DQ6', text: 'Was corrective action initiated?',         type: 'yesno' },
    { id: 'DQ7', text: 'Was effectiveness verified?',              type: 'yesno_pending' },
    { id: 'DQ8', text: 'Additional quality notes / evidence:',     type: 'textarea' },
  ],
  d: [
    { id: 'DQ1', text: 'Was the target met?',                       type: 'yesno' },
    { id: 'DQ2', text: 'What was the target?',                      type: 'text' },
    { id: 'DQ3', text: 'What was the actual result?',               type: 'text' },
    { id: 'DQ4', text: 'Was equipment available?',                  type: 'yesno' },
    { id: 'DQ5', text: 'Was manpower available?',                   type: 'yesno' },
    { id: 'DQ6', text: 'Was power available?',                      type: 'yesno' },
    { id: 'DQ7', text: 'Was delivery/production affected?',         type: 'yesno' },
    { id: 'DQ8', text: 'Was immediate recovery action taken?',      type: 'yesno' },
    { id: 'DQ9', text: 'Additional delivery notes:',                type: 'textarea' },
  ],
  s: [
    { id: 'DQ1', text: 'Was anyone exposed to risk?',              type: 'yesno' },
    { id: 'DQ2', text: 'Were required PPE controls followed?',     type: 'yesno_na' },
    { id: 'DQ3', text: 'Was this caused by human error?',          type: 'yesno' },
    { id: 'DQ4', text: 'Was this caused by a process failure?',    type: 'yesno' },
    { id: 'DQ5', text: 'Was immediate containment performed?',     type: 'yesno' },
    { id: 'DQ6', text: 'Was a similar incident previously reported?', type: 'yesno' },
    { id: 'DQ7', text: 'Was corrective action initiated?',         type: 'yesno' },
    { id: 'DQ8', text: 'Additional safety notes / evidence:',      type: 'textarea' },
  ],
  h: [
    { id: 'DQ1', text: 'Was anyone affected?',                        type: 'yesno' },
    { id: 'DQ2', text: 'Was the required health procedure followed?',  type: 'yesno_na' },
    { id: 'DQ3', text: 'Was immediate response provided?',            type: 'yesno' },
    { id: 'DQ4', text: 'Was this issue previously reported?',         type: 'yesno' },
    { id: 'DQ5', text: 'Was the root cause identified?',              type: 'yesno_investigation' },
    { id: 'DQ6', text: 'Was corrective action initiated?',            type: 'yesno' },
    { id: 'DQ7', text: 'Was effectiveness verified?',                 type: 'yesno_pending' },
    { id: 'DQ8', text: 'Additional health notes:',                    type: 'textarea' },
  ],
};

// ─── Alert-specific FDA questions ─────────────────────────────────────────
const ALERT_FDA_QUESTIONS = {
  'Machine Failure': [
    { id: 'MF1', text: 'Was preventive maintenance current?',         type: 'yesno_unknown' },
    { id: 'MF2', text: 'Was calibration current?',                    type: 'yesno_na' },
    { id: 'MF3', text: 'When was the machine last serviced?',         type: 'text' },
    { id: 'MF4', text: 'Was testing/production affected?',            type: 'yesno' },
    { id: 'MF5', text: 'Was the machine failure previously observed?', type: 'yesno' },
    { id: 'MF6', text: 'What was the immediate action?',              type: 'textarea' },
  ],
  'No Power': [
    { id: 'NP1', text: 'Was backup power available?',                 type: 'yesno' },
    { id: 'NP2', text: 'How long was the power interruption?',        type: 'text' },
    { id: 'NP3', text: 'Were critical activities affected?',          type: 'yesno' },
    { id: 'NP4', text: 'Was equipment affected?',                     type: 'yesno' },
    { id: 'NP5', text: 'Was testing/production delayed?',             type: 'yesno' },
    { id: 'NP6', text: 'What immediate action was taken?',            type: 'textarea' },
  ],
  'No Employee / Manpower Shortage': [
    { id: 'NE1', text: 'Was the required manpower available?',        type: 'yesno' },
    { id: 'NE2', text: 'Was a qualified replacement available?',      type: 'yesno' },
    { id: 'NE3', text: 'Was the activity delayed?',                   type: 'yesno' },
    { id: 'NE4', text: 'Was the required staffing level defined?',    type: 'yesno' },
    { id: 'NE5', text: 'What caused the shortage?',                   type: 'textarea' },
  ],
  'Target Missed': [
    { id: 'TM1', text: 'What was the target?',                        type: 'text' },
    { id: 'TM2', text: 'What was the actual result?',                 type: 'text' },
    { id: 'TM3', text: 'Why was the target missed?',                  type: 'reason_missed' },
  ],
};

// ─── SOP Follow-up conditional options ────────────────────────────────────
const SOP_REASONS = [
  'Human Error', 'Process Error', 'Training Gap',
  'SOP Unclear', 'SOP Not Available', 'Other',
];

const TARGET_MISS_REASONS = [
  'Machine Failure', 'No Power', 'No Employee',
  'Material Not Available', 'Process Delay', 'Human Error',
  'Process Error', 'Other',
];

// ─── Question answer type options ─────────────────────────────────────────
const OPTIONS = {
  yesno:            ['Yes', 'No'],
  yesno_na:         ['Yes', 'No', 'N/A'],
  yesno_investigation: ['Yes', 'No', 'Under Investigation'],
  yesno_pending:    ['Yes', 'No', 'Pending'],
  yesno_unknown:    ['Yes', 'No', 'Unknown'],
  status:           ['Completed', 'In Progress', 'Not Started'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────
const todayISO = () => {
  const d = new Date();
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

const nowHHMM = () => {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

// ─── RadioPills component ─────────────────────────────────────────────────
// Uses <button type="button"> instead of hidden <input type="radio"> to prevent
// the browser from auto-scrolling the page to focus the hidden input on click.
const RadioPills = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(opt => {
      const isSelected = value === opt;
      const selectedCls = opt === 'Yes' || opt === 'Completed'
        ? 'bg-emerald-600 border-emerald-600 text-white'
        : opt === 'No'
          ? 'bg-rose-500 border-rose-500 text-white'
          : opt === 'N/A' || opt === 'Not Started'
            ? 'bg-slate-400 border-slate-400 text-white'
            : 'bg-amber-500 border-amber-500 text-white';
      return (
        <button
          key={opt}
          type="button"
          tabIndex={0}
          onClick={e => { e.preventDefault(); onChange(opt); }}
          className={`px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wide transition-all select-none active:scale-95 ${
            isSelected ? selectedCls : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
          }`}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

// ─── FDAQuestion component ────────────────────────────────────────────────
const FDAQuestion = ({ q, idx, answer, answerMethod, onChange }) => {
  const optionSet = OPTIONS[q.type];
  const isSmart = q.id.startsWith('MF') || q.id.startsWith('NP') ||
                  q.id.startsWith('NE') || q.id.startsWith('TM');

  const badgeClass = answerMethod === 'AUTO'
    ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
    : answerMethod === 'MANUAL'
      ? 'bg-amber-50 text-amber-600 border-amber-100'
      : '';

  // Render select for reason_missed
  if (q.type === 'reason_missed') {
    return (
      <div className={`space-y-2 p-3 rounded-2xl ${isSmart ? 'bg-indigo-50/30 border border-indigo-100/40' : 'bg-slate-50/50'}`}>
        <div className="flex justify-between items-start gap-2">
          <span className={`text-[10px] font-black uppercase leading-relaxed ${isSmart ? 'text-indigo-600' : 'text-slate-500'}`}>
            {isSmart ? '⚡ ' : `Q${idx + 1}. `}{q.text}
          </span>
          {answerMethod && answerMethod !== 'NONE' && (
            <span className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-black uppercase border ${badgeClass}`}>
              {answerMethod === 'AUTO' ? '🤖 AUTO' : '✏️ MANUAL'}
            </span>
          )}
        </div>
        <select
          value={answer || ''}
          onChange={e => onChange(q.id, e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none"
        >
          <option value="">Select reason...</option>
          {TARGET_MISS_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
    );
  }

  if (q.type === 'textarea') {
    return (
      <div className={`space-y-2 p-3 rounded-2xl ${isSmart ? 'bg-indigo-50/30 border border-indigo-100/40' : 'bg-slate-50/50'}`}>
        <div className="flex justify-between items-start gap-2">
          <span className={`text-[10px] font-black uppercase leading-relaxed ${isSmart ? 'text-indigo-600' : 'text-slate-500'}`}>
            {isSmart ? '⚡ ' : `Q${idx + 1}. `}{q.text}
          </span>
          {answerMethod && answerMethod !== 'NONE' && (
            <span className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-black uppercase border ${badgeClass}`}>
              {answerMethod === 'AUTO' ? '🤖 AUTO' : '✏️ MANUAL'}
            </span>
          )}
        </div>
        <textarea
          rows={2}
          value={answer || ''}
          onChange={e => onChange(q.id, e.target.value)}
          placeholder="Enter details..."
          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none resize-none focus:ring-1 ring-slate-300"
        />
      </div>
    );
  }

  if (q.type === 'text') {
    return (
      <div className={`space-y-2 p-3 rounded-2xl ${isSmart ? 'bg-indigo-50/30 border border-indigo-100/40' : 'bg-slate-50/50'}`}>
        <div className="flex justify-between items-start gap-2">
          <span className={`text-[10px] font-black uppercase leading-relaxed ${isSmart ? 'text-indigo-600' : 'text-slate-500'}`}>
            {isSmart ? '⚡ ' : `Q${idx + 1}. `}{q.text}
          </span>
          {answerMethod && answerMethod !== 'NONE' && (
            <span className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-black uppercase border ${badgeClass}`}>
              {answerMethod === 'AUTO' ? '🤖 AUTO' : '✏️ MANUAL'}
            </span>
          )}
        </div>
        <input
          type="text"
          value={answer || ''}
          onChange={e => onChange(q.id, e.target.value)}
          placeholder="Enter value..."
          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 ring-slate-300"
        />
      </div>
    );
  }

  // Radio pill questions (yesno, yesno_na, etc.)
  const value = answer || '';
  const showSopFollowUp = q.id === 'DQ1' && value === 'No';

  return (
    <div className={`space-y-2 p-3 rounded-2xl ${isSmart ? 'bg-indigo-50/30 border border-indigo-100/40' : 'bg-slate-50/50'}`}>
      <div className="flex justify-between items-start gap-2">
        <span className={`text-[10px] font-black uppercase leading-relaxed ${isSmart ? 'text-indigo-600' : 'text-slate-500'}`}>
          {isSmart ? '⚡ ' : `Q${idx + 1}. `}{q.text}
        </span>
        {answerMethod && answerMethod !== 'NONE' && (
          <span className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-black uppercase border ${badgeClass}`}>
            {answerMethod === 'AUTO' ? '🤖 AUTO' : '✏️ MANUAL'}
          </span>
        )}
      </div>
      <RadioPills
        name={`fda-${q.id}`}
        options={optionSet}
        value={value}
        onChange={val => onChange(q.id, val)}
      />
      {showSopFollowUp && (
        <div className="mt-2 ml-2 space-y-1.5 border-l-2 border-rose-200 pl-3 animate-in slide-in-from-top-1 duration-150">
          <span className="text-[9px] font-black uppercase text-rose-500 block">
            Why was the SOP not followed?
          </span>
          <select
            onChange={e => onChange(`${q.id}_sopReason`, e.target.value)}
            className="w-full bg-white border border-rose-200 rounded-xl p-2 text-xs font-bold text-slate-700 outline-none"
          >
            <option value="">Select reason...</option>
            {SOP_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <textarea
            rows={1}
            placeholder="Additional explanation..."
            onChange={e => onChange(`${q.id}_sopNote`, e.target.value)}
            className="w-full bg-white border border-rose-100 rounded-xl p-2 text-xs font-semibold text-slate-700 outline-none resize-none"
          />
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────
const AddChallengeModal = ({ isOpen, onClose, dept, shift, letter, onSave, isActionTracker }) => {
  const loggedInUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('userInfo')) || {}; }
    catch { return {}; }
  }, []);

  // ── Form state ──
  const [trackerId, setTrackerId]         = useState('Generating...');
  const [date, setDate]                   = useState(todayISO);
  const [occurredTime, setOccurredTime]   = useState(nowHHMM);
  const [errorType, setErrorType]         = useState('Process Error');
  const [otherErrorType, setOtherErrorType] = useState('');
  const [alertIncidentType, setAlertIncidentType] = useState('');
  const [otherAlertType, setOtherAlertType] = useState('');
  const [description, setDescription]    = useState('');
  const [severity, setSeverity]          = useState('Medium');
  const [capa, setCapa]                  = useState('');
  const [relatedChallengeId, setRelatedChallengeId] = useState('');
  const [beforeImageData, setBeforeImageData] = useState(null); // { base64, fileName, mimeType, preview }
  const [markResolved, setMarkResolved]   = useState(false);
  const [actionStatus, setActionStatus]   = useState('Initialized');
  const [actionNotes, setActionNotes]     = useState('');

  // ── Employee search ──
  const [usersList, setUsersList]       = useState([]);
  const [searchTerm, setSearchTerm]     = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ── FDA Agent state ──
  const [fdaMode, setFdaMode]         = useState(null); // null | 'auto' | 'manual'
  const [autofilling, setAutofilling] = useState(false);
  const [fdaAnswers, setFdaAnswers]   = useState({}); // { questionId: { answer, answerMethod } }

  // ── Saving ──
  const [saving, setSaving] = useState(false);

  // ── Build active question list ──
  const deptKey  = (letter || 'Q').toLowerCase();
  const deptQs   = DEPT_FDA_QUESTIONS[deptKey] || DEPT_FDA_QUESTIONS.q;
  const alertQs  = ALERT_FDA_QUESTIONS[alertIncidentType] || [];
  const allQs    = [...deptQs, ...alertQs];

  // ── Generate Tracker ID on open ──
  useEffect(() => {
    if (!isOpen) return;
    const year = new Date().getFullYear();
    axios.get(`${API}/api/fda/challenges`)
      .then(res => {
        const list = res.data || [];
        const prefix = `CH-${year}-`;
        let maxSeq = 0;
        list.forEach(c => {
          const id = c.trackerId || c.id || '';
          if (id.startsWith(prefix)) {
            const numPart = parseInt(id.replace(prefix, ''), 10);
            if (!isNaN(numPart) && numPart > maxSeq) {
              maxSeq = numPart;
            }
          } else if (id.startsWith('TRK-')) {
            const numPart = parseInt(id.replace('TRK-', ''), 10);
            if (!isNaN(numPart) && numPart > maxSeq) {
              maxSeq = numPart;
            }
          }
        });
        const nextNum = maxSeq + 1;
        setTrackerId(`${prefix}${String(nextNum).padStart(4, '0')}`);
      })
      .catch(() => {
        const timestamp = Date.now().toString().slice(-4);
        setTrackerId(`CH-${year}-${timestamp}`);
      });

    // Reset form on open
    setDate(todayISO());
    setOccurredTime(nowHHMM());
    setErrorType('Process Error');
    setOtherErrorType('');
    setAlertIncidentType('');
    setOtherAlertType('');
    setDescription('');
    setRelatedChallengeId('');
    setBeforeImageData(null);
    setMarkResolved(false);
    setActionStatus('Initialized');
    setActionNotes('');
    setSearchTerm('');
    setSelectedUser(null);
    setFdaMode(null);
    setFdaAnswers({});
  }, [isOpen]);

  // ── Load users ──
  useEffect(() => {
    axios.get(`${API}/api/users/all-users`)
      .then(res => setUsersList(res.data || []))
      .catch(() => {});
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return usersList.slice(0, 8);
    const lower = searchTerm.toLowerCase();
    return usersList.filter(u =>
      (u.name && u.name.toLowerCase().includes(lower)) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(lower))
    ).slice(0, 8);
  }, [searchTerm, usersList]);

  // ── Reset FDA answers when alert type or dept changes ──
  useEffect(() => {
    setFdaAnswers({});
    setFdaMode(null);
  }, [alertIncidentType, letter]);

  // ── Answer change handler ──
  const handleAnswerChange = useCallback((qId, val) => {
    setFdaAnswers(prev => ({
      ...prev,
      [qId]: { answer: val, answerMethod: 'MANUAL' }
    }));
  }, []);

  // ── Auto Fill ──
  const handleAutoFill = async () => {
    if (!description.trim()) {
      alert('Please provide a Challenge / Incident Description first so the AI has context.');
      return;
    }
    setAutofilling(true);
    setFdaMode('auto');
    try {
      const filled = {};
      await Promise.all(
        allQs.map(async (q) => {
          try {
            const res = await axios.post(`${API}/api/fda/autofill`, {
              challengeId: trackerId,
              questionId: q.id,
              department: dept || 'fgmw',
              shift: shift || '1',
              date,
              challengeName: description,
              details: description,
              alertType: alertIncidentType,
            });
            filled[q.id] = {
              answer: res.data.answer || '⚠️ Information Not Available — No supporting record found. Please enter manually.',
              answerMethod: res.data.status === 'INSUFFICIENT_DATA' ? 'NONE' : 'AUTO',
            };
          } catch {
            filled[q.id] = {
              answer: '⚠️ Information Not Available — Please enter manually.',
              answerMethod: 'NONE',
            };
          }
        })
      );
      setFdaAnswers(filled);
    } catch (err) {
      alert('Auto Fill failed: ' + err.message);
    } finally {
      setAutofilling(false);
    }
  };

  // ── Manual entry ──
  const handleManualEntry = () => {
    setFdaMode('manual');
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) { alert('Please enter a challenge description.'); return; }
    if (!alertIncidentType) { alert('Please select an Alert / Incident Type.'); return; }

    setSaving(true);
    try {
      const payload = {
        date,
        occurredTime,
        department: dept || 'fgmw',
        shift: shift || '1',
        letter: letter || 'Q',
        errorType,
        otherErrorType: errorType === 'Other' ? otherErrorType : '',
        alertTypes: [alertIncidentType],
        alertIncidentType,
        otherAlertIncidentType: alertIncidentType === 'Other' ? otherAlertType : '',
        description,
        severity,
        capa: capa.trim() || actionNotes || '',
        status: markResolved ? 'CLOSED' : 'PENDING',
        relatedChallengeId: relatedChallengeId.trim() || '',
        responsiblePersonId: selectedUser ? selectedUser._id : '',
        responsiblePersonName: selectedUser ? selectedUser.name : searchTerm,
        responsiblePersonEmployeeId: selectedUser ? selectedUser.employeeId : '',
        reportedByUserId: loggedInUser._id || '',
        reportedByName: loggedInUser.name || 'System User',
        reportedByEmployeeId: loggedInUser.employeeId || 'N/A',
        markResolved,
        actionStatus: markResolved ? 'Resolved' : actionStatus,
        actionNotes,
        isActionTracker: !!isActionTracker,
        beforeImage: beforeImageData ? {
          url: beforeImageData.preview,
          fileName: beforeImageData.fileName,
          uploadedAt: new Date(),
          uploadedBy: loggedInUser.name || 'User',
          uploadedByEmployeeId: loggedInUser.employeeId || '',
          mimeType: beforeImageData.mimeType
        } : null
      };

      // If beforeImage has base64 data, upload it first to obtain permanent server url
      if (beforeImageData && beforeImageData.base64) {
        try {
          const upRes = await axios.post(`${API}/api/verification/upload-evidence`, {
            imageType: 'before',
            fileName: beforeImageData.fileName,
            fileData: beforeImageData.base64,
            mimeType: beforeImageData.mimeType,
            uploadedBy: loggedInUser.name || 'User',
            uploadedByEmployeeId: loggedInUser.employeeId || ''
          });
          if (upRes.data?.metadata) {
            payload.beforeImage = upRes.data.metadata;
          }
        } catch (upErr) {
          console.warn('Initial before evidence upload error:', upErr.message);
        }
      }

      const res = await axios.post(`${API}/api/fda/challenges`, payload);
      if (res.status === 201) {
        // Save FDA Agent answers
        const questions = allQs.map(q => ({
          questionId: q.id,
          question: q.text,
          answer: fdaAnswers[q.id]?.answer || '',
          answerMethod: fdaAnswers[q.id]?.answerMethod || 'NONE',
          status: fdaAnswers[q.id]?.answerMethod || 'NOT_ANSWERED',
          confirmedBy: loggedInUser.name || 'System',
          confirmedAt: new Date(),
        }));

        if (questions.some(q => q.answer)) {
          await axios.post(`${API}/api/fda/investigation`, {
            challengeId: res.data.trackerId || trackerId,
            department: dept || 'fgmw',
            questions,
            createdBy: loggedInUser.name || 'System',
            overallStatus: markResolved ? 'RESOLVED' : 'IN_PROGRESS',
          });
        }

        onSave && onSave(res.data);
        onClose();
      }
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to save challenge.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const showFdaQuestions = fdaMode === 'auto' || fdaMode === 'manual';

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-start justify-center p-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-[2rem] w-full max-w-2xl my-6 flex flex-col shadow-2xl border border-slate-100"
        style={{ animation: 'scaleUp 0.18s ease-out forwards' }}
      >
        {/* ── Sticky Header ── */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm flex justify-between items-center rounded-t-[2rem]">
          <div>
            <h2 className="font-black text-slate-800 tracking-wider text-xs uppercase">
              {isActionTracker ? '📋 Add Action Tracker' : '⚠️ Add Challenge & Issue'}
            </h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              {trackerId} · One occurrence = one record
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 p-1.5 rounded-full transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Form Body ── */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 130px)' }}>

            {/* ── SECTION A: INCIDENT INFORMATION ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center shrink-0">A</span>
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Incident Information</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Tracker ID + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">TRACKER ID</label>
                  <input
                    type="text"
                    disabled
                    value={trackerId}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-orange-600 outline-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">DATE *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-1 ring-slate-400"
                  />
                </div>
              </div>

              {/* Occurred Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">OCCURRED TIME *</label>
                  <input
                    type="time"
                    required
                    value={occurredTime}
                    onChange={e => setOccurredTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-1 ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">ACTION STATUS</label>
                  <select
                    value={actionStatus}
                    onChange={e => setActionStatus(e.target.value)}
                    disabled={markResolved}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-1 ring-slate-400 disabled:opacity-50"
                  >
                    <option>Initialized</option>
                    <option>Investigation started</option>
                    <option>In Progress</option>
                    <option>Pending Review</option>
                    <option>Resolved</option>
                  </select>
                </div>
              </div>

              {/* Deviation / Error Type */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">DEVIATION / ERROR TYPE *</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {['Human Error', 'Process Error', 'Other'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={e => { e.preventDefault(); setErrorType(type); }}
                      className={`px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-wide transition-all select-none active:scale-95 ${
                        errorType === type
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {errorType === 'Other' && (
                  <input
                    type="text"
                    required
                    placeholder="Specify other error type..."
                    value={otherErrorType}
                    onChange={e => setOtherErrorType(e.target.value)}
                    className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-1 ring-slate-400"
                  />
                )}
              </div>

              {/* Alert / Incident Type — SINGLE SELECT */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                  ALERT / INCIDENT TYPE *
                  <span className="ml-2 text-[9px] font-bold text-orange-500 normal-case">One per record</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {ALERT_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={e => { e.preventDefault(); setAlertIncidentType(opt); }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[11px] font-bold transition-all select-none active:scale-95 ${
                        alertIncidentType === opt
                          ? 'bg-orange-500 border-orange-500 text-white font-black'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        alertIncidentType === opt ? 'border-white bg-white/30' : 'border-slate-300'
                      }`}>
                        {alertIncidentType === opt && <span className="w-1.5 h-1.5 bg-white rounded-full block" />}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
                {alertIncidentType === 'Other' && (
                  <input
                    type="text"
                    required
                    placeholder="Specify incident type..."
                    value={otherAlertType}
                    onChange={e => setOtherAlertType(e.target.value)}
                    className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-1 ring-slate-400"
                  />
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">CHALLENGE / INCIDENT DESCRIPTION *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe what happened, what was observed, and where/when it occurred..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-700 outline-none resize-none focus:ring-1 ring-slate-400"
                />
              </div>

              {/* Severity / Rating */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">SEVERITY / RATING</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {['Low', 'Medium', 'High', 'Critical'].map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={e => { e.preventDefault(); setSeverity(sev); }}
                      className={`px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-wide transition-all select-none active:scale-95 ${
                        severity === sev
                          ? sev === 'Critical' ? 'bg-red-600 border-red-600 text-white' : sev === 'High' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Before Problem Evidence Photo (Optional) */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={13} className="text-orange-500" /> Before Problem Evidence Photo <span className="text-[9px] font-bold text-slate-400 normal-case">(For AI Resolution Verification)</span>
                  </label>
                  {beforeImageData && (
                    <button
                      type="button"
                      onClick={() => setBeforeImageData(null)}
                      className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1"
                    >
                      <Trash2 size={11} /> Remove
                    </button>
                  )}
                </div>

                {beforeImageData ? (
                  <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
                    <img
                      src={beforeImageData.preview}
                      alt="Before preview"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-100 shadow-sm"
                    />
                    <div className="text-xs overflow-hidden">
                      <span className="font-bold text-slate-700 block truncate">{beforeImageData.fileName}</span>
                      <span className="text-[9px] font-bold text-emerald-600">✓ Ready for upload</span>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50/20 transition-all rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 bg-white">
                    <Upload size={14} className="text-orange-500" />
                    <span>Upload photo of problem state</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setBeforeImageData({
                              base64: reader.result,
                              preview: reader.result,
                              fileName: f.name,
                              mimeType: f.type
                            });
                          };
                          reader.readAsDataURL(f);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Related Challenge ID (optional) */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  RELATED CHALLENGE ID <span className="font-bold text-slate-300 normal-case">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CH-2026-0001 (if related to another challenge)"
                  value={relatedChallengeId}
                  onChange={e => setRelatedChallengeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-1 ring-slate-400"
                />
              </div>
            </div>

            {/* ── SECTION B: PEOPLE ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center shrink-0">B</span>
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">People</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Responsible Person */}
              <div className="grid grid-cols-2 gap-4 relative">
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">RESPONSIBLE PERSON</label>
                  <input
                    type="text"
                    placeholder="🔍 Search employee..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setSelectedUser(null); setDropdownOpen(true); }}
                    onFocus={() => setDropdownOpen(true)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-1 ring-slate-400"
                  />
                  {dropdownOpen && filteredUsers.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-20 max-h-40 overflow-y-auto">
                        {filteredUsers.map(u => (
                          <button
                            key={u._id}
                            type="button"
                            onClick={() => { setSelectedUser(u); setSearchTerm(u.name); setDropdownOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 font-bold flex justify-between items-center text-slate-700"
                          >
                            <span>{u.name}</span>
                            <span className="text-[9px] font-black text-slate-400">{u.employeeId}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">EMPLOYEE ID</label>
                  <input
                    type="text"
                    disabled
                    value={selectedUser ? selectedUser.employeeId : ''}
                    placeholder="Auto-populated"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Reported By */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">REPORTED BY (NAME)</label>
                  <input
                    type="text"
                    disabled
                    value={loggedInUser.name || 'System User'}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">REPORTED BY (EMP ID)</label>
                  <input
                    type="text"
                    disabled
                    value={loggedInUser.employeeId || 'N/A'}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* ── SECTION C: STATUS ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center shrink-0">C</span>
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Status & Resolution</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Mark Resolved */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-xs font-black text-slate-800 uppercase block">Mark Resolved</span>
                  {markResolved && (
                    <span className="text-[9px] font-bold text-emerald-600 mt-0.5 block">
                      Resolved by {loggedInUser.name || 'User'} · now
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setMarkResolved(!markResolved)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${markResolved ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  aria-label="Toggle resolved"
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${markResolved ? 'translate-x-6' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>

              {/* Action Notes */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">ACTION NOTES</label>
                <textarea
                  rows={2}
                  value={actionNotes}
                  placeholder="Enter corrective action details or status notes..."
                  onChange={e => setActionNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-700 outline-none resize-none focus:ring-1 ring-slate-400"
                />
              </div>
            </div>

            {/* ── SECTION D: FDA AGENT REVIEW ── */}
            <div className="rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🕵️</span>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">FDA Agent Review</h3>
                </div>
                <p className="text-[9px] font-bold text-slate-300 leading-relaxed">
                  Capture information an investigator would typically want to understand about this event.
                  Questions adapt based on department and selected incident type.
                </p>
              </div>

              <div className="p-4 bg-slate-50/50 space-y-3">
                {/* Mode selection buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleAutoFill}
                    disabled={autofilling}
                    className={`flex flex-col items-center gap-1 py-3 px-4 rounded-2xl border-2 transition-all text-left ${
                      fdaMode === 'auto'
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      {autofilling
                        ? <Loader2 size={14} className="animate-spin shrink-0" />
                        : <Sparkles size={14} className="shrink-0" />
                      }
                      <span className="text-xs font-black uppercase">
                        {autofilling ? 'Analyzing...' : '🤖 Auto Fill'}
                      </span>
                    </div>
                    <span className={`text-[9px] font-bold ${fdaMode === 'auto' ? 'text-slate-300' : 'text-slate-400'}`}>
                      Use available QDSHI records
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleManualEntry}
                    className={`flex flex-col items-center gap-1 py-3 px-4 rounded-2xl border-2 transition-all text-left ${
                      fdaMode === 'manual'
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="text-xs font-black uppercase">✏️ Manual Entry</span>
                    </div>
                    <span className={`text-[9px] font-bold ${fdaMode === 'manual' ? 'text-slate-300' : 'text-slate-400'}`}>
                      Enter investigation details
                    </span>
                  </button>
                </div>

                {/* Auto fill source indicator */}
                {fdaMode === 'auto' && !autofilling && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <span className="text-[9px] font-black text-indigo-600 uppercase">🤖 Generated from QDSHI records</span>
                    <span className="text-[8px] font-bold text-indigo-400">· Answers are editable before saving</span>
                  </div>
                )}

                {/* Autofill loading */}
                {autofilling && (
                  <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-2">
                    <p className="text-xs font-black text-slate-600 uppercase">🤖 Analyzing QDSHI records...</p>
                    {['Challenge data', 'Update Logs', 'Equipment records', 'Action Tracker'].map((src, i) => (
                      <div key={src} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <Loader2 size={10} className="animate-spin text-indigo-400 shrink-0" style={{ animationDelay: `${i * 0.15}s` }} />
                        Searching: {src}
                      </div>
                    ))}
                  </div>
                )}

                {/* Department-specific questions header */}
                {showFdaQuestions && !autofilling && (
                  <div className="space-y-3">
                    {deptQs.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                            {(letter || 'Q').toUpperCase() === 'Q' ? 'Quality' :
                             (letter || 'Q').toUpperCase() === 'D' ? 'Delivery' :
                             (letter || 'Q').toUpperCase() === 'S' ? 'Safety' : 'Health'} Department Questions
                          </span>
                          <div className="flex-1 h-px bg-slate-200" />
                        </div>
                        {deptQs.map((q, idx) => (
                          <FDAQuestion
                            key={q.id}
                            q={q}
                            idx={idx}
                            answer={fdaAnswers[q.id]?.answer || ''}
                            answerMethod={fdaAnswers[q.id]?.answerMethod}
                            onChange={handleAnswerChange}
                          />
                        ))}
                      </div>
                    )}

                    {alertQs.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">
                            ⚡ {alertIncidentType} — Specific Questions
                          </span>
                          <div className="flex-1 h-px bg-indigo-100" />
                        </div>
                        {alertQs.map((q, idx) => (
                          <FDAQuestion
                            key={q.id}
                            q={q}
                            idx={idx}
                            answer={fdaAnswers[q.id]?.answer || ''}
                            answerMethod={fdaAnswers[q.id]?.answerMethod}
                            onChange={handleAnswerChange}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!showFdaQuestions && !autofilling && (
                  <p className="text-center text-[10px] text-slate-400 font-bold py-2">
                    Select a mode above to capture FDA investigation details.
                  </p>
                )}
              </div>
            </div>

          </div>{/* end scrollable body */}

          {/* ── Sticky Footer ── */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-100 px-6 py-4 flex justify-between items-center gap-3 rounded-b-[2rem]">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-black px-6 py-2.5 rounded-full uppercase tracking-wider text-xs transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black px-8 py-2.5 rounded-full uppercase tracking-wider text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <><Loader2 size={13} className="animate-spin" /> Saving...</>
              ) : (
                isActionTracker ? 'Save Action Tracker' : 'Save Challenge'
              )}
            </button>
          </div>

        </form>
      </div>

      <style>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95) translateY(-8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AddChallengeModal;
