import { useState, useEffect, useRef } from 'react';
import './Slots.css';
import { placeBet, recordWinTx, recordLossTx } from '@backend/transactions';
import { useUser } from '@backend/firebase/UserFunctions';
import { CurrencyProvider } from '@components/CurrencySwitcher/currencyswitcher';
import BetControls from '../BetControls';
import BackgroundLayout from '@components/BackgroundLayout/BackgroundLayout';
import '@components/animations/win.css';
import '@components/animations/loss.css';
import { resetFx } from '@components/animations/animation';

type WinTier = '' | 'win' | 'bigwin' | 'jackpot';
type LossTier = '' | 'loss' | 'bust';

function generateNum(): number {
  return Math.floor(Math.random() * 17) + 1;
}
function generateRow(): number[] {
  return Array.from({ length: 5 }, () => generateNum());
}
function spinSlots(): number[][] {
  return Array.from({ length: 5 }, () => generateRow());
}

interface RowResult {
  match: number;
  multiplier: number;
}
function calculateWinnings(slotGrid: number[][]): RowResult[] {
  const result: RowResult[] = [];
  for (const row of slotGrid) {
    const counts: Record<number, number> = {};
    for (const s of row) counts[s] = (counts[s] || 0) + 1;

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

export default function Slots() {
  const { user, balance, refreshBalance } = useUser();
  const [grid, setGrid] = useState<number[][]>([]);
  const [bet, setBet] = useState<number>(2.0);
  const [, setLastWin] = useState<number>(0);
  const [winningCells, setWinningCells] = useState<number[]>([]);
  const [roundInProgress, setRoundInProgress] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const [winTier, setWinTier] = useState<WinTier>('');
  const [lossTier, setLossTier] = useState<LossTier>('');
  const [winInfo, setWinInfo] = useState<{ amount: number; multiplier: number; visible: boolean }>({
    amount: 0,
    multiplier: 0,
    visible: false,
  });
  const [lossInfo, setLossInfo] = useState<{ amount: number; visible: boolean; tier: LossTier }>({
    amount: 0,
    visible: false,
    tier: '',
  });

  const fmtDollars = (cents: number) => (cents / 100).toFixed(2);

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
    if (!user) return;
    await placeBet(user.uid, betInBase, 1, 'slots');
    await refreshBalance();

    const newGrid = spinSlots();
    setGrid(newGrid);

    const winningData = calculateWinnings(newGrid);
    const matches = winningData.map((r) => r.match);
    const multipliers = winningData.map((r) => r.multiplier);
    const totalMultiplier = multipliers.reduce((acc, v) => (v > 0 ? acc + v : acc), 0);

    setWinningCells(matches);

    const winAmount = betInBase * totalMultiplier;
    let tier: WinTier = '';
    if (totalMultiplier >= 20) tier = 'jackpot';
    else if (totalMultiplier >= 5) tier = 'bigwin';
    else if (totalMultiplier >= 1) tier = 'win';
    setWinTier(tier);

    let ltier: LossTier = '';
    if (!tier) ltier = totalMultiplier === 0 ? 'bust' : 'loss';
    setLossTier(ltier);

    if (winAmount > 0) {
      setWinInfo({ amount: winAmount, multiplier: totalMultiplier, visible: true });
      requestAnimationFrame(() => {
        const toast = hostRef.current?.querySelector('.fx-toast') as HTMLElement | null;
        if (toast) resetFx(toast, 'fx-toast');
      });
      window.setTimeout(() => setWinInfo((w) => ({ ...w, visible: false })), 1800);
    } else {
      setLossInfo({ amount: betInBase, visible: true, tier: ltier });
      requestAnimationFrame(() => {
        const ltoast = hostRef.current?.querySelector('.fx-ltoast') as HTMLElement | null;
        if (ltoast) resetFx(ltoast, 'fx-ltoast');
      });
      window.setTimeout(() => setLossInfo((l) => ({ ...l, visible: false })), 1400);
    }

    requestAnimationFrame(() => {
      const target = hostRef.current?.querySelector('.slot-grid') as HTMLElement | null;
      if (!target) return;
      if (tier) {
        resetFx(
          target,
          tier === 'jackpot' ? 'fx-jackpot' : tier === 'bigwin' ? 'fx-bigwin' : 'fx-win'
        );
      } else if (ltier) {
        resetFx(target, ltier === 'bust' ? 'fx-bust' : 'fx-loss');
      }
    });

    if (winAmount > 0) {
      setLastWin(winAmount);
      await recordWinTx(user.uid, winAmount, 1, 'slots');
    } else {
      await recordLossTx(user.uid, betInBase, 1, 'slots');
    }
    await refreshBalance();
    setRoundInProgress(false);
  };

  const isWin = winTier === 'bigwin' || winTier === 'jackpot';
  const isLoss = lossTier === 'bust';

  return (
    <BackgroundLayout>
      <div className='game-container'>
        <CurrencyProvider base='NZD' DefaultCurrency='NZD'>
          <h1>♠ Slots ♣</h1>
          {!roundInProgress && (
            <BetControls balance={balance} bet={bet} setBet={setBet} startGame={spin} />
          )}
        </CurrencyProvider>

        <div ref={hostRef} className='fx-host'>
          {winInfo.visible && (
            <div className={`fx-toast ${isWin ? 'fx-toast--win' : ''}`} aria-live='polite'>
              <div className='fx-toast__label'>
                {winTier === 'jackpot' ? 'JACKPOT!' : winTier === 'bigwin' ? 'BIG WIN!' : 'WIN'}
              </div>
              <div className='fx-toast__amount'>+ ${fmtDollars(winInfo.amount)}</div>
              {winInfo.multiplier > 0 && (
                <div className='fx-toast__mult'>×{winInfo.multiplier}</div>
              )}
            </div>
          )}

          {lossInfo.visible && (
            <div
              className={`fx-ltoast ${isLoss ? 'fx-ltoast--lossplus' : lossInfo.tier === 'bust' ? 'fx-ltoast--bust' : ''}`}
              aria-live='polite'
            >
              <div className='fx-ltoast__label'>
                {isLoss ? 'ROUND OVER' : lossInfo.tier === 'bust' ? 'BUST' : 'LOSS'}
              </div>
              <div className='fx-ltoast__amount'>- ${fmtDollars(lossInfo.amount)}</div>
            </div>
          )}

          <div
            className={`slot-grid ${
              isWin
                ? 'fx-win-plus'
                : winTier
                  ? 'fx-win'
                  : isLoss
                    ? 'fx-loss-plus'
                    : lossTier
                      ? 'fx-loss'
                      : ''
            }`}
          >
            {isWin && <div className='fx-sparkles' />}
            {isWin && (
              <>
                <div className='fx-confetti' />
                <div className='fx-coins'>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <span key={i}>🪙</span>
                  ))}
                </div>
              </>
            )}
            {winTier === 'jackpot' && <div className='fx-flash' />}

            {isLoss && (
              <>
                <div className='fx-loss-flash' />
                <div className='fx-shards'>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span key={i} />
                  ))}
                </div>
                <div className='fx-smoke' />
              </>
            )}

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
        </div>
      </div>
    </BackgroundLayout>
  );
}
