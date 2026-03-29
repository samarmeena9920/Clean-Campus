import { useState, useEffect, useCallback } from 'react';

/**
 * useGPS — captures HTML5 GPS coordinates.
 *
 * Returns { latitude, longitude, error, loading, refresh }
 * Automatically fires on mount; call refresh() to re-capture.
 */
export default function useGPS() {
  const [position, setPosition] = useState({ latitude: null, longitude: null });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const capture = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Failed to get location');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    capture();
  }, [capture]);

  return { ...position, error, loading, refresh: capture };
}
