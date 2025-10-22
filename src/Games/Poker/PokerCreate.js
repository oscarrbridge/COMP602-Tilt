import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
        if (!user)
            return;
        const id = await createPokerLobby(user.uid);
        await joinPokerLobby(id, user.uid, user.displayName ?? undefined);
        navigate(`/poker/${id}`);
    };
    const joinGame = async (id) => {
        if (!user)
            return;
        await joinPokerLobby(id, user.uid, user.displayName ?? undefined);
        navigate(`/poker/${id}`);
    };
    return (_jsx(BackgroundLayout, { children: _jsxs("div", { className: 'game-container', children: [_jsx("h1", { children: "\u2660 Poker Lobby \u2663" }), !user && _jsx("p", { className: 'small', children: "Sign in to create or join a poker table." }), user && gameId && (_jsx("div", { style: { marginBottom: 20 }, children: _jsx(InviteButton, { game: 'poker', friendUid: '' /* fill when listing friends */, friendName: '', sessionId: gameId, senderId: user.uid, senderName: user.displayName || user.email || 'Player' }) })), user && (_jsxs("div", { className: 'lobby-controls', style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        alignItems: 'center',
                        width: '100%',
                        maxWidth: 360,
                        margin: '0 auto',
                    }, children: [_jsx("button", { onClick: createGame, style: {
                                padding: '10px 16px',
                                borderRadius: 8,
                                background: 'var(--secondary-colour)',
                                border: '1px solid rgba(255,255,255,.12)',
                                color: 'var(--text-colour)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                width: '100%',
                            }, children: "Create Game" }), _jsx("input", { value: gameId, onChange: (e) => setGameId(e.target.value), placeholder: 'Enter game ID', style: {
                                width: '100%',
                                padding: '10px',
                                borderRadius: 8,
                                border: '1px solid rgba(255,255,255,.2)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-colour)',
                                textAlign: 'center',
                                fontSize: '1rem',
                            } }), _jsx("button", { onClick: () => joinGame(gameId), disabled: !gameId, style: {
                                padding: '10px 16px',
                                borderRadius: 8,
                                background: 'var(--accent-colour)',
                                border: '1px solid rgba(255,255,255,.12)',
                                color: 'var(--text-colour)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                width: '100%',
                                opacity: gameId ? 1 : 0.5,
                            }, children: "Join Game" })] })), user && gameId && (_jsxs("div", { style: { marginTop: 20, textAlign: 'center' }, children: [_jsx("p", { children: "Lobby ID:" }), _jsx("div", { style: {
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                letterSpacing: 1,
                                marginBottom: 6,
                            }, children: gameId }), _jsx("button", { onClick: async () => {
                                try {
                                    await navigator.clipboard.writeText(gameId || '');
                                    alert('Copied game ID!');
                                }
                                catch (err) {
                                    console.error('Copy failed', err);
                                }
                            }, style: {
                                padding: '6px 10px',
                                borderRadius: 6,
                                background: 'var(--secondary-colour)',
                                border: '1px solid rgba(255,255,255,.12)',
                                color: 'var(--text-colour)',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                            }, children: "Copy ID" })] }))] }) }));
}
