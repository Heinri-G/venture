# Task 7: Adventure Sharing, Collaboration & Public Links

## Context
With adventures now fully functional (Task 6), users need the ability to share them with friends and groups, as well as make adventures publicly accessible via shareable links. This task implements three core sharing features: (1) **Visibility Controls** to enforce private/shared/public access levels, (2) **Public Share Links** that generate shareable URLs for public adventures with read-only viewer pages, and (3) **Collaboration Settings** that allow shared adventure owners to grant editing permissions to friends or group members. These features transform adventures from personal collections into social experiences and collaborative planning tools.

---

## Requirements

### 1. Visibility Enforcement & Access Control
Implement strict access control based on the `visibility` field in the `public.adventures` table:

#### Private Adventures
* Only the owner can view and edit.
* Non-owners receive a "404 Not Found" or "Access Denied" error when trying to access `/adventures/:id`.
* Private adventures do not appear in any public/shared lists.

#### Shared Adventures
* Only users explicitly granted access (via `adventure_shares` or group membership) can view.
* Sharing can be:
  - **With specific friends**: Upsert rows in `public.adventure_shares` with `shared_with_user_id`.
  - **With specific groups**: Upsert rows in `public.adventure_shares` with `shared_with_group_id`.
* If `allow_collaboration` is true, shared users can edit the adventure.
* Non-shared users cannot access even if they have the direct link.

#### Public Adventures
* Anyone with the direct link can view the adventure.
* Viewing is read-only (no editing for non-owners, even if `allow_collaboration` is true).
* Public adventures appear in a discoverable public gallery or search results (Task 8 or future).

### 2. Adventure Sharing UI
Add a **Share Adventure** interface accessible from the adventure detail view:

#### Share Modal/Sheet
* Accessible only to the adventure owner.
* Contains the following sections:

##### Share Settings (Already Set in Adventure Metadata)
* Display current visibility setting (Private, Shared, Public).
* Allow changing visibility from this modal.
* Warn user about implications (e.g., "Making this public will allow anyone with the link to view").

##### Share with Specific Friends (for Shared Visibility)
* Display a searchable list or autocomplete of the user's friends.
* Allow selecting multiple friends.
* For each shared friend, show a toggle for "Can edit" permission.
* Button to "Share with selected friends".
* Display list of already-shared friends with remove buttons.

##### Share with Groups (for Shared Visibility)
* Display a list of groups the user is a member of.
* Allow selecting multiple groups.
* For each group, option to allow "group members can edit" or "read-only".
* Button to "Share with selected groups".
* Display list of already-shared groups with remove buttons.

##### Copy Public Link (for Public Visibility)
* If adventure is public, display the shareable public URL (e.g., `https://venture.example.com/adventures/public/:publicId`).
* "Copy to Clipboard" button with confirmation feedback.
* "Share via..." buttons (optional) for social media or messaging.
* Preview what others will see when accessing the link.

### 3. Public Share Links & URL Generation
Generate shareable URLs for public adventures:

#### Public URL Structure
* Format: `/adventures/public/:publicToken` or similar.
* Do NOT use the internal adventure UUID in the public URL (security/privacy).
* Generate a unique, obfuscated token (e.g., 12-16 character alphanumeric string) stored in the database.
* Store the token in a new column `public_link_token` on the `adventures` table (or separate table if preferred).

#### URL Generation Logic
```typescript
// Generate a unique token
const generatePublicToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Store token and return public URL
const generatePublicShareLink = async (adventureId: string) => {
  const token = generatePublicToken();
  await supabase
    .from('adventures')
    .update({ public_link_token: token })
    .eq('id', adventureId);
  
  return `https://venture.example.com/adventures/public/${token}`;
};
```

#### Public View Page
* Create a new route `/adventures/public/:publicToken` that:
  - Queries the `adventures` table by `public_link_token`.
  - Verifies `visibility = 'public'`.
  - Displays the adventure in **read-only mode** (no edit buttons, disabled form inputs).
  - Shows all adventure details (cover photo, title, description, places map, ordered list).
  - Includes buttons to:
    - **View on Map** (standalone map of all places).
    - **Save to My Adventures** (copy adventure to the user's own saved adventures, if authenticated).
    - **Share** (social sharing or copy link).
  - Does NOT require authentication (publicly accessible).

### 4. Collaboration Settings
If an adventure is shared and `allow_collaboration` is enabled, shared users can edit:

#### Editing Permissions by Visibility
* **Private**: Only owner can edit.
* **Shared with Collaboration ON**: Owner + explicitly shared friends/group members can edit.
* **Shared with Collaboration OFF**: Only owner can edit (read-only for shared users).
* **Public**: Only owner can edit (read-only for public viewers).

#### Shared User Editing Capabilities
If a user has edit permission, they can:
* Update adventure metadata (title, description, cover photo).
* Add/remove places from the adventure.
* Reorder places.
* Edit visibility and collaboration settings (optional, or restrict to owner).
* Cannot delete the adventure (only owner).

#### Edit Lock (Optional)
* Implement optimistic locking or last-write-wins strategy for concurrent edits.
* Show a warning if the adventure is being edited by another user simultaneously (nice-to-have).

### 5. Adventure Shares Database Table
Ensure the `public.adventure_shares` table is properly configured:

```sql
CREATE TABLE public.adventure_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adventure_id UUID NOT NULL REFERENCES public.adventures(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with_group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (shared_with_user_id IS NOT NULL AND shared_with_group_id IS NULL) OR
    (shared_with_user_id IS NULL AND shared_with_group_id IS NOT NULL)
  )
);
```

### 6. Updated Adventure Schema
Ensure the `public.adventures` table includes:
* `public_link_token` (optional, nullable TEXT, unique): For public share links.
* `allow_collaboration` (BOOLEAN DEFAULT false): Already exists.
* `visibility` ('private', 'shared', 'public'): Already exists.

### 7. RLS Policies for Sharing
Implement or verify RLS policies:
* Users can view shared adventures if they are listed in `adventure_shares`.
* Users can view public adventures (visibility = 'public').
* Only owners can edit adventures (and explicitly shared users if collaboration enabled).
* Only owners can share adventures.

### 8. Copy Adventure Feature
Allow users to save a copy of a public/shared adventure to their own collection:

#### Copy Adventure Flow
* From the public view page, show a "Save to My Adventures" button.
* On click, check if the user is authenticated.
* If authenticated:
  - Create a new adventure owned by the current user.
  - Copy all adventure metadata (title, description, but NOT cover photo URL as it might be permission-restricted).
  - Copy all linked places (create new `adventure_places` entries).
  - Optionally add "(Copy of [Original Title])" to distinguish from the original.
  - Redirect to the new adventure's edit view.
* If not authenticated, show a "Sign in to save" prompt.

### 9. Share Notifications (Optional, Future)
* Optionally send notifications to shared friends/group members when an adventure is shared.
* Update notification badges in the UI.
* Create a notification system (Task 8+ or later iteration).

### 10. Mobile-First UI & UX
* Share modal should display as a full-screen modal or bottom sheet on mobile.
* "Copy to Clipboard" feedback should be clear (e.g., "Link copied!").
* Public view page should be responsive and work seamlessly on mobile.
* Friend/group selection lists should be scrollable and tappable.

---

## Target Files
* **Create**: `src/pages/AdventurePublicView.tsx` (public read-only adventure viewer).
* **Create**: `src/components/ShareAdventureModal.tsx` (sharing UI with friends/groups/public link).
* **Create**: `src/components/PublicShareLink.tsx` (display and copy public link section).
* **Create**: `src/hooks/useAdventureSharing.ts` (custom hook for sharing logic, optional).
* **Modify**: `src/App.tsx` (add `/adventures/public/:publicToken` route).
* **Modify**: `src/pages/AdventureDetail.tsx` (add Share button, enforce edit permissions based on sharing).
* **Modify**: `src/lib/supabase/client.ts` (if custom RLS helpers are needed).
* **Reference**: Ensure `public.adventure_shares` table exists and RLS policies are in place.

---

## API / Database Specs

### Updated `public.adventures` Table Schema
```sql
ALTER TABLE public.adventures ADD COLUMN public_link_token TEXT UNIQUE;
```

### `public.adventure_shares` Table (Already Defined)
```sql
CREATE TABLE public.adventure_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adventure_id UUID NOT NULL REFERENCES public.adventures(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with_group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (shared_with_user_id IS NOT NULL AND shared_with_group_id IS NULL) OR
    (shared_with_user_id IS NULL AND shared_with_group_id IS NOT NULL)
  )
);
```

### TypeScript Type Definitions
```typescript
interface AdventureShare {
  id: string;
  adventure_id: string;
  shared_with_user_id?: string;
  shared_with_group_id?: string;
  created_at: string;
}

interface ShareOptions {
  friendIds?: string[];
  groupIds?: string[];
  visibility: 'private' | 'shared' | 'public';
  allowCollaboration?: boolean;
}

interface PublicAdventure {
  id: string;
  title: string;
  description: string | null;
  cover_photo_url: string | null;
  visibility: 'public';
  owner: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  adventure_places: Array<{
    order_index: number;
    saved_place: SavedPlaceWithDetails;
  }>;
}
```

### Supabase Queries

#### Fetch Adventure with Share Info
```typescript
const fetchAdventureWithShares = async (adventureId: string) => {
  const { data, error } = await supabase
    .from('adventures')
    .select(
      `
      id, owner_id, title, description, cover_photo_url, 
      visibility, allow_collaboration, public_link_token, 
      created_at, updated_at,
      adventure_places(
        id, adventure_id, saved_place_id, order_index,
        saved_place:saved_places(
          id, user_id, place_id, rating, notes,
          place:places(
            id, foursquare_fsq_id, name, address, latitude, longitude, 
            category, photo_url
          )
        )
      ),
      adventure_shares(
        id, shared_with_user_id, shared_with_group_id
      )
      `
    )
    .eq('id', adventureId)
    .single();

  if (error) throw error;
  return data;
};
```

#### Fetch Public Adventure by Token
```typescript
const fetchPublicAdventureByToken = async (publicToken: string) => {
  const { data, error } = await supabase
    .from('adventures')
    .select(
      `
      id, owner_id, title, description, cover_photo_url, 
      visibility, created_at,
      owner:owner_id(id, display_name, avatar_url),
      adventure_places(
        order_index,
        saved_place:saved_places(
          id, user_id, place_id, rating, notes,
          place:places(
            id, name, address, latitude, longitude, category, photo_url
          )
        )
      )
      `
    )
    .eq('public_link_token', publicToken)
    .eq('visibility', 'public')
    .single();

  if (error) throw error;
  return data;
};
```

#### Share Adventure with Friends
```typescript
const shareAdventureWithFriends = async (
  adventureId: string,
  friendIds: string[]
) => {
  const shares = friendIds.map((friendId) => ({
    adventure_id: adventureId,
    shared_with_user_id: friendId,
  }));

  const { error } = await supabase
    .from('adventure_shares')
    .insert(shares, { onConflict: 'adventure_id, shared_with_user_id' });

  if (error) throw error;
};
```

#### Share Adventure with Groups
```typescript
const shareAdventureWithGroups = async (
  adventureId: string,
  groupIds: string[]
) => {
  const shares = groupIds.map((groupId) => ({
    adventure_id: adventureId,
    shared_with_group_id: groupId,
  }));

  const { error } = await supabase
    .from('adventure_shares')
    .insert(shares, { onConflict: 'adventure_id, shared_with_group_id' });

  if (error) throw error;
};
```

#### Update Visibility & Generate Public Link
```typescript
const updateAdventureVisibility = async (
  adventureId: string,
  visibility: 'private' | 'shared' | 'public'
) => {
  const token = visibility === 'public' ? generatePublicToken() : null;

  const { data, error } = await supabase
    .from('adventures')
    .update({
      visibility,
      public_link_token: token,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adventureId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
```

#### Remove Share (Revoke Access)
```typescript
const removeAdventureShare = async (shareId: string) => {
  const { error } = await supabase
    .from('adventure_shares')
    .delete()
    .eq('id', shareId);

  if (error) throw error;
};
```

#### Copy Adventure
```typescript
const copyAdventure = async (
  sourceAdventureId: string,
  newOwnerId: string
) => {
  // 1. Fetch source adventure
  const sourceAdventure = await fetchAdventureWithShares(sourceAdventureId);

  // 2. Create new adventure
  const { data: newAdventure, error: createError } = await supabase
    .from('adventures')
    .insert({
      owner_id: newOwnerId,
      title: `Copy of ${sourceAdventure.title}`,
      description: sourceAdventure.description,
      cover_photo_url: null, // Don't copy photo URL (may not be accessible)
      visibility: 'private', // Default to private
      allow_collaboration: false,
    })
    .select()
    .single();

  if (createError) throw createError;

  // 3. Copy adventure places
  const newAdventurePlaces = sourceAdventure.adventure_places.map(
    (ap: any) => ({
      adventure_id: newAdventure.id,
      saved_place_id: ap.saved_place_id,
      order_index: ap.order_index,
    })
  );

  const { error: linkError } = await supabase
    .from('adventure_places')
    .insert(newAdventurePlaces);

  if (linkError) throw linkError;

  return newAdventure;
};
```

#### Fetch User's Shared Adventures
```typescript
const fetchSharedAdventures = async (userId: string) => {
  const { data, error } = await supabase
    .from('adventure_shares')
    .select(
      `
      adventure:adventure_id(
        id, owner_id, title, description, cover_photo_url, 
        visibility, allow_collaboration, created_at, updated_at
      )
      `
    )
    .eq('shared_with_user_id', userId);

  if (error) throw error;

  // Filter to unique adventures
  const uniqueAdventures = Array.from(
    new Map(data.map((s) => [s.adventure.id, s.adventure])).values()
  );

  return uniqueAdventures;
};
```

---

## RLS Policies for Sharing

Verify or implement these policies:

```sql
-- Users can view own adventures and public adventures
CREATE POLICY "Users can view own or public adventures" ON public.adventures
  FOR SELECT USING (
    owner_id = auth.uid()
    OR visibility = 'public'
    OR (
      visibility = 'shared'
      AND (
        EXISTS (
          SELECT 1 FROM adventure_shares
          WHERE adventure_id = id
          AND shared_with_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM adventure_shares
          JOIN group_members ON adventure_shares.shared_with_group_id = group_members.group_id
          WHERE adventure_shares.adventure_id = id
          AND group_members.user_id = auth.uid()
        )
      )
    )
  );

-- Only owners can update adventures
CREATE POLICY "Users can update own adventures" ON public.adventures
  FOR UPDATE USING (owner_id = auth.uid());

-- Only owners can delete adventures
CREATE POLICY "Users can delete own adventures" ON public.adventures
  FOR DELETE USING (owner_id = auth.uid());

-- View adventure shares
CREATE POLICY "Users can view adventure shares" ON public.adventure_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM adventures
      WHERE adventures.id = adventure_id
      AND adventures.owner_id = auth.uid()
    )
    OR shared_with_user_id = auth.uid()
  );

-- Only owners can insert/delete adventure shares
CREATE POLICY "Only owners can share adventures" ON public.adventure_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM adventures
      WHERE adventures.id = adventure_id
      AND adventures.owner_id = auth.uid()
    )
  );

CREATE POLICY "Only owners can remove shares" ON public.adventure_shares
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM adventures
      WHERE adventures.id = adventure_id
      AND adventures.owner_id = auth.uid()
    )
  );
```

---

## Verification Checklist

- [ ] **Visibility Enforcement**: Private adventures are not accessible to non-owners; shared adventures only to explicitly shared users; public adventures are viewable by anyone.
- [ ] **Share Modal Opens**: "Share" button opens a modal with friend/group/public link options.
- [ ] **Share with Friends**: Can select friends and share adventure; friends can now view if shared.
- [ ] **Share with Groups**: Can select groups and share adventure; group members can now view if shared.
- [ ] **Public Link Generated**: When visibility set to public, unique link is generated and displayed.
- [ ] **Copy Link Works**: "Copy to Clipboard" button copies public link and shows confirmation.
- [ ] **Public View Page**: `/adventures/public/:publicToken` displays adventure in read-only mode.
- [ ] **Public Access**: Anyone (authenticated or not) can access public adventure view via link.
- [ ] **Public Edit Prevention**: Non-owners cannot edit public adventure (buttons/forms disabled).
- [ ] **Shared Edit Permissions**: If adventure is shared with collaboration ON, shared users can edit.
- [ ] **Shared User Editing**: Shared users can update metadata, add/remove/reorder places.
- [ ] **Owner-Only Delete**: Only owner can delete adventure (button hidden for shared users).
- [ ] **Remove Share**: Owner can remove shared users/groups; they lose access immediately.
- [ ] **Copy Adventure**: "Save to My Adventures" button copies public/shared adventure to user's collection.
- [ ] **Copy Permissions**: Copied adventure is private and owned by the copying user.
- [ ] **Revoke Public Link**: Making public adventure private revokes public link access.
- [ ] **RLS Policies Enforced**: Database RLS prevents unauthorized access (even if someone guesses URL).
- [ ] **Mobile Responsive**: Share modal, public view page adapt to mobile screens.
- [ ] **Loading States**: "Sharing...", "Copying..." indicators display during operations.
- [ ] **Error Handling**: Network errors, permission denied show user-friendly messages with retry options.
- [ ] **No Console Errors**: Browser console is clean; no unhandled rejections.
- [ ] **Navigation Links**: "Share" button visible on adventure detail view (owner only).
- [ ] **Friends List**: Friends dropdown/autocomplete correctly displays user's friends.
- [ ] **Groups List**: Groups dropdown correctly displays groups user is a member of.

---

## Implementation Notes

### Generating Unique Public Tokens
Use a cryptographic library for better randomness:
```typescript
import { randomBytes } from 'crypto';

const generatePublicToken = () => {
  return randomBytes(12).toString('hex'); // 24 character hex string
};
```

Or simpler client-side:
```typescript
const generatePublicToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Check uniqueness before storing
const ensureUniqueToken = async (token: string): Promise<string> => {
  let currentToken = token;
  while (true) {
    const { data, error } = await supabase
      .from('adventures')
      .select('id')
      .eq('public_link_token', currentToken)
      .single();
    
    if (error?.code === 'PGRST116') {
      // No results, token is unique
      return currentToken;
    }
    
    // Token exists, generate a new one
    currentToken = generatePublicToken();
  }
};
```

### Share Modal Structure
```typescript
// ShareAdventureModal.tsx
const [visibility, setVisibility] = useState<'private' | 'shared' | 'public'>();
const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
const [allowCollaboration, setAllowCollaboration] = useState(false);
const [publicLink, setPublicLink] = useState<string | null>(null);

const handleSave = async () => {
  // Update visibility
  await updateAdventureVisibility(adventureId, visibility);

  // Share with friends
  if (selectedFriends.length > 0) {
    await shareAdventureWithFriends(adventureId, selectedFriends);
  }

  // Share with groups
  if (selectedGroups.length > 0) {
    await shareAdventureWithGroups(adventureId, selectedGroups);
  }

  // Update collaboration setting
  await updateAdventure(adventureId, { allow_collaboration: allowCollaboration });

  // Close modal and show success
  onClose();
  showSuccessMessage('Adventure shared successfully');
};
```

### Public View Page Permissions Check
```typescript
// AdventurePublicView.tsx
const AdventurePublicView: React.FC<{ publicToken: string }> = ({
  publicToken,
}) => {
  const [adventure, setAdventure] = useState<PublicAdventure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAdventure = async () => {
      try {
        const data = await fetchPublicAdventureByToken(publicToken);
        setAdventure(data);
      } catch (err) {
        setError('Adventure not found or is not public');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdventure();
  }, [publicToken]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!adventure) return <div>Adventure not found</div>;

  const isOwner = user?.id === adventure.owner_id;
  const canEdit = isOwner; // Non-owners cannot edit public adventures

  return (
    <div>
      {/* Adventure details in read-only mode */}
      {canEdit && <button>Edit Adventure</button>}
      {!isOwner && <button onClick={handleCopy}>Save to My Adventures</button>}
    </div>
  );
};
```

### Copy Adventure with User Authentication Check
```typescript
const handleCopyAdventure = async () => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData?.user) {
    // Redirect to login
    navigate('/login', { state: { from: location } });
    return;
  }

  try {
    const newAdventure = await copyAdventure(
      adventure.id,
      userData.user.id
    );
    showSuccessMessage('Adventure saved to your collection');
    navigate(`/adventures/${newAdventure.id}`);
  } catch (err) {
    showErrorMessage('Failed to copy adventure');
  }
};
```

### Handling Visibility Changes
```typescript
const handleVisibilityChange = async (newVisibility: string) => {
  if (newVisibility === 'public') {
    // Warn user
    const confirmed = await showConfirmDialog(
      'Make Adventure Public',
      'Anyone with the link will be able to view this adventure. Continue?'
    );
    if (!confirmed) return;
  }

  try {
    const updated = await updateAdventureVisibility(
      adventureId,
      newVisibility as 'private' | 'shared' | 'public'
    );
    setVisibility(updated.visibility);
    if (updated.public_link_token) {
      setPublicLink(
        `${window.location.origin}/adventures/public/${updated.public_link_token}`
      );
    }
    showSuccessMessage(`Adventure is now ${newVisibility}`);
  } catch (err) {
    showErrorMessage('Failed to update visibility');
  }
};
```

### Accessibility for Share Modal
* Friends/groups lists should be keyboard-navigable.
* Checkboxes should have proper labels and be tabbable.
* "Copy to Clipboard" should have `aria-label`.
* Confirmation dialogs should use `role="alertdialog"` and require explicit action.

### Performance Optimization
* Memoize share options lists to prevent unnecessary re-renders.
* Use `useCallback` for share handlers.
* Lazy-load friends/groups lists only when modal opens.
* Debounce friend search if autocomplete is implemented.

### Error Recovery
* If sharing fails, show a retry button.
* If public link generation fails, allow user to try again.
* Log errors for debugging (optional monitoring service).

---

## Dependencies

Ensure the following are installed:
* `@supabase/supabase-js` (already installed)
* `lucide-react` (for icons: Share2, Copy, etc.)

Optional:
* `react-hot-toast` or similar for toast notifications

Install if needed:
```bash
npm install react-hot-toast
```

---

## Environment Variables

No new variables needed. Existing configuration is sufficient:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Ensure your app URL is correctly configured for public links:
```
VITE_APP_URL=https://venture.example.com
```

Or dynamically use `window.location.origin` in the public link generation.

---

## Database Migration

Before implementing, run this migration to add the `public_link_token` column (if not already present):

```sql
ALTER TABLE public.adventures 
ADD COLUMN public_link_token TEXT UNIQUE;

-- Optional: Index for faster lookups
CREATE INDEX idx_adventures_public_link_token 
ON public.adventures(public_link_token) 
WHERE visibility = 'public';
```

---

## Next Steps (Sequence)

This task enables:
- **Task 8**: Social features (friends system, groups) will integrate with this sharing foundation.
- **Future**: Notifications system will alert users when adventures are shared with them.
- **Future**: Public gallery or discovery page will showcase public adventures.
