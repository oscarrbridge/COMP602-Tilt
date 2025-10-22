import { type User } from 'firebase/auth';
export type ProfileExtras = {
    university?: {
        value: string;
        label: string;
    } | null;
    friends?: string[];
};
export declare function registerUser(email: string, password: string, extras?: ProfileExtras): Promise<User>;
export declare function signInUser(email: string, password: string): Promise<User>;
export declare function signInWithGoogle(extras?: ProfileExtras): Promise<User>;
export declare const signOutUser: () => Promise<void>;
