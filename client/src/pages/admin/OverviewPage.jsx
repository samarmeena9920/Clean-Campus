// pages/admin/OverviewPage.jsx — UPDATED
// Changes from uploaded repo version:
//   1. Complaint stat cards are now clickable links to /admin/complaints?status=X
//      so admin can jump directly to filtered complaint lists from the dashboard
//   2. Main stat cards also link to their respective pages (attendance, tasks, flagged)
// Everything else unchanged.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

function todayStr() {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
}

export default function OverviewPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                // Try new /overview endpoint; fall back to 4 legacy calls
                try {
                    const res = await api.get('/api/admin/overview');
                    if (res.data.success) { setData(res.data.data); return; }
                } catch { /* endpoint not yet deployed */ }

                const [usersRes, attendanceRes, tasksRes, flaggedRes] = await Promise.all([
                    api.get('/api/admin/users'),
                    api.get(`/api/admin/attendance?date=${todayStr()}`),
                    api.get(`/api/admin/tasks?date=${todayStr()}`),
                    api.get('/api/admin/flagged'),
                ]);
                setData({
                    users:           usersRes.data.data?.length  || 0,
                    todayAttendance: attendanceRes.data.data?.length || 0,
                    todayTasks:      tasksRes.data.data?.length  || 0,
                    flagged:
                        (flaggedRes.data.data?.attendance?.length || 0) +
                        (flaggedRes.data.data?.tasks?.length       || 0) +
                        (flaggedRes.data.data?.inventory?.length   || 0),
                    complaints: null,
                });
            } catch (err) {
                console.error('[overview]', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Main stat cards — each links to the relevant admin page
    const mainCards = [
        {
            label: 'Total Users',
            value: data?.users            ?? 0,
            icon:  '👥',
            color: 'from-blue-500 to-blue-600',
            onClick: () => navigate('/admin/users'),
        },
        {
            label: 'Today Check-ins',
            value: data?.todayAttendance  ?? 0,
            icon:  '📍',
            color: 'from-emerald-500 to-emerald-600',
            onClick: () => navigate('/admin/attendance'),
        },
        {
            label: 'Today Tasks',
            value: data?.todayTasks       ?? 0,
            icon:  '📋',
            color: 'from-purple-500 to-purple-600',
            onClick: () => navigate('/admin/tasks'),
        },
        {
            label: 'Flagged Records',
            value: data?.flagged          ?? 0,
            icon:  '⚠️',
            color: 'from-amber-500 to-amber-600',
            onClick: () => navigate('/admin/flagged'),
        },
    ];

    // Complaint breakdown cards — each links to /admin/complaints filtered by status
    const complaintCards = data?.complaints ? [
        {
            label:   'Open',
            value:   (data.complaints.submitted || 0) + (data.complaints.reopened || 0),
            color:   'from-blue-500 to-blue-600',
            status:  'submitted',
        },
        {
            label:   'Assigned',
            value:   data.complaints.assigned    || 0,
            color:   'from-purple-500 to-purple-600',
            status:  'assigned',
        },
        {
            label:   'In Progress',
            value:   data.complaints.in_progress || 0,
            color:   'from-amber-500 to-amber-600',
            status:  'in_progress',
        },
        {
            label:   'Completed',
            value:   data.complaints.completed   || 0,
            color:   'from-emerald-500 to-emerald-600',
            status:  'completed',
        },
        {
            label:   'Verified',
            value:   data.complaints.verified    || 0,
            color:   'from-teal-500 to-teal-600',
            status:  'verified',
        },
        {
            label:   'Total',
            value:   data.complaints.total       || 0,
            color:   'from-slate-500 to-slate-600',
            status:  '',
        },
    ] : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-slate-400 text-sm mt-1">
                    Overview for{' '}
                    {new Date().toLocaleDateString('en-IN', {
                        weekday: 'long', day: 'numeric', month: 'long',
                    })}
                </p>
            </div>

            {/* Main stat cards — clickable */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {mainCards.map((card) => (
                    <button
                        key={card.label}
                        onClick={card.onClick}
                        className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group text-left w-full"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl">{card.icon}</span>
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} opacity-20 group-hover:opacity-40 transition-opacity`} />
                        </div>
                        <p className="text-3xl font-bold text-white">{card.value}</p>
                        <p className="text-slate-500 text-sm mt-1 flex items-center gap-1">
                            {card.label}
                            <svg className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </p>
                    </button>
                ))}
            </div>

            {/* Complaint breakdown — clickable, links to filtered complaint list */}
            {complaintCards.length > 0 && (
                <>
                    <div className="flex items-center gap-3">
                        <h2 className="text-white font-semibold">Complaints</h2>
                        <div className="flex-1 h-px bg-slate-800" />
                        <button
                            onClick={() => navigate('/admin/complaints')}
                            className="text-blue-400 text-xs hover:text-blue-300 transition-colors flex items-center gap-1"
                        >
                            View all
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {complaintCards.map((card) => (
                            <button
                                key={card.label}
                                onClick={() => navigate(
                                    card.status
                                        ? `/admin/complaints?status=${card.status}`
                                        : '/admin/complaints'
                                )}
                                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center hover:border-slate-700 transition-all group w-full"
                            >
                                <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${card.color} opacity-30 group-hover:opacity-60 transition-opacity mx-auto mb-2`} />
                                <p className="text-2xl font-bold text-white">{card.value}</p>
                                <p className="text-slate-500 text-xs mt-1">{card.label}</p>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
