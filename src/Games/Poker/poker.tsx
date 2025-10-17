// PokerGame.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  updatePokerGame,
  updatePlayerStatus,
  setNextTurn,
  resetRound,
} from "./pokerfunctions";
import { useUser } from "../../../Backend/firebase/UserFunctions";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../../Backend/firebase/firebaseConfig";
import { evaluateHand } from "./pokerHandEvaluator";

// Card deck helper
const suits = ["♠", "♥", "♦", "♣"];
const values = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A",
];

function createDeck() {
  const deck: string[] = [];
  for (const s of suits) {
    for (const v of values) {
      deck.push(`${v}${s}`);
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

export default function PokerGame() {
  const { gameId } = useParams();
  const { user } = useUser();
  const [players, setPlayers] = useState<any[]>([]);
  const [communityCards, setCommunityCards] = useState<string[]>([]);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [myTurn, setMyTurn] = useState(false);
  const [deck, setDeck] = useState<string[]>([]);
  const [round, setRound] = useState<"preflop" | "flop" | "turn" | "river" | "showdown">("preflop");
  const [ready, setReady] = useState(false);

  // Listen to players & game state
  useEffect(() => {
    if (!gameId) return;

    const playersRef = collection(db, "games", gameId, "players");
    const unsubscribePlayers = onSnapshot(playersRef, (snapshot) => {
      setPlayers(snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() })));
    });

    const gameRef = collection(db, "games");
    const unsubscribeGame = onSnapshot(gameRef, (snapshot) => {
      const gameDoc = snapshot.docs.find((d) => d.id === gameId);
      if (!gameDoc) return;
      const data = gameDoc.data();
      setCommunityCards(data.communityCards || []);
      setPot(data.pot || 0);
      setCurrentBet(data.currentBet || 0);
      setRound(data.round || "preflop");
      setMyTurn(data.currentTurn === user?.uid);
    });

    return () => {
      unsubscribePlayers();
      unsubscribeGame();
    };
  }, [gameId, user]);

  // Ready up
  const readyUp = async () => {
    if (!user || !gameId) return;
    await updatePlayerStatus(gameId, user.uid, { ready: true });
    setReady(true);
  };

  // Start hand once all ready
  useEffect(() => {
    if (!players.length || !gameId) return;
    if (players.every((p) => p.ready)) {
      startHand();
    }
  }, [players]);

  const startHand = async () => {
    if (!gameId) return;
    const newDeck = createDeck();
    setDeck(newDeck);

    const updatedPlayers = players.map((p) => {
      const hole = [newDeck.pop()!, newDeck.pop()!];
      updatePlayerStatus(gameId, p.uid, { holeCards: hole, status: "playing" });
      return { ...p, holeCards: hole, status: "playing" };
    });

    // Set initial turn to Big Blind
    const dealerPos = 0;
    const bigBlindIndex = (dealerPos + 2) % updatedPlayers.length;
    const bigBlindPlayer = updatedPlayers[bigBlindIndex];
    if (!bigBlindPlayer) return;
    const bigBlindUid = bigBlindPlayer.uid;

    await updatePokerGame(gameId, { state: "in-progress", round: "preflop" });
    setNextTurn(gameId, bigBlindUid);
  };

  // Betting
  const bet = async (amount: number) => {
    if (!myTurn || !user || !gameId) return;
    const me = players.find((p) => p.uid === user.uid);
    if (!me || me.chips < amount) return;

    await updatePlayerStatus(gameId, user.uid, {
      bet: me.bet + amount,
      chips: me.chips - amount,
    });

    await updatePokerGame(gameId, { pot: pot + amount, currentBet: Math.max(currentBet, me.bet + amount) });

    // Move turn
    const myIndex = players.findIndex((p) => p.uid === user.uid);
    const nextIndex = (myIndex + 1) % players.length;
    setNextTurn(gameId, players[nextIndex].uid);
  };

  // Deal next community round
  const dealNextRound = async () => {
    if (!gameId || !deck.length) return;
    let newCommunity = [...communityCards];
    switch (round) {
      case "preflop":
        newCommunity.push(deck.pop()!, deck.pop()!, deck.pop()!);
        setRound("flop");
        await updatePokerGame(gameId, { communityCards: newCommunity, round: "flop" });
        break;
      case "flop":
        newCommunity.push(deck.pop()!);
        setRound("turn");
        await updatePokerGame(gameId, { communityCards: newCommunity, round: "turn" });
        break;
      case "turn":
        newCommunity.push(deck.pop()!);
        setRound("river");
        await updatePokerGame(gameId, { communityCards: newCommunity, round: "river" });
        break;
      case "river":
        setRound("showdown");
        await updatePokerGame(gameId, { round: "showdown" });
        showdown();
        break;
    }
    setCommunityCards(newCommunity);
  };

  const showdown = () => {
    const scores = players.map((p) => ({
      uid: p.uid,
      handValue: evaluateHand([...p.holeCards, ...communityCards]),
    }));

    const maxScore = Math.max(...scores.map((s) => s.handValue));
    const winners = scores.filter((s) => s.handValue === maxScore);

    const share = Math.floor(pot / winners.length);
    winners.forEach(async (w) => {
      const p = players.find((pl) => pl.uid === w.uid);
      if (p) await updatePlayerStatus(gameId!, p.uid, { chips: p.chips + share });
    });

    resetRound(gameId!);
  };

  return (
    <div>
      <h1>Poker Game: {gameId}</h1>

      {!ready && <button onClick={readyUp}>Ready</button>}

      <h2>Pot: {pot}</h2>

      <h3>Community Cards:</h3>
      <div>{communityCards.join(" ")}</div>

      <h3>Players:</h3>
      <ul>
        {players.map((p) => (
          <li key={p.uid}>
            {p.displayName} - Chips: {p.chips} - Bet: {p.bet}{" "}
            {p.uid === user?.uid ? "(You)" : ""}{" "}
            {p.status === "playing" ? "▶️" : p.status}
            <div>
              Hole: {p.uid === user?.uid ? (p.holeCards || []).join(" ") : "??"}
            </div>
          </li>
        ))}
      </ul>

      {/* Betting / actions */}
      {myTurn && round !== "showdown" && (
        <div>
          <button onClick={() => bet(10)}>Bet 10</button>
          <button onClick={() => bet(50)}>Bet 50</button>
          <button onClick={dealNextRound}>Deal Next Round</button>
        </div>
      )}

      {/* Only show Next Hand button on showdown */}
      {round === "showdown" && (
        <button onClick={() => resetRound(gameId!)}>Next Hand</button>
      )}
    </div>
  );
}
