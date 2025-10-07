import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../../Backend/firebase/firebaseConfig'; // Adjust path if needed
import './AutoPayment.css';

// The URL for your local FastAPI backend
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function AutoPayment() {
  const [uid, setUid] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [amount, setAmount] = useState('20.00'); // Default top-up amount
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Get the current user's UID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Listen for real-time changes to the user's auto-pay settings in Firestore
  useEffect(() => {
    if (!uid) {
      setIsLoading(false);
      return;
    }

    const userRef = doc(db, 'users', uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      setIsLoading(false);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsEnabled(data.autoPayEnabled || false);
        if (data.autoPayAmountCents) {
          setAmount((data.autoPayAmountCents / 100).toFixed(2));
        }
      }
    });

    return () => unsubscribe();
  }, [uid]);

  const toMinorUnits = (valueStr: string) => {
    const n = Number(valueStr);
    return isFinite(n) ? Math.round(n * 100) : 0;
  };

  // This function is called when the user wants to save their settings
  const handleSaveSettings = async () => {
    if (!uid) return;
    setError('');
    setIsLoading(true);

    try {
      // Update the settings in Firestore via your backend
      await fetch(`${API_URL}/payments/update-autopay-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          autoPayEnabled: isEnabled,
          autoPayAmountCents: toMinorUnits(amount),
        }),
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  // This function handles the toggle action
  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!uid) return;
    const checked = e.target.checked;
    setIsEnabled(checked);
    setError('');
    setIsLoading(true);

    try {
      await fetch(`${API_URL}/payments/update-autopay-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          autoPayEnabled: checked,
          autoPayAmountCents: toMinorUnits(amount),
        }),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update settings.');
      setIsEnabled(!checked); // Revert UI on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='AutoPaySetup'>
      <div className='ToggleControl'>
        <label htmlFor='auto-pay-toggle'>Automatically top-up when balance is below $10</label>
        <input
          type='checkbox'
          id='auto-pay-toggle'
          checked={isEnabled}
          onChange={handleToggle}
          disabled={isLoading || !uid}
        />
      </div>

      {isEnabled && (
        <div className='SettingsControl'>
          <p>Top-up amount:</p>
          <input
            type='number'
            inputMode='decimal'
            min='5' // A reasonable minimum for auto-top-up
            step='0.01'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
