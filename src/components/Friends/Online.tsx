import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../Backend/firebase/firebaseConfig';
import { useUser } from '../../../Backend/firebase/UserFunctions';

// Treat someone as "online" if their lastSeen was within this window
const ONLINE_WINDOW_MS = 30_000; // 30s
const CHUNK_SIZE = 10; // Firestore "in" filter is limited

export function Online(friendUids: string[]) {
  const { user } = useUser();
  const [onlineByUid, setOnlineByUid] = useState<
    Record<string, { online: boolean; lastSeen: number }>
  >({});

  useEffect(() => {
    if (!user?.uid) return;

    const meRef = doc(db, 'online', user.uid);

    const ping = async () => {
      await setDoc(meRef, { lastSeen: serverTimestamp() }, { merge: true });
    };
    // initial write
    ping();
    const interval = setInterval(ping, 20_000);

    // visibility -> bump lastSeen when user focuses the tab
    const onVis = async () => {
      await updateDoc(meRef, { lastSeen: serverTimestamp() });
    };
    document.addEventListener('visibilitychange', onVis);

    // best-effort bump on unload (not guaranteed, but helps)
    const onUnload = () => {
      try {
        navigator.sendBeacon?.('/online-beacon', '');
      } catch {}
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [user?.uid]);

  // Read friends' online
  const chunks = useMemo(() => {
    const ids = (friendUids || []).filter(Boolean);
    const out: string[][] = [];
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) out.push(ids.slice(i, i + CHUNK_SIZE));
    return out;
  }, [friendUids]);

  useEffect(() => {
    if (!user?.uid) return;
    // if no friends to watch, clear instantly
    if (chunks.length === 0) {
      setOnlineByUid({});
      return;
    }
    const unsubs = chunks.map((ids) => {
      const qy = query(collection(db, 'online'), where('__name__', 'in', ids));
      return onSnapshot(qy, (snap) => {
        setOnlineByUid((prev) => {
          const next = { ...prev };
          const now = Date.now();
          snap.forEach((d) => {
            const data = d.data() as { lastSeen?: { seconds?: number; nanoseconds?: number } };
            const lastSeenMs = data?.lastSeen
              ? (data.lastSeen.seconds ?? 0) * 1000 +
                Math.floor((data.lastSeen.nanoseconds ?? 0) / 1e6)
              : 0;
            next[d.id] = {
              lastSeen: lastSeenMs,
              online: lastSeenMs > 0 && now - lastSeenMs <= ONLINE_WINDOW_MS,
            };
          });

          // remove entries for friends no longer in friendUids
          const allowed = new Set(chunks.flat());
          Object.keys(next).forEach((uid) => {
            if (!allowed.has(uid)) delete next[uid];
          });

          return next;
        });
      });
    });
    return () => unsubs.forEach((u) => u && u());
  }, [chunks, user?.uid]);

  return { onlineByUid: onlineByUid };
}
