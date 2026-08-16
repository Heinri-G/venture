import React, { memo } from 'react';
import { Loader2, Navigation, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistance, haversineKm } from '@/lib/distance';
import { placeIconKey } from '@/lib/placeIcons';
import type { SavedPlaceWithDetails } from '@/lib/savedPlaces';
import { PlaceIcon } from './PlaceIcon';

interface SavedPlacesListProps {
  places: SavedPlaceWithDetails[];
  selectedPlaceId?: string | null;
  userLocation: { latitude: number; longitude: number } | null;
  onSelectPlace: (place: SavedPlaceWithDetails) => void;
  onRequestDelete: (place: SavedPlaceWithDetails) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

function RatingStars({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`Rated ${rating} out of 5 stars`}
    >
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

function notePreview(notes: string | null): string | null {
  if (!notes) return null;
  return notes.length > 100 ? `${notes.slice(0, 100)}…` : notes;
}

function distanceLabel(
  place: SavedPlaceWithDetails,
  userLocation: { latitude: number; longitude: number } | null
): string | null {
  if (!userLocation) return null;
  const km = haversineKm(
    userLocation.latitude,
    userLocation.longitude,
    place.place.latitude,
    place.place.longitude
  );
  return formatDistance(km);
}

function SavedPlacesList({
  places,
  selectedPlaceId,
  userLocation,
  onSelectPlace,
  onRequestDelete,
  hasMore,
  loadingMore,
  onLoadMore,
}: SavedPlacesListProps) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
        <ul className="flex flex-col gap-3">
          {places.map((sp) => {
            const selected = selectedPlaceId === sp.id;
            const distance = distanceLabel(sp, userLocation);
            const notes = notePreview(sp.notes);
            return (
              <li key={sp.id} className="relative">
                <button
                  type="button"
                  onClick={() => onSelectPlace(sp)}
                  aria-label={`View ${sp.place.name}`}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors',
                    selected
                      ? 'border-primary/60 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  <PlaceIcon
                    icon={placeIconKey(sp.place.icon, sp.place.category)}
                    className="size-16 shrink-0 rounded-lg"
                    iconClassName="size-7"
                  />

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {sp.place.name}
                      </span>
                      {sp.rating != null && <RatingStars rating={sp.rating} />}
                    </span>

                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      {sp.place.category && (
                        <Badge variant="secondary" className="h-4 text-[10px]">
                          {sp.place.category}
                        </Badge>
                      )}
                      {sp.place.address && (
                        <span className="truncate text-xs text-muted-foreground">
                          {sp.place.address}
                        </span>
                      )}
                    </span>

                    {notes && (
                      <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
                        {notes}
                      </span>
                    )}

                    {distance && (
                      <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Navigation className="size-3.5 text-primary" />
                        {distance}
                      </span>
                    )}
                  </span>
                </button>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRequestDelete(sp)}
                  aria-label={`Remove ${sp.place.name} from saved places`}
                  className="absolute right-2 top-2 rounded-full text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>

        {hasMore && (
          <div className="flex justify-center px-4 py-5">
            <Button
              variant="outline"
              size="lg"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full rounded-full sm:w-auto"
            >
              {loadingMore ? <Loader2 className="animate-spin" /> : null}
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(SavedPlacesList);
