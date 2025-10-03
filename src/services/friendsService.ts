import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../Backend/firebase/firebaseConfig.ts';

export async function addFriend(currentUid: string, friendUid: string) {
  // Get a reference to the user's document
  const userRef = doc(db, 'users', currentUid);

  // Atomically add the new friend's UID to the 'friends' array.
  await updateDoc(userRef, {
    friends: arrayUnion(friendUid),
  });
}
