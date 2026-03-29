// layouts/WorkerLayout.jsx — UPDATED
// Changes from original:
//   1. Reads `error` from useSync and shows a dismissible banner
//   2. Special handling for CHECKIN_REQUIRED error code — shows clear message
//      with a link to the Attendance tab rather than a generic "sync failed"
//   3. All other logic (auto-sync, online indicator, nav) unchanged

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useSync from '../hooks/useSync';
import { useEffect, useState } from 'react';

const navItems = [
    {
        to: '/worker/attendance',
        label: 'Attendance',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        to: '/worker/tasks',
        label: 'Tasks',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
        ),
    },
    {
        to: '/worker/inventory',
        label: 'Inventory',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        ),
    },
];

export default function WorkerLayout() {
    const { user, logout } = useAuth();
    const { syncing, syncNow, isOnline, error } = useSync();
    const navigate = useNavigate();
    const [dismissed, setDismissed] = useState(false);

    // Reset dismissed state when a new error arrives
    useEffect(() => {
        if (error) setDismissed(false);
    }, [error]);

    // Auto-sync when coming online, on mount, and every 30 seconds
    useEffect(() => {
        if (isOnline) {
            syncNow();
            const interval = setInterval(syncNow, 30000);
            return () => clearInterval(interval);
        }
    }, [isOnline, syncNow]);

    // Detect CHECKIN_REQUIRED from the error message returned by sync.js
    const isCheckinError = error?.includes('check in') || error?.includes('CHECKIN');
    const isShiftEndedError = error?.includes('shift has ended') || error?.includes('SHIFT_ENDED');

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {/* Top Bar */}
            <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-white text-xs font-bold">
                        FM
                    </div>
                    <div>
                        <p className="text-white text-sm font-semibold leading-tight">{user?.name}</p>
                        <p className="text-slate-500 text-xs">{user?.employeeCode}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {syncing && (
                        <span className="text-xs text-blue-400 flex items-center gap-1">
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Syncing
                        </span>
                    )}
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                    <button
                        onClick={logout}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1.5"
                        title="Logout"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* Sync error banner — shown when sync fails */}
            {error && !dismissed && (
                <div className={`px-4 py-3 flex items-start gap-3 border-b ${
                    isCheckinError || isShiftEndedError
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                }`}>
                    <svg className={`w-4 h-4 shrink-0 mt-0.5 ${isCheckinError || isShiftEndedError ? 'text-amber-400' : 'text-red-400'}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                        {isCheckinError ? (
                            <>
                                <p className="text-amber-400 text-xs font-medium">Tasks not synced — check-in required</p>
                                <p className="text-amber-400/70 text-xs mt-0.5">
                                    You must check in before task records can be saved.{' '}
                                    <button
                                        onClick={() => { setDismissed(true); navigate('/worker/attendance'); }}
                                        className="underline hover:text-amber-300 transition-colors"
                                    >
                                        Go to Attendance →
                                    </button>
                                </p>
                            </>
                        ) : isShiftEndedError ? (
                            <>
                                <p className="text-amber-400 text-xs font-medium">Shift ended — tasks not synced</p>
                                <p className="text-amber-400/70 text-xs mt-0.5">
                                    Your check-out was recorded. New tasks cannot be submitted for today.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-red-400 text-xs font-medium">Sync failed</p>
                                <p className="text-red-400/70 text-xs mt-0.5 truncate">{error}</p>
                            </>
                        )}
                    </div>
                    <button
                        onClick={() => setDismissed(true)}
                        className={`text-xs shrink-0 ${isCheckinError || isShiftEndedError ? 'text-amber-400/60 hover:text-amber-400' : 'text-red-400/60 hover:text-red-400'} transition-colors`}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Page Content */}
            <main className="flex-1 p-4 pb-24 overflow-y-auto">
                <Outlet />
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-50">
                <div className="flex justify-around py-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${isActive
                                    ? 'text-blue-400'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`
                            }
                        >
                            {item.icon}
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
}
