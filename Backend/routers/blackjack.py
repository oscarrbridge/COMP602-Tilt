from fastapi import APIRouter
from Backend import blackjack
from Backend.blackjack import (
    draw_card,
    GameState,
    CreateGameRequest,
    JoinGameRequest,
    StartGameRequest,
    ActionRequest,
)
from firebase_admin import firestore as fs_admin
from Backend.firebase.firebase_config import db


# - prefix="/games" = All routes in this router will start with /games (e.g., /games/start)
# - tags=["blackjack"] = Groups these endpoints under the "blackjack" tag
router = APIRouter(prefix="/games", tags=["blackjack"])


@router.post("/start")
def start_game():
    return blackjack.start_game()


@router.post("/hit")
def hit(state: blackjack.GameState):
    return blackjack.hit(state)


@router.post("/stand")
def stand(state: blackjack.GameState):
    return blackjack.stand(state)


@router.post("", summary="Create a new multiplayer game")
def create_game(body: CreateGameBody):
    # Create a new document reference in the games collection in FireStore
    doc = db.collection("games").document()
    # Initilise the game state in Firestore with assigned values of:
    # - Game state: "waiting" until enough players join
    # - host_uid: unique ID (uid) of the host who created the game
    # - players: sub collection of players
    # - turn_order: order of play for the game, starts with host
    # - dealer_hand: empty
    # - createdAt: timestamp
    # - updatedAt: timestamp
    doc.set(
        {
            "state": "waiting",
            "host_uid": body.host_uid,
            "players": {
                body.host_uid: {
                    "name": body.host_name,  # Host’s username
                    "hand": [],  # Empty hand to start
                    "status": "waiting",  # Player status waiting as game not started
                }
            },
            "turn_order": [body.host_uid],
            "turn_index": 0,
            "dealer_hand": [],
            "createdAt": fs_admin.SERVER_TIMESTAMP,
            "updatedAt": fs_admin.SERVER_TIMESTAMP,
        }
    )
    # Return the unique game ID
    return {"game_id": doc.id}


# Router for getting a game state
@router.get("/{game_id}", summary="Retrieve game state")
def get_game(game_id: str):
    # Receive the game document from Firestore using the given game_id
    gameData = db.collection("games").document(game_id).get()
    # Return the game data as a dictionary, merged with the document ID under "id"
    return gameData.to_dict() | {"id": gameData.id}


# Router for players joining to a game
@router.post("/{game_id}/join", summary="Join waiting game")
def join_game(game_id: str, body: JoinBody):
    # Grab the games document
    doc = db.collection("games").document(game_id)
    data = doc.get()

    gameData = data.to_dict()

    # Get the current players (empty if none exist)
    players = gameData.get("players", {})
    # If player has already joined
    if body.uid in players:
        return {"ok": True, "message": "Already joined"}
    # Else we add the new player to the players sub collection
    players[body.uid] = {
        "name": body.name,  # Player's username
        "hand": [],  # Empty hand until cards are dealt
        "status": "waiting",  # Waiting status until the game begins
    }
    # Append the new player to the turn order
    turn_order = gameData.get("turn_order", [])
    turn_order.append(body.uid)

    # Update Firestore with the new player info and refresh updatedAt time
    doc.update(
        {
            "players": players,
            "turn_order": turn_order,
            "updatedAt": fs_admin.SERVER_TIMESTAMP,
        }
    )
    # Return a success response
    return {"ok": True}


# Initlising game logic
@router.post("/{game_id}/start", summary="Deal two to each player and dealer")
def start_multiplayer(game_id: str, body: StartBody):
    doc = db.collection("games").document(game_id)
    data = doc.get()

    gameData = data.to_dict()
    players = gameData["players"]

    # Deal 2 cards to each player using your existing draw_card(), update to playing status
    for uid in players.keys():
        players[uid]["hand"] = [draw_card(), draw_card()]
        players[uid]["status"] = "playing"

    # Deal two cards to the dealer
    dealer_hand = [draw_card(), draw_card()]

    # Update Firestore with the new state changes we did to initilise:
    # - "state": game is now in progress
    # - "players": updated hands and statuses
    # - "dealer_hand": dealer's starting cards
    # - "turn_index": reset to 0 (host starts first turn)
    # - "updatedAt": Firestore server timestamp
    doc.update(
        {
            "state": "playing",
            "players": players,
            "dealer_hand": dealer_hand,
            "turn_index": 0,
            "updatedAt": fs_admin.SERVER_TIMESTAMP,
        }
    )
    return {"ok": True}
