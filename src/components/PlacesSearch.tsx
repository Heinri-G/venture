import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Link2, Loader2, MapPin, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { searchSavedPlaces, type SavedPlaceWithDetails } from '@/lib/savedPlaces';
import { useAuthUser } from '@/lib/useAuthUser';
import { placeIconKey } from '@/lib/placeIcons';
import { PlaceIcon } from './PlaceIcon';
import { cn } from '@/lib/utils';

interface PlacesSearchProps {
  onPlaceSelect: (place: SavedPlaceWithDetails) => void;
  onAddPlace?: () => void;
  className?: string;
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;
const RESULT_LIMIT = 10;

export default function PlacesSearch({
  onPlaceSelect,
  onAddPlace,
  className,
}: PlacesSearchProps) {
  const { user, loading: authLoading } = useAuthUser();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SavedPlaceWithDetails[]>([]);
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
    if (!user || trimmed.length < MIN_QUERY_LENGTH) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      setSearched(false);
      const { data, error: searchError } = await searchSavedPlaces(
        user.id,
        trimmed,
        RESULT_LIMIT
      );
      if (cancelled) return;
      setLoading(false);
      if (searchError) {
        setSuggestions([]);
        setError(searchError);
        setSearched(true);
        return;
      }
      setSuggestions(data);
      setActiveIndex(-1);
      setSearched(true);
      setOpen(true);
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, user]);

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

  const handleSelect = (place: SavedPlaceWithDetails) => {
    setSelectingId(place.id);
    setOpen(false);
    onPlaceSelect(place);
    setSelectingId(null);
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
  const noResults = searched && !loading && suggestions.length === 0;

  return (
    <div ref={rootRef} className={cn('absolute inset-x-4 top-4 z-[1100]', className)}>
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
          placeholder="Search your saved places..."
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="places-search-listbox"
          aria-activedescendant={activeIndex >= 0 ? `places-search-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-label="Search saved places"
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
              ) : noResults ? (
                <div className="flex flex-col gap-3 p-4 text-center">
                  <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MapPin className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">No saved places match</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add it first by sharing from Google Maps.
                    </p>
                  </div>
                  {onAddPlace && (
                    <Button
                      size="sm"
                      onClick={onAddPlace}
                      className="mx-auto rounded-full"
                    >
                      <Link2 />
                      Add from Google Maps
                    </Button>
                  )}
                </div>
              ) : (
                suggestions.map((res, index) => {
                  const iconKey = placeIconKey(res.place.icon, res.place.category);
                  return (
                    <button
                      key={res.id}
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
                      <PlaceIcon
                        icon={iconKey}
                        className="size-9 rounded-full"
                        iconClassName="size-4"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {res.place.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {res.place.address}
                        </span>
                        {res.place.category && (
                          <Badge variant="outline" className="mt-1.5 h-4 text-[10px]">
                            {res.place.category}
                          </Badge>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {!authLoading && !user && !showDropdown && (
        <div className="mt-2 rounded-full bg-background/90 px-4 py-2 text-center text-xs text-muted-foreground shadow backdrop-blur">
          Sign in to see your saved places.
        </div>
      )}
    </div>
  );
}
