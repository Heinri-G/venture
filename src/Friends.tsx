import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import ProfileAvatar from './components/ProfileAvatar';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './components/ui/alert-dialog';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Skeleton } from './components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { useAuthUser } from './lib/useAuthUser';
import {
  cancelFriendRequest,
  fetchFriendsPageData,
  removeFriendRow,
  respondToFriendRequest,
  searchPublicProfiles,
  type AcceptedFriend,
  type FriendRow,
  type ProfileSummary,
} from './lib/friends';
import FriendActionButton from './components/FriendActionButton';

function FriendRowCard({
  profile,
  action,
}: {
  profile: ProfileSummary;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <Link to={`/u/${profile.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <ProfileAvatar name={profile.display_name} avatarUrl={profile.avatar_url} className="size-11" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">
            {profile.display_name || 'Explorer'}
          </span>
          {profile.bio ? (
            <span className="block truncate text-xs text-muted-foreground">{profile.bio}</span>
          ) : (
            <span className="block text-xs text-muted-foreground/70">No bio</span>
          )}
        </span>
      </Link>
      {action}
    </div>
  );
}

export default function Friends() {
  const { user, loading: userLoading } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [incoming, setIncoming] = useState<FriendRow[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRow[]>([]);
  const [friends, setFriends] = useState<AcceptedFriend[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AcceptedFriend | null>(null);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ProfileSummary[]>([]);
  const [searched, setSearched] = useState(false);

  const userId = user?.id;

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!userId) return;
      const { data, error } = await fetchFriendsPageData(userId);
      if (cancelled) return;
      setLoading(false);
      if (error) {
        toast.error('Could not load friends', { description: error });
        return;
      }
      if (data) {
        setIncoming(data.incoming);
        setOutgoing(data.outgoing);
        setFriends(data.friends);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const friendsSorted = useMemo(
    () =>
      [...friends].sort((a, b) =>
        (a.friend.display_name ?? '').localeCompare(b.friend.display_name ?? '')
      ),
    [friends]
  );

  const handleRespond = useCallback(
    async (row: FriendRow, accepted: boolean) => {
      if (!userId || busyId) return;
      setBusyId(row.id);
      const { error } = await respondToFriendRequest(row.id, accepted ? 'accepted' : 'declined', {
        actorUserId: userId,
        requesterId: row.requester_id,
      });
      setBusyId(null);
      if (error) {
        toast.error(accepted ? 'Could not accept request' : 'Could not decline request', { description: error });
        return;
      }
      setIncoming((prev) => prev.filter((r) => r.id !== row.id));
      if (accepted) {
        const friend: AcceptedFriend = {
          id: row.id,
          requester_id: row.requester_id,
          addressee_id: userId,
          friend: row.requester ?? { id: row.requester_id, display_name: null, avatar_url: null, bio: null, is_public: false },
        };
        setFriends((prev) => [...prev, friend]);
        toast.success(`You are now friends with ${friend.friend.display_name || 'this user'}`);
      }
    },
    [userId, busyId]
  );

  const handleCancel = useCallback(async (row: FriendRow) => {
    if (busyId) return;
    setBusyId(row.id);
    const { error } = await cancelFriendRequest(row.id);
    setBusyId(null);
    if (error) {
      toast.error('Could not cancel request', { description: error });
      return;
    }
    setOutgoing((prev) => prev.filter((r) => r.id !== row.id));
  }, [busyId]);

  const handleRemove = useCallback(async () => {
    if (!removeTarget || busyId) return;
    setBusyId(removeTarget.id);
    const { error } = await removeFriendRow(removeTarget.id);
    setBusyId(null);
    setRemoveTarget(null);
    if (error) {
      toast.error('Could not remove friend', { description: error });
      return;
    }
    setFriends((prev) => prev.filter((f) => f.id !== removeTarget.id));
    toast.success('Friend removed');
  }, [removeTarget, busyId]);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim() || searching) return;
      setSearching(true);
      const { data, error } = await searchPublicProfiles(query);
      setSearching(false);
      setSearched(true);
      if (error) {
        toast.error('Search failed', { description: error });
        return;
      }
      setResults((data ?? []).filter((p) => p.id !== userId));
    },
    [query, searching, userId]
  );

  if (userLoading || loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-11 w-full max-w-xs rounded-full" />
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
        <p className="mb-4 text-sm text-muted-foreground">Sign in to connect with friends.</p>
        <Button asChild className="rounded-full">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const totalRequests = incoming.length + outgoing.length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Users className="size-5" />
        </span>
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Friends</h1>
          <p className="text-sm text-muted-foreground">Connect with people you explore with.</p>
        </div>
      </div>

      <Tabs defaultValue="friends">
        <TabsList variant="line" className="mb-6">
          <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            {totalRequests > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {totalRequests}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-2">
          {friendsSorted.length === 0 ? (
            <div className="rounded-3xl border border-dashed p-12 text-center">
              <UserPlus className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="font-medium">No friends yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Use Search to find explorers and send a friend request.
              </p>
            </div>
          ) : (
            friendsSorted.map((entry) => (
              <FriendRowCard
                key={entry.id}
                profile={entry.friend}
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setRemoveTarget(entry)}
                    disabled={busyId === entry.id}
                  >
                    Remove
                  </Button>
                }
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Incoming {incoming.length > 0 && `(${incoming.length})`}
            </h2>
            {incoming.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No pending requests.
              </p>
            ) : (
              incoming.map((row) => (
                <div key={row.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <Link to={`/u/${row.requester_id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <ProfileAvatar name={row.requester?.display_name} avatarUrl={row.requester?.avatar_url} className="size-11" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{row.requester?.display_name || 'Explorer'}</span>
                      <span className="block truncate text-xs text-muted-foreground">{row.requester?.bio || 'Wants to connect'}</span>
                    </span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() => handleRespond(row, true)}
                      disabled={busyId === row.id}
                    >
                      {busyId === row.id ? <Loader2 className="animate-spin" /> : null}
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                      onClick={() => handleRespond(row, false)}
                      disabled={busyId === row.id}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Sent {outgoing.length > 0 && `(${outgoing.length})`}
            </h2>
            {outgoing.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No requests sent.
              </p>
            ) : (
              outgoing.map((row) => (
                <div key={row.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <Link to={`/u/${row.addressee_id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <ProfileAvatar name={row.addressee?.display_name} avatarUrl={row.addressee?.avatar_url} className="size-11" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{row.addressee?.display_name || 'Explorer'}</span>
                      <span className="block text-xs text-muted-foreground">Request sent</span>
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 rounded-full"
                    onClick={() => handleCancel(row)}
                    disabled={busyId === row.id}
                  >
                    {busyId === row.id ? <Loader2 className="animate-spin" /> : null}
                    Cancel
                  </Button>
                </div>
              ))
            )}
          </section>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search explorers by name"
              className="h-11 rounded-full"
            />
            <Button type="submit" className="h-11 shrink-0 rounded-full" disabled={searching || !query.trim()}>
              {searching ? <Loader2 className="animate-spin" /> : <Search />}
              Search
            </Button>
          </form>

          {!searched ? (
            <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Find people by their display name to send a friend request.
            </p>
          ) : results.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No public profiles match “{query.trim()}”.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {results.map((profile) => (
                <FriendRowCard
                  key={profile.id}
                  profile={profile}
                  action={<FriendActionButton userId={userId} targetUserId={profile.id} targetName={profile.display_name} />}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {removeTarget?.friend.display_name || 'this friend'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You will stop sharing private content with each other. You can send a new
              request anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-full" onClick={handleRemove} disabled={busyId === removeTarget?.id}>
              {busyId === removeTarget?.id ? <Loader2 className="animate-spin" /> : null}
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
