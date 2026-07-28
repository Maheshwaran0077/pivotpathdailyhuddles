const express = require('express');
const router  = express.Router();
const { getHealthData, updateHealthDay } = require('../controller/healthController');
const HealthModel = require('../models/Health');

router.get('/',        getHealthData);
router.get('/all', async (req, res) => {
  try {
    const healthDocs = await HealthModel.find().lean();
    res.json(healthDocs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/update', updateHealthDay);

module.exports = router;
