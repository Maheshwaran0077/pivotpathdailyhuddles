/**
 * Comprehensive Automated Test Suite for AI Challenge Resolution Verification System
 * Covers:
 * 1. Positive Verification Cases (Resolved, matching location, clear photos)
 * 2. Negative Verification Cases (Unresolved issue persisting in After photo)
 * 3. Duplicate Image Detection (Identical Before & After images)
 * 4. Image Quality Safeguards (Blurry/corrupt/low-quality thresholding -> INSUFFICIENT_EVIDENCE)
 * 5. Same-Area / Location Safeguards (Different location -> suspiciousEvidence = true, REVIEW_REQUIRED)
 * 6. Segregation of Duties Security (Responsible Person attempting self-approval -> 403 Forbidden)
 * 7. State Machine Status Transitions (Valid vs illegal transitions)
 * 8. Cache & Deterministic Key Optimization
 * 9. Schema Output Validation & Fallbacks
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const assert = require('assert');
const crypto = require('crypto');
const { validateImagePayload, computeImageHash, checkDuplicateImages } = require('../services/imageValidationService');
const { resolveCategory, buildProblemSpecificPrompt } = require('../services/aiVerificationRules');
const { validateAIResponseSchema, applySafetySafeguards, THRESHOLDS } = require('../services/geminiVisionService');
const { isValidTransition, validateSegregationOfDuties } = require('../services/challengeStatusMachine');
const analysisCache = require('../services/aiAnalysisCache');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING AI CHALLENGE RESOLUTION VERIFICATION TESTS');
  console.log('======================================================\n');

  // --- 1. Image Validation & Payload Preprocessing Tests ---
  console.log('--- 1. Image Validation & Duplicate Detection ---');
  
  runTest('Should accept valid JPEG/PNG base64 image data', () => {
    // 1x1 valid transparent PNG base64
    const validPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const res = validateImagePayload({ fileName: 'test.png', fileData: validPng });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.mimeType, 'image/png');
    assert.ok(res.hash);
  });

  runTest('Should reject unsupported file types (e.g. text or pdf)', () => {
    const invalidData = 'data:text/plain;base64,SGVsbG8gV29ybGQ=';
    const res = validateImagePayload({ fileName: 'test.txt', fileData: invalidData, mimeType: 'text/plain' });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('Unsupported image format'));
  });

  runTest('Should detect duplicate identical before and after images', () => {
    const hash1 = crypto.createHash('sha256').update('image_binary_123').digest('hex');
    const hash2 = crypto.createHash('sha256').update('image_binary_123').digest('hex');
    const hash3 = crypto.createHash('sha256').update('image_binary_456').digest('hex');

    assert.strictEqual(checkDuplicateImages(hash1, hash2), true);
    assert.strictEqual(checkDuplicateImages(hash1, hash3), false);
  });

  // --- 2. Category & Problem-Specific Rules Tests ---
  console.log('\n--- 2. Category-Specific Rules & Prompt Engine ---');

  runTest('Should correctly categorize Equipment / Oil Leak challenge', () => {
    const challenge = {
      description: 'Severe oil leakage around gearbox of machine 4',
      alertIncidentType: 'Machine Failure',
      errorType: 'Equipment Error',
      department: 'pro'
    };
    const cat = resolveCategory(challenge);
    assert.strictEqual(cat.categoryName, 'Equipment / Maintenance');
    assert.ok(cat.rules.visualChecklist.length > 0);
  });

  runTest('Should correctly categorize Housekeeping / Scattered Materials challenge', () => {
    const challenge = {
      description: 'Scattered packaging cartons and debris obstructing walkway pathway',
      alertIncidentType: 'Safety Issue',
      errorType: '5S Housekeeping',
      department: 'fgmw'
    };
    const cat = resolveCategory(challenge);
    assert.strictEqual(cat.categoryName, 'Safety & Housekeeping');
  });

  runTest('Should construct problem-specific prompt containing challenge metadata and criteria', () => {
    const challenge = {
      trackerId: 'CH-2026-0099',
      description: 'Broken safety guard on packing conveyor',
      alertIncidentType: 'Safety Issue',
      department: 'ppp'
    };
    const cat = resolveCategory(challenge);
    const prompt = buildProblemSpecificPrompt(challenge, cat);
    assert.ok(prompt.includes('CH-2026-0099'));
    assert.ok(prompt.includes('Broken safety guard'));
    assert.ok(prompt.includes('MANDATORY ASSESSMENT INSTRUCTIONS'));
  });

  // --- 3. Structured Output & Safeguard Heuristics Tests ---
  console.log('\n--- 3. Structured JSON Validation & Conservative Safeguards ---');

  runTest('Should validate correct structured AI response format', () => {
    const validAIOutput = {
      problemDetectedBefore: true,
      problemDetectedAfter: false,
      sameAreaConfidence: 95,
      imageQualityScore: 90,
      evidenceQualityScore: 92,
      visualImprovementScore: 96,
      resolutionConfidence: 94,
      resolutionAssessment: 'LIKELY_RESOLVED',
      remainingIssue: false,
      suspiciousEvidence: false,
      detectedBeforeConditions: ['Oil pooling on floor'],
      detectedAfterConditions: ['Clean degreased concrete surface'],
      analysisReason: 'Oil leak cleaned up and machine seal replaced.',
      verificationRecommendation: 'READY_FOR_HUMAN_VERIFICATION'
    };

    const res = validateAIResponseSchema(validAIOutput);
    assert.strictEqual(res.valid, true);
  });

  runTest('Should reject malformed AI response missing required boolean fields', () => {
    const malformed = {
      sameAreaConfidence: 95,
      resolutionAssessment: 'LIKELY_RESOLVED'
    };
    const res = validateAIResponseSchema(malformed);
    assert.strictEqual(res.valid, false);
  });

  runTest('Conservative Safeguard: Blurry / Low Quality image must trigger INSUFFICIENT_EVIDENCE', () => {
    const lowQualityResult = {
      problemDetectedBefore: true,
      problemDetectedAfter: false,
      sameAreaConfidence: 85,
      imageQualityScore: 35, // Below minimum threshold (55)
      evidenceQualityScore: 40,
      visualImprovementScore: 80,
      resolutionConfidence: 50,
      resolutionAssessment: 'LIKELY_RESOLVED',
      remainingIssue: false,
      suspiciousEvidence: false,
      analysisReason: 'Looks clean',
      verificationRecommendation: 'READY_FOR_HUMAN_VERIFICATION'
    };

    const safeguarded = applySafetySafeguards(lowQualityResult, false);
    assert.strictEqual(safeguarded.resolutionAssessment, 'INSUFFICIENT_EVIDENCE');
    assert.strictEqual(safeguarded.verificationRecommendation, 'REJECT_OR_RETAKE_IMAGE');
    assert.ok(safeguarded.analysisReason.includes('Image quality score'));
  });

  runTest('Conservative Safeguard: Location mismatch must flag suspiciousEvidence & REVIEW_REQUIRED', () => {
    const locationMismatchResult = {
      problemDetectedBefore: true,
      problemDetectedAfter: false,
      sameAreaConfidence: 30, // Below threshold (60)
      imageQualityScore: 85,
      evidenceQualityScore: 70,
      visualImprovementScore: 90,
      resolutionConfidence: 60,
      resolutionAssessment: 'LIKELY_RESOLVED',
      remainingIssue: false,
      suspiciousEvidence: false,
      analysisReason: 'Area is clear',
      verificationRecommendation: 'READY_FOR_HUMAN_VERIFICATION'
    };

    const safeguarded = applySafetySafeguards(locationMismatchResult, false);
    assert.strictEqual(safeguarded.suspiciousEvidence, true);
    assert.strictEqual(safeguarded.verificationRecommendation, 'REVIEW_REQUIRED');
  });

  runTest('Conservative Safeguard: Remaining issue in After photo must force NOT_RESOLVED', () => {
    const unresolvedResult = {
      problemDetectedBefore: true,
      problemDetectedAfter: true, // Issue still present
      sameAreaConfidence: 90,
      imageQualityScore: 85,
      evidenceQualityScore: 85,
      visualImprovementScore: 20,
      resolutionConfidence: 80,
      resolutionAssessment: 'PARTIALLY_RESOLVED',
      remainingIssue: true,
      suspiciousEvidence: false,
      analysisReason: 'Oil still visible',
      verificationRecommendation: 'READY_FOR_HUMAN_VERIFICATION'
    };

    const safeguarded = applySafetySafeguards(unresolvedResult, false);
    assert.strictEqual(safeguarded.resolutionAssessment, 'NOT_RESOLVED');
    assert.strictEqual(safeguarded.verificationRecommendation, 'REVIEW_REQUIRED');
  });

  runTest('Conservative Safeguard: Duplicate image input must flag suspicious evidence', () => {
    const duplicateResult = {
      problemDetectedBefore: true,
      problemDetectedAfter: false,
      sameAreaConfidence: 100,
      imageQualityScore: 90,
      evidenceQualityScore: 85,
      visualImprovementScore: 90,
      resolutionConfidence: 90,
      resolutionAssessment: 'LIKELY_RESOLVED',
      remainingIssue: false,
      suspiciousEvidence: false,
      analysisReason: 'Fixed',
      verificationRecommendation: 'READY_FOR_HUMAN_VERIFICATION'
    };

    const safeguarded = applySafetySafeguards(duplicateResult, true); // isDuplicate = true
    assert.strictEqual(safeguarded.suspiciousEvidence, true);
    assert.strictEqual(safeguarded.resolutionAssessment, 'INSUFFICIENT_EVIDENCE');
    assert.strictEqual(safeguarded.visualImprovementScore, 0);
  });

  // --- 4. Segregation of Duties Security Tests ---
  console.log('\n--- 4. Segregation of Duties & RBAC Security ---');

  runTest('Security: Responsible person MUST NOT be allowed to approve their own resolution closure', () => {
    const challenge = {
      trackerId: 'CH-2026-0042',
      responsiblePersonId: 'user_123',
      responsiblePersonEmployeeId: 'EMP-9001',
      responsiblePersonName: 'Alex Green'
    };

    const responsibleUser = {
      _id: 'user_123',
      employeeId: 'EMP-9001',
      name: 'Alex Green',
      role: 'supervisor'
    };

    const check = validateSegregationOfDuties(challenge, responsibleUser);
    assert.strictEqual(check.allowed, false);
    assert.ok(check.reason.includes('Independent verification is required'));
  });

  runTest('Security: Independent verifier (different employee) is permitted to verify and close', () => {
    const challenge = {
      trackerId: 'CH-2026-0042',
      responsiblePersonId: 'user_123',
      responsiblePersonEmployeeId: 'EMP-9001',
      responsiblePersonName: 'Alex Green'
    };

    const independentVerifier = {
      _id: 'user_456',
      employeeId: 'EMP-9002',
      name: 'Sarah Connor',
      role: 'hod'
    };

    const check = validateSegregationOfDuties(challenge, independentVerifier);
    assert.strictEqual(check.allowed, true);
  });

  runTest('Security: Standard employee without verifier role is rejected from closing challenge', () => {
    const challenge = {
      trackerId: 'CH-2026-0042',
      responsiblePersonEmployeeId: 'EMP-9001'
    };

    const regularEmployee = {
      _id: 'user_789',
      employeeId: 'EMP-9999',
      role: 'employee'
    };

    const check = validateSegregationOfDuties(challenge, regularEmployee);
    assert.strictEqual(check.allowed, false);
    assert.ok(check.reason.includes('not permitted'));
  });

  // --- 5. State Machine Lifecycle Tests ---
  console.log('\n--- 5. Status Lifecycle State Machine ---');

  runTest('State Machine: Permitted forward transitions work correctly', () => {
    assert.strictEqual(isValidTransition('OPEN', 'ACTION_COMPLETED'), true);
    assert.strictEqual(isValidTransition('ACTION_COMPLETED', 'AI_ANALYSIS_PENDING'), true);
    assert.strictEqual(isValidTransition('AI_ANALYSIS_PENDING', 'AI_ANALYSIS_COMPLETED'), true);
    assert.strictEqual(isValidTransition('AI_ANALYSIS_COMPLETED', 'PENDING_VERIFICATION'), true);
    assert.strictEqual(isValidTransition('PENDING_VERIFICATION', 'CLOSED'), true);
    assert.strictEqual(isValidTransition('PENDING_VERIFICATION', 'REOPENED'), true);
  });

  runTest('State Machine: Illegal direct jumps are blocked', () => {
    // Cannot jump directly from OPEN to CLOSED without verification
    assert.strictEqual(isValidTransition('OPEN', 'CLOSED'), false);
  });

  // --- 6. Deterministic Cache Tests ---
  console.log('\n--- 6. Deterministic Caching Tests ---');

  runTest('Cache: Same hash and prompt generates identical cache key and retrieves stored report', () => {
    analysisCache.clear();
    const key = analysisCache.generateKey({
      beforeHash: 'abc123before',
      afterHash: 'def456after',
      challengeDescription: 'Oil leak on conveyor',
      categoryName: 'Equipment / Maintenance',
      model: 'gemini-2.5-flash',
      rulesVersion: '1.0.0'
    });

    const mockReport = {
      resolutionAssessment: 'LIKELY_RESOLVED',
      resolutionConfidence: 95
    };

    analysisCache.set(key, mockReport);
    const cached = analysisCache.get(key);
    assert.ok(cached);
    assert.strictEqual(cached.resolutionAssessment, 'LIKELY_RESOLVED');
    assert.strictEqual(cached.isCached, true);
  });

  console.log('\n======================================================');
  console.log(`📊 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllTests();
