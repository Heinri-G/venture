import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Globe, ImageIcon, Loader2, Lock, MapPin, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import AdventureMap from './AdventureMap';
import PlaceSelector from './PlaceSelector';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { cn } from '@/lib/utils';
import {
  createAdventure,
  linkPlacesToAdventure,
  removeAllPlacesFromAdventure,
  updateAdventure,
  uploadAdventureCover,
  type Adventure,
  type AdventureVisibility,
} from '@/lib/adventures';
import type { SavedPlaceWithDetails } from '@/lib/savedPlaces';

type Step = 'metadata' | 'places' | 'visibility' | 'review';

interface AdventureCreationFormProps {
  userId: string;
  mode: 'create' | 'edit';
  initialAdventure?: Adventure | null;
  initialPlaces?: SavedPlaceWithDetails[];
  onComplete: (adventure: Adventure) => void;
  onCancel: () => void;
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'metadata', label: 'Details' },
  { id: 'places', label: 'Places' },
  { id: 'visibility', label: 'Visibility' },
  { id: 'review', label: 'Review' },
];

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

const VISIBILITY_OPTIONS: {
  value: AdventureVisibility;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can see and edit this adventure.',
    icon: Lock,
  },
  {
    value: 'shared',
    label: 'Shared',
    description: 'Can be shared with specific friends or groups.',
    icon: Users,
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone with a public link can view this adventure.',
    icon: Globe,
  },
];

function StepIndicator({ step }: { step: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.id === step);
  return (
    <ol className="flex items-center gap-2" aria-label="Adventure creation progress">
      {STEPS.map((s, index) => {
        const isDone = index < currentIndex;
        const isActive = index === currentIndex;
        return (
          <li key={s.id} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                'flex size-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                isDone && 'border-primary bg-primary text-primary-foreground',
                isActive && 'border-primary bg-primary/10 text-primary',
                !isDone && !isActive && 'border-border text-muted-foreground'
              )}
            >
              {isDone ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                'text-[10px] font-medium uppercase tracking-wider sm:text-xs',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function CoverUploader({
  src,
  onFileChange,
  onRemove,
  disabled,
}: {
  src: string | null;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Upload cover photo"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          onFileChange(file);
          e.target.value = '';
        }}
      />
      {src ? (
        <div className="relative h-40 w-full overflow-hidden rounded-xl border bg-muted">
          <img src={src} alt="Adventure cover preview" className="h-full w-full object-cover" />
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            onClick={onRemove}
            disabled={disabled}
            aria-label="Remove cover photo"
            className="absolute right-2 top-2 rounded-full bg-background text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/40 text-muted-foreground outline-none transition-colors hover:border-primary/50 hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ImageIcon className="size-6" />
          <span className="text-sm font-medium">Add a cover photo</span>
          <span className="text-xs">Recommended to make your adventure stand out</span>
        </button>
      )}
    </div>
  );
}

export default function AdventureCreationForm({
  userId,
  mode,
  initialAdventure,
  initialPlaces = [],
  onComplete,
  onCancel,
}: AdventureCreationFormProps) {
  const [step, setStep] = useState<Step>('metadata');

  const [title, setTitle] = useState(initialAdventure?.title || '');
  const [description, setDescription] = useState(initialAdventure?.description || '');
  const [visibility, setVisibility] = useState<AdventureVisibility>(
    initialAdventure?.visibility || 'private'
  );
  const [allowCollaboration, setAllowCollaboration] = useState(
    initialAdventure?.allow_collaboration ?? false
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    initialAdventure?.cover_photo_url ?? null
  );
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [orderedPlaces, setOrderedPlaces] = useState<SavedPlaceWithDetails[]>(initialPlaces);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleTouched, setTitleTouched] = useState(false);

  useEffect(() => {
    return () => {
      if (coverPreview && coverPreview.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  const handleCoverFileChange = (file: File | null) => {
    setCoverFile(file);
    setCoverRemoved(false);
    setCoverPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : initialAdventure?.cover_photo_url ?? null;
    });
  };

  const handleCoverRemove = () => {
    setCoverFile(null);
    setCoverRemoved(true);
    setCoverPreview(null);
  };

  const titleValid = title.trim().length > 0 && title.trim().length <= TITLE_MAX_LENGTH;

  const canProceed = useCallback(() => {
    if (step === 'metadata') {
      if (!titleValid) {
        setTitleTouched(true);
        setError('Please enter a title (1–100 characters).');
        return false;
      }
    }
    return true;
  }, [step, titleValid]);

  const nextStep = () => {
    if (!canProceed()) return;
    setError(null);
    setStep((current) => {
      const index = STEPS.findIndex((s) => s.id === current);
      return STEPS[Math.min(index + 1, STEPS.length - 1)].id;
    });
  };

  const previousStep = () => {
    setError(null);
    setStep((current) => {
      const index = STEPS.findIndex((s) => s.id === current);
      return STEPS[Math.max(index - 1, 0)].id;
    });
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'create') {
        const { data: adventure, error: createError } = await createAdventure({
          ownerId: userId,
          title: title.trim(),
          description: description.trim() || null,
          coverPhotoUrl: coverRemoved ? null : initialAdventure?.cover_photo_url ?? null,
          visibility,
          allowCollaboration,
        });
        if (createError || !adventure) throw new Error(createError || 'Failed to create adventure.');

        let coverUrl: string | null = null;
        if (coverFile) {
          const { url, error: uploadError } = await uploadAdventureCover(coverFile, adventure.id);
          if (uploadError) throw new Error(uploadError);
          coverUrl = url ?? null;
          if (coverUrl) {
            await updateAdventure(adventure.id, { cover_photo_url: coverUrl });
          }
        }

        const { error: linkError } = await linkPlacesToAdventure(
          adventure.id,
          orderedPlaces.map((place, index) => ({ savedPlaceId: place.id, orderIndex: index }))
        );
        if (linkError) throw new Error(linkError);

        toast.success('Adventure created', { description: adventure.title });
        onComplete({ ...adventure, cover_photo_url: coverUrl ?? adventure.cover_photo_url });
      } else {
        if (!initialAdventure) throw new Error('Adventure not found.');

        let coverUrl: string | null = initialAdventure.cover_photo_url;
        if (coverFile) {
          const { url, error: uploadError } = await uploadAdventureCover(coverFile, initialAdventure.id);
          if (uploadError) throw new Error(uploadError);
          coverUrl = url ?? null;
        } else if (coverRemoved) {
          coverUrl = null;
        }

        const { data: adventure, error: updateError } = await updateAdventure(initialAdventure.id, {
          title: title.trim(),
          description: description.trim() || null,
          cover_photo_url: coverUrl,
          visibility,
          allow_collaboration: allowCollaboration,
        });
        if (updateError || !adventure) throw new Error(updateError || 'Failed to update adventure.');

        const { error: clearError } = await removeAllPlacesFromAdventure(adventure.id);
        if (clearError) throw new Error(clearError);
        const { error: linkError } = await linkPlacesToAdventure(
          adventure.id,
          orderedPlaces.map((place, index) => ({ savedPlaceId: place.id, orderIndex: index }))
        );
        if (linkError) throw new Error(linkError);

        toast.success('Adventure updated', { description: adventure.title });
        onComplete(adventure);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
      toast.error(mode === 'edit' ? 'Could not update adventure' : 'Could not create adventure', {
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const mapPlaces = orderedPlaces.map((p) => ({
    key: p.id,
    name: p.place.name,
    latitude: p.place.latitude,
    longitude: p.place.longitude,
  }));

  const selectedVisibility =
    VISIBILITY_OPTIONS.find((v) => v.value === visibility) ?? VISIBILITY_OPTIONS[0];

  return (
    <div className="flex w-full flex-col gap-6">
      <StepIndicator step={step} />

      {step === 'metadata' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="adventure-title" className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {title.length}/{TITLE_MAX_LENGTH}
              </span>
            </div>
            <Input
              id="adventure-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX_LENGTH))}
              onBlur={() => setTitleTouched(true)}
              placeholder="e.g. Coffee Crawl in SF"
              aria-invalid={titleTouched && !titleValid}
              aria-describedby="adventure-title-hint"
              className="h-10"
            />
            <p id="adventure-title-hint" className="sr-only">
              Give your adventure a name, up to {TITLE_MAX_LENGTH} characters.
            </p>
            {titleTouched && !titleValid && (
              <p role="alert" className="text-xs font-medium text-destructive">
                Title is required and must be between 1 and {TITLE_MAX_LENGTH} characters.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="adventure-description" className="text-sm font-medium">
                Description
              </Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {description.length}/{DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="adventure-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
              placeholder="Best independent coffee shops in San Francisco..."
              rows={4}
              maxLength={DESCRIPTION_MAX_LENGTH}
              className="resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Cover photo</Label>
            <CoverUploader
              src={coverPreview}
              onFileChange={handleCoverFileChange}
              onRemove={handleCoverRemove}
              disabled={submitting}
            />
          </div>
        </div>
      )}

      {step === 'places' && (
        <PlaceSelector userId={userId} value={orderedPlaces} onChange={setOrderedPlaces} />
      )}

      {step === 'visibility' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Adventure visibility">
            {VISIBILITY_OPTIONS.map((option) => {
              const active = visibility === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setVisibility(option.value)}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors',
                    active
                      ? 'border-primary/60 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-lg',
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                      active ? 'border-primary bg-primary' : 'border-input'
                    )}
                  >
                    {active && <Check className="size-3 text-primary-foreground" />}
                  </span>
                </button>
              );
            })}
          </div>

          {visibility === 'shared' && (
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium leading-none">Allow others to edit</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Friends you share this adventure with can add or reorder places.
                </p>
              </div>
              <Switch
                checked={allowCollaboration}
                onCheckedChange={setAllowCollaboration}
                disabled={submitting}
              />
            </div>
          )}
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4 overflow-hidden rounded-xl border bg-card p-4">
            {coverPreview ? (
              <img
                src={coverPreview}
                alt=""
                className="size-20 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <span className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ImageIcon className="size-7" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-heading text-base font-semibold">{title.trim() || 'Untitled adventure'}</p>
              {description.trim() && (
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full">
                  {orderedPlaces.length} {orderedPlaces.length === 1 ? 'place' : 'places'}
                </Badge>
                <Badge
                  variant={visibility === 'public' ? 'default' : 'secondary'}
                  className="rounded-full"
                >
                  <selectedVisibility.icon className="size-3" />
                  {selectedVisibility.label}
                </Badge>
              </div>
            </div>
          </div>

          {orderedPlaces.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/40 px-4 py-8 text-center">
              <MapPin className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No places added yet. Go back to choose some saved places.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => setStep('places')} className="rounded-full">
                Choose places
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <div className="h-52 w-full">
                <AdventureMap places={mapPlaces} showRoute />
              </div>
              <ol className="flex flex-col divide-y divide-border bg-card">
                {orderedPlaces.map((place, index) => (
                  <li key={place.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {place.place.name}
                    </span>
                    {place.place.category && (
                      <Badge variant="secondary" className="hidden text-[10px] sm:inline-flex">
                        {place.place.category}
                      </Badge>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={step === 'metadata' ? onCancel : previousStep} disabled={submitting} className="rounded-full">
          <ChevronLeft />
          {step === 'metadata' ? 'Cancel' : 'Back'}
        </Button>

        {step === 'review' ? (
          <Button type="button" onClick={handleSubmit} disabled={submitting} className="rounded-full px-6" size="lg">
            {submitting ? <Loader2 className="animate-spin" /> : null}
            {submitting
              ? mode === 'edit'
                ? 'Saving...'
                : 'Creating...'
              : mode === 'edit'
                ? 'Save changes'
                : 'Create adventure'}
          </Button>
        ) : (
          <Button type="button" onClick={nextStep} disabled={submitting} className="rounded-full px-6" size="lg">
            Continue
            <ChevronRight />
          </Button>
        )}
      </div>
    </div>
  );
}
