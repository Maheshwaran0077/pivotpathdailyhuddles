const TimeLock = require('../models/TimeLock');
const AuditLog = require('../models/AuditLog');
const HodNotification = require('../models/HodNotification');
const User = require('../models/User');

const MODULE_NAMES = { Q: 'Quality', D: 'Delivery', S: 'Safety', H: 'Health' };

// IST = UTC+5:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const nowIST = () => new Date(Date.now() + IST_OFFSET_MS);

const formatISTTime = (istDate) => {
  const h = String(istDate.getUTCHours()).padStart(2, '0');
  const m = String(istDate.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};


const formatISTDate = (istDate) => istDate.toISOString().split('T')[0];

// Returns { allowed: true } or { allowed: false, message }
const parseISTTimeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return (h * 60) + m;
};

const checkTimeLock = async (dept, shift) => {
  try {
    const lock = await TimeLock.findOne({ dept, shift, enabled: true });
    if (!lock) return { allowed: true };

    const ist = nowIST();
    const cur = formatISTTime(ist);
    const nowMinutes = parseISTTimeToMinutes(cur);
    const startMinutes = parseISTTimeToMinutes(lock.startTime);
    const endMinutes = parseISTTimeToMinutes(lock.endTime);

    const withinWindow = startMinutes <= endMinutes
      ? nowMinutes >= startMinutes && nowMinutes <= endMinutes
      : nowMinutes >= startMinutes || nowMinutes <= endMinutes;

    if (withinWindow) return { allowed: true };

    return {
      allowed: false,
      message: `Shift ${shift} timing exceeded (${lock.startTime}–${lock.endTime} IST). Contact your superadmin.`,
    };
  } catch {
    return { allowed: true }; // fail open so saves still work if DB is down
  }
};

const createAuditLog = async ({ date, empId, empName, dept, shift, module, deptType }) => {
  try {
    await AuditLog.create({
      date, empId, empName, dept, shift,
      module: module || null,
      deptType: deptType || 'special',
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('AuditLog error:', err.message);
  }
};

// Finds the HOD whose department field contains `dept` and creates a notification.
const notifyHod = async ({ empId, empName, dept, shift, module, deptType, date }) => {
  try {
    const deptRegex = new RegExp(`(^|,)\\s*${dept}\\s*(,|$)`, 'i');
    const hod = await User.findOne({ role: 'hod', department: { $regex: deptRegex } });
    if (!hod) return;

    const ist = nowIST();
    const dateStr = date || formatISTDate(ist);
    const timeStr = formatISTTime(ist);
    const modName = module ? `${module} — ${MODULE_NAMES[module] || module}` : 'Update';

    const msg = [
      `Emp: ${empName} (${empId})`,
      `Dept: ${dept.toUpperCase()}`,
      `Shift: ${shift}`,
      `Module: ${modName}`,
      `Date: ${dateStr}`,
      `Time: ${timeStr} IST`,
    ].join(' | ');

    await HodNotification.create({
      hodDept: dept,
      empId,
      empName,
      dept,
      shift,
      module: module || null,
      deptType: deptType || 'qdsh',
      message: msg,
      timestamp: new Date(),
      read: false,
    });
  } catch (err) {
    console.error('HodNotification error:', err.message);
  }
};

module.exports = { checkTimeLock, createAuditLog, notifyHod, nowIST, formatISTTime, formatISTDate };
