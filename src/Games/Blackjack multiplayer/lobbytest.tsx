import { useEffect, useState } from 'react';
import { createGameLobby, joinGameLobby } from '@backend/lobby_functions';
import { db } from '@backend/firebase/firebaseConfig';
import {
  doc,
  onSnapshot,
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';

function createDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function calculateHandValue(cards: { rank: string; suit: string }[]) {
  let value = 0;
  let aces = 0;
  for (const card of cards) {
    if (['J', 'Q', 'K'].includes(card.rank)) value += 10;
    else if (card.rank === 'A') {
      value += 11;
      aces++;
    } else value += Number(card.rank);
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

// Start game: deal initial cards and set first turn
async function startGame(gameId: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  const data = gameSnap.data();
  if (!data) return;

  const deck = createDeck();
  const playersSnap = await getDocs(collection(db, 'games', gameId, 'players'));
  const playerDocs = playersSnap.docs;

  // Deal two cards to each player
  for (const player of playerDocs) {
    const hand = [deck.pop(), deck.pop()];
    await updateDoc(player.ref, {
      cards: hand,
      status: 'playing',
    });
  }

  // Deal two cards to dealer (one hidden)
  const dealerHand = [deck.pop(), deck.pop()];
  await updateDoc(gameRef, {
    dealerHand,
    deck,
    currentTurn: playerDocs[0].id,
    state: 'in-progress',
  });
}

// Player hits
async function playerHit(gameId: string, uid: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  const data = gameSnap.data();
  if (!data) return;

  let deck = data.deck;
  const card = deck.pop();

  const playerRef = doc(db, 'games', gameId, 'players', uid);
  const playerSnap = await getDoc(playerRef);
  const player = playerSnap.data();
  if (!player) return;

  const newHand = [...player.cards, card];
  const value = calculateHandValue(newHand);

  await updateDoc(playerRef, { cards: newHand });

  if (value > 21) {
    await updateDoc(playerRef, { status: 'bust' });
    await nextTurn(gameId);
  }

  await updateDoc(gameRef, { deck });
}

// Player stands (pass turn)
async function playerStand(gameId: string) {
  await nextTurn(gameId);
}

// Move to next player's turn
async function nextTurn(gameId: string) {
  const gameRef = doc(db, 'games', gameId);
  const playersSnap = await getDocs(collection(db, 'games', gameId, 'players'));
  const players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const gameSnap = await getDoc(gameRef);
  const data = gameSnap.data();
  if (!data) return;

  const currentIndex = players.findIndex((p) => p.id === data.currentTurn);
  const nextIndex = (currentIndex + 1) % players.length;

  // If we looped around, dealer plays
  if (nextIndex === 0 && currentIndex !== -1) {
    await dealerPlay(gameId);
  } else {
    await updateDoc(gameRef, { currentTurn: players[nextIndex].id });
  }
}

// Dealer plays after players finish
async function dealerPlay(gameId: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  const data = gameSnap.data();
  if (!data) return;

  let { deck, dealerHand } = data;
  let value = calculateHandValue(dealerHand);

  while (value < 17 && deck.length > 0) {
    dealerHand.push(deck.pop());
    value = calculateHandValue(dealerHand);
  }

  await updateDoc(gameRef, {
    dealerHand,
    deck,
    state: 'finished',
    currentTurn: null,
  });
}

// Delete game lobby
async function deleteGameLobby(gameId: string) {
  await deleteDoc(doc(db, 'games', gameId));
}

// ----------------------
// React Component
// ----------------------
export default function LobbyTest() {
  const [uid, setUid] = useState('');
  const [name, setName] = useState('');
  const [gameId, setGameId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    if (!gameId) return;
    const unsubGame = onSnapshot(doc(db, 'games', gameId), (snap) => {
      setGame(snap.data());
    });
    const unsubPlayers = onSnapshot(collection(db, 'games', gameId, 'players'), (snap) => {
      setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubGame();
      unsubPlayers();
    };
  }, [gameId]);

  async function handleCreate() {
    if (!uid) return alert('Enter a UID!');
    const id = await createGameLobby(uid);
    setGameId(id);
    alert(`Share this code: ${id}`);
  }

  async function handleJoin() {
    if (!uid || !joinCode) return alert('Enter UID and code!');
    const docSnap = await getDoc(doc(db, 'games', joinCode));
    if (!docSnap.exists()) return alert('Lobby not found!');
    await joinGameLobby(joinCode, uid, name);
    setGameId(joinCode);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>🃏 Blackjack Lobby Test</h1>

      <input placeholder='Your UID' value={uid} onChange={(e) => setUid(e.target.value)} />
      <input placeholder='Your Name' value={name} onChange={(e) => setName(e.target.value)} />

      {!gameId && (
        <div>
          <button onClick={handleCreate}>Create Lobby</button>
          <input
            placeholder='Join code'
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button onClick={handleJoin}>Join Lobby</button>
        </div>
      )}

      {gameId && (
        <div>
          <h2>Game ID: {gameId}</h2>
          <h3>State: {game?.state}</h3>
          <h3>Current Turn: {game?.currentTurn}</h3>

          <h4>Players:</h4>
          <ul>
            {players.map((p) => (
              <li key={p.id}>
                {p.displayName} - {p.status} ({calculateHandValue(p.cards || [])})
                <br />
                {p.cards?.map((c: any, i: number) => <span key={i}>{c.rank + c.suit} </span>)}
              </li>
            ))}
          </ul>

          <h4>Dealer:</h4>
          <div>
            {game?.dealerHand?.map((c: any, i: number) => <span key={i}>{c.rank + c.suit} </span>)}
          </div>

          <div style={{ marginTop: 10 }}>
            {game?.state === 'waiting' && (
              <button onClick={() => startGame(gameId)}>Start Game</button>
            )}
            {game?.currentTurn === uid && (
              <>
                <button onClick={() => playerHit(gameId, uid)}>Hit</button>
                <button onClick={() => playerStand(gameId)}>Stand</button>
              </>
            )}
            <button onClick={() => deleteGameLobby(gameId)}>End Game</button>
          </div>
        </div>
      )}
    </div>
  );
}
export { calculateHandValue, createDeck };
