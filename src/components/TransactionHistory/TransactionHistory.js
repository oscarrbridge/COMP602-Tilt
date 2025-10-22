import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import './TransactionHistory.css';
import { collection, onSnapshot as update /*, query, orderBy */ } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../Backend/firebase/firebaseConfig';
import { Price, useCurrency } from '../CurrencySwitcher/currencyswitcher';
export default function TransactionHistory() {
    const [uid, setUid] = useState(auth.currentUser?.uid ?? null);
    const [transactions, setTransactions] = useState([]);
    const [range, setRange] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const { code, setCode } = useCurrency();
    // auth → uid
    useEffect(() => {
        if (uid)
            return;
        const detach = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
        return () => detach();
    }, [uid]);
    // keep currency in sync with NavWindow (reads localStorage)
    useEffect(() => {
        const KEY = 'currency.code';
        // Type guard for allowed currency codes
        const isCurrency = (x) => x === 'NZD' || x === 'AUD' || x === 'USD' || x === 'EUR' || x === 'GBP';
        // Initial sync on mount: read current value from localStorage
        const initial = localStorage.getItem(KEY);
        if (isCurrency(initial) && initial !== code)
            setCode(initial);
        // Same-tab change detection:
        // The storage event does not fire in the same tab that wrote the value,
        let last = initial ?? code;
        const id = window.setInterval(() => {
            const cur = localStorage.getItem(KEY);
            if (cur && cur !== last) {
                last = cur;
                if (isCurrency(cur) && cur !== code)
                    setCode(cur);
            }
        }, 250);
        // Also resync when the window regains focus (covers tab switches / minimized)
        const onFocus = () => {
            const cur = localStorage.getItem(KEY);
            if (isCurrency(cur) && cur !== code)
                setCode(cur);
        };
        window.addEventListener('focus', onFocus);
        // Cross-tab sync:
        // The 'storage' event fires in *other* tabs when localStorage changes.
        const onStorage = (e) => {
            if (e.key !== KEY || e.newValue == null)
                return;
            if (isCurrency(e.newValue) && e.newValue !== code)
                setCode(e.newValue);
        };
        window.addEventListener('storage', onStorage);
        // Cleanup, stop polling and remove listeners on unmount
        return () => {
            clearInterval(id);
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('storage', onStorage);
        };
    }, [code, setCode]);
    // Firestore listener (wrap back in an effect)
    useEffect(() => {
        if (!uid) {
            setTransactions([]);
            return;
        }
        // const q = query(collection(db, 'users', uid, 'transactions'), orderBy('timestamp','desc'));
        const transaction = collection(db, 'users', uid, 'transactions');
        const detach = update(transaction, (snap) => {
            const rows = snap.docs
                .map((u) => {
                const data = u.data();
                const type = (data.type ?? '').toString();
                const transactionType = type ? type.charAt(0).toUpperCase() + type.slice(1) : '';
                let when = null;
                const ts = data.timestamp;
                if (ts && typeof ts.toDate === 'function')
                    when = ts.toDate();
                const amountCents = typeof data.amount === 'number' ? Math.abs(data.amount) : 0;
                const balanceAfterCents = typeof data.balanceAfter === 'number' ? data.balanceAfter : 0;
                return {
                    TransactionID: u.id,
                    TransactionType: transactionType,
                    TransactionAmount: amountCents,
                    BalanceAfter: balanceAfterCents,
                    AmountNZDMajor: amountCents / 100,
                    BalanceAfterNZDMajor: balanceAfterCents / 100,
                    When: when,
                    Currency: ((data.currency ?? 'nzd') + '').toUpperCase(),
                    Source: (data.source ?? '') + '',
                };
            })
                .sort((a, b) => {
                const ta = a.When ? a.When.getTime() : 0;
                const tb = b.When ? b.When.getTime() : 0;
                return tb - ta;
            });
            setTransactions(rows);
        });
        return () => detach();
    }, [uid]);
    function rangeStart(kind) {
        if (kind === 'all')
            return null;
        const now = new Date();
        const start = new Date(now);
        if (kind === '7d')
            start.setDate(now.getDate() - 7);
        if (kind === '30d')
            start.setDate(now.getDate() - 30);
        if (kind === '365d')
            start.setDate(now.getDate() - 365);
        return start;
    }
    function matchesType(t, filter) {
        const type = t.TransactionType.toLowerCase();
        if (filter === 'all')
            return true;
        if (filter === 'payments')
            return type === 'deposit' || type === 'withdraw';
        if (filter === 'games')
            return type === 'bet' || type === 'win' || type === 'loss';
        return type === filter;
    }
    const filtered = useMemo(() => {
        const start = rangeStart(range)?.getTime() ?? null;
        return transactions.filter((t) => {
            if (start !== null) {
                const when = t.When?.getTime();
                if (!when || when < start)
                    return false;
            }
            return matchesType(t, typeFilter);
        });
    }, [transactions, range, typeFilter, code]); // keep code so memo refreshes
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: 'TransactionFilters', style: { marginBottom: 12 }, children: [_jsxs("label", { children: ["Date Range:", ' ', _jsxs("select", { value: range, onChange: (e) => setRange(e.target.value), children: [_jsx("option", { value: 'all', children: "All time" }), _jsx("option", { value: '7d', children: "Last 7 days" }), _jsx("option", { value: '30d', children: "Last month" }), _jsx("option", { value: '365d', children: "Last 12 months" })] })] }), _jsxs("label", { style: { marginLeft: 12 }, children: ["Type:", ' ', _jsxs("select", { value: typeFilter, onChange: (e) => setTypeFilter(e.target.value), children: [_jsx("option", { value: 'all', children: "All" }), _jsx("option", { value: 'payments', children: "Payments (Deposit/Withdraw)" }), _jsx("option", { value: 'games', children: "Games (Bet/Win/Loss)" }), _jsx("option", { value: 'deposit', children: "Deposit only" }), _jsx("option", { value: 'withdraw', children: "Withdraw only" }), _jsx("option", { value: 'bet', children: "Bet only" }), _jsx("option", { value: 'win', children: "Win only" }), _jsx("option", { value: 'loss', children: "Loss only" })] })] })] }), _jsx("div", { className: 'TransactionTable', children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Date/Time" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Amount" }), _jsx("th", { children: "Balance After" })] }) }), _jsxs("tbody", { children: [filtered.map((i) => (_jsxs("tr", { children: [_jsx("td", { children: i.When ? i.When.toLocaleString() : '—' }), _jsx("td", { children: i.TransactionType }), _jsx("td", { children: _jsx(Price, { amount: i.AmountNZDMajor, from: 'NZD' }) }), _jsx("td", { children: _jsx(Price, { amount: i.BalanceAfterNZDMajor, from: 'NZD' }) })] }, i.TransactionID))), filtered.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 4, style: { textAlign: 'center', opacity: 0.7 }, children: "No transactions match the current filters." }) }))] }, `${code}-${uid ?? 'nouser'}`)] }) })] }));
}
