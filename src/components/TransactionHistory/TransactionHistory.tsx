import { useEffect, useState } from 'react';

import './TransactionHistory.css';

import { collection, onSnapshot as update } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../Backend/firebase/firebaseConfig';

export default function () {
  interface Transaction {
    TransactionID: string;
    TransactionType: string;
    TransactionAmount: number;
    BalanceAfter: number;
  }
  // User state
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  // Transaction array for user
  const [Transaction, SetTransaction] = useState<Transaction[]>([]);

  // Listen log in if we don't already have a uid
  useEffect(() => {
    if (uid) return;
    const detach = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => detach();
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      SetTransaction([]);
      return;
    }

    // Transaction reference to logged in user
    const transaction = collection(db, 'users', uid, 'transactions');

    const detach = update(transaction, (snap) => {
      const rows: Transaction[] = snap.docs.map((u) => {
        const data: any = u.data();

        // Format type string to capitalized version (e.g., "win" -> "Win")
        const type = (data.type ?? '').toString();
        const transactionType = type ? type.charAt(0).toUpperCase() + type.slice(1) : '';

        return {
          TransactionID: u.id,
          TransactionType: transactionType,
          TransactionAmount: typeof data.amount === 'number' ? Math.abs(data.amount) : 0,
          BalanceAfter: typeof data.balanceAfter === 'number' ? data.balanceAfter : 0,
        };
      });

      SetTransaction(rows);
    });

    return () => detach();
  }, [uid]);

  return (
    <>
      <div className='TransactionTable'>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Amount</th>
              <th>Balance After</th>
            </tr>
          </thead>
          <tbody>
            {Transaction.map((i) => (
              <tr key={i.TransactionID}>
                <td>{i.TransactionType}</td>
                <td>{i.TransactionAmount}</td>
                <td>{i.BalanceAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
