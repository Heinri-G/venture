---
name: mapbox-integration
description: Guidelines and code snippets for integrating Mapbox GL JS in a Vite + React application.
---

# Mapbox Integration Skill

When building Mapbox maps in this Vite + React project, follow these guidelines:

## Setup
1. Use the `mapbox-gl` package.
2. The Mapbox token should be stored in `.env` as `VITE_MAPBOX_ACCESS_TOKEN` (exposed to the client via Vite's VITE_ prefix). Do NOT commit `.env`.

## Basic React Component Example
```javascript
import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.5, 40],
      zoom: 9
    });
  }, []);

  return (
    <div ref={mapContainer} className="h-full w-full" />
  );
}
```

## Notes
- **CSS is Required**: Ensure the `mapbox-gl.css` is imported, otherwise the map will not render correctly.
- **Mobile First**: Since this is a mobile-first app, ensure any map controls (zoom, compass) are appropriately sized for touch targets.
