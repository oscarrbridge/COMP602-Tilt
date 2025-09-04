
import { useEffect, useState } from "react";
import { onAuthStateChanged  } from "firebase/auth";
import type { User as FirebaseUser } from 'firebase/auth';
import { db, auth} from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export function useUser() {
  const [user, setUser] = useState<{ uid: string; email?: string | null } | null>(null);
  const [balance, setBalance] = useState<number>(0);

  // Fetch balance from Firestore
  const fetchBalance = async (uid: string) => {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      setBalance(snap.data().balance ?? 0);
    } else {
      setBalance(0);
    }
  };

  // Refresh balance manually
  const refreshBalance = async () => {
    if (user) await fetchBalance(user.uid);
  };

  // Listen to auth changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const u = { uid: firebaseUser.uid, email: firebaseUser.email };
        setUser(u);
        fetchBalance(u.uid);
      } else {
        setUser(null);
        setBalance(0);
      }
    });
    return () => unsub();
  }, []);

  return { user, balance, refreshBalance };
}