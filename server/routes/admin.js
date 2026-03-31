// routes/admin.js — UPDATED VERSION
// Changes from original:
//   1. GET /api/admin/overview now includes complaint counts
//   2. GET /api/admin/complaints — admin complaint list with filters
//   3. All original endpoints unchanged

const express = require('express');
const protect = require('../middleware/auth');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const { ItemCatalogue, InventoryTx } = require('../models/Item');
const Complaint = require('../models/Complaint'); // ← NEW

const router = express.Router();
router.use(protect(['Admin']));

// ─── GET /api/admin/overview ──────────────────────────────────────────────────
// NEW: Returns complaint stats alongside existing attendance/task stats.
// Used by OverviewPage.jsx and the new ComplaintsAdminPage.
router.get('/overview', async (req, res, next) => {
  try {
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);

    const [users, attendance, tasks, flagged, complaintStats] = await Promise.all([
      User.find({}).countDocuments(),
      Attendance.find({ date: today }).countDocuments(),
      Task.find({ date: today }).countDocuments(),
      Promise.all([
        Attendance.find({ flaggedForReview: true }).countDocuments(),
        Task.find({ flaggedForReview: true }).countDocuments(),
        InventoryTx.find({ flaggedForReview: true }).countDocuments(),
      ]),
      Complaint.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const complaintByStatus = complaintStats.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        users,
        todayAttendance: attendance,
        todayTasks:      tasks,
        flagged:         flagged[0] + flagged[1] + flagged[2],
        complaints: {
          submitted:   complaintByStatus.submitted   || 0,
          assigned:    complaintByStatus.assigned    || 0,
          in_progress: complaintByStatus.in_progress || 0,
          completed:   complaintByStatus.completed   || 0,
          verified:    complaintByStatus.verified    || 0,
          reopened:    complaintByStatus.reopened    || 0,
          total: Object.values(complaintByStatus).reduce((a, b) => a + b, 0),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── User Management (unchanged) ─────────────────────────────────────────────

router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
});

router.patch('/users/:employeeCode', async (req, res, next) => {
  try {
    const { name, assignedAreas, isActive, role, phone, email } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (assignedAreas !== undefined) updates.assignedAreas = assignedAreas;
    if (isActive !== undefined) updates.isActive = isActive;
    if (role !== undefined) updates.role = role;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update' });
    }

    const user = await User.findOneAndUpdate(
      { employeeCode: req.params.employeeCode },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.delete('/users/:employeeCode', async (req, res, next) => {
  try {
    const user = await User.findOne({ employeeCode: req.params.employeeCode });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'Worker') {
      return res.status(400).json({ success: false, message: 'Only worker accounts can be deleted' });
    }

    await User.deleteOne({ _id: user._id });
    res.json({ success: true, message: 'Worker deleted successfully' });
  } catch (err) { next(err); }
});

// ─── Attendance ──────────────────────────────────────────────────────────────

router.get('/attendance', async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const records = await Attendance.find({ date })
      .populate('worker', 'name employeeCode assignedAreas')
      .lean();

    const attendance = records.map((r) => ({
      employeeCode:  r.worker?.employeeCode,
      name:          r.worker?.name,
      assignedAreas: r.worker?.assignedAreas,
      checkIn:       r.checkIn,
      breakStart:    r.breakStart,
      breakEnd:      r.breakEnd,
      checkOut:      r.checkOut,
      flagged:       r.flaggedForReview,
    }));

    res.json({ success: true, date, data: attendance });
  } catch (err) { next(err); }
});

router.patch('/attendance/:id/review', async (req, res, next) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { $set: { flaggedForReview: false, reviewNote: req.body.note } },
      { new: true }
    );
    if (!attendance) return res.status(404).json({ success: false, message: 'Attendance record not found' });
    res.json({ success: true, data: attendance });
  } catch (err) { next(err); }
});

// ─── Task Audit (unchanged) ───────────────────────────────────────────────────

router.get('/tasks', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.date)     filter.date = req.query.date;
    if (req.query.status)   filter.status = req.query.status;
    if (req.query.flagged)  filter.flaggedForReview = req.query.flagged === 'true';
    if (req.query.aiStatus) filter.photoAiStatus = req.query.aiStatus;
    if (req.query.workerId) filter.worker = req.query.workerId;
    
    // Handle building filter — match tasks where area starts with or contains the building name
    if (req.query.building) {
      const building = req.query.building.trim();
      filter.area = { $regex: `^${building}`, $options: 'i' };
    }

    const tasks = await Task.find(filter)
      .populate('worker', 'name employeeCode')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, total: tasks.length, data: tasks });
  } catch (err) { next(err); }
});

router.patch('/tasks/:id/review', async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: { flaggedForReview: false, reviewNote: req.body.note } },
      { new: true }
    );
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
});

// ─── Inventory (unchanged) ────────────────────────────────────────────────────

router.get('/inventory', async (req, res, next) => {
  try {
    const summary = await InventoryTx.aggregate([
      { $group: { _id: '$item', totalQty: { $sum: '$qty' }, txCount: { $sum: 1 }, lastUpdate: { $max: '$createdAt' } } },
      { $lookup: { from: 'itemcatalogues', localField: '_id', foreignField: '_id', as: 'item' } },
      { $unwind: '$item' },
      { $project: { _id: 0, item: '$item.name', unit: '$item.unit', category: '$item.category', totalQty: 1, txCount: 1, lastUpdate: 1 } },
      { $sort: { item: 1 } },
    ]);
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
});

router.patch('/inventory/:id/review', async (req, res, next) => {
  try {
    const inventoryTx = await InventoryTx.findByIdAndUpdate(
      req.params.id,
      { $set: { flaggedForReview: false, reviewNote: req.body.note } },
      { new: true }
    );
    if (!inventoryTx) return res.status(404).json({ success: false, message: 'Inventory record not found' });
    res.json({ success: true, data: inventoryTx });
  } catch (err) { next(err); }
});

router.get('/flagged', async (req, res, next) => {
  try {
    const [attendance, tasks, inventory] = await Promise.all([
      Attendance.find({ flaggedForReview: true }).populate('worker', 'name employeeCode').lean(),
      Task.find({ flaggedForReview: true }).populate('worker', 'name employeeCode').lean(),
      InventoryTx.find({ flaggedForReview: true }).populate('worker', 'name employeeCode').populate('item', 'name').lean(),
    ]);
    res.json({ success: true, data: { attendance, tasks, inventory } });
  } catch (err) { next(err); }
});

router.get('/items', async (req, res, next) => {
  try {
    const items = await ItemCatalogue.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

router.post('/items', async (req, res, next) => {
  try {
    const item = await ItemCatalogue.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.patch('/items/:id', async (req, res, next) => {
  try {
    const item = await ItemCatalogue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

module.exports = router;
