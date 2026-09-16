const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Metric = require('../models/Metrics');
const { validateImagePayload, computeImageHash } = require('../services/imageValidationService');
const { verifyChallengeResolution } = require('../services/geminiVisionService');
const { isValidTransition, validateSegregationOfDuties } = require('../services/challengeStatusMachine');
const { createAuditLog, nowIST, formatISTDate } = require('../utils/saveHelpers');

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, '../uploads/evidence');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Helper to find challenge and its parent metric doc
 */
async function findChallengeAndDoc(trackerId) {
  const metricDoc = await Metric.findOne({
    $or: [
      { 'shifts.1.staffLogs.trackerId': trackerId },
      { 'shifts.2.staffLogs.trackerId': trackerId },
      { 'shifts.3.staffLogs.trackerId': trackerId },
      { 'shifts.1.activityLogs.trackerId': trackerId },
      { 'shifts.2.activityLogs.trackerId': trackerId },
      { 'shifts.3.activityLogs.trackerId': trackerId },
      // Fallback matching by id
      { 'shifts.1.staffLogs.id': trackerId },
      { 'shifts.2.staffLogs.id': trackerId },
      { 'shifts.3.staffLogs.id': trackerId },
      { 'shifts.1.activityLogs.id': trackerId },
      { 'shifts.2.activityLogs.id': trackerId },
      { 'shifts.3.activityLogs.id': trackerId },
    ]
  });

  if (!metricDoc) return null;

  for (const shift of ['1', '2', '3']) {
    const staffLogs = metricDoc.shifts?.[shift]?.staffLogs || [];
    const sIdx = staffLogs.findIndex(l => l.trackerId === trackerId || l.id === trackerId);
    if (sIdx !== -1) {
      return {
        metricDoc,
        shift,
        field: 'staffLogs',
        index: sIdx,
        challenge: staffLogs[sIdx]
      };
    }

    const actLogs = metricDoc.shifts?.[shift]?.activityLogs || [];
    const aIdx = actLogs.findIndex(l => l.trackerId === trackerId || l.id === trackerId);
    if (aIdx !== -1) {
      return {
        metricDoc,
        shift,
        field: 'activityLogs',
        index: aIdx,
        challenge: actLogs[aIdx]
      };
    }
  }

  return null;
}

const { uploadEvidenceImage } = require('../services/cloudinaryService');

// ── 1. POST Upload Evidence Image (Before or After) ────────────────────────
router.post('/upload-evidence', async (req, res) => {
  try {
    const { trackerId, imageType, fileName, fileData, mimeType, uploadedBy, uploadedByEmployeeId } = req.body;

    if (!imageType || !['before', 'after'].includes(imageType.toLowerCase())) {
      return res.status(400).json({ error: 'Valid imageType ("before" or "after") is required.' });
    }

    const validation = validateImagePayload({ fileName, fileData, mimeType });
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const imageMetadata = await uploadEvidenceImage({
      fileData: validation.buffer,
      fileName,
      mimeType: validation.mimeType,
      uploadedBy: uploadedBy || 'User',
      imageType: imageType.toLowerCase()
    });
    imageMetadata.uploadedByEmployeeId = uploadedByEmployeeId || '';

    let autoAiReport = null;

    // If trackerId is supplied, link directly to challenge
    if (trackerId) {
      const match = await findChallengeAndDoc(trackerId);
      if (match) {
        const { metricDoc, shift, field, index, challenge } = match;
        if (!challenge.resolutionVerification) {
          challenge.resolutionVerification = {};
        }

        const isBefore = imageType.toLowerCase() === 'before';
        const targetField = isBefore ? 'beforeImage' : 'afterImage';
        
        // Save image metadata both on challenge directly and inside resolutionVerification
        challenge[targetField] = imageMetadata;
        challenge.resolutionVerification[targetField] = imageMetadata;

        // Add audit history entry
        if (!Array.isArray(challenge.resolutionVerification.verificationHistory)) {
          challenge.resolutionVerification.verificationHistory = [];
        }
        challenge.resolutionVerification.verificationHistory.push({
          action: isBefore ? 'BEFORE_IMAGE_UPLOADED' : 'AFTER_IMAGE_UPLOADED',
          performedBy: uploadedBy || 'User',
          performedByEmployeeId: uploadedByEmployeeId || '',
          performedByRole: req.body.userRole || 'employee',
          timestamp: new Date(),
          details: {
            secure_url: imageMetadata.secure_url || imageMetadata.url,
            public_id: imageMetadata.public_id || imageMetadata.fileName,
            fileSize: imageMetadata.fileSize
          }
        });

        // Update status
        if (!isBefore) {
          challenge.status = 'WAITING_FOR_AFTER_IMAGE';
        }

        const beforeRef = challenge.beforeImage || challenge.resolutionVerification?.beforeImage;
        const afterRef = challenge.afterImage || challenge.resolutionVerification?.afterImage;

        // If BOTH Before and After images exist, run automatic Gemini AI analysis
        if (beforeRef && (beforeRef.url || beforeRef.secure_url) && afterRef && (afterRef.url || afterRef.secure_url)) {
          challenge.status = 'AI_ANALYZING';
          challenge.resolutionVerification.analysisStatus = 'PENDING';
          metricDoc.markModified(`shifts.${shift}.${field}`);
          await metricDoc.save();

          try {
            // Read before image buffer
            let bBuf = null;
            if (beforeRef.url && beforeRef.url.startsWith('/uploads/')) {
              const p = path.join(__dirname, '..', beforeRef.url);
              if (fs.existsSync(p)) bBuf = fs.readFileSync(p);
            }
            let aBuf = null;
            if (afterRef.url && afterRef.url.startsWith('/uploads/')) {
              const p = path.join(__dirname, '..', afterRef.url);
              if (fs.existsSync(p)) aBuf = fs.readFileSync(p);
            }

            autoAiReport = await verifyChallengeResolution({
              challenge,
              beforeImage: {
                buffer: bBuf,
                fileData: bBuf ? null : (beforeRef.secure_url || beforeRef.url),
                mimeType: beforeRef.mimeType || 'image/jpeg',
                hash: beforeRef.hash
              },
              afterImage: {
                buffer: aBuf,
                fileData: aBuf ? null : (afterRef.secure_url || afterRef.url),
                mimeType: afterRef.mimeType || 'image/jpeg',
                hash: afterRef.hash
              },
              userId: uploadedByEmployeeId || uploadedBy
            });

            Object.assign(challenge.resolutionVerification, {
              ...autoAiReport,
              analysisStatus: 'COMPLETED'
            });
            challenge.aiAnalysis = autoAiReport;
            challenge.status = 'PENDING_HUMAN_VERIFICATION';

            challenge.resolutionVerification.verificationHistory.push({
              action: 'AI_ANALYSIS_COMPLETED',
              performedBy: 'Gemini AI Vision Engine',
              performedByEmployeeId: 'SYSTEM',
              performedByRole: 'system',
              timestamp: new Date(),
              details: {
                model: autoAiReport.aiModel,
                assessment: autoAiReport.resolutionAssessment,
                confidence: autoAiReport.resolutionConfidence
              }
            });
          } catch (autoAiErr) {
            console.error('Automatic AI analysis error:', autoAiErr.message);
            challenge.resolutionVerification.analysisStatus = 'FAILED';
            challenge.resolutionVerification.analysisReason = `AI analysis error: ${autoAiErr.message}`;
            challenge.status = 'IN_PROGRESS';
          }
        }

        metricDoc.markModified(`shifts.${shift}.${field}`);
        await metricDoc.save();
      }
    }

    res.json({
      success: true,
      fileUrl: imageMetadata.secure_url || imageMetadata.url,
      fileName: imageMetadata.public_id || imageMetadata.fileName,
      metadata: imageMetadata,
      aiReport: autoAiReport
    });
  } catch (err) {
    console.error('Evidence upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload evidence image.' });
  }
});

// ── 2. POST Trigger AI Verification Analysis ──────────────────────────────
router.post('/analyze/:trackerId', async (req, res) => {
  try {
    const { trackerId } = req.params;
    const { beforeImageData, afterImageData, requestedBy, requestedByEmployeeId, requestedByRole } = req.body;

    const match = await findChallengeAndDoc(trackerId);
    if (!match) {
      return res.status(404).json({ error: `Challenge with ID "${trackerId}" not found.` });
    }

    const { metricDoc, shift, field, index, challenge } = match;
    const resVer = challenge.resolutionVerification || {};

    // Get before and after images (either from payload or existing saved images)
    let beforeBufferOrData = beforeImageData?.fileData || resVer.beforeImage?.url;
    let beforeMime = beforeImageData?.mimeType || resVer.beforeImage?.mimeType || 'image/jpeg';
    let beforeHash = beforeImageData?.hash || resVer.beforeImage?.hash;

    let afterBufferOrData = afterImageData?.fileData || resVer.afterImage?.url;
    let afterMime = afterImageData?.mimeType || resVer.afterImage?.mimeType || 'image/jpeg';
    let afterHash = afterImageData?.hash || resVer.afterImage?.hash;

    // If URLs on disk, read files
    if (typeof beforeBufferOrData === 'string' && beforeBufferOrData.startsWith('/uploads/')) {
      const localPath = path.join(__dirname, '..', beforeBufferOrData);
      if (fs.existsSync(localPath)) {
        beforeBufferOrData = fs.readFileSync(localPath);
        if (!beforeHash) beforeHash = computeImageHash(beforeBufferOrData);
      }
    }
    if (typeof afterBufferOrData === 'string' && afterBufferOrData.startsWith('/uploads/')) {
      const localPath = path.join(__dirname, '..', afterBufferOrData);
      if (fs.existsSync(localPath)) {
        afterBufferOrData = fs.readFileSync(localPath);
        if (!afterHash) afterHash = computeImageHash(afterBufferOrData);
      }
    }

    if (!beforeBufferOrData) {
      return res.status(400).json({ error: 'Before evidence image is required for AI verification.' });
    }
    if (!afterBufferOrData) {
      return res.status(400).json({ error: 'After evidence image is required for AI verification.' });
    }

    // Set pending status
    challenge.status = 'AI_ANALYSIS_PENDING';
    if (!challenge.resolutionVerification) challenge.resolutionVerification = {};
    challenge.resolutionVerification.analysisStatus = 'PENDING';
    metricDoc.markModified(`shifts.${shift}.${field}`);
    await metricDoc.save();

    const analysisId = `ANL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Perform AI Verification
    let aiReport;
    try {
      aiReport = await verifyChallengeResolution({
        challenge,
        beforeImage: {
          buffer: Buffer.isBuffer(beforeBufferOrData) ? beforeBufferOrData : null,
          fileData: Buffer.isBuffer(beforeBufferOrData) ? null : beforeBufferOrData,
          mimeType: beforeMime,
          hash: beforeHash
        },
        afterImage: {
          buffer: Buffer.isBuffer(afterBufferOrData) ? afterBufferOrData : null,
          fileData: Buffer.isBuffer(afterBufferOrData) ? null : afterBufferOrData,
          mimeType: afterMime,
          hash: afterHash
        },
        userId: requestedByEmployeeId || requestedBy,
        analysisId
      });
    } catch (aiErr) {
      console.error('AI verification failed:', aiErr.message);
      challenge.resolutionVerification.analysisStatus = 'FAILED';
      challenge.resolutionVerification.analysisReason = `AI analysis encountered an error: ${aiErr.message}`;
      challenge.status = 'ACTION_COMPLETED';
      metricDoc.markModified(`shifts.${shift}.${field}`);
      await metricDoc.save();

      return res.status(500).json({
        success: false,
        error: `AI analysis encountered an error: ${aiErr.message}. Please retry or proceed with manual inspection.`,
        analysisStatus: 'FAILED',
        details: aiErr.message
      });
    }

    // Update challenge document with AI report
    Object.assign(challenge.resolutionVerification, {
      ...aiReport,
      analysisStatus: 'COMPLETED'
    });

    challenge.status = 'PENDING_VERIFICATION';

    // Add audit history entry
    if (!Array.isArray(challenge.resolutionVerification.verificationHistory)) {
      challenge.resolutionVerification.verificationHistory = [];
    }
    challenge.resolutionVerification.verificationHistory.push({
      action: 'AI_ANALYSIS',
      performedBy: requestedBy || 'AI Verification Engine',
      performedByEmployeeId: requestedByEmployeeId || 'SYSTEM',
      performedByRole: requestedByRole || 'system',
      timestamp: new Date(),
      details: {
        analysisId: aiReport.analysisId,
        aiModel: aiReport.aiModel,
        resolutionAssessment: aiReport.resolutionAssessment,
        resolutionConfidence: aiReport.resolutionConfidence,
        suspiciousEvidence: aiReport.suspiciousEvidence,
        latencyMs: aiReport.processingLatencyMs
      }
    });

    metricDoc.markModified(`shifts.${shift}.${field}`);
    await metricDoc.save();

    res.json({
      success: true,
      analysisId: aiReport.analysisId,
      report: aiReport,
      challenge: challenge.toObject?.() || challenge
    });
  } catch (err) {
    console.error('Analyze route error:', err);
    res.status(500).json({ error: err.message || 'Error executing AI verification.' });
  }
});

// ── 3. GET Challenge Verification Status ──────────────────────────────────
router.get('/status/:trackerId', async (req, res) => {
  try {
    const { trackerId } = req.params;
    const match = await findChallengeAndDoc(trackerId);
    if (!match) {
      return res.status(404).json({ error: `Challenge with ID "${trackerId}" not found.` });
    }

    const { challenge, shift, metricDoc } = match;
    const ver = challenge.resolutionVerification || {};

    res.json({
      trackerId,
      shift,
      department: challenge.department,
      status: challenge.status || (challenge.markResolved ? 'CLOSED' : 'OPEN'),
      markResolved: challenge.markResolved,
      responsiblePerson: {
        id: challenge.responsiblePersonId,
        name: challenge.responsiblePersonName,
        employeeId: challenge.responsiblePersonEmployeeId
      },
      reportedBy: {
        id: challenge.reportedByUserId,
        name: challenge.reportedByName,
        employeeId: challenge.reportedByEmployeeId
      },
      resolutionVerification: ver,
      history: ver.verificationHistory || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 4. POST Independent Human Verification (Approve or Reject) ────────────
router.post('/verify/:trackerId', async (req, res) => {
  try {
    const { trackerId } = req.params;
    const { decision, verifierComments, rejectionReason, currentUser } = req.body;

    if (!decision || !['APPROVE', 'REJECT'].includes(decision.toUpperCase())) {
      return res.status(400).json({ error: 'Valid decision ("APPROVE" or "REJECT") is required.' });
    }

    if (decision.toUpperCase() === 'REJECT' && !verifierComments && !rejectionReason) {
      return res.status(400).json({ error: 'Comments/reason are required when rejecting challenge resolution.' });
    }

    const match = await findChallengeAndDoc(trackerId);
    if (!match) {
      return res.status(404).json({ error: `Challenge with ID "${trackerId}" not found.` });
    }

    const { metricDoc, shift, field, index, challenge } = match;

    // Segregation of Duties Check
    const sodCheck = validateSegregationOfDuties(challenge, currentUser);
    if (!sodCheck.allowed) {
      return res.status(403).json({ error: sodCheck.reason });
    }

    const verifierName = currentUser.name || 'Verifier';
    const verifierEmpId = currentUser.employeeId || 'N/A';
    const verifierRole = currentUser.role || 'supervisor';
    const now = new Date();

    if (!challenge.resolutionVerification) {
      challenge.resolutionVerification = {};
    }

    if (decision.toUpperCase() === 'APPROVE') {
      challenge.status = 'CLOSED';
      challenge.markResolved = true;
      challenge.actionStatus = 'Resolved';
      challenge.resolvedBy = verifierName;
      challenge.resolvedAt = now;

      challenge.resolutionVerification.verifierDecision = 'APPROVED';
      challenge.resolutionVerification.verifiedBy = verifierName;
      challenge.resolutionVerification.verifiedByEmployeeId = verifierEmpId;
      challenge.resolutionVerification.verifiedByRole = verifierRole;
      challenge.resolutionVerification.verifiedAt = now;
      challenge.resolutionVerification.verifierComments = verifierComments || 'Resolution verified and approved.';

      // Add to verification history
      if (!Array.isArray(challenge.resolutionVerification.verificationHistory)) {
        challenge.resolutionVerification.verificationHistory = [];
      }
      challenge.resolutionVerification.verificationHistory.push({
        action: 'VERIFIED_APPROVED',
        performedBy: verifierName,
        performedByEmployeeId: verifierEmpId,
        performedByRole: verifierRole,
        timestamp: now,
        details: { comments: verifierComments }
      });

      // Also log audit log
      const today = formatISTDate(nowIST());
      createAuditLog({
        date: today,
        empId: verifierEmpId,
        empName: verifierName,
        dept: challenge.department,
        shift,
        module: metricDoc.letter,
        deptType: 'qdsh',
        action: `Verified & Closed Challenge ${trackerId}`
      });
    } else {
      // REJECT -> REOPEN
      challenge.status = 'REOPENED';
      challenge.markResolved = false;
      challenge.actionStatus = 'Reopened';
      challenge.resolvedBy = '';
      challenge.resolvedAt = null;

      challenge.resolutionVerification.verifierDecision = 'REJECTED';
      challenge.resolutionVerification.verifiedBy = verifierName;
      challenge.resolutionVerification.verifiedByEmployeeId = verifierEmpId;
      challenge.resolutionVerification.verifiedByRole = verifierRole;
      challenge.resolutionVerification.verifiedAt = now;
      challenge.resolutionVerification.verifierComments = verifierComments || '';
      challenge.resolutionVerification.rejectionReason = rejectionReason || verifierComments || 'Resolution rejected by verifier.';

      // Add to verification history
      if (!Array.isArray(challenge.resolutionVerification.verificationHistory)) {
        challenge.resolutionVerification.verificationHistory = [];
      }
      challenge.resolutionVerification.verificationHistory.push({
        action: 'VERIFIED_REJECTED',
        performedBy: verifierName,
        performedByEmployeeId: verifierEmpId,
        performedByRole: verifierRole,
        timestamp: now,
        details: {
          comments: verifierComments,
          rejectionReason: rejectionReason || verifierComments
        }
      });

      // Audit log
      const today = formatISTDate(nowIST());
      createAuditLog({
        date: today,
        empId: verifierEmpId,
        empName: verifierName,
        dept: challenge.department,
        shift,
        module: metricDoc.letter,
        deptType: 'qdsh',
        action: `Rejected & Reopened Challenge ${trackerId}`
      });
    }

    metricDoc.markModified(`shifts.${shift}.${field}`);
    await metricDoc.save();

    res.json({
      success: true,
      decision: decision.toUpperCase(),
      challenge: challenge.toObject?.() || challenge
    });
  } catch (err) {
    console.error('Verify decision error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit verification decision.' });
  }
});

// ── 5. GET Full Audit Trail ───────────────────────────────────────────────
router.get('/audit-trail/:trackerId', async (req, res) => {
  try {
    const { trackerId } = req.params;
    const match = await findChallengeAndDoc(trackerId);
    if (!match) {
      return res.status(404).json({ error: `Challenge with ID "${trackerId}" not found.` });
    }

    const { challenge, shift, metricDoc } = match;
    const ver = challenge.resolutionVerification || {};

    res.json({
      trackerId,
      department: challenge.department,
      shift,
      status: challenge.status,
      history: ver.verificationHistory || [],
      evidence: {
        before: ver.beforeImage,
        after: ver.afterImage
      },
      aiAnalysis: {
        analysisId: ver.analysisId,
        model: ver.aiModel,
        version: ver.aiAnalysisVersion,
        assessment: ver.resolutionAssessment,
        confidence: ver.resolutionConfidence,
        reason: ver.analysisReason
      },
      verifier: {
        decision: ver.verifierDecision,
        verifiedBy: ver.verifiedBy,
        verifiedByEmployeeId: ver.verifiedByEmployeeId,
        verifiedAt: ver.verifiedAt,
        comments: ver.verifierComments,
        rejectionReason: ver.rejectionReason
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
