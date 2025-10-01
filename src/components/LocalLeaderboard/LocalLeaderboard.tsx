import { useEffect, useState } from 'react';
import './LocalLeaderboard.css';
import { collection, onSnapshot as update, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../../Backend/firebase/firebaseConfig';
import { NZ_UNIS } from '../../components/Auth/Universities';
import { Price, useCurrency } from '../CurrencySwitcher/currencyswitcher';

export default function LocalLeaderboard() {
  interface Users {
    UserID: number;
    Name: string;
    netProfit: number;
    University: string;
  }

  // List of users state
  const [Users, SetUsers] = useState<Users[]>([]);
  const { code, setCode } = useCurrency(); // ← NEW

  // keep currency in sync with NavWindow (reads localStorage)
  useEffect(() => {
    const KEY = 'currency.code';
    // Type guard for allowed currency codes
    const isCurrency = (x: any): x is 'NZD' | 'AUD' | 'USD' | 'EUR' | 'GBP' =>
      x === 'NZD' || x === 'AUD' || x === 'USD' || x === 'EUR' || x === 'GBP';
    // Initial sync on mount: read current value from localStorage
    const initial = localStorage.getItem(KEY);
    if (isCurrency(initial) && initial !== code) setCode(initial);
    // Same-tab change detection:
    // The storage event does not fire in the same tab that wrote the value,
    let last = initial ?? code;
    const id = window.setInterval(() => {
      const cur = localStorage.getItem(KEY);
      if (cur && cur !== last) {
        last = cur;
        if (isCurrency(cur) && cur !== code) setCode(cur);
      }
    }, 250);
    // Also resync when the window regains focus (covers tab switches / minimized)
    const onFocus = () => {
      const cur = localStorage.getItem(KEY);
      if (isCurrency(cur) && cur !== code) setCode(cur);
    };
    window.addEventListener('focus', onFocus);
    // Cross-tab sync:
    // The 'storage' event fires in *other* tabs when localStorage changes.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || e.newValue == null) return;
      if (isCurrency(e.newValue) && e.newValue !== code) setCode(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    // Cleanup, stop polling and remove listeners on unmount
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [code, setCode]);

  useEffect(() => {
    // Reference to collection of users in Firestore
    const usersRef = collection(db, 'users');
    // Build NZ values for 'in' filter (<=10 allowed)
    const nzValues = NZ_UNIS.map((u) => u.value);
    // Filter to NZ; order by balance
    const top50 = query(
      usersRef,
      where('university.value', 'in', nzValues),
      orderBy('netProfit', 'desc'),
      limit(50)
    );

    // Live updates for users collection
    const detach = update(top50, (snap) => {
      // Map each Firestore document into Users type
      const rows: Users[] = snap.docs.map((d, idx) => {
        const data: any = d.data();
        return {
          // Leaderboard position (+1 for list index)
          UserID: idx + 1,
          Name: (data.username ?? data.email ?? 'Unknown').toString(),
          netProfit: typeof data.netProfit === 'number' ? data.netProfit : 0,
          University: (data.university?.label ?? data.university?.value ?? 'Unknown').toString(),
        };
      });
      SetUsers(rows);
    });

    return () => detach();
  }, []);

  return (
    <>
      <div className='LocalLeaderboard'>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>University</th>
              <th>Amount won</th>
            </tr>
          </thead>
          <tbody key={code}>
            {Users.map((i) => (
              <tr key={i.UserID}>
                <td>{i.UserID}</td>
                <td>{i.Name}</td>
                <td>{i.University}</td>
                <td>
                  <Price
                    amount={(Number.isFinite(i.netProfit) ? i.netProfit : 0) / 100}
                    from='NZD'
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
