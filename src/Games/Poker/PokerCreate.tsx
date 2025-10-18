// PokerCreate.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../../Backend/firebase/UserFunctions';
import { createPokerLobby, joinPokerLobby } from './pokerfunctions';
import InviteButton from '../../components/Friends/InviteButton';

export default function PokerCreate() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [gameId, setGameId] = useState('');

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

      {/* When you already have a gameId (created or typed), show an invite button */}
      {gameId && user && (
        <InviteButton
          game='poker'
          friendUid={'' /* you fill this when listing friends */}
          friendName={''}
          sessionId={gameId}
          senderId={user.uid}
          senderName={user.displayName || user.email || 'Player'}
        />
      )}

      <button onClick={createGame}>Create Game</button>
      <input
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
        placeholder='Enter game ID'
      />
      <button onClick={() => joinGame(gameId)}>Join Game</button>
    </div>
  );
}
