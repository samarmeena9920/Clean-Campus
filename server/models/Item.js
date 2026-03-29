const mongoose = require('mongoose');

// ─── Master Item Catalogue (Admin-managed) ────────────────────────────────────
const itemCatalogueSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true, unique: true },
    unit:     { type: String, trim: true, default: 'units' }, // e.g. litres, kg, rolls
    category: { type: String, trim: true },                   // e.g. Cleaning, PPE
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── Inventory Transaction Log (Worker-submitted) ─────────────────────────────
/**
 * Each time a worker receives or uses supplies they submit a transaction.
 * qty > 0  → received / restocked
 * qty < 0  → used / consumed  (workers use the +/- UI)
 */
const inventoryTxSchema = new mongoose.Schema(
  {
    worker: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    item: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'ItemCatalogue',
      required: true,
    },

    qty:   { type: Number, required: true },   // signed integer
    notes: { type: String, trim: true },

    gps: {
      latitude:  { type: Number },
      longitude: { type: Number },
    },

    date: { type: String, index: true }, // YYYY-MM-DD

    // ── Offline Sync Integrity ──────────────────────────────────────
    isOfflineSync:    { type: Boolean, default: false },
    flaggedForReview: { type: Boolean, default: false },
    timeDriftSeconds: { type: Number },
  },
  { timestamps: true }
);

const ItemCatalogue  = mongoose.model('ItemCatalogue',  itemCatalogueSchema);
const InventoryTx    = mongoose.model('InventoryTx',    inventoryTxSchema);

module.exports = { ItemCatalogue, InventoryTx };
