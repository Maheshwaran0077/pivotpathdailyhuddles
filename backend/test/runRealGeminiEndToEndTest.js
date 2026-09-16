const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const Metric = require('../models/Metrics');
const { verifyChallengeResolution } = require('../services/geminiVisionService');
const { validateSegregationOfDuties } = require('../services/challengeStatusMachine');

// Sample base64 image data representing distinct evidence
const SAMPLE_BEFORE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const SAMPLE_AFTER_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function runEndToEndRealTest() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING END-TO-END REAL GEMINI VISION & MONGODB TEST');
  console.log('======================================================\n');

  try {
    // 1. Connect MongoDB
    console.log('1. Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('   ✅ MongoDB connected successfully.');

    // 2. Fetch or create a metric document with challenge
    console.log('\n2. Querying Metric document for Q pillar...');
    let metricDoc = await Metric.findOne({ letter: 'Q' });
    if (!metricDoc) {
      console.log('   Creating test Metric document...');
      metricDoc = new Metric({
        letter: 'Q',
        dept: 'fgmw',
        label: 'Quality Pillar',
        shifts: { '1': { staffLogs: [], activityLogs: [] } }
      });
    }

    const trackerId = `TEST-AI-${Date.now()}`;
    const testChallenge = {
      trackerId,
      id: trackerId,
      date: new Date().toISOString().split('T')[0],
      department: 'fgmw',
      responsiblePersonId: 'EMP-101',
      responsiblePersonEmployeeId: 'EMP-101',
      responsiblePersonName: 'Alice Operator (Responsible Person)',
      action: 'Replaced damaged hydraulic seal on packaging line L1',
      description: 'Hydraulic oil leak observed under main conveyor belt packaging line L1.',
      status: 'ACTION_COMPLETED',
      alertIncidentType: 'Machine Failure',
      defenceStatus: 'WEAK'
    };

    metricDoc.shifts['1'].staffLogs.push(testChallenge);
    metricDoc.markModified('shifts.1.staffLogs');
    await metricDoc.save();
    console.log(`   ✅ Test challenge saved with trackerId: ${trackerId}`);

    // 3. Perform Real Gemini Vision API Analysis
    console.log(`\n3. Invoking Gemini Vision API with model "${process.env.GEMINI_VISION_MODEL}"...`);
    const aiReport = await verifyChallengeResolution({
      challenge: testChallenge,
      beforeImage: {
        fileData: SAMPLE_BEFORE_IMAGE,
        mimeType: 'image/png',
        hash: 'hash_before_real_test_' + Date.now()
      },
      afterImage: {
        fileData: SAMPLE_AFTER_IMAGE,
        mimeType: 'image/png',
        hash: 'hash_after_real_test_' + Date.now()
      },
      userId: 'EMP-101'
    });

    console.log('   ✅ Gemini Vision Analysis Succeeded!');
    console.log('   --- Structured AI Output ---');
    console.log('   • AI Model Used:', aiReport.aiModel);
    console.log('   • Resolution Assessment:', aiReport.resolutionAssessment);
    console.log('   • Verification Recommendation:', aiReport.verificationRecommendation);
    console.log('   • Image Quality Score:', aiReport.imageQualityScore, '/ 100');
    console.log('   • Same Area Confidence:', aiReport.sameAreaConfidence, '%');
    console.log('   • Suspicious Evidence Flag:', aiReport.suspiciousEvidence);
    console.log('   • Analysis Reason:', aiReport.analysisReason);

    // Assert structured schema fields
    if (typeof aiReport.imageQualityScore !== 'number' || !aiReport.resolutionAssessment) {
      throw new Error('AI output missing required structured schema fields!');
    }

    // 4. Update and Persist in MongoDB
    console.log('\n4. Persisting AI Report into MongoDB Atlas...');
    const updatedDoc = await Metric.findOne({ 'shifts.1.staffLogs.trackerId': trackerId });
    const logIdx = updatedDoc.shifts['1'].staffLogs.findIndex(l => l.trackerId === trackerId);
    const targetLog = updatedDoc.shifts['1'].staffLogs[logIdx];

    targetLog.resolutionVerification = {
      ...aiReport,
      analysisStatus: 'COMPLETED',
      beforeImage: { url: '/uploads/test_before.png', uploadedAt: new Date() },
      afterImage: { url: '/uploads/test_after.png', uploadedAt: new Date() }
    };
    targetLog.status = 'PENDING_VERIFICATION';

    updatedDoc.markModified('shifts.1.staffLogs');
    await updatedDoc.save();
    console.log('   ✅ AI verification report persisted in MongoDB.');

    // 5. Test Segregation of Duties (Responsible Person self-approval blocked)
    console.log('\n5. Testing Segregation of Duties Security Policy...');
    const selfVerifyCheck = validateSegregationOfDuties(targetLog, {
      id: 'EMP-101',
      employeeId: 'EMP-101',
      name: 'Alice Operator (Responsible Person)'
    });
    if (selfVerifyCheck.allowed) {
      throw new Error('SECURITY VIOLATION: Responsible Person was allowed to self-approve!');
    }
    console.log(`   ✅ Security Pass: ${selfVerifyCheck.error}`);

    // Independent verifier approval allowed
    const indepVerifyCheck = validateSegregationOfDuties(targetLog, {
      id: 'EMP-999',
      employeeId: 'EMP-999',
      name: 'Bob Inspector (Independent QA Verifier)',
      role: 'superadmin'
    });
    if (!indepVerifyCheck.allowed) {
      throw new Error(`Independent verifier rejected: ${indepVerifyCheck.error}`);
    }
    console.log('   ✅ Independent verifier permitted to verify & close challenge.');

    // Clean up test document entry
    updatedDoc.shifts['1'].staffLogs.splice(logIdx, 1);
    updatedDoc.markModified('shifts.1.staffLogs');
    await updatedDoc.save();
    console.log('\n6. Cleaned up temporary test record from MongoDB.');

    console.log('\n======================================================');
    console.log('🎉 ALL END-TO-END VERIFICATION CHECKS COMPLETED CLEANLY!');
    console.log('======================================================\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ E2E Test Failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runEndToEndRealTest();
