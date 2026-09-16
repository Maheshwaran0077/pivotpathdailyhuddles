const mongoose = require('mongoose');

// 1. Define Sub-Schemas
const IssueLogSchema = new mongoose.Schema({
  date: String,
  rawDate: String,
  // Delivery / Production Metrics
  planned: { type: Number, default: 0 },    // Target Output
  dispatched: { type: Number, default: 0 },  // Actual Output
  breakdowns: { type: Number, default: 0 }, // Downtime in mins
  pbrDelay: { type: Number, default: 0 },
  qcDelay: { type: Number, default: 0 },

  // Primary Packing / Production Specifics
  waste: { type: Number, default: 0 },      // Material waste
  lineId: { type: String, default: 'L1' },  // Packing Line ID
  batchNumber: { type: String, default: '' },

  // Quality / Safety / Health
  reason: String,
  incident: String,
  affected: Number,
  severity: String,
  timestamp: { type: Date, default: Date.now },
  deviationType: { type: String, enum: ['Human Error', 'Process Error', ''], default: '' },
  numSafetyIncidents: { type: Number, default: 0 },
  numNearMiss: { type: Number, default: 0 },
  numUnsafeActs: { type: Number, default: 0 },
}, { _id: false });

const ImageMetaSchema = new mongoose.Schema({
  secure_url: { type: String, default: '' },
  url: { type: String, default: '' },
  public_id: { type: String, default: '' },
  fileName: { type: String, default: '' },
  format: { type: String, default: '' },
  bytes: { type: Number, default: null },
  uploadedAt: { type: Date, default: null },
  uploadedBy: { type: String, default: '' },
  uploadedByEmployeeId: { type: String, default: '' },
  dimensions: {
    width: { type: Number, default: null },
    height: { type: Number, default: null },
  },
  fileSize: { type: Number, default: null },
  mimeType: { type: String, default: '' },
  hash: { type: String, default: '' },
}, { _id: false });

const VerificationHistoryItemSchema = new mongoose.Schema({
  action: { type: String, required: true }, // 'UPLOAD_BEFORE', 'UPLOAD_AFTER', 'AI_ANALYSIS', 'VERIFIED_APPROVED', 'VERIFIED_REJECTED', 'REOPENED'
  performedBy: { type: String, default: '' },
  performedByEmployeeId: { type: String, default: '' },
  performedByRole: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const ResolutionVerificationSchema = new mongoose.Schema({
  beforeImage: { type: ImageMetaSchema, default: () => ({}) },
  afterImage: { type: ImageMetaSchema, default: () => ({}) },
  analysisStatus: {
    type: String,
    enum: ['NOT_STARTED', 'PENDING', 'COMPLETED', 'FAILED'],
    default: 'NOT_STARTED',
  },
  analysisId: { type: String, default: '' },
  aiModel: { type: String, default: '' },
  aiAnalysisVersion: { type: String, default: '' },
  problemDetectedBefore: { type: Boolean, default: null },
  problemDetectedAfter: { type: Boolean, default: null },
  sameAreaConfidence: { type: Number, default: 0 },
  imageQualityScore: { type: Number, default: 0 },
  evidenceQualityScore: { type: Number, default: 0 },
  visualImprovementScore: { type: Number, default: 0 },
  resolutionConfidence: { type: Number, default: 0 },
  resolutionAssessment: {
    type: String,
    enum: ['NOT_RESOLVED', 'PARTIALLY_RESOLVED', 'LIKELY_RESOLVED', 'INSUFFICIENT_EVIDENCE', 'NONE'],
    default: 'NONE',
  },
  remainingIssue: { type: Boolean, default: null },
  suspiciousEvidence: { type: Boolean, default: false },
  analysisReason: { type: String, default: '' },
  detectedBeforeConditions: { type: [String], default: [] },
  detectedAfterConditions: { type: [String], default: [] },
  verificationRecommendation: {
    type: String,
    enum: ['READY_FOR_HUMAN_VERIFICATION', 'REVIEW_REQUIRED', 'REJECT_OR_RETAKE_IMAGE', 'NONE'],
    default: 'NONE',
  },
  analyzedAt: { type: Date, default: null },
  processingLatencyMs: { type: Number, default: 0 },
  retryCount: { type: Number, default: 0 },
  verifiedBy: { type: String, default: '' },
  verifiedByEmployeeId: { type: String, default: '' },
  verifiedByRole: { type: String, default: '' },
  verifiedAt: { type: Date, default: null },
  verifierDecision: {
    type: String,
    enum: ['APPROVED', 'REJECTED', 'PENDING', 'NONE'],
    default: 'NONE',
  },
  verifierComments: { type: String, default: '' },
  rejectionReason: { type: String, default: '' },
  verificationHistory: { type: [VerificationHistoryItemSchema], default: [] },
}, { _id: false });

const StaffLogSchema = new mongoose.Schema({
  id: String, // Acts as trackerId
  trackerId: String,
  date: String,
  occurredTime: String,
  department: String,
  errorType: String,
  otherErrorType: String,
  alertTypes: [String], // Supported: Target Met, Machine Failure, etc.
  description: String,
  responsiblePersonId: String,
  responsiblePersonName: String,
  responsiblePersonEmployeeId: String,
  reportedByUserId: String,
  reportedByName: String,
  reportedByEmployeeId: String,
  severity: { type: String, default: 'Medium' },
  capa: { type: String, default: '' },
  beforeImage: { type: ImageMetaSchema, default: null },
  afterImage: { type: ImageMetaSchema, default: null },
  status: {
    type: String,
    enum: [
      'PENDING',
      'OPEN',
      'IN_PROGRESS',
      'WAITING_FOR_AFTER_IMAGE',
      'AI_ANALYZING',
      'AI_ANALYZED',
      'ACTION_COMPLETED',
      'AI_ANALYSIS_PENDING',
      'AI_ANALYSIS_COMPLETED',
      'PENDING_HUMAN_VERIFICATION',
      'PENDING_VERIFICATION',
      'RESOLVED',
      'CLOSED',
      'REOPENED'
    ],
    default: 'PENDING'
  },
  markResolved: { type: Boolean, default: false },
  resolvedBy: String,
  resolvedAt: Date,
  actionStatus: { type: String, default: 'Initialized' },
  actionNotes: String,
  resolutionVerification: { type: ResolutionVerificationSchema, default: () => ({}) },
  name: String, // fallback name
  action: String, // fallback action
  time: String // fallback time
}, { _id: false, timestamps: true });

const ActivityLogSchema = new mongoose.Schema({
  id: String, // Acts as trackerId
  trackerId: String,
  date: String,
  occurredTime: String,
  department: String,
  errorType: String,
  otherErrorType: String,
  alertTypes: [String],
  description: String,
  responsiblePersonId: String,
  responsiblePersonName: String,
  responsiblePersonEmployeeId: String,
  reportedByUserId: String,
  reportedByName: String,
  reportedByEmployeeId: String,
  severity: { type: String, default: 'Medium' },
  capa: { type: String, default: '' },
  beforeImage: { type: ImageMetaSchema, default: null },
  afterImage: { type: ImageMetaSchema, default: null },
  status: {
    type: String,
    enum: [
      'PENDING',
      'OPEN',
      'IN_PROGRESS',
      'WAITING_FOR_AFTER_IMAGE',
      'AI_ANALYZING',
      'AI_ANALYZED',
      'ACTION_COMPLETED',
      'AI_ANALYSIS_PENDING',
      'AI_ANALYSIS_COMPLETED',
      'PENDING_HUMAN_VERIFICATION',
      'PENDING_VERIFICATION',
      'RESOLVED',
      'CLOSED',
      'REOPENED'
    ],
    default: 'PENDING'
  },
  markResolved: { type: Boolean, default: false },
  resolvedBy: String,
  resolvedAt: Date,
  actionStatus: { type: String, default: 'Initialized' },
  actionNotes: String,
  resolutionVerification: { type: ResolutionVerificationSchema, default: () => ({}) },
  name: String, // fallback name
  action: String, // fallback action
  time: String // fallback time
}, { _id: false, timestamps: true });

// 2. Define the Shift Data Container
const ShiftDataSchema = new mongoose.Schema({
  alerts: { type: Number, default: 0 },
  success: { type: Number, default: 0 },
  daysData: [String],
  issueLogs: [IssueLogSchema],
  staffLogs: [StaffLogSchema],
  activityLogs: [ActivityLogSchema],
}, { _id: false });

// 3. Main Metric Schema
const MetricSchema = new mongoose.Schema({
  letter: { type: String, required: true }, // Q, D, S, H, I
  dept: { type: String, default: 'unknown' }, // fgmw | pmw | rmw | ppp | pop | qcmad | pro | spp | fac
  label: String,

  // Shift-specific storage
  shifts: {
    '1': { type: ShiftDataSchema, default: () => ({}) },
    '2': { type: ShiftDataSchema, default: () => ({}) },
    '3': { type: ShiftDataSchema, default: () => ({}) },
  }
}, { timestamps: true });

MetricSchema.index({ letter: 1, dept: 1 }, { unique: true });

module.exports = mongoose.model('Metric', MetricSchema);