import './currencySwitcher.css';
import React from 'react';
export type CurrencyCode = 'NZD' | 'AUD' | 'USD' | 'EUR' | 'GBP';
export type RateTable = Record<CurrencyCode, number>;
export interface CurrencyContextValue {
    code: CurrencyCode;
    setCode: (c: CurrencyCode) => void;
    rates: RateTable;
    base: CurrencyCode;
    convertFromBase: (amountInBase: number) => number;
    convert: (amount: number, from: CurrencyCode, to?: CurrencyCode) => number;
    format: (amountInActive: number, opts?: Intl.NumberFormatOptions) => string;
}
interface CurrencyProviderProps {
    children: React.ReactNode;
    rates?: Partial<Record<CurrencyCode, number>>;
    base?: CurrencyCode;
    DefaultCurrency?: CurrencyCode;
    storageKey?: string | null;
}
export declare function CurrencyProvider({ children, rates, base, DefaultCurrency, storageKey, }: CurrencyProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useCurrency(): CurrencyContextValue;
interface CurrencySwitcherProps {
    list?: CurrencyCode[];
    className?: string;
    compact?: boolean;
}
export declare function CurrencySwitcher({ list, compact, }: CurrencySwitcherProps): import("react/jsx-runtime").JSX.Element;
interface PriceProps {
    amount: number;
    from?: CurrencyCode;
    formatOptions?: Intl.NumberFormatOptions;
    className?: string;
}
export declare function Price({ amount, from, formatOptions, className }: PriceProps): import("react/jsx-runtime").JSX.Element;
export {};
