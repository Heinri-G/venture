import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Bookmark,
  Coffee,
  Compass,
  Globe,
  Link2,
  MapPin,
  Moon,
  Route,
  Share2,
  Star,
  Trees,
  Utensils,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { searchPlaces, type PlaceSuggestion } from './lib/places';
import { Avatar, AvatarFallback, AvatarGroup } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Skeleton } from './components/ui/skeleton';
import { cn } from './lib/utils';

const TILE_GRADIENTS = [
  'from-secondary/40 via-primary/10 to-chart-3/25',
  'from-chart-3/30 via-primary/10 to-secondary/40',
  'from-primary/25 via-chart-4/15 to-chart-3/25',
  'from-chart-2/35 via-secondary/20 to-chart-3/25',
];

function categoryIcon(category: string | undefined) {
  if (!category) return MapPin;
  const c = category.toLowerCase();
  if (c.includes('coffee') || c.includes('caf') || c.includes('tea')) return Coffee;
  if (
    c.includes('restaurant') ||
    c.includes('dining') ||
    c.includes('food') ||
    c.includes('bar') ||
    c.includes('bakery')
  )
    return Utensils;
  if (c.includes('landmark') || c.includes('museum') || c.includes('historic')) return Compass;
  if (c.includes('park') || c.includes('outdoors') || c.includes('garden')) return Trees;
  if (c.includes('night') || c.includes('club')) return Moon;
  return MapPin;
}

/** Fetches a small set of real Foursquare places once, to preview the map's library. */
function useShowcasePlaces() {
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [coffee, dining, landmark] = await Promise.all([
          searchPlaces('', { category: '13032', limit: 4 }),
          searchPlaces('', { category: '13000', limit: 4 }),
          searchPlaces('', { category: '16000', limit: 4 }),
        ]);
        if (cancelled) return;
        const seen = new Set<string>();
        const merged: PlaceSuggestion[] = [];
        for (const p of [...coffee, ...dining, ...landmark]) {
          if (!seen.has(p.fsq_id)) {
            seen.add(p.fsq_id);
            merged.push(p);
          }
        }
        setPlaces(merged.slice(0, 8));
      } catch {
        // Graceful fallback: the rail simply stays hidden.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { places, loading };
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <motion.div {...fadeUp} className="flex max-w-2xl flex-col gap-3">
      {eyebrow && (
        <Badge variant="secondary" className="w-fit rounded-full">
          {eyebrow}
        </Badge>
      )}
      <h2 className="text-balance font-heading text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {subtitle && <p className="text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">{subtitle}</p>}
    </motion.div>
  );
}

function SavedPlaceCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <div className="relative aspect-[16/9] sm:aspect-[5/3]">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/40 via-primary/15 to-chart-3/25" />
        <span className="absolute right-4 top-4">
          <Badge variant="secondary" className="rounded-full">
            <Bookmark />
            Saved
          </Badge>
        </span>
        <span className="absolute left-4 top-4 flex size-10 items-center justify-center rounded-full bg-background/70 text-primary backdrop-blur">
          <MapPin className="size-5" />
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-5 pb-4 pt-12">
          <p className="font-heading text-lg font-bold tracking-tight text-white">
            Bonanza Coffee Roasters
          </p>
          <p className="text-sm text-white/80">Coffee Shop · Berlin</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1" aria-label="Rated 4 out of 5 stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                aria-hidden
                className={cn('size-4', n <= 4 ? 'fill-primary text-primary' : 'text-muted-foreground/30')}
              />
            ))}
          </span>
          <span className="text-xs font-medium text-muted-foreground">your rating</span>
        </div>
        <p className="rounded-xl bg-muted/50 px-3.5 py-2.5 text-sm leading-relaxed text-muted-foreground">
          “Best flat white in Prenzlauer Berg — the courtyard is a hidden gem.”
        </p>
      </div>
    </div>
  );
}

function ShareChip() {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Link2 className="size-4" />
        </span>
        <div>
          <p className="font-heading text-sm font-semibold">Share with anyone</p>
          <p className="text-xs text-muted-foreground">One link that stays in sync</p>
        </div>
      </div>
      <AvatarGroup>
        <Avatar size="sm">
          <AvatarFallback className="bg-primary/15 text-primary">M</AvatarFallback>
        </Avatar>
        <Avatar size="sm">
          <AvatarFallback className="bg-secondary/50 text-secondary-foreground">J</AvatarFallback>
        </Avatar>
        <Avatar size="sm">
          <AvatarFallback className="bg-chart-3/25 text-chart-3">S</AvatarFallback>
        </Avatar>
      </AvatarGroup>
      <div className="mt-auto flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3.5 py-2">
        <Globe className="size-3.5 shrink-0 text-primary" />
        <span className="truncate text-xs text-muted-foreground">
          Public link · only people you share it with
        </span>
      </div>
    </Card>
  );
}

function AdventuresStrip() {
  const days = [
    'Day 1 · Cafés & courtyards',
    'Day 2 · Museums & markets',
    'Day 3 · The night out',
  ];
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center gap-2">
        <Route className="size-4 text-primary" />
        <p className="font-heading text-sm font-semibold">Berlin in 3 days</p>
        <Badge variant="outline" className="ml-auto rounded-full">
          5 places
        </Badge>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {days.map((day, i) => (
          <div key={day} className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{day}</span>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-secondary/40 to-primary/15 ring-1 ring-border" />
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Ordered the way you&apos;ll actually go — drag to reorder.
      </p>
    </Card>
  );
}

function PlacesRail({ places, loading }: { places: PlaceSuggestion[]; loading: boolean }) {
  if (!loading && places.length === 0) return null;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-heading text-sm font-semibold">Real places, from the map</p>
        <Badge variant="outline" className="rounded-full">
          Live · Foursquare
        </Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] overflow-hidden rounded-xl">
                <Skeleton className="h-full w-full" />
              </div>
            ))
          : places.map((place, i) => {
              const Icon = categoryIcon(place.category);
              return (
                <div
                  key={place.fsq_id}
                  className="relative aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-border"
                >
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-br',
                      TILE_GRADIENTS[i % TILE_GRADIENTS.length]
                    )}
                  />
                  <Icon className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 text-foreground/30" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2.5 pb-2 pt-8">
                    <p className="truncate text-xs font-semibold text-white">{place.name}</p>
                    <p className="truncate text-[11px] text-white/80">{place.category}</p>
                  </div>
                </div>
              );
            })}
      </div>
    </Card>
  );
}

const FEATURES = [
  {
    icon: Star,
    title: 'Save & rate with notes',
    description:
      'Bookmark the places you love and keep a small record — a star rating and a few words, so you always remember why it was worth it.',
  },
  {
    icon: Route,
    title: 'Build ordered adventures',
    description:
      'Turn your saved places into a step-by-step plan, in the order you actually want to go. Reorder stops and the map follows.',
  },
  {
    icon: Users,
    title: 'Share with friends & groups',
    description:
      'Publish an adventure and share the link. Friends follow along on their own phones, so planning together just works.',
  },
];

function FeatureVisual({ index }: { index: number }) {
  if (index === 1) {
    return (
      <Card className="p-5">
        {['Museum morning', 'Lunch in the old town', 'Sunset viewpoints'].map((stop, i) => (
          <div key={stop} className="flex items-center gap-3 py-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{stop}</span>
            <span className="h-1.5 w-14 shrink-0 rounded-full bg-muted" />
          </div>
        ))}
        <p className="mt-2 text-xs text-muted-foreground">Drag stops to reorder — the map follows.</p>
      </Card>
    );
  }
  if (index === 2) {
    return (
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <AvatarGroup>
            <Avatar size="sm">
              <AvatarFallback className="bg-primary/15 text-primary">M</AvatarFallback>
            </Avatar>
            <Avatar size="sm">
              <AvatarFallback className="bg-secondary/50 text-secondary-foreground">J</AvatarFallback>
            </Avatar>
            <Avatar size="sm">
              <AvatarFallback className="bg-chart-3/25 text-chart-3">S</AvatarFallback>
            </Avatar>
          </AvatarGroup>
          <div>
            <p className="text-sm font-medium">Shared with your group</p>
            <p className="text-xs text-muted-foreground">Everyone sees the same plan</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3.5 py-2">
          <Share2 className="size-3.5 shrink-0 text-primary" />
          <span className="truncate text-xs text-muted-foreground">
            Public link · only people you share it with
          </span>
        </div>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bookmark className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">That café in the courtyard</p>
          <p className="text-xs text-muted-foreground">Coffee Shop</p>
        </div>
      </div>
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            aria-hidden
            className={cn('size-3.5', n <= 4 ? 'fill-primary text-primary' : 'text-muted-foreground/30')}
          />
        ))}
      </span>
      <p className="rounded-xl bg-muted/50 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
        “Order the flat white and sit in the back courtyard — it&apos;s quieter than the front.”
      </p>
    </Card>
  );
}

export default function Home() {
  const { places, loading } = useShowcasePlaces();

  return (
    <>
      {/* Hero */}
      <section className="bg-meadow-hero">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-20 text-center sm:px-6 sm:pb-24 sm:pt-28 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6"
          >
            <h1 className="max-w-3xl text-balance font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your travel library, for every place worth going back to
            </h1>

            <p className="max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              Save the places you love, rate them with notes, and weave them into adventures worth sharing.
            </p>

            <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="h-11 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
              >
                <Link to="/signup">
                  <Bookmark />
                  Create your free library
                </Link>
              </Button>
              <Button
                size="lg"
                asChild
                variant="ghost"
                className="h-11 rounded-full border border-border bg-transparent px-6 text-foreground hover:bg-accent hover:text-foreground"
              >
                <Link to="/map">
                  <Compass />
                  Explore the map
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Your library */}
      <section className="mt-20 sm:mt-28">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The travel library"
            title="Every place worth keeping"
            subtitle="Save spots on the map, rate them with notes, and turn them into adventures you share."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <motion.div {...fadeUp} className="lg:col-span-2">
              <SavedPlaceCard />
            </motion.div>
            <motion.div {...fadeUp} className="lg:col-span-1">
              <ShareChip />
            </motion.div>
            <motion.div {...fadeUp} className="lg:col-span-1">
              <AdventuresStrip />
            </motion.div>
            <motion.div {...fadeUp} className="lg:col-span-2">
              <PlacesRail places={places} loading={loading} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* What you can do */}
      <section className="mt-20 sm:mt-28">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="What you can do with Venture"
            subtitle="Three small things that make a big difference on the road."
          />

          <div className="mt-10 flex flex-col gap-12 sm:mt-14">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  {...fadeUp}
                  className={cn(
                    'grid items-center gap-6 lg:grid-cols-2 lg:gap-14',
                    i % 2 === 1 && 'lg:[&>*:last-child]:col-start-1 lg:[&>*:last-child]:row-start-1'
                  )}
                >
                  <div>
                    <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-4 font-heading text-xl font-bold tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <div>
                    <FeatureVisual index={i} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 border-t border-border/60 sm:mt-28">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
          <h2 className="max-w-xl text-balance font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Start your travel library today
          </h2>
          <p className="max-w-md text-balance text-base text-muted-foreground">
            Create a free account and start building your library — save, rate, and share adventures
            with the people you travel with.
          </p>
          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <Button
              size="lg"
              asChild
              className="h-11 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/signup">
                Create your free library
                <ArrowRight />
              </Link>
            </Button>
            <Button
              size="lg"
              asChild
              variant="ghost"
              className="h-11 rounded-full border border-border bg-transparent px-6 text-foreground hover:bg-accent hover:text-foreground"
            >
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
