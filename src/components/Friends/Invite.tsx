import {
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../../Backend/firebase/firebaseConfig';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../../Backend/firebase/UserFunctions';
import { createGameLobby, joinGameLobby } from '../../../Backend/lobby_functions';

export type Invite = {
  id?: string;
  senderId: string;
  senderName?: string;
  recipientId: string;
  sessionId?: string;
  game?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: any;
  hostAck?: boolean;
};

export function sendInvite({
  senderId,
  senderName,
  recipientId,
  sessionId,
  game,
}: Omit<Invite, 'status' | 'createdAt'>) {
  return addDoc(collection(db, 'invites'), {
    senderId,
    senderName: senderName || null,
    recipientId,
    sessionId: sessionId || null,
    game: game || null,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}
export function listenIncomingInvites(currentUid: string, cb: (invites: Invite[]) => void) {
  const q = query(
    collection(db, 'invites'),
    where('recipientId', '==', currentUid),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snap) => {
    const arr: Invite[] = [];
    snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as Invite) }));
    cb(arr);
  });
}

export function acceptInvite(inviteId: string) {
  return updateDoc(doc(db, 'invites', inviteId), { status: 'accepted' });
}
export function declineInvite(inviteId: string) {
  return updateDoc(doc(db, 'invites', inviteId), { status: 'declined' });
}

export function InvitePopup() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenIncomingInvites(user.uid, setInvites);
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const qAccepted = query(
      collection(db, 'invites'),
      where('senderId', '==', user.uid),
      where('status', '==', 'accepted')
    );

    const unsub = onSnapshot(qAccepted, async (snap) => {
      for (const d of snap.docs) {
        const inv = { id: d.id, ...(d.data() as any) } as Invite;

        if (!inv.sessionId || inv.hostAck) continue;

        try {
          // join the lobby as the host (inviter) if not already
          await joinGameLobby(inv.sessionId, user.uid, user.displayName || user.email || 'Player');

          try {
            localStorage.setItem('sessionId', inv.sessionId);
          } catch {}

          // mark acknowledged to avoid duplicate redirects across tabs
          await updateDoc(doc(db, 'invites', inv.id!), { hostAck: true });

          // go to the table (make sure this matches your Route!)
          navigate(`/blackjack/${inv.sessionId}`, { replace: true });
        } catch (e) {
          console.error('Host redirect/join failed:', e);
        }
      }
    });

    return () => unsub();
  }, [user?.uid, navigate]);

  const onAccept = async (inv: Invite) => {
    if (!user) return;

    try {
      // 1) ensure session id exists
      let sessionId = inv.sessionId;
      if (!sessionId) {
        sessionId = await createGameLobby(inv.senderId, 2, 5);
        await updateDoc(doc(db, 'invites', inv.id!), { sessionId, status: 'accepted' });
      } else {
        await updateDoc(doc(db, 'invites', inv.id!), { status: 'accepted' });
      }

      // 2) join the lobby
      await joinGameLobby(sessionId, user.uid, user.displayName || user.email || 'Player');

      // 3) remember last session
      try {
        localStorage.setItem('sessionId', sessionId);
      } catch {}

      // 4) hide the invite card right away (snappy UX)
      setInvites((prev) => prev.filter((i) => i.id !== inv.id));

      // 5) navigate to the table (match your route!)
      navigate(`/blackjack/${sessionId}`, { replace: true });
    } catch (err) {
      console.error('Accept invite failed:', err);
    }
  };
  const onDecline = async (inv: Invite) => {
    await declineInvite(inv.id!);
  };

  if (!invites.length) return null;

  return (
    <div
      style={{ position: 'fixed', right: 20, bottom: 90, zIndex: 9999, display: 'grid', gap: 10 }}
    >
      {invites.map((inv) => (
        <div
          key={inv.id}
          style={{
            width: 300,
            padding: 10,
            borderRadius: 12,
            background: 'var(--secondary-colour)',
            color: 'var(--text-colour)',
            border: '1px solid rgba(255,255,255,.12)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {inv.senderName || 'Friend'} invited you to {inv.game || 'Blackjack'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className='btn' onClick={() => onAccept(inv)}>
              Join
            </button>
            <button className='btn outline' onClick={() => onDecline(inv)}>
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
