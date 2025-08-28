import { useMemo, useState } from "react";
import Board from "./components/Mines/board";
import "./styles/mines.css";
import type { Cell as CellType } from "./services/game";
import { BoardCreate, multiplier, NextClick } from "./services/game";

// Game states during playtime
type Status = "idle" | "inProgress" | "lost" | "cashed";

export default function App() {
  const [size, setSize] = useState(5); // Board Size
  const [mines, setMines] = useState(5); //Num of Mines
  const [bet, setBet] = useState(10); //Amount used to bet
  const [cells, setCells] = useState<CellType[] | null>(null); //Stores board cells
  const [status, setStatus] = useState<Status>("idle"); //status of current playing game
  const [safeRevealed, setSafeRevealed] = useState(0); //Safe tiles that have been shown

  const total = size * size; //cells on the board that get configured by player

  // Payout multiplier
  const currentMult = useMemo(
    () => multiplier(total, mines, safeRevealed),
    [total, mines, safeRevealed]
  );
  // Multiplier increase if next click turns out to be safe
  const nextFactor = useMemo(
    () => NextClick(total, mines, safeRevealed),
    [total, mines, safeRevealed]
  );

  // Payouts
  const payoutNow  = +(bet * currentMult).toFixed(2);
  const nextPayout = +(bet * currentMult * nextFactor).toFixed(2);

  // starting new game
  function startGame() {
    const validMines = Math.max(1, Math.min(mines, total - 1));
    setCells(BoardCreate(size, validMines)); //Generates the board
    setSafeRevealed(0);
    setStatus("inProgress");
  }
  // Cell handling for when clicked
  function handleCellClick(index: number) {
    if (status !== "inProgress" || !cells) return;

    const tile = cells[index];
    if (tile.Revealed) return;

    const next = cells.slice();
    next[index] = { ...tile, Revealed: true };

    // If clicked a mine is revealed
    if (tile.IsMine) {
      const revealedAll = next.map(c => (c.IsMine ? { ...c, Revealed: true } : c));
      setCells(revealedAll);
      setStatus("lost");
      return;
    }

    // safe tiles
    setCells(next);
    setSafeRevealed(v => v + 1);
  }

  // Cash out with current if game isnt lost 
  function cashOut() {
    if (status === "inProgress" && safeRevealed > 0) setStatus("cashed");
  }

  // Idle reset
  function reset() {
    setCells(null);
    setSafeRevealed(0);
    setStatus("idle");
  }

  // constant check if game end
  const gameOver = status === "lost" || status === "cashed";

  // Board display before start
  const placeholder: CellType[] = Array.from({ length: total }, (_, i) => ({
    Index: i,
    IsMine: false,
    Revealed: false,
  }));

  // UI CHANGES

  return (
    <div className="app">
      <h1>Mines</h1>

      <div className="panel">
        {/*Allows player to change bet amount*/}
        <label>Bet ($) 
          <input type="number" min={1} step={1} value={bet}
                 onChange={(e) => setBet(Number(e.target.value))}/>
        </label>

        {/*Board size changer*/}
        <label>Grid
          <select value={size} onChange={(e) => setSize(Number(e.target.value))}
                  disabled={status === "inProgress"}>
            {[3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} × {n}</option>)}
          </select>
        </label>
        {/*Mine amount selector*/}
        <label>Mines
          <input type="number" min={1} max={total-1} value={mines}
                 onChange={(e) => setMines(Number(e.target.value))}
                 disabled={status === "inProgress"} />
        </label>

        {/*Inprogress action*/}
        {status !== "inProgress" ? (
          <button className="primary" onClick={startGame}>Start</button>
        ) : (
          <>
                  {/*Cash out function*/}
            <button onClick={cashOut} disabled={safeRevealed === 0}>Cash out</button>
            <button onClick={reset}>New</button>
          </>
        )}
      </div>

      <div className="badges">
        <span className="badge">Safes Found: {safeRevealed}</span>
        <span className="badge">Current Amount ×{currentMult}</span>
        <span className="badge">Current Payout: ${payoutNow}</span>
        {status === "inProgress" && (
          <span className="badge">Next Safe Amount ×{nextFactor} (${nextPayout})</span>
        )}
      </div>

      <div className="status">
        {status === "idle" && <>Press <b>Start</b> to play.</>}
        {status === "inProgress" && <>Pick Tiles</>}
        {status === "lost" && <>MINE HIT.</>}
        {status === "cashed" && <>Cash Out: ${payoutNow}</>}
      </div>

      <Board
        size={size}
        cells={cells ?? placeholder}
        gameOver={gameOver}
        onCellClick={handleCellClick}
      />
    </div>
  );
}