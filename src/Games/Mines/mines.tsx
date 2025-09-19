import { useMemo, useState } from "react";
import Board from "../../components/Mines/board";
import "./mines.css";
import type { Cell as CellType } from "../../services/game";
import { BoardCreate, multiplier, NextClick } from "../../services/game";

// Game states during playtime
type Status = "Idle" | "Playing" | "Lost" | "Cash";

export default function App() {
  const [Size, SetSize] = useState(5); // Board Size
  const [Mines, SetMines] = useState(5); //Num of Mines
  const [Bet, SetBet] = useState(10); //Amount used to bet
  const [Cells, SetCells] = useState<CellType[] | null>(null); //Stores board cells
  const [Status, SetStatus] = useState<Status>("Idle"); //status of current playing game
  const [SafeRevealed, SetSafeRevealed] = useState(0); //Safe tiles that have been shown

  const total = Size * Size; //cells on the board that get configured by player

  // Payout multiplier
  const CurrentMult = useMemo(
    () => multiplier(total, Mines, SafeRevealed),
    [total, Mines, SafeRevealed]
  );
  // Multiplier increase if next click turns out to be safe
  const nextFactor = useMemo(
    () => NextClick(total, Mines, SafeRevealed),
    [total, Mines, SafeRevealed]
  );

  // Payouts
  const PayoutNow = +(Bet * CurrentMult).toFixed(2);
  const NextPayout = +(Bet * CurrentMult * nextFactor).toFixed(2);

  // starting new game
  function startGame() {
    const validMines = Math.max(1, Math.min(Mines, total - 1));
    SetCells(BoardCreate(Size, validMines)); //Generates the board
    SetSafeRevealed(0);
    SetStatus("Playing");
  }
  // Cell handling for when clicked
  function HandleCellClick(index: number) {
    if (Status !== "Playing" || !Cells) return;

    const tile = Cells[index];
    if (tile.Revealed) return;

    const next = Cells.slice();
    next[index] = { ...tile, Revealed: true };

    // If clicked a mine is revealed
    if (tile.IsMine) {
      const revealedAll = next.map((c) =>
        c.IsMine ? { ...c, Revealed: true } : c
      );
      SetCells(revealedAll);
      SetStatus("Lost");
      return;
    }

    // safe tiles
    SetCells(next);
    SetSafeRevealed((v) => v + 1);
  }

  // Cash out with current if game isnt lost
  function cashOut() {
    if (Status === "Playing" && SafeRevealed > 0) SetStatus("Cash");
  }

  // Idle reset
  function reset() {
    SetCells(null);
    SetSafeRevealed(0);
    SetStatus("Idle");
  }

  // constant check if game end
  const gameOver = Status === "Lost" || Status === "Cash";

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

        {/*Board size changer*/}
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
        {/*Mine amount selector*/}
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

        {/*Inprogress action*/}
        {Status !== "Playing" ? (
          <button className="primary" onClick={startGame}>
            Start
          </button>
        ) : (
          <>
            {/*Cash out function*/}
            <button onClick={cashOut} disabled={SafeRevealed === 0}>
              Cash out
            </button>
            <button onClick={reset}>New</button>
          </>
        )}
      </div>

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
