// Import cell view component which renders the single cells.
import CellView from "./cell";
import type {Cell as CellType} from "../../services/game";

// Define the Item props that the board will use
type Items = { 
    size: number; // Size of grid
    cells: CellType[]; // Array
    gameOver: boolean; // Game ended function
    onCellClick: (index: number) => void; 
};

// Renders the entire Mines Game Board creation
export default function Board({size, cells, gameOver, onCellClick }: Items) {
    return (
        <div
            className="board"
            style={{gridTemplateColumns:'repeat(&{Size}, 56px)'}}
        >
            {cells.map((Cell, i) => (
                <CellView
                    key={i}
                    Cell={Cell}
                    GameOver={gameOver}
                    OnClick={() => onCellClick(i)}
                    />     
            
            ))}

        </div>
    );
}