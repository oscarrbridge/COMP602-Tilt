// src/pages/Deposit.jsx
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../Backend/firebase/firebaseConfig'; // adjust path if needed
import './Deposit.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';

export default function Deposit() {
  // States for uid, withdraw amount, currency type, submit payment, error
  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('nzd');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
    if (!isFinite(n)) return NaN;
    return Math.round(n * 100);
  }

  // Submit helper:
  // Validates minimum amount: $0
  // POSTs to /payments/withdraw with { uid, amount_cents, currency }
  // Shows success or error
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Must be signed in to deposit
    if (!uid) {
      setError('Please sign in to make a deposit.');
      return;
    }

    // Validate amount in cents, checks for minimum
    const amount_cents = dollarsToCents(amount);
    if (!amount_cents || amount_cents <= 0) {
      setError('Enter a valid amount greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      // Call backend, currency is normalized to lowercase
      const res = await fetch(`${API_URL}/payments/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          amount_cents,
          currency: (currency || 'nzd').toLowerCase(),
        }),
      });

      // If the server says the request did not work
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // Use the server’s message if it exists
        throw new Error(err.detail || `Request failed (${res.status})`);
      }

      // The request worked so we expect the server to give us a link to continue
      const { url } = await res.json();
      // If there is no link, treat it as an error we can show to the user
      if (!url) throw new Error('No checkout URL returned.');
      // If there is a link, send the browser there (the checkout page)
      window.location.href = url;
    } catch (err: any) {
      // Failed: show message and re-enable the form
      setError(err.message || 'Something went wrong starting the deposit.');
      setSubmitting(false);
    }
  }

  return (
    <div className='DepositPage'>
      <form className='WithdrawForm' onSubmit={onSubmit}>
        <label>Amount (NZD):</label>
        <input
          type='number'
          inputMode='decimal'
          min='0'
          step='0.01'
          placeholder='Enter amount, e.g., 10.00'
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
          {submitting ? 'Redirecting…' : 'Deposit'}
        </button>

        {!uid && <p className='FormHint'>You must be signed in to deposit.</p>}
        {error && <p className='FormError'>{error}</p>}
      </form>
    </div>
  );
}
