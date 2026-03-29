import { useState, useEffect } from 'react';

/**
 * useOnlineStatus — reactive online/offline detection.
 *
 * Returns `true` when online, `false` when offline.
 * Listens to browser online/offline events for instant updates.
 */
export default function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}
