// PokerCreate.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "../../../Backend/firebase/UserFunctions";
import { createPokerLobby, joinPokerLobby, updatePlayerStatus } from "./pokerfunctions";

export default function PokerCreate() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [gameId, setGameId] = useState("");

    const createGame = async () => {
    if (!user) return;
    const id = await createPokerLobby(user.uid);
    await joinPokerLobby(id, user.uid, user.displayName ?? undefined);
    navigate(`/poker/${id}`);
    };

    const joinGame = async (id: string) => {
    if (!user) return;
    await joinPokerLobby(id, user.uid, user.displayName ?? undefined);
    navigate(`/poker/${id}`);
    };


  return (
    <div>
      <h1>Poker Lobby</h1>
      <button onClick={createGame}>Create Game</button>
      <input value={gameId} onChange={(e) => setGameId(e.target.value)} placeholder="Enter game ID" />
      <button onClick={() => joinGame(gameId)}>Join Game</button>
    </div>
  );
}

export function PokerGame() {
  const { gameId } = useParams();
  const { user } = useUser();
  const [ready, setReady] = useState(false);

  const readyUp = async () => {
    if (!user || !gameId) return;
    await updatePlayerStatus(gameId, user.uid, { ready: true });
    setReady(true);
  };

  // Listen for all players ready → start game
  useEffect(() => {
    // Fetch player docs, check if everyone ready, then start game
    // You can use onSnapshot listener here for real-time updates
  }, [gameId]);

  return (
    <div>
      <h1>Poker Game: {gameId}</h1>
      <button onClick={readyUp} disabled={ready}>
        {ready ? "Waiting..." : "Ready"}
      </button>
      {/* Render community cards, hole cards, turn, pot, etc. */}
    </div>
  );
}
