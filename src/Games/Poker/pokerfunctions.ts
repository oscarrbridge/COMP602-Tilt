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
      holeCards: [], // poker hand
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
  const gameRef = doc(collection(db, "games")); // auto-generated ID

  const baseGameData = {
    host: hostUid,
    currentTurn: null,
    state: "waiting", // waiting | in-progress | finished
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
  console.log(`Player ${uid} updated in game ${gameId}`, updates);
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
    currentTurn: string; // ✅ add this line
  }>
) {
  const gameRef = doc(db, "games", gameId);
  await updateDoc(gameRef, { ...updates, updatedAt: serverTimestamp() });
  console.log(`Poker game ${gameId} updated:`, updates);
}

export async function setNextTurn(gameId: string, nextPlayerUid: string) {
  await updatePokerGame(gameId, { currentTurn: nextPlayerUid });
}


/**
 * Reset the round after a hand finishes (pot, community cards, bets)
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
      updateDoc(p.ref, { cards: [], holeCards: [], bet: 0, status: "waiting", ready: false, updatedAt: serverTimestamp() })
    )
  );

  console.log(`Round reset for poker game ${gameId}`);
}

/**
 * Delete a poker lobby and all players
 */
export async function deletePokerLobby(gameId: string) {
  const gameRef = doc(db, "games", gameId);
  const playersRef = collection(db, "games", gameId, "players");

  const playersSnap = await getDocs(playersRef);
  await Promise.all(playersSnap.docs.map((p) => deleteFirestoreDoc(p.ref)));

  await deleteFirestoreDoc(gameRef);
  console.log(`Poker lobby ${gameId} deleted`);
}
