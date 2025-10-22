export interface EventBet {
    id?: string;
    eventId: string;
    userId: string;
    amount: number;
    prediction: 'yes' | 'no';
    placedAt: any;
    status: 'pending' | 'won' | 'lost';
    payout?: number;
}
/**
 * Place a bet on a special event
 */
export declare function placeEventBet(eventId: string, amount: number, prediction: 'yes' | 'no'): Promise<void>;
/**
 * Get all bets for a specific event
 */
export declare function getEventBets(eventId: string): Promise<EventBet[]>;
/**
 * Get all bets for a specific user
 */
export declare function getUserEventBets(userId: string): Promise<EventBet[]>;
/**
 * Calculate and distribute payouts for an event when it's resolved
 */
export declare function resolveEventBets(eventId: string, outcome: 'happened' | 'did-not-happen'): Promise<void>;
