import React, { memo, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, MapPin, Minus, RotateCcw, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { fetchSavedPlaces, type SavedPlaceWithDetails } from '@/lib/savedPlaces';

interface PlaceSelectorProps {
  userId: string;
  value: SavedPlaceWithDetails[];
  onChange: (places: SavedPlaceWithDetails[]) => void;
  /** Saved-place ids that cannot be added (e.g. already in the adventure). */
  disabledIds?: string[];
}

function SortablePlaceRow({
  place,
  index,
  onToggle,
}: {
  place: SavedPlaceWithDetails;
  index: number;
  onToggle: (place: SavedPlaceWithDetails) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: place.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex w-full items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-left',
        isDragging && 'z-10 border-primary/50 shadow-lg ring-2 ring-primary/20'
      )}
    >
      <button
        type="button"
        aria-label={`Reorder ${place.place.name}`}
        {...attributes}
        {...listeners}
        className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>

      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {index + 1}
      </span>

      {place.place.photo_url ? (
        <img
          src={place.place.photo_url}
          alt={place.place.name}
          loading="lazy"
          className="size-11 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MapPin className="size-5" />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {place.place.name}
        </span>
        {place.place.address && (
          <span className="block truncate text-xs text-muted-foreground">
            {place.place.address}
          </span>
        )}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onToggle(place)}
        aria-label={`Remove ${place.place.name} from selection`}
        className="shrink-0 rounded-full text-muted-foreground hover:text-destructive"
      >
        <Minus className="size-4" />
      </Button>
    </li>
  );
}

function PlaceSelector({
  userId,
  value,
  onChange,
  disabledIds = [],
}: PlaceSelectorProps) {
  const [places, setPlaces] = useState<SavedPlaceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await fetchSavedPlaces(userId, 0, 1000, undefined, 'recent');
      if (cancelled) return;
      setLoading(false);
      if (fetchError) {
        setError(fetchError);
        return;
      }
      setPlaces(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  const selectedIds = useMemo(() => new Set(value.map((p) => p.id)), [value]);

  const handleToggle = (place: SavedPlaceWithDetails) => {
    if (selectedIds.has(place.id)) {
      onChange(value.filter((p) => p.id !== place.id));
    } else {
      onChange([...value, place]);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = value.findIndex((p) => p.id === active.id);
    const newIndex = value.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(value, oldIndex, newIndex));
  };

  const handleAddAll = () => {
    const candidates = places.filter(
      (p) => !selectedIds.has(p.id) && !disabledIds.includes(p.id)
    );
    onChange([...value, ...candidates]);
  };

  const handleClearAll = () => onChange([]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = places.filter((p) => !disabledIds.includes(p.id));
    if (!query) return base;
    return base.filter(
      (p) =>
        p.place.name.toLowerCase().includes(query) ||
        p.place.category?.toLowerCase().includes(query) ||
        p.place.address?.toLowerCase().includes(query)
    );
  }, [places, search, disabledIds]);

  const availableCount = places.filter((p) => !disabledIds.includes(p.id)).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Selected & ordered */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold text-foreground">Selected places</Label>
            <Badge variant="secondary" className="rounded-full">
              {value.length}
            </Badge>
          </div>
          {value.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="rounded-full text-muted-foreground hover:text-destructive"
            >
              <X />
              Clear all
            </Button>
          )}
        </div>

        {value.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
            No places selected yet. Pick some from your saved places below, then drag to order them.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={value.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2">
                {value.map((place, index) => (
                  <SortablePlaceRow
                    key={place.id}
                    place={place}
                    index={index}
                    onToggle={handleToggle}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* Available saved places */}
      <section className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold text-foreground">Your saved places</Label>
            <Badge variant="secondary" className="rounded-full">
              {availableCount}
            </Badge>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddAll}
            disabled={availableCount === 0 || availableCount === value.length}
            className="rounded-full"
          >
            Add all
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your saved places..."
            aria-label="Search saved places"
            className="h-9 rounded-full pl-9"
          />
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border px-4 py-8 text-center">
            <p role="alert" className="text-sm font-medium text-destructive">
              Couldn&apos;t load your saved places.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReloadKey((k) => k + 1)}
              className="rounded-full"
            >
              <RotateCcw />
              Retry
            </Button>
          </div>
        ) : availableCount === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/40 px-4 py-8 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin className="size-5" />
            </span>
            <p className="font-heading text-sm font-semibold">No saved places yet</p>
            <p className="text-sm text-muted-foreground">
              Search the map and bookmark places to build your adventure.
            </p>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link to="/map">Explore the map</Link>
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
            No saved places match &quot;{search}&quot;.
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1">
            {filtered.map((place) => {
              const isSelected = selectedIds.has(place.id);
              return (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => handleToggle(place)}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border bg-card p-2.5 text-left transition-colors',
                      isSelected
                        ? 'border-primary/50 ring-2 ring-primary/15'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background'
                      )}
                    >
                      {isSelected && <Check className="size-3" />}
                    </span>
                    {place.place.photo_url ? (
                      <img
                        src={place.place.photo_url}
                        alt={place.place.name}
                        loading="lazy"
                        className="size-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <MapPin className="size-5" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {place.place.name}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {place.place.category && (
                          <Badge variant="secondary" className="h-4 text-[10px]">
                            {place.place.category}
                          </Badge>
                        )}
                        {place.place.address && (
                          <span className="truncate text-xs text-muted-foreground">
                            {place.place.address}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default memo(PlaceSelector);
