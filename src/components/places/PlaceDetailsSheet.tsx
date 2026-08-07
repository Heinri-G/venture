'use client';

import React, { useState } from 'react';
import { X, Star, MapPin, BookmarkCheck, Heart } from 'lucide-react';
import { savePlace, PlaceInput } from '@/app/actions/places';

interface PlaceDetailsSheetProps {
  place: {
    fsq_id?: string;
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
    category?: string;
    photo_url?: string;
    rating?: number;
    description?: string;
  } | null;
  onClose: () => void;
  onSavedSuccess?: () => void;
}

export default function PlaceDetailsSheet({ place, onClose, onSavedSuccess }: PlaceDetailsSheetProps) {
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!place) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const placeInput: PlaceInput = {
      foursquare_fsq_id: place.fsq_id,
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      category: place.category,
      photo_url: place.photo_url,
    };

    const res = await savePlace(placeInput, notes, rating);

    setSaving(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSaved(true);
      if (onSavedSuccess) onSavedSuccess();
      setTimeout(() => {
        onClose();
        setSaved(false);
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-4 sm:p-6 max-w-lg mx-auto animate-slide-up">
      <div className="glass rounded-3xl p-6 shadow-2xl border border-white/20 flex flex-col gap-4 relative overflow-hidden max-h-[85vh] overflow-y-auto">
        {/* Header bar */}
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
              {place.category || 'Location'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted hover:text-foreground transition-base"
          >
            <X size={18} />
          </button>
        </div>

        {/* Photo Header */}
        {place.photo_url && (
          <div className="w-full h-40 rounded-2xl overflow-hidden relative border border-white/10 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={place.photo_url} alt={place.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Title & Address */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">{place.name}</h2>
          {place.address && (
            <p className="text-sm text-muted flex items-center gap-1.5 mt-1">
              <MapPin size={16} className="text-primary shrink-0" />
              {place.address}
            </p>
          )}
        </div>

        {place.description && (
          <p className="text-sm text-foreground/80 leading-relaxed bg-surface/50 p-3 rounded-2xl">
            {place.description}
          </p>
        )}

        {/* Personal Rating */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted">Your Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 hover:scale-110 transition-base"
              >
                <Star
                  size={26}
                  className={star <= rating ? 'fill-accent text-accent' : 'text-muted/40'}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Personal Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted">Personal Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What makes this place special? Recommended dishes, best time to visit..."
            rows={3}
            className="w-full rounded-2xl p-3 bg-surface border border-border/60 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-base resize-none"
          />
        </div>

        {error && (
          <p className="text-xs font-semibold text-red-500 bg-red-500/10 p-2.5 rounded-xl text-center">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-base ${
              saved
                ? 'bg-emerald-600 shadow-emerald-500/20'
                : 'bg-primary hover:bg-primary-dark shadow-primary/30'
            }`}
          >
            {saved ? (
              <>
                <BookmarkCheck size={20} /> Saved to Wanderlust!
              </>
            ) : (
              <>
                <Heart size={20} /> {saving ? 'Saving...' : 'Save Place'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
