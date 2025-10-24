import { useState, useEffect } from "react";
import "./Slots.css";
import {
  placeBet,
  recordWinTx,
  recordLossTx,
} from "../../../Backend/transactions";
import { useUser } from "../../../Backend/firebase/UserFunctions.tsx";
import { CurrencyProvider } from "../../components/CurrencySwitcher/currencyswitcher.tsx";
import BetControls from "../BetControls/BetControls.tsx";
import BackgroundLayout from "../../components/BackgroundLayout/BackgroundLayout";
import useCurrentBooster from "../../hooks/useCurrentBooster.tsx";

// ---------------- Slot Logic ----------------
function generateNum(): number {
  return Math.floor(Math.random() * 17) + 1;
}

function generateRow(): number[] {
  return Array.from({ length: 5 }, () => generateNum());
}

function spinSlots(): number[][] {
  return Array.from({ length: 5 }, () => generateRow());
}

function calculateWinnings(slotGrid: number[][]): RowResult[] {
  const result: RowResult[] = [];
  for (const row of slotGrid) {
    const counts: Record<number, number> = {};
    for (const symbol of row) {
      counts[symbol] = (counts[symbol] || 0) + 1;
    }

    let rowMultiplier = 0;
    let matchValue = 0;

    for (const [symbolStr, count] of Object.entries(counts)) {
      const symbol = parseInt(symbolStr, 10);
      if (count >= 3) {
        matchValue = symbol;
        if (count === 3) rowMultiplier = 1;
        else if (count === 4) rowMultiplier = 2;
        else if (count === 5) rowMultiplier = 5;

        if (rowMultiplier > 0) {
          if (symbol <= 8) rowMultiplier *= 2;
          else if (symbol <= 12) rowMultiplier *= 3;
          else if (symbol <= 13) rowMultiplier *= 4;
          else if (symbol <= 14) rowMultiplier *= 5;
          else if (symbol <= 15) rowMultiplier *= 10;
          else if (symbol <= 16) rowMultiplier *= 15;
          else if (symbol <= 17) rowMultiplier *= 20;
        }
        break;
      }
    }
    result.push({ match: matchValue, multiplier: rowMultiplier });
  }
  return result;
}

interface RowResult {
  match: number;
  multiplier: number;
}

function Slots() {
  const { user, balance, refreshBalance } = useUser();
  const [displayGrid, setDisplayGrid] = useState<number[][]>([]);
  const [bet, setBet] = useState<number>(2.0);
  const [lastWin, setLastWin] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winningCells, setWinningCells] = useState<number[]>([]);
  const [showResult, setShowResult] = useState<boolean>(false);
  const { applyBooster } = useCurrentBooster();

  useEffect(() => {
    setDisplayGrid(spinSlots());
  }, []);

  const spin = async (betInBase: number) => {
    if (betInBase > balance || isSpinning) {
      if (betInBase > balance) alert("Insufficient balance for this bet.");
      return;
    }

    setIsSpinning(true);
    setShowResult(false);
    setLastWin(0);
    setWinningCells([]);

    const finalGrid = spinSlots();

    await placeBet(user.uid, betInBase, 1, "slots");
    await refreshBalance();

    // Start spinning animation
    const spinDuration = 1500;
    const spinInterval = 80;
    const spinStart = Date.now();

    const spinAnimation = setInterval(() => {
      const elapsed = Date.now() - spinStart;

      if (elapsed >= spinDuration) {
        clearInterval(spinAnimation);
        setDisplayGrid(finalGrid);

        // Calculate winnings
        const winningData = calculateWinnings(finalGrid);
        const matches = winningData.map((row) => row.match);
        const multipliers = winningData.map((row) => row.multiplier);

        let totalMultiplier = multipliers.reduce(
          (acc, val) => (val > 0 ? acc + val : acc),
          0
        );

        setWinningCells(matches);

        const winAmount = betInBase * totalMultiplier;

        // Process results and update display
        (async () => {
          let finalAmount = winAmount;

          // Apply booster immediately after animation
          if (winAmount > 0) {
            finalAmount = await applyBooster(winAmount);
            await recordWinTx(user.uid, finalAmount, 1, "slots");
          } else {
            // Even on losses, consume the booster
            await applyBooster(0);
            await recordLossTx(user.uid, betInBase, 1, "slots");
          }

          // Set the win amount and show result AFTER processing
          setLastWin(finalAmount);
          setShowResult(true);

          await refreshBalance();
          setIsSpinning(false);
        })(); // Immediately invoked async function

        return;
      }

      setDisplayGrid(spinSlots());
    }, spinInterval);
  };

  return (
    <BackgroundLayout gameId="Slots">
      <div className="slots-game-container">
        <div className={`slot-grid ${!isSpinning ? "idle-hover" : ""}`}>
          {displayGrid.map((row, rowIndex) => (
            <div key={rowIndex} className="slot-row">
              {row.map((cell, cellIndex) => {
                const isWinning =
                  showResult &&
                  winningCells[rowIndex] !== 0 &&
                  cell === winningCells[rowIndex];

                return (
                  <div
                    key={`${rowIndex}-${cellIndex}`}
                    className={`slot-cell ${isWinning ? "winning" : ""}`}
                  >
                    <img
                      src={`/assets/${cell}.png`}
                      alt={`Slot ${cell}`}
                      className="slot-image"
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="game-bet-controls">
          <CurrencyProvider base="NZD" DefaultCurrency="NZD">
            <BetControls
              balance={balance}
              bet={bet}
              setBet={setBet}
              startGame={spin}
              disabled={isSpinning}
            />
          </CurrencyProvider>
        </div>
      </div>
    </BackgroundLayout>
  );
}

export default Slots;
