/**
 * Seed Script — delete all users and create fresh Admin and Worker.
 * Usage:  node server/scripts/resetUsers.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const ADMIN = {
  name:     'System Admin',
  email:    'admin@facility.com',
  password: 'Admin@1234',   
  role:     'Admin',
};

const WORKER = {
  name:     'Test Worker',
  phone:    '9876543210',
  password: 'Worker@1234',   
  role:     'Worker',
  assignedAreas: ['Block A', 'Block B'],
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Delete all existing users
    const result = await User.deleteMany({});
    console.log(`Deleted ${result.deletedCount} existing users.`);

    // Create Admin
    const admin = await User.create(ADMIN);
    console.log(`✅ Admin created: ${admin.employeeCode} — ${admin.email}`);

    // Create Worker
    const worker = await User.create(WORKER);
    console.log(`✅ Worker created: ${worker.employeeCode} — Phone: ${worker.phone}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Reset failed:', err.message);
    process.exit(1);
  }
})();
