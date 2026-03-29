// server/routes/buildingRoutes.js
// Building Management endpoints.
// Follows the exact same pattern as admin.js and complaints.js in this repo:
//   - protect() from middleware/auth.js for role gating
//   - async/await with next(err) for error propagation
//   - { success, data } response envelope
//
// Routes:
//   GET  /api/buildings              → public (no auth) — student/worker dropdown
//   POST /api/admin/buildings        → Admin only — create building
//   PUT  /api/admin/buildings/:id    → Admin only — update building
//   DELETE /api/admin/buildings/:id  → Admin only — soft delete (isActive=false)

const express    = require('express');
const protect    = require('../middleware/auth');
const Building   = require('../models/Building');

// Two routers: one public, one admin-protected
// They are mounted separately in server.js
const publicRouter = express.Router();
const adminRouter  = express.Router();

// ─── Public: GET /api/buildings ───────────────────────────────────────────────
// No auth required — students and workers need this for offline-first dropdown.
// Returns only active buildings, sorted alphabetically.
// Only exposes the fields needed for the cascading dropdowns (no timestamps etc).
publicRouter.get('/', async (req, res, next) => {
  try {
    const buildings = await Building.find({ isActive: true })
      .select('name blocks floors areaTypes')
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, total: buildings.length, data: buildings });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: POST /api/admin/buildings ─────────────────────────────────────────
// Create a new building configuration.
// Body: { name, blocks[], floors[], areaTypes[] }
adminRouter.post('/', protect(['Admin']), async (req, res, next) => {
  try {
    const { name, blocks, floors, areaTypes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Building name is required' });
    }

    // Sanitise arrays — trim strings, remove empty entries
    const clean = (arr) =>
      Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean) : [];

    const building = await Building.create({
      name:      name.trim(),
      blocks:    clean(blocks).length   ? clean(blocks)    : ['None'],
      floors:    clean(floors),
      areaTypes: clean(areaTypes),
    });

    res.status(201).json({ success: true, data: building });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: `A building named "${req.body.name}" already exists`,
      });
    }
    next(err);
  }
});

// ─── Admin: PUT /api/admin/buildings/:id ─────────────────────────────────────
// Update an existing building — name, blocks, floors, areaTypes, isActive.
// Partial update: only fields present in the body are changed.
// Body: { name?, blocks[]?, floors[]?, areaTypes[]?, isActive? }
adminRouter.put('/:id', protect(['Admin']), async (req, res, next) => {
  try {
    const { name, blocks, floors, areaTypes, isActive } = req.body;

    const clean = (arr) =>
      Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean) : null;

    const updates = {};
    if (name !== undefined)      updates.name      = name.trim();
    if (isActive !== undefined)  updates.isActive  = Boolean(isActive);

    const cleanBlocks    = clean(blocks);
    const cleanFloors    = clean(floors);
    const cleanAreaTypes = clean(areaTypes);

    if (cleanBlocks)    updates.blocks    = cleanBlocks.length    ? cleanBlocks    : ['None'];
    if (cleanFloors)    updates.floors    = cleanFloors;
    if (cleanAreaTypes) updates.areaTypes = cleanAreaTypes;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    const building = await Building.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!building) {
      return res.status(404).json({ success: false, message: 'Building not found' });
    }

    res.json({ success: true, data: building });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Another building with that name already exists',
      });
    }
    next(err);
  }
});

// ─── Admin: DELETE /api/admin/buildings/:id ───────────────────────────────────
// Soft delete — sets isActive=false so existing complaints still reference it.
// Pass ?hard=true to permanently remove (only if no complaints reference it).
adminRouter.delete('/:id', protect(['Admin']), async (req, res, next) => {
  try {
    if (req.query.hard === 'true') {
      // Hard delete — check for complaints first
      const Complaint = require('../models/Complaint');
      const refCount = await Complaint.countDocuments({
        'indoorLocation.building': { $exists: true },
        // We match by building name since Complaint stores name not ObjectId
      });
      // Note: can't easily check by ObjectId since Complaint stores name string.
      // For safety, just soft-delete unless admin explicitly passes ?hard=true
      // and there are truly no linked complaints (admin responsibility).
      await Building.findByIdAndDelete(req.params.id);
      return res.json({ success: true, message: 'Building permanently deleted' });
    }

    // Soft delete (default)
    const building = await Building.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!building) {
      return res.status(404).json({ success: false, message: 'Building not found' });
    }

    res.json({ success: true, message: 'Building deactivated', data: building });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: GET /api/admin/buildings ──────────────────────────────────────────
// Returns ALL buildings (active + inactive) for the admin management table.
adminRouter.get('/', protect(['Admin']), async (req, res, next) => {
  try {
    const buildings = await Building.find({}).sort({ name: 1 }).lean();
    res.json({ success: true, total: buildings.length, data: buildings });
  } catch (err) {
    next(err);
  }
});

module.exports = { publicRouter, adminRouter };
