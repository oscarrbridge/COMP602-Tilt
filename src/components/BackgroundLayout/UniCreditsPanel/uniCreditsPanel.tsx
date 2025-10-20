import "./uniCreditsPanel.css";
import { useState, useEffect } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "../../../../Backend/firebase/firebaseConfig";
import { onAuthStateChanged, type User } from "firebase/auth";

import { subtractUniBalance } from "../../../../Backend/transactions";

import BoosterDisplay from "./BoosterDisplay";

export default function UniCreditsPanel() {
  const [selectedBooster, setSelectedBooster] = useState<number | null>(null);
  const [uniBalance, setUniBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentBooster, setCurrentBooster] = useState<number | null>(null);

  const boosters = [
    { multiplier: 2, cost: 200 },
    { multiplier: 5, cost: 500 },
    { multiplier: 10, cost: 1000 },
    { multiplier: 25, cost: 2500 },
  ];

  // 🔑 Listen for auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  // 💰 Listen to user balance and booster changes
  useEffect(() => {
    if (!user) {
      setUniBalance(0);
      setCurrentBooster(null);
      setLoading(false);
      return;
    }

    const userDoc = doc(db, "users", user.uid);
    const unsubscribeDoc = onSnapshot(userDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUniBalance(data.unibalance ?? 0);
        setCurrentBooster(data.currentBooster ?? null);
      } else {
        setUniBalance(0);
        setCurrentBooster(null);
      }
      setLoading(false);
    });

    return unsubscribeDoc;
  }, [user]);

  // ⚡️ Save active booster to Firestore
  async function setUserBooster(uid: string, multiplier: number) {
    try {
      const userDoc = doc(db, "users", uid);
      await updateDoc(userDoc, { currentBooster: multiplier });
      setCurrentBooster(multiplier);
    } catch (error) {
      console.error("Error setting current booster:", error);
    }
  }

  // 🚀 Activate booster
  async function handleActivate() {
    if (!selectedBooster || !user) return;

    const booster = boosters.find((b) => b.multiplier === selectedBooster);
    if (!booster) return;

    try {
      setActivating(true);
      await subtractUniBalance(user.uid, booster.cost);

      // Save currentBooster to Firestore
      await setUserBooster(user.uid, booster.multiplier);

      setSelectedBooster(null);
    } catch (error) {
      console.error("Error activating booster:", error);
    } finally {
      setActivating(false);
    }
  }

  if (loading) return <div className="uniCredits-panel">Loading...</div>;

  return (
    <div className="uniCredits-panel shifted-left">
      <div className="uniCredits-panel-header">
        <h2>CREDIT STORE</h2>
      </div>
      <div className="uniCredits-panel-content">
        <p className="current-balance">Credits: {uniBalance}</p>
      </div>

      <div className="booster-section">
        <h3>Buy Boosters</h3>
        <div className="booster-list">
          {boosters.map(({ multiplier, cost }) => {
            const canAfford = uniBalance >= cost;
            const isSelected = selectedBooster === multiplier;

            return (
              <button
                key={multiplier}
                className={`booster-item ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedBooster(multiplier)}
                disabled={
                  !canAfford ||
                  activating ||
                  Boolean(currentBooster && currentBooster > 1)
                }
              >
                <div className="booster-icon">
                  <span>{multiplier}x</span>
                </div>
                <div className="booster-cost">{cost} Credits</div>
              </button>
            );
          })}
        </div>

        <button
          className="activate-btn"
          onClick={handleActivate}
          disabled={
            selectedBooster === null ||
            activating ||
            uniBalance <
              (boosters.find((b) => b.multiplier === selectedBooster)?.cost ??
                0)
          }
        >
          {activating ? "Activating..." : "Activate Booster"}
        </button>

        {currentBooster && currentBooster > 0 ? (
          <div key={currentBooster} className="booster-display-wrapper">
            <BoosterDisplay multiplier={currentBooster} />
          </div>
        ) : (
          <p className="active-booster fade-out">No Booster Active</p>
        )}
      </div>
    </div>
  );
}
