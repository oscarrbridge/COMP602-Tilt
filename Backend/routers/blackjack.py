# Backend/routers/blackjack.py
from fastapi import APIRouter
from typing import List, Literal, Tuple
from pydantic import BaseModel
import random

from firebase_admin import firestore as fs_admin
from ..firebase.firebase_config import db

# ---- Local card helpers (no external blackjack module) ----
Rank = Literal["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
Suit = Literal["♠", "♥", "♦", "♣"]
Card = Tuple[Rank, Suit]

RANKS: List[Rank] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
SUITS: List[Suit] = ["♠", "♥", "♦", "♣"]


def draw_card() -> Card:
    return (random.choice(RANKS), random.choice(SUITS))


def hand_value(hand: List[Card]) -> int:
    total = 0
    aces = 0
    for r, _ in hand:
        if r in ["J", "Q", "K"]:
            total += 10
        elif r == "A":
            total += 11
            aces += 1
        else:
            total += int(r)
    while total > 21 and aces:
        total -= 10
        aces -= 1
    return total


# ---- Minimal request/response models kept local ----
class GameState(BaseModel):
    player_hand: List[Card] = []
    dealer_hand: List[Card] = []
    status: Literal[
        "playing", "player_bust", "dealer_bust", "player_stand", "finished"
    ] = "playing"


class CreateGameRequest(BaseModel):
    host_uid: str
    host_name: str


class JoinGameRequest(BaseModel):
    uid: str
    name: str


class StartGameRequest(BaseModel):
    pass


class ActionRequest(BaseModel):
    action: Literal["hit", "stand"]


# - prefix="/games" = All routes in this router will start with /games (e.g., /games/start)
# - tags=["blackjack"] = Groups these endpoints under the "blackjack" tag
router = APIRouter(prefix="/games", tags=["blackjack"])


# -------- Optional single-player endpoints (keep or delete) --------
@router.post("/start")
def start_game() -> GameState:
    return GameState(
        player_hand=[draw_card(), draw_card()],
        dealer_hand=[draw_card(), draw_card()],
        status="playing",
    )


@router.post("/hit")
def hit(state: GameState) -> GameState:
    state.player_hand.append(draw_card())
    if hand_value(state.player_hand) > 21:
        state.status = "player_bust"
    return state


@router.post("/stand")
def stand(state: GameState) -> GameState:
    state.status = "player_stand"
    while hand_value(state.dealer_hand) < 17:
        state.dealer_hand.append(draw_card())
    if hand_value(state.dealer_hand) > 21:
        state.status = "dealer_bust"
    else:
        state.status = "finished"
    return state


# ----------------- Multiplayer (Firestore) endpoints -----------------
@router.post("", summary="Create a new multiplayer game")
def create_game(body: CreateGameRequest):
    doc = db.collection("games").document()
    doc.set(
        {
            "state": "waiting",
            "host_uid": body.host_uid,
            "players": {
                body.host_uid: {
                    "name": body.host_name,
                    "hand": [],
                    "status": "waiting",
                }
            },
            "turn_order": [body.host_uid],
            "turn_index": 0,
            "dealer_hand": [],
            "createdAt": fs_admin.SERVER_TIMESTAMP,
            "updatedAt": fs_admin.SERVER_TIMESTAMP,
        }
    )
    return {"game_id": doc.id}


@router.get("/{game_id}", summary="Retrieve game state")
def get_game(game_id: str):
    snap = db.collection("games").document(game_id).get()
    return snap.to_dict() | {"id": snap.id}


@router.post("/{game_id}/join", summary="Join waiting game")
def join_game(game_id: str, body: JoinGameRequest):
    doc_ref = db.collection("games").document(game_id)
    snap = doc_ref.get()
    game = snap.to_dict() or {}

    players = game.get("players", {})
    if body.uid in players:
        return {"ok": True, "message": "Already joined"}

    players[body.uid] = {"name": body.name, "hand": [], "status": "waiting"}
    turn_order = game.get("turn_order", [])
    turn_order.append(body.uid)

    doc_ref.update(
        {
            "players": players,
            "turn_order": turn_order,
            "updatedAt": fs_admin.SERVER_TIMESTAMP,
        }
    )
    return {"ok": True}


@router.post("/{game_id}/start", summary="Deal two to each player and dealer")
def start_multiplayer(game_id: str, body: StartGameRequest):
    doc_ref = db.collection("games").document(game_id)
    snap = doc_ref.get()
    game = snap.to_dict() or {}
    players = game.get("players", {})

    # deal 2 to each player
    for uid in players.keys():
        players[uid]["hand"] = [draw_card(), draw_card()]
        players[uid]["status"] = "playing"

    dealer_hand = [draw_card(), draw_card()]

    doc_ref.update(
        {
            "state": "playing",
            "players": players,
            "dealer_hand": dealer_hand,
            "turn_index": 0,
            "updatedAt": fs_admin.SERVER_TIMESTAMP,
        }
    )
    return {"ok": True}
