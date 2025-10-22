import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { createGameLobby, joinGameLobby } from '@backend/lobby_functions';
import { db } from '@backend/firebase/firebaseConfig';
import { doc, onSnapshot, collection, getDocs, deleteDoc, updateDoc, getDoc, } from 'firebase/firestore';
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
function calculateHandValue(cards) {
    let value = 0;
    let aces = 0;
    for (const card of cards) {
        if (['J', 'Q', 'K'].includes(card.rank))
            value += 10;
        else if (card.rank === 'A') {
            value += 11;
            aces++;
        }
        else
            value += Number(card.rank);
    }
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }
    return value;
}
// Start game: deal initial cards and set first turn
async function startGame(gameId) {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    const data = gameSnap.data();
    if (!data)
        return;
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
async function playerHit(gameId, uid) {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    const data = gameSnap.data();
    if (!data)
        return;
    let deck = data.deck;
    const card = deck.pop();
    const playerRef = doc(db, 'games', gameId, 'players', uid);
    const playerSnap = await getDoc(playerRef);
    const player = playerSnap.data();
    if (!player)
        return;
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
async function playerStand(gameId) {
    await nextTurn(gameId);
}
// Move to next player's turn
async function nextTurn(gameId) {
    const gameRef = doc(db, 'games', gameId);
    const playersSnap = await getDocs(collection(db, 'games', gameId, 'players'));
    const players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const gameSnap = await getDoc(gameRef);
    const data = gameSnap.data();
    if (!data)
        return;
    const currentIndex = players.findIndex((p) => p.id === data.currentTurn);
    const nextIndex = (currentIndex + 1) % players.length;
    // If we looped around, dealer plays
    if (nextIndex === 0 && currentIndex !== -1) {
        await dealerPlay(gameId);
    }
    else {
        await updateDoc(gameRef, { currentTurn: players[nextIndex].id });
    }
}
// Dealer plays after players finish
async function dealerPlay(gameId) {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    const data = gameSnap.data();
    if (!data)
        return;
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
async function deleteGameLobby(gameId) {
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
    const [game, setGame] = useState(null);
    const [players, setPlayers] = useState([]);
    useEffect(() => {
        if (!gameId)
            return;
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
        if (!uid)
            return alert('Enter a UID!');
        const id = await createGameLobby(uid);
        setGameId(id);
        alert(`Share this code: ${id}`);
    }
    async function handleJoin() {
        if (!uid || !joinCode)
            return alert('Enter UID and code!');
        const docSnap = await getDoc(doc(db, 'games', joinCode));
        if (!docSnap.exists())
            return alert('Lobby not found!');
        await joinGameLobby(joinCode, uid, name);
        setGameId(joinCode);
    }
    return (_jsxs("div", { style: { padding: 20 }, children: [_jsx("h1", { children: "\uD83C\uDCCF Blackjack Lobby Test" }), _jsx("input", { placeholder: 'Your UID', value: uid, onChange: (e) => setUid(e.target.value) }), _jsx("input", { placeholder: 'Your Name', value: name, onChange: (e) => setName(e.target.value) }), !gameId && (_jsxs("div", { children: [_jsx("button", { onClick: handleCreate, children: "Create Lobby" }), _jsx("input", { placeholder: 'Join code', value: joinCode, onChange: (e) => setJoinCode(e.target.value) }), _jsx("button", { onClick: handleJoin, children: "Join Lobby" })] })), gameId && (_jsxs("div", { children: [_jsxs("h2", { children: ["Game ID: ", gameId] }), _jsxs("h3", { children: ["State: ", game?.state] }), _jsxs("h3", { children: ["Current Turn: ", game?.currentTurn] }), _jsx("h4", { children: "Players:" }), _jsx("ul", { children: players.map((p) => (_jsxs("li", { children: [p.displayName, " - ", p.status, " (", calculateHandValue(p.cards || []), ")", _jsx("br", {}), p.cards?.map((c, i) => _jsxs("span", { children: [c.rank + c.suit, " "] }, i))] }, p.id))) }), _jsx("h4", { children: "Dealer:" }), _jsx("div", { children: game?.dealerHand?.map((c, i) => _jsxs("span", { children: [c.rank + c.suit, " "] }, i)) }), _jsxs("div", { style: { marginTop: 10 }, children: [game?.state === 'waiting' && (_jsx("button", { onClick: () => startGame(gameId), children: "Start Game" })), game?.currentTurn === uid && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => playerHit(gameId, uid), children: "Hit" }), _jsx("button", { onClick: () => playerStand(gameId), children: "Stand" })] })), _jsx("button", { onClick: () => deleteGameLobby(gameId), children: "End Game" })] })] }))] }));
}
export { calculateHandValue, createDeck };
