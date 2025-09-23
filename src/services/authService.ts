// authService.ts contains the functions for signup/login/logout

import { auth, googleProvider, db } from '../../Backend/firebase/firebaseConfig.ts';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';

async function profileData(user: User) {
  // Create Firestore user profile if it doesn't exist
  const userProfile = doc(db, 'users', user.uid);
  // Grabs the profile that was registered
  const grabUser = await getDoc(userProfile);
  // If that profile doesn't already exist
  if (!grabUser.exists()) {
    // Create the user's attributes
    await setDoc(
      userProfile,
      {
        email: user.email,
        // Username becomes the email address before '@'
        // eg: email = tilt_account@gmail.com,
        //     username = tilt_account
        username: user.email?.split('@')[0],
        // Balance and history initilised to 0
        balance: 0,
        totalWinnings: 0,
        totalLosses: 0,
        netProfit: 0,
        createdAt: serverTimestamp(),
        uniBalance: 0,
      },
      // Add merge to prevent override
      { merge: true }
    );
  }
}

// Register with email + password
export async function registerUser(email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await profileData(user);
  return user;
}

// Login with email + password
export async function signInUser(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  await profileData(user);
  return user;
}

// Sign in with Google
export async function signInWithGoogle() {
  const { user } = await signInWithPopup(auth, googleProvider);
  await profileData(user);
  return user;
}

// Sign out
export const signOutUser = () => {
  return signOut(auth);
};
