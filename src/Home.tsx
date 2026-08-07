import React from 'react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h1 className="text-5xl font-extrabold text-center">Welcome to Venture</h1>
      <p className="mt-4 text-lg text-gray-600 text-center max-w-xl">Explore and save amazing places.</p>

      <div className="mt-8 w-full max-w-xl">
        <div className="flex gap-2">
          <input className="flex-1 px-4 py-3 rounded-md border border-gray-200 bg-white" placeholder="Search for a place, e.g. 'coffee in Berlin'" />
          <button className="px-4 py-3 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700">Search</button>
        </div>
      </div>

      <div className="mt-12 w-full max-w-4xl h-72 bg-white rounded-lg shadow flex items-center justify-center text-gray-400">
        Map placeholder
      </div>
    </div>
  );
}
