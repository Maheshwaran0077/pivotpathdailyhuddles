// routes/userRoutes.js
const express = require('express');
const router = express.Router();

// 1. Add updateSupervisor to your imports
const {
  loginUser,
  registerUser,
  getSupervisors,
  updateSupervisor,
  getUsersByRole,
  deleteUser,
  getAllUsers,
} = require('../controller/userController');

router.post('/login',            loginUser);
router.post('/register',         registerUser);
router.get('/supervisors/:dept', getSupervisors);
router.get('/all-users',         getAllUsers);
router.get('/all/:role',         getUsersByRole);
router.put('/update/:id',        updateSupervisor);
router.delete('/delete/:id',     deleteUser);

module.exports = router;