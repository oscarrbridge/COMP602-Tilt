import { useState, useEffect } from "react";
import { auth, db } from "../../Backend/firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";

/**
 * Hook that returns a function to apply a user's booster
 * to a given integer (e.g. bet amount).
 */
export default function useCurrentBooster() {
  const [user, setUser] = useState<User | null>(null);

  // 🔑 Track current authenticated user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  /**
   * Apply the user's booster multiplier to a given value.
   * After applying, reset the user's booster to 1.
   *
   * @param baseValue The integer value to multiply
   * @returns The boosted value
   */
  async function applyBooster(baseValue: number): Promise<number> {
    if (!user) {
      console.warn("No user found — returning base value");
      return baseValue;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.warn("User document not found — returning base value");
      return baseValue;
    }

    const data = userSnap.data();
    const booster = data.currentBooster ?? 1;

    // 🧮 Apply boost
    const boostedValue = baseValue * booster;

    // 🔁 Reset booster to 1 after applying
    if (booster !== 1) {
      await updateDoc(userRef, { currentBooster: 1 });
    }

    return boostedValue;
  }

  return { applyBooster };
}
