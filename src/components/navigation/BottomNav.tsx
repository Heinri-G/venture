import React from 'react';
import { NavLink } from 'react-router-dom';
import { Bookmark, Compass, Map as MapIcon, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

const TABS = [
  { to: '/map', label: 'Explore', icon: MapIcon, end: true },
  { to: '/saved-places', label: 'Saved', icon: Bookmark, end: true },
  { to: '/adventures', label: 'Adventures', icon: Compass, end: false },
  { to: '/friends', label: 'Social', icon: Users, end: true },
] as const;

export default function BottomNav() {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around gap-1 px-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full transition-colors',
                      isActive && 'bg-primary/10'
                    )}
                  >
                    <Icon className="size-5" strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  <span className="text-[11px] font-medium leading-none">{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
