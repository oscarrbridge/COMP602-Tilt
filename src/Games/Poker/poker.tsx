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
import { CurrencyProvider } from '../../components/CurrencySwitcher/currencyswitcher.tsx';
import BetControls from '../BetControls/BetControls.tsx';

// reuse Blackjack UI styles 1:1
import '../poker/poker.css';

// ===== helpers =====
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isRed = (card: string) => card.includes('♥') || card.includes('♦');

export default function PokerGame() {
  const { gameId } = useParams();
  const { user, balance } = useUser();
  const [bet, setBet] = useState(50);
  const [players, setPlayers] = useState<any[]>([]);
  const [communityCards, setCommunityCards] = useState<string[]>([]);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [myTurn, setMyTurn] = useState(false);
  const [round, setRound] = useState<'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('preflop');
  const [ready, setReady] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [currentTurnUid, setCurrentTurnUid] = useState<string | null>(null); // visual only

  const [raiseAmt, setRaiseAmt] = useState(50);

  // helpers based on current table state
  const myBet = players.find((p) => p.uid === user?.uid)?.bet || 0;
  const chips = players.find((p) => p.uid === user?.uid)?.chips || 0;
  const toCall = Math.max(0, currentBet - myBet);
  const maxRaise = Math.max(0, chips); // you can raise up to your remaining chips
  const step = 25;

  const startFromBetPanel = async (_amountInBase: number) => {
    // Poker doesn't use this stake; we just use the panel UX to Ready Up.
    await readyUp();
  };

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
      setCurrentTurnUid(data.currentTurn ?? null);
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

      // host only
      if (g.host !== user.uid) return;

      // not while in-progress/locked
      if (g.state === 'in-progress' || g.dealLock) return;

      // start when min ready & not folded
      const readyPlayers = players.filter((p) => p.ready && p.status !== 'folded');
      const min = g.minPlayers ?? 2;
      if (readyPlayers.length >= min) {
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
      await updatePlayerStatus(gameId, user.uid, { ready: true });
      await updateDoc(meRef, { ready: true, updatedAt: serverTimestamp() });
      setReady(true);
    } catch (e) {
      console.error('readyUp failed', e);
    }
  };

  const sanitize = (obj: Record<string, any>) => {
    const o: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      if (typeof v === 'number' && !Number.isFinite(v)) continue;
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

      if (g.host !== user.uid) return;
      if (g.state !== 'in-progress') return;
      if (g.round === 'showdown') return;

      const active = players.filter((p) => p.status === 'playing');

      // single survivor → pay & reset
      if (active.length <= 1) {
        const w = active[0];
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

  // ===== Player Action Handler (logic unchanged) =====
  const playerAction = async (action: 'fold' | 'call' | 'check' | 'raise', amount = 0) => {
    if (!myTurn || !user || !gameId) return;

    const gameRef = doc(db, 'games', gameId);
    const meRef = doc(db, 'games', gameId, 'players', user.uid);

    // lightweight: fold/check don't mutate pot/currentBet
    if (action === 'fold' || action === 'check') {
      if (action === 'check') {
        const [gSnap, pSnap] = await Promise.all([getDoc(gameRef), getDoc(meRef)]);
        const g = gSnap.data() as any;
        const me = pSnap.data() as any;
        if (!g || !me) return;
        if ((me.bet || 0) < (g.currentBet || 0)) return; // can't check
        await updateDoc(meRef, sanitize({ hasActed: true, updatedAt: serverTimestamp() }));
      } else {
        await updateDoc(
          meRef,
          sanitize({ status: 'folded', hasActed: true, updatedAt: serverTimestamp() })
        );
      }

      // advance turn safely
      const [g2Snap, playersSnap] = await Promise.all([
        getDoc(gameRef),
        getDocs(collection(db, 'games', gameId, 'players')),
      ]);
      const g2: any = g2Snap.data() || {};
      const order: string[] = g2.playersOrder || [];
      const alive = new Set(
        playersSnap.docs.filter((d) => (d.data() as any).status === 'playing').map((d) => d.id)
      );
      if (alive.size <= 1) {
        // ✅ end hand now for any client; no host required
        await finishIfSingleSurvivor(gameId);
        return;
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
      return;
    }

    // heavy: call/raise affects pot/currentBet
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

    // after call/raise
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
      const pl = players.find((x) => x.uid === w.uid);
      if (pl) await updatePlayerStatus(gameId!, pl.uid, { chips: pl.chips + share });
    }

    await resetRound(gameId!);
  };

  // ===== UI =====
  if (!user) {
    return (
      <BackgroundLayout gameId='Poker'>
        {' '}
        <div className='game-container'>
          <p className='small'>Sign in to join this table.</p>
        </div>
      </BackgroundLayout>
    );
  }

  const me = players.find((p) => p.uid === user?.uid);
  const others = players.filter((p) => p.uid !== user?.uid);

  return (
    <BackgroundLayout gameId='Poker'>
      <div
        className='bj-game-container'
        style={{
          backgroundImage: "url('/assets/poker-bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <button
          className='bj-btn bj-btn--blue copy-link-fab'
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(gameId || '');
              alert('Copied game ID!');
            } catch (err) {
              console.error('Copy failed', err);
            }
          }}
        >
          Copy Lobby Link
        </button>
        {/* Table shell (uses Blackjack styles 1:1) */}
        <div className='bj-table'>
          {!me?.ready && (
            <div className='ready-overlay'>
              <div className='ready-card'>
                <h3>Ready to play?</h3>
                <p>Click below to ready up. The hand will start when enough players are ready.</p>
                <button className='bj-btn bj-btn--blue bj-btn--cta' onClick={readyUp}>
                  Ready Up
                </button>
              </div>
            </div>
          )}

          {/* Community */}
          <div className='bj-hand'>
            <div className='bj-hand-head community-head'>
              <span className='bj-hand-label'>Community</span>
              <span className='bj-pot-inline'>Pot ${pot}</span>
            </div>
            <div className='bj-cards'>
              {communityCards.map((card, i) => (
                <div
                  key={`cc-${i}`}
                  className={['bj-card', isRed(card) ? 'red' : '', 'dealt', 'face-up'].join(' ')}
                  aria-label={card}
                  style={{ transitionDelay: `${i * 120}ms` }}
                >
                  <div className='bj-card-inner'>
                    <div className='bj-card-front'>
                      <span className='bj-rank'>{card.slice(0, -1)}</span>
                      <span className='bj-suit'>{card.slice(-1)}</span>
                    </div>
                    <div className='bj-card-back' />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* You */}
          <div className='bj-hand'>
            <div className='bj-hand-head'>
              <span className='bj-hand-label'>
                You <span className='bj-score'>(chips {me?.chips ?? 0})</span>
              </span>
            </div>
            <div className='bj-cards'>
              {me?.holeCards?.length ? (
                me.holeCards.map((card: string, i: number) => (
                  <div
                    key={`me-${i}`}
                    className={['bj-card', isRed(card) ? 'red' : '', 'dealt', 'face-up'].join(' ')}
                    aria-label={card}
                    style={{ transitionDelay: `${i * 120}ms` }}
                  >
                    <div className='bj-card-inner'>
                      <div className='bj-card-front'>
                        <span className='bj-rank'>{card.slice(0, -1)}</span>
                        <span className='bj-suit'>{card.slice(-1)}</span>
                      </div>
                      <div className='bj-card-back' />
                    </div>
                  </div>
                ))
              ) : (
                <p className='small' style={{ opacity: 0.7 }}>
                  Waiting for cards...
                </p>
              )}
            </div>
          </div>

          {/* Other Players – floating panel like Blackjack */}
          {others.length > 0 && (
            <aside className='bj-others-float'>
              <div className='bj-others-title'>Other Players</div>

              {others.map((p) => (
                <div key={p.uid} className='bj-others-row'>
                  <div className='bj-others-head'>
                    {p.displayName || p.uid.slice(0, 6)} • Chips: {p.chips}
                    {p.status === 'playing' ? ' • playing' : ` (${p.status})`}
                    {currentTurnUid === p.uid ? ' • turn' : ''}
                  </div>

                  <div className='bj-cards bj-others-cards'>
                    {(p.holeCards || []).map((card: string, i: number) => {
                      const showFaceUp = round === 'showdown';
                      return (
                        <div
                          key={`${p.uid}-${i}`}
                          className={[
                            'bj-card',
                            isRed(card) ? 'red' : '',
                            'dealt',
                            showFaceUp ? 'face-up' : 'face-down',
                          ].join(' ')}
                          aria-label={showFaceUp ? card : 'Face-down card'}
                        >
                          <div className='bj-card-inner'>
                            <div className='bj-card-front'>
                              <span className='bj-rank'>{card.slice(0, -1)}</span>
                              <span className='bj-suit'>{card.slice(-1)}</span>
                            </div>
                            <div className='bj-card-back' />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </aside>
          )}
        </div>
        {/* Controls (unchanged behavior) */}
        <div className='bj-controls' style={{ marginTop: 20 }}>
          {myTurn && round !== 'showdown' && (
            <>
              {/* Compact raise control */}
              <div className='pkr-raise'>
                <div className='pkr-raise-row'>
                  <span className='pkr-raise-label'>Raise:</span>
                  <button
                    className='pkr-chip'
                    onClick={() => setRaiseAmt((v) => Math.max(0, v - step))}
                  >
                    - {step}
                  </button>
                  <input
                    className='pkr-raise-slider'
                    type='range'
                    min={0}
                    max={maxRaise}
                    step={step}
                    value={raiseAmt}
                    onChange={(e) => setRaiseAmt(Number(e.target.value))}
                  />
                  <button
                    className='pkr-chip'
                    onClick={() => setRaiseAmt((v) => Math.min(maxRaise, v + step))}
                  >
                    + {step}
                  </button>
                  <button className='pkr-chip' onClick={() => setRaiseAmt(maxRaise)}>
                    Max
                  </button>
                  <div className='pkr-raise-amt'>${raiseAmt}</div>
                </div>
                <div className='pkr-to-call'>To call: ${toCall}</div>
              </div>

              {/* Action buttons */}
              <div className='pkr-actions'>
                {toCall === 0 ? (
                  <button className='bj-btn bj-btn--blue' onClick={() => playerAction('check')}>
                    Check
                  </button>
                ) : (
                  <button className='bj-btn bj-btn--blue' onClick={() => playerAction('call')}>
                    Call ${toCall}
                  </button>
                )}

                <button
                  className='bj-btn bj-btn--blue'
                  onClick={() => playerAction('raise', raiseAmt)}
                  disabled={raiseAmt <= 0}
                >
                  Raise ${raiseAmt}
                </button>

                <button className='bj-btn bj-btn--blue' onClick={() => playerAction('fold')}>
                  Fold
                </button>
              </div>
            </>
          )}

          {round === 'showdown' && (
            <button className='bj-btn' onClick={() => resetRound(gameId!)}>
              Next Hand
            </button>
          )}
        </div>
      </div>
    </BackgroundLayout>
  );
}
