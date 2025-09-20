import { useState } from "react";
import "./Blackjack.css";
import BackgroundLayout from "../../components/BackgroundLayout/BackgroundLayout";
import NavBar from "@components/NavBar/NavBar";
import { placeBet, recordWinTx, recordLossTx } from "../../../Backend/transactions";
import { useUser } from "../../../Backend/firebase/UserFunctions.tsx";
import { CurrencyProvider } from "../../components/CurrencySwitcher/currencyswitcher.tsx"; 
import BetControls from "../BetControls.tsx";

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
  const { user, balance, refreshBalance } = useUser();
  const [playerCards, setPlayerCards] = useState<{ rank: string; suit: string }[]>([]);
  const [dealerCards, setDealerCards] = useState<{ rank: string; suit: string }[]>([]);
  const [bet, setBet] = useState(10);
  const [lastWin, setLastWin] = useState(0);
  const [roundResult, setRoundResult] = useState("");
  const [dealerRevealed, setDealerRevealed] = useState(false); // Implement CSS here
  const [betInBase, setBetInBase] = useState(0);
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  
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


  const getDealerDisplayScore = () => {
    if (!roundInProgress) {
      // Round over → reveal full dealer score
      return calcScore(dealerCards);
    }

    if (dealerCards.length > 1) {
      // Hide second card, show only the first one’s value
      const firstCardValue = cardValue(dealerCards[0]);
      return `${firstCardValue} + ??`;
    }

    return "??";
  };
  const startGame = async(newBetInBase : number) => {
    if (newBetInBase > balance) {
      alert("Not enough balance!");
      return;
    }

    setBetInBase(newBetInBase);
    setPlayerCards([getCard(), getCard()]);
    setDealerCards([getCard(), getCard()]);
    setLastWin(0);
    setRoundInProgress(true);
    setDealerRevealed(false);

    await placeBet(user.uid, newBetInBase,1, "blackjack");
    await refreshBalance();

  };

  const hit = async () => {
    const newCards = [...playerCards, getCard()];
    setPlayerCards(newCards);

    if (calcScore(newCards) > 21) {
      setLastWin(0);
      setRoundResult("loss"); // player busts
      setRoundInProgress(false);

      await recordLossTx(user.uid, betInBase, 1, "blackjack");
      await refreshBalance();
    }
  };

  const stand = async()  => {
    setDealerRevealed(true);
    let dealerHand = [...dealerCards];

    setDealerCards(dealerHand);
    await sleep(800);

    while (calcScore(dealerHand) < 17) {
      dealerHand.push(getCard());
      setDealerCards([...dealerHand]); 
      await sleep(800); // delay between draws
  }

    

    const playerScore = calcScore(playerCards);
    const dealerScore = calcScore(dealerHand);

    if (playerScore > 21 || (dealerScore <= 21 && dealerScore > playerScore)) {
      setLastWin(0);

      await recordLossTx(user.uid, betInBase, 1, "blackjack");
      await refreshBalance();
      setRoundResult("loss");
      
    }
    else if (playerScore == dealerScore){
      setRoundResult("tie");
    }
    else if (playerScore > dealerScore || dealerScore > 21) {
      setLastWin(bet);

      await recordWinTx(user.uid, betInBase*2, 1, "blackjack"); // Double bet to accomadate  
      await refreshBalance();
      setRoundResult("win");
    }

    setRoundInProgress(false);
  };

  return (
    <BackgroundLayout>
      <div className="game-container">
            <CurrencyProvider base="NZD" DefaultCurrency="NZD">
        <h1>♠ Blackjack ♣</h1>

        {/* Bet Input & Deal */}
        {!roundInProgress && (
            <BetControls balance={balance} bet={bet} setBet={setBet} startGame={startGame} />
        )}
        </CurrencyProvider>

      {/* Table */}
      <div className="table">
        <div className="hand-container">
          <h2>Dealer ({getDealerDisplayScore()})</h2>
          <div className="cards">
            {dealerCards.map((c, i) => (
              <div
                key={i}
                className={`card ${c.suit === "♥" || c.suit === "♦" ? "red" : ""} dealt`}
              >
                {i === 1 && roundInProgress  ? "??" : `${c.rank}${c.suit}`}
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
