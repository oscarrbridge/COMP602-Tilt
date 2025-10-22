import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useCurrency } from '../components/CurrencySwitcher/currencyswitcher';
export default function BetControls({ balance, bet, setBet, startGame }) {
    const { convertFromBase, convert, code, base } = useCurrency();
    // Convert cents → dollars in the active currency
    const balanceInCurrency = Math.floor(convertFromBase(balance / 100));
    const handleStart = () => {
        // bet is in dollars, so scale back to cents
        const betInCents = bet * 100;
        // Convert to NZD base (still in cents)
        const betInBase = convert(betInCents / 100, code, base) * 100;
        startGame(betInBase);
    };
    return (_jsxs("div", { children: [_jsx("label", { htmlFor: 'bet-input', children: "Bet Amount:" }), _jsx("input", { id: 'bet-input', type: 'number', min: 5, max: balanceInCurrency, value: bet, onChange: (e) => setBet(Math.min(Math.max(Number(e.target.value), 5), balanceInCurrency)), style: {
                    marginLeft: '8px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                } }), _jsx("button", { onClick: handleStart, style: {
                    marginLeft: '10px',
                    padding: '6px 14px',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#b38619',
                    color: 'white',
                    cursor: 'pointer',
                }, children: "Bet" })] }));
}
