import { useMemo, useState, useEffect } from "react";
import "./mines.css";
import BackgroundLayout from "../../components/BackgroundLayout/BackgroundLayout";
import {
  placeBet,
  recordWinTx,
  recordLossTx,
} from "../../../Backend/transactions";
import { useUser } from "../../../Backend/firebase/UserFunctions.tsx";
import { CurrencyProvider } from "../../components/CurrencySwitcher/currencyswitcher.tsx";
import BetControls from "../BetControls.tsx";

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
export default function Mines() {
  const { user, balance, refreshBalance } = useUser(); // balance is in cents
  const [Size, SetSize] = useState(5);
  const [Mines, SetMines] = useState(5);
  const [bet, setBet] = useState(10); // bet shown in whole dollars
  const [betInBase, setBetInBase] = useState(0); // bet in cents (NZD base)
  const [Cells, SetCells] = useState<Cell[] | null>(null);
  const [Status, SetStatus] = useState<Status>("Idle");
  const [SafeRevealed, SetSafeRevealed] = useState(0);

  const total = Size * Size;

  // --- Game logic functions ---

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

  function multiplier(total: number, mines: number, SafeRevealed: number) {
    let m = 1;
    for (let i = 0; i < SafeRevealed; i++) {
      const CellsRemaining = total - i;
      const SafeRemaining = total - mines - i;
      m *= CellsRemaining / SafeRemaining;
    }
    return Number(m.toFixed(4));
  }

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

  const PayoutNow = Math.floor(betInBase * CurrentMult); // payout in cents
  const NextPayout = Math.floor(betInBase * CurrentMult * nextFactor);

  // --- Game actions ---
  const startGame = async (newBetInBase: number) => {
    // newBetInBase is in cents
    if (newBetInBase > balance) {
      alert("Not enough balance!");
      return;
    }

    setBetInBase(newBetInBase);

    const validMines = Math.max(1, Math.min(Mines, total - 1));
    SetCells(BoardCreate(Size, validMines));
    SetSafeRevealed(0);
    SetStatus("Playing");

    await placeBet(user.uid, newBetInBase, 1, "mines");
    await refreshBalance();
  };

  async function HandleCellClick(index: number) {
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

      await recordLossTx(user.uid, betInBase, 1, "mines");
      await refreshBalance();
      return;
    }

    SetCells(next);
    SetSafeRevealed((v) => v + 1);
  }

  const cashOut = async () => {
    if (SafeRevealed === 0) {
      reset();
      return;
    }
    if (Status === "Playing" && SafeRevealed > 0) {
      SetStatus("Cash");
      await recordWinTx(user.uid, PayoutNow, 1, "mines");
      await refreshBalance();
    }
  };

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
    if (Status === "Lost" || Status === "Cash") {
      const timer = setTimeout(() => SetStatus("Idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [Status]);

  // --- UI ---
  return (
    <BackgroundLayout>
      <CurrencyProvider base="NZD" DefaultCurrency="NZD">
        <div className="game-container">
          <div className="app">
            <h1>Mines</h1>

            <div className="panel">
              {/* Shared bet controls */}
              {(Status === "Idle" ||
                Status === "Lost" ||
                Status === "Cash") && (
                <BetControls
                  balance={balance} // cents
                  bet={bet} // dollars
                  setBet={setBet}
                  startGame={startGame}
                />
              )}
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

              {Status === "Playing" && (
                <button onClick={cashOut}>Cash out</button>
              )}
            </div>

            <div className="results">
              <span className="result">Safes Found: {SafeRevealed}</span>
              <span className="result">Current Multiplier ×{CurrentMult}</span>
              <span className="result">
                Current Payout: ${(PayoutNow / 100).toFixed(2)}
              </span>
              {Status === "Playing" && (
                <span className="result">
                  Next Safe ×{nextFactor} (${(NextPayout / 100).toFixed(2)})
                </span>
              )}
            </div>

            <div className="status">
              {Status === "Idle" && (
                <>
                  Press <b>Bet</b> to play.
                </>
              )}
              {Status === "Playing" && <>Pick Tiles</>}
              {Status === "Lost" && <>💣 Mine Hit. You lost.</>}
              {Status === "Cash" && (
                <>💰 Cashed Out: ${(PayoutNow / 100).toFixed(2)}</>
              )}
            </div>

            <Board
              Size={Size}
              Cells={Cells ?? placeholder}
              GameOver={gameOver}
              OnCellClick={HandleCellClick}
            />
          </div>
        </div>
      </CurrencyProvider>
    </BackgroundLayout>
  );
}
