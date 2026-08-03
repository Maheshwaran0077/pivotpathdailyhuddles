import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Bar, Legend
} from 'recharts';
import { 
  Activity, Info, AlertTriangle, ChevronLeft, RefreshCw, 
  TrendingUp, TrendingDown, Gauge, ShieldAlert, BarChart3,
  Settings, ClipboardCheck, Wrench, Truck, Package, PackageCheck, Archive, Layers, Eye, GitFork, X, Sparkles, Zap
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

const DEPT_MAP = {
  'PPP-1': 'Primary Packing Production',
  'PRO-2': 'Production',
  'SPP-3': 'Secondary Packing Production',
  'FGMW-1': 'Finished Good Material Warehouse',
  'PMW-2': 'Packing Material Warehouse',
  'RMW-1': 'Raw Material Warehouse',
  'FAC-1': 'Facilities',
  'QCMAD-2': 'QC & Microbiology & AD Lab',
  'POP-1': 'Post Production'
};

const DEPT_ABBR = {
  'Raw Material Warehouse': 'RMW',
  'Packing Material Warehouse': 'PMW',
  'QC & Microbiology & AD Lab': 'QCMAD',
  'Production': 'PRO',
  'Primary Packing Production': 'PPP',
  'Secondary Packing Production': 'SPP',
  'Post Production': 'POP',
  'Finished Good Material Warehouse': 'FGMW',
  'Facilities': 'FAC'
};

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
      canvas.height = window.innerHeight * 0.7;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create large, slow moving organic blobs for the mesh gradient
    // Hues: Deep Indigo, Vibrant Magenta, Luminous Cyan, Coral Red, Amber Gold, Violet, Emerald Green
    const blobs = [
      {
        x: Math.random(),
        y: Math.random(),
        vx: 0.0018,
        vy: 0.0012,
        baseRadius: 0.35, // fraction of screen width
        color: 'rgba(67, 56, 202, 0.40)', // Deep Indigo
        colorMid: 'rgba(67, 56, 202, 0.15)'
      },
      {
        x: Math.random(),
        y: Math.random(),
        vx: -0.0015,
        vy: 0.0018,
        baseRadius: 0.40,
        color: 'rgba(219, 39, 119, 0.42)', // Vibrant Magenta
        colorMid: 'rgba(219, 39, 119, 0.16)'
      },
      {
        x: Math.random(),
        y: Math.random(),
        vx: 0.0012,
        vy: -0.0015,
        baseRadius: 0.30,
        color: 'rgba(6, 182, 212, 0.38)', // Luminous Cyan
        colorMid: 'rgba(6, 182, 212, 0.14)'
      },
      {
        x: Math.random(),
        y: Math.random(),
        vx: -0.0018,
        vy: -0.0012,
        baseRadius: 0.28,
        color: 'rgba(225, 29, 72, 0.36)', // Intense Coral Red
        colorMid: 'rgba(225, 29, 72, 0.12)'
      },
      {
        x: Math.random(),
        y: Math.random(),
        vx: 0.0015,
        vy: -0.0018,
        baseRadius: 0.38,
        color: 'rgba(245, 158, 11, 0.35)', // Amber Gold
        colorMid: 'rgba(245, 158, 11, 0.12)'
      },
      {
        x: Math.random(),
        y: Math.random(),
        vx: -0.0012,
        vy: 0.0015,
        baseRadius: 0.36,
        color: 'rgba(139, 92, 246, 0.40)', // Vibrant Violet
        colorMid: 'rgba(139, 92, 246, 0.15)'
      },
      {
        x: Math.random(),
        y: Math.random(),
        vx: 0.0014,
        vy: -0.0014,
        baseRadius: 0.32,
        color: 'rgba(16, 185, 129, 0.32)', // Emerald Green
        colorMid: 'rgba(16, 185, 129, 0.10)'
      }
    ];
    
    const animate = () => {
      // Clear transparently to allow blending with the document background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const maxDim = Math.max(canvas.width, canvas.height);
      
      blobs.forEach(b => {
        // Move blobs with slow physics
        b.x += b.vx;
        b.y += b.vy;
        
        // Bounce on boundaries
        if (b.x < 0 || b.x > 1) b.vx *= -1;
        if (b.y < 0 || b.y > 1) b.vy *= -1;
        
        // Dynamic breathing scale for organic feel
        const time = Date.now() * 0.0026;
        const breathScale = 1.0 + Math.sin(time + b.x * 10) * 0.12;
        const radius = b.baseRadius * maxDim * breathScale;
        
        const px = b.x * canvas.width;
        const py = b.y * canvas.height;
        
        // Draw the blob as a smooth radial gradient fading to transparent
        const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
        grad.addColorStop(0, b.color);
        grad.addColorStop(0.5, b.colorMid);
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
    <div className="fixed top-0 left-0 right-0 h-[70vh] overflow-hidden pointer-events-none select-none z-0 filter blur-[65px] opacity-90">
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

  const CustomProjectionTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-[#0F172A] border-2 border-slate-700 text-white p-3.5 rounded-2xl shadow-2xl text-[11px] font-bold leading-relaxed z-50">
          <p className="font-extrabold uppercase text-[8.5px] tracking-widest text-slate-400 mb-1.5">🔮 Projected Defects</p>
          <p className="font-black text-sm text-slate-150 mb-2">{point.date}</p>
          <div className="flex flex-col gap-1.5 border-t border-slate-800 pt-2.5 mt-1.5">
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-355">Predicted:</span>
              <span className="font-black text-purple-400 text-sm">{point.predicted} Defects</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400">Confidence Range:</span>
              <span className="font-bold text-purple-355">
                [{point.lowerBound} - {point.upperBound}]
              </span>
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

  const getZoneHealthScoreAndColor = (zoneKey) => {
    let deptName = '';
    switch (zoneKey) {
      case 'rmw': deptName = 'Raw Material Warehouse'; break;
      case 'qcmad': deptName = 'QC & Microbiology & AD Lab'; break;
      case 'pop': deptName = 'Post Production'; break;
      case 'pmw': deptName = 'Packing Material Warehouse'; break;
      case 'pro': deptName = 'Production'; break;
      case 'spp': deptName = 'Secondary Packing Production'; break;
      case 'fac': deptName = 'Facilities'; break;
      case 'ppp': deptName = 'Primary Packing Production'; break;
      case 'fgmw': deptName = 'Finished Good Material Warehouse'; break;
      default: deptName = '';
    }

    const stats = getDeptStats(deptName);
    const { totalDefects, highSeverityCount, mediumSeverityCount, lowSeverityCount } = stats;
    const penalty = (highSeverityCount * 15) + (mediumSeverityCount * 7) + (lowSeverityCount * 3);
    const score = Math.max(0, 100 - penalty);

    // Color definitions (DARKER & MORE SATURATED)
    let colorClass = 'from-blue-700/50 to-blue-800/10'; // Deep Blue (Optimal)
    let dotColor = 'bg-blue-700';
    let statusText = 'Optimal';
    let legendColor = '#1D4ED8';
    let glowColor = 'rgba(29, 78, 216, 0.65)'; // Rich dark blue glow

    if (score < 50) {
      colorClass = 'from-red-700/60 to-red-900/10'; // Dark Red (High Error)
      dotColor = 'bg-red-700';
      statusText = 'High Error';
      legendColor = '#B91C1C';
      glowColor = 'rgba(185, 28, 28, 0.70)'; // Darker Red
    } else if (score < 80) {
      colorClass = 'from-amber-600/55 to-amber-700/10'; // Dark Yellow/Amber (Moderate Error)
      dotColor = 'bg-amber-600';
      statusText = 'Moderate Error';
      legendColor = '#D97706';
      glowColor = 'rgba(217, 119, 6, 0.65)'; // Darker Yellow
    } else if (score < 95) {
      colorClass = 'from-emerald-700/60 to-emerald-800/10'; // Dark Green (Low Error)
      dotColor = 'bg-emerald-700';
      statusText = 'Low Error';
      legendColor = '#047857';
      glowColor = 'rgba(4, 120, 87, 0.65)'; // Darker Green
    } else if (score < 99) {
      colorClass = 'from-cyan-700/55 to-cyan-800/10'; // Dark Cyan (Optimal/Cyan)
      dotColor = 'bg-cyan-700';
      statusText = 'Optimal';
      legendColor = '#0891B2';
      glowColor = 'rgba(8, 145, 178, 0.65)'; // Darker Cyan
    }

    return {
      score,
      colorClass,
      dotColor,
      statusText,
      legendColor,
      glowColor,
      stats
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
  
  const forecastPoints = data.filter(d => d.isForecast);
  const totalProjectedErrors = Math.round(forecastPoints.reduce((sum, d) => sum + (d.predicted || 0), 0));
  
  // Calculate standard deviation of historical daily defect counts
  const histPoints = data.filter(d => !d.isForecast);
  const histCount = histPoints.length || 60;
  const histMean = totalHistoricalErrors / histCount;
  const histVariance = histPoints.reduce((sum, d) => sum + Math.pow((d.actual || 0) - histMean, 2), 0) / histCount;
  const histSD = Math.max(0.5, Math.sqrt(histVariance));
  
  // Standard error scaled for the 40-day projection period
  const sumSD = histSD * Math.sqrt(40);
  
  const totalLowerBound = Math.max(0, Math.round(totalProjectedErrors - sumSD));
  const totalUpperBound = Math.round(totalProjectedErrors + sumSD);

  const getPotentialCount = (isForecast) => {
    const days = isForecast ? 40 : 60;
    const depts = selectedDept === 'Overall' ? DEPARTMENTS_LIST.length : 1;
    const shifts = selectedShift === 'Overall' ? SHIFTS_LIST.length : 1;
    return days * depts * shifts;
  };
  const potentialHist = getPotentialCount(false);
  const potentialProj = getPotentialCount(true);
  const historicalPercentage = potentialHist > 0 ? (Math.min(100, (totalHistoricalErrors / potentialHist) * 100)).toFixed(1) + "%" : "0.0%";
  const projectedPercentage = potentialProj > 0 ? (Math.min(100, (totalProjectedErrors / potentialProj) * 100)).toFixed(1) + "%" : "0.0%";

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

  const getCategory = (errorType) => {
    const err = (errorType || '').toLowerCase();
    if (err.includes('breakdown') || err.includes('power') || err.includes('no power')) {
      return 'downtime';
    }
    if (err.includes('manpower') || err.includes('no manpower')) {
      return 'manpower';
    }
    if (err.includes('reject') || err.includes('quality reject')) {
      return 'reject';
    }
    if (err.includes('safety') || err.includes('incident') || err.includes('miss') || err.includes('unsafe')) {
      return 'safety';
    }
    if (err.includes('meeting') || err.includes('huddle') || err.includes('attendance')) {
      return 'health';
    }
    return 'other';
  };

  const processedHistoricalData = DEPARTMENTS_LIST.map(deptName => {
    const counts = {
      downtime: 0,
      manpower: 0,
      reject: 0,
      safety: 0,
      health: 0,
      other: 0,
    };

    data.filter(point => !point.isForecast).forEach(point => {
      if (point.logs && point.logs.length > 0) {
        point.logs.forEach(log => {
          const logDept = DEPT_MAP[log.station] || log.department;
          if (logDept === deptName) {
            const cat = getCategory(log.errorType);
            counts[cat] += 1;
          }
        });
      }
    });

    const deptStats = getDeptStats(deptName);
    const totalDefects = Object.values(counts).reduce((sum, v) => sum + v, 0);
    if (totalDefects === 0 && deptStats && deptStats.totalDefects > 0) {
      const fallbackCat = selectedPillar === 'Quality' ? 'reject' :
                          selectedPillar === 'Safety' ? 'safety' :
                          selectedPillar === 'Health' ? 'health' : 'other';
      counts[fallbackCat] = deptStats.totalDefects;
    }

    return {
      name: DEPT_ABBR[deptName] || deptName,
      fullName: deptName,
      ...counts
    };
  });

  const potentialDailyCount = (selectedDept === 'Overall' ? DEPARTMENTS_LIST.length : 1) * (selectedShift === 'Overall' ? SHIFTS_LIST.length : 1);

  const forecastDataWithRates = data
    .filter(point => point.isForecast)
    .map(point => {
      return {
        date: point.date,
        predicted: parseFloat(point.predicted.toFixed(2)),
        lowerBound: parseFloat(point.lowerBound.toFixed(2)),
        upperBound: parseFloat(point.upperBound.toFixed(2)),
      };
    });

  return (
    <div className="min-h-screen bg-white pb-12 font-sans selection:bg-emerald-100 selection:text-emerald-900 relative overflow-x-hidden">
      <CosmicHeaderBackground />
      
      {/* Top Header */}
      <div className="bg-white/40 border-b border-slate-200/50 relative z-40 px-6 py-2.5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <button 
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-700 hover:text-slate-900 transition mb-1"
            >
              <ChevronLeft size={13} /> Return Dashboard Focus
            </button>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Activity className="text-indigo-500 animate-pulse" size={24} /> 
              Predictive Defect Forecasting Hub
            </h1>
            <p className="text-xs text-slate-650 font-bold uppercase tracking-widest mt-0.5">
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
      <div className="bg-white/60 border-b border-slate-200/50 py-3.5 px-6 sticky top-[69px] z-30 shadow-xs backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-6 text-xs">
          
          {/* Department selector */}
          <div className="flex flex-col gap-1">
            <label className="font-extrabold uppercase tracking-widest text-[9px] text-slate-700">Operational Department</label>
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
            <label className="font-extrabold uppercase tracking-widest text-[9px] text-slate-700">Defect Pillar Focus</label>
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
            <label className="font-extrabold uppercase tracking-widest text-[9px] text-slate-700">Active Shift Log</label>
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
            <label className="font-extrabold uppercase tracking-widest text-[9px] text-slate-700 text-center">Visual Node Map</label>
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
          {/* Bento-grid space optimized dashboard container */}
          <div className="max-w-7xl mx-auto px-6 mt-8 flex flex-col gap-8 relative z-10 animate-in fade-in duration-500">
            
            {/* ROW 1: Sleek Summary KPI Strip (4 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Historical Summary Card */}
              <div className="backdrop-blur-md bg-white/25 border border-white/40 shadow-lg rounded-3xl p-5 transition duration-300 hover:scale-102 hover:shadow-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest block mb-1.5">Historical Defects (60 Days)</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 tracking-tight">{totalHistoricalErrors}</span>
                    <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Defects</span>
                  </div>
                </div>
                
                <div className="bg-white/50 border border-white/30 rounded-2xl p-2.5 mt-4 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-650 uppercase tracking-wider text-[8.5px]">Average Daily Rate</span>
                  <span className="font-black text-slate-800 bg-white/95 px-2.5 py-0.5 rounded-lg border border-slate-300/40">{(totalHistoricalErrors / 60).toFixed(1)} / Day</span>
                </div>
                
                <p className="text-[9.5px] text-slate-600 font-bold leading-normal mt-3 border-t pt-2.5 border-slate-200/60">
                  Last 60 Days: {totalHistoricalErrors} Errors | {concentrationPercentage}% in {maxDeptName}
                </p>
              </div>

              {/* Future Projections Card */}
              <div className="backdrop-blur-md bg-white/25 border border-white/40 shadow-lg rounded-3xl p-5 transition duration-300 hover:scale-102 hover:shadow-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest block mb-1.5">Projected Defects (40 Days)</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 tracking-tight">~{totalProjectedErrors}</span>
                    <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Defects</span>
                  </div>
                </div>

                <div className="bg-white/50 border border-white/30 rounded-2xl p-2.5 mt-4 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-650 uppercase tracking-wider text-[8.5px]">Estimated range</span>
                  <span className="font-black text-slate-800 bg-white/95 px-2.5 py-0.5 rounded-lg border border-slate-300/40">~{totalLowerBound} to {totalUpperBound} errors</span>
                </div>

                <div className="mt-3 border-t pt-2.5 border-slate-200/60 flex items-center justify-between">
                  <span className="text-[9.5px] text-slate-600 font-bold">Trend Expectation:</span>
                  {totalProjectedErrors > (totalHistoricalErrors * 0.5) || totalProjectedErrors > 25 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase bg-rose-500/10 text-rose-700 border border-rose-250/20">
                      ⚠️ Alert / High Risk
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase bg-emerald-500/10 text-emerald-700 border border-emerald-250/20">
                      🟢 Stable / Safe
                    </span>
                  )}
                </div>
              </div>

              {/* ML Engine Status */}
              <div className="backdrop-blur-md bg-white/25 border border-white/40 shadow-lg rounded-3xl p-5 transition duration-300 hover:scale-102 hover:shadow-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest block mb-2">Forecasting Engine Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-3 h-3 rounded-full ${mlServiceStatus === 'online' ? 'bg-emerald-500 animate-pulse shadow-md shadow-emerald-450/40' : 'bg-amber-500'}`} />
                    <span className="text-sm font-black uppercase tracking-tight text-slate-900">
                      {mlServiceStatus === 'online' ? 'AI Prophet Engine' : 'Local Fallback'}
                    </span>
                  </div>
                </div>

                <div className="bg-white/50 border border-white/30 rounded-2xl p-2.5 mt-4 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-650 uppercase tracking-wider text-[8.5px]">Precision Level</span>
                  <span className="font-black text-slate-800 bg-white/95 px-2.5 py-0.5 rounded-lg border border-slate-300/40 uppercase text-[9px]">
                    {mlServiceStatus === 'online' ? 'High Accuracy' : 'Standard Linear'}
                  </span>
                </div>

                <p className="text-[9.5px] text-slate-600 font-bold leading-normal mt-3 border-t pt-2.5 border-slate-200/60">
                  {mlServiceStatus === 'online' 
                    ? "AI Prophet modeling activated, forecasting based on historical weekly patterns." 
                    : "Operating on linear extrapolation using the past 30-day velocity vectors."}
                </p>
              </div>

              {/* Smart Recommendation Card */}
              <div className="backdrop-blur-md bg-white/25 border border-amber-250/40 shadow-lg rounded-3xl p-5 transition duration-300 hover:scale-102 hover:shadow-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                    <Zap size={12} className="text-amber-500 animate-pulse" /> AI Action Plan
                  </span>
                  <p className="text-[11px] text-slate-700 font-bold leading-normal">
                    {rec.recommendation}
                  </p>
                </div>
                <p className="text-[9.5px] text-amber-800 font-black leading-normal mt-3 border-t pt-2.5 border-amber-200/30">
                  Target: Reduce {maxDeptName} Defects
                </p>
              </div>

            </div>

            {/* ROW 2: Live Factory Floor Heatmap & Risk Matrices (2 Columns: 2/3 and 1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Left Container (2/3): Heatmap Blueprint */}
              <div className="lg:col-span-2 bg-white/85 backdrop-blur-md border border-slate-200/80 rounded-[2.5rem] p-6 shadow-xs flex flex-col gap-4">
                <div className="mb-2">
                  <h2 className="text-sm font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                    <Layers className="text-indigo-600" size={16} />
                    Live Factory Floor Heatmap Blueprint
                  </h2>
                  <p className="text-[10px] text-slate-700 font-bold uppercase tracking-wider mt-0.5">
                    Overhead blueprint layout displaying operational risk zones and real-time department health scores
                  </p>
                </div>
                
                {/* Overhead Map Grid */}
                <div className="w-full relative aspect-[800/600] max-h-[520px] border border-slate-300 rounded-[2.5rem] bg-[#EFF2F5] overflow-visible p-0">
                  {/* SVG Blueprint Layer */}
                  <svg viewBox="0 0 800 600" className="absolute inset-0 w-full h-full pointer-events-none z-10 text-slate-455 select-none">
                    {/* Outer perimeter double walls */}
                    <rect x="10" y="10" width="780" height="580" stroke="#334155" strokeWidth="2.5" fill="none" />
                    <rect x="14" y="14" width="772" height="572" stroke="#334155" strokeWidth="1" fill="none" strokeDasharray="6 3" />

                    {/* Technical Axis Gridlines */}
                    <line x1="210" y1="10" x2="210" y2="590" stroke="#94A3B8" strokeWidth="0.6" strokeDasharray="4 4" />
                    <line x1="590" y1="10" x2="590" y2="590" stroke="#94A3B8" strokeWidth="0.6" strokeDasharray="4 4" />
                    
                    <line x1="10" y1="210" x2="790" y2="210" stroke="#94A3B8" strokeWidth="0.6" strokeDasharray="4 4" />
                    <line x1="10" y1="390" x2="790" y2="390" stroke="#94A3B8" strokeWidth="0.6" strokeDasharray="4 4" />

                    {/* Room Wall Dividers (Asymmetric Industrial Floor Plan Layout) */}
                    <line x1="14" y1="310" x2="210" y2="310" stroke="#334155" strokeWidth="3" />
                    <line x1="210" y1="210" x2="590" y2="210" stroke="#334155" strokeWidth="3" />
                    <line x1="410" y1="14" x2="410" y2="210" stroke="#334155" strokeWidth="3" />
                    <line x1="210" y1="450" x2="590" y2="450" stroke="#334155" strokeWidth="3" />
                    <line x1="390" y1="450" x2="390" y2="586" stroke="#334155" strokeWidth="3" />
                    <line x1="590" y1="200" x2="786" y2="200" stroke="#334155" strokeWidth="3" />
                    <line x1="590" y1="390" x2="786" y2="390" stroke="#334155" strokeWidth="3" />

                    {/* Structural Steel Columns */}
                    <rect x="206" y="206" width="8" height="8" fill="#334155" />
                    <rect x="206" y="306" width="8" height="8" fill="#334155" />
                    <rect x="206" y="446" width="8" height="8" fill="#334155" />
                    <rect x="586" y="196" width="8" height="8" fill="#334155" />
                    <rect x="586" y="386" width="8" height="8" fill="#334155" />
                    <rect x="586" y="446" width="8" height="8" fill="#334155" />

                    {/* Cargo Loading Bay Gates */}
                    <line x1="10" y1="80" x2="10" y2="150" stroke="#475569" strokeWidth="4.5" />
                    <text x="22" y="120" fontSize="7.5" fill="#475569" fontWeight="black" fontFamily="monospace">INBOUND DOCK 01</text>
                    <line x1="10" y1="380" x2="10" y2="450" stroke="#475569" strokeWidth="4.5" />
                    <text x="22" y="420" fontSize="7.5" fill="#475569" fontWeight="black" fontFamily="monospace">INBOUND DOCK 02</text>
                    <line x1="790" y1="440" x2="790" y2="510" stroke="#475569" strokeWidth="4.5" />
                    <text x="778" y="480" fontSize="7.5" fill="#475569" fontWeight="black" fontFamily="monospace" textAnchor="end">OUTBOUND DOCK 03</text>

                    {/* Door Swing Blueprint Arcs */}
                    <path d="M 210 110 A 25 25 0 0 1 235 85" stroke="#475569" strokeWidth="1.2" fill="none" />
                    <line x1="210" y1="110" x2="210" y2="85" stroke="#334155" strokeWidth="2.5" />
                    <path d="M 210 380 A 25 25 0 0 1 235 355" stroke="#475569" strokeWidth="1.2" fill="none" />
                    <line x1="210" y1="380" x2="210" y2="355" stroke="#334155" strokeWidth="2.5" />
                    <path d="M 410 110 A 25 25 0 0 1 435 85" stroke="#475569" strokeWidth="1.2" fill="none" />
                    <line x1="410" y1="110" x2="410" y2="85" stroke="#334155" strokeWidth="2.5" />
                    <path d="M 480 210 A 25 25 0 0 0 505 185" stroke="#475569" strokeWidth="1.2" fill="none" />
                    <line x1="480" y1="210" x2="505" y2="210" stroke="#334155" strokeWidth="2.5" />
                    <path d="M 590 300 A 25 25 0 0 1 615 275" stroke="#475569" strokeWidth="1.2" fill="none" />
                    <line x1="590" y1="300" x2="590" y2="275" stroke="#334155" strokeWidth="2.5" />
                    <path d="M 390 520 A 25 25 0 0 1 415 495" stroke="#475569" strokeWidth="1.2" fill="none" />
                    <line x1="390" y1="520" x2="390" y2="495" stroke="#334155" strokeWidth="2.5" />
                    <path d="M 690 390 A 25 25 0 0 1 715 365" stroke="#475569" strokeWidth="1.2" fill="none" />
                    <line x1="690" y1="390" x2="715" y2="390" stroke="#334155" strokeWidth="2.5" />

                    {/* Internal Blueprint Details & Equipment Symbols */}
                    <rect x="40" y="40" width="30" height="100" stroke="#64748B" strokeWidth="1" fill="none" strokeDasharray="2 2" />
                    <rect x="40" y="160" width="30" height="100" stroke="#64748B" strokeWidth="1" fill="none" strokeDasharray="2 2" />
                    <line x1="40" y1="80" x2="70" y2="80" stroke="#64748B" strokeWidth="0.6" />
                    <line x1="40" y1="200" x2="70" y2="200" stroke="#64748B" strokeWidth="0.6" />
                    <rect x="120" y="340" width="60" height="30" stroke="#64748B" strokeWidth="1" fill="none" strokeDasharray="2 2" />
                    <rect x="120" y="400" width="60" height="30" stroke="#64748B" strokeWidth="1" fill="none" strokeDasharray="2 2" />
                    <rect x="120" y="460" width="60" height="30" stroke="#64748B" strokeWidth="1" fill="none" strokeDasharray="2 2" />
                    <rect x="235" y="40" width="40" height="30" stroke="#64748B" strokeWidth="1.2" fill="none" />
                    <circle cx="255" cy="55" r="5" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <rect x="330" y="40" width="50" height="40" stroke="#64748B" strokeWidth="1" fill="none" />
                    <line x1="330" y1="60" x2="380" y2="60" stroke="#64748B" strokeWidth="0.8" />
                    <text x="500" y="50" fontSize="8" fill="#475569" fontWeight="black" textAnchor="middle" fontFamily="monospace">CLEAN CORRIDOR</text>
                    <text x="500" y="62" fontSize="6.5" fill="#64748B" fontWeight="bold" textAnchor="middle" fontFamily="monospace">ISO CLASS 7 / 10,000</text>
                    <circle cx="480" cy="130" r="12" stroke="#64748B" strokeWidth="0.8" fill="none" strokeDasharray="2 2" />
                    <circle cx="520" cy="130" r="12" stroke="#64748B" strokeWidth="0.8" fill="none" strokeDasharray="2 2" />
                    <text x="500" y="152" fontSize="6.5" fill="#64748B" fontWeight="bold" textAnchor="middle" fontFamily="monospace">AIR SHOWER</text>
                    <rect x="235" y="235" width="45" height="30" rx="2" stroke="#64748B" strokeWidth="1" fill="none" />
                    <text x="257" y="253" fontSize="7.5" fill="#64748B" fontWeight="bold" textAnchor="middle" fontFamily="monospace">CNC-1</text>
                    <rect x="320" y="235" width="45" height="30" rx="2" stroke="#64748B" strokeWidth="1" fill="none" />
                    <text x="342" y="253" fontSize="7.5" fill="#64748B" fontWeight="bold" textAnchor="middle" fontFamily="monospace">CNC-2</text>
                    <rect x="235" y="340" width="320" height="20" rx="3" stroke="#475569" strokeWidth="1.5" fill="none" />
                    <circle cx="260" cy="350" r="5" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <circle cx="310" cy="350" r="5" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <circle cx="360" cy="350" r="5" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <circle cx="410" cy="350" r="5" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <circle cx="460" cy="350" r="5" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <circle cx="510" cy="350" r="5" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <circle cx="280" cy="320" r="4" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <circle cx="420" cy="320" r="4" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <circle cx="280" cy="510" r="14" stroke="#64748B" strokeWidth="1.2" fill="none" />
                    <path d="M 280 450 L 280 496" stroke="#64748B" strokeWidth="1.5" fill="none" />
                    <rect x="420" y="480" width="60" height="60" stroke="#64748B" strokeWidth="1.2" fill="none" strokeDasharray="3 3" />
                    <path d="M 450 490 L 440 510 L 450 510 L 440 530" stroke="#64748B" strokeWidth="1" fill="none" />
                    <rect x="500" y="475" width="70" height="35" stroke="#64748B" strokeWidth="1.2" fill="none" />
                    <circle cx="518" cy="492" r="10" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <circle cx="552" cy="492" r="10" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <rect x="630" y="40" width="35" height="35" stroke="#64748B" strokeWidth="1.2" fill="none" />
                    <circle cx="647" cy="57" r="8" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <path d="M 647 40 L 647 49" stroke="#64748B" strokeWidth="0.8" />
                    <rect x="630" y="100" width="130" height="80" rx="3" stroke="#64748B" strokeWidth="1" fill="none" strokeDasharray="1 3" />
                    <text x="695" y="145" fontSize="8" fill="#475569" fontWeight="black" textAnchor="middle" fontFamily="monospace">POST PACKING STORAGE</text>
                    <rect x="630" y="240" width="50" height="40" rx="2" stroke="#64748B" strokeWidth="1" fill="none" />
                    <rect x="700" y="240" width="50" height="40" rx="2" stroke="#64748B" strokeWidth="1" fill="none" />
                    <path d="M 630 350 H 760" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 2" />
                    <rect x="630" y="430" width="130" height="80" rx="4" stroke="#64748B" strokeWidth="1" fill="none" />
                    <text x="695" y="475" fontSize="8" fill="#475569" fontWeight="black" textAnchor="middle" fontFamily="monospace">FINISHED SHIPPING BAY</text>
                    <rect x="625" y="530" width="15" height="15" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <rect x="650" y="530" width="15" height="15" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <rect x="675" y="530" width="15" height="15" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <rect x="700" y="530" width="15" height="15" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <rect x="725" y="530" width="15" height="15" stroke="#64748B" strokeWidth="0.8" fill="none" />
                    <text x="85" y="195" fontSize="8.5" fontFamily="monospace" fill="#475569" fontWeight="bold">OCCUPANCY S-1</text>
                    <text x="350" y="200" fontSize="8.5" fontFamily="monospace" fill="#475569" fontWeight="bold">OCCUPANCY F-1</text>
                    <text x="608" y="320" fontSize="7.5" fontFamily="monospace" fill="#475569" fontWeight="bold" transform="rotate(-90 608 320)">OCCUPANCY F-1*</text>
                  </svg>

                  {/* Heatmap Zones Overlays */}
                  {[
                    // Left column
                    { key: 'rmw', label: 'RAW MATERIAL\nWAREHOUSE', style: { left: '1.5%', top: '1.8%', width: '25%', height: '50%' } },
                    { key: 'pmw', label: 'PACKING MATERIAL\nWAREHOUSE', style: { left: '1.5%', top: '51.8%', width: '25%', height: '46.5%' } },
                    
                    // Center column
                    { key: 'qcmad', label: 'QC & MICROBIOLOGY\n& AD LAB', style: { left: '26.5%', top: '1.8%', width: '25%', height: '33.5%' } },
                    { key: 'pro', label: 'PRODUCTION', style: { left: '26.5%', top: '35%', width: '47.5%', height: '40%' } },
                    { key: 'ppp', label: 'PRIMARY PACKING\nPRODUCTION', style: { left: '26.5%', top: '75%', width: '22.5%', height: '23.2%' } },
                    { key: 'fac', label: 'FACILITIES', style: { left: '49%', top: '75%', width: '25%', height: '23.2%' } },
                    
                    // Right column
                    { key: 'pop', label: 'POST PRODUCTION', style: { left: '74%', top: '1.8%', width: '24.5%', height: '31.5%' } },
                    { key: 'spp', label: 'SECONDARY PACKING\nPRODUCTION', style: { left: '74%', top: '33.5%', width: '24.5%', height: '31.5%' } },
                    { key: 'fgmw', label: 'FINISHED GOOD\nMATERIAL WAREHOUSE', style: { left: '74%', top: '65%', width: '24.5%', height: '33.2%' } }
                  ].map((zone) => {
                    const { score, glowColor, stats } = getZoneHealthScoreAndColor(zone.key);
                    const zoneDeptName = {
                      rmw: 'Raw Material Warehouse',
                      qcmad: 'QC & Microbiology & AD Lab',
                      pop: 'Post Production',
                      pmw: 'Packing Material Warehouse',
                      pro: 'Production',
                      spp: 'Secondary Packing Production',
                      fac: 'Facilities',
                      ppp: 'Primary Packing Production',
                      fgmw: 'Finished Good Material Warehouse'
                    }[zone.key];
                    
                    const isAnyDeptSelected = selectedDept !== 'Overall';
                    const isSelected = isAnyDeptSelected && selectedDept === zoneDeptName;
                    const isUnselected = isAnyDeptSelected && selectedDept !== zoneDeptName;

                    return (
                      <div 
                        key={zone.key}
                        style={zone.style}
                        className={`absolute cursor-help group transition-all duration-500 hover:z-50 ${
                          isSelected 
                            ? 'scale-105 z-30 opacity-100 ring-4 ring-indigo-600/80 shadow-2xl rounded-2xl bg-white/10' 
                            : isUnselected 
                              ? 'opacity-25 blur-[1px] pointer-events-none z-10' 
                              : 'opacity-100 z-20'
                        }`}
                      >
                        {/* Gradient Heat Glow */}
                        <div 
                          style={{
                            background: `radial-gradient(circle, ${glowColor} 0%, rgba(239, 242, 245, 0) 75%)`
                          }}
                          className="absolute inset-0 transition-all duration-300 group-hover:scale-[1.03] group-hover:opacity-95"
                        />

                        {/* Room Label */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                          <div className="text-[#0B132B] font-extrabold text-[10px] sm:text-[13px] md:text-[15px] lg:text-[18px] xl:text-[20px] uppercase tracking-wider text-center leading-tight drop-shadow-[0_1.5px_2px_rgba(255,255,255,0.95)] font-sans">
                            {zone.label.split('\n').map((line, idx) => (
                              <div key={idx}>{line}</div>
                            ))}
                          </div>
                        </div>

                        {/* Tooltip on Hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-30 border border-slate-700/60 text-left">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">{zone.key.toUpperCase()} Zone Details</span>
                            <span className="text-[9.5px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded">Score: {score}%</span>
                          </div>
                          <div className="text-[10px] space-y-1 font-bold text-slate-300">
                            <div>Total defects: <span className="text-white font-black">{stats.totalDefects}</span></div>
                            <div>Primary cause: <span className="text-emerald-400 font-black truncate max-w-[130px] inline-block align-bottom">{stats.primaryErrorType}</span></div>
                            <div className="grid grid-cols-3 gap-1 mt-2 text-[8px] bg-slate-950/60 p-1.5 rounded-lg text-center border border-slate-800/80 font-black">
                              <span className="text-rose-400">High: {stats.highSeverityCount}</span>
                              <span className="text-amber-400 font-medium">Med: {stats.mediumSeverityCount}</span>
                              <span className="text-emerald-400">Low: {stats.lowSeverityCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Horizontal Operational Health color legend */}
                <div className="bg-white border border-slate-200/80 p-4 rounded-[2rem] shadow-xs select-none">
                  <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-2 font-mono">
                    OPERATIONAL HEALTH
                  </div>
                  
                  {/* Segmented bar */}
                  <div className="grid grid-cols-5 h-7 border border-slate-300 overflow-hidden rounded-lg">
                    <div className="bg-[#B91C1C] h-full" />
                    <div className="bg-[#D97706] h-full" />
                    <div className="bg-[#047857] h-full" />
                    <div className="bg-[#0891B2] h-full" />
                    <div className="bg-[#1D4ED8] h-full" />
                  </div>
                  
                  {/* Labels matching exactly */}
                  <div className="grid grid-cols-5 text-[8.5px] font-black uppercase text-slate-700 tracking-wider text-center mt-2 font-mono leading-normal">
                    <div>HIGH ERROR</div>
                    <div>MODERATE ERROR</div>
                    <div>LOW ERROR</div>
                    <div>OPTIMAL</div>
                    <div className="px-1 text-[7.5px] leading-tight">
                      EXTREMELY LOW ERROR RATE<br />/ HIGH SUCCESS (Optimal)
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Container (1/3): Station Risks & Reliability */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                
                {/* Info explanatory element */}
                <div className="bg-white/85 backdrop-blur-md border border-slate-200/60 rounded-[2rem] p-5 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-700 uppercase tracking-widest">
                    <Gauge size={14} className="text-slate-500" /> Model Reliability Index
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold text-slate-600">Sample Count (Days)</span>
                    <span className="font-black text-slate-800 text-xs">91 Days actual</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold text-slate-600">Prediction Scope</span>
                    <span className="font-black text-emerald-600 text-xs">10 Days projected</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Reliability Grade</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[9px] rounded-lg border border-emerald-200/40 uppercase">
                      High Accuracy
                    </span>
                  </div>
                </div>

                {/* Risk Warnings Board */}
                <div className="bg-white/85 backdrop-blur-md border border-slate-200/80 rounded-[2.5rem] p-6 shadow-xs flex flex-col gap-4">
                  <div>
                    <h2 className="text-sm font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="text-rose-600" size={17} /> 
                      Stations Risk Matrix
                    </h2>
                    <p className="text-[10px] text-slate-700 font-bold uppercase tracking-wider">Defect density rank & mitigation recommendations</p>
                  </div>

                  {/* Stations listing */}
                  <div className="flex flex-col gap-3 overflow-y-auto max-h-[340px] pr-1">
                    {stations.length === 0 ? (
                      <p className="text-xs text-slate-600 font-bold italic py-4">No active risk metrics reported for this filter context.</p>
                    ) : (
                      stations.map((item) => (
                        <div 
                          key={item.stationId} 
                          onClick={() => setSelectedStation(item)}
                          className="p-3.5 bg-white/70 border border-slate-150/80 rounded-2xl flex flex-col gap-2 relative hover:border-emerald-250 hover:bg-emerald-50/20 transition-all duration-300 cursor-pointer shadow-xs active:scale-98 text-left"
                          title={
                            item.riskLevel === 'Critical' 
                              ? "Critical rating is triggered because high frequency of critical/high-severity defects logged on this line."
                              : item.riskLevel === 'High' 
                                ? "High rating is triggered due to cumulative defect logs exceeding 15 or high severity counts exceeding 3." 
                                : "Station reports nominal variations within standard quality limits."
                          }
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-black text-slate-800 uppercase">{item.stationId}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border cursor-help ${
                              item.riskLevel === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-150' :
                              item.riskLevel === 'High' ? 'bg-amber-50 text-amber-600 border-amber-150' :
                              'bg-slate-50 text-slate-550 border-slate-200'
                            }`}>
                              {item.riskLevel}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-bold">
                            <div>Total Defects: <span className="text-slate-850 font-black">{item.totalDefects}</span></div>
                            <div className="text-right">Primary: <span className="text-emerald-600 font-black truncate max-w-[80px] inline-block align-bottom">{item.primaryErrorType}</span></div>
                          </div>

                          <div className="hidden group-hover:block text-[9px] text-slate-600 bg-white border border-emerald-100/50 p-2 rounded-xl mt-1.5 leading-normal animate-scale-up font-medium">
                            <span className="font-extrabold text-[8px] uppercase tracking-widest text-emerald-655 block mb-0.5">Recommended Action:</span>
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

            {/* ROW 3: Deep Analytics Charts (2 Columns: 2/3 and 1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Container (2/3): Stacked Bar Chart */}
              <div className="lg:col-span-2">
                <div className="bg-white/85 backdrop-blur-md border border-slate-200/80 rounded-[2.5rem] p-6 shadow-xs flex flex-col gap-4">
                  <div className="mb-2">
                    <h2 className="text-sm font-black uppercase text-slate-900 tracking-wider">Defect Trend & Error Distribution</h2>
                    <p className="text-[10px] text-slate-700 font-bold uppercase tracking-wider">60-day historical observations broken down by error classification</p>
                  </div>

                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={processedHistoricalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#64748B" 
                          fontSize={9}
                          fontWeight="bold"
                          tickLine={false}
                          axisLine={false}
                          dy={8}
                        />
                        <YAxis 
                          stroke="#64748B" 
                          fontSize={9}
                          fontWeight="bold"
                          tickLine={false}
                          axisLine={false}
                          dx={-8}
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const point = payload[0].payload;
                              return (
                                <div className="bg-[#0F172A] border border-slate-800 text-white p-3.5 rounded-2xl shadow-xl text-[10px] font-bold leading-normal text-left">
                                  <p className="font-extrabold uppercase text-[7.5px] tracking-widest text-slate-400 mb-1">{point.fullName}</p>
                                  <div className="space-y-1.5 border-t border-slate-800 pt-1.5 mt-1">
                                    {payload.map((p, i) => (
                                      <div key={i} className="flex justify-between items-center gap-4">
                                        <span className="text-slate-400 font-semibold">{p.name}:</span>
                                        <span style={{ color: p.color }} className="font-black">{p.value} Errors</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          height={36} 
                          iconType="circle" 
                          iconSize={8}
                          wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        />
                        <Bar dataKey="downtime" name="Machine & Power Downtime" stackId="a" fill="#F43F5E" />
                        <Bar dataKey="manpower" name="Manpower Shortage" stackId="a" fill="#F59E0B" />
                        <Bar dataKey="reject" name="Quality Reject" stackId="a" fill="#3B82F6" />
                        <Bar dataKey="safety" name="Safety Incident" stackId="a" fill="#EF4444" />
                        <Bar dataKey="health" name="Health & Attendance" stackId="a" fill="#8B5CF6" />
                        <Bar dataKey="other" name="Other issues" stackId="a" fill="#94A3B8" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Right Container (1/3): Line Chart */}
              <div className="lg:col-span-1">
                <div className="bg-white/85 backdrop-blur-md border border-slate-200/80 rounded-[2.5rem] p-6 shadow-xs flex flex-col gap-4">
                  <div className="mb-2 flex justify-between items-start">
                    <div>
                      <h2 className="text-sm font-black uppercase text-slate-900 tracking-wider">40-Day Projection</h2>
                      <p className="text-[10px] text-slate-700 font-bold uppercase tracking-wider">Defect count forecast and expected range</p>
                    </div>
                  </div>

                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={forecastDataWithRates} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
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
                        <Tooltip content={<CustomProjectionTooltip />} />
                        
                        <Area
                          type="monotone"
                          dataKey={(point) => [point.lowerBound, point.upperBound]}
                          stroke="none"
                          fill="url(#confidenceBand)"
                          name="Confidence Interval"
                        />

                        <Line 
                          type="monotone" 
                          dataKey="predicted" 
                          name="Projected Defects"
                          stroke="#8B5CF6" 
                          strokeWidth={3}
                          dot={{ r: 3, fill: '#8B5CF6', strokeWidth: 1, stroke: '#FFFFFF' }}
                          activeDot={{ r: 5, stroke: '#8B5CF6', strokeWidth: 2, fill: '#FFFFFF' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* DEPARTMENTAL ANALYTICAL BREAKDOWN SECTION */}
          <div className="max-w-7xl mx-auto px-6 mt-12 pb-16 relative z-10">
            <div className="border-t border-slate-200/80 pt-8">
              <div className="mb-8">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <BarChart3 className="text-emerald-600" size={20} />
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
                      className="bg-white/85 backdrop-blur-md border border-slate-200/80 rounded-[2rem] p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-emerald-300/80 transition duration-300"
                      title={`Double-click card to view specific logs for ${deptName}`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-start border-b border-slate-150 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                              {getDeptIcon(deptName)}
                            </div>
                            <div>
                              <h3 className="font-black text-slate-850 text-xs uppercase tracking-tight leading-tight max-w-[150px]">{deptName}</h3>
                            </div>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-widest border ${
                            isHighRisk ? 'bg-rose-50 text-rose-600 border-rose-200/60' : 'bg-emerald-55 text-emerald-605 border-emerald-200/60'
                          }`}
                          title={isHighRisk 
                            ? "Action Alert: High frequency of critical/high-severity defects logged on this line."
                            : "Stable: Defect frequencies match historical control limits."
                          }>
                            {isHighRisk ? 'Alert' : 'Stable'}
                          </span>
                        </div>

                        {/* Defect Counter Grid */}
                        <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded-xl text-[9px] text-slate-505 font-bold border border-slate-100">
                          <div>Total: <span className="text-slate-855 font-black block">{stats.totalDefects}</span></div>
                          <div>High: <span className="text-rose-600 font-black block">{stats.highSeverityCount}</span></div>
                          <div className="truncate">Primary: <span className="text-emerald-600 font-black block truncate">{stats.primaryErrorType}</span></div>
                        </div>

                        {/* Descriptions (fully visible, no clipping) */}
                        <div className="flex flex-col gap-3 text-[11px] text-slate-655 leading-relaxed font-medium">
                          <div>
                            <span className="font-black text-slate-855 uppercase tracking-wider text-[8px] block mb-0.5">Historical Observations:</span>
                            <p className="text-slate-500">{details.causes}</p>
                          </div>
                          <div>
                            <span className="font-black text-slate-855 uppercase tracking-wider text-[8px] block mb-0.5">Pillar Metric Rule:</span>
                            <p className="text-emerald-655 font-semibold">{details.rules}</p>
                          </div>
                        </div>
                      </div>

                      {/* Engineering Recommendations in full */}
                      <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/50 text-[11px] mt-2">
                        <span className="font-black text-emerald-800 uppercase tracking-wider text-[8px] block mb-0.5">Proactive Engineering Action:</span>
                        <p className="text-slate-700 font-bold leading-normal">{details.recommendations}</p>
                      </div>

                    </div>
                  );
                })}

              </div>
            </div>
          </div>

          {/* Station Detail Modal Popup */}
          {selectedStation && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                <button 
                  onClick={() => setSelectedStation(null)} 
                  className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 transition-colors outline-none"
                >
                  <X size={20}/>
                </button>
                
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert className="text-emerald-655" size={24} />
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                      Station Risk Details: {selectedStation.stationId}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      Granular Forensics & Root-Cause Mitigation
                    </p>
                  </div>
                </div>

                <div className="space-y-4 border-t border-slate-100 pt-4">
                  {/* Department */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Operational Department</span>
                    <span className="text-sm font-black text-slate-855 uppercase tracking-tight block">
                      {selectedStation.department}
                    </span>
                  </div>

                  {/* Error Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Defects Count</span>
                      <span className="text-2xl font-black text-slate-855">{selectedStation.totalDefects}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Severity Status</span>
                      <span className={`px-2.5 py-0.5 mt-1 rounded-full text-[9px] font-black uppercase tracking-widest border inline-block ${
                        selectedStation.riskLevel === 'Critical' ? 'bg-rose-55 text-rose-600 border-rose-200/60' :
                        selectedStation.riskLevel === 'High' ? 'bg-amber-55 text-amber-600 border-amber-200/60' :
                        'bg-emerald-50 border-emerald-200 text-emerald-600'
                      }`}>
                        {selectedStation.riskLevel}
                      </span>
                    </div>
                  </div>

                  {/* Severity Breakdown */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[8px] font-black text-rose-500 uppercase tracking-wider block mb-0.5">High</span>
                      <span className="text-base font-black text-slate-800">{selectedStation.highSeverityCount}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-wider block mb-0.5">Medium</span>
                      <span className="text-base font-black text-slate-800">{selectedStation.mediumSeverityCount}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-wider block mb-0.5">Low</span>
                      <span className="text-base font-black text-slate-800">{selectedStation.lowSeverityCount}</span>
                    </div>
                  </div>

                  {/* Primary Error Type */}
                  <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-2xl p-4">
                    <span className="text-[9px] font-black text-emerald-650 uppercase tracking-widest block mb-1">Primary Error Type</span>
                    <span className="text-sm font-black text-emerald-700 uppercase tracking-tight block">
                      {selectedStation.primaryErrorType}
                    </span>
                    
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mt-3 mb-1">Reason Chosen As Primary</span>
                    <p className="text-[11px] text-slate-650 font-medium leading-relaxed">
                      This defect type was designated as the primary error reason because it has the highest frequency of occurrences among all recorded logs for this station over the baseline period.
                    </p>
                  </div>

                  {/* Mitigation Action */}
                  <div className="bg-slate-900 border border-slate-855 rounded-2xl p-4">
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
