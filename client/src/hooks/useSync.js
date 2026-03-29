// hooks/useSync.js — UPDATED
// Changes from original:
//   Task 1: When /api/sync returns 400 with CHECKIN_REQUIRED or SHIFT_ENDED,
//   the error message now includes the server's human-readable message
//   so WorkerLayout can display the right banner.
//   The records are NOT marked as synced — they stay queued in IDB
//   and will retry automatically when the worker checks in and sync runs again.
//
//   All other logic unchanged.

import { useCallback, useRef, useState } from 'react';
import useOnlineStatus from './useOnlineStatus';
import api from '../utils/api';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import {
  getUnsyncedRecords,
  getLinkedImages,
  markSynced,
  garbageCollect,
  STORES,
} from '../utils/db';

export default function useSync() {
  const isOnline = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);
  const lockRef = useRef(false);

  const syncNow = useCallback(async () => {
    if (!isOnline || lockRef.current) return;
    lockRef.current = true;
    setSyncing(true);
    setError(null);

    try {
      const [attendance, tasks, inventory] = await Promise.all([
        getUnsyncedRecords(STORES.ATTENDANCE),
        getUnsyncedRecords(STORES.TASKS),
        getUnsyncedRecords(STORES.INVENTORY),
      ]);

      if (!attendance.length && !tasks.length && !inventory.length) {
        setLastSync(new Date());
        return;
      }

      // Upload attendance selfies
      for (const record of attendance) {
        try {
          const images = await getLinkedImages(STORES.ATTENDANCE, record.id);
          for (const img of images) {
            try {
              const url = await uploadToCloudinary(img.blob, { folder: 'facility/attendance' });
              const stamp = record[img.field];
              if (stamp) stamp.imageUrl = url;
            } catch (e) {
              console.warn(`[sync] Image upload skipped for attendance ${record.id}:`, e.message);
            }
          }
        } catch (e) {
          console.warn('[sync] Could not load linked images:', e.message);
        }
      }

      // Upload task photos
      for (const record of tasks) {
        try {
          const images = await getLinkedImages(STORES.TASKS, record.id);
          for (const img of images) {
            try {
              const url = await uploadToCloudinary(img.blob, { folder: 'facility/tasks' });
              if (img.field === 'beforePhoto') record.beforePhotoUrl = url;
              if (img.field === 'afterPhoto')  record.afterPhotoUrl  = url;
            } catch (e) {
              console.warn(`[sync] Image upload skipped for task ${record.id}:`, e.message);
            }
          }
        } catch (e) {
          console.warn('[sync] Could not load linked images:', e.message);
        }
      }

      const payload = {};
      if (attendance.length) payload.attendance = attendance;
      if (tasks.length)      payload.tasks      = tasks;
      if (inventory.length)  payload.inventory  = inventory;

      let responseData;
      try {
        const { data } = await api.post('/api/sync', payload);
        responseData = data;
      } catch (httpErr) {
        // Task 1: /api/sync returns 400 when check-in is missing.
        // Extract server message and surface it without marking records synced.
        // They stay in IDB and will retry on next syncNow() call.
        const serverMsg = httpErr.response?.data?.message || httpErr.message || 'Sync failed';
        const code      = httpErr.response?.data?.code    || '';
        setError(code ? `${code}: ${serverMsg}` : serverMsg);
        console.error('[sync] Server rejected batch:', serverMsg);
        return;
      }

      // Only mark synced if server accepted
      for (const r of attendance) await markSynced(STORES.ATTENDANCE, r.id);
      for (const r of tasks)      await markSynced(STORES.TASKS,      r.id);
      for (const r of inventory)  await markSynced(STORES.INVENTORY,  r.id);

      await Promise.all([
        garbageCollect(STORES.ATTENDANCE),
        garbageCollect(STORES.TASKS),
        garbageCollect(STORES.INVENTORY),
      ]);

      setLastSync(new Date());
      console.log('[sync] Complete:', responseData);
    } catch (err) {
      console.error('[sync] Failed:', err);
      setError(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
      lockRef.current = false;
    }
  }, [isOnline]);

  return { syncing, lastSync, error, syncNow, isOnline };
}
