import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
// Currency Types
export type CurrencyCode = "NZD" | "AUD" | "USD" | "EUR" | "GBP";
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

// Default exchange rates relative to NZD
const defaultBase: CurrencyCode = "NZD";
const defaultRates: RateTable = {
  NZD: 1,
  AUD: 0.9,
  USD: 0.59,
  EUR: 0.5,
  GBP: 0.44,
};

// Symbols
const currencySymbols: Record<CurrencyCode, string> = {
  NZD: "NZ$",
  AUD: "A$",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

// Currency
const CurrencyContext = createContext<CurrencyContextValue | null>(null);

interface CurrencyProviderProps {
  children: React.ReactNode;
  rates?: Partial<Record<CurrencyCode, number>>;
  base?: CurrencyCode;
  DefaultCurrency?: CurrencyCode;
  storageKey?: string | null;
}

// Provider Component
export function CurrencyProvider({
  children,
  rates,
  base = defaultBase,
  DefaultCurrency = base,
  storageKey = "currency.code",
}: CurrencyProviderProps) {
  // Merge custom rates with defaults using useMemo
  const mergedRates: RateTable = useMemo(
    () => ({ ...defaultRates, ...(rates || {}) }),
    [rates]
  );
  // Current active currency
  const [code, setCode] = useState<CurrencyCode>(() => {
    if (storageKey) {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      if (saved && isCurrencyCode(saved)) return saved;
    }
    return DefaultCurrency;
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, code);
    } catch {}
  }, [code, storageKey]);

  const value: CurrencyContextValue = useMemo(() => {
    const convert = (amount: number, from: CurrencyCode, to: CurrencyCode = code) => {
      if (from === to) return amount;
      if (from === base) return amount * mergedRates[to];
      if (to === base) return amount / mergedRates[from];
      return (amount / mergedRates[from]) * mergedRates[to];
    };

    const convertFromBase = (amountInBase: number) => convert(amountInBase, base, code);

    const format = (amountInActive: number, opts?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
        currencyDisplay: "symbol",
        maximumFractionDigits: 2,
        ...opts,
      }).format(amountInActive);

    return { code, setCode, rates: mergedRates, base, convertFromBase, convert, format };
  }, [code, mergedRates, base]);
  // set children currency
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

// Hook
export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within a CurrencyProvider");
  return ctx;
}

// UI
interface CurrencySwitcherProps {
  list?: CurrencyCode[];
  className?: string;
  compact?: boolean;
}

export function CurrencySwitcher({
  list = ["NZD", "AUD", "USD", "EUR", "GBP"],
  className,
  compact,
}: CurrencySwitcherProps) {
  const { code, setCode } = useCurrency();
  return (
    <label className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <span style={{ color: "white" }} className="text-sm">Currency</span>
      <select
        value={code}
        onChange={(e) => setCode(e.target.value as CurrencyCode)}
        className="rounded-2xl border px-3 py-2 text-sm shadow-sm hover:shadow transition bg-white dark:bg-zinc-900"
      >
        {list.map((c) => (
          <option key={c} value={c}>
            {compact ? c : `${c} (${currencySymbols[c]})`}
          </option>
        ))}
      </select>
    </label>
  );
}

// Display
interface PriceProps {
  amount: number;
  from?: CurrencyCode;
  formatOptions?: Intl.NumberFormatOptions;
  className?: string;
}

export function Price({ amount, from, formatOptions, className }: PriceProps) {
  const { code, base, convert, format } = useCurrency();
  const activeAmount = useMemo(
    () => convert(amount, from ?? base, code),
    [amount, from, base, code, convert]
  );
  return <span className={className}>{format(activeAmount, formatOptions)}</span>;
}

function isCurrencyCode(x: string): x is CurrencyCode {
  return ["NZD", "AUD", "USD", "EUR", "GBP"].includes(x as CurrencyCode);
}