// server/routes/auth.js — UPDATED
// Added: PATCH /api/auth/profile — lets any authenticated user update their
// name and assignedAreas (building for students, work zones for workers).
// Everything else is identical to the uploaded version.

const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const protect = require('../middleware/auth');
const Attendance = require('../models/Attendance');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many attempts — try again in 15 minutes' },
});

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.cookie('token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
  const userData = user.toObject();
  delete userData.password;
  res.status(statusCode).json({ success: true, token, user: userData });
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', protect(['Admin']), async (req, res, next) => {
  try {
    const { name, password, role = 'Worker', assignedAreas = [] } = req.body;

    const phone = req.body.phone?.trim() || undefined;
    const email = req.body.email?.trim().toLowerCase() || undefined;

    if (!name || !password || (!phone && !email)) {
      return res.status(400).json({
        success: false,
        message: 'name, password, and at least one of phone/email are required',
      });
    }
    const user = await User.create({ name, phone, email, password, role, assignedAreas });
    sendToken(user, 201, res);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).json({ success: false, message: `${field} already registered` });
    }
    next(err);
  }
});

// ─── POST /api/auth/register/student ─────────────────────────────────────────
router.post('/register/student', authLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'name, email, and password are required',
      });
    }
    const user = await User.create({ name, email, password, role: 'Student' });
    sendToken(user, 201, res);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    next(err);
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { phone, email, password } = req.body;
    if (!password || (!phone && !email)) {
      return res.status(400).json({
        success: false,
        message: 'Provide (phone or email) and password',
      });
    }
    const query = phone ? { phone } : { email };
    const user = await User.findOne(query).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated — contact your admin' });
    }
    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', protect(), (req, res) => {
  res.json({ success: true, user: req.user });
});

// ─── PATCH /api/auth/profile ──────────────────────────────────────────────────
// NEW: Any authenticated user can update their own name and assignedAreas.
// For students, assignedAreas[0] is their building — used for upvote building-match.
// For workers, assignedAreas are their cleaning zones (usually set by admin).
// Body: { name?, assignedAreas? }
router.patch('/profile', protect(), async (req, res, next) => {
  try {
    if (req.user.role === 'Student') {
      return res.status(403).json({
        success: false,
        message: 'Students cannot update profile after registration',
      });
    }

    const { name, assignedAreas } = req.body;

    const updates = {};
    if (name && name.trim())         updates.name = name.trim();
    if (Array.isArray(assignedAreas)) updates.assignedAreas = assignedAreas;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/attendance/today ───────────────────────────────────────────
router.get('/attendance/today', protect(), async (req, res, next) => {
  try {
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    const record = await Attendance.findOne({ worker: req.user._id, date: today });
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
});

module.exports = router;
