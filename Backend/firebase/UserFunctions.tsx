
import { useEffect, useState } from "react";
import { onAuthStateChanged  } from "firebase/auth";
import { db, auth} from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export function useUser() {
  const [user, setUser] = useState<{ uid: string; email?: string | null } | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true); // wait for auth check

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

  // Use this after win loss or bet to change the balance
  const refreshBalance = async () => {
    if (!user) throw new Error("User is not logged in");
    await fetchBalance(user.uid);
  };

  // Get user data
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const u = { uid: firebaseUser.uid, email: firebaseUser.email };
        setUser(u);
        fetchBalance(u.uid).finally(() => setLoading(false));
      } else {
        setUser(null);
        setBalance(0);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Ensure user is never null
  if (!loading && !user) {
    throw new Error("User is not logged in");
  }

  return { user: user!, balance, refreshBalance }; // non-null assertion
}