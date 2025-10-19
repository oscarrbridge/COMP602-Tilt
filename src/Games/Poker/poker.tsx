// Poker.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { updatePlayerStatus, resetRound } from './pokerfunctions';
import { useUser } from '../../../Backend/firebase/UserFunctions';
import BackgroundLayout from '../../components/BackgroundLayout/BackgroundLayout.tsx';
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../Backend/firebase/firebaseConfig';
import { evaluateHand } from './pokerHandEvaluator';
import { tryStartHand, dealNextStreet } from './pokerfunctions';

// ===== Card helpers =====
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function PokerGame() {
  const { gameId } = useParams();
  const { user } = useUser();

  const [players, setPlayers] = useState<any[]>([]);
  const [communityCards, setCommunityCards] = useState<string[]>([]);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [myTurn, setMyTurn] = useState(false);
  const [round, setRound] = useState<'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('preflop');
  const [ready, setReady] = useState(false);

  // ===== Listen for realtime updates =====
  useEffect(() => {
    if (!gameId) return;

    const playersRef = collection(db, 'games', gameId, 'players');
    const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
      setPlayers(snapshot.docs.map((d) => ({ uid: d.id, ...d.data() })));
    });

    const gameRef = doc(db, 'games', gameId);
    const unsubGame = onSnapshot(gameRef, (snap) => {
      if (!snap.exists()) return;
      const data: any = snap.data();
      setCommunityCards(data.communityCards || []);
      setPot(data.pot || 0);
      setCurrentBet(data.currentBet || 0);
      setRound(data.round || 'preflop');
      setMyTurn(data.currentTurn === user?.uid);
    });

    return () => {
      unsubPlayers();
      unsubGame();
    };
  }, [gameId, user?.uid]);

  useEffect(() => {
    if (!gameId || !players.length || !user) return;
    const allReady = players.length > 1 && players.every((p) => p.ready);
    if (!allReady) return;

    (async () => {
      const g = await getDoc(doc(db, 'games', gameId));
      const data: any = g.exists() ? g.data() : {};
      if (data.host === user.uid) {
        await tryStartHand(gameId, user.uid);
      }
    })();
  }, [gameId, players, user?.uid]);

  // ===== Ready up =====
  const readyUp = async () => {
    if (!user || !gameId) return;
    await sleep(400);
    await updatePlayerStatus(gameId, user.uid, { ready: true });
    setReady(true);
  };

  // ===== Host-only street progression checks =====
  useEffect(() => {
    if (!gameId || !user) return;

    (async () => {
      const gSnap = await getDoc(doc(db, 'games', gameId));
      if (!gSnap.exists()) return;
      const g: any = gSnap.data();
      if (g.host !== user.uid) return;
      if (g.round === 'showdown') return;

      const active = players.filter((p) => p.status === 'playing');
      if (active.length === 0) return;

      // single survivor → pay & reset
      if (active.length === 1) {
        const w = active[0];
        await updatePlayerStatus(gameId, w.uid, { chips: (w.chips || 0) + (g.pot || 0) });
        await resetRound(gameId);
        return;
      }

      // everyone acted and bets equal → next street
      const allActed = active.every((p) => p.hasActed);
      const allBetsEqual = active.every((p) => (p.bet || 0) === (g.currentBet || 0));
      if (allActed && allBetsEqual) {
        await dealNextStreet(gameId, user.uid);
      }
    })();
  }, [gameId, user?.uid, players, currentBet, round]);

  // ===== Host computes winners on showdown =====
  useEffect(() => {
    if (!gameId) return;
    if (round !== 'showdown') return;

    (async () => {
      const g = await getDoc(doc(db, 'games', gameId));
      const data: any = g.exists() ? g.data() : {};
      if (data.host === user?.uid) {
        await showdown();
      }
    })();
  }, [round, gameId, user?.uid]);

  // ===== Player Action Handler (transactional) =====
  const playerAction = async (action: 'fold' | 'call' | 'check' | 'raise', amount = 0) => {
    if (!myTurn || !user || !gameId) return;

    await runTransaction(db, async (tx) => {
      const gameRef = doc(db, 'games', gameId);
      const meRef = doc(db, 'games', gameId, 'players', user.uid);

      const gSnap = await tx.get(gameRef);
      const pSnap = await tx.get(meRef);
      if (!gSnap.exists() || !pSnap.exists()) return;

      const g: any = gSnap.data();
      const me: any = pSnap.data();
      if (g.currentTurn !== user.uid) return;

      // Do all reads you'll need *before* any writes:
      const playersColRef = collection(db, 'games', gameId, 'players');
      const playersSnap = await getDocs(playersColRef); // non-transactional read is ok,
      // but keep it BEFORE any tx.update
      const order: string[] = g.playersOrder || [];

      let potVal = g.pot || 0;
      let myBet = me.bet || 0;
      let currentBetVal = g.currentBet || 0;

      if (action === 'fold') {
        tx.update(meRef, { status: 'folded', hasActed: true, updatedAt: serverTimestamp() });
      } else if (action === 'call') {
        const callAmt = Math.max(0, currentBetVal - myBet);
        if (callAmt > 0 && me.chips >= callAmt) {
          potVal += callAmt;
          myBet += callAmt;
          tx.update(meRef, {
            bet: myBet,
            chips: me.chips - callAmt,
            hasActed: true,
            updatedAt: serverTimestamp(),
          });
          tx.update(gameRef, { pot: potVal, updatedAt: serverTimestamp() });
        } else {
          tx.update(meRef, { hasActed: true, updatedAt: serverTimestamp() });
        }
      } else if (action === 'check') {
        if (myBet < currentBetVal) return;
        tx.update(meRef, { hasActed: true, updatedAt: serverTimestamp() });
      } else if (action === 'raise') {
        const raiseAmt = Math.max(0, Math.floor(Number(amount)));
        if (raiseAmt <= 0 || me.chips < raiseAmt) return;

        myBet += raiseAmt;
        currentBetVal = myBet;
        potVal += raiseAmt;

        tx.update(meRef, {
          bet: myBet,
          chips: me.chips - raiseAmt,
          hasActed: true,
          updatedAt: serverTimestamp(),
        });
        tx.update(gameRef, {
          pot: potVal,
          currentBet: currentBetVal,
          updatedAt: serverTimestamp(),
        });

        // reuse playersSnap captured before any writes
        playersSnap.docs.forEach((d) => {
          if (d.id !== user.uid) {
            const p: any = d.data();
            if (p.status === 'playing') {
              tx.update(d.ref, { hasActed: false });
            }
          }
        });
      }

      // compute next turn using the same playersSnap
      const alive = new Set<string>();
      playersSnap.docs.forEach((d) => {
        const s = (d.data() as any).status;
        if (s === 'playing') alive.add(d.id);
      });

      const myIdx = order.indexOf(user.uid);
      let nextUid: string | null = null;
      for (let i = 1; i <= order.length; i++) {
        const cand = order[(myIdx + i) % order.length];
        if (alive.has(cand)) {
          nextUid = cand;
          break;
        }
      }
      tx.update(gameRef, { currentTurn: nextUid, updatedAt: serverTimestamp() });
    });
  };

  const parseCard = (s: string) => {
    const suit = s.slice(-1);
    const rank = s.slice(0, -1);
    return { rank, suit };
  };

  // ===== Determine winner =====
  const showdown = async () => {
    await sleep(200);
    const livePlayers = players.filter((p) => p.status === 'playing');
    const scores = livePlayers.map((p) => ({
      uid: p.uid,
      handValue: evaluateHand([...(p.holeCards || []), ...communityCards].map(parseCard)),
    }));

    const maxScore = Math.max(...scores.map((s) => s.handValue));
    const winners = scores.filter((s) => s.handValue === maxScore);
    const share = Math.floor(pot / winners.length);

    for (const w of winners) {
      const p = players.find((pl) => pl.uid === w.uid);
      if (p) await updatePlayerStatus(gameId!, p.uid, { chips: p.chips + share });
    }

    await resetRound(gameId!);
  };

// ===== UI =====
if (!user) {
  return (
    <BackgroundLayout>
      <div className='game-container'>
        <h1>♠ Poker ♣</h1>
        <p className='small'>Sign in to join this table.</p>
      </div>
    </BackgroundLayout>
  );
}

return (
  <BackgroundLayout>
    <div className='game-container'>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        ♠ Poker ♣
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(gameId || '');
              alert('Copied game ID!');
            } catch (err) {
              console.error('Copy failed', err);
            }
          }}
          style={{
            padding: '4px 8px',
            fontSize: '0.8rem',
            borderRadius: 6,
            background: 'var(--secondary-colour)',
            border: '1px solid rgba(255,255,255,.12)',
            color: 'var(--text-colour)',
            cursor: 'pointer',
          }}
        >
          Copy Lobby Link
        </button>
      </h1>
      {/* Community Cards */}
      <div className='table'>
        <div className='hand-container'>
          <h2>Community Cards</h2>
          <div className='cards'>
            {communityCards.map((card: string, i: number) => (
              <div
                key={i}
                className={`card ${
                  card.includes('♥') || card.includes('♦') ? 'red' : ''
                } dealt`}
              >
                {card}
              </div>
            ))}
          </div>
        </div>
        <h2>Pot: ${pot} / Round: {round}</h2>

        {/* Player Hands */}
        <div className='hand-container'>
          <h2>You</h2>
          <div className='cards'>
            {players
              .find((p) => p.uid === user?.uid)
              ?.holeCards?.map((card: string, i: number) => (
                <div
                  key={i}
                  className={`card ${
                    card.includes('♥') || card.includes('♦') ? 'red' : ''
                  } dealt`}
                >
                  {card}
                </div>
              )) || (
              <p className='small' style={{ opacity: 0.7 }}>
                Waiting for cards...
              </p>
            )}
          </div>
        </div>

        {/* Other Players */}
        {players.filter((p) => p.uid !== user?.uid).length > 0 && (
          <div className='hand-container'>
            <h2>Other Players</h2>
            <div className='cards' style={{ display: 'grid', gap: 8 }}>
              {players
                .filter((p) => p.uid !== user?.uid)
                .map((p) => (
                  <div
                    key={p.uid}
                    style={{
                      border: '1px solid rgba(255,255,255,.12)',
                      borderRadius: 8,
                      padding: 8,
                    }}
                  >
                    <div style={{ marginBottom: 6, fontWeight: 600 }}>
                      {p.displayName || p.uid.slice(0, 6)} - Chips: {p.chips}
                      {p.uid === user?.uid && ' (You)'}
                      {p.status === 'playing' ? ' • playing' : ` (${p.status})`}
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(p.holeCards || []).map((card: string, i: number) => (
                        <div
                          key={i}
                          className={`card ${
                            card.includes('♥') || card.includes('♦') ? 'red' : ''
                          } dealt`}
                          style={{ minWidth: 32, textAlign: 'center' }}
                        >
                          {p.uid === user?.uid ? card : '??'}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className='controls' style={{ marginTop: 20 }}>
        {!ready && <button onClick={readyUp}>Ready Up</button>}

        {myTurn && round !== 'showdown' && (
          <>
            <button onClick={() => playerAction('check')}>Check</button>
            <button onClick={() => playerAction('call')}>Call</button>
            <button onClick={() => playerAction('raise', 50)}>Raise 50</button>
            <button onClick={() => playerAction('fold')}>Fold</button>
          </>
        )}

        {round === 'showdown' && (
          <button onClick={() => resetRound(gameId!)}>Next Hand</button>
        )}
      </div>
    </div>
  </BackgroundLayout>
);
}
