import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { CurrencyProvider } from '../CurrencySwitcher/currencyswitcher.tsx';

import { auth, db } from '../../../Backend/firebase/firebaseConfig';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import './NavBar.css';

import NavWindow from '../NavWindow/NavWindow.tsx';
import RegisterUser from '../../components/Auth/RegisterUser';
import SignInPopup from '../../components/Auth/SignInUser';
import UserBalance from '../UserBalance/UserBalance';
import TestTransactions from './transactionTest';

export default function NavBar() {
  const navigate = useNavigate();

  const [NavActive, SetNavActive] = useState(false);
  // State for showing login popup (Boolean)
  const [LoginActive, SetLogin] = useState(false);
  // State for showing register popup (Boolean)
  const [SignUpActive, SetSignUp] = useState(false);
  // // Firebase auth state, (null if logged out, User firebase Auth object if logged in)
  // const [user, setUser] = useState<User | null>(null);
  // // Balance state
  // const [balance, setBalance] = useState<number | null>(null);
  const { user, balance } = useUser();

  // useEffect(() => {
  //   const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
  //     // Whenever user logs in or out, update user state to current user
  //     setUser(currentUser);
  //   });
  //   // Remove listener when NavBar unmounts
  //   return () => unsubscribe();
  // }, []);

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

  // Sets null balance if user not signed in
  // useEffect(() => {
  //   if (!user) {
  //     setBalance(null);
  //     return;
  //   }

  //   const data = doc(db, 'users', user.uid);
  //   // Updates with user balance with the database value
  //   const unsubscribeDoc = onSnapshot(data, (user) => {
  //     if (user.exists()) {
  //       setBalance(user.data().balance ?? 0);
  //     }
  //   });
  //   // Cleanup the Firestore listener when the user logs out or switches
  //   return unsubscribeDoc;
  // }, [user]);

  return (
    <>
      <CurrencyProvider base='NZD' DefaultCurrency='NZD'>
        <div className='NavBarContainer'>
          <div className='Logo' onClick={() => navigate('/')}>
            <img src='src/assets/Tilt.png' width={80} />
          </div>

          <div className='UserBalance'>
            <div className='UserBalanceContainer'>
              {user ? (
                <>
                  <div className='UserIcon'>
                    <img src='src/assets/user-icon.png' width={25} />
                  </div>
                  <UserBalance balance={balance} />
                  <div
                    className='DropArrow'
                    onMouseEnter={() => SetNavActive(true)}
                    onMouseLeave={() => SetNavActive(false)}
                  >
                    <img src='src/assets/caret-icon.png' width={25} />
                    {NavActive && <NavWindow />}
                  </div>
                </>
              ) : (
                // Display a simpler icon or message when logged out
                <div className='UserIcon'>
                  <img src='src/assets/user-icon.png' width={25} />
                </div>
              )}
            </div>
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
        {/*user && <TestTransactions user={user} />*/}
      </CurrencyProvider>
    </>
  );
}
