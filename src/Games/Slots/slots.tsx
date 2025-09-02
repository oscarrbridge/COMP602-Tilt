import { useState, useEffect } from "react";
import "./Slots.css";

function Slots() {
  const [grid, setGrid] = useState<number[][]>([]);
  const [bet, setBet] = useState<number>(2.0);
  const [balance, setBalance] = useState<number>(100.0);
  const [winningCells, setWinningCells] = useState<number[]>([]);
  const [lastWin, setLastWin] = useState<number>(0);

  const presetGrid: number[][] = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [17, 17, 17, 17, 17],
    [11, 12, 13, 14, 15],
    [16, 1, 2, 3, 4],
  ];

  const spin = async () => {
    if (bet > balance) {
      alert("Insufficient balance for this bet.");
      return;
    } else {
      try {
        const res = await fetch("http://127.0.0.1:8000/spin");
        const data = await res.json();
        setGrid(data.grid);

        const matches = data.winning_data.map(
          (row: { match: number; multiplier: number }) => row.match
        );
        const multipliers = data.winning_data.map(
          (row: { match: number; multiplier: number }) => row.multiplier
        );

        let multiplier = 0;
        for (const item of multipliers) {
          if (item > 0) {
            multiplier += item;
          }
        }
        setWinningCells(matches);

        setBalance((prev) => prev - bet + bet * multiplier);
        const winAmount = bet * multiplier;
        if (multiplier > 0) {
          setLastWin(winAmount);
        } else {
          setLastWin(0);
        }
      } catch (error) {
        console.error("Error fetching slot grid:", error);
      }
    }
  };

  const increaseBet = () => setBet((prev) => prev + 1);
  const decreaseBet = () => setBet((prev) => Math.max(1, prev - 1));

  useEffect(() => {
    setGrid(presetGrid);
  }, []);

  return (
    <div className="app-container">
      <h1>Tilt Slots</h1>

      <div className="slot-grid">
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="slot-row">
            {row.map((cell, cellIndex) => {
              const isWinning =
                winningCells[rowIndex] !== 0 && cell === winningCells[rowIndex];

              console.log(
                "rowIndex:",
                rowIndex,
                "winningCells[rowIndex]:",
                winningCells[0],
                winningCells[1],
                winningCells[2],
                winningCells[3],
                winningCells[4]
              );
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

      <button onClick={spin} className="spin-button">
        Spin Again
      </button>

      <div className="bet-controls">
        <button onClick={decreaseBet} className="bet-button">
          -
        </button>
        <span className="bet-value">${bet.toFixed(2)}</span>
        <button onClick={increaseBet} className="bet-button">
          +
        </button>
      </div>
      <div className="balance-display">Balance: ${balance.toFixed(2)}</div>
      <div className={`win-display ${lastWin > 0 ? "win-amount" : ""}`}>
        {lastWin > 0 ? `$${lastWin.toFixed(2)}` : ""}
      </div>
    </div>
  );
}

export default Slots;
