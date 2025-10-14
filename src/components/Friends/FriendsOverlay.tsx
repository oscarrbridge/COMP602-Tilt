import { useEffect, useMemo, useState } from 'react';
import { useFriends } from './friends';
import { useUser } from '../../../Backend/firebase/UserFunctions';
import InviteButton from './InviteButton';
import './Friends.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { createGameLobby, joinGameLobby } from '../../../Backend/lobby_functions';
import { sendInvite } from './Invite';
import { Online } from './Online';

type TabKey = 'online' | 'all' | 'requests';

export default function FriendsDock() {
  const { user } = useUser();
  const { friends, pendingRequests, acceptFriendRequest, removeFriend } = useFriends();
  const friendUids = useMemo(() => friends.map((f: any) => f.uid), [friends]);
  const { onlineByUid } = Online(friendUids);

  const [open, setOpen] = useState(true); // expanded vs collapsed
  const [tab, setTab] = useState<TabKey>('online');

  const [sessionId, setSessionId] = useState(
    localStorage.getItem('sessionId') || 'default-session'
  );
  useEffect(() => {
    const onStorage = () => setSessionId(localStorage.getItem('sessionId') || 'default-session');
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const pendingCount = pendingRequests.length;

  const navigate = useNavigate();

  const location = useLocation();
  const enableInvites = location.pathname.startsWith('/blackjack');

  const friendsWithOnline = friends.map((f: any) => {
    const p = onlineByUid[f.uid];
    return { ...f, online: p?.online || false, lastSeen: p?.lastSeen || 0 };
  });
  const onlineFriends = friendsWithOnline.filter((f: any) => f.online);

  // create a new lobby, add host to it, invite friend, then route to table
  async function createTableAndInvite(friendUid: string) {
    if (!user) return;
    const newGameId = await createGameLobby(user.uid, 1, 5);
    await joinGameLobby(newGameId, user.uid, user.displayName || user.email || 'Player');

    try {
      localStorage.setItem('sessionId', newGameId);
    } catch {}
    setSessionId(newGameId); // <-- keep sessionId state in sync

    await sendInvite({
      senderId: user.uid,
      senderName: user.displayName || user.email || 'Player',
      recipientId: friendUid,
      sessionId: newGameId,
      game: 'blackjack',
    });

    navigate(`/game/blackjack/${newGameId}`);
  }

  // If logged out, show compact pill with sign-in nudge
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
                      {enableInvites && // only show invite actions on /blackjack
                        (sessionId && sessionId !== 'default-session' ? (
                          <InviteButton
                            friendUid={f.uid}
                            friendName={f.username || f.email}
                            sessionId={sessionId}
                            senderId={user.uid}
                            senderName={user.displayName || user.email || 'Player'}
                            game='blackjack'
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
                            friendUid={f.uid}
                            friendName={f.username || f.email}
                            sessionId={sessionId}
                            senderId={user.uid}
                            senderName={user.displayName || user.email || 'Player'}
                            game='blackjack'
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
                      {/* Accept request */}
                      <button className='btn' onClick={() => acceptFriendRequest(req.senderId)}>
                        Accept
                      </button>

                      {/* After accepting, you can invite them directly */}
                      {enableInvites &&
                        (sessionId && sessionId !== 'default-session' ? (
                          <InviteButton
                            friendUid={req.senderId}
                            friendName={req.senderUsername || req.senderEmail}
                            sessionId={sessionId}
                            senderId={user.uid}
                            senderName={user.displayName || user.email || 'Player'}
                            game='blackjack'
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
