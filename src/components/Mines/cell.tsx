import type { Cell as CellType } from "../../services/game";

type Props = {
  Cell: CellType;          // a single tile
  GameOver: boolean;       // true if lost/cashed
  OnClick: () => void;     // click handler
};

export default function CellView({ Cell, GameOver, OnClick }: Props) {
  // show Diamond when safe+revealed, Mine when revealed mine
  // after GameOver, show all mines
  const content = Cell.Revealed
    ? (Cell.IsMine ? "Mines" : "Diamonds")
    : (GameOver && Cell.IsMine ? "Mines" : "");

  return (
    <button
      className={`cell ${Cell.Revealed ? "revealed" : ""} ${Cell.Revealed && Cell.IsMine ? "mine" : ""}`}
      onClick={OnClick}
      disabled={Cell.Revealed || GameOver}
      aria-label={Cell.Revealed ? (Cell.IsMine ? "Mine" : "Safe") : "Hidden"}
    >
      {content}
    </button>
  );
}