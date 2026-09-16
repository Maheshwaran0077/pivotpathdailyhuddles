const User = require('../models/User');

const loginUser = async (req, res) => {
  try {
    const { gmail, password } = req.body;
    const user = await User.findOne({ gmail: gmail.toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password))) { 
      return res.status(401).json({ message: 'Invalid Gmail or Password' });
    }
    res.json({ _id: user._id, name: user.name, gmail: user.gmail, role: user.role, department: user.department, shift: user.shift, employeeId: user.employeeId });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
 
const registerUser = async (req, res) => {
  try {
    const { name, dob, employeeId, gmail, password, department, role, shift } = req.body;
    await User.create({ name, dob, employeeId, gmail, password, department, role, shift });
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ message: `Duplicate: a user with this ${field} already exists.` });
    }
    res.status(400).json({ message: error.message });
  }
};

const getSupervisors = async (req, res) => {
  try {
    const { dept } = req.params;
    const query = { role: 'supervisor' };
    if (dept !== 'ALL') query.department = dept;
    const supervisors = await User.find(query).sort({ createdAt: -1 });
    res.status(200).json(supervisors);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch supervisors', error: error.message });
  }
};

const updateSupervisor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, shift, password, gmail } = req.body;
    const user = await User.findById(id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name     && name.trim())       user.name       = name;
    if (shift    && shift.trim())      user.shift      = shift;
    if (department && department.trim()) user.department = department;
    if (gmail    && gmail.trim())      user.gmail      = gmail.toLowerCase();
    if (password && password.trim())   user.password   = password;

    await user.save();
    res.status(200).json({ success: true, message: 'Updated successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const users = await User.find({ role }).sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ name: 1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch all users', error: error.message });
  }
};

module.exports = { loginUser, registerUser, getSupervisors, updateSupervisor, getUsersByRole, deleteUser, getAllUsers };