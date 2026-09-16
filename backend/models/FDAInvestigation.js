const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, default: '' },
  answerMethod: { type: String, enum: ['AUTO', 'MANUAL', 'NONE'], default: 'NONE' },
  status: { 
    type: String, 
    enum: ['NOT_ANSWERED', 'AUTO_FILLED', 'MANUAL', 'CONFIRMED', 'INSUFFICIENT_DATA'], 
    default: 'NOT_ANSWERED' 
  },
  sources: [String],
  evidence: [String],
  confidence: { type: Number, default: 0 },
  confirmedBy: String,
  confirmedAt: Date
}, { _id: false });

const FDAInvestigationSchema = new mongoose.Schema({
  challengeId: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  createdBy: { type: String, required: true },
  overallStatus: { type: String, default: 'NOT_ANSWERED' },
  questions: [QuestionSchema]
}, { timestamps: true });

module.exports = mongoose.model('FDAInvestigation', FDAInvestigationSchema);
