---
name: mapbox-integration
description: Guidelines and code snippets for integrating Mapbox GL JS in a Next.js React application.
---

# Mapbox Integration Skill

When building Mapbox maps in this Next.js project, follow these guidelines:

## Setup
1. Use the `mapbox-gl` package.
2. The Mapbox token should be stored in `.env.local` as `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.

## Basic React Component Example
```javascript
import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

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
