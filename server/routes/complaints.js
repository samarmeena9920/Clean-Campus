// server/routes/complaints.js — UPDATED for Task 5
// Changes from tasks-update.zip version:
//   1. POST / now reads req.body.location (new structured shape) in addition
//      to legacy indoorLocation — whichever is provided gets saved.
//   2. Duplicate detection now also checks location.building for building-scoped
//      upvote enforcement (Task 3).
//   3. /board endpoint adds location to the select projection.
//   4. All other endpoints unchanged.

const express = require('express');
const protect = require('../middleware/auth');
const Complaint = require('../models/Complaint');
const Task = require('../models/Task');
const User = require('../models/User');

const router = express.Router();

// Task 5: all categories are cleaning types
const CATEGORY_ROUTING = {
  sweeping:         'sanitation',
  mopping:          'sanitation',
  washroom:         'sanitation',
  garbage:          'sanitation',
  general_cleaning: 'sanitation',
};

function buildTaskAreaLabel(complaint, providedArea) {
  if (providedArea) return providedArea;

  const loc = complaint.location;
  if (loc?.building) {
    return [
      loc.building,
      loc.block !== 'None' ? loc.block : null,
      loc.floor,
      loc.areaType,
      loc.roomNumber,
    ]
      .filter(Boolean)
      .join(' › ');
  }

  if (complaint.indoorLocation?.area) {
    return `${complaint.indoorLocation.building} - ${complaint.indoorLocation.area}`;
  }

  return `Complaint #${complaint._id.toString().slice(-6)}`;
}

function getLocationCandidates(location, indoorLocation) {
  const candidates = [];

  if (location?.building) {
    if (location.block && location.block !== 'None') {
      candidates.push(`${location.building} - ${location.block}`);
    }
    candidates.push(location.building);
  } else if (indoorLocation?.building) {
    candidates.push(indoorLocation.building);
  }

  return [...new Set(candidates.map((v) => String(v).trim()).filter(Boolean))];
}

async function findAutoAssignableWorker(complaint) {
  const candidates = getLocationCandidates(complaint.location, complaint.indoorLocation);
  if (!candidates.length) return null;

  const workers = await User.find({ role: 'Worker', isActive: true })
    .select('name employeeCode assignedAreas createdAt')
    .sort({ createdAt: 1 })
    .lean();

  const norm = (s) => String(s || '').trim().toLowerCase();

  for (const candidate of candidates) {
    const hit = workers.find((w) =>
      (w.assignedAreas || []).some((a) => norm(a) === norm(candidate))
    );
    if (hit) return hit;
  }

  return null;
}

async function autoAssignComplaint(complaint) {
  const worker = await findAutoAssignableWorker(complaint);
  if (!worker) return { assigned: false };

  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  const task = await Task.create({
    worker: worker._id,
    area: buildTaskAreaLabel(complaint),
    status: 'pending',
    date: today,
  });

  complaint.assignedTo = worker._id;
  complaint.assignedAt = new Date();
  complaint.status = 'assigned';
  complaint.linkedTaskId = task._id;
  await complaint.save();

  return { assigned: true, worker, task };
}

// ─── Duplicate Detection Helper ───────────────────────────────────────────────
// Checks GPS radius (50 m) OR same building+areaType within last 24 h.
async function findNearbyDuplicate(category, lat, lng, location) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const baseFilter = {
    category,
    parentComplaintId: null,
    status: { $in: ['submitted', 'assigned', 'in_progress', 'reopened'] },
    createdAt: { $gte: cutoff },
  };

  // Indoor duplicate: strictly match structured indoor location.
  // Important: for indoor complaints we DO NOT fall back to GPS matching,
  // otherwise nearby buildings/blocks can be incorrectly treated as duplicates.
  if (location?.building && location?.floor && location?.areaType) {
    const indoorFilter = {
      ...baseFilter,
      'location.building': location.building,
      'location.floor': location.floor,
      'location.areaType': location.areaType,
    };

    // Include block match only when provided and not the sentinel 'None'.
    if (location.block && location.block !== 'None') {
      indoorFilter['location.block'] = location.block;
    }

    // If room is provided, require exact room match as well.
    if (location.roomNumber) {
      indoorFilter['location.roomNumber'] = location.roomNumber;
    }

    const indoorDup = await Complaint.findOne(indoorFilter).lean();
    if (indoorDup) return indoorDup;

    return null;
  }

  // GPS-based duplicate (outdoor / no indoor location)
  if (lat && lng) {
    const DELTA = 0.00050;
    const gpsDup = await Complaint.findOne({
      ...baseFilter,
      'gps.latitude':  { $gte: lat - DELTA, $lte: lat + DELTA },
      'gps.longitude': { $gte: lng - DELTA, $lte: lng + DELTA },
    }).lean();
    if (gpsDup) return gpsDup;
  }

  return null;
}

// ─── Task 4: GET /api/complaints/board (public) ───────────────────────────────
// Must come before /:id to avoid route collision.
router.get('/board', async (req, res, next) => {
  try {
    const filter = { parentComplaintId: null };
    if (req.query.status)   filter.status = req.query.status;
    if (req.query.building) filter['location.building'] = req.query.building;

    const complaints = await Complaint.find(filter)
      .select('-assignedTo -assignedBy -assignedAt -linkedTaskId -flaggedForReview -reviewNote -timeDriftSeconds -upvotedBy')
      .sort({ upvoteCount: -1, createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ success: true, total: complaints.length, data: complaints });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/complaints ─────────────────────────────────────────────────────
router.post('/', protect(['Student']), async (req, res, next) => {
  try {
    const { category, description, photoUrl, gps, location, indoorLocation } = req.body;

    if (!category) {
      return res.status(400).json({ success: false, message: 'category is required' });
    }

    const allowedCategories = Object.keys(CATEGORY_ROUTING);
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${allowedCategories.join(', ')}`,
      });
    }

    // Use new location shape if provided, fall back to legacy indoorLocation
    const resolvedLocation = location || (indoorLocation ? {
      building: indoorLocation.building,
      floor:    indoorLocation.floor,
      areaType: indoorLocation.area,
    } : undefined);

    const duplicate = await findNearbyDuplicate(
      category,
      gps?.latitude,
      gps?.longitude,
      resolvedLocation
    );

    if (duplicate) {
      const alreadyUpvoted = Array.isArray(duplicate.upvotedBy)
        ? duplicate.upvotedBy.some((uid) => uid.toString() === req.user._id.toString())
        : false;

      return res.status(200).json({
        success: true,
        isDuplicate: true,
        message: 'A similar complaint already exists nearby. You can upvote it instead.',
        existingComplaint: {
          _id:         duplicate._id,
          category:    duplicate.category,
          description: duplicate.description,
          status:      duplicate.status,
          upvoteCount: duplicate.upvoteCount,
          location:    duplicate.location,
          indoorLocation: duplicate.indoorLocation,
          createdAt:   duplicate.createdAt,
          alreadyUpvoted,
        },
      });
    }

    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);

    const complaint = await Complaint.create({
      student:        req.user._id,
      category,
      description,
      photoUrl:       photoUrl || null,
      gps,
      location:       resolvedLocation,   // Task 5: structured location
      indoorLocation: indoorLocation || null, // legacy compat
      date:           today,
      supervisorType: CATEGORY_ROUTING[category],
    });

    let autoAssigned = { assigned: false };
    try {
      autoAssigned = await autoAssignComplaint(complaint);
    } catch (assignErr) {
      console.warn('[auto-assign] failed:', assignErr.message);
    }

    res.status(201).json({
      success: true,
      isDuplicate: false,
      autoAssigned: autoAssigned.assigned,
      assignedWorker: autoAssigned.assigned
        ? {
            _id: autoAssigned.worker._id,
            name: autoAssigned.worker.name,
            employeeCode: autoAssigned.worker.employeeCode,
          }
        : null,
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/complaints/:id/upvote ─────────────────────────────────────────
// Students can upvote any complaint (building-agnostic).
router.post('/:id/upvote', protect(['Student']), async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const alreadyVoted = complaint.upvotedBy.some(
      (uid) => uid.toString() === req.user._id.toString()
    );
    if (alreadyVoted) {
      return res.status(409).json({ success: false, message: 'You already upvoted this complaint' });
    }

    complaint.upvoteCount += 1;
    complaint.upvotedBy.push(req.user._id);
    await complaint.save();
    res.json({ success: true, upvoteCount: complaint.upvoteCount });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/complaints/mine ─────────────────────────────────────────────────
router.get('/mine', protect(['Student']), async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ student: req.user._id })
      .sort({ createdAt: -1 })
      .populate('assignedTo', 'name employeeCode')
      .populate('linkedTaskId', 'area status beforePhotoUrl afterPhotoUrl startedAt completedAt durationSeconds')
      .lean();
    res.json({ success: true, total: complaints.length, data: complaints });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/complaints ──────────────────────────────────────────────────────
router.get('/', protect(['Admin']), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status)         filter.status = req.query.status;
    if (req.query.category)       filter.category = req.query.category;
    if (req.query.date)           filter.date = req.query.date;
    if (req.query.supervisorType) filter.supervisorType = req.query.supervisorType;
    if (req.query.workerId)       filter.assignedTo = req.query.workerId;
    if (req.query.building)       filter['location.building'] = req.query.building;

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .populate('student', 'name employeeCode email')
      .populate('assignedTo', 'name employeeCode')
      .populate('assignedBy', 'name')
      .populate('linkedTaskId', 'area status beforePhotoUrl afterPhotoUrl startedAt completedAt durationSeconds photoAiStatus photoAiNote')
      .lean();

    res.json({ success: true, total: complaints.length, data: complaints });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/complaints/:id ──────────────────────────────────────────────────
router.get('/:id', protect(['Admin', 'Student']), async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('student', 'name email')
      .populate('assignedTo', 'name employeeCode')
      .populate('linkedTaskId');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    if (
      req.user.role === 'Student' &&
      complaint.student._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    res.json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/complaints/:id/assign ────────────────────────────────────────
router.patch('/:id/assign', protect(['Admin']), async (req, res, next) => {
  try {
    const { workerId, area } = req.body;
    if (!workerId) {
      return res.status(400).json({ success: false, message: 'workerId is required' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    if (['completed', 'verified'].includes(complaint.status)) {
      return res.status(400).json({
        success: false,
        message: 'Completed/verified complaints cannot be reassigned',
      });
    }

    const worker = await User.findById(workerId).select('role isActive');
    if (!worker || worker.role !== 'Worker' || !worker.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Please select an active worker',
      });
    }

    const taskArea = buildTaskAreaLabel(complaint, area);

    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);

    let task = null;
    if (complaint.linkedTaskId) {
      task = await Task.findById(complaint.linkedTaskId);
    }

    if (task && task.status !== 'completed') {
      task.worker = workerId;
      task.area = taskArea;
      task.status = 'pending';
      await task.save();
    } else {
      task = await Task.create({
        worker: workerId,
        area:   taskArea,
        status: 'pending',
        date:   today,
      });
    }

    complaint.assignedTo   = workerId;
    complaint.assignedBy   = req.user._id;
    complaint.assignedAt   = new Date();
    complaint.status       = 'assigned';
    complaint.linkedTaskId = task._id;
    await complaint.save();

    res.json({ success: true, data: complaint, linkedTask: task });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/complaints/:id/verify ────────────────────────────────────────
router.patch('/:id/verify', protect(['Admin']), async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('linkedTaskId');
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });

    const task = complaint.linkedTaskId;
    if (!task || !task.beforePhotoUrl || !task.afterPhotoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Cannot verify until worker before/after photos are available',
      });
    }

    complaint.status = 'verified';
    complaint.isAdminVerified = true;
    complaint.reviewNote = req.body.note;
    await complaint.save();
    res.json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/complaints/:id/reopen ────────────────────────────────────────
router.patch('/:id/reopen', protect(['Student']), async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });
    if (complaint.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (complaint.status !== 'verified') {
      return res.status(400).json({ success: false, message: 'Only verified complaints can be reopened' });
    }
    complaint.status = 'reopened';
    complaint.reopenReason = req.body.reason;
    complaint.isAdminVerified = false;
    await complaint.save();

    let autoAssigned = { assigned: false };
    try {
      autoAssigned = await autoAssignComplaint(complaint);
    } catch (assignErr) {
      console.warn('[reopen auto-assign] failed:', assignErr.message);
    }

    res.json({
      success: true,
      autoAssigned: autoAssigned.assigned,
      assignedWorker: autoAssigned.assigned
        ? {
            _id: autoAssigned.worker._id,
            name: autoAssigned.worker.name,
            employeeCode: autoAssigned.worker.employeeCode,
          }
        : null,
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/complaints/:id/feedback ──────────────────────────────────────
router.patch('/:id/feedback', protect(['Student']), async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });
    if (complaint.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (!complaint.isAdminVerified) {
      return res.status(403).json({
        success: false,
        message: 'Feedback is not available until an admin has verified the work.',
      });
    }
    complaint.studentFeedback = req.body.feedback;
    complaint.studentRating   = req.body.rating;
    await complaint.save();
    res.json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/complaints/:id/task-completed ────────────────────────────────
router.patch('/:id/task-completed', protect(['Worker', 'Admin']), async (req, res, next) => {
  try {
    const complaint = await Complaint.findOneAndUpdate(
      { linkedTaskId: req.params.id, status: { $in: ['assigned', 'in_progress'] } },
      { $set: { status: 'completed' } },
      { new: true }
    );
    res.json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
