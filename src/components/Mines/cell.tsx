import {Cell} from "../../services/game";


// Defining items that CellView component recieves
type Items = {
    Cell: Cell; // Single cell data
    GameOver: boolean; // Gameover function, win, loss or cash out
    OnClick: () => void; // Clicking cell function
}

// Represents one cell on the square mines board
export default function CellView({ Cell, GameOver, OnClick }: Items) {
    const content = Cell.Revealed
    ? Cell.IsMine
        ? "Mine"
        : "Diamond"
    : GameOver && Cell.IsMine
    ? "Mine"
    : "";

return (
    <button
      className={`cell ${Cell.Revealed ? "revealed" : ""} ${Cell.Revealed && Cell.IsMine ? "mine" : ""}`}
      onClick={OnClick}
      disabled={Cell.Revealed|| GameOver} 
    >
      {content}
    </button>
  );
}

