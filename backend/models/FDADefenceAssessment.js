const mongoose = require('mongoose');

const FDADefenceAssessmentSchema = new mongoose.Schema({
  scope: { type: String, required: true, unique: true }, // 'overall', 'quality', 'delivery', 'safety', 'health'
  status: { type: String, enum: ['STRONG', 'MODERATE', 'WEAK'], default: 'STRONG' },
  assessmentText: { type: String, default: '' },
  keyConcerns: { type: String, default: '' },
  recommendedActions: { type: String, default: '' },
  isManual: { type: Boolean, default: false },
  updatedBy: String
}, { timestamps: true });

module.exports = mongoose.model('FDADefenceAssessment', FDADefenceAssessmentSchema);
