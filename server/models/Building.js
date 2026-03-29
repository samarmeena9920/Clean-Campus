// server/models/Building.js
// Flat schema designed for cascading dropdowns.
// Each building document contains the full arrays for blocks, floors,
// and area types — fetched once and used client-side to drive the cascade.
// No joins needed; single document read gives the frontend everything it needs.

const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    name: {
      type:     String,
      required: [true, 'Building name is required'],
      unique:   true,
      trim:     true,
    },

    // ── Cascading dropdown arrays ─────────────────────────────────────────────
    // Kept as flat string arrays inside the document for max read performance
    // — one document fetch populates all three dropdown levels.

    // e.g. ["Block A", "Block B", "None"]
    // If the array contains only "None", the frontend hides the block dropdown.
    blocks: {
      type:    [String],
      default: ['None'],
    },

    // e.g. ["Ground Floor", "First Floor", "Second Floor"]
    floors: {
      type:    [String],
      default: [],
    },

    // e.g. ["Washroom", "Corridor", "Classroom", "Faculty Cabin", "Lab"]
    areaTypes: {
      type:    [String],
      default: [],
    },

    // ── Soft delete / visibility ──────────────────────────────────────────────
    // isActive: false hides the building from student/worker dropdowns
    // without permanently deleting audit history on existing complaints.
    isActive: {
      type:    Boolean,
      default: true,
      index:   true,
    },
  },
  { timestamps: true }
);

// Index for fast active-building queries (used by public GET endpoint)
buildingSchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('Building', buildingSchema);
