# Task 4: Place Details UI & Save Place Functionality

## Context
Now that users can search for and discover places on the map (Task 3), they need a way to view detailed information about each place and save their favorites to the app. This task implements a **Place Details UI** (typically a bottom sheet on mobile) that displays comprehensive place information, allows users to rate and add personal notes, and enables saving the place to the Supabase `saved_places` table for later access. The saved places become the foundation for building Adventures (Task 6) and viewing saved collections (Task 5).

---

## Requirements

### 1. Place Details Component
Create `src/components/PlaceDetails.tsx` that:
* Displays a **bottom sheet or modal** (mobile-first approach) with place information.
* Shows the following place details:
  - **Name**: Place title (large, prominent).
  - **Category**: Type of venue (e.g., "Coffee Shop", "Museum").
  - **Address**: Full formatted address with link to open in maps app (optional).
  - **Phone**: Clickable phone number (tel: link).
  - **Website**: Clickable website URL.
  - **Hours**: Operating hours (if available).
  - **Photo**: Primary place photo (if available) displayed at the top or in a carousel.
  - **Distance**: Distance from user's current location (if available).
* Supports **dismissing** the sheet/modal by:
  - Swiping down (on mobile).
  - Clicking an X button.
  - Clicking outside the modal (if modal).
  - Pressing Escape key.

### 2. Interaction Controls
Add interactive elements to the Place Details component:
* **Rating Input**: A 5-star rating widget allowing users to rate the place (1-5 stars).
  - Only saves to the database when the Save button is clicked (not on every star click).
  - Display the user's saved rating if they've already rated this place.
* **Notes Input**: A textarea for users to add personal notes or comments about the place.
  - Placeholder text: "Add your notes..." or similar.
  - Store up to 500 characters (or configurable).
  - Show character count (e.g., "45/500").
* **Save Button**: A prominent "Save Place" or "Add to Saved" button.
  - Changes to "Remove from Saved" if the place is already saved.
  - Shows loading state while saving (e.g., "Saving...").
  - Displays success/error feedback (optional toast notification or inline message).
* **Share Button**: Optional "Share" button to share the place (preparation for Task 7+).

### 3. Database Integration (saved_places Table)
* On clicking "Save Place", upsert the place to the Supabase `saved_places` table with:
  - `user_id`: Current authenticated user's ID.
  - `place_id`: UUID of the place in the `public.places` table (or create if doesn't exist).
  - `rating`: The user's star rating (1-5, nullable).
  - `notes`: User's custom notes (nullable).
  - `created_at`: Auto-timestamp on first save.
  - `updated_at`: Auto-timestamp on update.
* **Unique Constraint**: The database has a `UNIQUE(user_id, place_id)` constraint to prevent duplicates.
* Use Supabase client `.from('saved_places').upsert()` for the operation.

### 4. Foursquare Place Syncing
* When saving a place from the Foursquare search results:
  - First, check if the place exists in the `public.places` table using the Foursquare `fsq_id`.
  - If not, create a new place record with:
    - `foursquare_fsq_id`: The unique Foursquare ID.
    - `name`: Place name.
    - `address`: Formatted address.
    - `latitude`, `longitude`: Coordinates.
    - `category`: Primary category.
    - `photo_url`: URL of the primary photo (if available).
  - Then, create/update the `saved_place` entry linking the user to that place.

### 5. State Management & Props
* The PlaceDetails component should accept:
  ```typescript
  interface PlaceDetailsProps {
    place: PlaceResult; // From Foursquare search (Task 3)
    isOpen: boolean;
    onClose: () => void;
    onSave?: (savedPlace: SavedPlace) => void; // Callback after successful save
  }
  ```
* Use React hooks to manage:
  - User's rating and notes for the current place.
  - Loading state while saving to the database.
  - Whether the place is already saved by the current user.
  - Error messages if save operation fails.
* Fetch existing rating/notes on mount (if user is authenticated and place is already saved).

### 6. Mobile-First UI
* **Bottom Sheet** (recommended for mobile):
  - Slides up from the bottom of the screen.
  - Draggable handle at the top for closing.
  - Scrollable content area for long place descriptions.
  - Buttons (Save, Share, etc.) fixed at the bottom of the sheet.
  - Smooth animations on open/close.
* **Photo Display**:
  - Large, high-quality image at the top (if available).
  - Fallback to a neutral placeholder if no photo.
  - Optional: Carousel for multiple photos (nice-to-have).
* **Responsive Behavior**:
  - On desktop, may display as a modal or side panel instead of bottom sheet.
  - Ensure all content is readable on small mobile screens.

### 7. Authentication & Permission Checks
* Only authenticated users can save places.
* If the user is not logged in, show a message: "Sign in to save this place" with a link to `/login`.
* After login, the place details should remain available for saving.

### 8. Integration with MapView & PlacesSearch
* Update `src/components/MapView.tsx` to:
  - Accept and render a `PlaceDetails` component.
  - Handle click events on map markers to open the Place Details sheet.
  - Pass selected place data to the PlaceDetails component.
* Update `src/components/PlacesSearch.tsx` to:
  - Emit the selected place when a suggestion is clicked.
  - Trigger opening the Place Details sheet in the parent MapView.

---

## Target Files
* **Create**: `src/components/PlaceDetails.tsx` (Place details UI, rating, notes, save functionality).
* **Modify**: `src/components/MapView.tsx` (integrate PlaceDetails component, handle marker clicks).
* **Modify**: `src/components/PlacesSearch.tsx` (emit selected place event).
* **Reference**: Database schema already has `public.places` and `public.saved_places` tables (verify via supabase/schema.sql).
* **Modify**: `.env.example` (optional: if any new vars needed).

---

## API / Database Specs

### Supabase Table Schemas

#### `public.places` Table
```sql
CREATE TABLE public.places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  foursquare_fsq_id TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  category TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `public.saved_places` Table
```sql
CREATE TABLE public.saved_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  notes TEXT,
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);
```

### Supabase RLS Policies
The database already has RLS enabled. Verify these policies exist:
```sql
-- Users can view their own saved places
CREATE POLICY "Users can view own saved places" ON public.saved_places
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own saved places" ON public.saved_places
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own saved places" ON public.saved_places
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own saved places" ON public.saved_places
  FOR DELETE USING (user_id = auth.uid());
```

### Frontend Data Structures
```typescript
interface PlaceResult {
  fsq_id: string;
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

interface SavedPlace {
  id: string; // UUID
  user_id: string;
  place_id: string;
  notes: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

interface Place {
  id: string; // UUID
  foursquare_fsq_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  photo_url: string | null;
  created_at: string;
}
```

### Supabase Client Operations

#### Check if Place Exists
```typescript
const { data, error } = await supabase
  .from('places')
  .select('id')
  .eq('foursquare_fsq_id', foursquarePlaceId)
  .single();

// If error (no results), place doesn't exist yet
```

#### Create New Place
```typescript
const { data: newPlace, error } = await supabase
  .from('places')
  .insert({
    foursquare_fsq_id: place.fsq_id,
    name: place.name,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    category: place.category,
    photo_url: place.photoUrl || null,
  })
  .select('id')
  .single();

const placeId = newPlace?.id;
```

#### Upsert Saved Place
```typescript
const { data: savedPlace, error } = await supabase
  .from('saved_places')
  .upsert({
    user_id: userId,
    place_id: placeId,
    rating: userRating || null,
    notes: userNotes || null,
  }, { onConflict: 'user_id, place_id' })
  .select()
  .single();
```

#### Fetch Existing Saved Place
```typescript
const { data: existingSavedPlace, error } = await supabase
  .from('saved_places')
  .select('*')
  .eq('user_id', userId)
  .eq('place_id', placeId)
  .single();
```

#### Delete Saved Place
```typescript
const { error } = await supabase
  .from('saved_places')
  .delete()
  .eq('user_id', userId)
  .eq('place_id', placeId);
```

---

## Verification Checklist

- [ ] **Place Details Sheet Opens**: Clicking a map marker or search result opens the bottom sheet/modal with place details.
- [ ] **Place Info Displays**: Name, category, address, phone, website, hours, and photo all render correctly.
- [ ] **Rating Widget Works**: Users can click stars to rate 1-5; rating persists when component re-opens.
- [ ] **Notes Input Works**: Users can type and edit notes; character count displays correctly (if implemented).
- [ ] **Save Button Works**: Clicking "Save Place" creates/updates a record in `public.saved_places`.
- [ ] **Foursquare Sync**: Places from Foursquare are automatically added to `public.places` if not already present.
- [ ] **Duplicate Prevention**: Saving the same place twice updates the existing record (no duplicates due to UNIQUE constraint).
- [ ] **Authentication Check**: Non-authenticated users see "Sign in to save" message with link to login.
- [ ] **Authenticated Save**: Authenticated users can successfully save/update places with rating and notes.
- [ ] **Remove Place**: "Remove from Saved" button successfully deletes the saved place record.
- [ ] **Loading States**: "Saving..." and other loading indicators display during async operations.
- [ ] **Error Handling**: Database errors are caught and displayed to the user (e.g., "Failed to save place").
- [ ] **Mobile Responsive**: Bottom sheet looks good on mobile; text is readable; buttons are easily tappable.
- [ ] **Accessibility**: Form inputs have labels; rating stars are keyboard-navigable; dismiss methods (Escape, X, swipe) all work.
- [ ] **No Console Errors**: Browser console is clean; no unhandled promise rejections; auth checks work correctly.

---

## Implementation Notes

### Bottom Sheet Implementation
Consider using a library like:
* **Headless UI / Radix Dialog** (unstyled, highly customizable)
* **Radix UI Dialog** with Tailwind CSS for styling
* **Custom CSS** using `transform`, `transition`, and positioning (simpler approach)

Mobile-optimized bottom sheet example:
```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px 16px 0 0;
  background: white;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
```

### Handling Large Photos
* Use image optimization: downscale photos on the client or use a CDN with image resizing.
* Load photos lazily to avoid blocking page load.
* Consider a carousel library (e.g., `swiper` or `embla-carousel`) for multiple photos.

### Rating Persistence
* On component mount, fetch existing saved place data for the current user.
* Populate rating and notes fields with existing data.
* Show visual feedback (e.g., "You rated this 4 stars") if already saved.

### Notes & Validation
* Limit notes to 500 characters (enforced on client and database level).
* Trim whitespace on save.
* Warn user if they try to close without saving changes (optional).

### Geolocation for Distance Calculation
* Use the user's current location (from Task 2's geolocation) to calculate distance.
* Display distance in miles or kilometers (based on user preference/locale).
* Update distance in real-time as map viewport changes (optional).

### Error Recovery
* If save fails, show a retry button.
* Log errors to a monitoring service (Sentry, etc.) for debugging.
* Provide user-friendly error messages (avoid technical jargon).

### Performance Optimization
* Memoize the PlaceDetails component with `React.memo()` to prevent unnecessary re-renders.
* Use `useCallback` for handlers that might trigger re-renders.
* Lazy-load the bottom sheet component if needed.

### Accessibility
* Rating stars should have `aria-label` (e.g., "Rate 1 star", "Rate 5 stars").
* Notes textarea should have `aria-label` and `aria-describedby` for character limits.
* Bottom sheet should use `role="dialog"` and `aria-modal="true"`.
* Focus should trap within the sheet while open (return to trigger on close).

---

## Dependencies

Ensure the following packages are installed (already present from initial setup):
* `@supabase/supabase-js` (for database operations)
* `lucide-react` (for icons: star, phone, globe, X, etc.)

Optional for bottom sheet:
* `@radix-ui/react-dialog` or custom CSS-based implementation

Install if needed:
```bash
npm install @radix-ui/react-dialog
npm install lucide-react
```

---

## Environment Variables

No new environment variables needed for this task. Existing variables are sufficient:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Database Verification

Before implementing, verify that the `public.places` and `public.saved_places` tables exist and have the correct schema:

```bash
# Connect to Supabase CLI or use the Dashboard UI
supabase db pull  # Pull the latest schema
```

Check `supabase/schema.sql` to confirm both tables and their RLS policies are defined.

---

## Next Steps (Sequence)

This task enables:
- **Task 5**: Saved Places list view will display all saved places and sync with the map.
- **Task 6**: Adventure creation will allow users to organize saved places into collections.
- **Task 7+**: Sharing and collaboration features will build on saved places.
