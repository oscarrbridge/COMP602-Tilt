import { doc, collection, onSnapshot as onUpdate } from 'firebase/firestore';
import { auth, db } from '../../../Backend/firebase/firebaseConfig';
import type { UserDoc } from '../../types/UserDoc';
import { onAuthStateChanged } from 'firebase/auth';

import './UserStatistics.css';
import { useEffect, useState } from 'react';

interface CalculatedStatistics {
  gamesPlayed: number;
  biggestWin: number;
  biggestLoss: number;
  averageBet: number;
  mostProfitableGame: string;
}

interface Transaction {
  amount?: number;
  type?: 'bet' | 'win' | 'loss' | 'deposit' | 'withdraw';
  gameType?: string;
  balanceBefore?: number;
  balanceAfter?: number;
}
export default function GetStatistics() {
  // Checks if someone is already logged in, otherwise wait on log in event
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  // User's main document
  const [statistics, setStatistics] = useState<UserDoc | null>(null);
  // Calculated stats from user's stats
  const [calculatedStatistics, setCalculatedStatistics] = useState<CalculatedStatistics>({
    gamesPlayed: 0,
    biggestWin: 0,
    biggestLoss: 0,
    averageBet: 0,
    mostProfitableGame: '',
  });
  const [error, setError] = useState<string | null>(null);

  // If we don't have a user log in yet, ensures upon log in event it updates
  useEffect(() => {
    if (uid) return;
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, [uid]);

  // Live updates with user's document data
  useEffect(() => {
    if (!uid) return;

    const userDoc = doc(db, 'users', uid);

    const unsub = onUpdate(
      userDoc,
      (user) => {
        setStatistics((user.data() as UserDoc) ?? null);
      },
      (error) => {
        setError(error.message);
      }
    );

    return () => unsub();
  }, [uid]);

  // Live updates with user's transactions data
  useEffect(() => {
    if (!uid) return;
    const transactions = collection(db, 'users', uid, 'transactions');

    const update = onUpdate(
      transactions,
      (group) => {
        // Calculated stats
        const transaction: Transaction[] = group.docs.map((d) => d.data() as Transaction);
        const gamesPlayed = transaction.length;
        const wins = transaction.filter((t) => t.type === 'win' && typeof t.amount === 'number');
        const losses = transaction.filter((t) => t.type === 'loss' && typeof t.amount === 'number');
        const bets = transaction.filter((t) => t.type === 'bet' && typeof t.amount === 'number');
        const biggestWin = wins.length ? Math.max(...wins.map((t) => t.amount as number)) : 0;
        const biggestLoss = losses.length ? Math.max(...losses.map((t) => t.amount as number)) : 0;
        const averageBet = bets.length
          ? bets.reduce((sum, t) => sum + (t.amount as number), 0) / bets.length
          : 0;
        // Group transactions by game to find most profitable game type
        const totalByGame: Record<string, number> = {};
        for (const t of transaction) {
          const gameType = t.gameType || 'unknown';
          if (!(gameType in totalByGame)) totalByGame[gameType] = 0;
          if (t.type === 'win' && typeof t.amount === 'number')
            totalByGame[gameType] += t.amount as number;
          if (t.type === 'loss' && typeof t.amount === 'number')
            totalByGame[gameType] -= t.amount as number;
        }
        const mostProfitableGame = Object.keys(totalByGame).length
          ? Object.entries(totalByGame).sort((a, b) => b[1] - a[1])[0][0]
          : '';

        // Commit calculated stats
        setCalculatedStatistics({
          gamesPlayed,
          biggestWin,
          biggestLoss,
          averageBet,
          mostProfitableGame,
        });
      },
      (error) => setError(error.message)
    );

    return () => update();
  }, [uid]);

  return (
    <div className='StatisticsTable'>
      <table>
        <tbody>
          <tr>
            <td>Total Balance</td>
            <td>{statistics?.balance ?? 0}</td>
          </tr>
          {/* <tr>
            <td>Total Deposited</td>
            <td>{i.TotalDeposited}</td>
          </tr>
          <tr>
            <td>Total Withdrawn</td>
            <td>{i.TotalWithdrawn}</td>
          </tr> */}
          <tr>
            <td>Net Profit</td>
            <td>{statistics?.netProfit ?? 0}</td>
          </tr>
          <tr>
            <td>Games Played</td>
            <td>{calculatedStatistics.gamesPlayed}</td>
          </tr>
          <tr>
            <td>Biggest Win</td>
            <td>{calculatedStatistics.biggestWin}</td>
          </tr>
          <tr>
            <td>Biggest Loss</td>
            <td>{calculatedStatistics.biggestLoss}</td>
          </tr>
          <tr>
            <td>Average Bet</td>
            <td>{calculatedStatistics.averageBet.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Most Profitable Game</td>
            <td>{calculatedStatistics.mostProfitableGame || '—'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
