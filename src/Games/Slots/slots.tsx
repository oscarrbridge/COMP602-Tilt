import { useState, useEffect } from "react";
import "./Slots.css";
import {
  placeBet,
  recordWinTx,
  recordLossTx,
} from "../../../Backend/transactions";
import { useUser } from "../../../Backend/firebase/UserFunctions.tsx";
import { CurrencyProvider } from "../../components/CurrencySwitcher/currencyswitcher.tsx";
import BetControls from "../BetControls.tsx";
import BackgroundLayout from "../../components/BackgroundLayout/BackgroundLayout";
import useCurrentBooster from "../../hooks/useCurrentBooster.tsx";

// ---------------- Slot Logic ----------------
function generateNum(): number {
  return Math.floor(Math.random() * 17) + 1; // 1–17
}

function generateRow(): number[] {
  return Array.from({ length: 5 }, () => generateNum());
}

function spinSlots(): number[][] {
  return Array.from({ length: 5 }, () => generateRow());
}

function getDuplicates(row: number[]): number[] {
  const unique: number[] = [];
  const duplicates: number[] = [];

  for (const item of row) {
    if (!unique.includes(item)) {
      unique.push(item);
    } else {
      duplicates.push(item);
    }
  }

  return duplicates;
}

interface RowResult {
  match: number;
  multiplier: number;
}

function calculateWinnings(slotGrid: number[][]): RowResult[] {
  const result: RowResult[] = [];

  for (const row of slotGrid) {
    const counts: Record<number, number> = {};

    // Count frequency of each symbol in this row
    for (const symbol of row) {
      counts[symbol] = (counts[symbol] || 0) + 1;
    }

    let rowMultiplier = 0;
    let matchValue = 0;

    // Check for the highest streak in this row
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

        break; // stop after first valid match
      }
    }

    result.push({ match: matchValue, multiplier: rowMultiplier });
  }

  return result;
}

// ---------------- React Component ----------------
function Slots() {
  const { user, balance, refreshBalance } = useUser();
  const [grid, setGrid] = useState<number[][]>([]);
  const [bet, setBet] = useState<number>(2.0);
  const [lastWin, setLastWin] = useState<number>(0);
  const [winningCells, setWinningCells] = useState<number[]>([]);
  const { applyBooster } = useCurrentBooster();

  const presetGrid: number[][] = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [17, 17, 17, 17, 17],
    [11, 12, 13, 14, 15],
    [16, 1, 2, 3, 4],
  ];

  useEffect(() => {
    setGrid(presetGrid);
  }, []);

  const spin = async (betInBase: number) => {
    if (betInBase > balance) {
      alert("Insufficient balance for this bet.");
      return;
    }

    setLastWin(0);

    // Record the bet
    await placeBet(user.uid, betInBase, 1, "slots");
    await refreshBalance();

    // Generate spin result
    const newGrid = spinSlots();
    setGrid(newGrid);

    const winningData = calculateWinnings(newGrid);
    const matches = winningData.map((row) => row.match);
    const multipliers = winningData.map((row) => row.multiplier);

    let totalMultiplier = multipliers.reduce(
      (acc, val) => (val > 0 ? acc + val : acc),
      0
    );

    setWinningCells(matches);

    const winAmount = betInBase * totalMultiplier;

    const boostedWinAmount = await applyBooster(winAmount);

    if (boostedWinAmount > 0) {
      setLastWin(boostedWinAmount);
      await recordWinTx(user.uid, boostedWinAmount, 1, "slots");
    } else {
      await recordLossTx(user.uid, betInBase, 1, "slots");
    }

    await refreshBalance();
  };

  return (
    <BackgroundLayout>
      <div className="game-container">
        <CurrencyProvider base="NZD" DefaultCurrency="NZD">
          <h1>♠ Slots ♣</h1>

          {/* Bet Input & Spin */}

          <BetControls
            balance={balance}
            bet={bet}
            setBet={setBet}
            startGame={spin}
          />
        </CurrencyProvider>

        {/* Slot Grid */}
        <div className="slot-grid">
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} className="slot-row">
              {row.map((cell, cellIndex) => {
                const isWinning =
                  winningCells[rowIndex] !== 0 &&
                  cell === winningCells[rowIndex];

                return (
                  <img
                    key={cellIndex}
                    src={`/assets/${cell}.png`}
                    alt={`Slot ${cell}`}
                    className={`slot-cell ${isWinning ? "winning" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        {/* Win / Loss Display */}
        <div className="win-display">
          {lastWin > 0 ? (
            <span className="win-amount">+ ${(lastWin / 100).toFixed(2)}</span>
          ) : (
            <span className="loss-amount">- ${bet.toFixed(2)}</span>
          )}
        </div>
      </div>
    </BackgroundLayout>
  );
}

export default Slots;
