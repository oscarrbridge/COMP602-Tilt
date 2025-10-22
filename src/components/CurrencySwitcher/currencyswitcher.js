import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import './currencySwitcher.css';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
// Default exchange rates relative to NZD
const defaultBase = 'NZD';
const defaultRates = {
    NZD: 1,
    AUD: 0.9,
    USD: 0.59,
    EUR: 0.5,
    GBP: 0.44,
};
// Symbols
const currencySymbols = {
    NZD: 'NZ$',
    AUD: 'A$',
    USD: '$',
    EUR: '€',
    GBP: '£',
};
// Currency
const CurrencyContext = createContext(null);
// Provider Component
export function CurrencyProvider({ children, rates, base = defaultBase, DefaultCurrency = base, storageKey = 'currency.code', }) {
    const mergedRates = useMemo(() => ({ ...defaultRates, ...(rates || {}) }), [rates]);
    const [code, setCode] = useState(() => {
        if (typeof window !== 'undefined' && storageKey) {
            try {
                const saved = window.localStorage.getItem(storageKey);
                if (saved && isCurrencyCode(saved))
                    return saved;
            }
            catch { }
        }
        return DefaultCurrency;
    });
    useEffect(() => {
        if (!storageKey)
            return;
        try {
            window.localStorage.setItem(storageKey, code);
        }
        catch { }
    }, [code, storageKey]);
    const value = useMemo(() => {
        const convert = (amount, from, to = code) => {
            if (from === to)
                return amount;
            if (from === base)
                return amount * mergedRates[to];
            if (to === base)
                return amount / mergedRates[from];
            return (amount / mergedRates[from]) * mergedRates[to];
        };
        const convertFromBase = (amountInBase) => convert(amountInBase, base, code);
        const format = (amountInActive, opts) => new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: code,
            currencyDisplay: 'symbol',
            maximumFractionDigits: 2,
            ...opts,
        }).format(amountInActive);
        return {
            code,
            setCode,
            rates: mergedRates,
            base,
            convertFromBase,
            convert,
            format,
        };
    }, [code, mergedRates, base]);
    return _jsx(CurrencyContext.Provider, { value: value, children: children });
}
// Hook
export function useCurrency() {
    const ctx = useContext(CurrencyContext);
    if (!ctx)
        throw new Error('useCurrency must be used within a CurrencyProvider');
    return ctx;
}
export function CurrencySwitcher({ list = ['NZD', 'AUD', 'USD', 'EUR', 'GBP'], compact, }) {
    const { code, setCode } = useCurrency();
    return (_jsx("div", { className: 'CurrencySwitcher', children: _jsxs("label", { children: [_jsx("span", { style: { color: 'white' }, children: "Currency" }), _jsx("select", { value: code, onChange: (e) => setCode(e.target.value), children: list.map((c) => (_jsx("option", { value: c, children: compact ? c : `${c} (${currencySymbols[c]})` }, c))) })] }) }));
}
export function Price({ amount, from, formatOptions, className }) {
    const { code, base, convert, format } = useCurrency();
    const activeAmount = useMemo(() => convert(amount, from ?? base, code), [amount, from, base, code, convert]);
    return _jsx("span", { className: className, children: format(activeAmount, formatOptions) });
}
function isCurrencyCode(x) {
    return ['NZD', 'AUD', 'USD', 'EUR', 'GBP'].includes(x);
}
