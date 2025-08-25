// Definitions for one cell on the board
export type Cell = { 
    Index: number; 
    IsMine: boolean; 
    Revealed: boolean
};

// Creates the board game create function with size times size and random mines placed
export function BoardCreate(size: number, MineCount: number): Cell[] {
    const total = size * size; // Number of cells on the board
    const indices = Array.from({ length: total}, (_, i) => i); // Creates array of indices

    // Shuffle algorithm that randomly arranges the indices array
    for (let i = indices.length = 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]]; // swaps indices
    }

    const mines = new Set(indices.slice(0, MineCount)); // Selects mine count and shuffles array as mine position
    
    // Creates and returns board, each cell is assigned, eitehr mine or not and reveales the state
    return Array.from({ length: total}, (_, i) => ({
        Index: i,
        IsMine: mines.has(i),
        Revealed: false,
    }));
}

// Caclulates pay out based on the multipler per safe cells being revealed, lesser safe cells more multiplier
export function multiplier(total: number, mines: number, SafeRevealed: number): number {
    let m = 1; // starting multiplier

    // loops each safe click for the multiplier
    for (let i = 0; i < SafeRevealed; i++) {
        const CellsRemaining = total - i; // Remaining unrevealed cells
        const SafeRemaining = total - mines - i; // Remaining safe cells only
        m *= CellsRemaining / SafeRemaining;
    }
    return Number(m.toFixed(4)); // Rounds multiplier 
}

// Calculates multiplier to show the multipler for next click. 
export function NextClick(total: number, mines: number, SafeRevealed: number): number {
    const CellsRemaining = total - SafeRevealed;
    const SafeRemaining = total - mines - SafeRevealed;
    return Number((CellsRemaining / SafeRemaining).toFixed(4));
}

