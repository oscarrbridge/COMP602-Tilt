// PokerCreate.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@backend/firebase/UserFunctions';
import { createPokerLobby, joinPokerLobby } from './pokerfunctions';
import BackgroundLayout from '@components/BackgroundLayout/BackgroundLayout';
import InviteButton from '@components/Friends/InviteButton';

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
    <BackgroundLayout>
      <div className='game-container'>
        <h1>♠ Poker Lobby ♣</h1>

        {/* If user not logged in */}
        {!user && <p className='small'>Sign in to create or join a poker table.</p>}

        {/* When you already have a gameId, show invite button */}
        {user && gameId && (
          <div style={{ marginBottom: 20 }}>
            <InviteButton
              game='poker'
              friendUid={'' /* fill when listing friends */}
              friendName={''}
              sessionId={gameId}
              senderId={user.uid}
              senderName={user.displayName || user.email || 'Player'}
            />
          </div>
        )}

        {/* Lobby Controls */}
        {user && (
          <div
            className='lobby-controls'
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center',
              width: '100%',
              maxWidth: 360,
              margin: '0 auto',
            }}
          >
            <button
              onClick={createGame}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                background: 'var(--secondary-colour)',
                border: '1px solid rgba(255,255,255,.12)',
                color: 'var(--text-colour)',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Create Game
            </button>

            <input
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder='Enter game ID'
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,.2)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-colour)',
                textAlign: 'center',
                fontSize: '1rem',
              }}
            />

            <button
              onClick={() => joinGame(gameId)}
              disabled={!gameId}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                background: 'var(--accent-colour)',
                border: '1px solid rgba(255,255,255,.12)',
                color: 'var(--text-colour)',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
                opacity: gameId ? 1 : 0.5,
              }}
            >
              Join Game
            </button>
          </div>
        )}

        {/* Show current lobby code if already created */}
        {user && gameId && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <p>Lobby ID:</p>
            <div
              style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              {gameId}
            </div>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(gameId || '');
                  alert('Copied game ID!');
                } catch (err) {
                  console.error('Copy failed', err);
                }
              }}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                background: 'var(--secondary-colour)',
                border: '1px solid rgba(255,255,255,.12)',
                color: 'var(--text-colour)',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Copy ID
            </button>
          </div>
        )}
      </div>
    </BackgroundLayout>
  );
}
