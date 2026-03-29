// pages/worker/TasksPage.jsx
// Task 1: Added check-in guard.
//   - On mount, reads today's attendance record from IndexedDB
//   - If no checkIn stamp found, all task-start interactions are disabled
//   - Displays a banner explaining why tasks are locked
//   - Offline-first logic (IDB) is completely unchanged

import { useState, useEffect, useRef, useCallback } from 'react';
import CameraCapture from '../../components/CameraCapture';
import useGPS from '../../hooks/useGPS';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { addRecord, updateRecord, getAllRecords, saveImageBlob, STORES } from '../../utils/db';

function todayStr() {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function fmtDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export default function TasksPage() {
    const { user } = useAuth();
    const { latitude, longitude, refresh: refreshGPS } = useGPS();
    const [tasks, setTasks] = useState([]);
    const [activeTask, setActiveTask] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const [phase, setPhase] = useState('idle');
    const [selectedArea, setSelectedArea] = useState('');
    const timerRef = useRef(null);

    // ── Task 1: check-in state ────────────────────────────────────────────────
    // null = still loading, false = not checked in, true = checked in
    const [isCheckedIn, setIsCheckedIn] = useState(null);
    const [isCheckedOut, setIsCheckedOut] = useState(false);

    const areas = user?.assignedAreas?.length
        ? user.assignedAreas
        : ['Lobby', 'Restroom A', 'Restroom B', 'Corridor', 'Cafeteria'];

    // ── Task 1: load today's attendance to determine check-in status ──────────
    const checkAttendanceStatus = useCallback(async () => {
        if (!user) return;

        // First check IndexedDB (works offline)
        const all = await getAllRecords(STORES.ATTENDANCE);
        const todayRecord = all.find(
            (r) => r.date === todayStr() && r.workerId === user._id
        );

        if (todayRecord) {
            setIsCheckedIn(!!todayRecord.checkIn);
            setIsCheckedOut(!!todayRecord.checkOut);
            return;
        }

        // IDB empty — try server if online (e.g. fresh device or after clearing IDB)
        if (navigator.onLine) {
            try {
                const { data } = await api.get('/api/auth/attendance/today');
                if (data.success && data.data) {
                    setIsCheckedIn(!!data.data.checkIn);
                    setIsCheckedOut(!!data.data.checkOut);
                    return;
                }
            } catch (err) {
                console.warn('[TasksPage] Could not fetch attendance from server:', err);
            }
        }

        // No record found anywhere — not checked in
        setIsCheckedIn(false);
        setIsCheckedOut(false);
    }, [user]);

    const loadTasks = useCallback(async () => {
        if (navigator.onLine) {
            try {
                const { data } = await api.get('/api/sync/pull');
                if (data?.success && data.tasks) {
                    const localAll = await getAllRecords(STORES.TASKS);
                    for (const serverTask of data.tasks) {
                        const existsLocal = localAll.find(t => t.serverId === serverTask._id);
                        if (!existsLocal) {
                            await addRecord(STORES.TASKS, {
                                ...serverTask,
                                serverId: serverTask._id,
                                synced: true,
                            });
                        }
                    }
                }
            } catch (err) {
                console.warn('[TasksPage] Failed to pull assigned tasks:', err);
            }
        }

        const all = await getAllRecords(STORES.TASKS);
        setTasks(all.filter((t) => t.date === todayStr()));
    }, []);

    useEffect(() => {
        checkAttendanceStatus();
        loadTasks();
    }, [checkAttendanceStatus, loadTasks]);

    useEffect(() => {
        if (phase === 'running' && activeTask) {
            timerRef.current = setInterval(() => {
                setElapsed(Math.floor((Date.now() - new Date(activeTask.startedAt).getTime()) / 1000));
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [phase, activeTask]);

    const handleBeforePhoto = async (blob) => {
        refreshGPS();
        const startedAt = new Date().toISOString();
        let currentTask;

        if (activeTask && activeTask.id) {
            currentTask = {
                ...activeTask,
                startedAt,
                status: 'in_progress',
                beforeGps: { latitude, longitude },
                deviceTimestamp: startedAt,
                synced: false,
            };
            await updateRecord(STORES.TASKS, currentTask);
        } else {
            const id = await addRecord(STORES.TASKS, {
                area: selectedArea,
                startedAt,
                status: 'in_progress',
                date: todayStr(),
                beforeGps: { latitude, longitude },
                deviceTimestamp: startedAt,
            });
            currentTask = { id, area: selectedArea, startedAt, status: 'in_progress', date: todayStr() };
        }

        await saveImageBlob(blob, STORES.TASKS, currentTask.id, 'beforePhoto');
        setActiveTask(currentTask);
        setPhase('running');
        setElapsed(0);
    };

    const handleAfterPhoto = async (blob) => {
        refreshGPS();
        const completedAt = new Date().toISOString();
        const durationSeconds = Math.floor((new Date(completedAt) - new Date(activeTask.startedAt)) / 1000);

        const all = await getAllRecords(STORES.TASKS);
        const existing = all.find((t) => t.id === activeTask.id);
        if (existing) {
            await updateRecord(STORES.TASKS, {
                ...existing,
                completedAt,
                durationSeconds,
                status: 'completed',
                afterGps: { latitude, longitude },
                deviceTimestamp: completedAt,
                synced: false,
            });
            await saveImageBlob(blob, STORES.TASKS, activeTask.id, 'afterPhoto');
        }

        clearInterval(timerRef.current);
        setPhase('done');
        await loadTasks();
    };

    const resetTask = () => {
        setActiveTask(null);
        setPhase('idle');
        setSelectedArea('');
        setElapsed(0);
    };

    // ── Task 1: compute whether tasks can be started ───────────────────────────
    // tasksLocked = true means show the disabled state + reason banner
    const tasksLocked = isCheckedIn === false || isCheckedOut === true;
    const lockReason = isCheckedOut
        ? 'Your shift has ended. Check out was recorded — tasks are no longer available for today.'
        : 'Please check in on the Attendance tab before starting any tasks.';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-white">Cleaning Tasks</h1>
                <p className="text-slate-400 text-sm mt-1">Record Before & After with timer proof</p>
            </div>

            {/* ── Task 1: Check-in gate banner ── */}
            {isCheckedIn !== null && tasksLocked && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <div>
                        <p className="text-amber-400 font-medium text-sm">Tasks locked</p>
                        <p className="text-amber-400/70 text-xs mt-0.5">{lockReason}</p>
                    </div>
                </div>
            )}

            {/* Loading attendance state */}
            {isCheckedIn === null && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                    <svg className="w-4 h-4 animate-spin text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-slate-400 text-sm">Checking attendance status...</p>
                </div>
            )}

            {phase === 'idle' && (
                <>
                    {/* Area Selection */}
                    <div className={`bg-slate-900/60 border rounded-2xl p-4 space-y-3 transition-opacity ${tasksLocked ? 'border-slate-800 opacity-50 pointer-events-none select-none' : 'border-slate-800'}`}>
                        <h3 className="text-white font-medium text-sm">Select Area (New Task)</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {areas.map((area) => (
                                <button
                                    key={area}
                                    onClick={() => { setSelectedArea(area); setActiveTask(null); }}
                                    disabled={tasksLocked}
                                    className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${selectedArea === area && !activeTask
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-[1.02]'
                                        : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-700'
                                        }`}
                                >
                                    {area}
                                </button>
                            ))}
                        </div>
                        {selectedArea && !activeTask && (
                            <button
                                onClick={() => setPhase('before')}
                                disabled={tasksLocked}
                                className="w-full py-3.5 mt-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                Start Task — {selectedArea}
                            </button>
                        )}
                    </div>

                    {/* Today's Tasks */}
                    {tasks.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-white font-medium text-sm">Today's Assigned & Active Tasks</h3>
                            {tasks.map((t) => (
                                <div key={t.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-white text-sm font-medium">{t.area}</p>
                                        <p className="text-slate-500 text-xs">
                                            {t.durationSeconds
                                                ? fmtDuration(t.durationSeconds)
                                                : t.status === 'pending'
                                                ? 'Not started (Assigned)'
                                                : 'In progress...'}
                                        </p>
                                    </div>
                                    {t.status === 'pending' ? (
                                        // ── Task 1: Start button disabled when not checked in ──
                                        <div className="relative group">
                                            <button
                                                onClick={() => { setSelectedArea(t.area); setActiveTask(t); setPhase('before'); }}
                                                disabled={tasksLocked}
                                                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                Start
                                            </button>
                                            {tasksLocked && (
                                                <div className="absolute bottom-full right-0 mb-2 w-44 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-amber-300 hidden group-hover:block z-10 pointer-events-none">
                                                    Check in first to start tasks
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                            t.status === 'completed'
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-amber-500/20 text-amber-400'
                                        }`}>
                                            {t.status === 'completed' ? '✓ Done' : '⏱ Active'}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {phase === 'before' && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                    <h3 className="text-white font-medium mb-1">Before Photo — {selectedArea}</h3>
                    <p className="text-slate-400 text-xs mb-3">Take a photo of the area before cleaning</p>
                    <CameraCapture onCapture={handleBeforePhoto} label="Take Before Photo" facingMode="environment" />
                </div>
            )}

            {phase === 'running' && (
                <div className="bg-slate-900/60 border border-blue-500/30 rounded-2xl p-6 text-center space-y-4">
                    <p className="text-slate-400 text-sm">Cleaning in progress</p>
                    <h2 className="text-white font-bold text-lg">{activeTask?.area}</h2>
                    <div className="text-5xl font-mono font-bold text-blue-400 tabular-nums">
                        {fmtDuration(elapsed)}
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '100%' }} />
                    </div>
                    <button
                        onClick={() => { refreshGPS(); setPhase('after'); }}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        ✓ Complete Task
                    </button>
                </div>
            )}

            {phase === 'after' && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                    <h3 className="text-white font-medium mb-1">After Photo — {activeTask?.area}</h3>
                    <p className="text-slate-400 text-xs mb-3">Take a photo of the cleaned area</p>
                    <CameraCapture onCapture={handleAfterPhoto} label="Take After Photo" facingMode="environment" />
                </div>
            )}

            {phase === 'done' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3">
                    <div className="text-4xl">🎉</div>
                    <h2 className="text-lg font-semibold text-emerald-400">Task Completed!</h2>
                    <p className="text-slate-400 text-sm">{activeTask?.area} — {fmtDuration(elapsed)}</p>
                    <button
                        onClick={resetTask}
                        className="py-2.5 px-6 bg-slate-800 text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors"
                    >
                        Start Another Task
                    </button>
                </div>
            )}
        </div>
    );
}
