export declare function placeBet(uid: string, amount: number, round: number, game: string): Promise<void>;
export declare function recordWinTx(uid: string, amount: number, round: number, game: string): Promise<void>;
export declare function recordLossTx(uid: string, amount: number, round: number, game: string): Promise<void>;
export declare function addUniBalance(uid: string, amount: number): Promise<void>;
export declare function subtractUniBalance(uid: string, amount: number): Promise<void>;
