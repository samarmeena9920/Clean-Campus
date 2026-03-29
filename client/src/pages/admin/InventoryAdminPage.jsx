import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function InventoryAdminPage() {
    const [summary, setSummary] = useState([]);
    const [items, setItems] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', unit: 'units', category: '' });
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const [invRes, itemsRes] = await Promise.all([
                api.get('/api/admin/inventory'),
                api.get('/api/admin/items'),
            ]);
            setSummary(invRes.data.data || []);
            setItems(itemsRes.data.data || []);
        } catch (err) {
            console.error('[inventory-admin]', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const addItem = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/admin/items', newItem);
            setNewItem({ name: '', unit: 'units', category: '' });
            setShowAdd(false);
            load();
        } catch (err) {
            console.error('[add-item]', err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Inventory</h1>
                    <p className="text-slate-400 text-sm mt-1">Stock levels and catalogue management</p>
                </div>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
                >
                    + Add Item
                </button>
            </div>

            {showAdd && (
                <form onSubmit={addItem} className="bg-slate-900/60 border border-blue-500/30 rounded-2xl p-4 flex flex-wrap gap-3">
                    <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Item name" required className="flex-1 min-w-[150px] px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} placeholder="Unit" className="w-28 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} placeholder="Category" className="w-32 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors">Save</button>
                </form>
            )}

            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : (
                <>
                    {/* Stock Summary */}
                    {summary.length > 0 && (
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                                            <th className="px-5 py-3">Item</th>
                                            <th className="px-5 py-3">Category</th>
                                            <th className="px-5 py-3">Total Qty</th>
                                            <th className="px-5 py-3">Transactions</th>
                                            <th className="px-5 py-3">Last Update</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summary.map((row, i) => (
                                            <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                                <td className="px-5 py-3.5 text-white text-sm font-medium">{row.item}</td>
                                                <td className="px-5 py-3.5 text-slate-400 text-sm">{row.category || '—'}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`font-bold text-sm ${row.totalQty > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {row.totalQty} {row.unit}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-400 text-sm">{row.txCount}</td>
                                                <td className="px-5 py-3.5 text-slate-500 text-xs">
                                                    {row.lastUpdate ? new Date(row.lastUpdate).toLocaleDateString() : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Catalogue */}
                    <div>
                        <h3 className="text-white font-medium text-sm mb-3">Item Catalogue ({items.length})</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            {items.map((item) => (
                                <div key={item._id} className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3">
                                    <p className="text-white text-sm font-medium">{item.name}</p>
                                    <p className="text-slate-500 text-xs">{item.unit} • {item.category || 'General'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
