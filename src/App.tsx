import React, { lazy, Suspense } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PageTransition from './components/PageTransition';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationsProvider from './components/NotificationsProvider';
import RouteFallback from './components/RouteFallback';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import Home from './Home';
import { useAuthUser } from './lib/useAuthUser';
import { Skeleton } from './components/ui/skeleton';
import Login from './Login';
import Signup from './Signup';
import { Toaster } from './components/ui/sonner';

const Profile = lazy(() => import('./Profile'));
const Friends = lazy(() => import('./Friends'));
const UserProfile = lazy(() => import('./UserProfile'));
const SavedPlaces = lazy(() => import('./SavedPlaces'));
const Adventures = lazy(() => import('./Adventures'));
const AdventureDetail = lazy(() => import('./AdventureDetail'));
const AdventureCreate = lazy(() => import('./AdventureCreate'));
const AdventurePublicView = lazy(() => import('./AdventurePublicView'));
const MapView = lazy(() => import('./components/MapView'));
const ShareImport = lazy(() => import('./components/ShareImport'));

/** Redirect signed-in users to /map; show the marketing page for visitors. */
function HomeOrRedirect() {
  const { user, loading } = useAuthUser();

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-10">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/map" replace />;
  }

  return (
    <PageTransition>
      <Home />
    </PageTransition>
  );
}

export default function App() {
  return (
    <NotificationsProvider>
      <Toaster position="top-center" />
      <Layout>
        <RouteErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomeOrRedirect />} />
              <Route path="/home" element={<HomeOrRedirect />} />
              <Route path="/map" element={<ProtectedRoute><div className="map-container h-[calc(100dvh-4rem)] w-full"><MapView /></div></ProtectedRoute>} />
              <Route path="/share" element={<ProtectedRoute><PageTransition><ShareImport /></PageTransition></ProtectedRoute>} />
              <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
              <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
              <Route path="/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
              <Route path="/u/:userId" element={<PageTransition><UserProfile /></PageTransition>} />
              <Route path="/friends" element={<ProtectedRoute><PageTransition><Friends /></PageTransition></ProtectedRoute>} />
              <Route path="/saved-places" element={<ProtectedRoute><SavedPlaces /></ProtectedRoute>} />
              <Route path="/adventures" element={<ProtectedRoute><PageTransition><Adventures /></PageTransition></ProtectedRoute>} />
              <Route path="/adventures/new" element={<ProtectedRoute><PageTransition><AdventureCreate /></PageTransition></ProtectedRoute>} />
              <Route path="/adventures/public/:publicToken" element={<PageTransition><AdventurePublicView /></PageTransition>} />
              <Route path="/adventures/:id" element={<ProtectedRoute><AdventureDetail /></ProtectedRoute>} />
              <Route path="/adventures/:id/edit" element={<ProtectedRoute><PageTransition><AdventureCreate /></PageTransition></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </Layout>
    </NotificationsProvider>
  );
}
