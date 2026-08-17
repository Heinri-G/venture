import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddPlaceSheetBody, type AddPlaceInitial } from './AddPlaceSheet';
import type { SavedPlaceWithDetails } from '@/lib/savedPlaces';

interface AddPlaceSheetSidePanelProps {
  open: boolean;
  onClose: () => void;
  initial?: AddPlaceInitial | null;
  onSaved: (place: SavedPlaceWithDetails) => void;
}

export default function AddPlaceSheetSidePanel({
  open,
  onClose,
  initial,
  onSaved,
}: AddPlaceSheetSidePanelProps) {
  return (
    <div className="relative flex h-full w-96 shrink-0 flex-col border-r">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onClose()}
        className="absolute right-2 top-2 z-10"
        aria-label="Close"
      >
        <X />
      </Button>
      <AddPlaceSheetBody
        open={open}
        onOpenChange={(next) => { if (!next) onClose(); }}
        initial={initial}
        onSaved={onSaved}
      />
    </div>
  );
}
