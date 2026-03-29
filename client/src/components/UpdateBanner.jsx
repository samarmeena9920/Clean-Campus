import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * UpdateBanner — "Zombie App" Prevention
 *
 * When a new Service Worker is available, shows a sticky banner
 * prompting the user to reload. On click, the old SW cache is cleared
 * and the page force-reloads with the latest version.
 */
export default function UpdateBanner() {
    const [show, setShow] = useState(false);

    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, registration) {
            // Check for updates every 60 minutes
            if (registration) {
                setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000);
            }
        },
        onRegisterError(error) {
            console.error('SW registration error:', error);
        },
    });

    useEffect(() => {
        setShow(needRefresh);
    }, [needRefresh]);

    if (!show) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-blue-600 to-emerald-500 text-white px-4 py-3 flex items-center justify-between shadow-lg animate-slide-down">
            <div className="flex items-center gap-2">
                <svg className="w-5 h-5 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium">A new version is available!</span>
            </div>
            <button
                onClick={() => updateServiceWorker(true)}
                className="bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105"
            >
                Update Now
            </button>
        </div>
    );
}
