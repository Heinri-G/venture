import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LngLatBounds, Marker } from 'maplibre-gl';
import type { MapMouseEvent } from 'maplibre-gl';
import { createRoot, type Root } from 'react-dom/client';
import { useNavigate } from 'react-router-dom';
import { Crosshair, Home, Loader2, MapPin, Navigation, Plus } from 'lucide-react';
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
  const navigate = useNavigate();
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
  const [pinDropMode, setPinDropMode] = useState(false);
  const pinDropRef = useRef<((lat: number, lng: number) => void) | null>(null);

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

  // HTML icon markers, rebuilt when the selection or set changes.
  useEffect(() => {
    if (!map) return;
    const markers = places.map((place) => {
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
  }, [map, places, selectedPlace, handleSelectPlace]);

  // Pin-drop mode: the next canvas click sets the coordinates and opens AddPlaceSheet.
  useEffect(() => {
    pinDropRef.current = pinDropMode
      ? (lat, lng) => {
          setPinDropMode(false);
          setAddInitial({ latitude: lat, longitude: lng });
          setAddOpen(true);
        }
      : null;
  }, [pinDropMode]);

  useEffect(() => {
    if (!map) return;
    const handleClick = (e: MapMouseEvent) => {
      pinDropRef.current?.(e.lngLat.lat, e.lngLat.lng);
    };
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
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
    <div className="flex h-full w-full overflow-hidden bg-muted">
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

        <PlacesSearch
          onPlaceSelect={handleSearchSelect}
          onAddPlace={openManualAdd}
          className="inset-x-4 top-[4.5rem]"
        />

        <Button
          onClick={() => navigate('/')}
          aria-label="Back to home"
          variant="outline"
          size="icon-lg"
          className="absolute left-4 top-4 z-[1100] size-11 rounded-full bg-background shadow-lg"
        >
          <Home />
        </Button>

        <div className="absolute right-4 top-4 z-[1100] flex flex-col gap-2">
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
          <Button
            onClick={() => setPinDropMode((prev) => !prev)}
            aria-label="Drop a pin"
            title="Drop a pin to add a place"
            aria-pressed={pinDropMode}
            variant="outline"
            size="icon-lg"
            className={cn(
              'size-11 rounded-full bg-background shadow-lg',
              pinDropMode ? 'bg-primary text-primary-foreground' : 'text-primary'
            )}
          >
            <Crosshair />
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

        {pinDropMode && (
          <Badge
            variant="secondary"
            className="absolute bottom-24 left-1/2 z-[1100] -translate-x-1/2 shadow"
          >
            Tap the map to drop a pin
          </Badge>
        )}

        {!loading && places.length === 0 && !selectedPlace && (
          <div className="absolute bottom-24 left-1/2 z-[1100] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-background/95 p-5 text-center shadow-lg backdrop-blur">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MapPin className="size-6" />
              </span>
              <div>
                <p className="font-heading text-sm font-semibold">No saved places yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Share a place from Google Maps to start your library.
                </p>
              </div>
              <Button size="sm" onClick={openManualAdd} className="rounded-full">
                <Plus />
                Add from Google Maps
              </Button>
            </div>
          </div>
        )}

        <Button
          onClick={openManualAdd}
          aria-label="Add a place"
          title="Add a place"
          size="icon-lg"
          className="absolute bottom-6 right-4 z-[1100] size-14 rounded-full shadow-lg"
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
