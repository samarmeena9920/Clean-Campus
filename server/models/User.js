const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Counter Schema (unchanged) ───────────────────────────────────────────────
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 1000 },
});
const Counter = mongoose.model('Counter', counterSchema);

// ─── User Schema ──────────────────────────────────────────────────────────────
// CHANGE from original: added 'Student' to the role enum.
// Students log in with college email + password (same login endpoint).
// After login, App.jsx redirects to /student/complaints.
// All other fields are unchanged.

const userSchema = new mongoose.Schema(
  {
    employeeCode: {
      type:   String,
      unique: true,
      index:  true,
    },

    name: {
      type:     String,
      required: [true, 'Name is required'],
      trim:     true,
    },

    phone: {
      type:   String,
      unique: true,
      sparse: true,
      trim:   true,
    },
    email: {
      type:      String,
      unique:    true,
      sparse:    true,
      trim:      true,
      lowercase: true,
    },

    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: 6,
      select:    false,
    },

    // ── CHANGE: 'Student' added ───────────────────────────────────────────────
    role: {
      type:    String,
      enum:    ['Worker', 'Admin', 'Student'],
      default: 'Worker',
    },

    assignedAreas: [{ type: String, trim: true }],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── Pre-save: generate employeeCode + hash password (unchanged) ──────────────
userSchema.pre('save', async function (next) {
  if (this.isNew && !this.employeeCode) {
    const counter = await Counter.findByIdAndUpdate(
      'employeeCode',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.employeeCode = `EMP-${counter.seq}`;
  }
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePwd) {
  return bcrypt.compare(candidatePwd, this.password);
};

module.exports = mongoose.model('User', userSchema);
