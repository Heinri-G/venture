import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ThemeProvider from './components/ThemeProvider';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';

const container = document.getElementById('root')!;
createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
