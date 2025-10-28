import './Admin.css';
import NavBar from '../../components/NavBar/NavBar';
import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../Backend/firebase/firebaseConfig';
import { approveEvent, rejectEvent } from '../../../Backend/firebase/events';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import { resolveEventBets } from '../../../Backend/firebase/eventBetting';

import Footer from '@components/Footer/footer';

// --- Types ---
type Event = {
  id: string;
  EventHook: string;
  EventTitle: string;
  EventDescription: string;
  EventImage?: string | null;
  EventLink: string;
  createdBy: string;
  createdAt?: any;
  status?: string;
};

interface User {
  id: string;
  email: string;
  roles: string[];
  balance: number;
}

export default function Admin() {
  // Special Events State
  const [pending, setPending] = useState<Event[]>([]);
  const [liveEvents, setLiveEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingLiveEvents, setLoadingLiveEvents] = useState(true);
  const [eventsErr, setEventsErr] = useState<string | null>(null);
  const [liveEventsErr, setLiveEventsErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const { user: currentUser } = useUser();

  // Fetch Pending Events
  useEffect(() => {
    const q = query(collection(db, 'specialEvents'), where('status', '==', 'pending'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPending(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Event[]);
        setLoadingEvents(false);
      },
      (e) => {
        setEventsErr(e.message ?? String(e));
        setLoadingEvents(false);
      }
    );
    return () => unsub();
  }, []);

  // Fetch Live Events
  useEffect(() => {
    const q = query(collection(db, 'specialEvents'), where('status', '==', 'approved'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLiveEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Event[]);
        setLoadingLiveEvents(false);
      },
      (e) => {
        setLiveEventsErr(e.message ?? String(e));
        setLoadingLiveEvents(false);
      }
    );
    return () => unsub();
  }, []);

  const hasEvents = useMemo(() => pending.length > 0, [pending]);
  const hasLiveEvents = useMemo(() => liveEvents.length > 0, [liveEvents]);

  async function onApprove(id: string) {
    try {
      setBusyId(id);
      await approveEvent(id);
    } catch (e: any) {
      alert('Approve failed: ' + (e?.message ?? e));
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(id: string) {
    try {
      setBusyId(id);
      await rejectEvent(id);
    } catch (e: any) {
      alert('Reject failed: ' + (e?.message ?? e));
    } finally {
      setBusyId(null);
    }
  }

  async function onEventOutcome(id: string, outcome: 'happened' | 'did-not-happen') {
    try {
      setBusyId(id);

      // Update event status first
      const eventDoc = doc(db, 'specialEvents', id);
      await updateDoc(eventDoc, {
        status: outcome,
        resolvedBy: currentUser?.uid ?? 'system',
        resolvedAt: serverTimestamp(),
      });

      // Resolve all bets for this event and distribute payouts
      await resolveEventBets(id, outcome);

      alert(
        `Event marked as "${outcome === 'happened' ? 'happened' : 'did not happen'}" and payouts processed!`
      );
    } catch (e: any) {
      console.error('Event outcome error:', e);
      alert('Event outcome update failed: ' + (e?.message ?? e));
    } finally {
      setBusyId(null);
    }
  }

  // Fetch Users
  useEffect(() => {
    const usersCollectionRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCollectionRef, (querySnapshot) => {
      const usersData = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            roles: doc.data().roles || [],
          }) as User
      );
      setUsers(usersData);
    });
    return () => unsubscribe();
  }, []);

  // User Management Functions
  const handleRolesChange = async (
    id: string,
    role: string,
    isChecked: boolean,
    currentRoles: string[]
  ) => {
    let newRoles = [...currentRoles];
    if (isChecked && !newRoles.includes(role)) newRoles.push(role);
    if (!isChecked) newRoles = newRoles.filter((r) => r !== role);
    const userDoc = doc(db, 'users', id);
    await updateDoc(userDoc, { roles: newRoles });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const userDoc = doc(db, 'users', id);
      await deleteDoc(userDoc);
    }
  };

  const handleBalanceEdit = async (id: string, currentBalance: number) => {
    const newBalanceStr = prompt('Enter the new balance:', currentBalance.toString());
    if (newBalanceStr !== null) {
      const newBalance = parseFloat(newBalanceStr);
      if (!isNaN(newBalance)) {
        const userDoc = doc(db, 'users', id);
        await updateDoc(userDoc, { balance: newBalance });
      } else {
        alert('Invalid input. Please enter a valid number for the balance.');
      }
    }
  };

  return (
    <>
      <NavBar />

      <main className='AdminPage'>
        {/* --- Special Events Section --- */}
        <div className='userTableContainer'>
          <h2>Pending Special Events</h2>
          {eventsErr && (
            <div style={{ color: '#ff6b6b', marginBottom: 12 }}>Firestore error: {eventsErr}</div>
          )}

          <div className='userTable'>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Hook</th>
                  <th>Description</th>
                  <th>Preview</th>
                  <th>Link</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loadingEvents && !hasEvents && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', opacity: 0.8 }}>
                      No pending events
                    </td>
                  </tr>
                )}
                {pending.map((ev) => (
                  <tr key={ev.id}>
                    <td>{ev.EventTitle}</td>
                    <td>{ev.EventHook}</td>
                    <td style={{ maxWidth: 420 }}>{ev.EventDescription}</td>
                    <td>
                      {ev.EventImage ? (
                        <img src={ev.EventImage} alt='' style={{ height: 40, borderRadius: 6 }} />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{ev.EventLink}</td>
                    <td>
                      <button
                        className='editButton'
                        onClick={() => onApprove(ev.id)}
                        disabled={busyId === ev.id}
                      >
                        Approve
                      </button>
                      <button
                        className='deleteButton'
                        onClick={() => onReject(ev.id)}
                        disabled={busyId === ev.id}
                        style={{ marginLeft: 8 }}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- Live Events Section --- */}
        <div className='userTableContainer' style={{ marginTop: 40 }}>
          <h2>Live Events</h2>
          {liveEventsErr && (
            <div style={{ color: '#ff6b6b', marginBottom: 12 }}>
              Firestore error: {liveEventsErr}
            </div>
          )}

          <div className='userTable'>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Hook</th>
                  <th>Description</th>
                  <th>Preview</th>
                  <th>Link</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loadingLiveEvents && !hasLiveEvents && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', opacity: 0.8 }}>
                      No live events
                    </td>
                  </tr>
                )}
                {liveEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td>{ev.EventTitle}</td>
                    <td>{ev.EventHook}</td>
                    <td style={{ maxWidth: 420 }}>{ev.EventDescription}</td>
                    <td>
                      {ev.EventImage ? (
                        <img src={ev.EventImage} alt='' style={{ height: 40, borderRadius: 6 }} />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{ev.EventLink}</td>
                    <td style={{ color: '#4CAF50', fontWeight: 'bold' }}>Live</td>
                    <td>
                      <button
                        className='editButton'
                        onClick={() => onEventOutcome(ev.id, 'happened')}
                        disabled={busyId === ev.id}
                        style={{ marginRight: 8 }}
                      >
                        Happened
                      </button>
                      <button
                        className='deleteButton'
                        onClick={() => onEventOutcome(ev.id, 'did-not-happen')}
                        disabled={busyId === ev.id}
                      >
                        Did Not Happen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- User Management Section --- */}
        <div className='userTableContainer' style={{ marginTop: 40 }}>
          <h2>User Management</h2>

          <div className='userTable'>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.email}</td>
                    <td className='roles-checkboxes'>
                      <label>
                        <input
                          type='checkbox'
                          checked={u.roles.includes('admin')}
                          onChange={(e) =>
                            handleRolesChange(u.id, 'admin', e.target.checked, u.roles)
                          }
                        />{' '}
                        Admin
                      </label>
                      <label>
                        <input
                          type='checkbox'
                          checked={u.roles.includes('staff')}
                          onChange={(e) =>
                            handleRolesChange(u.id, 'staff', e.target.checked, u.roles)
                          }
                        />{' '}
                        Staff
                      </label>
                    </td>
                    <td>${(u.balance / 100).toFixed(2)}</td>
                    <td>
                      <button
                        onClick={() => handleBalanceEdit(u.id, u.balance)}
                        className='editButton'
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className='deleteButton'
                        disabled={currentUser?.uid === u.id}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
