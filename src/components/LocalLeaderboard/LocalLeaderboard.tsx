import { useEffect, useState } from 'react';
<<<<<<< Updated upstream
<<<<<<< Updated upstream
import './LocalLeaderboard.css'

export default function LocalLeaderboard()
{
    interface Users{
        UserID: number;
        Name: string;
        BalanceTotal: number;
    }

    const [Users, SetUsers] = useState<Users[]>([])


    function GetUserData()
    {
        // Do a fetch
        SetUsers([
            {
                'UserID': 1,
                'Name': '1',
                'BalanceTotal': 1
            },
            {
                'UserID': 2,
                'Name': '2',
                'BalanceTotal': 2
            },
            {
                'UserID': 3,
                'Name': '3',
                'BalanceTotal': 3
            },
            {
                'UserID': 4,
                'Name': '4',
                'BalanceTotal': 4
            },
        ])
    }

    useEffect(() => {
        GetUserData();
    }, [])


    return(
        <>
        <div className='LocalLeaderboard'>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Balance Won</th>
                    </tr>
                </thead>
                <tbody>
                    {Users.map((i) => (
                            <tr key={i.UserID}>
                                <td>{i.Name}</td>
                                <td>{i.BalanceTotal}</td>
                            </tr>
                    ))}
                </tbody>
            </table>
        </div>
        </>
    );
}
=======
=======
>>>>>>> Stashed changes
import './LocalLeaderboard.css';

import { collection, onSnapshot as update, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../Backend/firebase/firebaseConfig';

export default function LocalLeaderboard() {
  interface Users {
    UserID: number;
    Name: string;
    BalanceTotal: number;
  }

  // List of users state
  const [Users, SetUsers] = useState<Users[]>([]);

  useEffect(() => {
    // Reference to collection of users in Firestore
    const usersRef = collection(db, 'users');
    // Order top 50 users by balance
    const top50 = query(usersRef, orderBy('balance', 'desc'), limit(50));

    // Live updates for users collection
    const detach = update(top50, (snap) => {
      // Map each Firestore document into Users type
      const rows: Users[] = snap.docs.map((d, idx) => {
        const data: any = d.data();
        return {
          // Leaderboard position (+1 for list index)
          UserID: idx + 1,
          Name: (data.username ?? data.email ?? 'Unknown').toString(),
          BalanceTotal: typeof data.balance === 'number' ? data.balance : 0,
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
              <th>Name</th>
              <th>Balance Won</th>
            </tr>
          </thead>
          <tbody>
            {Users.map((i) => (
              <tr key={i.UserID}>
                <td>{i.Name}</td>
                <td>{i.BalanceTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
