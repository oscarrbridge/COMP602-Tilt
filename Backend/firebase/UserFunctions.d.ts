import { type User } from 'firebase/auth';
interface UserProfile {
    roles: string[];
    balance: number;
    email: string;
    autoPayEnabled?: boolean;
    autoPayAmountCents?: number;
}
export declare function useUser(): {
    user: User | null;
    balance: number;
    userProfile: UserProfile | null;
    refreshBalance: () => Promise<void>;
    loading: boolean;
};
export {};
