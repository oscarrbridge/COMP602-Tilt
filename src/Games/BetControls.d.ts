import React from 'react';
type BetControlsProps = {
    balance: number;
    bet: number;
    setBet: React.Dispatch<React.SetStateAction<number>>;
    startGame: (betInBase: number) => void;
};
export default function BetControls({ balance, bet, setBet, startGame }: BetControlsProps): import("react/jsx-runtime").JSX.Element;
export {};
