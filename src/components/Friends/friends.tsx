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
  senderUsername?: string;
  senderEmail?: string;
}

// Pull minimal public profile info for a single user
// Note: we only return what's needed for the UI
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
  return null; // If the user doc doesn't exist (deleted or never created)
};

export function useFriends() {
  const { user, loading } = useUser();
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const userId = user?.uid;

  // Fire off a friend request from the current user to the given recipient.
  // We use a deterministic doc id `${sender}_${recipient}` to avoid duplicates.
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

    // This listener keeps the local friends array in sync with Firestore.
    const friendsCollectionRef = collection(db, 'users', userId, 'friends');
    const unsubscribe = onSnapshot(friendsCollectionRef, async (snapshot) => {
      const friendIDs = snapshot.docs.map((d) => d.id);
      const detailedFriends = await getUsersByIds(friendIDs);
      setFriends(detailedFriends);
    });
  };

  // Accept a pending request:
  // - add each other to /users/{uid}/friends/
  // - remove the pending friendRequests doc
  const acceptFriendRequest = async (senderUid: string) => {
    if (!user) return;

    const batch = writeBatch(db);
    const now = serverTimestamp();

    // Add friend to my list
    const currentUserFriendRef = doc(db, 'users', user.uid, 'friends', senderUid);
    batch.set(currentUserFriendRef, { status: 'accepted', since: now });

    // Add me to their list
    const senderFriendRef = doc(db, 'users', senderUid, 'friends', user.uid);
    batch.set(senderFriendRef, { status: 'accepted', since: now });

    // Remove the pending request document
    const requestRef = doc(db, 'friendRequests', `${senderUid}_${user.uid}`);
    batch.delete(requestRef);

    try {
      await batch.commit();
    } catch (error) {
      console.error('Failed to commit friend acceptance batch:', error);
    }
  };

  // Remove a friend relationship for both sides using a batch delete.
  const removeFriend = async (friendUid: string) => {
    if (!user) return;

    const batch = writeBatch(db);

    // Me -> them
    const currentUserRef = doc(db, 'users', user.uid, 'friends', friendUid);
    batch.delete(currentUserRef);

    // Them -> me
    const friendUserRef = doc(db, 'users', friendUid, 'friends', user.uid);
    batch.delete(friendUserRef);

    try {
      await batch.commit();
      console.log(`Successfully removed ${friendUid} as a friend.`);
    } catch (error) {
      console.error('Failed to commit friend removal batch:', error);
    }
  };

  // Watches /users/{me}/friends and expands each id into user display info.
  useEffect(() => {
    if (loading || !userId) {
      setFriends([]);
      return;
    }

    const friendsCollectionRef = collection(db, 'users', userId, 'friends');
    const unsubscribe = onSnapshot(friendsCollectionRef, async (snapshot) => {
      const friendIDs = snapshot.docs.map((doc) => doc.id);

      // For each friend id, load basic profile (username/email).
      // This keeps the UI display friendly without duplicating data in the friends subcollection.
      const detailPromises = friendIDs.map(getFriendDetails);
      const detailedFriends = (await Promise.all(detailPromises)).filter((f) => f !== null);

      setFriends(detailedFriends);
    });

    // Clean up listener when user changes or component unmounts
    return () => unsubscribe();
  }, [userId, loading]);

  // Keeps a list of requests where I'm the recipient and status is 'pending'.
  // We also expand the sender into a displayable object (username/email).
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

      // Pull all sender details in parallel.
      const detailPromises = requestsData.map((req) => getFriendDetails(req.senderId));
      const senderDetails = (await Promise.all(detailPromises)).filter((d) => d !== null);

      // Merge the user info back onto each request item for display.
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

  // Expose data + actions to components.
  return {
    friends,
    pendingRequests,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
    loading: loading,
  };
}
