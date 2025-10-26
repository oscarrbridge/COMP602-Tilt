import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Crash.css';

import BackgroundLayout from '../../components/BackgroundLayout/BackgroundLayout';
import { CurrencyProvider } from '../../components/CurrencySwitcher/currencyswitcher.tsx';
import BetControls from '../BetControls/BetControls.tsx';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import { placeBet, recordWinTx, recordLossTx } from '../../../Backend/transactions';

type RoundState = 'idle' | 'countdown' | 'in-progress' | 'crashed' | 'cashed-out';

interface HistoryItem {
  id: number;
  crashPoint: number;
  cashedOutAt?: number;
  profitDisplay: number; // positive for win, negative for loss
}

// Generates a crash point based on an exponential distribution
function generateCrashPoint(): number {
  const lambda = 0.9;
  const v = 1 + -Math.log(1 - Math.random()) / lambda;
  return Math.min(v, 50);
}

// ----- constants & helpers -----
const GROWTH_K = Math.log(10) / 8; // 10× in ~8s
const multiplierAt = (t: number) => Math.exp(GROWTH_K * t);
const secondsToReach = (m: number) => Math.log(m) / GROWTH_K;
const fmtMoney = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMult = (n: number) => `${n.toFixed(2)}x`;

const COUNTDOWN_SECS = 3;

// ----- Crash component -----
export default function Crash() {
  const { user, balance, refreshBalance } = useUser();

  const [bet, setBet] = useState<number>(10);
  const [betInBase, setBetInBase] = useState<number>(0);
  const [state, setState] = useState<RoundState>('idle');
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_SECS);
  const [currentMult, setCurrentMult] = useState<number>(1);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [cashedOutAt, setCashedOutAt] = useState<number>();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [roundId, setRoundId] = useState<number>(1);

  const [goFlash, setGoFlash] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([{ x: 0, y: 1 }]);

  const canCashOut = state === 'in-progress' && !cashedOutAt;

  // ----- animation loop -----
  useEffect(() => {
    if (state !== 'in-progress' || !crashPoint) return;

    const durationToCrash = secondsToReach(crashPoint);
    const step = (nowMs: number) => {
      if (startTimeRef.current == null) startTimeRef.current = nowMs;
      const t = (nowMs - startTimeRef.current) / 1000;
      const mult = multiplierAt(t);
      setCurrentMult(mult);

      setPoints((prev) => {
        const lastX = prev[prev.length - 1].x;
        if (t - lastX < 0.03) return prev;
        return [...prev, { x: t, y: mult }];
      });

      if (t >= durationToCrash) {
        setCurrentMult(crashPoint);
        setState('crashed');
        if (animRef.current) cancelAnimationFrame(animRef.current);
      } else {
        animRef.current = requestAnimationFrame(step);
      }
    };

    animRef.current = requestAnimationFrame(step);
    return () => animRef.current && cancelAnimationFrame(animRef.current);
  }, [state, crashPoint]);

  // ----- countdown logic -----
  useEffect(() => {
    if (state !== 'countdown') return;

    let remaining = COUNTDOWN_SECS;
    setCountdown(remaining);

    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        clearInterval(interval);
        setCountdown(0);
        setState('in-progress');
        setGoFlash(true);
        setTimeout(() => setGoFlash(false), 700);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state]);

  // ----- helpers -----
  function resetGraph() {
    startTimeRef.current = null;
    setPoints([{ x: 0, y: 1 }]);
    setCurrentMult(1);
  }

  function queueNextRound(afterMs = 1500) {
    setTimeout(() => {
      setCrashPoint(null);
      setCashedOutAt(undefined);
      resetGraph();
      setState('idle');
      setRoundId((r) => r + 1);
    }, afterMs);
  }

  // ----- startGame -----
  async function startGame(newBetInBase: number) {
    if (bet > balance) {
      alert('Not enough balance!');
      return;
    }
    setBetInBase(newBetInBase);
    setCashedOutAt(undefined);
    setCrashPoint(generateCrashPoint());
    resetGraph();
    setState('countdown');
    await placeBet(user.uid, newBetInBase, 1, 'crash');
    await refreshBalance();
  }

  // ----- cashOut -----
  async function cashOut() {
    if (!canCashOut) return;
    const m = Math.max(1, currentMult);
    const payoutBase = Math.round(betInBase * m);
    const profitDisplay = bet * (m - 1);
    setCashedOutAt(m);
    setState('cashed-out');

    await recordWinTx(user.uid, payoutBase, 1, 'crash');
    await refreshBalance();

    setHistory((h) =>
      [{ id: roundId, crashPoint: crashPoint ?? m, cashedOutAt: m, profitDisplay }, ...h].slice(
        0,
        15
      )
    );
    queueNextRound();
  }

  // ----- crashed -----
  useEffect(() => {
    if (state !== 'crashed') return;
    (async () => {
      await recordLossTx(user.uid, betInBase, 1, 'crash');
      await refreshBalance();
      setHistory((h) =>
        [{ id: roundId, crashPoint: crashPoint ?? currentMult, profitDisplay: -bet }, ...h].slice(
          0,
          15
        )
      );
      queueNextRound();
    })();
  }, [state]);

  // ----- graph layout -----
  const graph = useMemo(() => {
    const W = 1000,
      H = 420;
    const maxX = Math.max(12, points[points.length - 1]?.x ?? 12);
    const maxY = Math.max(3, ...points.map((p) => p.y), crashPoint ?? 1);
    const mapX = (x: number) => (x / maxX) * (W - 60) + 40;
    const mapY = (y: number) => H - ((y - 1) / (maxY - 1)) * (H - 60) - 20;
    const poly = points.map((p) => `${mapX(p.x)},${mapY(p.y)}`).join(' ');
    const yTicks = [1, 1.5, 2, 2.5, 3, 4, 5, 7, 10].filter((v) => v <= maxY);
    return { W, H, poly, mapX, mapY, yTicks, maxY };
  }, [points, crashPoint]);

  // ----- UI -----
  return (
    <BackgroundLayout>
      <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: 16 }}>
        {/* Centered Bet Controls */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 520 }}>
            <CurrencyProvider base='NZD' DefaultCurrency='NZD'>
              {state === 'idle' ? (
                <BetControls balance={balance} bet={bet} setBet={setBet} startGame={startGame} />
              ) : (
                <button onClick={cashOut} disabled={!canCashOut} className='cashout-button'>
                  Cash Out
                </button>
              )}
            </CurrencyProvider>
          </div>
        </div>

        {/* Graph */}
        <div className='crash-card'>
          <div className='crash-multiplier'>{fmtMult(Math.max(1, currentMult))}</div>

          {/* Countdown / Go */}
          {state === 'countdown' && (
            <div key={`count-${countdown}`} className='countdown-pop overlay-text'>
              {countdown}
            </div>
          )}
          {goFlash && <div className='go-flash overlay-text'>GO!</div>}

          {/* Graph SVG */}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${graph.W} ${graph.H}`}
            width='100%'
            height={520}
            style={{ display: 'block', borderRadius: 12 }}
          >
            <defs>
              <linearGradient id='bgGrad' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='#0f172a' />
                <stop offset='100%' stopColor='#0b1020' />
              </linearGradient>
              <linearGradient id='crashLine' x1='0' y1='0' x2='1' y2='0'>
                <stop offset='0%' stopColor='#22d3ee' />
                <stop offset='40%' stopColor='#8b5cf6' />
                <stop offset='70%' stopColor='#f472b6' />
                <stop offset='100%' stopColor='#f59e0b' />
              </linearGradient>
              <filter id='glow' x='-50%' y='-50%' width='200%' height='200%'>
                <feGaussianBlur in='SourceGraphic' stdDeviation='4' result='blur' />
                <feMerge>
                  <feMergeNode in='blur' />
                  <feMergeNode in='SourceGraphic' />
                </feMerge>
              </filter>
              <filter id='redGlow' x='-50%' y='-50%' width='200%' height='200%'>
                <feGaussianBlur in='SourceGraphic' stdDeviation='6' result='blur' />
                <feMerge>
                  <feMergeNode in='blur' />
                  <feMergeNode in='SourceGraphic' />
                </feMerge>
              </filter>
            </defs>

            <rect x='0' y='0' width={graph.W} height={graph.H} fill='url(#bgGrad)' />

            {graph.yTicks.map((v, i) => {
              const y = graph.H - ((v - 1) / (graph.maxY - 1)) * (graph.H - 60) - 20;
              return (
                <g key={i}>
                  <line x1={40} x2={graph.W - 20} y1={y} y2={y} stroke='#172036' />
                  <text x={graph.W - 24} y={y - 6} fill='#a3a3a3' fontSize={10}>
                    {v.toFixed(1)}x
                  </text>
                </g>
              );
            })}

            <polyline
              fill='none'
              stroke='url(#crashLine)'
              strokeWidth={5.5}
              filter='url(#glow)'
              points={graph.poly}
            />

            {/* live marker */}
            {(() => {
              const p = points[points.length - 1];
              if (!p) return null;
              const cx = graph.mapX(p.x);
              const cy = graph.mapY(p.y);
              return (
                <g>
                  <circle cx={cx} cy={cy} r={6} fill='#ffffff' opacity='0.9' />
                  <circle cx={cx} cy={cy} r={12} fill='#ffffff' opacity='0.12' />
                </g>
              );
            })()}
          </svg>
        </div>

        {/* History */}
        <div className='history-container'>
          <div className='history-header'>
            <h2>Recent Rounds</h2>
            <button className='history-clear' onClick={() => setHistory([])}>
              Clear
            </button>
          </div>

          {history.length === 0 ? (
            <div className='history-empty'>No rounds yet.</div>
          ) : (
            <table className='history-table'>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Crash</th>
                  <th>Cashed Out</th>
                  <th>Profit / Loss</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.id}</td>
                    <td style={{ color: '#ef4444', fontWeight: 600 }}>{fmtMult(h.crashPoint)}</td>
                    <td style={{ color: h.cashedOutAt ? '#10b981' : '#9ca3af' }}>
                      {h.cashedOutAt ? fmtMult(h.cashedOutAt) : '—'}
                    </td>
                    <td
                      style={{
                        color: h.profitDisplay >= 0 ? '#10b981' : '#ef4444',
                        fontWeight: 600,
                      }}
                    >
                      {h.profitDisplay >= 0 ? '+' : '-'}${fmtMoney(Math.abs(h.profitDisplay))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </BackgroundLayout>
  );
}
