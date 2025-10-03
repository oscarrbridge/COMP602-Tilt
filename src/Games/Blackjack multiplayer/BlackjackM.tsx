import { useState, useEffect } from "react";
import "./Blackjack.css";
import BackgroundLayout from "../../components/BackgroundLayout/BackgroundLayout.tsx";
import { placeBet, recordWinTx, recordLossTx } from "../../../Backend/transactions.ts";
import { useUser } from "../../../Backend/firebase/UserFunctions.tsx";
import { CurrencyProvider } from "../../components/CurrencySwitcher/currencyswitcher.tsx";
import BetControls from "../BetControls.tsx";
import { db } from '../../../Backend/firebase/firebaseConfig';
import {doc,setDoc,updateDoc,onSnapshot,arrayUnion} from "firebase/firestore";

// Local helpers
const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const getCard = () => {
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const rank = ranks[Math.floor(Math.random() * ranks.length)];
  return { rank, suit };
};

const cardValue = (card: { rank: string; suit: string }) => {
  if (["J", "Q", "K"].includes(card.rank)) return 10;
  if (card.rank === "A") return 11;
  return parseInt(card.rank);
};

export default function Blackjackm({ gameId = "testGame" }: { gameId?: string }) {
  const { user, balance, refreshBalance } = useUser();

  // Local UI state
  const [playerCards, setPlayerCards] = useState<{ rank: string; suit: string }[]>([]);
  const [dealerCards, setDealerCards] = useState<{ rank: string; suit: string }[]>([]);
  const [bet, setBet] = useState(10);
  const [betInBase, setBetInBase] = useState(0);
  const [roundResult, setRoundResult] = useState("");
  const [dealerRevealed, setDealerRevealed] = useState(false);
  const [roundInProgress, setRoundInProgress] = useState(false);

  // Firestore refs
  const gameRef = doc(db, "games", gameId);
  const playerRef = doc(db, "games", gameId, "players", user.uid);

  // Listen to Firestore changes
  useEffect(() => {
    const unsubGame = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDealerCards(data.dealerHand || []);
        setDealerRevealed(data.state !== "in-progress");
        setRoundInProgress(data.state === "in-progress");
      }
    });

    const unsubPlayer = onSnapshot(playerRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPlayerCards(data.cards || []);
        setRoundResult(data.status || "");
      }
    });

    return () => {
      unsubGame();
      unsubPlayer();
    };
  }, [user.uid]);

  // Helpers
  const calcScore = (cards: { rank: string; suit: string }[]) => {
    let total = 0;
    let aces = 0;
    cards.forEach((c) => {
      total += cardValue(c);
      if (c.rank === "A") aces++;
    });
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  };

  const getDealerDisplayScore = () => {
    if (!roundInProgress) {
      return calcScore(dealerCards);
    }
    if (dealerCards.length > 1) {
      const firstCardValue = cardValue(dealerCards[0]);
      return `${firstCardValue} + ??`;
    }
    return "??";
  };

  // Actions
  const startGame = async (newBetInBase: number) => {
    if (newBetInBase > balance) {
      alert("Not enough balance!");
      return;
    }

    setBetInBase(newBetInBase);

    // Set player doc
    await setDoc(playerRef, {
      bet: newBetInBase,
      cards: [getCard(), getCard()],
      status: "active"
    });

    // Update game doc
    await updateDoc(gameRef, {
      state: "in-progress",
      dealerHand: [getCard(), getCard()],
      currentTurn: user.uid,
      gameType: "blackjack"
    });

    await placeBet(user.uid, newBetInBase, 1, "blackjack");
    await refreshBalance();
  };

  const hit = async () => {
    const card = getCard();
    await updateDoc(playerRef, {
      cards: arrayUnion(card)
    });

    const newCards = [...playerCards, card];
    if (calcScore(newCards) > 21) {
      await updateDoc(playerRef, { status: "bust" });
      await recordLossTx(user.uid, betInBase, 1, "blackjack");
      await refreshBalance();
    }
  };

  const stand = async () => {
    await updateDoc(playerRef, { status: "stand" });

    // Dealer resolution (⚠️ in production, move this to a Cloud Function)
    let dealerHand = [...dealerCards];
    while (calcScore(dealerHand) < 17) {
      dealerHand.push(getCard());
    }

    await updateDoc(gameRef, { dealerHand, state: "finished" });

    const playerScore = calcScore(playerCards);
    const dealerScore = calcScore(dealerHand);

    if (playerScore > 21 || (dealerScore <= 21 && dealerScore > playerScore)) {
      await recordLossTx(user.uid, betInBase, 1, "blackjack");
      await refreshBalance();
      await updateDoc(playerRef, { status: "loss" });
    } else if (playerScore === dealerScore) {
      await recordWinTx(user.uid, betInBase, 1, "blackjack");
      await refreshBalance();
      await updateDoc(playerRef, { status: "tie" });
    } else {
      await recordWinTx(user.uid, betInBase * 2, 1, "blackjack");
      await refreshBalance();
      await updateDoc(playerRef, { status: "win" });
    }
  };

  // UI
  return (
    <BackgroundLayout>
      <div className="game-container">
        <CurrencyProvider base="NZD" DefaultCurrency="NZD">
          <h1>♠ Blackjack ♣</h1>

          {!roundInProgress && (
            <BetControls balance={balance} bet={bet} setBet={setBet} startGame={startGame} />
          )}
        </CurrencyProvider>

        <div className="table">
          <div className="hand-container">
            <h2>Dealer ({getDealerDisplayScore()})</h2>
            <div className="cards">
              {dealerCards.map((c, i) => (
                <div
                  key={i}
                  className={`card ${c.suit === "♥" || c.suit === "♦" ? "red" : ""} dealt`}
                >
                  {i === 1 && roundInProgress ? "??" : `${c.rank}${c.suit}`}
                </div>
              ))}
            </div>
          </div>

          <div className="hand-container">
            <h2>You ({calcScore(playerCards)})</h2>
            <div className="cards">
              {playerCards.map((c, i) => (
                <div
                  key={i}
                  className={`card ${c.suit === "♥" || c.suit === "♦" ? "red" : ""} dealt`}
                >
                  {c.rank}
                  {c.suit}
                </div>
              ))}
            </div>
          </div>
        </div>

        {roundInProgress && (
          <div className="controls">
            <button onClick={hit}>Hit</button>
            <button onClick={stand}>Stand</button>
          </div>
        )}

        <div
          className={`win-display ${
            roundResult === "win"
              ? "win-amount"
              : roundResult === "loss"
              ? "loss-amount"
              : roundResult === "tie"
              ? "tie-amount"
              : ""
          }`}
        >
          {roundResult === "win"
            ? `+ $${bet}`
            : roundResult === "loss"
            ? `- $${bet}`
            : roundResult === "tie"
            ? "Tie"
            : ""}
        </div>
      </div>
    </BackgroundLayout>
  );
}
