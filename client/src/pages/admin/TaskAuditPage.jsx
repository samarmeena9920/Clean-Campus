import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';

export default function TaskAuditPage() {
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [date, setDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
    const [filter, setFilter] = useState('all');
    const [workerFilter, setWorkerFilter] = useState('all');
    const [areaFilter, setAreaFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch users to populate worker options
        api.get('/api/admin/users')
            .then(res => setUsers(res.data.data || []))
            .catch(err => console.error('[TaskAudit] Error fetching users', err));
    }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                let url = `/api/admin/tasks?date=${date}`;
                if (filter === 'flagged') url += '&flagged=true';
                if (filter === 'ai_flagged') url += '&aiStatus=flagged_identical';
                if (workerFilter !== 'all') url += `&workerId=${workerFilter}`;
                if (areaFilter !== 'all') url += `&area=${encodeURIComponent(areaFilter)}`;

                const { data } = await api.get(url);
                setTasks(data.data || []);
            } catch (err) {
                console.error('[taskAudit]', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [date, filter, workerFilter, areaFilter]);

    // Extract unique workers and areas from fetched users
    const workers = useMemo(() => users.filter(u => u.role === 'Worker'), [users]);
    const areas = useMemo(() => {
        const allAreas = new Set();
        users.forEach(u => {
            if (u.assignedAreas) {
                u.assignedAreas.forEach(a => allAreas.add(a));
            }
        });
        return Array.from(allAreas).sort();
    }, [users]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3 md:gap-4">
                <div className="mb-2 md:mb-0">
                    <h1 className="text-xl md:text-2xl font-bold text-white">Task Audit Gallery</h1>
                    <p className="text-slate-400 text-xs md:text-sm mt-1">Before & After visual verification</p>
                </div>
                <div className="flex items-center flex-wrap gap-2 md:gap-3 w-full md:w-auto">
                    <select
                        value={areaFilter}
                        onChange={(e) => setAreaFilter(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Buildings/Areas</option>
                        {areas.map(area => (
                            <option key={area} value={area}>{area}</option>
                        ))}
                    </select>

                    <select
                        value={workerFilter}
                        onChange={(e) => setWorkerFilter(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[150px] truncate"
                    >
                        <option value="all">All Workers</option>
                        {workers.map(w => (
                            <option key={w._id} value={w._id}>{w.name} ({w.employeeCode})</option>
                        ))}
                    </select>

                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="flagged">⚠ Flagged Only</option>
                        <option value="ai_flagged">🤖 AI Flagged</option>
                    </select>

                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : tasks.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">No tasks match the selected filters</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {tasks.map((task) => (
                        <div key={task._id} className={`bg-slate-900/60 border rounded-2xl overflow-hidden transition-all ${task.flaggedForReview ? 'border-red-500/40' : 'border-slate-800'
                            }`}>
                            {/* Photos */}
                            <div className="grid grid-cols-2 gap-px bg-slate-800">
                                <div className="bg-slate-900 p-2">
                                    <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1 text-center">Before</p>
                                    {task.beforePhotoUrl ? (
                                        <img src={task.beforePhotoUrl} alt="Before" className="w-full h-32 object-cover rounded-lg" />
                                    ) : (
                                        <div className="w-full h-32 bg-slate-800 rounded-lg flex items-center justify-center text-slate-600 text-xs">No photo</div>
                                    )}
                                </div>
                                <div className="bg-slate-900 p-2">
                                    <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1 text-center">After</p>
                                    {task.afterPhotoUrl ? (
                                        <img src={task.afterPhotoUrl} alt="After" className="w-full h-32 object-cover rounded-lg" />
                                    ) : (
                                        <div className="w-full h-32 bg-slate-800 rounded-lg flex items-center justify-center text-slate-600 text-xs">No photo</div>
                                    )}
                                </div>
                            </div>
                            {/* Info */}
                            <div className="p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white font-medium text-sm">{task.area}</p>
                                        <p className="text-slate-500 text-xs">{task.worker?.name} • {task.worker?.employeeCode}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {task.photoAiStatus && task.photoAiStatus !== 'unchecked' && (
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${task.photoAiStatus === 'ok' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                                                }`}>
                                                AI: {task.photoAiStatus}
                                            </span>
                                        )}
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${task.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                                            }`}>
                                            {task.status}
                                        </span>
                                    </div>
                                </div>
                                {task.durationSeconds && (
                                    <p className="text-slate-400 text-xs">⏱ {Math.floor(task.durationSeconds / 60)}m {task.durationSeconds % 60}s</p>
                                )}
                                {task.flaggedForReview && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-red-400 text-xs">
                                        ⚠ Flagged — time drift: {task.timeDriftSeconds}s
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
