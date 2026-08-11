import React, { useCallback, useMemo, useState } from 'react';
import {
  Globe,
  Loader2,
  Lock,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { Skeleton } from './ui/skeleton';
import { Switch } from './ui/switch';
import PublicShareLink from './PublicShareLink';
import { cn } from '../lib/utils';
import {
  updateAdventure,
  type Adventure,
  type AdventureShareRow,
  type AdventureVisibility,
} from '../lib/adventures';
import {
  fetchAdventureShares,
  fetchFriends,
  fetchMyGroups,
  publicShareUrl,
  removeAdventureShare,
  shareWithFriends,
  shareWithGroups,
  updateAdventureVisibility,
  updateShareCanEdit,
  type FriendProfile,
  type GroupInfo,
} from '../lib/adventureSharing';

interface ShareAdventureModalProps {
  adventure: Pick<
    Adventure,
    'id' | 'title' | 'visibility' | 'allow_collaboration' | 'public_link_token'
  >;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after any sharing change so the parent can refresh its data. */
  onShared?: () => void;
}

const VISIBILITY_OPTIONS: {
  value: AdventureVisibility;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can see and edit this adventure.',
    icon: Lock,
  },
  {
    value: 'shared',
    label: 'Shared',
    description: 'Friends and groups you choose can view it.',
    icon: Users,
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone with the link can view it.',
    icon: Globe,
  },
];

function SectionHeading({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex items-center gap-1.5 font-heading text-sm font-semibold">
        <Icon className="size-4 text-primary" />
        {title}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function ShareAdventureModal({
  adventure,
  userId,
  open,
  onOpenChange,
  onShared,
}: ShareAdventureModalProps) {
  const [visibility, setVisibility] = useState<AdventureVisibility>(
    adventure.visibility
  );
  const [allowCollaboration, setAllowCollaboration] = useState(
    adventure.allow_collaboration
  );
  const [linkToken, setLinkToken] = useState<string | null>(
    adventure.visibility === 'public' ? adventure.public_link_token : null
  );

  const [confirmPublicOpen, setConfirmPublicOpen] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [savingCollab, setSavingCollab] = useState(false);

  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [shares, setShares] = useState<AdventureShareRow[]>([]);

  const [friendSearch, setFriendSearch] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [friendCanEdit, setFriendCanEdit] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupCanEdit, setGroupCanEdit] = useState(false);

  const [sharingFriends, setSharingFriends] = useState(false);
  const [sharingGroups, setSharingGroups] = useState(false);

  const refresh = useCallback(async () => {
    setFriendsLoading(true);
    setFriendsError(null);
    const friendRes = await fetchFriends(userId);
    setFriends(friendRes.data ?? []);
    setFriendsError(friendRes.error ?? null);
    setFriendsLoading(false);

    setGroupsLoading(true);
    setGroupsError(null);
    const groupRes = await fetchMyGroups(userId);
    setGroups(groupRes.data ?? []);
    setGroupsError(groupRes.error ?? null);
    setGroupsLoading(false);

    const shareRes = await fetchAdventureShares(adventure.id);
    setShares(shareRes.data ?? []);
  }, [userId, adventure.id]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setVisibility(adventure.visibility);
        setAllowCollaboration(adventure.allow_collaboration);
        setLinkToken(
          adventure.visibility === 'public' ? adventure.public_link_token : null
        );
        setFriendSearch('');
        setSelectedFriendIds([]);
        setSelectedGroupIds([]);
        void refresh();
      }
      onOpenChange(next);
    },
    [
      adventure.visibility,
      adventure.allow_collaboration,
      adventure.public_link_token,
      refresh,
      onOpenChange,
    ]
  );

  const applyVisibility = useCallback(
    async (next: AdventureVisibility) => {
      setSavingVisibility(true);
      const { data, error } = await updateAdventureVisibility(adventure.id, next);
      setSavingVisibility(false);
      if (error) {
        toast.error('Could not update visibility', { description: error });
        return;
      }
      if (data) {
        setVisibility(data.visibility);
        setLinkToken(data.public_link_token);
        toast.success(`Adventure is now ${data.visibility}`);
        onShared?.();
      }
    },
    [adventure.id, onShared]
  );

  const handleVisibilitySelect = useCallback(
    (next: AdventureVisibility) => {
      if (next === visibility || savingVisibility) return;
      if (next === 'public') {
        setConfirmPublicOpen(true);
        return;
      }
      void applyVisibility(next);
    },
    [visibility, savingVisibility, applyVisibility]
  );

  const handleCollaborationChange = useCallback(
    async (next: boolean) => {
      setSavingCollab(true);
      const { data, error } = await updateAdventure(adventure.id, {
        allow_collaboration: next,
      });
      setSavingCollab(false);
      if (error || !data) {
        toast.error('Could not update collaboration setting', {
          description: error ?? 'Unknown error',
        });
        return;
      }
      setAllowCollaboration(next);
      toast.success(
        next ? 'Collaboration enabled' : 'Collaboration disabled'
      );
      onShared?.();
    },
    [adventure.id, onShared]
  );

  const handleToggleShareCanEdit = useCallback(
    async (share: AdventureShareRow, next: boolean) => {
      setShares((prev) =>
        prev.map((s) => (s.id === share.id ? { ...s, can_edit: next } : s))
      );
      const { error } = await updateShareCanEdit(share.id, next);
      if (error) {
        setShares((prev) =>
          prev.map((s) => (s.id === share.id ? { ...s, can_edit: share.can_edit } : s))
        );
        toast.error('Could not update permission', { description: error });
      }
    },
    []
  );

  const handleRemoveShare = useCallback(
    async (share: AdventureShareRow) => {
      setShares((prev) => prev.filter((s) => s.id !== share.id));
      const { error } = await removeAdventureShare(share.id);
      if (error) {
        toast.error('Could not remove share', { description: error });
        void refresh();
        return;
      }
      toast.success('Share removed');
      onShared?.();
    },
    [refresh, onShared]
  );

  const handleShareFriends = useCallback(async () => {
    if (selectedFriendIds.length === 0 || sharingFriends) return;
    setSharingFriends(true);
    const { error } = await shareWithFriends(
      adventure.id,
      selectedFriendIds,
      friendCanEdit
    );
    setSharingFriends(false);
    if (error) {
      toast.error('Could not share with friends', { description: error });
      return;
    }
    toast.success(
      `Shared with ${selectedFriendIds.length} ${
        selectedFriendIds.length === 1 ? 'friend' : 'friends'
      }`
    );
    setSelectedFriendIds([]);
    void refresh();
    onShared?.();
  }, [
    selectedFriendIds,
    sharingFriends,
    friendCanEdit,
    adventure.id,
    refresh,
    onShared,
  ]);

  const handleShareGroups = useCallback(async () => {
    if (selectedGroupIds.length === 0 || sharingGroups) return;
    setSharingGroups(true);
    const { error } = await shareWithGroups(
      adventure.id,
      selectedGroupIds,
      groupCanEdit
    );
    setSharingGroups(false);
    if (error) {
      toast.error('Could not share with groups', { description: error });
      return;
    }
    toast.success(
      `Shared with ${selectedGroupIds.length} ${
        selectedGroupIds.length === 1 ? 'group' : 'groups'
      }`
    );
    setSelectedGroupIds([]);
    void refresh();
    onShared?.();
  }, [
    selectedGroupIds,
    sharingGroups,
    groupCanEdit,
    adventure.id,
    refresh,
    onShared,
  ]);

  const handleRegenerate = useCallback(async () => {
    const { data, error } = await updateAdventureVisibility(adventure.id, 'public', {
      regenerateToken: true,
    });
    if (error || !data?.public_link_token) {
      throw new Error(error ?? 'Could not regenerate the link');
    }
    setLinkToken(data.public_link_token);
    onShared?.();
  }, [adventure.id, onShared]);

  const sharedFriendIds = useMemo(
    () =>
      new Set(
        shares
          .filter((s) => s.shared_with_user_id)
          .map((s) => s.shared_with_user_id as string)
      ),
    [shares]
  );

  const sharedGroupIds = useMemo(
    () =>
      new Set(
        shares
          .filter((s) => s.shared_with_group_id)
          .map((s) => s.shared_with_group_id as string)
      ),
    [shares]
  );

  const friendShares = useMemo(
    () => shares.filter((s) => s.shared_with_user_id),
    [shares]
  );
  const groupShares = useMemo(
    () => shares.filter((s) => s.shared_with_group_id),
    [shares]
  );

  const availableFriends = useMemo(() => {
    const query = friendSearch.trim().toLowerCase();
    return friends.filter(
      (friend) =>
        !sharedFriendIds.has(friend.id) &&
        (!query || friend.display_name?.toLowerCase().includes(query))
    );
  }, [friends, sharedFriendIds, friendSearch]);

  const toggleFriend = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const publicUrl = visibility === 'public' && linkToken ? publicShareUrl(linkToken) : null;

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="mx-auto max-w-md gap-0 rounded-t-2xl p-0 sm:max-w-lg"
        >
          <SheetHeader className="px-4 pb-3 pt-4">
            <SheetTitle>Share adventure</SheetTitle>
            <SheetDescription>
              Control who can see and edit this adventure.
            </SheetDescription>
          </SheetHeader>

          <div className="flex max-h-[65dvh] flex-col gap-6 overflow-y-auto px-4 pb-4">
            {/* Visibility */}
            <section className="flex flex-col gap-2.5">
              <SectionHeading
                icon={Globe}
                title="Visibility"
                hint="Controls who can see this adventure."
              />
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Adventure visibility">
                {VISIBILITY_OPTIONS.map((option) => {
                  const active = visibility === option.value;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => handleVisibilitySelect(option.value)}
                      disabled={savingVisibility}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors',
                        active
                          ? 'border-primary/60 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/40'
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-lg',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                      {active && savingVisibility ? (
                        <Loader2 className="mt-1 size-4 shrink-0 animate-spin text-primary" />
                      ) : (
                        <span
                          aria-hidden
                          className={cn(
                            'mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                            active ? 'border-primary bg-primary' : 'border-input'
                          )}
                        >
                          {active && <CheckDot />}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {visibility === 'public' && (
                <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  Making this public will allow anyone with the link to view it.
                  You can switch it back to private or shared at any time.
                </p>
              )}
            </section>

            {/* Collaboration */}
            {visibility === 'shared' && (
              <section className="flex flex-col gap-2.5">
                <SectionHeading
                  icon={Users}
                  title="Collaboration"
                  hint="Let shared friends and group members edit this adventure."
                />
                <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium leading-none">
                      Allow others to edit
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Shared people with "Can edit" can add, reorder, and remove places.
                    </p>
                  </div>
                  <Switch
                    checked={allowCollaboration}
                    onCheckedChange={(next) => void handleCollaborationChange(next)}
                    disabled={savingCollab}
                    aria-label="Allow others to edit"
                  />
                </div>
              </section>
            )}

            <Separator />

            {/* Friends */}
            <section className="flex flex-col gap-2.5">
              <SectionHeading
                icon={UserPlus}
                title="Share with friends"
                hint="Choose friends to share this adventure with."
              />

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  placeholder="Search friends..."
                  aria-label="Search friends"
                  className="h-9 rounded-full pl-9"
                />
              </div>

              {friendsLoading ? (
                <div className="flex flex-col gap-2">
                  {[0, 1].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : friendsError ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5">
                  <p role="alert" className="text-xs text-destructive">
                    Couldn&apos;t load your friends.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void refresh()}
                    className="rounded-full"
                  >
                    <RotateCcw />
                    Retry
                  </Button>
                </div>
              ) : availableFriends.length === 0 ? (
                <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-4 text-center text-xs text-muted-foreground">
                  {friends.length === 0
                    ? 'No friends yet. Add friends to share with them.'
                    : 'No friends match your search.'}
                </p>
              ) : (
                <ul className="flex max-h-44 flex-col gap-1.5 overflow-y-auto pr-1">
                  {availableFriends.map((friend) => {
                    const selected = selectedFriendIds.includes(friend.id);
                    return (
                      <li key={friend.id}>
                        <button
                          type="button"
                          onClick={() => toggleFriend(friend.id)}
                          aria-pressed={selected}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-xl border bg-card p-2.5 text-left transition-colors',
                            selected
                              ? 'border-primary/50 ring-2 ring-primary/15'
                              : 'border-border hover:border-primary/40'
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                              selected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-input bg-background'
                            )}
                          >
                            {selected && <CheckDot className="size-3" />}
                          </span>
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {(friend.display_name || 'F').slice(0, 2).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                            {friend.display_name || 'Friend'}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-2.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="friend-can-edit" className="text-sm font-medium">
                    Can edit
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    for newly shared friends
                  </p>
                </div>
                <Switch
                  id="friend-can-edit"
                  checked={friendCanEdit}
                  onCheckedChange={setFriendCanEdit}
                  size="sm"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => void handleShareFriends()}
                disabled={selectedFriendIds.length === 0 || sharingFriends}
                className="w-full rounded-full"
              >
                {sharingFriends ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <UserPlus />
                )}
                Share with selected friends
                {selectedFriendIds.length > 0 && ` (${selectedFriendIds.length})`}
              </Button>

              {friendShares.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Shared with friends
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {friendShares.map((share) => {
                      const name =
                        share.shared_with_profile?.display_name ?? 'Friend';
                      return (
                        <li
                          key={share.id}
                          className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {name}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <label
                              htmlFor={`friend-edit-${share.id}`}
                              className="sr-only"
                            >
                              Can edit {name}
                            </label>
                            <Switch
                              id={`friend-edit-${share.id}`}
                              checked={share.can_edit}
                              onCheckedChange={(next) =>
                                void handleToggleShareCanEdit(share, next)
                              }
                              size="sm"
                              aria-label={`Can edit ${name}`}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => void handleRemoveShare(share)}
                              aria-label={`Stop sharing with ${name}`}
                              className="rounded-full text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>

            <Separator />

            {/* Groups */}
            <section className="flex flex-col gap-2.5">
              <SectionHeading
                icon={Users}
                title="Share with groups"
                hint="Choose groups to share this adventure with."
              />

              {groupsLoading ? (
                <div className="flex flex-col gap-2">
                  {[0, 1].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : groupsError ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5">
                  <p role="alert" className="text-xs text-destructive">
                    Couldn&apos;t load your groups.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void refresh()}
                    className="rounded-full"
                  >
                    <RotateCcw />
                    Retry
                  </Button>
                </div>
              ) : groups.length === 0 ? (
                <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-4 text-center text-xs text-muted-foreground">
                  You are not in any groups yet.
                </p>
              ) : (
                <ul className="flex max-h-44 flex-col gap-1.5 overflow-y-auto pr-1">
                  {groups
                    .filter((group) => !sharedGroupIds.has(group.id))
                    .map((group) => {
                      const selected = selectedGroupIds.includes(group.id);
                      return (
                        <li key={group.id}>
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.id)}
                            aria-pressed={selected}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-xl border bg-card p-2.5 text-left transition-colors',
                              selected
                                ? 'border-primary/50 ring-2 ring-primary/15'
                                : 'border-border hover:border-primary/40'
                            )}
                          >
                            <span
                              aria-hidden
                              className={cn(
                                'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                                selected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-input bg-background'
                              )}
                            >
                              {selected && <CheckDot className="size-3" />}
                            </span>
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Users className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                              {group.name}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              )}

              <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-2.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="group-can-edit" className="text-sm font-medium">
                    Can edit
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    for newly shared groups
                  </p>
                </div>
                <Switch
                  id="group-can-edit"
                  checked={groupCanEdit}
                  onCheckedChange={setGroupCanEdit}
                  size="sm"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => void handleShareGroups()}
                disabled={selectedGroupIds.length === 0 || sharingGroups}
                className="w-full rounded-full"
              >
                {sharingGroups ? <Loader2 className="animate-spin" /> : <Users />}
                Share with selected groups
                {selectedGroupIds.length > 0 && ` (${selectedGroupIds.length})`}
              </Button>

              {groupShares.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Shared with groups
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {groupShares.map((share) => {
                      const name = share.shared_with_group?.name ?? 'Group';
                      return (
                        <li
                          key={share.id}
                          className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Users className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {name}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <label
                              htmlFor={`group-edit-${share.id}`}
                              className="sr-only"
                            >
                              Can edit {name}
                            </label>
                            <Switch
                              id={`group-edit-${share.id}`}
                              checked={share.can_edit}
                              onCheckedChange={(next) =>
                                void handleToggleShareCanEdit(share, next)
                              }
                              size="sm"
                              aria-label={`Can edit ${name}`}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => void handleRemoveShare(share)}
                              aria-label={`Stop sharing with ${name}`}
                              className="rounded-full text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>

            <Separator />

            {/* Public link */}
            {visibility === 'public' && (
              <section className="flex flex-col gap-2.5">
                {publicUrl ? (
                  <PublicShareLink
                    url={publicUrl}
                    title={adventure.title ?? 'Venture adventure'}
                    onRegenerate={handleRegenerate}
                  >
                    <p className="rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      Anyone with this link can view the adventure — no sign-in
                      required. Editing stays limited to you.
                    </p>
                  </PublicShareLink>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">
                      No public link yet. Generate one to share this adventure.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void applyVisibility('public')}
                      disabled={savingVisibility}
                      className="w-full rounded-full"
                    >
                      {savingVisibility ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Globe />
                      )}
                      Generate public link
                    </Button>
                  </div>
                )}
              </section>
            )}
          </div>

          <div className="flex gap-2 border-t px-4 py-3">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={confirmPublicOpen}
        onOpenChange={setConfirmPublicOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Make adventure public?</AlertDialogTitle>
            <AlertDialogDescription>
              Anyone with the link will be able to view this adventure. You can
              make it private or shared again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmPublicOpen(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmPublicOpen(false);
                void applyVisibility('public');
              }}
              className="rounded-full"
            >
              Make public
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CheckDot({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="currentColor"
      className={cn('size-2.5 text-primary-foreground', className)}
      aria-hidden
    >
      <path d="M4.8 8.4 2.6 6.2l.9-.9 1.3 1.3 3.8-3.8.9.9z" />
    </svg>
  );
}
