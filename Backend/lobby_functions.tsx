import { db } from "./firebase/firebaseConfig";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";

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
