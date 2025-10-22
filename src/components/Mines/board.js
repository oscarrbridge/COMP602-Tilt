import { jsx as _jsx } from "react/jsx-runtime";
import CellView from "./cell";
// runs the entier board grid UI
export default function Board({ Size, Cells, GameOver, OnCellClick }) {
    return (_jsx("div", { className: "board", 
        // was: repeat(${size}, 56px)
        style: { gridTemplateColumns: `repeat(${Size}, var(--cell-size))` }, children: Cells.map((c, i) => (_jsx(CellView, { Cell: c, GameOver: GameOver, OnClick: () => OnCellClick(i) }, i))) }));
}
