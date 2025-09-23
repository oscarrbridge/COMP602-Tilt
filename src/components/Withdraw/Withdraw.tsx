import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../Backend/firebase/firebaseConfig'; // adjust path
import './Withdraw.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';

export default function Withdraw() {
  // States for uid, withdraw amount, currency type, submit payment, error
  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('nzd');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  // Keep uid in sync with Firebase auth state
  // If we already have a uid, skip
  useEffect(() => {
    if (uid) return;
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, [uid]);

  // Helper to convert a dollar string (e.g. "12.34") to integer cents (1234)
  function dollarsToCents(dollarsStr: string) {
    const n = Number(dollarsStr);
    return Math.round(n * 100);
  }

  // Submit helper:
  // Validates minimum amount: $0.50
  // POSTs to /payments/withdraw with { uid, amount_cents, currency }
  // Shows success or error
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');

    // Must be signed in to withdraw
    if (!uid) {
      setError('Please sign in to withdraw.');
      return;
    }

    // Validate amount in cents, checks for minimum
    const amount_cents = dollarsToCents(amount);
    if (!amount_cents || amount_cents < 50) {
      setError('Minimum withdrawal is $0.50');
      return;
    }

    try {
      setSubmitting(true);
      // Call backend, currency is normalized to lowercase
      const res = await fetch(`${API_URL}/payments/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          amount_cents,
          currency: (currency || 'nzd').toLowerCase(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);

      // Success: show message and clear amount
      setOk('Withdrawal completed.');
      setAmount('');
    } catch (err: any) {
      // Failed: show message
      setError(err.message || 'Withdrawal failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <br />
      <form className='WithdrawForm' onSubmit={onSubmit}>
        <label>Amount:</label>
        <input
          type='number'
          inputMode='decimal'
          min='0'
          step='0.01'
          placeholder='Enter amount'
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={submitting}
        />
        <label>Currency:</label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toLowerCase())}
          disabled={submitting}
        >
          <option value='nzd'>NZD</option>
          <option value='usd'>USD</option>
        </select>
        <button type='submit' disabled={submitting || !uid}>
          {submitting ? 'Processing…' : 'Submit'}
        </button>
        {!uid && <p className='FormHint'>You must be signed in to withdraw.</p>}
        {error && <p className='FormError'>{error}</p>}
        {ok && <p className='FormOk'>{ok}</p>}
      </form>
    </div>
  );
}
