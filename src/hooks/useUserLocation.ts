import { useEffect, useRef, useState } from 'react';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

/**
 * Requests the browser geolocation once on mount and returns the result.
 * Returns `loading: true` while the browser prompt is active, and
 * `error: true` if the user denies or the device cannot resolve a position.
 */
export function useUserLocation(opts?: { enableHighAccuracy?: boolean; timeout?: number }) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestedRef = useRef(false);
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  useEffect(() => {
    if (requestedRef.current) return;
    if (!navigator.geolocation) {
      // Defer so we don't call setState synchronously inside the effect.
      queueMicrotask(() => {
        setError(true);
        setLoading(false);
      });
      return;
    }
    requestedRef.current = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoading(false);
      },
      () => {
        setError(true);
        setLoading(false);
      },
      {
        enableHighAccuracy: optsRef.current?.enableHighAccuracy ?? true,
        timeout: optsRef.current?.timeout ?? 10000,
      }
    );
  }, []);

  return { location, loading, error };
}
