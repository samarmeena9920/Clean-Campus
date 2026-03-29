// server/scripts/seedStudent.js
// Creates a test student account for local development.
// Run with: node server/scripts/seedStudent.js
// Matches the exact pattern of seedWorker.js

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    try {
        // Remove existing test student if present (for idempotent re-runs)
        await User.deleteOne({ email: 'student@manit.ac.in' });

        const student = await User.create({
            name:     'Test Student',
            email:    'student@manit.ac.in',
            password: 'Student@1234',
            role:     'Student',
        });

        console.log('🎓 Student created:');
        console.log('   Name:          ', student.name);
        console.log('   Email:         ', student.email);
        console.log('   Password:       Student@1234');
        console.log('   Employee Code: ', student.employeeCode);
        console.log('   Role:          ', student.role);
        console.log('\n⚠️  Change this password before deploying to production!');
    } catch (err) {
        if (err.code === 11000) {
            console.log('ℹ️  Student already exists — skipping creation');
        } else {
            throw err;
        }
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected');
    }
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
