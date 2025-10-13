import { Link } from "react-router-dom";
import "./PanelMenu.css";

export default function PanelMenu() {
  return (
    <div className="panel-menu">
      <div className="panel-header">
        <h2>Menu</h2>
      </div>

      <div className="panel-content">
        <ul>
          <li>
            <Link to="/">🏠 Home</Link>
          </li>
          <li>
            <Link to="/slots">🎰 Slots</Link>
          </li>
          <li>
            <Link to="/blackjack">🃏 Blackjack</Link>
          </li>
          <li>
            <Link to="/mines">💥 Mines</Link>
          </li>
          <li>
            <Link to="/cointoss">🪙 Coin Toss</Link>
          </li>
          <li>
            <Link to="/roulette">🛞 Roulette</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
