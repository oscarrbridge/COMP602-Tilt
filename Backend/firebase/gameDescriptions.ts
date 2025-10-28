import { db } from './firebaseConfig';
import {
  collection,
  getDocs,
  onSnapshot,
  QuerySnapshot,
  doc,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import type { DocumentData, Unsubscribe } from 'firebase/firestore';

export interface GameDescription {
  id: string;
  name: string;
  description: string;
  howToPlay?: string;
  multipliers?: string;
  category?: string;
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

// Simple in-memory cache to avoid refetching the same game docs by id
const gameCache = new Map<string, GameDescription>();

// One-shot fetch with optional filters (category / active flag)
export async function getGameDescriptions(options?: {
  category?: string;
  isActive?: boolean;
}): Promise<GameDescription[]> {
  try {
    let gameCol = collection(db, 'gameDescription');

    // Collect Firestore query constraints based on provided options
    const constraints = [];
    if (options?.category) {
      constraints.push(where('category', '==', options.category));
    }
    if (options?.isActive !== undefined) {
      constraints.push(where('isActive', '==', options.isActive));
    }

    // Use a filtered query if we have constraints; otherwise query the whole collection
    const q = constraints.length > 0 ? query(gameCol, ...constraints) : gameCol;
    const snapshot = await getDocs(q);

    // Map Firestore docs to our GameDescription shape; skip docs missing core fields
    const games: GameDescription[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        if (data.name && data.description) {
          const game = {
            id: doc.id,
            name: data.name,
            description: data.description,
            howToPlay: data.howToPlay || '',
            multipliers: data.multipliers || '',
            category: data.category,
            isActive: data.isActive,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as GameDescription;

          // Cache by doc id for quick later access
          gameCache.set(doc.id, game);
          return game;
        }
        return null;
      })
      .filter(Boolean) as GameDescription[];

    return games;
  } catch (error) {
    console.error('Error fetching game descriptions:', error);
    // Surface a readable error up to the caller
    throw new Error(
      `Failed to fetch games: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Live listener version: pushes updates to the provided callback
export function listenGameDescriptions(
  callback: (games: GameDescription[]) => void,
  options?: {
    category?: string;
    isActive?: boolean;
  }
): Unsubscribe {
  try {
    let gameCol = collection(db, 'gameDescription');

    // Build optional query constraints
    const constraints = [];
    if (options?.category) {
      constraints.push(where('category', '==', options.category));
    }
    if (options?.isActive !== undefined) {
      constraints.push(where('isActive', '==', options.isActive));
    }

    const q = constraints.length > 0 ? query(gameCol, ...constraints) : gameCol;

    // Start snapshot listener; return Firestore's unsubscribe
    return onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        // Convert docs to GameDescription array (same mapping as the one-shot fetch)
        const games: GameDescription[] = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            if (data.name && data.description) {
              const game = {
                id: doc.id,
                name: data.name,
                description: data.description,
                howToPlay: data.howToPlay || '',
                multipliers: data.multipliers || '',
                category: data.category,
                isActive: data.isActive,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
              } as GameDescription;

              gameCache.set(doc.id, game);
              return game;
            }
            return null;
          })
          .filter(Boolean) as GameDescription[];

        callback(games);
      },
      (error) => {
        // On listener error, log and send an empty list to the consumer
        console.error('Error listening to game descriptions:', error);
        callback([]);
      }
    );
  } catch (error) {
    // If we fail to even set up the listener, return a no-op unsubscribe
    console.error('Error setting up listener:', error);
    return () => {};
  }
}

// Fetch a single game by id with basic caching and case-insensitive fallback
export async function getGameById(gameId: string): Promise<GameDescription | null> {
  try {
    const idRaw = (gameId || '').trim();
    const idLower = idRaw.toLowerCase();

    // Quick cache check first (exact and lowercased keys)
    if (gameCache.has(idRaw)) return gameCache.get(idRaw)!;
    if (gameCache.has(idLower)) return gameCache.get(idLower)!;

    // Helper to normalize, cache under both keys, and return the object
    const buildAndCache = (snapshot: any) => {
      const data = snapshot.data();
      const game: GameDescription = {
        id: snapshot.id,
        name: data?.name || 'Unnamed Game',
        description: data?.description || 'No description available',
        howToPlay: data?.howToPlay || '',
        multipliers: data?.multipliers || '',
        category: data?.category,
        isActive: data?.isActive,
        createdAt: data?.createdAt,
        updatedAt: data?.updatedAt,
      };
      gameCache.set(idRaw, game);
      gameCache.set(idLower, game);
      return game;
    };

    // 1) Exact id lookup
    if (idRaw) {
      const docExact = doc(db, 'gameDescription', idRaw);
      const snapExact = await getDoc(docExact);
      if (snapExact.exists()) return buildAndCache(snapExact);
    }

    // 2) Lowercased id lookup (helps with "Poker" vs "poker" style ids)
    if (idLower && idLower !== idRaw) {
      const docLower = doc(db, 'gameDescription', idLower);
      const snapLower = await getDoc(docLower);
      if (snapLower.exists()) return buildAndCache(snapLower);
    }

    // Not found
    return null;
  } catch (error) {
    console.error('Error fetching game:', error);
    throw error;
  }
}

// Utility to clear the in-memory cache (e.g., during logout or admin edits)
export function clearGameCache(): void {
  gameCache.clear();
}

// Read a cached game directly if present (undefined if not cached)
export function getCachedGame(gameId: string): GameDescription | undefined {
  return gameCache.get(gameId);
}
