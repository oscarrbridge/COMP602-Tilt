import './Friends.css';
/**
 * FriendRequests.tsx
 *
 * Purpose:
 * - Display incoming friend requests (accept flow).
 * - Provide a simple search to add new friends by email or username.
 *
 * Key Ideas:
 * - Keeps UI responsive with simple feedback messages and small loading states.
 * - Excludes self/private users in search results.
 * - Uses Firestore exact match queries (email/username).
 */
type FriendRequestsProps = {
    pendingRequests: {
        id: string;
        senderId: string;
        senderUsername?: string;
        senderEmail?: string;
    }[];
    acceptFriendRequest: (id: string) => Promise<void> | void;
    sendFriendRequest: (uid: string) => Promise<void> | void;
};
export declare function FriendRequests({ pendingRequests, acceptFriendRequest, sendFriendRequest, }: FriendRequestsProps): import("react/jsx-runtime").JSX.Element;
export default function Friends(): import("react/jsx-runtime").JSX.Element;
export {};
