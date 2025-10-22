import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import './Cointoss.css';
import BackgroundLayout from '@components/BackgroundLayout/BackgroundLayout';
import { placeBet, recordWinTx, recordLossTx } from '@backend/transactions';
import { useUser } from '@backend/firebase/UserFunctions';
import { CurrencyProvider } from '@components/CurrencySwitcher/currencyswitcher';
import BetControls from '../BetControls';
import coinBase from '../../assets/coin.png';
import coinHead from '../../assets/coin-head.png';
import coinTail from '../../assets/Tilt-icon.png';
export default function CoinFlip() {
    const { user, balance, refreshBalance } = useUser();
    const [bet, setBet] = useState(10);
    const [betInBase, setBetInBase] = useState(0);
    const [roundResult, setRoundResult] = useState('');
    const [lastWin, setLastWin] = useState(0);
    const [roundInProgress, setRoundInProgress] = useState(false);
    const [playerChoice, setPlayerChoice] = useState(null);
    const [flipResult, setFlipResult] = useState(null);
    const [isFlipping, setIsFlipping] = useState(false);
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const startGame = async (newBetInBase) => {
        if (!user) {
            alert('You must be logged in to play!');
            return;
        }
        if (newBetInBase > balance) {
            alert('Not enough balance!');
            return;
        }
        // reset state for new round
        setBetInBase(newBetInBase);
        setLastWin(0);
        setRoundResult('');
        setPlayerChoice(null);
        setFlipResult(null); // ✅ clear only when starting new round
        setIsFlipping(false);
        setRoundInProgress(true);
        await placeBet(user.uid, newBetInBase, 1, 'coinflip');
        await refreshBalance();
    };
    const chooseSide = async (choice) => {
        if (!user) {
            alert('You must be logged in to play!');
            return;
        }
        setPlayerChoice(choice);
        setIsFlipping(true);
        await sleep(2000); // spin for 2s
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        setFlipResult(result); // ✅ coin stays rendered after result
        setIsFlipping(false);
        if (choice === result) {
            setLastWin(bet);
            await recordWinTx(user.uid, betInBase * 2, 1, 'coinflip');
            await refreshBalance();
            setRoundResult('win');
        }
        else {
            setLastWin(0);
            await recordLossTx(user.uid, betInBase, 1, 'coinflip');
            await refreshBalance();
            setRoundResult('loss');
        }
        // ✅ just mark round as finished, don't clear flipResult
        setRoundInProgress(false);
    };
    return (_jsx(BackgroundLayout, { children: _jsxs("div", { className: 'game-container', children: [_jsxs(CurrencyProvider, { base: 'NZD', DefaultCurrency: 'NZD', children: [_jsx("h1", { children: "\uD83E\uDE99 Coin Toss \uD83E\uDE99" }), !roundInProgress && (_jsx(BetControls, { balance: balance, bet: bet, setBet: setBet, startGame: startGame }))] }), roundInProgress && !playerChoice && (_jsxs("div", { className: 'controls', children: [_jsx("h2", { children: "Pick a side:" }), _jsx("button", { onClick: () => chooseSide('heads'), children: "Heads" }), _jsx("button", { onClick: () => chooseSide('tails'), children: "Tails" })] })), roundInProgress && isFlipping && (_jsxs("div", { className: 'coin flipping', children: [_jsxs("div", { className: 'coin-face coin-head', children: [_jsx("img", { src: coinBase, alt: 'Coin base', className: 'coin-base' }), _jsx("img", { src: coinHead, alt: 'Heads', className: 'coin-overlay' })] }), _jsxs("div", { className: 'coin-face coin-tail', children: [_jsx("img", { src: coinBase, alt: 'Coin base', className: 'coin-base' }), _jsx("img", { src: coinTail, alt: 'Tails', className: 'coin-overlay' })] })] })), flipResult && (_jsxs("div", { className: 'coin', children: [_jsxs("div", { className: `coin-face coin-head ${flipResult === 'heads' ? 'show' : 'hide'}`, style: { transform: 'rotateY(0deg)' }, children: [_jsx("img", { src: coinBase, alt: 'Coin base', className: 'coin-base' }), _jsx("img", { src: coinHead, alt: 'Heads', className: 'coin-overlay' })] }), _jsxs("div", { className: `coin-face coin-tail ${flipResult === 'tails' ? 'show' : 'hide'}`, style: { transform: 'rotateY(0deg)' }, children: [_jsx("img", { src: coinBase, alt: 'Coin base', className: 'coin-base' }), _jsx("img", { src: coinTail, alt: 'Tails', className: 'coin-overlay' })] })] })), !roundInProgress && roundResult && (_jsx("div", { className: `win-display ${roundResult === 'win' ? 'win-amount' : roundResult === 'loss' ? 'loss-amount' : ''}`, children: roundResult === 'win' ? `+ $${lastWin}` : roundResult === 'loss' ? `- $${bet}` : '' }))] }) }));
}
