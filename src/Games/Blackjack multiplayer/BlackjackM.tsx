import { useState, useEffect, useMemo } from 'react';
import './Blackjack.css';
import BackgroundLayout from '../../components/BackgroundLayout/BackgroundLayout.tsx';
import { placeBet, recordWinTx, recordLossTx } from '../../../Backend/transactions.ts';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import { CurrencyProvider } from '../../components/CurrencySwitcher/currencyswitcher.tsx';
import BetControls from '../BetControls.tsx';
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
import '../../assets/Tilt.png';

// Local helpers
const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const getCard = () => {
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const rank = ranks[Math.floor(Math.random() * ranks.length)];
  return { rank, suit };
};

const cardValue = (card: { rank: string; suit: string }) => {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return parseInt(card.rank);
};

export function BlackjackMRoute() {
  const { gameId } = useParams();
  return <Blackjackm gameId={gameId} />;
}

export default function Blackjackm({ gameId = 'testGame' }: { gameId?: string }) {
  const { user, balance, refreshBalance } = useUser();

  // Local UI state (render-only state; authoritative state lives in Firestore)
  const [playerCards, setPlayerCards] = useState<{ rank: string; suit: string }[]>([]);
  const [dealerCards, setDealerCards] = useState<{ rank: string; suit: string }[]>([]);
  const [bet, setBet] = useState(10);
  const [lastWin, setLastWin] = useState(0);
  const [roundResult, setRoundResult] = useState('');
  const [dealerRevealed, setDealerRevealed] = useState(false);
  const [betInBase, setBetInBase] = useState(0);
  const [roundInProgress, setRoundInProgress] = useState(false);

  // turn/players snapshot
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

  // Firestore refs (gameRef can be created unconditionally)
  const gameRef = useMemo(() => doc(db, 'games', gameId), [gameId]);

  // Ensure game doc & my player doc exist
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
            state: 'waiting', // waiting → in-progress → dealer → finished
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

  // Listen to game changes (single source of truth for round state)
  useEffect(() => {
    const unsubGame = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data: any = docSnap.data();
        setDealerCards(data.dealerHand || []);
        setDealerRevealed(data.state !== 'in-progress');
        setRoundInProgress(data.state === 'in-progress');
        setCurrentTurn(data.currentTurn ?? null);
        setHostUid(data.host || null);
      } else {
        setDealerCards([]);
        setRoundInProgress(false);
        setDealerRevealed(false);
        setCurrentTurn(null);
        setHostUid(null);
      }
    });
    return () => unsubGame();
  }, [gameRef]);

  // Listen to my player changes
  useEffect(() => {
    if (!user?.uid) return;
    const playerRef = doc(db, 'games', gameId, 'players', user.uid);
    const unsubPlayer = onSnapshot(playerRef, (docSnap) => {
      if (docSnap.exists()) {
        const data: any = docSnap.data();
        setPlayerCards(data.cards || []);
        setRoundResult(data.status || '');
      } else {
        setPlayerCards([]);
        setRoundResult('');
      }
    });
    return () => unsubPlayer();
  }, [user?.uid, gameId]);

  // Auto-deal lock (host only). Prevents multiple tabs racing to deal.
  async function tryAutoDeal() {
    if (!user) return;

    // lock dealing atomically
    const locked = await runTransaction(db, async (tx) => {
      const gSnap = await tx.get(gameRef);
      if (!gSnap.exists()) return false;
      const g: any = gSnap.data();

      // only host should proceed
      if (g.host && g.host !== user.uid) return false;

      // don't deal if already in progress / dealer / or locked
      if (g.state === 'in-progress' || g.state === 'dealer' || g.dealLock) return false;

      tx.update(gameRef, { dealLock: serverTimestamp() });
      return true;
    });

    if (!locked) return;

    try {
      // read latest game config (minPlayers)
      const g2 = await getDoc(gameRef);
      const gData: any = g2.exists() ? g2.data() : {};
      const requiredPlayers = gData?.minPlayers ?? 2;

      // load players
      const playersColRef = collection(db, 'games', gameId, 'players');
      const snap = await getDocs(playersColRef);
      const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

      // players who have opted in this round
      const active = all.filter((p) => p.status === 'active');

      // wait until: at least minPlayers + EVERY active has bet + nobody has been dealt yet
      const everyoneReady =
        active.length >= requiredPlayers &&
        active.every((p) => (p.bet ?? 0) > 0 && (p.cards?.length ?? 0) === 0);

      if (!everyoneReady) {
        await updateDoc(gameRef, { dealLock: null });
        return;
      }

      // deal one up-card to each active player
      await Promise.all(
        active.map((p) =>
          setDoc(
            doc(db, 'games', gameId, 'players', p.id),
            { cards: [getCard()], paid: false, status: 'active' },
            { merge: true }
          )
        )
      );

      // begin the round
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

  // Listen to all players to show others' cards + auto-deal + auto-advance (host only)
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

      // host: if current player finished (not 'active'), advance
      if (hostUid === user.uid && currentTurn) {
        const cur = all.find((p) => p.uid === currentTurn);
        if (cur && cur.status && cur.status !== 'active') {
          advanceTurnOrFinish();
        }
      }

      // host: try to auto-deal when nobody is playing and everyone who joined has bet
      if (!roundInProgress && hostUid === user.uid) {
        await tryAutoDeal();
      }
    });
    return () => unsub();
  }, [user?.uid, gameId, hostUid, currentTurn, roundInProgress]);

  // Helpers
  const calcScore = (cards: { rank: string; suit: string }[]) => {
    let total = 0;
    let aces = 0;
    cards.forEach((c) => {
      total += cardValue(c);
      if (c.rank === 'A') aces++;
    });
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  };

  const getDealerDisplayScore = () => {
    if (!roundInProgress) {
      return calcScore(dealerCards);
    }
    if (dealerCards.length >= 1) {
      const first = cardValue(dealerCards[0]);
      return `${first} + ??`;
    }
    return '??';
  };

  // build order once per round (host)
  async function buildPlayersOrder(): Promise<string[]> {
    const playersCol = collection(db, 'games', gameId, 'players');
    const snap = await getDocs(playersCol);
    return snap.docs.filter((d) => (d.data() as any).status === 'active').map((d) => d.id);
  }

  // advance to next active player or kick to dealer (host-only)
  async function advanceTurnOrFinish() {
    if (!user || hostUid !== user.uid) return; // host-only

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

  // helper: pay exactly once and mark paid=true
  async function payOnce(uid: string, amount: number, kind: 'win' | 'loss' | 'tie') {
    const pRef = doc(db, 'games', gameId, 'players', uid);
    const pSnap = await getDoc(pRef);
    const pdata: any = pSnap.exists() ? pSnap.data() : {};
    if (pdata.paid) return;

    // tie → return bet; win → pay 2x; loss → already deducted on bet or bust
    if (kind === 'win') {
      await recordWinTx(uid, (pdata.bet ?? 0) * 2, 1, 'blackjack');
    } else if (kind === 'tie') {
      await recordWinTx(uid, pdata.bet ?? 0, 1, 'blackjack');
    }

    await updateDoc(pRef, { paid: true });
    await refreshBalance();
  }

  // dealer plays once; settle everyone (host-only)
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
      const pCards = pdata.cards || [];
      const pScore = calcScore(pCards);
      const dScore = calcScore(dealerHand);

      // make sure any still-'active' players are treated as standing now
      if (pdata.status === 'active') {
        await updateDoc(doc(db, 'games', gameId, 'players', uid), { status: 'stand' });
      }

      if (pdata.paid) continue; // already settled (e.g., bust instant loss)

      if (pScore > 21 || (dScore <= 21 && dScore > pScore)) {
        // loss (if not busted earlier). Do NOT double-charge; bet was already deducted at placeBet.
        await updateDoc(doc(db, 'games', gameId, 'players', uid), { status: 'loss', paid: true });
      } else if (pScore === dScore) {
        await updateDoc(doc(db, 'games', gameId, 'players', uid), { status: 'tie' });
        await payOnce(uid, pdata.bet ?? 0, 'tie');
      } else {
        await updateDoc(doc(db, 'games', gameId, 'players', uid), { status: 'win' });
        await payOnce(uid, pdata.bet ?? 0, 'win');
      }
    }

    await updateDoc(gameRef, { state: 'finished', currentTurn: null });
  }

  // host-only: (kept for safety; auto-deal calls this via tryAutoDeal)
  async function beginRoundHost() {
    if (!user || hostUid !== user.uid) return;

    const gSnap = await getDoc(gameRef);
    const gData: any = gSnap.exists() ? gSnap.data() : {};
    if (gData.state === 'in-progress' || gData.state === 'dealer') return;

    const order = await buildPlayersOrder();
    if (!order.length) return;

    const playersColRef = collection(db, 'games', gameId, 'players');
    const snap = await getDocs(playersColRef);

    await Promise.all(
      snap.docs.map(async (d) => {
        const data: any = d.data();
        if (data.status === 'active') {
          await setDoc(
            doc(db, 'games', gameId, 'players', d.id),
            { cards: [getCard()], paid: false },
            { merge: true }
          );
        }
      })
    );

    await updateDoc(gameRef, {
      state: 'in-progress',
      dealerHand: [getCard()],
      currentTurn: order[0] || null,
      playersOrder: order,
      activeIndex: 0,
      gameType: 'blackjack',
    });
  }

  // Actions
  const startGame = async (newBetInBase: number) => {
    if (!user) return;
    if (newBetInBase > balance) {
      alert('Not enough balance!');
      return;
    }

    const playerRef = doc(db, 'games', gameId, 'players', user.uid);
    const pSnap = await getDoc(playerRef);
    const pData: any = pSnap.exists() ? pSnap.data() : null;
    if (pData?.status === 'active') return; // already joined this round

    setBetInBase(newBetInBase);
    setLastWin(0);
    setRoundResult('');
    setDealerRevealed(false);

    // join round with a bet; cards cleared; unpaid
    await setDoc(gameRef, { gameType: 'blackjack' }, { merge: true });
    await setDoc(
      playerRef,
      { bet: newBetInBase, cards: [], status: 'active', paid: false },
      { merge: true }
    );

    // deduct stake up-front
    await placeBet(user.uid, newBetInBase, 1, 'blackjack');
    await refreshBalance();
  };

  const hit = async () => {
    if (!user) return;
    if (currentTurn !== user.uid) return;

    const playerRef = doc(db, 'games', gameId, 'players', user.uid);
    const card = getCard();
    await updateDoc(playerRef, { cards: arrayUnion(card) });

    const newCards = [...playerCards, card];
    if (calcScore(newCards) > 21) {
      // instant bust → record loss and mark paid to avoid double-settlement
      setLastWin(0);
      await updateDoc(playerRef, { status: 'bust', paid: true });
      await recordLossTx(user.uid, betInBase, 1, 'blackjack');
      await refreshBalance();
      await advanceTurnOrFinish();
    }
  };

  const stand = async () => {
    if (!user) return;
    if (currentTurn !== user.uid) return;

    const playerRef = doc(db, 'games', gameId, 'players', user.uid);
    setDealerRevealed(true);
    await updateDoc(playerRef, { status: 'stand' });
    await advanceTurnOrFinish();
  };

  // UI
  if (!user) {
    return (
      <BackgroundLayout>
        <div className='game-container'>
          <h1>♠ Blackjack ♣</h1>
          <p className='small'>Sign in to join this table.</p>
        </div>
      </BackgroundLayout>
    );
  }

  const isMyTurn = roundInProgress && currentTurn === user.uid;

  return (
    <BackgroundLayout>
      <div className='game-container'>
        <CurrencyProvider base='NZD' DefaultCurrency='NZD'>
          <h1>♠ Blackjack ♣</h1>

          {/* Place bet to join the next round */}
          {!roundInProgress && (
            <BetControls balance={balance} bet={bet} setBet={setBet} startGame={startGame} />
          )}
        </CurrencyProvider>

        <div className='table'>
          <div className='hand-container'>
            <h2>Dealer ({getDealerDisplayScore()})</h2>
            <div className='cards'>
              {dealerCards.map((c, i) => (
                <div
                  key={i}
                  className={`card ${c.suit === '♥' || c.suit === '♦' ? 'red' : ''} dealt`}
                >
                  {i === 1 && roundInProgress ? '??' : `${c.rank}${c.suit}`}
                </div>
              ))}
            </div>
          </div>

          <div className='hand-container'>
            <h2>
              You ({calcScore(playerCards)}) {isMyTurn ? '' : '(waiting)'}
            </h2>
            <div className='cards'>
              {playerCards.map((c, i) => (
                <div
                  key={i}
                  className={`card ${c.suit === '♥' || c.suit === '♦' ? 'red' : ''} dealt`}
                >
                  {c.rank}
                  {c.suit}
                </div>
              ))}
            </div>
          </div>

          {otherPlayers.length > 0 && (
            <div className='hand-container'>
              <h2>Other Players</h2>
              <div className='cards' style={{ display: 'grid', gap: 8 }}>
                {otherPlayers.map((p) => (
                  <div
                    key={p.uid}
                    style={{
                      border: '1px solid rgba(255,255,255,.12)',
                      borderRadius: 8,
                      padding: 8,
                    }}
                  >
                    <div style={{ marginBottom: 6, fontWeight: 600 }}>
                      {p.displayName || p.uid.slice(0, 6)} ({calcScore(p.cards)})
                      {currentTurn === p.uid ? ' • turn' : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {p.cards.map((c, i) => (
                        <div
                          key={i}
                          className={`card ${c.suit === '♥' || c.suit === '♦' ? 'red' : ''} dealt`}
                          style={{ minWidth: 32, textAlign: 'center' }}
                        >
                          {c.rank}
                          {c.suit}
                        </div>
                      ))}
                    </div>
                    {p.status && (
                      <div className='small' style={{ marginTop: 4 }}>
                        Status: {p.status}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {roundInProgress && (
          <div className='controls'>
            <button onClick={hit} disabled={!isMyTurn}>
              Hit
            </button>
            <button onClick={stand} disabled={!isMyTurn}>
              Stand
            </button>
          </div>
        )}

        <div
          className={`win-display ${
            roundResult === 'win'
              ? 'win-amount'
              : roundResult === 'loss'
                ? 'loss-amount'
                : roundResult === 'tie'
                  ? 'tie-amount'
                  : ''
          }`}
        >
          {roundResult === 'win'
            ? `+ $${lastWin}`
            : roundResult === 'loss'
              ? `- $${bet}`
              : roundResult === 'tie'
                ? 'Tie'
                : ''}
        </div>
      </div>
    </BackgroundLayout>
  );
}
