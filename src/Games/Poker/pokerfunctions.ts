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
} from 'firebase/firestore';

/**
 * Join an existing poker lobby
 */
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

/**
 * Create a new poker lobby
 */
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
    communityCards: [],
    pot: 0,
    currentBet: 0,
    dealerPosition: 0,
    smallBlind: 10,
    bigBlind: 20,
    round: 'preflop',
    playersOrder: [],
    deck: [],
    deckIndex: 0,
    street: 'preflop',
    dealLock: null,
    streetLock: null,
  };

  await setDoc(gameRef, baseGameData);
  console.log(`Created poker lobby: ${gameRef.id}`);
  return gameRef.id;
}

/**
 * Update a poker player's data
 */
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
  }>
) {
  const playerRef = doc(db, 'games', gameId, 'players', uid);
  await setDoc(playerRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Update poker game state
 */
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
    currentTurn: string;
  }>
) {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, { ...updates, updatedAt: serverTimestamp() });
}

export async function setNextTurn(gameId: string, nextPlayerUid: string) {
  await updatePokerGame(gameId, { currentTurn: nextPlayerUid });
}

/**
 * Player Action: Call
 */
export async function playerCall(gameId: string, uid: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) return;

  const gameData = gameSnap.data();
  const playerRef = doc(db, 'games', gameId, 'players', uid);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) return;

  const player = playerSnap.data();
  const diff = gameData.currentBet - (player.bet || 0);

  if (player.chips >= diff) {
    await updateDoc(playerRef, {
      chips: player.chips - diff,
      bet: gameData.currentBet,
    });
    await updateDoc(gameRef, { pot: (gameData.pot || 0) + diff });
    console.log(`${uid} called ${diff}`);
  }
}

/**
 * Player Action: Raise
 */
export async function playerRaise(gameId: string, uid: string, raiseAmount: number) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) return;

  const gameData = gameSnap.data();
  const playerRef = doc(db, 'games', gameId, 'players', uid);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) return;

  const player = playerSnap.data();
  const totalBet = gameData.currentBet + raiseAmount;
  const diff = totalBet - (player.bet || 0);

  if (player.chips >= diff) {
    await updateDoc(playerRef, {
      chips: player.chips - diff,
      bet: totalBet,
    });
    await updateDoc(gameRef, {
      currentBet: totalBet,
      pot: (gameData.pot || 0) + diff,
    });
    console.log(`${uid} raised to ${totalBet}`);
  }
}

/**
 * Player Action: Check
 */
export async function playerCheck(gameId: string, uid: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) return;

  const gameData = gameSnap.data();
  const playerRef = doc(db, 'games', gameId, 'players', uid);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) return;

  const player = playerSnap.data();

  if ((player.bet || 0) === gameData.currentBet) {
    console.log(`${uid} checked`);
  } else {
    console.log(`${uid} cannot check, must call or fold`);
  }
}

/**
 * Player Action: Fold
 */
export async function playerFold(gameId: string, uid: string) {
  const playerRef = doc(db, 'games', gameId, 'players', uid);
  await updateDoc(playerRef, { status: 'folded' });
  console.log(`${uid} folded`);
}

/**
 * Reset round after a hand finishes
 */
export async function resetRound(gameId: string) {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, {
    communityCards: [],
    pot: 0,
    currentBet: 0,
    round: 'preflop',
    playersOrder: [],
    currentTurn: null,
    state: 'waiting',
    updatedAt: serverTimestamp(),
  });

  const playersRef = collection(db, 'games', gameId, 'players');
  const playersSnap = await getDocs(playersRef);
  await Promise.all(
    playersSnap.docs.map((p) =>
      updateDoc(p.ref, {
        cards: [],
        holeCards: [],
        bet: 0,
        status: 'waiting',
        ready: false,
        hasActed: false,
        updatedAt: serverTimestamp(),
      })
    )
  );
  console.log(`Round reset for poker game ${gameId}`);
}

/**
 * Delete poker lobby
 */
export async function deletePokerLobby(gameId: string) {
  const gameRef = doc(db, 'games', gameId);
  const playersRef = collection(db, 'games', gameId, 'players');

  const playersSnap = await getDocs(playersRef);
  await Promise.all(playersSnap.docs.map((p) => deleteFirestoreDoc(p.ref)));

  await deleteFirestoreDoc(gameRef);
}

// create a 52-card deck in server format
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

// atomically draw N cards and advance deckIndex
export async function drawCardsTx(gameId: string, n: number): Promise<string[]> {
  const gameRef = doc(db, 'games', gameId);
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) throw new Error('game not found');
    const g: any = snap.data();

    let deck: string[] = g.deck || [];
    let idx: number = g.deckIndex ?? 0;

    if (!deck.length || idx + n > deck.length) {
      // rebuild a fresh deck if empty/exhausted
      deck = buildDeck();
      idx = 0;
    }

    const drawn = deck.slice(idx, idx + n);
    tx.update(gameRef, { deck, deckIndex: idx + n, updatedAt: serverTimestamp() });
    return drawn;
  });
}

export async function tryStartHand(gameId: string, hostUid: string) {
  const gameRef = doc(db, 'games', gameId);

  await runTransaction(db, async (tx) => {
    const gSnap = await tx.get(gameRef);
    if (!gSnap.exists()) throw new Error('game not found');
    const g: any = gSnap.data();

    if (g.host !== hostUid) return; // host-only
    if (g.dealLock || g.state === 'in-progress') return;

    // minPlayers + all ready
    const playersSnap = await getDocs(collection(db, 'games', gameId, 'players'));
    const players = playersSnap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
    const ready = players.filter((p) => p.ready && p.status !== 'folded');
    if (ready.length < (g.minPlayers ?? 2)) return;

    // LOCK
    tx.update(gameRef, { dealLock: serverTimestamp() });

    // ensure deck exists
    let deck = g.deck;
    let deckIndex = g.deckIndex ?? 0;
    if (!deck || deck.length === 0 || deckIndex > deck.length - 10) {
      deck = buildDeck();
      deckIndex = 0;
    }

    // players order (simple seat order: stable by join time)
    const order = ready.map((p) => p.uid);

    // deal 2 hole cards per ready player
    // (read deck locally, then write updated index)
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
        {
          status: 'playing',
          bet: 0,
          hasActed: false,
          holeCards: [c1, c2],
        },
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
      streetBet: 0, // new: bet within street
      communityCards: [],
      deck,
      deckIndex,
      dealLock: null, // UNLOCK
      updatedAt: serverTimestamp(),
    });
  });
}

export async function dealNextStreet(gameId: string, hostUid: string) {
  const gameRef = doc(db, 'games', gameId);

  await runTransaction(db, async (tx) => {
    const gSnap = await tx.get(gameRef);
    if (!gSnap.exists()) throw new Error('game not found');
    const g: any = gSnap.data();
    if (g.host !== hostUid || g.streetLock) return;

    tx.update(gameRef, { streetLock: serverTimestamp() });

    let deck: string[] = g.deck || buildDeck();
    let deckIndex: number = g.deckIndex ?? 0;
    let cc: string[] = g.communityCards || [];
    let round: string = g.round || 'preflop';

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

    // reset per-street flags
    tx.update(gameRef, {
      communityCards: cc,
      currentBet: 0,
      streetBet: 0,
      round,
      deck,
      deckIndex,
      streetLock: null,
      updatedAt: serverTimestamp(),
    });

    // reset player hasActed + bet for active players
    const playersSnap = await getDocs(collection(db, 'games', gameId, 'players'));
    const statuses = new Map<string, string>();
    playersSnap.docs.forEach((d) => {
      const p: any = d.data();
      statuses.set(d.id, p.status);
      if (p.status === 'playing') {
        tx.update(d.ref, { hasActed: false, bet: 0 });
      }
    });

    // choose next turn = first active in playersOrder
    const order: string[] = g.playersOrder || [];
    const next = order.find((uid) => statuses.get(uid) === 'playing') ?? null;
    tx.update(gameRef, { currentTurn: next });
  });
}

export async function setNextTurnSafe(gameId: string, expectedUid: string, nextUid: string | null) {
  const gameRef = doc(db, 'games', gameId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) return;
    const g: any = snap.data();
    if (g.currentTurn !== expectedUid) return; // someone else already advanced
    tx.update(gameRef, { currentTurn: nextUid, updatedAt: serverTimestamp() });
  });
}
