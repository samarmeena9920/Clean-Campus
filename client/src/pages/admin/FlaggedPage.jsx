import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function FlaggedPage() {
    const [data, setData] = useState({ attendance: [], tasks: [], inventory: [] });
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get('/api/admin/flagged');
            setData(res.data || { attendance: [], tasks: [], inventory: [] });
        } catch (err) {
            console.error('[flagged]', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const reviewTask = async (taskId, note) => {
        try {
            await api.patch(`/api/admin/tasks/${taskId}/review`, { note: note || 'Reviewed by admin' });
            load();
        } catch (err) {
            console.error('[review]', err);
        }
    };

    const total = data.attendance.length + data.tasks.length + data.inventory.length;

    if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Flagged Records</h1>
                <p className="text-slate-400 text-sm mt-1">{total} record(s) flagged for review — possible clock manipulation</p>
            </div>

            {total === 0 ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-12 text-center">
                    <div className="text-4xl mb-3">✅</div>
                    <p className="text-emerald-400 font-medium">No flagged records</p>
                    <p className="text-slate-500 text-sm mt-1">All sync operations within acceptable time drift</p>
                </div>
            ) : (
                <>
                    {/* Flagged Attendance */}
                    {data.attendance.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-white font-medium flex items-center gap-2">
                                <span className="text-amber-400">⚠</span> Attendance ({data.attendance.length})
                            </h3>
                            {data.attendance.map((r) => (
                                <div key={r._id} className="bg-slate-900/60 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-white text-sm font-medium">{r.worker?.name} <span className="text-slate-500">({r.worker?.employeeCode})</span></p>
                                        <p className="text-slate-500 text-xs">Date: {r.date} • Drift: {r.timeDriftSeconds}s</p>
                                    </div>
                                    <span className="px-2.5 py-1 bg-red-500/15 text-red-400 text-xs font-medium rounded-lg">⚠ {Math.floor(r.timeDriftSeconds / 60)}m drift</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Flagged Tasks */}
                    {data.tasks.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-white font-medium flex items-center gap-2">
                                <span className="text-amber-400">⚠</span> Tasks ({data.tasks.length})
                            </h3>
                            {data.tasks.map((t) => (
                                <div key={t._id} className="bg-slate-900/60 border border-red-500/20 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <p className="text-white text-sm font-medium">{t.worker?.name} — {t.area}</p>
                                            <p className="text-slate-500 text-xs">Date: {t.date} • Drift: {t.timeDriftSeconds}s • AI: {t.photoAiStatus}</p>
                                        </div>
                                        <button
                                            onClick={() => reviewTask(t._id)}
                                            className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-500/20 transition-colors"
                                        >
                                            ✓ Mark Reviewed
                                        </button>
                                    </div>
                                    {(t.beforePhotoUrl || t.afterPhotoUrl) && (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            {t.beforePhotoUrl && <img src={t.beforePhotoUrl} alt="Before" className="rounded-lg h-24 w-full object-cover" />}
                                            {t.afterPhotoUrl && <img src={t.afterPhotoUrl} alt="After" className="rounded-lg h-24 w-full object-cover" />}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Flagged Inventory */}
                    {data.inventory.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-white font-medium flex items-center gap-2">
                                <span className="text-amber-400">⚠</span> Inventory ({data.inventory.length})
                            </h3>
                            {data.inventory.map((inv) => (
                                <div key={inv._id} className="bg-slate-900/60 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-white text-sm font-medium">{inv.worker?.name} — {inv.item?.name}</p>
                                        <p className="text-slate-500 text-xs">Qty: {inv.qty} • Drift: {inv.timeDriftSeconds}s</p>
                                    </div>
                                    <span className="px-2.5 py-1 bg-red-500/15 text-red-400 text-xs font-medium rounded-lg">⚠ Flagged</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
