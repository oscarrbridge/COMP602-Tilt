import "./GameCard.css";
import { Link } from "react-router-dom";

// Props for GameCard component
interface GameCardProps {
  Text: string;
  Image: string;
  LinkTo?: string; // optional route to make card clickable
}

export default function SearchGameCard({ Text, Image, LinkTo }: GameCardProps) {
  const CardContent = (
    <div className="SearchGameCardImage">
      <img src={Image} alt={Text + " icon"} className="SearchGameCardIcon" />
      <div className="SearchGameCardText">
        <h3>{Text}</h3>
      </div>
    </div>
  );

  return LinkTo ? <Link to={LinkTo}>{CardContent}</Link> : CardContent;
}
