import "./Admin.css";
import NavBar from "../../components/NavBar/NavBar";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../../Backend/firebase/firebaseConfig";             
import { approveEvent, rejectEvent } from "../../../Backend/firebase/events"; 

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

export default function Admin() {
  const [pending, setPending] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "specialEvents"), where("status", "==", "pending"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPending(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Event[]);
        setLoading(false);
      },
      (e) => {
        setErr(e.message ?? String(e));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const hasRows = useMemo(() => pending.length > 0, [pending]);

  async function onApprove(id: string) {
    try { setBusyId(id); await approveEvent(id); } 
    catch (e: any) { alert("Approve failed: " + (e?.message ?? e)); } 
    finally { setBusyId(null); }
  }
  async function onReject(id: string) {
    try { setBusyId(id); await rejectEvent(id); } 
    catch (e: any) { alert("Reject failed: " + (e?.message ?? e)); } 
    finally { setBusyId(null); }
  }

  return (
    <>
      <NavBar />
      <div className="userTableContainer">
        <h2>Pending Special Events</h2>

        {err && <div style={{ color: "#ff6b6b", marginBottom: 12 }}>Firestore error: {err}</div>}
        <table className="userTable">
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
          {!loading && !hasRows && (
            <tr><td colSpan={6} style={{ textAlign: "center", opacity: 0.8 }}>No pending events</td></tr>
          )}
          {pending.map((ev) => (
            <tr key={ev.id}>
              <td>{ev.EventTitle}</td>
              <td>{ev.EventHook}</td>
              <td style={{ maxWidth: 420 }}>{ev.EventDescription}</td>
              <td>{ev.EventImage ? <img src={ev.EventImage} alt="" style={{ height: 40, borderRadius: 6 }} /> : "—"}</td>
              <td style={{ fontFamily: "monospace" }}>{ev.EventLink}</td>
              <td>
                <button className="editButton" onClick={() => onApprove(ev.id)} disabled={busyId === ev.id}>Approve</button>
                <button className="deleteButton" onClick={() => onReject(ev.id)} disabled={busyId === ev.id} style={{ marginLeft: 8 }}>Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </>
  );
}