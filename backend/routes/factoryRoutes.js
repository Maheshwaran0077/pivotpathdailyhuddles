const express = require('express');
const router = express.Router();
const FactoryDefect = require('../models/FactoryDefect');
const Metric = require('../models/Metrics');
const Health = require('../models/Health');

// Helper to convert date to YYYY-MM-DD in IST timezone
const getISTDateString = (date) => {
  return new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

// Department Station Maps
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

// Seeding utility: Populates 90 days of dummy defects with shift, department, and pillar info
const seedDummyDefects = async () => {
  try {
    const count = await FactoryDefect.countDocuments();
    if (count > 0) return;

    console.log("🌱 Database is empty. Seeding 90 days of factory defect data with departments, shifts, and pillars...");
    const stations = ['PPP-1', 'PRO-2', 'SPP-3', 'FGMW-1', 'PMW-2', 'RMW-1', 'FAC-1', 'QCMAD-2', 'POP-1'];
    const seedEntries = [];
    const now = new Date();
    const pillars = ['Quality', 'Delivery', 'Safety', 'Health'];

    for (let i = 90; i >= 0; i--) {
      const dayDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      let numDefects = 0;
      const rand = Math.random();
      if (rand < 0.25) numDefects = 0;
      else if (rand < 0.65) numDefects = 1;
      else if (rand < 0.88) numDefects = 2;
      else numDefects = 3;

      // Inject the Production Department / Quality Pillar "Machine Broken" trend for the past 60 days (past 2 months)
      let injectMachineFailure = false;
      if (i < 60 && i > 10 && Math.random() < 0.35) {
        injectMachineFailure = true;
        numDefects += 1; // force extra defect
      }

      for (let j = 0; j < numDefects; j++) {
        const station = stations[Math.floor(Math.random() * stations.length)];
        const department = DEPT_MAP[station] || 'Production';
        
        let pillar = pillars[Math.floor(Math.random() * pillars.length)];
        let severity = Math.random() < 0.6 ? 'Low' : (Math.random() < 0.9 ? 'Medium' : 'High');
        let errorType = '';
        
        if (injectMachineFailure && (department === 'Production' || department === 'Primary Packing Production')) {
          // Force machine breakdown issue under the Quality pillar
          pillar = 'Quality';
          errorType = 'machine breakdown';
          severity = 'High';
          injectMachineFailure = false; // consume it
        } else {
          // Select errors based on user's custom specifications for each pillar
          if (pillar === 'Quality') {
            const qualityErrors = ['machine breakdown', 'no power', 'no manpower', 'quality reject', 'other issue'];
            errorType = qualityErrors[Math.floor(Math.random() * qualityErrors.length)];
          } else if (pillar === 'Delivery') {
            errorType = 'Plan vs Actual Manufactured (Yield: <90%)';
          } else if (pillar === 'Safety') {
            const safetyErrors = ['Safety Incident Reported (>0)', 'Near Miss Incident (>0)', 'Unsafe Act / Condition (>0)', 'Personnel Incident / People Affected'];
            errorType = safetyErrors[Math.floor(Math.random() * safetyErrors.length)];
          } else if (pillar === 'Health') {
            const healthErrors = ['Missed Health Huddle / Attendance Anomaly', 'Attendance Meeting Skipped'];
            errorType = healthErrors[Math.floor(Math.random() * healthErrors.length)];
          } else {
            errorType = 'General Defect';
          }
        }

        const shift = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
        
        const entryTime = new Date(dayDate);
        entryTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

        seedEntries.push({
          timestamp: entryTime,
          stationId: station,
          errorType,
          department,
          pillar,
          shift,
          severity
        });
      }
    }

    await FactoryDefect.insertMany(seedEntries);
    console.log(`✅ Seeded ${seedEntries.length} factory defect records successfully.`);
  } catch (err) {
    console.error("❌ Seeding factory defects failed:", err.message);
  }
};

// GET /api/factory/forecast
router.get('/forecast', async (req, res) => {
  try {
    const { department, pillar, shift } = req.query;

    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    sixtyDaysAgo.setHours(0, 0, 0, 0);

    const METRIC_DEPT_TO_FULL = {
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

    const DEPT_TO_STATION = {
      'Primary Packing Production': 'PPP-1',
      'Production': 'PRO-2',
      'Secondary Packing Production': 'SPP-3',
      'Finished Good Material Warehouse': 'FGMW-1',
      'Packing Material Warehouse': 'PMW-2',
      'Raw Material Warehouse': 'RMW-1',
      'Facilities': 'FAC-1',
      'QC & Microbiology & AD Lab': 'QCMAD-2',
      'Post Production': 'POP-1'
    };

    const PILLAR_MAP = {
      Q: 'Quality',
      D: 'Delivery',
      S: 'Safety',
      H: 'Health'
    };

    const defects = [];

    // 1. Fetch Metrics from database
    const metricsDocs = await Metric.find().lean();
    metricsDocs.forEach(m => {
      const pName = PILLAR_MAP[m.letter?.toUpperCase()];
      if (!pName) return;

      const deptName = METRIC_DEPT_TO_FULL[m.dept?.toLowerCase()];
      if (!deptName) return;

      const stationId = DEPT_TO_STATION[deptName] || 'PRO-2';

      ['1', '2', '3'].forEach(shiftNum => {
        const sd = m.shifts?.[shiftNum] || {};
        const logs = Array.isArray(sd.issueLogs) ? sd.issueLogs : [];

        logs.forEach(l => {
          const timestamp = l.timestamp ? new Date(l.timestamp) : new Date(l.rawDate || l.date);
          if (isNaN(timestamp.getTime())) return;
          if (timestamp < sixtyDaysAgo) return;

          let isDefect = false;
          let errorType = l.reason || l.incident || 'General Issue';
          
          if (m.letter === 'Q') {
            isDefect = l.reason !== 'Target Met';
          } else if (m.letter === 'S') {
            isDefect = (Number(l.numSafetyIncidents) || 0) > 0;
          } else if (m.letter === 'D') {
            const planned = Number(l.planned) || 0;
            const dispatched = Number(l.dispatched) || 0;
            const breakdowns = Number(l.breakdowns) || 0;
            const efficiency = planned ? (dispatched / planned) * 100 : 0;
            isDefect = efficiency < 90 || breakdowns > 0;
            if (isDefect) {
              errorType = breakdowns > 0 ? `Machine breakdown: ${breakdowns} mins` : `Yield low: ${efficiency.toFixed(1)}%`;
            }
          } else {
            isDefect = true;
          }

          if (isDefect) {
            let severity = l.severity || 'Medium';
            if (severity.toLowerCase() === 'high') severity = 'High';
            else if (severity.toLowerCase() === 'low') severity = 'Low';
            else severity = 'Medium';

            defects.push({
              timestamp,
              stationId,
              errorType,
              department: deptName,
              pillar: pName,
              shift: parseInt(shiftNum),
              severity
            });
          }
        });
      });
    });

    // 2. Fetch Health anomalies from Health documents
    try {
      const healthDocs = await Health.find().lean();
      const MONTHS = {
        January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
        July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
      };

      healthDocs.forEach(doc => {
        const deptName = METRIC_DEPT_TO_FULL[doc.dept?.toLowerCase()];
        if (!deptName) return;
        const stationId = DEPT_TO_STATION[deptName] || 'PRO-2';

        (doc.days || []).forEach(day => {
          if (day.status === 'no-meeting') {
            const monthIdx = MONTHS[doc.month];
            if (monthIdx === undefined) return;
            const timestamp = new Date(doc.year, monthIdx, day.date);
            if (isNaN(timestamp.getTime())) return;
            if (timestamp < sixtyDaysAgo) return;

            defects.push({
              timestamp,
              stationId,
              errorType: day.remarks || 'Missed Health Meeting',
              department: deptName,
              pillar: 'Health',
              shift: parseInt(doc.shift) || 1,
              severity: 'Medium'
            });
          }
        });
      });
    } catch (err) {
      console.error("Error reading health defects for forecasting:", err.message);
    }

    // Sort by timestamp
    defects.sort((a, b) => a.timestamp - b.timestamp);

    // Apply filters in-memory
    const filteredDefects = defects.filter(defect => {
      if (department && department !== 'Overall' && defect.department !== department) {
        return false;
      }
      if (pillar && pillar !== 'Overall' && defect.pillar !== pillar) {
        return false;
      }
      if (shift && shift !== 'Overall' && defect.shift !== parseInt(shift)) {
        return false;
      }
      return true;
    });

    const historyMap = {};
    const stationSummary = {};
    const departmentSummary = {
      'Finished Good Material Warehouse': { total: 0, high: 0, medium: 0, low: 0, errorTypes: {} },
      'Packing Material Warehouse': { total: 0, high: 0, medium: 0, low: 0, errorTypes: {} },
      'Raw Material Warehouse': { total: 0, high: 0, medium: 0, low: 0, errorTypes: {} },
      'Primary Packing Production': { total: 0, high: 0, medium: 0, low: 0, errorTypes: {} },
      'Post Production': { total: 0, high: 0, medium: 0, low: 0, errorTypes: {} },
      'QC & Microbiology & AD Lab': { total: 0, high: 0, medium: 0, low: 0, errorTypes: {} },
      'Production': { total: 0, high: 0, medium: 0, low: 0, errorTypes: {} },
      'Secondary Packing Production': { total: 0, high: 0, medium: 0, low: 0, errorTypes: {} },
      'Facilities': { total: 0, high: 0, medium: 0, low: 0, errorTypes: {} }
    };

    for (let i = 60; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = getISTDateString(d);
      historyMap[dStr] = { count: 0, defects: [] };
    }

    filteredDefects.forEach(defect => {
      const dStr = getISTDateString(defect.timestamp);
      if (historyMap[dStr]) {
        historyMap[dStr].count += 1;
        historyMap[dStr].defects.push({
          stationId: defect.stationId,
          errorType: defect.errorType,
          department: defect.department,
          pillar: defect.pillar,
          shift: defect.shift,
          severity: defect.severity,
          time: new Date(defect.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })
        });
      }

      // Track station stats
      if (!stationSummary[defect.stationId]) {
        stationSummary[defect.stationId] = { total: 0, high: 0, medium: 0, low: 0, errorTypes: {} };
      }
      stationSummary[defect.stationId].total += 1;
      stationSummary[defect.stationId][defect.severity.toLowerCase()] += 1;
      stationSummary[defect.stationId].errorTypes[defect.errorType] = (stationSummary[defect.stationId].errorTypes[defect.errorType] || 0) + 1;

      // Track department stats
      const dept = defect.department || 'Production';
      if (departmentSummary[dept]) {
        departmentSummary[dept].total += 1;
        departmentSummary[dept][defect.severity.toLowerCase()] += 1;
        departmentSummary[dept].errorTypes[defect.errorType] = (departmentSummary[dept].errorTypes[defect.errorType] || 0) + 1;
      }
    });

    const dateKeys = Object.keys(historyMap).sort();
    const yValues = dateKeys.map(date => historyMap[date].count);

    const actualDataset = dateKeys.map(date => ({
      date,
      actual: historyMap[date].count,
      predicted: null,
      lowerBound: null,
      upperBound: null,
      isForecast: false,
      logs: historyMap[date].defects
    }));

    const stationReport = Object.keys(stationSummary).map(id => {
      const stats = stationSummary[id];
      const errorRank = Object.entries(stats.errorTypes).sort((a, b) => b[1] - a[1]);
      return {
        stationId: id,
        department: DEPT_MAP[id] || 'Production',
        totalDefects: stats.total,
        highSeverityCount: stats.high,
        mediumSeverityCount: stats.medium,
        lowSeverityCount: stats.low,
        primaryErrorType: errorRank[0] ? errorRank[0][0] : 'N/A',
        riskLevel: stats.high > 8 ? 'Critical' : (stats.high > 3 || stats.total > 15 ? 'High' : 'Normal')
      };
    }).sort((a, b) => b.totalDefects - a.totalDefects);

    const departmentReport = Object.keys(departmentSummary).map(name => {
      const stats = departmentSummary[name];
      const errorRank = Object.entries(stats.errorTypes).sort((a, b) => b[1] - a[1]);
      return {
        departmentName: name,
        totalDefects: stats.total,
        highSeverityCount: stats.high,
        mediumSeverityCount: stats.medium,
        lowSeverityCount: stats.low,
        primaryErrorType: errorRank[0] ? errorRank[0][0] : 'None Detected'
      };
    });

    // ----------------------------------------
    // FORWARD TO PYTHON FASTAPI SERVICE
    // ----------------------------------------
    let mlServiceStatus = 'online';
    let predictionResult = null;

    try {
      const payload = actualDataset.map(item => ({
        date: item.date,
        actual: item.actual
      }));

      const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
      console.log(`[ML SERVICE] Initiating request to Python forecasting engine at ${ML_SERVICE_URL}/predict with ${payload.length} data points.`);

      const pyResponse = await fetch(`${ML_SERVICE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload })
      });

      if (!pyResponse.ok) {
        let errText = '';
        try {
          errText = await pyResponse.text();
        } catch (_) {}
        console.error(`❌ [ML SERVICE HTTP ERROR] FastAPI returned status ${pyResponse.status} ${pyResponse.statusText}. Response body: ${errText}`);
        throw new Error(`FastAPI returned status code ${pyResponse.status}`);
      }

      predictionResult = await pyResponse.json();
      console.log(`[ML SERVICE] Successfully received forecast predictions from Python engine.`);
    } catch (mlErr) {
      console.error(`❌ [ML SERVICE CONNECTION ERROR] Failed to communicate with Python microservice. Error details:`, mlErr);
      mlServiceStatus = 'offline';
    }

    let combinedData = [];
    let metrics = {};

    if (mlServiceStatus === 'online' && predictionResult) {
      metrics = predictionResult.metrics;
      const pyForecast = predictionResult.forecast.map(item => ({
        date: item.date,
        actual: null,
        predicted: item.predicted,
        lowerBound: item.lowerBound,
        upperBound: item.upperBound,
        isForecast: true,
        logs: []
      }));

      const lastActual = actualDataset[actualDataset.length - 1];
      const connectionPoint = {
        date: lastActual.date,
        actual: lastActual.actual,
        predicted: lastActual.actual,
        lowerBound: lastActual.actual,
        upperBound: lastActual.actual,
        isForecast: true,
        logs: []
      };

      combinedData = [...actualDataset, connectionPoint, ...pyForecast];
    } else {
      // Node.js local forecasting engine fallback
      const n = yValues.length;
      let weightedSum = 0;
      let weightTotal = 0;
      const windowSize = Math.min(14, n);
      for (let i = 0; i < windowSize; i++) {
        const idx = n - windowSize + i;
        const weight = i + 1;
        weightedSum += yValues[idx] * weight;
        weightTotal += weight;
      }
      const rollingAverage = weightTotal > 0 ? (weightedSum / weightTotal) : 0;

      const trendWindow = Math.min(30, n);
      let xSum = 0, ySum = 0, xxSum = 0, xySum = 0;
      for (let i = 0; i < trendWindow; i++) {
        const idx = n - trendWindow + i;
        xSum += i;
        ySum += yValues[idx];
        xxSum += i * i;
        xySum += i * yValues[idx];
      }
      const meanX = xSum / trendWindow;
      const meanY = ySum / trendWindow;
      let num = 0, den = 0;
      for (let i = 0; i < trendWindow; i++) {
        const idx = n - trendWindow + i;
        num += (i - meanX) * (yValues[idx] - meanY);
        den += (i - meanX) * (i - meanX);
      }
      let trendVelocity = den > 0 ? (num / den) : 0;
      trendVelocity = Math.max(-0.4, Math.min(0.4, trendVelocity));

      let varianceSum = 0;
      for (let i = 0; i < trendWindow; i++) {
        const idx = n - trendWindow + i;
        varianceSum += Math.pow(yValues[idx] - meanY, 2);
      }
      const standardDeviation = Math.max(0.5, Math.sqrt(varianceSum / trendWindow));

      metrics = {
        rollingAverage: parseFloat(rollingAverage.toFixed(2)),
        trendVelocity: parseFloat(trendVelocity.toFixed(2)),
        standardDeviation: parseFloat(standardDeviation.toFixed(2))
      };

      const forecastDataset = [];
      const lastActual = actualDataset[actualDataset.length - 1];
      forecastDataset.push({
        date: lastActual.date,
        actual: lastActual.actual,
        predicted: lastActual.actual,
        lowerBound: lastActual.actual,
        upperBound: lastActual.actual,
        isForecast: true,
        logs: []
      });

      for (let d = 1; d <= 40; d++) {
        const forecastDate = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
        const dateStr = getISTDateString(forecastDate);
        let predicted = rollingAverage + (trendVelocity * d);
        predicted = Math.max(0, parseFloat(predicted.toFixed(2)));
        const margin = 1.96 * standardDeviation * Math.sqrt(d);
        const lowerBound = Math.max(0, parseFloat((predicted - margin).toFixed(2)));
        const upperBound = parseFloat((predicted + margin).toFixed(2));

        forecastDataset.push({
          date: dateStr,
          actual: null,
          predicted,
          lowerBound,
          upperBound,
          isForecast: true,
          logs: []
        });
      }

      combinedData = [...actualDataset, ...forecastDataset.slice(1)];
    }

    res.json({
      metrics,
      stationReport,
      departmentReport,
      mlServiceStatus,
      data: combinedData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/factory/seed (manual seed trigger)
router.post('/seed', async (req, res) => {
  try {
    await FactoryDefect.deleteMany({});
    await seedDummyDefects();
    res.json({ success: true, message: "Defect database seeded successfully with department assignments" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
