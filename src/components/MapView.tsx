import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LngLatBounds, Marker } from 'maplibre-gl';
import { createRoot, type Root } from 'react-dom/client';
import { Loader2, Navigation, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import PlacesSearch from './PlacesSearch';
import SavedPlaceDetails from './SavedPlaceDetails';
import SavedPlaceDetailsSidePanel from './SavedPlaceDetailsSidePanel';
import AddPlaceSheet, { type AddPlaceInitial } from './AddPlaceSheet';
import AddPlaceSheetSidePanel from './AddPlaceSheetSidePanel';
import FirstRunHint from './FirstRunHint';
import { useMapLibre } from '../hooks/useMapLibre';
import { useIsMobile } from '../hooks/useIsMobile';
import { useUserLocation } from '../hooks/useUserLocation';
import { useAuthUser } from '../lib/useAuthUser';
import { getPlaceIcon, placeIconKey } from '../lib/placeIcons';
import {
  deleteSavedPlace,
  fetchSavedPlaces,
  type SavedPlaceWithDetails,
} from '../lib/savedPlaces';
import { cn } from '../lib/utils';

const FULL_SAVED_LIMIT = 1000;

function createUserLocationElement(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;width:28px;height:28px;';

  const outer = document.createElement('div');
  outer.style.cssText =
    'position:absolute;inset:0;border-radius:50%;background:rgba(66,133,244,0.2);';
  wrapper.appendChild(outer);

  const inner = document.createElement('div');
  inner.style.cssText =
    'position:absolute;left:7px;top:7px;width:14px;height:14px;border-radius:50%;background:#4285F4;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);';
  wrapper.appendChild(inner);

  return wrapper;
}

const DENSITY_GRID_SIZE = 0.25;
function densestCentre(places: SavedPlaceWithDetails[]): [number, number] | null {
  if (places.length === 0) return null;
  const counts = new Map<string, { sumLat: number; sumLng: number; n: number }>();
  for (const p of places) {
    const keyLat = Math.floor(p.place.latitude / DENSITY_GRID_SIZE);
    const keyLng = Math.floor(p.place.longitude / DENSITY_GRID_SIZE);
    const key = `${keyLat}:${keyLng}`;
    const cell = counts.get(key);
    if (cell) {
      cell.sumLat += p.place.latitude;
      cell.sumLng += p.place.longitude;
      cell.n += 1;
    } else {
      counts.set(key, {
        sumLat: p.place.latitude,
        sumLng: p.place.longitude,
        n: 1,
      });
    }
  }
  let best: { sumLat: number; sumLng: number; n: number } | null = null;
  for (const cell of counts.values()) {
    if (!best || cell.n > best.n) best = cell;
  }
  return best ? [best.sumLng / best.n, best.sumLat / best.n] : null;
}

function unmountLater(root: Root) {
  requestAnimationFrame(() => {
    try {
      root.unmount();
    } catch {
      // already unmounted
    }
  });
}

function createMarkerElement(
  place: SavedPlaceWithDetails,
  selected: boolean,
  onClick: () => void
): { el: HTMLElement; cleanup: () => void } {
  const el = document.createElement('button');
  el.type = 'button';
  el.setAttribute('aria-label', place.place.name);
  el.className = cn(
    'flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-lg',
    selected && 'ring-4 ring-primary/30'
  );
  el.addEventListener('click', onClick);

  const iconKey = placeIconKey(place.place.icon, place.place.category);
  const Icon = getPlaceIcon(iconKey);
  const root = createRoot(el);
  root.render(<Icon className="size-4" aria-hidden />);

  return { el, cleanup: () => unmountLater(root) };
}

export default function MapView() {
  const { user } = useAuthUser();
  const { containerRef, map } = useMapLibre();
  const { location: userLocation, loading: locationLoading } = useUserLocation();
  const isMobile = useIsMobile();

  const [places, setPlaces] = useState<SavedPlaceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<SavedPlaceWithDetails | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ latitude: number; longitude: number } | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addInitial, setAddInitial] = useState<AddPlaceInitial | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<SavedPlaceWithDetails | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load the signed-in user's saved places — the map shows only these.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await fetchSavedPlaces(user.id, 0, FULL_SAVED_LIMIT, undefined, 'recent');
      if (cancelled) return;
      setLoading(false);
      if (error) {
        console.error('Error loading saved places:', error);
        return;
      }
      setPlaces(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of places) {
      if (p.place.category) set.add(p.place.category);
    }
    return Array.from(set).sort();
  }, [places]);

  const filteredPlaces = React.useMemo(() => {
    if (!filterCategory) return places;
    return places.filter((p) => p.place.category === filterCategory);
  }, [places, filterCategory]);

  const startupFittedRef = useRef(false);

  // After both places and user-location settle, pick the viewport:
  //   known location   → center on user at city depth
  //   unknown location → show densest cluster of places (or keep default)
  useEffect(() => {
    if (!map || startupFittedRef.current || locationLoading || loading) return;
    startupFittedRef.current = true;

    if (userLocation) {
      map.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 12,
        duration: 1200,
      });
      return;
    }

    if (places.length > 0) {
      const centre = densestCentre(places);
      if (centre) {
        const bounds = new LngLatBounds();
        for (const sp of places) {
          bounds.extend([sp.place.longitude, sp.place.latitude]);
        }
        map.fitBounds(bounds, { padding: 64, maxZoom: 15 });
      }
    }
  }, [map, places, userLocation, locationLoading, loading]);

  // Blue-dot "you are here" marker.
  useEffect(() => {
    if (!map || !userLocation) return;
    const marker = new Marker({ element: createUserLocationElement(), anchor: 'center' })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, userLocation]);

  const handleSelectPlace = useCallback((place: SavedPlaceWithDetails) => {
    setSelectedPlace(place);
  }, []);

  const handleSearchSelect = useCallback((place: SavedPlaceWithDetails) => {
    setFlyTarget({
      latitude: place.place.latitude,
      longitude: place.place.longitude,
    });
    setSelectedPlace(place);
  }, []);

  // HTML icon markers, rebuilt when the selection or filtered set changes.
  useEffect(() => {
    if (!map) return;
    const markers = filteredPlaces.map((place) => {
      const { el, cleanup } = createMarkerElement(place, place.id === selectedPlace?.id, () =>
        handleSelectPlace(place)
      );
      const marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat([place.place.longitude, place.place.latitude])
        .addTo(map);
      return { marker, cleanup };
    });
    return () => {
      markers.forEach(({ marker, cleanup }) => {
        marker.remove();
        cleanup();
      });
    };
  }, [map, filteredPlaces, selectedPlace, handleSelectPlace]);

  // Long-press on the map canvas opens AddPlaceSheet with coordinates.
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0;
    let startY = 0;
    let didMove = false;

    const clear = () => {
      if (timer) { clearTimeout(timer); timer = null; }
    };

    const onDown = (e: PointerEvent) => {
      startX = e.clientX;
      startY = e.clientY;
      didMove = false;
      clear();
      timer = setTimeout(() => {
        if (!didMove) {
          const rect = container.getBoundingClientRect();
          const lngLat = map.unproject([e.clientX - rect.left, e.clientY - rect.top]);
          setAddInitial({ latitude: lngLat.lat, longitude: lngLat.lng });
          setAddOpen(true);
        }
      }, 500);
    };

    const onMove = (e: PointerEvent) => {
      if (
        Math.abs(e.clientX - startX) > 10 ||
        Math.abs(e.clientY - startY) > 10
      ) {
        didMove = true;
        clear();
      }
    };

    const onUp = () => clear();

    container.addEventListener('pointerdown', onDown);
    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerup', onUp);
    container.addEventListener('pointercancel', onUp);
    return () => {
      clear();
      container.removeEventListener('pointerdown', onDown);
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerup', onUp);
      container.removeEventListener('pointercancel', onUp);
    };
  }, [map]);

  // Fly to a target whenever it changes.
  useEffect(() => {
    if (!map || !flyTarget) return;
    map.flyTo({
      center: [flyTarget.longitude, flyTarget.latitude],
      zoom: 14,
      duration: 1200,
    });
  }, [map, flyTarget]);

  const handleLocateMe = () => {
    if (userLocation) {
      map?.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 14,
        duration: 1500,
      });
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map?.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 14,
          duration: 1500,
        });
      },
      (error) => console.error('Geolocation error:', error),
      { enableHighAccuracy: true }
    );
  };

  const handleAddSaved = (place: SavedPlaceWithDetails) => {
    setPlaces((prev) => (prev.some((p) => p.id === place.id) ? prev : [place, ...prev]));
    setFlyTarget({ latitude: place.place.latitude, longitude: place.place.longitude });
  };

  const handleUpdate = useCallback((updated: SavedPlaceWithDetails) => {
    setPlaces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedPlace(updated);
  }, []);

  const handleViewOnMap = useCallback((place: SavedPlaceWithDetails) => {
    setSelectedPlace(null);
    setFlyTarget({ latitude: place.place.latitude, longitude: place.place.longitude });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await deleteSavedPlace(deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error('Could not remove place', { description: error });
      return;
    }
    const removed = deleteTarget;
    setPlaces((prev) => prev.filter((p) => p.id !== removed.id));
    if (selectedPlace?.id === removed.id) setSelectedPlace(null);
    setDeleteTarget(null);
    toast.success('Place removed', { description: removed.place.name });
  }, [deleteTarget, selectedPlace]);

  const openManualAdd = () => {
    setAddInitial(null);
    setAddOpen(true);
  };

  return (
    <div className="flex flex-1 w-full overflow-hidden bg-muted">
      {!isMobile && selectedPlace && (
        <SavedPlaceDetailsSidePanel
          key={selectedPlace.id}
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onUpdate={handleUpdate}
          onRequestDelete={setDeleteTarget}
          onViewOnMap={handleViewOnMap}
          userLocation={userLocation}
        />
      )}

      {!isMobile && addOpen && (
        <AddPlaceSheetSidePanel
          open={addOpen}
          onClose={() => setAddOpen(false)}
          initial={addInitial}
          onSaved={handleAddSaved}
        />
      )}

      <div className="relative isolate min-w-0 flex-1">
        <div ref={containerRef} className="h-full w-full" />

        {/* Search bar — top of viewport */}
        <PlacesSearch
          onPlaceSelect={handleSearchSelect}
          onAddPlace={openManualAdd}
          className="inset-x-4 top-4"
        />

        {/* Category filter pills — below search */}
        {categories.length > 0 && (
          <div className="no-scrollbar absolute inset-x-0 top-[4.25rem] z-[1100] flex gap-2 overflow-x-auto px-4">
            <button
              type="button"
              onClick={() => setFilterCategory(null)}
              aria-pressed={filterCategory === null}
              className={cn(
                'h-8 shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors',
                filterCategory === null
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'bg-background/90 text-muted-foreground shadow-sm backdrop-blur hover:bg-background hover:text-foreground'
              )}
            >
              All
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
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'bg-background/90 text-muted-foreground shadow-sm backdrop-blur hover:bg-background hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Right-side button column — below category pills (or search if no pills) */}
        <div className={cn(
          'absolute right-4 z-[1100] flex flex-col gap-2',
          categories.length > 0 ? 'top-[7.5rem]' : 'top-[5.75rem]'
        )}>
          <Button
            onClick={handleLocateMe}
            aria-label="Current location"
            title="Current location"
            variant="outline"
            size="icon-lg"
            className="size-11 rounded-full bg-background text-primary shadow-lg"
          >
            <Navigation />
          </Button>
        </div>

        {loading && (
          <Badge
            variant="secondary"
            className="absolute left-1/2 top-4 z-[1100] -translate-x-1/2 shadow"
          >
            Loading places...
          </Badge>
        )}

        {!loading && places.length === 0 && !selectedPlace && (
          <div className="absolute bottom-24 left-1/2 z-[1100] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2">
            <FirstRunHint />
          </div>
        )}

        <Button
          onClick={openManualAdd}
          aria-label="Add a place"
          title="Add a place"
          size="icon-lg"
          className="absolute bottom-12 right-4 z-[1100] size-14 rounded-full shadow-lg"
        >
          <Plus className="size-6" />
        </Button>

        {isMobile && (
          <>
            <AddPlaceSheet
              open={addOpen}
              onOpenChange={setAddOpen}
              initial={addInitial}
              onSaved={handleAddSaved}
            />

            <SavedPlaceDetails
              key={selectedPlace?.id ?? 'none'}
              place={selectedPlace}
              isOpen={Boolean(selectedPlace)}
              onClose={() => setSelectedPlace(null)}
              onUpdate={handleUpdate}
              onRequestDelete={setDeleteTarget}
              onViewOnMap={handleViewOnMap}
              userLocation={userLocation}
            />
          </>
        )}
      </div>

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
              {deleting ? <Loader2 className="animate-spin" /> : null}
              {deleting ? 'Removing...' : 'Remove'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
