// ---- imports (top of file) ----
import { useEffect, useMemo, useState } from 'react';
import './Blackjack.css';
import BackgroundLayout from '../../components/BackgroundLayout/BackgroundLayout';
import { placeBet, recordWinTx, recordLossTx } from '../../../Backend/transactions';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import { CurrencyProvider } from '../../components/CurrencySwitcher/currencyswitcher.tsx';
import BetControls from '../BetControls/BetControls.tsx';

type Card = { rank: string; suit: string; id: string };

const suits = ['♠', '♥', '♦', '♣'] as const;
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
const isRed = (suit: string) => suit === '♥' || suit === '♦';

const getCard = (): Card => {
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const rank = ranks[Math.floor(Math.random() * ranks.length)];
  // unique-ish id so animations don’t recycle keys during fast rounds
  return { rank, suit, id: `${rank}${suit}-${Math.random().toString(36).slice(2, 8)}` };
};

const cardValue = (card: Card) => {
  if (card.rank === 'A') return 11;
  if (card.rank === 'K' || card.rank === 'Q' || card.rank === 'J') return 10;
  return parseInt(card.rank, 10);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Blackjack() {
  const { user, balance, refreshBalance } = useUser();

  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);

  const [bet, setBet] = useState<number>(10);
  const [betInBase, setBetInBase] = useState<number>(0);

  const [roundInProgress, setRoundInProgress] = useState(false);
  const [isDealing, setIsDealing] = useState(false);
  const [dealerRevealed, setDealerRevealed] = useState(false);

  const [result, setResult] = useState<'' | 'win' | 'loss' | 'tie'>('');
  const [lastWin, setLastWin] = useState<number>(0);

  // block rapid spam on Hit/Stand during animations
  const controlsLocked = isDealing || !roundInProgress;

  // scores (handle soft Aces)
  const scoreOf = (cards: Card[]) => {
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

  const playerScore = useMemo(() => scoreOf(player), [player]);
  const dealerScore = useMemo(() => scoreOf(dealer), [dealer]);

  const dealerVisibleScore = useMemo(() => {
    if (!roundInProgress) return dealerScore; // show full when round done
    if (dealer.length <= 0) return '??';
    // show first card + ? for the hole card during round
    return `${cardValue(dealer[0])} + ??`;
  }, [roundInProgress, dealer, dealerScore]);

  // deal-in sequence with stagger & flip
  const dealIn = async () => {
    setIsDealing(true);
    setPlayer([]);
    setDealer([]);
    // p1, d1, p2, d2 (hole)
    const p1 = getCard();
    setPlayer([p1]);
    await sleep(220);

    const d1 = getCard();
    setDealer([d1]);
    await sleep(220);

    const p2 = getCard();
    setPlayer((s) => [...s, p2]);
    await sleep(220);

    const d2 = getCard();
    setDealer((s) => [...s, d2]); // d2 will be face-down via CSS until reveal
    await sleep(160);

    setIsDealing(false);
  };

  const startGame = async (newBetInBase: number) => {
    if (roundInProgress || isDealing) return; // safety
    if (newBetInBase > balance) {
      alert('Insufficient balance for this bet.');
      return;
    }
    setResult('');
    setLastWin(0);
    setBetInBase(newBetInBase);
    setRoundInProgress(true);
    setDealerRevealed(false);

    // place bet up-front like Slots
    await placeBet(user.uid, newBetInBase, 1, 'blackjack');
    await refreshBalance();

    await dealIn();

    // optional: auto-check for natural blackjacks
    const p = scoreOf([/* recompute after dealing */ ...player]);
    const d = scoreOf([/* recompute after dealing */ ...dealer]);
    // defer a tick so state is fully applied
    await sleep(0);
    const pNow = scoreOf(player);
    const dNow = scoreOf(dealer);
    if (pNow === 21 || dNow === 21) {
      await finishRoundAuto();
    }
  };

  // Player action: Hit
  const hit = async () => {
    if (controlsLocked) return;
    setIsDealing(true);
    setPlayer((s) => [...s, getCard()]);
    await sleep(240);
    setIsDealing(false);

    const sc = scoreOf([...player, { ...player[player.length - 1] }]); // rough; actual state already updated
    // safer: read fresh state next tick
    await sleep(0);
    const now = scoreOf(player);
    if (now > 21) {
      // bust → loss
      setRoundInProgress(false);
      setResult('loss');
      setDealerRevealed(true);
      await recordLossTx(user.uid, betInBase, 1, 'blackjack');
      await refreshBalance();
    }
  };

  // Player action: Stand → dealer draws to 17+
  const stand = async () => {
    if (controlsLocked) return;
    setRoundInProgress(false);
    setDealerRevealed(true);
    setIsDealing(true);

    // draw until >=17 with a nice cadence
    let dh = [...dealer];
    await sleep(500);
    while (scoreOf(dh) < 17) {
      dh.push(getCard());
      setDealer([...dh]);
      await sleep(700);
    }
    setIsDealing(false);

    await settleOutcome();
  };

  // Finish early if naturals
  const finishRoundAuto = async () => {
    setRoundInProgress(false);
    setDealerRevealed(true);
    await sleep(400);
    await settleOutcome();
  };

  const settleOutcome = async () => {
    const p = scoreOf(player);
    const d = scoreOf(dealer);

    if (p > 21 || (d <= 21 && d > p)) {
      setLastWin(0);
      setResult('loss');
      await recordLossTx(user.uid, betInBase, 1, 'blackjack');
      await refreshBalance();
      return;
    }
    if (p === d) {
      setResult('tie');
      // return stake
      await recordWinTx(user.uid, betInBase, 1, 'blackjack');
      await refreshBalance();
      return;
    }
    // player win (dealer bust or higher player score)
    setLastWin(bet);
    setResult('win');
    // pay 2x total (stake returned + winnings)
    await recordWinTx(user.uid, betInBase * 2, 1, 'blackjack');
    await refreshBalance();
  };

  // Keyboard shortcuts for snappy play
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') hit();
      if (e.key.toLowerCase() === 's') stand();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hit, stand]);

  return (
    <BackgroundLayout gameId='Blackjack'>
      <div className='bj-game-container'>
        {/* Fixed bet controls footer (like Slots) */}
        <div className='game-bet-controls'>
          <CurrencyProvider base='NZD' DefaultCurrency='NZD'>
            <BetControls
              balance={balance}
              bet={bet}
              setBet={setBet}
              startGame={startGame}
              disabled={roundInProgress || isDealing}
            />
          </CurrencyProvider>
        </div>

        <div className={`bj-table ${!roundInProgress && !isDealing ? 'idle-hover' : ''}`}>
          {/* Dealer */}
          <div className='bj-hand'>
            <div className='bj-hand-head'>
              <span className='bj-hand-label'>Dealer</span>
              <span className='bj-score'>
                {typeof dealerVisibleScore === 'number' ? dealerVisibleScore : dealerVisibleScore}
              </span>
            </div>
            <div className='bj-cards'>
              {dealer.map((c, i) => {
                const faceDown = i === 1 && roundInProgress && !dealerRevealed;
                return (
                  <div
                    key={c.id}
                    className={[
                      'bj-card',
                      isRed(c.suit) ? 'red' : '',
                      'dealt',
                      faceDown ? 'face-down' : 'face-up',
                    ].join(' ')}
                    style={{ transitionDelay: `${i * 120}ms` }}
                    aria-label={faceDown ? 'Face-down card' : `${c.rank}${c.suit}`}
                  >
                    <div className='bj-card-inner'>
                      <div className='bj-card-front'>
                        <span className='bj-rank'>{c.rank}</span>
                        <span className='bj-suit'>{c.suit}</span>
                      </div>
                      <div className='bj-card-back' />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Player */}
          <div className='bj-hand'>
            <div className='bj-hand-head'>
              <span className='bj-hand-label'>You</span>
              <span className='bj-score'>{playerScore || 0}</span>
            </div>
            <div className='bj-cards'>
              {player.map((c, i) => (
                <div
                  key={c.id}
                  className={['bj-card', isRed(c.suit) ? 'red' : '', 'dealt', 'face-up'].join(' ')}
                  style={{ transitionDelay: `${i * 120}ms` }}
                  aria-label={`${c.rank}${c.suit}`}
                >
                  <div className='bj-card-inner'>
                    <div className='bj-card-front'>
                      <span className='bj-rank'>{c.rank}</span>
                      <span className='bj-suit'>{c.suit}</span>
                    </div>
                    <div className='bj-card-back' />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          {roundInProgress && (
            <div className='bj-controls'>
              <button className='bj-btn' onClick={hit} disabled={controlsLocked}>
                Hit
              </button>
              <button className='bj-btn' onClick={stand} disabled={controlsLocked}>
                Stand
              </button>
            </div>
          )}

          {/* Result banner */}
          <div
            className={[
              'win-display',
              result === 'win' ? 'win-amount' : '',
              result === 'loss' ? 'loss-amount' : '',
              result === 'tie' ? 'tie-amount' : '',
              result ? 'visible' : '',
            ].join(' ')}
          >
            {result === 'win'
              ? `+ $${lastWin}`
              : result === 'loss'
                ? `- $${bet}`
                : result === 'tie'
                  ? 'Tie'
                  : ''}
          </div>
        </div>
      </div>
    </BackgroundLayout>
  );
}
