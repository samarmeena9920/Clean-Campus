// server/models/Complaint.js — UPDATED
// Task 5: replaced the flat indoorLocation sub-doc with the new structured
//         location fields that match the Building schema's cascading arrays.
//
// BEFORE (old shape):
//   indoorLocation: { building: String, floor: String, area: String }
//
// AFTER (new shape):
//   location: {
//     building:   String  (matched to Building.name)
//     block:      String  (from Building.blocks)
//     floor:      String  (from Building.floors)
//     areaType:   String  (from Building.areaTypes)
//     roomNumber: String  (optional free text, e.g. "104")
//   }
//
// Backward compatibility: indoorLocation kept as a legacy alias (sparse)
// so existing documents don't break. New submissions use location.
// All other fields unchanged.

const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    student: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    // Task 5 enum update matches tasks-update.zip (cleaning-only categories)
    category: {
      type:     String,
      enum:     ['sweeping', 'mopping', 'washroom', 'garbage', 'general_cleaning'],
      required: true,
    },

    description: {
      type:      String,
      trim:      true,
      maxlength: 500,
    },

    photoUrl: { type: String, default: null },

    // ── GPS (outdoor / where available) ──────────────────────────────────────
    gps: {
      latitude:  { type: Number },
      longitude: { type: Number },
    },

    // ── Task 5: Structured indoor location ───────────────────────────────────
    // Replaces the old flat indoorLocation sub-doc.
    // Each field maps to one dropdown level in the Building schema.
    location: {
      building:   { type: String, trim: true },   // Building.name
      block:      { type: String, trim: true },   // Building.blocks[i]
      floor:      { type: String, trim: true },   // Building.floors[i]
      areaType:   { type: String, trim: true },   // Building.areaTypes[i]
      roomNumber: { type: String, trim: true },   // free text, e.g. "104" (optional)
    },

    // ── Legacy field — kept for backward compatibility with old documents ─────
    // New submissions will NOT use this; the complaints route writes to location.
    // Old documents that have indoorLocation will still display correctly
    // because the frontend checks both fields.
    indoorLocation: {
      building: { type: String, trim: true },
      floor:    { type: String, trim: true },
      area:     { type: String, trim: true },
    },

    status: {
      type:    String,
      enum:    ['submitted', 'assigned', 'in_progress', 'completed', 'verified', 'reopened'],
      default: 'submitted',
      index:   true,
    },

    assignedTo: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    assignedBy: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    assignedAt: { type: Date, default: null },

    linkedTaskId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Task',
      default: null,
    },

    parentComplaintId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Complaint',
      default: null,
    },
    upvoteCount: { type: Number, default: 0 },
    upvotedBy:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Task 2: isAdminVerified gates student feedback
    isAdminVerified: { type: Boolean, default: false },

    studentFeedback: { type: String, trim: true },
    studentRating:   { type: Number, min: 1, max: 5 },
    reopenReason:    { type: String, trim: true },

    flaggedForReview: { type: Boolean, default: false },
    reviewNote:       { type: String },

    date: { type: String, index: true },
  },
  { timestamps: true }
);

complaintSchema.index({ 'gps.latitude': 1, 'gps.longitude': 1 });
complaintSchema.index({ category: 1, status: 1, date: 1 });
// Task 5: index on building for fast building-scoped queries
complaintSchema.index({ 'location.building': 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
