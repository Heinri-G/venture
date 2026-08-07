'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Coffee, Utensils, Compass, Moon, Trees } from 'lucide-react';

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

        const res = await fetch(`/api/places/search?${params.toString()}`);
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

  return (
    <div ref={searchRef} className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-2">
      {/* Input box */}
      <div className="glass rounded-2xl p-2.5 px-4 flex items-center gap-3 shadow-lg border border-white/20 transition-base focus-within:ring-2 focus-within:ring-primary/50">
        <Search size={20} className="text-muted shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search places, cafes, hikes..."
          className="w-full bg-transparent outline-none text-foreground placeholder-muted font-medium"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="p-1 text-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
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
              className={`glass flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-base shadow-sm border ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-glow'
                  : 'text-foreground/80 hover:bg-white/80 dark:hover:bg-slate-800/80 border-white/20'
              }`}
            >
              <Icon size={14} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Results Dropdown */}
      {focused && (results.length > 0 || loading) && (
        <div className="glass max-h-80 overflow-y-auto rounded-2xl p-2 shadow-2xl border border-white/20 animate-slide-up flex flex-col gap-1">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted">Searching places...</div>
          ) : (
            results.map((res) => (
              <button
                key={res.fsq_id}
                onClick={() => {
                  onSelectResult(res);
                  setFocused(false);
                }}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-primary/10 transition-base text-left group"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-base">
                  <MapPin size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{res.name}</p>
                  <p className="text-xs text-muted truncate font-normal">
                    {res.location.formatted_address || res.location.address || 'Address unavailable'}
                  </p>
                  {res.categories?.[0] && (
                    <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-bold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md">
                      {res.categories[0].name}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
