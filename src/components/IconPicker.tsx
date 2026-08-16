import React from 'react';
import { PLACE_ICON_GROUPS } from '@/lib/placeIcons';
import { cn } from '@/lib/utils';

interface IconPickerProps {
  value: string | null;
  onChange: (key: string) => void;
  className?: string;
}

export default function IconPicker({ value, onChange, className }: IconPickerProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {PLACE_ICON_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
            {group.icons.map((option) => {
              const active = value === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onChange(option.key)}
                  aria-label={option.label}
                  aria-pressed={active}
                  title={option.label}
                  className={cn(
                    'flex aspect-square items-center justify-center rounded-lg border transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <option.Icon className="size-5" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
