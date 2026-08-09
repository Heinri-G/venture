# Task 3: Foursquare Places Search & Autocomplete

## Context
With the Leaflet + OpenStreetMap map now rendering, users need a way to search for and discover places. This task implements a **Foursquare Places Autocomplete** feature that allows users to search for locations, venues, and landmarks. To maintain security and avoid exposing API keys to the client, all Foursquare API calls will be **proxied through Netlify Functions** (serverless backend). The search interface will display autocomplete suggestions as the user types, and clicking a suggestion will fetch full place details and add markers to the map.

---

## Requirements

### 1. Netlify Functions for Foursquare Proxy
Create two Netlify Functions in `netlify/functions/` to securely proxy Foursquare API calls:

#### Function 1: `places-search.ts` (Autocomplete)
* **Endpoint**: `/.netlify/functions/places-search`
* **Method**: `POST`
* **Purpose**: Accept a search query and return autocomplete suggestions from Foursquare.
* **Request Body**:
  ```json
  {
    "query": "coffee",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "limit": 10
  }
  ```
* **Response Body**:
  ```json
  {
    "results": [
      {
        "fsq_id": "4ad4c...",
        "name": "Blue Bottle Coffee",
        "address": "123 Main St, San Francisco, CA",
        "latitude": 37.7891,
        "longitude": -122.3975,
        "category": "Coffee Shop"
      }
    ]
  }
  ```
* **Error Handling**: Return a 400 or 500 status with an error message if the Foursquare API call fails.

#### Function 2: `places-get.ts` (Place Details)
* **Endpoint**: `/.netlify/functions/places-get`
* **Method**: `POST`
* **Purpose**: Fetch full details for a specific place given its Foursquare FSQ ID.
* **Request Body**:
  ```json
  {
    "fsq_id": "4ad4c..."
  }
  ```
* **Response Body**:
  ```json
  {
    "id": "4ad4c...",
    "name": "Blue Bottle Coffee",
    "address": "123 Main St, San Francisco, CA",
    "latitude": 37.7891,
    "longitude": -122.3975,
    "category": "Coffee Shop",
    "phone": "+1 (415) 555-0123",
    "website": "https://bluebottlecoffee.com",
    "hours": "7:00 AM – 9:00 PM",
    "photoUrl": "https://ss3.4sqi.net/img/..."
  }
  ```
* **Error Handling**: Return a 400 or 500 status with an error message if the place is not found or API fails.

### 2. Frontend Search Component
Create `src/components/PlacesSearch.tsx` that:
* Renders a **search input field** with a clean, mobile-first design.
* Displays **autocomplete suggestions** in a dropdown as the user types.
* Debounces the search query (e.g., 300ms) to avoid excessive API calls.
* Shows a loading indicator while fetching suggestions.
* Allows the user to click on a suggestion to:
  - Fetch full place details via the `places-get` function.
  - Emit an event or callback to add the place to the map (via parent MapView component or context).
* Handles error states gracefully (e.g., "No results found", "Search error").

### 3. Integration with MapView
* Update `src/components/MapView.tsx` to:
  - Include the PlacesSearch component (typically positioned at the top of the map).
  - Accept and render an array of markers passed from PlacesSearch (search results or saved places).
  - Support click handlers on markers to display place details (preparation for Task 4).
* Ensure the search bar doesn't obscure the map on mobile devices; consider using a transparent background or floating panel.

### 4. API & Environment Configuration
* **Foursquare API Setup**:
  - Requires a Foursquare Developer Account and API key (free tier available).
  - Store `FOURSQUARE_API_KEY` as an environment variable in Netlify (production) and `.env.local` (development).
  - Never expose the API key to the client; all calls must go through Netlify Functions.
* **Update `.env.example`**: Document `FOURSQUARE_API_KEY` as a required server-side variable.

### 5. Mobile-First UI
* Search input should be:
  - Full-width or nearly full-width on mobile.
  - Positioned at the top of the map container.
  - Have a clear, accessible input field with a search icon.
  - Support voice input (optional, nice-to-have).
* Autocomplete dropdown should:
  - Appear below the search input or as a modal panel.
  - Be scrollable if there are many suggestions (max height).
  - Display place name, category, and distance/address.
  - Have a clear visual indicator for selection/hover states.
  - Close when clicking outside or pressing Escape.

### 6. State Management
* Use React hooks to manage:
  - Search query text.
  - Autocomplete suggestions list.
  - Loading state (searching).
  - Error messages.
  - Currently selected/hovered suggestion.
* Optionally use a context or prop drilling to pass selected places up to the MapView.

### 7. Performance & Caching (Optional but Recommended)
* Implement **debouncing** on the search input to prevent hammering the Netlify Function.
* Consider **caching** recent searches locally (e.g., using localStorage) to speed up repeated queries.
* Limit autocomplete results to a reasonable number (e.g., 10 suggestions).

---

## Target Files
* **Create**: `netlify/functions/places-search.ts` (Foursquare autocomplete proxy).
* **Create**: `netlify/functions/places-get.ts` (Foursquare place details proxy).
* **Create**: `src/components/PlacesSearch.tsx` (Search input and autocomplete UI).
* **Modify**: `src/components/MapView.tsx` (integrate PlacesSearch, add marker rendering from search results).
* **Modify**: `src/App.tsx` (ensure the map route includes the PlacesSearch component).
* **Modify**: `.env.example` (add `FOURSQUARE_API_KEY`).

---

## API / Database Specs

### Foursquare Places API

#### Foursquare Autocomplete Endpoint
```
GET https://api.foursquare.com/v3/autocomplete
?query=coffee
&ll=37.7749,-122.4194
&limit=10
```

**Headers**:
```
Authorization: Bearer {FOURSQUARE_API_KEY}
Accept: application/json
```

**Response**:
```json
{
  "results": [
    {
      "fsq_id": "4ad4c...",
      "name": "Blue Bottle Coffee",
      "address": "123 Main St, San Francisco, CA",
      "geo": {
        "latitude": 37.7891,
        "longitude": -122.3975
      },
      "categories": [
        {
          "id": 13032,
          "name": "Coffee Shop"
        }
      ]
    }
  ]
}
```

#### Foursquare Place Details Endpoint
```
GET https://api.foursquare.com/v3/places/{fsq_id}
```

**Headers**:
```
Authorization: Bearer {FOURSQUARE_API_KEY}
Accept: application/json
```

**Response**:
```json
{
  "fsq_id": "4ad4c...",
  "name": "Blue Bottle Coffee",
  "location": {
    "address": "123 Main St",
    "cross_street": "Market St",
    "city": "San Francisco",
    "state": "CA",
    "postal_code": "94102",
    "country": "US",
    "formatted_address": "123 Main St (Market St), San Francisco, CA 94102, United States",
    "latitude": 37.7891,
    "longitude": -122.3975
  },
  "categories": [
    {
      "id": 13032,
      "name": "Coffee Shop"
    }
  ],
  "tel": "+1415555012",
  "website": "https://bluebottlecoffee.com",
  "hours": {
    "display": "7:00 AM – 9:00 PM"
  },
  "photos": [
    {
      "id": "photo_id",
      "created_at": "2023-01-15T10:30:00.000Z",
      "prefix": "https://ss3.4sqi.net/img/",
      "suffix": "/original.jpg",
      "width": 1024,
      "height": 768
    }
  ]
}
```

### Netlify Function Handler Pattern
```typescript
import { Handler } from '@netlify/functions';

const handler: Handler = async (event, context) => {
  const { query, latitude, longitude, limit } = JSON.parse(event.body || '{}');

  // Validate input
  if (!query) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing query parameter' }),
    };
  }

  try {
    // Call Foursquare API
    const response = await fetch(
      `https://api.foursquare.com/v3/autocomplete?query=${encodeURIComponent(query)}&ll=${latitude},${longitude}&limit=${limit || 10}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.FOURSQUARE_API_KEY}`,
          Accept: 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error || 'Foursquare API error' }),
      };
    }

    // Transform response if needed
    const results = data.results.map((place: any) => ({
      fsq_id: place.fsq_id,
      name: place.name,
      address: place.location?.formatted_address || 'Unknown address',
      latitude: place.geo?.latitude || place.location?.latitude,
      longitude: place.geo?.longitude || place.location?.longitude,
      category: place.categories?.[0]?.name || 'Venue',
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ results }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export { handler };
```

### Frontend Fetch Pattern (PlacesSearch Component)
```typescript
const searchPlaces = async (query: string, latitude: number, longitude: number) => {
  setLoading(true);
  try {
    const response = await fetch('/.netlify/functions/places-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, latitude, longitude, limit: 10 }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setSuggestions(data.results);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Place Data Structure
```typescript
interface PlaceResult {
  fsq_id: string; // Foursquare unique identifier
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  phone?: string;
  website?: string;
  hours?: string;
  photoUrl?: string;
}
```

---

## Verification Checklist

- [ ] **Foursquare API Key**: Key is stored in Netlify environment variables (production) and `.env.local` (development); never exposed to client.
- [ ] **places-search Function Works**: Calling `/.netlify/functions/places-search` with a query returns autocomplete suggestions.
- [ ] **places-get Function Works**: Calling `/.netlify/functions/places-get` with an FSQ ID returns full place details.
- [ ] **PlacesSearch Component Renders**: Search input appears at the top of the map on mobile and desktop.
- [ ] **Autocomplete Dropdown**: Suggestions appear as the user types; clicking a suggestion calls `places-get` and adds marker to map.
- [ ] **Debouncing Works**: Typing quickly doesn't hammer the API; suggestions appear after a short delay.
- [ ] **Loading State**: A spinner or "Loading..." message shows while fetching suggestions.
- [ ] **Error Handling**: If API fails or no results found, user sees a friendly error message.
- [ ] **Mobile Responsive**: Search bar and dropdown don't obscure the map on mobile; layout adapts to screen size.
- [ ] **Map Integration**: Selecting a place from search results displays a marker on the map at the correct location.
- [ ] **No Console Errors**: Browser console is clean; no API key leaks; no unhandled promise rejections.
- [ ] **Keyboard Navigation**: Users can navigate suggestions with arrow keys and select with Enter (accessibility).

---

## Implementation Notes

### Security Best Practices
* **Never expose `FOURSQUARE_API_KEY` to the client**. All API calls must be proxied through Netlify Functions.
* Use `process.env.FOURSQUARE_API_KEY` only in the serverless functions.
* Ensure `.env.local` is in `.gitignore` to prevent accidental commits.

### Debouncing Strategy
Use a library like `lodash.debounce` or implement a simple debounce:
```typescript
const debounce = (fn: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};
```

### User Location for Search
To provide location-aware search suggestions, use:
* The user's geolocation (from Task 2's geolocation feature).
* Or the current map viewport center.
* Pass `latitude` and `longitude` to the `places-search` function for better results.

### Handling Large Result Sets
* Limit autocomplete results to 5-10 suggestions for better UX.
* Implement **pagination** if needed (fetch more results on scroll).
* Consider adding **search filters** (category, rating, etc.) in future iterations.

### Caching & Optimization
* Cache recent searches in `localStorage` to speed up repeated queries (optional).
* Implement request **deduplication** to avoid firing the same request twice simultaneously.
* Consider using `React Query` or similar library for advanced data fetching and caching.

### Accessibility
* Ensure the search input has a proper `label` and `aria-label`.
* Autocomplete suggestions should be keyboard-navigable (arrow keys, Enter to select).
* Use `role="listbox"` and `role="option"` for the dropdown.
* Announce suggestion results to screen readers (ARIA live regions).

---

## Dependencies

Ensure the following packages are installed:
* `@netlify/functions` (already available for serverless functions)

Optional but recommended:
* `lodash.debounce` (for debouncing search input)
* `react-query` or `swr` (for data fetching and caching)

Install with:
```bash
npm install lodash.debounce
npm install --save-dev @types/lodash.debounce
```

---

## Environment Variables

### Development (`.env.local`)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
FOURSQUARE_API_KEY=your-foursquare-api-key
```

> Note: No map API key is required — the map uses Leaflet + OpenStreetMap (tokenless, from Task 2).

### Production (Netlify UI)
Set the same variables in **Site settings > Build & deploy > Environment** on the Netlify dashboard.

---

## Next Steps (Sequence)

This task enables:
- **Task 4**: Place Details UI and Save Place functionality will use the markers and place details from this search feature.
- **Task 5**: Saved Places list will display previously searched and saved places.
- **Task 6+**: Adventures will use place search to build collections of destinations.
