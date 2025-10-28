import { useEffect, useMemo, useState } from 'react';
import './Blackjack.css';
import BackgroundLayout from '../../components/BackgroundLayout/BackgroundLayout.tsx';
import { placeBet, recordWinTx, recordLossTx } from '../../../Backend/transactions.ts';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import { CurrencyProvider } from '../../components/CurrencySwitcher/currencyswitcher.tsx';
import BetControls from '../BetControls/BetControls.tsx';

import { db } from '../../../Backend/firebase/firebaseConfig';
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  getDoc,
  serverTimestamp,
  collection,
  runTransaction,
  getDocs,
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';

// ----- helpers -----
const suits = ['♠', '♥', '♦', '♣'] as const;
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
const isRed = (suit: string) => suit === '♥' || suit === '♦';

const getCard = () => {
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const rank = ranks[Math.floor(Math.random() * ranks.length)];
  return { rank, suit };
};

const cardValue = (card: { rank: string; suit: string }) => {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return parseInt(card.rank, 10);
};

export function BlackjackMRoute() {
  const { gameId } = useParams();
  return <Blackjackm gameId={gameId} />;
}

export default function Blackjackm({ gameId = 'testGame' }: { gameId?: string }) {
  const { user, balance, refreshBalance } = useUser();

  // local UI state
  const [playerCards, setPlayerCards] = useState<{ rank: string; suit: string }[]>([]);
  const [dealerCards, setDealerCards] = useState<{ rank: string; suit: string }[]>([]);
  const [bet, setBet] = useState(10);
  const [lastWin, setLastWin] = useState(0);
  const [roundResult, setRoundResult] = useState('');
  const [dealerRevealed, setDealerRevealed] = useState(false);
  const [betInBase, setBetInBase] = useState(0);
  const [roundInProgress, setRoundInProgress] = useState(false);

  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [otherPlayers, setOtherPlayers] = useState<
    {
      uid: string;
      displayName?: string;
      cards: { rank: string; suit: string }[];
      status?: string;
      bet?: number;
      paid?: boolean;
    }[]
  >([]);
  const [hostUid, setHostUid] = useState<string | null>(null);

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
  const gameRef = useMemo(() => doc(db, 'games', gameId), [gameId]);

  // ensure game + player docs
  useEffect(() => {
    if (!user?.uid) return;
    let mounted = true;
    (async () => {
      const g = await getDoc(gameRef);
      if (!g.exists() && mounted) {
        await setDoc(
          gameRef,
          {
            host: user.uid,
            currentTurn: null,
            dealerHand: [],
            dealerHidden: null,
            gameType: 'blackjack',
            minPlayers: 2,
            maxPlayers: 5,
            state: 'waiting',
            createdAt: serverTimestamp(),
            dealLock: null,
          },
          { merge: true }
        );
      }
      const playerRef = doc(db, 'games', gameId, 'players', user.uid);
      const p = await getDoc(playerRef);
      if (!p.exists() && mounted) {
        await setDoc(
          playerRef,
          {
            displayName: user.displayName || user.email || 'Player',
            bet: 0,
            cards: [],
            status: 'waiting',
            paid: false,
            joinedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.uid, gameId, gameRef]);

  // game snapshot
  useEffect(() => {
    const unsubGame = onSnapshot(gameRef, (docSnap) => {
      if (!docSnap.exists()) {
        setDealerCards([]);
        setRoundInProgress(false);
        setDealerRevealed(false);
        setCurrentTurn(null);
        setHostUid(null);
        return;
      }
      const data: any = docSnap.data();
      setDealerCards(data.dealerHand || []);
      setDealerRevealed(data.state !== 'in-progress');
      setRoundInProgress(data.state === 'in-progress');
      setCurrentTurn(data.currentTurn ?? null);
      setHostUid(data.host || null);
    });
    return () => unsubGame();
  }, [gameRef]);

  // my player snapshot
  useEffect(() => {
    if (!user?.uid) return;
    const playerRef = doc(db, 'games', gameId, 'players', user.uid);
    const unsubPlayer = onSnapshot(playerRef, (docSnap) => {
      if (!docSnap.exists()) {
        setPlayerCards([]);
        setRoundResult('');
        return;
      }
      const data: any = docSnap.data();
      setPlayerCards(data.cards || []);
      setRoundResult(data.status || '');
    });
    return () => unsubPlayer();
  }, [user?.uid, gameId]);

  // score helpers
  const calcScore = (cards: { rank: string; suit: string }[]) => {
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

  const getDealerDisplayScore = () => {
    if (!roundInProgress) return calcScore(dealerCards);
    if (dealerCards.length >= 1) return `${cardValue(dealerCards[0])} + ??`;
    return '??';
  };

  // auto-deal (host)
  async function tryAutoDeal() {
    if (!user) return;

    const locked = await runTransaction(db, async (tx) => {
      const gSnap = await tx.get(gameRef);
      if (!gSnap.exists()) return false;
      const g: any = gSnap.data();
      if (g.host && g.host !== user.uid) return false;
      if (g.state === 'in-progress' || g.state === 'dealer' || g.dealLock) return false;
      tx.update(gameRef, { dealLock: serverTimestamp() });
      return true;
    });
    if (!locked) return;

    try {
      const g2 = await getDoc(gameRef);
      const gData: any = g2.exists() ? g2.data() : {};

      const playersColRef = collection(db, 'games', gameId, 'players');
      const snap = await getDocs(playersColRef);
      const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const active = all.filter((p) => p.status === 'active');
      const requiredPlayers = active.length;

      const everyoneReady =
        active.length >= requiredPlayers &&
        active.every((p) => (p.bet ?? 0) > 0 && (p.cards?.length ?? 0) === 0);

      if (!everyoneReady) {
        await updateDoc(gameRef, { dealLock: null });
        return;
      }

      await Promise.all(
        active.map((p) =>
          setDoc(
            doc(db, 'games', gameId, 'players', p.id),
            { cards: [getCard()], paid: false, status: 'active' },
            { merge: true }
          )
        )
      );

      const order = active.map((p) => p.id);
      await updateDoc(gameRef, {
        state: 'in-progress',
        dealerHand: [getCard()],
        currentTurn: order[0] || null,
        playersOrder: order,
        activeIndex: 0,
        gameType: 'blackjack',
        dealLock: null,
      });
    } catch (e) {
      await updateDoc(gameRef, { dealLock: null });
      throw e;
    }
  }

  // listen to all players (host: advance / auto-deal)
  useEffect(() => {
    if (!user?.uid) return;
    const playersCol = collection(db, 'games', gameId, 'players');
    const unsub = onSnapshot(playersCol, async (snap) => {
      const all = snap.docs.map((d) => {
        const data: any = d.data();
        return {
          uid: d.id,
          displayName: data.displayName,
          cards: data.cards || [],
          status: data.status,
          bet: data.bet || 0,
          paid: !!data.paid,
        };
      });

      setOtherPlayers(all.filter((p) => p.uid !== user.uid));

      if (hostUid === user.uid && currentTurn) {
        const cur = all.find((p) => p.uid === currentTurn);
        if (cur && cur.status && cur.status !== 'active') {
          await advanceTurnOrFinish();
        }
      }

      if (!roundInProgress && hostUid === user.uid) {
        await tryAutoDeal();
      }
    });
    return () => unsub();
  }, [user?.uid, gameId, hostUid, currentTurn, roundInProgress]);

  async function advanceTurnOrFinish() {
    if (!user || hostUid !== user.uid) return;

    await runTransaction(db, async (tx) => {
      const g = await tx.get(gameRef);
      if (!g.exists()) return;
      const data: any = g.data();

      const playersOrder: string[] = data.playersOrder || [];
      if (playersOrder.length === 0) {
        tx.update(gameRef, { state: 'dealer', currentTurn: null });
        return;
      }

      let idx: number = typeof data.activeIndex === 'number' ? data.activeIndex : 0;

      const playersCol = collection(db, 'games', gameId, 'players');
      const playersSnap = await getDocs(playersCol);
      const statusByUid = new Map(
        playersSnap.docs.map((d) => [d.id, (d.data() as any).status || 'waiting'])
      );

      let foundNext: string | null = null;
      for (let step = 0; step < playersOrder.length; step++) {
        idx = (idx + 1) % playersOrder.length;
        const uid = playersOrder[idx];
        if (statusByUid.get(uid) === 'active') {
          foundNext = uid;
          break;
        }
      }

      if (foundNext) {
        tx.update(gameRef, { currentTurn: foundNext, activeIndex: idx });
      } else {
        tx.update(gameRef, { state: 'dealer', currentTurn: null });
      }
    });

    const post = await getDoc(gameRef);
    if (post.exists()) {
      const d: any = post.data();
      if (d.state === 'dealer') {
        await resolveDealerAndSettle();
      }
    }
  }

  async function payOnce(uid: string, kind: 'win' | 'loss' | 'tie') {
    const pRef = doc(db, 'games', gameId, 'players', uid);
    const pSnap = await getDoc(pRef);
    const pdata: any = pSnap.exists() ? pSnap.data() : {};
    if (pdata.paid) return;

    if (kind === 'win') {
      await recordWinTx(uid, (pdata.bet ?? 0) * 2, 1, 'blackjack');
    } else if (kind === 'tie') {
      await recordWinTx(uid, pdata.bet ?? 0, 1, 'blackjack');
    }

    await updateDoc(pRef, { paid: true });
    await refreshBalance();
  }

  async function resolveDealerAndSettle() {
    if (!user || hostUid !== user.uid) return;

    let dealerHand = dealerCards.length ? [...dealerCards] : [getCard(), getCard()];
    await updateDoc(gameRef, { dealerHand });
    await sleep(250);

    while (calcScore(dealerHand) < 17) {
      dealerHand.push(getCard());
      await updateDoc(gameRef, { dealerHand });
      await sleep(250);
    }

    const playersCol = collection(db, 'games', gameId, 'players');
    const playersSnap = await getDocs(playersCol);

    for (const d of playersSnap.docs) {
      const pdata: any = d.data();
      const uid = d.id;
      const pScore = calcScore(pdata.cards || []);
      const dScore = calcScore(dealerHand);

      if (pdata.status === 'active') {
        await updateDoc(doc(db, 'games', gameId, 'players', uid), { status: 'stand' });
      }

      if (pdata.paid) continue;

      if (pScore > 21 || (dScore <= 21 && dScore > pScore)) {
        await updateDoc(doc(db, 'games', gameId, 'players', uid), { status: 'loss', paid: true });
      } else if (pScore === dScore) {
        await updateDoc(doc(db, 'games', gameId, 'players', uid), { status: 'tie' });
        await payOnce(uid, 'tie');
      } else {
        await updateDoc(doc(db, 'games', gameId, 'players', uid), { status: 'win' });
        await payOnce(uid, 'win');
      }
    }

    await updateDoc(gameRef, { state: 'finished', currentTurn: null });
  }

  // actions
  const startGame = async (newBetInBase: number) => {
    if (!user) return;
    if (newBetInBase > balance) {
      alert('Not enough balance!');
      return;
    }

    const playerRef = doc(db, 'games', gameId, 'players', user.uid);
    const pSnap = await getDoc(playerRef);
    const pData: any = pSnap.exists() ? pSnap.data() : null;
    if (pData?.status === 'active') return;

    setBetInBase(newBetInBase);
    setLastWin(0);
    setRoundResult('');
    setDealerRevealed(false);

    await setDoc(gameRef, { gameType: 'blackjack' }, { merge: true });
    await setDoc(
      playerRef,
      { bet: newBetInBase, cards: [], status: 'active', paid: false },
      { merge: true }
    );

    // take stake now
    await placeBet(user.uid, newBetInBase, 1, 'blackjack');
    await refreshBalance();
  };

  const hit = async () => {
    if (!user || currentTurn !== user.uid) return;
    const playerRef = doc(db, 'games', gameId, 'players', user.uid);
    const card = getCard();
    await updateDoc(playerRef, { cards: arrayUnion(card) });

    const newCards = [...playerCards, card];
    if (calcScore(newCards) > 21) {
      setLastWin(0);
      await updateDoc(playerRef, { status: 'bust', paid: true });
      await recordLossTx(user.uid, betInBase, 1, 'blackjack');
      await refreshBalance();
      await advanceTurnOrFinish();
    }
  };

  const stand = async () => {
    if (!user || currentTurn !== user.uid) return;
    const playerRef = doc(db, 'games', gameId, 'players', user.uid);
    setDealerRevealed(true);
    await updateDoc(playerRef, { status: 'stand' });
    await advanceTurnOrFinish();
  };

  // UI
  const isMyTurn = roundInProgress && currentTurn === user.uid;

  return (
    <BackgroundLayout gameId='Blackjack'>
      <div className='bj-game-container'>
        {/* Fixed bet controls footer (same as singleplayer) */}
        <div className='game-bet-controls'>
          <CurrencyProvider base='NZD' DefaultCurrency='NZD'>
            {!roundInProgress && (
              <BetControls balance={balance} bet={bet} setBet={setBet} startGame={startGame} />
            )}
          </CurrencyProvider>
        </div>

        <div className={`bj-table ${!roundInProgress ? 'idle-hover' : ''}`}>
          {/* Dealer */}
          <div className='bj-hand'>
            <div className='bj-hand-head'>
              <span className='bj-hand-label'>
                Dealer <span className='bj-score'>({getDealerDisplayScore()})</span>
              </span>
            </div>

            <div className='bj-cards'>
              {dealerCards.map((c, i) => {
                const faceDown = i === 1 && roundInProgress && !dealerRevealed;
                return (
                  <div
                    key={`d-${i}`}
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

          {/* You */}
          <div className='bj-hand'>
            <div className='bj-hand-head'>
              <span className='bj-hand-label'>
                You <span className='bj-score'>({calcScore(playerCards) || 0})</span>
              </span>
            </div>
            <div className='bj-cards'>
              {playerCards.map((c, i) => (
                <div
                  key={`p-${i}`}
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

          {/* Other players – single floating box */}
          {otherPlayers.length > 0 && (
            <aside className='bj-others-float'>
              <div className='bj-others-title'>Other Players</div>

              {otherPlayers.map((p) => (
                <div key={p.uid} className='bj-others-row'>
                  <div className='bj-others-head'>
                    {p.displayName || p.uid.slice(0, 6)} ({calcScore(p.cards)})
                    {currentTurn === p.uid ? ' • turn' : ''}
                  </div>

                  <div className='bj-cards bj-others-cards'>
                    {p.cards.map((c, i) => (
                      <div
                        key={`${p.uid}-${i}`}
                        className={[
                          'bj-card',
                          c.suit === '♥' || c.suit === '♦' ? 'red' : '',
                          'dealt',
                          'face-up',
                        ].join(' ')}
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

                  {p.status && <div className='bj-subtle bj-others-status'>Status: {p.status}</div>}
                </div>
              ))}
            </aside>
          )}

          {/* Controls */}
          {roundInProgress && (
            <div className='bj-controls'>
              <button className='bj-btn' onClick={hit} disabled={currentTurn !== user?.uid}>
                Hit
              </button>
              <button className='bj-btn' onClick={stand} disabled={currentTurn !== user?.uid}>
                Stand
              </button>
            </div>
          )}

          {/* Result banner */}
          <div
            className={[
              'win-display',
              roundResult ? 'visible' : '',
              roundResult === 'win' ? 'win-amount' : '',
              roundResult === 'loss' ? 'loss-amount' : '',
              roundResult === 'tie' ? 'tie-amount' : '',
            ].join(' ')}
          >
            {roundResult === 'win'
              ? `+ $${bet}`
              : roundResult === 'loss'
                ? `- $${bet}`
                : roundResult === 'tie'
                  ? 'Tie'
                  : ''}
          </div>
        </div>
      </div>
    </BackgroundLayout>
  );
}
