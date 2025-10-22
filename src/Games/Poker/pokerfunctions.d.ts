/**
 * Join an existing poker lobby
 */
export declare function joinPokerLobby(gameId: string, uid: string, displayName?: string): Promise<void>;
/**
 * Create a new poker lobby
 */
export declare function createPokerLobby(hostUid: string, minPlayers?: number, maxPlayers?: number): Promise<string>;
/**
 * Update a poker player's data
 */
export declare function updatePlayerStatus(gameId: string, uid: string, updates: Partial<{
    cards: string[];
    holeCards: string[];
    bet: number;
    status: string;
    chips: number;
    ready: boolean;
}>): Promise<void>;
/**
 * Update poker game state
 */
export declare function updatePokerGame(gameId: string, updates: Partial<{
    communityCards: string[];
    pot: number;
    currentBet: number;
    round: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
    playersOrder: string[];
    dealerPosition: number;
    state: 'waiting' | 'in-progress' | 'finished';
    currentTurn: string;
}>): Promise<void>;
export declare function setNextTurn(gameId: string, nextPlayerUid: string): Promise<void>;
/**
 * Player Action: Call
 */
export declare function playerCall(gameId: string, uid: string): Promise<void>;
/**
 * Player Action: Raise
 */
export declare function playerRaise(gameId: string, uid: string, raiseAmount: number): Promise<void>;
/**
 * Player Action: Check
 */
export declare function playerCheck(gameId: string, uid: string): Promise<void>;
/**
 * Player Action: Fold
 */
export declare function playerFold(gameId: string, uid: string): Promise<void>;
/**
 * Reset round after a hand finishes
 */
export declare function resetRound(gameId: string): Promise<void>;
/**
 * Delete poker lobby
 */
export declare function deletePokerLobby(gameId: string): Promise<void>;
export declare function buildDeck(): string[];
export declare function drawCardsTx(gameId: string, n: number): Promise<string[]>;
export declare function tryStartHand(gameId: string, hostUid: string): Promise<void>;
export declare function dealNextStreet(gameId: string, hostUid: string): Promise<void>;
export declare function setNextTurnSafe(gameId: string, expectedUid: string, nextUid: string | null): Promise<void>;
