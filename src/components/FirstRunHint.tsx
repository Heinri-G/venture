import React, { useState } from 'react';
import { Bookmark, Route, Share2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';

const FIRST_RUN_KEY = 'venture:first-run-dismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(FIRST_RUN_KEY) === '1';
  } catch {
    return false;
  }
}

const STEPS = [
  {
    icon: Bookmark,
    title: 'Save places',
    body: 'Search anywhere, or share a place from Google Maps, to grow your library.',
    to: '/map',
  },
  {
    icon: Route,
    title: 'Build adventures',
    body: 'Group your saved places into an ordered plan — a trip, a city guide, a coffee crawl.',
    to: '/adventures',
  },
  {
    icon: Share2,
    title: 'Share with friends',
    body: 'Publish an adventure and share the link. Friends follow along on their own phones.',
    to: '/adventures',
  },
] as const;

/**
 * Lightweight, dismissible first-run guidance shown on the map empty state for
 * brand-new users. Persisted per browser so it only appears once.
 */
export default function FirstRunHint() {
  const [dismissed, setDismissed] = useState(readDismissed);

  const handleDismiss = () => {
    try {
      localStorage.setItem(FIRST_RUN_KEY, '1');
    } catch {
      /* ignore storage errors */
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <p className="font-heading text-sm font-semibold">Welcome to Venture</p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleDismiss}
          aria-label="Dismiss welcome tip"
          className="size-7 shrink-0 rounded-full text-muted-foreground"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex flex-col gap-2.5">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="flex items-start gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-none">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </div>
          );
        })}
      </div>
      <Button asChild size="sm" className="w-full rounded-full">
        <Link to="/adventures/new">Plan your first adventure</Link>
      </Button>
    </div>
  );
}
