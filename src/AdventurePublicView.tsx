import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  Eye,
  Loader2,
  Map as MapIcon,
  MapPin,
  Pencil,
  Share2,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import AdventureMap, { type AdventureMapPlace } from './components/AdventureMap';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './components/ui/sheet';
import { Skeleton } from './components/ui/skeleton';
import { useAuthUser } from './lib/useAuthUser';
import { haversineKm } from './lib/distance';
import {
  copyAdventure,
  fetchPublicAdventureByToken,
  publicShareUrl,
  type PublicAdventure,
} from './lib/adventureSharing';
import { cn } from './lib/utils';

function formatDistanceBetween(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function RatingStars({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Rated ${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            'size-3',
            n <= rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'
          )}
        />
      ))}
    </span>
  );
}

export default function AdventurePublicView() {
  const { publicToken } = useParams<{ publicToken: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthUser();

  const [adventure, setAdventure] = useState<PublicAdventure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedPlaceKey, setSelectedPlaceKey] = useState<string | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<AdventureMapPlace | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!publicToken) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await fetchPublicAdventureByToken(publicToken);
      if (cancelled) return;
      setLoading(false);
      if (fetchError) {
        setError('Adventure not found or is not public.');
        setAdventure(null);
        return;
      }
      if (!data) {
        setError('Adventure not found or is not public.');
        setAdventure(null);
        return;
      }
      setAdventure(data);
      setSelectedPlaceKey(null);
      setFlyToTarget(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [publicToken, reloadKey]);

  const isOwner = Boolean(user && adventure && user.id === adventure.owner_id);

  const mapPlaces: AdventureMapPlace[] = useMemo(
    () =>
      (adventure?.adventure_places ?? []).map((ap) => ({
        key: ap.saved_place_id,
        name: ap.saved_place.place.name,
        latitude: ap.saved_place.place.latitude,
        longitude: ap.saved_place.place.longitude,
      })),
    [adventure]
  );

  const handleSelectPlace = useCallback((place: AdventureMapPlace) => {
    setSelectedPlaceKey(place.key);
    setFlyToTarget(place);
  }, []);

  const handleListItemClick = useCallback(
    (ap: PublicAdventure['adventure_places'][number]) => {
      setSelectedPlaceKey(ap.saved_place_id);
      setFlyToTarget({
        key: ap.saved_place_id,
        name: ap.saved_place.place.name,
        latitude: ap.saved_place.place.latitude,
        longitude: ap.saved_place.place.longitude,
      });
    },
    []
  );

  const handleShare = useCallback(async () => {
    if (!adventure) return;
    const url = publicShareUrl(publicToken ?? '');
    if (navigator.share) {
      try {
        await navigator.share({ title: adventure.title, url });
      } catch {
        // Dismissed by the user.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  }, [adventure, publicToken]);

  const handleSaveToMyAdventures = useCallback(async () => {
    if (!adventure) return;
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setSaving(true);
    const { data, error: copyError } = await copyAdventure(adventure, user.id);
    setSaving(false);
    if (copyError || !data) {
      toast.error('Could not save this adventure', { description: copyError });
      return;
    }
    toast.success('Adventure saved to your collection', {
      description: data.title,
    });
    navigate(`/adventures/${data.id}/edit`);
  }, [adventure, user, navigate, location]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-72 w-full rounded-2xl lg:col-span-3" />
          <Skeleton className="h-72 w-full rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !adventure) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 py-20 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapIcon className="size-6" />
        </span>
        <p role="alert" className="font-heading text-lg font-semibold">
          Adventure not found
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {error ||
            'This link may be broken, or the adventure is no longer public.'}
        </p>
        <div className="mt-2 flex gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/">
              <ArrowLeft />
              Back to home
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-full"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const ownerName = adventure.owner?.display_name || 'Adventurer';
  const orderedPlaces = adventure.adventure_places;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground">
          <Link to="/">
            <ArrowLeft />
            Home
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {adventure.cover_photo_url ? (
          <img src={adventure.cover_photo_url} alt="" className="h-44 w-full object-cover sm:h-56" />
        ) : (
          <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-secondary/20 via-primary/10 to-chart-3/15 text-primary sm:h-40">
            <MapIcon className="size-12" />
          </div>
        )}

        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                  {adventure.title}
                </h1>
                <Badge variant="secondary" className="rounded-full">
                  <GlobeIcon className="size-3" />
                  Public
                </Badge>
              </div>
              {adventure.description && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {adventure.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShare} className="rounded-full">
                <Share2 />
                Share
              </Button>
              {isOwner && (
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link to={`/adventures/${adventure.id}/edit`}>
                    <Pencil />
                    Edit
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Avatar className="size-6">
                {adventure.owner?.avatar_url ? (
                  <AvatarImage
                    src={adventure.owner.avatar_url}
                    alt=""
                    className="size-6 rounded-full object-cover"
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                  {ownerName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {ownerName}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="size-4 text-primary" />
              {orderedPlaces.length} {orderedPlaces.length === 1 ? 'place' : 'places'}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 text-primary" />
              Created {formatDate(adventure.created_at)}
            </span>
          </div>

          {!isOwner && (
            <Button
              size="lg"
              onClick={() => void handleSaveToMyAdventures()}
              disabled={saving}
              className="rounded-full"
            >
              {saving ? <Loader2 className="animate-spin" /> : <Bookmark />}
              {saving ? 'Saving...' : 'Save to My Adventures'}
            </Button>
          )}
        </div>
      </div>

      {/* Map + list */}
      <div className="mt-5 grid gap-4 lg:grid-cols-5">
        <div className="overflow-hidden rounded-2xl border border-border bg-card lg:col-span-3">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold">
              <MapIcon className="size-4 text-primary" />
              Route
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMapOpen(true)}
              className="rounded-full"
            >
              <MapIcon />
              View on map
            </Button>
          </div>
          {orderedPlaces.length > 0 ? (
            <div className="h-72 w-full sm:h-96">
              <AdventureMap
                places={mapPlaces}
                selectedPlaceKey={selectedPlaceKey}
                flyToTarget={flyToTarget}
                onSelectPlace={handleSelectPlace}
                showRoute
              />
            </div>
          ) : (
            <div className="flex h-72 w-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground sm:h-96">
              <MapIcon className="size-8" />
              <p>No places on the map yet.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl lg:col-span-2">
          <h2 className="flex items-center gap-2 font-heading text-sm font-semibold">
            <MapPin className="size-4 text-primary" />
            Places
          </h2>
          <div className="max-h-[34rem] overflow-y-auto rounded-2xl border border-border bg-card">
            {orderedPlaces.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <MapPin className="size-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No places in this adventure yet.
                </p>
              </div>
            ) : (
              <ol className="flex flex-col divide-y divide-border">
                {orderedPlaces.map((ap, index) => {
                  const place = ap.saved_place.place;
                  const next = orderedPlaces[index + 1];
                  const distance =
                    next != null
                      ? haversineKm(
                          place.latitude,
                          place.longitude,
                          next.saved_place.place.latitude,
                          next.saved_place.place.longitude
                        )
                      : null;
                  const selected = selectedPlaceKey === ap.saved_place_id;
                  return (
                    <li key={ap.saved_place_id}>
                      <button
                        type="button"
                        onClick={() => handleListItemClick(ap)}
                        aria-label={`View ${place.name} on map`}
                        className={cn(
                          'flex w-full items-start gap-3 p-3 text-left transition-colors',
                          selected ? 'bg-primary/5' : 'hover:bg-muted/50'
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                            selected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-primary/10 text-primary'
                          )}
                        >
                          {index + 1}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {place.name}
                            </span>
                            {ap.saved_place.rating != null && (
                              <RatingStars rating={ap.saved_place.rating} />
                            )}
                          </span>

                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                            {place.category && (
                              <Badge variant="secondary" className="h-4 text-[10px]">
                                {place.category}
                              </Badge>
                            )}
                            {place.address && (
                              <span className="truncate text-xs text-muted-foreground">
                                {place.address}
                              </span>
                            )}
                          </span>

                          {ap.saved_place.notes && (
                            <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
                              {ap.saved_place.notes}
                            </span>
                          )}

                          {distance != null && (
                            <span className="mt-1.5 block text-xs font-medium text-muted-foreground">
                              Next stop {formatDistanceBetween(distance)} away
                            </span>
                          )}
                        </span>

                        {place.photo_url ? (
                          <img
                            src={place.photo_url}
                            alt=""
                            loading="lazy"
                            className="mt-0.5 size-12 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <MapPin className="size-5" />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen map */}
      <Sheet open={mapOpen} onOpenChange={setMapOpen}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="mx-auto max-w-md gap-0 rounded-t-2xl p-0 sm:max-w-lg"
        >
          <SheetHeader className="px-4 pb-3 pt-4">
            <SheetTitle>Adventure map</SheetTitle>
          </SheetHeader>
          <div className="h-[55dvh] w-full px-4 pb-4">
            {orderedPlaces.length > 0 ? (
              <AdventureMap
                places={mapPlaces}
                selectedPlaceKey={selectedPlaceKey}
                flyToTarget={flyToTarget}
                onSelectPlace={handleSelectPlace}
                showRoute
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <MapIcon className="size-8" />
                <p>No places on the map yet.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-3', className)}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}
