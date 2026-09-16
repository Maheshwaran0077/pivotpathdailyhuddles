import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams as useRParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { ChevronLeft, ChevronRight, Star, Activity, Clock, Calendar, TrendingUp, Trash2, Download, X } from 'lucide-react';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid, YAxis, Legend, Tooltip } from 'recharts';
import CircularTracker from '../components/CircularTracker';
import PageLoader from '../components/PageLoader';
import { dashboardMetrics as initialData } from '../dashboardData';
import FDAInvestigationWizard from '../components/FDAInvestigationWizard';
import AddChallengeModal from '../components/AddChallengeModal';
import AIResolutionVerificationModal from '../components/AIResolutionVerificationModal';
import { showDetailedAuditLog } from '../utils/logDetailRenderer';

const MySwal = withReactContent(Swal);

const API = process.env.REACT_APP_API_URL || 
  ((window.location.port && window.location.port !== '5000') 
    ? `${window.location.protocol}//${window.location.hostname}:5000` 
    : window.location.origin);
const API_BASE = `${API}/api/metrics`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DEPT_FULL = { fgmw: 'Finished Goods Material Warehouse', fg: 'Finished Goods Material Warehouse', pmw: 'Packing Material Warehouse', pm: 'Packing Material Warehouse', rmw: 'Raw Material Warehouse', rm: 'Raw Material Warehouse', qcmad: 'QC & Microbiology & AD Lab', pro: 'Production', pop: 'Post Production', ppp: 'Primary Packing Production', spp: 'Secondary Packing Production', fac: 'Facilities' };

// Department-specific Delivery metric labels per GMP document
// delay*Type: 'time' = red if >0, unit=min | 'zero' = red if >0, unit=count/batches | 'pct' = red if <100, unit=%
const DEPT_DELIVERY_LABELS = {
  fgmw: {
    planVsActual: 'Plan vs Actual Disposed',
    archiveTitle: 'Disposal Archives',
    targetLabel: 'Target Disposed', actualLabel: 'Actual Disposed',
    delay1Col: 'BPR Receipts', delay1Ph: 'Delayed BPR Receipts (min)',
    delay1Unit: 'min', delay1Type: 'time',
    delay2Col: 'Shipments', delay2Ph: 'Delayed Shipments / Logistics (min)',
    delay2Unit: 'min', delay2Type: 'time',
  },
  pmw: {
    planVsActual: 'Plan vs Actual Dispensed',
    archiveTitle: 'Dispatch Archives',
    targetLabel: 'Target Dispensed', actualLabel: 'Actual Dispensed',
    delay1Col: 'PBR/Indent', delay1Ph: 'Delayed PBR / Indent (min)',
    delay1Unit: 'min', delay1Type: 'time',
    delay2Col: 'PM QC Approval', delay2Ph: 'Delayed PM QC Approval (min)',
    delay2Unit: 'min', delay2Type: 'time',
  },
  rmw: {
    planVsActual: 'Plan vs Actual Dispensed',
    archiveTitle: 'Dispatch Archives',
    targetLabel: 'Target Dispensed', actualLabel: 'Actual Dispensed',
    delay1Col: 'BMR/Indent', delay1Ph: 'Delayed BMR / Indent (min)',
    delay1Unit: 'min', delay1Type: 'time',
    delay2Col: 'RM QC Approval', delay2Ph: 'Delayed RM QC Approval (min)',
    delay2Unit: 'min', delay2Type: 'time',
  },
  qcmad: {
    planVsActual: 'Plan vs Actual Tasks',
    archiveTitle: 'Task Archives',
    targetLabel: 'Tasks Planned', actualLabel: 'Tasks Executed',
    delay1Col: 'Sample Testing', delay1Ph: 'Delayed Sample Testing (min)',
    delay1Unit: 'min', delay1Type: 'time',
    delay2Col: 'Repeated Testing', delay2Ph: 'No. of Invalid / Repeated Testing',
    delay2Unit: '', delay2Type: 'zero',
  },
  pro: {
    planVsActual: 'Plan vs Actual Manufactured',
    archiveTitle: 'Production Archives',
    targetLabel: 'Target Output', actualLabel: 'Actual Output',
    delay1Col: 'RM Shortage', delay1Ph: 'Raw Material Shortage Impact (batches)',
    delay1Unit: '', delay1Type: 'zero',
    delay2Col: 'Changeover', delay2Ph: 'Non-Serial Changeover Time (min)',
    delay2Unit: 'min', delay2Type: 'time',
  },
  pop: {
    planVsActual: 'Plan vs Actual Manufactured',
    archiveTitle: 'Production Archives',
    targetLabel: 'Target Output', actualLabel: 'Actual Output',
    delay1Col: 'RM Shortage', delay1Ph: 'Raw Material Shortage Impact (batches)',
    delay1Unit: '', delay1Type: 'zero',
    delay2Col: 'Changeover', delay2Ph: 'Non-Serial Changeover Time (min)',
    delay2Unit: 'min', delay2Type: 'time',
  },
  ppp: {
    planVsActual: 'Plan vs Actual Packed',
    archiveTitle: 'Packing Archives',
    targetLabel: 'Target Packed', actualLabel: 'Actual Packed',
    delay1Col: 'RM Shortage', delay1Ph: 'Raw Material Shortage Impact (batches)',
    delay1Unit: '', delay1Type: 'zero',
    delay2Col: 'Changeover', delay2Ph: 'Non-Serial Changeover Time (min)',
    delay2Unit: 'min', delay2Type: 'time',
  },
  spp: {
    planVsActual: 'Plan vs Actual Packed',
    archiveTitle: 'Packing Archives',
    targetLabel: 'Target Packed', actualLabel: 'Actual Packed',
    delay1Col: 'Label Errors', delay1Ph: 'No. of Labeling / Serialization Errors',
    delay1Unit: '', delay1Type: 'zero',
    delay2Col: 'Pkg Shortage', delay2Ph: 'No. of Carton / Packaging Material Shortage (batches)',
    delay2Unit: '', delay2Type: 'zero',
  },
  fac: {
    planVsActual: 'Plan vs Actual Tasks',
    archiveTitle: 'Task Archives',
    targetLabel: 'Tasks Planned', actualLabel: 'Tasks Completed',
    delay1Col: 'Housekeeping', delay1Ph: 'GMP & Non-GMP Housekeeping Compliance (%)',
    delay1Unit: '%', delay1Type: 'pct',
    delay2Col: 'Waste Removal', delay2Ph: 'Timeliness of Waste Removal (%)',
    delay2Unit: '%', delay2Type: 'pct',
  },
};

const THEME_STYLES = {
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-800', light: 'bg-emerald-50/20', border: 'border-emerald-100' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-800', light: 'bg-blue-50/20', border: 'border-blue-100' }
};

// IST timezone helpers for frontend
const getISTDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const getISTTime = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });

const DeliveryPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    document.title = "Delivery Department - QDSHI";
    return () => { document.title = "PivotPath (QDSHI)"; };
  }, []);
  const { shift: paramShift, dept: paramDept } = useRParams();
  const user = JSON.parse(localStorage.getItem('userInfo') || 'null');
  const isSuperAdmin = user?.role === 'superadmin';
  const isSupervisor = user?.role === 'supervisor';
  const reportRef = useRef(null);

  const activeShift = paramShift || user?.shift || '1';
  const activeDept = paramDept || 'fgmw';

  const userDepts = (user?.department || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const userShifts = (user?.shift || '').split(',').map(s => s.trim()).filter(Boolean);
  const isAssignedDept = isSuperAdmin || userDepts.includes(activeDept.toLowerCase());
  const isAssignedShift = isSuperAdmin || userShifts.length === 0 || userShifts.includes('NONE') || userShifts.includes(activeShift);
  const canEdit = ((isSupervisor && isAssignedDept && isAssignedShift) || isSuperAdmin) && activeShift !== 'overall';
  const deptLabels = DEPT_DELIVERY_LABELS[activeDept] || DEPT_DELIVERY_LABELS.fgmw;

  // --- State ---
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeLock, setTimeLock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(initialData);
  const [lastBackupTime, setLastBackupTime] = useState(new Date());
  const [viewDate, setViewDate] = useState(() => {
    const storedMonth = localStorage.getItem('selectedMonthIndex');
    const storedYear = localStorage.getItem('selectedYear');
    if (storedMonth !== null && storedYear !== null) {
      const d = new Date();
      d.setMonth(parseInt(storedMonth, 10));
      d.setFullYear(parseInt(storedYear, 10));
      return d;
    }
    return new Date();
  });

  useEffect(() => {
    localStorage.setItem('selectedMonthIndex', viewDate.getMonth().toString());
    localStorage.setItem('selectedYear', viewDate.getFullYear().toString());
  }, [viewDate]);


  // New State for Custom Alert
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, type: null, index: null, rawDate: null });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isAddChallengeOpen, setIsAddChallengeOpen] = useState(false);
  const [isActionTrackerMode, setIsActionTrackerMode] = useState(false);
  const [selectedChallengeForVerification, setSelectedChallengeForVerification] = useState(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [tableSyncing, setTableSyncing] = useState({ staff: false, activity: false });

  const [customDate, setCustomDate] = useState(getISTDate);
  const [plannedCount, setPlannedCount] = useState('');
  const [dispatchedCount, setDispatchedCount] = useState('');
  const [breakdowns, setBreakdowns] = useState('');
  const [pbrDelay, setPbrDelay] = useState('');
  const [qcDelay, setQcDelay] = useState('');
  const [assignedId, setAssignedId] = useState('');
  const [assignedName, setAssignedName] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterId, setReporterId] = useState('');
  const [alertBrief, setAlertBrief] = useState('');

  const [staffLogs, setStaffLogs] = useState([]);
  const [selectedChallengeForFda, setSelectedChallengeForFda] = useState(null);
  const [isFdaWizardOpen, setIsFdaWizardOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);

  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();

  // --- Memos ---
  const dData = useMemo(() => {
    const found = metrics.find(m => m.letter === 'D') || metrics[1];
    if (activeShift === 'overall') {
      const allLogs = [];
      const staffLogsLocal = [];
      const activityLogsLocal = [];
      ['1', '2', '3'].forEach(s => {
        const shiftData = found.shifts?.[s] || {};
        const logs = (shiftData.issueLogs || []).map(l => ({ ...l, shift: s }));
        allLogs.push(...logs);
        if (Array.isArray(shiftData.staffLogs)) staffLogsLocal.push(...shiftData.staffLogs);
        if (Array.isArray(shiftData.activityLogs)) activityLogsLocal.push(...shiftData.activityLogs);
      });
      return { ...found, issueLogs: allLogs, staffLogs: staffLogsLocal, activityLogs: activityLogsLocal };
    } else {
      const shiftData = found.shifts?.[activeShift] || {};
      return { ...found, ...shiftData, issueLogs: Array.isArray(shiftData.issueLogs) ? shiftData.issueLogs : [] };
    }
  }, [metrics, activeShift]);

  const allYearLogs = useMemo(() => {
    return MONTHS.map((monthName, index) => {
      const logs = dData.issueLogs
        .filter(l => {
          const d = new Date(l.rawDate);
          return d.getUTCMonth() === index && d.getUTCFullYear() === viewYear;
        })
        .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
      return { monthName, monthIndex: index, logs };
    });
  }, [dData.issueLogs, viewYear]);

  // --- Improved Deletion Logic (Async Cloud Sync with SweetAlert) ---
  const executeDeleteLog = async (type, index, rawDate) => {
    try {
      if (type === 'staff' || type === 'activity') {
        const setter = type === 'staff' ? setStaffLogs : setActivityLogs;
        const currentLogs = type === 'staff' ? staffLogs : activityLogs;
        const targetItem = currentLogs[index];
        const trackerId = targetItem?.trackerId || targetItem?.id || targetItem?._id;
        const userRole = user?.role || 'superadmin';

        if (trackerId) {
          await fetch(`${API}/api/fda/challenges/${trackerId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'user-role': userRole
            }
          }).catch(() => {});
        }

        const updatedLogs = currentLogs.filter((_, i) => i !== index);

        const res = await fetch(`${API_BASE}/${type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            letter: 'D', shift: activeShift, dept: activeDept, 
            logs: updatedLogs,
            empId: user?.employeeId,
            empName: user?.name,
            userRole,
          }),
        });
        if (res.ok) {
          setter(updatedLogs);
          await fetchMetrics(false);
          MySwal.fire('Deleted!', 'Log has been deleted successfully from cloud.', 'success');
        }
      } 
      else if (type === 'dispatch' || type === 'minor') {
        const updatedIssueLogs = dData.issueLogs.filter(l => l.rawDate !== rawDate);
        const res = await fetch(`${API_BASE}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...dData,
            shift: activeShift,
            dept: activeDept,
            issueLogs: updatedIssueLogs,
            empId: user?.employeeId,
            empName: user?.name,
            userRole: user?.role,
          }),
        });
        if (res.ok) {
          await fetchMetrics(false);
          MySwal.fire('Deleted!', 'Log has been deleted successfully.', 'success');
        }
      }
      setLastBackupTime(new Date());
    } catch (e) {
      alert("Delete operation failed.");
    }
  };

  const handleConfirmDelete = (type, index, rawDate) => {
    MySwal.fire({
      title: '<span class="text-sm font-black text-slate-800 uppercase tracking-wider">Are you sure?</span>',
      text: "Do you want to delete this log entry? This action cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#475569',
      confirmButtonText: 'YES, DELETE',
      cancelButtonText: 'CANCEL'
    }).then((result) => {
      if (result.isConfirmed) {
        executeDeleteLog(type, index, rawDate);
      }
    });
  };

  const handleInterceptDelete = (config) => {
    if (config.isOpen) {
      handleConfirmDelete(config.type, config.index, config.rawDate);
    }
  };

  const handleShowLogDetails = (log) => {
    showDetailedAuditLog(log);
  };

  const handleShowActionDetails = handleShowLogDetails;

  const handleToggleResolve = async (index, isResolved) => {
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

    const updatedStaff = [...staffLogs];
    updatedStaff[index] = { ...updatedStaff[index], resolved: isResolved, action: actionTaken };
    setStaffLogs(updatedStaff);

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

    try {
      await fetch(`${API_BASE}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter: 'D', shift: activeShift, dept: activeDept, logs: updatedStaff, empId: user?.employeeId, empName: user?.name, userRole: user?.role })
      });
      await fetch(`${API_BASE}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter: 'D', shift: activeShift, dept: activeDept, logs: updatedActivity, empId: user?.employeeId, empName: user?.name, userRole: user?.role })
      });
      await fetchMetrics(false);
    } catch (e) {
      alert("Synchronization failed.");
    }
  };

  const allShiftsStats = useMemo(() => {
    let totalSuccess = 0;
    let totalAlerts = 0;
    const dMetric = metrics.find(m => m.letter === 'D') || initialData[1];
    ['1', '2', '3'].forEach(s => {
      const logs = dMetric.shifts?.[s]?.issueLogs || [];
      logs.forEach(log => {
        const logD = new Date(log.rawDate);
        if (logD.getUTCMonth() === viewMonth && logD.getUTCFullYear() === viewYear) {
          const plan = Number(log.planned) || 0;
          const actual = Number(log.dispatched) || 0;
          const breakdownsVal = Number(log.breakdowns || log.breakdownCount || 0);
          if (plan > 0 || actual > 0) {
            const efficiency = (actual / (plan || 1)) * 100;
            const fail = efficiency < 90 || breakdownsVal > 0;
            if (fail) totalAlerts++;
            else totalSuccess++;
          }
        }
      });
    });
    const total = totalSuccess + totalAlerts;
    const successPercent = total ? Math.round((totalSuccess / total) * 100) : 0;
    return { successPercent, totalSuccess, totalAlerts, total };
  }, [metrics, viewMonth, viewYear]);

  const fetchMetrics = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const res = await fetch(`${API_BASE}?dept=${activeDept}`);
      const dbData = await res.json();
      if (dbData && Array.isArray(dbData)) {
        setMetrics(initialData.map(b => dbData.find(d => d.letter === b.letter) || b));
        const dLive = dbData.find(d => d.letter === 'D');
        if (activeShift === 'overall') {
          const allStaffLogs = [];
          const allActivityLogs = [];
          ['1', '2', '3'].forEach(s => {
            const activeShiftData = dLive?.shifts?.[s] || {};
            if (Array.isArray(activeShiftData.staffLogs)) allStaffLogs.push(...activeShiftData.staffLogs);
            if (Array.isArray(activeShiftData.activityLogs)) allActivityLogs.push(...activeShiftData.activityLogs);
          });
          setStaffLogs(allStaffLogs);
          setActivityLogs(allActivityLogs);
        } else {
          const activeShiftData = dLive?.shifts?.[activeShift] || {};
          setStaffLogs(activeShiftData.staffLogs || []);
          setActivityLogs(activeShiftData.activityLogs || []);
        }
      }
    } catch (e) { console.error("Fetch error:", e); } finally { setLoading(false); }
  };

  const handleLogSubmit = async (type) => {
    setTableSyncing(prev => ({ ...prev, [type]: true }));
    try {
      const res = await fetch(`${API_BASE}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letter: 'D', shift: activeShift, dept: activeDept,
          logs: type === 'staff' ? staffLogs : activityLogs,
          empId: user?.employeeId,
          empName: user?.name,
          userRole: user?.role,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setMetrics(prev => prev.map(m => m.letter === 'D' ? { ...m, ...result } : m));
        type === 'staff' ? setIsStaffModalOpen(false) : setIsActivityModalOpen(false);
        setLastBackupTime(new Date());
      }
    } catch (e) { alert("Sync failed"); } finally { setTableSyncing(prev => ({ ...prev, [type]: false })); }
  };

  const handleUpdateStatus = async () => {
    if (!plannedCount || !dispatchedCount) return alert("Please enter counts");
    const [y, m, d] = customDate.split('-');
    
    const plan = Number(plannedCount);
    const actual = Number(dispatchedCount);
    const breakdownsVal = Number(breakdowns || 0);
    const efficiency = plan > 0 ? (actual / plan) * 100 : 0;
    const isAlert = efficiency < 90 || breakdownsVal > 0;

    if (isAlert) {
      if (!reporterName.trim() || !reporterId.trim() || !alertBrief.trim() || !assignedName.trim() || !assignedId.trim()) {
        alert("Please fill in all alert details (Reporter Name & ID, Alert Brief, and Assigned Employee Name & ID).");
        return;
      }
    }

    const newEntry = {
      date: `${d}/${m}/${y}`, 
      rawDate: customDate,
      planned: plan, 
      dispatched: actual,
      breakdowns: breakdownsVal, 
      pbrDelay: Number(pbrDelay || 0), 
      qcDelay: Number(qcDelay || 0)
    };

    let updatedLogs = [...dData.issueLogs];
    const idx = updatedLogs.findIndex(l => l.rawDate === customDate); 
    if (idx !== -1) updatedLogs[idx] = newEntry;
    else updatedLogs.push(newEntry);

    let newStaffLogs = [...staffLogs];
    if (isAlert) {
      const issueType = breakdownsVal > 0 ? "Machine Breakdown" : "Low Efficiency Delay";
      const newIssue = {
        id: assignedId,
        name: `${alertBrief} (Reported by: ${reporterName} - ID: ${reporterId})`,
        action: "",
        time: getISTTime(),
        resolved: false,
        issueType: issueType,
        reporter: `${reporterName} (${reporterId})`,
        assignedName: assignedName,
        assignedId: assignedId,
        date: `${d}/${m}/${y}`
      };
      newStaffLogs = [newIssue, ...newStaffLogs];
    }

    try {
      const res = await fetch(`${API_BASE}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dData,
          shift: activeShift,
          dept: activeDept,
          issueLogs: updatedLogs,
          empId: user?.employeeId,
          empName: user?.name,
          userRole: user?.role,
        }),
      });

      if (isAlert) {
        await fetch(`${API_BASE}/staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ letter: 'D', shift: activeShift, dept: activeDept, logs: newStaffLogs, empId: user?.employeeId, empName: user?.name, userRole: user?.role }),
        });
      }

      const result = await res.json();
      if (!res.ok) return alert(result.error || result.message || 'Sync failed.');
      await fetchMetrics(false);
      setIsModalOpen(false);
      setAssignedId('');
      setAssignedName('');
      setReporterName('');
      setReporterId('');
      setAlertBrief('');
      setLastBackupTime(new Date());
      
      if (isAlert) {
        const loggedChallenge = {
          id: assignedId,
          name: `${alertBrief} (Reported by: ${reporterName} - ID: ${reporterId})`,
          action: "",
          time: getISTTime(),
          resolved: false,
          issueType: breakdownsVal > 0 ? "Machine Breakdown" : "Low Efficiency Delay",
          reporter: `${reporterName} (${reporterId})`,
          assignedName: assignedName,
          assignedId: assignedId,
          date: `${d}/${m}/${y}`,
          planned: plan,
          dispatched: actual,
          breakdowns: breakdownsVal
        };
        setSelectedChallengeForFda(loggedChallenge);
        setIsFdaWizardOpen(true);
      }
    } catch (e) { alert('Sync failed.'); }
  };

  useEffect(() => {
    fetch(`${API}/api/timelock/${activeDept}/${activeShift}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setTimeLock(d))
      .catch(() => {});
  }, [activeShift, activeDept]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchMetrics();
    return () => clearInterval(timer);
  }, [activeShift, activeDept]); // eslint-disable-line react-hooks/exhaustive-deps

  const dynamicDaysData = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days = Array(daysInMonth).fill('none');
    dData.issueLogs.forEach(log => {
      const d = new Date(log.rawDate);
      if (d.getUTCMonth() === viewMonth && d.getUTCFullYear() === viewYear) {
        const idx = d.getUTCDate() - 1;
        const efficiency = (log.dispatched / (log.planned || 1)) * 100;
        const fail = efficiency < 90 || log.breakdowns > 0;
        const status = fail ? 'fail' : 'success';
        if (idx >= 0 && idx < daysInMonth) {
          if (days[idx] === 'fail' || status === 'fail') {
            days[idx] = 'fail';
          } else {
            days[idx] = 'success';
          }
        }
      }
    });
    return days;
  }, [dData.issueLogs, viewMonth, viewYear]);

  const stats = useMemo(() => ({
    alerts: dynamicDaysData.filter(s => s === 'fail').length,
    success: dynamicDaysData.filter(s => s === 'success').length,
    open: dynamicDaysData.filter(s => s === 'none').length
  }), [dynamicDaysData]);

  const annualTrend = useMemo(() =>
    allYearLogs.map(m => {
      const passCount = m.logs.filter(l => (l.dispatched / (l.planned || 1) * 100) >= 90).length;
      return { name: m.monthName.slice(0, 3), pass: passCount, fail: m.logs.length - passCount };
    }), [allYearLogs]);

  const downloadAllShiftsCSV = async () => {
    try {
      const res = await fetch(`${API}/api/metrics?dept=${activeDept}`);
      const allMetrics = await res.json();
      const dMetric = Array.isArray(allMetrics) ? allMetrics.find(m => m.letter === 'D') : null;
      if (!dMetric) return alert('No data found');

      const headers = ['Shift', 'Date', deptLabels.targetLabel, deptLabels.actualLabel, 'Breakdowns', deptLabels.delay1Col, deptLabels.delay2Col];
      const rows = [];
      for (const s of ['1', '2', '3']) {
        const logs = dMetric.shifts?.[s]?.issueLogs || [];
        logs
          .filter(l => {
            if (!l.rawDate) return false;
            const d = new Date(l.rawDate);
            return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
          })
          .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
          .forEach(l => rows.push([`Shift ${s}`, l.date || l.rawDate, l.planned, l.dispatched, l.breakdowns, l.pbrDelay, l.qcDelay]));
      }
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `Delivery_AllShifts_${activeDept}_${MONTHS[viewMonth]}_${viewYear}.csv`;
      a.click();
    } catch { alert('Failed to download all-shifts data'); }
  };

  return (
    <PageLoader loading={loading}>
    <div ref={reportRef} className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col text-slate-900">
      {/* Custom Styled Alert Popup */}
      {deleteConfig.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-[320px] p-8 shadow-2xl border border-white/20 text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={28} />
            </div>
            <h3 className="text-slate-800 font-black uppercase text-sm tracking-widest mb-2">Confirm Delete</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase leading-relaxed mb-8">
              This action is permanent and will sync with the cloud database immediately.
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={() => handleInterceptDelete({ isOpen: true, type: deleteConfig.type, index: deleteConfig.index, rawDate: deleteConfig.rawDate })}
                className="w-full bg-rose-500 hover:bg-rose-600 py-4 rounded-2xl font-black text-white text-[11px] uppercase shadow-lg shadow-rose-100 transition-all active:scale-95"
              >
                Confirm Deletion
              </button>
              <button 
                onClick={() => setDeleteConfig({ isOpen: false, type: null, index: null, rawDate: null })}
                className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest py-2 hover:text-slate-600 transition-colors"
              >
                Nevermind
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="flex justify-between items-center px-4 sm:px-6 py-3 bg-white border-b border-slate-200 sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-slate-500 font-bold text-xs uppercase hover:text-emerald-600 transition-colors">
          <ChevronLeft size={18} /> <span className="hidden sm:inline">Back</span>
        </button>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-full border border-slate-200 shadow-inner select-none shrink-0">
            {[
              { key: 'overall', label: t('navbar.overall') },
              { key: '1', label: 'S1' },
              { key: '2', label: 'S2' },
              { key: '3', label: 'S3' }
            ].map((item) => {
              const isActive = (activeShift || 'overall') === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(`/shift/${item.key}/${activeDept || 'fgmw'}/d`)}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-200 transform active:scale-95 ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-sm scale-105 font-black' 
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/85 font-bold'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              const headers = ['Date', deptLabels.targetLabel, deptLabels.actualLabel, 'Breakdowns', deptLabels.delay1Col, deptLabels.delay2Col];
              const rows = dData.issueLogs.map(l => [l.date || l.rawDate, l.planned, l.dispatched, l.breakdowns, l.pbrDelay, l.qcDelay]);
              const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
              const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
              a.download = `Delivery_Shift${activeShift}_${activeDept}.csv`; a.click();
            }}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-full text-xs font-bold shadow-sm transition-all">
            <Download size={13} /> <span className="hidden sm:inline">Shiftwise</span>
          </button>
          <button onClick={downloadAllShiftsCSV}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-full text-xs font-bold shadow-sm transition-all">
            <Download size={13} /> <span className="hidden sm:inline">Overall</span>
          </button>
          {canEdit && (
            <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 sm:px-7 py-2 rounded-full text-[11px] font-black uppercase shadow-md transition-all active:scale-95">
              <span className="hidden sm:inline">Update Metrics</span><span className="sm:hidden">Update</span>
            </button>
          )}
        </div>
      </nav>

      {/* Title card — matches Quality page pattern */}
      <div className="px-4 sm:px-6 mb-2 mt-1">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">{t('modules.d')}</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">{t('departments.' + activeDept, DEPT_FULL[activeDept])} · {activeShift === 'overall' ? t('navbar.overall') : t('navbar.shiftNum', { num: activeShift })}</p>
          </div>

          {/* Centered Shift vs All-Shifts Overall performance */}
          <div className="flex items-center gap-6 justify-center sm:mx-auto select-none">
            <div className="text-center px-4 border-r border-slate-200">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{activeShift === 'overall' ? t('navbar.overall') : t('navbar.shiftNum', { num: activeShift })} {t('dashboard.overallYield')}</span>
              <span className="text-base font-black text-slate-850">{stats.success + stats.alerts ? Math.round((stats.success / (stats.success + stats.alerts)) * 100) : 0}%</span>
            </div>
            <div className="text-center px-4">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{t('dashboard.allShiftsYield', 'All-Shifts Yield')}</span>
              <span className="text-base font-black text-emerald-650">{allShiftsStats.successPercent}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full">
              <Clock size={13} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{activeShift === 'overall' ? t('navbar.overall') : t('navbar.shiftNum', { num: activeShift })}</p>
                <p className="text-[11px] font-black text-slate-700">
                  {activeShift === 'overall' ? t('dashboard.allShifts', 'All Shifts') : activeShift === '1' ? '06:00 – 14:00' : activeShift === '2' ? '14:00 – 22:00' : '22:00 – 06:00'}
                </p>
              </div>
            </div>
            {timeLock?.enabled && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full">
                <span className="text-base">⏰</span>
                <div>
                  <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">{t('dashboard.saveWindow', 'Save Window')}</p>
                  <p className="text-[11px] font-black text-amber-800">{timeLock.startTime} – {timeLock.endTime}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 grid grid-cols-12 gap-4 md:gap-6 p-4 md:p-6 max-w-[1600px] mx-auto w-full">
        <div className="col-span-12 md:col-span-6 lg:col-span-3 flex flex-col gap-4 md:gap-6">
          <div className="bg-white rounded-[2rem] p-6 flex flex-col items-center shadow-sm border border-slate-200">
            <div className="flex items-center justify-between w-full mb-6 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              <button onClick={() => setViewDate(new Date(viewYear, viewMonth - 1, 1))}><ChevronLeft size={16} /></button>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase text-slate-800">{MONTHS[viewMonth]}</span>
                <span className="text-[8px] font-bold text-slate-400">{viewYear}</span>
              </div>
              <button onClick={() => setViewDate(new Date(viewYear, viewMonth + 1, 1))}><ChevronRight size={16} /></button>
            </div>
            <CircularTracker 
              letter="D" 
              daysData={dynamicDaysData} 
              size={180} 
              onDayClick={(dayNum) => {
                if (!canEdit) return;
                const clickedDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                
                if (isSupervisor && clickedDateStr !== getISTDate()) {
                  alert("Supervisors can only update today's date");
                  return;
                }
                
                const existing = dData.issueLogs?.find(log => log.rawDate === clickedDateStr);
                if (existing) {
                  setPlannedCount(existing.planned != null ? String(existing.planned) : '');
                  setDispatchedCount(existing.dispatched != null ? String(existing.dispatched) : '');
                  setBreakdowns(existing.breakdowns != null ? String(existing.breakdowns) : '');
                  setPbrDelay(existing.pbrDelay != null ? String(existing.pbrDelay) : '');
                  setQcDelay(existing.qcDelay != null ? String(existing.qcDelay) : '');
                } else {
                  setPlannedCount('');
                  setDispatchedCount('');
                  setBreakdowns('');
                  setPbrDelay('');
                  setQcDelay('');
                }
                setCustomDate(clickedDateStr);
                setIsModalOpen(true);
              }}
            />
            <div className="grid grid-cols-3 gap-3 w-full mt-8">
              <StatBox val={stats.alerts} label="Failed" color="red" />
              <StatBox val={stats.success} label="Passed" color="emerald" />
              <StatBox val={stats.open} label="Pending" color="slate" />
            </div>
          </div>

          <ChartCard title="Current Month Performance">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={[{ n: 'Fail', v: stats.alerts }, { n: 'Pass', v: stats.success }, { n: 'Open', v: stats.open }]}>
                <XAxis dataKey="n" fontSize={8} axisLine={false} tickLine={false} />
                <Bar dataKey="v" radius={[6, 6, 0, 0]} barSize={30}>
                  <Cell fill="#F43F5E" /><Cell fill="#10B981" /><Cell fill="#E2E8F0" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4 md:gap-6">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[320px] max-h-[400px] flex flex-col">
            <SectionHeader icon={<Star size={14} className="text-emerald-500" />} title={deptLabels.archiveTitle} />
            <div className="px-4 md:px-8 py-3 bg-slate-50 grid grid-cols-4 text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
              <span>Timeline</span><span className="text-center">{deptLabels.targetLabel}</span><span className="text-center">{deptLabels.actualLabel}</span><span className="text-right">Action</span>
            </div>
            <InfiniteScrollList data={allYearLogs} type="dispatch" setDeleteConfig={handleInterceptDelete} deptLabels={deptLabels} activeShift={activeShift} />
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[250px] max-h-[320px] flex flex-col">
            <SectionHeader icon={<Clock size={14} className="text-orange-500" />} title="Problem-Solving Metrics" />
            <div className="px-4 md:px-8 py-3 bg-slate-50 grid grid-cols-5 text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
              <span>Date</span><span className="text-center">M/C</span><span className="text-center">{deptLabels.delay1Col}</span><span className="text-center">{deptLabels.delay2Col}</span><span className="text-right">Action</span>
            </div>
            <InfiniteScrollList data={allYearLogs} type="minor" setDeleteConfig={handleInterceptDelete} deptLabels={deptLabels} activeShift={activeShift} />
          </div>
        </div>

        <div className="col-span-12 md:col-span-6 lg:col-span-3 flex flex-col gap-4 md:gap-6">
          <div className="bg-emerald-600 rounded-[2.5rem] p-8 flex flex-col items-center text-white shadow-xl shadow-emerald-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp size={80} /></div>
            <div className="bg-white/20 px-4 py-1.5 rounded-full text-[9px] font-black uppercase mb-6 backdrop-blur-md">Efficiency Index</div>
            <h4 className="text-5xl font-black tracking-tighter">
              {stats.success + stats.alerts > 0 ? ((stats.success / (stats.success + stats.alerts)) * 100).toFixed(1) : "0.0"}%
            </h4>
            <p className="text-[9px] uppercase mt-4 font-bold opacity-80 tracking-widest">Selected Period Yield</p>
          </div>

          <ChartCard title="Yearly Trend Analysis">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={annualTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} fontWeight={800} tickLine={false} axisLine={false} dy={10} tick={{ fill: '#94a3b8' }} />
                <YAxis fontSize={10} fontWeight={800} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', paddingBottom: '20px' }} />
                <Area name="Pass" type="monotone" dataKey="pass" stroke="#10B981" strokeWidth={3} fill="url(#colorPass)" />
                <Area name="Fail" type="monotone" dataKey="fail" stroke="#F43F5E" strokeWidth={2} fill="url(#colorFail)" strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="bg-white rounded-[2rem] p-5 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">System Status</span>
              <span className="text-sm font-black text-slate-800 tabular-nums">{currentTime.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false })}</span>
            </div>
            <div className="space-y-3">
              <TipItem icon={<Activity size={12} className="text-emerald-500" />} text={`Last update: ${Math.floor((currentTime - lastBackupTime)/1000)}s ago`} />
              <TipItem icon={<Calendar size={12} className="text-blue-500" />} text={`Viewing: ${MONTHS[viewMonth]} ${viewYear}`} />
            </div>
          </div>
        </div>

        <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-2">
          <LogContainer title="Issues & Compliance" data={staffLogs} type="staff" onOpen={() => { if (!canEdit) return; setIsActionTrackerMode(false); setIsAddChallengeOpen(true); }} setDeleteConfig={setDeleteConfig} colorTheme="emerald" onToggleResolve={handleToggleResolve} onShowDetails={handleShowLogDetails} canEdit={canEdit} onOpenVerification={(log) => setSelectedChallengeForVerification(log)} onOpenFda={(log) => { setSelectedChallengeForFda(log); setIsFdaWizardOpen(true); }} />
          <LogContainer title="Actions Delivery Logs" data={activityLogs} type="activity" onOpen={() => { if (!canEdit) return; setIsActionTrackerMode(true); setIsAddChallengeOpen(true); }} setDeleteConfig={setDeleteConfig} colorTheme="blue" onShowDetails={handleShowActionDetails} canEdit={canEdit} onOpenVerification={(log) => setSelectedChallengeForVerification(log)} />
        </div>
        {isFdaWizardOpen && selectedChallengeForFda && (
          <FDAInvestigationWizard
            challenge={selectedChallengeForFda}
            dept={activeDept || 'fgmw'}
            shift={activeShift || '1'}
            onClose={() => {
              setIsFdaWizardOpen(false);
              setSelectedChallengeForFda(null);
            }}
            onSaveChallenge={async (wizardData) => {
              await fetchMetrics(false);
            }}
          />
        )}
        {isAddChallengeOpen && (
          <AddChallengeModal
            isOpen={isAddChallengeOpen}
            onClose={() => setIsAddChallengeOpen(false)}
            dept={activeDept || 'fgmw'}
            shift={activeShift || '1'}
            letter="D"
            isActionTracker={isActionTrackerMode}
            onSave={(newChallenge) => {
              navigate(`/fda-defence/challenge/${newChallenge.trackerId}`);
            }}
          />
        )}
        {/* AI Resolution Verification Modal */}
        <AIResolutionVerificationModal
          isOpen={!!selectedChallengeForVerification}
          onClose={() => setSelectedChallengeForVerification(null)}
          challenge={selectedChallengeForVerification}
          onVerificationComplete={(updatedCh) => {
            if (updatedCh) {
              setSelectedChallengeForVerification(prev => ({ ...prev, ...updatedCh }));
            }
            fetchMetrics(false);
          }}
        />
      </main>

      {/* --- Modals --- */}
      <EntryModal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} title="Issues & Compliance" type="staff" data={staffLogs} 
        onAdd={() => { setIsActionTrackerMode(false); setIsAddChallengeOpen(true); }}
        onEdit={(i, f, v) => setStaffLogs(prev => { let u = [...prev]; u[i][f] = v; return u; })}
        setDeleteConfig={handleInterceptDelete} onSubmit={() => handleLogSubmit('staff')} syncing={tableSyncing.staff} onToggleResolve={handleToggleResolve} onShowDetails={handleShowLogDetails} canEdit={canEdit} onOpenFda={(log) => { setSelectedChallengeForFda(log); setIsFdaWizardOpen(true); }} />
 
      <EntryModal isOpen={isActivityModalOpen} onClose={() => setIsActivityModalOpen(false)} title="Actions Delivery Logs" type="activity" data={activityLogs} 
        onAdd={() => { setIsActionTrackerMode(true); setIsAddChallengeOpen(true); }}
        onEdit={(i, f, v) => setActivityLogs(prev => { let u = [...prev]; u[i][f] = v; return u; })}
        setDeleteConfig={handleInterceptDelete} onSubmit={() => handleLogSubmit('activity')} syncing={tableSyncing.activity} onShowDetails={handleShowActionDetails} canEdit={canEdit} />

      {/* Floating All-Shifts CSV download button */}
      <button
        onClick={downloadAllShiftsCSV}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl shadow-emerald-200 flex items-center justify-center z-[90] active:scale-95 transition-all"
        title="Download All Shifts CSV (current month)"
      >
        <Download size={22} />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[130] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-[420px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => { setIsModalOpen(false); setAssignedId(''); setAssignedName(''); }} className="absolute top-6 right-6 text-slate-350 hover:text-red-500 transition-colors">
              <X size={20}/>
            </button>
            <h2 className="font-black text-slate-800 uppercase text-center text-sm mb-2 pr-6">Update Delivery Log</h2>
            <p className="text-[9px] font-bold text-emerald-500 uppercase text-center mb-6 tracking-widest">{DEPT_FULL[activeDept]} · {activeShift === 'overall' ? 'Overall' : `Shift ${activeShift}`}</p>
            <div className="space-y-3">
              <input type="date" value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                max={user?.role === 'supervisor' ? getISTDate() : undefined}
                readOnly={user?.role === 'supervisor'}
                title={user?.role === 'supervisor' ? 'Supervisors can only update today' : ''}
                className="w-full bg-slate-50 rounded-2xl p-4 font-bold outline-none" />

              {/* Performance Metrics */}
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest pt-1 border-t border-slate-100">Performance Metrics</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase -mt-1">{deptLabels.planVsActual} — Green: ≥90% · Red: &lt;90%</p>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder={deptLabels.targetLabel} value={plannedCount} onChange={e => setPlannedCount(e.target.value)} className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-[12px]" />
                <input type="number" placeholder={deptLabels.actualLabel} value={dispatchedCount} onChange={e => setDispatchedCount(e.target.value)} className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-[12px]" />
              </div>

              {/* Problem-Solving Metrics */}
              <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest pt-1 border-t border-slate-100">Problem-Solving Metrics</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase -mt-1">Equipment Breakdown — Green: 0 · Red: &gt;0</p>
              <input type="number" placeholder="No. of Equipment Breakdown" value={breakdowns} onChange={e => setBreakdowns(e.target.value)} className="w-full bg-slate-50 rounded-2xl p-4 font-bold" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder={deptLabels.delay1Ph} value={pbrDelay} onChange={e => setPbrDelay(e.target.value)} className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-[10px]" />
                <input type="number" placeholder={deptLabels.delay2Ph} value={qcDelay} onChange={e => setQcDelay(e.target.value)} className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-[10px]" />
              </div>

              {/* Commit and Close */}
              {((Number(plannedCount || 0) > 0 || Number(dispatchedCount || 0) > 0) && ((Number(plannedCount || 0) > 0 ? (Number(dispatchedCount || 0) / Number(plannedCount || 0)) * 100 : 0) < 90 || Number(breakdowns || 0) > 0)) && (
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
              )}

              <button onClick={handleUpdateStatus} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase mt-2">Commit to Database</button>
              <button onClick={() => { setIsModalOpen(false); setAssignedId(''); setAssignedName(''); }} className="w-full text-[10px] font-bold text-slate-400 uppercase">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PageLoader>
  );
};

const TableContent = ({ data, type, onEdit, readonly, setDeleteConfig, onToggleResolve, onShowDetails, canEdit, onOpenFda, onOpenVerification }) => {
  const isStaff = type === 'staff';

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="overflow-x-auto flex-1 flex flex-col">
        <div className="min-w-[420px] flex flex-col flex-1">
          {/* Header */}
          <div className="px-4 py-2 bg-slate-50 flex gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 select-none">
            <span className="w-24">Tracking ID</span>
            <span className="w-24">Date</span>
            <span className="flex-1">Assigned To</span>
            <span className="flex-1">Action</span>
            <span className="w-16">Time</span>
            <span className="w-24 text-center">Resolve</span>
          </div>
          {/* Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {data.length === 0 ? (
              <div className="p-8 text-center text-slate-300 text-[10px] font-bold">No entries yet. Click "+ New Entry" to add one.</div>
            ) : (
              data.map((log, i) => {
                const isResolved = log.resolved === true;
                const rowBgClass = isStaff 
                  ? (isResolved ? 'bg-emerald-50/50 border-l-4 border-emerald-500 hover:bg-emerald-100/50' : 'bg-red-50/55 border-l-4 border-red-400 hover:bg-red-100/50')
                  : 'hover:bg-slate-50/50';

                return (
                  <div 
                    key={i} 
                    onClick={(e) => {
                      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                        if (onShowDetails) onShowDetails(log);
                      }
                    }}
                    className={`py-3 flex gap-4 items-center group px-4 cursor-pointer ${rowBgClass}`}
                  >
                    {/* Tracking ID */}
                    <span className="w-24 text-[10px] font-black text-slate-800 tracking-tight">
                      {log.trackerId || log.id || (log._id ? `CH-2026-${log._id.toString().slice(-4).toUpperCase()}` : '') || `CH-2026-${(i + 1).toString().padStart(4, '0')}`}
                    </span>

                    {/* Date */}
                    <span className="w-24 text-[9.5px] font-bold text-slate-500">{log.date || log.rawDate || getISTDate()}</span>

                    {/* Assigned To */}
                    <span className="flex-1 text-[10px] font-black text-slate-700 truncate">
                      {log.responsiblePersonName || log.responsiblePerson?.name || (log.assignedName && log.assignedName !== 'N/A' ? log.assignedName : null) || log.reportedByName || 'System Assigned'}
                    </span>

                    {/* Action */}
                    <span className="flex-1 text-[9.5px] font-medium text-slate-500 truncate">{log.action || log.actionNotes || log.capa || log.description || log.name || 'Action Logged'}</span>

                    {/* Time */}
                    <span className="w-16 text-[9px] font-black text-slate-400">{log.time || log.occurredTime || getISTTime()}</span>

                    {/* Resolve Toggle & Delete */}
                    <div className="w-24 flex items-center justify-center gap-2 shrink-0 select-none">
                      {isStaff && (
                        <button
                          disabled={!canEdit}
                          type="button"
                          title={isResolved ? "View Verification / Resolution Status" : "Upload After Image & Verify Resolution"}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenVerification) {
                              onOpenVerification(log);
                            } else if (onToggleResolve) {
                              onToggleResolve(i, !isResolved);
                            }
                          }}
                          className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 outline-none flex items-center ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ${isResolved ? 'bg-emerald-500 justify-end' : 'bg-red-500 justify-start'}`}
                        >
                          <div className="bg-white w-3.5 h-3.5 rounded-full shadow-md"></div>
                        </button>
                      )}
                      {setDeleteConfig && (
                        <button
                          type="button"
                          title="Delete Entry (Superadmin Only)"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfig({ isOpen: true, type, index: i, rawDate: log.rawDate });
                          }}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const minorColor = (value, type) => {
  const n = Number(value);
  if (type === 'pct') return n >= 100 ? 'text-emerald-600' : 'text-rose-500';
  return n === 0 ? 'text-emerald-600' : 'text-rose-500';
};

const minorFmt = (value, unit) => {
  const n = Number(value);
  if (value === '' || value === null || value === undefined) return '-';
  if (unit === 'min') return `${n}m`;
  if (unit === '%') return `${n}%`;
  return `${n}`;
};

const InfiniteScrollList = ({ data, type, setDeleteConfig, deptLabels, activeShift }) => (
  <div className="flex-1 overflow-y-auto no-scrollbar px-4 md:px-8">
    {data.map(({ monthName, logs }) => logs.length > 0 && (
      <div key={monthName} className="mb-6">
        <div className="sticky top-0 bg-white/90 py-3 text-[9px] font-black text-emerald-600 uppercase border-b border-slate-50 z-10">{monthName}</div>
        {logs.map((log, i) => {
          const efficiency = log.planned > 0 ? (log.dispatched / log.planned) * 100 : 0;
          const dispatchOk = efficiency >= 90;
          return (
            <div key={i} className={`grid ${type === 'dispatch' ? 'grid-cols-4' : 'grid-cols-5'} py-4 text-[11px] border-b border-slate-50 items-center group`}>
              <div className="flex flex-col">
                <span className="font-bold text-slate-400">{log.date.split('/')[0]}/{log.date.split('/')[1]}</span>
                {activeShift === 'overall' && log.shift && (
                  <span className="text-[8px] bg-slate-100 text-slate-700 px-1 py-0.5 rounded w-max mt-0.5 font-bold leading-none">
                    S{log.shift}
                  </span>
                )}
              </div>
              {type === 'dispatch' ? (
                <>
                  <span className="text-center text-slate-400 font-bold">{log.planned}</span>
                  <span className={`text-center font-black ${dispatchOk ? 'text-emerald-600' : 'text-rose-500'}`}>{log.dispatched}</span>
                </>
              ) : (
                <>
                  <span className={`text-center font-black ${Number(log.breakdowns) === 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {log.breakdowns ?? '-'}
                  </span>
                  <span className={`text-center font-bold ${minorColor(log.pbrDelay, deptLabels?.delay1Type)}`}>
                    {minorFmt(log.pbrDelay, deptLabels?.delay1Unit)}
                  </span>
                  <span className={`text-center font-bold ${minorColor(log.qcDelay, deptLabels?.delay2Type)}`}>
                    {minorFmt(log.qcDelay, deptLabels?.delay2Unit)}
                  </span>
                </>
              )}
              <div className="text-right">
                <button
                  onClick={() => setDeleteConfig({ isOpen: true, type: type, index: i, rawDate: log.rawDate })}
                  className="opacity-0 group-hover:opacity-100 p-1 text-rose-400 hover:bg-rose-50 rounded transition-all"
                >
                  <Trash2 size={12}/>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    ))}
  </div>
);

const LogContainer = ({ title, data, type, onOpen, colorTheme, setDeleteConfig, onToggleResolve, onShowDetails, canEdit, onOpenFda, onOpenVerification }) => {
  const theme = THEME_STYLES[colorTheme];
  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[350px]">
      <div className={`px-8 py-5 flex justify-between items-center border-b border-slate-50 ${theme.light}`}>
        <h3 className={`font-black text-[11px] uppercase ${theme.text}`}>{title}</h3>
      </div>
      <TableContent data={data.slice(0, 5)} type={type} readonly setDeleteConfig={setDeleteConfig} onToggleResolve={onToggleResolve} onShowDetails={onShowDetails} canEdit={canEdit} onOpenFda={onOpenFda} onOpenVerification={onOpenVerification} />
    </div>
  );
};

const EntryModal = ({ isOpen, onClose, title, type, data, onAdd, onEdit, onSubmit, syncing, setDeleteConfig, onToggleResolve, onShowDetails, canEdit, onOpenFda }) => {
  if (!isOpen) return null;
  const theme = THEME_STYLES[type === 'staff' ? 'emerald' : 'blue'];
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl flex flex-col h-[85vh] shadow-2xl">
        <div className={`p-8 border-b flex justify-between items-center ${theme.light}`}>
          <h2 className={`font-black ${theme.text} uppercase text-[12px]`}>{title}</h2>
          {canEdit && (
            <button onClick={onAdd} className={`${theme.bg} text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg transition-all active:scale-95`}>+ New Entry</button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          <TableContent data={data} type={type} onEdit={onEdit} setDeleteConfig={setDeleteConfig} onToggleResolve={onToggleResolve} onShowDetails={onShowDetails} canEdit={canEdit} onOpenFda={onOpenFda} />
        </div>
        <div className="p-8 border-t flex items-center gap-6">
          <button onClick={onClose} className="font-black text-slate-400 text-[10px] uppercase">Discard</button>
          <button onClick={onSubmit} className={`flex-1 ${theme.bg} text-white py-4 rounded-2xl font-black text-[11px] uppercase transition-all active:scale-95`}>
            {syncing ? "Syncing..." : "Save and Push to Cloud"}
          </button>
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({ icon, title }) => (
  <div className="px-4 md:px-8 py-4 md:py-5 border-b border-slate-50 flex items-center gap-3 bg-white shrink-0">
    <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
    <h3 className="font-black text-[11px] text-slate-700 uppercase">{title}</h3>
  </div>
);

const StatBox = ({ val, label, color }) => (
  <div className="text-center p-3 rounded-[1.5rem] bg-slate-50 border border-slate-100 transition-transform hover:scale-105">
    <div className={`text-lg font-black ${color === 'emerald' ? 'text-emerald-500' : color === 'red' ? 'text-rose-500' : 'text-slate-400'}`}>{val}</div>
    <div className="text-[8px] font-black uppercase text-slate-400 mt-1">{label}</div>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-6 flex flex-col min-h-[240px]">
    <h4 className="font-black text-[9px] text-slate-400 uppercase tracking-widest mb-6 border-l-2 border-emerald-500 pl-3">{title}</h4>
    <div className="flex-1">{children}</div>
  </div>
);

const TipItem = ({ icon, text }) => (
  <div className="flex items-center gap-4 group">
    <div className="p-2.5 bg-slate-50 rounded-2xl border border-transparent">{icon}</div>
    <p className="text-[10px] font-bold text-slate-500 uppercase">{text}</p>
  </div>
);

export default DeliveryPage;