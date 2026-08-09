import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    async function checkAuth() {
      const { data, error } = await supabase.auth.getUser();
      if (mounted) {
        setIsAuthenticated(!error && !!data?.user);
      }
    }
    checkAuth();
    return () => { mounted = false; };
  }, []);

  if (isAuthenticated === null) {
    return <div className="p-4">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
