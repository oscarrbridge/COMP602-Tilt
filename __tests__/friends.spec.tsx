// This demonstrates TDD for the "Friends" user story.
// It covers:
//  - Hook flow (useFriends): send -> receive -> accept -> list -> remove
//  - UI checks for <FriendRequests/> (empty state + accept click)
// We will mock Firebase to keep tests fast and deterministic, and we will record batch
// operations instead of relying on external side effects.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, renderHook, act, waitFor } from '@testing-library/react';

// Hoisted fixtures so vi.mock() factories can reference them.
const H = vi.hoisted(() => {
  type SnapshotDoc = { id: string; data: () => any };

  // Store onSnapshot callbacks by collection path
  const callbacks: Record<
    string,
    (snap: { docs: SnapshotDoc[]; forEach: (cb: (d: SnapshotDoc) => void) => void }) => void
  > = {};

  // Minimal user directory so getDoc() can hydrate display info
  const userStore: Record<string, { username?: string; email?: string }> = {
    S1: { username: 'alice', email: 'a@a.a' },
    U2: { username: 'bob', email: 'b@b.b' },
  };

  // Helpers to fabricate Firestore refs
  const makeCol = (path: string) => ({ __type: 'col', path });
  const makeDoc = (path: string) => ({ __type: 'doc', path });

  // Spies and batch recorder
  const setDocSpy = vi.fn(async () => {});
  const batchOps: Array<{ op: 'set' | 'del'; path: string; data?: any }> = [];
  const writeBatchSpy = vi.fn(() => ({
    set: (ref: any, data: any) => batchOps.push({ op: 'set', path: ref.path, data }),
    delete: (ref: any) => batchOps.push({ op: 'del', path: ref.path }),
    commit: vi.fn(async () => {}),
  }));

  // Build a QuerySnapshot-like object
  const makeSnap = (docs: SnapshotDoc[]) => ({
    docs,
    forEach: (cb: (d: SnapshotDoc) => void) => docs.forEach(cb),
  });

  // Fire a stored listener
  const fire = (key: string, docs: SnapshotDoc[]) => callbacks[key]?.(makeSnap(docs));

  return {
    callbacks,
    userStore,
    makeCol,
    makeDoc,
    setDocSpy,
    batchOps,
    writeBatchSpy,
    makeSnap,
    fire,
  };
});

// Base mocks (must be defined before importing the module under test)
vi.mock('@backend/firebase/UserFunctions', () => ({
  useUser: () => ({ user: { uid: 'TEST_UID' }, loading: false }),
}));

vi.mock('@backend/firebase/firebaseConfig', () => ({ db: {} as any }));

vi.mock('@components/NavBar/NavBar', () => ({ default: () => <div /> }));
vi.mock('@components/Footer/Footer', () => ({ default: () => <div /> }));

// <Price/> just needs to render; currency math is out of scope here
vi.mock('@components/CurrencySwitcher/currencyswitcher', () => ({
  Price: ({ amount }: { amount: number }) => <span data-testid='price'>{amount}</span>,
}));

// Firestore surface the code uses
vi.mock('firebase/firestore', () => {
  const collection = (_db: any, ...segs: string[]) => H.makeCol(segs.join('/'));
  const doc = (_db: any, ...segs: string[]) => H.makeDoc(segs.join('/'));
  const where = (f: string, op: any, v: any) => ({ f, op, v });
  const query = (colRef: any, ...wheres: any[]) => ({ basePath: colRef.path, wheres });

  const onSnapshot = (target: any, cb: any) => {
    const key = target.path ?? target.basePath;
    H.callbacks[key] = cb;
    return () => {};
  };

  const serverTimestamp = () => new Date();

  const getDoc = async (docRef: any) => {
    const id = String(docRef.path).split('/')[1];
    const data = H.userStore[id];
    return { exists: () => Boolean(data), data: () => data ?? {}, id };
  };

  // Sufficient for search paths referenced by UI
  const getDocs = async () => ({
    docs: [] as Array<{ id: string; data: () => any }>,
    forEach: () => {},
  });

  return {
    collection,
    doc,
    where,
    query,
    onSnapshot,
    getDoc,
    getDocs,
    setDoc: H.setDocSpy,
    writeBatch: H.writeBatchSpy,
    serverTimestamp,
  };
});

// Import after mocks so the page sees mocked Firebase
import { FriendRequests, useFriends } from '../src/pages/Friends/Friends';

// Hook flow: send -> receive -> accept -> list -> remove
describe('useFriends (end-to-end flow)', () => {
  it('send → receive → accept → list → remove', async () => {
    const { result } = renderHook(() => useFriends());

    expect(result.current.friends).toEqual([]);
    expect(result.current.pendingRequests).toEqual([]);

    // send
    await act(async () => result.current.sendFriendRequest('R1'));
    expect(H.setDocSpy).toHaveBeenCalled();
    const [sentRef, payload] = H.setDocSpy.mock.calls[0];
    expect(sentRef.path).toBe('friendRequests/TEST_UID_R1');
    expect(payload).toMatchObject({ senderId: 'TEST_UID', recipientId: 'R1', status: 'pending' });

    // receive (listener)
    act(() => {
      H.fire('friendRequests', [
        {
          id: 'S1_TEST_UID',
          data: () => ({ senderId: 'S1', recipientId: 'TEST_UID', status: 'pending' }),
        },
      ]);
    });
    await waitFor(() => expect(result.current.pendingRequests[0]?.senderUsername).toBe('alice'));

    // accept (batch writes both sides + deletes request)
    H.batchOps.length = 0;
    await act(async () => result.current.acceptFriendRequest('S1'));
    expect(H.batchOps.some((o) => o.op === 'set' && o.path === 'users/TEST_UID/friends/S1')).toBe(
      true
    );
    expect(H.batchOps.some((o) => o.op === 'set' && o.path === 'users/S1/friends/TEST_UID')).toBe(
      true
    );
    expect(H.batchOps.some((o) => o.op === 'del' && o.path === 'friendRequests/S1_TEST_UID')).toBe(
      true
    );

    // list (friend appears; details appended via getDoc -> "alice")
    act(() => {
      H.fire('users/TEST_UID/friends', [{ id: 'S1', data: () => ({ status: 'accepted' }) }]);
    });
    await waitFor(() => {
      const f = result.current.friends.find((x) => x.uid === 'S1');
      expect(f?.username).toBe('alice');
    });

    // remove (symmetric deletes)
    H.batchOps.length = 0;
    await act(async () => result.current.removeFriend('S1'));
    expect(H.batchOps.some((o) => o.op === 'del' && o.path === 'users/TEST_UID/friends/S1')).toBe(
      true
    );
    expect(H.batchOps.some((o) => o.op === 'del' && o.path === 'users/S1/friends/TEST_UID')).toBe(
      true
    );
  });
});

// UI: empty state + accept click
describe('<FriendRequests/>', () => {
  it('shows empty state', () => {
    render(
      <FriendRequests
        pendingRequests={[]}
        acceptFriendRequest={vi.fn()}
        sendFriendRequest={vi.fn()}
      />
    );
    expect(screen.getByText(/No pending friend requests/i)).toBeInTheDocument();
  });

  it('calls accept handler with sender id', async () => {
    const accept = vi.fn().mockResolvedValue(undefined);
    render(
      <FriendRequests
        pendingRequests={[
          { id: 'r1', senderId: 'U1', senderUsername: 'alice', senderEmail: 'a@a.a' },
        ]}
        acceptFriendRequest={accept}
        sendFriendRequest={vi.fn()}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByText(/Accept/i));
    });
    expect(accept).toHaveBeenCalledWith('U1');
  });
});
