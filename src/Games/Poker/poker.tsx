// Poker.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  updatePokerGame,
  updatePlayerStatus,
  setNextTurn,
  resetRound,
} from "./pokerfunctions";
import { useUser } from "../../../Backend/firebase/UserFunctions";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../../Backend/firebase/firebaseConfig";
import { evaluateHand } from "./pokerHandEvaluator";

// ===== Card helpers =====
const suits = ["♠", "♥", "♦", "♣"];
const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function createDeck() {
  const deck: string[] = [];
  for (const s of suits) for (const v of values) deck.push(`${v}${s}`);
  return deck.sort(() => Math.random() - 0.5);
}
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
  const [actionHistory, setActionHistory] = useState<Record<string, boolean>>({});

  // ===== Listen for realtime updates =====
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

  // ===== Ready up =====
  const readyUp = async () => {
    if (!user || !gameId) return;
    await sleep(400);
    await updatePlayerStatus(gameId, user.uid, { ready: true });
    setReady(true);
  };

  // ===== Start hand once everyone ready =====
  useEffect(() => {
    if (!players.length || !gameId) return;
    const allReady = players.every((p) => p.ready);
    if (allReady && !players.some((p) => p.holeCards)) {
      startHand();
    }
  }, [players]);

  // ===== Deal hole cards and start preflop =====
  const startHand = async () => {
    if (!gameId) return;
    const newDeck = createDeck();
    await sleep(400);
    setDeck(newDeck);

    const updatedPlayers = players.map((p) => {
      const hole = [newDeck.pop()!, newDeck.pop()!];
      updatePlayerStatus(gameId, p.uid, { holeCards: hole, status: "playing", bet: 0 });
      return { ...p, holeCards: hole, status: "playing", bet: 0 };
    });

    const dealerPos = 0;
    const firstPlayerUid = updatedPlayers[(dealerPos + 1) % updatedPlayers.length]?.uid;

    await updatePokerGame(gameId, {
      state: "in-progress",
      round: "preflop",
      pot: 0,
      currentBet: 0,
      communityCards: [],
      currentTurn: firstPlayerUid,
    });

    setNextTurn(gameId, firstPlayerUid);
    setActionHistory({});
  };

  // ===== Player Action Handler =====
  const playerAction = async (action: "fold" | "call" | "check" | "raise", amount = 0) => {
    await sleep(400);
    if (!myTurn || !user || !gameId) return;
    const me = players.find((p) => p.uid === user.uid);
    if (!me) return;

    let newPot = pot;
    let newBet = me.bet || 0;
    let newCurrentBet = currentBet;

    if (action === "fold") {
      await updatePlayerStatus(gameId, user.uid, { status: "folded" });
    } else if (action === "call") {
      const callAmt = currentBet - newBet;
      if (callAmt > 0 && me.chips >= callAmt) {
        newPot += callAmt;
        newBet += callAmt;
        await updatePlayerStatus(gameId, user.uid, { bet: newBet, chips: me.chips - callAmt });
        await updatePokerGame(gameId, { pot: newPot });
      }
    } else if (action === "check") {
      if (newBet < currentBet) return; // can't check if behind
    } else if (action === "raise") {
      const raiseAmt = amount;
      if (me.chips < raiseAmt) return;
      newBet += raiseAmt;
      newCurrentBet = newBet;
      newPot += raiseAmt;
      await updatePlayerStatus(gameId, user.uid, { bet: newBet, chips: me.chips - raiseAmt });
      await updatePokerGame(gameId, { pot: newPot, currentBet: newCurrentBet });
    }

    // Mark player as acted this round
    setActionHistory((prev) => ({ ...prev, [user.uid]: true }));

    // Determine next player
    const active = players.filter((p) => p.status === "playing");
    const myIndex = active.findIndex((p) => p.uid === user.uid);
    const nextUid = active[(myIndex + 1) % active.length]?.uid;

    // Check round end conditions
    const everyoneActed = active.every((p) => actionHistory[p.uid]);
    const allBetsEqual = active.every((p) => (p.bet || 0) === currentBet);

    if (active.length === 1) {
      // One winner left
      const winner = active[0];
      await updatePlayerStatus(gameId, winner.uid, { chips: winner.chips + newPot });
      await resetRound(gameId);
      return;
    }

    if (everyoneActed && allBetsEqual) {
      await dealNextRound();
      setActionHistory({});
    } else {
      await setNextTurn(gameId, nextUid);
    }
  };

  // ===== Deal next phase =====
  const dealNextRound = async () => {
    await sleep(400);
    if (!gameId || !deck.length) return;
    let newCommunity = [...communityCards];

    if (round === "preflop") {
      newCommunity.push(deck.pop()!, deck.pop()!, deck.pop()!);
      await updatePokerGame(gameId, { communityCards: newCommunity, round: "flop" });
      setRound("flop");
    } else if (round === "flop") {
      newCommunity.push(deck.pop()!);
      await updatePokerGame(gameId, { communityCards: newCommunity, round: "turn" });
      setRound("turn");
    } else if (round === "turn") {
      newCommunity.push(deck.pop()!);
      await updatePokerGame(gameId, { communityCards: newCommunity, round: "river" });
      setRound("river");
    } else if (round === "river") {
      await updatePokerGame(gameId, { round: "showdown" });
      setRound("showdown");
      showdown();
    }

    setCommunityCards(newCommunity);
  };

  // ===== Determine winner =====
  const showdown = async () => {
    await sleep(400);
    const scores = players.map((p) => ({
      uid: p.uid,
      handValue: evaluateHand([...(p.holeCards || []), ...communityCards]),
    }));

    const maxScore = Math.max(...scores.map((s) => s.handValue));
    const winners = scores.filter((s) => s.handValue === maxScore);
    const share = Math.floor(pot / winners.length);

    for (const w of winners) {
      const p = players.find((pl) => pl.uid === w.uid);
      if (p) await updatePlayerStatus(gameId!, p.uid, { chips: p.chips + share });
    }

    await resetRound(gameId!);
  };

  // ===== UI =====
  return (
    <div>
      <h1>Poker Game: {gameId}</h1>

      {!ready && <button onClick={readyUp}>Ready</button>}

      <h2>Pot: {pot}</h2>
      <h3>Round: {round}</h3>
      <div>Community Cards: {communityCards.join(" ")}</div>

      <h3>Players:</h3>
      <ul>
        {players.map((p) => (
          <li key={p.uid}>
            {p.displayName} - Chips: {p.chips} - Bet: {p.bet || 0}{" "}
            {p.uid === user?.uid && "(You)"}{" "}
            {p.status === "playing" ? "▶️" : p.status}
            <div>Hole: {p.uid === user?.uid ? (p.holeCards || []).join(" ") : "??"}</div>
          </li>
        ))}
      </ul>

      {myTurn && round !== "showdown" && (
        <div>
          <button onClick={() => playerAction("check")}>Check</button>
          <button onClick={() => playerAction("call")}>Call</button>
          <button onClick={() => playerAction("raise", 50)}>Raise 50</button>
          <button onClick={() => playerAction("fold")}>Fold</button>
        </div>
      )}

      {round === "showdown" && <button onClick={() => resetRound(gameId!)}>Next Hand</button>}
    </div>
  );
}
