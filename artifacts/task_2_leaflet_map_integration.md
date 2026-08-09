# Task 2: Leaflet Map Integration (OpenStreetMap)

## Context
Now that the User Profile page has been established, the next critical feature is a full-screen, interactive map powered by **Leaflet** with **OpenStreetMap** (OSM) tile layers. This map will be the core interaction surface for the Venture app, enabling users to explore places visually on a mobile-friendly interface. The map will serve as the foundation for placing markers, searching places (Task 3), and saving locations (Task 4).

Leaflet + OpenStreetMap is preferred over Mapbox because it is **free, open-source, and requires no API token or account**. The dependencies (`leaflet`, `react-leaflet`, `react-leaflet-cluster`) are already installed in `package.json`, and a baseline `src/components/MapView.tsx` already exists.

---

## Requirements

### 1. Map Component Creation
* Create (or refine) `src/components/MapView.tsx` to encapsulate all Leaflet initialization and interaction logic.
* Use `react-leaflet` (React bindings) with a plain `leaflet` core.
* The map must be **full-screen or nearly full-screen** on mobile devices (respecting top/bottom navigation bars if present).
* Initialize the map with an **OpenStreetMap tile layer** — no API token required:
  ```javascript
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  ```
* **Default View**: Center the map on a sensible default location (e.g., "Berlin" `[52.52, 13.405]` or "San Francisco" `[37.7749, -122.4194]` with zoom level 12) or the user's current geolocation if permission is granted.

### 2. Mobile-First Styling
* Use Tailwind CSS to ensure the map container is responsive and adapts to all screen sizes.
* On mobile: The map should take up most of the viewport, with only minimal UI chrome (e.g., a search bar at the top).
* On desktop: The map may have side panels or additional controls alongside the map.
* Ensure the map is accessible and respects safe-area insets (e.g., notches on modern phones).

### 3. Interactive Map Features
* **Zoom Controls**: Built-in Zoom in/out buttons (Leaflet's default `zoomControl`).
* **Pan & Drag**: Users can drag to pan around the map (default Leaflet behavior).
* **Current Location Button**: A button to re-center the map on the user's current geolocation (if permission granted) using the Geolocation API and `map.flyTo()`.
* **Marker Rendering**: Prepare the component to accept and render an array of marker objects (lat, lng, placeId, title, etc.). This will be used by Task 4 when implementing saved places and search results.
* **Marker Clustering**: Use `react-leaflet-cluster` (`MarkerClusterGroup`) so nearby markers are grouped (already used in the baseline component).

### 4. Map State Management
* Use React hooks (`useState`, `useEffect`) to manage:
  * Current viewport (center lat/lng, zoom level).
  * List of markers to render on the map.
  * User's current location (if geolocation permission granted).
  * Loading state (map initialization, geolocation fetch).
* Ensure the map instance persists across re-renders. With `react-leaflet`, use a `mapRef` via the `ref` prop on `<MapContainer>` or the `useMap()` hook inside a child component to access the underlying Leaflet map object.

### 5. Geolocation Integration (Optional but Recommended)
* Request user permission to access their current location (using the Geolocation API).
* If permission is granted, fetch the user's coordinates and center the map on their location.
* Optionally, display a marker or indicator showing the user's current location.
* If permission is denied, gracefully fall back to the default location.

### 6. Integration with App Router
* Update `src/App.tsx` to create a `/map` or `/explore` route that renders the MapView component.
* The map route should be accessible to both authenticated and unauthenticated users (unlike the profile page).
* Optionally, make the map the default landing page or accessible from the home page.

### 7. Leaflet Icon Fix for Vite
* Leaflet's default marker icons rely on image paths that break under Vite's bundler. The baseline component already fixes this by importing the PNGs directly:
  ```javascript
  import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
  import markerIcon from 'leaflet/dist/images/marker-icon.png';
  import markerShadow from 'leaflet/dist/images/marker-shadow.png';

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
  ```
* Alternatively, use custom `L.divIcon()` markers for full styling control (used by later tasks for numbered/colored markers).

### 8. Environment Variables
* **No API token is required** for Leaflet + OpenStreetMap.
* Do NOT define a `VITE_MAPBOX_ACCESS_TOKEN`; remove any Mapbox references from `.env.example`.
* If you later switch to a provider that requires attribution analytics or a tile API key (e.g., MapTiler, Stadia), that key would be stored as `VITE_*` — not needed for the default OSM setup.

---

## Target Files
* **Create/Modify**: `src/components/MapView.tsx` (Leaflet map component with initialization, markers, clustering, and geolocation).
* **Create**: Optionally `src/hooks/useLeaflet.ts` (custom hook to abstract Leaflet logic if needed).
* **Modify**: `src/App.tsx` (add `/map` or `/explore` route).
* **Modify**: `.env.example` (remove stale `*_MAPBOX_ACCESS_TOKEN` placeholder — no token needed).
* **Reference**: `src/components/Layout.tsx` (ensure navigation includes link to map).

---

## API / Database Specs

### Leaflet Key Interfaces (via react-leaflet)

#### Map Initialization
```javascript
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

<MapContainer center={[52.52, 13.405]} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
  <TileLayer
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />
</MapContainer>
```

#### Adding a Marker with Popup
```javascript
import { Marker, Popup } from 'react-leaflet';

<Marker position={[latitude, longitude]}>
  <Popup>
    <div className="text-sm">
      <div className="font-semibold">{placeName}</div>
    </div>
  </Popup>
</Marker>
```

#### Geolocation (fly to current location)
```javascript
const handleLocateMe = () => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      mapRef.current?.flyTo([latitude, longitude], 14);
    },
    (error) => console.error('Geolocation error:', error)
  );
};
```

#### Accessing the Leaflet Map Instance
```javascript
import { useMap } from 'react-leaflet';

function MapController({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map]);
  return null;
}

// Usage: <MapController onReady={(m) => (mapRef.current = m)} />
```

#### Marker Clustering (react-leaflet-cluster)
```javascript
import MarkerClusterGroup from 'react-leaflet-cluster';

<MarkerClusterGroup>
  {markers.map((m) => (
    <Marker key={m.id} position={[m.latitude, m.longitude]}>
      <Popup>...</Popup>
    </Marker>
  ))}
</MarkerClusterGroup>
```

### Marker Data Structure (from Task 4 & Task 5)
Future tasks will pass an array of markers with this structure:
```typescript
interface MapMarker {
  id: string; // UUID or place ID
  lat: number;
  lng: number;
  title: string;
  category?: string;
  photoUrl?: string;
  placeId: string; // Foursquare FSQ ID or internal place ID
  saved?: boolean; // Whether the user has saved this place
}
```

### Baseline Implementation Reference
The current `src/components/MapView.tsx` already provides a working Leaflet map that:
* Loads markers from the `public.places` table via the Supabase client (with a demo-marker fallback when the table is missing).
* Renders them inside `MarkerClusterGroup`.
* Fixes Leaflet default icon paths for Vite.

Refine this component to match the props/requirements in this task (full-screen layout, geolocation button, click handlers) rather than rewriting from scratch.

---

## Verification Checklist

- [ ] **Map Renders**: The MapView component displays a full-screen Leaflet map with OpenStreetMap tiles without errors.
- [ ] **No Token Required**: No `MAPBOX_ACCESS_TOKEN` or any API key is present; the map loads purely from OSM tiles.
- [ ] **Default Location**: Map centers on a sensible default location (e.g., Berlin/San Francisco) with appropriate zoom.
- [ ] **Geolocation Works**: Clicking "Current Location" button fetches and centers on user's position (with permission request).
- [ ] **Mobile Responsive**: Map adapts well to mobile screen sizes (test in browser dev tools or on an actual phone).
- [ ] **Zoom & Pan**: Users can zoom in/out and pan across the map smoothly.
- [ ] **Marker Rendering**: Markers display correctly when passed to the component (prepare for Task 4).
- [ ] **Marker Clustering**: Closely-spaced markers are grouped into clusters that expand on zoom.
- [ ] **Route Navigation**: `/map` or `/explore` route is accessible from the app navigation and loads the MapView.
- [ ] **Icon Fix Applied**: Default marker icons render correctly (no broken/empty icon placeholders).
- [ ] **No Console Errors**: Browser console is clean; no Leaflet or React warnings.
- [ ] **Accessible**: Map controls are keyboard-accessible; proper ARIA labels are used.

---

## Implementation Notes

### Mobile-First Approach
* Start with a minimal, full-screen layout on mobile.
* Consider adding a search bar or filter panel later (Task 3 & onwards).
* Ensure touch gestures (pinch-to-zoom, two-finger pan) work smoothly.

### Performance Considerations
* **Lazy Load Leaflet**: Consider loading the map libraries dynamically to avoid increasing initial bundle size unnecessarily.
* **Memoization**: Use `React.memo()` if the MapView component re-renders frequently with the same props.
* **Marker Clustering**: Already handled by `react-leaflet-cluster` (`MarkerClusterGroup`) — keep cluster settings tuned (`spiderfyOnMaxZoom`, `disableClusteringAtZoom`) for mobile.
* **Tile Caching**: OSM tiles are cached by the browser automatically; avoid custom tile URLs that hammer the OSM tile servers.

### Styling & Customization
* Import `leaflet/dist/leaflet.css` once (globally or in the component) or Leaflet will render unstyled.
* OpenStreetMap tile layers support multiple server subdomains (`{s}`) for load balancing.
* Alternative free providers (MapTiler, Stadia, CartoDB) can be swapped in later by changing the tile URL — still no token needed for several of them.
* Tailwind CSS can wrap the map container but should not interfere with Leaflet's internal styling.

### Accessibility
* Ensure zoom buttons have proper `aria-label` attributes.
* Test keyboard navigation (Tab through controls, Enter to activate).
* Provide text alternatives for map content when needed.

---

## Dependencies

Ensure the following packages are installed (already present in `package.json`):
* `leaflet` (core map library)
* `react-leaflet` (React bindings)
* `react-leaflet-cluster` (marker clustering)
* `@types/leaflet` (TypeScript support)

If not installed, run:
```bash
npm install leaflet react-leaflet react-leaflet-cluster
npm install --save-dev @types/leaflet
```

---

## Environment Variables

**No environment variables are required** for the default Leaflet + OpenStreetMap setup. There is no API token.

Remove any stale Mapbox entries from `.env.example` (e.g., `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` or `VITE_MAPBOX_ACCESS_TOKEN`).

If you later opt into a tile provider that requires a key, that key would be stored as a `VITE_`-prefixed variable (e.g., `VITE_TILE_PROVIDER_KEY`).

---

## Next Steps (Sequence)

This task is foundational for:
- **Task 3**: Foursquare Places search will place markers on this map.
- **Task 4**: Place details and save functionality will integrate with markers on this map.
- **Task 5**: Saved places list view will sync with the map viewport.
- **Task 6+**: Adventures will display collections of places on the map.
