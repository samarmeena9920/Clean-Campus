// pages/admin/ComplaintsAdminPage.jsx
// Task 5: Updated CATEGORY_LABELS to cleaning-only types.
// Task 2: Shows isAdminVerified status — verify button now sets isAdminVerified=true server-side.

import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

const STATUS_CONFIG = {
    submitted:   { label: 'Submitted',   className: 'bg-blue-500/20 text-blue-400',     dot: 'bg-blue-400' },
    assigned:    { label: 'Assigned',    className: 'bg-purple-500/20 text-purple-400',  dot: 'bg-purple-400' },
    in_progress: { label: 'In Progress', className: 'bg-amber-500/20 text-amber-400',   dot: 'bg-amber-400 animate-pulse' },
    completed:   { label: 'Completed',   className: 'bg-emerald-500/20 text-emerald-400', dot: 'bg-emerald-400' },
    verified:    { label: 'Verified',    className: 'bg-teal-500/20 text-teal-400',     dot: 'bg-teal-400' },
    reopened:    { label: 'Reopened',    className: 'bg-red-500/20 text-red-400',       dot: 'bg-red-400 animate-pulse' },
};

// Task 5: cleaning-only category labels
const CATEGORY_LABELS = {
    sweeping:         'Sweeping',
    mopping:          'Mopping',
    washroom:         'Washroom',
    garbage:          'Garbage',
    general_cleaning: 'General Cleaning',
};

export default function ComplaintsAdminPage() {
    const [complaints, setComplaints] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', category: '' });
    const [expanded, setExpanded] = useState(null);
    const [assigningTo, setAssigningTo] = useState({});
    const [actionLoading, setActionLoading] = useState(null);
    const [verifyNote, setVerifyNote] = useState('');

    const load = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filters.status)   params.set('status', filters.status);
            if (filters.category) params.set('category', filters.category);
            const [complaintsRes, workersRes] = await Promise.all([
                api.get(`/api/complaints?${params}`),
                api.get('/api/admin/users'),
            ]);
            setComplaints(complaintsRes.data.data || []);
            setWorkers((workersRes.data.data || []).filter((u) => u.role === 'Worker' && u.isActive));
        } catch (err) {
            console.error('[complaints admin]', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { load(); }, [load]);

    const setFilter = (key) => (e) => {
        setFilters((f) => ({ ...f, [key]: e.target.value }));
        setLoading(true);
    };

    const handleAssign = async (complaintId) => {
        const workerId = assigningTo[complaintId];
        if (!workerId) return;
        setActionLoading(complaintId + '-assign');
        try {
            await api.patch(`/api/complaints/${complaintId}/assign`, { workerId });
            await load();
            setExpanded(null);
        } catch (err) {
            console.error('[assign]', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleVerify = async (complaintId) => {
        setActionLoading(complaintId + '-verify');
        try {
            // Task 2: /verify now also sets isAdminVerified=true server-side (no change needed here)
            await api.patch(`/api/complaints/${complaintId}/verify`, { note: verifyNote });
            await load();
            setExpanded(null);
            setVerifyNote('');
        } catch (err) {
            console.error('[verify]', err);
        } finally {
            setActionLoading(null);
        }
    };

    const counts = complaints.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Complaints</h1>
                <p className="text-slate-400 text-sm mt-1">Assign, track, and verify cleaning issue reports</p>
            </div>

            {/* Status summary bar */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button
                        key={key}
                        onClick={() => setFilters((f) => ({ ...f, status: f.status === key ? '' : key }))}
                        className={`rounded-xl p-3 text-center transition-all border ${
                            filters.status === key
                                ? 'border-slate-600 bg-slate-800'
                                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                        }`}
                    >
                        <p className="text-lg font-bold text-white">{counts[key] || 0}</p>
                        <p className={`text-xs font-medium mt-0.5 ${cfg.className.split(' ')[1]}`}>{cfg.label}</p>
                    </button>
                ))}
            </div>

            {/* Filters — Task 5: category dropdown now shows cleaning types only */}
            <div className="flex gap-3 flex-wrap">
                <select
                    value={filters.status}
                    onChange={setFilter('status')}
                    className="px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All statuses</option>
                    {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
                        <option key={v} value={v}>{label}</option>
                    ))}
                </select>
                <select
                    value={filters.category}
                    onChange={setFilter('category')}
                    className="px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All types</option>
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                    ))}
                </select>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            ) : complaints.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center">
                    <p className="text-slate-500 text-sm">No complaints match the current filters.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {complaints.map((c) => {
                        const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.submitted;
                        const isExpanded = expanded === c._id;
                        const isAssigning = actionLoading === c._id + '-assign';
                        const isVerifying = actionLoading === c._id + '-verify';

                        return (
                            <div key={c._id} className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all">
                                <button
                                    className="w-full text-left p-4 flex items-start justify-between gap-3"
                                    onClick={() => setExpanded(isExpanded ? null : c._id)}
                                >
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                                            <p className="text-white font-medium text-sm capitalize">
                                                {CATEGORY_LABELS[c.category] || c.category}
                                            </p>
                                            {c.upvoteCount > 0 && (
                                                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-md">
                                                    ▲ {c.upvoteCount}
                                                </span>
                                            )}
                                            {/* Task 2: show verification badge */}
                                            {c.isAdminVerified && (
                                                <span className="px-1.5 py-0.5 bg-teal-500/20 text-teal-400 text-xs rounded-md">
                                                    ✓ Verified
                                                </span>
                                            )}
                                        </div>
                                        {c.indoorLocation?.building ? (
                                            <p className="text-slate-500 text-xs">
                                                {c.indoorLocation.building}
                                                {c.indoorLocation.area ? ` — ${c.indoorLocation.area}` : ''}
                                            </p>
                                        ) : c.gps?.latitude ? (
                                            <p className="text-slate-500 text-xs">
                                                GPS: {c.gps.latitude.toFixed(4)}, {c.gps.longitude.toFixed(4)}
                                            </p>
                                        ) : null}
                                        <p className="text-slate-600 text-xs">
                                            {c.student?.name || 'Unknown student'} ·{' '}
                                            {new Date(c.createdAt).toLocaleDateString('en-IN', {
                                                day: 'numeric', month: 'short',
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.className}`}>
                                            {cfg.label}
                                        </span>
                                        <svg
                                            className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-slate-800 p-4 space-y-4">
                                        {c.photoUrl && (
                                            <img src={c.photoUrl} alt="Complaint" className="w-full rounded-xl border border-slate-700 max-h-60 object-cover" />
                                        )}
                                        {c.description && (
                                            <p className="text-slate-300 text-sm bg-slate-800/40 rounded-xl p-3">{c.description}</p>
                                        )}
                                        {c.studentFeedback && (
                                            <div className="bg-slate-800/40 rounded-xl p-3 space-y-1">
                                                <p className="text-slate-500 text-xs">Student feedback</p>
                                                <div className="flex gap-0.5">
                                                    {[1,2,3,4,5].map((r) => (
                                                        <span key={r} className={`text-sm ${r <= c.studentRating ? 'text-amber-400' : 'text-slate-700'}`}>★</span>
                                                    ))}
                                                </div>
                                                <p className="text-slate-300 text-sm">{c.studentFeedback}</p>
                                            </div>
                                        )}
                                        {c.reopenReason && (
                                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                                <p className="text-red-400 text-xs font-medium mb-1">Reopened by student</p>
                                                <p className="text-slate-300 text-sm">{c.reopenReason}</p>
                                            </div>
                                        )}
                                        {c.assignedTo && (
                                            <div className="flex items-center gap-3 bg-slate-800/40 rounded-xl p-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold shrink-0">
                                                    {c.assignedTo.name?.[0] || 'W'}
                                                </div>
                                                <div>
                                                    <p className="text-slate-400 text-xs">Assigned to</p>
                                                    <p className="text-white text-sm font-medium">{c.assignedTo.name}</p>
                                                    <p className="text-slate-500 text-xs">{c.assignedTo.employeeCode}</p>
                                                </div>
                                            </div>
                                        )}
                                        {['submitted', 'reopened', 'assigned', 'in_progress'].includes(c.status) && (
                                            <div className="space-y-2">
                                                <p className="text-slate-400 text-xs font-medium">
                                                    {c.assignedTo ? 'Reassign to another worker' : 'Assign to worker'}
                                                </p>
                                                <select
                                                    value={assigningTo[c._id] || ''}
                                                    onChange={(e) => setAssigningTo((prev) => ({ ...prev, [c._id]: e.target.value }))}
                                                    className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Select a worker</option>
                                                    {workers.map((w) => (
                                                        <option key={w._id} value={w._id}>
                                                            {w.name} ({w.employeeCode})
                                                            {w.assignedAreas?.length ? ` — ${w.assignedAreas.slice(0, 2).join(', ')}` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => handleAssign(c._id)}
                                                    disabled={!assigningTo[c._id] || isAssigning}
                                                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-all hover:scale-[1.02]"
                                                >
                                                    {isAssigning ? 'Saving...' : (c.assignedTo ? 'Reassign Task' : 'Assign Task')}
                                                </button>
                                            </div>
                                        )}
                                        {/* Task 2: verify button — sets isAdminVerified=true and unlocks student feedback */}
                                        {c.status === 'completed' && (
                                            <div className="space-y-2">
                                                <p className="text-slate-400 text-xs font-medium">
                                                    Verify completion
                                                    {!c.isAdminVerified && (
                                                        <span className="ml-2 text-amber-400 text-xs">
                                                            — student feedback unlocks after this
                                                        </span>
                                                    )}
                                                </p>
                                                <input
                                                    type="text"
                                                    value={verifyNote}
                                                    onChange={(e) => setVerifyNote(e.target.value)}
                                                    placeholder="Optional note for student..."
                                                    className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                />
                                                <button
                                                    onClick={() => handleVerify(c._id)}
                                                    disabled={isVerifying}
                                                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-all hover:scale-[1.02]"
                                                >
                                                    {isVerifying ? 'Verifying...' : '✓ Mark as Verified'}
                                                </button>
                                            </div>
                                        )}
                                        {c.linkedTaskId && (
                                            <p className="text-slate-600 text-xs">
                                                Linked task: {typeof c.linkedTaskId === 'object' ? c.linkedTaskId._id : c.linkedTaskId}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
