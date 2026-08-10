import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, X, MapPin, Coffee, Utensils, Compass, Moon, Trees } from 'lucide-react';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SearchResult {
  fsq_id: string;
  name: string;
  location: { address?: string; formatted_address?: string };
  geocodes: { main: { latitude: number; longitude: number } };
  categories: { name: string }[];
}

interface SearchBarProps {
  onSelectResult: (result: SearchResult) => void;
}

const CATEGORIES = [
  { id: '13032', label: 'Coffee', icon: Coffee },
  { id: '13000', label: 'Dining', icon: Utensils },
  { id: '16000', label: 'Landmarks', icon: Compass },
  { id: '10000', label: 'Nightlife', icon: Moon },
  { id: '19000', label: 'Outdoors', icon: Trees },
];

export default function SearchBar({ onSelectResult }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!query && !activeCategory) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.append('query', query);
        if (activeCategory) params.append('category', activeCategory);

        const res = await fetch(`/.netlify/functions/places-search?${params.toString()}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query, activeCategory]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = focused && (results.length > 0 || loading);

  return (
    <div ref={searchRef} className="absolute inset-x-4 top-4 z-10 flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 p-1.5 pl-5 shadow-[0_3px_12px_rgba(0,0,0,0.15)] backdrop-blur">
        <Search className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Where to?"
          className="h-9 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            aria-label="Clear search"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
        <button
          onClick={() => {
            setFocused(true);
            inputRef.current?.focus();
          }}
          aria-label="Search"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-300 ease-airbnb hover:scale-105 active:scale-95"
        >
          <Search className="size-4" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(isActive ? null : cat.id);
                setFocused(true);
              }}
              className={cn(
                badgeVariants({ variant: isActive ? 'default' : 'secondary' }),
                'h-7 cursor-pointer gap-1.5 rounded-full px-3 py-1 shadow-sm'
              )}
            >
              <Icon className="size-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {showDropdown && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          className="absolute inset-x-0 top-[5.25rem] z-20"
        >
          <Card className="max-h-80 overflow-y-auto p-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
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
            ) : (
              <div className="flex flex-col gap-0.5">
                {results.map((res) => (
                  <button
                    key={res.fsq_id}
                    onClick={() => {
                      onSelectResult(res);
                      setFocused(false);
                    }}
                    className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-muted"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MapPin className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{res.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {res.location.formatted_address || res.location.address || 'Address unavailable'}
                      </span>
                      {res.categories?.[0] && (
                        <Badge variant="outline" className="mt-1.5 h-4 text-[10px]">
                          {res.categories[0].name}
                        </Badge>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  );
}
