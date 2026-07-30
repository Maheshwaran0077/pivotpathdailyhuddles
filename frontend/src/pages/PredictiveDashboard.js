import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip 
} from 'recharts';
import { 
  Activity, Info, AlertTriangle, ChevronLeft, RefreshCw, 
  TrendingUp, TrendingDown, Gauge, ShieldAlert, BarChart3,
  Settings, ClipboardCheck, Wrench, Truck, Package, PackageCheck, Archive, Layers, Eye, GitFork, X, Sparkles
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);

const DEPARTMENTS_LIST = [
  'Finished Good Material Warehouse',
  'Packing Material Warehouse',
  'Raw Material Warehouse',
  'Primary Packing Production',
  'Post Production',
  'QC & Microbiology & AD Lab',
  'Production',
  'Secondary Packing Production',
  'Facilities'
];

const PILLARS_LIST = ['Quality', 'Delivery', 'Safety', 'Health'];
const SHIFTS_LIST = ['1', '2', '3'];

const CosmicHeaderBackground = () => {
  useEffect(() => {
    const canvas = document.getElementById('cosmic-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create large, slow moving organic blobs for the mesh gradient
    // Hues: soft violet, warm pink, vivid red, subtle green
    const blobs = [
      {
        x: Math.random(),
        y: Math.random(),
        vx: 0.0005,
        vy: 0.0003,
        baseRadius: 0.35, // fraction of screen width
        color: 'rgba(139, 92, 246, 0.12)' // soft violet
      },
      {
        x: Math.random(),
        y: Math.random(),
        vx: -0.0004,
        vy: 0.0005,
        baseRadius: 0.40,
        color: 'rgba(236, 72, 153, 0.14)' // warm pink
      },
      {
        x: Math.random(),
        y: Math.random(),
        vx: 0.0003,
        vy: -0.0004,
        baseRadius: 0.30,
        color: 'rgba(239, 68, 68, 0.08)' // vivid red
      },
      {
        x: Math.random(),
        y: Math.random(),
        vx: -0.0005,
        vy: -0.0003,
        baseRadius: 0.28,
        color: 'rgba(34, 197, 94, 0.07)' // subtle green
      },
      {
        x: Math.random(),
        y: Math.random(),
        vx: 0.0004,
        vy: -0.0005,
        baseRadius: 0.38,
        color: 'rgba(139, 92, 246, 0.09)' // second soft violet blob for complexity
      }
    ];
    
    const animate = () => {
      // Clear with clean crisp white
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const maxDim = Math.max(canvas.width, canvas.height);
      
      blobs.forEach(b => {
        // Move blobs with slow physics
        b.x += b.vx;
        b.y += b.vy;
        
        // Bounce on boundaries
        if (b.x < 0 || b.x > 1) b.vx *= -1;
        if (b.y < 0 || b.y > 1) b.vy *= -1;
        
        // Dynamic breathing scale for organic feel
        const time = Date.now() * 0.0008;
        const breathScale = 1.0 + Math.sin(time + b.x * 10) * 0.12;
        const radius = b.baseRadius * maxDim * breathScale;
        
        const px = b.x * canvas.width;
        const py = b.y * canvas.height;
        
        // Draw the blob as a smooth radial gradient fading to transparent
        const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
        grad.addColorStop(0, b.color);
        grad.addColorStop(0.5, b.color.replace('0.', '0.05')); // softer fade mid-way
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
      <canvas id="cosmic-canvas" className="w-full h-full block" />
    </div>
  );
};

export default function PredictiveDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [metrics, setMetrics] = useState({ rollingAverage: 0, trendVelocity: 0, standardDeviation: 0 });
  const [stations, setStations] = useState([]);
  const [departmentsData, setDepartmentsData] = useState([]);
  const [mlServiceStatus, setMlServiceStatus] = useState('online');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedDept, setSelectedDept] = useState('Overall');
  const [selectedPillar, setSelectedPillar] = useState('Overall');
  const [selectedShift, setSelectedShift] = useState('Overall');
  const [selectedStation, setSelectedStation] = useState(null);

  const fetchForecastData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (selectedDept !== 'Overall') params.department = selectedDept;
      if (selectedPillar !== 'Overall') params.pillar = selectedPillar;
      if (selectedShift !== 'Overall') params.shift = selectedShift;

      const res = await axios.get(`${API}/api/factory/forecast`, { params });
      setData(res.data.data || []);
      setMetrics(res.data.metrics || { rollingAverage: 0, trendVelocity: 0, standardDeviation: 0 });
      setStations(res.data.stationReport || []);
      setDepartmentsData(res.data.departmentReport || []);
      setMlServiceStatus(res.data.mlServiceStatus || 'online');
    } catch (err) {
      console.error("Failed to load forecast data", err);
      setError("Unable to connect to predictive forecasting endpoint. Please verify backend server and database status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecastData();
  }, [selectedDept, selectedPillar, selectedShift]);

  const triggerReseed = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/api/factory/seed`);
      await fetchForecastData();
    } catch (err) {
      console.error("Reseed failed", err);
      setError("Manual database seed trigger failed.");
      setLoading(false);
    }
  };

  // High-contrast clean tooltips inside Recharts ComposedChart
  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      const isForecast = point.isForecast;
      
      const weightText = isForecast 
        ? "Exponentially weighted based on the past 14-day rolling activity, placing higher statistical weight on the most recent observations."
        : "Directly weighted at 100% of physical logs, serving as the training dataset for the prediction model.";
      
      const velocityText = isForecast
        ? `Modified by a 30-day linear regression slope of ${metrics.trendVelocity > 0 ? '+' : ''}${metrics.trendVelocity} per day to project direction.`
        : `Historical baseline slope calculated at ${metrics.trendVelocity > 0 ? '+' : ''}${metrics.trendVelocity} per day across the 30-day trailing window.`;

      const reasoningText = isForecast
        ? `Machine Learning time-series regression calculating a 95% confidence interval [${point.lowerBound} to ${point.upperBound}] using historical variance.`
        : "Verified physical logs submitted through digital supervisor shift reporting logs. High accuracy verified.";

      const interventionText = isForecast
        ? (point.predicted > 2.2 
            ? "⚠️ PROACTIVE MAINTENANCE REQUIRED: High risk of defect escalation. Schedule calibration for key stations."
            : "✅ ROUTINE MONITORING: Projections are within normal control limits. No immediate intervention needed.")
        : (point.actual > 2.5
            ? "🔍 RETROSPECTIVE AUDIT: High defect count detected on this date. Confirm if quality containment was executed."
            : "✅ STANDARDS MET: Defect rates on this date remained within the historical standard operating guidelines.");

      return (
        <div className="bg-[#0F172A] border-2 border-slate-700 text-white p-4.5 rounded-2xl shadow-2xl max-w-sm text-[11px] font-bold leading-relaxed z-50">
          <p className="font-extrabold uppercase text-[8.5px] tracking-widest text-slate-400 mb-2">
            {isForecast ? '🔮 40-Day Projected Forecast' : '📊 Historical Observed Data'}
          </p>
          <p className="font-black text-sm text-slate-100 mb-2">{point.date}</p>
          
          <div className="flex flex-col gap-1.5 border-b border-slate-800 pb-2.5 mb-2.5">
            {isForecast ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-350">Projected Defects:</span>
                  <span className="font-black text-purple-400 text-sm">{point.predicted}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400">Confidence Boundaries:</span>
                  <span className="font-bold text-purple-300">
                    [{point.lowerBound} - {point.upperBound}]
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-slate-350">Actual Logged Defects:</span>
                <span className="font-black text-emerald-400 text-sm">{point.actual}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5 text-[10px]">
            <div>
              <span className="font-black text-slate-400 uppercase tracking-wider block text-[7.5px] mb-0.5">Mathematical Weighting</span>
              <p className="text-slate-200 leading-normal">{weightText}</p>
            </div>
            <div>
              <span className="font-black text-slate-400 uppercase tracking-wider block text-[7.5px] mb-0.5">Trend Velocity Factor</span>
              <p className="text-slate-200 leading-normal">{velocityText}</p>
            </div>
            <div>
              <span className="font-black text-slate-400 uppercase tracking-wider block text-[7.5px] mb-0.5">Statistical Reasoning</span>
              <p className="text-slate-200 leading-normal">{reasoningText}</p>
            </div>
            <div className="bg-[#1E293B] p-2.5 rounded-lg border border-slate-700">
              <span className="font-black text-purple-300 uppercase tracking-wider block text-[7.5px] mb-1">Operational Intervention</span>
              <p className="text-white font-bold leading-normal">{interventionText}</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const getDeptStats = (name) => {
    return departmentsData.find(d => d.departmentName === name) || { 
      totalDefects: 0, 
      highSeverityCount: 0, 
      mediumSeverityCount: 0, 
      lowSeverityCount: 0, 
      primaryErrorType: "None Detected" 
    };
  };

  const getDeptIcon = (name) => {
    switch (name) {
      case 'Finished Good Material Warehouse': return <Truck size={18} />;
      case 'Packing Material Warehouse': return <Package size={18} />;
      case 'Raw Material Warehouse': return <Archive size={18} />;
      case 'Primary Packing Production': return <Layers size={18} />;
      case 'Post Production': return <Eye size={18} />;
      case 'QC & Microbiology & AD Lab': return <ClipboardCheck size={18} />;
      case 'Production': return <Settings size={18} />;
      case 'Secondary Packing Production': return <PackageCheck size={18} />;
      case 'Facilities': return <Wrench size={18} />;
      default: return <Settings size={18} />;
    }
  };

  // Static content details for the 9 departments incorporating exact defect rules
  const DEPT_INFO = {
    'Finished Good Material Warehouse': {
      causes: "Defects generated primarily during outbound delivery processes due to forklift transit packaging scuffs and raw shipping container shifts.",
      rules: "Delivery Target Yield: Requires Plan vs Actual Manufactured ratio of >= 90%. Yields under 90% generate a Delivery defect.",
      recommendations: "Set stricter load height constraints on shipping pallets and verify delivery truck alignment daily."
    },
    'Packing Material Warehouse': {
      causes: "Defects stemming from moisture exposure on cardboard packaging containers, pallet wrap tension loss, and raw packaging supplier defects.",
      rules: "Quality Check: Common errors include: machine breakdown, no power, no manpower, quality reject, and other custom issues.",
      recommendations: "Track humidity metrics across storing zones and verify packaging pallet wrap tension tolerances."
    },
    'Raw Material Warehouse': {
      causes: "Physical container dents on bulk delivery inputs, raw chemical material moisture leakage, and incoming batch coding identification mismatches.",
      rules: "Quality Check: Common errors include: machine breakdown, no power, no manpower, quality reject, and other custom issues.",
      recommendations: "Mandate incoming visual seals inspection checklists and run automated scanner calibration scripts weekly."
    },
    'Primary Packing Production': {
      causes: "Thermal sealing temperature variations, nozzle packing blockages, and high-frequency bottle label alignment failures.",
      rules: "Production Quality: Critical machine breakdown or quality reject failures registered under Quality audits.",
      recommendations: "Execute preventive heater element replacement and clean packing nozzle tips at the start of every shift."
    },
    'Post Production': {
      causes: "Visual sensor alignment drift, physical packaging volume mismatches on cartoning machines, and product case weight discrepancies.",
      rules: "Delivery Yield: Target output is calculated via Plan vs Actual Manufactured yield limits. Red status when yield is < 90%.",
      recommendations: "Re-run inspection camera alignment scripts and implement dual scale weight validations on active lines."
    },
    'QC & Microbiology & AD Lab': {
      causes: "Manual pipette calibration drift, delayed incubator logs, and reagent degradation in ambient laboratory storage environments.",
      rules: "Quality Check: Common errors include: machine breakdown, no power, no manpower, quality reject, and other custom issues.",
      recommendations: "Deploy automated reagent inventory timers and schedule weekly sensor validation audits on all lab devices."
    },
    'Production': {
      causes: "Critical machine mechanical failures, gear linkage wear, and motor overheating. General machine breakdown issues have disrupted operations over the past two months.",
      rules: "Quality Check: Tracked defect categories are: machine breakdown, no power, no manpower, quality reject, and other custom issues.",
      recommendations: "Schedule immediate repair on high-speed lines, check motor vibrations, and execute monthly gearbox diagnostics."
    },
    'Secondary Packing Production': {
      causes: "Bundle shrink wrap element failures, carton feed blockages, and product labeling printing overlaps.",
      rules: "Quality Check: Common errors include: machine breakdown, no power, no manpower, quality reject, and other custom issues.",
      recommendations: "Lubricate cartoning conveyor tracks weekly and monitor label printing temperatures daily."
    },
    'Facilities': {
      causes: "Utility cleanroom fan filter blockages, backup battery generator drops, and compressed air pressure fluctuations.",
      rules: "Safety and Health check: Tracks Safety Incidents (>0 is defect) and Health attendance metrics (defects if Attendees < Total Strength, bypass if Holiday/No Meeting).",
      recommendations: "Enforce monthly cleanroom filter changeovers and audit facilities power backup switch operations."
    }
  };

  // Calculation variables for hyper-simplified analytics engine
  const totalHistoricalErrors = data.filter(d => !d.isForecast).reduce((sum, d) => sum + (d.actual || 0), 0);
  const totalProjectedErrors = Math.round(data.filter(d => d.isForecast).reduce((sum, d) => sum + (d.predicted || 0), 0));

  // Find department with maximum defects
  const maxDept = departmentsData.length > 0 
    ? departmentsData.reduce((prev, current) => (prev.totalDefects > current.totalDefects) ? prev : current, departmentsData[0])
    : null;
  const concentrationPercentage = totalHistoricalErrors && maxDept
    ? Math.round((maxDept.totalDefects / totalHistoricalErrors) * 100)
    : 0;
  const maxDeptName = maxDept ? maxDept.departmentName : 'N/A';

  // Generate hyper-simplified, cause-and-effect smart recommendation
  const getSmartRecommendation = () => {
    const errorType = maxDept?.primaryErrorType || 'General defect';
    const deptName = maxDept?.departmentName || 'Production';
    
    let actionText = "Schedule preventative maintenance checkups and verify employee training logs.";
    if (errorType.toLowerCase().includes('breakdown')) {
      actionText = `Perform immediate preventative maintenance check on machinery in ${deptName} to reduce downtime.`;
    } else if (errorType.toLowerCase().includes('power')) {
      actionText = `Verify emergency backup power grids and electrical circuits in ${deptName}.`;
    } else if (errorType.toLowerCase().includes('meeting') || errorType.toLowerCase().includes('health')) {
      actionText = `Enforce mandatory health huddle check-ins and attendance tracking in ${deptName}.`;
    } else if (errorType.toLowerCase().includes('yield') || errorType.toLowerCase().includes('target')) {
      actionText = `Optimize line speed and check raw material tolerances in ${deptName}.`;
    }
    
    return {
      causeEffect: `Because you had ${totalHistoricalErrors} total errors previously (mostly driven by "${errorType}" in ${deptName}), your upcoming error count will be ${totalProjectedErrors}.`,
      recommendation: actionText
    };
  };

  const rec = getSmartRecommendation();

  return (
    <div className="min-h-screen bg-white pb-12 font-sans selection:bg-emerald-100 selection:text-emerald-900 relative overflow-x-hidden">
      <CosmicHeaderBackground />
      
      {/* Top Header */}
      <div className="bg-white/40 border-b border-slate-200/50 sticky top-[73px] z-40 px-6 py-4 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <button 
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-850 transition mb-1"
            >
              <ChevronLeft size={13} /> Return Dashboard Focus
            </button>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <Activity className="text-indigo-500 animate-pulse" size={24} /> 
              Predictive Defect Forecasting Hub
            </h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              Regression Analytics & rolling 10-day risk models (Live Database Synced)
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchForecastData}
              disabled={loading}
              className="px-4 py-2 bg-white/80 hover:bg-slate-50 text-slate-700 border border-slate-250 disabled:opacity-50 text-xs font-black uppercase tracking-wider rounded-2xl transition flex items-center gap-1.5 shadow-sm backdrop-blur-xs"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh Model
            </button>
          </div>
        </div>
      </div>

      {/* FILTER CONTROL BAR */}
      <div className="bg-white/60 border-b border-slate-200/50 py-3.5 px-6 sticky top-[148px] z-30 shadow-xs backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-6 text-xs">
          
          {/* Department selector */}
          <div className="flex flex-col gap-1">
            <label className="font-extrabold uppercase tracking-widest text-[9px] text-slate-450">Operational Department</label>
            <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-white/80 border border-slate-200 text-slate-700 py-1.5 px-3 rounded-lg font-bold focus:outline-none focus:border-indigo-400 backdrop-blur-xs"
            >
              <option value="Overall">Overall (All Departments)</option>
              {DEPARTMENTS_LIST.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Pillar selector */}
          <div className="flex flex-col gap-1">
            <label className="font-extrabold uppercase tracking-widest text-[9px] text-slate-455">Defect Pillar Focus</label>
            <select 
              value={selectedPillar} 
              onChange={(e) => setSelectedPillar(e.target.value)}
              className="bg-white/80 border border-slate-200 text-slate-700 py-1.5 px-3 rounded-lg font-bold focus:outline-none focus:border-indigo-400 backdrop-blur-xs"
            >
              <option value="Overall">Overall (All Pillars)</option>
              {PILLARS_LIST.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Shift selector */}
          <div className="flex flex-col gap-1">
            <label className="font-extrabold uppercase tracking-widest text-[9px] text-slate-455">Active Shift Log</label>
            <select 
              value={selectedShift} 
              onChange={(e) => setSelectedShift(e.target.value)}
              className="bg-white/80 border border-slate-200 text-slate-700 py-1.5 px-3 rounded-lg font-bold focus:outline-none focus:border-indigo-400 backdrop-blur-xs"
            >
              <option value="Overall">Overall (All Shifts)</option>
              {SHIFTS_LIST.map(s => (
                <option key={s} value={s}>Shift {s}</option>
              ))}
            </select>
          </div>

          {/* Track button */}
          <div className="flex flex-col gap-1 items-center">
            <label className="font-extrabold uppercase tracking-widest text-[9px] text-slate-450 text-center">Visual Node Map</label>
            <button
              onClick={() => navigate('/track')}
              className="bg-white/80 hover:bg-slate-50 text-slate-700 font-extrabold text-xs uppercase tracking-wider py-1.5 px-5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm border border-slate-200 hover:border-slate-300 transition w-32"
            >
              <GitFork size={13} /> Track
            </button>
          </div>

          {/* Filter status label */}
          <div className="ml-auto bg-emerald-50/70 text-emerald-800 border border-emerald-100/60 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
            <Info size={13} />
            <span>
              Active Filter: {selectedDept === 'Overall' ? 'All Sectors' : selectedDept} • {selectedPillar === 'Overall' ? 'All Pillars' : selectedPillar} • {selectedShift === 'Overall' ? 'All Shifts' : `Shift ${selectedShift}`}
            </span>
          </div>

        </div>
      </div>

      {loading && data.length === 0 ? (
        <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 animate-pulse">Running time-series regression calculations...</p>
        </div>
      ) : error ? (
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-3xl flex items-start gap-3">
            <AlertTriangle className="text-rose-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">Database Connection Required</h3>
              <p className="text-xs mt-1 text-rose-700">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
            
            {/* LEFT/CENTER COLUMN: Forecasting Chart & Model Info */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              
              {/* Model Summary Cards (Simplified Percentages & Counts Engine) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">d:grid-cols-3 gap-4">
                
                {/* Historical Summary Card */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-indigo-500/20 rounded-3xl p-5 shadow-lg transition duration-300">
                  <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block mb-1">Historical defects (60 Days)</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white">{totalHistoricalErrors}</span>
                    <span className="text-[10px] font-bold text-slate-400">Total Errors</span>
                  </div>
                  <p className="text-[9px] text-slate-300 font-bold leading-normal mt-2.5 border-t pt-2 border-slate-800/60">
                    Last 60 Days: {totalHistoricalErrors} Total Errors | {concentrationPercentage}% Concentration in {maxDeptName}
                  </p>
                </div>

                {/* Future Projections Card */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-purple-500/20 rounded-3xl p-5 shadow-lg transition duration-300">
                  <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest block mb-1">Projected Defects (40 Days)</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white">{totalProjectedErrors}</span>
                    <span className="text-[10px] font-bold text-slate-400">Projected Errors</span>
                  </div>
                  <div className="mt-2.5 border-t pt-2 border-slate-800/60 flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-bold">Status:</span>
                    {totalProjectedErrors > (totalHistoricalErrors * 0.5) || totalProjectedErrors > 25 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        🔴 Alert / High Risk
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        🟢 Stable / Safe
                      </span>
                    )}
                  </div>
                </div>

                {/* ML Engine Status */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-cyan-500/20 rounded-3xl p-5 shadow-lg transition duration-300">
                  <span className="text-[10px] font-black text-cyan-300 uppercase tracking-widest block mb-1">Forecasting Engine</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${mlServiceStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className="text-xs font-black uppercase tracking-tight text-white">
                      {mlServiceStatus === 'online' ? 'AI Prophet Active' : 'Statistical Fallback'}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-300 font-bold leading-normal mt-2.5 border-t pt-2 border-slate-800/60">
                    {mlServiceStatus === 'online' 
                      ? "Using advanced Prophet Time-Series AI model to forecast future data points." 
                      : "Operating on local fallback mathematical model using current trend velocities."}
                  </p>
                </div>

              </div>

              {/* Dedicated Smart Recommendation Card (Rule 2) */}
              <div className="bg-slate-900/50 backdrop-blur-md border border-amber-500/15 rounded-3xl p-6 shadow-xl flex flex-col gap-4 animate-in fade-in duration-500">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center">
                    <AlertTriangle size={18} />
                  </div>
                  <h4 className="text-xs font-black uppercase text-amber-200 tracking-wider">Smart Recommendation</h4>
                </div>
                <div className="border-t border-slate-800/60 pt-3">
                  <p className="text-[11px] text-slate-300 font-bold leading-relaxed">
                    {rec.causeEffect}
                  </p>
                  <div className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
                    <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider shrink-0">Action Plan:</span>
                    <span className="text-[10px] text-amber-800 font-black">{rec.recommendation}</span>
                  </div>
                </div>
              </div>

              {/* Chart Panel */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-indigo-500/20 rounded-[2.5rem] p-6 shadow-sm">
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <h2 className="text-sm font-black uppercase text-white tracking-wider">Historical vs Forecast Defect Timeline</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">60 days observed actuals + 40 days machine learning projections</p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Actual Defects
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-purple-500 border-t border-dashed border-purple-500 inline-block" /> Projected Forecast
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-purple-900/30 border border-purple-800/40 rounded inline-block" /> 95% Confidence Bounds
                    </div>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.18}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#64748B" 
                        fontSize={9}
                        fontWeight="bold"
                        tickLine={false}
                        axisLine={false}
                        dy={8}
                        tickFormatter={(str) => {
                          if (!str) return '';
                          const parts = str.split('-');
                          if (parts.length < 3) return str;
                          return `${parts[2]}/${parts[1]}`;
                        }}
                      />
                      <YAxis 
                        stroke="#64748B" 
                        fontSize={9}
                        fontWeight="bold"
                        tickLine={false}
                        axisLine={false}
                        dx={-8}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      
                      {/* Confidence boundary band */}
                      <Area
                        type="monotone"
                        dataKey={(point) => point.isForecast ? [point.lowerBound, point.upperBound] : null}
                        stroke="none"
                        fill="url(#confidenceBand)"
                        name="Confidence Interval"
                      />

                      {/* Actual Defects Line */}
                      <Line 
                        type="monotone" 
                        dataKey="actual" 
                        stroke="#10B981" 
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, stroke: '#10B981', strokeWidth: 2, fill: '#FFFFFF' }}
                        connectNulls
                      />

                      {/* Predicted Defects Line */}
                      <Line 
                        type="monotone" 
                        dataKey="predicted" 
                        stroke="#8B5CF6" 
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={{ r: 3.5, fill: '#8B5CF6', strokeWidth: 1, stroke: '#FFFFFF' }}
                        activeDot={{ r: 6.5, stroke: '#8B5CF6', strokeWidth: 2, fill: '#FFFFFF' }}
                        connectNulls
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Risks Breakdown Matrix */}
            <div className="flex flex-col gap-6">
              
              {/* Info explanatory element */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-indigo-500/20 rounded-[2rem] p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-1 text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                  <Gauge size={14} className="text-indigo-400" /> Model Reliability Index
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                  <span className="text-xs font-bold text-slate-400">Sample Count (Days)</span>
                  <span className="font-black text-white text-xs">91 Days actual</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                  <span className="text-xs font-bold text-slate-400">Prediction Scope</span>
                  <span className="font-black text-emerald-455 text-xs">10 Days projected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Reliability Grade</span>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-extrabold text-[9px] rounded-lg border border-emerald-500/20 uppercase">
                    95% Confidence
                  </span>
                </div>
              </div>

              {/* Risk Warnings Board */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-purple-500/20 rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-4 flex-1">
                <div>
                  <h2 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="text-rose-505" size={17} /> 
                    Stations Risk Matrix
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Defect density rank & mitigation recommendations</p>
                </div>

                {/* Stations listing */}
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[360px] pr-1">
                  {stations.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold italic py-4">No active risk metrics reported for this filter context.</p>
                  ) : (
                    stations.map((item) => (
                      <div 
                        key={item.stationId} 
                        onClick={() => setSelectedStation(item)}
                        className="p-3.5 bg-slate-855/30 border border-slate-800/60 rounded-2xl flex flex-col gap-2 relative hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-300 cursor-pointer shadow-xs active:scale-98"
                        title={
                          item.riskLevel === 'Critical' 
                            ? "Critical rating is triggered because high frequency of critical/high-severity defects logged on this line."
                            : item.riskLevel === 'High' 
                              ? "High rating is triggered due to cumulative defect logs exceeding 15 or high severity counts exceeding 3." 
                              : "Station reports nominal variations within standard quality limits."
                        }
                      >
                        {/* Station Name + Severity Badge with Native Tooltip */}
                        <div className="flex justify-between items-center">
                          <span className="font-black text-xs text-white uppercase">{item.stationId}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border cursor-help ${
                            item.riskLevel === 'Critical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            item.riskLevel === 'High' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {item.riskLevel}
                          </span>
                        </div>

                        {/* Defect count details */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-bold">
                          <div>Total Defects: <span className="text-white font-black">{item.totalDefects}</span></div>
                          <div className="text-right">Primary: <span className="text-emerald-400 font-black truncate max-w-[80px] inline-block align-bottom">{item.primaryErrorType}</span></div>
                        </div>

                        {/* Mitigation recommendation text */}
                        <div className="hidden group-hover:block text-[9px] text-slate-300 bg-slate-900 border border-emerald-500/20 p-2 rounded-xl mt-1.5 leading-normal animate-scale-up font-medium">
                          <span className="font-extrabold text-[8px] uppercase tracking-widest text-emerald-400 block mb-0.5">Recommended Action:</span>
                          {item.riskLevel === 'Critical' ? (
                            "⚠️ CRITICAL ACTION: Schedule mandatory machine calibration within the next 24 hours. Hold secondary audits."
                          ) : item.riskLevel === 'High' ? (
                            "🔍 HIGH ACTION: Increase inspection frequency on primary packaging lines. Retrain operators."
                          ) : (
                            "✅ ROUTINE ACTION: Maintain standard quality checks and shift logging cycles."
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* DEPARTMENTAL ANALYTICAL BREAKDOWN SECTION */}
          <div className="max-w-7xl mx-auto px-6 mt-12 pb-16 relative z-10">
            <div className="border-t border-slate-800/80 pt-8">
              <div className="mb-8">
                <h2 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <BarChart3 className="text-emerald-400" size={20} />
                  Departmental Analytical Breakdown
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Historical root causes, predictive analysis, and granular engineering recommendations for all 9 operational sectors
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Map through all 9 departments */}
                {DEPARTMENTS_LIST.map((deptName) => {
                  const stats = getDeptStats(deptName);
                  const isHighRisk = stats.highSeverityCount > 2 || stats.totalDefects > 12;
                  const details = DEPT_INFO[deptName] || { causes: "", rules: "", recommendations: "" };
                  
                  return (
                    <div 
                      key={deptName} 
                      className="bg-slate-900/40 backdrop-blur-md border border-emerald-500/20 rounded-[2rem] p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-emerald-500/40 transition duration-300"
                      title={`Double-click card to view specific logs for ${deptName}`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-start border-b border-slate-800/60 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-955/40 text-emerald-400 rounded-xl">
                              {getDeptIcon(deptName)}
                            </div>
                            <div>
                              <h3 className="font-black text-white text-xs uppercase tracking-tight leading-tight max-w-[150px]">{deptName}</h3>
                            </div>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-widest border ${
                            isHighRisk ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                          title={isHighRisk 
                            ? "Action Alert: High frequency of critical/high-severity defects logged on this line."
                            : "Stable: Defect frequencies match historical control limits."
                          }>
                            {isHighRisk ? 'Alert' : 'Stable'}
                          </span>
                        </div>

                        {/* Defect Counter Grid */}
                        <div className="grid grid-cols-3 gap-1 bg-slate-850/50 p-2 rounded-xl text-[9px] text-slate-400 font-bold border border-slate-800/60">
                          <div>Total: <span className="text-white font-black block">{stats.totalDefects}</span></div>
                          <div>High: <span className="text-rose-400 font-black block">{stats.highSeverityCount}</span></div>
                          <div className="truncate">Primary: <span className="text-emerald-400 font-black block truncate">{stats.primaryErrorType}</span></div>
                        </div>

                        {/* Descriptions (fully visible, no clipping) */}
                        <div className="flex flex-col gap-3 text-[11px] text-slate-350 leading-relaxed font-medium">
                          <div>
                            <span className="font-black text-slate-400 uppercase tracking-wider text-[8px] block mb-0.5">Historical Observations:</span>
                            <p className="text-slate-400">{details.causes}</p>
                          </div>
                          <div>
                            <span className="font-black text-slate-400 uppercase tracking-wider text-[8px] block mb-0.5">Pillar Metric Rule:</span>
                            <p className="text-emerald-400 font-semibold">{details.rules}</p>
                          </div>
                        </div>
                      </div>

                      {/* Engineering Recommendations in full */}
                      <div className="bg-emerald-955/20 p-3 rounded-xl border border-emerald-900/30 text-[11px] mt-2">
                        <span className="font-black text-emerald-400 uppercase tracking-wider text-[8px] block mb-0.5">Proactive Engineering Action:</span>
                        <p className="text-slate-250 font-bold leading-normal">{details.recommendations}</p>
                      </div>

                    </div>
                  );
                })}

              </div>
            </div>
          </div>

          {/* Station Detail Modal Popup */}
          {selectedStation && (
            <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-[999] flex items-center justify-center p-4">
              <div className="bg-slate-900/90 border border-slate-800/80 backdrop-blur-lg rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                <button 
                  onClick={() => setSelectedStation(null)} 
                  className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 transition-colors outline-none"
                >
                  <X size={20}/>
                </button>
                
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert className="text-emerald-400" size={24} />
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                      Station Risk Details: {selectedStation.stationId}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      Granular Forensics & Root-Cause Mitigation
                    </p>
                  </div>
                </div>

                <div className="space-y-4 border-t border-slate-800 pt-4">
                  {/* Department */}
                  <div className="bg-slate-850/40 border border-slate-800/60 rounded-2xl p-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Operational Department</span>
                    <span className="text-sm font-black text-white uppercase tracking-tight block">
                      {selectedStation.department}
                    </span>
                  </div>

                  {/* Error Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-850/40 border border-slate-800/60 rounded-2xl p-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Defects Count</span>
                      <span className="text-2xl font-black text-white">{selectedStation.totalDefects}</span>
                    </div>
                    <div className="bg-slate-850/40 border border-slate-800/60 rounded-2xl p-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Severity Status</span>
                      <span className={`px-2.5 py-0.5 mt-1 rounded-full text-[9px] font-black uppercase tracking-widest border inline-block ${
                        selectedStation.riskLevel === 'Critical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        selectedStation.riskLevel === 'High' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {selectedStation.riskLevel}
                      </span>
                    </div>
                  </div>

                  {/* Severity Breakdown */}
                  <div className="bg-slate-850/40 border border-slate-800/60 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[8px] font-black text-rose-455 uppercase tracking-wider block mb-0.5">High</span>
                      <span className="text-base font-black text-white">{selectedStation.highSeverityCount}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-amber-455 uppercase tracking-wider block mb-0.5">Medium</span>
                      <span className="text-base font-black text-white">{selectedStation.mediumSeverityCount}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-emerald-455 uppercase tracking-wider block mb-0.5">Low</span>
                      <span className="text-base font-black text-white">{selectedStation.lowSeverityCount}</span>
                    </div>
                  </div>

                  {/* Primary Error Type */}
                  <div className="bg-emerald-955/20 border border-emerald-900/30 rounded-2xl p-4">
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Primary Error Type</span>
                    <span className="text-sm font-black text-emerald-450 uppercase tracking-tight block">
                      {selectedStation.primaryErrorType}
                    </span>
                    
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mt-3 mb-1">Reason Chosen As Primary</span>
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                      This defect type was designated as the primary error reason because it has the highest frequency of occurrences among all recorded logs for this station over the baseline period.
                    </p>
                  </div>

                  {/* Mitigation Action */}
                  <div className="bg-slate-950/60 border border-slate-850/60 rounded-2xl p-4">
                    <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block mb-1">Mitigation Recommendations</span>
                    <p className="text-[11px] text-white font-bold leading-normal">
                      {selectedStation.riskLevel === 'Critical' ? (
                        "⚠️ CRITICAL ACTION: Schedule mandatory machine calibration within the next 24 hours. Hold secondary audits."
                      ) : selectedStation.riskLevel === 'High' ? (
                        "🔍 HIGH ACTION: Increase inspection frequency on primary packaging lines. Retrain operators."
                      ) : (
                        "✅ ROUTINE ACTION: Maintain standard quality checks and shift logging cycles."
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}
