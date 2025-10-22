/**
 * Join an existing game lobby (works for Blackjack or Poker)
 */
export declare function joinGameLobby(gameId: string, uid: string, displayName?: string): Promise<void>;
/**
 * Create a new game lobby.
 * @param hostUid The UID of the host
 * @param gameType "blackjack" | "poker"
 * @param minPlayers Minimum number of players to start
 * @param maxPlayers Maximum number of players allowed
 */
export declare function createGameLobby(hostUid: string, gameType?: "blackjack" | "poker", minPlayers?: number, maxPlayers?: number): Promise<string>;
/**
 * Delete a game lobby and its players.
 */
export declare function deleteGameLobby(gameId: string): Promise<void>;
/**
 * Update the overall game state.
 */
export declare function updateGameState(gameId: string, newState: string): Promise<void>;
/**
 * Set whose turn it is.
 */
export declare function setNextTurn(gameId: string, nextPlayerUid: string): Promise<void>;
/**
 * Update a player's data.
 */
export declare function updatePlayerData(gameId: string, uid: string, updates: Partial<{
    cards: string[];
    bet: number;
    status: string;
    chips: number;
}>): Promise<void>;
/**
 * Special poker update: Update the pot or community cards.
 */
export declare function updatePokerRound(gameId: string, updates: Partial<{
    communityCards: string[];
    pot: number;
    currentBet: number;
    round: "preflop" | "flop" | "turn" | "river" | "showdown";
}>): Promise<void>;
