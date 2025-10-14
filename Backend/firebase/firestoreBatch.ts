import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../Backend/firebase/firebaseConfig';

// Firestore "in" queries accept up to 10 IDs. Chunk accordingly.
function chunk<T>(arr: T[], size = 10): T[][] {
  if (!arr.length) return [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Batch-load user docs by uid using documentId() IN queries.
 * Returns an array of { uid, ...data } objects in no guaranteed order.
 */
export async function getUsersByIds(uids: string[]) {
  if (!uids.length) return [];
  const usersRef = collection(db, 'users');
  const chunks = chunk(uids, 10);
  const results: any[] = [];

  for (const c of chunks) {
    const snap = await getDocs(query(usersRef, where(documentId(), 'in', c)));
    snap.forEach((d) => results.push({ uid: d.id, ...d.data() }));
  }
  return results;
}
