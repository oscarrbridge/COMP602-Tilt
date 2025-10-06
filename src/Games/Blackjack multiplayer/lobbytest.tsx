import { useState, useEffect } from "react";
// import { db } from '../../../Backend/firebase/firebaseConfig';
import { useUser } from "../../../Backend/firebase/UserFunctions.tsx";
import { createGameLobby, joinGameLobby } from "../../../Backend/lobby_functions.tsx";
import { listenToPlayers } from "./gameFunctions";

export default function LobbyTest() {
  const { user } = useUser();
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [players, setPlayers] = useState<any[]>([]);

  // Subscribe to players in current lobby
  useEffect(() => {
    if (!lobbyId) return;
    const unsub = listenToPlayers(lobbyId, setPlayers);
    return () => unsub();
  }, [lobbyId]);

  const handleCreate = async () => {
    if (!user) return alert("Not logged in");
    const id = await createGameLobby(user.uid, 2, 5);
    setLobbyId(id);
    alert("Lobby created! Share this code: " + id);
  };

  const handleJoin = async () => {
    if (!user) return alert("Not logged in");
    if (!joinCode) return alert("Enter a code first");
    await joinGameLobby(joinCode, user.uid, user.email || "Player");
    setLobbyId(joinCode);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>🎲 Lobby Test</h2>

      <p>Logged in as: {user?.uid}</p>

      <div style={{ marginBottom: "10px" }}>
        <button onClick={handleCreate}>Create Lobby</button>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Enter Lobby Code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
        />
        <button onClick={handleJoin}>Join Lobby</button>
      </div>

      {lobbyId && (
        <>
          <h3>Lobby: {lobbyId}</h3>
          <ul>
            {players.map((p) => (
              <li key={p.id}>
                {p.displayName || p.id} — Status: {p.status}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
