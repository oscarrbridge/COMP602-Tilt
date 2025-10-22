/**
 * Batch-load user docs by uid using documentId() IN queries.
 * Returns an array of { uid, ...data } objects in no guaranteed order.
 */
export declare function getUsersByIds(uids: string[]): Promise<any[]>;
