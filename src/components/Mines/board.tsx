import CellView from "./cell";
import type { Cell as CellType } from "../../services/game";

type Items = {
  Size: number;
  Cells: CellType[];
  GameOver: boolean;
  OnCellClick: (index: number) => void;
};


// runs the entier board grid UI
export default function Board({ Size, Cells, GameOver, OnCellClick }: Items) {
  return (
    <div
      className="board"
      // was: repeat(${size}, 56px)
      style={{ gridTemplateColumns: `repeat(${Size}, var(--cell-size))` }}
    >
      {Cells.map((c, i) => (
        <CellView
          key={i}
          Cell={c}
          GameOver={GameOver}
          OnClick={() => OnCellClick(i)}
        />
      ))}
    </div>
  );
}