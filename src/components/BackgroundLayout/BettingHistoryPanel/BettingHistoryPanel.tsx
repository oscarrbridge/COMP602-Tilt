import { useEffect, useState } from "react";
import "./BettingHistoryPanel.css";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { auth, db } from "..//../../../Backend/firebase/firebaseConfig";
import { Price } from "../../CurrencySwitcher/currencyswitcher";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  when: Date | null;
}

export default function BettingHistoryPanel() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);

  // Listen for auth changes
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => setUid(user?.uid ?? null));
    return () => unsub();
  }, []);

  // Fetch recent bets
  useEffect(() => {
    if (!uid) {
      setTransactions([]);
      return;
    }

    const q = query(
      collection(db, "users", uid, "transactions"),
      orderBy("timestamp", "desc"),
      limit(5)
    );

    const unsub = onSnapshot(q, (snap) => {
      const items: Transaction[] = snap.docs.map((doc) => {
        const data: any = doc.data();
        const type = (data.type ?? "").toString();
        const ts = data.timestamp?.toDate?.() ?? null;
        const amount = typeof data.amount === "number" ? data.amount / 100 : 0;
        return { id: doc.id, type, amount, when: ts };
      });
      setTransactions(items);
    });

    return () => unsub();
  }, [uid]);

  return (
    <div className="betting-history-panel">
      <div className="betting-history-panel-header">
        <h2>Recent Bets</h2>
      </div>

      <div className="betting-history-panel-content">
        {transactions.length === 0 ? (
          <p className="empty">No recent bets.</p>
        ) : (
          <ul className="bet-list">
            {transactions.map((t) => (
              <li key={t.id} className={`bet-item ${t.type}`}>
                <div className="bet-main">
                  <span className="bet-type">
                    {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                  </span>
                  <Price amount={Math.abs(t.amount)} from="NZD" />
                </div>
                <div className="bet-time">
                  {t.when
                    ? t.when.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
