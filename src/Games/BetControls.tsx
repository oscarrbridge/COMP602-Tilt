import React, { useState } from "react";
import { useCurrency } from "../components/CurrencySwitcher/currencyswitcher";

type BetControlsProps = {
  balance: number; // balance in cents
  bet: number; // bet in dollars
  setBet: React.Dispatch<React.SetStateAction<number>>;
  startGame: (betInBase: number) => void; // bet in base currency (cents)
  disabled?: boolean; // 🔹 disable while game is in progress
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
  const minBet = 1; // $1 minimum bet

  const handleStart = () => {
    if (bet < minBet || bet > balanceInCurrency || isDisabled || disabled)
      return;

    // Disable button for 2 seconds after click
    setIsDisabled(true);
    setTimeout(() => setIsDisabled(false), 2000);

    const betInCents = bet * 100;
    const betInBase = Math.round(convert(betInCents / 100, code, base) * 100);
    startGame(betInBase);
  };

  const inputDisabled = isDisabled || disabled;

  return (
    <div>
      <label htmlFor="bet-input">Bet Amount:</label>
      <input
        id="bet-input"
        type="number"
        min={minBet}
        max={balanceInCurrency}
        value={bet}
        disabled={inputDisabled} // 🔹 disable input while game is running or processing
        onChange={(e) => {
          const value = Number(e.target.value);
          if (!isNaN(value)) {
            setBet(Math.min(Math.max(value, minBet), balanceInCurrency));
          }
        }}
        style={{
          marginLeft: "8px",
          padding: "5px 10px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          backgroundColor: inputDisabled ? "#f3f3f3" : "white",
          color: inputDisabled ? "#888" : "black",
        }}
      />

      <button
        onClick={handleStart}
        disabled={inputDisabled || bet < minBet || bet > balanceInCurrency}
        style={{
          marginLeft: "10px",
          padding: "6px 14px",
          fontWeight: "bold",
          borderRadius: "6px",
          border: "none",
          backgroundColor: "#b38619",
          color: "white",
          cursor: inputDisabled ? "not-allowed" : "pointer",
          opacity: inputDisabled ? 0.7 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        {inputDisabled ? "Processing..." : "Bet"}
      </button>
    </div>
  );
}
