import React from "react";
import { useCurrency } from "../components/CurrencySwitcher/currencyswitcher";

type BetControlsProps = {
  balance: number;
  bet: number;
  setBet: React.Dispatch<React.SetStateAction<number>>;
  startGame: (betInBase: number) => void;
};

export default function BetControls({ balance, bet, setBet, startGame }: BetControlsProps) {
  const { convertFromBase, convert, code, base } = useCurrency();
  const balanceInCurrency = Math.floor(convertFromBase(balance));
  
  const handleStart = () => {
    const betInBase = convert(bet, code, base); // active currency → NZD
    startGame(betInBase);                       // pass NZD to Blackjack
  };
  return (
    <div>
      <label htmlFor="bet-input">Bet Amount:</label>
      <input
        id="bet-input"
        type="number"
        min={5}
        max={balanceInCurrency}
        value={bet}
        onChange={(e) =>
          setBet(Math.min(Math.max(Number(e.target.value), 5), balanceInCurrency))
        }
      />
      <button onClick={handleStart}>Deal</button>
    </div>
  );
}