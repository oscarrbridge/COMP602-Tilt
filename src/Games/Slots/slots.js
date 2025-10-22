import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import './Slots.css';
import { placeBet, recordWinTx, recordLossTx } from '@backend/transactions';
import { useUser } from '@backend/firebase/UserFunctions';
import { CurrencyProvider } from '@components/CurrencySwitcher/currencyswitcher';
import BetControls from '../BetControls';
import BackgroundLayout from '@components/BackgroundLayout/BackgroundLayout';
import '@components/animations/win.css';
import '@components/animations/loss.css';
import { resetFx } from '@components/animations/animation';
function generateNum() {
    return Math.floor(Math.random() * 17) + 1;
}
function generateRow() {
    return Array.from({ length: 5 }, () => generateNum());
}
function spinSlots() {
    return Array.from({ length: 5 }, () => generateRow());
}
function calculateWinnings(slotGrid) {
    const result = [];
    for (const row of slotGrid) {
        const counts = {};
        for (const s of row)
            counts[s] = (counts[s] || 0) + 1;
        let rowMultiplier = 0;
        let matchValue = 0;
        for (const [symbolStr, count] of Object.entries(counts)) {
            const symbol = parseInt(symbolStr, 10);
            if (count >= 3) {
                matchValue = symbol;
                if (count === 3)
                    rowMultiplier = 1;
                else if (count === 4)
                    rowMultiplier = 2;
                else if (count === 5)
                    rowMultiplier = 5;
                if (rowMultiplier > 0) {
                    if (symbol <= 8)
                        rowMultiplier *= 2;
                    else if (symbol <= 12)
                        rowMultiplier *= 3;
                    else if (symbol <= 13)
                        rowMultiplier *= 4;
                    else if (symbol <= 14)
                        rowMultiplier *= 5;
                    else if (symbol <= 15)
                        rowMultiplier *= 10;
                    else if (symbol <= 16)
                        rowMultiplier *= 15;
                    else if (symbol <= 17)
                        rowMultiplier *= 20;
                }
                break;
            }
        }
        result.push({ match: matchValue, multiplier: rowMultiplier });
    }
    return result;
}
export default function Slots() {
    const { user, balance, refreshBalance } = useUser();
    const [grid, setGrid] = useState([]);
    const [bet, setBet] = useState(2.0);
    const [, setLastWin] = useState(0);
    const [winningCells, setWinningCells] = useState([]);
    const [roundInProgress, setRoundInProgress] = useState(false);
    const hostRef = useRef(null);
    const [winTier, setWinTier] = useState('');
    const [lossTier, setLossTier] = useState('');
    const [winInfo, setWinInfo] = useState({
        amount: 0,
        multiplier: 0,
        visible: false,
    });
    const [lossInfo, setLossInfo] = useState({
        amount: 0,
        visible: false,
        tier: '',
    });
    const fmtDollars = (cents) => (cents / 100).toFixed(2);
    const presetGrid = [
        [1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10],
        [17, 17, 17, 17, 17],
        [11, 12, 13, 14, 15],
        [16, 1, 2, 3, 4],
    ];
    useEffect(() => {
        setGrid(presetGrid);
    }, []);
    const spin = async (betInBase) => {
        if (betInBase > balance) {
            alert('Insufficient balance for this bet.');
            return;
        }
        setRoundInProgress(true);
        setLastWin(0);
        if (!user)
            return;
        await placeBet(user.uid, betInBase, 1, 'slots');
        await refreshBalance();
        const newGrid = spinSlots();
        setGrid(newGrid);
        const winningData = calculateWinnings(newGrid);
        const matches = winningData.map((r) => r.match);
        const multipliers = winningData.map((r) => r.multiplier);
        const totalMultiplier = multipliers.reduce((acc, v) => (v > 0 ? acc + v : acc), 0);
        setWinningCells(matches);
        const winAmount = betInBase * totalMultiplier;
        let tier = '';
        if (totalMultiplier >= 20)
            tier = 'jackpot';
        else if (totalMultiplier >= 5)
            tier = 'bigwin';
        else if (totalMultiplier >= 1)
            tier = 'win';
        setWinTier(tier);
        let ltier = '';
        if (!tier)
            ltier = totalMultiplier === 0 ? 'bust' : 'loss';
        setLossTier(ltier);
        if (winAmount > 0) {
            setWinInfo({ amount: winAmount, multiplier: totalMultiplier, visible: true });
            requestAnimationFrame(() => {
                const toast = hostRef.current?.querySelector('.fx-toast');
                if (toast)
                    resetFx(toast, 'fx-toast');
            });
            window.setTimeout(() => setWinInfo((w) => ({ ...w, visible: false })), 1800);
        }
        else {
            setLossInfo({ amount: betInBase, visible: true, tier: ltier });
            requestAnimationFrame(() => {
                const ltoast = hostRef.current?.querySelector('.fx-ltoast');
                if (ltoast)
                    resetFx(ltoast, 'fx-ltoast');
            });
            window.setTimeout(() => setLossInfo((l) => ({ ...l, visible: false })), 1400);
        }
        requestAnimationFrame(() => {
            const target = hostRef.current?.querySelector('.slot-grid');
            if (!target)
                return;
            if (tier) {
                resetFx(target, tier === 'jackpot' ? 'fx-jackpot' : tier === 'bigwin' ? 'fx-bigwin' : 'fx-win');
            }
            else if (ltier) {
                resetFx(target, ltier === 'bust' ? 'fx-bust' : 'fx-loss');
            }
        });
        if (winAmount > 0) {
            setLastWin(winAmount);
            await recordWinTx(user.uid, winAmount, 1, 'slots');
        }
        else {
            await recordLossTx(user.uid, betInBase, 1, 'slots');
        }
        await refreshBalance();
        setRoundInProgress(false);
    };
    const isWin = winTier === 'bigwin' || winTier === 'jackpot';
    const isLoss = lossTier === 'bust';
    return (_jsx(BackgroundLayout, { children: _jsxs("div", { className: 'game-container', children: [_jsxs(CurrencyProvider, { base: 'NZD', DefaultCurrency: 'NZD', children: [_jsx("h1", { children: "\u2660 Slots \u2663" }), !roundInProgress && (_jsx(BetControls, { balance: balance, bet: bet, setBet: setBet, startGame: spin }))] }), _jsxs("div", { ref: hostRef, className: 'fx-host', children: [winInfo.visible && (_jsxs("div", { className: `fx-toast ${isWin ? 'fx-toast--win' : ''}`, "aria-live": 'polite', children: [_jsx("div", { className: 'fx-toast__label', children: winTier === 'jackpot' ? 'JACKPOT!' : winTier === 'bigwin' ? 'BIG WIN!' : 'WIN' }), _jsxs("div", { className: 'fx-toast__amount', children: ["+ $", fmtDollars(winInfo.amount)] }), winInfo.multiplier > 0 && (_jsxs("div", { className: 'fx-toast__mult', children: ["\u00D7", winInfo.multiplier] }))] })), lossInfo.visible && (_jsxs("div", { className: `fx-ltoast ${isLoss ? 'fx-ltoast--lossplus' : lossInfo.tier === 'bust' ? 'fx-ltoast--bust' : ''}`, "aria-live": 'polite', children: [_jsx("div", { className: 'fx-ltoast__label', children: isLoss ? 'ROUND OVER' : lossInfo.tier === 'bust' ? 'BUST' : 'LOSS' }), _jsxs("div", { className: 'fx-ltoast__amount', children: ["- $", fmtDollars(lossInfo.amount)] })] })), _jsxs("div", { className: `slot-grid ${isWin
                                ? 'fx-win-plus'
                                : winTier
                                    ? 'fx-win'
                                    : isLoss
                                        ? 'fx-loss-plus'
                                        : lossTier
                                            ? 'fx-loss'
                                            : ''}`, children: [isWin && _jsx("div", { className: 'fx-sparkles' }), isWin && (_jsxs(_Fragment, { children: [_jsx("div", { className: 'fx-confetti' }), _jsx("div", { className: 'fx-coins', children: Array.from({ length: 18 }).map((_, i) => (_jsx("span", { children: "\uD83E\uDE99" }, i))) })] })), winTier === 'jackpot' && _jsx("div", { className: 'fx-flash' }), isLoss && (_jsxs(_Fragment, { children: [_jsx("div", { className: 'fx-loss-flash' }), _jsx("div", { className: 'fx-shards', children: Array.from({ length: 24 }).map((_, i) => (_jsx("span", {}, i))) }), _jsx("div", { className: 'fx-smoke' })] })), grid.map((row, rowIndex) => (_jsx("div", { className: 'slot-row', children: row.map((cell, cellIndex) => {
                                        const isWinning = winningCells[rowIndex] !== 0 && cell === winningCells[rowIndex];
                                        return (_jsx("img", { src: `/assets/${cell}.png`, alt: `Slot ${cell}`, className: `slot-cell ${isWinning ? 'winning' : ''}` }, cellIndex));
                                    }) }, rowIndex)))] })] })] }) }));
}
