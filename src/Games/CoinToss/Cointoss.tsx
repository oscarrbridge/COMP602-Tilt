import { useState } from "react";
import "./Cointoss.css";
import BackgroundLayout from "../../components/BackgroundLayout/BackgroundLayout";
import { placeBet, recordWinTx, recordLossTx } from "../../../Backend/transactions";
import { useUser } from "../../../Backend/firebase/UserFunctions.tsx";
import { CurrencyProvider } from "../../components/CurrencySwitcher/currencyswitcher.tsx";
import BetControls from "../BetControls.tsx";

export default function CoinFlip() {
  const { user, balance, refreshBalance } = useUser();
  const [bet, setBet] = useState(10);
  const [betInBase, setBetInBase] = useState(0);
  const [roundResult, setRoundResult] = useState("");
  const [lastWin, setLastWin] = useState(0);
  const [roundInProgress, setRoundInProgress] = useState(false);
  const [playerChoice, setPlayerChoice] = useState<"heads" | "tails" | null>(null);
  const [flipResult, setFlipResult] = useState<"heads" | "tails" | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const startGame = async (newBetInBase: number) => {
    if (newBetInBase > balance) {
      alert("Not enough balance!");
      return;
    }

    // reset state
    setBetInBase(newBetInBase);
    setLastWin(0);
    setRoundResult("");
    setPlayerChoice(null);
    setFlipResult(null);
    setIsFlipping(false);
    setRoundInProgress(true);

    await placeBet(user.uid, newBetInBase, 1, "coinflip");
    await refreshBalance();
  };

  const chooseSide = async (choice: "heads" | "tails") => {
    setPlayerChoice(choice);
    setIsFlipping(true);
    setFlipResult(null);

    await sleep(2000); // spin for 2s

    const result = Math.random() < 0.5 ? "heads" : "tails";
    setFlipResult(result);
    setIsFlipping(false);

    if (choice === result) {
      setLastWin(bet);
      await recordWinTx(user.uid, betInBase * 2, 1, "coinflip");
      await refreshBalance();
      setRoundResult("win");
    } else {
      setLastWin(0);
      await recordLossTx(user.uid, betInBase, 1, "coinflip");
      await refreshBalance();
      setRoundResult("loss");
    }

    setRoundInProgress(false);
  };

  return (
    <BackgroundLayout>
      <div className="game-container">
        <CurrencyProvider base="NZD" DefaultCurrency="NZD">
          <h1>🪙 Coin Flip 🪙</h1>

          {/* Show bet controls when no round is active */}
            {!roundInProgress && (
            <BetControls balance={balance} bet={bet} setBet={setBet} startGame={startGame} />
            )}
        </CurrencyProvider>

        {/* Let player choose side */}
        {roundInProgress && !playerChoice && (
          <div className="controls">
            <h2>Pick a side:</h2>
            <button onClick={() => chooseSide("heads")}>Heads</button>
            <button onClick={() => chooseSide("tails")}>Tails</button>
          </div>
        )}

        {/* Coin while spinning */}
        {roundInProgress && isFlipping && (
          <div className="coin flipping">
            <div className="coin-face heads">H</div>
            <div className="coin-face tails">T</div>
          </div>
        )}

        {/* Coin result after spin */}
        {!roundInProgress && flipResult && (
        <div className="result-section">
            <div className={`coin result`}>
            <div className="coin-face">{flipResult === "heads" ? "H" : "T"}</div>
            </div>
            <div className="result-text">
            <h2>You picked: {playerChoice?.toUpperCase()}</h2>
            <h2>Coin landed on: {flipResult.toUpperCase()}</h2>
            </div>
        </div>
        )}

        {/* Win / Loss Display */}
        {!roundInProgress && roundResult && (
          <div
            className={`win-display ${
              roundResult === "win"
                ? "win-amount"
                : roundResult === "loss"
                ? "loss-amount"
                : ""
            }`}
          >
            {roundResult === "win"
              ? `+ $${lastWin}`
              : roundResult === "loss"
              ? `- $${bet}`
              : ""}
          </div>
        )}
      </div>
    </BackgroundLayout>
  );
}
