import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../Backend/firebase/firebaseConfig'; // adjust path
import { addUniBalance } from '../../../Backend/transactions';
import './AddUniBalance.css';

// Define valid codes and their uni balance values
const VALID_CODES: Record<string, number> = {
  'WELCOME100': 100,
  'BONUS50': 50,
  'STARTER25': 25,
  'LUCKY75': 75,
  'PROMO200': 200,
};

export default function AddUniBalance() {
  // States for uid, code input, submit status, error/success messages
  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);
  const [code, setCode] = useState('');
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

  // Submit helper:
  // Validates code and adds corresponding uni balance
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');

    // Must be signed in to submit code
    if (!uid) {
      setError('Please sign in to enter a code.');
      return;
    }

    // Validate code input
    const trimmedCode = code.trim().toUpperCase();
    console.log(trimmedCode.length);
    if (!trimmedCode) {
      setError('Please enter a code.');
      return;
    }
  
    // Check if code is valid
    // const uniAmount = VALID_CODES[trimmedCode];
    // if (!uniAmount) {
      //setError('Invalid code. Please check and try again.');
      //return;
    //}

    if(trimmedCode.length != 16){
      setError('Invalid code. Please check and try again.');
      return;
    }

    try {
      setSubmitting(true);
      
      // Add uni balance using the backend function
    if(trimmedCode.length == 16){
      await addUniBalance(uid, 1000);
    }
    //else{
      //await addUniBalance(uid, uniAmount);
    //}
      // Success: show message and clear code
      setOk(`Success! Added ${1000} uni balance to your account.`);
      setCode('');
    } catch (err: any) {
      // Failed: show error message
      setError(err.message || 'Failed to add uni balance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <br />
      <form className='AddUniBalance' onSubmit={onSubmit}>
        <label>Enter Code:</label>
        <input
          type='text'
          placeholder='Enter your code'
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={submitting}
          style={{ textTransform: 'uppercase' }}
        />
        <button type='submit' disabled={submitting || !uid}>
          {submitting ? 'Processing…' : 'Submit Code'}
        </button>
        {!uid && <p className='FormHint'>You must be signed in to enter a code.</p>}
        {error && <p className='FormError'>{error}</p>}
        {ok && <p className='FormOk'>{ok}</p>}
      </form>
    </div>
  );
}
