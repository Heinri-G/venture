import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PageTransition from './components/PageTransition';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './Home';
import Login from './Login';
import Signup from './Signup';
import Profile from './Profile';
import MapView from './components/MapView';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <>
      <Toaster position="top-center" />
      <Layout>
        <Routes>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/map" element={<div className="h-[calc(100dvh-4rem)] w-full"><MapView fullscreen showSearch /></div>} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
          <Route path="/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
        </Routes>
      </Layout>
    </>
  );
}
