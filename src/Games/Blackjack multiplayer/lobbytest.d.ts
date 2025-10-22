declare function createDeck(): {
    rank: string;
    suit: string;
}[];
declare function calculateHandValue(cards: {
    rank: string;
    suit: string;
}[]): number;
export default function LobbyTest(): import("react/jsx-runtime").JSX.Element;
export { calculateHandValue, createDeck };
