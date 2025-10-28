import { useMemo, useState, useEffect } from 'react';
import './mines.css';
import BackgroundLayout from '../../components/BackgroundLayout/BackgroundLayout';
import { placeBet, recordWinTx, recordLossTx } from '../../../Backend/transactions';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import { CurrencyProvider } from '../../components/CurrencySwitcher/currencyswitcher.tsx';
import BetControls from '../BetControls/BetControls.tsx';
import useCurrentBooster from '../../hooks/useCurrentBooster.tsx';
import ResultFX from '../../components/Animations/Animations'; // [FX] add

// Game states during playtime
type Status = 'Idle' | 'Playing' | 'Lost' | 'Cash';

// Definition for one cell
type Cell = {
  Index: number;
  IsMine: boolean;
  Revealed: boolean;
  IsAnimating?: boolean;
  IsNewReveal?: boolean;
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
    <div className='board' style={{ '--size': Size } as React.CSSProperties}>
      {Cells.map((cell) => (
        <div
          key={cell.Index}
          className={`cell ${cell.Revealed ? 'revealed' : ''} ${
            cell.Revealed && cell.IsMine ? 'mine' : ''
          } ${cell.IsAnimating ? 'animating' : ''} ${cell.IsNewReveal ? 'new-reveal' : ''}`}
          onClick={() => !GameOver && !cell.Revealed && OnCellClick(cell.Index)}
        >
          {cell.Revealed && cell.IsMine ? '💣' : cell.Revealed ? '💎' : ''}
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
  const [bet, setBet] = useState(2.0); // bet shown in whole dollars
  const [betInBase, setBetInBase] = useState(0); // bet in cents (NZD base)
  const [Cells, SetCells] = useState<Cell[] | null>(null);
  const [Status, SetStatus] = useState<Status>('Idle');
  const [SafeRevealed, SetSafeRevealed] = useState(0);
  const [lastWin, setLastWin] = useState(0);
  const { applyBooster } = useCurrentBooster();
  const [isCashOutProcessing, setIsCashOutProcessing] = useState(false);
  const [isBoardPulsing, setIsBoardPulsing] = useState(false);
  const [showWinEffect, setShowWinEffect] = useState(false);

  // [FX] overlay state
  const [showFx, setShowFx] = useState(false);
  const [fxType, setFxType] = useState<'win' | 'loss'>('win');
  const [fxAmount, setFxAmount] = useState<number | undefined>(undefined);

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
      IsAnimating: false,
      IsNewReveal: false,
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

  useEffect(() => {
    // Anytime grid size changes, reset the board and go idle
    reset();
    SetStatus('Idle');
  }, [Size]);

  // Start pulsing animation when multiplier gets high
  useEffect(() => {
    if (Status === 'Playing' && CurrentMult > 3) {
      setIsBoardPulsing(true);
    } else {
      setIsBoardPulsing(false);
    }
  }, [CurrentMult, Status]);

  // --- Game actions ---
  const startGame = async (newBetInBase: number) => {
    // newBetInBase is in cents
    if (newBetInBase > balance) {
      alert('Not enough balance!');
      return;
    }

    setBetInBase(newBetInBase);
    setLastWin(0);
    setShowWinEffect(false);

    const validMines = Math.max(1, Math.min(Mines, total - 1));
    const newCells = BoardCreate(Size, validMines);

    // Animate board creation
    SetCells(newCells.map((cell) => ({ ...cell, IsAnimating: true })));
    setTimeout(() => {
      SetCells(newCells);
    }, 500);

    SetSafeRevealed(0);
    SetStatus('Playing');

    await placeBet(user.uid, newBetInBase, 1, 'mines');
    await refreshBalance();
  };

  async function HandleCellClick(index: number) {
    if (Status !== 'Playing' || !Cells) return;

    const tile = Cells[index];
    if (tile.Revealed) return;

    const next = Cells.slice();
    next[index] = { ...tile, Revealed: true, IsNewReveal: true };

    if (tile.IsMine) {
      // Animate mine reveal with cascade effect
      const revealedAll = next.map((c, i) =>
        c.IsMine ? { ...c, Revealed: true, IsAnimating: true } : c
      );
      SetCells(revealedAll);

      // Cascade animation for mines
      setTimeout(() => {
        SetCells(revealedAll.map((cell) => ({ ...cell, IsAnimating: false })));
        SetStatus('Lost');
      }, 600);

      await applyBooster(0);
      await recordLossTx(user.uid, betInBase, 1, 'mines');
      await refreshBalance();

      // [FX] show loss overlay (amount shown in dollars)
      setFxType('loss');
      setFxAmount(betInBase / 100);
      setShowFx(true);

      return;
    }

    SetCells(next);
    SetSafeRevealed((v) => v + 1);

    // Remove new reveal animation after delay
    setTimeout(() => {
      SetCells((prev) => {
        if (!prev) return prev; // stays null ✅

        return prev.map((cell) => (cell.Index === index ? { ...cell, IsNewReveal: false } : cell));
      });
    }, 500);
  }

  const cashOut = async () => {
    if (isCashOutProcessing) return; // prevent spamming
    setIsCashOutProcessing(true);
    setShowWinEffect(true);

    try {
      if (SafeRevealed === 0) {
        // Refund the bet if no tiles were revealed
        await recordWinTx(user.uid, betInBase, 1, 'mines_refund');
        await refreshBalance();
        // [FX] treat refund as a small win animation (optional)
        setFxType('win');
        setFxAmount(betInBase / 100);
        setShowFx(true);
        reset();
        return;
      }

      if (Status === 'Playing' && SafeRevealed > 0) {
        let finalAmount = PayoutNow;

        // Apply booster to winnings
        if (PayoutNow > 0) {
          finalAmount = await applyBooster(PayoutNow);
          setLastWin(finalAmount);
        }

        // Animate cash out
        setIsBoardPulsing(true);
        setTimeout(() => setIsBoardPulsing(false), 2000);

        await recordWinTx(user.uid, finalAmount, 1, 'mines');
        await refreshBalance();
        SetStatus('Cash');

        // [FX] show win overlay (amount in dollars)
        setFxType('win');
        setFxAmount(finalAmount / 100);
        setShowFx(true);
      }
    } finally {
      setIsCashOutProcessing(false);
    }
  };

  function reset() {
    SetCells(null);
    SetSafeRevealed(0);
    SetStatus('Idle');
    setLastWin(0);
    setShowWinEffect(false);
    setIsBoardPulsing(false);
  }

  const gameOver = Status === 'Lost' || Status === 'Cash';

  const placeholder: Cell[] = Array.from({ length: total }, (_, i) => ({
    Index: i,
    IsMine: false,
    Revealed: false,
    IsAnimating: false,
    IsNewReveal: false,
  }));

  useEffect(() => {
    if (Status === 'Lost' || Status === 'Cash') {
      const timer = setTimeout(() => {
        SetStatus('Idle');
        setLastWin(0);
        setShowWinEffect(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [Status]);

  // --- UI ---
  return (
    <BackgroundLayout gameId='Mines'>
      <CurrencyProvider base='NZD' DefaultCurrency='NZD'>
        <div className='mines-game-container'>
          <div className='mines-content'>
            {/* Left Panel - Controls */}
            <div className='mines-controls-panel'>
              <div className='game-settings'>
                <label>
                  Grid Size
                  <select
                    value={Size}
                    onChange={(e) => SetSize(Number(e.target.value))}
                    disabled={Status === 'Playing'}
                  >
                    {[3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} × {n}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Mines
                  <input
                    type='number'
                    min={1}
                    max={total - 1}
                    value={Mines}
                    onChange={(e) => SetMines(Number(e.target.value))}
                    disabled={Status === 'Playing'}
                  />
                </label>
              </div>

              {/* Game Info */}
              <div className='mines-game-info'>
                <div className='mines-info-row'>
                  <span className='mines-info-label'>Safes Found:</span>
                  <span className='mines-info-value'>{SafeRevealed}</span>
                </div>
                <div className='mines-info-row'>
                  <span className='mines-info-label'>Multiplier:</span>
                  <span className={`mines-info-value ${CurrentMult > 3 ? 'high-multiplier' : ''}`}>
                    ×{CurrentMult}
                  </span>
                </div>
                <div className='mines-info-row'>
                  <span className='mines-info-label'>Current Payout:</span>
                  <span className='mines-info-value'>${(PayoutNow / 100).toFixed(2)}</span>
                </div>
                {Status === 'Playing' && (
                  <div className='mines-info-row'>
                    <span className='mines-info-label'>Next Safe:</span>
                    <span className='mines-info-value'>
                      ×{nextFactor} (${(NextPayout / 100).toFixed(2)})
                    </span>
                  </div>
                )}
              </div>

              {/* Cash Out Button */}
              {Status === 'Playing' && (
                <button
                  className={`cash-out-button ${isCashOutProcessing ? 'processing' : ''} ${
                    CurrentMult > 2 ? 'pulsing' : ''
                  }`}
                  onClick={cashOut}
                >
                  {isCashOutProcessing ? 'Cashing...' : `Cash Out $${(PayoutNow / 100).toFixed(2)}`}
                </button>
              )}
            </div>

            {/* Center - Game Board */}
            <div className='mines-board-container'>
              <div
                className={`board-wrapper ${isBoardPulsing ? 'pulsing' : ''} ${
                  showWinEffect ? 'win-effect' : ''
                }`}
              >
                <Board
                  Size={Size}
                  Cells={Cells ?? placeholder}
                  GameOver={gameOver}
                  OnCellClick={HandleCellClick}
                />
              </div>

              {/* Status Display */}
              <div className={`mines-status status-${Status.toLowerCase()}`}>
                {Status === 'Idle' && (
                  <span className='status-idle'>
                    Press <b>Bet</b> to start playing
                  </span>
                )}
                {Status === 'Playing' && (
                  <span className='status-playing'>Pick safe tiles to multiply your bet!</span>
                )}
                {Status === 'Lost' && (
                  <span className='status-lost'>
                    Mine Hit! You lost ${(betInBase / 100).toFixed(2)}
                  </span>
                )}
                {Status === 'Cash' && (
                  <span className='status-win'>Cashed Out: +${(lastWin / 100).toFixed(2)}</span>
                )}
              </div>

              {/* [FX] Overlay for win/loss pop */}
              <ResultFX
                show={showFx}
                type={fxType}
                amount={fxAmount} // already converted to dollars above
                currency='NZ$'
                durationMs={2200}
                align='center'
                onDone={() => setShowFx(false)}
              />

              {/* Win Effect Overlay (existing) */}
              {showWinEffect && (
                <div className='win-effect-overlay'>
                  <div className='confetti'></div>
                  <div className='confetti'></div>
                  <div className='confetti'></div>
                </div>
              )}
            </div>
          </div>

          {/* Bet Controls at Bottom */}
          <div className='game-bet-controls'>
            <BetControls
              balance={balance}
              bet={bet}
              setBet={setBet}
              startGame={startGame}
              disabled={Status === 'Playing'}
            />
          </div>
        </div>
      </CurrencyProvider>
    </BackgroundLayout>
  );
}
