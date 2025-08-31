// Import the function to initialize your Firebase app instance
import { initializeApp } from 'firebase/app';
// Import Firebase Authentication utilities:
// - getAuth: lets you create and manage the auth instance
// - GoogleAuthProvider: configures Google as a sign-in provider
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
// Import Firestore utilities:
// - getFirestore: lets you create and manage a Firestore database instance
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyA_EsLgUuYr9SwOyur4Yv7tlI9fNrqypak',
  authDomain: 'tilt-af037.firebaseapp.com',
  projectId: 'tilt-af037',
  storageBucket: 'tilt-af037.firebasestorage.app',
  messagingSenderId: '689246641315',
  appId: '1:689246641315:web:77da67ced4a544aa07b316',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Google Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
