import type { Cell as CellType } from "../../services/game";
type Items = {
    Size: number;
    Cells: CellType[];
    GameOver: boolean;
    OnCellClick: (index: number) => void;
};
export default function Board({ Size, Cells, GameOver, OnCellClick }: Items): import("react/jsx-runtime").JSX.Element;
export {};
