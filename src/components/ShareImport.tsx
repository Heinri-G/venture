import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Link2, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AddPlaceSheet, { type AddPlaceInitial } from '@/components/AddPlaceSheet';
import { resolveGoogleMapsShare } from '@/lib/googleMapsLink';

const NO_LINK_MESSAGE =
  'No place link was shared. Try sharing a place from Google Maps again.';

export default function ShareImport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const text = searchParams.get('text') ?? '';
  const hasText = Boolean(text.trim());

  const [phase, setPhase] = useState<'resolving' | 'ready' | 'error'>(() =>
    hasText ? 'resolving' : 'error'
  );
  const [error, setError] = useState<string | null>(() => (hasText ? null : NO_LINK_MESSAGE));
  const [initial, setInitial] = useState<AddPlaceInitial | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasText) return;
    let cancelled = false;
    (async () => {
      const result = await resolveGoogleMapsShare(text.trim());
      if (cancelled) return;
      if (result.error || !result.data) {
        setError(result.error ?? 'Could not understand that place link.');
        setPhase('error');
        return;
      }
      setInitial({
        text,
        name: result.data.name ?? undefined,
        address: result.data.address ?? undefined,
        latitude: result.data.latitude ?? undefined,
        longitude: result.data.longitude ?? undefined,
        googlePlaceId: result.data.googlePlaceId ?? undefined,
      });
      setPhase('ready');
      setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasText, text]);

  const handleSaved = useCallback(() => {
    setOpen(false);
    navigate('/map', { replace: true });
  }, [navigate]);

  const goToMap = () => navigate('/map', { replace: true });

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center px-4 py-10">
      {phase === 'resolving' && (
        <Card className="flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="size-6 animate-spin" />
          </span>
          <div>
            <p className="font-heading text-base font-semibold">Opening the place…</p>
            <p className="mt-1 text-sm text-muted-foreground">Reading the link shared with Venture.</p>
          </div>
        </Card>
      )}

      {phase === 'error' && (
        <Card className="flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Link2 className="size-6" />
          </span>
          <div>
            <p className="font-heading text-base font-semibold">Couldn&apos;t open that place</p>
            <p role="alert" className="mt-1 text-sm text-muted-foreground">
              {error}
            </p>
          </div>
          <Button onClick={goToMap} className="rounded-full">
            Open your map
            <ArrowRight />
          </Button>
        </Card>
      )}

      {phase === 'ready' && initial && (
        <>
          <Card className="flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin className="size-6" />
            </span>
            <div>
              <p className="font-heading text-base font-semibold">Nearly there</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check the details and pick an icon, then it&apos;s saved.
              </p>
            </div>
            <Button
              onClick={() => {
                setOpen(true);
              }}
              className="rounded-full"
            >
              Continue
            </Button>
          </Card>
          <AddPlaceSheet
            open={open}
            onOpenChange={setOpen}
            initial={initial}
            onSaved={handleSaved}
          />
        </>
      )}
    </div>
  );
}
