import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import {
  ArrowLeft,
  Check,
  Eye,
  GripVertical,
  Globe,
  Loader2,
  Lock,
  Map as MapIcon,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Share2,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import AdventureMap, { type AdventureMapPlace } from './components/AdventureMap';
import { PlaceIcon } from './components/PlaceIcon';
import PlaceSelector from './components/PlaceSelector';
import ShareAdventureModal from './components/ShareAdventureModal';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Separator } from './components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './components/ui/sheet';
import { Skeleton } from './components/ui/skeleton';
import { useAuthUser } from './lib/useAuthUser';
import {
  deleteAdventure,
  fetchAdventureWithPlaces,
  formatRelativeTime,
  linkPlacesToAdventure,
  removeAllPlacesFromAdventure,
  removePlaceFromAdventure,
  reorderAdventurePlaces,
  type AdventureWithPlaces,
} from './lib/adventures';
import { haversineKm } from './lib/distance';
import { placeIconKey } from './lib/placeIcons';
import { supabase } from './lib/supabase/client';
import type { SavedPlaceWithDetails } from './lib/savedPlaces';
import { cn } from './lib/utils';

const VISIBILITY_META = {
  private: { label: 'Private', icon: Lock },
  shared: { label: 'Shared', icon: Users },
  public: { label: 'Public', icon: Globe },
} as const;

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

function SortablePlaceRow({
  place,
  index,
  onRemove,
  disabled,
}: {
  place: AdventureWithPlaces['adventure_places'][number];
  index: number;
  onRemove: (place: AdventureWithPlaces['adventure_places'][number]) => void;
  disabled?: boolean;
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
        aria-label={`Reorder ${place.saved_place.place.name}`}
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {place.saved_place.place.name}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onRemove(place)}
        disabled={disabled}
        aria-label={`Remove ${place.saved_place.place.name} from adventure`}
        className="shrink-0 rounded-full text-muted-foreground hover:text-destructive"
      >
        <Minus className="size-4" />
      </Button>
    </li>
  );
}

export default function AdventureDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthUser();

  const [adventure, setAdventure] = useState<AdventureWithPlaces | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedPlaceKey, setSelectedPlaceKey] = useState<string | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<AdventureMapPlace | null>(null);

  const [editingOrder, setEditingOrder] = useState(false);
  const [orderDraft, setOrderDraft] = useState<AdventureWithPlaces['adventure_places']>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<SavedPlaceWithDetails[]>([]);
  const [adding, setAdding] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<AdventureWithPlaces['adventure_places'][number] | null>(null);
  const [removing, setRemoving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [owner, setOwner] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await fetchAdventureWithPlaces(id);
      if (cancelled) return;
      setLoading(false);
      if (fetchError) {
        setError(fetchError);
        setAdventure(null);
        return;
      }
      if (!data) {
        setError('Adventure not found.');
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
  }, [id, reloadKey]);

  useEffect(() => {
    if (!adventure) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', adventure.owner_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setOwner(data as { display_name: string | null; avatar_url: string | null });
      });
    return () => {
      cancelled = true;
    };
  }, [adventure]);

  const isOwner = Boolean(user && adventure && user.id === adventure.owner_id);

  const mapPlaces: AdventureMapPlace[] = useMemo(
    () =>
      (adventure?.adventure_places ?? []).map((ap) => ({
        key: ap.id,
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

  const handleListItemClick = useCallback((ap: AdventureWithPlaces['adventure_places'][number]) => {
    setSelectedPlaceKey(ap.id);
    setFlyToTarget({
      key: ap.id,
      name: ap.saved_place.place.name,
      latitude: ap.saved_place.place.latitude,
      longitude: ap.saved_place.place.longitude,
    });
  }, []);

  const enterReorderMode = useCallback(() => {
    if (!adventure) return;
    setOrderDraft([...adventure.adventure_places].sort((a, b) => a.order_index - b.order_index));
    setEditingOrder(true);
  }, [adventure]);

  const handleOrderDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = orderDraft.findIndex((p) => p.id === active.id);
      const newIndex = orderDraft.findIndex((p) => p.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      setOrderDraft((draft) => arrayMove(draft, oldIndex, newIndex));
    },
    [orderDraft]
  );

  const handleSaveOrder = useCallback(async () => {
    if (!adventure) return;
    setSavingOrder(true);
    const { error: reorderError } = await reorderAdventurePlaces(
      orderDraft.map((place, index) => ({ id: place.id, orderIndex: index }))
    );
    setSavingOrder(false);
    if (reorderError) {
      toast.error('Could not save the new order', { description: reorderError });
      return;
    }
    setEditingOrder(false);
    toast.success('Adventure order updated');
    setReloadKey((key) => key + 1);
  }, [adventure, orderDraft]);

  const openAddSheet = useCallback(() => {
    if (!adventure) return;
    setAddDraft(
      [...adventure.adventure_places]
        .sort((a, b) => a.order_index - b.order_index)
        .map((ap) => ap.saved_place)
    );
    setAddOpen(true);
  }, [adventure]);

  const handleSaveAddPlaces = useCallback(async () => {
    if (!adventure) return;
    setAdding(true);
    try {
      const { error: clearError } = await removeAllPlacesFromAdventure(adventure.id);
      if (clearError) throw new Error(clearError);
      const { error: linkError } = await linkPlacesToAdventure(
        adventure.id,
        addDraft.map((place, index) => ({ savedPlaceId: place.id, orderIndex: index }))
      );
      if (linkError) throw new Error(linkError);
      setAddOpen(false);
      toast.success('Places updated', { description: `${addDraft.length} places in this adventure` });
      setReloadKey((key) => key + 1);
    } catch (err) {
      toast.error('Could not update places', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setAdding(false);
    }
  }, [adventure, addDraft]);

  const handleRequestRemove = useCallback((place: AdventureWithPlaces['adventure_places'][number]) => {
    setRemoveTarget(place);
  }, []);

  const confirmRemove = useCallback(async () => {
    if (!removeTarget) return;
    setRemoving(true);
    const { error: removeError } = await removePlaceFromAdventure(removeTarget.id);
    setRemoving(false);
    if (removeError) {
      toast.error('Could not remove place', { description: removeError });
      return;
    }
    toast.success('Place removed', { description: removeTarget.saved_place.place.name });
    setRemoveTarget(null);
    setReloadKey((key) => key + 1);
  }, [removeTarget]);

  const confirmDelete = useCallback(async () => {
    if (!adventure) return;
    setDeleting(true);
    const { error: deleteError } = await deleteAdventure(adventure.id);
    setDeleting(false);
    if (deleteError) {
      toast.error('Could not delete adventure', { description: deleteError });
      return;
    }
    toast.success('Adventure deleted');
    navigate('/adventures');
  }, [adventure, navigate]);

  const handleShare = useCallback(() => {
    if (!adventure) return;
    setShareOpen(true);
  }, [adventure]);

  if (!user) return null;

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
        <p role="alert" className="font-heading text-lg font-semibold">Adventure not found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {error || 'This adventure may have been deleted, or you may not have access to it.'}
        </p>
        <div className="mt-2 flex gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/adventures">
              <ArrowLeft />
              Back to adventures
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)} className="rounded-full">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const meta = VISIBILITY_META[adventure.visibility];
  const VisibilityIcon = meta.icon;
  const orderedPlaces = [...adventure.adventure_places].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground">
          <Link to="/adventures">
            <ArrowLeft />
            Adventures
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
                  <VisibilityIcon className="size-3" />
                  {meta.label}
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
                <>
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link to={`/adventures/${adventure.id}/edit`}>
                      <Pencil />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteTarget(true)}
                    className="rounded-full"
                  >
                    <Trash2 />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Avatar className="size-6">
                {owner?.avatar_url ? (
                  <AvatarImage src={owner.avatar_url} alt="" className="size-6 rounded-full object-cover" />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                  {(owner?.display_name || 'U').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {owner?.display_name || 'You'}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="size-4 text-primary" />
              {orderedPlaces.length} {orderedPlaces.length === 1 ? 'place' : 'places'}
            </span>
            <span className="flex items-center gap-1.5">
              <Plus className="size-4 text-primary" />
              Created {formatDate(adventure.created_at)}
            </span>
            <span className="flex items-center gap-1.5">
              <Pencil className="size-4 text-primary" />
              Updated {formatRelativeTime(adventure.updated_at)}
            </span>
          </div>
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
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={openAddSheet}
                className="rounded-full"
              >
                <Plus />
                Add places
              </Button>
            )}
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
              {isOwner && (
                <Button variant="outline" size="sm" onClick={openAddSheet} className="rounded-full">
                  <Plus />
                  Add places
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold">
              <MapPin className="size-4 text-primary" />
              Places
            </h2>
            {isOwner && !editingOrder && orderedPlaces.length > 1 && (
              <Button variant="outline" size="sm" onClick={enterReorderMode} className="rounded-full">
                <GripVertical />
                Reorder
              </Button>
            )}
          </div>

          {editingOrder ? (
            <div className="flex flex-col gap-3">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleOrderDragEnd}
              >
                <SortableContext
                  items={orderDraft.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex flex-col gap-2">
                    {orderDraft.map((place, index) => (
                      <SortablePlaceRow
                        key={place.id}
                        place={place}
                        index={index}
                        onRemove={handleRequestRemove}
                        disabled={savingOrder}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => setEditingOrder(false)}
                  disabled={savingOrder}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-full"
                  onClick={handleSaveOrder}
                  disabled={savingOrder}
                >
                  {savingOrder ? <Loader2 className="animate-spin" /> : <Check />}
                  Save order
                </Button>
              </div>
            </div>
          ) : (
            <div className="max-h-[34rem] overflow-y-auto rounded-2xl border border-border bg-card">
              {orderedPlaces.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <MapPin className="size-7 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No places in this adventure yet.</p>
                </div>
              ) : (
                <ol className="flex flex-col divide-y divide-border">
                  {orderedPlaces.map((ap, index) => {
                    const place = ap.saved_place.place;
                    const next = orderedPlaces[index + 1];
                    const distance =
                      next != null
                        ? haversineKm(place.latitude, place.longitude, next.saved_place.place.latitude, next.saved_place.place.longitude)
                        : null;
                    const selected = selectedPlaceKey === ap.id;
                    return (
                      <li key={ap.id}>
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

                          <PlaceIcon
                            icon={placeIconKey(place.icon, place.category)}
                            className="mt-0.5 size-12 shrink-0 rounded-lg"
                            iconClassName="size-5"
                          />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add places sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" showCloseButton className="mx-auto max-w-md gap-0 rounded-t-2xl p-0 sm:max-w-lg">
          <SheetHeader className="px-4 pb-3 pt-4">
            <SheetTitle>Add places</SheetTitle>
            <SheetDescription>
              Pick places from your saved list. Drag to order them, then save.
            </SheetDescription>
          </SheetHeader>
          <div className="max-h-[65dvh] overflow-y-auto px-4 pb-4">
            <PlaceSelector userId={user.id} value={addDraft} onChange={setAddDraft} />
          </div>
          <div className="flex gap-2 border-t px-4 py-3">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button className="flex-1 rounded-full" onClick={handleSaveAddPlaces} disabled={adding}>
              {adding ? <Loader2 className="animate-spin" /> : <Check />}
              Save places
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Remove place confirmation */}
      <AlertDialog
        open={removeTarget != null}
        onOpenChange={(open) => {
          if (!open && !removing) setRemoveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.saved_place.place.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the place from this adventure. It stays in your saved places.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={removing} className="rounded-full">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemove} disabled={removing} className="rounded-full">
              {removing ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete adventure confirmation */}
      <AlertDialog
        open={deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{adventure.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the adventure and all {orderedPlaces.length} linked places.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(false)} disabled={deleting} className="rounded-full">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting} className="rounded-full">
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {deleting ? 'Deleting...' : 'Delete adventure'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share / access */}
      <ShareAdventureModal
        adventure={adventure}
        userId={user.id}
        open={shareOpen}
        onOpenChange={setShareOpen}
        onShared={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
