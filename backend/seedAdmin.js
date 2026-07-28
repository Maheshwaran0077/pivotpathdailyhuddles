const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); // <--- DOUBLE CHECK THIS PATH
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    // Check if admin already exists to avoid duplicates
    const existingAdmin = await User.findOne({ gmail: 'Maheshadmin@gmail.com' });
    if (existingAdmin) {
      console.log('Admin already exists!');
      process.exit();
    }

    // Create the admin object using the USER model
    const admin = new User({
      name: 'Maheshwaran Admin', 
      employeeId: 'ADMIN-001',
      gmail: 'Maheshadmin@gmail.com',
      password: 'SecurePassword123', // The User model's .pre('save') will hash this automatically
      role: 'superadmin',
      department: 'All'
    }); 

    await admin.save();
    console.log('✅ Master Admin Created successfully!');
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();