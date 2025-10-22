import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from 'react';
import './Blackjack.css';
import BackgroundLayout from '@components/BackgroundLayout/BackgroundLayout';
import { placeBet, recordWinTx, recordLossTx } from '@backend/transactions';
import { useUser } from '@backend/firebase/UserFunctions';
import { CurrencyProvider } from '@components/CurrencySwitcher/currencyswitcher';
import BetControls from '../BetControls';
import { db } from '@backend/firebase/firebaseConfig';
import { doc, setDoc, updateDoc, onSnapshot, arrayUnion, getDoc, serverTimestamp, collection, runTransaction, getDocs, } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
// Local helpers
const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const getCard = () => {
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    return { rank, suit };
};
const cardValue = (card) => {
    if (['J', 'Q', 'K'].includes(card.rank))
        return 10;
    if (card.rank === 'A')
        return 11;
    return parseInt(card.rank);
};
export function BlackjackMRoute() {
    const { gameId } = useParams();
    return _jsx(Blackjackm, { gameId: gameId });
}
export default function Blackjackm({ gameId = 'testGame' }) {
    const { user, balance, refreshBalance } = useUser();
    // Local UI state (render-only state; authoritative state lives in Firestore)
    const [playerCards, setPlayerCards] = useState([]);
    const [dealerCards, setDealerCards] = useState([]);
    const [bet, setBet] = useState(10);
    const [lastWin, setLastWin] = useState(0);
    const [roundResult, setRoundResult] = useState('');
    const [, setDealerRevealed] = useState(false);
    const [betInBase, setBetInBase] = useState(0);
    const [roundInProgress, setRoundInProgress] = useState(false);
    // turn/players snapshot
    const [currentTurn, setCurrentTurn] = useState(null);
    const [otherPlayers, setOtherPlayers] = useState([]);
    const [hostUid, setHostUid] = useState(null);
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    // Firestore refs (gameRef can be created unconditionally)
    const gameRef = useMemo(() => doc(db, 'games', gameId), [gameId]);
    // Ensure game doc & my player doc exist
    useEffect(() => {
        if (!user?.uid)
            return;
        let mounted = true;
        (async () => {
            const g = await getDoc(gameRef);
            if (!g.exists() && mounted) {
                await setDoc(gameRef, {
                    host: user.uid,
                    currentTurn: null,
                    dealerHand: [],
                    dealerHidden: null,
                    gameType: 'blackjack',
                    minPlayers: 2,
                    maxPlayers: 5,
                    state: 'waiting', // waiting → in-progress → dealer → finished
                    createdAt: serverTimestamp(),
                    dealLock: null,
                }, { merge: true });
            }
            const playerRef = doc(db, 'games', gameId, 'players', user.uid);
            const p = await getDoc(playerRef);
            if (!p.exists() && mounted) {
                await setDoc(playerRef, {
                    displayName: user.displayName || user.email || 'Player',
                    bet: 0,
                    cards: [],
                    status: 'waiting',
                    paid: false,
                    joinedAt: serverTimestamp(),
                }, { merge: true });
            }
        })();
        return () => {
            mounted = false;
        };
    }, [user?.uid, gameId, gameRef]);
    // Listen to game changes (single source of truth for round state)
    useEffect(() => {
        const unsubGame = onSnapshot(gameRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setDealerCards(data.dealerHand || []);
                setDealerRevealed(data.state !== 'in-progress');
                setRoundInProgress(data.state === 'in-progress');
                setCurrentTurn(data.currentTurn ?? null);
                setHostUid(data.host || null);
            }
            else {
                setDealerCards([]);
                setRoundInProgress(false);
                setDealerRevealed(false);
                setCurrentTurn(null);
                setHostUid(null);
            }
        });
        return () => unsubGame();
    }, [gameRef]);
    // Listen to my player changes
    useEffect(() => {
        if (!user?.uid)
            return;
        const playerRef = doc(db, 'games', gameId, 'players', user.uid);
        const unsubPlayer = onSnapshot(playerRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setPlayerCards(data.cards || []);
                setRoundResult(data.status || '');
            }
            else {
                setPlayerCards([]);
                setRoundResult('');
            }
        });
        return () => unsubPlayer();
    }, [user?.uid, gameId]);
    // Auto-deal lock (host only). Prevents multiple tabs racing to deal.
    async function tryAutoDeal() {
        if (!user)
            return;
        // lock dealing atomically
        const locked = await runTransaction(db, async (tx) => {
            const gSnap = await tx.get(gameRef);
            if (!gSnap.exists())
                return false;
            const g = gSnap.data();
            // only host should proceed
            if (g.host && g.host !== user.uid)
                return false;
            // don't deal if already in progress / dealer / or locked
            if (g.state === 'in-progress' || g.state === 'dealer' || g.dealLock)
                return false;
            tx.update(gameRef, { dealLock: serverTimestamp() });
            return true;
        });
        if (!locked)
            return;
        try {
            // read latest game config (minPlayers)
            const g2 = await getDoc(gameRef);
            const gData = g2.exists() ? g2.data() : {};
            const requiredPlayers = gData?.minPlayers ?? 2;
            // load players
            const playersColRef = collection(db, 'games', gameId, 'players');
            const snap = await getDocs(playersColRef);
            const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            // players who have opted in this round
            const active = all.filter((p) => p.status === 'active');
            // wait until: at least minPlayers + EVERY active has bet + nobody has been dealt yet
            const everyoneReady = active.length >= requiredPlayers &&
                active.every((p) => (p.bet ?? 0) > 0 && (p.cards?.length ?? 0) === 0);
            if (!everyoneReady) {
                await updateDoc(gameRef, { dealLock: null });
                return;
            }
            // deal one up-card to each active player
            await Promise.all(active.map((p) => setDoc(doc(db, 'games', gameId, 'players', p.id), { cards: [getCard()], paid: false, status: 'active' }, { merge: true })));
            // begin the round
            const order = active.map((p) => p.id);
            await updateDoc(gameRef, {
                state: 'in-progress',
                dealerHand: [getCard()],
                currentTurn: order[0] || null,
                playersOrder: order,
                activeIndex: 0,
                gameType: 'blackjack',
                dealLock: null,
            });
        }
        catch (e) {
            await updateDoc(gameRef, { dealLock: null });
            throw e;
        }
    }
    // Listen to all players to show others' cards + auto-deal + auto-advance (host only)
    useEffect(() => {
        if (!user?.uid)
            return;
        const playersCol = collection(db, 'games', gameId, 'players');
        const unsub = onSnapshot(playersCol, async (snap) => {
            const all = snap.docs.map((d) => {
                const data = d.data();
                return {
                    uid: d.id,
                    displayName: data.displayName,
                    cards: data.cards || [],
                    status: data.status,
                    bet: data.bet || 0,
                    paid: !!data.paid,
                };
            });
            setOtherPlayers(all.filter((p) => p.uid !== user.uid));
            // host: if current player finished (not 'active'), advance
            if (hostUid === user.uid && currentTurn) {
                const cur = all.find((p) => p.uid === currentTurn);
                if (cur && cur.status && cur.status !== 'active') {
                    advanceTurnOrFinish();
                }
            }
            // host: try to auto-deal when nobody is playing and everyone who joined has bet
            if (!roundInProgress && hostUid === user.uid) {
                await tryAutoDeal();
            }
        });
        return () => unsub();
    }, [user?.uid, gameId, hostUid, currentTurn, roundInProgress]);
    // Helpers
    const calcScore = (cards) => {
        let total = 0;
        let aces = 0;
        cards.forEach((c) => {
            total += cardValue(c);
            if (c.rank === 'A')
                aces++;
        });
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        return total;
    };
    const getDealerDisplayScore = () => {
        if (!roundInProgress) {
            return calcScore(dealerCards);
        }
        if (dealerCards.length >= 1) {
            const first = cardValue(dealerCards[0]);
            return `${first} + ??`;
        }
        return '??';
    };
    // advance to next active player or kick to dealer (host-only)
    async function advanceTurnOrFinish() {
        if (!user || hostUid !== user.uid)
            return; // host-only
        await runTransaction(db, async (tx) => {
            const g = await tx.get(gameRef);
            if (!g.exists())
                return;
            const data = g.data();
            const playersOrder = data.playersOrder || [];
            if (playersOrder.length === 0) {
                tx.update(gameRef, { state: 'dealer', currentTurn: null });
                return;
            }
            let idx = typeof data.activeIndex === 'number' ? data.activeIndex : 0;
            const playersCol = collection(db, 'games', gameId, 'players');
            const playersSnap = await getDocs(playersCol);
            const statusByUid = new Map(playersSnap.docs.map((d) => [d.id, d.data().status || 'waiting']));
            let foundNext = null;
            for (let step = 0; step < playersOrder.length; step++) {
                idx = (idx + 1) % playersOrder.length;
                const uid = playersOrder[idx];
                if (statusByUid.get(uid) === 'active') {
                    foundNext = uid;
                    break;
                }
            }
            if (foundNext) {
                tx.update(gameRef, { currentTurn: foundNext, activeIndex: idx });
            }
            else {
                tx.update(gameRef, { state: 'dealer', currentTurn: null });
            }
        });
        const post = await getDoc(gameRef);
        if (post.exists()) {
            const d = post.data();
            if (d.state === 'dealer') {
                await resolveDealerAndSettle();
            }
        }
    }
    // helper: pay exactly once and mark paid=true
    async function payOnce(uid, _amount, kind) {
        const pRef = doc(db, 'games', gameId, 'players', uid);
        const pSnap = await getDoc(pRef);
        const pdata = pSnap.exists() ? pSnap.data() : {};
        if (pdata.paid)
            return;
        // tie → return bet; win → pay 2x; loss → already deducted on bet or bust
        if (kind === 'win') {
            await recordWinTx(uid, (pdata.bet ?? 0) * 2, 1, 'blackjack');
        }
        else if (kind === 'tie') {
            await recordWinTx(uid, pdata.bet ?? 0, 1, 'blackjack');
        }
        await updateDoc(pRef, { paid: true });
        await refreshBalance();
    }
    // dealer plays once; settle everyone (host-only)
    async function resolveDealerAndSettle() {
        if (!user || hostUid !== user.uid)
            return;
        let dealerHand = dealerCards.length ? [...dealerCards] : [getCard(), getCard()];
        await updateDoc(gameRef, { dealerHand });
        await sleep(250);
        while (calcScore(dealerHand) < 17) {
            dealerHand.push(getCard());
            await updateDoc(gameRef, { dealerHand });
            await sleep(250);
        }
        const playersCol = collection(db, 'games', gameId, 'players');
        const playersSnap = await getDocs(playersCol);
        for (const d of playersSnap.docs) {
            const pdata = d.data();
            const uid = d.id;
            const pCards = pdata.cards || [];
            const pScore = calcScore(pCards);
            const dScore = calcScore(dealerHand);
            // make sure any still-'active' players are treated as standing now
            if (pdata.status === 'active') {
                await updateDoc(doc(db, 'games', gameId, 'players', uid), { status: 'stand' });
            }
            if (pdata.paid)
                continue; // already settled (e.g., bust instant loss)
            if (pScore > 21 || (dScore <= 21 && dScore > pScore)) {
                // loss (if not busted earlier). Do NOT double-charge; bet was already deducted at placeBet.
                await updateDoc(doc(db, 'games', gameId, 'players', uid), { status: 'loss', paid: true });
            }
            else if (pScore === dScore) {
                await updateDoc(doc(db, 'games', gameId, 'players', uid), { status: 'tie' });
                await payOnce(uid, pdata.bet ?? 0, 'tie');
            }
            else {
                await updateDoc(doc(db, 'games', gameId, 'players', uid), { status: 'win' });
                await payOnce(uid, pdata.bet ?? 0, 'win');
            }
        }
        await updateDoc(gameRef, { state: 'finished', currentTurn: null });
    }
    // Actions
    const startGame = async (newBetInBase) => {
        if (!user)
            return;
        if (newBetInBase > balance) {
            alert('Not enough balance!');
            return;
        }
        const playerRef = doc(db, 'games', gameId, 'players', user.uid);
        const pSnap = await getDoc(playerRef);
        const pData = pSnap.exists() ? pSnap.data() : null;
        if (pData?.status === 'active')
            return; // already joined this round
        setBetInBase(newBetInBase);
        setLastWin(0);
        setRoundResult('');
        setDealerRevealed(false);
        // join round with a bet; cards cleared; unpaid
        await setDoc(gameRef, { gameType: 'blackjack' }, { merge: true });
        await setDoc(playerRef, { bet: newBetInBase, cards: [], status: 'active', paid: false }, { merge: true });
        // deduct stake up-front
        await placeBet(user.uid, newBetInBase, 1, 'blackjack');
        await refreshBalance();
    };
    const hit = async () => {
        if (!user)
            return;
        if (currentTurn !== user.uid)
            return;
        const playerRef = doc(db, 'games', gameId, 'players', user.uid);
        const card = getCard();
        await updateDoc(playerRef, { cards: arrayUnion(card) });
        const newCards = [...playerCards, card];
        if (calcScore(newCards) > 21) {
            // instant bust → record loss and mark paid to avoid double-settlement
            setLastWin(0);
            await updateDoc(playerRef, { status: 'bust', paid: true });
            await recordLossTx(user.uid, betInBase, 1, 'blackjack');
            await refreshBalance();
            await advanceTurnOrFinish();
        }
    };
    const stand = async () => {
        if (!user)
            return;
        if (currentTurn !== user.uid)
            return;
        const playerRef = doc(db, 'games', gameId, 'players', user.uid);
        setDealerRevealed(true);
        await updateDoc(playerRef, { status: 'stand' });
        await advanceTurnOrFinish();
    };
    // UI
    if (!user) {
        return (_jsx(BackgroundLayout, { children: _jsxs("div", { className: 'game-container', children: [_jsx("h1", { children: "\u2660 Blackjack \u2663" }), _jsx("p", { className: 'small', children: "Sign in to join this table." })] }) }));
    }
    const isMyTurn = roundInProgress && currentTurn === user.uid;
    return (_jsx(BackgroundLayout, { children: _jsxs("div", { className: 'game-container', children: [_jsxs(CurrencyProvider, { base: 'NZD', DefaultCurrency: 'NZD', children: [_jsx("h1", { children: "\u2660 Blackjack \u2663" }), !roundInProgress && (_jsx(BetControls, { balance: balance, bet: bet, setBet: setBet, startGame: startGame }))] }), _jsxs("div", { className: 'table', children: [_jsxs("div", { className: 'hand-container', children: [_jsxs("h2", { children: ["Dealer (", getDealerDisplayScore(), ")"] }), _jsx("div", { className: 'cards', children: dealerCards.map((c, i) => (_jsx("div", { className: `card ${c.suit === '♥' || c.suit === '♦' ? 'red' : ''} dealt`, children: i === 1 && roundInProgress ? '??' : `${c.rank}${c.suit}` }, i))) })] }), _jsxs("div", { className: 'hand-container', children: [_jsxs("h2", { children: ["You (", calcScore(playerCards), ") ", isMyTurn ? '' : '(waiting)'] }), _jsx("div", { className: 'cards', children: playerCards.map((c, i) => (_jsxs("div", { className: `card ${c.suit === '♥' || c.suit === '♦' ? 'red' : ''} dealt`, children: [c.rank, c.suit] }, i))) })] }), otherPlayers.length > 0 && (_jsxs("div", { className: 'hand-container', children: [_jsx("h2", { children: "Other Players" }), _jsx("div", { className: 'cards', style: { display: 'grid', gap: 8 }, children: otherPlayers.map((p) => (_jsxs("div", { style: {
                                            border: '1px solid rgba(255,255,255,.12)',
                                            borderRadius: 8,
                                            padding: 8,
                                        }, children: [_jsxs("div", { style: { marginBottom: 6, fontWeight: 600 }, children: [p.displayName || p.uid.slice(0, 6), " (", calcScore(p.cards), ")", currentTurn === p.uid ? ' • turn' : ''] }), _jsx("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap' }, children: p.cards.map((c, i) => (_jsxs("div", { className: `card ${c.suit === '♥' || c.suit === '♦' ? 'red' : ''} dealt`, style: { minWidth: 32, textAlign: 'center' }, children: [c.rank, c.suit] }, i))) }), p.status && (_jsxs("div", { className: 'small', style: { marginTop: 4 }, children: ["Status: ", p.status] }))] }, p.uid))) })] }))] }), roundInProgress && (_jsxs("div", { className: 'controls', children: [_jsx("button", { onClick: hit, disabled: !isMyTurn, children: "Hit" }), _jsx("button", { onClick: stand, disabled: !isMyTurn, children: "Stand" })] })), _jsx("div", { className: `win-display ${roundResult === 'win'
                        ? 'win-amount'
                        : roundResult === 'loss'
                            ? 'loss-amount'
                            : roundResult === 'tie'
                                ? 'tie-amount'
                                : ''}`, children: roundResult === 'win'
                        ? `+ $${lastWin}`
                        : roundResult === 'loss'
                            ? `- $${bet}`
                            : roundResult === 'tie'
                                ? 'Tie'
                                : '' })] }) }));
}
