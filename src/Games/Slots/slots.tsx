import { useState, useEffect } from 'react';
import './Slots.css';
import { placeBet, recordWinTx, recordLossTx } from '../../../Backend/transactions';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import { CurrencyProvider } from '../../components/CurrencySwitcher/currencyswitcher.tsx';
import BetControls from '../BetControls.tsx';
import BackgroundLayout from '../../components/BackgroundLayout/BackgroundLayout';

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
    const duplicates = getDuplicates(row);
    let rowMultiplier = 0;
    let matchValue = 0;

    if (duplicates.length > 0) {
      const amount = duplicates.length + 1;
      if (amount >= 3) {
        matchValue = duplicates[0];

        if (amount === 3) rowMultiplier = 1;
        else if (amount === 4) rowMultiplier = 2;
        else if (amount === 5) rowMultiplier = 5;

        if (rowMultiplier > 0) {
          if (matchValue <= 8) rowMultiplier *= 2;
          else if (matchValue <= 12) rowMultiplier *= 3;
          else if (matchValue <= 13) rowMultiplier *= 4;
          else if (matchValue <= 14) rowMultiplier *= 5;
          else if (matchValue <= 15) rowMultiplier *= 10;
          else if (matchValue <= 16) rowMultiplier *= 15;
          else if (matchValue <= 17) rowMultiplier *= 20;
        }
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
  const [roundInProgress, setRoundInProgress] = useState(false);

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
      alert('Insufficient balance for this bet.');
      return;
    }

    setRoundInProgress(true);
    setLastWin(0);

    // Record the bet
    await placeBet(user.uid, betInBase, 1, 'slots');
    await refreshBalance();

    // Generate spin result
    const newGrid = spinSlots();
    setGrid(newGrid);

    const winningData = calculateWinnings(newGrid);
    const matches = winningData.map((row) => row.match);
    const multipliers = winningData.map((row) => row.multiplier);

    let totalMultiplier = multipliers.reduce((acc, val) => (val > 0 ? acc + val : acc), 0);

    setWinningCells(matches);

    const winAmount = betInBase * totalMultiplier;
    if (winAmount > 0) {
      setLastWin(winAmount);
      await recordWinTx(user.uid, winAmount, 1, 'slots');
    } else {
      await recordLossTx(user.uid, betInBase, 1, 'slots');
    }

    await refreshBalance();
    setRoundInProgress(false);
  };

  return (
    <BackgroundLayout>
      <div className='game-container'>
        <CurrencyProvider base='NZD' DefaultCurrency='NZD'>
          <h1>♠ Slots ♣</h1>

          {/* Bet Input & Spin */}
          {!roundInProgress && (
            <BetControls
              balance={balance}
              bet={bet}
              setBet={setBet}
              startGame={spin}
              style={{ color: 'white' }}
            />
          )}
        </CurrencyProvider>

        {/* Slot Grid */}
        <div className='slot-grid'>
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} className='slot-row'>
              {row.map((cell, cellIndex) => {
                const isWinning = winningCells[rowIndex] !== 0 && cell === winningCells[rowIndex];

                return (
                  <img
                    key={cellIndex}
                    src={`/assets/${cell}.png`}
                    alt={`Slot ${cell}`}
                    className={`slot-cell ${isWinning ? 'winning' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        {/* Win / Loss Display */}
        <div className='win-display'>
          {lastWin > 0 ? (
            <span className='win-amount'>+ ${lastWin.toFixed(2)}</span>
          ) : (
            <span className='win-amount'>- ${bet.toFixed(2)}</span>
          )}
        </div>
      </div>
    </BackgroundLayout>
  );
}

export default Slots;
