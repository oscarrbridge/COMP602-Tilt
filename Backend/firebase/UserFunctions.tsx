import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

// When balance drops under this, we consider topping up (in cents)
const TOP_UP_THRESHOLD_CENTS = 1000; // Trigger when balance is below $10.00

const AUTOPAY_CLIENT_SIDE_ENABLED = false;

interface UserProfile {
  roles: string[];
  balance: number;
  email: string;
  autoPayEnabled?: boolean;
  autoPayAmountCents?: number;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [autoPayAmount, setAutoPayAmount] = useState(2000); // Default to $20

  // Auth listener: keeps local user in sync with Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // we’ve at least heard back from Auth now
    });
    return () => unsubscribe();
  }, []);

  // Firestore user doc listener: mirrors server-side profile and balance in real time
  useEffect(() => {
    if (loading || !user?.uid) {
      setBalance(0);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setBalance(data.balance ?? 0);
        setAutoPayEnabled(data.autoPayEnabled ?? false);
        setAutoPayAmount(data.autoPayAmountCents ?? 2000);
        setUserProfile(data);
      } else {
        // No profile yet (or was deleted)
        setBalance(0);
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, [user?.uid, loading]);

  useEffect(() => {
    // Hard stop: don’t run any of this unless explicitly enabled
    if (!AUTOPAY_CLIENT_SIDE_ENABLED) return;

    // Only attempt once at a time, and only if user/profile allow it
    if (autoPayEnabled && balance < TOP_UP_THRESHOLD_CENTS && !isToppingUp && user?.uid) {
      void performAutoTopUp();
    }
  }, [balance, autoPayEnabled, isToppingUp, user?.uid]);

  // Simulated top-up: writes to Firestore using a batch and records a transaction
  const performAutoTopUp = async () => {
    if (!user?.uid) return;
    if (!AUTOPAY_CLIENT_SIDE_ENABLED) return;

    console.log(`Balance is low. Simulating a top-up of ${autoPayAmount / 100}.`);
    setIsToppingUp(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      const txRef = doc(db, 'users', user.uid, 'transactions', `autopay-${Date.now()}`);
      const batch = writeBatch(db);

      // Increase balance atomically
      batch.update(userRef, { balance: increment(autoPayAmount) });

      // Append a transaction record for visibility/auditing in UI
      batch.set(txRef, {
        type: 'deposit',
        amount: autoPayAmount,
        source: 'auto-top-up',
        status: 'succeeded',
        balanceBefore: balance,
        balanceAfter: balance + autoPayAmount,
        timestamp: serverTimestamp(),
      });

      await batch.commit();
    } catch (error) {
      console.error('Auto top-up simulation failed:', error);
    } finally {
      // Simple cooldown to avoid rapid re-triggers while snapshots propagate
      setTimeout(() => setIsToppingUp(false), 3000);
    }
  };

  // Balance is already live via onSnapshot, so this is just a placeholder
  const refreshBalance = async () => {
    console.log('Balance refresh is now handled automatically by onSnapshot.');
  };

  // Expose auth state, profile bits, and helpers to consumers
  return { user, balance, userProfile, refreshBalance, loading };
}
