# Task 8: Social Features — Friends & Groups

## Context
With adventures now shareable via visibility controls and public links (Task 7), the app needs the social layer that makes sharing a two-way conversation. This task implements the **Friends** and **Groups** systems that users are selected from when sharing adventures, and that enable **collaborative editing** of shared adventures. Friends give users a trusted circle to plan with; groups give them recurring collections of people (e.g., "Ski Trip Crew", "SF Foodies") who can jointly view and, when permitted, edit the same adventure. This task is the capstone that turns Venture from a single-user trip planner into a collaborative one.

The `public.friends`, `public.groups`, and `public.group_members` tables already exist in `supabase/schema.sql` with RLS policies. This task implements the UI, business logic, and adventure collaboration flows on top of that foundation, and extends Task 7's `adventure_shares` integration.

---

## Requirements

### 1. Friend Request System
Implement a complete friend lifecycle: send, accept, decline, and remove.

#### Send Friend Request
* On any profile view (user's own or another public profile), show a **"Add Friend"** button when the two users are not friends.
* Button states:
  - **Add Friend**: No existing relationship.
  - **Request Pending**: Current user sent the request (disabled, or "Cancel Request").
  - **Accept / Decline**: Current user received the request (pending).
  - **Friends**: Current user and target are already friends ("Remove Friend" on profile or friends list).
  - **Declined**: Previous request was declined; allow re-request after a cooldown (optional).
* On click, insert a row into `public.friends`:
  - `requester_id = auth.uid()`, `addressee_id = targetUserId`, `status = 'pending'`.
* Show optimistic UI immediately, then reconcile with the server response.

#### Accept / Decline Requests
* The **Friends** page must show incoming pending requests with **Accept** and **Decline** buttons.
* Accept: update `friends.status` to `'accepted'` (row owned by the requester, updated by the addressee via the existing "Addressee can update friend request" RLS policy).
* Decline: update `friends.status` to `'declined'`.
* After accept/decline, remove the request from the incoming list immediately.

#### Remove Friend
* In the friends list, provide a "Remove" action per friend.
* Delete the `friends` row (`DELETE` allowed for either party by RLS policy).
* Show a confirmation dialog: "Remove [Name] from your friends?"

#### Cancel Pending Request
* If the current user sent a request that is still pending, allow canceling it (delete the row).

#### Friend Lookup / Discovery
* Provide a way to find users to add:
  - Search by display name (`ilike` search on `public.profiles`).
  - "Suggested" users (public profiles the user is not yet friends with) — optional, can be a simple random sample or "people who are friends with your friends".
  - Respect `is_public` on profiles: private profiles should not appear in discovery search unless already connected.

### 2. Friends Page & List View
Create a dedicated **Friends** page (e.g., `/friends`) accessible from the main navigation.

* **Sections**:
  - **Incoming Requests** (with Accept / Decline buttons).
  - **Outgoing Requests** (with Cancel button).
  - **Friends List** (with Remove action).
  - **Add Friends** (search box to find and add users).
* **Friend card** shows:
  - Avatar (fallback to initials if no `avatar_url`).
  - Display name.
  - Bio preview (optional).
  - Action buttons per relationship state.
* **Empty States**:
  - No friends: "No friends yet. Search for people to start exploring together!"
  - No requests: "No pending requests."
* **Badge/Count**: Show pending incoming request count in the navigation or a notification badge (optional but recommended).
* **Mobile-First**: Cards stack vertically, full-width action buttons, large touch targets.

### 3. Groups System
Implement groups so users can organize friends into recurring collections.

#### Create Group
* A "New Group" button opens a form (modal or dedicated page) with:
  - **Name** (required, 1-50 characters).
  - **Description** (optional, up to 300 characters).
  - **Cover/Avatar** (optional, upload to Supabase Storage under a `groups` bucket).
* On creation, insert a row into `public.groups` (`created_by = auth.uid()`) and a row into `public.group_members` with `role = 'admin'` for the creator.
* Redirect to the new group's detail view.

#### Group Detail View
* Route: `/groups/:id` (authenticated users only; members-only per RLS).
* Shows:
  - Group name, description, avatar, creation date.
  - **Members list** with role badges (Admin / Member).
  - **Member management** (admin only): promote to admin, demote to member, remove member.
  - **Invite friends** flow: add friends who are not yet members (searchable list of the group admin's friends).
  - **Adventures shared with this group** (from `adventure_shares.shared_with_group_id`), with links to each.
  - **Leave Group** button (for non-owners / any member).
* **Admin transfer**: allow the group admin to transfer ownership (set another member to `role = 'admin'` and demote self, or leave group).

#### Group List View
* Route: `/groups` — displays all groups the current user belongs to (via `group_members`).
* Group card shows name, member count, description preview, avatar.
* "New Group" button in header.
* Clicking a card navigates to `/groups/:id`.
* Empty state: "No groups yet. Create a group to plan with friends!"

#### Invite / Add Members
* Only group admins can add members.
* Invite flow shows the admin's friends who are not already members.
* On add, insert into `public.group_members` (`role = 'member'` by default).
* Non-admin members can request to join (optional / future).

### 4. Member Roles & Permissions
Enforce the role model from `public.group_members.role` (`'admin'` or `'member'`):

| Action | Admin | Member |
| --- | --- | --- |
| View group & members | ✅ | ✅ |
| Add members | ✅ | ❌ |
| Remove members | ✅ | ❌ |
| Promote/demote roles | ✅ | ❌ |
| Edit group name/description/avatar | ✅ | ❌ |
| Delete group | ✅ | ❌ |
| Leave group | ✅ | ✅ |
| Share adventures with group | ✅ (recommended) | ✅ (optional) |

* Group creator starts as `admin`.
* Deleting a group cascades: `group_members` and `adventure_shares` rows referencing it are removed (FK `ON DELETE CASCADE`).
* When an admin removes a member, that member immediately loses access to any adventures shared with the group (verified by RLS).

### 5. Collaborative Adventure Editing (Friends & Groups)
Wire the social layer into Task 6/7 adventures.

#### Friendship-Based Sharing
* In the Share Adventure modal (Task 7), the "Share with Friends" picker must list the user's **accepted friends** (from `public.friends` where status = 'accepted').
* On share, upsert rows into `adventure_shares` with `shared_with_user_id`.
* If the adventure has `allow_collaboration = true`, shared friends can edit (add/remove/reorder places, edit metadata — not delete).

#### Group-Based Sharing
* In the Share Adventure modal, the "Share with Groups" picker must list groups the user **belongs to** (via `group_members`).
* On share, upsert rows into `adventure_shares` with `shared_with_group_id`.
* Any member of the group gains view access via RLS (see Task 7 policies); edit access follows the group share + `allow_collaboration`.

#### Collaborative Editing Experience
* For shared users with edit permission, show the same editing controls the owner has (Edit metadata, add/remove/reorder places).
* The delete button remains **owner-only**.
* For concurrent edits, implement a simple **last-write-wins** strategy (each edit updates `adventures.updated_at`).
* Optional nice-to-have: an "Editing" indicator showing which collaborators are currently viewing/editing the adventure.

#### Access Verification in UI
* Compute `canEdit` on the adventure detail page:
```typescript
const canEdit =
  adventure.owner_id === user.id ||
  (adventure.visibility === 'shared' && adventure.allow_collaboration && hasAccess);
```

### 6. Notifications (Optional but Recommended)
* Lightweight notification center for social events:
  - Incoming friend requests.
  - Friend request accepted.
  - Adventure shared with you.
  - Added to a group.
* Implement with a `notifications` table (see API Specs) and a badge in the layout.
* Realtime: optionally subscribe via `supabase.channel()` for live updates.

### 7. Mobile-First UI & UX
* Friends and Groups pages follow the same mobile-first pattern as prior tasks:
  - Full-width cards, bottom sheets for forms/modals, large touch targets.
  - Bottom navigation or persistent header links for Friends and Groups.
  - Pull-to-refresh optional.
* On desktop, pages may render two columns (e.g., friend list + request list side by side).

---

## Target Files
* **Create**: `src/pages/Friends.tsx` (or `src/Friends.tsx`) — friends list, requests, add/search.
* **Create**: `src/pages/Groups.tsx` (or `src/Groups.tsx`) — group list view.
* **Create**: `src/pages/GroupDetail.tsx` (or `src/GroupDetail.tsx`) — group members & management.
* **Create**: `src/components/FriendRequestCard.tsx` — incoming/outgoing request card.
* **Create**: `src/components/FriendListItem.tsx` — friend row with remove action.
* **Create**: `src/components/AddFriendModal.tsx` — search & add friends UI.
* **Create**: `src/components/CreateGroupModal.tsx` — group creation form.
* **Create**: `src/components/GroupCard.tsx` — group list card.
* **Create**: `src/components/MemberList.tsx` — group members with role management (admin).
* **Create**: `src/hooks/useFriends.ts` — friend state logic (optional).
* **Create**: `src/hooks/useGroups.ts` — group state logic (optional).
* **Modify**: `src/App.tsx` — add `/friends`, `/groups`, `/groups/:id` routes (protected).
* **Modify**: `src/components/Layout.tsx` — add Friends & Groups navigation links and optional request badge.
* **Modify**: `src/components/ShareAdventureModal.tsx` (Task 7) — use accepted-friends and member-groups pickers from this task.
* **Modify**: `src/pages/Profile.tsx` — add friend status button (Add Friend / Pending / Friends).
* **Modify**: `.env.example` — no new required vars (storage bucket `groups` optional).

---

## API / Database Specs

### Existing Tables (from `supabase/schema.sql` — do not recreate)

#### `public.friends`
```sql
CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);
```

#### `public.groups`
```sql
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `public.group_members`
```sql
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);
```

#### `public.adventure_shares` (referenced, from Task 7)
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

### New Table: `public.notifications` (Optional)
```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'adventure_shared', 'group_invite')),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
```

### TypeScript Type Definitions
```typescript
interface FriendRequest {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  requester?: ProfileSummary; // joined
  addressee?: ProfileSummary; // joined
}

interface ProfileSummary {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile?: ProfileSummary;
}

interface Notification {
  id: string;
  user_id: string;
  type: 'friend_request' | 'friend_accepted' | 'adventure_shared' | 'group_invite';
  actor_id: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}
```

### Supabase Queries

#### Send Friend Request
```typescript
const sendFriendRequest = async (targetUserId: string) => {
  const { error } = await supabase
    .from('friends')
    .insert({
      requester_id: (await supabase.auth.getUser()).data.user!.id,
      addressee_id: targetUserId,
      status: 'pending',
    });

  if (error) throw error;
};
```

#### Accept / Decline Request
```typescript
const respondToRequest = async (
  requestId: string,
  status: 'accepted' | 'declined'
) => {
  const { error } = await supabase
    .from('friends')
    .update({ status })
    .eq('id', requestId);

  if (error) throw error;
};
```

#### Fetch Incoming Pending Requests
```typescript
const fetchIncomingRequests = async (userId: string) => {
  const { data, error } = await supabase
    .from('friends')
    .select(
      `
      id, requester_id, addressee_id, status, created_at,
      requester:requester_id(id, display_name, avatar_url, bio, is_public)
      `
    )
    .eq('addressee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};
```

#### Fetch Accepted Friends
```typescript
const fetchFriends = async (userId: string) => {
  const { data, error } = await supabase
    .from('friends')
    .select(
      `
      id, requester_id, addressee_id, status, created_at,
      requester:requester_id(id, display_name, avatar_url, bio),
      addressee:addressee_id(id, display_name, avatar_url, bio)
      `
    )
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) throw error;

  // Return the "other party" profile for each friendship
  const friends = data.map((f) =>
    f.requester_id === userId ? f.addressee : f.requester
  );
  return friends;
};
```

#### Remove Friend
```typescript
const removeFriend = async (friendshipId: string) => {
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', friendshipId);

  if (error) throw error;
};
```

#### Search Public Profiles
```typescript
const searchProfiles = async (query: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, bio')
    .eq('is_public', true)
    .ilike('display_name', `%${query}%`)
    .limit(10);

  if (error) throw error;
  return data;
};
```

#### Create Group (with Creator as Admin)
```typescript
const createGroup = async (
  name: string,
  description: string | null,
  avatarUrl: string | null
) => {
  const user = (await supabase.auth.getUser()).data.user!;

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name,
      description,
      created_by: user.id,
      avatar_url: avatarUrl,
    })
    .select()
    .single();

  if (groupError) throw groupError;

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: user.id,
      role: 'admin',
    });

  if (memberError) throw memberError;
  return group;
};
```

#### Fetch User's Groups (with member counts)
```typescript
const fetchMyGroups = async (userId: string) => {
  const { data, error } = await supabase
    .from('group_members')
    .select(
      `
      group:group_id(
        id, name, description, avatar_url, created_by, created_at,
        group_members:group_members(count)
      )
      `
    )
    .eq('user_id', userId);

  if (error) throw error;
  return data.map((gm) => gm.group);
};
```

#### Add Member to Group (Admin Only)
```typescript
const addGroupMember = async (groupId: string, userId: string) => {
  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId, role: 'member' });

  if (error) throw error;
};
```

#### Update Member Role (Admin Only)
```typescript
const updateMemberRole = async (
  membershipId: string,
  role: 'admin' | 'member'
) => {
  const { error } = await supabase
    .from('group_members')
    .update({ role })
    .eq('id', membershipId);

  if (error) throw error;
};
```

#### Remove Member / Leave Group
```typescript
const removeMember = async (membershipId: string) => {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('id', membershipId);

  if (error) throw error;
};
```

#### Fetch Group with Members & Shared Adventures
```typescript
const fetchGroupDetail = async (groupId: string) => {
  const { data, error } = await supabase
    .from('groups')
    .select(
      `
      id, name, description, avatar_url, created_by, created_at,
      group_members(
        id, user_id, role, joined_at,
        profile:user_id(id, display_name, avatar_url)
      ),
      adventure_shares(
        adventure:adventure_id(
          id, owner_id, title, description, cover_photo_url,
          visibility, allow_collaboration
        )
      )
      `
    )
    .eq('id', groupId)
    .single();

  if (error) throw error;
  return data;
};
```

### RLS Policies
The existing policies in `supabase/schema.sql` cover most access. Verify they are applied and add any missing ones:

```sql
-- Friends: both parties can view; requester can insert; addressee can update; either can delete
-- (already in schema.sql — verify)

-- Groups: members can view; authenticated users can create (created_by = auth.uid())
-- (already in schema.sql — verify)

-- Group Members: members can view co-members
-- (already in schema.sql — verify)

-- Adventure Shares: participants can view; owners can share
-- (already in schema.sql — verify)
```

If implementing group management actions (edit group, remove members) via direct client queries, add admin-gated policies:

```sql
-- Admins can edit their groups
CREATE POLICY "Group admins can edit groups" ON public.groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

CREATE POLICY "Group admins can delete groups" ON public.groups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

-- Admins can manage group members
CREATE POLICY "Group admins can manage members" ON public.group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  )
  ;

CREATE POLICY "Group admins can update members" ON public.group_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

CREATE POLICY "Group admins can remove members" ON public.group_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );
```

**Note**: If any of the admin-management policies above conflict with the "Group members can view members" policy, ensure the INSERT/UPDATE/DELETE policies are added without disturbing the SELECT policy. Apply these via a Supabase migration.

---

## Verification Checklist

- [ ] **Friends Route Protected**: `/friends` redirects to `/login` when unauthenticated.
- [ ] **Send Friend Request**: "Add Friend" button creates a `pending` row; UI shows pending state.
- [ ] **Incoming Requests**: Pending requests appear on the receiving user's Friends page with Accept/Decline.
- [ ] **Accept Request**: Accepting sets status to `accepted`; both users now appear in each other's friends list.
- [ ] **Decline Request**: Declining sets status to `declined`; request disappears from incoming list.
- [ ] **Cancel Request**: Sender can cancel a pending outgoing request.
- [ ] **Remove Friend**: Removing a friend deletes the friendship row and both users lose access to each other's private content.
- [ ] **Friend Search**: Searching by display name finds public profiles not already friends.
- [ ] **Profile Button States**: Profile page shows correct friend button (Add/Pending/Friends) per relationship state.
- [ ] **Friends Navigation**: Layout has a link to `/friends`; request badge (if implemented) shows pending count.
- [ ] **Groups Route Protected**: `/groups` and `/groups/:id` redirect to `/login` when unauthenticated.
- [ ] **Create Group**: New group creates `groups` row + `group_members` row with creator as `admin`.
- [ ] **Group List**: `/groups` shows groups the user belongs to with member counts.
- [ ] **Group Detail**: `/groups/:id` shows name, description, members with role badges, and shared adventures.
- [ ] **Add Members**: Admin can add friends to the group; new member sees the group immediately.
- [ ] **Role Management**: Admin can promote to admin / demote to member.
- [ ] **Remove Member**: Admin can remove a member; removed member loses group and any group-shared adventure access.
- [ ] **Leave Group**: Members can leave a group; group_members row deleted.
- [ ] **Non-Admin Restrictions**: Members cannot add/remove members or edit group (buttons hidden).
- [ ] **Delete Group**: Admin can delete the group; cascades remove memberships and shares.
- [ ] **Share with Friends**: Share Adventure modal lists accepted friends; sharing grants access.
- [ ] **Share with Groups**: Share Adventure modal lists user's groups; sharing grants access to all members.
- [ ] **Collaborative Editing**: With `allow_collaboration = true`, shared friends/group members can edit (add/remove/reorder places, edit metadata).
- [ ] **Owner-Only Delete**: Only the adventure owner sees the delete button, even for collaborators.
- [ ] **Access Revocation**: Removing a friend or group membership immediately revokes access to shared adventures.
- [ ] **RLS Enforced**: Direct Supabase queries by unauthorized users return empty/error (not data).
- [ ] **Notifications (if implemented)**: Badge updates on friend requests / shares / group invites.
- [ ] **Mobile Responsive**: Friends & Groups pages work on mobile (cards, bottom sheets, large touch targets).
- [ ] **Loading States**: Spinners during fetches; disabled buttons during mutations.
- [ ] **Error Handling**: Network/permission errors show friendly messages with retry options.
- [ ] **No Console Errors**: Browser console is clean; no unhandled rejections.

---

## Implementation Notes

### Friend Status Helper
```typescript
type FriendStatus = 'none' | 'pending_outgoing' | 'pending_incoming' | 'friends';

const getFriendStatus = (
  user: { id: string },
  targetUserId: string,
  friendships: FriendRequest[]
): FriendStatus => {
  for (const f of friendships) {
    if (f.requester_id === user.id && f.addressee_id === targetUserId) {
      return f.status === 'accepted' ? 'friends' : 'pending_outgoing';
    }
    if (f.requester_id === targetUserId && f.addressee_id === user.id) {
      return f.status === 'accepted' ? 'friends' : 'pending_incoming';
    }
  }
  return 'none';
};
```

### Guarding Admin Actions
```typescript
// GroupDetail.tsx
const isAdmin = currentUserMembership?.role === 'admin';

// Hide management UI for non-admins
{isAdmin && (
  <AddMemberButton groupId={group.id} existingMemberIds={memberIds} />
)}
```

### Collaborative Edit Access (Adventure Detail)
```typescript
// AdventureDetail.tsx (extend from Task 6/7)
const [sharedToMe, setSharedToMe] = useState(false);

useEffect(() => {
  const load = async () => {
    const { data } = await supabase
      .from('adventure_shares')
      .select('id')
      .eq('adventure_id', adventure.id)
      .eq('shared_with_user_id', user?.id)
      .maybeSingle();
    setSharedToMe(!!data);
  };
  load();
}, [adventure.id, user?.id]);

const canEdit =
  adventure.owner_id === user?.id ||
  (adventure.visibility === 'shared' &&
    adventure.allow_collaboration &&
    sharedToMe);
```

### Friend Discovery Query (Suggestions)
```typescript
const fetchSuggestions = async (userId: string) => {
  // Public profiles that are not the user and not already friends
  const { data: friendRows } = await supabase
    .from('friends')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  const connectedIds = new Set<string>([userId]);
  friendRows?.forEach((f) => {
    connectedIds.add(f.requester_id);
    connectedIds.add(f.addressee_id);
  });

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, bio')
    .eq('is_public', true)
    .limit(10);

  if (error) throw error;
  return data.filter((p) => !connectedIds.has(p.id));
};
```

### Realtime Notifications (Optional)
```typescript
const channel = supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    (payload) => {
      setNotifications((prev) => [payload.new as Notification, ...prev]);
    }
  )
  .subscribe();

// Clean up on unmount: supabase.removeChannel(channel);
```

### Storage Bucket for Group Avatars (Optional)
* Create a Supabase Storage bucket named `groups` with public read access.
* Upload pattern identical to the `avatars` bucket from Task 1.

### Accessibility
* Friend/group action buttons must have `aria-label` (e.g., "Accept friend request from [name]").
* Confirmation dialogs use `role="alertdialog"` with explicit confirm/cancel.
* Member lists are keyboard-navigable; role selectors are labeled.
* Notification badges should be announced to screen readers.

### Performance Optimization
* Memoize friend/group list rows with `React.memo()`.
* Debounce friend search input (e.g., 300ms).
* Paginate large friends/groups lists (10-20 per page) or use "Load More".
* Lazy-load group avatars with `loading="lazy"`.

### Error Recovery
* On send/accept/decline failures, revert optimistic UI and show a retry action.
* On group create/add-member failures, keep the form open with the error inline.
* Log errors (optional monitoring service) for debugging.

---

## Dependencies

Ensure the following are installed:
* `@supabase/supabase-js` (already installed)
* `lucide-react` (for icons: UserPlus, UserCheck, Users, Settings, Trash2, etc.)

Optional:
* `react-hot-toast` or similar for toasts (consistent with Task 5/7).

Install if needed:
```bash
npm install lucide-react
npm install react-hot-toast
```

---

## Environment Variables

No new required variables. Existing configuration is sufficient:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Optional: If using a `groups` storage bucket for avatars, create it in Supabase Dashboard > Storage (public read access), same as the `avatars` bucket from Task 1.

---

## Database Migration

If implementing admin management policies and/or notifications, apply a new migration (e.g., `supabase/migrations/<timestamp>_social_admin_policies.sql`):

```sql
-- Admin management policies for groups/group_members
CREATE POLICY "Group admins can edit groups" ON public.groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

CREATE POLICY "Group admins can delete groups" ON public.groups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

CREATE POLICY "Group admins can manage members" ON public.group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

CREATE POLICY "Group admins can update members" ON public.group_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

CREATE POLICY "Group admins can remove members" ON public.group_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );
```

---

## Next Steps (Sequence)

This task completes the core product vision:
- **Future**: Notifications system (optional section above) can become a full-featured center with realtime updates.
- **Future**: Public adventure gallery / discovery (referenced in Task 7) can surface public adventures to friends and the wider community.
- **Future**: Real-time collaborative editing with cursors/presence (optional "editing" indicators) can build on the collaboration foundation here.
- **Future**: Friend discovery / "people you may know" recommendations.
