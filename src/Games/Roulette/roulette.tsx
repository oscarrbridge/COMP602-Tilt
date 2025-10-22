import { useState, useEffect } from 'react';
import './roulette.css';
import BackgroundLayout from '@components/BackgroundLayout/BackgroundLayout';
import { placeBet, recordWinTx, recordLossTx } from '@backend/transactions';
import { useUser } from '@backend/firebase/UserFunctions';
import { CurrencyProvider } from '@components/CurrencySwitcher/currencyswitcher';
import BetControls from '../BetControls';

// Game states
type Status = 'Idle' | 'Spinning' | 'Result';
type BetType = 'Red' | 'Black' | 'Odd' | 'Even' | 'Number';

// European wheel ordering (0..36)
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RED_SET = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

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
  // ensure positive sweep
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p3 = polarToCartesian(cx, cy, rInner, endAngle);
  const p4 = polarToCartesian(cx, cy, rInner, startAngle);

  // outer arc clockwise (sweep-flag = 1), inner return arc counter-clockwise (sweep-flag = 0)
  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${p4.x} ${p4.y} Z`;
}

export default function Roulette() {
  const { user, balance, refreshBalance } = useUser(); // cents
  const [bet, setBet] = useState(10); // displayed dollars
  const [, setBetInBase] = useState(0); // cents
  const [status, setStatus] = useState<Status>('Idle');
  const [selectedBet, setSelectedBet] = useState<BetType>('Red');
  const [chosenNumber, setChosenNumber] = useState<number | null>(null);
  const [resultNumber, setResultNumber] = useState<number | null>(null);
  const [payout, setPayout] = useState(0);
  const [rotationDeg, setRotationDeg] = useState(0); // degrees applied to wheel <g>

  // wheel visual params
  const SLICE_COUNT = WHEEL_NUMBERS.length;
  const ANGLE_PER = 360 / SLICE_COUNT;

  const startGame = async (newBetInBase: number) => {
    // newBetInBase is in cents
    if (newBetInBase > balance) {
      alert('Not enough balance!');
      return;
    }

    setBetInBase(newBetInBase);
    setResultNumber(null);
    setPayout(0);
    setStatus('Spinning');

    if (!user) return;
    await placeBet(user.uid, newBetInBase, 1, 'roulette');

    // pick the roll result (0..36) - you can also derive from server for provable fairness
    const roll = WHEEL_NUMBERS[Math.floor(Math.random() * SLICE_COUNT)];

    // which index on the physical wheel?
    const idx = WHEEL_NUMBERS.indexOf(roll);
    const sliceCenterAngle = idx * ANGLE_PER + ANGLE_PER / 2; // degrees (clockwise from top)

    // spin logic: a number of full spins + align the slice center with the top pointer
    const fullSpins = 6; // tune for visual drama (>= 3)
    // to place centerAngle at pointer (top), rotation should be: fullSpins*360 - sliceCenterAngle (+ small jitter)
    const jitter = (Math.random() - 0.5) * (ANGLE_PER * 0.6); // subtle randomness within the slice
    const targetRotation = fullSpins * 360 - sliceCenterAngle + jitter;

    // apply rotation (CSS transition handles easing)
    // setTimeout used to ensure the transition triggers reliably
    requestAnimationFrame(() => setRotationDeg(targetRotation));

    // wait for animation to finish (match CSS transition duration)
    const ANIM_MS = 5200;
    setTimeout(() => {
      setResultNumber(roll);
      handleResult(roll, newBetInBase);
    }, ANIM_MS);
  };

  const handleResult = async (roll: number, stakeCents: number) => {
    // stakeCents already in cents
    let multiplier = 0;
    if (selectedBet === 'Red' && RED_SET.has(roll)) multiplier = 2;
    if (selectedBet === 'Black' && roll !== 0 && !RED_SET.has(roll)) multiplier = 2;
    if (selectedBet === 'Odd' && roll % 2 === 1) multiplier = 2;
    if (selectedBet === 'Even' && roll !== 0 && roll % 2 === 0) multiplier = 2;
    if (selectedBet === 'Number' && roll === chosenNumber) multiplier = 36;

    if (multiplier > 0) {
      const winnings = Math.floor(stakeCents * multiplier);
      setPayout(winnings);
      if (!user) return;
      await recordWinTx(user.uid, winnings, 1, 'roulette');
    } else {
      setPayout(0);
      if (!user) return;
      await recordLossTx(user.uid, stakeCents, 1, 'roulette');
    }

    await refreshBalance();
    setStatus('Result');
  };

  function reset() {
    setResultNumber(null);
    setPayout(0);
    setStatus('Idle');
    setRotationDeg(0);
  }

  useEffect(() => {
    if (status === 'Result') {
      const timer = setTimeout(() => reset(), 6000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // svg sizes
  const size = 420;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 8;
  const rInner = rOuter - 86;
  const rLabel = (rOuter + rInner) / 2;

  const numberColors: Record<number, string> = {
    0: 'green',
    1: 'red',
    2: 'black',
    3: 'red',
    4: 'black',
    5: 'red',
    6: 'black',
    7: 'red',
    8: 'black',
    9: 'red',
    10: 'black',
    11: 'black',
    12: 'red',
    13: 'black',
    14: 'red',
    15: 'black',
    16: 'red',
    17: 'black',
    18: 'red',
    19: 'red',
    20: 'black',
    21: 'red',
    22: 'black',
    23: 'red',
    24: 'black',
    25: 'red',
    26: 'black',
    27: 'red',
    28: 'black',
    29: 'black',
    30: 'red',
    31: 'black',
    32: 'red',
    33: 'black',
    34: 'red',
    35: 'black',
    36: 'red',
  };

  return (
    <BackgroundLayout>
      <CurrencyProvider base='NZD' DefaultCurrency='NZD'>
        <div className='casino-container'>
          <div className='roulette-app'>
            <div className='roulette-panel'>
              {status === 'Idle' && (
                <BetControls balance={balance} bet={bet} setBet={setBet} startGame={startGame} />
              )}

              <div className='betting-box'>
                <button
                  className={`bet-btn ${selectedBet === 'Red' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedBet('Red');
                    setChosenNumber(null); // clear custom number highlight
                  }}
                  disabled={status === 'Spinning'}
                >
                  Red
                </button>

                <button
                  className={`bet-btn ${selectedBet === 'Black' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedBet('Black');
                    setChosenNumber(null); // clear custom number highlight
                  }}
                  disabled={status === 'Spinning'}
                >
                  Black
                </button>

                <button
                  className={`bet-btn ${selectedBet === 'Number' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedBet('Number');
                    setChosenNumber(0);
                  }}
                  disabled={status === 'Spinning'}
                >
                  Custom
                </button>

                <button
                  className={`bet-btn ${selectedBet === 'Odd' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedBet('Odd');
                    setChosenNumber(null); // clear custom number highlight
                  }}
                  disabled={status === 'Spinning'}
                >
                  Odd
                </button>

                <button
                  className={`bet-btn ${selectedBet === 'Even' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedBet('Even');
                    setChosenNumber(null); // clear custom number highlight
                  }}
                  disabled={status === 'Spinning'}
                >
                  Even
                </button>

                <div className='number-grid-wrapper'>
                  {/* Zero row */}
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

                  {/* Numbers 1–36 in 3 rows x 12 columns */}
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
            </div>

            <div className='wheel-area'>
              <div className='wheel-viewport'>
                <svg
                  className='wheel-svg'
                  viewBox={`0 0 ${size} ${size}`}
                  width={size}
                  height={size}
                  aria-hidden={false}
                >
                  {/* rotating group */}
                  <g
                    className='wheel-g'
                    style={{
                      transform: `rotate(${rotationDeg}deg)`,
                      transformOrigin: `${cx}px ${cy}px`,
                    }}
                  >
                    {/* outer rim */}
                    <circle cx={cx} cy={cy} r={rOuter + 6} className='rim' />

                    {/* slices */}
                    {WHEEL_NUMBERS.map((num, i) => {
                      const start = i * ANGLE_PER;
                      const end = start + ANGLE_PER;
                      const pathD = wedgePath(cx, cy, rOuter, rInner, start, end);
                      const centerAngle = start + ANGLE_PER / 2;
                      const labelPos = polarToCartesian(cx, cy, rLabel, centerAngle);
                      const isRed = num !== 0 && RED_SET.has(num);
                      const fillClass = num === 0 ? 'green' : isRed ? 'red' : 'black';

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

                    {/* hub / center */}
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

                {/* fixed pointer */}
                <div className='pointer' aria-hidden='true' />
              </div>
            </div>

            {status == 'Result' && (
              <div className='roulette-results'>
                {resultNumber !== null && (
                  <span className='roulette-result'>
                    Result: {resultNumber}{' '}
                    {resultNumber === 0 ? 'Green' : RED_SET.has(resultNumber) ? 'Red' : 'Black'}
                  </span>
                )}
                {payout > 0 ? (
                  <span className='roulette-result win'>You won: ${(payout / 100).toFixed(2)}</span>
                ) : status === 'Result' ? (
                  <span className='roulette-result lose'>No win</span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </CurrencyProvider>
    </BackgroundLayout>
  );
}
