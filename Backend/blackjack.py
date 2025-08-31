import random
from typing import Dict
from pydantic import BaseModel


# Deck card values ranks and suits
suits = ["♠", "♥", "♦", "♣"]
ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
values = {
    "A": 11,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    "J": 10,
    "Q": 10,
    "K": 10,
}


# Creating a gamestate (Update this later for multiplayer)
class GameState(BaseModel):
    player_hand: list
    dealer_hand: list


class CreateGameRequest(BaseModel):
    host_uid: str  # Unique ID of the host user
    host_name: str  # Username of the host user


class JoinGameRequest(BaseModel):
    uid: str  # Unique ID of the joining user
    name: str  # Username of the joining user


class StartGameRequest(BaseModel):
    pass


class ActionRequest(BaseModel):
    uid: str  # Unique ID of the user taking the action
    action: str  # "hit" | "stand" actions


# Core Game Functions
def draw_card():
    """Draw a random card from the deck"""
    rank = random.choice(ranks)
    suit = random.choice(suits)

    return {"rank": rank, "suit": suit, "value": values[rank]}


def calculate_hand_value(hand):
    """Calculate best blackjack score (Ace = 1 or 11)"""
    total = sum(card["value"] for card in hand)
    aces = sum(1 for card in hand if card["rank"] == "A")

    while total > 21 and aces > 0:
        total -= 10  # count an Ace as 1 instead of 11
        aces -= 1

    return total


# Game Logic
def start_game():
    """Start a new game: deal 2 cards each"""
    player_hand = [draw_card(), draw_card()]
    dealer_hand = [draw_card(), draw_card()]

    return {"player_hand": player_hand, "dealer_hand": dealer_hand}


def hit(state: GameState):
    """Add card to player hand"""
    state.player_hand.append(draw_card())

    return {
        "player_hand": state.player_hand,
        "dealer_hand": state.dealer_hand,
        "player_value": calculate_hand_value(state.player_hand),
    }


def stand(state: GameState):
    """Dealer plays, then determine winner"""
    while calculate_hand_value(state.dealer_hand) < 17:
        state.dealer_hand.append(draw_card())

    player_value = calculate_hand_value(state.player_hand)
    dealer_value = calculate_hand_value(state.dealer_hand)

    if player_value > 21:
        winner = "dealer"
    elif dealer_value > 21 or player_value > dealer_value:
        winner = "player"
    elif dealer_value > player_value:
        winner = "dealer"
    else:
        winner = "tie"

    return {
        "player_hand": state.player_hand,
        "dealer_hand": state.dealer_hand,
        "player_value": player_value,
        "dealer_value": dealer_value,
        "winner": winner,
    }


# Helper function to check the players status, returrns true when all players have made their move
def all_players_done(players: Dict[str, Dict]) -> bool:
    for player in players.values():
        status = player.get("status")
        if status not in ("standing", "bust"):
            return False
    return True
