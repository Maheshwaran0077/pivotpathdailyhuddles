const express = require('express');
const router  = express.Router();
const Metric  = require('../models/Metrics');
const Health  = require('../models/Health');
const { checkTimeLock, createAuditLog, notifyHod, nowIST, formatISTDate } = require('../utils/saveHelpers');

const DEPT_CONFIG = {
  fgmw:   'Finished Goods Warehouse',
  pmw:    'Packing Material Warehouse',
  rmw:    'Raw Material Warehouse',
  ppp:    'Primary Packing Production',
  pop:    'Post Production',
  qcmad:  'QC & Microbiology Lab',
  pro:    'Production',
  spp:    'Secondary Packing Production',
  fac:    'Facilities',
  ehs:    'Environment, Health & Safety',
  engineering: 'Engineering & Works Management',
  hr:     'Human Resources',
  unknown: 'Unassigned Department',
};

const TYPE_MAP = { Q: 'Quality', D: 'Delivery', S: 'Safety', H: 'Health', I: 'Improvement' };

const getLabel = (letter, dept) => {
  const deptName = DEPT_CONFIG[dept] || 'General';
  const isProduction = ['ppp', 'pro', 'spp'].includes(dept);
  const typeLabel = letter === 'D' ? (isProduction ? 'Production' : 'Dispatch') : TYPE_MAP[letter] || 'Metric';
  return `${deptName} ${typeLabel}`;
};

const getShiftCounts = (metric, shift, month = null) => {
  const shiftData = metric.shifts?.[shift] || {};
  const logs = Array.isArray(shiftData.issueLogs) ? shiftData.issueLogs : [];
  let totalAlerts = 0;
  let totalSuccess = 0;

  // Filter logs for this month if specified (month format is "YYYY-MM")
  const filteredLogs = month
    ? logs.filter(l => (l.rawDate && l.rawDate.startsWith(month)) || (l.date && l.date.split('/').reverse().join('-').startsWith(month)))
    : logs;

  if (!logs.length) {
    if (month) return { totalAlerts: 0, totalSuccess: 0 };
    totalAlerts += shiftData.alerts ?? 0;
    totalSuccess += shiftData.success ?? 0;
    return { totalAlerts, totalSuccess };
  }

  const count = (isSuccess) => {
    if (isSuccess) totalSuccess += 1;
    else totalAlerts += 1;
  };

  switch (metric.letter) {
    case 'Q':
      filteredLogs.forEach((l) => count(l.reason === 'Target Met'));
      break;
    case 'S':
      filteredLogs.forEach((l) => count((Number(l.numSafetyIncidents) || 0) === 0));
      break;
    case 'D':
      filteredLogs.forEach((l) => {
        const planned = Number(l.planned) || 0;
        const dispatched = Number(l.dispatched) || 0;
        const breakdowns = Number(l.breakdowns) || 0;
        const efficiency = planned ? (dispatched / planned) * 100 : 0;
        count(efficiency >= 90 && breakdowns === 0);
      });
      break;
    default:
      if (!month) {
        totalAlerts += shiftData.alerts ?? 0;
        totalSuccess += shiftData.success ?? 0;
      }
  }

  return { totalAlerts, totalSuccess };
};

// GET metrics (filtered by shift & dept)
router.get('/', async (req, res) => {
  try {
    const { shift, dept } = req.query;
    const query = {};
    if (dept) query.dept = dept;

    const metrics = await Metric.find(query);
    if (!shift) return res.json(metrics);

    const shiftMetrics = metrics.map(m => {
      const sd = m.shifts?.[shift] || {};
      return {
        _id: m._id, letter: m.letter, dept: m.dept,
        label: m.label || getLabel(m.letter, m.dept),
        alerts: sd.alerts ?? 0, success: sd.success ?? 0,
        daysData: sd.daysData ?? [], issueLogs: sd.issueLogs ?? [],
        staffLogs: sd.staffLogs ?? [], activityLogs: sd.activityLogs ?? [],
      };
    });
    res.json(shiftMetrics);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET global pillar totals for operational dashboard
router.get('/global-pillars', async (req, res) => {
  try {
    const { month } = req.query; // Expects "YYYY-MM"
    const letters = ['Q', 'D', 'S', 'H'];
    const pillars = letters.reduce((acc, letter) => ({
      ...acc,
      [letter.toLowerCase()]: { 
        totalAlerts: 0, 
        totalSuccess: 0, 
        alertPercent: 0, 
        successPercent: 0,
        alertsList: [],
        successList: []
      },
    }), {});

    const metrics = await Metric.find({ letter: { $in: letters } });
    metrics.forEach(metric => {
      const key = metric.letter.toLowerCase();
      if (!pillars[key]) return;
      ['1', '2', '3'].forEach(shift => {
        const counts = getShiftCounts(metric, shift, month);
        pillars[key].totalAlerts += counts.totalAlerts;
        pillars[key].totalSuccess += counts.totalSuccess;

        // Collect logs lists for Q, D, S
        if (['q', 'd', 's'].includes(key)) {
          const shiftData = metric.shifts?.[shift] || {};
          const logs = Array.isArray(shiftData.issueLogs) ? shiftData.issueLogs : [];
          const deptName = DEPT_CONFIG[metric.dept] || metric.dept.toUpperCase();

          const filteredLogs = month
            ? logs.filter(l => (l.rawDate && l.rawDate.startsWith(month)) || (l.date && l.date.split('/').reverse().join('-').startsWith(month)))
            : logs;

          filteredLogs.forEach(l => {
            const logDate = l.date || 'N/A';
            if (metric.letter === 'Q') {
              const isSuccess = l.reason === 'Target Met';
              if (isSuccess) {
                pillars[key].successList.push({ dept: deptName, shift, date: logDate, detail: 'Target Met' });
              } else {
                pillars[key].alertsList.push({ dept: deptName, shift, date: logDate, detail: l.reason || 'N/A' });
              }
            } else if (metric.letter === 'S') {
              const safetyIncidents = Number(l.numSafetyIncidents) || 0;
              if (safetyIncidents === 0) {
                pillars[key].successList.push({ dept: deptName, shift, date: logDate, detail: 'No safety incidents recorded' });
              } else {
                const detail = `Incidents: ${safetyIncidents}, Near Misses: ${Number(l.numNearMiss) || 0}, Unsafe Acts: ${Number(l.numUnsafeActs) || 0}. Details: ${l.incident || 'None'}`;
                pillars[key].alertsList.push({ dept: deptName, shift, date: logDate, detail });
              }
            } else if (metric.letter === 'D') {
              const planned = Number(l.planned) || 0;
              const dispatched = Number(l.dispatched) || 0;
              const breakdowns = Number(l.breakdowns) || 0;
              const efficiency = planned ? (dispatched / planned) * 100 : 0;
              const isSuccess = efficiency >= 90 && breakdowns === 0;
              
              if (isSuccess) {
                const detail = `Planned: ${planned}, Dispatched: ${dispatched} (${efficiency.toFixed(1)}% Efficiency)`;
                pillars[key].successList.push({ dept: deptName, shift, date: logDate, detail });
              } else {
                const detail = `Planned: ${planned}, Dispatched: ${dispatched} (${efficiency.toFixed(1)}% Efficiency). Breakdowns: ${breakdowns} mins. Reason: ${l.reason || 'N/A'}`;
                pillars[key].alertsList.push({ dept: deptName, shift, date: logDate, detail });
              }
            }
          });
        }
      });
    });

    // Health pillar should be derived from Health documents (meeting vs no-meeting)
    try {
      const query = {};
      if (month) {
        const [yStr, mStr] = month.split('-');
        const yearNum = Number(yStr);
        const MONTH_NAMES = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthLong = MONTH_NAMES[Number(mStr) - 1];
        
        query.year = yearNum;
        query.month = monthLong;
      }
      
      const healthDocs = await Health.find(query);
      let hAlerts = 0;
      let hSuccess = 0;
      healthDocs.forEach(doc => {
        const deptName = DEPT_CONFIG[doc.dept] || doc.dept.toUpperCase();
        (doc.days || []).forEach(day => {
          const dateStr = `${doc.year}-${doc.month} Day ${day.date}`;
          if (String(day.status) === 'meeting') {
            hSuccess += 1;
            const detail = `Health Meeting held. Attendance: ${day.attendance || 'N/A'}, Attendees: ${day.attendees || 0}/${day.totalStrength || 0}`;
            pillars.h.successList.push({ dept: deptName, shift: doc.shift, date: dateStr, detail });
          } else if (String(day.status) === 'no-meeting') {
            hAlerts += 1;
            const detail = `Missed Health Meeting. Remarks: ${day.remarks || 'None'}`;
            pillars.h.alertsList.push({ dept: deptName, shift: doc.shift, date: dateStr, detail });
          }
        });
      });
      pillars.h.totalAlerts = hAlerts;
      pillars.h.totalSuccess = hSuccess;
    } catch (err) {
      console.error('Health aggregation error:', err.message);
    }
 
    Object.values(pillars).forEach(pillar => {
      const total = pillar.totalAlerts + pillar.totalSuccess;
      pillar.successPercent = total ? Math.round((pillar.totalSuccess / total) * 100) : 0;
      pillar.alertPercent = total ? Math.round((pillar.totalAlerts / total) * 100) : 0;
    });

    res.json(pillars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST update metrics
router.post('/update', async (req, res) => {
  const { letter, dept, shift, daysData, alerts, success, issueLogs, empId, empName, userRole } = req.body;

  if (!shift) return res.status(400).json({ error: 'Shift is required' });
  if (!dept || !DEPT_CONFIG[dept]) return res.status(400).json({ error: 'Invalid department' });

  // Time lock & Supervisor shift/dept check
  if (userRole !== 'superadmin') {
    const lockCheck = await checkTimeLock(dept, shift);
    if (!lockCheck.allowed) return res.status(403).json({ error: lockCheck.message });

    if (empId) {
      const User = require('../models/User');
      const dbUser = await User.findOne({ employeeId: empId });
      if (dbUser && dbUser.role === 'supervisor') {
        const allowedShifts = (dbUser.shift || '').split(',').map(s => s.trim()).filter(Boolean);
        const allowedDepts = (dbUser.department || '').split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
        const hasShiftRestriction = allowedShifts.length > 0 && !allowedShifts.includes('NONE');
        if (hasShiftRestriction && !allowedShifts.includes(shift)) {
          return res.status(403).json({ error: `Not authorized to update Shift ${shift}` });
        }
        if (!allowedDepts.includes(dept.toLowerCase())) {
          return res.status(403).json({ error: `Not authorized to update department ${dept}` });
        }
      }
    }
  }

  try {
    const updated = await Metric.findOneAndUpdate(
      { letter, dept },
      {
        $setOnInsert: { label: getLabel(letter, dept) },
        $set: {
          [`shifts.${shift}.daysData`]:   daysData   ?? [],
          [`shifts.${shift}.alerts`]:     alerts     ?? 0,
          [`shifts.${shift}.success`]:    success    ?? 0,
          [`shifts.${shift}.issueLogs`]:  issueLogs  ?? [],
        },
      },
      { upsert: true, new: true }
    );

    // Async side-effects (non-blocking)
    if (empId && empName) {
      const today = formatISTDate(nowIST());
      createAuditLog({ date: today, empId, empName, dept, shift, module: letter, deptType: 'qdsh' });
      notifyHod({ empId, empName, dept, shift, module: letter, deptType: 'qdsh' });
    }

    const sd = updated.shifts?.[shift] || {};
    res.json({ _id: updated._id, letter: updated.letter, dept: updated.dept, label: updated.label, ...sd.toObject?.() || sd });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST staff logs
router.post('/staff', async (req, res) => {
  const { letter, dept, shift, logs, empId, empName, userRole } = req.body;
  if (!shift) return res.status(400).json({ error: 'Shift is required' });
  if (!dept || !DEPT_CONFIG[dept]) return res.status(400).json({ error: 'Invalid department' });

  if (userRole !== 'superadmin') {
    const lockCheck = await checkTimeLock(dept, shift);
    if (!lockCheck.allowed) return res.status(403).json({ error: lockCheck.message });

    if (empId) {
      const User = require('../models/User');
      const dbUser = await User.findOne({ employeeId: empId });
      if (dbUser && dbUser.role === 'supervisor') {
        const allowedShifts = (dbUser.shift || '').split(',').map(s => s.trim()).filter(Boolean);
        const allowedDepts = (dbUser.department || '').split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
        const hasShiftRestriction = allowedShifts.length > 0 && !allowedShifts.includes('NONE');
        if (hasShiftRestriction && !allowedShifts.includes(shift)) {
          return res.status(403).json({ error: `Not authorized to update Shift ${shift}` });
        }
        if (!allowedDepts.includes(dept.toLowerCase())) {
          return res.status(403).json({ error: `Not authorized to update department ${dept}` });
        }
      }
    }
  }

  try {
    const updated = await Metric.findOneAndUpdate(
      { letter, dept },
      { $setOnInsert: { label: getLabel(letter, dept) }, $set: { [`shifts.${shift}.staffLogs`]: logs ?? [] } },
      { upsert: true, new: true }
    );
    if (empId && empName) {
      const today = formatISTDate(nowIST());
      notifyHod({ empId, empName, dept, shift, module: letter, deptType: 'qdsh' });
      createAuditLog({ date: today, empId, empName, dept, shift, module: letter, deptType: 'qdsh' });
    }
    res.json(updated.shifts?.[shift]?.staffLogs || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST activity logs
router.post('/activity', async (req, res) => {
  const { letter, dept, shift, logs, userRole, empId } = req.body;
  if (!shift) return res.status(400).json({ error: 'Shift is required' });
  if (!dept || !DEPT_CONFIG[dept]) return res.status(400).json({ error: 'Invalid department' });

  if (userRole !== 'superadmin') {
    const lockCheck = await checkTimeLock(dept, shift);
    if (!lockCheck.allowed) return res.status(403).json({ error: lockCheck.message });

    if (empId) {
      const User = require('../models/User');
      const dbUser = await User.findOne({ employeeId: empId });
      if (dbUser && dbUser.role === 'supervisor') {
        const allowedShifts = (dbUser.shift || '').split(',').map(s => s.trim()).filter(Boolean);
        const allowedDepts = (dbUser.department || '').split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
        const hasShiftRestriction = allowedShifts.length > 0 && !allowedShifts.includes('NONE');
        if (hasShiftRestriction && !allowedShifts.includes(shift)) {
          return res.status(403).json({ error: `Not authorized to update Shift ${shift}` });
        }
        if (!allowedDepts.includes(dept.toLowerCase())) {
          return res.status(403).json({ error: `Not authorized to update department ${dept}` });
        }
      }
    }
  }

  try {
    const updated = await Metric.findOneAndUpdate(
      { letter, dept },
      { $setOnInsert: { label: getLabel(letter, dept) }, $set: { [`shifts.${shift}.activityLogs`]: logs ?? [] } },
      { upsert: true, new: true }
    );
    res.json(updated.shifts?.[shift]?.activityLogs || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
