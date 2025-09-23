import { useEffect, useState } from 'react';
import './LocalLeaderboard.css';
import { collection, onSnapshot as update, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../../Backend/firebase/firebaseConfig';
import { NZ_UNIS } from '../../components/Auth/Universities';

export default function LocalLeaderboard() {
  interface Users {
    UserID: number;
    Name: string;
    netProfit: number;
    University: string;
  }

  // List of users state
  const [Users, SetUsers] = useState<Users[]>([]);

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
          <tbody>
            {Users.map((i) => (
              <tr key={i.UserID}>
                <td>{i.UserID}</td>
                <td>{i.Name}</td>
                <td>{i.University}</td>
                <td>
                  {new Intl.NumberFormat(undefined, {
                    style: 'currency',
                    currency: 'NZD',
                    maximumFractionDigits: 2,
                  }).format(Number.isFinite(i.netProfit) ? i.netProfit : 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
