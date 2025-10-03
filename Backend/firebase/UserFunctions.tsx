import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

const TOP_UP_THRESHOLD_CENTS = 1000; // Trigger when balance is below $10.00

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isToppingUp, setIsToppingUp] = useState(false);

  // --- NEW: State to hold the user's chosen top-up amount ---
  const [autoPayAmount, setAutoPayAmount] = useState(2000); // Default to $20

  // Effect to get the current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Effect to listen for REAL-TIME changes to the user's document
  useEffect(() => {
    if (!user) {
      setBalance(0);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBalance(data.balance ?? 0);
        setAutoPayEnabled(data.autoPayEnabled || false);
        // --- UPDATE: Read the user's saved amount from Firestore ---
        setAutoPayAmount(data.autoPayAmountCents || 2000); // Fallback to $20
      } else {
        setBalance(0);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // --- AUTO-TOP-UP LOGIC ---
  useEffect(() => {
    if (autoPayEnabled && balance < TOP_UP_THRESHOLD_CENTS && !isToppingUp) {
      performAutoTopUp();
    }
  }, [balance, autoPayEnabled, isToppingUp, user]);

  const performAutoTopUp = async () => {
    if (!user) return;

    console.log(`Balance is low. Simulating a top-up of ${autoPayAmount / 100}.`);
    setIsToppingUp(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      const txRef = doc(db, 'users', user.uid, 'transactions', `autopay-${Date.now()}`);
      const batch = writeBatch(db);

      // --- UPDATE: Use the dynamic amount from state ---
      batch.update(userRef, { balance: increment(autoPayAmount) });

      batch.set(txRef, {
        type: 'deposit',
        amount: autoPayAmount, // Use the dynamic amount
        source: 'auto-top-up',
        status: 'succeeded',
        balanceBefore: balance,
        balanceAfter: balance + autoPayAmount, // Use the dynamic amount
        timestamp: serverTimestamp(),
      });

      await batch.commit();
    } catch (error) {
      console.error('Auto top-up simulation failed:', error);
    } finally {
      setTimeout(() => setIsToppingUp(false), 3000);
    }
  };

  const refreshBalance = async () => {
    console.log('Balance refresh is now handled automatically by onSnapshot.');
  };

  return { user, balance, refreshBalance, loading };
}
