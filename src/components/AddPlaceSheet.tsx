import React, { useEffect, useState } from 'react';
import { Link2, Loader2, MapPin, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuthUser } from '@/lib/useAuthUser';
import { resolveGoogleMapsShare, isShortMapsUrl, type ResolvedMapsPlace } from '@/lib/googleMapsLink';
import { categoryForIcon } from '@/lib/placeIcons';
import {
  findSavedPlaceByProviderId,
  getOrCreatePlace,
  upsertSavedPlace,
  type SavedPlaceWithDetails,
} from '@/lib/savedPlaces';
import IconPicker from './IconPicker';
import { PlaceIcon } from './PlaceIcon';

export interface AddPlaceInitial {
  text?: string;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  mapsUrl?: string;
}

interface AddPlaceSheetBodyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: AddPlaceInitial | null;
  onSaved: (place: SavedPlaceWithDetails) => void;
}

type AddPlaceSheetProps = AddPlaceSheetBodyProps;

function parseCoord(value: string): number | null {
  if (!value.trim()) return null;
  // Handle comma as decimal separator (common on European mobile keyboards)
  const normalized = value.trim().replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function AddPlaceSheetBody({
  open,
  onOpenChange,
  initial,
  onSaved,
}: AddPlaceSheetBodyProps) {
  const { user } = useAuthUser();

  const [mode, setMode] = useState<'share' | 'manual'>('share');
  const [shareText, setShareText] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedMapsPlace | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);

  const googlePlaceId = resolved?.googlePlaceId ?? null;
  const resolvedMapsUrl =
    resolved?.mapsUrl && !isShortMapsUrl(resolved.mapsUrl) ? resolved.mapsUrl
    : initial?.mapsUrl && !isShortMapsUrl(initial.mapsUrl) ? initial.mapsUrl
    : null;

  const applyResolved = (place: ResolvedMapsPlace) => {
    setResolved(place);
    if (place.name) setName(place.name);
    if (place.address) setAddress(place.address);
    if (place.latitude != null) setLatInput(String(place.latitude));
    if (place.longitude != null) setLngInput(String(place.longitude));
  };

  const handleResolve = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setResolveError('Paste a Google Maps link first.');
      return;
    }
    setResolving(true);
    setResolveError(null);
    const { data, error: resolveErr } = await resolveGoogleMapsShare(trimmed);
    setResolving(false);
    if (resolveErr) {
      setResolveError(resolveErr);
      setResolved(null);
      return;
    }
    if (data) applyResolved(data);
  };

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode('share');
    setShareText('');
    setResolved(null);
    setResolveError(null);
    setName('');
    setAddress('');
    setLatInput('');
    setLngInput('');
    setIcon(null);
    setCategory(null);
    setError(null);
    setDuplicate(false);

    if (initial?.text) {
      setShareText(initial.text);
      void handleResolve(initial.text);
    } else if (initial?.latitude != null && initial.longitude != null) {
      setMode('manual');
      setName(initial.name ?? '');
      setAddress(initial.address ?? '');
      setLatInput(String(initial.latitude));
      setLngInput(String(initial.longitude));
    } else if (initial?.name) {
      setMode('manual');
      setName(initial.name);
      setAddress(initial.address ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const handleIconChange = (key: string) => {
    setIcon(key);
    const suggested = categoryForIcon(key);
    if (suggested) setCategory(suggested);
  };

  const latitude = parseCoord(latInput);
  const longitude = parseCoord(lngInput);
  const canSave =
    Boolean(name.trim()) &&
    latitude != null &&
    longitude != null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  const handleSave = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    setError(null);

    const finalLat = latitude as number;
    const finalLng = longitude as number;
    const provider = googlePlaceId ? 'google' : 'manual';

    if (googlePlaceId) {
      const existing = await findSavedPlaceByProviderId(user.id, 'google', googlePlaceId);
      if (existing.data) {
        setSaving(false);
        setDuplicate(true);
        return;
      }
    }

    const { placeId, error: placeError } = await getOrCreatePlace({
      provider,
      providerPlaceId: googlePlaceId ?? undefined,
      name: name.trim(),
      address: address.trim() || undefined,
      latitude: finalLat,
      longitude: finalLng,
      category: category ?? undefined,
      icon: icon ?? undefined,
      mapsUrl: resolvedMapsUrl ?? undefined,
    });
    if (placeError || !placeId) {
      setSaving(false);
      const message = placeError || 'Failed to save place.';
      setError(message);
      toast.error('Could not add place', { description: message });
      return;
    }

    const { data: saved, error: saveError } = await upsertSavedPlace({
      userId: user.id,
      placeId,
      rating: null,
      notes: null,
    });
    setSaving(false);
    if (saveError || !saved) {
      const message = saveError || 'Failed to save place.';
      setError(message);
      toast.error('Could not add place', { description: message });
      return;
    }

    const details: SavedPlaceWithDetails = {
      id: saved.id,
      user_id: user.id,
      place_id: saved.place_id,
      rating: null,
      notes: null,
      created_at: saved.created_at,
      updated_at: saved.updated_at,
      place: {
        id: saved.place_id,
        provider,
        provider_place_id: googlePlaceId,
        name: name.trim(),
        address: address.trim() || null,
        latitude: finalLat,
        longitude: finalLng,
        category: category ?? null,
        icon: icon ?? null,
        maps_url: resolvedMapsUrl,
        created_at: new Date().toISOString(),
      },
    };
    onSaved(details);
    onOpenChange(false);
    toast.success('Place added', { description: name.trim() });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-popover">
      <div className="px-4 pb-3 pt-4">
        <h2 className="font-heading text-base font-medium text-foreground">Add a place</h2>
        <p className="text-sm text-muted-foreground">
          Share from Google Maps, or add the details by hand.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as 'share' | 'manual')}
          className="mb-4"
        >
          <TabsList className="w-full rounded-full">
            <TabsTrigger value="share" className="flex-1">
              <Link2 />
              From Google Maps
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">
              <MapPin />
              Manual
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === 'share' ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="share-text">Paste a Google Maps link or share text</Label>
              <Textarea
                id="share-text"
                value={shareText}
                onChange={(e) => setShareText(e.target.value)}
                placeholder={'e.g. Bonanza Coffee Roasters\nhttps://maps.app.goo.gl/abc123'}
                rows={3}
                className="resize-none"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleResolve(shareText)}
                disabled={resolving}
                className="w-full rounded-full"
              >
                {resolving ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                {resolving ? 'Resolving...' : 'Resolve link'}
              </Button>
              {resolveError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {resolveError}
                </p>
              )}
            </div>

            {resolved && (
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="size-3.5 text-primary" />
                  Resolved details
                </p>
                {resolved.needsReview && (
                  <p className="text-xs text-muted-foreground">
                    {name || latitude != null
                      ? 'The link didn\u2019t include everything \u2014 check the details below.'
                      : 'Could not extract details from that link. Try opening it in Google Maps and sharing again, or fill in the details below by hand.'}
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="resolved-name" className="text-xs text-muted-foreground">
                    Name
                  </Label>
                  <Input
                    id="resolved-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="resolved-address" className="text-xs text-muted-foreground">
                    Address
                  </Label>
                  <Input
                    id="resolved-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="resolved-lat" className="text-xs text-muted-foreground">
                      Latitude
                    </Label>
                    <Input
                      id="resolved-lat"
                      value={latInput}
                      onChange={(e) => setLatInput(e.target.value)}
                      inputMode="decimal"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="resolved-lng" className="text-xs text-muted-foreground">
                      Longitude
                    </Label>
                    <Input
                      id="resolved-lng"
                      value={lngInput}
                      onChange={(e) => setLngInput(e.target.value)}
                      inputMode="decimal"
                    />
                  </div>
                </div>
                {googlePlaceId && (
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <Badge variant="secondary" className="rounded-full">
                      Google Maps
                    </Badge>
                    <span className="truncate">{googlePlaceId}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="manual-name">Name</Label>
              <Input
                id="manual-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The name of this place"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="manual-address">Address</Label>
              <Input
                id="manual-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-lat">Latitude</Label>
                <Input
                  id="manual-lat"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="52.5200"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-lng">Longitude</Label>
                <Input
                  id="manual-lng"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="13.4050"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: on the map, tap the crosshair then the spot — or drop a pin and the coordinates
              fill in here automatically.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <Label className="text-sm font-semibold">Pick an icon</Label>
          <IconPicker value={icon} onChange={handleIconChange} />
        </div>

        {duplicate && (
          <p role="alert" className="mt-3 rounded-xl bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
            This place is already in your library.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t px-4 py-3">
        <PlaceIcon
          icon={icon}
          category={category ?? undefined}
          className={cn('size-10')}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name.trim() || 'New place'}</p>
          <p className="truncate text-xs text-muted-foreground">
            {latitude != null && longitude != null
              ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
              : 'Add a name and location'}
          </p>
        </div>
        <Button
          size="lg"
          onClick={handleSave}
          disabled={!canSave || saving || duplicate}
          className="h-11 rounded-full px-6"
        >
          {saving ? <Loader2 className="animate-spin" /> : <Plus />}
          {saving ? 'Adding...' : 'Add place'}
        </Button>
      </div>
    </div>
  );
}

export default function AddPlaceSheet({
  open,
  onOpenChange,
  initial,
  onSaved,
}: AddPlaceSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton
        className="mx-auto max-w-md gap-0 rounded-t-2xl p-0 max-h-[85svh] sm:max-w-lg"
      >
        <AddPlaceSheetBody
          open={open}
          onOpenChange={onOpenChange}
          initial={initial}
          onSaved={onSaved}
        />
      </SheetContent>
    </Sheet>
  );
}
