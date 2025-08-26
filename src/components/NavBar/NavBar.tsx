import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../Backend/firebase/firebaseConfig';

import { auth } from '../../../Backend/firebase/firebaseConfig.ts';
import './NavBar.css';
import { useState, useEffect } from 'react';

import UserBalance from '../UserBalance/UserBalance.tsx';

import LoginWindow from '../LoginWindow/LoginWindow.tsx';
import RegisterWindow from '../RegisterWindow/RegisterWindow.tsx';

import RegisterUser from '../../components/Auth/RegisterUser';
import SignInPopup from '../../components/Auth/SignInUser';

export default function NavBar() {
  // State for showing login popup (Boolean)
  const [LoginActive, SetLogin] = useState(false);
  // State for showing register popup (Boolean)
  const [SignUpActive, SetSignUp] = useState(false);
  // Firebase auth state, (null if logged out, User firebase Auth object if logged in)
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Whenever user logs in or out, update user state to current user
      setUser(currentUser);
    });
    // Remove listener when NavBar unmounts
    return () => unsubscribe();
  }, []);

  function HandleLoginClick() {
    if (SignUpActive) {
      SetSignUp(false);
    }

    SetLogin((prev) => !prev);
  }

  function HandleRegisterClick() {
    if (LoginActive) {
      SetLogin(false);
    }

    SetSignUp((prev) => !prev);
  }

  return (
    <>
      <div className='NavBarContainer'>
        <div className='Logo'>
          <img src='src\assets\Tilt.png' width={80} />
        </div>

        <div className='UserBalance'>
          <UserBalance />
        </div>

        <div className='LoginControls'>
          {/* If user is logged in, show their info and logout */}
          {user ? (
            <div className='LoggedInBox'>
              <span>{user.displayName || user.email || 'Logged in!'}</span>
              <button onClick={() => signOut(auth)}>Logout</button>
            </div>
          ) : (
            // If no user logged in, show login/register buttons
            <>
              <button onClick={HandleLoginClick} disabled={SignUpActive}>
                Login
              </button>
              <button onClick={HandleRegisterClick} disabled={LoginActive}>
                Register
              </button>
            </>
          )}
        </div>
      </div>
      {/* <div className='LoginMiniWindow'>
        {LoginActive && <LoginWindow />}
        {SignUpActive && <RegisterWindow />}
      </div> */}

      {/* Popups when clicked on*/}
      <RegisterUser open={SignUpActive} onClose={() => SetSignUp(false)} />
      <SignInPopup open={LoginActive} onClose={() => SetLogin(false)} />
    </>
  );
}
