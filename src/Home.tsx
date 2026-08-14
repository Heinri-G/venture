import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Bookmark, Compass, Search, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import MapView from './components/MapView';
import SearchBar from './components/search/SearchBar';
import PlaceDetails from './components/PlaceDetails';
import { getPlaceDetails, type PlaceSuggestion as SearchResult } from './lib/places';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';

interface Place {
  fsq_id?: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  category?: string;
  photoUrl?: string;
  phone?: string;
  website?: string;
  hours?: string;
  rating?: number;
  description?: string;
}

const FEATURES = [
  {
    icon: Search,
    title: 'Search real places',
    description: 'Every result comes from real place data — coffee shops, landmarks, nightlife and hidden gems in any city.',
  },
  {
    icon: Bookmark,
    title: 'Save your favorites',
    description: 'Keep the places you love in your own collection and shape your next trip around them.',
  },
  {
    icon: Users,
    title: 'Plan with friends',
    description: 'Build shared adventures, invite people along, and coordinate who is going where.',
  },
];

export default function Home() {
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [placeDetails, setPlaceDetails] = useState<Place | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const scrollToMap = () => mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleSelectResult = async (res: SearchResult) => {
    setSelectedResult(res);
    if (!res?.fsq_id) return;

    try {
      const details = await getPlaceDetails(res.fsq_id);
      setPlaceDetails({
        fsq_id: details.fsq_id || res.fsq_id,
        name: details.name || res.name,
        address: details.address || res.address,
        latitude: details.latitude || res.latitude,
        longitude: details.longitude || res.longitude,
        category: details.category || res.category,
        photoUrl: details.photoUrl,
        phone: details.phone,
        website: details.website,
        hours: details.hours,
        rating: details.rating,
        description: details.description,
      });
    } catch (err) {
      console.error('Failed to load place details', err);
      setPlaceDetails({
        fsq_id: res.fsq_id,
        name: res.name,
        address: res.address,
        latitude: res.latitude,
        longitude: res.longitude,
        category: res.category,
      });
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="bg-meadow-hero">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-20 text-center sm:px-6 sm:pb-20 sm:pt-24 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6"
          >
            <h1 className="max-w-3xl text-balance font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Discover places worth venturing to
            </h1>

            <p className="max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              Search and save your favorite spots around the world. Coffee shops, landmarks, nightlife
              and hidden gems — all on one beautiful map.
            </p>

            <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={scrollToMap}
                className="h-11 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
              >
                <Compass />
                Explore the map
              </Button>
              <Button
                size="lg"
                asChild
                variant="ghost"
                className="h-11 rounded-full border border-border bg-transparent px-6 text-foreground hover:bg-accent hover:text-foreground"
              >
                <Link to="/signup">Sign up free</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Interactive map */}
      <section ref={mapRef} className="scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="-mt-16 sm:-mt-20"
          >
            <Card className="overflow-hidden shadow-2xl shadow-black/10 ring-1 ring-border">
              <div className="relative isolate h-[26rem] sm:h-[30rem]">
                <SearchBar onSelectResult={handleSelectResult} />
                <MapView
                  selectedLocation={
                    selectedResult
                      ? {
                          latitude: selectedResult.latitude,
                          longitude: selectedResult.longitude,
                          name: selectedResult.name,
                        }
                      : null
                  }
                />
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* What you can do */}
      <section className="mt-20 sm:mt-28">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-balance font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            What you can do with Venture
          </h2>

          <div className="mt-10 grid gap-x-12 gap-y-10 sm:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="border-t border-border pt-5">
                  <Icon className="size-5 text-primary" strokeWidth={1.75} />
                  <h3 className="mt-3 font-heading text-lg font-semibold tracking-tight">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 border-t border-border/60 sm:mt-28">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
          <h2 className="max-w-xl text-balance font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to start planning?
          </h2>
          <p className="max-w-md text-balance text-base text-muted-foreground">
            Create a free account to save places and build adventures with friends.
          </p>
          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <Button
              size="lg"
              asChild
              className="h-11 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/signup">
                Create a free account
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

      {placeDetails && (
        <PlaceDetails
          key={placeDetails.fsq_id || placeDetails.name}
          place={placeDetails}
          isOpen={Boolean(placeDetails)}
          onClose={() => setPlaceDetails(null)}
        />
      )}
    </>
  );
}
