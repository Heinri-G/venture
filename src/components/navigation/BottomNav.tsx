'use client';

import React from 'react';
import { Map, Bookmark, Compass, Users } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'map' | 'saved' | 'adventures' | 'friends';
  onTabChange: (tab: 'map' | 'saved' | 'adventures' | 'friends') => void;
  savedCount?: number;
}

export default function BottomNav({ activeTab, onTabChange, savedCount = 0 }: BottomNavProps) {
  const tabs = [
    { id: 'map', label: 'Explore', icon: Map, badge: null },
    { id: 'saved', label: 'Saved', icon: Bookmark, badge: savedCount > 0 ? savedCount : null },
    { id: 'adventures', label: 'Adventures', icon: Compass, badge: null },
    { id: 'friends', label: 'Social', icon: Users, badge: null },
  ] as const;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-md">
      <div className="glass rounded-3xl p-2 px-3 flex items-center justify-around shadow-2xl border border-white/20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl transition-base ${
                isActive
                  ? 'text-primary font-bold scale-105'
                  : 'text-muted hover:text-foreground font-medium'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
