import React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PageTransition from './components/PageTransition';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationsProvider from './components/NotificationsProvider';
import Home from './Home';
import { useAuthUser } from './lib/useAuthUser';
import { Skeleton } from './components/ui/skeleton';
import Login from './Login';
import Signup from './Signup';
import Profile from './Profile';
import Friends from './Friends';
import UserProfile from './UserProfile';
import SavedPlaces from './SavedPlaces';
import Adventures from './Adventures';
import AdventureDetail from './AdventureDetail';
import AdventureCreate from './AdventureCreate';
import AdventurePublicView from './AdventurePublicView';
import MapView from './components/MapView';
import { Toaster } from './components/ui/sonner';

/** Inverted mirror of ProtectedRoute: logged-in users skip the marketing page. */
function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
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

  return <>{children}</>;
}

export default function App() {
  return (
    <NotificationsProvider>
      <Toaster position="top-center" />
      <Layout>
        <Routes>
          <Route
            path="/"
            element={
              <RedirectIfAuthenticated>
                <PageTransition>
                  <Home />
                </PageTransition>
              </RedirectIfAuthenticated>
            }
          />
          <Route path="/map" element={<div className="h-[calc(100dvh-4rem)] w-full"><MapView fullscreen showSearch /></div>} />
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
      </Layout>
    </NotificationsProvider>
  );
}
