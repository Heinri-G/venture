import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Loader2,
  Share2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { useNotifications } from './NotificationsProvider';
import { supabase } from '../lib/supabase/client';
import { formatRelativeTime } from '../lib/adventures';
import type { NotificationRow, NotificationType } from '../lib/notifications';
import { cn } from '../lib/utils';

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_META: Record<
  NotificationType,
  {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
  }
> = {
  friend_request: { icon: UserPlus, title: 'Friend request' },
  friend_accepted: { icon: UserCheck, title: 'Request accepted' },
  adventure_shared: { icon: Share2, title: 'Adventure shared' },
  group_invite: { icon: Users, title: 'Added to a group' },
};

function notificationHref(n: NotificationRow): string | null {
  if (!n.entity_id) return null;
  if (n.type === 'adventure_shared') return `/adventures/${n.entity_id}`;
  if (n.type === 'group_invite') return `/groups/${n.entity_id}`;
  if (n.type === 'friend_request') return '/friends';
  return null;
}

function notificationText(
  n: NotificationRow,
  entityNames: Map<string, string>
): string {
  const actor = n.actor?.display_name || 'Someone';
  switch (n.type) {
    case 'friend_request':
      return `${actor} sent you a friend request`;
    case 'friend_accepted':
      return `${actor} accepted your friend request`;
    case 'adventure_shared': {
      const name = n.entity_id ? entityNames.get(n.entity_id) : undefined;
      return name
        ? `${actor} shared "${name}" with you`
        : `${actor} shared an adventure with you`;
    }
    case 'group_invite': {
      const name = n.entity_id ? entityNames.get(n.entity_id) : undefined;
      return name
        ? `${actor} added you to ${name}`
        : `${actor} added you to a group`;
    }
    default:
      return 'New notification';
  }
}

export default function NotificationsSheet({
  open,
  onOpenChange,
}: NotificationsSheetProps) {
  const { notifications, unreadCount, loading, markAllRead, markRead } =
    useNotifications();
  const [entityNames, setEntityNames] = useState<Map<string, string>>(
    new Map()
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const adventureIds = [
      ...new Set(
        notifications
          .filter((n) => n.type === 'adventure_shared' && n.entity_id)
          .map((n) => n.entity_id as string)
      ),
    ];
    const groupIds = [
      ...new Set(
        notifications
          .filter((n) => n.type === 'group_invite' && n.entity_id)
          .map((n) => n.entity_id as string)
      ),
    ];

    void (async () => {
      const names = new Map<string, string>();
      if (adventureIds.length > 0) {
        const { data } = await supabase
          .from('adventures')
          .select('id, title')
          .in('id', adventureIds);
        (data ?? []).forEach((row) =>
          names.set(row.id as string, row.title as string)
        );
      }
      if (groupIds.length > 0) {
        const { data } = await supabase
          .from('groups')
          .select('id, name')
          .in('id', groupIds);
        (data ?? []).forEach((row) =>
          names.set(row.id as string, row.name as string)
        );
      }
      if (!cancelled) setEntityNames(names);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, notifications]);

  const sorted = useMemo(
    () =>
      [...notifications].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [notifications]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton
        className="mx-auto max-w-md gap-0 rounded-t-2xl p-0 sm:max-w-lg"
      >
        <SheetHeader className="px-4 pb-3 pt-4">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            Friend requests, shares, and group invites.
          </SheetDescription>
        </SheetHeader>

        <div className="flex max-h-[65dvh] flex-col overflow-y-auto px-4 pb-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span
              className="text-xs font-medium text-muted-foreground"
              aria-live="polite"
            >
              {unreadCount > 0
                ? `${unreadCount} unread`
                : 'You are all caught up'}
            </span>
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={markAllRead}
                className="rounded-full text-xs"
              >
                Mark all read
              </Button>
            )}
          </div>

          {loading && notifications.length === 0 ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bell className="size-5" />
              </span>
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Friend requests and shared adventures will show up here.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {sorted.map((notification) => {
                const meta = TYPE_META[notification.type];
                const Icon = meta.icon;
                const href = notificationHref(notification);
                const unread = !notification.read_at;
                const body = (
                  <span className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40">
                    <span
                      className={cn(
                        'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg',
                        unread
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {notificationText(notification, entityNames)}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                    </span>
                    {unread && (
                      <span
                        aria-hidden
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                      />
                    )}
                  </span>
                );
                return (
                  <li key={notification.id}>
                    {href ? (
                      <Link
                        to={href}
                        className="block"
                        onClick={() => markRead(notification.id)}
                      >
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {loading && notifications.length > 0 && (
          <div className="flex justify-center border-t px-4 py-2.5">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
