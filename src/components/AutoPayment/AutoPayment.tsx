import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../../Backend/firebase/firebaseConfig';
import { useCurrency } from '../CurrencySwitcher/currencyswitcher'; // same hook you used in BetControls
import './AutoPayment.css';

// FastAPI URL
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';

// ---- helpers ----
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
const parseAmount = (s: string) => {
  const n = Number(String(s).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export default function AutoPayment() {
  const [uid, setUid] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  // UI amount is in *active currency* dollars (string for the input)
  const [amountInput, setAmountInput] = useState('20.00');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // currency utils (same shape as your BetControls)
  const { convertFromBase, convert, code, base } = useCurrency(); // base is NZD in your app

  // --- auth ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUid(user ? user.uid : null));
    return () => unsub();
  }, []);

  // --- load settings (stored in NZD cents), render in active currency dollars ---
  useEffect(() => {
    if (!uid) {
      setIsLoading(false);
      return;
    }
    const ref = doc(db, 'users', uid);
    const unsub = onSnapshot(ref, (snap) => {
      setIsLoading(false);
      if (!snap.exists()) return;

      const data = snap.data() as any;
      setIsEnabled(!!data.autoPayEnabled);

      // Prefer cents canonical; fall back to dollars mirror if present.
      // Values in DB are NZD cents (integer).
      let nzdCents: number | null = null;
      if (typeof data.autoPayAmountCents === 'number') {
        nzdCents = data.autoPayAmountCents;
      } else if (typeof data.autoPayAmountDollars === 'number') {
        nzdCents = Math.round(Number(data.autoPayAmountDollars) * 100);
      }

      if (nzdCents != null) {
        const nzdDollars = nzdCents / 100; // NZD dollars
        const activeDollars = convertFromBase(nzdDollars); // -> active currency dollars
        setAmountInput(activeDollars.toFixed(2));
      }
    });
    return () => unsub();
  }, [uid, convertFromBase]);

  // Convert current input (active currency dollars) -> NZD cents (int) for saving
  const amountNzdCents = useMemo(() => {
    const activeDollars = parseAmount(amountInput); // e.g. USD 20.00 if user switched
    const nzdDollars = convert(activeDollars, code, base); // active -> NZD
    return Math.round(nzdDollars * 100); // NZD cents (int)
  }, [amountInput, convert, code, base]);

  const sendUpdate = async (enabled: boolean, nzdCents: number) => {
    if (!uid) return;
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/payments/update-autopay-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          autoPayEnabled: enabled,
          autoPayAmountCents: nzdCents, // backend expects NZD cents (canonical)
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e: any) {
      setError(e.message || 'Failed to update settings.');
      // revert the toggle UI if this was triggered from a toggle
      setIsEnabled((prev) => prev); // no-op; handled by caller when needed
    } finally {
      setIsLoading(false);
    }
  };

  // --- save button ---
  const handleSaveSettings = async () => {
    if (!uid) return;
    // enforce a reasonable min ($5 in current currency) before converting
    const clampedActive = clamp(parseAmount(amountInput), 5, 1_000_000);
    setAmountInput(clampedActive.toFixed(2));
    await sendUpdate(isEnabled, amountNzdCents);
  };

  // --- toggle ---
  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!uid) return;
    const nextEnabled = e.target.checked;
    setIsEnabled(nextEnabled);

    // If enabling and amount too small/invalid, force to 20.00 in UI currency
    const parsed = parseAmount(amountInput);
    const useAmountStr =
      nextEnabled && (!Number.isFinite(parsed) || parsed < 5) ? '20.00' : amountInput;
    if (useAmountStr !== amountInput) setAmountInput(useAmountStr);

    await sendUpdate(nextEnabled, amountNzdCents);
  };

  return (
    <div className='AutoPaySetup'>
      <div className='ToggleControl'>
        <label htmlFor='auto-pay-toggle'>
          Automatically top-up when balance is below $10 (NZD)
        </label>
        <input
          id='auto-pay-toggle'
          type='checkbox'
          checked={isEnabled}
          onChange={handleToggle}
          disabled={isLoading || !uid}
        />
      </div>

      {isEnabled && (
        <div className='SettingsControl'>
          <p>Top-up amount ({code}):</p>
          <input
            type='number'
            inputMode='decimal'
            min='5'
            step='0.01'
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            disabled={isLoading}
          />
          <button onClick={handleSaveSettings} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Update Settings'}
          </button>
        </div>
      )}

      {error && <p className='FormError'>{error}</p>}
      {!uid && <p className='FormHint'>Sign in to manage auto-top-up.</p>}
    </div>
  );
}
