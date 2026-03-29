// pages/student/ProfilePage.jsx
// Lets the student pick their building — stored in assignedAreas[0].
// This is the field the upvote endpoint checks for building-scoped validation.
// Also shows name and email. Matches existing dark slate design exactly.
// Buildings are fetched from the admin-managed building module.

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function ProfilePage() {
    const { user, login } = useAuth();

    // Pre-populate from current user data
    const [name, setName] = useState(user?.name || '');
    const [building, setBuilding] = useState(user?.assignedAreas?.[0] || '');
    const [buildings, setBuildings] = useState([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [loadingBuildings, setLoadingBuildings] = useState(true);

    // Fetch buildings from the building management API
    useEffect(() => {
        const fetchBuildings = async () => {
            try {
                setLoadingBuildings(true);
                const { data } = await api.get('/api/buildings');
                if (data.success && data.data) {
                    setBuildings(data.data.map(b => b.name));
                }
            } catch (err) {
                console.error('Failed to fetch buildings:', err);
            } finally {
                setLoadingBuildings(false);
            }
        };

        fetchBuildings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        setError('');
        try {
            const { data } = await api.patch('/api/auth/profile', {
                name:          name.trim() || undefined,
                assignedAreas: building ? [building] : [],
            });

            if (data.success) {
                // Sync updated user into localStorage so AuthContext stays fresh
                localStorage.setItem('user', JSON.stringify(data.user));
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-white">My Profile</h1>
                <p className="text-slate-400 text-sm mt-1">
                    Set your building so you can upvote complaints in your area
                </p>
            </div>

            {/* Account info (read-only) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-white font-medium text-sm">Account</h3>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {(user?.name?.[0] || 'S').toUpperCase()}
                    </div>
                    <div>
                        <p className="text-white text-sm font-medium">{user?.name}</p>
                        <p className="text-slate-500 text-xs">{user?.email}</p>
                        <p className="text-slate-600 text-xs">{user?.employeeCode}</p>
                    </div>
                </div>
            </div>

            {/* Editable fields */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                <h3 className="text-white font-medium text-sm">Edit Details</h3>

                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-300">Display Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-300">
                        Your Building
                        <span className="ml-2 text-slate-500 text-xs font-normal">— used to upvote complaints in your area</span>
                    </label>
                    <select
                        value={building}
                        onChange={(e) => setBuilding(e.target.value)}
                        disabled={loadingBuildings}
                        className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm disabled:opacity-50"
                    >
                        <option value="">
                            {loadingBuildings ? 'Loading buildings...' : 'Not set — can upvote any complaint'}
                        </option>
                        {buildings.map((b) => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                    {building && (
                        <p className="text-slate-500 text-xs">
                            You can upvote complaints in <span className="text-purple-400">{building}</span>
                        </p>
                    )}
                    {!building && (
                        <p className="text-slate-600 text-xs">
                            Without a building set, you can upvote complaints from any location.
                        </p>
                    )}
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {saved && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Profile saved successfully
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold rounded-xl shadow-lg shadow-purple-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                >
                    {saving ? (
                        <span className="inline-flex items-center gap-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Saving...
                        </span>
                    ) : 'Save Profile'}
                </button>
            </div>

            {/* Info about building match */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-2">
                <p className="text-slate-400 text-xs font-medium">How building-scoped upvoting works</p>
                <p className="text-slate-500 text-xs leading-relaxed">
                    When you set your building here, you can upvote cleaning complaints from that building.
                    This helps prioritise issues in your area. If you live in multiple buildings or move,
                    you can update this any time.
                </p>
            </div>
        </div>
    );
}
