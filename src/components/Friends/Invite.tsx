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
import { createPokerLobby, joinPokerLobby } from '../../Games/Poker/pokerfunctions';

export type Invite = {
  id?: string;
  senderId: string;
  senderName?: string;
  recipientId: string;
  sessionId?: string;
  game?: 'blackjack' | 'poker';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: any;
  hostAck?: boolean;
};

// Send a new invite
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
    game: game || 'blackjack',
    createdAt: serverTimestamp(),
  });
}

//  Listen for incoming invites for the current user
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
