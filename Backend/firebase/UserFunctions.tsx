import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

const TOP_UP_THRESHOLD_CENTS = 1000; // Trigger when balance is below $10.00

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

  // Watch authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen for user profile changes in Firestore
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
        setBalance(0);
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, [user?.uid, loading]);

  // Auto-top-up effect
  useEffect(() => {
    if (autoPayEnabled && balance < TOP_UP_THRESHOLD_CENTS && !isToppingUp && user?.uid) {
      void performAutoTopUp();
    }
  }, [balance, autoPayEnabled, isToppingUp, user?.uid]);

  const performAutoTopUp = async () => {
    if (!user?.uid) return;

    console.log(`Balance is low. Simulating a top-up of ${autoPayAmount / 100}.`);
    setIsToppingUp(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      const txRef = doc(db, 'users', user.uid, 'transactions', `autopay-${Date.now()}`);
      const batch = writeBatch(db);

      batch.update(userRef, { balance: increment(autoPayAmount) });

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
      setTimeout(() => setIsToppingUp(false), 3000);
    }
  };

  const refreshBalance = async () => {
    console.log('Balance refresh is now handled automatically by onSnapshot.');
  };

  return { user, balance, userProfile, refreshBalance, loading };
}
