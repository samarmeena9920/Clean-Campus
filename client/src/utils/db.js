// client/src/utils/db.js — UPDATED
// Task 4: Added 'buildings' store to IndexedDB for offline-first dropdown cache.
//
// KEY CHANGE: DB_VERSION bumped from 1 → 2.
// The `upgrade` function is additive — existing stores (attendance, tasks,
// inventory, images) are untouched. The new `buildings` store is added only
// if it doesn't already exist, so the upgrade is safe for existing devices.
//
// Buildings are stored as a single key-value record (key: 'cache') containing
// the full buildings array. This avoids the need for complex cursor queries —
// one get() gives you all buildings for the cascading dropdowns.

import { openDB } from 'idb';

const DB_NAME    = 'facility-mgmt';
const DB_VERSION = 2; // bumped from 1 to add buildings store

export const STORES = {
  ATTENDANCE: 'attendance',
  TASKS:      'tasks',
  INVENTORY:  'inventory',
  IMAGES:     'images',
  BUILDINGS:  'buildings', // Task 4: NEW
};

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // ── Version 1 stores (unchanged) ──────────────────────────────────────
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORES.ATTENDANCE)) {
          const store = db.createObjectStore(STORES.ATTENDANCE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-date',   'date');
          store.createIndex('by-synced', 'synced');
        }
        if (!db.objectStoreNames.contains(STORES.TASKS)) {
          const store = db.createObjectStore(STORES.TASKS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-date',   'date');
          store.createIndex('by-synced', 'synced');
          store.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains(STORES.INVENTORY)) {
          const store = db.createObjectStore(STORES.INVENTORY, { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-date',   'date');
          store.createIndex('by-synced', 'synced');
        }
        if (!db.objectStoreNames.contains(STORES.IMAGES)) {
          const store = db.createObjectStore(STORES.IMAGES, { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-linked', ['linkedStore', 'linkedId']);
        }
      }

      // ── Version 2: buildings cache store ──────────────────────────────────
      // Existing devices upgrading from v1 will only run this block.
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORES.BUILDINGS)) {
          // Key-value store: key is a string ('cache'), value is the buildings array.
          // Using keyPath: 'key' so we can do db.put(store, { key: 'cache', data: [...] })
          db.createObjectStore(STORES.BUILDINGS, { keyPath: 'key' });
        }
      }
    },
  });
}

// ─── Generic CRUD helpers (unchanged) ────────────────────────────────────────

export async function addRecord(storeName, data) {
  const db = await getDB();
  return db.add(storeName, { ...data, synced: false, createdAt: new Date().toISOString() });
}

export async function getRecord(storeName, key) {
  const db = await getDB();
  return db.get(storeName, key);
}

export async function updateRecord(storeName, data) {
  const db = await getDB();
  return db.put(storeName, data);
}

export async function deleteRecord(storeName, key) {
  const db = await getDB();
  return db.delete(storeName, key);
}

export async function getAllRecords(storeName) {
  const db = await getDB();
  return db.getAll(storeName);
}

export async function getUnsyncedRecords(storeName) {
  const db = await getDB();
  const all = await db.getAll(storeName);
  return all.filter((r) => r.synced === false);
}

export async function markSynced(storeName, key) {
  const db = await getDB();
  const record = await db.get(storeName, key);
  if (record) {
    record.synced    = true;
    record.syncedAt  = new Date().toISOString();
    await db.put(storeName, record);
  }
}

// ─── Task 4: Building cache helpers ──────────────────────────────────────────

/**
 * Save the buildings array to IDB for offline use.
 * Called after a successful GET /api/buildings.
 * @param {Array} buildings - The array from the server response
 */
export async function cacheBuildingsLocally(buildings) {
  const db = await getDB();
  await db.put(STORES.BUILDINGS, {
    key:       'cache',
    data:      buildings,
    cachedAt:  new Date().toISOString(),
  });
}

/**
 * Read the cached buildings array from IDB.
 * Returns the array (possibly empty) — never throws.
 * @returns {Promise<Array>}
 */
export async function getCachedBuildings() {
  try {
    const db = await getDB();
    const record = await db.get(STORES.BUILDINGS, 'cache');
    return record?.data || [];
  } catch {
    return [];
  }
}

// ─── Image Blob helpers (unchanged) ──────────────────────────────────────────

export async function saveImageBlob(blob, linkedStore, linkedId, field) {
  const db = await getDB();
  return db.add(STORES.IMAGES, { blob, linkedStore, linkedId, field, createdAt: new Date().toISOString() });
}

export async function getLinkedImages(linkedStore, linkedId) {
  const db = await getDB();
  const tx = db.transaction(STORES.IMAGES, 'readonly');
  const index = tx.store.index('by-linked');
  return index.getAll([linkedStore, linkedId]);
}

// ─── Garbage Collection (unchanged) ──────────────────────────────────────────

export async function garbageCollect(storeName) {
  const db = await getDB();
  const tx = db.transaction([storeName, STORES.IMAGES], 'readwrite');
  const store = tx.objectStore(storeName);
  const imageStore = tx.objectStore(STORES.IMAGES);

  let cursor = await store.index('by-synced').openCursor(true);
  while (cursor) {
    if (storeName === STORES.ATTENDANCE) {
      const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      if (cursor.value.date === today) { cursor = await cursor.continue(); continue; }
    }
    const imgIndex = imageStore.index('by-linked');
    let imgCursor = await imgIndex.openCursor([storeName, cursor.value.id]);
    while (imgCursor) { await imgCursor.delete(); imgCursor = await imgCursor.continue(); }
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function clearAllStores() {
  const db = await getDB();
  const storeNames = Object.values(STORES);
  const tx = db.transaction(storeNames, 'readwrite');
  await Promise.all(storeNames.map((name) => tx.objectStore(name).clear()));
  await tx.done;
}

export default {
  addRecord, getRecord, updateRecord, deleteRecord,
  getAllRecords, getUnsyncedRecords, markSynced,
  saveImageBlob, getLinkedImages,
  garbageCollect, clearAllStores,
  cacheBuildingsLocally, getCachedBuildings, // Task 4
  STORES,
};
