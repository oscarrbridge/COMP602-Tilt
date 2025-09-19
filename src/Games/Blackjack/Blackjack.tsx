import { useState } from "react";
import "./Blackjack.css";
import BackgroundLayout from "../../components/BackgroundLayout/BackgroundLayout";

const suits = ["♠", "♥", "♦", "♣"];
const ranks = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

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

export default function Blackjack() {
  const [playerCards, setPlayerCards] = useState<
    { rank: string; suit: string }[]
  >([]);
  const [dealerCards, setDealerCards] = useState<
    { rank: string; suit: string }[]
  >([]);
  const [balance, setBalance] = useState(100);
  const [bet, setBet] = useState(10);
  const [lastWin, setLastWin] = useState(0);
  const [roundResult, setRoundResult] = useState("");

  // Track whether a round is in progress
  const [roundInProgress, setRoundInProgress] = useState(false);

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

  const startGame = () => {
    if (bet > balance) {
      alert("Not enough balance!");
      return;
    }

    setPlayerCards([getCard(), getCard()]);
    setDealerCards([getCard(), getCard()]);
    setLastWin(0);
    setRoundInProgress(true);
  };

  const hit = () => {
    const newCards = [...playerCards, getCard()];
    setPlayerCards(newCards);

    if (calcScore(newCards) > 21) {
      setBalance(balance - bet);
      setLastWin(0);
      setRoundResult("loss"); // player busts
      setRoundInProgress(false);
    }
  };

  const stand = () => {
    let dealerHand = [...dealerCards];
    while (calcScore(dealerHand) < 17) dealerHand.push(getCard());
    setDealerCards(dealerHand);

    const playerScore = calcScore(playerCards);
    const dealerScore = calcScore(dealerHand);

    if (playerScore > 21 || (dealerScore <= 21 && dealerScore > playerScore)) {
      setBalance(balance - bet);
      setLastWin(0);
      setRoundResult("loss");
    } else if (playerScore == dealerScore) {
      setRoundResult("tie");
    } else if (playerScore > dealerScore || dealerScore > 21) {
      setBalance(balance + bet);
      setLastWin(bet);
      setRoundResult("win");
    }

    setRoundInProgress(false);
  };

  return (
    <BackgroundLayout>
      <div className="game-container">
        <h1>♠ Blackjack ♣</h1>

        <div className="balance-display">Balance: ${balance}</div>

        {/* Bet Input & Deal */}
        {!roundInProgress && (
          <div className="bet-controls">
            <label htmlFor="bet-input">Bet Amount:</label>
            <input
              id="bet-input"
              type="number"
              min={5}
              max={balance}
              value={bet}
              onChange={(e) =>
                setBet(Math.min(Math.max(Number(e.target.value), 5), balance))
              }
            />
            <button onClick={startGame}>Deal</button>
          </div>
        )}

        {/* Table */}
        <div className="table">
          <div className="hand-container">
            <h2>Dealer ({roundInProgress ? "??" : calcScore(dealerCards)})</h2>
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

        {/* Hit / Stand */}
        {roundInProgress && (
          <div className="controls">
            <button onClick={hit}>Hit</button>
            <button onClick={stand}>Stand</button>
          </div>
        )}

        {/* Win Display */}
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
            ? `+ $${lastWin}`
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
