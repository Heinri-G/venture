import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, List, Loader2, Map as MapIcon, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import SavedPlacesList from './components/SavedPlacesList';
import SavedPlacesMap from './components/SavedPlacesMap';
import SavedPlaceDetails from './components/SavedPlaceDetails';
import SavedPlaceDetailsSidePanel from './components/SavedPlaceDetailsSidePanel';
import { useIsMobile } from './hooks/useIsMobile';
import { useAuthUser } from './lib/useAuthUser';
import {
  deleteSavedPlace,
  fetchSavedPlaceCategories,
  fetchSavedPlaces,
  type SavedPlaceWithDetails,
  type SavedPlacesSortBy,
} from './lib/savedPlaces';
import { haversineKm } from './lib/distance';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Skeleton } from './components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './components/ui/alert-dialog';
import { cn } from './lib/utils';

const PAGE_SIZE = 20;
const SAVED_VIEW_KEY = 'venture:saved-view';

const SORT_OPTIONS: { value: SavedPlacesSortBy; label: string }[] = [
  { value: 'recent', label: 'Recently saved' },
  { value: 'rated', label: 'Highest rated' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'distance', label: 'Distance' },
];

function loadStoredView(): 'list' | 'map' {
  try {
    return localStorage.getItem(SAVED_VIEW_KEY) === 'map' ? 'map' : 'list';
  } catch {
    return 'list';
  }
}

function sortByDistance(
  list: SavedPlaceWithDetails[],
  location: { latitude: number; longitude: number }
): SavedPlaceWithDetails[] {
  return [...list].sort(
    (a, b) =>
      haversineKm(location.latitude, location.longitude, a.place.latitude, a.place.longitude) -
      haversineKm(location.latitude, location.longitude, b.place.latitude, b.place.longitude)
  );
}

function sortAlphabetical(list: SavedPlaceWithDetails[]): SavedPlaceWithDetails[] {
  return [...list].sort((a, b) =>
    a.place.name.localeCompare(b.place.name, undefined, { sensitivity: 'base' })
  );
}

export default function SavedPlaces() {
  const { user } = useAuthUser();
  const isMobile = useIsMobile();

  const [places, setPlaces] = useState<SavedPlaceWithDetails[]>([]);
  const [mapPlaces, setMapPlaces] = useState<SavedPlaceWithDetails[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedView, setSelectedView] = useState<'list' | 'map'>(loadStoredView);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SavedPlacesSortBy>('recent');
  const [categories, setCategories] = useState<string[]>([]);

  const [selectedPlace, setSelectedPlace] = useState<SavedPlaceWithDetails | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<{ id: string; latitude: number; longitude: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedPlaceWithDetails | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const locationRequestedRef = useRef(false);

  // Request the user's location once per page load to compute distances.
  useEffect(() => {
    if (!user || locationRequestedRef.current || !navigator.geolocation) return;
    locationRequestedRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => {
        // Location unavailable — distance-based features stay hidden.
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [user]);

  // Build the list of available categories from the user's saved places.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchSavedPlaceCategories(user.id).then((cats) => {
      if (!cancelled) setCategories(cats);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Load the first page of saved places whenever the filter/sort/location changes.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setInitialLoading(true);
      setError(null);
      setHasMore(false);
      setPage(0);

      const clientSort = sortBy === 'distance' || sortBy === 'alphabetical';
      const distanceMode = sortBy === 'distance' && userLocation != null;
      const fetchSort: SavedPlacesSortBy = clientSort ? 'recent' : sortBy;
      const effectivePageSize = clientSort ? 1000 : PAGE_SIZE;

      const { data, error: fetchError, totalCount: count } = await fetchSavedPlaces(
        user.id,
        0,
        effectivePageSize,
        filterCategory ?? undefined,
        fetchSort
      );
      if (cancelled) return;
      setInitialLoading(false);
      if (fetchError) {
        setError(fetchError);
        setPlaces([]);
        setTotalCount(0);
        return;
      }
      setPlaces(
        sortBy === 'alphabetical'
          ? sortAlphabetical(data)
          : distanceMode
            ? sortByDistance(data, userLocation)
            : data
      );
      setTotalCount(count);
      setHasMore(!clientSort && data.length === PAGE_SIZE);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, filterCategory, sortBy, userLocation, reloadKey]);

  // Load the full set of places for the map view (markers need everything).
  useEffect(() => {
    if (!user || selectedView !== 'map') return;
    let cancelled = false;

    (async () => {
      setMapLoading(true);
      const { data, error: fetchError } = await fetchSavedPlaces(
        user.id,
        0,
        1000,
        filterCategory ?? undefined,
        'recent'
      );
      if (cancelled) return;
      setMapLoading(false);
      if (fetchError) {
        console.error('Error loading saved places map:', fetchError);
        setMapPlaces([]);
        return;
      }
      setMapPlaces(
        sortBy === 'alphabetical'
          ? sortAlphabetical(data)
          : sortBy === 'distance' && userLocation
            ? sortByDistance(data, userLocation)
            : data
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [user, selectedView, filterCategory, sortBy, userLocation]);

  const loadMore = useCallback(async () => {
    if (!user || loadingMore || !hasMore || sortBy === 'distance' || sortBy === 'alphabetical') return;
    const nextPage = page + 1;
    setLoadingMore(true);
    const { data, error: fetchError } = await fetchSavedPlaces(
      user.id,
      nextPage,
      PAGE_SIZE,
      filterCategory ?? undefined,
      sortBy
    );
    setLoadingMore(false);
    if (fetchError) {
      toast.error('Could not load more places', { description: fetchError });
      return;
    }
    setPlaces((prev) => {
      const merged = [...prev];
      for (const item of data) {
        if (!merged.some((p) => p.id === item.id)) merged.push(item);
      }
      return merged;
    });
    setPage(nextPage);
    setHasMore(data.length === PAGE_SIZE);
  }, [user, loadingMore, hasMore, page, sortBy, filterCategory]);

  const handleSelectPlace = useCallback((place: SavedPlaceWithDetails) => {
    setSelectedPlace(place);
    setFlyToTarget({
      id: place.id,
      latitude: place.place.latitude,
      longitude: place.place.longitude,
    });
  }, []);

  const handleViewOnMap = useCallback((place: SavedPlaceWithDetails) => {
    setSelectedPlace(null);
    setSelectedView('map');
    try {
      localStorage.setItem(SAVED_VIEW_KEY, 'map');
    } catch {
      // Persistence is best-effort.
    }
    setFlyToTarget({
      id: place.id,
      latitude: place.place.latitude,
      longitude: place.place.longitude,
    });
  }, []);

  const handleUpdate = useCallback((updated: SavedPlaceWithDetails) => {
    setPlaces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setMapPlaces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedPlace(updated);
  }, []);

  const handleRequestDelete = useCallback((place: SavedPlaceWithDetails) => {
    setDeleteTarget(place);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: deleteError } = await deleteSavedPlace(deleteTarget.id);
    setDeleting(false);
    if (deleteError) {
      toast.error('Could not remove place', { description: deleteError });
      return;
    }
    const removed = deleteTarget;
    setPlaces((prev) => prev.filter((p) => p.id !== removed.id));
    setMapPlaces((prev) => prev.filter((p) => p.id !== removed.id));
    setTotalCount((count) => Math.max(0, count - 1));
    if (selectedPlace?.id === removed.id) setSelectedPlace(null);
    if (flyToTarget?.id === removed.id) setFlyToTarget(null);
    setDeleteTarget(null);
    if (user) {
      fetchSavedPlaceCategories(user.id).then(setCategories);
    }
    toast.success('Place removed', { description: removed.place.name });
  }, [deleteTarget, selectedPlace, flyToTarget, user]);

  const handleViewChange = useCallback((value: string) => {
    const view = value === 'map' ? 'map' : 'list';
    setSelectedView(view);
    try {
      localStorage.setItem(SAVED_VIEW_KEY, view);
    } catch {
      // Persistence is best-effort.
    }
  }, []);

  const resetFilters = useCallback(() => {
    setFilterCategory(null);
    setSortBy('recent');
  }, []);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasActiveFilters = filterCategory !== null || sortBy !== 'recent';

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Saved Places</h1>
          {totalCount > 0 && (
            <Badge variant="secondary" className="rounded-full">
              {totalCount}
            </Badge>
          )}
        </div>
        <Tabs value={selectedView} onValueChange={handleViewChange}>
          <TabsList className="rounded-full">
            <TabsTrigger value="list">
              <List />
              List
            </TabsTrigger>
            <TabsTrigger value="map">
              <MapIcon />
              Map
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters & sorting */}
      <div className="mb-4 flex flex-col gap-3">
        {categories.length > 0 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <button
              type="button"
              onClick={() => setFilterCategory(null)}
              aria-pressed={filterCategory === null}
              className={cn(
                'h-8 shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors',
                filterCategory === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                aria-pressed={filterCategory === cat}
                className={cn(
                  'h-8 shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors',
                  filterCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SavedPlacesSortBy)}
            aria-label="Sort saved places"
            className="h-8 min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="rounded-full">
              <RotateCcw />
              Reset
            </Button>
          )}

          {totalCount > 0 && (
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              Showing {Math.min(places.length, totalCount)} of {totalCount}
            </span>
          )}
        </div>

        {sortBy === 'distance' && !userLocation && (
          <p className="text-xs text-muted-foreground">
            Location unavailable — showing by most recently saved.
          </p>
        )}
      </div>

      {/* Content */}
      <div className="relative min-h-0 flex-1 flex">
        {!isMobile && selectedPlace && (
          <SavedPlaceDetailsSidePanel
            key={selectedPlace.id}
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
            onUpdate={handleUpdate}
            onRequestDelete={handleRequestDelete}
            onViewOnMap={handleViewOnMap}
            userLocation={userLocation}
          />
        )}

        <div className="min-w-0 flex-1">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
              <p role="alert" className="text-sm font-medium text-destructive">
                Couldn&apos;t load your saved places.
              </p>
              <Button variant="outline" onClick={retry} className="rounded-full">
                <RotateCcw />
                Retry
              </Button>
            </div>
          ) : initialLoading ? (
            <div className="flex h-full flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : places.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bookmark className="size-6" />
              </span>
              {filterCategory ? (
                <>
                  <p className="font-heading text-lg font-semibold">
                    No saved places in this category
                  </p>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Try a different category or clear your filters.
                  </p>
                  <Button variant="outline" onClick={resetFilters} className="rounded-full">
                    <RotateCcw />
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-heading text-lg font-semibold">
                    No saved places yet. Start exploring!
                  </p>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Search the map and bookmark the places you love.
                  </p>
                  <Button asChild size="lg" className="rounded-full">
                    <Link to="/map">
                      <MapIcon />
                      Explore the map
                    </Link>
                  </Button>
                </>
              )}
            </div>
          ) : selectedView === 'list' ? (
            <SavedPlacesList
              places={places}
              selectedPlaceId={selectedPlace?.id ?? null}
              userLocation={userLocation}
              onSelectPlace={handleSelectPlace}
              onRequestDelete={handleRequestDelete}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          ) : (
            <SavedPlacesMap
              places={mapPlaces}
              selectedPlaceId={selectedPlace?.id ?? null}
              flyToTarget={flyToTarget}
              onSelectPlace={handleSelectPlace}
              onBackToList={() => handleViewChange('list')}
              loading={mapLoading}
            />
          )}
        </div>
      </div>

      {isMobile && (
        <SavedPlaceDetails
          key={selectedPlace?.id ?? 'none'}
          place={selectedPlace}
          isOpen={Boolean(selectedPlace)}
          onClose={() => setSelectedPlace(null)}
          onUpdate={handleUpdate}
          onRequestDelete={handleRequestDelete}
          onViewOnMap={handleViewOnMap}
          userLocation={userLocation}
        />
      )}

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from saved places?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {deleteTarget?.place.name} from your saved places? This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
              className="rounded-full"
            >
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {deleting ? 'Removing...' : 'Remove'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
