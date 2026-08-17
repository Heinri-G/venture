import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 639px)';

function getMatches(query: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(query).matches;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => getMatches(MOBILE_QUERY));

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
