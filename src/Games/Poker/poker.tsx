// Poker.tsx
import { useState, useEffect, useMemo } from 'react';
import BackgroundLayout from '../../components/BackgroundLayout/BackgroundLayout.tsx';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import { placeBet } from '../../../Backend/transactions.ts';
import { CurrencyProvider } from '../../components/CurrencySwitcher/currencyswitcher.tsx';
import BetControls from '../BetControls.tsx';
import { db } from '../../../Backend/firebase/firebaseConfig';
import {
  doc, setDoc, updateDoc, onSnapshot, collection,
  getDoc, getDocs, serverTimestamp
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import './Poker.css';

/* ==========================================================
   🔹 Card Helpers
   ========================================================== */
const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const rankValue: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14,
};

const getCard = () => {
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const rank = ranks[Math.floor(Math.random() * ranks.length)];
  return { rank, suit };
};

const sortCards = (cards: any[]) =>
  [...cards].sort((a, b) => rankValue[b.rank] - rankValue[a.rank]);

/* ==========================================================
   🔹 Hand Evaluation
   ========================================================== */
export function evaluateHand(cards: any[]) {
  if (cards.length < 5) return { rank: 0, name: 'No Hand', highCards: [] };

  const all = sortCards(cards);
  const counts: Record<string, number> = {};
  const suitsCount: Record<string, number> = {};

  for (const c of all) {
    counts[c.rank] = (counts[c.rank] || 0) + 1;
    suitsCount[c.suit] = (suitsCount[c.suit] || 0) + 1;
  }

  const values = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const isFlush = Object.values(suitsCount).some((v) => v >= 5);
  const sortedValues = all.map((c) => rankValue[c.rank]);
  const uniqueVals = [...new Set(sortedValues)].sort((a, b) => a - b);

  let isStraight = false;
  let straightHigh = 0;
  for (let i = 0; i <= uniqueVals.length - 5; i++) {
    if (uniqueVals[i + 4] - uniqueVals[i] === 4) {
      isStraight = true;
      straightHigh = uniqueVals[i + 4];
    }
  }
  if ([14, 5, 4, 3, 2].every((x) => uniqueVals.includes(x))) {
    isStraight = true;
    straightHigh = 5;
  }

  if (isFlush && isStraight) return { rank: 9, name: 'Straight Flush', highCards: [straightHigh] };
  if (values[0][1] === 4) return { rank: 8, name: 'Four of a Kind', highCards: [rankValue[values[0][0]]] };
  if (values[0][1] === 3 && values[1]?.[1] >= 2)
    return { rank: 7, name: 'Full House', highCards: [rankValue[values[0][0]]] };
  if (isFlush) return { rank: 6, name: 'Flush', highCards: sortedValues.slice(0, 5) };
  if (isStraight) return { rank: 5, name: 'Straight', highCards: [straightHigh] };
  if (values[0][1] === 3) return { rank: 4, name: 'Three of a Kind', highCards: [rankValue[values[0][0]]] };
  if (values[0][1] === 2 && values[1]?.[1] === 2)
    return { rank: 3, name: 'Two Pair', highCards: [rankValue[values[0][0]], rankValue[values[1][0]]] };
  if (values[0][1] === 2) return { rank: 2, name: 'One Pair', highCards: [rankValue[values[0][0]]] };
  return { rank: 1, name: 'High Card', highCards: [sortedValues[0]] };
}

export function compareHands(a: any, b: any) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.min(a.highCards.length, b.highCards.length); i++) {
    if (a.highCards[i] !== b.highCards[i]) return a.highCards[i] - b.highCards[i];
  }
  return 0;
}

/* ==========================================================
   🔹 Main Poker Component
   ========================================================== */
export function PokerRoute() {
  const { gameId } = useParams();
  return <Poker gameId={gameId} />;
}

export default function Poker({ gameId = 'pokerGame' }: { gameId?: string }) {
  const { user, balance, refreshBalance } = useUser();

  const [playerCards, setPlayerCards] = useState<any[]>([]);
  const [communityCards, setCommunityCards] = useState<any[]>([]);
  const [bet, setBet] = useState(10);
  const [phase, setPhase] = useState('waiting');
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [hostUid, setHostUid] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [pot, setPot] = useState(0);

  const gameRef = useMemo(() => doc(db, 'games', gameId), [gameId]);

  /* ==========================================================
     🔹 Setup Game + Listeners
     ========================================================== */
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      const g = await getDoc(gameRef);
      if (!g.exists()) {
        await setDoc(gameRef, {
          host: user.uid,
          communityCards: [],
          pot: 0,
          phase: 'waiting',
          currentTurn: null,
          gameType: 'poker',
          createdAt: serverTimestamp(),
        });
      }

      const playerRef = doc(db, 'games', gameId, 'players', user.uid);
      if (!(await getDoc(playerRef)).exists()) {
        await setDoc(playerRef, {
          displayName: user.displayName || 'Player',
          cards: [],
          bet: 0,
          status: 'waiting',
          joinedAt: serverTimestamp(),
        });
      }
    })();
  }, [user?.uid]);

  useEffect(() => {
    const unsub = onSnapshot(gameRef, (snap) => {
      if (snap.exists()) {
        const d: any = snap.data();
        setPhase(d.phase);
        setCommunityCards(d.communityCards || []);
        setHostUid(d.host || null);
        setCurrentTurn(d.currentTurn || null);
        setPot(d.pot || 0);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(collection(db, 'games', gameId, 'players'), (snap) => {
      const all = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
      setPlayers(all);
      const me = all.find((p) => p.uid === user.uid);
      if (me) setPlayerCards(me.cards || []);
    });
    return () => unsub();
  }, [user?.uid]);

  /* ==========================================================
     🔹 Game Logic
     ========================================================== */
  async function beginRound() {
    if (!user || hostUid !== user.uid) return;

    const snap = await getDocs(collection(db, 'games', gameId, 'players'));
    const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const active = all.filter((p) => p.status !== 'folded');

    if (active.length < 2) return alert('Need at least 2 players!');

    await Promise.all(
      active.map((p) =>
        updateDoc(doc(db, 'games', gameId, 'players', p.id), {
          cards: [getCard(), getCard()],
          status: 'playing',
          bet: 0,
          folded: false,
        })
      )
    );

    await updateDoc(gameRef, {
      phase: 'preflop',
      communityCards: [],
      pot: 0,
      currentTurn: active[0].id,
    });
  }

  async function takeAction(action: 'fold' | 'call' | 'raise', raiseAmount = 0) {
    if (!user) return;
    const gSnap = await getDoc(gameRef);
    const data: any = gSnap.data();
    const player = players.find((p) => p.uid === user.uid);
    if (!player) return;

    const highestBet = Math.max(...players.map((p) => p.bet || 0));
    let update: any = {};

    if (action === 'fold') {
      update = { folded: true, status: 'folded' };
    } else if (action === 'call') {
      const diff = highestBet - (player.bet || 0);
      if (balance < diff) return alert('Not enough balance');
      await placeBet(user.uid, diff, 1, 'poker');
      update = { bet: highestBet, status: 'called' };
      await updateDoc(gameRef, { pot: (data.pot || 0) + diff });
    } else if (action === 'raise') {
      const newBet = highestBet + raiseAmount;
      const diff = newBet - (player.bet || 0);
      if (balance < diff) return alert('Not enough balance');
      await placeBet(user.uid, diff, 1, 'poker');
      update = { bet: newBet, status: 'raised' };
      await updateDoc(gameRef, { pot: (data.pot || 0) + diff });
    }

    await updateDoc(doc(db, 'games', gameId, 'players', user.uid), update);

    const active = players.filter((p) => !p.folded);
    const idx = active.findIndex((p) => p.uid === user.uid);
    const next = active[(idx + 1) % active.length];
    await updateDoc(gameRef, { currentTurn: next.uid });
  }

  async function nextPhase() {
    if (!user || hostUid !== user.uid) return;

    const gSnap = await getDoc(gameRef);
    const data: any = gSnap.data();
    let newPhase = 'flop';
    let newCards = [...(data.communityCards || [])];

    switch (data.phase) {
      case 'preflop':
        newPhase = 'flop';
        newCards = [getCard(), getCard(), getCard()];
        break;
      case 'flop':
        newPhase = 'turn';
        newCards.push(getCard());
        break;
      case 'turn':
        newPhase = 'river';
        newCards.push(getCard());
        break;
      case 'river':
        newPhase = 'showdown';
        break;
    }

    await updateDoc(gameRef, { phase: newPhase, communityCards: newCards });

    if (newPhase === 'showdown') {
      const allPlayers = players.filter((p) => !p.folded);
      let best: any = null;
      let winner: any = null;

      for (const p of allPlayers) {
        const fullHand = [...p.cards, ...newCards];
        const evalHand = evaluateHand(fullHand);
        if (!best || compareHands(evalHand, best) > 0) {
          best = evalHand;
          winner = p;
        }
      }

      if (winner) {
        await updateDoc(gameRef, {
          winner: winner.displayName,
          winningHand: best.name,
          phase: 'finished',
        });
        await updateDoc(doc(db, 'games', gameId, 'players', winner.uid), { status: 'winner' });
      }
    }
  }

  /* ==========================================================
     🔹 Betting Join / UI
     ========================================================== */
  const startGame = async (newBet: number) => {
    if (!user) return;
    if (newBet > balance) return alert('Insufficient balance');
    await placeBet(user.uid, newBet, 1, 'poker');
    await updateDoc(doc(db, 'games', gameId, 'players', user.uid), {
      bet: newBet,
      status: 'ready',
    });
    await updateDoc(gameRef, { pot: pot + newBet });
    await refreshBalance();
  };

  if (!user) return <BackgroundLayout><p>Please sign in</p></BackgroundLayout>;

  /* ==========================================================
     🔹 UI
     ========================================================== */
  return (
    <BackgroundLayout>
      <div className="game-container">
        <CurrencyProvider base="NZD" DefaultCurrency="NZD">
          <h1>♣ Poker ♠</h1>
          <p>Pot: ${pot}</p>

          {!['preflop', 'flop', 'turn', 'river', 'showdown'].includes(phase) && (
            <BetControls balance={balance} bet={bet} setBet={setBet} startGame={startGame} />
          )}
        </CurrencyProvider>

        <div className="table">
          <div className="community">
            <h3>Community Cards ({phase})</h3>
            <div className="cards">
              {communityCards.map((c, i) => (
                <div key={i} className={`card ${['♥','♦'].includes(c.suit) ? 'red' : ''}`}>
                  {c.rank}{c.suit}
                </div>
              ))}
            </div>
          </div>

          <div className="hand">
            <h3>Your Hand</h3>
            <div className="cards">
              {playerCards.map((c, i) => (
                <div key={i} className={`card ${['♥','♦'].includes(c.suit) ? 'red' : ''}`}>
                  {c.rank}{c.suit}
                </div>
              ))}
            </div>
          </div>

          <div className="others">
            <h3>Other Players</h3>
            {players.filter((p) => p.uid !== user.uid).map((p) => (
              <div key={p.uid} style={{ borderBottom: '1px solid gray', padding: 4 }}>
                {p.displayName}: {p.cards?.length ? '●●' : 'Waiting'}
              </div>
            ))}
          </div>
        </div>

        {hostUid === user.uid && (
          <div className="controls">
            {phase === 'waiting' && <button onClick={beginRound}>Start Round</button>}
            {['preflop', 'flop', 'turn', 'river'].includes(phase) && (
              <button onClick={nextPhase}>Next Phase</button>
            )}
          </div>
        )}
      </div>
    </BackgroundLayout>
  );
}
