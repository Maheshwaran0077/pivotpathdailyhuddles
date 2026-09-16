import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ShieldAlert, ShieldCheck, Shield, ChevronLeft,
  AlertTriangle, AlertCircle, XCircle, Users, Search, CheckCircle2,
  X, RefreshCw, BarChart2, User, Sparkles, Trash2
} from 'lucide-react';
import axios from 'axios';
import AIResolutionVerificationModal from '../components/AIResolutionVerificationModal';

const API = process.env.REACT_APP_API_URL ||
  ((window.location.port && window.location.port !== '5000')
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : window.location.origin);

// ─── Constants ────────────────────────────────────────────────────────────
const DEPT_LABELS = {
  fgmw: 'Quality', fg: 'Quality', pmw: 'Delivery', pm: 'Delivery',
  rmw: 'Safety', rm: 'Safety', qcmad: 'Quality', pro: 'Quality',
  pop: 'Quality', ppp: 'Quality', spp: 'Quality',
  ehs: 'Safety', engineering: 'Safety', fac: 'Safety', hr: 'Health',
};

const DEPT_ICON = { Quality: '🔬', Delivery: '📦', Safety: '🦺', Health: '❤️' };
const DEPARTMENTS = ['Quality', 'Delivery', 'Safety', 'Health'];

const ERROR_TYPES = ['Human Error', 'Process Error', 'GDP Error', 'EM Excursion', 'Other'];

const ALERT_TYPES_LIST = [
  'Target Met', 'Target Missed', 'Machine Failure', 'No Power',
  'No Employee / Manpower Shortage', 'Material Not Available',
  'Equipment Unavailable', 'Process Delay', 'Quality Issue', 'Safety Issue', 'Other',
];

const STATUS_CFG = {
  STRONG: { label: '🟢 STRONG', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  MODERATE: { label: '🟡 MODERATE', cls: 'text-amber-700 bg-amber-50 border-amber-200', bar: 'bg-amber-500', dot: 'bg-amber-500' },
  WEAK: { label: '🔴 WEAK', cls: 'text-red-700 bg-red-50 border-red-200', bar: 'bg-red-500', dot: 'bg-red-500' },
};

const getStatusCfg = s => STATUS_CFG[s?.toUpperCase()] || STATUS_CFG.STRONG;

// ─── Metric Card ──────────────────────────────────────────────────────────
const MetricCard = ({ label, value, color = 'text-slate-800', subLabel }) => (
  <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{label}</span>
    <div>
      <span className={`text-3xl font-black ${color} block mt-2`}>{value ?? '—'}</span>
      {subLabel && <span className="text-[9px] font-bold text-slate-400 mt-0.5 block">{subLabel}</span>}
    </div>
  </div>
);

// ─── Challenge Detail Modal ───────────────────────────────────────────────
const ChallengeDetailModal = ({ challenge, onClose, onResolve, onOpenVerification }) => {
  if (!challenge) return null;
  const primaryAlert = challenge.alertIncidentType || challenge.alertTypes?.[0] || 'N/A';
  const cfg = getStatusCfg(challenge.defenceStatus);

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[210] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2.5rem] w-full max-w-lg flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
        style={{ maxHeight: '90vh', animation: 'scaleUp 0.18s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-6 pb-4 border-b border-slate-100 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert size={16} className="text-orange-500" />
              <span className="font-black text-orange-600 text-xs uppercase tracking-wide">{challenge.trackerId}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${cfg.cls}`}>{cfg.label}</span>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase">{DEPT_LABELS[challenge.department] || challenge.department} · Shift {challenge.shift}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-7 py-5 space-y-4 text-xs">
          {/* Tags row */}
          <div className="flex flex-wrap gap-1.5">
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase">{challenge.errorType}</span>
            {primaryAlert !== 'N/A' && (
              <span className="px-3 py-1 bg-orange-50 text-orange-600 border border-orange-200 rounded-full text-[10px] font-black uppercase">{primaryAlert}</span>
            )}
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${challenge.markResolved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {challenge.markResolved ? '✓ Resolved' : challenge.actionStatus || 'Initialized'}
            </span>
          </div>

          {/* Grid of details */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Date', value: challenge.date },
              { label: 'Occurred Time', value: challenge.occurredTime || '—' },
              { label: 'Responsible Person', value: `${challenge.responsiblePersonName || 'N/A'} (${challenge.responsiblePersonEmployeeId || 'N/A'})` },
              { label: 'Reported By', value: `${challenge.reportedByName || 'N/A'} (${challenge.reportedByEmployeeId || 'N/A'})` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-2xl p-3">
                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">{label}</span>
                <span className="font-bold text-slate-700 text-[11px]">{value}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1.5">Challenge Description</span>
            <p className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 font-medium text-slate-700 text-[11px] leading-relaxed whitespace-pre-line">
              {challenge.description || 'No description provided.'}
            </p>
          </div>

          {/* Action notes */}
          {challenge.actionNotes && (
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase block mb-1.5">Action Notes</span>
              <p className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 font-medium text-slate-600 text-[11px] leading-relaxed whitespace-pre-line">
                {challenge.actionNotes}
              </p>
            </div>
          )}

          {/* Resolved details */}
          {challenge.markResolved && challenge.resolvedAt && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5">
              <span className="text-[9px] font-black text-emerald-600 uppercase block mb-1">Resolved</span>
              <span className="font-bold text-emerald-700 text-[11px]">
                {new Date(challenge.resolvedAt).toLocaleString('en-GB')} · by {challenge.resolvedBy}
              </span>
            </div>
          )}

          {/* Related challenge */}
          {challenge.relatedChallengeId && (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
              <span className="text-[9px] font-black text-indigo-600 uppercase">Related Challenge:</span>
              <span className="font-black text-indigo-700 text-[10px]">{challenge.relatedChallengeId}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-slate-100 flex flex-wrap gap-2.5">
          <button
            onClick={() => onOpenVerification(challenge)}
            className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3 rounded-2xl font-black text-xs uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md"
          >
            <Sparkles size={14} /> AI Verification
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl font-black text-xs uppercase transition-all active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
      <style>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────
const FDADefenceDashboard = () => {
  const navigate = useNavigate();
  const { challengeId } = useParams();

  const loggedInUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('userInfo')) || {}; }
    catch { return {}; }
  }, []);

  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState([]);
  const [viewingChallenge, setViewingChallenge] = useState(null);
  const [verifyingChallenge, setVerifyingChallenge] = useState(null);
  const [selectedDeptLevel, setSelectedDeptLevel] = useState('All');

  // Filters
  const [filterDept, setFilterDept] = useState('all');
  const [filterErrorType, setFilterErrorType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDefence, setFilterDefence] = useState('all');
  const [filterResolved, setFilterResolved] = useState('all');
  const [filterAlert, setFilterAlert] = useState('all');
  const [tableSearch, setTableSearch] = useState('');

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/fda/challenges`);
      setChallenges(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load single challenge if route has ID
  useEffect(() => {
    if (challengeId) {
      axios.get(`${API}/api/fda/challenges/${challengeId}`)
        .then(res => setViewingChallenge(res.data))
        .catch(console.error);
    } else {
      setViewingChallenge(null);
    }
  }, [challengeId]);

  // ── Stats computation ──
  const levelChallenges = useMemo(() => {
    if (selectedDeptLevel === 'All') return challenges;
    return challenges.filter(c =>
      DEPT_LABELS[c.department] === selectedDeptLevel ||
      c.department === selectedDeptLevel.toLowerCase()
    );
  }, [challenges, selectedDeptLevel]);

  const calcReadiness = (list) => {
    if (!list.length) return { score: 100, status: 'STRONG' };
    let totalDeductions = 0;
    list.forEach(c => {
      if (!c.markResolved) totalDeductions += 5;
      if (!c.markResolved && c.severity === 'High') totalDeductions += 10;
      if (c.isRecurring) totalDeductions += 8;
      if (c.actionStatus === 'Initialized') totalDeductions += 3;
      if (!c.description || !c.occurredTime) totalDeductions += 5;
    });
    const score = Math.max(20, Math.round(100 - totalDeductions / list.length));
    const status = score >= 80 ? 'STRONG' : score >= 60 ? 'MODERATE' : 'WEAK';
    return { score, status };
  };

  const stats = useMemo(() => {
    const list = levelChallenges;
    const total = list.length;
    const resolved = list.filter(c => c.markResolved).length;
    const open = total - resolved;
    const highRisk = list.filter(c => c.severity === 'High' && !c.markResolved).length;
    const recurring = list.filter(c => c.isRecurring).length;
    const gaps = list.filter(c => c.defenceStatus === 'WEAK').length;
    const { score, status } = calcReadiness(list);
    return { total, resolved, open, highRisk, recurring, gaps, score, status };
  }, [levelChallenges]);

  const deptStats = useMemo(() => {
    return DEPARTMENTS.reduce((acc, dept) => {
      const list = challenges.filter(c =>
        DEPT_LABELS[c.department] === dept || c.department === dept.toLowerCase()
      );
      const { score, status } = calcReadiness(list);
      const unresolved = list.filter(c => !c.markResolved).length;
      const recurring = list.filter(c => c.isRecurring).length;
      const initialized = list.filter(c => c.actionStatus === 'Initialized').length;
      const gaps = list.filter(c => c.defenceStatus === 'WEAK').length;
      const bullets = [];
      if (unresolved > 0) bullets.push(`${unresolved} unresolved challenge(s)`);
      if (recurring > 0) bullets.push(`${recurring} recurring deviation(s)`);
      if (initialized > 0) bullets.push(`${initialized} action(s) remaining Initialized`);
      if (gaps > 0) bullets.push(`${gaps} missing evidence record(s)`);
      acc[dept] = { score, status, count: list.length, bullets };
      return acc;
    }, {});
  }, [challenges]);

  // Problem contributors (alert type counts)
  const problemContributors = useMemo(() => {
    const counts = {};
    levelChallenges.forEach(c => {
      // Count errorType
      if (c.errorType) counts[c.errorType] = (counts[c.errorType] || 0) + 1;
      // Count primary alert (alertIncidentType or first of alertTypes)
      const alert = c.alertIncidentType || c.alertTypes?.[0];
      if (alert && alert !== 'Target Met') {
        counts[alert] = (counts[alert] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [levelChallenges]);

  // Information gaps (clickable)
  const informationGaps = useMemo(() => {
    const gaps = [];
    levelChallenges.forEach(c => {
      if (!c.description || !c.occurredTime) {
        gaps.push({ challenge: c, type: 'danger', text: `${c.trackerId}: Incomplete log details (missing time or description).` });
      }
      if (c.actionStatus === 'Initialized' && !c.markResolved) {
        gaps.push({ challenge: c, type: 'warning', text: `${c.trackerId}: Action remains Initialized — no follow-up recorded.` });
      }
      if (c.defenceStatus === 'WEAK') {
        gaps.push({ challenge: c, type: 'info', text: `${c.trackerId}: Low defence readiness — missing evidence or documentation.` });
      }
    });
    return gaps.slice(0, 12);
  }, [levelChallenges]);

  // Top risks
  const topRisks = useMemo(() => {
    const risks = [];
    const add = (text, count) => count > 0 && risks.push({ text, count });
    add(`Recurring Human Errors`, challenges.filter(c => c.isRecurring && c.errorType === 'Human Error').length);
    add(`Repeated Process Errors`, challenges.filter(c => c.isRecurring && c.errorType === 'Process Error').length);
    add(`Machine Failures (unresolved)`, challenges.filter(c => (c.alertIncidentType === 'Machine Failure' || c.alertTypes?.includes('Machine Failure')) && !c.markResolved).length);
    add(`Power Interruptions (unresolved)`, challenges.filter(c => (c.alertIncidentType === 'No Power' || c.alertTypes?.includes('No Power')) && !c.markResolved).length);
    add(`Manpower Shortages (open)`, challenges.filter(c => (c.alertIncidentType === 'No Employee / Manpower Shortage' || c.alertTypes?.includes('No Employee / Manpower Shortage')) && !c.markResolved).length);
    add(`Initialized actions (no update)`, challenges.filter(c => !c.markResolved && c.actionStatus === 'Initialized').length);
    return risks.sort((a, b) => b.count - a.count);
  }, [challenges]);

  // Workload
  const workload = useMemo(() => {
    const counts = {};
    challenges.forEach(c => {
      if (!c.responsiblePersonName) return;
      if (!counts[c.responsiblePersonName]) counts[c.responsiblePersonName] = { total: 0, open: 0, recurring: 0 };
      counts[c.responsiblePersonName].total++;
      if (!c.markResolved) counts[c.responsiblePersonName].open++;
      if (c.isRecurring) counts[c.responsiblePersonName].recurring++;
    });
    return Object.entries(counts).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.open - a.open);
  }, [challenges]);

  // Filtered table challenges
  const filteredChallenges = useMemo(() => {
    let list = selectedDeptLevel === 'All' ? challenges : levelChallenges;
    if (filterDept !== 'all') list = list.filter(c => DEPT_LABELS[c.department] === filterDept || c.department === filterDept.toLowerCase());
    if (filterErrorType !== 'all') list = list.filter(c => c.errorType === filterErrorType);
    if (filterAlert !== 'all') list = list.filter(c => c.alertIncidentType === filterAlert || c.alertTypes?.includes(filterAlert));
    if (filterStatus !== 'all') list = list.filter(c => c.actionStatus === filterStatus);
    if (filterDefence !== 'all') list = list.filter(c => c.defenceStatus === filterDefence.toUpperCase());
    if (filterResolved !== 'all') list = list.filter(c => c.markResolved === (filterResolved === 'true'));
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(c =>
        (c.trackerId && c.trackerId.toLowerCase().includes(q)) ||
        (c.responsiblePersonName && c.responsiblePersonName.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.alertIncidentType && c.alertIncidentType.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [challenges, levelChallenges, selectedDeptLevel, filterDept, filterErrorType, filterAlert, filterStatus, filterDefence, filterResolved, tableSearch]);

  // Resolve handler
  const handleResolve = async (trackerId) => {
    if (!window.confirm('Mark this challenge as resolved?')) return;
    try {
      await axios.put(`${API}/api/fda/challenges/${trackerId}`, {
        markResolved: true,
        actionStatus: 'Resolved',
        actionNotes: 'Challenge marked resolved from FDA Defence dashboard.',
        resolvedBy: loggedInUser.name || 'Supervisor',
      });
      await fetchData();
      setViewingChallenge(null);
    } catch (err) {
      alert('Failed to resolve: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans select-none">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-10 space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-orange-600 font-black uppercase text-[10px] tracking-widest mb-1">
              <ShieldAlert size={13} /> Internal Defence System
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">
              FDA Defence Analysis
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Inspection Readiness Registry · Powered by QDSHI Data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2.5 rounded-2xl text-xs font-black uppercase text-slate-500 transition-all active:scale-95 shadow-sm"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-2xl text-xs font-black uppercase text-slate-600 transition-all active:scale-95 shadow-sm"
            >
              <ChevronLeft size={14} /> Home
            </button>
          </div>
        </div>

        {/* ── Hero Tagline ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2rem] p-8 text-center shadow-xl">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #f97316 0%, transparent 50%), radial-gradient(circle at 80% 50%, #3b82f6 0%, transparent 50%)' }}
          />
          <div className="relative">
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em] mb-3">FDA Compliance Principle</p>
            <blockquote
              className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight tracking-tight"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontStyle: 'italic' }}
            >
              "Inspection Readiness Is a Continuous State,
              <br className="hidden sm:block" />{' '}
              Not a Last-Minute Activity"
            </blockquote>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="h-px w-12 bg-orange-400/50" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FDA Guidance</span>
              <div className="h-px w-12 bg-orange-400/50" />
            </div>
          </div>
        </div>

        {/* ── Dept-level tabs ── */}
        <div className="flex gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
          {['All', ...DEPARTMENTS].map(d => (
            <button
              key={d}
              onClick={() => setSelectedDeptLevel(d)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase transition-all shadow-xs border whitespace-nowrap ${selectedDeptLevel === d
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                }`}
            >
              {d === 'All' ? 'Overall Facility' : `${DEPT_ICON[d]} ${d}`}
            </button>
          ))}
        </div>

        {/* ── 6 Metric Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard label="Total Challenges" value={stats.total} />
          <MetricCard label="Open" value={stats.open} color={stats.open > 0 ? 'text-red-500' : 'text-slate-800'} />
          <MetricCard label="Resolved" value={stats.resolved} color="text-emerald-600" />
          <MetricCard label="Recurring Issues" value={stats.recurring} color={stats.recurring > 0 ? 'text-orange-500' : 'text-slate-800'} />
          <MetricCard label="High Risk" value={stats.highRisk} color={stats.highRisk > 0 ? 'text-red-600' : 'text-slate-800'} />
          <MetricCard label="Info Gaps" value={stats.gaps} color={stats.gaps > 0 ? 'text-amber-600' : 'text-slate-800'} />
        </div>

        {/* ── Overall Readiness + Dept Cards ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Overall Status Card */}
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-7 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute right-0 top-0 w-28 h-28 bg-slate-50 rounded-bl-full flex items-center justify-center">
              <Shield size={42} className="text-slate-100" />
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                {selectedDeptLevel === 'All' ? 'Overall Facility' : selectedDeptLevel} · Internal Readiness
              </span>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide mt-1">FDA Defence Readiness</h2>
            </div>
            <div className="my-6">
              <div className="text-5xl font-black text-slate-800">{stats.score}%</div>
              <div className="mt-3">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-black uppercase border ${getStatusCfg(stats.status).cls}`}>
                  {getStatusCfg(stats.status).label}
                </span>
              </div>
              <div className="mt-3 w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getStatusCfg(stats.status).bar}`}
                  style={{ width: `${stats.score}%` }}
                />
              </div>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Calculated from open deviations, overdue actions, and evidence status.
            </p>
          </div>

          {/* Department Cards (2-col grid spanning 2 cols) */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            {DEPARTMENTS.map(dept => {
              const info = deptStats[dept];
              const cfg = getStatusCfg(info.status);
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDeptLevel(dept)}
                  className={`bg-white border rounded-3xl p-5 text-left shadow-sm hover:shadow-md transition-all active:scale-[0.98] ${selectedDeptLevel === dept ? 'border-slate-400 ring-2 ring-slate-200' : 'border-slate-100'
                    }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-black text-slate-700 flex items-center gap-1.5">
                      {DEPT_ICON[dept]} <span className="uppercase text-xs tracking-wide">{dept}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </div>

                  <div className="text-3xl font-black text-slate-800 mb-1">{info.score}%</div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                    <div className={`h-full ${cfg.bar} rounded-full`} style={{ width: `${info.score}%` }} />
                  </div>

                  <div className="text-[9px] font-bold text-slate-400 mb-2">{info.count} challenge(s)</div>

                  {info.bullets.length > 0 && (
                    <ul className="space-y-0.5">
                      {info.bullets.slice(0, 3).map((b, i) => (
                        <li key={i} className="text-[9px] text-slate-500 font-bold flex items-start gap-1">
                          <span className="text-red-400 shrink-0 mt-0.5">•</span> {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  {info.bullets.length === 0 && (
                    <p className="text-[9px] text-emerald-600 font-bold italic">No vulnerability indicators.</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Problem Contributors + Top Risks ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Problem Contributors */}
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-7 shadow-sm">
            <div className="mb-5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Causal Analysis</span>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide mt-1 flex items-center gap-1.5">
                <BarChart2 size={14} className="text-orange-500" /> Top Problem Contributors
              </h2>
            </div>
            {problemContributors.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No challenge data available.</p>
            ) : (
              <div className="space-y-3">
                {problemContributors.map((item, idx) => {
                  const maxCount = problemContributors[0]?.count || 1;
                  const pct = Math.round((item.count / maxCount) * 100);
                  return (
                    <div key={item.name}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="text-[9px] font-black text-slate-300">0{idx + 1}.</span>
                          {item.name}
                        </span>
                        <span className="text-xs font-black text-slate-800">{item.count}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Defence Risks */}
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-7 shadow-sm">
            <div className="mb-5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Vulnerability Tracking</span>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide mt-1 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-red-500" /> Top Defence Risks
              </h2>
            </div>
            {topRisks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <ShieldCheck size={28} className="text-emerald-400" />
                <p className="text-xs text-slate-400 italic text-center">No critical risks identified. All departments are operationally stable.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topRisks.map((risk, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-red-50/30 border border-red-100/50 rounded-2xl">
                    <span className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded-full text-[10px] font-black shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <span className="text-xs font-bold text-slate-700 block">{risk.text}</span>
                    </div>
                    <span className="text-xs font-black text-red-600 shrink-0">{risk.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Information Gaps ── */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-7 shadow-sm">
          <div className="mb-5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Compliance Review</span>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide mt-1">⚠️ Information Gaps & Missing Documentation</h2>
            <p className="text-[9px] text-slate-400 font-bold mt-0.5">Click any item to open the challenge details</p>
          </div>
          {informationGaps.length === 0 ? (
            <div className="py-8 text-center">
              <ShieldCheck size={28} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400 italic">No information gaps detected. All records are fully compliant.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {informationGaps.map((gap, idx) => {
                const colors = gap.type === 'danger'
                  ? 'bg-rose-50/40 border-rose-200/60 text-rose-800 hover:bg-rose-50/70'
                  : gap.type === 'warning'
                    ? 'bg-amber-50/40 border-amber-200/60 text-amber-800 hover:bg-amber-50/70'
                    : 'bg-indigo-50/40 border-indigo-200/60 text-indigo-800 hover:bg-indigo-50/70';
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setViewingChallenge(gap.challenge)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all hover:scale-[1.01] active:scale-[0.99] min-h-[80px] flex flex-col justify-between ${colors}`}
                  >
                    <span className="text-[10.5px] font-bold leading-relaxed">{gap.text}</span>
                    <span className="text-[8px] font-black uppercase tracking-wider mt-2 opacity-60">Click to view →</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Filter Toolbar + Table ── */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="px-7 py-5 border-b border-slate-50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-wide text-xs">Challenge Registry</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Click a row to view full details</p>
              </div>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">
                {filteredChallenges.length} records
              </span>
            </div>

            {/* Search + Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {/* Search */}
              <div className="col-span-2 sm:col-span-3 lg:col-span-2 relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ID, person, description..."
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-8 pr-3 py-2.5 text-[10px] font-bold text-slate-700 outline-none focus:ring-1 ring-slate-300"
                />
              </div>

              {[
                {
                  label: 'Department', value: filterDept, setter: setFilterDept,
                  opts: [['all', 'All Depts'], ...DEPARTMENTS.map(d => [d, d])]
                },
                {
                  label: 'Error Type', value: filterErrorType, setter: setFilterErrorType,
                  opts: [['all', 'All Errors'], ...ERROR_TYPES.map(e => [e, e])]
                },
                {
                  label: 'Alert Type', value: filterAlert, setter: setFilterAlert,
                  opts: [['all', 'All Alerts'], ...ALERT_TYPES_LIST.map(a => [a, a])]
                },
                {
                  label: 'Status', value: filterStatus, setter: setFilterStatus,
                  opts: [['all', 'All Statuses'], ['Initialized', 'Initialized'], ['Investigation started', 'In Investigation'], ['Resolved', 'Resolved']]
                },
                {
                  label: 'Defence', value: filterDefence, setter: setFilterDefence,
                  opts: [['all', 'All'], ['strong', 'STRONG'], ['moderate', 'MODERATE'], ['weak', 'WEAK']]
                },
                {
                  label: 'Resolution', value: filterResolved, setter: setFilterResolved,
                  opts: [['all', 'All'], ['true', 'Resolved Only'], ['false', 'Unresolved Only']]
                },
              ].map(({ label, value, setter, opts }) => (
                <div key={label}>
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-1">{label}</label>
                  <select
                    value={value}
                    onChange={e => setter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-2.5 text-[10px] font-bold text-slate-700 outline-none"
                  >
                    {opts.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] min-w-[800px]">
              <thead className="bg-slate-50/60 text-slate-400 font-black uppercase text-[9px] tracking-wider border-b">
                <tr>
                  <th className="px-6 py-4">Tracker ID</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Dept</th>
                  <th className="px-6 py-4">Deviation</th>
                  <th className="px-6 py-4">Alert / Incident</th>
                  <th className="px-6 py-4">Responsible</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">AI Verification</th>
                  <th className="px-6 py-4">Defence</th>
                  {loggedInUser.role === 'superadmin' && <th className="px-6 py-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={loggedInUser.role === 'superadmin' ? 11 : 10} className="px-6 py-12 text-center text-slate-400 italic font-bold uppercase text-xs">
                      Loading challenges...
                    </td>
                  </tr>
                ) : filteredChallenges.length === 0 ? (
                  <tr>
                    <td colSpan={loggedInUser.role === 'superadmin' ? 11 : 10} className="px-6 py-12 text-center text-slate-400 italic font-bold uppercase text-xs">
                      No challenges found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredChallenges.map((ch, idx) => {
                    const def = getStatusCfg(ch.defenceStatus);
                    const primaryAlert = ch.alertIncidentType || ch.alertTypes?.[0] || '—';
                    return (
                      <tr
                        key={ch._id || `${ch.trackerId || ch.id || 'row'}-${idx}`}
                        onClick={() => setViewingChallenge(ch)}
                        className="hover:bg-slate-50/50 transition-all cursor-pointer"
                      >
                        <td className="px-6 py-4 font-black text-orange-600">{ch.trackerId}</td>
                        <td className="px-6 py-4 text-slate-400 font-bold">{ch.date}</td>
                        <td className="px-6 py-4 text-slate-400 font-bold">{ch.occurredTime || '—'}</td>
                        <td className="px-6 py-4 uppercase text-[9px] tracking-wider font-extrabold text-slate-500">
                          {DEPT_LABELS[ch.department] || ch.department}
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-bold">{ch.errorType || '—'}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-[9px] font-black">
                            {primaryAlert}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-bold">{ch.responsiblePersonName || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${ch.actionStatus === 'Resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                            }`}>
                            {ch.actionStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4" onClick={e => { e.stopPropagation(); setVerifyingChallenge(ch); }}>
                          {(() => {
                            const ver = ch.resolutionVerification || ch.aiAnalysis || {};
                            const isCompleted = ver.analysisStatus === 'COMPLETED' || !!ver.resolutionAssessment;
                            const reason = (ver.analysisReason || '').toLowerCase();
                            const sameArea = ver.sameAreaConfidence;
                            const suspicious = ver.suspiciousEvidence;
                            const rec = ver.verificationRecommendation;
                            const assessment = ver.resolutionAssessment;

                            if (!isCompleted) {
                              return (
                                <button
                                  type="button"
                                  className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 transition-all bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
                                >
                                  <Sparkles size={11} className="text-orange-500 shrink-0" />
                                  Verify AI
                                </button>
                              );
                            }

                            // 1. Place / Location Mismatched
                            if (
                              suspicious ||
                              (sameArea !== undefined && sameArea < 60) ||
                              reason.includes('location mismatch') ||
                              reason.includes('different area') ||
                              reason.includes('place')
                            ) {
                              const label = (reason.includes('same image') || reason.includes('identical'))
                                ? 'Duplicate Image'
                                : 'Place Mismatched';
                              return (
                                <button
                                  type="button"
                                  title={ver.analysisReason || 'Problem location mismatch between photos.'}
                                  className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 transition-all bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 shadow-sm"
                                >
                                  <AlertTriangle size={11} className="text-rose-600 shrink-0" />
                                  {label}
                                </button>
                              );
                            }

                            // 2. Retake Image (Low Quality / Insufficient Evidence)
                            if (
                              rec === 'REJECT_OR_RETAKE_IMAGE' ||
                              assessment === 'INSUFFICIENT_EVIDENCE' ||
                              reason.includes('retake') ||
                              reason.includes('blurry') ||
                              reason.includes('low-resolution') ||
                              (ver.imageQualityScore !== undefined && ver.imageQualityScore < 55)
                            ) {
                              return (
                                <button
                                  type="button"
                                  title={ver.analysisReason || 'Low image quality or insufficient evidence. Photo retake required.'}
                                  className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 transition-all bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 shadow-sm"
                                >
                                  <RefreshCw size={11} className="text-amber-600 shrink-0" />
                                  Retake Image
                                </button>
                              );
                            }

                            // 3. Not Resolved
                            if (assessment === 'NOT_RESOLVED' || ver.problemDetectedAfter === true) {
                              return (
                                <button
                                  type="button"
                                  title={ver.analysisReason || 'Issue still persists in After photo.'}
                                  className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 transition-all bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                >
                                  <XCircle size={11} className="text-rose-600 shrink-0" />
                                  Not Resolved
                                </button>
                              );
                            }

                            // 4. Partially Resolved
                            if (assessment === 'PARTIALLY_RESOLVED') {
                              return (
                                <button
                                  type="button"
                                  title={ver.analysisReason || 'Issue partially resolved.'}
                                  className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 transition-all bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                                >
                                  <AlertCircle size={11} className="text-amber-600 shrink-0" />
                                  Partially Resolved
                                </button>
                              );
                            }

                            // 5. Likely Resolved
                            if (assessment === 'LIKELY_RESOLVED') {
                              return (
                                <button
                                  type="button"
                                  title={ver.analysisReason || 'Visual evidence confirms issue is resolved.'}
                                  className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 transition-all bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                >
                                  <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                                  Likely Resolved
                                </button>
                              );
                            }

                            return (
                              <button
                                type="button"
                                className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 transition-all bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                              >
                                <Sparkles size={11} className="text-slate-500 shrink-0" />
                                {assessment ? assessment.replace(/_/g, ' ') : 'Analyzed'}
                              </button>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${def.cls}`}>
                            {def.label}
                          </span>
                        </td>
                        {loggedInUser.role === 'superadmin' && (
                          <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={async () => {
                                const targetId = ch.trackerId || ch.id || ch._id;
                                if (!targetId) return;
                                if (window.confirm(`Are you sure you want to delete challenge ${targetId}?`)) {
                                  try {
                                    await axios.delete(`${API}/api/fda/challenges/${targetId}`, {
                                      headers: { 'user-role': loggedInUser.role || 'superadmin' }
                                    });
                                    setChallenges(prev => prev.filter(item => (item.trackerId || item.id || item._id) !== targetId));
                                    fetchData();
                                  } catch (err) {
                                    alert(err.response?.data?.error || 'Failed to delete challenge.');
                                  }
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                              title="Delete Challenge (Superadmin Only)"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bottom — Workload Overview ── */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-7 shadow-sm">
          <div className="mb-4">
            <h3 className="font-black text-slate-800 uppercase tracking-wide text-xs flex items-center gap-1.5">
              <Users size={13} className="text-slate-500" /> Challenge Ownership — Workload Overview
            </h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Identifies employee ownership loading</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[9px] font-black text-slate-400 uppercase tracking-wider border-b">
                <tr>
                  <th className="pb-3">Employee</th>
                  <th className="pb-3 text-center">Total</th>
                  <th className="pb-3 text-center">Open</th>
                  <th className="pb-3 text-center">Recurring</th>
                </tr>
              </thead>
              <tbody className="divide-y font-bold">
                {workload.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-300 italic uppercase text-xs">
                      No employees assigned to active challenges.
                    </td>
                  </tr>
                ) : (
                  workload.slice(0, 7).map(e => (
                    <tr key={e.name}>
                      <td className="py-3 flex items-center gap-2">
                        <User size={13} className="text-slate-400 shrink-0" /> {e.name}
                      </td>
                      <td className="py-3 text-center text-slate-700">{e.total}</td>
                      <td className="py-3 text-center">
                        <span className={e.open > 0 ? 'text-red-500' : 'text-slate-400'}>{e.open}</span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={e.recurring > 0 ? 'text-orange-500' : 'text-slate-400'}>{e.recurring}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* ── Challenge Detail Modal ── */}
      {viewingChallenge && (
        <ChallengeDetailModal
          challenge={viewingChallenge}
          onClose={() => setViewingChallenge(null)}
          onResolve={handleResolve}
          onOpenVerification={(ch) => setVerifyingChallenge(ch)}
        />
      )}

      {/* AI Resolution Verification Modal */}
      <AIResolutionVerificationModal
        isOpen={!!verifyingChallenge}
        onClose={() => setVerifyingChallenge(null)}
        challenge={verifyingChallenge}
        onVerificationComplete={(updatedCh) => {
          if (updatedCh) {
            setVerifyingChallenge(prev => ({ ...prev, ...updatedCh }));
          }
          fetchData();
        }}
      />
    </div>
  );
};

export default FDADefenceDashboard;
