const mongoose = require('mongoose');

// Reusable sub-schema for a single stamped event (check-in, break, check-out)
const stampSchema = new mongoose.Schema(
  {
    timestamp:     { type: Date },            // device-reported time
    serverTime:    { type: Date },            // set by backend on receipt — used for "Time-Travel" detection
    imageUrl:      { type: String },          // Cloudinary URL of selfie
    gps: {
      latitude:    { type: Number },
      longitude:   { type: Number },
    },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    worker: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    // ── Shift Events ────────────────────────────────────────────────
    checkIn:   stampSchema,
    breakStart: stampSchema,
    breakEnd:   stampSchema,
    checkOut:  stampSchema,

    // Date string (YYYY-MM-DD) for easy daily grouping & unique-per-worker queries
    date: {
      type:  String,
      index: true,
    },

    // ── Offline Sync Integrity ──────────────────────────────────────
    /**
     * isOfflineSync: true  → record arrived via /api/sync (was queued offline).
     * flaggedForReview: true → auto-set when device time deviates too much from
     *   serverTime, indicating a potential clock-manipulation exploit.
     */
    isOfflineSync:    { type: Boolean, default: false },
    flaggedForReview: { type: Boolean, default: false },
    timeDriftSeconds: { type: Number },   // abs(serverTime - deviceTime) in seconds
    reviewNote:       { type: String },   // Admin can annotate
  },
  { timestamps: true }
);

// Ensure one attendance document per worker per date
attendanceSchema.index({ worker: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
