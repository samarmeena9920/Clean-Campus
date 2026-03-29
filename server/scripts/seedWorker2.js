require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const WORKER = {
  name:     'Test Worker 2',
  phone:    '1234567890',
  password: 'Worker@1234',
  role:     'Worker',
  assignedAreas: ['Block C', 'Block D'],
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const existing = await User.findOne({ phone: WORKER.phone });
    if (existing) {
      console.log(`Worker already exists: ${existing.employeeCode} (${existing.phone})`);
      process.exit(0);
    }
    const worker = await User.create(WORKER);
    console.log(`✅ Worker 2 created: ${worker.employeeCode} — Phone: ${worker.phone}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
})();
