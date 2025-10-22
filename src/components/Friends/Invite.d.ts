export type Invite = {
    id?: string;
    senderId: string;
    senderName?: string;
    recipientId: string;
    sessionId?: string;
    game?: 'blackjack' | 'poker';
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    createdAt: any;
    hostAck?: boolean;
};
export declare function sendInvite({ senderId, senderName, recipientId, sessionId, game, }: Omit<Invite, 'status' | 'createdAt'>): Promise<import("@firebase/firestore").DocumentReference<import("@firebase/firestore").DocumentData, import("@firebase/firestore").DocumentData>>;
export declare function listenIncomingInvites(currentUid: string, cb: (invites: Invite[]) => void): import("@firebase/firestore").Unsubscribe;
export declare function acceptInvite(inviteId: string): Promise<void>;
export declare function declineInvite(inviteId: string): Promise<void>;
