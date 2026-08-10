import React, { useState } from 'react';
import { Star, MapPin, BookmarkCheck, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { savePlace, PlaceInput } from '@/app/actions/places';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface PlaceDetailsSheetProps {
  place: {
    fsq_id?: string;
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
    category?: string;
    photo_url?: string;
    rating?: number;
    description?: string;
  } | null;
  onClose: () => void;
  onSavedSuccess?: () => void;
}

export default function PlaceDetailsSheet({ place, onClose, onSavedSuccess }: PlaceDetailsSheetProps) {
  const [open, setOpen] = useState(true);
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!place) return null;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setOpen(false);
      window.setTimeout(onClose, 200);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const placeInput: PlaceInput = {
      foursquare_fsq_id: place.fsq_id,
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      category: place.category,
      photo_url: place.photo_url,
    };

    const res = await savePlace(placeInput, notes, rating);

    setSaving(false);
    if (res.error) {
      setError(res.error);
      toast.error('Could not save place', { description: res.error });
      return;
    }

    setSaved(true);
    onSavedSuccess?.();
    toast.success('Saved to your places', { description: place.name });
    window.setTimeout(() => handleOpenChange(false), 1000);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-md gap-0 rounded-t-2xl p-0 sm:max-w-lg">
        <div className="flex max-h-[80dvh] flex-col gap-4 overflow-y-auto px-4 pb-6 pt-6">
          {place.photo_url && (
            <div className="h-40 w-full shrink-0 overflow-hidden rounded-xl border">
              <img
                src={place.photo_url}
                alt={place.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
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

          {place.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{place.description}</p>
          )}

          <Separator />

          <div className="flex flex-col gap-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your rating</Label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  className="rounded-md p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      'size-6',
                      star <= rating
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground/30'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="place-notes" className="text-xs uppercase tracking-wider text-muted-foreground">
              Personal notes
            </Label>
            <Textarea
              id="place-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What makes this place special? Best time to visit..."
              rows={3}
              className="resize-none"
            />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button
            onClick={handleSave}
            disabled={saving || saved}
            size="lg"
            className="h-12 w-full rounded-full"
          >
            {saved ? (
              <>
                <BookmarkCheck />
                Saved
              </>
            ) : (
              <>
                <Heart />
                {saving ? 'Saving...' : 'Save Place'}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
