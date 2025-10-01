import { useEffect, useMemo, useState } from 'react';
import './TransactionHistory.css';
import { collection, onSnapshot as update /*, query, orderBy */ } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../Backend/firebase/firebaseConfig';
import { Price, useCurrency } from '../CurrencySwitcher/currencyswitcher';

export default function TransactionHistory() {
  interface Transaction {
    TransactionID: string;
    TransactionType: string;
    TransactionAmount: number;
    BalanceAfter: number;
    AmountNZDMajor: number;
    BalanceAfterNZDMajor: number;
    When: Date | null;
    Currency?: string;
    Source?: string;
  }

  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [range, setRange] = useState<'all' | '7d' | '30d' | '365d'>('all');
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'payments' | 'games' | 'deposit' | 'withdraw' | 'bet' | 'win' | 'loss'
  >('all');

  const { code, setCode } = useCurrency();

  // auth → uid
  useEffect(() => {
    if (uid) return;
    const detach = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => detach();
  }, [uid]);

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

  // Firestore listener (wrap back in an effect)
  useEffect(() => {
    if (!uid) {
      setTransactions([]);
      return;
    }

    // const q = query(collection(db, 'users', uid, 'transactions'), orderBy('timestamp','desc'));
    const transaction = collection(db, 'users', uid, 'transactions');

    const detach = update(transaction, (snap) => {
      const rows: Transaction[] = snap.docs
        .map((u) => {
          const data: any = u.data();
          const type = (data.type ?? '').toString();
          const transactionType = type ? type.charAt(0).toUpperCase() + type.slice(1) : '';
          let when: Date | null = null;
          const ts = data.timestamp;
          if (ts && typeof ts.toDate === 'function') when = ts.toDate();

          const amountCents = typeof data.amount === 'number' ? Math.abs(data.amount) : 0;
          const balanceAfterCents = typeof data.balanceAfter === 'number' ? data.balanceAfter : 0;

          return {
            TransactionID: u.id,
            TransactionType: transactionType,
            TransactionAmount: amountCents,
            BalanceAfter: balanceAfterCents,
            AmountNZDMajor: amountCents / 100,
            BalanceAfterNZDMajor: balanceAfterCents / 100,
            When: when,
            Currency: ((data.currency ?? 'nzd') + '').toUpperCase(),
            Source: (data.source ?? '') + '',
          };
        })
        .sort((a, b) => {
          const ta = a.When ? a.When.getTime() : 0;
          const tb = b.When ? b.When.getTime() : 0;
          return tb - ta;
        });

      setTransactions(rows);
    });

    return () => detach();
  }, [uid]);

  function rangeStart(kind: 'all' | '7d' | '30d' | '365d'): Date | null {
    if (kind === 'all') return null;
    const now = new Date();
    const start = new Date(now);
    if (kind === '7d') start.setDate(now.getDate() - 7);
    if (kind === '30d') start.setDate(now.getDate() - 30);
    if (kind === '365d') start.setDate(now.getDate() - 365);
    return start;
  }

  function matchesType(t: Transaction, filter: typeof typeFilter) {
    const type = t.TransactionType.toLowerCase();
    if (filter === 'all') return true;
    if (filter === 'payments') return type === 'deposit' || type === 'withdraw';
    if (filter === 'games') return type === 'bet' || type === 'win' || type === 'loss';
    return type === filter;
  }

  const filtered = useMemo(() => {
    const start = rangeStart(range)?.getTime() ?? null;
    return transactions.filter((t) => {
      if (start !== null) {
        const when = t.When?.getTime();
        if (!when || when < start) return false;
      }
      return matchesType(t, typeFilter);
    });
  }, [transactions, range, typeFilter, code]); // keep code so memo refreshes

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
          <tbody key={`${code}-${uid ?? 'nouser'}`}>
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
