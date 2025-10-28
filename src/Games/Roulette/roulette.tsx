import React, { useState, useEffect } from 'react';
import './roulette.css';
import BackgroundLayout from '../../components/BackgroundLayout/BackgroundLayout';
import { placeBet, recordWinTx, recordLossTx } from '../../../Backend/transactions';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import { CurrencyProvider } from '../../components/CurrencySwitcher/currencyswitcher.tsx';
import BetControls from '../BetControls/BetControls.tsx';
import useCurrentBooster from '../../hooks/useCurrentBooster.tsx';
import ResultFX from '../../components/Animations/Animations'; // [FX] add

// Game states
type Status = 'Idle' | 'Spinning' | 'Result';
type BetType = 'Blue' | 'Black' | 'Odd' | 'Even' | 'Number';

// European wheel ordering (0..36)
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const BLUE_SET = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

// Helpers to build SVG wedge (donut slice)
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function wedgePath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number
) {
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p3 = polarToCartesian(cx, cy, rInner, endAngle);
  const p4 = polarToCartesian(cx, cy, rInner, startAngle);

  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${p4.x} ${p4.y} Z`;
}

export default function Roulette(): JSX.Element {
  const { user, balance, refreshBalance } = useUser();
  const { applyBooster } = useCurrentBooster();
  const [bet, setBet] = useState(2.0);
  const [betInBase, setBetInBase] = useState(0);
  const [status, setStatus] = useState<Status>('Idle');
  const [selectedBet, setSelectedBet] = useState<BetType>('Blue');
  const [chosenNumber, setChosenNumber] = useState<number | null>(null);
  const [resultNumber, setResultNumber] = useState<number | null>(null);
  const [payout, setPayout] = useState(0);
  const [lastWin, setLastWin] = useState(0);
  const [rotationDeg, setRotationDeg] = useState(0);

  // [FX] overlay state
  const [showFx, setShowFx] = useState(false);
  const [fxType, setFxType] = useState<'win' | 'loss'>('win');
  const [fxAmount, setFxAmount] = useState<number | undefined>(undefined);

  const SLICE_COUNT = WHEEL_NUMBERS.length;
  const ANGLE_PER = 360 / SLICE_COUNT;

  const startGame = async (newBetInBase: number) => {
    if (newBetInBase > balance) {
      alert('Not enough balance!');
      return;
    }

    setBetInBase(newBetInBase);
    setResultNumber(null);
    setPayout(0);
    setLastWin(0);
    setStatus('Spinning');

    await placeBet(user.uid, newBetInBase, 1, 'roulette');
    await refreshBalance();

    const roll = WHEEL_NUMBERS[Math.floor(Math.random() * SLICE_COUNT)];
    const idx = WHEEL_NUMBERS.indexOf(roll);
    const sliceCenterAngle = idx * ANGLE_PER + ANGLE_PER / 2;
    const fullSpins = 6;
    const jitter = (Math.random() - 0.5) * (ANGLE_PER * 0.6);
    const targetRotation = fullSpins * 360 - sliceCenterAngle + jitter;

    requestAnimationFrame(() => setRotationDeg(targetRotation));

    const ANIM_MS = 5200;
    setTimeout(() => {
      setResultNumber(roll);
      handleResult(roll, newBetInBase);
    }, ANIM_MS);
  };

  const handleResult = async (roll: number, stakeCents: number) => {
    let multiplier = 0;
    if (selectedBet === 'Blue' && BLUE_SET.has(roll)) multiplier = 2;
    if (selectedBet === 'Black' && roll !== 0 && !BLUE_SET.has(roll)) multiplier = 2;
    if (selectedBet === 'Odd' && roll % 2 === 1) multiplier = 2;
    if (selectedBet === 'Even' && roll !== 0 && roll % 2 === 0) multiplier = 2;
    if (selectedBet === 'Number' && roll === chosenNumber) multiplier = 36;

    let finalAmount = 0;
    if (multiplier > 0) {
      const winnings = Math.floor(stakeCents * multiplier);
      finalAmount = await applyBooster(winnings);
      setPayout(winnings);
      setLastWin(finalAmount);
      await recordWinTx(user.uid, finalAmount, 1, 'roulette');

      // [FX] win overlay (amount in dollars)
      setFxType('win');
      setFxAmount(finalAmount / 100);
      setShowFx(true);
    } else {
      await applyBooster(0);
      setPayout(0);
      setLastWin(0);
      await recordLossTx(user.uid, stakeCents, 1, 'roulette');

      // [FX] loss overlay (bet shown in dollars)
      setFxType('loss');
      setFxAmount(stakeCents / 100);
      setShowFx(true);
    }

    await refreshBalance();
    setStatus('Result');
  };

  function reset() {
    setResultNumber(null);
    setPayout(0);
    setLastWin(0);
    setStatus('Idle');
    setRotationDeg(0);
    // [FX] let the overlay auto-hide via onDone; no hard reset here
  }

  useEffect(() => {
    if (status === 'Result') {
      const timer = setTimeout(() => reset(), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const size = 420;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 8;
  const rInner = rOuter - 86;
  const rLabel = (rOuter + rInner) / 2;

  const numberColors = {
    0: 'teal',
    1: 'blue',
    2: 'black',
    3: 'blue',
    4: 'black',
    5: 'blue',
    6: 'black',
    7: 'blue',
    8: 'black',
    9: 'blue',
    10: 'black',
    11: 'blue',
    12: 'blue',
    13: 'black',
    14: 'blue',
    15: 'black',
    16: 'blue',
    17: 'black',
    18: 'blue',
    19: 'blue',
    20: 'black',
    21: 'blue',
    22: 'black',
    23: 'blue',
    24: 'black',
    25: 'blue',
    26: 'black',
    27: 'blue',
    28: 'black',
    29: 'black',
    30: 'blue',
    31: 'black',
    32: 'blue',
    33: 'black',
    34: 'blue',
    35: 'black',
    36: 'blue',
  };

  return (
    <BackgroundLayout gameId='Roulette'>
      <CurrencyProvider base='NZD' DefaultCurrency='NZD'>
        <div className='roulette-game-container'>
          <div className='roulette-content'>
            {/* Left Panel - Betting Controls */}
            <div className='roulette-controls-panel'>
              <div className='bet-type-selector'>
                <h3>Bet Type</h3>
                <div className='bet-type-buttons'>
                  <button
                    className={`bet-type-btn ${selectedBet === 'Blue' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedBet('Blue');
                      setChosenNumber(null);
                    }}
                    disabled={status === 'Spinning'}
                  >
                    Blue
                  </button>
                  <button
                    className={`bet-type-btn ${selectedBet === 'Black' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedBet('Black');
                      setChosenNumber(null);
                    }}
                    disabled={status === 'Spinning'}
                  >
                    Black
                  </button>
                  <button
                    className={`bet-type-btn ${selectedBet === 'Odd' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedBet('Odd');
                      setChosenNumber(null);
                    }}
                    disabled={status === 'Spinning'}
                  >
                    Odd
                  </button>
                  <button
                    className={`bet-type-btn ${selectedBet === 'Even' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedBet('Even');
                      setChosenNumber(null);
                    }}
                    disabled={status === 'Spinning'}
                  >
                    Even
                  </button>
                  <button
                    className={`bet-type-btn ${selectedBet === 'Number' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedBet('Number');
                      setChosenNumber(0);
                    }}
                    disabled={status === 'Spinning'}
                  >
                    Number
                  </button>
                </div>
              </div>

              {/* Number Grid */}
              <div className='number-selection'>
                <h3>Select Number</h3>
                <div className='number-grid-container'>
                  <div className='zero-row'>
                    <div
                      className={`number-item green zero ${chosenNumber === 0 ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedBet('Number');
                        setChosenNumber(0);
                      }}
                    >
                      0
                    </div>
                  </div>
                  <div className='number-grid'>
                    {Array.from({ length: 36 }, (_, i) => {
                      const num = i + 1;
                      return (
                        <div
                          key={num}
                          className={`number-item ${numberColors[num]} ${chosenNumber === num ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedBet('Number');
                            setChosenNumber(num);
                          }}
                        >
                          {num}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Game Info */}
              <div className='roulette-game-info'>
                <div className='roulette-info-row'>
                  <span className='roulette-info-label'>Selected Bet:</span>
                  <span className='roulette-info-value'>
                    {selectedBet === 'Number' && chosenNumber !== null
                      ? `${chosenNumber}`
                      : selectedBet}
                  </span>
                </div>
                <div className='roulette-info-row'>
                  <span className='roulette-info-label'>Multiplier:</span>
                  <span className='roulette-info-value'>
                    {selectedBet === 'Number' ? '36x' : '2x'}
                  </span>
                </div>
                <div className='roulette-info-row'>
                  <span className='roulette-info-label'>Potential Win:</span>
                  <span className='roulette-info-value'>
                    ${((betInBase * (selectedBet === 'Number' ? 36 : 2)) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Center - Wheel */}
            <div className='roulette-wheel-container'>
              <div className='wheel-viewport'>
                <svg className='wheel-svg' viewBox={`0 0 ${size} ${size}`} width={400} height={400}>
                  <g
                    className='wheel-g'
                    style={{
                      transform: `rotate(${rotationDeg}deg)`,
                      transformOrigin: `${cx}px ${cy}px`,
                    }}
                  >
                    <circle cx={cx} cy={cy} r={rOuter + 6} className='rim' />
                    {WHEEL_NUMBERS.map((num, i) => {
                      const start = i * ANGLE_PER;
                      const end = start + ANGLE_PER;
                      const pathD = wedgePath(cx, cy, rOuter, rInner, start, end);
                      const centerAngle = start + ANGLE_PER / 2;
                      const labelPos = polarToCartesian(cx, cy, rLabel, centerAngle);
                      const isBlue = num !== 0 && BLUE_SET.has(num);
                      const fillClass = num === 0 ? 'teal' : isBlue ? 'blue' : 'black';

                      return (
                        <g key={i}>
                          <path d={pathD} className={`slice ${fillClass}`} />
                          <text
                            x={labelPos.x}
                            y={labelPos.y}
                            className={`slot-label ${fillClass}`}
                            transform={`rotate(${centerAngle}, ${labelPos.x}, ${labelPos.y})`}
                          >
                            {num}
                          </text>
                        </g>
                      );
                    })}
                    <circle cx={cx} cy={cy} r={rInner - 18} className='hub' />
                    <text
                      x={cx}
                      y={cy}
                      className='hub-text'
                      textAnchor='middle'
                      dominantBaseline='middle'
                    >
                      ROULETTE
                    </text>
                  </g>
                </svg>
                <div className='pointer' />
              </div>

              {/* Status Display */}
              <div className='roulette-status'>
                {status === 'Idle' && (
                  <div className='status-idle'>Select your bet and place your wager!</div>
                )}
                {status === 'Spinning' && (
                  <div className='status-spinning'>The wheel is spinning...</div>
                )}
                {status === 'Result' && resultNumber !== null && (
                  <div className={`status-result ${payout > 0 ? 'win' : 'loss'}`}>
                    {payout > 0 ? (
                      <span className='win-text'>
                        Winner! {resultNumber}{' '}
                        {resultNumber === 0
                          ? 'Teal'
                          : BLUE_SET.has(resultNumber)
                            ? 'Blue'
                            : 'Black'}
                      </span>
                    ) : (
                      <span className='loss-text'>
                        Lost! {resultNumber}{' '}
                        {resultNumber === 0
                          ? 'Teal'
                          : BLUE_SET.has(resultNumber)
                            ? 'Blue'
                            : 'Black'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Win/Loss Display */}
              {status === 'Result' && (
                <div className='roulette-win-display'>
                  {lastWin > 0 ? (
                    <span className='win-amount'>+ ${(lastWin / 100).toFixed(2)}</span>
                  ) : (
                    <span className='loss-amount'>- ${(betInBase / 100).toFixed(2)}</span>
                  )}
                </div>
              )}

              {/* [FX] Overlay */}
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
          </div>

          {/* Bet Controls */}
          <div className='roulette-bet-controls'>
            <BetControls
              balance={balance}
              bet={bet}
              setBet={setBet}
              startGame={startGame}
              disabled={status === 'Spinning'}
            />
          </div>
        </div>
      </CurrencyProvider>
    </BackgroundLayout>
  );
}
