import { db } from "./firebase/firebaseConfig";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

/**
 * Join an existing game lobby (works for Blackjack or Poker)
 */
export async function joinGameLobby(
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
      chips: 1000, // poker-style chip balance
      status: "waiting",
      joinedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Create a new game lobby.
 * @param hostUid The UID of the host
 * @param gameType "blackjack" | "poker"
 * @param minPlayers Minimum number of players to start
 * @param maxPlayers Maximum number of players allowed
 */
export async function createGameLobby(
  hostUid: string,
  gameType: "blackjack" | "poker" = "blackjack",
  minPlayers = 2,
  maxPlayers = 6
) {
  const gameRef = doc(collection(db, "games")); // auto-generated lobby ID

  const baseGameData = {
    host: hostUid,
    currentTurn: null,
    state: "waiting", // waiting | in-progress | finished
    minPlayers,
    maxPlayers,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    gameType,
  };

  if (gameType === "blackjack") {
    await setDoc(gameRef, {
      ...baseGameData,
      dealerHand: [],
      dealerHidden: null,
    });
  } else if (gameType === "poker") {
    await setDoc(gameRef, {
      ...baseGameData,
      communityCards: [],
      pot: 0,
      currentBet: 0,
      dealerPosition: 0,
      smallBlind: 10,
      bigBlind: 20,
      round: "preflop", // preflop | flop | turn | river | showdown
    });
  }

  console.log(`Created ${gameType} game lobby: ${gameRef.id}`);
  return gameRef.id;
}

/**
 * Delete a game lobby and its players.
 */
export async function deleteGameLobby(gameId: string) {
  try {
    const gameRef = doc(db, "games", gameId);
    const playersRef = collection(db, "games", gameId, "players");

    // Delete all players
    const playersSnap = await getDocs(playersRef);
    const deletePromises = playersSnap.docs.map((playerDoc) =>
      deleteDoc(playerDoc.ref)
    );
    await Promise.all(deletePromises);

    // Delete the game itself
    await deleteDoc(gameRef);
    console.log(`Game lobby ${gameId} and all players deleted successfully.`);
  } catch (error) {
    console.error("Error deleting game lobby:", error);
    throw error;
  }
}

/**
 * Update the overall game state.
 */
export async function updateGameState(gameId: string, newState: string) {
  const gameRef = doc(db, "games", gameId);
  await updateDoc(gameRef, {
    state: newState,
    updatedAt: serverTimestamp(),
  });
  console.log(`Game ${gameId} state updated to "${newState}"`);
}

/**
 * Set whose turn it is.
 */
export async function setNextTurn(gameId: string, nextPlayerUid: string) {
  const gameRef = doc(db, "games", gameId);
  await updateDoc(gameRef, {
    currentTurn: nextPlayerUid,
    updatedAt: serverTimestamp(),
  });
  console.log(`It is now ${nextPlayerUid}'s turn in game ${gameId}`);
}

/**
 * Update a player's data.
 */
export async function updatePlayerData(
  gameId: string,
  uid: string,
  updates: Partial<{
    cards: string[];
    bet: number;
    status: string;
    chips: number;
  }>
) {
  const playerRef = doc(db, "games", gameId, "players", uid);
  await updateDoc(playerRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  console.log(`Player ${uid} data updated in game ${gameId}`, updates);
}

/**
 * Special poker update: Update the pot or community cards.
 */
export async function updatePokerRound(
  gameId: string,
  updates: Partial<{
    communityCards: string[];
    pot: number;
    currentBet: number;
    round: "preflop" | "flop" | "turn" | "river" | "showdown";
  }>
) {
  const gameRef = doc(db, "games", gameId);
  await updateDoc(gameRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  console.log(`Poker game ${gameId} updated:`, updates);
}