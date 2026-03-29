const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    worker: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    area: {
      type:     String,
      required: [true, 'Area is required'],
      trim:     true,
    },

    // ── Timer ──────────────────────────────────────────────────────
    startedAt:   { type: Date },
    completedAt: { type: Date },
    durationSeconds: { type: Number }, // computed on completion

    // ── Visual Proof ───────────────────────────────────────────────
    beforePhotoUrl: { type: String },
    afterPhotoUrl:  { type: String },

    beforeGps: {
      latitude:  { type: Number },
      longitude: { type: Number },
    },
    afterGps: {
      latitude:  { type: Number },
      longitude: { type: Number },
    },

    status: {
      type:    String,
      enum:    ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },

    // ── AI Vision Hook (future-ready) ──────────────────────────────
    /**
     * photoAiStatus: 'unchecked' | 'ok' | 'flagged_identical' | 'flagged_blank'
     * Populated by a background job that routes beforePhotoUrl + afterPhotoUrl
     * to a Vision API. Admins can filter the gallery by this field.
     */
    photoAiStatus: {
      type:    String,
      enum:    ['unchecked', 'ok', 'flagged_identical', 'flagged_blank'],
      default: 'unchecked',
    },
    photoAiNote: { type: String },

    // ── Offline Sync Integrity ──────────────────────────────────────
    isOfflineSync:    { type: Boolean, default: false },
    flaggedForReview: { type: Boolean, default: false },
    timeDriftSeconds: { type: Number },
    reviewNote:       { type: String },

    date: { type: String, index: true }, // YYYY-MM-DD
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
