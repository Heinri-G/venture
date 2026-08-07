import React from 'react';
import '../globals.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
          <div className="text-xl font-semibold">Venture</div>
          <nav className="flex items-center gap-4">
            <a href="/" className="text-gray-700 hover:text-gray-900">Home</a>
            <a href="/places" className="text-gray-700 hover:text-gray-900">Places</a>
            <a href="/profile" className="text-gray-700 hover:text-gray-900">Profile</a>
            <a href="/about" className="text-gray-700 hover:text-gray-900">About</a>
            <a href="/login" className="ml-4 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Sign in</a>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6">{children}</main>

      <footer className="p-4 text-sm text-center text-gray-500 bg-white/50">© Venture</footer>
    </div>
  );
}
