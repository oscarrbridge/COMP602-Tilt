import { addDoc, collection, serverTimestamp, query, where,
  onSnapshot, updateDoc, doc
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { getAuth } from "firebase/auth";

export type NewEventInput = {
  EventHook: string;
  EventTitle: string;
  EventDescription: string;
  EventImage?: string | null;
  EventLink: string;
};

// Creates Pending function to submmit
export async function submitSpecialEvent(input: NewEventInput) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error("Must be signed in");
  await addDoc(collection(db, "specialEvents"), {
    ...input,
    status: "pending",
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
}

// Approves document
export function listenApprovedEvents(cb: (docs: any[]) => void) {
  const q = query(collection(db, "specialEvents"), where("status", "==", "approved"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))),
    (err) => console.error("listenApprovedEvents error:", err)
  );
}

// Admin actions
export async function approveEvent(id: string) {
  const uid = getAuth().currentUser?.uid ?? "system";
  await updateDoc(doc(db, "specialEvents", id), {
    status: "approved",
    approvedBy: uid,
    approvedAt: serverTimestamp(),
  });
}
export async function rejectEvent(id: string) {
  const uid = getAuth().currentUser?.uid ?? "system";
  await updateDoc(doc(db, "specialEvents", id), {
    status: "rejected",
    approvedBy: uid,
    approvedAt: serverTimestamp(),
  });
}