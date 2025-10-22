import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import './Admin.css';
import NavBar from '@components/NavBar/NavBar';
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc, serverTimestamp, } from 'firebase/firestore';
import { db } from '@myfirebase/firebaseConfig';
import { approveEvent, rejectEvent } from '@myfirebase/events';
import { useUser } from '@backend/firebase/UserFunctions';
import { resolveEventBets } from '@myfirebase/eventBetting';
import Footer from '@components/Footer/Footer';
export default function Admin() {
    // --- Special Events State ---
    const [pending, setPending] = useState([]);
    const [liveEvents, setLiveEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [loadingLiveEvents, setLoadingLiveEvents] = useState(true);
    const [eventsErr, setEventsErr] = useState(null);
    const [liveEventsErr, setLiveEventsErr] = useState(null);
    const [busyId, setBusyId] = useState(null);
    // --- Users State ---
    const [users, setUsers] = useState([]);
    const { user: currentUser } = useUser();
    // --- Fetch Pending Events ---
    useEffect(() => {
        const q = query(collection(db, 'specialEvents'), where('status', '==', 'pending'));
        const unsub = onSnapshot(q, (snap) => {
            setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoadingEvents(false);
        }, (e) => {
            setEventsErr(e.message ?? String(e));
            setLoadingEvents(false);
        });
        return () => unsub();
    }, []);
    // --- Fetch Live Events ---
    useEffect(() => {
        const q = query(collection(db, 'specialEvents'), where('status', '==', 'approved'));
        const unsub = onSnapshot(q, (snap) => {
            setLiveEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoadingLiveEvents(false);
        }, (e) => {
            setLiveEventsErr(e.message ?? String(e));
            setLoadingLiveEvents(false);
        });
        return () => unsub();
    }, []);
    const hasEvents = useMemo(() => pending.length > 0, [pending]);
    const hasLiveEvents = useMemo(() => liveEvents.length > 0, [liveEvents]);
    async function onApprove(id) {
        try {
            setBusyId(id);
            await approveEvent(id);
        }
        catch (e) {
            alert('Approve failed: ' + (e?.message ?? e));
        }
        finally {
            setBusyId(null);
        }
    }
    async function onReject(id) {
        try {
            setBusyId(id);
            await rejectEvent(id);
        }
        catch (e) {
            alert('Reject failed: ' + (e?.message ?? e));
        }
        finally {
            setBusyId(null);
        }
    }
    async function onEventOutcome(id, outcome) {
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
            alert(`Event marked as "${outcome === 'happened' ? 'happened' : 'did not happen'}" and payouts processed!`);
        }
        catch (e) {
            console.error('Event outcome error:', e);
            alert('Event outcome update failed: ' + (e?.message ?? e));
        }
        finally {
            setBusyId(null);
        }
    }
    // --- Fetch Users ---
    useEffect(() => {
        const usersCollectionRef = collection(db, 'users');
        const unsubscribe = onSnapshot(usersCollectionRef, (querySnapshot) => {
            const usersData = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                roles: doc.data().roles || [],
            }));
            setUsers(usersData);
        });
        return () => unsubscribe();
    }, []);
    // --- User Management Functions ---
    const handleRolesChange = async (id, role, isChecked, currentRoles) => {
        let newRoles = [...currentRoles];
        if (isChecked && !newRoles.includes(role))
            newRoles.push(role);
        if (!isChecked)
            newRoles = newRoles.filter((r) => r !== role);
        const userDoc = doc(db, 'users', id);
        await updateDoc(userDoc, { roles: newRoles });
    };
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            const userDoc = doc(db, 'users', id);
            await deleteDoc(userDoc);
        }
    };
    const handleBalanceEdit = async (id, currentBalance) => {
        const newBalanceStr = prompt('Enter the new balance:', currentBalance.toString());
        if (newBalanceStr !== null) {
            const newBalance = parseFloat(newBalanceStr);
            if (!isNaN(newBalance)) {
                const userDoc = doc(db, 'users', id);
                await updateDoc(userDoc, { balance: newBalance });
            }
            else {
                alert('Invalid input. Please enter a valid number for the balance.');
            }
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx(NavBar, {}), _jsxs("main", { className: 'AdminPage', children: [_jsxs("div", { className: 'userTableContainer', children: [_jsx("h2", { children: "Pending Special Events" }), eventsErr && (_jsxs("div", { style: { color: '#ff6b6b', marginBottom: 12 }, children: ["Firestore error: ", eventsErr] })), _jsx("div", { className: 'userTable', children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Title" }), _jsx("th", { children: "Hook" }), _jsx("th", { children: "Description" }), _jsx("th", { children: "Preview" }), _jsx("th", { children: "Link" }), _jsx("th", { children: "Actions" })] }) }), _jsxs("tbody", { children: [!loadingEvents && !hasEvents && (_jsx("tr", { children: _jsx("td", { colSpan: 6, style: { textAlign: 'center', opacity: 0.8 }, children: "No pending events" }) })), pending.map((ev) => (_jsxs("tr", { children: [_jsx("td", { children: ev.EventTitle }), _jsx("td", { children: ev.EventHook }), _jsx("td", { style: { maxWidth: 420 }, children: ev.EventDescription }), _jsx("td", { children: ev.EventImage ? (_jsx("img", { src: ev.EventImage, alt: '', style: { height: 40, borderRadius: 6 } })) : ('—') }), _jsx("td", { style: { fontFamily: 'monospace' }, children: ev.EventLink }), _jsxs("td", { children: [_jsx("button", { className: 'editButton', onClick: () => onApprove(ev.id), disabled: busyId === ev.id, children: "Approve" }), _jsx("button", { className: 'deleteButton', onClick: () => onReject(ev.id), disabled: busyId === ev.id, style: { marginLeft: 8 }, children: "Reject" })] })] }, ev.id)))] })] }) })] }), _jsxs("div", { className: 'userTableContainer', style: { marginTop: 40 }, children: [_jsx("h2", { children: "Live Events" }), liveEventsErr && (_jsxs("div", { style: { color: '#ff6b6b', marginBottom: 12 }, children: ["Firestore error: ", liveEventsErr] })), _jsx("div", { className: 'userTable', children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Title" }), _jsx("th", { children: "Hook" }), _jsx("th", { children: "Description" }), _jsx("th", { children: "Preview" }), _jsx("th", { children: "Link" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Actions" })] }) }), _jsxs("tbody", { children: [!loadingLiveEvents && !hasLiveEvents && (_jsx("tr", { children: _jsx("td", { colSpan: 7, style: { textAlign: 'center', opacity: 0.8 }, children: "No live events" }) })), liveEvents.map((ev) => (_jsxs("tr", { children: [_jsx("td", { children: ev.EventTitle }), _jsx("td", { children: ev.EventHook }), _jsx("td", { style: { maxWidth: 420 }, children: ev.EventDescription }), _jsx("td", { children: ev.EventImage ? (_jsx("img", { src: ev.EventImage, alt: '', style: { height: 40, borderRadius: 6 } })) : ('—') }), _jsx("td", { style: { fontFamily: 'monospace' }, children: ev.EventLink }), _jsx("td", { style: { color: '#4CAF50', fontWeight: 'bold' }, children: "Live" }), _jsxs("td", { children: [_jsx("button", { className: 'editButton', onClick: () => onEventOutcome(ev.id, 'happened'), disabled: busyId === ev.id, style: { marginRight: 8 }, children: "Happened" }), _jsx("button", { className: 'deleteButton', onClick: () => onEventOutcome(ev.id, 'did-not-happen'), disabled: busyId === ev.id, children: "Did Not Happen" })] })] }, ev.id)))] })] }) })] }), _jsxs("div", { className: 'userTableContainer', style: { marginTop: 40 }, children: [_jsx("h2", { children: "User Management" }), _jsx("div", { className: 'userTable', children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "Email" }), _jsx("th", { children: "Role" }), _jsx("th", { children: "Balance" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: users.map((u) => (_jsxs("tr", { children: [_jsx("td", { children: u.id }), _jsx("td", { children: u.email }), _jsxs("td", { className: 'roles-checkboxes', children: [_jsxs("label", { children: [_jsx("input", { type: 'checkbox', checked: u.roles.includes('admin'), onChange: (e) => handleRolesChange(u.id, 'admin', e.target.checked, u.roles) }), ' ', "Admin"] }), _jsxs("label", { children: [_jsx("input", { type: 'checkbox', checked: u.roles.includes('staff'), onChange: (e) => handleRolesChange(u.id, 'staff', e.target.checked, u.roles) }), ' ', "Staff"] })] }), _jsxs("td", { children: ["$", (u.balance / 100).toFixed(2)] }), _jsxs("td", { children: [_jsx("button", { onClick: () => handleBalanceEdit(u.id, u.balance), className: 'editButton', children: "Edit" }), _jsx("button", { onClick: () => handleDelete(u.id), className: 'deleteButton', disabled: currentUser?.uid === u.id, children: "Delete" })] })] }, u.id))) })] }) })] })] }), _jsx(Footer, {})] }));
}
