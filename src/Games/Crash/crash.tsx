import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Crash.css';
import BackgroundLayout from '../../components/BackgroundLayout/BackgroundLayout';
import { CurrencyProvider } from '../../components/CurrencySwitcher/currencyswitcher.tsx';
import BetControls from '../BetControls/BetControls.tsx';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import { placeBet, recordWinTx, recordLossTx } from '../../../Backend/transactions';
import useCurrentBooster from '../../hooks/useCurrentBooster.tsx';
import ResultFX from '../../components/Animations/Animations'; // [FX] add

type RoundState = 'idle' | 'countdown' | 'in-progress' | 'crashed' | 'cashed-out';

function generateCrashPoint(): number {
  const lambda = 0.45;
  const v = 1 + -Math.log(1 - Math.random()) / lambda;
  return Math.min(v, 50);
}

const GROWTH_K = Math.log(10) / 8;
const multiplierAt = (t: number) => Math.exp(GROWTH_K * t);
const secondsToReach = (m: number) => Math.log(m) / GROWTH_K;
const fmtMult = (n: number) => `${n.toFixed(2)}x`;

const COUNTDOWN_SECS = 3;

export default function Crash() {
  const { user, balance, refreshBalance } = useUser();
  const { applyBooster } = useCurrentBooster();

  const [bet, setBet] = useState<number>(2.0);
  const [betInBase, setBetInBase] = useState<number>(0);
  const [state, setState] = useState<RoundState>('idle');
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_SECS);
  const [currentMult, setCurrentMult] = useState<number>(1);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [cashedOutAt, setCashedOutAt] = useState<number | undefined>(undefined);
  const [roundId, setRoundId] = useState<number>(1);
  const [lastWin, setLastWin] = useState<number>(0);

  const [goFlash, setGoFlash] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // overlay state
  const [showFx, setShowFx] = useState(false);
  const [fxType, setFxType] = useState<'win' | 'loss'>('win');
  const [fxAmount, setFxAmount] = useState<number | undefined>(undefined);

  // points represent the *actual emitted* points over time (
  const [points, setPoints] = useState<{ x: number; y: number }[]>([{ x: 0, y: 1 }]);

  const canCashOut = state === 'in-progress' && !cashedOutAt;

  // Animation loop 
  useEffect(() => {
    if (state !== 'in-progress' || crashPoint == null) return;

    const durationToCrash = secondsToReach(crashPoint);
    const step = (nowMs: number) => {
      if (startTimeRef.current == null) startTimeRef.current = nowMs;
      const t = (nowMs - startTimeRef.current) / 1000;
      const mult = multiplierAt(t);

      // update visible current multiplier
      setCurrentMult(mult);

      // push new emitted points at a minimum time resolution (throttle)
      setPoints((prev) => {
        const lastX = prev.length ? prev[prev.length - 1].x : 0;
        if (t - lastX < 0.03) return prev; // approx 30ms / 33fps granularity
        return [...prev, { x: t, y: mult }];
      });

      if (t >= durationToCrash) {
        // reached crash
        setCurrentMult(crashPoint);
        setPoints((prev) => {
          const last = prev[prev.length - 1];
          // avoid duplicate if already near crashPoint
          if (last && Math.abs(last.y - crashPoint) < 1e-6) return prev;
          return [...prev, { x: durationToCrash, y: crashPoint }];
        });
        setState('crashed');
        if (animRef.current) cancelAnimationFrame(animRef.current);
      } else {
        animRef.current = requestAnimationFrame(step);
      }
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
      startTimeRef.current = null;
    };
    // intentionally depend on state & crashPoint only
  }, [state, crashPoint]);

  // countdown timer
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
        //gernerate the crash point
        setCrashPoint(generateCrashPoint());

        setState('in-progress');
        setGoFlash(true);
        setTimeout(() => setGoFlash(false), 700);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state]);

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
      // ensure overlay is hidden when a new round is queued
      setShowFx(false);
    }, afterMs);
  }

  async function startGame(newBetInBase: number) {
    if (newBetInBase > balance) {
      alert('Not enough balance!');
      return;
    }
    setBetInBase(newBetInBase);
    setLastWin(0);
    setCashedOutAt(undefined);
    resetGraph();
    setState('countdown');
    await placeBet(user.uid, newBetInBase, 1, 'crash');
    await refreshBalance();
  }

  async function cashOut() {
    if (!canCashOut) return;
    const m = Math.max(1, currentMult);
    const payoutBase = Math.round(betInBase * m);

    let finalAmount = payoutBase;
    if (payoutBase > 0) {
      finalAmount = await applyBooster(payoutBase);
      setLastWin(finalAmount);
    }

    setCashedOutAt(m);
    setState('cashed-out');

    await recordWinTx(user.uid, finalAmount, 1, 'crash');
    await refreshBalance();

    // [show win overlay
    setFxType('win');
    setFxAmount(finalAmount / 100);
    setShowFx(true);

    queueNextRound();
  }

  useEffect(() => {
    if (state !== 'crashed') return;
    (async () => {
      await applyBooster(0);
      await recordLossTx(user.uid, betInBase, 1, 'crash');
      await refreshBalance();
      setFxType('loss');
      setFxAmount(betInBase / 100);
      setShowFx(true);

      queueNextRound();
    })();
  }, [state]);

  // Graph 
  const graph = useMemo(() => {
    const W = 1000;
    const H = 500;

    const displayPoints = state === 'idle' || state === 'countdown' ? [{ x: 0, y: 1 }] : points;

    const maxX = Math.max(12, displayPoints[displayPoints.length - 1]?.x ?? 12);

    const includeCrashInMax = (state === 'crashed' || state === 'cashed-out') && crashPoint != null;

    const measuredYs = displayPoints.map((p) => p.y);
    const fallback = 3;
    const maxY = Math.max(fallback, ...measuredYs, includeCrashInMax ? crashPoint! : 1);

    const mapX = (x: number) => {
      // avoid div by zero if maxX is zero
      const denom = maxX === 0 ? 1 : maxX;
      return (x / denom) * (W - 80) + 40;
    };
    const mapY = (y: number) => {
      // ensure maxY>1 to make mapping valid — fallback to minimal span
      const span = Math.max(1.0001, maxY - 1);
      return H - ((y - 1) / span) * (H - 80) - 40;
    };

    const poly = displayPoints.map((p) => `${mapX(p.x)},${mapY(p.y)}`).join(' ');
    const yTicks = [1, 1.5, 2, 2.5, 3, 4, 5, 7, 10].filter((v) => v <= maxY);

    return { W, H, poly, mapX, mapY, yTicks, maxY, displayPoints };
  }, [points, crashPoint, state]);

  return (
    <BackgroundLayout gameId='Crash'>
      <CurrencyProvider base='NZD' DefaultCurrency='NZD'>
        <div className='crash-game-container'>
          <div className='crash-content'>
            {/* Top Section - Crash Graph */}
            <div className='crash-graph-section'>
              <div className='crash-multiplier-display'>{fmtMult(Math.max(1, currentMult))}</div>

              {state === 'countdown' && (
                <div key={`count-${countdown}`} className='crash-countdown overlay-text'>
                  {countdown}
                </div>
              )}
              {goFlash && <div className='crash-go-flash overlay-text'>GO!</div>}

              <svg
                ref={svgRef}
                viewBox={`0 0 ${graph.W} ${graph.H}`}
                width='100%'
                height='100%'
                className='crash-graph'
                preserveAspectRatio='xMidYMid meet'
              >
                <defs>
                  <linearGradient id='bgGrad' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='#0f172a' />
                    <stop offset='100%' stopColor='#0b1020' />
                  </linearGradient>

                  <linearGradient id='crashLine' x1='0' y1='0' x2='1' y2='0'>
                    <stop offset='0' stopColor='#22d3ee' />
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
                </defs>

                <rect x='0' y='0' width={graph.W} height={graph.H} fill='url(#bgGrad)' />

                {graph.yTicks.map((v, i) => {
                  const y = graph.mapY(v);
                  return (
                    <g key={i}>
                      <line x1={40} x2={graph.W - 40} y1={y} y2={y} stroke='#172036' />
                      <text x={graph.W - 30} y={y - 6} fill='#a3a3a3' fontSize={12}>
                        {v.toFixed(1)}x
                      </text>
                    </g>
                  );
                })}

                {/* Graph Line */}
                {(state === 'in-progress' || state === 'crashed' || state === 'cashed-out') && (
                  <polyline
                    fill='none'
                    stroke='url(#crashLine)'
                    strokeWidth={6}
                    filter='url(#glow)'
                    points={graph.poly}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                )}

                {((state === 'in-progress' || state === 'crashed' || state === 'cashed-out') &&
                  graph.displayPoints.length > 0 &&
                  (() => {
                    const last = graph.displayPoints[graph.displayPoints.length - 1];
                    if (!last) return null;
                    const cx = graph.mapX(last.x);
                    const cy = graph.mapY(last.y);
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={8} fill='#ffffff' opacity='0.95' />
                        <circle cx={cx} cy={cy} r={16} fill='#ffffff' opacity='0.15' />
                      </g>
                    );
                  })()) ||
                  null}
              </svg>

              {/*  overlay, above the graph */}
              <ResultFX
                show={showFx}
                type={fxType}
                amount={fxAmount} // already dollars
                currency='NZ$'
                durationMs={2200}
                align='center'
                onDone={() => setShowFx(false)}
              />
            </div>

            <div className='crash-title'></div>

            {/* Bottom Section - Status & Info Panels */}
            <div className='crash-controls-section'>
              {/* Status Panel */}
              <div className='crash-status-panel'>
                <div className='crash-status'>
                  {state === 'idle' && (
                    <div className='status-idle'>Place your bet and watch the multiplier grow!</div>
                  )}
                  {state === 'countdown' && (
                    <div className='status-countdown'>Round starting in {countdown}...</div>
                  )}
                  {state === 'in-progress' && (
                    <div className='status-in-progress'>Press to Cash Out</div>
                  )}
                  {(state === 'crashed' || state === 'cashed-out') && (
                    <div className={`status-result ${state === 'cashed-out' ? 'win' : 'loss'}`}>
                      {state === 'cashed-out'
                        ? 'Successfully cashed out!'
                        : `Crashed at ${fmtMult(crashPoint ?? currentMult)}`}
                    </div>
                  )}
                </div>

                {state !== 'idle' && (
                  <button
                    onClick={cashOut}
                    disabled={!canCashOut}
                    className={`crash-cashout-button ${!canCashOut ? 'disabled' : ''}`}
                  >
                    {canCashOut ? `Cash Out ${fmtMult(currentMult)}` : 'Cash Out'}
                  </button>
                )}
              </div>

              {/* Info Panel */}
              <div className='crash-info-panel'>
                <div className='game-info'>
                  <h3>Game Information</h3>
                  <div className='info-row'>
                    <span className='info-label'>Current Bet:</span>
                    <span className='info-value'>${bet.toFixed(2)}</span>
                  </div>
                  <div className='info-row'>
                    <span className='info-label'>Potential Win:</span>
                    <span className='info-value'>
                      ${((betInBase * currentMult) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className='info-row'>
                    <span className='info-label'>Round:</span>
                    <span className='info-value'>#{roundId}</span>
                  </div>
                  <div className='info-row'>
                    <span className='info-label'>Status:</span>
                    <span className='info-value'>
                      {state === 'idle' && 'Waiting'}
                      {state === 'countdown' && 'Starting'}
                      {state === 'in-progress' && 'Live'}
                      {state === 'crashed' && 'Crashed'}
                      {state === 'cashed-out' && 'Cashed Out'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bet Controls */}
          <div className='crash-bet-controls'>
            <BetControls
              balance={balance}
              bet={bet}
              setBet={setBet}
              startGame={startGame}
              disabled={state !== 'idle'}
            />
          </div>
        </div>
      </CurrencyProvider>
    </BackgroundLayout>
  );
}
