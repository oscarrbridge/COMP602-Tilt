import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { recordBet, recordWin, recordLoss } from '@myfirebase/transactions';
export default function TestTransactions({ user }) {
    const [pending, setPending] = useState(null);
    async function testBet() {
        if (!user)
            return console.error('Not logged in');
        try {
            setPending('bet');
            console.log('Placing bet...');
            // Pass POSITIVE 20; helper will store as -20 internally
            await recordBet(user.uid, 20, { gameType: 'blackjack', round: 1 });
            console.log('Bet recorded');
        }
        catch (err) {
            console.error('Failed to record bet:', err);
        }
        finally {
            setPending(null);
        }
    }
    async function testWin() {
        if (!user)
            return console.error('Not logged in');
        try {
            setPending('win');
            console.log('Recording win...');
            await recordWin(user.uid, 50, { gameType: 'blackjack', round: 1 });
            console.log('Win recorded');
        }
        catch (err) {
            console.error('Failed to record win:', err);
        }
        finally {
            setPending(null);
        }
    }
    async function testLoss() {
        if (!user)
            return console.error('Not logged in');
        try {
            setPending('loss');
            console.log('Recording loss...');
            await recordLoss(user.uid, 15, { gameType: 'blackjack', round: 2 });
            console.log('Loss recorded');
        }
        catch (err) {
            console.error('Failed to record loss:', err);
        }
        finally {
            setPending(null);
        }
    }
    const disabled = !user || pending !== null;
    return (_jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("button", { onClick: testBet, disabled: disabled, children: pending === 'bet' ? 'Betting…' : 'Test Bet (20)' }), _jsx("button", { onClick: testWin, disabled: disabled, children: pending === 'win' ? 'Recording…' : 'Test Win (50)' }), _jsx("button", { onClick: testLoss, disabled: disabled, children: pending === 'loss' ? 'Recording…' : 'Test Loss (15)' })] }));
}
