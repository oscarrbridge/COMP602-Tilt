import { useState } from "react";
import "./Cointoss.css";
import BackgroundLayout from "../../components/BackgroundLayout/BackgroundLayout";
import {
  placeBet,
  recordWinTx,
  recordLossTx,
} from "../../../Backend/transactions";
import { useUser } from "../../../Backend/firebase/UserFunctions.tsx";
import { CurrencyProvider } from "../../components/CurrencySwitcher/currencyswitcher.tsx";
import BetControls from "../BetControls/BetControls.tsx";
import useCurrentBooster from "../../hooks/useCurrentBooster.tsx";
import coinBase from "../../assets/coin.png";
import coinHead from "../../assets/head.png";
import coinTail from "../../assets/tail.png";

export default function CoinFlip() {
  const { user, balance, refreshBalance } = useUser();
  const { applyBooster } = useCurrentBooster();

  const [bet, setBet] = useState(2.0);
  const [betInBase, setBetInBase] = useState(0);
  const [roundResult, setRoundResult] = useState<"win" | "loss" | "">("");
  const [lastWin, setLastWin] = useState(0);
  const [roundInProgress, setRoundInProgress] = useState(false);
  const [playerChoice, setPlayerChoice] = useState<"heads" | "tails" | null>(
    null
  );
  const [flipResult, setFlipResult] = useState<"heads" | "tails" | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const startGame = async (newBetInBase: number) => {
    if (newBetInBase > balance) {
      alert("Not enough balance!");
      return;
    }

    setBetInBase(newBetInBase);
    setLastWin(0);
    setRoundResult("");
    setPlayerChoice(null);
    setFlipResult(null);
    setIsFlipping(false);
    setShowResult(false);
    setRoundInProgress(true);

    await placeBet(user.uid, newBetInBase, 1, "coinflip");
    await refreshBalance();
  };

  const chooseSide = async (choice: "heads" | "tails") => {
    setPlayerChoice(choice);
    setIsFlipping(true);
    setShowResult(false);

    // Enhanced spin animation
    const spinDuration = 2000;
    const spinInterval = 80;
    const spinStart = Date.now();

    const spinAnim = setInterval(() => {
      const elapsed = Date.now() - spinStart;
      const randomFace = Math.random() < 0.5 ? "heads" : "tails";
      setFlipResult(randomFace);

      if (elapsed >= spinDuration) {
        clearInterval(spinAnim);
        finalizeRound(choice);
      }
    }, spinInterval);
  };

  const finalizeRound = async (choice: "heads" | "tails") => {
    const result = Math.random() < 0.5 ? "heads" : "tails";
    setFlipResult(result);
    setIsFlipping(false);

    let finalWin = 0;

    if (choice === result) {
      finalWin = betInBase * 2;
      finalWin = await applyBooster(finalWin);
      setLastWin(finalWin);
      await recordWinTx(user.uid, finalWin, 1, "coinflip");
      setRoundResult("win");
    } else {
      await applyBooster(0);
      setLastWin(0);
      await recordLossTx(user.uid, betInBase, 1, "coinflip");
      setRoundResult("loss");
    }

    setShowResult(true);
    await refreshBalance();

    // Auto reset after showing result
    setTimeout(() => {
      setRoundInProgress(false);
    }, 3000);
  };

  const resetGame = () => {
    setRoundInProgress(false);
    setPlayerChoice(null);
    setFlipResult(null);
    setRoundResult("");
    setShowResult(false);
  };

  return (
    <BackgroundLayout gameId="Coin Toss">
      <CurrencyProvider base="NZD" DefaultCurrency="NZD">
        <div className="cointoss-game-container">
          {/* Game Header */}

          <div className="cointoss-content">
            {/* Game Area */}
            <div className="cointoss-game-area">
              {/* Coin Display */}
              <div
                className={`coin-container ${isFlipping ? "flipping" : ""} ${showResult ? "result-visible" : ""}`}
              >
                <div className="coin">
                  <img src={coinBase} alt="Coin" className="coin-base" />

                  {/* Heads */}
                  <img
                    src={coinHead}
                    alt="Heads"
                    className={`coin-face heads ${flipResult === "heads" ? "show" : ""}`}
                  />

                  {/* Tails */}
                  <img
                    src={coinTail}
                    alt="Tails"
                    className={`coin-face tails ${flipResult === "tails" ? "show" : ""}`}
                  />
                </div>
              </div>

              {/* Choice Buttons */}
              {roundInProgress && !playerChoice && (
                <div className="choice-buttons">
                  <h2>Choose Your Side</h2>
                  <div className="buttons-container">
                    <button
                      className="choice-btn heads-btn"
                      onClick={() => chooseSide("heads")}
                    >
                      Heads
                    </button>
                    <button
                      className="choice-btn tails-btn"
                      onClick={() => chooseSide("tails")}
                    >
                      Tails
                    </button>
                  </div>
                </div>
              )}

              {/* Game Status */}
              <div className="cointoss-status">
                {!roundInProgress && !showResult && (
                  <div className="status-idle">
                    Place your bet and choose heads or tails!
                  </div>
                )}

                {roundInProgress && playerChoice && !showResult && (
                  <div className="status-spinning">
                    The coin is flipping... Good luck!
                  </div>
                )}

                {showResult && roundResult && (
                  <div className={`status-result ${roundResult}`}>
                    {roundResult === "win" ? (
                      <span className="win-text">
                        You Win! {playerChoice} was correct!
                      </span>
                    ) : (
                      <span className="loss-text">
                        You Lost! It was {flipResult}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Reset Button */}
              {showResult && !roundInProgress && (
                <button className="reset-btn" onClick={resetGame}>
                  Play Again
                </button>
              )}
            </div>
          </div>

          {/* Bet Controls */}
          <div className="cointoss-bet-controls">
            <BetControls
              balance={balance}
              bet={bet}
              setBet={setBet}
              startGame={startGame}
              disabled={roundInProgress}
            />
          </div>
        </div>
      </CurrencyProvider>
    </BackgroundLayout>
  );
}
