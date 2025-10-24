import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { CurrencyProvider } from '../CurrencySwitcher/currencyswitcher.tsx';

import { auth, db } from '../../../Backend/firebase/firebaseConfig';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import './NavBar.css';

import tiltLogo from '../../assets/Tilt.png';
import userIcon from '../../assets/user-icon.png';
import caretIcon from '../../assets/caret-icon.png';

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
  const { user, balance, userProfile } = useUser();

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
      <div className='floating-admin-controls'>
        {/* Show Admin button if roles include 'admin' */}
        {userProfile?.roles?.includes('admin') && (
          <button onClick={() => navigate('/admin')}>Admin Dashboard</button>
        )}

        {/* Show Staff button if roles include 'staff' */}
        {userProfile?.roles?.includes('staff') && (
          <button onClick={() => navigate('/staff')}>Staff Dashboard</button>
        )}
      </div>
      <CurrencyProvider base='NZD' DefaultCurrency='NZD'>
        <div className='NavBarContainer'>
          <div className='Logo' onClick={() => navigate('/')}>
            <img src={tiltLogo} width={80} alt='Tilt logo' />
          </div>

          <div className='UserBalance'>
            <div className='UserBalanceContainer'>
              {user ? (
                <>
                  <div className='UserIcon'>
                    <img src={userIcon} width={25} alt='User' />
                  </div>
                  <UserBalance balance={balance} />
                  <div
                    className='DropArrow'
                    onMouseEnter={() => SetNavActive(true)}
                    onMouseLeave={() => SetNavActive(false)}
                  >
                    <img src={caretIcon} width={25} alt='Open' />
                    {NavActive && <NavWindow />}
                  </div>
                </>
              ) : (
                <div className='UserIcon'>
                  <img src={userIcon} width={25} alt='User' />
                </div>
              )}
            </div>
          </div>
          <div className='LoginControls'>
            {/* If user is logged in, show their info and logout */}
            {user ? (
              <div
                className='LoggedInBox'
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {/* Display user name/email */}
                <span>{user.displayName || user.email || 'Logged in!'}</span>

                {/* Settings button */}
                <button
                  onClick={() => navigate('/settings')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #888',
                    background: '#444',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Settings
                </button>

                {/* Logout button */}
                <button
                  onClick={() => signOut(auth)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #888',
                    background: '#222',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Logout
                </button>
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
