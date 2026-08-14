import React from 'react';
import { cn } from '../../lib/utils';

interface EdelweissMarkProps {
  className?: string;
}

const LONG_PETAL =
  'M24 4 C29 8.5 30 17.5 24 23 C18 17.5 19 8.5 24 4 Z';
const SHORT_PETAL =
  'M24 11 C28 14.5 28.5 19.5 24 23 C19.5 19.5 20 14.5 24 11 Z';

/** 8-petal edelweiss brand mark (4 pointed petals + 4 offset). Uses
 * currentColor so it adapts to the active theme. */
export default function EdelweissMark({ className }: EdelweissMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="currentColor"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <path d={LONG_PETAL} />
      <path d={LONG_PETAL} transform="rotate(90 24 24)" />
      <path d={LONG_PETAL} transform="rotate(180 24 24)" />
      <path d={LONG_PETAL} transform="rotate(270 24 24)" />
      <path d={SHORT_PETAL} transform="rotate(45 24 24)" />
      <path d={SHORT_PETAL} transform="rotate(135 24 24)" />
      <path d={SHORT_PETAL} transform="rotate(225 24 24)" />
      <path d={SHORT_PETAL} transform="rotate(315 24 24)" />
      <circle cx="24" cy="24" r="2.5" />
    </svg>
  );
}
