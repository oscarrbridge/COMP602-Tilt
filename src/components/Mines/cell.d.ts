import type { Cell as CellType } from "../../services/game";
type Props = {
    Cell: CellType;
    GameOver: boolean;
    OnClick: () => void;
};
export default function CellView({ Cell, GameOver, OnClick }: Props): import("react/jsx-runtime").JSX.Element;
export {};
