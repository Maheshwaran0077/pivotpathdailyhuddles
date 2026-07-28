import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import {
  ChevronLeft, ChevronRight, Star, Maximize2,
  Download, Edit3, X, Activity, Trash2, Clock, User
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line
} from 'recharts';
import CircularTracker from '../components/CircularTracker';
import { dashboardMetrics as initialData } from '../dashboardData';
// IST timezone helpers
const getISTDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const getISTTime = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
const formatLogTime = (log) => {
  if (log.time) return log.time;
  if (log.timestamp) {
    try {
      const d = new Date(log.timestamp);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
      }
    } catch (e) {}
  }
  return '--';
};

const MySwal = withReactContent(Swal);
const API_BASE_URL = `${process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin)}/api/metrics`;
const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
const DEPT_FULL = { fgmw: 'Finished Goods Material Warehouse', fg: 'Finished Goods Material Warehouse', pmw: 'Packing Material Warehouse', pm: 'Packing Material Warehouse', rmw: 'Raw Material Warehouse', rm: 'Raw Material Warehouse', qcmad: 'QC & Microbiology Lab', pro: 'Production', pop: 'Post Production', ppp: 'Primary Packing Production', spp: 'Secondary Packing Production', fac: 'Facilities', ehs: 'Environment, Health & Safety', engineering: 'Engineering & Works Management', hr: 'Human Resources' };

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export default function QualityPage() {
  const { shift, dept } = useParams();
  const navigate = useNavigate();
  const reportRef = useRef(null);

  useEffect(() => {
    document.title = "Quality Department - QDSHI";
    return () => { document.title = "PivotPath (QDSHI)"; };
  }, []);

  // Safely parse user info
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo')) || {};
    } catch { return {}; }
  }, []);

  const isSuperAdmin = user?.role === 'superadmin';
  const isSupervisor = user?.role === 'supervisor';
  const userDepts = (user?.department || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const userShifts = (user?.shift || '').split(',').map(s => s.trim()).filter(Boolean);
  const isAssignedDept = isSuperAdmin || userDepts.includes((dept || '').toLowerCase());
  const isAssignedShift = isSuperAdmin || userShifts.length === 0 || userShifts.includes('NONE') || userShifts.includes(shift);
  const canUpdate = ((isSupervisor && isAssignedDept && isAssignedShift) || isSuperAdmin) && shift !== 'overall';

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState("Target Met");
  const [deviationType, setDeviationType] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [assignedId, setAssignedId] = useState("");
  const [assignedName, setAssignedName] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterId, setReporterId] = useState("");
  const [alertBrief, setAlertBrief] = useState("");
  const [viewDate, setViewDate] = useState(new Date());
  const [customDate, setCustomDate] = useState(getISTDate);

  const [staffLogs, setStaffLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [tableSyncing, setTableSyncing] = useState({ staff: false, activity: false });
  const [timeLock, setTimeLock] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/timelock/${dept || 'fgmw'}/${shift || '1'}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setTimeLock(d))
      .catch(() => { });
  }, [shift, dept]);

  const viewMonthName = viewDate.toLocaleString('default', { month: 'long' }).toUpperCase();
  const viewYear = viewDate.getFullYear();

  const qData = useMemo(() => {
    const found = metrics.find(m => m.letter === 'Q') || initialData[0];
    if (shift === 'overall') {
      const allIssueLogs = [];
      const allStaffLogs = [];
      const allActivityLogs = [];
      ['1', '2', '3'].forEach(s => {
        const sData = found.shifts?.[s] || {};
        const logs = (sData.issueLogs || []).map(l => ({ ...l, shift: s }));
        allIssueLogs.push(...logs);
        if (Array.isArray(sData.staffLogs)) allStaffLogs.push(...sData.staffLogs);
        if (Array.isArray(sData.activityLogs)) allActivityLogs.push(...sData.activityLogs);
      });
      return { ...found, issueLogs: allIssueLogs, staffLogs: allStaffLogs, activityLogs: allActivityLogs };
    } else {
      const shiftData = found.shifts?.[shift] || {};
      return { ...found, ...shiftData, issueLogs: Array.isArray(shiftData.issueLogs) ? shiftData.issueLogs : [] };
    }
  }, [metrics, shift]);

  const notifySuccess = (msg) => Toast.fire({ icon: 'success', title: msg });
  const notifyError = (msg) => Toast.fire({ icon: 'error', title: msg });

  const handleShowLogDetails = (log) => {
    MySwal.fire({
      title: `<span class="text-sm font-black text-slate-800 uppercase tracking-wider">Complaint Detail</span>`,
      html: `
        <div class="text-left space-y-3 text-xs p-2">
          <div class="flex justify-between border-b pb-1.5"><strong class="text-slate-500 uppercase">Date & Time:</strong> <span class="font-bold text-slate-700">${log.date || ''} ${log.time || ''}</span></div>
          <div class="flex justify-between border-b pb-1.5"><strong class="text-slate-500 uppercase">Issue Type:</strong> <span class="font-bold text-slate-700">${log.issueType || 'N/A'}</span></div>
          <div class="flex justify-between border-b pb-1.5"><strong class="text-slate-500 uppercase">Reporter:</strong> <span class="font-bold text-slate-700">${log.reporter || 'N/A'}</span></div>
          <div class="flex justify-between border-b pb-1.5"><strong class="text-slate-500 uppercase">Assigned To:</strong> <span class="font-bold text-slate-700">${log.assignedName || 'N/A'} (ID: ${log.assignedId || 'N/A'})</span></div>
          <div class="flex justify-between border-b pb-1.5"><strong class="text-slate-500 uppercase">Status:</strong> <span class="font-bold ${log.resolved ? 'text-emerald-600' : 'text-rose-600'} uppercase">${log.resolved ? 'Resolved' : 'Pending'}</span></div>
          <div class="flex justify-between"><strong class="text-slate-500 uppercase">Action Status:</strong> <span class="font-bold text-slate-700">${log.action || 'No action taken yet'}</span></div>
        </div>
      `,
      confirmButtonText: 'CLOSE',
      confirmButtonColor: '#475569'
    });
  };

  const handleShowActionDetails = (log) => {
    MySwal.fire({
      title: `<span class="text-sm font-black text-slate-800 uppercase tracking-wider">Action Log Detail</span>`,
      html: `
        <div class="text-left space-y-3 text-xs p-2">
          <div class="flex justify-between border-b pb-1.5"><strong class="text-slate-500 uppercase">Employee ID:</strong> <span class="font-bold text-slate-700">${log.id || 'N/A'}</span></div>
          <div class="flex justify-between border-b pb-1.5"><strong class="text-slate-500 uppercase">Description:</strong> <span class="font-bold text-slate-700">${log.name || 'N/A'}</span></div>
          <div class="flex justify-between border-b pb-1.5"><strong class="text-slate-500 uppercase">Action Taken:</strong> <span class="font-bold text-slate-700">${log.action || 'N/A'}</span></div>
          <div class="flex justify-between"><strong class="text-slate-500 uppercase">Time:</strong> <span class="font-bold text-slate-700">${log.time || 'N/A'}</span></div>
        </div>
      `,
      confirmButtonText: 'CLOSE',
      confirmButtonColor: '#475569'
    });
  };

  const confirmDelete = async (itemType = "record") => {
    return await MySwal.fire({
      title: 'Are you sure?',
      text: `You are about to remove this ${itemType}. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });
  };

  const handleDeleteLog = async (logDate) => {
    const result = await confirmDelete("alert history log");
    if (result.isConfirmed) {
      const updatedLogs = qData.issueLogs.filter(log => log.rawDate !== logDate);
      try {
        const res = await fetch(`${API_BASE_URL}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...qData, shift: shift || '1', dept: dept || 'fgmw', issueLogs: updatedLogs, empId: user?.employeeId, empName: user?.name, userRole: user?.role })
        });
        if (res.ok) {
          const saved = await res.json();
          setMetrics(prev => prev.map(m => m.letter === 'Q' ? saved : m));
          notifySuccess("Log deleted successfully");
        }
      } catch (e) { notifyError("Delete failed"); }
    }
  };

  const handleUpdateStatus = async () => {
    if (!canUpdate) return;
    const resolvedReason = selectedIssue === "Others" ? (customReason.trim() || "Others") : selectedIssue;
    
    if (resolvedReason !== "Target Met") {
      if (!reporterName.trim() || !reporterId.trim() || !alertBrief.trim() || !assignedName.trim() || !assignedId.trim()) {
        notifyError("Please fill in all alert details (Reporter Name & ID, Alert Brief, and Assigned Employee Name & ID).");
        return;
      }
    }

    let updatedLogs = Array.isArray(qData.issueLogs) ? [...qData.issueLogs] : [];
    const [y, m, d] = customDate.split('-');
    const newEntry = {
      date: `${d}/${m}/${y}`,
      rawDate: customDate,
      reason: resolvedReason,
      deviationType: resolvedReason === "Target Met" ? "" : deviationType,
      timestamp: new Date().toISOString(),
      time: getISTTime()
    };

    const idx = updatedLogs.findIndex(log => log.rawDate === customDate);
    if (idx !== -1) updatedLogs[idx] = newEntry; else updatedLogs.push(newEntry);

    let newStaffLogs = [...staffLogs];
    if (resolvedReason !== "Target Met") {
      const newIssue = {
        id: assignedId,
        name: `${alertBrief} (Reported by: ${reporterName} - ID: ${reporterId})`,
        action: "",
        time: getISTTime(),
        resolved: false,
        issueType: resolvedReason,
        reporter: `${reporterName} (${reporterId})`,
        assignedName: assignedName,
        assignedId: assignedId,
        date: `${d}/${m}/${y}`
      };
      newStaffLogs = [newIssue, ...newStaffLogs];
    }

    try {
      const res = await fetch(`${API_BASE_URL}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...qData, shift: shift || '1', dept: dept || 'fgmw', issueLogs: updatedLogs, empId: user?.employeeId, empName: user?.name, userRole: user?.role })
      });

      if (resolvedReason !== "Target Met") {
        await fetch(`${API_BASE_URL}/staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ letter: 'Q', shift: shift || '1', dept: dept || 'fgmw', logs: newStaffLogs, empId: user?.employeeId, empName: user?.name, userRole: user?.role }),
        });
      }

      if (res.ok) {
        await fetchMetrics(false);
        setIsModalOpen(false);
        setDeviationType("");
        setCustomReason("");
        setAssignedId("");
        setAssignedName("");
        setReporterName("");
        setReporterId("");
        setAlertBrief("");
        notifySuccess(`Shift ${shift} Updated`);
      } else {
        const err = await res.json().catch(() => ({}));
        notifyError(err.error || 'Save failed — check time lock or connection');
      }
    } catch (e) { notifyError("Sync failed"); }
  };

  const handleUpdateStaff = async () => {
    setTableSyncing(prev => ({ ...prev, staff: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter: 'Q', shift: shift || '1', dept: dept || 'fgmw', logs: staffLogs, empId: user?.employeeId, empName: user?.name, userRole: user?.role }),
      });
      if (res.ok) notifySuccess("Staff Logs Updated");
      else { const e = await res.json().catch(() => ({})); notifyError(e.error || 'Staff save failed'); }
    } catch (e) { notifyError("Staff sync failed"); }
    finally { setTableSyncing(prev => ({ ...prev, staff: false })); }
  };

  const handleUpdateActivity = async () => {
    setTableSyncing(prev => ({ ...prev, activity: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter: 'Q', shift: shift || '1', dept: dept || 'fgmw', logs: activityLogs, empId: user?.employeeId, empName: user?.name, userRole: user?.role }),
      });
      if (res.ok) notifySuccess("Activity Logs Updated");
      else { const e = await res.json().catch(() => ({})); notifyError(e.error || 'Activity save failed'); }
    } catch (e) { notifyError("Activity sync failed"); }
    finally { setTableSyncing(prev => ({ ...prev, activity: false })); }
  };

  const handleLogChange = (type, index, field, value) => {
    const setter = type === 'staff' ? setStaffLogs : setActivityLogs;
    setter(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addRow = (type) => {
    const newRow = {
      id: `REF-${Math.floor(Math.random() * 9000 + 1000)}`,
      name: "",
      action: "",
      time: getISTTime(),
      resolved: false
    };
    if (type === 'staff') setStaffLogs(prev => [newRow, ...prev]);
    else setActivityLogs(prev => [newRow, ...prev]);
  };

  const removeRow = async (type, index) => {
    const result = await confirmDelete(type === 'staff' ? "staff log entry" : "activity log entry");
    if (result.isConfirmed) {
      if (type === 'staff') setStaffLogs(prev => prev.filter((_, i) => i !== index));
      else setActivityLogs(prev => prev.filter((_, i) => i !== index));
      notifySuccess("Row removed");
    }
  };

  const downloadCSV = () => {
    const today = getISTDate();
    const logs = Array.isArray(qData.issueLogs) ? qData.issueLogs : [];
    const headers = ['Date', 'Reason', 'Deviation Type', 'Timestamp'];
    const rows = logs
      .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
      .map(l => [l.date || l.rawDate, l.reason || '', l.deviationType || '', l.timestamp || '']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `Quality_Shift${shift}_${dept}_${today}.csv`;
    a.click();
  };

  const downloadAllShiftsCSV = async () => {
    try {
      const API_ROOT = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
      const res = await fetch(`${API_ROOT}/api/metrics?dept=${dept || 'fgmw'}`);
      const allMetrics = await res.json();
      const qMetric = Array.isArray(allMetrics) ? allMetrics.find(m => m.letter === 'Q') : null;
      if (!qMetric) return notifyError('No data found');

      const viewMonthIdx = viewDate.getMonth();
      const headers = ['Shift', 'Date', 'Reason', 'Deviation Type', 'Timestamp'];
      const rows = [];
      for (const s of ['1', '2', '3']) {
        const logs = qMetric.shifts?.[s]?.issueLogs || [];
        logs
          .filter(l => {
            if (!l.rawDate) return false;
            const d = new Date(l.rawDate);
            return d.getMonth() === viewMonthIdx && d.getFullYear() === viewYear;
          })
          .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
          .forEach(l => rows.push([`Shift ${s}`, l.date || l.rawDate, l.reason || '', l.deviationType || '', l.timestamp || '']));
      }
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `Quality_AllShifts_${dept}_${viewMonthName}_${viewYear}.csv`;
      a.click();
    } catch { notifyError('Failed to download all-shifts data'); }
  };

  const allShiftsStats = useMemo(() => {
    let totalSuccess = 0;
    let totalAlerts = 0;
    const qMetric = metrics.find(m => m.letter === 'Q') || initialData[0];
    ['1', '2', '3'].forEach(s => {
      const logs = qMetric.shifts?.[s]?.issueLogs || [];
      logs.forEach(log => {
        const logD = new Date(log.rawDate);
        if (logD.getMonth() === viewDate.getMonth() && logD.getFullYear() === viewYear) {
          if (log.reason === "Target Met") totalSuccess++;
          else totalAlerts++;
        }
      });
    });
    const total = totalSuccess + totalAlerts;
    const successPercent = total ? Math.round((totalSuccess / total) * 100) : 0;
    return { successPercent, totalSuccess, totalAlerts, total };
  }, [metrics, viewDate, viewYear]);

  const fetchMetrics = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const url = `${API_BASE_URL}?dept=${dept || 'fgmw'}`;
      const response = await fetch(url);
      const dbData = await response.json();

      if (dbData && Array.isArray(dbData)) {
        const qLive = dbData.find(d => d.letter === 'Q');
        setMetrics(dbData);
        if (shift === 'overall') {
          const allStaffLogs = [];
          const allActivityLogs = [];
          ['1', '2', '3'].forEach(s => {
            const activeShiftData = qLive?.shifts?.[s] || {};
            if (Array.isArray(activeShiftData.staffLogs)) allStaffLogs.push(...activeShiftData.staffLogs);
            if (Array.isArray(activeShiftData.activityLogs)) allActivityLogs.push(...activeShiftData.activityLogs);
          });
          setStaffLogs(allStaffLogs);
          setActivityLogs(allActivityLogs);
        } else {
          const activeShiftData = qLive?.shifts?.[shift] || {};
          setStaffLogs(activeShiftData.staffLogs || []);
          setActivityLogs(activeShiftData.activityLogs || []);
        }
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [shift, dept]); // Refetch whenever the shift changes in the URL

  const daysInViewMonth = useMemo(() => new Date(viewYear, viewDate.getMonth() + 1, 0).getDate(), [viewDate, viewYear]);

  const dynamicDaysData = useMemo(() => {
    const baseDays = Array(daysInViewMonth).fill("none");
    const logs = Array.isArray(qData.issueLogs) ? qData.issueLogs : [];
    logs.forEach(log => {
      const logD = new Date(log.rawDate);
      if (logD.getMonth() === viewDate.getMonth() && logD.getFullYear() === viewYear) {
        const idx = logD.getDate() - 1;
        if (idx >= 0 && idx < baseDays.length) {
          const status = log.reason === "Target Met" ? "success" : "fail";
          if (baseDays[idx] === "fail" || status === "fail") {
            baseDays[idx] = "fail";
          } else {
            baseDays[idx] = "success";
          }
        }
      }
    });
    return baseDays;
  }, [qData.issueLogs, viewDate, viewYear, daysInViewMonth]);

  const stats = useMemo(() => ({
    alerts: dynamicDaysData.filter(s => s === "fail").length,
    success: dynamicDaysData.filter(s => s === "success").length,
    holiday: dynamicDaysData.filter(s => s === "none").length
  }), [dynamicDaysData]);

  const annualTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const logs = Array.isArray(qData.issueLogs) ? qData.issueLogs : [];
    return months.map((m, i) => {
      const mLogs = logs.filter(l => {
        const d = new Date(l.rawDate);
        return d.getFullYear() === viewYear && d.getMonth() === i;
      });
      return {
        name: m,
        fail: mLogs.filter(l => l.reason !== "Target Met").length,
        pass: mLogs.filter(l => l.reason === "Target Met").length
      };
    });
  }, [qData.issueLogs, viewYear]);

  const filteredLogs = useMemo(() => {
    const logs = Array.isArray(qData.issueLogs) ? qData.issueLogs : [];
    return logs
      .filter(l => {
        const d = new Date(l.rawDate);
        return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewYear;
      })
      .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
  }, [qData.issueLogs, viewDate, viewYear]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white gap-4">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="text-emerald-600 font-black uppercase tracking-[0.3em] animate-pulse">Syncing PivotPath Data...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-[#334155] font-sans flex flex-col">
      <nav className="flex justify-between items-center px-4 sm:px-6 py-3 bg-[#F0F4F8] sticky top-0 z-50">
        <button onClick={() => navigate('/monitor')} className="flex items-center gap-1.5 text-[#475569] font-bold text-xs uppercase hover:text-emerald-600 transition-colors">
          <ChevronLeft size={18} /> <span className="hidden sm:inline">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={downloadCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full font-bold text-xs shadow-sm transition-all">
            <Download size={13} /> <span className="hidden sm:inline">Shiftwise</span>
          </button>
          <button onClick={downloadAllShiftsCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full font-bold text-xs shadow-sm transition-all">
            <Download size={13} /> <span className="hidden sm:inline">Overall</span>
          </button>
          {canUpdate && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 sm:px-7 py-2 rounded-full text-[11px] font-black uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <Edit3 size={13} /> <span className="hidden sm:inline">Update Logs</span><span className="sm:hidden">Update</span>
            </button>
          )}
        </div>
      </nav>

      <div className="px-4 sm:px-6 mb-4 mt-1">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Quality — {shift === 'overall' ? 'Overall' : `Shift ${shift}`}</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">{DEPT_FULL[dept] || dept?.toUpperCase()}</p>
          </div>

          {/* Centered Shift vs All-Shifts Overall performance */}
          <div className="flex items-center gap-6 justify-center sm:mx-auto select-none">
            <div className="text-center px-4 border-r border-slate-200">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{shift === 'overall' ? 'Overall' : `Shift ${shift}`} Yield</span>
              <span className="text-base font-black text-slate-850">{stats.success + stats.alerts ? Math.round((stats.success / (stats.success + stats.alerts)) * 100) : 0}%</span>
            </div>
            <div className="text-center px-4">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">All-Shifts Yield</span>
              <span className="text-base font-black text-emerald-650">{allShiftsStats.successPercent}%</span>
            </div>
          </div>

          {timeLock?.enabled && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full self-start sm:self-auto">
              <span className="text-base">⏰</span>
              <div>
                <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Save Window</p>
                <p className="text-[11px] font-black text-amber-800">{timeLock.startTime} – {timeLock.endTime}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <main ref={reportRef} className="flex-1 grid grid-cols-12 gap-4 sm:gap-5 px-4 sm:px-6 pb-6 bg-[#F0F4F8]">
        {/* Tracker Section */}
        <div className="col-span-12 lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-8 bg-[#F8FAFC] px-4 py-2 rounded-full border border-slate-100">
            <button onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth() - 1); setViewDate(d); }} className="text-emerald-500 hover:scale-110 transition p-1"><ChevronLeft size={24} /></button>
            <span className="text-[12px] sm:text-[13px] font-black text-emerald-600 tracking-widest text-center">{viewMonthName} {viewYear}</span>
            <button onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth() + 1); setViewDate(d); }} className="text-emerald-500 hover:scale-110 transition p-1"><ChevronRight size={24} /></button>
          </div>
          <span className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{qData.name}</span>
          <div className="flex-1 flex items-center justify-center min-h-[250px] w-full max-w-[300px] relative">
            <CircularTracker
              letter={qData.letter}
              daysData={dynamicDaysData}
              size={window.innerWidth < 640 ? 220 : 280}
              onDayClick={(dayNum) => {
                if (!canUpdate) return;
                const clickedDateStr = `${viewYear}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

                if (isSupervisor && clickedDateStr !== getISTDate()) {
                  notifyError("Supervisors can only update today's date");
                  return;
                }

                const existing = qData.issueLogs?.find(log => log.rawDate === clickedDateStr);
                if (existing) {
                  const isPredefined = ["Target Met", "Machine Breakdown", "No Power", "No Manpower", "Quality Reject"].includes(existing.reason);
                  if (isPredefined) {
                    setSelectedIssue(existing.reason);
                    setCustomReason("");
                  } else {
                    setSelectedIssue("Others");
                    setCustomReason(existing.reason);
                  }
                  setDeviationType(existing.deviationType || "");
                } else {
                  setSelectedIssue("Target Met");
                  setCustomReason("");
                  setDeviationType("");
                }
                setCustomDate(clickedDateStr);
                setIsModalOpen(true);
              }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 w-full mt-6">
            <StatBox val={stats.alerts} label="Alerts" type="red" />
            <StatBox val={stats.success} label="Success" type="green" />
            <StatBox val={stats.holiday} label="Holiday" type="slate" />
          </div>
        </div>

        {/* History Table */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 flex flex-col gap-5">
          <ChartCard title={`${viewMonthName} ALERT HISTORY`}>
            <div className="overflow-y-auto pr-2 custom-scrollbar max-h-[320px] min-h-[200px]">
              <table className="w-full text-[11px] border-separate border-spacing-0">
                <thead className="bg-[#E2E8F0] sticky top-0 z-20 shadow-sm text-[#64748B] font-black uppercase">
                  <tr>
                    <th className="p-2 text-left rounded-tl-xl">Date</th>
                    {shift === 'overall' && <th className="p-2 text-left">Shift</th>}
                    <th className="p-2 text-left">Reason</th>
                    <th className="p-2 text-left">Deviation</th>
                    <th className="p-2 text-left">Time</th>
                    <th className="p-2 text-right rounded-tr-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length > 0 ? filteredLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 font-bold text-slate-500 whitespace-nowrap">{log.date}</td>
                      {shift === 'overall' && (
                        <td className="p-2 font-bold text-slate-500 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                            S{log.shift}
                          </span>
                        </td>
                      )}
                      <td className={`p-2 font-black uppercase tracking-tight ${log.reason === 'Target Met' ? 'text-emerald-500' : 'text-red-500'}`}>
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${log.reason === 'Target Met' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {log.reason}
                        </div>
                      </td>
                      <td className="p-2 font-bold text-slate-500 text-[10px]">{log.deviationType || '--'}</td>
                      <td className="p-2 font-bold text-slate-500 text-[10px]">
                        {log.reason === 'Target Met' ? '--' : formatLogTime(log)}
                      </td>
                      <td className="p-2 text-right">
                        {isSuperAdmin && (
                          <button onClick={() => handleDeleteLog(log.rawDate)} className="text-red-300 hover:text-red-600 p-1 transition-colors"><Trash2 size={16} /></button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-300 font-bold uppercase italic tracking-widest">No alerts recorded</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <ChartCard title={`${viewYear} PERFORMANCE SUMMARY`}>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full text-left text-[10px]">
                <thead className="bg-[#F1F5F9] text-[#64748B] font-black uppercase">
                  <tr>
                    <th className="p-3">Category</th>
                    {annualTrend.map(m => <th key={m.name} className="p-3 text-center">{m.name}</th>)}
                  </tr>
                </thead>
                <tbody className="font-bold divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 text-slate-500">Alerts</td>
                    {annualTrend.map((m, i) => <td key={i} className={`p-3 text-center ${m.fail > 0 ? 'text-red-500' : 'text-slate-200'}`}>{m.fail || '--'}</td>)}
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-500">Success</td>
                    {annualTrend.map((m, i) => <td key={i} className={`p-3 text-center ${m.pass > 0 ? 'text-emerald-500' : 'text-slate-200'}`}>{m.pass || '--'}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>

        {/* Charts Column */}
        <div className="col-span-12 md:col-span-6 lg:col-span-5 flex flex-col gap-5">
          <ChartCard title={`${viewMonthName} DISTRIBUTION`}>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Alerts', value: stats.alerts },
                  { name: 'Success', value: stats.success },
                  { name: 'Holiday', value: stats.holiday }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                    <Cell fill="#EF4444" /><Cell fill="#10b981" /><Cell fill="#94A3B8" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title={`${viewYear} PERFORMANCE TREND`}>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={annualTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="fail" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444' }} name="Alerts" />
                  <Line type="monotone" dataKey="pass" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} name="Success" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Bottom Logs */}
        <div className="col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LogTable
            type="staff"
            title="Issues & Compliance"
            icon={<User size={14} className="text-emerald-500" />}
            logs={staffLogs}
            isSuperAdmin={isSuperAdmin}
            canUpdate={canUpdate}
            onAdd={() => addRow('staff')}
            onUpdate={handleUpdateStaff}
            onRemove={(i) => removeRow('staff', i)}
            onChange={(i, f, v) => handleLogChange('staff', i, f, v)}
            loading={tableSyncing.staff}
            theme="emerald"
            onShowDetails={handleShowLogDetails}
            onToggleResolve={async (index, isResolved) => {
              const confirm = await MySwal.fire({
                title: 'Are you sure?',
                text: `Do you want to mark this issue as ${isResolved ? 'Resolved' : 'Pending'}?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#10B981',
                cancelButtonColor: '#EF4444',
                confirmButtonText: 'Yes',
                cancelButtonText: 'No'
              });
              if (!confirm.isConfirmed) return;

              let actionTaken = "";
              if (isResolved) {
                const currentIssue = staffLogs[index];
                actionTaken = `Resolved on ${currentIssue.date || getISTDate()}`;
              }

              // Update staff logs state
              const updatedStaff = [...staffLogs];
              updatedStaff[index] = { ...updatedStaff[index], resolved: isResolved, action: actionTaken };
              setStaffLogs(updatedStaff);

              // Update activity logs state to prevent duplicate/double insertions
              let updatedActivity = [...activityLogs];
              const issueIdRef = updatedStaff[index].id || updatedStaff[index].assignedId || 'N/A';
              
              if (isResolved && actionTaken) {
                const exists = activityLogs.some(act => act.issueRef === issueIdRef && act.action.startsWith("Resolved"));
                if (!exists) {
                  const newAct = {
                    id: issueIdRef,
                    name: `Action on ${updatedStaff[index].issueType || 'Issue'}: Resolved`,
                    action: actionTaken,
                    time: getISTTime(),
                    issueRef: issueIdRef
                  };
                  updatedActivity = [newAct, ...updatedActivity];
                  setActivityLogs(updatedActivity);
                }
              } else {
                updatedActivity = activityLogs.filter(act => act.issueRef !== issueIdRef);
                setActivityLogs(updatedActivity);
              }

              // Save directly to DB to keep sync
              try {
                await fetch(`${API_BASE_URL}/staff`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ letter: 'Q', shift: shift || '1', dept: dept || 'fgmw', logs: updatedStaff, empId: user?.employeeId, empName: user?.name, userRole: user?.role })
                });
                await fetch(`${API_BASE_URL}/activity`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ letter: 'Q', shift: shift || '1', dept: dept || 'fgmw', logs: updatedActivity, empId: user?.employeeId, empName: user?.name, userRole: user?.role })
                });
                await fetchMetrics(false);
                notifySuccess(isResolved ? "Issue resolved & synchronized" : "Issue marked as pending");
              } catch (e) {
                notifyError("Sync failed");
              }
            }}
          />

          <LogTable
            type="activity"
            title="Actions Quality Logs"
            icon={<Activity size={14} className="text-blue-500" />}
            logs={activityLogs}
            isSuperAdmin={isSuperAdmin}
            canUpdate={canUpdate}
            onAdd={() => addRow('activity')}
            onUpdate={handleUpdateActivity}
            onRemove={(i) => removeRow('activity', i)}
            onChange={(i, f, v) => handleLogChange('activity', i, f, v)}
            loading={tableSyncing.activity}
            theme="blue"
            onShowDetails={handleShowActionDetails}
          />
        </div>
      </main>

      {/* Floating All-Shifts CSV download button */}
      <button onClick={downloadAllShiftsCSV} title="Download All Shifts CSV (current month)" className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-[90]">
        <Download size={24} />
      </button>

      {/* Update Modal */}
      {isModalOpen && canUpdate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[400px] p-6 sm:p-8 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black uppercase tracking-widest text-[10px] flex items-center gap-2 text-slate-800">
                <Edit3 size={16} className="text-emerald-500" /> LOG RECORD
              </h2>
              <button onClick={() => { setIsModalOpen(false); setCustomReason(""); }} className="text-slate-300 hover:text-red-500"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 ml-1">Date</label>
                <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)}
                  readOnly={isSupervisor} disabled={isSupervisor}
                  max={isSupervisor ? getISTDate() : undefined}
                  title={isSupervisor ? 'Supervisors can only edit today' : ''}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-sm outline-none focus:ring-2 ring-emerald-500 ${isSupervisor ? 'opacity-60 cursor-not-allowed' : ''}`} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 ml-1">Reason</label>
                <select value={selectedIssue} onChange={(e) => { setSelectedIssue(e.target.value); setCustomReason(""); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-sm outline-none focus:ring-2 ring-emerald-500">
                  <option value="Target Met">✅ Target Met</option>
                  <option value="Machine Breakdown">⚠️ Machine Breakdown</option>
                  <option value="No Power">⚠️ No Power</option>
                  <option value="No Manpower">⚠️ No Manpower</option>
                  <option value="Quality Reject">⚠️ Quality Reject</option>
                  <option value="Others">✏️ Others</option>
                </select>
              </div>
              {selectedIssue === "Others" && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 ml-1">Specify Reason</label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter custom reason..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-sm outline-none focus:ring-2 ring-emerald-500"
                  />
                </div>
              )}
              {selectedIssue !== "Target Met" && (
                <>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 ml-1">Deviation Type</label>
                    <select value={deviationType} onChange={(e) => setDeviationType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-sm outline-none focus:ring-2 ring-emerald-500">
                      <option value="">-- Select Deviation Type --</option>
                      <option value="Human Error">Human Error</option>
                      <option value="Process Error">Process Error</option>
                    </select>
                  </div>
                  <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 mt-1 select-none">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Alert Details (Action Logs Entry)</span>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Reporter Name</label>
                      <input type="text" value={reporterName} onChange={(e) => setReporterName(e.target.value)} placeholder="Enter Reporter Name" className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 ring-emerald-500 font-semibold" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Reporter Employee ID</label>
                      <input type="text" value={reporterId} onChange={(e) => setReporterId(e.target.value)} placeholder="Enter Reporter ID" className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 ring-emerald-500 font-semibold" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Brief Description of Alert</label>
                      <textarea value={alertBrief} onChange={(e) => setAlertBrief(e.target.value)} placeholder="What was the alert? Describe briefly" className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 ring-emerald-500 font-semibold resize-none h-16" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Assigned Employee ID</label>
                      <input type="text" value={assignedId} onChange={(e) => setAssignedId(e.target.value)} placeholder="Enter ID (e.g. EMP-101)" className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 ring-emerald-500 font-semibold" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Assigned Employee Name</label>
                      <input type="text" value={assignedName} onChange={(e) => setAssignedName(e.target.value)} placeholder="Enter Name (e.g. John Doe)" className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 ring-emerald-500 font-semibold" />
                    </div>
                  </div>
                </>
              )}
              <button onClick={handleUpdateStatus} className="w-full bg-emerald-600 py-3 sm:py-4 rounded-xl font-black uppercase text-[11px] text-white tracking-widest hover:bg-emerald-700 active:scale-95 transition-all mt-3">UPDATE DATA</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const LogTable = ({ type, title, icon, logs, isSuperAdmin, onAdd, onUpdate, onRemove, onChange, loading, theme, onToggleResolve, onShowDetails, canUpdate }) => {
  const themeStyles = {
    emerald: {
      bg: 'bg-emerald-50/30',
      text: 'text-emerald-800',
      btn: 'bg-emerald-600 hover:bg-emerald-700'
    },
    blue: {
      bg: 'bg-blue-50/30',
      text: 'text-blue-800',
      btn: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  const style = themeStyles[theme] || themeStyles.emerald;

  const handleAddRow = () => {
    onAdd();
    setTimeout(() => {
      const scrollDiv = document.querySelector(`[data-log-table="${title}"]`);
      if (scrollDiv) {
        scrollDiv.scrollTop = 0;
      }
    }, 0);
  };

  return (
    <div className="bg-white rounded-[1.5rem] shadow-md border-2 border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
      <div className={`px-5 py-4 flex items-center justify-between border-b-2 border-slate-100 ${style.bg}`}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className={`font-black text-[10px] ${style.text} tracking-widest uppercase`}>{title}</h3>
        </div>
        {canUpdate && onAdd && (
          <button
            onClick={handleAddRow}
            className={`${style.btn} text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shadow transition-all active:scale-95`}
          >
            + Add Row
          </button>
        )}
      </div>

      <div className="px-4 py-2 bg-slate-50 flex gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 select-none">
        <span className="w-20">{type === 'staff' ? 'Date' : 'Employee ID'}</span>
        <span className="flex-1">{type === 'staff' ? 'Assigned To' : 'Description'}</span>
        <span className="flex-1">{type === 'staff' ? 'Action Status' : 'Action Taken'}</span>
        <span className="w-12 text-right">Time</span>
        {type === 'staff' && <span className="w-20 text-center">Resolve</span>}
        {isSuperAdmin && <span className="w-6"></span>}
      </div>

      <div className="overflow-y-auto flex-1 p-4 divide-y divide-slate-100 custom-scrollbar" data-log-table={title}>
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-[10px] font-bold py-10">No records found. Click "+ Add Row" to create one.</div>
        ) : logs.map((log, i) => {
          const isStaff = type === 'staff';
          const isResolved = log.resolved === true;
          const rowBgClass = isStaff 
            ? (isResolved ? 'bg-emerald-50/50 border-l-4 border-emerald-500 hover:bg-emerald-100/50' : 'bg-red-50/55 border-l-4 border-red-400 hover:bg-red-100/50')
            : (i === 0 && (!log.id && !log.name && !log.action) ? 'bg-emerald-50/50 border-l-4 border-emerald-500 hover:bg-emerald-50/70' : 'hover:bg-slate-50/50');

          return (
            <div 
              key={i} 
              onClick={(e) => {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                  if (onShowDetails) onShowDetails(log);
                }
              }}
              className={`py-2.5 flex gap-4 items-center group rounded-lg transition-all px-2 cursor-pointer ${rowBgClass}`}
            >
              <input
                disabled={!canUpdate}
                className="w-20 text-[10px] font-bold text-slate-500 bg-slate-100/50 p-1.5 rounded border border-transparent focus:border-slate-300 outline-none transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                value={isStaff ? (log.date || log.rawDate || '') : log.id}
                onChange={(e) => onChange(i, isStaff ? 'date' : 'id', e.target.value)}
              />
              <input
                disabled={!canUpdate}
                className="flex-1 text-[11px] font-bold text-slate-700 outline-none border-b border-transparent focus:border-emerald-300 transition-colors bg-transparent animate-fade-in disabled:text-slate-400 disabled:cursor-not-allowed"
                placeholder={isStaff ? "Assigned Name" : "Name/Description"}
                value={isStaff ? (log.assignedName || log.name || '') : log.name}
                onChange={(e) => onChange(i, isStaff ? 'assignedName' : 'name', e.target.value)}
              />
              <input
                disabled={!canUpdate}
                className="flex-1 text-[10px] font-medium text-slate-500 outline-none border-b border-transparent focus:border-emerald-300 bg-transparent animate-fade-in disabled:text-slate-400 disabled:cursor-not-allowed"
                placeholder={isStaff ? "Action Status" : "Action Taken"}
                value={log.action}
                onChange={(e) => onChange(i, 'action', e.target.value)}
              />
              <div className="flex items-center gap-1 w-12 text-right">
                <Clock size={10} className="text-slate-300" />
                <span className="text-[9px] font-black text-slate-400">{log.time}</span>
              </div>
              {isStaff && onToggleResolve && (
                <div className="flex items-center gap-1.5 select-none shrink-0">
                  <span className={`text-[8px] font-black uppercase tracking-wider ${isResolved ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isResolved ? 'Resolved' : 'Pending'}
                  </span>
                  <button
                    disabled={!canUpdate}
                    onClick={() => onToggleResolve(i, !isResolved)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none flex items-center ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''} ${isResolved ? 'bg-emerald-500 justify-end' : 'bg-red-500 justify-start'}`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
                  </button>
                </div>
              )}
              {isSuperAdmin && (
                <button onClick={() => onRemove(i)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"><Trash2 size={14} /></button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatBox = ({ val, label, type }) => {
  const styles = {
    red: "bg-red-50 border-red-100 text-red-600",
    green: "bg-emerald-50 border-emerald-100 text-emerald-600",
    slate: "bg-slate-50 border-slate-100 text-slate-500"
  };
  return (
    <div className={`p-3 rounded-2xl border text-center ${styles[type]}`}>
      <div className="text-xl font-black leading-none">{val}</div>
      <div className="text-[8px] font-black uppercase tracking-tighter mt-1 opacity-70">{label}</div>
    </div>
  );
};

const ChartCard = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center bg-white">
      <div className="flex items-center gap-2 text-[#64748B] font-black uppercase text-[10px] tracking-widest">
        <Star size={12} className="text-emerald-500" /> {title}
      </div>
      <Maximize2 size={12} className="text-slate-300" />
    </div>
    <div className="p-5 flex-1">{children}</div>
  </div>
);