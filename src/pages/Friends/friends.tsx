import './Friends.css';
import NavBar from '../../components/NavBar/NavBar.tsx';
import { useFriends } from '../../components/Friends/friends.tsx';
import { useState, useEffect } from 'react';
import { collection, doc, getDocs, query, where, getCountFromServer } from 'firebase/firestore';
import { useUser } from '@backend/firebase/UserFunctions.tsx';
import { db } from '../../../Backend/firebase/firebaseConfig';

import { getDoc } from 'firebase/firestore';
import Footer from '../../components/Footer/Footer';
// import { Price } from '../../components/CurrencySwitcher/currencyswitcher'; // no longer used

// ---------- Types ----------
type UserLite = {
  uid: string;
  username?: string;
  email?: string;
  name?: string;
  private?: boolean;

  // kept for compatibility; we just don't render money anymore
  totalWinsCents?: number;
  totalLossesCents?: number;

  // these power the new UI
  winsCount?: number;
  lossesCount?: number;
};

// ---------- Utils ----------
const SIX_FIGURE_CLAMP_CENTS = 999_999 * 100;
/** clamp cents to 6 figures while preserving sign */
const clampCents6 = (cents: number | undefined) => {
  const n = Math.trunc(cents ?? 0);
  const sign = Math.sign(n) || 1;
  const abs = Math.abs(n);
  const clamped = Math.min(abs, SIX_FIGURE_CLAMP_CENTS);
  return { cents: sign * clamped, clipped: abs > SIX_FIGURE_CLAMP_CENTS };
};
// Count bets/wins from users/{uid}/transactions
async function fetchCounts(uid: string) {
  // All the user's tx live here (see your screenshot)
  const tx = collection(db, 'users', uid, 'transactions');

  // A bet is recorded as type == 'bet'
  const betsQ = query(tx, where('type', '==', 'bet'));

  // Wins are usually recorded as payouts; some codebases use 'win'
  const payoutsQ = query(tx, where('type', '==', 'payout'));
  const winsTypeQ = query(tx, where('type', '==', 'win'));

  // Fallback: if you don't write a 'payout'/'win' type, count positive amounts as wins
  const positiveQ = query(tx, where('amount', '>', 0));

  const [betsSnap, payoutsSnap, winsTypeSnap] = await Promise.all([
    getCountFromServer(betsQ),
    getCountFromServer(payoutsQ),
    getCountFromServer(winsTypeQ),
  ]);

  let winsCount = (payoutsSnap.data().count || 0) + (winsTypeSnap.data().count || 0);

  // If no explicit win docs, fall back to positive amounts
  if (winsCount === 0) {
    const posSnap = await getCountFromServer(positiveQ);
    winsCount = posSnap.data().count || 0;
  }

  const totalBets = betsSnap.data().count || 0;
  const lossesCount = Math.max(totalBets - winsCount, 0);

  return { winsCount, lossesCount, totalBets };
}

// ---------- Friends List ----------
function FriendsList({
  friends,
  removeFriend,
}: {
  friends: UserLite[];
  removeFriend: (uid: string) => void;
}) {
  return (
    <div style={{ padding: '20px' }}>
      {friends.length === 0 ? (
        <p>You don't have any friends yet.</p>
      ) : (
        <>
          <h3>Friends List</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {friends.map((friend) => {
              const name = friend.username || friend.email || friend.uid;

              // counts for the new UI (fallback to 0 if absent)
              const winsCount = friend.winsCount ?? 0;
              const lossesCount = friend.lossesCount ?? 0;
              const totalBets = winsCount + lossesCount;
              const winRate =
                totalBets > 0 ? `${((winsCount / totalBets) * 100).toFixed(1)}%` : '—';

              // keep these in case you still need them elsewhere
              const winsRaw = friend.totalWinsCents ?? 0;
              const lossesRaw = friend.totalLossesCents ?? 0;
              const netRaw = winsRaw - lossesRaw;
              const wins = clampCents6(winsRaw);
              const losses = clampCents6(lossesRaw);
              const net = clampCents6(netRaw);

              return (
                <li
                  key={friend.uid}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 8,
                    alignItems: 'center',
                    marginBottom: 10,
                    padding: '10px 8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                  }}
                >
                  {/* Left: identity + stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>{name}</span>

                    {/* New stats row: bets + win rate (no currency) */}
                    <div style={{ display: 'flex', gap: 16, fontSize: 14, opacity: 0.9 }}>
                      <span>🧮 Bets: {totalBets}</span>
                      <span>✅ Wins: {winsCount}</span>
                      <span>❌ Losses: {lossesCount}</span>
                      <span>📈 Win rate: {winRate}</span>
                    </div>
                  </div>

                  {/* Right: remove */}
                  <button
                    onClick={() => removeFriend(friend.uid)}
                    style={{
                      padding: '4px 8px',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      color: 'red',
                      border: '1px solid red',
                      borderRadius: 6,
                      fontWeight: 700,
                      height: 32,
                    }}
                    aria-label={`Remove ${name}`}
                    title='Remove friend'
                  >
                    X
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

// ---------- Friend Requests (search) ----------
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

export function FriendRequests({
  pendingRequests,
  acceptFriendRequest,
  sendFriendRequest,
}: FriendRequestsProps) {
  const { user } = useUser();
  const currentUid = user?.uid;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserLite[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = setTimeout(() => setFeedbackMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [feedbackMessage]);

  const handleSearch = async () => {
    const term = searchQuery.trim().toLowerCase();
    setHasSearched(true);

    if (!term) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const usersRef = collection(db, 'users');
      const results: UserLite[] = [];

      // email exact match
      const emailSnap = await getDocs(query(usersRef, where('email', '==', term)));
      emailSnap.docs.forEach((doc) => results.push({ uid: doc.id, ...(doc.data() as any) }));

      // username exact match (dedupe)
      const userSnap = await getDocs(query(usersRef, where('username', '==', term)));
      userSnap.docs.forEach((doc) => {
        const u = { uid: doc.id, ...(doc.data() as any) };
        if (!results.some((r) => r.uid === u.uid)) results.push(u);
      });

      // filter out self/private
      setSearchResults(results.filter((u) => u.uid !== currentUid && !u.private));
    } catch (e) {
      console.error('search failed', e);
      setSearchResults([]);
      setFeedbackMessage('Error: Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendClick = async (recipientUid: string, label: string) => {
    try {
      await sendFriendRequest(recipientUid);
      setFeedbackMessage(`Request sent to ${label || 'user'}!`);
      setSearchResults([]);
      setSearchQuery('');
      setHasSearched(false);
    } catch {
      setFeedbackMessage('Error: Failed to send request.');
    }
  };

  const handleAcceptClick = async (senderUid: string, label: string) => {
    try {
      await acceptFriendRequest(senderUid);
      setFeedbackMessage(`${label || 'user'} is now your friend!`);
    } catch {
      setFeedbackMessage('Error: Failed to accept request.');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      {feedbackMessage && (
        <div
          role='status'
          aria-live='polite'
          style={{
            padding: 10,
            backgroundColor: feedbackMessage.startsWith('Error') ? '#f44336' : '#4caf50',
            color: 'white',
            borderRadius: 5,
            marginBottom: 15,
          }}
        >
          {feedbackMessage}
        </div>
      )}

      <h3>Incoming Requests ({pendingRequests.length})</h3>
      {pendingRequests.length === 0 ? (
        <p>No pending friend requests.</p>
      ) : (
        <ul>
          {pendingRequests.map((r) => {
            const label = r.senderUsername || r.senderEmail || `${r.senderId.slice(0, 8)}…`;
            return (
              <li
                key={r.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>From: {label}</span>
                <button
                  type='button'
                  onClick={() => handleAcceptClick(r.senderId, label)}
                  style={{ marginLeft: 10 }}
                  aria-label={`Accept request from ${label}`}
                >
                  Accept
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div style={{ marginTop: 24 }}>
        <h3>Find Friends</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type='text'
            placeholder='Enter email or username...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: 8, flexGrow: 1 }}
            aria-label='Friend search input'
            onKeyDown={(e) => e.key === 'Enter' && !isSearching && handleSearch()}
          />
          <button
            type='button'
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            aria-busy={isSearching}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div style={{ marginTop: 15 }}>
          {isSearching ? (
            <p>Loading results...</p>
          ) : hasSearched ? (
            searchResults.length > 0 ? (
              <ul>
                {searchResults.map((u) => {
                  const label = u.username ?? u.email ?? 'user';
                  return (
                    <li
                      key={u.uid}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>
                        {u.username} {u.username && u.email ? `(${u.email})` : u.email}
                      </span>
                      <button
                        type='button'
                        onClick={() => handleSendClick(u.uid, label)}
                        aria-label={`Send friend request to ${label}`}
                      >
                        Add Friend
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No users found. Try searching by email or username.</p>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------- Page ----------
export default function Friends() {
  const { friends, pendingRequests, acceptFriendRequest, sendFriendRequest, removeFriend } =
    useFriends();

  // Note: counts are expected to come from your hook (winsCount/lossesCount).
  // If they don't yet, you can wire them later without touching this UI.
  const [friendsWithStats, setFriendsWithStats] = useState<UserLite[]>(friends);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!friends?.length) {
        setFriendsWithStats([]);
        return;
      }
      setLoadingStats(true);
      try {
        const enriched = await Promise.all(
          friends.map(async (f) => {
            try {
              const counts = await fetchCounts(f.uid);
              return { ...f, ...counts };
            } catch (e) {
              console.warn('count fetch failed for', f.uid, e);
              return f; // will show 0s for this friend
            }
          })
        );
        if (!cancelled) setFriendsWithStats(enriched);
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [friends]);

  return (
    <>
      <NavBar />
      <div className='FriendsContainer'>
        <div className='FriendsComponent'>
          <h2>My Friends {loadingStats ? '· loading stats…' : ''}</h2>
          <FriendsList friends={friendsWithStats} removeFriend={removeFriend} />
        </div>

        <div className='FriendsComponent'>
          <h2>Requests & Search</h2>
          <FriendRequests
            pendingRequests={pendingRequests}
            acceptFriendRequest={acceptFriendRequest}
            sendFriendRequest={sendFriendRequest}
          />
        </div>
      </div>
      <Footer />
    </>
  );
}
