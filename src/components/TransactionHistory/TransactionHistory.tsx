import { useEffect, useMemo, useState } from 'react';
import './TransactionHistory.css';

import { collection, onSnapshot as update } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../Backend/firebase/firebaseConfig';

import { Price } from '../CurrencySwitcher/currencyswitcher';

export default function TransactionHistory() {
  interface Transaction {
    TransactionID: string;
    TransactionType: string;
    TransactionAmount: number; // stored cents (NZD)
    BalanceAfter: number; // stored cents (NZD)
    AmountNZDMajor: number; // derived dollars
    BalanceAfterNZDMajor: number; // derived dollars
    When: Date | null; // firestore timestamp -> Date
    Currency?: string;
    Source?: string; // "app" | "stripe"
  }
  // User state
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  // Transaction array for user
  const [transactions, setTransactions] = useState<Transaction[]>([]); // filters
  const [range, setRange] = useState<'all' | '7d' | '30d' | '365d'>('all');
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'payments' | 'games' | 'deposit' | 'withdraw' | 'bet' | 'win' | 'loss'
  >('all');
  // Listen log in if we don't already have a uid
  useEffect(() => {
    if (uid) return;
    const detach = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => detach();
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setTransactions([]);
      return;
    }

    // Transaction reference to logged in user
    const transaction = collection(db, 'users', uid, 'transactions');

    const detach = update(transaction, (snap) => {
      const rows: Transaction[] = snap.docs
        .map((u) => {
          const data: any = u.data();

          // Capitalize type (e.g., "win" -> "Win")
          const type = (data.type ?? '').toString();
          const transactionType = type ? type.charAt(0).toUpperCase() + type.slice(1) : '';
          // Firestore Timestamp to JS Date
          let when: Date | null = null;
          const ts = data.timestamp;
          if (ts && typeof ts.toDate === 'function') {
            when = ts.toDate();
          }

          // Stored as NZD cents, derive NZD dollars for display
          const amountCents = typeof data.amount === 'number' ? Math.abs(data.amount) : 0;
          const balanceAfterCents = typeof data.balanceAfter === 'number' ? data.balanceAfter : 0;
          return {
            TransactionID: u.id,
            TransactionType: transactionType,
            TransactionAmount: amountCents, // cents
            BalanceAfter: balanceAfterCents, // cents
            AmountNZDMajor: amountCents / 100, // dollars for <Price />
            BalanceAfterNZDMajor: balanceAfterCents / 100,
            When: when,
            Currency: ((data.currency ?? 'nzd') + '').toUpperCase(),
            Source: (data.source ?? '') + '',
          };
        })
        // newest first
        .sort((a, b) => {
          const ta = a.When ? a.When.getTime() : 0;
          const tb = b.When ? b.When.getTime() : 0;
          return tb - ta;
        });

      setTransactions(rows);
    });

    return () => detach();
  }, [uid]);

  // time window helper
  function rangeStart(kind: 'all' | '7d' | '30d' | '365d'): Date | null {
    if (kind === 'all') return null;
    const now = new Date();
    const start = new Date(now);
    if (kind === '7d') start.setDate(now.getDate() - 7);
    if (kind === '30d') start.setDate(now.getDate() - 30);
    if (kind === '365d') start.setDate(now.getDate() - 365);
    return start;
  }

  // type matcher
  function matchesType(t: Transaction, filter: typeof typeFilter) {
    const type = t.TransactionType.toLowerCase();
    if (filter === 'all') return true;
    if (filter === 'payments') return type === 'deposit' || type === 'withdraw';
    if (filter === 'games') return type === 'bet' || type === 'win' || type === 'loss';
    return type === filter;
  }

  // apply filters (keeps snapshot sort order)
  const filtered = useMemo(() => {
    const start = rangeStart(range)?.getTime() ?? null;
    return transactions.filter((t) => {
      if (start !== null) {
        const when = t.When?.getTime();
        if (!when || when < start) return false;
      }
      return matchesType(t, typeFilter);
    });
  }, [transactions, range, typeFilter]);

  return (
    <>
      {/* Filters */}
      <div className='TransactionFilters' style={{ marginBottom: 12 }}>
        <label>
          Date Range:{' '}
          <select value={range} onChange={(e) => setRange(e.target.value as any)}>
            <option value='all'>All time</option>
            <option value='7d'>Last 7 days</option>
            <option value='30d'>Last month</option>
            <option value='365d'>Last 12 months</option>
          </select>
        </label>
        <label style={{ marginLeft: 12 }}>
          Type:{' '}
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
            <option value='all'>All</option>
            <option value='payments'>Payments (Deposit/Withdraw)</option>
            <option value='games'>Games (Bet/Win/Loss)</option>
            <option value='deposit'>Deposit only</option>
            <option value='withdraw'>Withdraw only</option>
            <option value='bet'>Bet only</option>
            <option value='win'>Win only</option>
            <option value='loss'>Loss only</option>
          </select>
        </label>
      </div>

      <div className='TransactionTable'>
        <table>
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Balance After</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.TransactionID}>
                <td>{i.When ? i.When.toLocaleString() : '—'}</td>
                <td>{i.TransactionType}</td>
                <td>
                  <Price amount={i.AmountNZDMajor} from='NZD' />
                </td>
                <td>
                  <Price amount={i.BalanceAfterNZDMajor} from='NZD' />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', opacity: 0.7 }}>
                  No transactions match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
