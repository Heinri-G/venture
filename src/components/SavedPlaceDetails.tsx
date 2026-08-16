import React, { useState } from 'react';
import { ExternalLink, Loader2, MapPin, Navigation, Share2, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatDistance, haversineKm } from '@/lib/distance';
import { placeIconKey } from '@/lib/placeIcons';
import { updateSavedPlace, type SavedPlaceWithDetails } from '@/lib/savedPlaces';
import { PlaceIcon } from './PlaceIcon';

interface SavedPlaceDetailsProps {
  place: SavedPlaceWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: SavedPlaceWithDetails) => void;
  onRequestDelete: (place: SavedPlaceWithDetails) => void;
  onViewOnMap: (place: SavedPlaceWithDetails) => void;
  userLocation: { latitude: number; longitude: number } | null;
}

const NOTES_MAX_LENGTH = 500;

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SavedPlaceDetails({
  place,
  isOpen,
  onClose,
  onUpdate,
  onRequestDelete,
  onViewOnMap,
  userLocation,
}: SavedPlaceDetailsProps) {
  const [rating, setRating] = useState<number | null>(place?.rating ?? null);
  const [notes, setNotes] = useState(place?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const handleSave = async () => {
    if (!place) return;
    setSaving(true);
    setError(null);
    const { data, error: saveError } = await updateSavedPlace(place.id, {
      rating,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (saveError || !data) {
      const message = saveError || 'Failed to update this place.';
      setError(message);
      toast.error('Could not save changes', { description: message });
      return;
    }
    onUpdate({
      ...place,
      rating: data.rating,
      notes: data.notes,
      updated_at: data.updated_at,
    });
    toast.success('Saved place updated', { description: place.place.name });
  };

  const handleShare = async () => {
    if (!place) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${place.place.latitude},${place.place.longitude}`;
    const shareData = {
      title: place.place.name,
      text: `Check out ${place.place.name} on Venture`,
      url,
    };
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

  if (!place) return null;

  const distanceKm =
    userLocation != null
      ? haversineKm(
          userLocation.latitude,
          userLocation.longitude,
          place.place.latitude,
          place.place.longitude
        )
      : null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.place.latitude},${place.place.longitude}`;
  const iconKey = placeIconKey(place.place.icon, place.place.category);

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton
        className="mx-auto max-w-md gap-0 rounded-t-2xl p-0 sm:max-w-lg"
      >
        <div className="flex max-h-[88dvh] flex-col overflow-hidden rounded-t-2xl bg-popover">
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
            <div className="relative flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-gradient-to-br from-primary/15 via-primary/5 to-secondary/25 text-primary">
              <PlaceIcon
                icon={iconKey}
                iconClassName="size-14"
              />
              {place.place.provider === 'google' && (
                <Badge variant="secondary" className="absolute right-3 top-3 rounded-full">
                  Google Maps
                </Badge>
              )}
            </div>

            <div className="mt-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-xl">{place.place.name}</SheetTitle>
                {place.place.address && (
                  <SheetDescription className="mt-1 flex items-center gap-1.5">
                    <MapPin className="size-4 shrink-0 text-primary" />
                    {place.place.address}
                  </SheetDescription>
                )}
              </div>
              {place.place.category && (
                <Badge variant="secondary" className="shrink-0">
                  {place.place.category}
                </Badge>
              )}
            </div>

            {distanceKm != null && (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Navigation className="size-4 shrink-0 text-primary" />
                {formatDistance(distanceKm)}
              </p>
            )}

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Open in Google Maps
              <ExternalLink className="size-3.5" />
            </a>

            <p className="mt-3 text-xs text-muted-foreground">
              Last updated {formatUpdatedAt(place.updated_at)}
            </p>

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
                  <span className="ml-1 text-xs text-muted-foreground">{rating}/5</span>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <Label
                  htmlFor="saved-place-notes"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Personal notes
                </Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {notes.length}/{NOTES_MAX_LENGTH}
                </span>
              </div>
              <Textarea
                id="saved-place-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX_LENGTH))}
                placeholder="What makes this place special? Best time to visit..."
                rows={4}
                maxLength={NOTES_MAX_LENGTH}
                aria-describedby="saved-place-notes-hint"
                className="resize-none"
              />
              <p id="saved-place-notes-hint" className="sr-only">
                Personal notes up to {NOTES_MAX_LENGTH} characters.
              </p>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-2 border-t px-4 py-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handleShare}
                className="h-11 flex-1 rounded-full"
              >
                <Share2 />
                Share
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => onViewOnMap(place)}
                className="h-11 flex-1 rounded-full"
              >
                <MapPin />
                View on map
              </Button>
            </div>
            <Button
              size="lg"
              onClick={handleSave}
              disabled={saving}
              className="h-11 w-full rounded-full"
            >
              {saving ? <Loader2 className="animate-spin" /> : null}
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={() => onRequestDelete(place)}
              className="h-11 w-full rounded-full"
            >
              <Trash2 />
              Remove from saved
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
