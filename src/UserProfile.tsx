import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ProfileAvatar from './components/ProfileAvatar';
import FriendActionButton from './components/FriendActionButton';
import { Skeleton } from './components/ui/skeleton';
import { useAuthUser } from './lib/useAuthUser';
import { supabase } from './lib/supabase/client';
import type { ProfileSummary } from './lib/friends';

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user, loading: userLoading } = useAuthUser();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!userId) return;

    if (user && userId === user.id) {
      navigate('/profile', { replace: true });
      return;
    }

    void (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio, is_public')
        .eq('id', userId)
        .eq('is_public', true)
        .maybeSingle();
      if (!mounted) return;
      setProfile((data as unknown as ProfileSummary) ?? null);
      if (error) console.error('Error loading profile:', error);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [userId, user, navigate]);

  const back = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/friends');
  };

  if (loading || userLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Skeleton className="mb-6 h-6 w-24" />
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Skeleton className="size-24 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="mt-3 h-9 w-32 rounded-full" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
        <p className="mb-4 text-sm text-muted-foreground">
          This profile is private or doesn’t exist.
        </p>
        <ButtonAsLink to="/friends" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <button
        type="button"
        onClick={back}
        className="mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <ProfileAvatar
          name={profile.display_name}
          avatarUrl={profile.avatar_url}
          className="size-24"
          fallbackClassName="text-3xl"
        />
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {profile.display_name || 'Explorer'}
          </h1>
          {profile.bio ? (
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{profile.bio}</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No bio yet.</p>
          )}
        </div>
        {user ? (
          <FriendActionButton
            userId={user.id}
            targetUserId={profile.id}
            targetName={profile.display_name}
          />
        ) : null}
      </div>
    </div>
  );
}

function ButtonAsLink({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
    >
      Go to friends
    </Link>
  );
}
