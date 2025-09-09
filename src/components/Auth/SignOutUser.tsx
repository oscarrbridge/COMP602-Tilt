// SignOutUser.tsx will sign out the user
import { getAuth, signOut } from 'firebase/auth';

const auth = getAuth();
signOut(auth)
  .then(() => {
    // Sign-out successful
  })
  .catch((error) => {
    // An error happened
  });
