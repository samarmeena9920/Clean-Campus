// pages/student/StudentComplaintsPage.jsx
// Task 2: Feedback form hidden until isAdminVerified = true.
//         Shows "Pending Admin Verification" badge on completed complaints.
// Task 3: Upvote button visible for all complaints (not just own),
//         with optimistic UI update.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const STATUS_CONFIG = {
    submitted:   { label: 'Submitted',   className: 'bg-blue-500/20 text-blue-400',      dot: 'bg-blue-400' },
    assigned:    { label: 'Assigned',    className: 'bg-purple-500/20 text-purple-400',   dot: 'bg-purple-400' },
    in_progress: { label: 'In Progress', className: 'bg-amber-500/20 text-amber-400',    dot: 'bg-amber-400 animate-pulse' },
    completed:   { label: 'Completed',   className: 'bg-emerald-500/20 text-emerald-400', dot: 'bg-emerald-400' },
    verified:    { label: 'Verified',    className: 'bg-teal-500/20 text-teal-400',      dot: 'bg-teal-400' },
    reopened:    { label: 'Reopened',    className: 'bg-red-500/20 text-red-400',        dot: 'bg-red-400 animate-pulse' },
};

// Task 5: cleaning-only category display labels
const CATEGORY_LABELS = {
    sweeping:         'Sweeping',
    mopping:          'Mopping',
    washroom:         'Washroom',
    garbage:          'Garbage',
    general_cleaning: 'General Cleaning',
};

export default function StudentComplaintsPage() {
    const navigate = useNavigate();
    const [complaints, setComplaints] = useState([]);
    const [allComplaints, setAllComplaints] = useState([]); // Task 3: all complaints for upvoting
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [feedback, setFeedback] = useState({ text: '', rating: 5 });
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [reopenReason, setReopenReason] = useState('');
    const [reopening, setReopening] = useState(false);
    const [activeTab, setActiveTab] = useState('mine'); // 'mine' | 'all'
    // Task 3: optimistic upvote tracking { [complaintId]: upvoteCount }
    const [upvotedIds, setUpvotedIds] = useState(new Set());
    const [optimisticCounts, setOptimisticCounts] = useState({});

    const loadMine = useCallback(async () => {
        try {
            const { data } = await api.get('/api/complaints/mine');
            setComplaints(data.data || []);
        } catch (err) {
            console.error('[complaints mine]', err);
        }
    }, []);

    // Task 3: load all complaints (public board) for upvoting
    const loadAll = useCallback(async () => {
        try {
            const { data } = await api.get('/api/complaints/board');
            setAllComplaints(data.data || []);
        } catch (err) {
            console.error('[complaints board]', err);
        }
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        await Promise.all([loadMine(), loadAll()]);
        setLoading(false);
    }, [loadMine, loadAll]);

    useEffect(() => { load(); }, [load]);

    const handleFeedback = async (complaintId) => {
        if (!feedback.text.trim()) return;
        setSubmittingFeedback(true);
        try {
            await api.patch(`/api/complaints/${complaintId}/feedback`, {
                feedback: feedback.text,
                rating:   feedback.rating,
            });
            await loadMine();
            setExpanded(null);
        } catch (err) {
            console.error('[feedback]', err);
        } finally {
            setSubmittingFeedback(false);
        }
    };

    const handleReopen = async (complaintId) => {
        if (!reopenReason.trim()) return;
        setReopening(true);
        try {
            await api.patch(`/api/complaints/${complaintId}/reopen`, { reason: reopenReason });
            await loadMine();
            setExpanded(null);
            setReopenReason('');
        } catch (err) {
            console.error('[reopen]', err);
        } finally {
            setReopening(false);
        }
    };

    // Task 3: upvote with optimistic UI update
    const handleUpvote = async (complaintId, currentCount) => {
        // Optimistic update — show immediately before server confirms
        setUpvotedIds((prev) => new Set([...prev, complaintId]));
        setOptimisticCounts((prev) => ({ ...prev, [complaintId]: (currentCount || 0) + 1 }));

        try {
            const { data } = await api.post(`/api/complaints/${complaintId}/upvote`);
            // Sync with server-confirmed count
            setOptimisticCounts((prev) => ({ ...prev, [complaintId]: data.upvoteCount }));
        } catch (err) {
            // Revert optimistic update on error (e.g. already voted, building mismatch)
            setUpvotedIds((prev) => {
                const next = new Set(prev);
                next.delete(complaintId);
                return next;
            });
            setOptimisticCounts((prev) => ({ ...prev, [complaintId]: currentCount }));
            console.error('[upvote]', err.response?.data?.message || err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <svg className="w-8 h-8 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    // ── Reusable complaint card renderer ──────────────────────────────────────
    const renderComplaint = (c, isOwn) => {
        const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.submitted;
        const isExpanded = expanded === c._id;
        const alreadyVoted = upvotedIds.has(c._id);
        const displayCount = optimisticCounts[c._id] ?? c.upvoteCount ?? 0;

        return (
            <div key={c._id} className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                <button
                    className="w-full text-left p-4 flex items-start justify-between gap-3"
                    onClick={() => setExpanded(isExpanded ? null : c._id)}
                >
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${statusCfg.dot}`} />
                            {/* Task 5: use cleaning labels */}
                            <p className="text-white font-medium text-sm">
                                {CATEGORY_LABELS[c.category] || c.category}
                            </p>
                        </div>
                        {c.indoorLocation?.building && (
                            <p className="text-slate-500 text-xs truncate">
                                {c.indoorLocation.building}{c.indoorLocation.area ? ` — ${c.indoorLocation.area}` : ''}
                            </p>
                        )}
                        {c.description && (
                            <p className="text-slate-400 text-xs mt-1 line-clamp-1">{c.description}</p>
                        )}
                        <p className="text-slate-600 text-xs mt-1">
                            {new Date(c.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric',
                            })}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusCfg.className}`}>
                            {statusCfg.label}
                        </span>
                        {/* Task 3: upvote count badge */}
                        {displayCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-md">
                                ▲ {displayCount}
                            </span>
                        )}
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
                            <img src={c.photoUrl} alt="Complaint" className="w-full rounded-xl border border-slate-700" />
                        )}

                        {c.assignedTo && (
                            <div className="bg-slate-800/60 rounded-xl p-3">
                                <p className="text-slate-500 text-xs">Assigned to</p>
                                <p className="text-white text-sm font-medium">{c.assignedTo.name}</p>
                                <p className="text-slate-500 text-xs">{c.assignedTo.employeeCode}</p>
                            </div>
                        )}

                        {/* Task 3: upvote button — visible to ALL students on active complaints */}
                        {['submitted', 'assigned', 'in_progress', 'reopened'].includes(c.status) && (
                            <button
                                onClick={() => handleUpvote(c._id, c.upvoteCount)}
                                disabled={alreadyVoted}
                                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    alreadyVoted
                                        ? 'bg-amber-500/20 text-amber-400 cursor-default'
                                        : 'bg-slate-800 text-slate-300 hover:bg-amber-500/20 hover:text-amber-400 border border-slate-700'
                                }`}
                            >
                                {alreadyVoted ? `▲ ${displayCount} — Upvoted` : `▲ Upvote (${displayCount})`}
                            </button>
                        )}

                        {/* ── Task 2: Feedback gated on isAdminVerified ── */}
                        {isOwn && (c.status === 'completed' || c.status === 'verified') && !c.studentFeedback && (
                            c.isAdminVerified ? (
                                // Admin has verified — show the feedback form
                                <div className="space-y-3">
                                    <p className="text-white text-sm font-medium">Rate the resolution</p>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((r) => (
                                            <button
                                                key={r}
                                                onClick={() => setFeedback((f) => ({ ...f, rating: r }))}
                                                className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                                                    feedback.rating >= r
                                                        ? 'bg-amber-500/30 text-amber-400'
                                                        : 'bg-slate-800 text-slate-500'
                                                }`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        value={feedback.text}
                                        onChange={(e) => setFeedback((f) => ({ ...f, text: e.target.value }))}
                                        placeholder="How was the cleaning? (optional details)"
                                        rows={2}
                                        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                    />
                                    <button
                                        onClick={() => handleFeedback(c._id)}
                                        disabled={submittingFeedback || !feedback.text.trim()}
                                        className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-all hover:scale-[1.02]"
                                    >
                                        {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                                    </button>
                                </div>
                            ) : (
                                // Task 2: Admin hasn't verified yet — show pending badge instead
                                <div className="flex items-center gap-3 bg-slate-800/40 border border-slate-700 rounded-xl p-3">
                                    <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-amber-400 text-xs font-medium">Pending Admin Verification</p>
                                        <p className="text-slate-500 text-xs mt-0.5">
                                            Feedback will be available once an admin verifies the completed work.
                                        </p>
                                    </div>
                                </div>
                            )
                        )}

                        {/* Show existing feedback */}
                        {c.studentFeedback && (
                            <div className="bg-slate-800/40 rounded-xl p-3 space-y-1">
                                <p className="text-slate-500 text-xs">Your feedback</p>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((r) => (
                                        <span key={r} className={`text-sm ${r <= c.studentRating ? 'text-amber-400' : 'text-slate-700'}`}>★</span>
                                    ))}
                                </div>
                                <p className="text-slate-300 text-sm">{c.studentFeedback}</p>
                            </div>
                        )}

                        {/* Reopen — only on verified complaints the student owns */}
                        {isOwn && c.status === 'verified' && (
                            <div className="space-y-2">
                                <textarea
                                    value={reopenReason}
                                    onChange={(e) => setReopenReason(e.target.value)}
                                    placeholder="Not satisfied? Explain why..."
                                    rows={2}
                                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                />
                                <button
                                    onClick={() => handleReopen(c._id)}
                                    disabled={reopening || !reopenReason.trim()}
                                    className="w-full py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium rounded-xl disabled:opacity-40 transition-colors"
                                >
                                    {reopening ? 'Reopening...' : 'Reopen Complaint'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">Complaints</h1>
                    <p className="text-slate-400 text-sm mt-1">{complaints.length} submitted by you</p>
                </div>
                <button
                    onClick={() => navigate('/student/complaints/new')}
                    className="py-2.5 px-4 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02]"
                >
                    + Report
                </button>
            </div>

            {/* Task 3: Tabs — Mine / All Campus */}
            <div className="flex bg-slate-800/60 rounded-xl p-1">
                <button
                    onClick={() => setActiveTab('mine')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        activeTab === 'mine'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    My Complaints
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        activeTab === 'all'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    All Campus
                </button>
            </div>

            {/* My complaints tab */}
            {activeTab === 'mine' && (
                complaints.length === 0 ? (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                        <p className="text-slate-500 text-sm">You haven't reported any issues yet.</p>
                        <button
                            onClick={() => navigate('/student/complaints/new')}
                            className="py-2.5 px-6 bg-purple-600/20 text-purple-400 text-sm font-medium rounded-xl hover:bg-purple-600/30 transition-colors"
                        >
                            Report your first issue
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {complaints.map((c) => renderComplaint(c, true))}
                    </div>
                )
            )}

            {/* All campus tab — Task 3: see + upvote all complaints */}
            {activeTab === 'all' && (
                allComplaints.length === 0 ? (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center">
                        <p className="text-slate-500 text-sm">No complaints have been reported yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {allComplaints.map((c) => renderComplaint(c, false))}
                    </div>
                )
            )}
        </div>
    );
}
