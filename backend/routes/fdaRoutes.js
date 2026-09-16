const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const FDAInvestigation = require('../models/FDAInvestigation');
const Metric = require('../models/Metrics');
const EhsEntry = require('../models/EhsEntry');
const EngineeringEntry = require('../models/EngineeringEntry');
const FDADefenceAssessment = require('../models/FDADefenceAssessment');

const getISTTime = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });

const getNextTrackerId = async () => {
  const year = new Date().getFullYear();
  const prefix = `CH-${year}-`;
  let maxSeq = 0;

  const metrics = await Metric.find({});
  metrics.forEach(m => {
    ['1', '2', '3'].forEach(s => {
      const logs = [
        ...(m.shifts?.[s]?.staffLogs || []),
        ...(m.shifts?.[s]?.activityLogs || [])
      ];
      logs.forEach(log => {
        const id = log.trackerId || log.id || '';
        if (id.startsWith(prefix)) {
          const numPart = parseInt(id.replace(prefix, ''), 10);
          if (!isNaN(numPart) && numPart > maxSeq) {
            maxSeq = numPart;
          }
        } else if (id.startsWith('TRK-')) {
          const numPart = parseInt(id.replace('TRK-', ''), 10);
          if (!isNaN(numPart) && numPart > maxSeq) {
            maxSeq = numPart;
          }
        }
      });
    });
  });

  try {
    const invs = await FDAInvestigation.find({}).select('challengeId');
    invs.forEach(inv => {
      const id = inv.challengeId || '';
      if (id.startsWith(prefix)) {
        const numPart = parseInt(id.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxSeq) {
          maxSeq = numPart;
        }
      } else if (id.startsWith('TRK-')) {
        const numPart = parseInt(id.replace('TRK-', ''), 10);
        if (!isNaN(numPart) && numPart > maxSeq) {
          maxSeq = numPart;
        }
      }
    });
  } catch (e) {
    // Ignore search errors if collection empty
  }

  const nextNum = maxSeq + 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

// 1. GET FDA Investigation by Challenge ID
router.get('/investigation/:challengeId', async (req, res) => {
  try {
    const { challengeId } = req.params;
    let inv = await FDAInvestigation.findOne({ challengeId });
    if (!inv) {
      // Return a blank template if it doesn't exist yet
      return res.json({
        challengeId,
        questions: [],
        overallStatus: 'NOT_ANSWERED'
      });
    }
    res.json(inv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST Save/Update FDA Investigation
router.post('/investigation', async (req, res) => {
  try {
    const { challengeId, department, questions, createdBy, overallStatus } = req.body;
    
    if (!challengeId) {
      return res.status(400).json({ error: 'challengeId is required' });
    }

    const updated = await FDAInvestigation.findOneAndUpdate(
      { challengeId },
      {
        $set: {
          department,
          questions,
          createdBy,
          overallStatus: overallStatus || 'NOT_ANSWERED'
        }
      },
      { upsert: true, new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. POST Upload Evidence File (Base64)
router.post('/upload', async (req, res) => {
  try {
    const { fileName, fileData } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'fileName and fileData (base64) are required' });
    }

    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const base64Data = fileData.replace(/^data:.*;base64,/, "");
    const safeFileName = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
    const filePath = path.join(uploadDir, safeFileName);

    fs.writeFileSync(filePath, base64Data, 'base64');

    const fileUrl = `/uploads/${safeFileName}`;
    res.json({ fileUrl, fileName: safeFileName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. POST Auto Fill FDA Question
router.post('/autofill', async (req, res) => {
  try {
    const { challengeId, questionId, department, shift, date, challengeName, details } = req.body;
    
    if (!challengeId || !questionId) {
      return res.status(400).json({ error: 'challengeId and questionId are required' });
    }

    // A. Gather context data from Database
    const deptKey = (department || 'fgmw').toLowerCase();
    const shiftVal = shift || '1';

    // 1. Fetch current department metrics
    const metricDoc = await Metric.findOne({ dept: deptKey });
    
    // Extract update logs, staff logs, and activity logs
    const shiftData = metricDoc?.shifts?.[shiftVal] || {};
    const issueLogs = (shiftData.issueLogs || []).filter(l => l.date === date || l.rawDate === date);
    const staffLogs = (shiftData.staffLogs || []);
    const activityLogs = (shiftData.activityLogs || []);
    
    // Find the specific challenge log
    const challengeLog = staffLogs.find(l => l.id === challengeId || (l.date === date && l.name.includes(challengeName)));

    // 2. Fetch engineering and EHS logs on this date
    const ehsDoc = await EhsEntry.findOne({ date });
    const engDoc = await EngineeringEntry.findOne({ date });

    // 3. Fetch previous challenges in this department (for Question 5)
    const prevChallenges = staffLogs.filter(l => l.id !== challengeId);

    const context = {
      challengeLog,
      issueLogs,
      activityLogs,
      ehsDoc,
      engDoc,
      prevChallenges
    };

    const questionTexts = {
      Q1: "Why did the issue occur?",
      Q2: "Was the applicable procedure or SOP followed?",
      Q3: "Was the equipment/material/process in the required condition at the time of the event?",
      Q4: "What was the actual impact of the issue?",
      Q5: "Has a similar issue occurred previously?",
      Q6: "What was identified as the root cause?",
      Q7: "What corrective or preventive action was taken?",
      Q8: "How was the effectiveness of the corrective action verified?"
    };

    const questionText = questionTexts[questionId] || "Investigator question";

    // B. Check if Gemini API is available
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (apiKey) {
      try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const systemInstruction = `You are assisting with internal inspection-readiness analysis.
Use ONLY the provided QDSHI records.
Never invent facts.
If the provided records do not contain enough information to answer the question, return status: "INSUFFICIENT_DATA".
Every factual statement must be traceable to the provided records.
Do not claim that an answer is FDA-approved or guaranteed to satisfy FDA requirements.`;

        const promptText = `
${systemInstruction}

We are investigating a challenge/issue:
Department: ${department.toUpperCase()}
Shift: ${shiftVal}
Date: ${date}
Challenge details: ${challengeName} (ID: ${challengeId})

Here are the available records from QDSHI:
---
[CURRENT CHALLENGE RECORD]
${JSON.stringify(challengeLog || {})}

[UPDATE LOGS]
${JSON.stringify(issueLogs)}

[ACTION TRACKER RECORDS]
${JSON.stringify(activityLogs)}

[ENGINEERING / EHS / HEALTH RECORDS ON THIS DATE]
${JSON.stringify({ ehs: ehsDoc, engineering: engDoc })}

[PREVIOUS CHALLENGES IN THIS DEPARTMENT]
${JSON.stringify(prevChallenges)}
---

Question: ${questionText}
Write a response based ONLY on the records above. If there is insufficient data, return status "INSUFFICIENT_DATA".
Return JSON matching this schema:
{
  "status": "AUTO_FILLED" | "INSUFFICIENT_DATA",
  "answer": "Answer text here (2-3 sentences max) based ONLY on records, or explaining why there is insufficient data.",
  "sources": ["List of specific records used, e.g. Challenge #CH-2026-0042", "Update Log #UL-182"],
  "confidence": 0-100 (percentage confidence)
}
`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1
            }
          })
        });

        if (response.ok) {
          const result = await response.json();
          const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (responseText) {
            const parsed = JSON.parse(responseText.trim());
            return res.json(parsed);
          }
        }
      } catch (aiErr) {
        console.error("Gemini API call failed, falling back to heuristics:", aiErr.message);
      }
    }

    // C. Fallback: Heuristic-based Rule Engine (No Fabrication)
    const result = runHeuristicAutoFill(questionId, context, {
      challengeId,
      department,
      shift: shiftVal,
      date,
      challengeName
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Heuristic rule engine for auto-filling questions based on database context
function runHeuristicAutoFill(qId, ctx, meta) {
  const { challengeLog, issueLogs, activityLogs, ehsDoc, engDoc, prevChallenges } = ctx;
  const { date, challengeName } = meta;

  let answer = "";
  let status = "INSUFFICIENT_DATA";
  let sources = [];
  let confidence = 0;

  switch (qId) {
    case 'Q1': // Why did the issue occur?
      if (challengeLog && challengeLog.issueType) {
        answer = `The issue occurred due to ${challengeLog.issueType.toLowerCase()}, logged on ${date}. Brief: ${challengeLog.name.split(' (Reported by:')[0]}.`;
        status = "AUTO_FILLED";
        sources = [`Challenge #${challengeLog.id || 'N/A'}`];
        confidence = 90;
      } else if (issueLogs.length > 0 && issueLogs[0].reason) {
        answer = `The issue occurred due to: ${issueLogs[0].reason} as logged in the shift update logs on ${date}.`;
        status = "AUTO_FILLED";
        sources = [`Update Log on ${date}`];
        confidence = 80;
      } else {
        answer = "No supporting record was found to automatically answer why the issue occurred.";
      }
      break;

    case 'Q2': // Was procedure followed?
      if (challengeLog && challengeLog.deviationType) {
        if (challengeLog.deviationType === "Human Error") {
          answer = "The deviation type was recorded as Human Error, indicating that the standard operating procedure (SOP) was not fully followed.";
          status = "AUTO_FILLED";
          sources = [`Challenge #${challengeLog.id || 'N/A'}`];
          confidence = 85;
        } else if (challengeLog.deviationType === "Process Error") {
          answer = "The deviation type was recorded as Process Error, suggesting a system breakdown rather than an employee failing to follow the SOP.";
          status = "AUTO_FILLED";
          sources = [`Challenge #${challengeLog.id || 'N/A'}`];
          confidence = 85;
        }
      } else if (issueLogs.length > 0 && issueLogs[0].deviationType) {
        answer = `The shift update log indicates a deviation type of "${issueLogs[0].deviationType}".`;
        status = "AUTO_FILLED";
        sources = [`Update Log on ${date}`];
        confidence = 75;
      } else {
        answer = "No procedure deviation details were found in the active records.";
      }
      break;

    case 'Q3': // Equipment condition?
      const breakdownLog = issueLogs.find(l => Number(l.breakdowns) > 0);
      if (breakdownLog) {
        answer = `Equipment breakdown was recorded on ${date} for ${breakdownLog.breakdowns} minutes, indicating it was not in the required condition.`;
        status = "AUTO_FILLED";
        sources = [`Update Log on ${date}`];
        confidence = 90;
      } else if (engDoc && engDoc.entries.length > 0) {
        const badEng = engDoc.entries.find(e => e.statusRag === 'R' || e.remarks.toLowerCase().includes('breakdown'));
        if (badEng) {
          answer = `Engineering maintenance entry on ${date} reports: "${badEng.remarks}" under responsibility of ${badEng.actionOwner || 'N/A'}.`;
          status = "AUTO_FILLED";
          sources = [`Maintenance Record on ${date}`];
          confidence = 85;
        }
      }
      if (!answer) {
        answer = "No equipment breakdown, calibration, or maintenance log details were found for this date.";
      }
      break;

    case 'Q4': // Actual impact?
      if (challengeLog) {
        const severity = challengeLog.severity || 'N/A';
        const reporter = challengeLog.reporter || 'N/A';
        answer = `The issue was logged with severity: ${severity}. Reporter details: ${reporter}.`;
        status = "AUTO_FILLED";
        sources = [`Challenge #${challengeLog.id || 'N/A'}`];
        confidence = 85;

        // Check if production planned vs dispatch details exist on the update log
        const dLog = issueLogs[0];
        if (dLog && dLog.planned) {
          const planned = Number(dLog.planned);
          const disp = Number(dLog.dispatched);
          const eff = planned ? Math.round((disp / planned) * 100) : 0;
          answer += ` Actual output was ${disp} units vs planned ${planned} units (${eff}% efficiency).`;
          sources.push(`Update Log on ${date}`);
        }
      } else {
        answer = "No impact details could be automatically aggregated.";
      }
      break;

    case 'Q5': // Similar issue previously?
      const matches = prevChallenges.filter(c => c.issueType && challengeLog && c.issueType === challengeLog.issueType);
      if (matches.length > 0) {
        answer = `Yes, a similar issue (${challengeLog.issueType}) previously occurred on ${matches[0].date || 'an earlier date'} (ID: ${matches[0].id}).`;
        status = "AUTO_FILLED";
        sources = matches.map(m => `Previous Challenge #${m.id}`);
        confidence = 90;
      } else {
        answer = "No previous occurrences of a similar issue were found in the active logs.";
      }
      break;

    case 'Q6': // Root cause?
      if (challengeLog && challengeLog.deviationType) {
        answer = `Root cause was associated with a ${challengeLog.deviationType.toLowerCase()} during shift operations.`;
        status = "AUTO_FILLED";
        sources = [`Challenge #${challengeLog.id || 'N/A'}`];
        confidence = 80;
      } else {
        answer = "No root cause investigation details are recorded for this issue.";
      }
      break;

    case 'Q7': // Action taken?
      if (challengeLog && challengeLog.action) {
        answer = `The logged corrective action is: "${challengeLog.action}".`;
        status = "AUTO_FILLED";
        sources = [`Challenge #${challengeLog.id || 'N/A'}`];
        confidence = 90;
      } else {
        const relatedAct = activityLogs.find(a => a.id === challengeLog?.id || a.name.toLowerCase().includes(challengeName.toLowerCase()));
        if (relatedAct) {
          answer = `Action tracker record shows: "${relatedAct.name}" assigned to ${relatedAct.action || 'N/A'}.`;
          status = "AUTO_FILLED";
          sources = ["Action Tracker"];
          confidence = 85;
        }
      }
      if (!answer) {
        answer = "No corrective or preventive action (CAPA) logs were found.";
      }
      break;

    case 'Q8': // Effectiveness verified?
      if (challengeLog && challengeLog.resolved) {
        answer = `Effectiveness verified: The challenge status is marked as Resolved. Completed details: "${challengeLog.action || 'Completed'}".`;
        status = "AUTO_FILLED";
        sources = [`Challenge #${challengeLog.id || 'N/A'}`];
        confidence = 90;
      } else {
        answer = "Effectiveness verification is incomplete. The challenge remains unresolved in the system.";
      }
      break;
  }

  if (status === 'INSUFFICIENT_DATA' || !answer || answer.toLowerCase().includes('no supporting record') || answer.toLowerCase().includes('incomplete')) {
    status = 'INSUFFICIENT_DATA';
    answer = "⚠️ Information Not Available\n\nNo supporting record was found.\n\nPlease provide the information manually.";
  }

  return {
    status,
    answer,
    sources,
    confidence
  };
}

// --- Challenges API ---

// 5. POST Create Challenge
router.post('/challenges', async (req, res) => {
  try {
    const {
      date,
      occurredTime,
      department,
      shift,
      errorType,
      otherErrorType,
      alertTypes,
      alertIncidentType,
      otherAlertIncidentType,
      description,
      relatedChallengeId,
      responsiblePersonId,
      responsiblePersonName,
      responsiblePersonEmployeeId,
      reportedByUserId,
      reportedByName,
      reportedByEmployeeId,
      markResolved,
      actionStatus,
      actionNotes,
      letter,
      isActionTracker,
      beforeImage,
      resolutionVerification: initialVerification
    } = req.body;

    const trackerId = await getNextTrackerId();
    const deptKey = (department || 'fgmw').toLowerCase();
    const shiftVal = shift || '1';
    const activeLetter = letter || 'Q';

    // Normalise alert types — support both legacy multi-select array and new single-select
    const primaryAlert = alertIncidentType || (Array.isArray(alertTypes) ? alertTypes[0] : alertTypes) || '';
    const normalizedAlertTypes = primaryAlert ? [primaryAlert] : (alertTypes || []);

    const resVer = initialVerification || {};
    if (beforeImage && !resVer.beforeImage) {
      resVer.beforeImage = beforeImage;
      if (!Array.isArray(resVer.verificationHistory)) resVer.verificationHistory = [];
      resVer.verificationHistory.push({
        action: 'UPLOAD_BEFORE',
        performedBy: reportedByName || 'User',
        performedByEmployeeId: reportedByEmployeeId || '',
        performedByRole: 'employee',
        timestamp: new Date(),
        details: { url: beforeImage.url, fileName: beforeImage.fileName }
      });
    }

    const newChallenge = {
      id: trackerId,
      trackerId,
      date: date || new Date().toLocaleDateString('en-CA'),
      occurredTime: occurredTime || getISTTime(),
      department: deptKey,
      severity: req.body.severity || 'Medium',
      capa: req.body.capa || actionNotes || '',
      errorType: errorType || 'Other',
      otherErrorType: otherErrorType || '',
      alertTypes: normalizedAlertTypes,
      alertIncidentType: primaryAlert,
      otherAlertIncidentType: primaryAlert === 'Other' ? (otherAlertIncidentType || '') : '',
      description: description || '',
      relatedChallengeId: relatedChallengeId || '',
      responsiblePersonId: responsiblePersonId || '',
      responsiblePersonName: responsiblePersonName || '',
      responsiblePersonEmployeeId: responsiblePersonEmployeeId || '',
      reportedByUserId: reportedByUserId || '',
      reportedByName: reportedByName || '',
      reportedByEmployeeId: reportedByEmployeeId || '',
      status: markResolved ? 'CLOSED' : (req.body.status || 'PENDING'),
      markResolved: !!markResolved,
      resolvedBy: markResolved ? (reportedByName || 'User') : '',
      resolvedAt: markResolved ? new Date() : null,
      actionStatus: actionStatus || 'Initialized',
      actionNotes: actionNotes || '',
      beforeImage: beforeImage || resVer.beforeImage || null,
      afterImage: req.body.afterImage || resVer.afterImage || null,
      resolutionVerification: resVer,
      name: `${description.slice(0, 50)} (Reported by: ${reportedByName || 'User'} - ID: ${reportedByEmployeeId || 'N/A'})`,
      action: actionNotes || '',
      time: occurredTime || getISTTime()
    };

    const arrayField = isActionTracker ? 'activityLogs' : 'staffLogs';

    // Push into the correct Metric shift
    await Metric.findOneAndUpdate(
      { letter: activeLetter, dept: deptKey },
      {
        $push: { [`shifts.${shiftVal}.${arrayField}`]: newChallenge }
      },
      { upsert: true, new: true }
    );

    // Initialize FDA Defence Investigation checklist for this challenge safely
    await FDAInvestigation.findOneAndUpdate(
      { challengeId: trackerId },
      {
        $setOnInsert: {
          challengeId: trackerId,
          department: deptKey,
          createdBy: reportedByName || 'System',
          overallStatus: 'NOT_ANSWERED',
          questions: []
        }
      },
      { upsert: true, new: true }
    );

    res.status(201).json(newChallenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GET All Challenges
router.get('/challenges', async (req, res) => {
  try {
    const { department, errorType, status, defenceStatus, resolved, responsiblePerson } = req.query;

    const metrics = await Metric.find({});
    let challenges = [];

    metrics.forEach(m => {
      ['1', '2', '3'].forEach(s => {
        const logs = m.shifts?.[s]?.staffLogs || [];
        logs.forEach((log, idx) => {
          const logObj = log.toObject?.() || log;
          const trkId = logObj.trackerId || logObj.id || (logObj._id ? `CH-2026-${logObj._id.toString().slice(-4).toUpperCase()}` : `CH-2026-S${s}-${(idx + 1).toString().padStart(3, '0')}`);
          challenges.push({
            ...logObj,
            trackerId: trkId,
            id: trkId,
            shift: s,
            letter: m.letter,
            isActionTracker: false
          });
        });
        const actLogs = m.shifts?.[s]?.activityLogs || [];
        actLogs.forEach((log, idx) => {
          const logObj = log.toObject?.() || log;
          const trkId = logObj.trackerId || logObj.id || (logObj._id ? `CH-2026-${logObj._id.toString().slice(-4).toUpperCase()}` : `CH-2026-A${s}-${(idx + 1).toString().padStart(3, '0')}`);
          challenges.push({
            ...logObj,
            trackerId: trkId,
            id: trkId,
            shift: s,
            letter: m.letter,
            isActionTracker: true
          });
        });
      });
    });

    const investigations = await FDAInvestigation.find({});
    const invMap = {};
    investigations.forEach(inv => {
      invMap[inv.challengeId] = inv;
    });

    // Calculate recurring count by department + errorType
    const typeDeptCounts = {};
    challenges.forEach(ch => {
      const key = `${ch.department}-${ch.errorType}`;
      typeDeptCounts[key] = (typeDeptCounts[key] || 0) + 1;
    });

    challenges = challenges.map(ch => {
      const inv = invMap[ch.trackerId];
      const key = `${ch.department}-${ch.errorType}`;
      const isRecurring = typeDeptCounts[key] > 1;

      let deductions = 0;
      if (!ch.markResolved) deductions += 5;
      if (!ch.markResolved && ch.severity === 'High') deductions += 10;
      if (isRecurring) deductions += 8;

      const missingEvidence = inv ? inv.questions.some(q => !q.evidence || q.evidence.length === 0) : true;
      if (missingEvidence) deductions += 4;
      if (ch.actionStatus === 'Initialized') deductions += 3;
      if (!ch.description || !ch.occurredTime) deductions += 5;

      const readiness = Math.max(20, 100 - deductions);
      let calculatedStatus = 'STRONG';
      if (readiness >= 80) calculatedStatus = 'STRONG';
      else if (readiness >= 60) calculatedStatus = 'MODERATE';
      else calculatedStatus = 'WEAK';

      return {
        ...ch,
        isRecurring,
        readiness,
        defenceStatus: calculatedStatus
      };
    });

    // Apply filters
    if (department && department !== 'all') {
      challenges = challenges.filter(c => c.department === department.toLowerCase());
    }
    if (errorType && errorType !== 'all') {
      challenges = challenges.filter(c => c.errorType === errorType);
    }
    if (status && status !== 'all') {
      challenges = challenges.filter(c => c.actionStatus === status);
    }
    if (resolved && resolved !== 'all') {
      const isResolved = resolved === 'true';
      challenges = challenges.filter(c => c.markResolved === isResolved);
    }
    if (responsiblePerson && responsiblePerson !== 'all') {
      challenges = challenges.filter(c => c.responsiblePersonId === responsiblePerson || c.responsiblePersonName === responsiblePerson);
    }
    if (defenceStatus && defenceStatus !== 'all') {
      challenges = challenges.filter(c => c.defenceStatus === defenceStatus.toUpperCase());
    }

    res.json(challenges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET Single Challenge Details
router.get('/challenges/:trackerId', async (req, res) => {
  try {
    const { trackerId } = req.params;
    const metrics = await Metric.find({});
    let matched = null;

    metrics.forEach(m => {
      ['1', '2', '3'].forEach(s => {
        const logs = m.shifts?.[s]?.staffLogs || [];
        const found = logs.find(l => l.trackerId === trackerId);
        if (found) {
          matched = {
            ...found.toObject?.() || found,
            shift: s,
            letter: m.letter,
            isActionTracker: false
          };
        }
        const actLogs = m.shifts?.[s]?.activityLogs || [];
        const foundAct = actLogs.find(l => l.trackerId === trackerId);
        if (foundAct) {
          matched = {
            ...foundAct.toObject?.() || foundAct,
            shift: s,
            letter: m.letter,
            isActionTracker: true
          };
        }
      });
    });

    if (!matched) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    res.json(matched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. PUT Update/Resolve Challenge
router.put('/challenges/:trackerId', async (req, res) => {
  try {
    const { trackerId } = req.params;
    const { markResolved, actionStatus, actionNotes, resolvedBy, alertTypes, description } = req.body;

    const metricDoc = await Metric.findOne({
      $or: [
        { 'shifts.1.staffLogs.trackerId': trackerId },
        { 'shifts.2.staffLogs.trackerId': trackerId },
        { 'shifts.3.staffLogs.trackerId': trackerId },
        { 'shifts.1.activityLogs.trackerId': trackerId },
        { 'shifts.2.activityLogs.trackerId': trackerId },
        { 'shifts.3.activityLogs.trackerId': trackerId }
      ]
    });

    if (!metricDoc) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    let updatedChallenge = null;
    let targetShift = null;
    let targetField = null;

    ['1', '2', '3'].forEach(shift => {
      const logs = metricDoc.shifts?.[shift]?.staffLogs || [];
      const idx = logs.findIndex(l => l.trackerId === trackerId);
      if (idx !== -1) {
        targetShift = shift;
        targetField = 'staffLogs';
        const log = logs[idx];

        if (markResolved !== undefined) {
          log.markResolved = !!markResolved;
          log.resolvedBy = markResolved ? (resolvedBy || 'Supervisor') : '';
          log.resolvedAt = markResolved ? new Date() : null;
        }
        if (actionStatus !== undefined) {
          log.actionStatus = actionStatus;
          log.action = actionNotes || log.action;
        }
        if (actionNotes !== undefined) {
          log.actionNotes = actionNotes;
          log.action = actionNotes;
        }
        if (alertTypes !== undefined) {
          log.alertTypes = alertTypes;
        }
        if (description !== undefined) {
          log.description = description;
        }

        updatedChallenge = log;
      }

      const actLogs = metricDoc.shifts?.[shift]?.activityLogs || [];
      const actIdx = actLogs.findIndex(l => l.trackerId === trackerId);
      if (actIdx !== -1) {
        targetShift = shift;
        targetField = 'activityLogs';
        const log = actLogs[actIdx];

        if (markResolved !== undefined) {
          log.markResolved = !!markResolved;
          log.resolvedBy = markResolved ? (resolvedBy || 'Supervisor') : '';
          log.resolvedAt = markResolved ? new Date() : null;
        }
        if (actionStatus !== undefined) {
          log.actionStatus = actionStatus;
          log.action = actionNotes || log.action;
        }
        if (actionNotes !== undefined) {
          log.actionNotes = actionNotes;
          log.action = actionNotes;
        }
        if (alertTypes !== undefined) {
          log.alertTypes = alertTypes;
        }
        if (description !== undefined) {
          log.description = description;
        }

        updatedChallenge = log;
      }
    });

    if (targetShift && targetField) {
      metricDoc.markModified(`shifts.${targetShift}.${targetField}`);
      await metricDoc.save();
    }

    res.json(updatedChallenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Overall Assessments API ---

// 9. GET Overall and Department Assessments
router.get('/assessments', async (req, res) => {
  try {
    const assessments = await FDADefenceAssessment.find({});
    res.json(assessments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. POST Save Manual Assessment
router.post('/assessments/manual', async (req, res) => {
  try {
    const { scope, status, assessmentText, keyConcerns, recommendedActions, updatedBy } = req.body;

    const updated = await FDADefenceAssessment.findOneAndUpdate(
      { scope },
      {
        $set: {
          status,
          assessmentText,
          keyConcerns,
          recommendedActions,
          isManual: true,
          updatedBy
        }
      },
      { upsert: true, new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. POST Generate Auto Fill Assessment
router.post('/assessments/autofill', async (req, res) => {
  try {
    const { scope } = req.body;

    const metrics = await Metric.find({});
    let totalChallenges = 0;
    let unresolvedChallenges = 0;
    let recurringChallenges = 0;
    let initializedActions = 0;

    const challengesList = [];
    metrics.forEach(m => {
      ['1', '2', '3'].forEach(s => {
        const logs = m.shifts?.[s]?.staffLogs || [];
        logs.forEach(log => {
          if (log.trackerId) {
            challengesList.push(log);
          }
        });
        const actLogs = m.shifts?.[s]?.activityLogs || [];
        actLogs.forEach(log => {
          if (log.trackerId) {
            challengesList.push(log);
          }
        });
      });
    });

    totalChallenges = challengesList.length;
    unresolvedChallenges = challengesList.filter(c => !c.markResolved).length;
    initializedActions = challengesList.filter(c => c.actionStatus === 'Initialized').length;

    const typeDeptCounts = {};
    challengesList.forEach(ch => {
      const key = `${ch.department}-${ch.errorType}`;
      typeDeptCounts[key] = (typeDeptCounts[key] || 0) + 1;
    });

    challengesList.forEach(ch => {
      const key = `${ch.department}-${ch.errorType}`;
      if (typeDeptCounts[key] > 1) {
        recurringChallenges++;
      }
    });

    if (totalChallenges === 0) {
      return res.json({
        scope,
        status: 'INSUFFICIENT_DATA',
        assessmentText: '⚠️ Insufficient Data\n\nThe available QDSHI records are not sufficient to determine this assessment automatically.\n\nPlease review the available records or use Manual Entry.',
        keyConcerns: 'No logged challenges exist in the system.',
        recommendedActions: 'Log daily huddle challenges to compute defence analyses.'
      });
    }

    let status = 'STRONG';
    if (unresolvedChallenges > 5 || recurringChallenges > 3) {
      status = 'WEAK';
    } else if (unresolvedChallenges > 2 || recurringChallenges > 1) {
      status = 'MODERATE';
    }

    let assessmentText = `Auto-fill analysis computed dynamic readiness status: ${status}.\n\n`;
    assessmentText += `• Detected ${totalChallenges} total challenges inside the operational huddle logs.\n`;
    if (unresolvedChallenges > 0) {
      assessmentText += `• Found ${unresolvedChallenges} unresolved challenges currently pending actions.\n`;
    }
    if (recurringChallenges > 0) {
      assessmentText += `• Detected ${recurringChallenges} recurring issues in different huddle departments.\n`;
    }
    if (initializedActions > 0) {
      assessmentText += `• There are ${initializedActions} actions that remain initialized without updates.\n`;
    }

    let keyConcerns = '';
    if (unresolvedChallenges > 0) keyConcerns += `• High number of unresolved issues (${unresolvedChallenges} open).\n`;
    if (recurringChallenges > 0) keyConcerns += `• Repeated incidents in departments suggest systemic issues.\n`;
    if (initializedActions > 0) keyConcerns += `• Action tracking latency (overdue initialized states).\n`;
    if (!keyConcerns) keyConcerns = 'No critical concerns identified.';

    let recommendedActions = '';
    recommendedActions += '1. Close outstanding initialized challenges.\n';
    recommendedActions += '2. Perform root-cause analysis on recurring errors.\n';
    recommendedActions += '3. Complete Action Tracker notes to verify safety/quality improvements.\n';

    res.json({
      scope,
      status,
      assessmentText,
      keyConcerns,
      recommendedActions,
      isManual: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. DELETE Challenge by trackerId (Superadmin Only)
router.delete('/challenges/:trackerId', async (req, res) => {
  try {
    const { trackerId } = req.params;
    const userRole = req.headers['user-role'] || req.body.userRole || req.query.userRole;

    if (userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden: Only Superadmin can delete challenges and quality log entries.' });
    }

    const metrics = await Metric.find({});
    let deleted = false;

    for (const m of metrics) {
      let modified = false;
      for (const s of ['1', '2', '3']) {
        const staffLogs = m.shifts?.[s]?.staffLogs || [];
        const sIdx = staffLogs.findIndex(l => l.trackerId === trackerId || l.id === trackerId);
        if (sIdx !== -1) {
          m.shifts[s].staffLogs.splice(sIdx, 1);
          m.markModified(`shifts.${s}.staffLogs`);
          modified = true;
          deleted = true;
        }

        const actLogs = m.shifts?.[s]?.activityLogs || [];
        const aIdx = actLogs.findIndex(l => l.trackerId === trackerId || l.id === trackerId);
        if (aIdx !== -1) {
          m.shifts[s].activityLogs.splice(aIdx, 1);
          m.markModified(`shifts.${s}.activityLogs`);
          modified = true;
          deleted = true;
        }
      }
      if (modified) {
        await m.save();
      }
    }

    if (!deleted) {
      return res.status(404).json({ error: `Challenge with tracker ID "${trackerId}" not found.` });
    }

    res.json({ success: true, message: `Challenge ${trackerId} deleted successfully by superadmin.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
