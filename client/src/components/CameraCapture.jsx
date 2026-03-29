import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * CameraCapture — uses getUserMedia for live camera feed.
 *
 * Props:
 *   onCapture(blob)  — called with the image Blob after capture
 *   label            — button text (e.g. "Take Selfie", "Before Photo")
 *   facingMode       — 'environment' (rear) or 'user' (front/selfie)
 *   autoStart        — if true, camera starts immediately on mount
 */
export default function CameraCapture({ onCapture, label = 'Take Photo', facingMode = 'user', autoStart = true }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [active, setActive] = useState(false);
    const [preview, setPreview] = useState(null);
    const [previewBlob, setPreviewBlob] = useState(null);
    const [error, setError] = useState(null);
    const [videoReady, setVideoReady] = useState(false);

    // Manage local facing mode to allow flipping
    const [currentFacingMode, setCurrentFacingMode] = useState(facingMode);

    const handleVideoRef = useCallback((node) => {
        videoRef.current = node;
        if (node && streamRef.current) {
            node.srcObject = streamRef.current;
            node.play().catch((err) => console.log('Autoplay prevented:', err));
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setActive(false);
        setVideoReady(false);
    }, []);

    const startCamera = useCallback(async () => {
        setError(null);
        setVideoReady(false);
        try {
            // Check if getUserMedia is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('Camera not supported on this browser. Try using Chrome or Edge.');
                return;
            }

            // Stop any existing stream first
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: currentFacingMode },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => { });
            }
            setActive(true);
        } catch (err) {
            console.error('[camera]', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError(
                    'Camera permission denied. Please click the camera icon in your browser\'s address bar and allow access, then try again.'
                );
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setError('No camera found on this device.');
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                setError('Camera is in use by another application. Please close it and try again.');
            } else if (err.name === 'OverconstrainedError') {
                // Try again without facing mode constraint
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false,
                    });
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.play().catch(() => { });
                    }
                    setActive(true);
                    return;
                } catch {
                    setError('Could not access your camera. Please check your device settings.');
                }
            } else {
                setError(`Camera error: ${err.message}`);
            }
        }
    }, [currentFacingMode]);

    // Auto-start camera on mount if autoStart is true, or when facingMode changes
    useEffect(() => {
        if (autoStart || active) {
            startCamera();
        }
        // Cleanup on unmount
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
        };
    }, [autoStart, startCamera]); // startCamera changes when currentFacingMode changes

    const toggleCamera = () => {
        setCurrentFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const capture = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        // Mirror the image if using front camera so it looks like a mirror to the user
        if (currentFacingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0);

        canvas.toBlob(
            (blob) => {
                if (blob) {
                    setPreview(URL.createObjectURL(blob));
                    setPreviewBlob(blob);
                    stopCamera();
                }
            },
            'image/jpeg',
            0.85
        );
    }, [stopCamera, currentFacingMode]);

    const retake = () => {
        setPreview(null);
        setPreviewBlob(null);
        startCamera();
    };

    const confirmPhoto = () => {
        if (previewBlob) {
            onCapture(previewBlob);
            setPreview(null);
            setPreviewBlob(null);
        }
    };

    // Preview mode
    if (preview) {
        return (
            <div className="space-y-3">
                <img src={preview} alt="Captured" className="w-full rounded-xl border border-slate-700 shadow-lg" />
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={retake}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors"
                    >
                        ↻ Retake
                    </button>
                    <button
                        type="button"
                        onClick={confirmPhoto}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                        ✓ Use Photo
                    </button>
                </div>
            </div>
        );
    }

    // Camera active — show live feed
    if (active) {
        return (
            <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black">
                    <video
                        ref={handleVideoRef}
                        autoPlay
                        playsInline
                        muted
                        onCanPlay={() => setVideoReady(true)}
                        onLoadedMetadata={() => setVideoReady(true)}
                        className={`w-full ${currentFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                        style={{ minHeight: '240px' }}
                    />
                    {!videoReady && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <div className="flex flex-col items-center gap-2">
                                <svg className="w-8 h-8 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span className="text-slate-400 text-sm">Starting camera...</span>
                            </div>
                        </div>
                    )}

                    {videoReady && (
                        <>
                            {/* Flip overlay button */}
                            <div className="absolute top-2 right-2">
                                <button
                                    type="button"
                                    onClick={toggleCamera}
                                    className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-colors"
                                    title="Flip Camera"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                            </div>

                            {/* Capture button */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex justify-center">
                                <button
                                    type="button"
                                    onClick={capture}
                                    className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 shadow-xl hover:scale-105 active:scale-95 transition-transform"
                                >
                                    <span className="sr-only">Capture</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
                <button
                    type="button"
                    onClick={stopCamera}
                    className="w-full py-2 text-slate-500 text-sm hover:text-slate-300 transition-colors"
                >
                    Cancel
                </button>
                <canvas ref={canvasRef} className="hidden" />
            </div>
        );
    }

    // Default — trigger button (shown when autoStart is false or camera failed)
    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={startCamera}
                className="w-full py-3.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 border-dashed rounded-xl text-slate-300 font-medium flex items-center justify-center gap-2 transition-all hover:border-blue-500/50"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {error ? 'Retry Camera' : label}
            </button>
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                    <p>{error}</p>
                    <p className="text-red-500/60 text-xs mt-1">
                        Tip: On Chrome, click the 🔒 icon in the address bar → Site settings → Camera → Allow
                    </p>
                </div>
            )}
        </div>
    );
}
