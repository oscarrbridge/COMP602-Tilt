import { useEffect, useMemo, useState } from 'react';
import { useFriends } from './friends';
import { useUser } from '../../../Backend/firebase/UserFunctions';
import InviteButton from './InviteButton';
import './Friends.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { createGameLobby, joinGameLobby } from '../../../Backend/lobby_functions';
import { sendInvite, listenIncomingInvites, declineInvite } from './Invite';
import type { Invite } from './Invite';
import { Online } from './Online';

import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../Backend/firebase/firebaseConfig';
import { createPokerLobby, joinPokerLobby } from '../../Games/Poker/pokerfunctions';

type TabKey = 'online' | 'all' | 'requests';

// Popup that shows incoming invites and lets you accept/decline
export function InvitePopup() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const { user } = useUser();
  const navigate = useNavigate();

  // Start a live listener for invites addressed to the current user.
  // When user changes or unmounts, clean it up.
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenIncomingInvites(user.uid, setInvites);
    return () => unsub();
  }, [user?.uid]);

  // If an invite is sent and it gets accepted, it moves me into that game.
  // Set hostAck so we don't re-handle the same invite multiple times.
  useEffect(() => {
    if (!user?.uid) return;

    const qAccepted = query(
      collection(db, 'invites'),
      where('senderId', '==', user.uid),
      where('status', '==', 'accepted')
    );

    const unsub = onSnapshot(qAccepted, async (snap) => {
      for (const d of snap.docs) {
        const inv = { id: d.id, ...(d.data() as any) } as Invite;
        if (!inv.sessionId || inv.hostAck) continue; // skip if already handled or missing session

        try {
          // Join the correct lobby type
          if (inv.game === 'poker') {
            await joinPokerLobby(
              inv.sessionId,
              user.uid,
              user.displayName || user.email || 'Player'
            );
          } else {
            await joinGameLobby(
              inv.sessionId,
              user.uid,
              user.displayName || user.email || 'Player'
            );
          }

          // Mark that we've processed this acceptance on the host side
          await updateDoc(doc(db, 'invites', inv.id!), { hostAck: true });

          // Push the user straight into the room
          const route =
            inv.game === 'poker' ? `/poker/${inv.sessionId}` : `/blackjack/${inv.sessionId}`;
          navigate(route, { replace: true });
        } catch (e) {
          console.error('Host redirect/join failed:', e);
        }
      }
    });

    return () => unsub();
  }, [user?.uid, navigate]);

  // Accept handler for an invite that has been received.
  // Creates a session if missing, persists status, joins, stores sessionId, then navigates.
  const onAccept = async (inv: Invite) => {
    if (!user) return;

    try {
      let sessionId = inv.sessionId;

      // If the invite didn't include a session yet, make one
      if (!sessionId) {
        sessionId =
          inv.game === 'poker'
            ? await createPokerLobby(inv.senderId, 2, 6)
            : await createGameLobby(inv.senderId, 'blackjack', 2, 5);

        await updateDoc(doc(db, 'invites', inv.id!), { sessionId, status: 'accepted' });
      } else {
        await updateDoc(doc(db, 'invites', inv.id!), { status: 'accepted' });
      }

      // Join the new/existing session
      if (inv.game === 'poker') {
        await joinPokerLobby(sessionId, user.uid, user.displayName || user.email || 'Player');
      } else {
        await joinGameLobby(sessionId, user.uid, user.displayName || user.email || 'Player');
      }

      // Keep sessionId locally so other parts of the UI can pick it up
      try {
        localStorage.setItem('sessionId', sessionId);
      } catch {}

      // Remove this invite from the popup list
      setInvites((prev) => prev.filter((i) => i.id !== inv.id));

      // Go to the table
      navigate(inv.game === 'poker' ? `/poker/${sessionId}` : `/blackjack/${sessionId}`, {
        replace: true,
      });
    } catch (err) {
      console.error('Accept invite failed:', err);
    }
  };

  // Update the invite with a declined status inside declineInvite
  const onDecline = async (inv: Invite) => {
    await declineInvite(inv.id!);
  };

  // No invites = no popup
  if (!invites.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 280,
        zIndex: 2147483647,
        display: 'grid',
        gap: 10,
      }}
    >
      {invites.map((inv) => (
        <div
          key={inv.id}
          style={{
            width: 300,
            padding: 10,
            borderRadius: 12,
            background: 'var(--secondary-colour)',
            color: 'var(--text-colour)',
            border: '1px solid rgba(255,255,255,.12)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {inv.senderName || 'Friend'} invited you to play {inv.game || 'Blackjack'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className='btn' onClick={() => onAccept(inv)}>
              Join
            </button>
            <button className='btn outline' onClick={() => onDecline(inv)}>
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FriendsDock() {
  const { user } = useUser();

  // Always call hooks in the same order. This hook pulls friends + requests and actions.
  const { friends, pendingRequests, acceptFriendRequest, removeFriend } = useFriends();

  // Precompute uid list for online presence lookup
  const friendUids = useMemo(() => friends.map((f: any) => f.uid), [friends]);

  // This is implemented as a function component but acts like a hook:
  // It returns presence info keyed by uid. Ideally rename to useOnline() later.
  const { onlineByUid } = Online(friendUids);

  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<TabKey>('online');

  // Share current session across tabs/windows
  const [sessionId, setSessionId] = useState(
    localStorage.getItem('sessionId') || 'default-session'
  );

  // Keep sessionId state in sync with localStorage changes (e.g. other components writing to it)
  useEffect(() => {
    const onStorage = () => setSessionId(localStorage.getItem('sessionId') || 'default-session');
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const pendingCount = pendingRequests.length;
  const navigate = useNavigate();
  const location = useLocation();
  const parts = location.pathname.split('/');
  const idFromUrl = parts[1] === 'blackjack' || parts[1] === 'poker' ? parts[2] : null;

  useEffect(() => {
    if (idFromUrl && idFromUrl !== sessionId) {
      setSessionId(idFromUrl);
      try {
        localStorage.setItem('sessionId', idFromUrl);
      } catch {}
    }
  }, [idFromUrl]);

  // Detect which game page we’re on to decide if invites should be shown and which game type to use
  const isBlackjack = location.pathname.startsWith('/blackjack');
  const isPoker = location.pathname.startsWith('/poker');
  const enableInvites = isBlackjack || isPoker;
  const gameType = isPoker ? 'poker' : 'blackjack';

  // Merge online presence onto friend objects for rendering
  const friendsWithOnline = friends.map((f: any) => {
    const p = onlineByUid[f.uid];
    return { ...f, online: p?.online || false, lastSeen: p?.lastSeen || 0 };
  });
  const onlineFriends = friendsWithOnline.filter((f: any) => f.online);

  // Creates a fresh table, joins it as the current user, stores sessionId, then sends an invite
  async function createTableAndInvite(friendUid: string) {
    if (!user) return;
    const minPlayers = gameType === 'poker' ? 2 : 1;
    const maxPlayers = gameType === 'poker' ? 6 : 5;

    // Always create a blackjack/poker game via the blackjack path here (by design)
    const newGameId = await createGameLobby(user.uid, gameType, minPlayers, maxPlayers);
    await joinGameLobby(newGameId, user.uid, user.displayName || user.email || 'Player');

    // Persist the session id locally so other components know which table we’re at
    try {
      localStorage.setItem('sessionId', newGameId);
    } catch {}
    setSessionId(newGameId);

    // Send the invite to the selected friend
    await sendInvite({
      senderId: user.uid,
      senderName: user.displayName || user.email || 'Player',
      recipientId: friendUid,
      sessionId: newGameId,
      game: gameType,
    });

    // Move straight to the table
    navigate(`/${gameType}/${newGameId}`);
  }

  // If no user, still render the dock shell so the UI doesn’t jump around
  // and we can show a gentle sign-in prompt.
  if (!user) {
    return (
      <div className='friends-dock friends-dock-collapsed'>
        <button className='friends-pillar' onClick={() => setOpen((o) => !o)}>
          Friends
        </button>
        {open && (
          <div className='friends-dock-card'>
            <div className='dock-header'>
              <strong>Friends</strong>
              <button className='dock-close' onClick={() => setOpen(false)}>
                –
              </button>
            </div>
            <div className='dock-body small'>Sign in to view and invite friends.</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`friends-dock ${open ? 'open' : 'closed'}`}>
      {!open ? (
        // Collapsed pillar with a badge if there are pending requests
        <button className='friends-pillar' onClick={() => setOpen(true)}>
          Friends{pendingCount > 0 ? <span className='badge'>{pendingCount}</span> : null}
        </button>
      ) : (
        <div className='friends-dock-card' onMouseDown={(e) => e.stopPropagation()}>
          <div className='dock-header'>
            <div className='tabs'>
              <button className={tab === 'online' ? 'active' : ''} onClick={() => setTab('online')}>
                Online
              </button>
              <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
                All
              </button>
              <button
                className={tab === 'requests' ? 'active' : ''}
                onClick={() => setTab('requests')}
              >
                Requests{pendingCount > 0 ? <span className='badge'>{pendingCount}</span> : null}
              </button>
            </div>
            <button className='dock-close' onClick={() => setOpen(false)}>
              –
            </button>
          </div>

          <div className='dock-body'>
            {tab === 'online' && (
              <div className='list'>
                {onlineFriends.length === 0 && <p className='small'>No one is online.</p>}
                {onlineFriends.map((f: any) => (
                  <div key={f.uid} className='friend-row'>
                    <div className='userbits'>
                      <div className='avatar'>
                        {(f.username || f.email || 'U').slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className='name'>{f.username || f.email}</div>
                        <div className='small'>Online</div>
                      </div>
                      <div className='status-dot status-online' />
                    </div>
                    <div className='row-actions'>
                      {enableInvites &&
                        (sessionId && sessionId !== 'default-session' ? (
                          <InviteButton
                            key={`${sessionId}-${f.uid}`}
                            friendUid={f.uid}
                            friendName={f.username || f.email}
                            sessionId={sessionId}
                            senderId={user.uid}
                            senderName={user.displayName || user.email || 'Player'}
                            game={gameType} // Use current page’s game
                          />
                        ) : (
                          <button className='btn' onClick={() => createTableAndInvite(f.uid)}>
                            Create table & invite
                          </button>
                        ))}
                      <button className='btn outline' onClick={() => removeFriend(f.uid)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'all' && (
              <div className='list'>
                {friends.length === 0 && <p className='small'>No friends yet.</p>}
                {friends.map((f: any) => (
                  <div key={f.uid} className='friend-row'>
                    <div className='userbits'>
                      <div className='avatar'>
                        {(f.username || f.email || 'U').slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className='name'>{f.username || f.email}</div>
                      </div>
                    </div>
                    <div className='row-actions'>
                      {enableInvites &&
                        (sessionId && sessionId !== 'default-session' ? (
                          <InviteButton
                            key={`${sessionId}-${f.uid}`}
                            friendUid={f.uid}
                            friendName={f.username || f.email}
                            sessionId={sessionId}
                            senderId={user.uid}
                            senderName={user.displayName || user.email || 'Player'}
                            game={gameType} // Use current page’s game
                          />
                        ) : (
                          <button className='btn' onClick={() => createTableAndInvite(f.uid)}>
                            Create table & invite
                          </button>
                        ))}
                      <button className='btn outline' onClick={() => removeFriend(f.uid)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'requests' && (
              <div className='list'>
                {pendingRequests.length === 0 && <p className='small'>No pending requests.</p>}
                {pendingRequests.map((req: any) => (
                  <div key={req.id} className='friend-row'>
                    <div className='userbits'>
                      <div className='avatar'>
                        {(req.senderUsername || req.senderEmail || 'U').slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className='name'>{req.senderUsername || req.senderEmail}</div>
                        <div className='small'>Incoming request</div>
                      </div>
                    </div>
                    <div className='row-actions'>
                      <button className='btn' onClick={() => acceptFriendRequest(req.senderId)}>
                        Accept
                      </button>

                      {enableInvites &&
                        (sessionId && sessionId !== 'default-session' ? (
                          <InviteButton
                            key={`${sessionId}-${req.senderId}`}
                            friendUid={req.senderId}
                            friendName={req.senderUsername || req.senderEmail}
                            sessionId={sessionId}
                            senderId={user.uid}
                            senderName={user.displayName || user.email || 'Player'}
                            game={gameType} // Use current page’s game
                          />
                        ) : (
                          <button
                            className='btn'
                            onClick={() => createTableAndInvite(req.senderId)}
                          >
                            Create table & invite
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='dock-footer'>
            <button className='btn outline' onClick={() => (window.location.href = '/friends')}>
              Add/Search friends
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
