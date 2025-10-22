export declare const listenToGame: (gameId: string, onGameChange: (game: any) => void) => import("@firebase/firestore").Unsubscribe;
export declare const listenToPlayers: (gameId: string, onPlayersChange: (players: any[]) => void) => import("@firebase/firestore").Unsubscribe;
