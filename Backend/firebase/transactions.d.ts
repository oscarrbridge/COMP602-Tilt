export type transactionType = 'bet' | 'win' | 'loss' | 'deposit' | 'withdraw';
export type balanceType = 'balance' | 'unibalance';
export declare function userTransaction(uid: string, amount: number, type: transactionType, balanceType?: balanceType, optional?: {
    gameId?: string;
    gameType?: string;
    round?: number;
}): Promise<void>;
export declare const recordBet: (uid: string, amt: number, o?: any) => Promise<void>;
export declare const recordWin: (uid: string, amt: number, o?: any) => Promise<void>;
export declare const recordLoss: (uid: string, _amt: number, o?: any) => Promise<void>;
export declare const deposit: (uid: string, amt: number) => Promise<void>;
export declare const withdraw: (uid: string, amt: number) => Promise<void>;
export declare const uniDeposit: (uid: string, amt: number) => Promise<void>;
export declare const uniWithdraw: (uid: string, amt: number) => Promise<void>;
