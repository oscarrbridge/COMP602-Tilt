from fastapi import APIRouter
from Backend import blackjack

router = APIRouter(prefix="/blackjack", tags=["blackjack"])


@router.post("/start")
def start_game():
    return blackjack.start_game()


@router.post("/hit")
def hit(state: blackjack.GameState):
    return blackjack.hit(state)


@router.post("/stand")
def stand(state: blackjack.GameState):
    return blackjack.stand(state)
