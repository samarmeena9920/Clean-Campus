/**
 * Seed Script — run once to bootstrap the first Admin user.
 * Usage:  node server/scripts/seedAdmin.js
 *
 * Requires MONGO_URI and JWT_SECRET in .env (root level)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const ADMIN = {
  name:     'System Admin',
  email:    'admin@facility.com',
  password: 'Admin@1234',   // ← change immediately after first login
  role:     'Admin',
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ email: ADMIN.email });
    if (existing) {
      console.log(`Admin already exists: ${existing.employeeCode} (${existing.email})`);
      process.exit(0);
    }

    const admin = await User.create(ADMIN);
    console.log(`✅ Admin created: ${admin.employeeCode} — ${admin.email}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
})();
