import { useEffect, useRef, useState } from 'react';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

const STORAGE_KEY = 'venture:user-location';

function readCached(): UserLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { latitude: number; longitude: number };
    if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeCache(loc: UserLocation) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch {
    // storage full or blocked — ignore
  }
}

/**
 * Returns the user's geolocation, loading from localStorage first so the
 * map can centre immediately.  A fresh browser position is requested in the
 * background and replaces the cached value once it arrives.
 */
export function useUserLocation(opts?: { enableHighAccuracy?: boolean; timeout?: number }) {
  const [location, setLocation] = useState<UserLocation | null>(() => readCached());
  const [loading, setLoading] = useState(() => !readCached());
  const [error, setError] = useState(false);
  const hasCachedRef = useRef(readCached() !== null);
  const requestedRef = useRef(false);
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  useEffect(() => {
    if (requestedRef.current) return;
    if (!navigator.geolocation) {
      if (!hasCachedRef.current) {
        queueMicrotask(() => {
          setError(true);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
      return;
    }
    requestedRef.current = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation(loc);
        setLoading(false);
        writeCache(loc);
      },
      () => {
        if (!hasCachedRef.current) {
          setError(true);
        }
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
