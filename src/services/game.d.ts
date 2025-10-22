export type Cell = {
    Index: number;
    IsMine: boolean;
    Revealed: boolean;
};
export declare function BoardCreate(size: number, MineCount: number): Cell[];
export declare function multiplier(total: number, mines: number, SafeRevealed: number): number;
export declare function NextClick(total: number, mines: number, SafeRevealed: number): number;
