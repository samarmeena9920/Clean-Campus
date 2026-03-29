// pages/PublicDashboard.jsx
// Task 4: Public "All Complaints" board.
// No authentication required — accessible by anyone at /board.
// Fetches from GET /api/complaints/board which strips sensitive worker fields.
// Matches existing dark slate design system.

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const STATUS_CONFIG = {
    submitted:   { label: 'Open',        className: 'bg-blue-500/20 text-blue-400',      dot: 'bg-blue-400' },
    assigned:    { label: 'Assigned',    className: 'bg-purple-500/20 text-purple-400',   dot: 'bg-purple-400' },
    in_progress: { label: 'In Progress', className: 'bg-amber-500/20 text-amber-400',    dot: 'bg-amber-400 animate-pulse' },
    completed:   { label: 'Completed',   className: 'bg-emerald-500/20 text-emerald-400', dot: 'bg-emerald-400' },
    verified:    { label: 'Resolved',    className: 'bg-teal-500/20 text-teal-400',      dot: 'bg-teal-400' },
    reopened:    { label: 'Reopened',    className: 'bg-red-500/20 text-red-400',        dot: 'bg-red-400 animate-pulse' },
};

const CATEGORY_LABELS = {
    sweeping:         'Sweeping',
    mopping:          'Mopping',
    washroom:         'Washroom',
    garbage:          'Garbage',
    general_cleaning: 'General Cleaning',
};

const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'submitted', label: 'Open' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'verified', label: 'Resolved' },
];

export default function PublicDashboard() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            const { data } = await api.get(`/api/complaints/board?${params}`);
            setComplaints(data.data || []);
        } catch (err) {
            console.error('[board]', err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

    // Client-side text search across location + description
    const filtered = search.trim()
        ? complaints.filter((c) => {
            const q = search.toLowerCase();
            return (
                c.indoorLocation?.building?.toLowerCase().includes(q) ||
                c.indoorLocation?.area?.toLowerCase().includes(q) ||
                c.description?.toLowerCase().includes(q) ||
                CATEGORY_LABELS[c.category]?.toLowerCase().includes(q)
            );
        })
        : complaints;

    // Summary counts
    const total = complaints.length;
    const open = complaints.filter(c => ['submitted', 'assigned', 'in_progress', 'reopened'].includes(c.status)).length;
    const resolved = complaints.filter(c => c.status === 'verified').length;

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-white text-xs font-bold">
                            CC
                        </div>
                        <div>
                            <p className="text-white text-sm font-semibold">Campus Complaints Board</p>
                            <p className="text-slate-500 text-xs">Live status of all reported issues</p>
                        </div>
                    </div>
                    <Link
                        to="/login"
                        className="py-2 px-4 bg-slate-800 text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-700 transition-colors"
                    >
                        Sign In
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Total Reports', value: total, color: 'text-white' },
                        { label: 'Open Issues',   value: open,  color: 'text-amber-400' },
                        { label: 'Resolved',      value: resolved, color: 'text-emerald-400' },
                    ].map((s) => (
                        <div key={s.label} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-slate-500 text-xs mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Search + filter */}
                <div className="flex gap-3 flex-wrap">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by location or description..."
                        className="flex-1 min-w-0 px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {STATUS_FILTER_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {/* Complaint count */}
                <p className="text-slate-500 text-xs">
                    Showing {filtered.length} of {total} complaints
                    {search && ` matching "${search}"`}
                </p>

                {/* Cards */}
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
                        <p className="text-slate-500 text-sm">No complaints found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filtered.map((c) => {
                            const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.submitted;
                            return (
                                <div
                                    key={c._id}
                                    className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all"
                                >
                                    {/* Photo if available */}
                                    {c.photoUrl && (
                                        <img
                                            src={c.photoUrl}
                                            alt="Complaint"
                                            className="w-full h-36 object-cover"
                                        />
                                    )}

                                    <div className="p-4 space-y-3">
                                        {/* Title row */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-white font-medium text-sm">
                                                    {CATEGORY_LABELS[c.category] || c.category}
                                                </p>
                                                {c.indoorLocation?.building && (
                                                    <p className="text-slate-500 text-xs mt-0.5">
                                                        {c.indoorLocation.building}
                                                        {c.indoorLocation.area ? ` — ${c.indoorLocation.area}` : ''}
                                                    </p>
                                                )}
                                            </div>
                                            <span className={`shrink-0 px-2 py-1 rounded-lg text-xs font-medium ${statusCfg.className}`}>
                                                {statusCfg.label}
                                            </span>
                                        </div>

                                        {/* Description */}
                                        {c.description && (
                                            <p className="text-slate-400 text-xs line-clamp-2">{c.description}</p>
                                        )}

                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                                            <p className="text-slate-600 text-xs">
                                                {new Date(c.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                })}
                                            </p>
                                            {c.upvoteCount > 0 && (
                                                <span className="flex items-center gap-1 text-amber-400 text-xs font-medium">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M10 3l2.39 4.84 5.35.78-3.87 3.77.91 5.32L10 15.08l-4.78 2.63.91-5.32L2.26 8.62l5.35-.78z" />
                                                    </svg>
                                                    {c.upvoteCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <p className="text-center text-slate-700 text-xs pb-4">
                    ManitCleanCampus · Public Complaints Board
                </p>
            </main>
        </div>
    );
}
