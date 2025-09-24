import { useState } from "react";
import "./Cointoss.css";
import BackgroundLayout from "../../components/BackgroundLayout/BackgroundLayout";
import { placeBet, recordWinTx, recordLossTx } from "../../../Backend/transactions";
import { useUser } from "../../../Backend/firebase/UserFunctions.tsx";
import { CurrencyProvider } from "../../components/CurrencySwitcher/currencyswitcher.tsx";
import BetControls from "../BetControls.tsx";
import coinBase from "../../assets/coin.png";
import coinHead from "../../assets/coin-head.png";
import coinTail from "../../assets/Tilt-icon.png";

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

    // reset state for new round
    setBetInBase(newBetInBase);
    setLastWin(0);
    setRoundResult("");
    setPlayerChoice(null);
    setFlipResult(null); // ✅ clear only when starting new round
    setIsFlipping(false);
    setRoundInProgress(true);

    await placeBet(user.uid, newBetInBase, 1, "coinflip");
    await refreshBalance();
    };

    const chooseSide = async (choice: "heads" | "tails") => {
    setPlayerChoice(choice);
    setIsFlipping(true);

    await sleep(2000); // spin for 2s

    const result = Math.random() < 0.5 ? "heads" : "tails";
    setFlipResult(result); // ✅ coin stays rendered after result
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

    // ✅ just mark round as finished, don't clear flipResult
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

        {/* Coin spinning during toss */}
        {roundInProgress && isFlipping && (
          <div className="coin flipping">
            <div className="coin-face coin-head">
              <img src={coinBase} alt="Coin base" className="coin-base" />
              <img src={coinHead} alt="Heads" className="coin-overlay" />
            </div>
            <div className="coin-face coin-tail">
              <img src={coinBase} alt="Coin base" className="coin-base" />
              <img src={coinTail} alt="Tails" className="coin-overlay" />
            </div>
          </div>
        )}

        {/* Coin result after toss */}
        {flipResult && (
        <div className="coin">
            <div
            className={`coin-face coin-head ${flipResult === "heads" ? "show" : "hide"}`}
            style={{ transform: "rotateY(0deg)" }}
            >
            <img src={coinBase} alt="Coin base" className="coin-base" />
            <img src={coinHead} alt="Heads" className="coin-overlay" />
            </div>
            <div
            className={`coin-face coin-tail ${flipResult === "tails" ? "show" : "hide"}`}
            style={{ transform: "rotateY(0deg)" }}
            >
            <img src={coinBase} alt="Coin base" className="coin-base" />
            <img src={coinTail} alt="Tails" className="coin-overlay" />
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
