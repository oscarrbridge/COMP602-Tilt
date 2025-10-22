import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  writeBatch,
  type DocumentData,
  serverTimestamp,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@backend/firebase/firebaseConfig';
import { useUser } from '@backend/firebase/UserFunctions';
import { getDocs } from 'firebase/firestore';

// ----- Types -----
type FriendLite = {
  uid: string;
  username?: string;
  email?: string;
  totalWinsCents?: number;
  totalLossesCents?: number;
  winsCount?: number;
  lossesCount?: number;
};

type FriendRequestLite = {
  id: string;
  senderId: string;
  senderUsername?: string;
  senderEmail?: string;
};

// Helper to fetch full user details
const getFriendDetails = async (uid: string): Promise<FriendLite | null> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data() as DocumentData;
    return {
      uid: docSnap.id,
      username: data.username as string | undefined,
      email: data.email as string | undefined,
    };
  }
  return null;
};

const getFriendTotals = async (uid: string) => {
  // Try common collection names if your schema changed over time
  const candidatePaths = [
    collection(db, 'users', uid, 'transactions'),
    // collection(db, 'users', uid, 'history'),        // uncomment if you used this
    // collection(db, 'users', uid, 'gameHistory'),    // uncomment if you used this
  ];

  let snap = null;
  for (const col of candidatePaths) {
    try {
      snap = await getDocs(col);
      if (!snap.empty) {
        break; // found a non-empty collection
      }
    } catch (e) {
      console.warn('getFriendTotals: read failed for', col.path, e);
    }
  }

  if (!snap) {
    console.warn(`getFriendTotals: no transactions subcollection found for uid=${uid}`);
    return { totalWinsCents: 0, totalLossesCents: 0, winsCount: 0, lossesCount: 0 };
  }

  let totalWinsCents = 0;
  let totalLossesCents = 0;
  let winsCount = 0;
  let lossesCount = 0;

  snap.forEach((d) => {
    const t = d.data() as Record<string, unknown>;

    // Be flexible with type naming
    const rawType = String(t.type ?? t.kind ?? t.event ?? '').toLowerCase();
    const type = rawType === 'won' ? 'win' : rawType === 'lost' ? 'loss' : rawType;

    // Be flexible with amount field & units (cents vs dollars)
    // Try several common fields and coerce to number.
    let amount =
      typeof t.amount === 'number'
        ? t.amount
        : typeof t.amountCents === 'number'
          ? t.amountCents
          : typeof t.cents === 'number'
            ? t.cents
            : typeof t.value === 'number'
              ? t.value
              : typeof t.amount === 'string'
                ? Number(t.amount)
                : typeof t.amountCents === 'string'
                  ? Number(t.amountCents)
                  : typeof t.cents === 'string'
                    ? Number(t.cents)
                    : typeof t.value === 'string'
                      ? Number(t.value)
                      : NaN;

    if (!Number.isFinite(amount)) return;

    // Detect dollars vs cents: if amount is small (|amount| < 1e4) and not an int of cents,
    // you likely stored dollars—convert to cents.
    if (Math.abs(amount) < 100 && !Number.isInteger(amount)) {
      amount = Math.round(amount * 100);
    }

    if (type === 'win') {
      totalWinsCents += amount;
      winsCount += 1;
    } else if (type === 'loss') {
      totalLossesCents += amount;
      lossesCount += 1;
    }
  });

  // Helpful debug dump (remove once confirmed)
  console.debug(`Totals for ${uid}:`, {
    totalWinsCents,
    totalLossesCents,
    winsCount,
    lossesCount,
  });

  return { totalWinsCents, totalLossesCents, winsCount, lossesCount };
};

export function useFriends() {
  const { user, loading } = useUser();
  const [friends, setFriends] = useState<FriendLite[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequestLite[]>([]);
  const userId = user?.uid;

  const sendFriendRequest = async (recipientUid: string) => {
    if (!user) return;
    const requestRef = doc(db, 'friendRequests', `${user.uid}_${recipientUid}`);
    try {
      await setDoc(requestRef, {
        senderId: user.uid,
        recipientId: recipientUid,
        status: 'pending',
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to send request:', error);
    }
  };

  const acceptFriendRequest = async (senderUid: string) => {
    if (!user) return;
    const batch = writeBatch(db);
    const now = serverTimestamp();

    const currentUserFriendRef = doc(db, 'users', user.uid, 'friends', senderUid);
    batch.set(currentUserFriendRef, { status: 'accepted', since: now });

    const senderFriendRef = doc(db, 'users', senderUid, 'friends', user.uid);
    batch.set(senderFriendRef, { status: 'accepted', since: now });

    const requestRef = doc(db, 'friendRequests', `${senderUid}_${user.uid}`);
    batch.delete(requestRef);

    try {
      await batch.commit();
    } catch (error) {
      console.error('Failed to commit friend acceptance batch:', error);
    }
  };

  const removeFriend = async (friendUid: string) => {
    if (!user) return;
    const batch = writeBatch(db); // 1. Delete relationship from current user's list

    const currentUserRef = doc(db, 'users', user.uid, 'friends', friendUid);
    batch.delete(currentUserRef); // 2. Delete relationship from the friend's list

    const friendUserRef = doc(db, 'users', friendUid, 'friends', user.uid);
    batch.delete(friendUserRef);

    try {
      await batch.commit();
      console.log(`Successfully removed ${friendUid} as a friend.`);
    } catch (error) {
      console.error('Failed to commit friend removal batch:', error);
    }
  };

  // 1. Accepted Friends Listener (Fetches user details for display)
  useEffect(() => {
    if (loading || !userId) {
      setFriends([]);
      return;
    }

    const friendsCollectionRef = collection(db, 'users', userId, 'friends');
    const unsubscribe = onSnapshot(friendsCollectionRef, async (snapshot) => {
      const friendIDs = snapshot.docs.map((d) => d.id);

      // Fetch details + totals for each friend in parallel
      const enriched = await Promise.all(
        friendIDs.map(async (fid) => {
          const [details, totals] = await Promise.all([
            getFriendDetails(fid),
            getFriendTotals(fid),
          ]);
          if (!details) return null;
          return { ...details, ...totals } as FriendLite;
        })
      );

      setFriends(enriched.filter((f): f is FriendLite => f !== null));
    });

    return () => unsubscribe();
  }, [userId, loading]);

  useEffect(() => {
    if (loading || !userId) {
      setPendingRequests([]);
      return;
    }

    const requestsQuery = query(
      collection(db, 'friendRequests'),
      where('recipientId', '==', userId),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(requestsQuery, async (snapshot) => {
      const requestsData: FriendRequestLite[] = snapshot.docs.map((d) => {
        const data = d.data() as DocumentData;
        return { id: d.id, senderId: data.senderId as string };
      });

      const senderDetails = await Promise.all(
        requestsData.map((r) => getFriendDetails(r.senderId))
      );

      const detailedRequests: FriendRequestLite[] = requestsData.map((r, i) => ({
        ...r,
        senderUsername: senderDetails[i]?.username,
        senderEmail: senderDetails[i]?.email,
      }));
      setPendingRequests(detailedRequests);
    });
    return () => unsubscribe();
  }, [userId, loading]);

  return {
    friends,
    pendingRequests,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
    loading,
  };
}
