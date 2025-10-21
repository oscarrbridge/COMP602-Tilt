// Poker.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  updatePlayerStatus,
  resetRound,
  tryStartHand,
  dealNextStreet,
  setNextTurnSafe,
} from './pokerfunctions';
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
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../../Backend/firebase/firebaseConfig';
import { evaluateHand } from './pokerHandEvaluator';
import { updateDoc } from 'firebase/firestore';

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
  const [advancing, setAdvancing] = useState(false);

  // ===== Listen for realtime updates =====
  useEffect(() => {
    if (!gameId) return;

    const playersRef = collection(db, 'games', gameId, 'players');
    const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));
      setPlayers(list);

      const me = list.find((p) => p.uid === user?.uid);
      if (me) setReady(!!me.ready);
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

  // ===== Auto-start hand when enough players ready =====
  useEffect(() => {
    if (!gameId || !user || !players.length) return;

    (async () => {
      const gSnap = await getDoc(doc(db, 'games', gameId));
      if (!gSnap.exists()) return;
      const g: any = gSnap.data();

      // Only host can start hands
      if (g.host !== user.uid) return;

      // Already in progress? skip
      if (g.state === 'in-progress' || g.dealLock) return;

      const readyPlayers = players.filter((p) => p.ready && p.status !== 'folded');
      const min = g.minPlayers ?? 2;

      // Start once min ready
      if (readyPlayers.length >= min) {
        console.log('Host detected enough ready players, starting hand...');
        try {
          await tryStartHand(gameId, user.uid);
        } catch (err: any) {
          console.error('Failed to start hand', err.message);
        }
      }
    })();
  }, [gameId, user?.uid, players]);

  // ===== Ready up =====
  const readyUp = async () => {
    if (!user || !gameId) return;
    try {
      const meRef = doc(db, 'games', gameId, 'players', user.uid);
      console.log('ReadyUp ->', { gameId, uid: user.uid });
      await updatePlayerStatus(gameId, user.uid, { ready: true });
      // extra safety in case merge semantics change elsewhere
      await updateDoc(meRef, { ready: true, updatedAt: serverTimestamp() });
      setReady(true); // local UX; also mirrored by snapshot above
    } catch (e) {
      console.error('readyUp failed', e);
    }
  };

  const sanitize = (obj: Record<string, any>) => {
    const o: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue; // Firestore rejects undefined
      if (typeof v === 'number' && !Number.isFinite(v)) continue; // rejects NaN/Inf
      o[k] = Array.isArray(v) ? v.filter((x) => x !== undefined) : v;
    }
    return o;
  };

  // ===== Host-only street progression checks =====
  useEffect(() => {
    if (!gameId || !user) return;

    (async () => {
      const gSnap = await getDoc(doc(db, 'games', gameId));
      if (!gSnap.exists()) return;
      const g: any = gSnap.data();

      // host only
      if (g.host !== user.uid) return;

      // Don't progress/clean while waiting in the lobby
      if (g.state !== 'in-progress') return;

      // also stop at showdown; showdown effect handles payout
      if (g.round === 'showdown') return;

      const active = players.filter((p) => p.status === 'playing');

      // single survivor → pay & reset
      if (active.length <= 1) {
        const w = active[0]; // undefined if 0 survivors
        if (w) {
          await updatePlayerStatus(gameId, w.uid, { chips: (w.chips || 0) + (g.pot || 0) });
        }
        await resetRound(gameId);
        return;
      }

      const allActed = active.every((p) => p.hasActed);
      const allBetsEqual = active.every((p) => (p.bet || 0) === (g.currentBet || 0));
      if (!advancing && allActed && allBetsEqual) {
        setAdvancing(true);
        try {
          await dealNextStreet(gameId, user.uid);
        } finally {
          setAdvancing(false);
        }
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

  // ===== Player Action Handler (transactional core + post-step) =====
  const playerAction = async (action: 'fold' | 'call' | 'check' | 'raise', amount = 0) => {
    if (!myTurn || !user || !gameId) return;

    const gameRef = doc(db, 'games', gameId);
    const meRef = doc(db, 'games', gameId, 'players', user.uid);

    // 1) Lightweight path: actions that don't need game writes -> don't read the game doc
    if (action === 'fold' || action === 'check') {
      if (action === 'check') {
        // Validate using fresh reads (no tx), then mark acted
        const [gSnap, pSnap] = await Promise.all([getDoc(gameRef), getDoc(meRef)]);
        const g = gSnap.data() as any;
        const me = pSnap.data() as any;
        if (!g || !me) return;
        if ((me.bet || 0) < (g.currentBet || 0)) return; // can't check
        await updateDoc(meRef, sanitize({ hasActed: true, updatedAt: serverTimestamp() }));
      } else {
        // fold: plain update (no tx, no precondition)
        await updateDoc(
          meRef,
          sanitize({ status: 'folded', hasActed: true, updatedAt: serverTimestamp() })
        );
      }

      // Next turn (safe, tiny tx on the game doc)
      const [g2Snap, playersSnap] = await Promise.all([
        getDoc(gameRef),
        getDocs(collection(db, 'games', gameId, 'players')),
      ]);
      const g2: any = g2Snap.data() || {};
      const order: string[] = g2.playersOrder || [];
      const alive = new Set(
        playersSnap.docs.filter((d) => (d.data() as any).status === 'playing').map((d) => d.id)
      );

      const myIdx = order.indexOf(user.uid);
      if (myIdx === -1) {
        await setNextTurnSafe(gameId, user.uid, null);
        return;
      }
      let nextUid: string | null = null;
      for (let i = 1; i <= order.length; i++) {
        const cand = order[(myIdx + i) % order.length];
        if (alive.has(cand)) {
          nextUid = cand;
          break;
        }
      }
      await setNextTurnSafe(gameId, user.uid, nextUid);
      return;
    }

    // 2) Heavy path: actions that change pot/currentBet -> keep the tx, but only read what's needed
    await runTransaction(db, async (tx) => {
      const gSnap = await tx.get(gameRef);
      const pSnap = await tx.get(meRef);
      if (!gSnap.exists() || !pSnap.exists()) return;

      const g = gSnap.data() as any;
      const me = pSnap.data() as any;
      if (g.currentTurn !== user.uid) return;

      let potVal = g.pot || 0;
      let myBet = me.bet || 0;
      let curBet = g.currentBet || 0;

      if (action === 'call') {
        const callAmt = Math.max(0, curBet - myBet);
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
        return;
      }

      if (action === 'raise') {
        const raiseAmt = Math.max(0, Math.floor(Number(amount)));
        if (raiseAmt <= 0 || me.chips < raiseAmt) return;

        myBet += raiseAmt;
        curBet = myBet;
        potVal += raiseAmt;

        tx.update(meRef, {
          bet: myBet,
          chips: me.chips - raiseAmt,
          hasActed: true,
          updatedAt: serverTimestamp(),
        });
        tx.update(gameRef, { pot: potVal, currentBet: curBet, updatedAt: serverTimestamp() });
        return;
      }
    });

    // After call/raise: reset others' hasActed if a raise happened, and advance turn safely
    const [g2Snap, playersSnap] = await Promise.all([
      getDoc(gameRef),
      getDocs(collection(db, 'games', gameId, 'players')),
    ]);
    const g2: any = g2Snap.data() || {};
    const order: string[] = g2.playersOrder || [];
    const alive = new Set(
      playersSnap.docs.filter((d) => (d.data() as any).status === 'playing').map((d) => d.id)
    );

    if (action === 'raise') {
      const batch = writeBatch(db);
      playersSnap.docs.forEach((d) => {
        if (d.id !== user.uid && alive.has(d.id)) {
          batch.update(d.ref, { hasActed: false });
        }
      });
      await batch.commit();
    }

    const myIdx = order.indexOf(user.uid);
    if (myIdx === -1) {
      await setNextTurnSafe(gameId, user.uid, null);
      return;
    }
    let nextUid: string | null = null;
    for (let i = 1; i <= order.length; i++) {
      const cand = order[(myIdx + i) % order.length];
      if (alive.has(cand)) {
        nextUid = cand;
        break;
      }
    }
    await setNextTurnSafe(gameId, user.uid, nextUid);
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

  const me = players.find((p) => p.uid === user?.uid);

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
                  className={`card ${card.includes('♥') || card.includes('♦') ? 'red' : ''} dealt`}
                >
                  {card}
                </div>
              ))}
            </div>
          </div>
          <h2>
            Pot: ${pot} / Round: {round}
          </h2>

          {/* Player Hands */}
          <div className='hand-container'>
            <h2>You</h2>
            <div className='cards'>
              {players
                .find((p) => p.uid === user?.uid)
                ?.holeCards?.map((card: string, i: number) => (
                  <div
                    key={i}
                    className={`card ${card.includes('♥') || card.includes('♦') ? 'red' : ''} dealt`}
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
                            className={`card ${card.includes('♥') || card.includes('♦') ? 'red' : ''} dealt`}
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
          {/* use Firestore state */}
          {!me?.ready && <button onClick={readyUp}>Ready Up</button>}

          {myTurn && round !== 'showdown' && (
            <>
              <button onClick={() => playerAction('check')}>Check</button>
              <button onClick={() => playerAction('call')}>Call</button>
              <button onClick={() => playerAction('raise', 50)}>Raise 50</button>
              <button onClick={() => playerAction('fold')}>Fold</button>
            </>
          )}

          {round === 'showdown' && <button onClick={() => resetRound(gameId!)}>Next Hand</button>}
        </div>
      </div>
    </BackgroundLayout>
  );
}
