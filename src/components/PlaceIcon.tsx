import React from 'react';
import { getPlaceIcon, placeIconKey } from '@/lib/placeIcons';
import { cn } from '@/lib/utils';

interface PlaceIconProps {
  icon?: string | null;
  category?: string | null;
  /** Extra classes for the wrapper span. */
  className?: string;
  iconClassName?: string;
}

/** Colored tile showing a place's lucide icon, derived from stored key or category. */
export function PlaceIcon({ icon, category, className, iconClassName }: PlaceIconProps) {
  const key = placeIconKey(icon, category);
  const Icon = getPlaceIcon(key);
  return (
    <span
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary',
        className
      )}
    >
      {/* Static lookup from a stable module map, not component creation. */}
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Icon className={cn('size-5', iconClassName)} />
    </span>
  );
}
