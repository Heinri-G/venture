# Task 5: Saved Places List & Map Views

## Context
After users have discovered and saved places (Task 4), they need a dedicated page to view and manage their collection of saved places. This task implements a **Saved Places page** with both **list view** and **map view** representations of the user's saved places. Users can toggle between these views, filter by category, sort by rating or date saved, and access their saved places with full details, notes, and ratings. The saved places collection becomes the foundation for building Adventures (Task 6) where users can organize places into themed trips or collections.

---

## Requirements

### 1. Saved Places Page & Routing
* Create a new route `/saved-places` in `src/App.tsx`.
* The route must be **protected** (only accessible to authenticated users).
* Create `src/pages/SavedPlaces.tsx` or `src/SavedPlaces.tsx` as the main component.
* Include navigation in the Layout to access this page (update `src/components/Layout.tsx`).

### 2. List View
Create a **mobile-first list view** that displays saved places:
* **List Items**: Each saved place shows:
  - **Thumbnail Photo**: Small image (if available).
  - **Place Name**: Primary title.
  - **Category**: Type of venue (Coffee Shop, Museum, etc.).
  - **Address**: Partial address or "View on map" link.
  - **User's Rating**: Display as stars or numeric rating (1-5) if user has rated.
  - **User's Notes**: First 100 characters of notes (expandable to full text in details modal).
  - **Distance**: Optional distance from current location.
  - **Actions**: Edit notes/rating, delete, or share buttons.
* **Scrolling**: List should be scrollable with smooth scrolling behavior.
* **Empty State**: If no saved places, show a friendly message: "No saved places yet. Start exploring!" with a link to the map.

### 3. Map View
Create a **map view** displaying all saved places on an interactive map:
* Reuse or extend the `MapView.tsx` component from Task 2.
* Display markers for all saved places with distinct styling (different color/icon vs. search results).
* **Marker Interaction**:
  - Clicking a marker shows place details (name, rating, notes).
  - Popup/tooltip should include options to edit or remove from saved.
  - Option to zoom to the place on click.
* **Cluster Markers**: When many markers are close together, group them (clustering) to reduce clutter.
* **Sync List & Map**: When user scrolls/selects a place in the list, highlight or zoom to that marker on the map (and vice versa).
* **Map Controls**:
  - Full zoom controls (zoom in/out).
  - Current location button.
  - Toggle button to switch to list view.

### 4. Toggle Between Views
* Provide a **clear UI control** (button, tabs, or segmented control) to toggle between:
  - List View
  - Map View
* Selected view should persist in the component state (and optionally in `localStorage` for persistence across sessions).
* On mobile, may default to list or map depending on UX preference.
* On desktop, may show both side-by-side (optional).

### 5. Filtering & Sorting
* **Filter by Category**: Dropdown or chip buttons to filter places by category (Coffee Shop, Museum, Restaurant, etc.).
  - Include an "All Categories" option to reset filter.
  - Dynamically generate category list from user's saved places.
* **Sort Options**:
  - **Recently Saved**: Sort by `created_at` (newest first).
  - **Highest Rated**: Sort by `rating` (highest first, nulls last).
  - **Alphabetical**: Sort by place name (A-Z).
  - **Distance**: Sort by distance from current location (if geolocation available).
* **Active Filter Indicator**: Show which filter/sort is currently applied.
* **Reset Filters**: Option to clear all filters and return to the full list.

### 6. Pagination & Loading
* **Pagination**: Load saved places in batches (e.g., 20 per page) to improve performance.
  - Implement "Load More" button or infinite scroll on mobile.
  - Show current page info (e.g., "Showing 1-20 of 47 places").
* **Loading State**: Show a spinner or skeleton loaders while fetching places.
* **Error Handling**: If fetch fails, show an error message with a retry button.

### 7. Place Details Modal/Sheet
* Clicking a place in the list or map opens a **modal or bottom sheet** showing:
  - Full place details (name, address, phone, website, hours, photo).
  - User's rating (as stars).
  - User's notes (full text).
  - Last updated timestamp.
  - Options to:
    - Edit rating/notes (pre-populated in a form).
    - Delete from saved places (with confirmation).
    - Share the place (preparation for Task 7).
    - View place on map.
* Changes should update immediately in the list/map view.

### 8. Delete Place Functionality
* Add a **Delete** button or action in the place details modal.
* Show a **confirmation dialog**: "Remove [Place Name] from saved places?"
* On confirmation, delete the record from `public.saved_places`.
* Update the UI immediately (remove from list/map).
* Show success feedback (e.g., "Place removed" toast notification).

### 9. Mobile-First Responsive Design
* **Mobile (< 768px)**:
  - Full-screen list or map view.
  - Buttons and text large enough to tap easily.
  - Details modal as a bottom sheet.
  - Filters/sort in a collapsible panel or modal.
* **Tablet/Desktop (≥ 768px)**:
  - May show list and map side-by-side.
  - Richer controls and additional information.
  - Details in a side panel instead of modal.

### 10. Pagination Query Specifications
* Fetch saved places with related data:
  ```sql
  SELECT 
    sp.id, sp.user_id, sp.place_id, sp.rating, sp.notes, 
    sp.created_at, sp.updated_at,
    p.id, p.foursquare_fsq_id, p.name, p.address, 
    p.latitude, p.longitude, p.category, p.photo_url
  FROM public.saved_places sp
  JOIN public.places p ON sp.place_id = p.id
  WHERE sp.user_id = $1
  ORDER BY sp.created_at DESC
  LIMIT $2 OFFSET $3
  ```
* Use Supabase `.select()` with `.range()` for pagination offset.

---

## Target Files
* **Create**: `src/pages/SavedPlaces.tsx` or `src/SavedPlaces.tsx` (main page component).
* **Create**: `src/components/SavedPlacesList.tsx` (list view sub-component).
* **Create**: `src/components/SavedPlacesMap.tsx` (map view sub-component, extends MapView).
* **Modify**: `src/App.tsx` (add `/saved-places` protected route).
* **Modify**: `src/components/Layout.tsx` (add navigation link to saved places).
* **Modify**: `src/components/MapView.tsx` (optional: extract common logic into reusable utilities).

---

## API / Database Specs

### Supabase Query (Fetch Saved Places with Related Data)

#### TypeScript Type Definitions
```typescript
interface SavedPlaceWithDetails {
  id: string; // saved_place ID
  user_id: string;
  place_id: string;
  rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  place: {
    id: string;
    foursquare_fsq_id: string | null;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    category: string;
    photo_url: string | null;
    created_at: string;
  };
}
```

#### Fetch Paginated Saved Places
```typescript
const fetchSavedPlaces = async (
  userId: string,
  page: number = 0,
  pageSize: number = 20,
  filterCategory?: string,
  sortBy: 'recent' | 'rated' | 'alphabetical' | 'distance' = 'recent'
) => {
  let query = supabase
    .from('saved_places')
    .select(
      `
      id, user_id, place_id, rating, notes, created_at, updated_at,
      place:places(
        id, foursquare_fsq_id, name, address, latitude, longitude, 
        category, photo_url, created_at
      )
      `
    )
    .eq('user_id', userId);

  // Apply category filter
  if (filterCategory) {
    query = query.eq('place.category', filterCategory);
  }

  // Apply sorting
  if (sortBy === 'recent') {
    query = query.order('created_at', { ascending: false });
  } else if (sortBy === 'rated') {
    query = query.order('rating', { ascending: false, nullsFirst: false });
  } else if (sortBy === 'alphabetical') {
    query = query.order('place.name', { ascending: true });
  }

  // Apply pagination
  const offset = page * pageSize;
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  return { data, error, totalCount: count };
};
```

#### Delete Saved Place
```typescript
const deleteSavedPlace = async (savedPlaceId: string) => {
  const { error } = await supabase
    .from('saved_places')
    .delete()
    .eq('id', savedPlaceId);
  
  if (error) throw error;
};
```

#### Update Saved Place (Rating/Notes)
```typescript
const updateSavedPlace = async (
  savedPlaceId: string,
  updates: { rating?: number | null; notes?: string | null }
) => {
  const { data, error } = await supabase
    .from('saved_places')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', savedPlaceId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
```

#### Fetch Unique Categories
```typescript
const fetchCategoriesFromSavedPlaces = async (userId: string) => {
  const { data, error } = await supabase
    .from('saved_places')
    .select('place:places(category)', { distinct: true })
    .eq('user_id', userId);

  if (error) throw error;

  const categories = [
    ...new Set(data?.map((sp) => sp.place?.category).filter(Boolean)),
  ];
  return categories;
};
```

---

## Verification Checklist

- [ ] **Saved Places Route Protected**: `/saved-places` redirects to `/login` if user is not authenticated.
- [ ] **Navigation Link Exists**: Layout includes clickable link to saved places page.
- [ ] **List View Renders**: Saved places display in a scrollable list with name, category, photo, rating, and notes preview.
- [ ] **Empty State**: When no saved places, shows friendly message with link to explore.
- [ ] **Map View Renders**: All saved places display on an interactive map with markers.
- [ ] **View Toggle Works**: User can switch between list and map views; toggle state persists.
- [ ] **Filtering by Category**: Category filter works; list updates to show only selected category.
- [ ] **Sorting Options**: All sort options (recent, rated, alphabetical, distance) work correctly.
- [ ] **Pagination Works**: List loads in batches; "Load More" button fetches additional places.
- [ ] **Place Details Modal Opens**: Clicking a place shows full details, rating, notes, and edit/delete options.
- [ ] **Edit Notes/Rating**: Users can edit rating and notes; changes save to the database and update the list/map.
- [ ] **Delete Place**: Delete button removes place from saved list; confirmation dialog appears; UI updates.
- [ ] **List & Map Sync**: Selecting a place in the list highlights/zooms on the map; clicking map marker selects in list.
- [ ] **Marker Clustering**: Multiple markers close together are clustered; clustering works smoothly.
- [ ] **Geolocation Distance**: If available, distance from current location displays and sorts correctly.
- [ ] **Loading States**: Spinners/skeletons display while fetching; error messages appear on failure.
- [ ] **Mobile Responsive**: Layout adapts well to mobile, tablet, and desktop screens.
- [ ] **Accessibility**: Buttons are keyboard-navigable; modals have proper focus management; list items have alt text for images.
- [ ] **No Console Errors**: Browser console is clean; no unhandled promise rejections; RLS policies allow access.
- [ ] **Performance**: List/map renders smoothly with 50+ places (no lag when scrolling or filtering).

---

## Implementation Notes

### List View Component Structure
```typescript
// src/components/SavedPlacesList.tsx
interface SavedPlacesListProps {
  places: SavedPlaceWithDetails[];
  onSelectPlace: (place: SavedPlaceWithDetails) => void;
  onDeletePlace: (placeId: string) => void;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

// Render each place as a card with:
// - Thumbnail image
// - Place name & category
// - Rating stars
// - Notes preview (truncated)
// - Edit/Delete buttons
```

### Map View Component Structure
```typescript
// src/components/SavedPlacesMap.tsx
interface SavedPlacesMapProps {
  places: SavedPlaceWithDetails[];
  onSelectPlace: (place: SavedPlaceWithDetails) => void;
  selectedPlaceId?: string; // Highlight selected marker
}

// Use react-leaflet-cluster (MarkerClusterGroup) for clustering
// Display custom markers for saved places (different from search results)
```

### State Management (SavedPlaces.tsx)
```typescript
const [places, setPlaces] = useState<SavedPlaceWithDetails[]>([]);
const [page, setPage] = useState(0);
const [totalCount, setTotalCount] = useState(0);
const [selectedView, setSelectedView] = useState<'list' | 'map'>('list');
const [filterCategory, setFilterCategory] = useState<string | null>(null);
const [sortBy, setSortBy] = useState<'recent' | 'rated' | 'alphabetical'>('recent');
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [selectedPlace, setSelectedPlace] = useState<SavedPlaceWithDetails | null>(null);
```

### Filtering & Sorting UI
```typescript
// Render filter/sort controls:
// - Dropdown for category filter
// - Radio buttons or dropdown for sort method
// - "Reset" button to clear filters
// - "Showing X of Y" text
```

### Modal for Place Details
```typescript
// Reuse or adapt PlaceDetails component from Task 4
// Allow editing rating/notes inline
// Show delete button with confirmation
// Update parent list/map on changes
```

### Marker Clustering (Leaflet)
Leaflet clustering is provided by `react-leaflet-cluster`. Wrap the markers in a `MarkerClusterGroup` (already used in the Task 2 baseline `MapView`):
```typescript
import MarkerClusterGroup from 'react-leaflet-cluster';

<MarkerClusterGroup
  chunkedLoading
  spiderfyOnMaxZoom
  disableClusteringAtZoom={14}
>
  {places.map((sp) => (
    <Marker
      key={sp.id}
      position={[sp.place.latitude, sp.place.longitude]}
      eventHandlers={{ click: () => onSelectPlace(sp) }}
    >
      <Popup>
        <div className="text-sm">
          <div className="font-semibold">{sp.place.name}</div>
          <div>{sp.place.category}</div>
        </div>
      </Popup>
    </Marker>
  ))}
</MarkerClusterGroup>
```
Customize cluster styling by passing a `divIcon` factory through the `iconCreateFunction` prop on `MarkerClusterGroup`.

### Sync List & Map
When user selects a place in the list:
```typescript
const handleSelectPlace = (place: SavedPlaceWithDetails) => {
  setSelectedPlace(place);
  // If in list view, optionally switch to map view
  if (selectedView === 'list') {
    // Optionally: setSelectedView('map');
  }
  // Zoom map to place
  if (mapInstance) {
    mapInstance.flyTo({
      center: [place.place.longitude, place.place.latitude],
      zoom: 14,
    });
  }
};
```

### Performance Optimization
* Use `React.memo()` for SavedPlacesList and SavedPlacesMap to prevent unnecessary re-renders.
* Use `useCallback` for event handlers.
* Implement **virtual scrolling** for large lists (e.g., using `react-window` or `react-virtual`).
* Lazy-load place photos using `loading="lazy"` or intersection observer.

### Accessibility
* Rating stars: Each star should have `aria-label` (e.g., "4 out of 5 stars").
* Filter/sort controls: Use semantic `<select>` or labeled `<input type="radio">`.
* Modal: Use `role="dialog"`, `aria-modal="true"`, and proper focus management.
* List items: Use semantic HTML (`<article>`, `<h3>`, etc.).
* Images: Include `alt` text describing the place.

### Error Recovery
* If fetch fails during pagination, show a retry button to fetch that page again.
* If delete fails, show an error message with option to retry.
* Log errors for debugging (optional monitoring service).

---

## Dependencies

Ensure the following packages are installed:
* `@supabase/supabase-js` (already installed)
* `react-leaflet` + `react-leaflet-cluster` (from Task 2)
* `lucide-react` (for icons)

Optional but recommended:
* `react-window` (for virtual scrolling in large lists)
* `@radix-ui/react-dialog` (for modals)

Install if needed:
```bash
npm install react-window
npm install --save-dev @types/react-window
```

---

## Environment Variables

No new variables needed. Existing configuration is sufficient (the map is Leaflet + OpenStreetMap, so no map API token is required):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Next Steps (Sequence)

This task enables:
- **Task 6**: Adventure creation will use saved places to build collections and organize them into themed trips.
- **Task 7+**: Sharing and collaboration will allow users to share their saved places and adventures with others.
