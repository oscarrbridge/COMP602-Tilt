// test/setup.ts
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => cleanup());
// --- Mock firebase/app ---
vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(() => ({ _mock: 'app' })),
    getApps: vi.fn(() => [{ _mock: 'app' }]), // pretend already initialized
    getApp: vi.fn(() => ({ _mock: 'app' })),
}));
// --- Mock firebase/auth ---
vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({ _mock: 'auth' })),
    GoogleAuthProvider: vi.fn(function GoogleAuthProvider() {
        return { _mock: 'google' };
    }),
    connectAuthEmulator: vi.fn(),
}));
vi.mock('firebase/firestore', () => {
    const noop = vi.fn();
    return {
        getFirestore: vi.fn(() => ({ _mock: 'db' })),
        setLogLevel: vi.fn(),
        connectFirestoreEmulator: vi.fn(),
        doc: vi.fn(),
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        onSnapshot: vi.fn(),
        getDoc: vi.fn(async () => ({ exists: () => false, data: () => ({}) })),
        getDocs: vi.fn(async () => ({ docs: [] })),
        setDoc: vi.fn(noop),
        addDoc: vi.fn(noop),
        updateDoc: vi.fn(noop),
        deleteDoc: vi.fn(noop),
        writeBatch: vi.fn(() => ({ set: noop, update: noop, delete: noop, commit: noop })),
        runTransaction: vi.fn(async (_db, fn) => fn({ get: noop, set: noop, update: noop, delete: noop })),
        serverTimestamp: vi.fn(() => new Date()),
    };
});
