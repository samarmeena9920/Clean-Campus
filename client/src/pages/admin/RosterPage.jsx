import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function RosterPage() {
    const [roster, setRoster] = useState([]);
    const [date, setDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/api/admin/roster?date=${date}`);
                setRoster(data.data || []);
            } catch (err) {
                console.error('[roster]', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [date]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Live Roster</h1>
                    <p className="text-slate-400 text-sm mt-1">Worker check-in locations</p>
                </div>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : roster.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
                    <p className="text-slate-500">No attendance records for this date</p>
                </div>
            ) : (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                                    <th className="px-5 py-3 min-w-[150px]">Employee</th>
                                    <th className="px-5 py-3 min-w-[150px]">Areas</th>
                                    <th className="px-5 py-3 min-w-[120px]">Check In</th>
                                    <th className="px-5 py-3 min-w-[120px]">Break Start</th>
                                    <th className="px-5 py-3 min-w-[120px]">Break End</th>
                                    <th className="px-5 py-3 min-w-[120px]">Check Out</th>
                                    <th className="px-5 py-3 min-w-[100px]">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roster.map((r, i) => (
                                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div>
                                                <p className="text-white text-sm font-medium">{r.name}</p>
                                                <p className="text-slate-500 text-xs">{r.employeeCode}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex flex-wrap gap-1">
                                                {r.assignedAreas?.map((a) => (
                                                    <span key={a} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded-md">{a}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                {r.checkIn?.imageUrl && (
                                                    <a
                                                        href={r.checkIn.imageUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block w-6 h-6 rounded-md overflow-hidden bg-slate-800 border border-slate-700 shrink-0 group relative"
                                                    >
                                                        <img src={r.checkIn.imageUrl} alt="Check In" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                    </a>
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="text-slate-300 text-sm whitespace-nowrap">
                                                        {r.checkIn?.timestamp ? new Date(r.checkIn.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </span>
                                                    {r.checkIn?.gps?.latitude != null && (
                                                        <span className="text-slate-500 text-[10px] font-mono mt-0.5 whitespace-nowrap">
                                                            {r.checkIn.gps.latitude.toFixed(4)}, {r.checkIn.gps.longitude.toFixed(4)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                {r.breakStart?.imageUrl && (
                                                    <a
                                                        href={r.breakStart.imageUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block w-6 h-6 rounded-md overflow-hidden bg-slate-800 border border-slate-700 shrink-0 group relative"
                                                    >
                                                        <img src={r.breakStart.imageUrl} alt="Break Start" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                    </a>
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="text-slate-400 text-sm whitespace-nowrap">
                                                        {r.breakStart?.timestamp ? new Date(r.breakStart.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </span>
                                                    {r.breakStart?.gps?.latitude != null && (
                                                        <span className="text-slate-500 text-[10px] font-mono mt-0.5 whitespace-nowrap">
                                                            {r.breakStart.gps.latitude.toFixed(4)}, {r.breakStart.gps.longitude.toFixed(4)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                {r.breakEnd?.imageUrl && (
                                                    <a
                                                        href={r.breakEnd.imageUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block w-6 h-6 rounded-md overflow-hidden bg-slate-800 border border-slate-700 shrink-0 group relative"
                                                    >
                                                        <img src={r.breakEnd.imageUrl} alt="Break End" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                    </a>
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="text-slate-400 text-sm whitespace-nowrap">
                                                        {r.breakEnd?.timestamp ? new Date(r.breakEnd.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </span>
                                                    {r.breakEnd?.gps?.latitude != null && (
                                                        <span className="text-slate-500 text-[10px] font-mono mt-0.5 whitespace-nowrap">
                                                            {r.breakEnd.gps.latitude.toFixed(4)}, {r.breakEnd.gps.longitude.toFixed(4)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                {r.checkOut?.imageUrl && (
                                                    <a
                                                        href={r.checkOut.imageUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block w-6 h-6 rounded-md overflow-hidden bg-slate-800 border border-slate-700 shrink-0 group relative"
                                                    >
                                                        <img src={r.checkOut.imageUrl} alt="Check Out" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                    </a>
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="text-slate-300 text-sm whitespace-nowrap">
                                                        {r.checkOut?.timestamp ? new Date(r.checkOut.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </span>
                                                    {r.checkOut?.gps?.latitude != null && (
                                                        <span className="text-slate-500 text-[10px] font-mono mt-0.5 whitespace-nowrap">
                                                            {r.checkOut.gps.latitude.toFixed(4)}, {r.checkOut.gps.longitude.toFixed(4)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {r.flagged ? (
                                                <span className="px-2.5 py-1 bg-red-500/15 text-red-400 text-xs font-medium rounded-lg">⚠ Flagged</span>
                                            ) : r.checkOut ? (
                                                <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 text-xs font-medium rounded-lg">Complete</span>
                                            ) : r.checkIn ? (
                                                <span className="px-2.5 py-1 bg-blue-500/15 text-blue-400 text-xs font-medium rounded-lg">Active</span>
                                            ) : (
                                                <span className="px-2.5 py-1 bg-slate-800 text-slate-500 text-xs font-medium rounded-lg">Absent</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
