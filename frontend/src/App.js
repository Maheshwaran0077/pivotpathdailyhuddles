import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import Navbar from './components/Navbar';
import CircularTracker from './components/CircularTracker';
import QualityPage from './pages/Quality';
import SafetyPage from './pages/Safety';
import Health from './pages/Health';
import LoginPage from './pages/LoginPage';
import Delivery from './pages/Delivery';
import Idea from './pages/Idea';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import HodDashboard from './pages/HodDashboard';
import EHS from './pages/EHS';
import Engineering from './pages/Engineering';
import HR from './pages/HR';
import QDSHIMonitor from './pages/QDSHIMonitor';
import PlantDashboard from './pages/PlantDashboard';
import PredictiveDashboard from './pages/PredictiveDashboard';
import PivotPathLogo from './assest/pivotPathLogo.svg';
import PivotPathRoadmap from './pages/PivotPathRoadmap';
import SuperAdminChatbot from './components/SuperAdminChatbot';

import { DEPARTMENTS, MODULES, SPECIAL_DEPARTMENTS, ALL_DEPARTMENTS } from './departments';

export { DEPARTMENTS, MODULES, SPECIAL_DEPARTMENTS, ALL_DEPARTMENTS };
const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
const DEPT_BG = {
  emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-200',   // FGMW
  indigo: 'from-indigo-500 to-indigo-700 shadow-indigo-200',     // PMW
  purple: 'from-purple-500 to-purple-700 shadow-purple-200',     // RMW  
  amber: 'from-amber-500 to-amber-700 shadow-amber-200',         // PPP       
  pink: 'from-pink-500 to-pink-700 shadow-pink-200',             // POP
  teal: 'from-teal-500 to-teal-700 shadow-teal-200',             // QCMAD  
  red: 'from-red-500 to-red-700 shadow-red-200',                 // SPP 
  cyan: 'from-cyan-500 to-cyan-700 shadow-cyan-200',             // FAC
  lime: 'from-lime-500 to-lime-700 shadow-lime-200',             // EHS
  sky: 'from-sky-500 to-sky-700 shadow-sky-200',                 // Engineering
  orange: 'from-orange-500 to-orange-700 shadow-orange-200',     // HR
};

const VALID_DEPTS = DEPARTMENTS.map(d => d.key); 
const VALID_MODULES = ['q', 'd', 's', 'h'];
  
// ─────────────────────────────────────────────    
// COMPONENT: CORE QDSH RING CONTAINER (LIVE DATA)
// ─────────────────────────────────────────────
const AgginementRingCard = ({ mod, onSelect, liveMetrics, loading, onViewDetails }) => {
  const { t } = useTranslation();
  // Defensive fallbacks to gracefully handle 0 entries or loading cycles smoothly
  const alertPercent = liveMetrics ? Number(liveMetrics.alertPercent ?? 0) : 0;
  const successPercent = liveMetrics ? Number(liveMetrics.successPercent ?? 0) : 0;
  const totalAlerts = liveMetrics ? Number(liveMetrics.totalAlerts ?? 0) : 0;
  const totalSuccess = liveMetrics ? Number(liveMetrics.totalSuccess ?? 0) : 0;
  const total = totalSuccess + totalAlerts;

  // Circular math for structural SVG ring representation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  const successOffset = circumference * (1 - successPercent / 100);
  const alertOffset = circumference * (1 - alertPercent / 100);

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      onClick={() => onSelect(mod.key)}
      className="cursor-pointer bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-between h-auto gap-4"
    >
      <div className="text-center w-full">
        <h3 className={`text-base font-black uppercase tracking-wider ${total === 0 ? 'text-slate-400' : mod.text}`}>
          {t('modules.' + mod.key)} {t('dashboard.overview')}
        </h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase">{t('dashboard.operationalPillar')}</p>
      </div>

      {/* Circle Metric Display Frame */}
      <div className="relative w-40 h-40 flex items-center justify-center bg-slate-50 rounded-full shadow-inner border border-slate-100">
        {loading ? (
          <div className="absolute text-slate-400 text-xs font-bold uppercase animate-pulse">
            {t('dashboard.calculating')}
          </div>
        ) : (
          <div className="absolute text-center z-10">
            <span className={`text-4xl font-black ${total === 0 ? 'text-slate-400' : mod.text}`}>{mod.letter}</span>
            <div className="text-[10px] font-black text-slate-700 tracking-tighter mt-1 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
              {total === 0 ? (
                <span className="text-slate-400">{t('dashboard.empty')}</span>
              ) : (
                <>
                  <span className="text-emerald-500">{successPercent}%</span> / <span className="text-orange-500">{alertPercent}%</span>
                </>
              )}
            </div>
          </div>
        )}

        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#F1F5F9"
            strokeWidth="10"
            fill="transparent"
          />
          {!loading && total > 0 && (
            <>
              {/* Success Ring */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="#10B981"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={successOffset}
                strokeLinecap="round"
              />
              {/* Alert Ring */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="#F97316"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={alertOffset}
                strokeLinecap="round"
                className="origin-center rotate-180"
              />
            </>
          )}
        </svg>
      </div>

      {/* REAL-TIME COUNTS SUMMARY VIEW */}
      <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3 grid grid-cols-2 gap-2 text-center">
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (totalSuccess > 0) {
              onViewDetails(`${t('modules.' + mod.key)} - ${t('dashboard.successLogs')}`, 'success', liveMetrics?.successList || [], 'emerald');
            }
          }}
          className={`border-r border-slate-200/60 p-1 transition-colors rounded-l-xl ${totalSuccess > 0 ? 'hover:bg-slate-100 cursor-pointer' : ''}`}
        >
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('dashboard.successLogs')}</p>
          <p className={`text-base font-black mt-0.5 ${totalSuccess === 0 ? 'text-slate-400' : 'text-emerald-600'}`}>
            {loading ? '...' : totalSuccess}
          </p>
        </div>
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (totalAlerts > 0) {
              onViewDetails(`${t('modules.' + mod.key)} - ${t('dashboard.alertFlags')}`, 'alert', liveMetrics?.alertsList || [], 'orange');
            }
          }}
          className={`p-1 transition-colors rounded-r-xl ${totalAlerts > 0 ? 'hover:bg-slate-100 cursor-pointer' : ''}`}
        >
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('dashboard.alertFlags')}</p>
          <p className={`text-base font-black mt-0.5 ${totalAlerts === 0 ? 'text-slate-400' : 'text-orange-600'}`}>
            {loading ? '...' : totalAlerts}
          </p>
        </div>
      </div>

      <div className="w-full text-center text-[10px] font-black text-slate-400 bg-slate-50 hover:bg-slate-900 hover:text-white px-4 py-2 rounded-xl uppercase tracking-wider transition-all">
        {t('dashboard.viewDepartments')} →
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
// DASHBOARD (FETCHES LIVE RE-CALCULATED DATA)
// ─────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('overall'); // 'overall' or 'YYYY-MM'
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState('success');
  const [modalData, setModalData] = useState([]);
  const [modalColor, setModalColor] = useState('emerald');

  const handleOpenModal = (title, type, data, color) => {
    setModalTitle(title);
    setModalType(type);
    setModalData(data);
    setModalColor(color);
    setModalOpen(true);
  };

  const currentYear = new Date().getFullYear();
  const months = [
    { label: 'Jan', value: `${currentYear}-01` },
    { label: 'Feb', value: `${currentYear}-02` },
    { label: 'Mar', value: `${currentYear}-03` },
    { label: 'Apr', value: `${currentYear}-04` },
    { label: 'May', value: `${currentYear}-05` },
    { label: 'Jun', value: `${currentYear}-06` },
    { label: 'Jul', value: `${currentYear}-07` },
    { label: 'Aug', value: `${currentYear}-08` },
    { label: 'Sep', value: `${currentYear}-09` },
    { label: 'Oct', value: `${currentYear}-10` },
    { label: 'Nov', value: `${currentYear}-11` },
    { label: 'Dec', value: `${currentYear}-12` }
  ];

  const getSelectedMonthLabel = () => {
    if (selectedMonth === 'overall') return 'Overall (12m)';
    const [, mVal] = selectedMonth.split('-');
    const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${mNames[parseInt(mVal) - 1]} ${currentYear}`;
  };

  useEffect(() => {
    let active = true;
    const fetchLivePillarMetrics = async () => {
      try {
        const url = selectedMonth === 'overall'
          ? `${API}/api/metrics/global-pillars`
          : `${API}/api/metrics/global-pillars?month=${selectedMonth}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP network error status: ${response.status}`);
        }

        const data = await response.json();
        if (active) {
          setMetrics(data);
        }
      } catch (error) {
        console.error("Database connection failed, displaying calculation defaults:", error);
        if (active) {
          setMetrics({
            q: { alertPercent: 50, successPercent: 50, totalAlerts: 14, totalSuccess: 14 },
            d: { alertPercent: 30, successPercent: 70, totalAlerts: 9, totalSuccess: 21 },
            s: { alertPercent: 20, successPercent: 80, totalAlerts: 6, totalSuccess: 24 },
            h: { alertPercent: 10, successPercent: 90, totalAlerts: 3, totalSuccess: 27 },
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    setLoading(true);
    fetchLivePillarMetrics();
    const interval = setInterval(fetchLivePillarMetrics, 10000); // Polling every 10s to reflect dynamic structural shifts
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedMonth]);

  // Calculate overall metrics
  let totalAlerts = 0;
  let totalSuccess = 0;
  if (metrics) {
    Object.keys(metrics).forEach(key => {
      const m = metrics[key];
      totalAlerts += Number(m?.totalAlerts ?? 0);
      totalSuccess += Number(m?.totalSuccess ?? 0);
    });
  }
  const grandTotal = totalSuccess + totalAlerts;
  const overallSuccessPercent = grandTotal ? Math.round((totalSuccess / grandTotal) * 100) : 0;
  const overallAlertPercent = grandTotal ? Math.round((totalAlerts / grandTotal) * 100) : 0;

  const overallRadius = 30;
  const overallCircumference = 2 * Math.PI * overallRadius;
  const overallSuccessOffset = overallCircumference * (1 - overallSuccessPercent / 100);
  const overallAlertOffset = overallCircumference * (1 - overallAlertPercent / 100);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
        <div className="flex-1">
          <h1 className="text-2xl lg:text-4xl font-black text-slate-800 uppercase tracking-tighter">
            {t('dashboard.hubTitle')}
          </h1>
          <p className="text-slate-500 text-xs lg:text-sm font-bold uppercase tracking-widest mt-1">
            {t('dashboard.hubSubtitle')}
          </p>
        </div>

        {/* Overall Yield Circular Diagram with Month Selection Dropdown */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className={`flex flex-col bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm relative w-60 gap-2.5 ${showMonthDropdown ? 'z-50' : 'z-10'}`}
        >
          {/* Top part: Left (Circle) + Right (Counts) */}
          <div className="flex items-center gap-3.5 w-full">
            {/* Left: Overall Yield Circle */}
            <div className="relative w-14 h-14 flex items-center justify-center bg-slate-50 rounded-full shadow-inner border border-slate-100 flex-shrink-0">
              {loading ? (
                <div className="text-[10px] text-slate-400 font-bold uppercase animate-pulse">...</div>
              ) : (
                <span className={`text-sm font-black tracking-tighter ${grandTotal === 0 ? 'text-slate-400' : 'text-slate-800'}`}>
                  {grandTotal === 0 ? '0%' : `${overallSuccessPercent}%`}
                </span>
              )}
              <svg className="w-full h-full transform -rotate-90 absolute top-0 left-0" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r={overallRadius}
                  stroke="#F1F5F9"
                  strokeWidth="7"
                  fill="transparent"
                />
                {!loading && grandTotal > 0 && (
                  <>
                    {/* Success Ring */}
                    <circle
                      cx="40"
                      cy="40"
                      r={overallRadius}
                      stroke="#10B981"
                      strokeWidth="7"
                      fill="transparent"
                      strokeDasharray={overallCircumference}
                      strokeDashoffset={overallSuccessOffset}
                      strokeLinecap="round"
                    />
                    {/* Alert Ring */}
                    <circle
                      cx="40"
                      cy="40"
                      r={overallRadius}
                      stroke="#F97316"
                      strokeWidth="7"
                      fill="transparent"
                      strokeDasharray={overallCircumference}
                      strokeDashoffset={overallAlertOffset}
                      strokeLinecap="round"
                      className="origin-center rotate-180"
                    />
                  </>
                )}
              </svg>
            </div>

            {/* Right: Stats and Title */}
            <div className="flex-1 flex flex-col justify-center">
              <h3 className="text-slate-400 font-black text-[8px] uppercase tracking-[0.2em] mb-0.5">{t('dashboard.overallYield')}</h3>
              <div className="flex flex-col gap-0.5">
                <div 
                  onClick={() => {
                    if (totalSuccess > 0) {
                      const allSuccess = [];
                      if (metrics) {
                        Object.keys(metrics).forEach(key => {
                          if (metrics[key]?.successList) {
                            allSuccess.push(...metrics[key].successList);
                          }
                        });
                      }
                      handleOpenModal('Overall Enterprise - Success Logs', 'success', allSuccess, 'emerald');
                    }
                  }}
                  className={`flex items-center gap-1.5 text-[11px] font-black uppercase ${totalSuccess === 0 ? 'text-slate-400' : 'text-emerald-600 cursor-pointer hover:underline'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${totalSuccess === 0 ? 'bg-slate-300' : 'bg-emerald-500'}`}></span>
                  <span>{loading ? '...' : totalSuccess} {t('dashboard.green')}</span>
                </div>
                <div 
                  onClick={() => {
                    if (totalAlerts > 0) {
                      const allAlerts = [];
                      if (metrics) {
                        Object.keys(metrics).forEach(key => {
                          if (metrics[key]?.alertsList) {
                            allAlerts.push(...metrics[key].alertsList);
                          }
                        });
                      }
                      handleOpenModal('Overall Enterprise - Alert Flags', 'alert', allAlerts, 'orange');
                    }
                  }}
                  className={`flex items-center gap-1.5 text-[11px] font-black uppercase ${totalAlerts === 0 ? 'text-slate-400' : 'text-orange-600 cursor-pointer hover:underline'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${totalAlerts === 0 ? 'bg-slate-300' : 'bg-orange-500'}`}></span>
                  <span>{loading ? '...' : totalAlerts} {t('dashboard.red')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-slate-200/60"></div>

          {/* Bottom part: Month Selection dropdown */}
          <div className="w-full relative">
            <button
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 text-xs font-black uppercase tracking-wider text-slate-700 rounded-lg flex items-center justify-between transition-all"
            >
              <span>{t('dashboard.period')}: {getSelectedMonthLabel()}</span>
              <span className="text-slate-400 text-[8px]">▼</span>
            </button>
            
            {showMonthDropdown && (
              <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white border border-slate-200/80 rounded-xl shadow-xl p-0.5 max-h-48 overflow-y-auto scrollbar-none flex flex-col gap-0.5 animate-scale-up">
                <button
                  onClick={() => {
                    setSelectedMonth('overall');
                    setShowMonthDropdown(false);
                  }}
                  className={`px-2.5 py-1.5 text-xs font-black text-left uppercase tracking-wider rounded-lg transition-all ${
                    selectedMonth === 'overall'
                      ? 'bg-slate-900 text-white'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {t('dashboard.overall12m')}
                </button>
                <div className="h-px bg-slate-100 my-0.5"></div>
                {months.map(m => (
                  <button
                    key={m.value}
                    onClick={() => {
                      setSelectedMonth(m.value);
                      setShowMonthDropdown(false);
                    }}
                    className={`px-2.5 py-1.5 text-xs font-bold text-left uppercase tracking-wider rounded-lg transition-all ${
                      selectedMonth === m.value
                        ? 'bg-emerald-500 text-white'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {m.label} {currentYear}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <div className="hidden md:flex items-center gap-5 bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
          <img src={PivotPathLogo} alt="PivotPath Logo" className="w-20 h-20 object-contain rounded-xl" />
          <div>
            <h3 className="text-slate-900 font-bold text-sm">{t('dashboard.workspace')}</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('dashboard.connectivity')}</p>
          </div>
        </div>
      </div>



      {/* PRIMARY MODULE KPI TRACKERS SECTIONS */}
      <div className="mb-6 ">
        <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] text-slate-400 block mb-5">
          {t('dashboard.corePillars')}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {MODULES.map((mod) => (
            <AgginementRingCard
              key={mod.key}
              mod={mod}
              liveMetrics={metrics ? metrics[mod.key] : null}
              loading={loading}
              onSelect={(moduleKey) => navigate(`/portal/pillar/${moduleKey}`)}
              onViewDetails={handleOpenModal}
            />
          ))}
        </div>
      </div>

      {/* Alternate Global Ideation Actions Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
        <motion.div
          whileHover={{ y: -4 }}
          onClick={() => navigate('/i')}
          className="md:col-span-2 cursor-pointer bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden group shadow-lg"
        >
          <div className="relative z-10">
            <span className="px-3 py-1 bg-emerald-500 text-[9px] font-bold uppercase tracking-widest rounded-md">Continuous Improvement</span>
            <h2 className="text-xl lg:text-2xl font-black mt-3 uppercase tracking-tight">Ideation Platform Portal</h2>
            <p className="text-slate-400 text-xs mt-1 max-w-md">Submit process optimizations directly to respective department division heads.</p>
          </div>
        </motion.div>

        <div className="bg-gradient-to-r from-slate-100 to-slate-200 border border-slate-300/40 rounded-3xl p-6 flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Assigned Security Clearance</span>
          <span className="text-sm font-black text-slate-700 uppercase">Enterprise Standard User Profile</span>
        </div>

      </div>
      {/* <div className="mb-8">
        <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] text-slate-400 block mb-3 mt-3">
          Special Departments
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SPECIAL_DEPARTMENTS.map((dept) => (
            <button key={dept.key} onClick={() => navigate(dept.path || `/${dept.key}`)}
              className={`w-full inline-flex items-center gap-3 px-4 py-4 rounded-3xl ${DEPT_BG[dept.color] || 'from-slate-600 to-slate-800'} bg-gradient-to-br text-white font-black text-sm uppercase tracking-wider shadow-sm justify-start`}
            >
              <span className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-sm">{dept.short}</span>
              <div className="text-left">
                <p className="text-sm font-black leading-tight">{dept.name}</p>
                <p className="text-[11px] text-white/80">Open department page</p>
              </div>
            </button>
          ))}
        </div>
      </div> */}

      {/* Modal Detail Drilldown Table */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-scale-up">
            {/* Header */}
            <div className={`p-6 text-white bg-gradient-to-r ${modalColor === 'emerald' ? 'from-emerald-500 to-teal-600' : 'from-orange-500 to-red-600'} flex items-center justify-between`}>
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider">{modalTitle}</h2>
                <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest mt-0.5">
                  Total Records Found: {modalData.length}
                </p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center font-black transition-all text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Table Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {modalData.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-bold uppercase text-xs">
                  No entries found for this category
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-inner">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                        <th className="p-4">Department</th>
                        <th className="p-4 text-center">Shift</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Remarks / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {modalData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{row.dept}</td>
                          <td className="p-4 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[9px] font-black uppercase">
                              S{row.shift}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500 whitespace-nowrap">{row.date}</td>
                          <td className="p-4 text-slate-600 max-w-sm truncate md:max-w-none md:whitespace-normal">
                            {row.detail}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  const headers = ['Department', 'Shift', 'Date', 'Remarks / Details'];
                  const rows = modalData.map(row => [row.dept, `Shift ${row.shift}`, row.date, row.detail]);
                  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                  a.download = `${modalTitle.replace(/\s+/g, '_')}_Data.csv`;
                  a.click();
                }}
                className="px-6 py-2 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-emerald-750 transition-colors flex items-center gap-1.5"
              >
                <Download size={13} /> Download (CSV)
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-slate-800 transition-colors"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

// ─────────────────────────────────────────────
// NEW PILLAR SPECIFIC DEPARTMENT ROUTING VIEW
// ─────────────────────────────────────────────
const PillarDepartmentsPage = () => {
  const { module } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const currentModule = MODULES.find(m => m.key === module) || { label: module?.toUpperCase(), text: 'text-slate-700' };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-200">
          <div>
            <button
              onClick={() => navigate('/')}
              className="text-xs font-bold text-slate-400 hover:text-slate-900 mb-2 transition-colors block"
            >
              ← {t('dashboard.returnDashboard', 'Return Dashboard Focus')}
            </button>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-800 uppercase flex items-center gap-2">
              <span className={`${currentModule.text}`}>{t('modules.' + currentModule.key, currentModule.label)}</span> {t('dashboard.departmentsMatrix', 'Departments Matrix')}
            </h1>
          </div>
          <span className="px-4 py-2 bg-slate-100 rounded-xl text-slate-500 text-xs font-bold uppercase tracking-wider">
            {t('dashboard.scopeSubSectors', 'Scope: Active Sub-Sectors')}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {DEPARTMENTS.map((dept, idx) => (
            <motion.div
              key={dept.key}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={{ y: -6 }}
              onClick={() => navigate(`/${dept.key}/${module}`)}
              className={`cursor-pointer bg-gradient-to-br ${DEPT_BG[dept.color] || 'from-slate-600 to-slate-800'} rounded-3xl p-5 text-white shadow-md flex flex-col justify-between h-40 group relative overflow-hidden`}
            >
              <div className="relative z-10">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-3 text-xs font-black">
                  {dept.short}
                </div>
                <h2 className="text-sm lg:text-base font-black leading-tight uppercase tracking-tight line-clamp-2">
                  {t('departments.' + dept.key, dept.name)}
                </h2>
              </div>

              <div className="flex items-center justify-between relative z-10">
                <span className="text-[9px] font-bold uppercase tracking-wider bg-black/10 px-2 py-1 rounded-md">{t('dashboard.openTracker', 'Open Tracker')}</span>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs group-hover:translate-x-1 transition-transform">→</div>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-8 -mt-8" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// REMAINING INTERMEDIARY SYSTEM ROUTES
// ─────────────────────────────────────────────
const DeptRoute = ({ user }) => {
  const { dept } = useParams();
  if (!user) return <Navigate to="/login" />;
  if (!VALID_DEPTS.includes(dept)) return <Navigate to="/" />;
  return <Navigate to={`/${dept}/q`} />;
};

const ShiftPickerRoute = ({ user }) => {
  const { dept, module } = useParams();
  if (!user) return <Navigate to="/login" />;
  if (!VALID_DEPTS.includes(dept) || !VALID_MODULES.includes(module)) return <Navigate to="/" />;
  return <Navigate to={`/shift/overall/${dept}/${module}`} replace />;
};

const ModuleRoute = ({ user }) => {
  const { shift, dept, module } = useParams();
  if (!user) return <Navigate to="/login" />;
  if (!['1', '2', '3', 'overall'].includes(shift) || !VALID_DEPTS.includes(dept) || !VALID_MODULES.includes(module)) {
    return <Navigate to="/" />;
  }
  if (module === 'q') return <QualityPage />;
  if (module === 'd') return <Delivery />;
  if (module === 's') return <SafetyPage />;
  if (module === 'h') return <Health />;
  return <Navigate to="/" />;
};

// ─────────────────────────────────────────────
// CENTRAL ENTRY APPLICATION
// ─────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('userInfo')));
  const [chatbotHods, setChatbotHods] = useState([]);

  useEffect(() => {
    const sync = () => setUser(JSON.parse(localStorage.getItem('userInfo')));
    window.addEventListener('storage', sync);
    window.addEventListener('loginStateChange', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('loginStateChange', sync);
    };
  }, []);

  // Fetch HODs for the global superadmin chatbot
  useEffect(() => {
    if (user?.role === 'superadmin') {
      axios.get(`${API}/api/users/all/hod`)
        .then((res) => setChatbotHods(res.data || []))
        .catch(() => {});
    } else {
      setChatbotHods([]);
    }
  }, [user]);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
        {user && <Navbar />}
        {/* Global Superadmin AI Chatbot — visible on every page */}
        {user?.role === 'superadmin' && <SuperAdminChatbot hods={chatbotHods} />}
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/" element={!user ? <Navigate to="/login" /> : <Dashboard />} />
          <Route path="/portal/pillar/:module" element={user ? <PillarDepartmentsPage /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user?.role === 'superadmin' ? <SuperAdminDashboard /> : <Navigate to="/" />} />
          <Route path="/hod-dashboard" element={user?.role === 'hod' ? <HodDashboard /> : <Navigate to="/" />} />
          <Route path="/i" element={user ? <Idea /> : <Navigate to="/login" />} />
          <Route path="/ehs" element={user ? <EHS /> : <Navigate to="/login" />} />
          <Route path="/engineering" element={user ? <Engineering /> : <Navigate to="/login" />} />
          <Route path="/hr" element={user ? <HR /> : <Navigate to="/login" />} />
          <Route path="/monitor" element={user ? <QDSHIMonitor /> : <Navigate to="/login" />} />
          <Route path="/plant-dashboard" element={user ? <PlantDashboard /> : <Navigate to="/login" />} />
          <Route path="/forecast" element={user ? <PredictiveDashboard /> : <Navigate to="/login" />} />
          <Route path="/track" element={user ? <PivotPathRoadmap /> : <Navigate to="/login" />} />
          <Route path="/:dept" element={<DeptRoute user={user} />} />
          <Route path="/:dept/:module" element={<ShiftPickerRoute user={user} />} />
          <Route path="/shift/:shift/:dept/:module" element={<ModuleRoute user={user} />} />
          <Route path="*" element={<Navigate to={user ? '/' : '/login'} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;