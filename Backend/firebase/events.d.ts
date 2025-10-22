export type NewEventInput = {
    EventHook: string;
    EventTitle: string;
    EventDescription: string;
    EventImage?: string | null;
    EventLink: string;
};
export declare function submitSpecialEvent(input: NewEventInput): Promise<void>;
export declare function listenApprovedEvents(cb: (docs: any[]) => void): import("@firebase/firestore").Unsubscribe;
export declare function approveEvent(id: string): Promise<void>;
export declare function rejectEvent(id: string): Promise<void>;
