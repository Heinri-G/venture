import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, UserCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Button } from './ui/button';
import {
  cancelFriendRequest,
  fetchFriendshipsForUser,
  getFriendStatus,
  removeFriendRow,
  respondToFriendRequest,
  sendFriendRequest,
  type FriendRow,
  type FriendStatus,
} from '../lib/friends';

interface FriendActionButtonProps {
  userId: string;
  targetUserId: string;
  targetName?: string | null;
}

/**
 * Renders the correct friend action for a target profile: Add Friend,
 * Request Sent/Cancel, Accept/Decline, or Friends/Remove.
 */
export default function FriendActionButton({
  userId,
  targetUserId,
  targetName,
}: FriendActionButtonProps) {
  const [status, setStatus] = useState<FriendStatus>('none');
  const [rows, setRows] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const { data, error } = await fetchFriendshipsForUser(userId);
      if (cancelled) return;
      setRows(data ?? []);
      if (!error) {
        setStatus(getFriendStatus(userId, targetUserId, data ?? []));
      }
      setLoading(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [userId, targetUserId]);

  const handleSend = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await sendFriendRequest(userId, targetUserId);
    setBusy(false);
    if (error) {
      toast.error('Could not send friend request', { description: error });
      return;
    }
    setStatus('pending_outgoing');
    toast.success('Friend request sent');
  }, [busy, userId, targetUserId]);

  const handleCancel = useCallback(async () => {
    const row = rows.find(
      (r) => r.requester_id === userId && r.addressee_id === targetUserId
    );
    if (!row || busy) return;
    setBusy(true);
    const { error } = await cancelFriendRequest(row.id);
    setBusy(false);
    if (error) {
      toast.error('Could not cancel request', { description: error });
      return;
    }
    setStatus('none');
    toast.success('Friend request cancelled');
  }, [busy, rows, userId, targetUserId]);

  const handleRespond = useCallback(async (accepted: boolean) => {
    const row = rows.find(
      (r) => r.requester_id === targetUserId && r.addressee_id === userId
    );
    if (!row || busy) return;
    setBusy(true);
    const { error } = await respondToFriendRequest(
      row.id,
      accepted ? 'accepted' : 'declined',
      { actorUserId: userId, requesterId: targetUserId }
    );
    setBusy(false);
    if (error) {
      toast.error(
        accepted ? 'Could not accept request' : 'Could not decline request',
        { description: error }
      );
      return;
    }
    setStatus(accepted ? 'friends' : 'none');
    toast.success(accepted ? 'You are now friends' : 'Request declined');
  }, [busy, rows, targetUserId, userId]);

  const handleRemove = useCallback(async () => {
    const row = rows.find(
      (r) =>
        (r.requester_id === userId && r.addressee_id === targetUserId) ||
        (r.requester_id === targetUserId && r.addressee_id === userId)
    );
    if (!row || busy) return;
    setBusy(true);
    const { error } = await removeFriendRow(row.id);
    setBusy(false);
    setRemoveOpen(false);
    if (error) {
      toast.error('Could not remove friend', { description: error });
      return;
    }
    setStatus('none');
    toast.success('Friend removed');
  }, [busy, rows, targetUserId, userId]);

  if (loading) {
    return <Button variant="outline" className="rounded-full" disabled><Loader2 className="size-4 animate-spin" /></Button>;
  }

  const name = targetName || 'this user';

  return (
    <>
      <div className="flex items-center gap-2">
        {status === 'none' && (
          <Button onClick={handleSend} disabled={busy} className="rounded-full">
            {busy ? <Loader2 className="animate-spin" /> : <UserPlus />}
            Add Friend
          </Button>
        )}

        {status === 'pending_outgoing' && (
          <>
            <Button variant="secondary" disabled className="rounded-full">
              <Check />
              Request Sent
            </Button>
            <Button variant="ghost" onClick={handleCancel} disabled={busy} className="rounded-full">
              Cancel
            </Button>
          </>
        )}

        {status === 'pending_incoming' && (
          <>
            <Button onClick={() => handleRespond(true)} disabled={busy} className="rounded-full">
              {busy ? <Loader2 className="animate-spin" /> : <UserCheck />}
              Accept Request
            </Button>
            <Button variant="ghost" onClick={() => handleRespond(false)} disabled={busy} className="rounded-full">
              Decline
            </Button>
          </>
        )}

        {status === 'friends' && (
          <>
            <Button variant="secondary" disabled className="rounded-full">
              <Check />
              Friends
            </Button>
            <Button variant="ghost" onClick={() => setRemoveOpen(true)} disabled={busy} className="rounded-full">
              Remove
            </Button>
          </>
        )}
      </div>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You will stop sharing private content with each other. You can
              always send a new friend request later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)} className="rounded-full">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={busy} className="rounded-full">
              {busy ? <Loader2 className="animate-spin" /> : null}
              Remove Friend
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
