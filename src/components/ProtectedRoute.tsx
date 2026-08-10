import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';
import { Skeleton } from './ui/skeleton';

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
    return () => {
      mounted = false;
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-10">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
