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

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200/80 sticky top-[73px] z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <button 
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-800 transition mb-1"
            >
              <ChevronLeft size={13} /> Return Dashboard Focus
            </button>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <Activity className="text-emerald-600 animate-pulse" size={24} /> 
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
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-black uppercase tracking-wider rounded-2xl transition flex items-center gap-1.5 border border-slate-200/60"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh Model
            </button>
          </div>
        </div>
      </div>

      {/* FILTER CONTROL BAR */}
      <div className="bg-slate-100 border-b border-slate-200/60 py-3.5 px-6 sticky top-[148px] z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-6 text-xs">
          
          {/* Department selector */}
          <div className="flex flex-col gap-1">
            <label className="font-extrabold uppercase tracking-widest text-[9px] text-slate-500">Operational Department</label>
            <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 py-1.5 px-3 rounded-lg font-bold focus:outline-none focus:border-emerald-400"
            >
              <option value="Overall">Overall (All Departments)</option>
              {DEPARTMENTS_LIST.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Pillar selector */}
          <div className="flex flex-col gap-1">
            <label className="font-extrabold uppercase tracking-widest text-[9px] text-slate-500">Defect Pillar Focus</label>
            <select 
              value={selectedPillar} 
              onChange={(e) => setSelectedPillar(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 py-1.5 px-3 rounded-lg font-bold focus:outline-none focus:border-emerald-400"
            >
              <option value="Overall">Overall (All Pillars)</option>
              {PILLARS_LIST.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Shift selector */}
          <div className="flex flex-col gap-1">
            <label className="font-extrabold uppercase tracking-widest text-[9px] text-slate-500">Active Shift Log</label>
            <select 
              value={selectedShift} 
              onChange={(e) => setSelectedShift(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 py-1.5 px-3 rounded-lg font-bold focus:outline-none focus:border-emerald-400"
            >
              <option value="Overall">Overall (All Shifts)</option>
              {SHIFTS_LIST.map(s => (
                <option key={s} value={s}>Shift {s}</option>
              ))}
            </select>
          </div>

          {/* Track button */}
          <div className="flex flex-col gap-1 items-center">
            <label className="font-extrabold uppercase tracking-widest text-[9px] text-slate-500 text-center">Visual Node Map</label>
            <button
              onClick={() => navigate('/track')}
              className="bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-xs uppercase tracking-wider py-1.5 px-5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm border border-slate-200 hover:border-slate-300 transition w-32"
            >
              <GitFork size={13} /> Track
            </button>
          </div>

          {/* Filter status label */}
          <div className="ml-auto bg-emerald-50 text-emerald-700 border border-emerald-100/60 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
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
          <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT/CENTER COLUMN: Forecasting Chart & Model Info */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              
              {/* Model Summary Cards (Static Inline Descriptions for 100% Visibility) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Rolling Average */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs transition duration-300">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Average Daily Errors</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800">{metrics.rollingAverage}</span>
                    <span className="text-[10px] font-bold text-slate-400">errors/day</span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold leading-normal mt-2.5 border-t pt-2 border-slate-100">
                    The average number of errors logged per day, giving higher weight to the most recent daily reports for current accuracy.
                  </p>
                </div>

                {/* Trend Velocity */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs transition duration-300">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Trend Direction</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl font-black text-slate-800">
                      {metrics.trendVelocity > 0 ? 'Rising (+' : 'Falling ('}{metrics.trendVelocity})
                    </span>
                    {metrics.trendVelocity > 0 ? (
                      <TrendingUp size={16} className="text-rose-500" />
                    ) : (
                      <TrendingDown size={16} className="text-emerald-500" />
                    )}
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold leading-normal mt-2.5 border-t pt-2 border-slate-100">
                    Shows if error frequency is going UP or DOWN. A falling trend means daily defect occurrences are reducing.
                  </p>
                </div>

                {/* Standard Deviation */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs transition duration-300">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Predictability Index</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800">{metrics.standardDeviation}</span>
                    <span className="text-[10px] font-bold text-slate-400">variance σ</span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold leading-normal mt-2.5 border-t pt-2 border-slate-100">
                    Measures how much daily errors fluctuate. A lower variance means operations are consistent and stable.
                  </p>
                </div>

                {/* ML Engine Status */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs transition duration-300">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Forecasting Engine</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${mlServiceStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className="text-xs font-black uppercase tracking-tight text-slate-700">
                      {mlServiceStatus === 'online' ? 'AI Prophet Active' : 'Statistical Fallback'}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold leading-normal mt-2.5 border-t pt-2 border-slate-100">
                    {mlServiceStatus === 'online' 
                      ? "Using advanced Prophet Time-Series AI model to forecast future data points." 
                      : "Operating on local fallback mathematical model using current trend velocities."}
                  </p>
                </div>

              </div>

              {/* Friendly Guide Banner */}
              <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-indigo-100 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-500">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider">Quick Guide: Understanding the Predictive Graph</h4>
                    <p className="text-[10px] text-indigo-900/80 font-semibold leading-relaxed mt-1">
                      This graph lets you anticipate future defect rates to schedule preventative maintenance before problems escalate.
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-[9px] text-indigo-950 font-black uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Past 60 Days: Observed Actuals
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-500" /> Next 40 Days: AI Predictions
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3.5 h-1.5 bg-purple-100 border border-purple-200 rounded" /> Light Purple Band: Fluctuation Range
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-xs border border-indigo-100/50 px-3 py-2 rounded-xl text-[9px] text-indigo-950 font-bold max-w-[210px] leading-normal flex-shrink-0">
                  💡 <span className="font-extrabold uppercase text-indigo-600 tracking-wider">Calibrations Trigger:</span> If the purple forecast line trends above <span className="text-rose-600">2.2 errors/day</span>, look at the Station Risk Table to inspect high-risk stations.
                </div>
              </div>

              {/* Chart Panel */}
              <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-6 shadow-sm">
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <h2 className="text-sm font-black uppercase text-slate-800 tracking-wider">Historical vs Forecast Defect Timeline</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">60 days observed actuals + 40 days machine learning projections</p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Actual Defects
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-purple-650 border-t border-dashed border-purple-650 inline-block" /> Projected Forecast
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-purple-100 border border-purple-200 rounded inline-block" /> 95% Confidence Bounds
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
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#94A3B8" 
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
                        stroke="#94A3B8" 
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
              <div className="bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-xs flex flex-col gap-3">
                <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <Gauge size={14} className="text-slate-500" /> Model Reliability Index
                </div>
                <div className="flex items-center justify-between border-b pb-2.5">
                  <span className="text-xs font-bold text-slate-600">Sample Count (Days)</span>
                  <span className="font-black text-slate-800 text-xs">91 Days actual</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2.5">
                  <span className="text-xs font-bold text-slate-600">Prediction Scope</span>
                  <span className="font-black text-emerald-650 text-xs">10 Days projected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Reliability Grade</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[9px] rounded-lg border border-emerald-200/40 uppercase">
                    95% Confidence
                  </span>
                </div>
              </div>

              {/* Risk Warnings Board */}
              <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-4 flex-1">
                <div>
                  <h2 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="text-rose-600" size={17} /> 
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
                        className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-2 relative hover:border-emerald-250 hover:bg-emerald-50/10 transition-all duration-300 cursor-pointer shadow-xs active:scale-98"
                        title={
                          item.riskLevel === 'Critical' 
                            ? "Critical rating is triggered because high severity defects count has exceeded 8 logs within the 90-day baseline." 
                            : item.riskLevel === 'High' 
                              ? "High rating is triggered due to cumulative defect logs exceeding 15 or high severity counts exceeding 3." 
                              : "Station reports nominal variations within standard quality limits."
                        }
                      >
                        {/* Station Name + Severity Badge with Native Tooltip */}
                        <div className="flex justify-between items-center">
                          <span className="font-black text-xs text-slate-800 uppercase">{item.stationId}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border cursor-help ${
                            item.riskLevel === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-200/60' :
                            item.riskLevel === 'High' ? 'bg-amber-50 text-amber-600 border-amber-200/60' :
                            'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {item.riskLevel}
                          </span>
                        </div>

                        {/* Defect count details */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-bold">
                          <div>Total Defects: <span className="text-slate-800 font-black">{item.totalDefects}</span></div>
                          <div className="text-right">Primary: <span className="text-emerald-600 font-black truncate max-w-[80px] inline-block align-bottom">{item.primaryErrorType}</span></div>
                        </div>

                        {/* Mitigation recommendation text */}
                        <div className="hidden group-hover:block text-[9px] text-slate-655 bg-white border border-emerald-100/50 p-2 rounded-xl mt-1.5 leading-normal animate-scale-up font-medium">
                          <span className="font-extrabold text-[8px] uppercase tracking-widest text-emerald-650 block mb-0.5">Recommended Action:</span>
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
          <div className="max-w-7xl mx-auto px-6 mt-12 pb-16">
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
                      className="bg-white border border-slate-200/80 rounded-[2rem] p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-emerald-300/80 transition duration-300"
                      title={`Double-click card to view specific logs for ${deptName}`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-start border-b pb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                              {getDeptIcon(deptName)}
                            </div>
                            <div>
                              <h3 className="font-black text-slate-850 text-xs uppercase tracking-tight leading-tight max-w-[150px]">{deptName}</h3>
                            </div>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-widest border ${
                            isHighRisk ? 'bg-rose-50 text-rose-600 border-rose-200/60' : 'bg-emerald-50 text-emerald-600 border-emerald-200/60'
                          }`}
                          title={isHighRisk 
                            ? "Action Alert: High frequency of critical/high-severity defects logged on this line."
                            : "Stable: Defect frequencies match historical control limits."
                          }>
                            {isHighRisk ? 'Alert' : 'Stable'}
                          </span>
                        </div>

                        {/* Defect Counter Grid */}
                        <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded-xl text-[9px] text-slate-500 font-bold border border-slate-100">
                          <div>Total: <span className="text-slate-855 font-black block">{stats.totalDefects}</span></div>
                          <div>High: <span className="text-rose-600 font-black block">{stats.highSeverityCount}</span></div>
                          <div className="truncate">Primary: <span className="text-emerald-600 font-black block truncate">{stats.primaryErrorType}</span></div>
                        </div>

                        {/* Descriptions (fully visible, no clipping) */}
                        <div className="flex flex-col gap-3 text-[11px] text-slate-600 leading-relaxed font-medium">
                          <div>
                            <span className="font-black text-slate-855 uppercase tracking-wider text-[8px] block mb-0.5">Historical Observations:</span>
                            <p className="text-slate-500">{details.causes}</p>
                          </div>
                          <div>
                            <span className="font-black text-slate-855 uppercase tracking-wider text-[8px] block mb-0.5">Pillar Metric Rule:</span>
                            <p className="text-emerald-650 font-semibold">{details.rules}</p>
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
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                <button 
                  onClick={() => setSelectedStation(null)} 
                  className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 transition-colors outline-none"
                >
                  <X size={20}/>
                </button>
                
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert className="text-emerald-650" size={24} />
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
                    <span className="text-sm font-black text-slate-850 uppercase tracking-tight block">
                      {selectedStation.department}
                    </span>
                  </div>

                  {/* Error Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Defects Count</span>
                      <span className="text-2xl font-black text-slate-850">{selectedStation.totalDefects}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Severity Status</span>
                      <span className={`px-2.5 py-0.5 mt-1 rounded-full text-[9px] font-black uppercase tracking-widest border inline-block ${
                        selectedStation.riskLevel === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-200/60' :
                        selectedStation.riskLevel === 'High' ? 'bg-amber-50 text-amber-600 border-amber-200/60' :
                        'bg-emerald-50 text-emerald-600 border-emerald-200/60'
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
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      This defect type was designated as the primary error reason because it has the highest frequency of occurrences among all recorded logs for this station over the baseline period.
                    </p>
                  </div>

                  {/* Mitigation Action */}
                  <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mitigation Recommendations</span>
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
