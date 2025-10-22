import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Poker.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { updatePlayerStatus, resetRound, tryStartHand, dealNextStreet, setNextTurnSafe, } from './pokerfunctions';
import { useUser } from '@backend/firebase/UserFunctions';
import BackgroundLayout from '@components/BackgroundLayout/BackgroundLayout';
import { collection, onSnapshot, doc, getDoc, getDocs, runTransaction, serverTimestamp, writeBatch, } from 'firebase/firestore';
import { db } from '@backend/firebase/firebaseConfig';
import { evaluateHand } from './pokerHandEvaluator';
import { updateDoc } from 'firebase/firestore';
// ===== Card helpers =====
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export default function PokerGame() {
    const { gameId } = useParams();
    const { user } = useUser();
    const [players, setPlayers] = useState([]);
    const [communityCards, setCommunityCards] = useState([]);
    const [pot, setPot] = useState(0);
    const [currentBet, setCurrentBet] = useState(0);
    const [myTurn, setMyTurn] = useState(false);
    const [round, setRound] = useState('preflop');
    const [, setReady] = useState(false);
    const [advancing, setAdvancing] = useState(false);
    // ===== Listen for realtime updates =====
    useEffect(() => {
        if (!gameId)
            return;
        const playersRef = collection(db, 'games', gameId, 'players');
        const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
            const list = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));
            setPlayers(list);
            const me = list.find((p) => p.uid === user?.uid);
            if (me)
                setReady(Boolean(me.ready));
        });
        const gameRef = doc(db, 'games', gameId);
        const unsubGame = onSnapshot(gameRef, (snap) => {
            if (!snap.exists())
                return;
            const data = snap.data();
            setCommunityCards(data.communityCards || []);
            setPot(data.pot || 0);
            setCurrentBet(data.currentBet || 0);
            setRound(data.round || 'preflop');
            setMyTurn(data.currentTurn === user?.uid);
        });
        return () => {
            unsubPlayers();
            unsubGame();
        };
    }, [gameId, user?.uid]);
    // ===== Auto-start hand when enough players ready =====
    useEffect(() => {
        if (!gameId || !user || !players.length)
            return;
        (async () => {
            const gSnap = await getDoc(doc(db, 'games', gameId));
            if (!gSnap.exists())
                return;
            const g = gSnap.data();
            // Only host can start hands
            if (g.host !== user.uid)
                return;
            // Already in progress? skip
            if (g.state === 'in-progress' || g.dealLock)
                return;
            const readyPlayers = players.filter((p) => p.ready && p.status !== 'folded');
            const min = g.minPlayers ?? 2;
            // Start once min ready
            if (readyPlayers.length >= min) {
                console.log('Host detected enough ready players, starting hand...');
                try {
                    await tryStartHand(gameId, user.uid);
                }
                catch (err) {
                    console.error('Failed to start hand', err.message);
                }
            }
        })();
    }, [gameId, user?.uid, players]);
    // ===== Ready up =====
    const readyUp = async () => {
        if (!user || !gameId)
            return;
        try {
            const meRef = doc(db, 'games', gameId, 'players', user.uid);
            console.log('ReadyUp ->', { gameId, uid: user.uid });
            await updatePlayerStatus(gameId, user.uid, { ready: true });
            // extra safety in case merge semantics change elsewhere
            await updateDoc(meRef, { ready: true, updatedAt: serverTimestamp() });
            setReady(true); // local UX; also mirrored by snapshot above
        }
        catch (e) {
            console.error('readyUp failed', e);
        }
    };
    const sanitize = (obj) => {
        const o = {};
        for (const [k, v] of Object.entries(obj)) {
            if (v === undefined)
                continue; // Firestore rejects undefined
            if (typeof v === 'number' && !Number.isFinite(v))
                continue; // rejects NaN/Inf
            o[k] = Array.isArray(v) ? v.filter((x) => x !== undefined) : v;
        }
        return o;
    };
    // ===== Host-only street progression checks =====
    useEffect(() => {
        if (!gameId || !user)
            return;
        (async () => {
            const gSnap = await getDoc(doc(db, 'games', gameId));
            if (!gSnap.exists())
                return;
            const g = gSnap.data();
            // host only
            if (g.host !== user.uid)
                return;
            // Don't progress/clean while waiting in the lobby
            if (g.state !== 'in-progress')
                return;
            // also stop at showdown; showdown effect handles payout
            if (g.round === 'showdown')
                return;
            const active = players.filter((p) => p.status === 'playing');
            // single survivor → pay & reset
            if (active.length <= 1) {
                const w = active[0]; // undefined if 0 survivors
                if (w) {
                    await updatePlayerStatus(gameId, w.uid, { chips: (w.chips || 0) + (g.pot || 0) });
                }
                await resetRound(gameId);
                return;
            }
            const allActed = active.every((p) => p.hasActed);
            const allBetsEqual = active.every((p) => (p.bet || 0) === (g.currentBet || 0));
            if (!advancing && allActed && allBetsEqual) {
                setAdvancing(true);
                try {
                    await dealNextStreet(gameId, user.uid);
                }
                finally {
                    setAdvancing(false);
                }
            }
        })();
    }, [gameId, user?.uid, players, currentBet, round]);
    // ===== Host computes winners on showdown =====
    useEffect(() => {
        if (!gameId)
            return;
        if (round !== 'showdown')
            return;
        (async () => {
            const g = await getDoc(doc(db, 'games', gameId));
            const data = g.exists() ? g.data() : {};
            if (data.host === user?.uid) {
                await showdown();
            }
        })();
    }, [round, gameId, user?.uid]);
    // ===== Player Action Handler (transactional core + post-step) =====
    const playerAction = async (action, amount = 0) => {
        if (!myTurn || !user || !gameId)
            return;
        const gameRef = doc(db, 'games', gameId);
        const meRef = doc(db, 'games', gameId, 'players', user.uid);
        // 1) Lightweight path: actions that don't need game writes -> don't read the game doc
        if (action === 'fold' || action === 'check') {
            if (action === 'check') {
                // Validate using fresh reads (no tx), then mark acted
                const [gSnap, pSnap] = await Promise.all([getDoc(gameRef), getDoc(meRef)]);
                const g = gSnap.data();
                const me = pSnap.data();
                if (!g || !me)
                    return;
                if ((me.bet || 0) < (g.currentBet || 0))
                    return; // can't check
                await updateDoc(meRef, sanitize({ hasActed: true, updatedAt: serverTimestamp() }));
            }
            else {
                // fold: plain update (no tx, no precondition)
                await updateDoc(meRef, sanitize({ status: 'folded', hasActed: true, updatedAt: serverTimestamp() }));
            }
            // Next turn (safe, tiny tx on the game doc)
            const [g2Snap, playersSnap] = await Promise.all([
                getDoc(gameRef),
                getDocs(collection(db, 'games', gameId, 'players')),
            ]);
            const g2 = g2Snap.data() || {};
            const order = g2.playersOrder || [];
            const alive = new Set(playersSnap.docs.filter((d) => d.data().status === 'playing').map((d) => d.id));
            const myIdx = order.indexOf(user.uid);
            if (myIdx === -1) {
                await setNextTurnSafe(gameId, user.uid, null);
                return;
            }
            let nextUid = null;
            for (let i = 1; i <= order.length; i++) {
                const cand = order[(myIdx + i) % order.length];
                if (alive.has(cand)) {
                    nextUid = cand;
                    break;
                }
            }
            await setNextTurnSafe(gameId, user.uid, nextUid);
            return;
        }
        // 2) Heavy path: actions that change pot/currentBet -> keep the tx, but only read what's needed
        await runTransaction(db, async (tx) => {
            const gSnap = await tx.get(gameRef);
            const pSnap = await tx.get(meRef);
            if (!gSnap.exists() || !pSnap.exists())
                return;
            const g = gSnap.data();
            const me = pSnap.data();
            if (g.currentTurn !== user.uid)
                return;
            let potVal = g.pot || 0;
            let myBet = me.bet || 0;
            let curBet = g.currentBet || 0;
            if (action === 'call') {
                const callAmt = Math.max(0, curBet - myBet);
                if (callAmt > 0 && me.chips >= callAmt) {
                    potVal += callAmt;
                    myBet += callAmt;
                    tx.update(meRef, {
                        bet: myBet,
                        chips: me.chips - callAmt,
                        hasActed: true,
                        updatedAt: serverTimestamp(),
                    });
                    tx.update(gameRef, { pot: potVal, updatedAt: serverTimestamp() });
                }
                else {
                    tx.update(meRef, { hasActed: true, updatedAt: serverTimestamp() });
                }
                return;
            }
            if (action === 'raise') {
                const raiseAmt = Math.max(0, Math.floor(Number(amount)));
                if (raiseAmt <= 0 || me.chips < raiseAmt)
                    return;
                myBet += raiseAmt;
                curBet = myBet;
                potVal += raiseAmt;
                tx.update(meRef, {
                    bet: myBet,
                    chips: me.chips - raiseAmt,
                    hasActed: true,
                    updatedAt: serverTimestamp(),
                });
                tx.update(gameRef, { pot: potVal, currentBet: curBet, updatedAt: serverTimestamp() });
                return;
            }
        });
        // After call/raise: reset others' hasActed if a raise happened, and advance turn safely
        const [g2Snap, playersSnap] = await Promise.all([
            getDoc(gameRef),
            getDocs(collection(db, 'games', gameId, 'players')),
        ]);
        const g2 = g2Snap.data() || {};
        const order = g2.playersOrder || [];
        const alive = new Set(playersSnap.docs.filter((d) => d.data().status === 'playing').map((d) => d.id));
        if (action === 'raise') {
            const batch = writeBatch(db);
            playersSnap.docs.forEach((d) => {
                if (d.id !== user.uid && alive.has(d.id)) {
                    batch.update(d.ref, { hasActed: false });
                }
            });
            await batch.commit();
        }
        const myIdx = order.indexOf(user.uid);
        if (myIdx === -1) {
            await setNextTurnSafe(gameId, user.uid, null);
            return;
        }
        let nextUid = null;
        for (let i = 1; i <= order.length; i++) {
            const cand = order[(myIdx + i) % order.length];
            if (alive.has(cand)) {
                nextUid = cand;
                break;
            }
        }
        await setNextTurnSafe(gameId, user.uid, nextUid);
    };
    const parseCard = (s) => {
        const suit = s.slice(-1);
        const rank = s.slice(0, -1);
        return { rank, suit };
    };
    // ===== Determine winner =====
    const showdown = async () => {
        await sleep(200);
        const livePlayers = players.filter((p) => p.status === 'playing');
        const scores = livePlayers.map((p) => ({
            uid: p.uid,
            handValue: evaluateHand([...(p.holeCards || []), ...communityCards].map(parseCard)),
        }));
        const maxScore = Math.max(...scores.map((s) => s.handValue));
        const winners = scores.filter((s) => s.handValue === maxScore);
        const share = Math.floor(pot / winners.length);
        for (const w of winners) {
            const p = players.find((pl) => pl.uid === w.uid);
            if (p)
                await updatePlayerStatus(gameId, p.uid, { chips: p.chips + share });
        }
        await resetRound(gameId);
    };
    // ===== UI =====
    if (!user) {
        return (_jsx(BackgroundLayout, { children: _jsxs("div", { className: 'game-container', children: [_jsx("h1", { children: "\u2660 Poker \u2663" }), _jsx("p", { className: 'small', children: "Sign in to join this table." })] }) }));
    }
    const me = players.find((p) => p.uid === user?.uid);
    return (_jsx(BackgroundLayout, { children: _jsxs("div", { className: 'game-container', children: [_jsxs("h1", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: ["\u2660 Poker \u2663", _jsx("button", { onClick: async () => {
                                try {
                                    await navigator.clipboard.writeText(gameId || '');
                                    alert('Copied game ID!');
                                }
                                catch (err) {
                                    console.error('Copy failed', err);
                                }
                            }, style: {
                                padding: '4px 8px',
                                fontSize: '0.8rem',
                                borderRadius: 6,
                                background: 'var(--secondary-colour)',
                                border: '1px solid rgba(255,255,255,.12)',
                                color: 'var(--text-colour)',
                                cursor: 'pointer',
                            }, children: "Copy Lobby Link" })] }), _jsxs("div", { className: 'table', children: [_jsxs("div", { className: 'hand-container', children: [_jsx("h2", { children: "Community Cards" }), _jsx("div", { className: 'cards', children: communityCards.map((card, i) => (_jsx("div", { className: `card ${card.includes('♥') || card.includes('♦') ? 'red' : ''} dealt`, children: card }, i))) })] }), _jsxs("h2", { children: ["Pot: $", pot, " / Round: ", round] }), _jsxs("div", { className: 'hand-container', children: [_jsx("h2", { children: "You" }), _jsx("div", { className: 'cards', children: players
                                        .find((p) => p.uid === user?.uid)
                                        ?.holeCards?.map((card, i) => (_jsx("div", { className: `card ${card.includes('♥') || card.includes('♦') ? 'red' : ''} dealt`, children: card }, i))) || (_jsx("p", { className: 'small', style: { opacity: 0.7 }, children: "Waiting for cards..." })) })] }), players.filter((p) => p.uid !== user?.uid).length > 0 && (_jsxs("div", { className: 'hand-container', children: [_jsx("h2", { children: "Other Players" }), _jsx("div", { className: 'cards', style: { display: 'grid', gap: 8 }, children: players
                                        .filter((p) => p.uid !== user?.uid)
                                        .map((p) => (_jsxs("div", { style: {
                                            border: '1px solid rgba(255,255,255,.12)',
                                            borderRadius: 8,
                                            padding: 8,
                                        }, children: [_jsxs("div", { style: { marginBottom: 6, fontWeight: 600 }, children: [p.displayName || p.uid.slice(0, 6), " - Chips: ", p.chips, p.uid === user?.uid && ' (You)', p.status === 'playing' ? ' • playing' : ` (${p.status})`] }), _jsx("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap' }, children: (p.holeCards || []).map((card, i) => (_jsx("div", { className: `card ${card.includes('♥') || card.includes('♦') ? 'red' : ''} dealt`, style: { minWidth: 32, textAlign: 'center' }, children: p.uid === user?.uid ? card : '??' }, i))) })] }, p.uid))) })] }))] }), _jsxs("div", { className: 'controls', style: { marginTop: 20 }, children: [!me?.ready && _jsx("button", { onClick: readyUp, children: "Ready Up" }), myTurn && round !== 'showdown' && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => playerAction('check'), children: "Check" }), _jsx("button", { onClick: () => playerAction('call'), children: "Call" }), _jsx("button", { onClick: () => playerAction('raise', 50), children: "Raise 50" }), _jsx("button", { onClick: () => playerAction('fold'), children: "Fold" })] })), round === 'showdown' && _jsx("button", { onClick: () => resetRound(gameId), children: "Next Hand" })] })] }) }));
}
