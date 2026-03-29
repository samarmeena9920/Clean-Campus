import { useState, useEffect, useCallback } from 'react';
import useGPS from '../../hooks/useGPS';
import { addRecord, getAllRecords, STORES } from '../../utils/db';
import api from '../../utils/api';

function todayStr() {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function InventoryPage() {
    const { latitude, longitude } = useGPS();
    const [items, setItems] = useState([]);
    const [quantities, setQuantities] = useState({});
    const [todayLogs, setTodayLogs] = useState([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Try to fetch items from server; fallback to hardcoded
    const loadItems = useCallback(async () => {
        try {
            const { data } = await api.get('/api/admin/items');
            if (data.success && data.data.length) {
                setItems(data.data);
                return;
            }
        } catch {
            // offline — use defaults
        }
        setItems([
            { _id: 'default-1', name: 'Floor Cleaner', unit: 'litres' },
            { _id: 'default-2', name: 'Glass Cleaner', unit: 'litres' },
            { _id: 'default-3', name: 'Hand Soap', unit: 'litres' },
            { _id: 'default-4', name: 'Toilet Rolls', unit: 'rolls' },
            { _id: 'default-5', name: 'Trash Bags', unit: 'bags' },
            { _id: 'default-6', name: 'Gloves', unit: 'pairs' },
        ]);
    }, []);

    const loadTodayLogs = useCallback(async () => {
        const all = await getAllRecords(STORES.INVENTORY);
        setTodayLogs(all.filter((r) => r.date === todayStr()));
    }, []);

    useEffect(() => { loadItems(); loadTodayLogs(); }, [loadItems, loadTodayLogs]);

    const changeQty = (itemId, delta) => {
        setQuantities((prev) => {
            const current = prev[itemId] || 0;
            const next = Math.max(0, current + delta);
            return { ...prev, [itemId]: next };
        });
        setSaved(false);
    };

    const handleSubmit = async () => {
        const entries = Object.entries(quantities).filter(([, qty]) => qty > 0);
        if (!entries.length) return;

        setSaving(true);
        try {
            for (const [itemId, qty] of entries) {
                await addRecord(STORES.INVENTORY, {
                    itemId,
                    qty,
                    date: todayStr(),
                    gps: { latitude, longitude },
                    deviceTimestamp: new Date().toISOString(),
                });
            }
            setQuantities({});
            setSaved(true);
            await loadTodayLogs();
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('[inventory]', err);
        } finally {
            setSaving(false);
        }
    };

    const hasEntries = Object.values(quantities).some((q) => q > 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-white">Inventory</h1>
                <p className="text-slate-400 text-sm mt-1">Log materials received today</p>
            </div>

            {/* Item Grid */}
            <div className="space-y-2">
                {items.map((item) => {
                    const qty = quantities[item._id] || 0;
                    return (
                        <div
                            key={item._id}
                            className={`bg-slate-900/60 border rounded-xl p-4 flex items-center justify-between transition-all ${qty > 0 ? 'border-blue-500/40' : 'border-slate-800'
                                }`}
                        >
                            <div>
                                <p className="text-white text-sm font-medium">{item.name}</p>
                                <p className="text-slate-500 text-xs">{item.unit}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => changeQty(item._id, -1)}
                                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-lg font-bold flex items-center justify-center transition-colors active:scale-90"
                                >
                                    −
                                </button>
                                <span className={`w-10 text-center text-lg font-bold tabular-nums ${qty > 0 ? 'text-blue-400' : 'text-slate-600'}`}>
                                    {qty}
                                </span>
                                <button
                                    onClick={() => changeQty(item._id, 1)}
                                    className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold flex items-center justify-center transition-colors active:scale-90 shadow-lg shadow-blue-600/25"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Submit */}
            {hasEntries && (
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Submit Inventory'}
                </button>
            )}

            {saved && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center text-emerald-400 text-sm font-medium animate-slide-down">
                    ✓ Inventory saved successfully
                </div>
            )}

            {/* Today's Logs */}
            {todayLogs.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-white font-medium text-sm">Today's Logs</h3>
                    {todayLogs.map((log) => {
                        const item = items.find((i) => i._id === log.itemId);
                        return (
                            <div key={log.id} className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3 flex items-center justify-between">
                                <span className="text-slate-300 text-sm">{item?.name || log.itemId}</span>
                                <span className="text-blue-400 font-bold text-sm">+{log.qty}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
