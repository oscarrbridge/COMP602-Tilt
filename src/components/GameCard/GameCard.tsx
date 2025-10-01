import "./GameCard.css";
import { Link } from "react-router-dom";

// Props for GameCard component
interface GameCardProps {
  Text: string;
  Image: string;
  LinkTo?: string; // optional route to make card clickable
}

// Show card with image and text, optionally wrapped in a Link
export default function GameCard({ Text, Image, LinkTo }: GameCardProps) {
  const CardContent = (
    <div className="GameCardImage" style={{ backgroundImage: `url(${Image})` }}>
      <div className="GameCardText">
        <h3>{Text}</h3>
      </div>
    </div>
  );

  // If LinkTo is provided, wrap in Link, else just render the card
  return LinkTo ? <Link to={LinkTo}>{CardContent}</Link> : CardContent;
}
