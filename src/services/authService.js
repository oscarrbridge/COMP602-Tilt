// authService.js contains the functions for signup/login/logout

import { auth, googleProvider } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

// Register with email + password
export const registerUser = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

// Login with email + password
export const signInUser = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// Sign in with Google
export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

// Sign out
export const signOutUser = () => {
  return signOut(auth);
};
