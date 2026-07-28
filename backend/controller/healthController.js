const HealthModel  = require('../models/Health');
const { checkTimeLock, createAuditLog, notifyHod, nowIST, formatISTDate } = require('../utils/saveHelpers');

const getHealthData = async (req, res) => {
  try {
    const { month, year, dept, shift } = req.query;
    const record = await HealthModel.findOne({
      month, year: Number(year), dept: dept || 'fgmw', shift: shift || '1',
    });
    if (!record) return res.status(200).json({ days: [] });
    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateHealthDay = async (req, res) => {
  try {
    const {
      month, year, dept, shift, date,
      status, keypoints, attendance, attendees, totalStrength,
      userRole, empId, empName,
    } = req.body;

    if (!month || !year || !date || !status) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const d = dept  || 'fgmw';
    const s = shift || '1';

    // Timelock & Supervisor department/shift check — superadmin always bypasses
    if (userRole !== 'superadmin') {
      const lockCheck = await checkTimeLock(d, s);
      if (!lockCheck.allowed) {
        return res.status(403).json({ message: lockCheck.message });
      }
      if (empId) {
        const User = require('../models/User');
        const dbUser = await User.findOne({ employeeId: empId });
        if (dbUser && dbUser.role === 'supervisor') {
          const allowedShifts = (dbUser.shift || '').split(',').map(sh => sh.trim()).filter(Boolean);
          const allowedDepts = (dbUser.department || '').split(',').map(dp => dp.trim().toLowerCase()).filter(Boolean);
          const hasShiftRestriction = allowedShifts.length > 0 && !allowedShifts.includes('NONE');
          if (hasShiftRestriction && !allowedShifts.includes(s)) {
            return res.status(403).json({ message: `Not authorized to update Shift ${s}` });
          }
          if (!allowedDepts.includes(d.toLowerCase())) {
            return res.status(403).json({ message: `Not authorized to update department ${d}` });
          }
        }
      }
    }

    const filter = { month, year: Number(year), dept: d, shift: s };
    let record = await HealthModel.findOne(filter);

    if (!record) {
      const initialDays = Array.from({ length: 31 }, (_, i) => ({
        date: i + 1, status: null, keypoints: '',
        attendance: '', attendees: null, totalStrength: null,
      }));
      record = new HealthModel({ ...filter, days: initialDays });
    }

    const dayIndex = record.days.findIndex(day => day.date === Number(date));
    if (dayIndex === -1) return res.status(400).json({ message: `Invalid date: ${date}` });

    record.days[dayIndex] = {
      date:          Number(date),
      status,
      keypoints:     keypoints     || '',
      attendance:    attendance    || '',
      attendees:     attendees     != null ? Number(attendees)     : null,
      totalStrength: totalStrength != null ? Number(totalStrength) : null,
    };

    await record.save();

    // Async notifications & audit (non-blocking)
    if (empId && empName) {
      const today = formatISTDate(nowIST());
      createAuditLog({ date: today, empId, empName, dept: d, shift: s, module: 'H', deptType: 'qdsh' });
      notifyHod({ empId, empName, dept: d, shift: s, module: 'H', deptType: 'qdsh', date: today });
    }

    res.status(200).json({ message: 'Updated successfully', record });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: `Validation Error: ${msgs.join(', ')}` });
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getHealthData, updateHealthDay };
