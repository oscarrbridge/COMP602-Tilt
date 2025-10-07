import { useEffect, useState } from "react";
import {createGameLobby,joinGameLobby,updatePlayerData,setNextTurn,updateGameState} 
from "../../../Backend/lobby_functions";
import { db } from '../../../Backend/firebase/firebaseConfig';
import { doc, onSnapshot, collection, getDocs } from "firebase/firestore";
import { useUser } from "../../../Backend/firebase/UserFunctions.tsx";

export default function LobbyTest() {
  const { user } = useUser(); // Logged-in user
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameData, setGameData] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Simple helper for random cards
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const getCard = () => {
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    return `${rank}${suit}`;
  };

  // === Realtime Game Listener ===
  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, "games", gameId);
    const unsubGame = onSnapshot(gameRef, (snap) => {
      if (snap.exists()) setGameData(snap.data());
    });

    const playersRef = collection(db, "games", gameId, "players");
    const unsubPlayers = onSnapshot(playersRef, (snap) => {
      setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubGame();
      unsubPlayers();
    };
  }, [gameId]);

  // === Create Game Lobby ===
  const handleCreateLobby = async () => {
    if (!user) return alert("You must be logged in!");
    setLoading(true);
    const id = await createGameLobby(user.uid, 2, 2);
    await joinGameLobby(id, user.uid, user.email || "Host");
    setGameId(id);
    setLoading(false);
  };

  // === Join Game Lobby (second player) ===
  const handleJoinLobby = async () => {
    if (!user || !gameId) return alert("Create or enter a lobby ID first!");
    await joinGameLobby(gameId, user.uid, user.email || "Player");
  };

  // === Start Game ===
  const handleStartGame = async () => {
    if (!gameId) return;
    await updateGameState(gameId, "in-progress");
    await setNextTurn(gameId, players[0]?.id);
  };

  // === Deal Random Card to Player ===
  const handleDealCard = async (playerId: string) => {
    if (!gameId) return;
    const player = players.find((p) => p.id === playerId);
    const newCard = getCard();
    const updatedCards = [...(player?.cards || []), newCard];

    await updatePlayerData(gameId, playerId, { cards: updatedCards });
  };

  // === End Turn (rotate players) ===
  const handleNextTurn = async () => {
    if (!gameId || players.length < 2) return;
    const currentIndex = players.findIndex((p) => p.id === gameData?.currentTurn);
    const nextIndex = (currentIndex + 1) % players.length;
    const nextPlayer = players[nextIndex];
    await setNextTurn(gameId, nextPlayer.id);
  };

  return (
    <div style={{ padding: "20px", color: "#fff", background: "#222", minHeight: "100vh" }}>
      <h1>🃏 Blackjack Lobby Test</h1>

      {!gameId && (
        <>
          <button onClick={handleCreateLobby} disabled={loading}>
            {loading ? "Creating..." : "Create Lobby"}
          </button>
        </>
      )}

      {gameId && (
        <>
          <p>Game ID: <strong>{gameId}</strong></p>
          <button onClick={handleJoinLobby}>Join as Player</button>
          <button onClick={handleStartGame}>Start Game</button>
          <button onClick={handleNextTurn}>Next Turn</button>

          <h3>Game State: {gameData?.state}</h3>
          <h4>Current Turn: {gameData?.currentTurn}</h4>

          <div style={{ marginTop: "20px" }}>
            <h2>Players:</h2>
            {players.map((p) => (
              <div
                key={p.id}
                style={{
                  background:
                    gameData?.currentTurn === p.id ? "#444" : "#333",
                  margin: "10px 0",
                  padding: "10px",
                  borderRadius: "6px",
                }}
              >
                <h3>{p.displayName || p.id}</h3>
                <p>Cards: {p.cards?.join(", ") || "None"}</p>
                <p>Status: {p.status}</p>
                <button onClick={() => handleDealCard(p.id)}>Deal Card</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
