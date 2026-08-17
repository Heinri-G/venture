import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SavedPlaceDetailsBody } from './SavedPlaceDetails';
import type { SavedPlaceWithDetails } from '@/lib/savedPlaces';

interface SavedPlaceDetailsSidePanelProps {
  place: SavedPlaceWithDetails;
  onClose: () => void;
  onUpdate: (updated: SavedPlaceWithDetails) => void;
  onRequestDelete: (place: SavedPlaceWithDetails) => void;
  onViewOnMap: (place: SavedPlaceWithDetails) => void;
  userLocation: { latitude: number; longitude: number } | null;
}

export default function SavedPlaceDetailsSidePanel({
  place,
  onClose,
  onUpdate,
  onRequestDelete,
  onViewOnMap,
  userLocation,
}: SavedPlaceDetailsSidePanelProps) {
  return (
    <div className="relative flex h-full w-96 shrink-0 flex-col border-r">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        className="absolute right-2 top-2 z-10"
        aria-label="Close"
      >
        <X />
      </Button>
      <SavedPlaceDetailsBody
        place={place}
        onUpdate={onUpdate}
        onRequestDelete={onRequestDelete}
        onViewOnMap={onViewOnMap}
        userLocation={userLocation}
      />
    </div>
  );
}
