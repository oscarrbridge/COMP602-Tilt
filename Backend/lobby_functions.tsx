import { db } from "./firebase/firebaseConfig";
import { collection, doc, setDoc, serverTimestamp, deleteDoc, getDocs, updateDoc } from "firebase/firestore";

// User joins an existing lobby by gameId
export async function joinGameLobby(gameId: string, uid: string, displayName?: string) {
  const playerRef = doc(db, "games", gameId, "players", uid);

  await setDoc(playerRef, {
    displayName: displayName || "Anonymous",
    bet: 0,
    cards: [],
    status: "waiting",
    joinedAt: serverTimestamp(),
  }, { merge: true });
}

// Create a new game lobby and return its ID
export async function createGameLobby(
  hostUid: string,
  minPlayers = 2,
  maxPlayers = 5
) {
  const gameRef = doc(collection(db, "games")); // auto-ID for lobby

  await setDoc(gameRef, {
    host: hostUid,
    currentTurn: null,
    dealerHand: [],
    dealerHidden: null,
    gameType: "blackjack",
    minPlayers,
    maxPlayers,
    state: "waiting",
    createdAt: serverTimestamp(),
  });

  return gameRef.id; // share this with friends
}

export async function deleteGameLobby(gameId: string) {
  try {
    const gameRef = doc(db, "games", gameId);
    const playersRef = collection(db, "games", gameId, "players");

    // 1. Delete all players in the subcollection
    const playersSnap = await getDocs(playersRef);
    const deletePromises = playersSnap.docs.map((playerDoc) => deleteDoc(playerDoc.ref));
    await Promise.all(deletePromises);

    // 2. Delete the game document itself
    await deleteDoc(gameRef);

    console.log(`✅ Game lobby ${gameId} and all players deleted successfully.`);
  } catch (error) {
    console.error("❌ Error deleting game lobby:", error);
    throw error;
  }
}

export async function updateGameState(gameId: string, newState: string) {
  const gameRef = doc(db, "games", gameId);
  await updateDoc(gameRef, {
    state: newState,
    updatedAt: serverTimestamp(),
  });
  console.log(`🎯 Game ${gameId} state updated to "${newState}"`);
}


export async function setNextTurn(gameId: string, nextPlayerUid: string) {
  const gameRef = doc(db, "games", gameId);
  await updateDoc(gameRef, {
    currentTurn: nextPlayerUid,
    updatedAt: serverTimestamp(),
  });
  console.log(`🔁 It is now ${nextPlayerUid}'s turn in game ${gameId}`);
}


export async function updatePlayerData(
  gameId: string,
  uid: string,
  updates: Partial<{ cards: string[]; bet: number; status: string }>
) {
  const playerRef = doc(db, "games", gameId, "players", uid);
  await updateDoc(playerRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  console.log(`🃏 Player ${uid} data updated in game ${gameId}`, updates);
}
