import { useMemo, useState, useEffect } from "react";
import "./mines.css";
import BackgroundLayout from "../../components/BackgroundLayout/BackgroundLayout";

// Game states during playtime
type Status = "Idle" | "Playing" | "Lost" | "Cash";

// Definition for one cell
type Cell = {
  Index: number;
  IsMine: boolean;
  Revealed: boolean;
};

// Board component
function Board({
  Size,
  Cells,
  GameOver,
  OnCellClick,
}: {
  Size: number;
  Cells: Cell[];
  GameOver: boolean;
  OnCellClick: (index: number) => void;
}) {
  return (
    <div className="board" style={{ "--size": Size } as React.CSSProperties}>
      {Cells.map((cell) => (
        <div
          key={cell.Index}
          className={`cell ${cell.Revealed ? "revealed" : ""} ${
            cell.Revealed && cell.IsMine ? "mine" : ""
          }`}
          onClick={() => !GameOver && !cell.Revealed && OnCellClick(cell.Index)}
        >
          {cell.Revealed && cell.IsMine ? "💣" : cell.Revealed ? "💎" : ""}
        </div>
      ))}
    </div>
  );
}

// Main App component
export default function App() {
  const [Size, SetSize] = useState(5);
  const [Mines, SetMines] = useState(5);
  const [Bet, SetBet] = useState(10);
  const [Cells, SetCells] = useState<Cell[] | null>(null);
  const [Status, SetStatus] = useState<Status>("Idle");
  const [SafeRevealed, SetSafeRevealed] = useState(0);

  const total = Size * Size;

  // --- Game logic functions ---

  // Create the board
  function BoardCreate(size: number, MineCount: number): Cell[] {
    const total = size * size;
    const mineCount = Math.max(0, Math.min(MineCount, total - 1));
    const indices = Array.from({ length: total }, (_, i) => i);

    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const mines = new Set(indices.slice(0, mineCount));

    return Array.from({ length: total }, (_, i) => ({
      Index: i,
      IsMine: mines.has(i),
      Revealed: false,
    }));
  }

  // Calculate current multiplier
  function multiplier(total: number, mines: number, SafeRevealed: number) {
    let m = 1;
    for (let i = 0; i < SafeRevealed; i++) {
      const CellsRemaining = total - i;
      const SafeRemaining = total - mines - i;
      m *= CellsRemaining / SafeRemaining;
    }
    return Number(m.toFixed(4));
  }

  // Calculate multiplier for next click
  function NextClick(total: number, mines: number, SafeRevealed: number) {
    const CellsRemaining = total - SafeRevealed;
    const SafeRemaining = total - mines - SafeRevealed;
    return Number((CellsRemaining / SafeRemaining).toFixed(4));
  }

  // --- Computed values ---
  const CurrentMult = useMemo(
    () => multiplier(total, Mines, SafeRevealed),
    [total, Mines, SafeRevealed]
  );

  const nextFactor = useMemo(
    () => NextClick(total, Mines, SafeRevealed),
    [total, Mines, SafeRevealed]
  );

  const PayoutNow = +(Bet * CurrentMult).toFixed(2);
  const NextPayout = +(Bet * CurrentMult * nextFactor).toFixed(2);

  // --- Game actions ---
  function startGame() {
    const validMines = Math.max(1, Math.min(Mines, total - 1));
    SetCells(BoardCreate(Size, validMines));
    SetSafeRevealed(0);
    SetStatus("Playing");
  }

  function HandleCellClick(index: number) {
    if (Status !== "Playing" || !Cells) return;

    const tile = Cells[index];
    if (tile.Revealed) return;

    const next = Cells.slice();
    next[index] = { ...tile, Revealed: true };

    if (tile.IsMine) {
      const revealedAll = next.map((c) =>
        c.IsMine ? { ...c, Revealed: true } : c
      );
      SetCells(revealedAll);
      SetStatus("Lost");
      return;
    }

    SetCells(next);
    SetSafeRevealed((v) => v + 1);
  }

  function cashOut() {
    if (Status === "Playing" && SafeRevealed > 0) SetStatus("Cash");
  }

  function reset() {
    SetCells(null);
    SetSafeRevealed(0);
    SetStatus("Idle");
  }

  const gameOver = Status === "Lost" || Status === "Cash";

  const placeholder: Cell[] = Array.from({ length: total }, (_, i) => ({
    Index: i,
    IsMine: false,
    Revealed: false,
  }));

  useEffect(() => {
    // Reset the board whenever grid size or mine count changes
    reset();
  }, [Size, Mines]);

  // --- UI ---
  return (
    <div className="app">
      <h1>Mines</h1>

      <div className="panel">
        <label>
          Bet ($)
          <input
            type="number"
            min={1}
            step={1}
            value={Bet}
            onChange={(e) => SetBet(Number(e.target.value))}
          />
        </label>

        <label>
          Grid
          <select
            value={Size}
            onChange={(e) => SetSize(Number(e.target.value))}
            disabled={Status === "Playing"}
          >
            {[3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} × {n}
              </option>
            ))}
          </select>
        </label>

        <label>
          Mines
          <input
            type="number"
            min={1}
            max={total - 1}
            value={Mines}
            onChange={(e) => SetMines(Number(e.target.value))}
            disabled={Status === "Playing"}
          />
        </label>

        {Status !== "Playing" ? (
          <button className="primary" onClick={startGame}>
            Start
          </button>
        ) : (
          <>
            <button onClick={cashOut} disabled={SafeRevealed === 0}>
              Cash out
            </button>
            <button onClick={reset}>New</button>
          </>
        )}
      </div>

      {Status !== "Idle" && (
        <div className="results">
          <span className="result">Safes Found: {SafeRevealed}</span>
          <span className="result">Current Amount ×{CurrentMult}</span>
          <span className="result">Current Payout: ${PayoutNow}</span>
          {Status === "Playing" && (
            <span className="result">
              Next Safe Amount ×{nextFactor} (${NextPayout})
            </span>
          )}
        </div>
      )}

      <div className="status">
        {Status === "Idle" && (
          <>
            Press <b>Start</b> to play.
          </>
        )}
        {Status === "Playing" && <>Pick Tiles</>}
        {Status === "Lost" && <>MINE HIT.</>}
        {Status === "Cash" && <>Cash Out: ${PayoutNow}</>}
      </div>

      <Board
        Size={Size}
        Cells={Cells ?? placeholder}
        GameOver={gameOver}
        OnCellClick={HandleCellClick}
      />
    </div>
  );
}
