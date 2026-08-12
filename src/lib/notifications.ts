import { supabase } from './supabase/client';

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'adventure_shared'
  | 'group_invite';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
  actor?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  actorId: string;
  entityId?: string | null;
}

/**
 * Inserts a notification on behalf of the actor. Best-effort: notification
 * failures never break the primary action (e.g. sending a friend request).
 */
export async function createNotification({
  userId,
  type,
  actorId,
  entityId = null,
}: CreateNotificationParams): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      actor_id: actorId,
      entity_id: entityId,
    });
    if (error) {
      console.error('Error creating notification:', error);
    }
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

/** Fetches the user's notifications, newest first. */
export async function fetchNotifications(
  userId: string,
  options: { unreadOnly?: boolean } = {}
): Promise<{ data: NotificationRow[]; error?: string }> {
  let query = supabase
    .from('notifications')
    .select(
      `
      id, user_id, type, actor_id, entity_id, read_at, created_at,
      actor:actor_id(id, display_name, avatar_url)
      `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (options.unreadOnly) {
    query = query.is('read_at', null);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching notifications:', error);
    return { data: [], error: error.message };
  }
  return { data: (data as unknown as NotificationRow[]) ?? [] };
}

/** Marks a single notification as read. */
export async function markNotificationRead(
  notificationId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
  if (error) {
    console.error('Error marking notification read:', error);
    return { error: error.message };
  }
  return {};
}

/** Marks all of the user's notifications as read. */
export async function markAllNotificationsRead(
  userId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) {
    console.error('Error marking all notifications read:', error);
    return { error: error.message };
  }
  return {};
}
