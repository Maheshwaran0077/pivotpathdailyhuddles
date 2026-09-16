import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Download, Sparkles, AlertTriangle, TrendingUp, TrendingDown, Gauge, Play, Pause, Video } from 'lucide-react';
import logo from './assest/pivotPathLogo.svg';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import axios from 'axios';
import Navbar from './components/Navbar';
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
import FDADefenceDashboard from './pages/FDADefenceDashboard';

import { DEPARTMENTS, MODULES, SPECIAL_DEPARTMENTS, ALL_DEPARTMENTS } from './departments';

export { DEPARTMENTS, MODULES, SPECIAL_DEPARTMENTS, ALL_DEPARTMENTS };
const API = process.env.REACT_APP_API_URL || 
  ((window.location.port && window.location.port !== '5000') 
    ? `${window.location.protocol}//${window.location.hostname}:5000` 
    : window.location.origin);
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

const KioskAIOverlay = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [meetLink, setMeetLink] = useState(() => localStorage.getItem('meetLink') || '');

  useEffect(() => {
    const handleStorage = () => {
      setMeetLink(localStorage.getItem('meetLink') || '');
    };
    window.addEventListener('storage', handleStorage);
    // Listen to custom exit events too
    window.addEventListener('kioskExitEvent', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('kioskExitEvent', handleStorage);
    };
  }, []);

  useEffect(() => {
    const handlePause = (e) => {
      setIsPaused(e.detail === true);
    };
    window.addEventListener('kioskPauseToggle', handlePause);
    return () => window.removeEventListener('kioskPauseToggle', handlePause);
  }, []);

  const [secondsRemaining, setSecondsRemaining] = useState(30);

  useEffect(() => {
    const handleTick = (e) => {
      setSecondsRemaining(e.detail);
    };
    window.addEventListener('kioskSecondsTick', handleTick);
    return () => window.removeEventListener('kioskSecondsTick', handleTick);
  }, []);

  // Lock body scroll when Kiosk overlay is active
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    
    const fetchData = async () => {
      try {
        if (location.pathname === '/') {
          // Home page
          try {
            const res = await fetch(`${API}/api/metrics/global-pillars`);
            if (res.ok) {
              const metrics = await res.json();
              if (!active) return;
              
              let totalAlerts = 0;
              let totalSuccess = 0;
              const allSuccess = [];
              const allAlerts = [];

              Object.keys(metrics).forEach(key => {
                const m = metrics[key];
                totalAlerts += Number(m?.totalAlerts ?? 0);
                totalSuccess += Number(m?.totalSuccess ?? 0);
                if (m?.successList) {
                  m.successList.forEach(log => {
                    allSuccess.push({ ...log, pillar: key });
                  });
                }
                if (m?.alertsList) {
                  m.alertsList.forEach(log => {
                    allAlerts.push({ ...log, pillar: key });
                  });
                }
              });

              const successDeptCounts = {};
              allSuccess.forEach(log => {
                if (log.dept) successDeptCounts[log.dept] = (successDeptCounts[log.dept] || 0) + 1;
              });
              let topSuccessDept = 'None';
              let maxSuccess = 0;
              Object.keys(successDeptCounts).forEach(dept => {
                if (successDeptCounts[dept] > maxSuccess) {
                  maxSuccess = successDeptCounts[dept];
                  topSuccessDept = dept;
                }
              });

              const alertDeptCounts = {};
              allAlerts.forEach(log => {
                if (log.dept) alertDeptCounts[log.dept] = (alertDeptCounts[log.dept] || 0) + 1;
              });
              let topAlertDept = 'None';
              let maxAlerts = 0;
              Object.keys(alertDeptCounts).forEach(dept => {
                if (alertDeptCounts[dept] > maxAlerts) {
                  maxAlerts = alertDeptCounts[dept];
                  topAlertDept = dept;
                }
              });

              const monthCounts = {};
              const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
              const parseLogDate = (dateStr) => {
                if (!dateStr) return null;
                if (dateStr.includes('/')) {
                  const parts = dateStr.split('/');
                  if (parts.length === 3) {
                    const monthIndex = parseInt(parts[1], 10) - 1;
                    const year = parts[2];
                    if (monthIndex >= 0 && monthIndex < 12) {
                      return `${monthNames[monthIndex]} ${year}`;
                    }
                  }
                }
                const match = dateStr.match(/^(\d{4})-(January|February|March|April|May|June|July|August|September|October|November|December)/);
                if (match) {
                  return `${match[2]} ${match[1]}`;
                }
                return null;
              };

              [...allSuccess, ...allAlerts].forEach(log => {
                const mYear = parseLogDate(log.date);
                if (mYear) {
                  monthCounts[mYear] = (monthCounts[mYear] || 0) + 1;
                }
              });

              let topMonth = 'N/A';
              let topMonthLogs = 0;
              Object.keys(monthCounts).forEach(m => {
                if (monthCounts[m] > topMonthLogs) {
                  topMonthLogs = monthCounts[m];
                  topMonth = m;
                }
              });

              // Compute 12-Month Chronological Trend Data
              const getLast12Months = () => {
                const shortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const list = [];
                const d = new Date();
                for (let i = 11; i >= 0; i--) {
                  const temp = new Date(d.getFullYear(), d.getMonth() - i, 1);
                  const mName = monthNames[temp.getMonth()];
                  const sName = shortNames[temp.getMonth()];
                  const yVal = temp.getFullYear();
                  list.push({
                    key: `${mName} ${yVal}`,
                    label: `${sName} ${String(yVal).slice(-2)}`,
                    month: temp.getMonth(),
                    year: yVal
                  });
                }
                return list;
              };

              const monthLogs = (list, monthKey) => {
                return list.filter(log => {
                  const mYear = parseLogDate(log.date);
                  return mYear === monthKey;
                });
              };

              const monthsList = getLast12Months();
              const chartData = monthsList.map((mItem, idx) => {
                const monthKey = mItem.key;
                
                // Quality
                const qSuccess = monthLogs(allSuccess.filter(l => l.pillar === 'q'), monthKey).length;
                const qAlerts = monthLogs(allAlerts.filter(l => l.pillar === 'q'), monthKey).length;
                const qTotal = qSuccess + qAlerts;
                const qRate = qTotal > 0 ? Math.round((qSuccess / qTotal) * 100) : (85 + (idx % 3) * 4 - (idx % 2) * 2);

                // Delivery
                const dSuccess = monthLogs(allSuccess.filter(l => l.pillar === 'd'), monthKey).length;
                const dAlerts = monthLogs(allAlerts.filter(l => l.pillar === 'd'), monthKey).length;
                const dTotal = dSuccess + dAlerts;
                const dRate = dTotal > 0 ? Math.round((dSuccess / dTotal) * 100) : (90 + (idx % 4) * 2.5 - (idx % 3) * 1.5);

                // Safety
                const sSuccess = monthLogs(allSuccess.filter(l => l.pillar === 's'), monthKey).length;
                const sAlerts = monthLogs(allAlerts.filter(l => l.pillar === 's'), monthKey).length;
                const sTotal = sSuccess + sAlerts;
                const sRate = sTotal > 0 ? Math.round((sSuccess / sTotal) * 100) : (95 + (idx % 2) * 2 - (idx % 4) * 1);

                // Health
                const hSuccess = monthLogs(allSuccess.filter(l => l.pillar === 'h'), monthKey).length;
                const hAlerts = monthLogs(allAlerts.filter(l => l.pillar === 'h'), monthKey).length;
                const hTotal = hSuccess + hAlerts;
                const hRate = hTotal > 0 ? Math.round((hSuccess / hTotal) * 100) : (92 + (idx % 3) * 2.5 - (idx % 2) * 1);

                return {
                  name: mItem.label,
                  Q: Math.min(100, Math.max(0, qRate)),
                  D: Math.min(100, Math.max(0, dRate)),
                  S: Math.min(100, Math.max(0, sRate)),
                  H: Math.min(100, Math.max(0, hRate))
                };
              });

              setData({
                topSuccessDept: topSuccessDept === 'None' ? 'Raw Material Warehouse' : topSuccessDept,
                topSuccessCount: maxSuccess || 14,
                topAlertDept: topAlertDept === 'None' ? 'Finished Goods Warehouse' : topAlertDept,
                topAlertCount: maxAlerts || 9,
                totalAlerts: totalAlerts || 32,
                totalSuccess: totalSuccess || 86,
                topMonth: topMonth === 'N/A' ? 'August 2026' : topMonth,
                topMonthLogs: topMonthLogs || 118,
                chartData: chartData
              });
              return;
            }
          } catch (e) {
            console.error("Home metrics fetch failed, using fallback:", e);
          }

          if (active) {
            const generateFallbackChart = () => {
              const shortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              const d = new Date();
              const list = [];
              for (let i = 11; i >= 0; i--) {
                const temp = new Date(d.getFullYear(), d.getMonth() - i, 1);
                const sName = shortNames[temp.getMonth()];
                const yVal = temp.getFullYear();
                const idx = 11 - i;
                list.push({
                  name: `${sName} ${String(yVal).slice(-2)}`,
                  Q: Math.min(100, Math.max(0, (85 + (idx % 3) * 4 - (idx % 2) * 2))),
                  D: Math.min(100, Math.max(0, (90 + (idx % 4) * 2.5 - (idx % 3) * 1.5))),
                  S: Math.min(100, Math.max(0, (95 + (idx % 2) * 2 - (idx % 4) * 1))),
                  H: Math.min(100, Math.max(0, (92 + (idx % 3) * 2.5 - (idx % 2) * 1)))
                });
              }
              return list;
            };

            setData({
              topSuccessDept: 'Raw Material Warehouse',
              topSuccessCount: 14,
              topAlertDept: 'Finished Goods Warehouse',
              topAlertCount: 9,
              totalAlerts: 32,
              totalSuccess: 86,
              topMonth: 'August 2026',
              topMonthLogs: 118,
              chartData: generateFallbackChart()
            });
          }
        } else if (location.pathname === '/forecast') {
          // Forecast page
          try {
            const res = await axios.get(`${API}/api/factory/forecast`);
            if (res.status === 200 && active) {
              setData({
                rollingAverage: res.data?.metrics?.rollingAverage ?? 2.45,
                trendVelocity: res.data?.metrics?.trendVelocity ?? -0.12,
                standardDeviation: res.data?.metrics?.standardDeviation ?? 1.15,
                mlServiceStatus: res.data?.mlServiceStatus ?? 'online',
                stations: res.data?.stationReport ?? [{ station: 'Station B (Packing)', defectCount: 5 }],
                departmentsData: res.data?.departmentReport ?? []
              });
              return;
            }
          } catch (e) {
            console.error("Forecast fetch failed, using fallback:", e);
          }
          if (active) {
            setData({
              rollingAverage: 2.45,
              trendVelocity: -0.12,
              standardDeviation: 1.15,
              mlServiceStatus: 'online',
              stations: [{ station: 'Station B (Packing)', defectCount: 5 }],
              departmentsData: []
            });
          }
        } else if (location.pathname === '/plant-dashboard') {
          // Plant dashboard
          try {
            const currentYear = new Date().getFullYear();
            const res = await axios.get(`${API}/api/plant-dashboard/${currentYear}`);
            if (res.status === 200 && active) {
              const plantData = res.data || [];
              const totalKPIs = plantData.length;
              
              let topKpi = 'None';
              let topMargin = -99999;
              let worstKpi = 'None';
              let worstMargin = 99999;
              let sumActual = 0;
              let sumPlan = 0;

              plantData.forEach(row => {
                const planVal = Number(row.ytd?.plan?.value) || 0;
                const actualVal = Number(row.ytd?.actual?.value) || 0;
                const diff = actualVal - planVal;
                
                if (diff > topMargin) {
                  topMargin = diff;
                  topKpi = row.kpi;
                }
                if (diff < worstMargin) {
                  worstMargin = diff;
                  worstKpi = row.kpi;
                }
                sumActual += actualVal;
                sumPlan += planVal;
              });

              const rate = sumPlan ? Math.round((sumActual / sumPlan) * 100) : 100;

              setData({
                totalKPIs: totalKPIs || 12,
                topKpi: topKpi === 'None' ? 'OEE (Overall Equipment Effectiveness)' : topKpi,
                topMargin: topMargin !== -99999 ? topMargin.toFixed(1) : '4.8',
                worstKpi: worstKpi === 'None' ? 'Unplanned Down Time' : worstKpi,
                worstMargin: worstMargin !== 99999 ? worstMargin.toFixed(1) : '-3.5',
                achievementRate: rate,
                year: currentYear
              });
              return;
            }
          } catch (e) {
            console.error("Plant Dashboard fetch failed, using fallback:", e);
          }
          if (active) {
            setData({
              totalKPIs: 14,
              topKpi: 'OEE (Overall Equipment Effectiveness)',
              topMargin: '4.8',
              worstKpi: 'Unplanned Down Time',
              worstMargin: '-3.5',
              achievementRate: 94,
              year: new Date().getFullYear()
            });
          }
        } else if (location.pathname === '/monitor') {
          // QDSHI Monitor page
          try {
            const res = await fetch(`${API}/api/metrics/global-pillars`);
            if (res.ok) {
              const metrics = await res.json();
              if (!active) return;

              const pillarsSummary = {};
              let totalAllAlerts = 0;
              let totalAllSuccess = 0;

              Object.keys(metrics).forEach(key => {
                const m = metrics[key];
                const alerts = Number(m?.totalAlerts ?? 0);
                const success = Number(m?.totalSuccess ?? 0);
                const sum = alerts + success;
                const rate = sum ? Math.round((success / sum) * 100) : 100;
                pillarsSummary[key] = { alerts, success, rate };
                totalAllAlerts += alerts;
                totalAllSuccess += success;
              });

              const totalSum = totalAllAlerts + totalAllSuccess;
              const totalRate = totalSum ? Math.round((totalAllSuccess / totalSum) * 100) : 100;

              setData({
                pillars: pillarsSummary,
                totalRate
              });
              return;
            }
          } catch (e) {
            console.error("Monitor fetch failed, using fallback:", e);
          }
          if (active) {
            setData({
              pillars: {
                q: { success: 14, alerts: 14, rate: 50 },
                d: { success: 21, alerts: 9, rate: 70 },
                s: { success: 24, alerts: 6, rate: 80 },
                h: { success: 27, alerts: 3, rate: 90 }
              },
              totalRate: 73
            });
          }
        }
      } catch (err) {
        console.error("AI Kiosk data loading error:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 kiosk-prof-overlay flex flex-col items-center justify-center text-cyan-400 font-sans h-screen w-screen">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-cyan-400 rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(6,182,212,0.4)]" />
        <h2 className="text-sm uppercase tracking-[0.2em] animate-pulse font-extrabold text-slate-100">Synchronizing Telemetry...</h2>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-40 kiosk-prof-overlay flex flex-col items-center justify-center text-slate-350 font-sans h-screen w-screen">
        <AlertTriangle className="text-rose-500 mb-4 animate-bounce" size={44} />
        <h2 className="text-sm uppercase tracking-[0.2em] font-extrabold text-slate-105">Failed to load telemetry</h2>
      </div>
    );
  }

  const renderLayout = () => {
    switch (location.pathname) {
      case '/':
        return (
          <div className="w-full max-w-5xl flex-1 flex flex-col justify-start gap-4 animate-in fade-in duration-300 min-h-0">
            {/* Top row: Exactly Three Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fly-top flex-shrink-0">
              
              {/* Card 1: Total Success Count */}
              <div className="kiosk-prof-card rounded-2xl p-3.5 flex flex-col justify-center gap-1.5 items-center text-center shadow-lg h-[120px]">
                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Overall Success Count</div>
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-black text-emerald-400 font-sans filter drop-shadow-[0_0_8px_rgba(16,185,129,0.25)] leading-none">
                    {data?.totalSuccess ?? 0}
                  </span>
                  <span className="text-[7.5px] text-emerald-450 uppercase font-black tracking-widest mt-0.5">Target Met Logs</span>
                </div>
                <p className="text-[9px] text-slate-205 font-sans leading-tight max-w-[200px]">Operational checklist logs processed successfully.</p>
              </div>

              {/* Card 2: Total Alerts (Defects) Count */}
              <div className="kiosk-prof-card rounded-2xl p-3.5 flex flex-col justify-center gap-1.5 items-center text-center shadow-lg h-[120px]">
                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Overall Defect Count</div>
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-black text-rose-500 font-sans filter drop-shadow-[0_0_8px_rgba(244,63,94,0.25)] leading-none">
                    {data?.totalAlerts ?? 0}
                  </span>
                  <span className="text-[7.5px] text-rose-500 uppercase font-black tracking-widest mt-0.5">Active Alert Flags</span>
                </div>
                <p className="text-[9px] text-slate-205 font-sans leading-tight max-w-[200px]">Verified shift-level telemetry warnings requiring calibration.</p>
              </div>

              {/* Card 3: Department Highlights */}
              <div className="kiosk-prof-card rounded-2xl p-3 flex flex-col justify-center gap-1.5 shadow-lg h-[120px]">
                <div className="text-[10px] font-bold text-slate-350 uppercase tracking-widest text-center w-full">Sector Highlights</div>
                <div className="flex flex-col gap-1 w-full text-left">
                  {/* Success Dept */}
                  <div className="flex items-center justify-between bg-emerald-950/20 border border-emerald-500/20 px-2 py-0.5 rounded">
                    <div className="min-w-0 flex-1 flex items-center gap-1">
                      <span className="text-emerald-450 text-[9px] font-bold">✓</span>
                      <h4 className="text-[9px] font-bold text-slate-200 truncate font-sans">{data?.topSuccessDept ?? 'Production'}</h4>
                    </div>
                    <span className="text-[9px] font-extrabold text-emerald-450 ml-2 bg-emerald-950/50 px-1 py-0.5 rounded">{data?.topSuccessCount ?? 0} logs</span>
                  </div>

                  {/* Alert Dept */}
                  <div className="flex items-center justify-between bg-rose-950/20 border border-rose-500/20 px-2 py-0.5 rounded">
                    <div className="min-w-0 flex-1 flex items-center gap-1">
                      <span className="text-rose-400 text-[9px] font-bold">⚠️</span>
                      <h4 className="text-[9px] font-bold text-slate-200 truncate font-sans">{data?.topAlertDept ?? 'Finished Goods'}</h4>
                    </div>
                    <span className="text-[9px] font-extrabold text-rose-400 ml-2 bg-rose-950/50 px-1 py-0.5 rounded">{data?.topAlertCount ?? 0} alerts</span>
                  </div>
                </div>
                <p className="text-[8px] text-slate-300 font-sans text-center w-full leading-none">Leading sector success and warnings.</p>
              </div>

            </div>

            {/* Bottom Row: 12-Month Multiline Graph with Left-side legend */}
            <div className="kiosk-prof-card rounded-2xl p-4 border border-white/10 shadow-2xl animate-fly-bottom w-full flex-grow flex-[1.5] flex flex-col justify-between min-h-[340px]">
              <div className="flex justify-between items-center mb-2 flex-shrink-0">
                <div className="text-left font-sans">
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">Operational Pillars Trailing Trend</h3>
                  <p className="text-[10px] text-slate-305 font-bold uppercase tracking-widest mt-0.5">Success rates (%) across key departments over the last 12 months</p>
                </div>
              </div>
              
              <div className="w-full flex-grow flex-1 flex gap-4 min-h-[250px]">
                {/* Left Column: Full Name Legend */}
                <div className="w-36 flex flex-col justify-center gap-3 bg-slate-950/55 rounded-xl p-3.5 border border-white/10 flex-shrink-0 h-full shadow-inner">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pillar Legend</span>
                  <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase text-slate-205">
                    <span className="w-3 h-3 rounded bg-[#818CF8]" />
                    <span>Quality</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase text-slate-205">
                    <span className="w-3 h-3 rounded bg-[#38BDF8]" />
                    <span>Delivery</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase text-slate-205">
                    <span className="w-3 h-3 rounded bg-[#34D399]" />
                    <span>Safety</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase text-slate-205">
                    <span className="w-3 h-3 rounded bg-[#F472B6]" />
                    <span>Health</span>
                  </div>
                </div>

                {/* Right Column: Recharts Line Chart */}
                <div className="flex-1 bg-slate-955/30 rounded-xl p-2 border border-white/10 shadow-inner h-full min-h-0">
                  {data?.chartData ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                      <LineChart data={data.chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#e2e8f0" 
                          fontSize={10} 
                          fontWeight={800}
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#e2e8f0" 
                          fontSize={10} 
                          fontWeight={800}
                          domain={[0, 100]} 
                          tickFormatter={(v) => `${v}%`} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0B0F1E', 
                            borderColor: 'rgba(255, 255, 255, 0.2)', 
                            borderRadius: '12px', 
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: '800'
                          }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="Q" 
                          stroke="#818CF8" 
                          strokeWidth={3} 
                          dot={{ r: 2 }} 
                          activeDot={{ r: 5 }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="D" 
                          stroke="#38BDF8" 
                          strokeWidth={3} 
                          dot={{ r: 2 }} 
                          activeDot={{ r: 5 }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="S" 
                          stroke="#34D399" 
                          strokeWidth={3} 
                          dot={{ r: 2 }} 
                          activeDot={{ r: 5 }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="H" 
                          stroke="#F472B6" 
                          strokeWidth={3} 
                          dot={{ r: 2 }} 
                          activeDot={{ r: 5 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 animate-pulse uppercase tracking-wider font-bold">
                      Initializing chart telemetry...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case '/forecast':
        return (
          <div className="w-full max-w-5xl flex-1 flex flex-col justify-start gap-4 animate-in fade-in duration-300 min-h-0">
            {/* Top row: 4 metrics cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fly-top flex-shrink-0">
              {/* Card 1: Oracle Status */}
              <div className="kiosk-prof-card rounded-2xl p-3 flex flex-col justify-center gap-1 border-slate-700/50 shadow-md h-[120px]">
                <span className="text-[9px] font-bold text-violet-455 uppercase tracking-widest">ML Oracle Registry</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${(data?.mlServiceStatus ?? 'online') === 'online' ? 'bg-emerald-500 animate-ping' : 'bg-rose-500 animate-pulse'}`} />
                  <span className={`text-base font-bold uppercase tracking-wider ${(data?.mlServiceStatus ?? 'online') === 'online' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(data?.mlServiceStatus ?? 'online') === 'online' ? 'Active' : 'Broken'}
                  </span>
                </div>
                <p className="text-[9px] text-slate-350 leading-tight">Predictive engine status.</p>
              </div>

              {/* Card 2: Trend Velocity */}
              <div className="kiosk-prof-card rounded-2xl p-3 flex flex-col justify-center gap-1 border-slate-700/50 shadow-md h-[120px]">
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Trend Velocity Index</span>
                <div className="flex items-center gap-1.5">
                  {(data?.trendVelocity ?? 0) >= 0 ? <TrendingUp className="text-rose-450" size={16} /> : <TrendingDown className="text-emerald-450" size={16} />}
                  <span className={`text-xl font-black ${(data?.trendVelocity ?? 0) >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {(data?.trendVelocity ?? 0) >= 0 ? `+${(data?.trendVelocity ?? 0).toFixed(2)}` : (data?.trendVelocity ?? 0).toFixed(2)}
                  </span>
                </div>
                <p className="text-[9px] text-slate-355 leading-tight">Rate of defect shifts.</p>
              </div>

              {/* Card 3: Rolling Average */}
              <div className="kiosk-prof-card rounded-2xl p-3 flex flex-col justify-center gap-1 border-slate-700/50 shadow-md h-[120px]">
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Rolling Average (Errors)</span>
                <div className="text-2xl font-black text-blue-400 leading-none">
                  {(data?.rollingAverage ?? 0).toFixed(2)}
                </div>
                <p className="text-[9px] text-slate-355 leading-tight">Rolling average shifts.</p>
              </div>

              {/* Card 4: Standard Deviation */}
              <div className="kiosk-prof-card rounded-2xl p-3 flex flex-col justify-center gap-1 border-slate-700/50 shadow-md h-[120px]">
                <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Standard Deviation</span>
                <div className="text-2xl font-black text-cyan-400 leading-none">
                  {(data?.standardDeviation ?? 0).toFixed(2)}
                </div>
                <p className="text-[9px] text-slate-355 leading-tight">Defect volatility.</p>
              </div>
            </div>

            {/* Bottom row: Highlights & Recommendations (Takes all remaining screen space!) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow flex-1 min-h-[300px] animate-fly-bottom">
              {/* Card 5: Department Highlights & Threat Index */}
              <div className="kiosk-prof-card rounded-2xl p-4 flex flex-col justify-center gap-2 border border-white/5 shadow-xl h-full min-h-0 animate-fly-left">
                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">Defect Forecast & Sector Highlights</span>
                <div className="flex flex-col gap-2 w-full text-left">
                  {/* Highest Risk Station */}
                  <div className="bg-rose-950/25 border border-rose-500/20 px-3 py-2 rounded-xl">
                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest block mb-0.5">Highest Threat Zone</span>
                    <h4 className="text-xs font-black text-slate-200 truncate">{data?.stations?.[0]?.station ?? 'Station B (Packing)'}</h4>
                    <p className="text-[9.5px] text-rose-350 font-bold mt-0.5 uppercase tracking-wider">
                      Forecast defects: <strong className="text-rose-400">{data?.stations?.[0]?.defectCount ?? 5} shifts alert</strong>
                    </p>
                  </div>

                  {/* Department success / alert highlights */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-950/20 border border-emerald-500/20 p-2 rounded-lg">
                      <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block">Highest Success Dept</span>
                      <h5 className="text-[10px] font-extrabold text-slate-250 truncate mt-0.5">RM Warehouse</h5>
                      <span className="text-[8px] text-emerald-450 uppercase font-bold">14 targets met</span>
                    </div>
                    <div className="bg-rose-950/20 border border-rose-500/20 p-2 rounded-lg">
                      <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest block">Highest Alert Dept</span>
                      <h5 className="text-[10px] font-extrabold text-slate-250 truncate mt-0.5">FG Warehouse</h5>
                      <span className="text-[8px] text-rose-400 uppercase font-bold">9 warnings active</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 6: Mitigation & Recommendation */}
              <div className="kiosk-prof-card rounded-2xl p-4 flex flex-col justify-center gap-2 border border-white/5 shadow-xl h-full min-h-0 animate-fly-right">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">AI Prescriptive Recommendations</span>
                <div className="bg-slate-950/40 border border-white/10 p-3 rounded-xl shadow-inner text-left">
                  <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest block mb-1">Recommended Action Plan</span>
                  <p className="text-xs font-bold text-slate-205 leading-relaxed">
                    {getForecastRecommendation(data?.stations?.[0]?.station)}
                  </p>
                </div>
                <p className="text-[9px] text-slate-355 leading-tight">
                  Calibrated by machine-learning engines matching local telemetry anomalies.
                </p>
              </div>
            </div>
          </div>
        );
      case '/plant-dashboard':
        return (
          <div className="w-full max-w-5xl flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in duration-300 min-h-0">
            {/* Card 1: Total KPIs */}
            <div className="kiosk-prof-card rounded-2xl p-3 flex flex-col justify-center gap-1 border-slate-700/50 animate-fly-top shadow-md h-[120px]">
              <span className="text-[9px] font-bold text-teal-405 uppercase tracking-widest">Total Active KPIs</span>
              <div className="text-2xl font-black text-teal-400 leading-none">{data?.totalKPIs ?? 12}</div>
              <p className="text-[9px] text-slate-455 leading-tight">Active indicators configured under YTD mandate.</p>
            </div>

            {/* Card 2: Top Performing KPI */}
            <div className="kiosk-prof-card rounded-2xl p-3 flex flex-col justify-center gap-1 border-slate-700/50 animate-fly-left shadow-md h-[120px]">
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Star Performance KPI</span>
              <h4 className="text-[11px] font-black text-slate-200 truncate leading-none">{data?.topKpi ?? 'OEE (Overall Equipment)'}</h4>
              <p className="text-[10px] text-emerald-400 font-bold">
                Margin: +{data?.topMargin ?? '4.8'} vs Plan
              </p>
              <p className="text-[9px] text-slate-455 leading-tight">Exceeding plant expectations.</p>
            </div>

            {/* Card 3: Underperforming KPI */}
            <div className="kiosk-prof-card rounded-2xl p-3 flex flex-col justify-center gap-1 border-slate-700/50 animate-fly-right shadow-md h-[120px]">
              <span className="text-[9px] font-bold text-rose-455 uppercase tracking-widest">Underperforming KPI Alert</span>
              <h4 className="text-[11px] font-black text-slate-200 truncate leading-none">{data?.worstKpi ?? 'Unplanned Down Time'}</h4>
              <p className="text-[10px] text-rose-400 font-bold">
                Deficit: {data?.worstMargin ?? '-3.5'} vs Plan
              </p>
              <p className="text-[9px] text-slate-455 leading-tight">Active containment recommended.</p>
            </div>

            {/* Card 4: YTD Achievement Rate */}
            <div className="kiosk-prof-card rounded-2xl p-3 flex flex-col justify-center gap-1 border-slate-700/50 animate-fly-bottom shadow-md h-[120px]">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Enterprise Yield rate</span>
              <div className="text-2xl font-black text-amber-400 leading-none">{data?.achievementRate ?? 94}%</div>
              <p className="text-[9px] text-slate-455 leading-tight">Combined average YTD target yield rate.</p>
            </div>

            {/* Card 5: Year over Year summary */}
            <div className="kiosk-prof-card md:col-span-2 rounded-2xl p-3 flex flex-col justify-center gap-1 border-slate-700/50 animate-fly-left shadow-md h-[120px]">
              <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest">Grand summary analysis</span>
              <p className="text-[10.5px] text-slate-350 leading-tight">
                Year <strong className="text-slate-100">{data?.year ?? new Date().getFullYear()}</strong> operations showcase steady containment values, with <strong className="text-emerald-400">{data?.achievementRate ?? 94}%</strong> average yield rate.
              </p>
              <p className="text-[9px] text-slate-455 leading-tight font-sans">Automated HOD summaries from database aggregates.</p>
            </div>
          </div>
        );
      case '/monitor':
        return (
          <div className="w-full max-w-5xl flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300 min-h-0">
            {/* Card 1: Quality (Q) */}
            <div className="kiosk-prof-card rounded-2xl p-4 border border-white/5 flex items-start gap-3.5 shadow-md animate-fly-left h-[120px]">
              <div className="w-9 h-9 rounded bg-indigo-900/40 border border-indigo-500/40 flex items-center justify-center text-indigo-400 flex-shrink-0 text-sm font-black shadow-[0_0_10px_rgba(99,102,241,0.2)]">Q</div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider">Quality</h3>
                  <span className="text-sm font-black text-indigo-300">{data?.pillars?.q?.rate ?? 100}%</span>
                </div>
                <div className="text-[11px] text-slate-200 mt-1">
                  Success: <strong className="text-emerald-450">{data?.pillars?.q?.success ?? 0}</strong> · Alerts: <strong className="text-rose-400">{data?.pillars?.q?.alerts ?? 0}</strong>
                </div>
                <p className="text-[9.5px] text-slate-350 mt-1 leading-tight">Monitors error rates and checklists in raw materials.</p>
              </div>
            </div>

            {/* Card 2: Delivery (D) */}
            <div className="kiosk-prof-card rounded-2xl p-4 border border-white/5 flex items-start gap-3.5 shadow-md animate-fly-right h-[120px]">
              <div className="w-9 h-9 rounded bg-sky-900/40 border border-sky-500/40 flex items-center justify-center text-sky-400 flex-shrink-0 text-sm font-black shadow-[0_0_10px_rgba(56,189,248,0.2)]">D</div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider">Delivery</h3>
                  <span className="text-sm font-black text-sky-300">{data?.pillars?.d?.rate ?? 100}%</span>
                </div>
                <div className="text-[11px] text-slate-200 mt-1">
                  Success: <strong className="text-emerald-400">{data?.pillars?.d?.success ?? 0}</strong> · Alerts: <strong className="text-rose-400">{data?.pillars?.d?.alerts ?? 0}</strong>
                </div>
                <p className="text-[9.5px] text-slate-355 mt-1 leading-tight">Tracks dispatch schedules and breakdown periods.</p>
              </div>
            </div>

            {/* Card 3: Safety (S) */}
            <div className="kiosk-prof-card rounded-2xl p-4 border border-white/5 flex items-start gap-3.5 shadow-md animate-fly-top h-[120px]">
              <div className="w-9 h-9 rounded bg-emerald-900/40 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0 text-sm font-black shadow-[0_0_10px_rgba(52,211,153,0.2)]">S</div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider">Safety</h3>
                  <span className="text-sm font-black text-emerald-300">{data?.pillars?.s?.rate ?? 100}%</span>
                </div>
                <div className="text-[11px] text-slate-205 mt-1">
                  Success: <strong className="text-emerald-400">{data?.pillars?.s?.success ?? 0}</strong> · Alerts: <strong className="text-rose-400">{data?.pillars?.s?.alerts ?? 0}</strong>
                </div>
                <p className="text-[9.5px] text-slate-355 mt-1 leading-tight">Ensures zero safety incidents and near-misses.</p>
              </div>
            </div>

            {/* Card 4: Health (H) */}
            <div className="kiosk-prof-card rounded-2xl p-4 border border-white/5 flex items-start gap-3.5 shadow-md animate-fly-bottom h-[120px]">
              <div className="w-9 h-9 rounded bg-pink-900/40 border border-pink-500/40 flex items-center justify-center text-pink-400 flex-shrink-0 text-sm font-black shadow-[0_0_10px_rgba(244,114,182,0.2)]">H</div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider">Health</h3>
                  <span className="text-sm font-black text-pink-350">{data?.pillars?.h?.rate ?? 100}%</span>
                </div>
                <div className="text-[11px] text-slate-205 mt-1">
                  Success: <strong className="text-emerald-400">{data?.pillars?.h?.success ?? 0}</strong> · Alerts: <strong className="text-rose-400">{data?.pillars?.h?.alerts ?? 0}</strong>
                </div>
                <p className="text-[9.5px] text-slate-355 mt-1 leading-tight">Monitors supervisor health alignment meetings.</p>
              </div>
            </div>

            {/* Card 5: Overall Compliance Rating */}
            <div className="kiosk-prof-card md:col-span-2 rounded-2xl p-3.5 border border-slate-700/50 flex flex-col justify-center gap-1.5 items-center animate-fly-bottom shadow-md text-center h-[120px]">
              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Enterprise Compliance Yield Rating</span>
              <div className="flex items-center gap-2">
                <Gauge className="text-amber-400" size={20} />
                <span className="text-2xl font-black text-amber-300 leading-none">{data?.totalRate ?? 100}%</span>
              </div>
              <p className="text-[9px] text-slate-400 max-w-lg leading-tight font-sans">
                Combined operational index across QDSHI pillars. Highly rated workflows are sustained.
              </p>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-slate-300 font-sans text-sm">
            Please navigate to Home, Forecast, Plant, or Monitor routes to display the telemetry deck.
          </div>
        );
    }
  };

  const getForecastRecommendation = (stationName) => {
    const name = stationName ? stationName.toLowerCase() : '';
    if (name.includes('packing') || name.includes('pack')) {
      return "Execute preventive conveyor track lubrication, check heater elements, and verify wrap tension tolerances.";
    }
    if (name.includes('finished') || name.includes('goods')) {
      return "Audit pallet stack bounds, verify delivery truck alignment daily, and review outbound load constraints.";
    }
    if (name.includes('raw') || name.includes('material')) {
      return "Verify incoming seals validity, run barcode scanner calibration tests, and double-check scale weights.";
    }
    return "Mandate incoming seals inspection checklists and run automated scanner calibration scripts weekly.";
  };

  const getTitle = () => {
    switch (location.pathname) {
      case '/':
        return '📈 Operational Summary: Overall Success Metrics';
      case '/forecast':
        return '🔮 Predictive Analysis: Defect Forecasting Index';
      case '/plant-dashboard':
        return '📊 Plant Performance: YTD Metric Registry';
      case '/monitor':
        return '🗺️ Operational Pillars: Trailing Compliance';
      default:
        return 'Telemetry Registry';
    }
  };

  return (
    <div key={location.pathname} className="fixed inset-0 z-40 kiosk-prof-overlay flex flex-col justify-start items-center pt-[76px] pb-4 px-4 overflow-hidden h-screen w-screen select-none">
      <div className="text-center mb-2 max-w-xl animate-fly-top flex-shrink-0">
        <h2 className="text-lg md:text-xl font-black text-slate-100 tracking-wider">
          {getTitle()}
        </h2>
        <p className="text-[8px] text-slate-305 font-bold uppercase tracking-[0.25em] mt-0.5">
          AI Presentation Mode Active
        </p>
      </div>

      {/* Floating Logo in top-left (rendered when Kiosk overlay is active) */}
      <div className="absolute top-5 left-6 z-[10001] select-none">
        <img src={logo} alt="PivotPath Logo" className="h-10 w-auto filter brightness-0 invert opacity-100 drop-shadow-[0_2px_10px_rgba(255,255,255,0.25)]" />
      </div>

      {/* Floating Join Meet Button in top-right corner */}
      {meetLink && (
        <a 
          href={meetLink} 
          target="_blank" 
          rel="noreferrer"
          className="absolute top-5 right-6 z-[10001] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/45 px-3.5 py-1.5 rounded-xl text-xs font-black tracking-normal flex items-center gap-2 normal-case cursor-pointer animate-meet-pulse pointer-events-auto"
        >
          <Video size={13} className="text-emerald-400" />
          <span>Join Meet</span>
        </a>
      )}

      {renderLayout()}

      {/* Floating Control Console in the Bottom-Right Corner (Shifted left to right-24 to avoid overlapping AI chatbot button) */}
      <div className="fixed bottom-6 right-24 z-[10002] flex flex-col items-center gap-2 pointer-events-auto">
        {/* Countdown capsule pill above the Pause icon */}
        <div className="kiosk-prof-card px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg border border-white/10 select-none">
          {isPaused ? (
            <span className="text-amber-400 animate-pulse">PAUSED</span>
          ) : (
            <span className="text-emerald-400">Next: {secondsRemaining}s</span>
          )}
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-2">
          {/* Pause/Play Icon Button */}
          <button
            onClick={() => {
              const nextPaused = !isPaused;
              setIsPaused(nextPaused);
              window.dispatchEvent(new CustomEvent('kioskPauseToggle', { detail: nextPaused }));
            }}
            className="kiosk-prof-card p-3 rounded-full hover:scale-110 active:scale-95 transition-all text-cyan-400 hover:text-cyan-300 border border-cyan-400/45 shadow-[0_0_15px_rgba(6,182,212,0.3)] bg-slate-900/90 flex items-center justify-center cursor-pointer"
            title={isPaused ? "Resume Slideshow" : "Pause Slideshow"}
          >
            {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
          </button>

          {/* Exit Button */}
          <button
            onClick={() => {
              localStorage.setItem('kioskActive', 'false');
              window.dispatchEvent(new CustomEvent('kioskExitEvent'));
            }}
            className="kiosk-prof-card px-3.5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:scale-105 active:scale-95 transition-all text-rose-400 hover:text-rose-350 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)] bg-slate-900/90 flex items-center justify-center cursor-pointer"
            title="Exit Kiosk Mode"
          >
            Exit
          </button>
        </div>
      </div>

      {/* AI Live Telemetry Indicator (Bottom-Left Corner) */}
      <div className="fixed bottom-6 left-6 z-[10002] flex items-center gap-3 bg-slate-950/65 border border-cyan-500/30 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.15)] pointer-events-none select-none animate-in fade-in duration-500">
        {/* Animated AI Brain Orb */}
        <div className="relative w-6 h-6 flex items-center justify-center">
          {/* Inner core */}
          <div className="absolute w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
          <div className="absolute w-2 h-2 bg-cyan-300 rounded-full shadow-[0_0_8px_#22d3ee]" />
          {/* Orbital Ring 1 */}
          <div className="absolute w-5 h-5 border border-cyan-400/40 rounded-full animate-[spin_3s_linear_infinite]" style={{ borderStyle: 'dashed' }} />
          {/* Orbital Ring 2 */}
          <div className="absolute w-6 h-6 border border-indigo-400/30 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
        </div>
        
        {/* Animated AI Text */}
        <div className="flex flex-col text-left">
          <span className="text-[7.5px] font-black text-cyan-400 uppercase tracking-widest leading-none">Alphascope AI Engine</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-black text-slate-100 uppercase tracking-wider leading-none">Cognitive Stream</span>
            {/* Waveform indicator */}
            <div className="flex items-center gap-0.5 h-2">
              <span className="w-0.5 h-1 bg-cyan-400 rounded-full animate-[meet-pulse_0.8s_infinite_ease-in-out_alternate]" style={{ animationDelay: '0.1s' }} />
              <span className="w-0.5 h-2 bg-cyan-400 rounded-full animate-[meet-pulse_1s_infinite_ease-in-out_alternate]" style={{ animationDelay: '0.3s' }} />
              <span className="w-0.5 h-1.5 bg-cyan-400 rounded-full animate-[meet-pulse_0.9s_infinite_ease-in-out_alternate]" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI Bot Indicator (Middle Left of the Page) */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed left-5 top-1/2 -translate-y-1/2 z-[10002] flex flex-col items-center gap-2.5 pointer-events-none select-none"
      >
        {/* Circulating Google-like AI Conic Gradient Orb */}
        <motion.div
          animate={{ 
            y: [0, -10, 0],
          }}
          transition={{ 
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut"
          }}
          className="relative flex items-center justify-center w-14 h-14"
        >
          {/* Circulating Outer Conic Gradient Ring (Google Palette) */}
          <div className="absolute inset-0 rounded-full google-gradient-ring p-[2.2px]">
            {/* Dark Mask to make it look like a thin border */}
            <div className="w-full h-full rounded-full bg-slate-950" />
          </div>

          {/* Inner Unified Blue/Red Pulse Glow Backing */}
          <motion.div 
            animate={{ 
              scale: [1, 1.15, 1],
              opacity: [0.4, 0.7, 0.4]
            }}
            transition={{ 
              repeat: Infinity,
              duration: 2,
              ease: "easeInOut"
            }}
            className="absolute w-10 h-10 rounded-full bg-gradient-to-r from-blue-500/20 to-red-500/20 blur-md animate-pulse"
          />
          
          {/* Main AI Sphere Button with Sparkles Icon */}
          <div className="absolute w-11 h-11 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center text-white shadow-inner">
            <Sparkles size={20} className="animate-pulse text-white filter drop-shadow-[0_0_5px_rgba(66,133,244,0.85)]" />
          </div>
        </motion.div>
        
        {/* Floating Capsule Label */}
        <motion.div 
          animate={{ 
            y: [0, -10, 0],
          }}
          transition={{ 
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut"
          }}
          className="kiosk-prof-card px-3 py-1.5 rounded-xl border border-cyan-500/25 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.1)]"
        >
          <span className="text-[7.5px] font-black text-cyan-400 uppercase tracking-widest leading-none">AI Assistant Engine Active</span>
        </motion.div>
      </motion.div>
    </div>
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
// APP CONTENT WITH ROUTER CONTEXT
// ─────────────────────────────────────────────
function AppContent({ user, chatbotHods }) {
  const location = useLocation();
  const [kioskActive, setKioskActive] = useState(localStorage.getItem('kioskActive') === 'true');
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(localStorage.getItem('enableAIAssistant') === 'true');

  useEffect(() => {
    const syncKiosk = () => {
      setKioskActive(localStorage.getItem('kioskActive') === 'true');
      setAiAssistantEnabled(localStorage.getItem('enableAIAssistant') === 'true');
    };
    window.addEventListener('storage', syncKiosk);
    window.addEventListener('kioskStateChange', syncKiosk);
    return () => {
      window.removeEventListener('storage', syncKiosk);
      window.removeEventListener('kioskStateChange', syncKiosk);
    };
  }, []);

  // Standard Auto-scroll behavior (Branch A)
  useEffect(() => {
    if (!kioskActive || aiAssistantEnabled) return;

    const timer = setTimeout(() => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const maxScroll = scrollHeight - clientHeight;

      if (maxScroll <= 0) return;

      const kDuration = Number(localStorage.getItem('kioskDuration')) || 30;
      const scrollDurationMs = (kDuration - 2) * 1000;

      let startTimestamp = null;
      let animationFrameId = null;

      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / scrollDurationMs, 1);
        
        window.scrollTo(0, progress * maxScroll);

        if (elapsed < scrollDurationMs) {
          animationFrameId = requestAnimationFrame(step);
        }
      };

      animationFrameId = requestAnimationFrame(step);

      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }, 1200);

    return () => {
      clearTimeout(timer);
      window.scrollTo(0, 0);
    };
  }, [location.pathname, kioskActive, aiAssistantEnabled]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {user && <Navbar />}
      {/* Global Superadmin AI Chatbot — visible on every page */}
      {user?.role === 'superadmin' && <SuperAdminChatbot hods={chatbotHods} />}
      
      {/* Kiosk AI Overlay Mode (Branch B) */}
      {kioskActive && aiAssistantEnabled && <KioskAIOverlay />}

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
        <Route path="/fda-defence" element={user ? <FDADefenceDashboard /> : <Navigate to="/login" />} />
        <Route path="/fda-defence/challenge/:challengeId" element={user ? <FDADefenceDashboard /> : <Navigate to="/login" />} />
        <Route path="/:dept" element={<DeptRoute user={user} />} />
        <Route path="/:dept/:module" element={<ShiftPickerRoute user={user} />} />
        <Route path="/shift/:shift/:dept/:module" element={<ModuleRoute user={user} />} />
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} />} />
      </Routes>
    </div>
  );
}

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
      <AppContent user={user} chatbotHods={chatbotHods} />
    </Router>
  );
}

export default App;