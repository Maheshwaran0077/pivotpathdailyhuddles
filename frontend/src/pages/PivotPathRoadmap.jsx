import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitFork, ArrowLeft, Search, User, Shield, Info, Edit3, CheckCircle,
  AlertTriangle, RefreshCw, Layers, Sparkles
} from 'lucide-react';
import PivotPathLogo from '../assest/pivotPathLogo.svg';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);

const DEPT_NAMES = {
  fgmw: 'Finished Good Material Warehouse',
  pmw: 'Packing Material Warehouse',
  rmw: 'Raw Material Warehouse',
  ppp: 'Primary Packing Production',
  pop: 'Post Production',
  qcmad: 'QC & Microbiology & AD Lab',
  pro: 'Production',
  spp: 'Secondary Packing Production',
  fac: 'Facilities'
};

const DEPT_SHORTS = {
  fgmw: 'FGMW', pmw: 'PMW', rmw: 'RMW', ppp: 'PPP', pop: 'POP',
  qcmad: 'QCMAD', pro: 'PRO', spp: 'SPP', fac: 'FAC'
};

export default function PivotPathRoadmap() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // States
  const [metrics, setMetrics] = useState([]);
  const [hods, setHods] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNode, setHoveredNode] = useState(null);

  // Tree expansion state - maps nodeId (string) to boolean
  // Always keep root and pillars expanded by default
  const [expanded, setExpanded] = useState({
    'root': true,
    'pillar-q': true,
    'pillar-d': false,
    'pillar-s': false,
    'pillar-h': false,
  });

  // Intervention notes editing
  const [editingSupervisor, setEditingSupervisor] = useState(null);
  const [interventionNoteInput, setInterventionNoteInput] = useState('');
  const [savedNotes, setSavedNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pivotpath_supervisor_notes')) || {};
    } catch { return {}; }
  });

  // Track coordinates for SVG drawing
  const [lines, setLines] = useState([]);
  const [domTrigger, setDomTrigger] = useState(0);

  // Load backend data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Metrics
      const mRes = await fetch(`${API}/api/metrics`);
      const metricsData = mRes.ok ? await mRes.json() : [];
      setMetrics(metricsData);

      // 2. Fetch HODs
      const hRes = await fetch(`${API}/api/users/all/hod`);
      const hodsData = hRes.ok ? await hRes.json() : [];
      setHods(hodsData);

      // 3. Fetch Supervisors
      const sRes = await fetch(`${API}/api/users/all/supervisor`);
      const supsData = sRes.ok ? await sRes.json() : [];
      setSupervisors(supsData);

      // 4. Fetch Health Records
      const healthRes = await fetch(`${API}/api/health/all`);
      const healthDocs = healthRes.ok ? await healthRes.json() : [];
      setHealthRecords(healthDocs);
    } catch (err) {
      console.error("Error loading roadmap data:", err);
      setHods([]);
      setSupervisors([]);
      setHealthRecords([]);
    } finally {
      setLoading(false);
      triggerLayoutUpdate();
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update layout when expansion changes
  const toggleExpand = (nodeId) => {
    setExpanded(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
    triggerLayoutUpdate();
  };

  const triggerLayoutUpdate = () => {
    setDomTrigger(prev => prev + 1);
  };

  // Listen to window resizes and DOM rendering
  useEffect(() => {
    const handleResize = () => {
      triggerLayoutUpdate();
    };
    window.addEventListener('resize', handleResize);
    // Extra triggers to ensure layout calculation after DOM updates
    const timers = [
      setTimeout(handleResize, 100),
      setTimeout(handleResize, 300),
      setTimeout(handleResize, 600),
    ];
    return () => {
      window.removeEventListener('resize', handleResize);
      timers.forEach(t => clearTimeout(t));
    };
  }, [expanded, domTrigger]);

  // Recalculate connection lines coordinates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const computedLines = [];

    // Helper to get element coordinates relative to canvas
    const getElCoords = (id, anchor) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: (rect.left + rect.width / 2) - canvasRect.left,
        y: anchor === 'bottom' ? (rect.bottom - canvasRect.top) : (rect.top - canvasRect.top)
      };
    };

    // 1. Root to Pillars
    const rootCoords = getElCoords('node-root', 'bottom');
    if (rootCoords) {
      ['q', 'd', 's', 'h'].forEach(p => {
        const pillarCoords = getElCoords(`node-pillar-${p}`, 'top');
        if (pillarCoords) {
          const status = getPillarStatus(p);
          computedLines.push({
            from: rootCoords,
            to: pillarCoords,
            status,
            id: `line-root-to-${p}`
          });
        }
      });
    }

    // 2. Pillars to Departments
    ['q', 'd', 's', 'h'].forEach(p => {
      if (expanded[`pillar-${p}`]) {
        const pCoords = getElCoords(`node-pillar-${p}`, 'bottom');
        if (pCoords) {
          Object.keys(DEPT_NAMES).forEach(deptKey => {
            const deptCoords = getElCoords(`node-dept-${deptKey}`, 'top');
            if (deptCoords) {
              const status = getDeptStatus(p, deptKey);
              computedLines.push({
                from: pCoords,
                to: deptCoords,
                status,
                id: `line-${p}-to-${deptKey}`
              });
            }
          });
        }
      }
    });

    // 3. Departments to HODs
    Object.keys(DEPT_NAMES).forEach(deptKey => {
      const nodeDeptId = `node-dept-${deptKey}`;
      if (expanded[nodeDeptId]) {
        const deptCoords = getElCoords(nodeDeptId, 'bottom');
        const hodCoords = getElCoords(`node-hod-${deptKey}`, 'top');
        if (deptCoords && hodCoords) {
          const activePillars = ['q', 'd', 's', 'h'].filter(p => expanded[`pillar-${p}`]);
          const pillarsToEvaluate = activePillars.length > 0 ? activePillars : ['q', 'd', 's', 'h'];
          const isRed = pillarsToEvaluate.some(p => getDeptStatus(p, deptKey) === 'red');
          const status = isRed ? 'red' : 'green';

          computedLines.push({
            from: deptCoords,
            to: hodCoords,
            status,
            id: `line-dept-${deptKey}-to-hod`
          });
        }
      }
    });

    // 4. HODs to Supervisors
    Object.keys(DEPT_NAMES).forEach(deptKey => {
      const nodeHodId = `node-hod-${deptKey}`;
      if (expanded[nodeHodId]) {
        const hodCoords = getElCoords(nodeHodId, 'bottom');
        const filteredSups = getSupervisorsForDeptAndPillar(deptKey, null);
        filteredSups.forEach((sup, idx) => {
          const supCoords = getElCoords(`node-sup-${deptKey}-${idx}`, 'top');
          if (hodCoords && supCoords) {
            const status = getSupervisorStatus(sup, deptKey);
            computedLines.push({
              from: hodCoords,
              to: supCoords,
              status,
              id: `line-hod-${deptKey}-to-sup-${idx}`
            });
          }
        });
      }
    });

    setLines(computedLines);
  }, [expanded, domTrigger, metrics, hods, supervisors]);

  const isLineRelated = (lineId, hovered) => {
    if (!hovered) return true;
    
    if (hovered === 'root') {
      return lineId.startsWith('line-root-to-');
    }
    
    if (hovered.startsWith('pillar-')) {
      const p = hovered.split('-')[1];
      return lineId === `line-root-to-${p}` || lineId.startsWith(`line-${p}-to-`);
    }
    
    if (hovered.startsWith('dept-')) {
      const dept = hovered.substring(5);
      return lineId.endsWith(`-to-${dept}`) || lineId.includes(`dept-${dept}-to-`) || lineId.includes(`hod-${dept}-to-`);
    }
    
    if (hovered.startsWith('hod-')) {
      const dept = hovered.substring(4);
      return lineId.endsWith(`-to-${dept}`) || lineId === `line-dept-${dept}-to-hod` || lineId.startsWith(`line-hod-${dept}-to-`);
    }
    
    if (hovered.startsWith('sup-')) {
      const parts = hovered.split('-');
      const dept = parts[1];
      const idx = parts[2];
      return lineId.endsWith(`-to-${dept}`) || lineId === `line-dept-${dept}-to-hod` || lineId === `line-hod-${dept}-to-sup-${idx}`;
    }
    
    return false;
  };

  const isNodeRelated = (nodeType, key, hovered) => {
    if (!hovered) return true;
    if (hovered === 'root') return true;
    
    if (hovered.startsWith('pillar-')) {
      const p = hovered.split('-')[1];
      return nodeType === 'root' || (nodeType === 'pillar' && key === p);
    }
    
    if (hovered.startsWith('dept-')) {
      const dept = hovered.substring(5);
      return nodeType === 'root' || nodeType === 'pillar' || (nodeType === 'dept' && key === dept) || (nodeType === 'hod' && key === dept) || (nodeType === 'sup' && key === dept);
    }
    
    if (hovered.startsWith('hod-')) {
      const dept = hovered.substring(4);
      return nodeType === 'root' || nodeType === 'pillar' || (nodeType === 'dept' && key === dept) || (nodeType === 'hod' && key === dept) || (nodeType === 'sup' && key === dept);
    }
    
    if (hovered.startsWith('sup-')) {
      const parts = hovered.split('-');
      const dept = parts[1];
      return nodeType === 'root' || nodeType === 'pillar' || (nodeType === 'dept' && key === dept) || (nodeType === 'hod' && key === dept) || (nodeType === 'sup' && key === dept);
    }
    
    return false;
  };

  // Operational status logic helpers
  const getPillarStatus = (pillarKey) => {
    // Aggregated status: Red if any underlying department has Red status, else Green
    const isRed = Object.keys(DEPT_NAMES).some(deptKey => getDeptStatus(pillarKey, deptKey) === 'red');
    return isRed ? 'red' : 'green';
  };

  const getDeptStatus = (pillarKey, deptKey) => {
    if (pillarKey === 'h') {
      const matches = healthRecords.filter(doc => doc.dept?.toLowerCase() === deptKey?.toLowerCase());
      let healthErrors = 0;
      matches.forEach(doc => {
        (doc.days || []).forEach(day => {
          if (day.status === 'no-meeting') healthErrors++;
        });
      });
      return healthErrors > 0 ? 'red' : 'green';
    }

    // Find metric for this pillar and department
    const m = metrics.find(item => item.letter?.toLowerCase() === pillarKey && item.dept === deptKey);
    if (!m) return 'green'; // Stable by default if no data exists

    // Calculate total alerts across all shifts using the exact getShiftCounts logic of the backend
    let alerts = 0;
    if (m.shifts) {
      Object.keys(m.shifts).forEach(shift => {
        const sd = m.shifts[shift] || {};
        const logs = Array.isArray(sd.issueLogs) ? sd.issueLogs : [];
        if (!logs.length) {
          alerts += sd.alerts ?? 0;
        } else {
          logs.forEach(l => {
            if (pillarKey === 'q') {
              if (l.reason !== 'Target Met') alerts++;
            } else if (pillarKey === 's') {
              if ((Number(l.numSafetyIncidents) || 0) > 0) alerts++;
            } else if (pillarKey === 'd') {
              const planned = Number(l.planned) || 0;
              const dispatched = Number(l.dispatched) || 0;
              const breakdowns = Number(l.breakdowns) || 0;
              const efficiency = planned ? (dispatched / planned) * 100 : 0;
              const isSuccess = efficiency >= 90 && breakdowns === 0;
              if (!isSuccess) alerts++;
            } else {
              // Other pillars
              alerts += sd.alerts ?? 0;
            }
          });
        }
      });
    }
    return alerts > 0 ? 'red' : 'green';
  };

  const getHODForDept = (deptKey) => {
    // HODs might have "department" field with comma-separated values
    const match = hods.find(h => {
      const depts = (h.department || '').toLowerCase().split(',').map(d => d.trim());
      return depts.includes(deptKey) || depts.includes('all');
    });
    return match || null;
  };

  const getSupervisorsForDeptAndPillar = (deptKey, pillarKey) => {
    // Return supervisors who supervise this department
    const matches = supervisors.filter(s => {
      const depts = (s.department || '').toLowerCase().split(',').map(d => d.trim());
      return depts.includes(deptKey) || depts.includes('all');
    });

    // Sort so shift 1, 2, 3 is sequential
    const sorted = [...matches].sort((a, b) => String(a.shift).localeCompare(String(b.shift)));

    // Filter if search query matches supervisor name or email
    if (searchQuery.trim()) {
      return sorted.filter(s =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return sorted;
  };

  const getSupervisorMetrics = (supName, shiftVal, deptKey, pillarKey) => {
    let totalErrors = 0;
    let high = 0, med = 0, low = 0;

    // Handle Health pillar
    if (pillarKey === 'h') {
      let shiftsToCheck = String(shiftVal || 'NONE').split(',').map(s => s.trim()).filter(Boolean);
      if (shiftsToCheck.length === 0 || shiftsToCheck.includes('NONE')) {
        shiftsToCheck = ['1', '2', '3'];
      }

      const matches = healthRecords.filter(doc => 
        doc.dept?.toLowerCase() === deptKey?.toLowerCase() &&
        shiftsToCheck.includes(String(doc.shift))
      );

      matches.forEach(doc => {
        (doc.days || []).forEach(day => {
          if (day.status === 'no-meeting') {
            totalErrors++;
          }
        });
      });

      return { totalErrors, breakdown: { high: 0, med: totalErrors, low: 0 } };
    }

    // Find metric for this pillar and department
    const m = metrics.find(item => item.letter?.toLowerCase() === pillarKey && item.dept === deptKey);
    if (!m || !m.shifts) return { totalErrors, breakdown: { high, med, low } };

    // Determine shifts to check: check assigned shift or fallback to all shifts if NONE/empty
    let shiftsToCheck = String(shiftVal || 'NONE').split(',').map(s => s.trim()).filter(Boolean);
    if (shiftsToCheck.length === 0 || shiftsToCheck.includes('NONE')) {
      shiftsToCheck = ['1', '2', '3'];
    }

    shiftsToCheck.forEach(shift => {
      const sd = m.shifts[shift];
      if (sd) {
        const logs = sd.issueLogs || [];
        if (!logs.length) {
          totalErrors += sd.alerts || 0;
        } else {
          totalErrors += logs.filter(l => {
            if (pillarKey === 'q') return l.reason !== 'Target Met';
            if (pillarKey === 's') return (Number(l.numSafetyIncidents) || 0) > 0;
            if (pillarKey === 'd') {
              const planned = Number(l.planned) || 0;
              const dispatched = Number(l.dispatched) || 0;
              const breakdowns = Number(l.breakdowns) || 0;
              const efficiency = planned ? (dispatched / planned) * 100 : 0;
              return efficiency < 90 || breakdowns > 0;
            }
            return true;
          }).length;
        }

        logs.forEach(log => {
          const sev = (log.severity || 'medium').toLowerCase();
          if (sev === 'high') high++;
          else if (sev === 'medium') med++;
          else low++;
        });
      }
    });

    return { totalErrors, breakdown: { high, med, low } };
  };

  const getSupervisorStatus = (sup, deptKey) => {
    const activePillars = ['q', 'd', 's', 'h'].filter(p => expanded[`pillar-${p}`]);
    const pillarsToEvaluate = activePillars.length > 0 ? activePillars : ['q', 'd', 's', 'h'];
    let totalErrors = 0;
    pillarsToEvaluate.forEach(p => {
      const { totalErrors: e } = getSupervisorMetrics(sup.name, sup.shift, deptKey, p);
      totalErrors += e;
    });
    return totalErrors > 0 ? 'red' : 'green';
  };

  // Intervention note persist handlers
  const handleEditNote = (sup, deptKey) => {
    const key = `${sup.name}-${deptKey}-overall`;
    const currentNote = savedNotes[key] || sup.interventionNotes || 'Operational Intervention: Monitor compliance standard guidelines.';
    setEditingSupervisor({ supervisor: sup, deptKey, key });
    setInterventionNoteInput(currentNote);
  };

  const handleSaveNote = () => {
    if (!editingSupervisor) return;
    const updatedNotes = {
      ...savedNotes,
      [editingSupervisor.key]: interventionNoteInput
    };
    setSavedNotes(updatedNotes);
    localStorage.setItem('pivotpath_supervisor_notes', JSON.stringify(updatedNotes));
    setEditingSupervisor(null);
    triggerLayoutUpdate();
  };

  // Count aggregates for top info bar
  const countAggregates = () => {
    let totalPillars = 4;
    let redPillars = ['q', 'd', 's', 'h'].filter(p => getPillarStatus(p) === 'red').length;
    let greenPillars = totalPillars - redPillars;

    let totalDepts = Object.keys(DEPT_NAMES).length * 4;
    let redDepts = 0;
    ['q', 'd', 's', 'h'].forEach(p => {
      Object.keys(DEPT_NAMES).forEach(d => {
        if (getDeptStatus(p, d) === 'red') redDepts++;
      });
    });
    let greenDepts = totalDepts - redDepts;

    return { redPillars, greenPillars, redDepts, greenDepts };
  };

  const stats = countAggregates();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">

      {/* Header section with styling inspired by modern light-mode monitoring consoles */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 bg-slate-100 hover:bg-slate-200 hover:text-slate-850 rounded-xl transition border border-slate-200"
            title="Go back to Dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <h1 className="text-lg font-black tracking-wider uppercase bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 bg-clip-text text-transparent">
                PivotPath Tracking System
              </h1>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Real-time Operational Escalation Flow
            </p>
          </div>
        </div>

        {/* Global Summary Badge Counters */}
        <div className="flex items-center gap-4 bg-white px-4 py-2 border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex flex-col text-center">
            <span className="text-[8px] font-black tracking-widest text-slate-455 uppercase">Pillars Status</span>
            <div className="flex items-center gap-1.5 mt-0.5 justify-center">
              <span className="text-emerald-600 font-extrabold text-xs">{stats.greenPillars} G</span>
              <span className="text-slate-350">/</span>
              <span className="text-rose-650 font-extrabold text-xs">{stats.redPillars} R</span>
            </div>
          </div>
          <div className="w-px h-6 bg-slate-200"></div>
          <div className="flex flex-col text-center">
            <span className="text-[8px] font-black tracking-widest text-slate-455 uppercase">Sector Yields</span>
            <div className="flex items-center gap-1.5 mt-0.5 justify-center">
              <span className="text-emerald-600 font-extrabold text-xs">{stats.greenDepts} Stable</span>
              <span className="text-slate-350">/</span>
              <span className="text-rose-650 font-extrabold text-xs">{stats.redDepts} Alerts</span>
            </div>
          </div>
        </div>

        {/* Interactive Search Bar to find supervisors directly */}
        <div className="relative w-full max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-455 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Search Supervisor / Leads..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              triggerLayoutUpdate();
            }}
            className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800 rounded-xl pl-9 pr-4 py-2 outline-none transition placeholder-slate-400 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); triggerLayoutUpdate(); }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* Main Roadmap Tree Canvas */}
      <main className="flex-1 relative overflow-auto p-8 select-none" style={{ minHeight: 'calc(100vh - 75px)' }}>

        {/* Dynamic Glowing Connection Lines Overlay Canvas */}
        <div ref={canvasRef} className="absolute inset-0 pointer-events-none z-0">
          <svg className="w-full h-full" style={{ minWidth: '2800px', minHeight: '1800px' }}>
            <defs>
              <linearGradient id="grad-green" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="grad-red" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.8" />
              </linearGradient>
              <filter id="glow-red" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f43f5e" floodOpacity="0.35" />
              </filter>
              <filter id="glow-green" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.35" />
              </filter>
            </defs>

            {lines.map((line) => {
              const dy = Math.abs(line.to.y - line.from.y);
              // Draw organic, smooth vertical cubic bezier curve
              const pathData = `M ${line.from.x} ${line.from.y} C ${line.from.x} ${line.from.y + dy * 0.45}, ${line.to.x} ${line.to.y - dy * 0.45}, ${line.to.x} ${line.to.y}`;

              const isRed = line.status === 'red';
              const strokeColor = isRed ? 'url(#grad-red)' : 'url(#grad-green)';
              const glowFilter = isRed ? 'url(#glow-red)' : 'url(#glow-green)';

              // Trace hover path highlighting
              const isRelated = isLineRelated(line.id, hoveredNode);
              const opacityMultiplier = hoveredNode ? (isRelated ? 1.0 : 0.08) : 1.0;
              const widthMultiplier = hoveredNode && isRelated ? 1.6 : 1.0;

              return (
                <g key={line.id}>
                  {/* Glowing background pipe */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isRed ? '#f43f5e' : '#10b981'}
                    strokeWidth={3 * widthMultiplier}
                    opacity={0.15 * opacityMultiplier}
                    filter={glowFilter}
                  />
                  {/* Core connection line */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={2 * widthMultiplier}
                    opacity={0.8 * opacityMultiplier}
                  />
                  {/* Dynamic pulse of light traveling along connection */}
                  {isRelated && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isRed ? '#fda4af' : '#6ee7b7'}
                      strokeWidth={2.5 * widthMultiplier}
                      strokeDasharray="10 30"
                      opacity={0.9 * opacityMultiplier}
                      style={{
                        animation: 'pulseLine 2s linear infinite',
                      }}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Dynamic css style rules injected for animation effects */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes pulseLine {
            to {
              stroke-dashoffset: -40;
            }
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 5px;
            height: 5px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 99px;
          }
        `}} />

        {/* Tree structural flex grid arrangement (Vertical layout flow) */}
        <div className="relative z-10 flex flex-col gap-16 items-center min-w-[2800px] py-12">

          {/* ROW 1: Central Root Hub */}
          <div className="flex justify-center w-full">
            <div
              id="node-root"
              onClick={() => toggleExpand('root')}
              onMouseEnter={() => setHoveredNode('root')}
              onMouseLeave={() => setHoveredNode(null)}
              className={`cursor-pointer w-48 bg-white border-2 rounded-3xl p-6 text-center hover:scale-105 transition-all duration-300 relative group flex flex-col items-center shadow-lg hover:shadow-indigo-100/50 ${getPillarStatus('q') === 'red' || getPillarStatus('d') === 'red' || getPillarStatus('s') === 'red' || getPillarStatus('h') === 'red'
                ? 'border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                : 'border-indigo-400'
                } ${hoveredNode && !isNodeRelated('root', null, hoveredNode) ? 'opacity-25' : ''}`}
            >
              {/* Pulsing ring indicating operational check state */}
              <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full animate-ping ${getPillarStatus('q') === 'red' || getPillarStatus('d') === 'red' || getPillarStatus('s') === 'red' || getPillarStatus('h') === 'red'
                ? 'bg-rose-500'
                : 'bg-indigo-500'
                }`}></span>

              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3 p-2 overflow-hidden shadow-xs">
                <img src={PivotPathLogo} alt="PivotPath Logo" className="w-full h-full object-contain" />
              </div>

              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">PivotPath</h3>
              <p className="text-[9px] font-bold text-indigo-700 uppercase tracking-widest mt-1 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/60">
                Central Truth Hub
              </p>

              {/* Node explanation details on hover */}
              <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-56 bg-white border border-slate-200 p-3 rounded-2xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 text-[10px] text-slate-500 text-left font-medium">
                <p className="text-slate-800 font-bold mb-1 uppercase tracking-wider">Aggregation Logic</p>
                Serves as the root source. It aggregates real-time metrics across all 4 pillars and 9 active departments.
              </div>
            </div>
          </div>

          {/* ROW 2: Pillars (Quality, Delivery, Safety, Health) */}
          {expanded['root'] && (
            <div className="flex flex-row justify-center gap-12 w-full">
              {['q', 'd', 's', 'h'].map((p) => {
                const label = p === 'q' ? 'Quality' : p === 'd' ? 'Delivery' : p === 's' ? 'Safety' : 'Health';
                const letter = p.toUpperCase();
                const status = getPillarStatus(p);
                const isExpanded = expanded[`pillar-${p}`];

                return (
                  <div
                    key={p}
                    id={`node-pillar-${p}`}
                    onClick={() => toggleExpand(`pillar-${p}`)}
                    onMouseEnter={() => setHoveredNode(`pillar-${p}`)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className={`cursor-pointer w-52 bg-white border-2 rounded-2xl p-5 hover:scale-103 transition-all relative group flex items-center gap-4 shadow-sm ${status === 'red'
                      ? 'border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)] text-rose-700'
                      : 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] text-emerald-700'
                      } ${hoveredNode && !isNodeRelated('pillar', p, hoveredNode) ? 'opacity-25' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black uppercase border ${status === 'red' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      }`}>
                      {letter}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black uppercase text-slate-800">{label}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        {status === 'red' ? 'Alert Active' : 'Stable'}
                      </p>
                    </div>

                    <div className="text-[10px] text-slate-400 font-black">
                      {isExpanded ? '▼' : '►'}
                    </div>

                    {/* Tooltip */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-full ml-3 w-56 bg-white border border-slate-200 p-3 rounded-2xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 text-[10px] text-slate-500 text-left font-medium">
                      <p className="text-slate-800 font-bold mb-1 uppercase tracking-wider">{label} Pillar</p>
                      Evaluates operational status across all divisions. Red if any department logs severe thresholds or unhandled alerts.
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ROW 3: Department Columns (Departments, HODs, Supervisors vertically nested) */}
          {['q', 'd', 's', 'h'].some(p => expanded[`pillar-${p}`]) && (
            <div className="flex flex-row justify-center gap-8 items-start w-full">
              {Object.keys(DEPT_NAMES).map((deptKey) => {
                const activePillars = ['q', 'd', 's', 'h'].filter(p => expanded[`pillar-${p}`]);
                const isRed = activePillars.some(p => getDeptStatus(p, deptKey) === 'red');
                const status = isRed ? 'red' : 'green';
                const isExpanded = expanded[`node-dept-${deptKey}`];
                const fullName = DEPT_NAMES[deptKey];
                const shortName = DEPT_SHORTS[deptKey];

                return (
                  <div key={deptKey} className="flex flex-col items-center gap-8 animate-in fade-in duration-300">
                    {/* Department Card */}
                    <div
                      id={`node-dept-${deptKey}`}
                      onClick={() => toggleExpand(`node-dept-${deptKey}`)}
                      onMouseEnter={() => setHoveredNode(`dept-${deptKey}`)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className={`cursor-pointer w-72 bg-white border-l-4 border-y border-r rounded-xl p-4 hover:bg-slate-50/50 shadow-sm transition-all flex items-center justify-between group relative ${status === 'red'
                        ? 'border-rose-400 border-l-rose-500 border-y-slate-200 border-r-slate-200'
                        : 'border-emerald-400 border-l-emerald-500 border-y-slate-200 border-r-slate-200'
                        } ${hoveredNode && !isNodeRelated('dept', deptKey, hoveredNode) ? 'opacity-25' : ''}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${status === 'red' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <div>
                          <h5 className="text-xs font-black text-slate-800 tracking-tight leading-tight line-clamp-1">{fullName}</h5>
                          <span className="text-[8px] font-bold text-slate-550 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded uppercase mt-1 inline-block">
                            {shortName}
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-405 font-bold ml-2">
                        {isExpanded ? '▼' : '►'}
                      </div>

                      {/* Tooltip */}
                      <div className="absolute top-1/2 -translate-y-1/2 left-full ml-3 w-56 bg-white border border-slate-200 p-3 rounded-2xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 text-[10px] text-slate-505 text-left font-medium">
                        <p className="text-slate-800 font-bold mb-1 uppercase tracking-wider">{fullName}</p>
                        <span className="text-slate-700 font-black">Threshold Aggregator:</span>
                        <p className="mt-1 text-slate-500">Yield limit set at 95%. Current status inherits active live anomalies registered in logs.</p>
                      </div>
                    </div>

                    {/* HOD Card & Supervisors Columns (Directly beneath Department vertically) */}
                    {isExpanded && (
                      <div className="flex flex-col items-center gap-8 animate-in slide-in-from-top-4 duration-300">
                        {/* HOD Node */}
                        {(() => {
                          const hod = getHODForDept(deptKey);
                          const isHodExpanded = expanded[`node-hod-${deptKey}`];

                          return (
                            <div
                              className={`flex flex-col gap-2 p-3 bg-white border border-slate-200 rounded-2xl shadow-xs transition-all ${
                                hoveredNode && !isNodeRelated('hod', deptKey, hoveredNode) ? 'opacity-25' : ''
                              }`}
                            >
                              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">{shortName} Head</span>
                              <div
                                id={`node-hod-${deptKey}`}
                                onClick={() => toggleExpand(`node-hod-${deptKey}`)}
                                onMouseEnter={() => setHoveredNode(`hod-${deptKey}`)}
                                onMouseLeave={() => setHoveredNode(null)}
                                className={`cursor-pointer w-64 bg-slate-50/50 border rounded-xl p-4 hover:scale-102 transition-all flex items-center justify-between group relative ${!hod
                                  ? 'border-slate-200 opacity-70 text-slate-400'
                                  : (status === 'red' ? 'border-rose-400/80 shadow-xs' : 'border-emerald-400/80 shadow-xs')
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase ${!hod
                                    ? 'bg-slate-200 text-slate-500 border border-slate-300'
                                    : (status === 'red' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200')
                                    }`}>
                                    {hod?.name ? hod.name.split(' ').map(n => n[0]).join('') : 'NA'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <h6 className="text-xs font-black text-slate-800">{hod?.name || 'No HOD Assigned'}</h6>
                                      <Shield size={10} className="text-slate-400" title="Assigned Head of Department" />
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-medium truncate max-w-[130px]">{hod?.gmail || hod?.email || 'Unassigned'}</p>
                                  </div>
                                </div>

                                <div className="text-[10px] text-slate-400 font-bold ml-2">
                                  {isHodExpanded ? '▼' : '►'}
                                </div>

                                {/* Tooltip */}
                                <div className="absolute top-1/2 -translate-y-1/2 left-full ml-3 w-56 bg-white border border-slate-200 p-3 rounded-2xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 text-[10px] text-slate-500 text-left font-medium">
                                  <p className="text-slate-800 font-bold mb-1 uppercase tracking-wider">{hod?.name || 'No HOD Assigned'}</p>
                                  {hod ? 'Department Head responsible for coordinating overall resolution actions and supervising direct shifts.' : 'No Head of Department has been assigned to this sector in the database yet.'}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* HOD expanded: render Shift Leads / Supervisors */}
                        {expanded[`node-hod-${deptKey}`] && (
                          <div className="flex flex-col items-center gap-4 animate-in slide-in-from-top-4 duration-300">
                            {(() => {
                              const sups = getSupervisorsForDeptAndPillar(deptKey, null);

                              return (
                                <div
                                  className={`flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-3xl shadow-sm transition-all ${
                                    hoveredNode && !isNodeRelated('sup', deptKey, hoveredNode) ? 'opacity-25' : ''
                                  }`}
                                >
                                  <span className="text-[8.5px] font-black uppercase tracking-wider text-indigo-650">{shortName} Shift Leads</span>
                                  {sups.length === 0 ? (
                                    <div className="w-80 bg-slate-50 border border-dashed border-slate-200 p-4 text-center text-[10px] text-slate-400 rounded-xl">
                                      {searchQuery ? "No supervisors matched search query" : "No supervisors assigned to this sector"}
                                    </div>
                                  ) : (
                                    sups.map((sup, idx) => {
                                      const activePillars = ['q', 'd', 's', 'h'].filter(p => expanded[`pillar-${p}`]);
                                      const pillarsToEvaluate = activePillars.length > 0 ? activePillars : ['q', 'd', 's', 'h'];
                                      let totalErrors = 0;
                                      let breakdown = { high: 0, med: 0, low: 0 };

                                      pillarsToEvaluate.forEach(p => {
                                        const { totalErrors: e, breakdown: b } = getSupervisorMetrics(sup.name, sup.shift, deptKey, p);
                                        totalErrors += e;
                                        breakdown.high += b.high;
                                        breakdown.med += b.med;
                                        breakdown.low += b.low;
                                      });

                                      const status = totalErrors > 0 ? 'red' : 'green';
                                      const noteKey = `${sup.name}-${deptKey}-overall`;
                                      const activeNote = savedNotes[noteKey] || sup.interventionNotes || 'Operational Intervention: Standard monitoring procedures active.';

                                      return (
                                        <div
                                          key={`sup-${deptKey}-${idx}`}
                                          id={`node-sup-${deptKey}-${idx}`}
                                          onMouseEnter={() => setHoveredNode(`sup-${deptKey}-${idx}`)}
                                          onMouseLeave={() => setHoveredNode(null)}
                                          className={`w-88 bg-slate-50/30 border rounded-2xl p-4.5 transition-all relative group flex flex-col gap-3.5 ${status === 'red'
                                            ? 'border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.06)]'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                          {/* Header of card: supervisor credentials */}
                                          <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2.5">
                                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                <User size={14} />
                                              </div>
                                              <div>
                                                <h6 className="text-xs font-black text-slate-800">{sup.name}</h6>
                                                <p className="text-[9px] text-slate-450 font-bold uppercase mt-0.5">
                                                  Shift {sup.shift} Lead • Station {sup.station || 'A'}
                                                </p>
                                              </div>
                                            </div>

                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${status === 'red' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                              }`}>
                                              {status === 'red' ? 'Alert' : 'Stable'}
                                            </span>
                                          </div>

                                          {/* Error count display (Total Errors only) */}
                                          <div className="bg-white border border-slate-150 rounded-xl p-2.5 px-3.5 text-center flex items-center justify-between">
                                            <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider">Total Errors</span>
                                            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${totalErrors > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                                              {totalErrors}
                                            </span>
                                          </div>

                                          {/* Editable operational intervention notes */}
                                          <div className="bg-indigo-50/30 border border-indigo-100/50 rounded-xl p-3 flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center border-b border-indigo-100/50 pb-1">
                                              <span className="text-[8px] font-black uppercase tracking-wider text-indigo-650">Intervention Notes</span>
                                              <button
                                                onClick={() => handleEditNote(sup, deptKey)}
                                                className="p-1 hover:bg-indigo-50 rounded text-slate-405 hover:text-slate-700 transition"
                                                title="Edit note"
                                              >
                                                <Edit3 size={11} />
                                              </button>
                                            </div>
                                            <p className="text-[10px] text-slate-650 italic leading-relaxed font-medium line-clamp-2">
                                              "{activeNote}"
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>

      {/* Editing Modal Dialog for Intervention Notes */}
      {editingSupervisor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 animate-scale-up">
            <div>
              <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-md text-[9px] font-black uppercase text-indigo-700 tracking-wider">
                Shift Intervention Log
              </span>
              <h3 className="text-base font-black text-slate-800 mt-2 uppercase tracking-wide">
                Modify Action Remarks
              </h3>
              <p className="text-[10px] text-slate-450 mt-1">
                Updating operational details for **{editingSupervisor.supervisor.name}** (Shift {editingSupervisor.supervisor.shift} Lead).
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Remarks / Operational Note</label>
              <textarea
                rows="4"
                value={interventionNoteInput}
                onChange={(e) => setInterventionNoteInput(e.target.value)}
                placeholder="Describe current corrective action steps..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 text-xs text-slate-800 p-3 rounded-xl outline-none resize-none transition leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-3.5 mt-2">
              <button
                onClick={() => setEditingSupervisor(null)}
                className="px-4.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="px-5.5 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md shadow-indigo-100"
              >
                Save Intervention Notes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
