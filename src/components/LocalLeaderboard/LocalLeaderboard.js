import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import './LocalLeaderboard.css';
import { collection, onSnapshot as update, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../../Backend/firebase/firebaseConfig';
import { NZ_UNIS } from '../../components/Auth/Universities';
import { Price, useCurrency } from '../CurrencySwitcher/currencyswitcher';
export default function LocalLeaderboard() {
    // List of users state
    const [Users, SetUsers] = useState([]);
    const { code, setCode } = useCurrency(); // ← NEW
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
    useEffect(() => {
        // Reference to collection of users in Firestore
        const usersRef = collection(db, 'users');
        // Build NZ values for 'in' filter (<=10 allowed)
        const nzValues = NZ_UNIS.map((u) => u.value);
        // Filter to NZ; order by balance
        const top50 = query(usersRef, where('university.value', 'in', nzValues), orderBy('netProfit', 'desc'), limit(50));
        // Live updates for users collection
        const detach = update(top50, (snap) => {
            // Map each Firestore document into Users type
            const rows = snap.docs.map((d, idx) => {
                const data = d.data();
                return {
                    // Leaderboard position (+1 for list index)
                    UserID: idx + 1,
                    Name: (data.username ?? data.email ?? 'Unknown').toString(),
                    netProfit: typeof data.netProfit === 'number' ? data.netProfit : 0,
                    University: (data.university?.label ?? data.university?.value ?? 'Unknown').toString(),
                };
            });
            SetUsers(rows);
        });
        return () => detach();
    }, []);
    return (_jsx(_Fragment, { children: _jsx("div", { className: 'LocalLeaderboard', children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Rank" }), _jsx("th", { children: "Name" }), _jsx("th", { children: "University" }), _jsx("th", { children: "Amount won" })] }) }), _jsx("tbody", { children: Users.map((i) => (_jsxs("tr", { children: [_jsx("td", { children: i.UserID }), _jsx("td", { children: i.Name }), _jsx("td", { children: i.University }), _jsx("td", { children: _jsx(Price, { amount: (Number.isFinite(i.netProfit) ? i.netProfit : 0) / 100, from: 'NZD' }) })] }, i.UserID))) }, code)] }) }) }));
}
