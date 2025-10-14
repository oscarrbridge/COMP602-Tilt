import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  writeBatch,
  serverTimestamp,
  setDoc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../../Backend/firebase/firebaseConfig.ts';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import { getUsersByIds } from '../../../Backend/firebase/firestoreBatch.ts';

interface FriendRequest {
  id: string;
  senderId: string;
  recipientId: string;
  timestamp: any;
  senderUsername?: string; // Added by listener
  senderEmail?: string; // Added by listener
}

// Helper to fetch full user details
const getFriendDetails = async (uid: string) => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      uid: docSnap.id,
      ...data,
      username: data.username,
      email: data.email,
    } as { uid: string; username: string; email: string };
  }
  return null;
};

export function useFriends() {
  const { user, loading } = useUser();
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
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
    const friendsCollectionRef = collection(db, 'users', userId, 'friends');
    const unsubscribe = onSnapshot(friendsCollectionRef, async (snapshot) => {
      const friendIDs = snapshot.docs.map((d) => d.id);
      const detailedFriends = await getUsersByIds(friendIDs);
      setFriends(detailedFriends);
    });
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
      const friendIDs = snapshot.docs.map((doc) => doc.id);
      const detailPromises = friendIDs.map(getFriendDetails);
      const detailedFriends = (await Promise.all(detailPromises)).filter((f) => f !== null);

      setFriends(detailedFriends);
    });

    return () => unsubscribe();
  }, [userId, loading]); // 2. Incoming Friend Requests Listener (Fetches sender details)

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
      const requestsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const detailPromises = requestsData.map((req) => getFriendDetails(req.senderId));
      const senderDetails = (await Promise.all(detailPromises)).filter((d) => d !== null);

      const detailedRequests = requestsData.map((req) => {
        const sender = senderDetails.find((d) => d.uid === req.senderId);
        return {
          ...req,
          senderUsername: sender?.username,
          senderEmail: sender?.email,
        };
      });
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
    loading: loading,
  };
}
