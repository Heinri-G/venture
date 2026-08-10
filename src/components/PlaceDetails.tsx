import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookmarkCheck,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  LogIn,
  MapPin,
  Navigation,
  Phone,
  Share2,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuthUser } from '@/lib/useAuthUser';
import {
  findSavedPlaceByFsqId,
  getOrCreatePlace,
  removeSavedPlace,
  upsertSavedPlace,
  type PlaceInput,
  type SavedPlace,
} from '@/lib/savedPlaces';
import type { PlaceResult } from '@/lib/places';

interface PlaceDetailsProps {
  place: PlaceResult | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (savedPlace: SavedPlace) => void;
}

const NOTES_MAX_LENGTH = 500;
const SWIPE_DISMISS_THRESHOLD = 96;

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

function toPlaceInput(place: PlaceResult): PlaceInput {
  return {
    foursquare_fsq_id: place.fsq_id,
    name: place.name,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    category: place.category,
    photo_url: place.photoUrl,
  };
}

function ensureUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function PlaceDetails({ place, isOpen, onClose, onSave }: PlaceDetailsProps) {
  const { user } = useAuthUser();

  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const locationRequestedRef = useRef(false);

  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const dragStartRef = useRef<number | null>(null);

  // Fetch the user's existing rating/notes if this place is already saved.
  useEffect(() => {
    const currentPlace = place;
    const currentUser = user;
    if (!currentPlace || !currentUser || !currentPlace.fsq_id) return;
    let cancelled = false;

    async function loadExisting(userId: string, fsqId: string) {
      setLoadingExisting(true);
      const { data, error: fetchError } = await findSavedPlaceByFsqId(userId, fsqId);
      if (cancelled) return;
      setLoadingExisting(false);
      if (fetchError) {
        console.error('Error loading saved place:', fetchError);
        return;
      }
      if (data) {
        setSaved(true);
        setRating(data.rating);
        setNotes(data.notes || '');
        setPlaceId(data.place_id);
      }
    }

    loadExisting(currentUser.id, currentPlace.fsq_id);
    return () => {
      cancelled = true;
    };
  }, [place, user]);

  // Request the user's location once per mount to compute distance.
  useEffect(() => {
    if (!isOpen || locationRequestedRef.current || !navigator.geolocation) return;
    locationRequestedRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => {
        // Location unavailable — distance just stays hidden.
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [isOpen]);

  const distanceKm = useMemo(() => {
    if (!place || !userLocation) return null;
    return haversineKm(
      userLocation.latitude,
      userLocation.longitude,
      place.latitude,
      place.longitude
    );
  }, [place, userLocation]);

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const handleDragStart = (e: React.PointerEvent) => {
    dragStartRef.current = e.clientY;
    draggingRef.current = true;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || dragStartRef.current == null) return;
    setDragY(Math.max(0, e.clientY - dragStartRef.current));
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    if (!draggingRef.current || dragStartRef.current == null) return;
    const delta = e.clientY - dragStartRef.current;
    draggingRef.current = false;
    dragStartRef.current = null;
    setDragging(false);
    if (delta > SWIPE_DISMISS_THRESHOLD) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  const handleSave = async () => {
    if (!user || !place) return;
    setSaving(true);
    setError(null);

    const { placeId: resolvedPlaceId, error: placeError } = await getOrCreatePlace(toPlaceInput(place));
    if (placeError || !resolvedPlaceId) {
      setSaving(false);
      const message = placeError || 'Failed to save place.';
      setError(message);
      toast.error('Could not save place', { description: message });
      return;
    }

    const { data, error: saveError } = await upsertSavedPlace({
      userId: user.id,
      placeId: resolvedPlaceId,
      rating,
      notes: notes.trim() || null,
    });

    setSaving(false);
    if (saveError || !data) {
      const message = saveError || 'Failed to save place.';
      setError(message);
      toast.error('Could not save place', { description: message });
      return;
    }

    setSaved(true);
    setPlaceId(data.place_id);
    onSave?.(data);
    toast.success('Saved to your places', { description: place.name });
  };

  const handleRemove = async () => {
    if (!user || !placeId) return;
    setSaving(true);
    setError(null);

    const { error: removeError } = await removeSavedPlace(user.id, placeId);
    setSaving(false);

    if (removeError) {
      setError(removeError);
      toast.error('Could not remove place', { description: removeError });
      return;
    }

    setSaved(false);
    setRating(null);
    setNotes('');
    setPlaceId(null);
    toast.success('Removed from your places');
  };

  const handleShare = async () => {
    if (!place) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    const shareData = { title: place.name, text: `Check out ${place.name} on Venture`, url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Place link copied');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      toast.error('Could not share this place');
    }
  };

  const mapsUrl = place
    ? `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`
    : null;
  const website = place?.website ? ensureUrl(place.website) : null;

  const saveBusy = saving || loadingExisting;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton
        className="mx-auto max-w-md gap-0 rounded-t-2xl p-0 sm:max-w-lg"
      >
        <div
          style={{
            transform: dragY > 0 ? `translateY(${Math.min(dragY, 320)}px)` : undefined,
            transition: dragging ? 'none' : 'transform 0.25s ease',
          }}
          className="flex max-h-[88dvh] flex-col overflow-hidden rounded-t-2xl bg-popover"
        >
          {/* Drag handle */}
          <div className="flex justify-center px-4 pb-0 pt-2.5">
            <div
              role="button"
              aria-label="Drag to dismiss"
              tabIndex={-1}
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
              className="h-1.5 w-10 touch-none rounded-full bg-border transition-colors hover:bg-muted-foreground/40"
            />
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
            {place ? (
              <>
                <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl border bg-muted">
                  {place.photoUrl ? (
                    <img
                      src={place.photoUrl}
                      alt={place.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary/5 text-primary">
                      <MapPin className="size-10" />
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <SheetTitle className="text-xl">{place.name}</SheetTitle>
                    {place.address && (
                      <SheetDescription className="mt-1 flex items-center gap-1.5">
                        <MapPin className="size-4 shrink-0 text-primary" />
                        {place.address}
                      </SheetDescription>
                    )}
                  </div>
                  {place.category && (
                    <Badge variant="secondary" className="shrink-0">
                      {place.category}
                    </Badge>
                  )}
                </div>

                {(distanceKm != null || place.phone || website || place.hours) && (
                  <div className="mt-4 flex flex-col gap-2 text-sm">
                    {distanceKm != null && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Navigation className="size-4 shrink-0 text-primary" />
                        {formatDistance(distanceKm)}
                      </p>
                    )}
                    {place.phone && (
                      <a
                        href={`tel:${place.phone}`}
                        className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Phone className="size-4 shrink-0 text-primary" />
                        {place.phone}
                      </a>
                    )}
                    {website && (
                      <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Globe className="size-4 shrink-0 text-primary" />
                        <span className="truncate">{website.replace(/^https?:\/\//i, '')}</span>
                        <ExternalLink className="size-3.5 shrink-0" />
                      </a>
                    )}
                    {place.hours && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="size-4 shrink-0 text-primary" />
                        {place.hours}
                      </p>
                    )}
                  </div>
                )}

                {mapsUrl && place.address && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Open in Maps
                    <ExternalLink className="size-3.5" />
                  </a>
                )}

                <Separator className="my-4" />

                <div className="flex flex-col gap-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Your rating
                  </Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        aria-pressed={rating === star}
                        className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <Star
                          className={cn(
                            'size-6',
                            star <= (rating ?? 0)
                              ? 'fill-primary text-primary'
                              : 'text-muted-foreground/30'
                          )}
                        />
                      </button>
                    ))}
                    {rating != null && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {rating}/5
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor="place-notes" className="text-xs uppercase tracking-wider text-muted-foreground">
                      Personal notes
                    </Label>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {notes.length}/{NOTES_MAX_LENGTH}
                    </span>
                  </div>
                  <Textarea
                    id="place-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX_LENGTH))}
                    placeholder="What makes this place special? Best time to visit..."
                    rows={3}
                    maxLength={NOTES_MAX_LENGTH}
                    aria-describedby="place-notes-hint"
                    className="resize-none"
                  />
                  <p id="place-notes-hint" className="sr-only">
                    Personal notes up to {NOTES_MAX_LENGTH} characters.
                  </p>
                </div>

                {error && (
                  <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                    {error}
                  </p>
                )}
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 border-t px-4 py-3">
            <Button
              variant="outline"
              size="icon-lg"
              onClick={handleShare}
              aria-label="Share place"
              className="shrink-0 rounded-full"
            >
              <Share2 />
            </Button>

            {!user ? (
              <Button asChild size="lg" className="h-12 flex-1 rounded-full">
                <Link to="/login">
                  <LogIn />
                  Sign in to save this place
                </Link>
              </Button>
            ) : saved ? (
              <Button
                variant="destructive"
                size="lg"
                onClick={handleRemove}
                disabled={saving}
                className="h-12 flex-1 rounded-full"
              >
                {saving ? <Loader2 className="animate-spin" /> : <Trash2 />}
                {saving ? 'Removing...' : 'Remove from Saved'}
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleSave}
                disabled={saveBusy}
                className="h-12 flex-1 rounded-full"
              >
                {saveBusy ? <Loader2 className="animate-spin" /> : <BookmarkCheck />}
                {saving ? 'Saving...' : loadingExisting ? 'Checking...' : 'Save Place'}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
