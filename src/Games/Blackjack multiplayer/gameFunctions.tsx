import {doc,collection,onSnapshot} from 'firebase/firestore';
import { db } from '../../../Backend/firebase//firebaseConfig';

// Subscribes to "games" collection
// ie: games/{gameId}:
export const listenToGame = (gameId: string, onGameChange: (game: any) => void) => {
  const gameRef = doc(db, 'games', gameId);
  return onSnapshot(gameRef, (snap) => {
    onGameChange(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
};

// Subscribes to "players" inside gameID
// ie: games/{gameId}/players/{uid}:
export const listenToPlayers = (gameId: string, onPlayersChange: (players: any[]) => void) => {
  const playersRef = collection(db, 'games', gameId, 'players');
  return onSnapshot(playersRef, (querySnap) => {
    const players = querySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onPlayersChange(players);
  });
};
