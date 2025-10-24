import { useEffect, useMemo, useRef, useState } from 'react';
import './Blackjack.css';
import BackgroundLayout from '../../components/BackgroundLayout/BackgroundLayout';
import { placeBet, recordWinTx, recordLossTx } from '../../../Backend/transactions';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import { CurrencyProvider } from '../../components/CurrencySwitcher/currencyswitcher.tsx';
import BetControls from '../BetControls.tsx';

type Card = { rank: string; suit: '♠' | '♥' | '♦' | '♣' };
const suits: Card['suit'][] = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

const getCard = (): Card => {
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const rank = ranks[Math.floor(Math.random() * ranks.length)];
  return { rank, suit };
};

const applyBooster = async (x: number) => x;

const cardValue = (c: Card) => {
  if (c.rank === 'A') return 11;
  if (c.rank === 'J' || c.rank === 'Q' || c.rank === 'K') return 10;
  return parseInt(c.rank, 10);
};

const calcScore = (cards: Card[]) => {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
};

export default function Blackjack() {
  const { user, balance, refreshBalance } = useUser();

  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [bet, setBet] = useState<number>(10);
  const [betInBase, setBetInBase] = useState<number>(0);

  const [roundInProgress, setRoundInProgress] = useState(false);
  const [isDealing, setIsDealing] = useState(false);
  const [dealerRevealed, setDealerRevealed] = useState(false);
  const [roundResult, setRoundResult] = useState<'' | 'win' | 'loss' | 'tie'>('');
  const [lastWin, setLastWin] = useState<number>(0);
  const [animNonce, setAnimNonce] = useState<number>(0); // to retrigger CSS keyframes

  // prevent spamming buttons during animations
  const uiLocked = isDealing;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const firstDealDone = useRef(false);

  const dealerDisplay = useMemo(() => {
    if (!roundInProgress) return calcScore(dealer); // show full at end
    if (dealer.length === 0) return '??';
    // show first card and hide the hole card
    return `${cardValue(dealer[0])} + ??`;
  }, [roundInProgress, dealer]);

  const startGame = async (newBetInBase: number) => {
    if (newBetInBase > balance) {
      alert('Insufficient balance for this bet.');
      return;
    }

    setRoundResult('');
    setLastWin(0);
    setDealerRevealed(false);
    setPlayer([]);
    setDealer([]);
    setRoundInProgress(true);
    setIsDealing(true);
    setAnimNonce((n) => n + 1);
    setBetInBase(newBetInBase);

    await placeBet(user.uid, newBetInBase, 1, 'blackjack');
    await refreshBalance();

    // Dealing sequence (P D P D)
    const p1 = getCard();
    const d1 = getCard();
    const p2 = getCard();
    const d2 = getCard();

    // animate in with little gaps
    setPlayer([p1]);
    await sleep(220);
    setDealer([d1]);
    await sleep(220);
    setPlayer([p1, p2]);
    await sleep(220);
    setDealer([d1, d2]);

    await sleep(150);
    setIsDealing(false);
    firstDealDone.current = true;
  };

  const hit = async () => {
    if (!roundInProgress || uiLocked) return;
    setIsDealing(true);
    const c = getCard();
    await sleep(100);
    setPlayer((prev) => [...prev, c]);
    await sleep(260);
    setIsDealing(false);

    // bust check
    if (calcScore([...player, c]) > 21) {
      setRoundInProgress(false);
      setRoundResult('loss');
      await recordLossTx(user.uid, betInBase, 1, 'blackjack');
      await refreshBalance();
    }
  };

  const stand = async () => {
    if (!roundInProgress || uiLocked) return;

    setRoundInProgress(false);
    setDealerRevealed(true);
    setIsDealing(true);

    await sleep(500); // dramatic flip time (CSS flip handles visuals)

    // Dealer draws to soft 17+
    let d = [...dealer];
    while (calcScore(d) < 17) {
      d.push(getCard());
      setDealer([...d]);
      await sleep(500);
    }

    const ps = calcScore(player);
    const ds = calcScore(d);

    let result: 'win' | 'loss' | 'tie' = 'tie';
    if (ps > 21 || (ds <= 21 && ds > ps)) result = 'loss';
    else if (ps === ds) result = 'tie';
    else result = 'win';

    if (result === 'loss') {
      setRoundResult('loss');
      await applyBooster?.(0);
      await recordLossTx(user.uid, betInBase, 1, 'blackjack');
      await refreshBalance();
    } else if (result === 'tie') {
      setRoundResult('tie');
      // return bet: record as win of betInBase to neutralize?
      await recordWinTx(user.uid, betInBase, 1, 'blackjack');
      await refreshBalance();
    } else {
      // standard 1:1 payout; boosters apply here
      const rawWin = betInBase * 2;
      const boosted = await applyBooster?.(rawWin);
      setLastWin(boosted - betInBase); // display pure profit
      setRoundResult('win');
      await recordWinTx(user.uid, boosted, 1, 'blackjack');
      await refreshBalance();
    }

    await sleep(300);
    setIsDealing(false);
  };

  // Accessibility: allow ENTER to Hit, SPACE to Stand while in-round
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!roundInProgress || uiLocked) return;
      if (e.key === 'Enter') hit();
      if (e.key === ' ') {
        e.preventDefault();
        stand();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [roundInProgress, uiLocked, player, dealer]);

  return (
    <BackgroundLayout>
      <div className='bj-root' data-anim={animNonce}>
        {/* Title */}
        <header className='bj-header'>
          <h1 className='bj-title'>
            <span className='bj-suit'>♠</span> BLACKJACK <span className='bj-suit'>♣</span>
          </h1>
        </header>

        {/* Table */}
        <section className={`bj-table ${!roundInProgress && !isDealing ? 'idle-hover' : ''}`}>
          {/* Dealer */}
          <div className='bj-hand'>
            <h2 className='bj-hand-title'>
              Dealer <span className='bj-score'>({dealerDisplay})</span>
            </h2>
            <div className='bj-cards'>
              {dealer.map((c, i) => (
                <PlayingCard
                  key={`d-${i}`}
                  card={c}
                  hidden={i === 1 && roundInProgress && !dealerRevealed}
                  owner='dealer'
                  index={i}
                />
              ))}
            </div>
          </div>

          {/* Player */}
          <div className='bj-hand'>
            <h2 className='bj-hand-title'>
              You <span className='bj-score'>({calcScore(player) || 0})</span>
            </h2>
            <div className='bj-cards'>
              {player.map((c, i) => (
                <PlayingCard key={`p-${i}`} card={c} owner='player' index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Controls */}
        {roundInProgress ? (
          <div className='bj-ctrl'>
            <button className='bj-btn' onClick={hit} disabled={uiLocked}>
              Hit
            </button>
            <button className='bj-btn bj-btn-primary' onClick={stand} disabled={uiLocked}>
              Stand
            </button>
          </div>
        ) : (
          <div className='game-bet-controls'>
            <CurrencyProvider base='NZD' DefaultCurrency='NZD'>
              <BetControls
                balance={balance}
                bet={bet}
                setBet={setBet}
                startGame={startGame}
                disabled={isDealing}
              />
            </CurrencyProvider>
          </div>
        )}

        {/* Win/Loss/Tie Display */}
        <div
          className={`bj-result ${
            roundResult === 'win'
              ? 'win-amount'
              : roundResult === 'loss'
                ? 'loss-amount'
                : roundResult === 'tie'
                  ? 'tie-amount'
                  : 'no-result'
          }`}
          aria-live='polite'
        >
          {roundResult === 'win'
            ? `+ $${(lastWin || bet).toFixed(2)}`
            : roundResult === 'loss'
              ? `- $${bet.toFixed(2)}`
              : roundResult === 'tie'
                ? 'Tie'
                : ''}
        </div>
      </div>
    </BackgroundLayout>
  );
}

/** ---- Presentational playing card with deal-in, hover, and flip for hole-card ---- */
function PlayingCard({
  card,
  hidden = false,
  owner,
  index,
}: {
  card: Card;
  hidden?: boolean;
  owner: 'dealer' | 'player';
  index: number;
}) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  return (
    <div
      className={`pc-wrap dealt-${owner}`}
      style={{ animationDelay: `${index * 90}ms` }}
      aria-hidden={false}
    >
      <div className={`pc ${hidden ? 'pc-hidden' : ''}`}>
        <div className={`pc-face pc-front ${isRed ? 'pc-red' : ''}`}>
          <span className='pc-rank'>{card.rank}</span>
          <span className='pc-suit'>{card.suit}</span>
        </div>
        <div className='pc-face pc-back' />
      </div>
    </div>
  );
}
