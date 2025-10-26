import { db } from './firebaseConfig';
import { 
  collection, 
  getDocs, 
  onSnapshot, 
  QuerySnapshot, 
  doc, 
  getDoc,
  query,
  where
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

const gameCache = new Map<string, GameDescription>();

export async function getGameDescriptions(options?: {
  category?: string;
  isActive?: boolean;
}): Promise<GameDescription[]> {
  try {
    let gameCol = collection(db, 'gameDescription');
    
    const constraints = [];
    if (options?.category) {
      constraints.push(where('category', '==', options.category));
    }
    if (options?.isActive !== undefined) {
      constraints.push(where('isActive', '==', options.isActive));
    }
    
    const q = constraints.length > 0 ? query(gameCol, ...constraints) : gameCol;
    const snapshot = await getDocs(q);

    const games: GameDescription[] = snapshot.docs
      .map(doc => {
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
            updatedAt: data.updatedAt
          } as GameDescription;
          
          gameCache.set(doc.id, game);
          return game;
        }
        return null;
      })
      .filter(Boolean) as GameDescription[];

    return games;
  } catch (error) {
    console.error("Error fetching game descriptions:", error);
    throw new Error(`Failed to fetch games: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function listenGameDescriptions(
  callback: (games: GameDescription[]) => void, 
  options?: {
    category?: string;
    isActive?: boolean;
  }
): Unsubscribe {
  try {
    let gameCol = collection(db, 'gameDescription');
    
    const constraints = [];
    if (options?.category) {
      constraints.push(where('category', '==', options.category));
    }
    if (options?.isActive !== undefined) {
      constraints.push(where('isActive', '==', options.isActive));
    }
    
    const q = constraints.length > 0 ? query(gameCol, ...constraints) : gameCol;

    return onSnapshot(q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const games: GameDescription[] = snapshot.docs
          .map(doc => {
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
                updatedAt: data.updatedAt
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
        console.error("Error listening to game descriptions:", error);
        callback([]);
      }
    );
  } catch (error) {
    console.error("Error setting up listener:", error);
    return () => {};
  }
}

export async function getGameById(gameId: string): Promise<GameDescription | null> {
  try {
    if (gameCache.has(gameId)) {
      return gameCache.get(gameId)!;
    }

    const gameDoc = doc(db, 'gameDescription', gameId);
    const snapshot = await getDoc(gameDoc);
    
    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    
    if (data?.name && data?.description) {
      const game = { 
        id: snapshot.id, 
        name: data.name,
        description: data.description,
        howToPlay: data.howToPlay || '',
        multipliers: data.multipliers || '',
        category: data.category,
        isActive: data.isActive,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as GameDescription;
      
      gameCache.set(gameId, game);
      return game;
    } else if (data?.name || data?.description) {
      const game = { 
        id: snapshot.id, 
        name: data.name || 'Unnamed Game',
        description: data.description || 'No description available',
        howToPlay: data.howToPlay || '',
        multipliers: data.multipliers || '',
        category: data.category,
        isActive: data.isActive,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as GameDescription;
      
      gameCache.set(gameId, game);
      return game;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching game:", error);
    throw error;
  }
}

export function clearGameCache(): void {
  gameCache.clear();
}

export function getCachedGame(gameId: string): GameDescription | undefined {
  return gameCache.get(gameId);
}