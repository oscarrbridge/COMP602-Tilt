// Poker.tsx
import { useState, useEffect, useMemo } from 'react';
import BackgroundLayout from '../../components/BackgroundLayout/BackgroundLayout.tsx';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import { placeBet, recordWinTx, recordLossTx } from '../../../Backend/transactions.ts';
import { CurrencyProvider } from '../../components/CurrencySwitcher/currencyswitcher.tsx';
import BetControls from '../BetControls.tsx';
import { db } from '../../../Backend/firebase/firebaseConfig';
import {
  doc, setDoc, updateDoc, onSnapshot, collection, getDoc, getDocs, runTransaction, serverTimestamp
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import './Poker.css';

// Card helpers
const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const getCard = () => {
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const rank = ranks[Math.floor(Math.random() * ranks.length)];
  return { rank, suit };
};

export function PokerRoute() {
  const { gameId } = useParams();
  return <Poker gameId={gameId} />;
}

export default function Poker({ gameId = 'pokerGame' }: { gameId?: string }) {
  const { user, balance, refreshBalance } = useUser();

  const [playerCards, setPlayerCards] = useState<{ rank: string; suit: string }[]>([]);
  const [communityCards, setCommunityCards] = useState<{ rank: string; suit: string }[]>([]);
  const [bet, setBet] = useState(10);
  const [phase, setPhase] = useState('waiting'); // waiting | preflop | flop | turn | river | showdown
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [hostUid, setHostUid] = useState<string | null>(null);
  const [otherPlayers, setOtherPlayers] = useState<any[]>([]);

  const gameRef = useMemo(() => doc(db, 'games', gameId), [gameId]);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Ensure game + player doc exist
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      const g = await getDoc(gameRef);
      if (!g.exists()) {
        await setDoc(gameRef, {
          host: user.uid,
          communityCards: [],
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
  }, [user?.uid, gameRef]);

  // Game snapshot
  useEffect(() => {
    const unsub = onSnapshot(gameRef, (snap) => {
      if (snap.exists()) {
        const d: any = snap.data();
        setPhase(d.phase || 'waiting');
        setCommunityCards(d.communityCards || []);
        setHostUid(d.host || null);
        setCurrentTurn(d.currentTurn || null);
      }
    });
    return () => unsub();
  }, [gameRef]);

  // Player snapshot
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'games', gameId, 'players', user.uid), (snap) => {
      if (snap.exists()) {
        const d: any = snap.data();
        setPlayerCards(d.cards || []);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  // All players listener
  useEffect(() => {
    if (!user?.uid) return;
    const playersCol = collection(db, 'games', gameId, 'players');
    const unsub = onSnapshot(playersCol, async (snap) => {
      const all = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
      setOtherPlayers(all.filter((p) => p.uid !== user.uid));
    });
    return () => unsub();
  }, [user?.uid]);

  // Host-only game phase control
  async function beginRound() {
    if (!user || hostUid !== user.uid) return;
    const playersCol = collection(db, 'games', gameId, 'players');
    const snap = await getDocs(playersCol);
    const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const active = all.filter((p) => p.bet > 0);

    if (active.length < 2) return alert('Need at least 2 players!');

    // Deal 2 cards to each
    await Promise.all(
      active.map((p) =>
        updateDoc(doc(db, 'games', gameId, 'players', p.id), {
          cards: [getCard(), getCard()],
          status: 'playing',
        })
      )
    );

    await updateDoc(gameRef, {
      phase: 'preflop',
      communityCards: [],
      currentTurn: active[0].id,
    });
  }

  async function nextPhase() {
    if (!user || hostUid !== user.uid) return;
    const gSnap = await getDoc(gameRef);
    const data: any = gSnap.data();

    let newPhase = 'flop';
    let newCards: any[] = [...(data.communityCards || [])];

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
      default:
        break;
    }

    await updateDoc(gameRef, { phase: newPhase, communityCards: newCards });
  }

  // Simple bet join
  const startGame = async (newBet: number) => {
    if (!user) return;
    if (newBet > balance) return alert('Insufficient balance');
    await placeBet(user.uid, newBet, 1, 'poker');
    await updateDoc(doc(db, 'games', gameId, 'players', user.uid), {
      bet: newBet,
      status: 'ready',
    });
    await refreshBalance();
  };

  // --- Simple UI for demo ---
  if (!user) return <BackgroundLayout><p>Please sign in</p></BackgroundLayout>;

  return (
    <BackgroundLayout>
      <div className="game-container">
        <CurrencyProvider base="NZD" DefaultCurrency="NZD">
          <h1>♣ Poker ♠</h1>
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
            {otherPlayers.map((p) => (
              <div key={p.uid} style={{ borderBottom: '1px solid gray', padding: 4 }}>
                {p.displayName}: {p.cards?.length ? '●●' : 'Waiting'}
              </div>
            ))}
          </div>
        </div>

        {hostUid === user.uid && (
          <div className="controls">
            {phase === 'waiting' && <button onClick={beginRound}>Start Round</button>}
            {['preflop','flop','turn','river'].includes(phase) && (
              <button onClick={nextPhase}>Next Phase</button>
            )}
          </div>
        )}
      </div>
    </BackgroundLayout>
  );
}
