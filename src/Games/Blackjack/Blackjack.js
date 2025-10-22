import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import './Blackjack.css';
import BackgroundLayout from '../../components/BackgroundLayout/BackgroundLayout';
import { placeBet, recordWinTx, recordLossTx } from '@backend/transactions';
import { useUser } from '@backend/firebase/UserFunctions';
import { CurrencyProvider } from '@components/CurrencySwitcher/currencyswitcher';
import BetControls from '../BetControls';
import BlackjackFX from './BlackjackFX';
import './BlackjackFX.css';
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
export default function Blackjack() {
    const { user, balance, refreshBalance } = useUser();
    const [playerCards, setPlayerCards] = useState([]);
    const [dealerCards, setDealerCards] = useState([]);
    const [bet, setBet] = useState(10);
    const [lastWin, setLastWin] = useState(0);
    const [roundResult, setRoundResult] = useState('');
    const [, setDealerRevealed] = useState(false); // Implement CSS here
    const [betInBase, setBetInBase] = useState(0);
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    // Track whether a round is in progress
    const [roundInProgress, setRoundInProgress] = useState(false);
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
            // Round over → reveal full dealer score
            return calcScore(dealerCards);
        }
        if (dealerCards.length > 1) {
            // Hide second card, show only the first one’s value
            const firstCardValue = cardValue(dealerCards[0]);
            return `${firstCardValue} + ??`;
        }
        return '??';
    };
    const startGame = async (newBetInBase) => {
        if (newBetInBase > balance) {
            alert('Not enough balance!');
            return;
        }
        setRoundResult('');
        setBetInBase(newBetInBase);
        setPlayerCards([getCard(), getCard()]);
        setDealerCards([getCard(), getCard()]);
        setLastWin(0);
        setRoundInProgress(true);
        setDealerRevealed(false);
        if (!user)
            return;
        await placeBet(user.uid, newBetInBase, 1, 'blackjack');
        await refreshBalance();
    };
    const hit = async () => {
        const newCards = [...playerCards, getCard()];
        setPlayerCards(newCards);
        if (calcScore(newCards) > 21) {
            setLastWin(0);
            setRoundResult('loss'); // player busts
            setRoundInProgress(false);
            if (!user)
                return;
            await recordLossTx(user.uid, betInBase, 1, 'blackjack');
            await refreshBalance();
        }
    };
    const stand = async () => {
        setDealerRevealed(true);
        setRoundInProgress(false);
        let dealerHand = [...dealerCards];
        setDealerCards(dealerHand);
        await sleep(800);
        while (calcScore(dealerHand) < 17) {
            dealerHand.push(getCard());
            setDealerCards([...dealerHand]);
            await sleep(800); // delay between draws
        }
        const playerScore = calcScore(playerCards);
        const dealerScore = calcScore(dealerHand);
        if (playerScore > 21 || (dealerScore <= 21 && dealerScore > playerScore)) {
            setLastWin(0);
            if (!user)
                return;
            await recordLossTx(user.uid, betInBase, 1, 'blackjack');
            await refreshBalance();
            setRoundResult('loss');
        }
        else if (playerScore == dealerScore) {
            if (!user)
                return;
            await recordWinTx(user.uid, betInBase, 1, 'blackjack'); // Give balance back when Tie
            await refreshBalance();
            setRoundResult('tie');
        }
        else if (playerScore > dealerScore || dealerScore > 21) {
            setLastWin(bet);
            if (!user)
                return;
            await recordWinTx(user.uid, betInBase * 2, 1, 'blackjack'); // Double bet to accomadate for winnings
            await refreshBalance();
            setRoundResult('win');
        }
    };
    return (_jsx(BackgroundLayout, { children: _jsxs("div", { className: 'game-container', children: [_jsxs(CurrencyProvider, { base: 'NZD', DefaultCurrency: 'NZD', children: [_jsx("h1", { children: "\u2660 Blackjack \u2663" }), !roundInProgress && (_jsx(BetControls, { balance: balance, bet: bet, setBet: setBet, startGame: startGame }))] }), _jsxs("div", { className: `table ${roundResult ? `table--${roundResult}` : ''}`, children: [_jsxs("div", { className: 'hand-container', children: [_jsxs("h2", { children: ["Dealer (", getDealerDisplayScore(), ")"] }), _jsx("div", { className: 'cards', children: dealerCards.map((c, i) => (_jsx("div", { className: `card ${c.suit === '♥' || c.suit === '♦' ? 'red' : ''} dealt`, children: i === 1 && roundInProgress ? '??' : `${c.rank}${c.suit}` }, i))) })] }), _jsxs("div", { className: 'hand-container', children: [_jsxs("h2", { children: ["You (", calcScore(playerCards), ")"] }), _jsx("div", { className: 'cards', children: playerCards.map((c, i) => (_jsxs("div", { className: `card ${c.suit === '♥' || c.suit === '♦' ? 'red' : ''} dealt`, children: [c.rank, c.suit] }, i))) })] }), _jsx(BlackjackFX, { result: roundResult })] }), roundInProgress && (_jsxs("div", { className: 'controls', children: [_jsx("button", { onClick: hit, children: "Hit" }), _jsx("button", { onClick: stand, children: "Stand" })] })), _jsx("div", { className: `win-display ${roundResult === 'win'
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
