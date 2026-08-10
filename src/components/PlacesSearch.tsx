import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getPlaceDetails, searchPlaces, type PlaceResult, type PlaceSuggestion } from '@/lib/places';
import { cn } from '@/lib/utils';

interface PlacesSearchProps {
  onPlaceSelect: (place: PlaceResult) => void;
  latitude?: number;
  longitude?: number;
  className?: string;
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;
const RESULT_LIMIT = 10;

export default function PlacesSearch({
  onPlaceSelect,
  latitude,
  longitude,
  className,
}: PlacesSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      setSearched(false);
      try {
        const results = await searchPlaces(trimmed, {
          latitude,
          longitude,
          limit: RESULT_LIMIT,
        });
        if (cancelled) return;
        setSuggestions(results);
        setActiveIndex(-1);
        setSearched(true);
        setOpen(true);
      } catch (err) {
        if (cancelled) return;
        setSuggestions([]);
        setError(err instanceof Error ? err.message : 'Search error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, latitude, longitude]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      setSearched(false);
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelect = async (suggestion: PlaceSuggestion) => {
    setSelectingId(suggestion.fsq_id);
    setOpen(false);
    try {
      const details = await getPlaceDetails(suggestion.fsq_id);
      onPlaceSelect({
        fsq_id: details.fsq_id || suggestion.fsq_id,
        name: details.name || suggestion.name,
        address: details.address || suggestion.address,
        latitude: details.latitude || suggestion.latitude,
        longitude: details.longitude || suggestion.longitude,
        category: details.category || suggestion.category,
        phone: details.phone,
        website: details.website,
        hours: details.hours,
        photoUrl: details.photoUrl,
        rating: details.rating,
        description: details.description,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load place details');
      setOpen(true);
    } finally {
      setSelectingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      if (!open || suggestions.length === 0) return;
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      if (!open || suggestions.length === 0) return;
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      if (!open || suggestions.length === 0) return;
      e.preventDefault();
      const active = suggestions[activeIndex >= 0 ? activeIndex : 0];
      if (active) handleSelect(active);
    }
  };

  const clear = () => {
    setQuery('');
    setSuggestions([]);
    setError(null);
    setSearched(false);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const showDropdown = Boolean(open && (loading || error || searched));

  return (
    <div
      ref={rootRef}
      className={cn('absolute inset-x-4 top-4 z-[1100]', className)}
    >
      <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 p-1.5 pl-5 shadow-[0_3px_12px_rgba(0,0,0,0.15)] backdrop-blur">
        <Search className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => {
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search places, venues, landmarks..."
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="places-search-listbox"
          aria-activedescendant={activeIndex >= 0 ? `places-search-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-label="Search places"
          autoComplete="off"
          className="h-9 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
        {query && (
          <button
            onClick={clear}
            aria-label="Clear search"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
        <button
          onClick={() => inputRef.current?.focus()}
          aria-label="Search"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-300 ease-airbnb hover:scale-105 active:scale-95"
        >
          {selectingId ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </button>
      </div>

      {showDropdown && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          className="absolute inset-x-0 top-[3.75rem]"
        >
          <Card className="max-h-80 overflow-y-auto p-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
            <div
              id="places-search-listbox"
              role="listbox"
              aria-label="Search suggestions"
              className="flex flex-col gap-0.5"
            >
              {loading ? (
                <div className="flex flex-col gap-2 p-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-lg" />
                      <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-3.5 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <p role="alert" className="p-3 text-sm text-destructive">
                  {error}
                </p>
              ) : suggestions.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No results found</p>
              ) : (
                suggestions.map((res, index) => (
                  <button
                    key={res.fsq_id}
                    id={`places-search-option-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onClick={() => handleSelect(res)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors',
                      index === activeIndex ? 'bg-muted' : 'hover:bg-muted'
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MapPin className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{res.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{res.address}</span>
                      {res.category && (
                        <Badge variant="outline" className="mt-1.5 h-4 text-[10px]">
                          {res.category}
                        </Badge>
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
