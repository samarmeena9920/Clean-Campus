const express = require('express');
const protect = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const Complaint = require('../models/Complaint');
const { InventoryTx } = require('../models/Item');

const router = express.Router();

const DRIFT_THRESHOLD_SECONDS = 5 * 60;

function evaluateDrift(deviceTimestamp) {
  if (!deviceTimestamp) return { timeDriftSeconds: null, flaggedForReview: false };
  const serverNow = Date.now();
  const deviceTime = new Date(deviceTimestamp).getTime();
  const driftSeconds = Math.abs(serverNow - deviceTime) / 1000;
  return {
    timeDriftSeconds: Math.round(driftSeconds),
    flaggedForReview: driftSeconds > DRIFT_THRESHOLD_SECONDS,
  };
}

// ─── POST /api/sync ───────────────────────────────────────────────────────────
router.post('/', protect(['Worker', 'Admin']), async (req, res, next) => {
  try {
    const workerId = req.user._id;
    const serverNow = new Date();
    const results = { attendance: 0, tasks: 0, inventory: 0 };
    let totalFlagged = 0;

    // ── 1. Attendance Records ─────────────────────────────────────────────────
    if (Array.isArray(req.body.attendance)) {
      for (const record of req.body.attendance) {
        const drift = evaluateDrift(record.deviceTimestamp);
        if (drift.flaggedForReview) totalFlagged++;

        const stampServerTime = (stamp) =>
          stamp ? { ...stamp, serverTime: serverNow } : undefined;

        try {
          await Attendance.findOneAndUpdate(
            { worker: workerId, date: record.date },
            {
              $set: {
                worker:    workerId,
                date:      record.date,
                checkIn:   stampServerTime(record.checkIn),
                breakStart: stampServerTime(record.breakStart),
                breakEnd:  stampServerTime(record.breakEnd),
                checkOut:  stampServerTime(record.checkOut),
                isOfflineSync:    true,
                flaggedForReview: drift.flaggedForReview,
                timeDriftSeconds: drift.timeDriftSeconds,
              },
            },
            { upsert: true, new: true }
          );
          results.attendance++;
        } catch (e) {
          console.error('[sync] attendance record error:', e.message, record);
        }
      }
    }

    // ── 2. Task Records ───────────────────────────────────────────────────────
    // Task 1: ADDED — validate worker has checked in today before saving tasks
    if (Array.isArray(req.body.tasks) && req.body.tasks.length > 0) {

      // Check if worker has a check-in for today on the server
      const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);

      const todayAttendance = await Attendance.findOne({
        worker: workerId,
        date:   today,
        'checkIn.timestamp': { $exists: true },
      }).lean();

      // If no check-in exists, reject all task records in this batch
      if (!todayAttendance) {
        return res.status(400).json({
          success: false,
          code:    'CHECKIN_REQUIRED',
          message: 'You must check in before submitting task records.',
          saved:   results,
          flagged: totalFlagged,
        });
      }

      // Worker has checked out for the day — also block new task records
      if (todayAttendance.checkOut?.timestamp) {
        return res.status(400).json({
          success: false,
          code:    'SHIFT_ENDED',
          message: 'Your shift has ended (checked out). New tasks cannot be submitted.',
          saved:   results,
          flagged: totalFlagged,
        });
      }

      for (const record of req.body.tasks) {
        const drift = evaluateDrift(record.deviceTimestamp);
        if (drift.flaggedForReview) totalFlagged++;

        try {
          const filter = record.serverId
            ? { _id: record.serverId, worker: workerId }
            : record.localId
            ? { 'meta.localId': record.localId, worker: workerId }
            : { worker: workerId, area: record.area, date: record.date, startedAt: record.startedAt };

          const updatedTask = await Task.findOneAndUpdate(
            filter,
            {
              $set: {
                worker:          workerId,
                area:            record.area,
                startedAt:       record.startedAt,
                completedAt:     record.completedAt,
                durationSeconds: record.durationSeconds,
                beforePhotoUrl:  record.beforePhotoUrl,
                afterPhotoUrl:   record.afterPhotoUrl,
                beforeGps:       record.beforeGps,
                afterGps:        record.afterGps,
                status:          record.status || 'completed',
                date:            record.date,
                isOfflineSync:    true,
                flaggedForReview: drift.flaggedForReview,
                timeDriftSeconds: drift.timeDriftSeconds,
                photoAiStatus:   'unchecked',
              },
            },
            { upsert: true, new: true }
          );

          if (updatedTask && updatedTask.status === 'completed') {
            await Complaint.findOneAndUpdate(
              { linkedTaskId: updatedTask._id, status: { $in: ['assigned', 'in_progress'] } },
              { $set: { status: 'completed' } }
            );
          }

          results.tasks++;
        } catch (e) {
          console.error('[sync] task record error:', e.message, record);
        }
      }
    }

    // ── 3. Inventory Transactions ─────────────────────────────────────────────
    if (Array.isArray(req.body.inventory)) {
      for (const record of req.body.inventory) {
        const drift = evaluateDrift(record.deviceTimestamp);
        if (drift.flaggedForReview) totalFlagged++;
        try {
          await InventoryTx.create({
            worker:           workerId,
            item:             record.itemId,
            qty:              record.qty,
            notes:            record.notes,
            gps:              record.gps,
            date:             record.date,
            isOfflineSync:    true,
            flaggedForReview: drift.flaggedForReview,
            timeDriftSeconds: drift.timeDriftSeconds,
          });
          results.inventory++;
        } catch (e) {
          console.error('[sync] inventory record error:', e.message, record);
        }
      }
    }

    res.json({
      success: true,
      saved:   results,
      flagged: totalFlagged,
      message: totalFlagged > 0
        ? `${totalFlagged} record(s) flagged for Admin review due to device time drift`
        : 'All records synced cleanly',
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/sync/pull ───────────────────────────────────────────────────────
router.get('/pull', protect(['Worker']), async (req, res, next) => {
  try {
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    const tasks = await Task.find({ worker: req.user._id, date: today }).lean();
    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
