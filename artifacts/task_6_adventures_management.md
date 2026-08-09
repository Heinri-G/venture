# Task 6: Adventures Management & Place Linking

## Context
With saved places now organized and visible (Task 5), users need a way to group these places into themed **Adventures** — curated collections of destinations for trips or special interests (e.g., "Coffee Crawl in SF", "Museums of Paris", "Best Hiking Spots"). This task implements the core adventure management features: creating adventures, linking saved places to adventures, reordering places within an adventure, editing adventure metadata, and viewing adventure details. Adventures form the foundation for collaboration (Task 7), social sharing, and public links. Each adventure belongs to a specific user (owner) but can later be shared with friends or groups.

---

## Requirements

### 1. Adventure Creation Flow
Create a **new adventure creation experience** with the following steps:

#### Step 1: Adventure Metadata Form
* Modal or dedicated page accessible from the Saved Places page or main navigation.
* Collect the following fields:
  - **Title** (required): Name of the adventure (e.g., "Coffee Crawl in SF").
  - **Description** (optional): Brief description of the adventure (e.g., "Best independent coffee shops in San Francisco").
  - **Cover Photo** (optional): Upload or select a photo to represent the adventure (uses Supabase Storage, similar to profile avatars).
* **Validation**:
  - Title is required and must be 1-100 characters.
  - Description can be up to 500 characters.
  - Cover photo is optional but recommended.

#### Step 2: Select & Order Places
* Display a list of the user's saved places (from `saved_places`).
* Allow users to select multiple places via checkboxes or toggle buttons.
* Once selected, provide a **drag-and-drop interface** to order the places within the adventure.
* Show selected places in a preview or separate section as they are added.
* Display place details (name, category, photo) as visual aids while selecting.
* Provide an "Add All" button to quickly add all saved places.
* Provide a "Clear All" button to deselect all places.

#### Step 3: Set Visibility & Collaboration
* **Visibility** dropdown with three options:
  - **Private**: Only the owner can see and edit (default).
  - **Shared**: Can be shared with specific friends or groups (Task 7).
  - **Public**: Anyone with a public link can view (Task 7).
* **Collaboration Toggle** (optional for now, needed in Task 7):
  - "Allow others to edit this adventure" (if shared).

#### Step 4: Review & Create
* Display a summary of the adventure:
  - Title, description, cover photo.
  - Number of places selected.
  - Visibility setting.
  - Map preview showing all selected places.
* "Create Adventure" button to save to the database.
* Show loading state and success message after creation.
* Optionally redirect to adventure detail view.

### 2. Adventure Database Model
* Ensure the `public.adventures` and `public.adventure_places` tables are properly set up (already defined in the schema).
* Key fields:
  - `adventures.id`: UUID.
  - `adventures.owner_id`: References `public.profiles(id)`.
  - `adventures.title`: Text.
  - `adventures.description`: Text.
  - `adventures.cover_photo_url`: Optional photo URL.
  - `adventures.visibility`: 'private', 'shared', or 'public'.
  - `adventures.allow_collaboration`: Boolean.
  - `adventures.created_at`, `adventures.updated_at`: Timestamps.
* Linking table:
  - `adventure_places.adventure_id`: References `public.adventures(id)`.
  - `adventure_places.saved_place_id`: References `public.saved_places(id)`.
  - `adventure_places.order_index`: Integer to maintain order.

### 3. Adventure List View
Create an **Adventures List page** accessible at `/adventures`:
* Display a list of the current user's adventures.
* Each adventure card shows:
  - **Cover Photo**: Thumbnail of the adventure's cover photo (or placeholder).
  - **Title**: Adventure name.
  - **Description Preview**: First 100 characters (with "..." if truncated).
  - **Place Count**: "5 places" or similar.
  - **Visibility Badge**: Shows if private, shared, or public.
  - **Last Updated**: "Updated 2 days ago" or similar.
  - **Action Buttons**: Edit, Delete, Share (Task 7), Export (nice-to-have).
* **Sorting Options**:
  - Recently Created (default).
  - Recently Updated.
  - Title (A-Z).
  - Most Places.
* **Filtering** (optional):
  - Filter by visibility (Private, Shared, Public).
* **Empty State**: "No adventures yet. Create your first adventure!" with link to creation flow.
* **Pagination**: Load adventures in batches (10-20 per page).

### 4. Adventure Detail View
Create a detailed adventure view at `/adventures/:id`:
* Display the full adventure with:
  - **Header**: Large cover photo, title, description, owner info.
  - **Stats**: Number of places, visibility, created/updated dates.
  - **Places Map**: Full-screen or large map showing all adventure places with markers and connecting lines (optional polyline route).
  - **Places List**: Ordered list of all places in the adventure:
    - Place name, category, photo.
    - User's rating and notes (if saved).
    - Sequential number (1, 2, 3, ...) indicating order.
    - Distance between consecutive places (optional, calculated).
  - **Action Buttons**:
    - Edit Adventure (if owner).
    - Delete Adventure (if owner, with confirmation).
    - Share Adventure (Task 7).
    - Export to PDF or other format (nice-to-have).
* If not the owner but the adventure is shared/public, show read-only view.

### 5. Edit & Reorder Places
* **Edit Adventure Metadata**: Allow the owner to update title, description, cover photo, and visibility.
* **Reorder Places**:
  - Provide a **drag-and-drop interface** on the detail view.
  - Or a dedicated edit mode with up/down arrow buttons to move places.
  - Changes should update `order_index` in `adventure_places` table.
  - Show success feedback after reordering.
* **Add/Remove Places**:
  - Allow adding more saved places to an existing adventure.
  - Allow removing specific places from an adventure (with confirmation).
  - Update the places list and map in real-time.

### 6. Delete Adventure
* Add a **Delete** button in the adventure detail view (owner only).
* Show a confirmation dialog: "Delete '[Adventure Name]'? This cannot be undone."
* On confirmation, cascade-delete:
  - All `adventure_places` entries (handled by database foreign key cascading).
  - The `adventure` record itself.
* Redirect to `/adventures` list after deletion.
* Show success message: "Adventure deleted."

### 7. Cover Photo Upload
* Similar to profile avatar upload (Task 1):
  - Allow users to upload or select a photo.
  - Upload to Supabase Storage under a `adventures` bucket (or subfolder).
  - Store the URL in `adventures.cover_photo_url`.
  - Handle upload errors gracefully.
* Optional: Allow choosing from unsplash or similar free photo sources.

### 8. Map Integration
* Display all adventure places on a map:
  - Markers for each place in sequential order (1, 2, 3, ...).
  - Optional: Connect places with a polyline showing the route.
  - Center map on all places (auto-fit bounds).
  - Click a marker or list item to highlight/zoom to that place.
* Sync list and map selection (same as Task 5).
* On mobile, provide a toggle between map and list view.

### 9. Mobile-First Responsive Design
* **Mobile (< 768px)**:
  - Creation flow spans multiple screens/steps (wizard pattern).
  - Detail view shows map first, then scrollable list below.
  - Drag-and-drop might use swipe gestures or a dedicated reorder mode.
* **Tablet/Desktop (≥ 768px)**:
  - Creation flow might show multiple steps side-by-side.
  - Detail view can show map and list side-by-side.
  - Drag-and-drop works with mouse or touch.

### 10. Route Protection & Permissions
* `/adventures` list: Accessible only to authenticated users.
* `/adventures/:id` detail:
  - Owner can view/edit.
  - Shared users can view (read-only) or edit (if collaboration enabled, Task 7).
  - Public adventures can be viewed by anyone with the link (but editing restricted to owner).
  - Implement RLS policies to enforce permissions.

---

## Target Files
* **Create**: `src/pages/Adventures.tsx` or `src/Adventures.tsx` (main adventures list page).
* **Create**: `src/pages/AdventureDetail.tsx` or `src/AdventureDetail.tsx` (detail view).
* **Create**: `src/pages/AdventureCreate.tsx` or `src/AdventureCreate.tsx` (creation flow).
* **Create**: `src/components/AdventureCreationForm.tsx` (reusable form for creating/editing adventures).
* **Create**: `src/components/PlaceSelector.tsx` (component for selecting and ordering places).
* **Create**: `src/components/AdventureMap.tsx` (map view showing adventure places with markers and optional polylines).
* **Modify**: `src/App.tsx` (add routes for `/adventures`, `/adventures/:id`, `/adventures/new`).
* **Modify**: `src/components/Layout.tsx` (add navigation link to adventures).
* **Modify**: `.env.example` (if any new storage buckets need configuration).

---

## API / Database Specs

### Supabase Table Schemas

#### `public.adventures` Table
```sql
CREATE TABLE public.adventures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_photo_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
  allow_collaboration BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `public.adventure_places` Table
```sql
CREATE TABLE public.adventure_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adventure_id UUID NOT NULL REFERENCES public.adventures(id) ON DELETE CASCADE,
  saved_place_id UUID NOT NULL REFERENCES public.saved_places(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  UNIQUE(adventure_id, saved_place_id)
);
```

### TypeScript Type Definitions
```typescript
interface Adventure {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  cover_photo_url: string | null;
  visibility: 'private' | 'shared' | 'public';
  allow_collaboration: boolean;
  created_at: string;
  updated_at: string;
}

interface AdventurePlace {
  id: string;
  adventure_id: string;
  saved_place_id: string;
  order_index: number;
  saved_place?: SavedPlaceWithDetails; // Nested relationship
}

interface AdventureWithPlaces extends Adventure {
  adventure_places: AdventurePlace[];
}
```

### Supabase Queries

#### Fetch User's Adventures
```typescript
const fetchUserAdventures = async (userId: string, page: number = 0) => {
  const pageSize = 10;
  const offset = page * pageSize;

  const { data, error, count } = await supabase
    .from('adventures')
    .select('*', { count: 'exact' })
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data, totalCount: count };
};
```

#### Fetch Adventure with Places
```typescript
const fetchAdventureWithPlaces = async (adventureId: string) => {
  const { data, error } = await supabase
    .from('adventures')
    .select(
      `
      id, owner_id, title, description, cover_photo_url, 
      visibility, allow_collaboration, created_at, updated_at,
      adventure_places(
        id, adventure_id, saved_place_id, order_index,
        saved_place:saved_places(
          id, user_id, place_id, rating, notes, created_at, updated_at,
          place:places(
            id, foursquare_fsq_id, name, address, latitude, longitude, 
            category, photo_url, created_at
          )
        )
      )
      `
    )
    .eq('id', adventureId)
    .single();

  if (error) throw error;
  
  // Sort adventure_places by order_index
  if (data?.adventure_places) {
    data.adventure_places.sort((a, b) => a.order_index - b.order_index);
  }

  return data;
};
```

#### Create Adventure
```typescript
const createAdventure = async (
  ownerId: string,
  title: string,
  description: string | null,
  coverPhotoUrl: string | null,
  visibility: 'private' | 'shared' | 'public',
  allowCollaboration: boolean = false
) => {
  const { data, error } = await supabase
    .from('adventures')
    .insert({
      owner_id: ownerId,
      title,
      description,
      cover_photo_url: coverPhotoUrl,
      visibility,
      allow_collaboration: allowCollaboration,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
```

#### Link Saved Places to Adventure
```typescript
const linkPlacesToAdventure = async (
  adventureId: string,
  savedPlaceIds: Array<{ id: string; orderIndex: number }>
) => {
  const adventurePlaces = savedPlaceIds.map(({ id, orderIndex }) => ({
    adventure_id: adventureId,
    saved_place_id: id,
    order_index: orderIndex,
  }));

  const { error } = await supabase
    .from('adventure_places')
    .insert(adventurePlaces);

  if (error) throw error;
};
```

#### Update Adventure Metadata
```typescript
const updateAdventure = async (
  adventureId: string,
  updates: Partial<{
    title: string;
    description: string | null;
    cover_photo_url: string | null;
    visibility: 'private' | 'shared' | 'public';
    allow_collaboration: boolean;
  }>
) => {
  const { data, error } = await supabase
    .from('adventures')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adventureId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
```

#### Reorder Adventure Places
```typescript
const reorderAdventurePlaces = async (
  adventurePlaceIds: Array<{ id: string; newOrderIndex: number }>
) => {
  const updates = adventurePlaceIds.map(({ id, newOrderIndex }) => ({
    id,
    order_index: newOrderIndex,
  }));

  // Batch update: call update for each place
  for (const update of updates) {
    const { error } = await supabase
      .from('adventure_places')
      .update({ order_index: update.order_index })
      .eq('id', update.id);
    if (error) throw error;
  }
};
```

#### Delete Adventure
```typescript
const deleteAdventure = async (adventureId: string) => {
  const { error } = await supabase
    .from('adventures')
    .delete()
    .eq('id', adventureId);

  if (error) throw error;
};
```

#### Remove Place from Adventure
```typescript
const removePlaceFromAdventure = async (adventurePlaceId: string) => {
  const { error } = await supabase
    .from('adventure_places')
    .delete()
    .eq('id', adventurePlaceId);

  if (error) throw error;
};
```

---

## Verification Checklist

- [ ] **Adventures Route Protected**: `/adventures` and `/adventures/:id` redirect to `/login` if user not authenticated.
- [ ] **Navigation Link**: Layout includes link to adventures.
- [ ] **Adventure Creation Form**: All fields (title, description, cover photo) render and validate correctly.
- [ ] **Place Selection**: Users can select multiple saved places via checkboxes.
- [ ] **Drag-and-Drop Reordering**: Places can be reordered in the selection interface; order_index updates in database.
- [ ] **Visibility & Collaboration**: Visibility dropdown and collaboration toggle render and save correctly.
- [ ] **Create Button**: "Create Adventure" saves adventure and all linked places to database; redirects to detail view.
- [ ] **Adventure List**: `/adventures` displays all user's adventures with cover photo, title, description preview, place count, and visibility badge.
- [ ] **Sorting**: Adventures can be sorted by recent, updated, title, or place count.
- [ ] **Empty State**: Shows friendly message when no adventures exist.
- [ ] **Adventure Detail View**: `/adventures/:id` displays full adventure with title, description, cover photo, places map, and ordered list.
- [ ] **Places Map**: Map shows all adventure places with numbered markers; bounds adjust to fit all places.
- [ ] **Places List**: Ordered list shows all places with sequential numbers; clicking item highlights on map.
- [ ] **Edit Adventure**: Owner can edit title, description, cover photo, visibility; changes persist.
- [ ] **Add Places**: Can add more saved places to an existing adventure.
- [ ] **Remove Places**: Can remove individual places with confirmation; adventure_places record deleted.
- [ ] **Reorder Places**: Can drag-and-drop or use buttons to reorder places; order_index updates; map/list reflect new order.
- [ ] **Delete Adventure**: "Delete Adventure" button with confirmation dialog; deletes adventure and all linked places; redirects to list.
- [ ] **Cover Photo Upload**: Photo uploads to Supabase Storage; URL saved to database.
- [ ] **Permissions**: Non-owner users cannot edit/delete (even if viewing shared adventure).
- [ ] **Mobile Responsive**: Creation flow and detail view adapt well to mobile screens.
- [ ] **Pagination**: Adventures load in batches; "Load More" or pagination controls work.
- [ ] **Loading States**: Spinners appear during data fetches; success/error messages display.
- [ ] **No Console Errors**: Clean browser console; no unhandled rejections; RLS policies enforce access control.

---

## Implementation Notes

### Creation Flow as Multi-Step Wizard
Consider using a state machine or step counter:
```typescript
const [step, setStep] = useState<'metadata' | 'places' | 'visibility' | 'review'>(
  'metadata'
);

const nextStep = () => {
  // Validate current step before proceeding
  setStep((s) => /* next step */);
};

const previousStep = () => {
  setStep((s) => /* previous step */);
};
```

### Drag-and-Drop Implementation
Use a library like:
* **React Beautiful DnD** (popular, accessible)
* **dnd-kit** (modern, hooks-based)
* **React Sortable** (simpler, lighter weight)

Example with React Beautiful DnD:
```typescript
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable droppableId="places-list">
    {(provided) => (
      <div {...provided.droppableProps} ref={provided.innerRef}>
        {places.map((place, index) => (
          <Draggable key={place.id} draggableId={place.id} index={index}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                {place.name}
              </div>
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
</DragDropContext>
```

### Cover Photo Upload
Reuse the avatar upload pattern from Task 1:
```typescript
const uploadCoverPhoto = async (file: File, adventureId: string) => {
  const ext = file.name.split('.').pop();
  const filePath = `${adventureId}/cover.${ext}`;
  
  const { error: uploadError } = await supabase.storage
    .from('adventures')
    .upload(filePath, file, { upsert: true });
  
  if (uploadError) throw uploadError;
  
  const { data } = supabase.storage.from('adventures').getPublicUrl(filePath);
  return data?.publicUrl;
};
```

### Polyline Display (Optional)
Show a route connecting places on the map:
```typescript
// Create GeoJSON LineString from ordered places
const coordinates = adventurePlaces.map(p => [
  p.saved_place.place.longitude,
  p.saved_place.place.latitude
]);

map.addSource('route', {
  type: 'geojson',
  data: {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates,
    },
  },
});

map.addLayer({
  id: 'route',
  type: 'line',
  source: 'route',
  paint: {
    'line-color': '#4F46E5',
    'line-width': 3,
  },
});
```

### Sequential Numbering on Map
Display 1, 2, 3, ... on each marker:
```typescript
// Use custom Leaflet divIcon markers with text
const createNumberedIcon = (index: number) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width: 32px; height: 32px; border-radius: 50%;
      background-color: #4F46E5; color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: bold;
    ">${index + 1}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

adventure_places.forEach((ap, index) => {
  L.marker([ap.saved_place.place.latitude, ap.saved_place.place.longitude], {
    icon: createNumberedIcon(index),
  }).addTo(map);
});
```

### Calculating Distance Between Consecutive Places
```typescript
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
```

### RLS Policies for Adventures
Verify these policies exist in the database:
```sql
-- Owners can view their own adventures
CREATE POLICY "Users can view own adventures" ON public.adventures
  FOR SELECT USING (owner_id = auth.uid() OR visibility = 'public');

-- Owners can insert adventures
CREATE POLICY "Users can insert own adventures" ON public.adventures
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Owners can update their own adventures
CREATE POLICY "Users can update own adventures" ON public.adventures
  FOR UPDATE USING (owner_id = auth.uid());

-- Owners can delete their own adventures
CREATE POLICY "Users can delete own adventures" ON public.adventures
  FOR DELETE USING (owner_id = auth.uid());
```

### Performance Optimization
* Memoize adventure cards and place list items with `React.memo()`.
* Use `useCallback` for reorder and selection handlers.
* Lazy-load cover photos using `loading="lazy"` or intersection observer.
* Implement virtual scrolling for very large adventure lists (100+ adventures).

### Accessibility
* Wizard steps should have numbered labels and progress indicator.
* Drag-and-drop should have keyboard alternatives (arrow keys to move, Enter to confirm).
* Map markers should be keyboard-navigable.
* Form inputs should have proper labels and error messages.
* Confirmation dialogs should use `role="alertdialog"` and require explicit confirmation.

---

## Dependencies

Ensure the following are installed:
* `@supabase/supabase-js` (already installed)
* `react-leaflet` (from Task 2)
* `lucide-react` (for icons)

Recommended drag-and-drop library:
* `react-beautiful-dnd`

Install:
```bash
npm install react-beautiful-dnd
npm install --save-dev @types/react-beautiful-dnd
```

Or alternative:
```bash
npm install dnd-kit @dnd-kit/sortable @dnd-kit/utilities
```

---

## Environment Variables

No new variables needed. Ensure the `adventures` storage bucket exists in Supabase:
* Navigate to Supabase Dashboard > Storage.
* Create a new bucket named `adventures`.
* Set it to public (or manage permissions via RLS).

---

## Next Steps (Sequence)

This task enables:
- **Task 7**: Adventure sharing, collaboration, and public links will build on this foundation.
- **Task 8**: Social features (friends, groups) will allow collaborative editing of adventures.
