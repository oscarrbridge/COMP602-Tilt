import CellView from "./cell";
import type { Cell as CellType } from "../../services/game";

type Items = {
  size: number;
  cells: CellType[];
  gameOver: boolean;
  onCellClick: (index: number) => void;
};


// runs the entier board grid UI
export default function Board({ size, cells, gameOver, onCellClick }: Items) {
  return (
    <div
      className="board"
      // was: repeat(${size}, 56px)
      style={{ gridTemplateColumns: `repeat(${size}, var(--cell-size))` }}
    >
      {cells.map((c, i) => (
        <CellView
          key={i}
          Cell={c}
          GameOver={gameOver}
          OnClick={() => onCellClick(i)}
        />
      ))}
    </div>
  );
}