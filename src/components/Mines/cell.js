import { jsx as _jsx } from "react/jsx-runtime";
export default function CellView({ Cell, GameOver, OnClick }) {
    // show Diamond when safe+revealed, Mine when revealed mine
    // after GameOver, show all mines
    const content = Cell.Revealed
        ? (Cell.IsMine ? "💣" : "💎")
        : (GameOver && Cell.IsMine ? "💣" : "");
    return (_jsx("button", { className: `cell ${Cell.Revealed ? "revealed" : ""} ${Cell.Revealed && Cell.IsMine ? "mine" : ""}`, onClick: OnClick, disabled: Cell.Revealed || GameOver, "aria-label": Cell.Revealed ? (Cell.IsMine ? "Mine" : "Safe") : "Hidden", children: content }));
}
