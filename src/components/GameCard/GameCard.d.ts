import "./GameCard.css";
interface GameCardProps {
    Text: string;
    Image: string;
    LinkTo?: string;
}
export default function GameCard({ Text, Image, LinkTo }: GameCardProps): import("react/jsx-runtime").JSX.Element;
export {};
