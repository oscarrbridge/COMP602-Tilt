// pokerfunctions.ts
import { db } from '../../../Backend/firebase/firebaseConfig';
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  getDocs,
  updateDoc,
  deleteDoc as deleteFirestoreDoc,
  getDoc,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';

/** Join an existing poker lobby */
export async function joinPokerLobby(gameId: string, uid: string, displayName?: string) {
  const playerRef = doc(db, 'games', gameId, 'players', uid);
  const existing = await getDoc(playerRef);
  const initial: Partial<{ chips: number }> = existing.exists() ? {} : { chips: 1000 };

  await setDoc(
    playerRef,
    {
      displayName: displayName || 'Anonymous',
      bet: 0,
      cards: [],
      holeCards: [],
      ...initial,
      status: 'waiting',
      ready: false,
      joinedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Create a new poker lobby */
export async function createPokerLobby(hostUid: string, minPlayers = 2, maxPlayers = 6) {
  const gameRef = doc(collection(db, 'games'));

  const baseGameData = {
    host: hostUid,
    currentTurn: null,
    state: 'waiting',
    minPlayers,
    maxPlayers,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    gameType: 'poker',
    communityCards: [] as string[],
    pot: 0,
    currentBet: 0,
    dealerPosition: 0,
    smallBlind: 10,
    bigBlind: 20,
    round: 'preflop' as 'preflop',
    playersOrder: [] as string[],
    deck: [] as string[],
    deckIndex: 0,
    dealLock: null as any,
    streetLock: null as any,
  };

  await setDoc(gameRef, baseGameData);
  return gameRef.id;
}

/** Update a poker player's data */
export async function updatePlayerStatus(
  gameId: string,
  uid: string,
  updates: Partial<{
    cards: string[];
    holeCards: string[];
    bet: number;
    status: string;
    chips: number;
    ready: boolean;
    hasActed: boolean;
  }>
) {
  const playerRef = doc(db, 'games', gameId, 'players', uid);
  await setDoc(playerRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
}

/** Update poker game state */
export async function updatePokerGame(
  gameId: string,
  updates: Partial<{
    communityCards: string[];
    pot: number;
    currentBet: number;
    round: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
    playersOrder: string[];
    dealerPosition: number;
    state: 'waiting' | 'in-progress' | 'finished';
    currentTurn: string | null;
  }>
) {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, { ...updates, updatedAt: serverTimestamp() });
}

export async function setNextTurn(gameId: string, nextPlayerUid: string | null) {
  await updatePokerGame(gameId, { currentTurn: nextPlayerUid });
}

/** Player Action helpers (optional direct calls) */
export async function playerCall(gameId: string, uid: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) return;

  const gameData = gameSnap.data() as any;
  const playerRef = doc(db, 'games', gameId, 'players', uid);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) return;

  const player = playerSnap.data() as any;
  const diff = (gameData.currentBet || 0) - (player.bet || 0);

  if (player.chips >= diff && diff > 0) {
    await updateDoc(playerRef, { chips: player.chips - diff, bet: gameData.currentBet });
    await updateDoc(gameRef, { pot: (gameData.pot || 0) + diff });
  }
}

export async function playerRaise(gameId: string, uid: string, raiseAmount: number) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) return;

  const gameData = gameSnap.data() as any;
  const playerRef = doc(db, 'games', gameId, 'players', uid);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) return;

  const player = playerSnap.data() as any;
  const totalBet = (gameData.currentBet || 0) + raiseAmount;
  const diff = totalBet - (player.bet || 0);

  if (player.chips >= diff && diff > 0) {
    await updateDoc(playerRef, { chips: player.chips - diff, bet: totalBet });
    await updateDoc(gameRef, { currentBet: totalBet, pot: (gameData.pot || 0) + diff });
  }
}

export async function playerCheck(gameId: string, uid: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) return;

  const gameData = gameSnap.data() as any;
  const playerRef = doc(db, 'games', gameId, 'players', uid);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) return;

  const player = playerSnap.data() as any;
  if ((player.bet || 0) !== (gameData.currentBet || 0)) {
    // cannot check
    return;
  }
}

export async function playerFold(gameId: string, uid: string) {
  const playerRef = doc(db, 'games', gameId, 'players', uid);
  await updateDoc(playerRef, { status: 'folded' });
}

/** Reset round after a hand finishes */
export async function resetRound(gameId: string) {
  try {
    const gameRef = doc(db, 'games', gameId);
    const batch = writeBatch(db);

    const safeNumber = (n: any, d = 0) => (typeof n === 'number' && Number.isFinite(n) ? n : d);

    batch.update(
      gameRef,
      sanitize({
        communityCards: [],
        pot: safeNumber(0),
        currentBet: safeNumber(0),
        round: 'preflop',
        playersOrder: [],
        currentTurn: null,
        state: 'waiting',
        dealLock: null,
        streetLock: null,
        streetBet: safeNumber(0),
        updatedAt: serverTimestamp(),
      })
    );

    const playersRef = collection(db, 'games', gameId, 'players');
    const playersSnap = await getDocs(playersRef);

    playersSnap.docs.forEach((p) => {
      batch.update(
        p.ref,
        sanitize({
          cards: [],
          holeCards: [],
          bet: safeNumber(0),
          status: 'waiting',
          ready: false,
          hasActed: false,
          updatedAt: serverTimestamp(),
        })
      );
    });

    await batch.commit();
  } catch (e: any) {
    console.error('resetRound failed', { code: e.code, message: e.message, e });
  }
}

/** Delete poker lobby */
export async function deletePokerLobby(gameId: string) {
  const gameRef = doc(db, 'games', gameId);
  const playersRef = collection(db, 'games', gameId, 'players');

  const playersSnap = await getDocs(playersRef);
  await Promise.all(playersSnap.docs.map((p) => deleteFirestoreDoc(p.ref)));

  await deleteFirestoreDoc(gameRef);
}

/** 52-card deck */
export function buildDeck(): string[] {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: string[] = [];
  for (const s of suits) for (const v of values) deck.push(`${v}${s}`);
  // Fisher–Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export async function tryStartHand(gameId: string, hostUid: string) {
  const gameRef = doc(db, 'games', gameId);

  await runTransaction(db, async (tx) => {
    const gSnap = await tx.get(gameRef);
    if (!gSnap.exists()) throw new Error('game not found');
    const g: any = gSnap.data();

    // host-only + not already dealing/started
    if (g.host !== hostUid) return;
    if (g.dealLock || g.state === 'in-progress') return;

    // read players (outside game doc)
    const playersSnap = await getDocs(collection(db, 'games', gameId, 'players'));
    const players = playersSnap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
    const ready = players.filter((p) => p.ready && p.status !== 'folded');
    if (ready.length < (g.minPlayers ?? 2)) return;

    // lock dealing
    tx.update(gameRef, { dealLock: serverTimestamp() });

    // ensure deck
    let deck: string[] = g.deck;
    let deckIndex = g.deckIndex ?? 0;
    if (!deck || deck.length === 0 || deckIndex > deck.length - 10) {
      deck = buildDeck();
      deckIndex = 0;
    }

    // seat/order
    const order = ready.map((p) => p.uid);

    // deal 2 to each
    const need = order.length * 2;
    if (deckIndex + need > deck.length) {
      deck = buildDeck();
      deckIndex = 0;
    }
    const dealSlice = deck.slice(deckIndex, deckIndex + need);
    deckIndex += need;

    order.forEach((uid, i) => {
      const c1 = dealSlice[i * 2];
      const c2 = dealSlice[i * 2 + 1];
      tx.set(
        doc(db, 'games', gameId, 'players', uid),
        { status: 'playing', bet: 0, hasActed: false, holeCards: [c1, c2] },
        { merge: true }
      );
    });

    const firstToAct = order[0] ?? null;

    tx.update(gameRef, {
      state: 'in-progress',
      round: 'preflop',
      playersOrder: order,
      currentTurn: firstToAct,
      currentBet: 0,
      streetBet: 0,
      communityCards: [],
      deck,
      deckIndex,
      dealLock: null, // unlock
      updatedAt: serverTimestamp(),
    });
  });
}

// add near other helpers
export async function finishIfSingleSurvivor(gameId: string) {
  const gameRef = doc(db, 'games', gameId);

  // Use a lock so only one client does the payout
  await runTransaction(db, async (tx) => {
    const gSnap = await tx.get(gameRef);
    if (!gSnap.exists()) return;

    const g: any = gSnap.data();
    if (g.state !== 'in-progress') return;
    if (g.payoutLock) return; // already in progress

    // Lock the payout so no one else runs it
    tx.update(gameRef, { payoutLock: serverTimestamp() });

    // We need current players to see who's alive
    // (reads outside tx are fine; we validated state and set a lock above)
  });

  // Do non-transactional reads/writes after the lock is set
  const [gAfter, playersSnap] = await Promise.all([
    getDoc(gameRef),
    getDocs(collection(db, 'games', gameId, 'players')),
  ]);

  const gData: any = gAfter.data() || {};
  const pot = gData.pot || 0;

  const aliveDocs = playersSnap.docs.filter((d) => (d.data() as any).status === 'playing');

  // If still exactly 1 survivor, pay them and reset
  if (aliveDocs.length === 1) {
    const w = aliveDocs[0];
    const wData: any = w.data();
    await updateDoc(w.ref, { chips: (wData.chips || 0) + pot });
  }

  // Clear lock + reset everything for next hand
  await updateDoc(gameRef, { payoutLock: null });
  await resetRound(gameId);
}

export async function dealNextStreet(gameId: string, hostUid: string) {
  const gameRef = doc(db, 'games', gameId);

  await runTransaction(db, async (tx) => {
    const gSnap = await tx.get(gameRef);
    if (!gSnap.exists()) throw new Error('game not found');
    const g: any = gSnap.data();

    if (g.host !== hostUid || g.streetLock) return;

    // lock street
    tx.update(gameRef, { streetLock: serverTimestamp() });

    let deck: string[] = g.deck || buildDeck();
    let deckIndex: number = g.deckIndex ?? 0;
    let cc: string[] = g.communityCards || [];
    let round: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' = g.round || 'preflop';

    // draw needed cards
    const need = round === 'preflop' ? 3 : 1;
    if (deckIndex + need > deck.length) {
      deck = buildDeck();
      deckIndex = 0;
    }
    const draw = deck.slice(deckIndex, deckIndex + need);
    deckIndex += need;

    if (round === 'preflop') {
      cc = [...cc, ...draw];
      round = 'flop';
    } else if (round === 'flop') {
      cc = [...cc, ...draw];
      round = 'turn';
    } else if (round === 'turn') {
      cc = [...cc, ...draw];
      round = 'river';
    } else if (round === 'river') {
      round = 'showdown';
    }

    // reset per-street flags + advance
    tx.update(gameRef, {
      communityCards: cc,
      currentBet: 0,
      streetBet: 0,
      round,
      deck,
      deckIndex,
      streetLock: null, // unlock
      updatedAt: serverTimestamp(),
    });

    // reset players' hasActed/bet for active players
    const playersSnap = await getDocs(collection(db, 'games', gameId, 'players'));
    const statuses = new Map<string, string>();
    playersSnap.docs.forEach((d) => {
      const p: any = d.data();
      statuses.set(d.id, p.status);
      if (p.status === 'playing') {
        tx.update(d.ref, { hasActed: false, bet: 0 });
      }
    });

    // next turn = first alive in order
    const order: string[] = g.playersOrder || [];
    const next = order.find((uid) => statuses.get(uid) === 'playing') ?? null;
    tx.update(gameRef, { currentTurn: next });
  });
}

/** Atomically draw N cards and advance deckIndex */
export async function drawCardsTx(gameId: string, n: number): Promise<string[]> {
  const gameRef = doc(db, 'games', gameId);
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) throw new Error('game not found');
    const g: any = snap.data();

    let deck: string[] = g.deck || [];
    let idx: number = g.deckIndex ?? 0;

    if (!deck.length || idx + n > deck.length) {
      deck = buildDeck();
      idx = 0;
    }

    const drawn = deck.slice(idx, idx + n);
    tx.update(gameRef, { deck, deckIndex: idx + n, updatedAt: serverTimestamp() });
    return drawn;
  });
}

/** keep tx small & safe when advancing turn */
export async function setNextTurnSafe(gameId: string, expectedUid: string, nextUid: string | null) {
  const gameRef = doc(db, 'games', gameId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) return;
    const g: any = snap.data();
    if (g.currentTurn !== expectedUid) return; // already advanced
    tx.update(gameRef, { currentTurn: nextUid, updatedAt: serverTimestamp() });
  });
}

/** utils */
function sanitize<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (v === undefined) continue;
    if (typeof v === 'number' && !Number.isFinite(v)) continue;
    if (Array.isArray(v)) out[k] = v.filter((el) => el !== undefined);
    else out[k] = v;
  }
  return out;
}
