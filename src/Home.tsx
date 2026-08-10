import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Bookmark, CheckCircle2, Compass, MapPin, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import MapView from './components/MapView';
import SearchBar from './components/search/SearchBar';
import PlaceDetails from './components/PlaceDetails';
import { getPlaceDetails, type PlaceSuggestion as SearchResult } from './lib/places';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';

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

const STATS = [
  { value: '10k+', label: 'Places discovered' },
  { value: '120+', label: 'Countries covered' },
  { value: '4.9★', label: 'Curated quality' },
];

const FEATURES = [
  {
    icon: Search,
    title: 'Search anywhere',
    description: 'Find coffee shops, landmarks, nightlife and hidden gems in any city in seconds.',
  },
  {
    icon: Bookmark,
    title: 'Save your favorites',
    description: 'Keep a personal collection of the places you love and plan your next trip around them.',
  },
  {
    icon: MapPin,
    title: 'Explore live maps',
    description: 'Browse an interactive map with clustered pins so nothing gets lost in the noise.',
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
      <section className="bg-hero">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-24 pt-20 text-center sm:px-6 sm:pb-28 sm:pt-24 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6"
          >
            <Badge className="h-7 gap-1.5 rounded-full border-white/20 bg-white/10 px-3.5 text-white backdrop-blur">
              <Sparkles className="size-3.5" />
              Your travel companion
            </Badge>

            <h1 className="max-w-3xl text-balance font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Discover places worth venturing to
            </h1>

            <p className="max-w-xl text-balance text-base leading-relaxed text-white/70 sm:text-lg">
              Search and save your favorite spots around the world. Coffee shops, landmarks, nightlife
              and hidden gems — all on one beautiful map.
            </p>

            <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={scrollToMap}
                className="h-11 rounded-full bg-primary px-6 text-primary-foreground shadow-xl shadow-black/20 hover:bg-primary/90"
              >
                <Compass />
                Explore the map
              </Button>
              <Button
                size="lg"
                asChild
                variant="ghost"
                className="h-11 rounded-full border border-white/25 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/signup">Sign up free</Link>
              </Button>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/60">
              {['Search anywhere', 'Save favorites', 'Explore live maps'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-white/80" />
                  {item}
                </span>
              ))}
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
            <Card className="overflow-hidden shadow-2xl shadow-primary/10 ring-1 ring-border">
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

      {/* Stats */}
      <section className="mt-16 sm:mt-24">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="h-full items-center py-8 text-center">
                <CardContent className="flex flex-col items-center gap-1.5">
                  <p className="font-heading text-3xl font-bold tracking-tight text-primary">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mt-16 sm:mt-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-balance font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to plan your next trip
            </h2>
            <p className="mt-3 text-balance text-base text-muted-foreground sm:text-lg">
              Venture brings the world to your fingertips — search, save and explore with confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Card className="h-full p-6 transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/5">
                    <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mb-2 font-heading text-lg font-semibold tracking-tight">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 sm:mt-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-hero px-6 py-16 text-center sm:py-20">
            <div className="mx-auto flex max-w-xl flex-col items-center gap-5">
              <h2 className="text-balance font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to find your next adventure?
              </h2>
              <p className="text-balance text-base text-white/70 sm:text-lg">
                Join Venture today and start building a collection of places you&apos;ll love.
              </p>
              <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  asChild
                  className="h-11 rounded-full bg-primary px-6 text-primary-foreground shadow-xl shadow-black/20 hover:bg-primary/90"
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
                  className="h-11 rounded-full border border-white/25 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/login">Sign in</Link>
                </Button>
              </div>
            </div>
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
