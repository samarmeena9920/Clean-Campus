import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import CameraCapture from '../../components/CameraCapture';
import useGPS from '../../hooks/useGPS';
import useSync from '../../hooks/useSync';
import { addRecord, getAllRecords, updateRecord, saveImageBlob, STORES } from '../../utils/db';
import api from '../../utils/api';

const STEPS = ['checkIn', 'breakStart', 'breakEnd', 'checkOut'];
const LABELS = { checkIn: 'Check In', breakStart: 'Start Break', breakEnd: 'End Break', checkOut: 'Check Out' };
const ICONS = {
    checkIn: '🟢', breakStart: '☕', breakEnd: '🔄', checkOut: '🔴',
};

function todayStr() {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function AttendancePage() {
    const { user } = useAuth();
    const { latitude, longitude, refresh: refreshGPS } = useGPS();
    const { syncNow } = useSync();
    const [todayRecord, setTodayRecord] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [capturing, setCapturing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Load today's attendance from IDB
    const loadToday = useCallback(async () => {
        if (!user) return;
        const all = await getAllRecords(STORES.ATTENDANCE);
        let today = all.find((r) => r.date === todayStr() && r.workerId === user._id);

        // If local data was wiped (e.g. log in on new device or after manual clearing), fetch from server
        if (!today && navigator.onLine) {
            try {
                const { data } = await api.get('/api/auth/attendance/today');
                if (data.success && data.data) {
                    const record = data.data;
                    const idbRecord = {
                        workerId: user._id,
                        date: todayStr(),
                        checkIn: record.checkIn,
                        breakStart: record.breakStart,
                        breakEnd: record.breakEnd,
                        checkOut: record.checkOut,
                        deviceTimestamp: new Date().toISOString(),
                        synced: true
                    };
                    idbRecord.id = await addRecord(STORES.ATTENDANCE, idbRecord);
                    today = idbRecord;
                }
            } catch (err) {
                console.error('[attendance load]', err);
            }
        }

        if (today) {
            setTodayRecord(today);
            // Figure out which step we're on
            const idx = STEPS.findIndex((s) => !today[s]);
            setCurrentStep(idx === -1 ? STEPS.length : idx);
        } else {
            setTodayRecord(null);
            setCurrentStep(0);
        }
    }, [user]);

    useEffect(() => { loadToday(); }, [loadToday]);

    const handleCapture = async (blob) => {
        setSaving(true);
        refreshGPS();

        const stamp = {
            timestamp: new Date().toISOString(),
            gps: { latitude, longitude },
        };

        const stepKey = STEPS[currentStep];

        try {
            if (todayRecord) {
                const updated = {
                    ...todayRecord,
                    [stepKey]: stamp,
                    deviceTimestamp: new Date().toISOString(),
                    synced: false // FORCE sync engine to pick up this new stamp
                };
                await updateRecord(STORES.ATTENDANCE, updated);
                await saveImageBlob(blob, STORES.ATTENDANCE, todayRecord.id, stepKey);
            } else {
                const id = await addRecord(STORES.ATTENDANCE, {
                    workerId: user._id,
                    date: todayStr(),
                    [stepKey]: stamp,
                    deviceTimestamp: new Date().toISOString(),
                });
                await saveImageBlob(blob, STORES.ATTENDANCE, id, stepKey);
            }

            setCapturing(false);
            await loadToday();

            // Trigger sync to push data to server immediately
            syncNow();
        } catch (err) {
            console.error('[attendance]', err);
        } finally {
            setSaving(false);
        }
    };

    const allDone = currentStep >= STEPS.length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-white">Daily Attendance</h1>
                <p className="text-slate-400 text-sm mt-1">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            {/* Progress */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <div className="flex justify-between mb-3">
                    {STEPS.map((step, i) => {
                        const done = todayRecord?.[step];
                        const isCurrent = i === currentStep;
                        return (
                            <div key={step} className="flex flex-col items-center gap-1.5 flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${done ? 'bg-emerald-500/20 ring-2 ring-emerald-500' : isCurrent ? 'bg-blue-500/20 ring-2 ring-blue-500 animate-pulse' : 'bg-slate-800'
                                    }`}>
                                    {done ? '✓' : ICONS[step]}
                                </div>
                                <span className={`text-[10px] font-medium ${done ? 'text-emerald-400' : isCurrent ? 'text-blue-400' : 'text-slate-600'}`}>
                                    {LABELS[step]}
                                </span>
                                {done && (
                                    <span className="text-[9px] text-slate-500">
                                        {new Date(done.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Action Area */}
            {allDone ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
                    <div className="text-4xl mb-3">🎉</div>
                    <h2 className="text-lg font-semibold text-emerald-400">Shift Complete!</h2>
                    <p className="text-slate-400 text-sm mt-1">All attendance stamps recorded for today.</p>
                </div>
            ) : capturing ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                    <h3 className="text-white font-medium mb-3">{LABELS[STEPS[currentStep]]} — Take a selfie</h3>
                    <CameraCapture onCapture={handleCapture} label="Capture Selfie" facingMode="user" />
                    {saving && <p className="text-blue-400 text-sm mt-2 text-center animate-pulse">Saving...</p>}
                </div>
            ) : (
                <button
                    onClick={() => { refreshGPS(); setCapturing(true); }}
                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-lg rounded-2xl shadow-xl shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                >
                    <span className="text-2xl">{ICONS[STEPS[currentStep]]}</span>
                    {LABELS[STEPS[currentStep]]}
                </button>
            )}

            {/* GPS Status */}
            <div className="flex items-center gap-2 text-slate-600 text-xs justify-center">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {latitude ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : 'Acquiring GPS...'}
            </div>
        </div>
    );
}
