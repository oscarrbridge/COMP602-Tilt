import React, { useState, useRef, useEffect } from "react";
import { useCurrency } from "../../components/CurrencySwitcher/currencyswitcher";
import "./BetControls.css";

type BetControlsProps = {
  balance: number; // balance in cents
  bet: number; // bet in dollars
  setBet: React.Dispatch<React.SetStateAction<number>>;
  startGame: (betInBase: number) => void; // bet in base currency (cents)
  disabled?: boolean;
};

export default function BetControls({
  balance,
  bet,
  setBet,
  startGame,
  disabled = false,
}: BetControlsProps) {
  const { convertFromBase, convert, code, base } = useCurrency();
  const [isDisabled, setIsDisabled] = useState(false);

  const balanceInCurrency = convertFromBase(balance / 100);
  const minBet = 1;

  const leftRef = useRef<HTMLDivElement>(null);
  const [leftHeight, setLeftHeight] = useState<number | undefined>(undefined);

  // Dynamically set big button height to match left section
  useEffect(() => {
    if (leftRef.current) {
      setLeftHeight(leftRef.current.offsetHeight);
    }
  }, [bet, isDisabled]);

  const handleStart = () => {
    if (bet < minBet || bet > balanceInCurrency || isDisabled || disabled)
      return;

    setIsDisabled(true);
    setTimeout(() => setIsDisabled(false), 2000);

    const betInCents = bet * 100;
    const betInBase = Math.round(convert(betInCents / 100, code, base) * 100);
    startGame(betInBase);
  };

  const handleIncrease = () =>
    setBet((prev) => Math.min(prev + 1, balanceInCurrency));
  const handleDecrease = () => setBet((prev) => Math.max(prev - 1, minBet));

  const handleMin = () => setBet(minBet);
  const handleHalf = () =>
    setBet(Math.max(minBet, Math.round((bet / 2) * 100) / 100));
  const handleDouble = () => setBet(Math.min(balanceInCurrency, bet * 2));
  const handleMax = () => setBet(balanceInCurrency);

  const inputDisabled = isDisabled || disabled;

  return (
    <div className="bet-controls-container">
      <div className="bet-controls-main-row">
        {/* Left section with two rows */}
        <div className="bet-controls-left" ref={leftRef}>
          {/* Top Row */}
          <div className="bet-controls-top-row">
            <span className="bet-controls-label">Bet Amount (${code}):</span>
            <input
              type="number"
              step="0.01" // Allow decimal values with 2 decimal places
              min={minBet}
              max={balanceInCurrency}
              value={bet.toFixed(2)} // Convert to string with 2 decimal places
              disabled={inputDisabled}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                  setBet(Math.min(Math.max(value, minBet), balanceInCurrency));
                } else if (e.target.value === "") {
                  // Allow empty input
                  setBet(minBet);
                }
              }}
              className={`bet-controls-input ${inputDisabled ? "disabled" : ""}`}
            />
            <div className="button-group dial-group">
              <button onClick={handleDecrease} disabled={inputDisabled}>
                ▼
              </button>
              <button onClick={handleIncrease} disabled={inputDisabled}>
                ▲
              </button>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="bet-controls-bottom-row">
            <div className="button-group modifier-group">
              <button onClick={handleMin} disabled={inputDisabled}>
                Min
              </button>
              <button onClick={handleHalf} disabled={inputDisabled}>
                Half
              </button>
              <button onClick={handleDouble} disabled={inputDisabled}>
                Double
              </button>
              <button onClick={handleMax} disabled={inputDisabled}>
                Max
              </button>
            </div>
          </div>
        </div>

        {/* Big Bet button on the right */}
        <button
          onClick={handleStart}
          disabled={inputDisabled || bet < minBet || bet > balanceInCurrency}
          className={`big-bet-controls-button ${inputDisabled ? "disabled" : ""}`}
          style={{ height: leftHeight }}
        >
          {inputDisabled ? "Processing..." : `Bet`}
        </button>
      </div>
    </div>
  );
}
