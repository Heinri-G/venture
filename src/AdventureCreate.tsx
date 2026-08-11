import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { toast } from 'sonner';
import AdventureCreationForm from './components/AdventureCreationForm';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Skeleton } from './components/ui/skeleton';
import { useAuthUser } from './lib/useAuthUser';
import { fetchAdventureWithPlaces, type Adventure } from './lib/adventures';
import type { SavedPlaceWithDetails } from './lib/savedPlaces';

export default function AdventureCreate() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined && id !== 'new';
  const navigate = useNavigate();
  const { user } = useAuthUser();

  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [initialPlaces, setInitialPlaces] = useState<SavedPlaceWithDetails[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id || !user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error: fetchError } = await fetchAdventureWithPlaces(id);
      if (cancelled) return;
      if (fetchError || !data) {
        setLoading(false);
        setLoadError(fetchError || 'Adventure not found.');
        return;
      }
      if (data.owner_id !== user.id) {
        setLoading(false);
        toast.error('Only the owner can edit this adventure');
        navigate(`/adventures/${id}`, { replace: true });
        return;
      }
      setAdventure(data);
      setInitialPlaces(
        data.adventure_places
          .slice()
          .sort((a, b) => a.order_index - b.order_index)
          .map((ap) => ap.saved_place)
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isEdit, id, user, navigate]);

  if (!user) return null;

  const handleComplete = (created: Adventure) => {
    navigate(`/adventures/${created.id}`);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground">
          <Link to="/adventures">
            <ArrowLeft />
            Adventures
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 text-primary-foreground shadow-lg shadow-primary/25">
          <Compass className="size-5" />
        </span>
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
            {isEdit ? 'Edit adventure' : 'Create an adventure'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? 'Update the details, places, and visibility of your adventure.'
              : 'Group your saved places into a themed adventure.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : loadError ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <p role="alert" className="text-sm font-medium text-destructive">{loadError}</p>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/adventures">Back to adventures</Link>
          </Button>
        </Card>
      ) : (
        <Card className="p-5 sm:p-6">
          <AdventureCreationForm
            key={adventure?.id ?? 'new'}
            userId={user.id}
            mode={isEdit ? 'edit' : 'create'}
            initialAdventure={adventure}
            initialPlaces={initialPlaces}
            onComplete={handleComplete}
            onCancel={() => navigate(isEdit && id ? `/adventures/${id}` : '/adventures')}
          />
        </Card>
      )}
    </div>
  );
}
