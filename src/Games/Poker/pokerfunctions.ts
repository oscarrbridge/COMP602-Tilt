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
} from "firebase/firestore";


/**
 * Join an existing poker lobby
 */
export async function joinPokerLobby(
  gameId: string,
  uid: string,
  displayName?: string
) {
  const playerRef = doc(db, "games", gameId, "players", uid);

  await setDoc(
    playerRef,
    {
      displayName: displayName || "Anonymous",
      bet: 0,
      cards: [],
      holeCards: [],
      chips: 1000,
      status: "waiting",
      ready: false,
      joinedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Create a new poker lobby
 */
export async function createPokerLobby(
  hostUid: string,
  minPlayers = 2,
  maxPlayers = 6
) {
  const gameRef = doc(collection(db, "games"));

  const baseGameData = {
    host: hostUid,
    currentTurn: null,
    state: "waiting",
    minPlayers,
    maxPlayers,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    gameType: "poker",
    communityCards: [],
    pot: 0,
    currentBet: 0,
    dealerPosition: 0,
    smallBlind: 10,
    bigBlind: 20,
    round: "preflop",
    playersOrder: [],
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
  const playerRef = doc(db, "games", gameId, "players", uid);
  await updateDoc(playerRef, { ...updates, updatedAt: serverTimestamp() });
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
    round: "preflop" | "flop" | "turn" | "river" | "showdown";
    playersOrder: string[];
    dealerPosition: number;
    state: "waiting" | "in-progress" | "finished";
    currentTurn: string;
  }>
) {
  const gameRef = doc(db, "games", gameId);
  await updateDoc(gameRef, { ...updates, updatedAt: serverTimestamp() });
}

export async function setNextTurn(gameId: string, nextPlayerUid: string) {
  await updatePokerGame(gameId, { currentTurn: nextPlayerUid });
}

/**
 * Player Action: Call
 */
export async function playerCall(gameId: string, uid: string) {
  const gameRef = doc(db, "games", gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) return;

  const gameData = gameSnap.data();
  const playerRef = doc(db, "games", gameId, "players", uid);
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
  const gameRef = doc(db, "games", gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) return;

  const gameData = gameSnap.data();
  const playerRef = doc(db, "games", gameId, "players", uid);
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
  const gameRef = doc(db, "games", gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) return;

  const gameData = gameSnap.data();
  const playerRef = doc(db, "games", gameId, "players", uid);
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
  const playerRef = doc(db, "games", gameId, "players", uid);
  await updateDoc(playerRef, { status: "folded" });
  console.log(`${uid} folded`);
}

/**
 * Reset round after a hand finishes
 */
export async function resetRound(gameId: string) {
  const gameRef = doc(db, "games", gameId);
  await updateDoc(gameRef, {
    communityCards: [],
    pot: 0,
    currentBet: 0,
    round: "preflop",
    playersOrder: [],
    updatedAt: serverTimestamp(),
  });

  const playersRef = collection(db, "games", gameId, "players");
  const playersSnap = await getDocs(playersRef);
  await Promise.all(
    playersSnap.docs.map((p) =>
      updateDoc(p.ref, {
        cards: [],
        holeCards: [],
        bet: 0,
        status: "waiting",
        ready: false,
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
  const gameRef = doc(db, "games", gameId);
  const playersRef = collection(db, "games", gameId, "players");

  const playersSnap = await getDocs(playersRef);
  await Promise.all(playersSnap.docs.map((p) => deleteFirestoreDoc(p.ref)));

  await deleteFirestoreDoc(gameRef);
}
