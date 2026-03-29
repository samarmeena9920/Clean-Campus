// pages/student/SubmitComplaintPage.jsx — UPDATED
// Task 4: Cascading dropdowns (Building → Block → Floor → Area Type → Room No.)
//         driven by the dynamic Building data from the server.
//
// Offline-first strategy:
//   1. On mount: load cached buildings from IDB immediately (zero latency)
//   2. If online: fetch fresh list from /api/buildings, update IDB cache
//   3. If offline: IDB cache is used silently — user never sees a spinner
//
// Task 5: Payload now sends the structured `location` object instead of
//         the old flat `indoorLocation` object.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CameraCapture from '../../components/CameraCapture';
import useGPS from '../../hooks/useGPS';
import api from '../../utils/api';
import { uploadToCloudinary } from '../../utils/cloudinaryUpload';
import { cacheBuildingsLocally, getCachedBuildings } from '../../utils/db';

// Task 5: cleaning-only categories (matches schema enum)
const CATEGORIES = [
    { value: 'sweeping',         label: 'Sweeping',         color: 'from-blue-600 to-blue-500' },
    { value: 'mopping',          label: 'Mopping',          color: 'from-cyan-600 to-cyan-500' },
    { value: 'washroom',         label: 'Washroom',         color: 'from-teal-600 to-teal-500' },
    { value: 'garbage',          label: 'Garbage',          color: 'from-amber-600 to-amber-500' },
    { value: 'general_cleaning', label: 'General Cleaning', color: 'from-purple-600 to-purple-500' },
];

export default function SubmitComplaintPage() {
    const navigate = useNavigate();
    const { latitude, longitude, refresh: refreshGPS } = useGPS();

    const [step, setStep]             = useState('form');
    const [category, setCategory]     = useState('');
    const [description, setDescription] = useState('');
    const [photoBlob, setPhotoBlob]   = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [error, setError]           = useState('');
    const [duplicateData, setDuplicateData] = useState(null);
    const [upvoted, setUpvoted]       = useState(false);
    const [upvoteError, setUpvoteError] = useState('');

    // ── Task 4: Building state ────────────────────────────────────────────────
    const [buildings, setBuildings]       = useState([]);    // full array from server/IDB
    const [buildingsLoading, setBuildingsLoading] = useState(true);

    // Cascading selection state
    const [selBuilding, setSelBuilding]   = useState('');    // selected Building.name
    const [selBlock, setSelBlock]         = useState('');    // selected block string
    const [selFloor, setSelFloor]         = useState('');    // selected floor string
    const [selAreaType, setSelAreaType]   = useState('');    // selected areaType string
    const [roomNumber, setRoomNumber]     = useState('');    // optional free text

    // Derived: the Building object matching the current selection
    const selectedBuilding = buildings.find((b) => b.name === selBuilding) || null;

    // When building changes, reset downstream selections
    const handleBuildingChange = (name) => {
        setSelBuilding(name);
        setSelBlock('');
        setSelFloor('');
        setSelAreaType('');
        setRoomNumber('');
        // Auto-select block if only "None" option
        const bld = buildings.find((b) => b.name === name);
        if (bld && bld.blocks.length === 1 && bld.blocks[0] === 'None') {
            setSelBlock('None');
        }
    };

    const handleBlockChange  = (v) => { setSelBlock(v); setSelFloor(''); setSelAreaType(''); };
    const handleFloorChange  = (v) => { setSelFloor(v); setSelAreaType(''); };

    // ── Task 4: Load buildings (IDB-first, then network refresh) ─────────────
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            // Step 1: load from IDB immediately (works offline)
            const cached = await getCachedBuildings();
            if (!cancelled && cached.length > 0) {
                setBuildings(cached);
                setBuildingsLoading(false);
            }

            // Step 2: fetch fresh data if online
            if (!navigator.onLine) {
                setBuildingsLoading(false);
                return;
            }
            try {
                const { data } = await api.get('/api/buildings');
                if (!cancelled) {
                    const fresh = data.data || [];
                    setBuildings(fresh);
                    setBuildingsLoading(false);
                    // Update IDB cache for next offline use
                    await cacheBuildingsLocally(fresh);
                }
            } catch (err) {
                console.warn('[buildings] Network fetch failed, using cache:', err.message);
                if (!cancelled) setBuildingsLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, []);

    const handlePhotoCapture = (blob) => {
        setPhotoBlob(blob);
        setPhotoPreview(URL.createObjectURL(blob));
    };

    const handleSubmit = async () => {
        if (!category) { setError('Please select a category'); return; }
        if (!selBuilding) { setError('Please select a building'); return; }
        if (!selFloor) { setError('Please select a floor'); return; }
        if (!selAreaType) { setError('Please select an area type'); return; }

        setError('');
        setStep('uploading');
        refreshGPS();

        try {
            let photoUrl = null;
            if (photoBlob) {
                photoUrl = await uploadToCloudinary(photoBlob, { folder: 'facility/complaints' });
            }

            // Task 5: structured location payload
            const location = {
                building:   selBuilding,
                block:      selBlock || 'None',
                floor:      selFloor,
                areaType:   selAreaType,
                roomNumber: roomNumber.trim() || undefined,
            };

            const payload = {
                category,
                description,
                photoUrl,
                gps: latitude && longitude ? { latitude, longitude } : undefined,
                location, // Task 5: new structured shape
            };

            const { data } = await api.post('/api/complaints', payload);
            if (data.isDuplicate) {
                setDuplicateData(data.existingComplaint);
                setUpvoted(Boolean(data.existingComplaint?.alreadyUpvoted));
                setUpvoteError('');
                setStep('duplicate');
            } else {
                setStep('success');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit complaint');
            setStep('form');
        }
    };

    const handleUpvote = async () => {
        try {
            setUpvoteError('');
            await api.post(`/api/complaints/${duplicateData._id}/upvote`);
            setUpvoted(true);
        } catch (err) {
            setUpvoteError(err.response?.data?.message || 'Unable to upvote this complaint right now');
        }
    };

    // ── Render: success ───────────────────────────────────────────────────────
    if (step === 'success') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Complaint Submitted!</h2>
                <p className="text-slate-400 text-sm max-w-xs">
                    Your complaint has been received. A supervisor will assign it to a worker shortly.
                </p>
                <button
                    onClick={() => navigate('/student/complaints')}
                    className="py-3 px-6 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold rounded-xl shadow-lg transition-all hover:scale-[1.02]"
                >
                    View My Complaints
                </button>
            </div>
        );
    }

    // ── Render: duplicate ─────────────────────────────────────────────────────
    if (step === 'duplicate') {
        const STATUS_COLORS = {
            submitted: 'bg-blue-500/20 text-blue-400', assigned: 'bg-purple-500/20 text-purple-400',
            in_progress: 'bg-amber-500/20 text-amber-400', completed: 'bg-emerald-500/20 text-emerald-400',
            verified: 'bg-teal-500/20 text-teal-400',
        };
        // Display location from new or legacy shape
        const dupLocation = duplicateData.location || duplicateData.indoorLocation;
        const dupLocationStr = dupLocation?.building
            ? [dupLocation.building, dupLocation.block !== 'None' ? dupLocation.block : null,
               dupLocation.floor, dupLocation.areaType || dupLocation.area]
              .filter(Boolean).join(' › ')
            : null;

        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-white">Similar complaint found</h1>
                    <p className="text-slate-400 text-sm mt-1">Upvote it to increase priority instead of filing a new one.</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                    <p className="text-amber-300 text-sm">
                        A new complaint was not created because the same issue already exists for this location.
                    </p>
                </div>
                <div className="bg-slate-900/60 border border-amber-500/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-white font-medium capitalize">{duplicateData.category.replace('_', ' ')}</p>
                            {duplicateData.description && (
                                <p className="text-slate-400 text-sm mt-1">{duplicateData.description}</p>
                            )}
                            {dupLocationStr && (
                                <p className="text-slate-500 text-xs mt-1">{dupLocationStr}</p>
                            )}
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${STATUS_COLORS[duplicateData.status] || 'bg-slate-700 text-slate-300'}`}>
                            {duplicateData.status.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        {duplicateData.upvoteCount} {duplicateData.upvoteCount === 1 ? 'upvote' : 'upvotes'}
                    </div>
                    <button
                        onClick={handleUpvote}
                        disabled={upvoted}
                        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${upvoted ? 'bg-emerald-500/20 text-emerald-400 cursor-default' : 'bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:scale-[1.02]'}`}
                    >
                        {upvoted ? '✓ Already upvoted' : 'Upvote this complaint'}
                    </button>
                    {upvoteError && (
                        <p className="text-red-400 text-xs">{upvoteError}</p>
                    )}
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setStep('form')} className="flex-1 py-2.5 bg-slate-800 text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors">Back</button>
                    <button onClick={() => navigate('/student/complaints')} className="flex-1 py-2.5 bg-slate-800 text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors">My complaints</button>
                </div>
            </div>
        );
    }

    // ── Render: uploading ─────────────────────────────────────────────────────
    if (step === 'uploading') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <svg className="w-10 h-10 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-slate-400">Submitting complaint...</p>
            </div>
        );
    }

    // ── Render: main form ─────────────────────────────────────────────────────
    const blocksToShow = selectedBuilding?.blocks?.filter((b) => b !== 'None') || [];
    const hideBlockDropdown = !selectedBuilding || blocksToShow.length === 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-white">Report a Cleaning Issue</h1>
                <p className="text-slate-400 text-sm mt-1">Help us keep the campus clean</p>
            </div>

            {/* Category */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-white font-medium text-sm">Type of Cleaning Issue</h3>
                <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.value}
                            onClick={() => setCategory(cat.value)}
                            className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                                category === cat.value
                                    ? `bg-gradient-to-r ${cat.color} text-white shadow-lg scale-[1.02]`
                                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-700'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Task 4: Cascading Location dropdowns ── */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium text-sm">Location</h3>
                    {buildingsLoading && (
                        <span className="text-slate-500 text-xs flex items-center gap-1">
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Loading…
                        </span>
                    )}
                </div>

                {/* 1. Building */}
                <select
                    value={selBuilding}
                    onChange={(e) => handleBuildingChange(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm"
                >
                    <option value="">Select building</option>
                    {buildings.map((b) => (
                        <option key={b._id || b.name} value={b.name}>{b.name}</option>
                    ))}
                </select>

                {/* 2. Block — hidden when only "None" */}
                {selBuilding && !hideBlockDropdown && (
                    <select
                        value={selBlock}
                        onChange={(e) => handleBlockChange(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm"
                    >
                        <option value="">Select block</option>
                        {blocksToShow.map((bl) => (
                            <option key={bl} value={bl}>{bl}</option>
                        ))}
                    </select>
                )}

                {/* 3. Floor — enabled after building (and block if shown) */}
                {selBuilding && (hideBlockDropdown || selBlock) && (
                    <select
                        value={selFloor}
                        onChange={(e) => handleFloorChange(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm"
                    >
                        <option value="">Select floor</option>
                        {(selectedBuilding?.floors || []).map((fl) => (
                            <option key={fl} value={fl}>{fl}</option>
                        ))}
                    </select>
                )}

                {/* 4. Area Type — enabled after floor */}
                {selFloor && (
                    <select
                        value={selAreaType}
                        onChange={(e) => setSelAreaType(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm"
                    >
                        <option value="">Select area type</option>
                        {(selectedBuilding?.areaTypes || []).map((at) => (
                            <option key={at} value={at}>{at}</option>
                        ))}
                    </select>
                )}

                {/* 5. Room number — optional text, shown after area type */}
                {selAreaType && (
                    <input
                        type="text"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        placeholder="Room / number (optional, e.g. 104)"
                        className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                )}

                {/* Location summary chip */}
                {selBuilding && selFloor && selAreaType && (
                    <div className="px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                        <p className="text-purple-300 text-xs">
                            {[selBuilding, selBlock !== 'None' ? selBlock : null, selFloor, selAreaType, roomNumber || null]
                                .filter(Boolean).join(' › ')}
                        </p>
                    </div>
                )}

                {/* Offline notice */}
                {!navigator.onLine && (
                    <p className="text-amber-400/70 text-xs">
                        Using offline building list. Connect to internet for the latest options.
                    </p>
                )}

                {latitude && (
                    <p className="text-slate-600 text-xs">GPS: {latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
                )}
            </div>

            {/* Description */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                <h3 className="text-white font-medium text-sm">Description (optional)</h3>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none text-sm"
                />
                <p className="text-slate-600 text-xs text-right">{description.length}/500</p>
            </div>

            {/* Photo */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-white font-medium text-sm">Photo (recommended)</h3>
                {photoPreview ? (
                    <div className="space-y-2">
                        <img src={photoPreview} alt="Issue" className="w-full rounded-xl border border-slate-700" />
                        <button
                            onClick={() => { setPhotoBlob(null); setPhotoPreview(null); }}
                            className="w-full py-2 text-slate-500 text-sm hover:text-slate-300 transition-colors"
                        >
                            Remove photo
                        </button>
                    </div>
                ) : (
                    <CameraCapture
                        onCapture={handlePhotoCapture}
                        label="Take Photo of Issue"
                        facingMode="environment"
                        autoStart={false}
                    />
                )}
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={!category || !selBuilding || !selFloor || !selAreaType}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold rounded-xl shadow-lg shadow-purple-600/25 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
                Submit Complaint
            </button>
        </div>
    );
}
