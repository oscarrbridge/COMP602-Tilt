import { useState, useEffect } from 'react';
import './UserBalance.css';
import { auth, db } from '../../../Backend/firebase/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';

import NavWindow from '../NavWindow/NavWindow';

export default function UserBalance() {
  const [NavActive, SetNavActive] = useState(false);
  // Balance State
  const [balance, setBalance] = useState<number | null>(null);
  // UseState for user, preset as null if not signed in
  const [user, setUser] = useState<User | null>(null);

  // Runs when the component gets loaded or updated onAuthStateChanged
  useEffect(() => {
    // Auth listener
    const unsubscribeAuth = auth.onAuthStateChanged(setUser);
    // Cleanup the Auth listener when the user logs out or switches
    return unsubscribeAuth;
  }, []);

  // Sets null balance if user not signed in
  useEffect(() => {
    if (!user) {
      setBalance(null);
      return;
    }

    const data = doc(db, 'users', user.uid);
    // Updates with user balance with the database value
    const unsubscribeDoc = onSnapshot(data, (user) => {
      if (user.exists()) {
        setBalance(user.data().balance ?? 0);
      }
    });

    // Cleanup the Firestore listener when the user logs out or switches
    return unsubscribeDoc;
  }, [user]);

  return (
    <>
      <div className='UserBalanceContainer'>
        <div className='UserIcon'>
          <img src='src\assets\user-icon.png' width={25} />
        </div>
        <div className='UserBalance'>
          <p>{balance !== null ? balance.toLocaleString() : '---'}</p>
        </div>
        <div
          className='DropArrow'
          onMouseEnter={() => SetNavActive(true)}
          onMouseLeave={() => SetNavActive(false)}
        >
          <img src='src\assets\caret-icon.png' width={25} />
          {NavActive && <NavWindow />}
        </div>
      </div>
    </>
  );
}
