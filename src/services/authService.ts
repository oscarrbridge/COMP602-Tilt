// authService.ts contains the functions for signup/login/logout

import { auth, googleProvider } from '../firebaseConfig.ts';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

// Register with email + password
export async function registerUser(email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  return user;
}

// Login with email + password
export async function signInUser(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

// Sign in with Google
export async function signInWithGoogle() {
  const { user } = await signInWithPopup(auth, googleProvider);
  return user;
}

// Sign out
export const signOutUser = () => {
  return signOut(auth);
};
