import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState, useEffect } from 'react';
import './mines.css';
import BackgroundLayout from '../../components/BackgroundLayout/BackgroundLayout';
import { placeBet, recordWinTx, recordLossTx } from '../../../Backend/transactions';
import { useUser } from '@backend/firebase/UserFunctions';
import { CurrencyProvider } from '@components/CurrencySwitcher/currencyswitcher';
import BetControls from '../BetControls';
// Board component
function Board({ Size, Cells, GameOver, OnCellClick, }) {
    return (_jsx("div", { className: 'board', style: { '--size': Size }, children: Cells.map((cell) => (_jsx("div", { className: `cell ${cell.Revealed ? 'revealed' : ''} ${cell.Revealed && cell.IsMine ? 'mine' : ''}`, onClick: () => !GameOver && !cell.Revealed && OnCellClick(cell.Index), children: cell.Revealed && cell.IsMine ? '💣' : cell.Revealed ? '💎' : '' }, cell.Index))) }));
}
// Main App component
export default function Mines() {
    const { user, balance, refreshBalance } = useUser(); // balance is in cents
    const [Size, SetSize] = useState(5);
    const [Mines, SetMines] = useState(5);
    const [bet, setBet] = useState(10); // bet shown in whole dollars
    const [betInBase, setBetInBase] = useState(0); // bet in cents (NZD base)
    const [Cells, SetCells] = useState(null);
    const [Status, SetStatus] = useState('Idle');
    const [SafeRevealed, SetSafeRevealed] = useState(0);
    const total = Size * Size;
    // --- Game logic functions ---
    function BoardCreate(size, MineCount) {
        const total = size * size;
        const mineCount = Math.max(0, Math.min(MineCount, total - 1));
        const indices = Array.from({ length: total }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const mines = new Set(indices.slice(0, mineCount));
        return Array.from({ length: total }, (_, i) => ({
            Index: i,
            IsMine: mines.has(i),
            Revealed: false,
        }));
    }
    function multiplier(total, mines, SafeRevealed) {
        let m = 1;
        for (let i = 0; i < SafeRevealed; i++) {
            const CellsRemaining = total - i;
            const SafeRemaining = total - mines - i;
            m *= CellsRemaining / SafeRemaining;
        }
        return Number(m.toFixed(4));
    }
    function NextClick(total, mines, SafeRevealed) {
        const CellsRemaining = total - SafeRevealed;
        const SafeRemaining = total - mines - SafeRevealed;
        return Number((CellsRemaining / SafeRemaining).toFixed(4));
    }
    // --- Computed values ---
    const CurrentMult = useMemo(() => multiplier(total, Mines, SafeRevealed), [total, Mines, SafeRevealed]);
    const nextFactor = useMemo(() => NextClick(total, Mines, SafeRevealed), [total, Mines, SafeRevealed]);
    const PayoutNow = Math.floor(betInBase * CurrentMult); // payout in cents
    const NextPayout = Math.floor(betInBase * CurrentMult * nextFactor);
    // --- Game actions ---
    const startGame = async (newBetInBase) => {
        // newBetInBase is in cents
        if (newBetInBase > balance) {
            alert('Not enough balance!');
            return;
        }
        setBetInBase(newBetInBase);
        const validMines = Math.max(1, Math.min(Mines, total - 1));
        SetCells(BoardCreate(Size, validMines));
        SetSafeRevealed(0);
        SetStatus('Playing');
        if (!user)
            return;
        await placeBet(user.uid, newBetInBase, 1, 'mines');
        await refreshBalance();
    };
    async function HandleCellClick(index) {
        if (Status !== 'Playing' || !Cells)
            return;
        const tile = Cells[index];
        if (tile.Revealed)
            return;
        const next = Cells.slice();
        next[index] = { ...tile, Revealed: true };
        if (tile.IsMine) {
            const revealedAll = next.map((c) => (c.IsMine ? { ...c, Revealed: true } : c));
            SetCells(revealedAll);
            SetStatus('Lost');
            if (!user)
                return;
            await recordLossTx(user.uid, betInBase, 1, 'mines');
            await refreshBalance();
            return;
        }
        SetCells(next);
        SetSafeRevealed((v) => v + 1);
    }
    const cashOut = async () => {
        if (SafeRevealed === 0) {
            reset();
            return;
        }
        if (Status === 'Playing' && SafeRevealed > 0) {
            SetStatus('Cash');
            if (!user)
                return;
            await recordWinTx(user.uid, PayoutNow, 1, 'mines');
            await refreshBalance();
        }
    };
    function reset() {
        SetCells(null);
        SetSafeRevealed(0);
        SetStatus('Idle');
    }
    const gameOver = Status === 'Lost' || Status === 'Cash';
    const placeholder = Array.from({ length: total }, (_, i) => ({
        Index: i,
        IsMine: false,
        Revealed: false,
    }));
    useEffect(() => {
        if (Status === 'Lost' || Status === 'Cash') {
            const timer = setTimeout(() => SetStatus('Idle'), 2000);
            return () => clearTimeout(timer);
        }
    }, [Status]);
    // --- UI ---
    return (_jsx(BackgroundLayout, { children: _jsx(CurrencyProvider, { base: 'NZD', DefaultCurrency: 'NZD', children: _jsx("div", { className: 'game-container', children: _jsxs("div", { className: 'app', children: [_jsx("h1", { children: "Mines" }), _jsxs("div", { className: 'panel', children: [(Status === 'Idle' || Status === 'Lost' || Status === 'Cash') && (_jsx(BetControls, { balance: balance, bet: bet, setBet: setBet, startGame: startGame })), _jsxs("label", { children: ["Grid", _jsx("select", { value: Size, onChange: (e) => SetSize(Number(e.target.value)), disabled: Status === 'Playing', children: [3, 4, 5, 6].map((n) => (_jsxs("option", { value: n, children: [n, " \u00D7 ", n] }, n))) })] }), _jsxs("label", { children: ["Mines", _jsx("input", { type: 'number', min: 1, max: total - 1, value: Mines, onChange: (e) => SetMines(Number(e.target.value)), disabled: Status === 'Playing' })] }), Status === 'Playing' && _jsx("button", { onClick: cashOut, children: "Cash out" })] }), _jsxs("div", { className: 'results', children: [_jsxs("span", { className: 'result', children: ["Safes Found: ", SafeRevealed] }), _jsxs("span", { className: 'result', children: ["Current Multiplier \u00D7", CurrentMult] }), _jsxs("span", { className: 'result', children: ["Current Payout: $", (PayoutNow / 100).toFixed(2)] }), Status === 'Playing' && (_jsxs("span", { className: 'result', children: ["Next Safe \u00D7", nextFactor, " ($", (NextPayout / 100).toFixed(2), ")"] }))] }), _jsxs("div", { className: 'status', children: [Status === 'Idle' && (_jsxs(_Fragment, { children: ["Press ", _jsx("b", { children: "Bet" }), " to play."] })), Status === 'Playing' && _jsx(_Fragment, { children: "Pick Tiles" }), Status === 'Lost' && _jsx(_Fragment, { children: "\uD83D\uDCA3 Mine Hit. You lost." }), Status === 'Cash' && _jsxs(_Fragment, { children: ["\uD83D\uDCB0 Cashed Out: $", (PayoutNow / 100).toFixed(2)] })] }), _jsx(Board, { Size: Size, Cells: Cells ?? placeholder, GameOver: gameOver, OnCellClick: HandleCellClick })] }) }) }) }));
}
