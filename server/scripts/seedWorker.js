/**
 * Seed Script — create a test Worker account.
 * Usage:  node server/scripts/seedWorker.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const WORKER = {
  name:     'Test Worker',
  phone:    '9876543210',
  password: 'Worker@1234',   // ← change after first login
  role:     'Worker',
  assignedAreas: ['Block A', 'Block B'],
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ phone: WORKER.phone });
    if (existing) {
      console.log(`Worker already exists: ${existing.employeeCode} (${existing.phone})`);
      process.exit(0);
    }

    const worker = await User.create(WORKER);
    console.log(`✅ Worker created: ${worker.employeeCode} — Phone: ${worker.phone}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
})();
