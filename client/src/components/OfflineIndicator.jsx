import useOnlineStatus from '../hooks/useOnlineStatus';

/**
 * OfflineIndicator — shows a subtle bar when the device is offline.
 */
export default function OfflineIndicator() {
    const isOnline = useOnlineStatus();

    if (isOnline) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9998] bg-amber-500 text-amber-950 text-center py-2 px-4 text-sm font-medium shadow-lg">
            <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-950 animate-pulse" />
                You're offline — data is saved locally and will sync when connected
            </span>
        </div>
    );
}
