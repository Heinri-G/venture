import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '../lib/utils';

interface ProfileAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  /** Tailwind size classes override the default (defaults to size-10). */
  className?: string;
  fallbackClassName?: string;
}

/** Avatar with initials fallback for profiles/users. */
export default function ProfileAvatar({
  name,
  avatarUrl,
  className,
  fallbackClassName,
}: ProfileAvatarProps) {
  const initials =
    (name ?? '')
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  return (
    <Avatar className={cn('size-10', className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback
        className={cn('bg-primary/10 text-sm text-primary', fallbackClassName)}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
