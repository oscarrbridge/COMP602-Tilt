// Import the function to initialize your Firebase app instance
import { initializeApp } from 'firebase/app';
// Import Firebase Authentication utilities:
// - getAuth: lets you create and manage the auth instance
// - GoogleAuthProvider: configures Google as a sign-in provider
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth';
// Import Firestore utilities:
// - getFirestore: lets you create and manage a Firestore database instance
import { connectFirestoreEmulator, getFirestore, setLogLevel } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyA_EsLgUuYr9SwOyur4Yv7tlI9fNrqypak',
  authDomain: 'tilt-af037.firebaseapp.com',
  projectId: 'tilt-af037',
  storageBucket: 'tilt-af037.appspot.com',
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

setLogLevel('debug');

// if (window.location.hostname === 'localhost') {
//   console.log('Development mode: Connecting to local Firebase emulators...');

//   // Point Firestore to the local emulator
//   connectFirestoreEmulator(db, '127.0.0.1', 8081);

//   // Point Auth to the local emulator
//   connectAuthEmulator(auth, 'http://127.0.0.1:9099');
// }
