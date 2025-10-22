import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../../Backend/firebase/firebaseConfig';
import { useCurrency } from '../CurrencySwitcher/currencyswitcher'; // same hook you used in BetControls
import './AutoPayment.css';
// FastAPI URL
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';
// ---- helpers ----
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
const parseAmount = (s) => {
    const n = Number(String(s).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
};
export default function AutoPayment() {
    const [uid, setUid] = useState(null);
    const [isEnabled, setIsEnabled] = useState(false);
    // UI amount is in *active currency* dollars (string for the input)
    const [amountInput, setAmountInput] = useState('20.00');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    // currency utils (same shape as your BetControls)
    const { convertFromBase, convert, code, base } = useCurrency(); // base is NZD in your app
    // --- auth ---
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => setUid(user ? user.uid : null));
        return () => unsub();
    }, []);
    // --- load settings (stored in NZD cents), render in active currency dollars ---
    useEffect(() => {
        if (!uid) {
            setIsLoading(false);
            return;
        }
        const ref = doc(db, 'users', uid);
        const unsub = onSnapshot(ref, (snap) => {
            setIsLoading(false);
            if (!snap.exists())
                return;
            const data = snap.data();
            setIsEnabled(!!data.autoPayEnabled);
            // Prefer cents canonical; fall back to dollars mirror if present.
            // Values in DB are NZD cents (integer).
            let nzdCents = null;
            if (typeof data.autoPayAmountCents === 'number') {
                nzdCents = data.autoPayAmountCents;
            }
            else if (typeof data.autoPayAmountDollars === 'number') {
                nzdCents = Math.round(Number(data.autoPayAmountDollars) * 100);
            }
            if (nzdCents != null) {
                const nzdDollars = nzdCents / 100; // NZD dollars
                const activeDollars = convertFromBase(nzdDollars); // -> active currency dollars
                setAmountInput(activeDollars.toFixed(2));
            }
        });
        return () => unsub();
    }, [uid, convertFromBase]);
    // Convert current input (active currency dollars) -> NZD cents (int) for saving
    const amountNzdCents = useMemo(() => {
        const activeDollars = parseAmount(amountInput); // e.g. USD 20.00 if user switched
        const nzdDollars = convert(activeDollars, code, base); // active -> NZD
        return Math.round(nzdDollars * 100); // NZD cents (int)
    }, [amountInput, convert, code, base]);
    const sendUpdate = async (enabled, nzdCents) => {
        if (!uid)
            return;
        setError('');
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/payments/update-autopay-settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid,
                    autoPayEnabled: enabled,
                    autoPayAmountCents: nzdCents, // backend expects NZD cents (canonical)
                }),
            });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
        }
        catch (e) {
            setError(e.message || 'Failed to update settings.');
            // revert the toggle UI if this was triggered from a toggle
            setIsEnabled((prev) => prev); // no-op; handled by caller when needed
        }
        finally {
            setIsLoading(false);
        }
    };
    // --- save button ---
    const handleSaveSettings = async () => {
        if (!uid)
            return;
        // enforce a reasonable min ($5 in current currency) before converting
        const clampedActive = clamp(parseAmount(amountInput), 5, 1_000_000);
        setAmountInput(clampedActive.toFixed(2));
        await sendUpdate(isEnabled, amountNzdCents);
    };
    // --- toggle ---
    const handleToggle = async (e) => {
        if (!uid)
            return;
        const nextEnabled = e.target.checked;
        setIsEnabled(nextEnabled);
        // If enabling and amount too small/invalid, force to 20.00 in UI currency
        const parsed = parseAmount(amountInput);
        const useAmountStr = nextEnabled && (!Number.isFinite(parsed) || parsed < 5) ? '20.00' : amountInput;
        if (useAmountStr !== amountInput)
            setAmountInput(useAmountStr);
        await sendUpdate(nextEnabled, amountNzdCents);
    };
    return (_jsxs("div", { className: 'AutoPaySetup', children: [_jsxs("div", { className: 'ToggleControl', children: [_jsx("label", { htmlFor: 'auto-pay-toggle', children: "Automatically top-up when balance is below $10 (NZD)" }), _jsx("input", { id: 'auto-pay-toggle', type: 'checkbox', checked: isEnabled, onChange: handleToggle, disabled: isLoading || !uid })] }), isEnabled && (_jsxs("div", { className: 'SettingsControl', children: [_jsxs("p", { children: ["Top-up amount (", code, "):"] }), _jsx("input", { type: 'number', inputMode: 'decimal', min: '5', step: '0.01', value: amountInput, onChange: (e) => setAmountInput(e.target.value), disabled: isLoading }), _jsx("button", { onClick: handleSaveSettings, disabled: isLoading, children: isLoading ? 'Saving...' : 'Update Settings' })] })), error && _jsx("p", { className: 'FormError', children: error }), !uid && _jsx("p", { className: 'FormHint', children: "Sign in to manage auto-top-up." })] }));
}
