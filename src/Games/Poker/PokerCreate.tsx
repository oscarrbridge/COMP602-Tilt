// PokerCreate.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../../Backend/firebase/UserFunctions';
import { createPokerLobby, joinPokerLobby } from './pokerfunctions';
import BackgroundLayout from '../../components/BackgroundLayout/BackgroundLayout.tsx';
import InviteButton from '../../components/Friends/InviteButton';

import '../poker/poker.css';

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
    if (!user || !id) return;
    await joinPokerLobby(id, user.uid, user.displayName ?? undefined);
    navigate(`/poker/${id}`);
  };

  return (
    <BackgroundLayout gameId='Poker' gameBackground='/assets/poker-bg.jpg'>
      <div
        className='bj-game-container'
        style={{
          backgroundImage: "url('/assets/poker-bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Removed the <h1> Poker Lobby title on purpose */}

        {/* Tighter, centered panel that fits better */}
        <div
          className='bj-table'
          style={{
            padding: 14, // tighter padding
            width: 'min(560px, 92vw)',
            margin: '14vh auto 0',
            display: 'grid', // ✅ ADDED
            placeItems: 'center', // ✅ ADDED (now effective)
            minHeight: 260, // ✅ ADDED gives vertical space to center within
            height: 'auto',
            maxHeight: 360,
          }}
        >
          {!user && (
            <p className='small' style={{ opacity: 0.85, textAlign: 'center' }}>
              Sign in to create or join a poker table.
            </p>
          )}

          {user && (
            <div
              style={{
                display: 'grid',
                gap: 14,
                width: '100%',
                maxWidth: 440,
                margin: '0 auto',
              }}
            >
              <button className='bj-btn' onClick={createGame}>
                Create Game
              </button>

              <input
                value={gameId}
                onChange={(e) => setGameId(e.target.value.trim())}
                placeholder='Enter game ID'
                aria-label='Enter game ID'
                className='bj-input'
                style={{
                  width: '95%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.16)',
                  background: 'rgba(0,0,0,.25)',
                  color: 'var(--text-colour, #fff)',
                  fontSize: '1rem',
                  outline: 'none',
                  textAlign: 'center',
                }}
              />

              <button
                className='bj-btn'
                onClick={() => joinGame(gameId)}
                disabled={!gameId}
                style={{
                  opacity: gameId ? 1 : 0.6,
                  cursor: gameId ? 'pointer' : 'not-allowed',
                }}
              >
                Join Game
              </button>

              {gameId && (
                <div
                  style={{
                    display: 'grid',
                    gap: 10,
                    justifyItems: 'center',
                    paddingTop: 6,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      opacity: 0.95,
                    }}
                  >
                    Lobby ID: <span style={{ opacity: 0.9 }}>{gameId}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className='bj-btn'
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(gameId || '');
                          alert('Copied game ID!');
                        } catch (err) {
                          console.error('Copy failed', err);
                        }
                      }}
                    >
                      Copy ID
                    </button>

                    <InviteButton
                      game='poker'
                      friendUid={'' /* fill when listing friends */}
                      friendName={''}
                      sessionId={gameId}
                      senderId={user.uid}
                      senderName={user.displayName || user.email || 'Player'}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Spacer row to mirror BJ layout (visual only) */}
        <div className='bj-controls' />
      </div>
    </BackgroundLayout>
  );
}
