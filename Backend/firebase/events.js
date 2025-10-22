import { addDoc, collection, serverTimestamp, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { getAuth } from "firebase/auth";
// Creates Pending function to submmit
export async function submitSpecialEvent(input) {
    const uid = getAuth().currentUser?.uid;
    if (!uid)
        throw new Error("Must be signed in");
    await addDoc(collection(db, "specialEvents"), {
        ...input,
        status: "pending",
        createdBy: uid,
        createdAt: serverTimestamp(),
    });
}
// Approves document
export function listenApprovedEvents(cb) {
    const q = query(collection(db, "specialEvents"), where("status", "==", "approved"));
    return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.error("listenApprovedEvents error:", err));
}
// Admin actions
export async function approveEvent(id) {
    const uid = getAuth().currentUser?.uid ?? "system";
    await updateDoc(doc(db, "specialEvents", id), {
        status: "approved",
        approvedBy: uid,
        approvedAt: serverTimestamp(),
    });
}
export async function rejectEvent(id) {
    const uid = getAuth().currentUser?.uid ?? "system";
    await updateDoc(doc(db, "specialEvents", id), {
        status: "rejected",
        approvedBy: uid,
        approvedAt: serverTimestamp(),
    });
}
