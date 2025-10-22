import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@backend/firebase/firebaseConfig';
import './Withdraw.css';
import { useCurrency } from '../CurrencySwitcher/currencyswitcher';
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
export default function Withdraw() {
    // States for uid, withdraw amount, currency type, submit payment, error
    const [uid, setUid] = useState(auth.currentUser?.uid ?? null);
    const [amount, setAmount] = useState('');
    const { code, format, convert } = useCurrency();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');
    // Keep uid in sync with Firebase auth state
    // If we already have a uid, skip
    useEffect(() => {
        if (uid)
            return;
        const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
        return () => unsub();
    }, [uid]);
    // Submit helper:
    // Validates minimum amount: $0.50
    // POSTs to /payments/withdraw with { uid, amount_cents, currency }
    // Shows success or error
    async function onSubmit(e) {
        e.preventDefault();
        setError('');
        setOk('');
        // Must be signed in to withdraw
        if (!uid) {
            setError('Please sign in to withdraw.');
            return;
        }
        // 1) Parse typed major units
        const typedMajor = Number(amount);
        if (!isFinite(typedMajor) || typedMajor <= 0) {
            setError('Enter a valid amount greater than 0');
            return;
        }
        // 2) Convert typed amount to NZD major using the SAME UI rates
        const nzdMajor = convert(typedMajor, code, 'NZD');
        // 3) Round to NZD cents
        const nzdCents = Math.round(nzdMajor * 100);
        // 4) Enforce backend minimum: 50 NZD cents
        if (nzdCents < 50) {
            const minActive = convert(0.5, 'NZD', code);
            setError(`Minimum withdrawal is ${format(minActive)}`);
            return;
        }
        try {
            setSubmitting(true);
            // Call backend, currency is normalized to lowercase
            const res = await fetch(`${API_URL}/payments/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid,
                    amount_cents: nzdCents,
                    currency: 'nzd',
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok)
                throw new Error(data.detail || `Request failed (${res.status})`);
            // Success: show message and clear amount
            setOk('Withdrawal completed.');
            setAmount('');
        }
        catch (err) {
            // Failed: show message
            setError(err.message || 'Withdrawal failed.');
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsxs("div", { children: [_jsx("br", {}), _jsxs("form", { className: 'WithdrawForm', onSubmit: onSubmit, children: [_jsxs("label", { children: ["Amount (", code, "):"] }), _jsx("input", { type: 'number', inputMode: 'decimal', min: '0', step: '0.01', placeholder: 'Enter amount', value: amount, onChange: (e) => setAmount(e.target.value), disabled: submitting }), _jsx("button", { type: 'submit', disabled: submitting || !uid, children: submitting ? 'Processing…' : 'Submit' }), !uid && _jsx("p", { className: 'FormHint', children: "You must be signed in to withdraw." }), error && _jsx("p", { className: 'FormError', children: error }), ok && _jsx("p", { className: 'FormOk', children: ok })] })] }));
}
