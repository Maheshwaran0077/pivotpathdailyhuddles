const mongoose = require('mongoose');

const FactoryDefectSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  stationId: {
    type: String,
    required: true,
    index: true
  },
  errorType: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true,
    enum: ['Finished Good Material Warehouse', 'Packing Material Warehouse', 'Raw Material Warehouse', 'Primary Packing Production', 'Post Production', 'QC & Microbiology & AD Lab', 'Production', 'Secondary Packing Production', 'Facilities'],
    index: true
  },
  pillar: {
    type: String,
    required: true,
    enum: ['Quality', 'Delivery', 'Safety', 'Health'],
    index: true
  },
  shift: {
    type: Number,
    required: true,
    enum: [1, 2, 3],
    index: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['High', 'Medium', 'Low']
  }
});

module.exports = mongoose.model('FactoryDefect', FactoryDefectSchema);
