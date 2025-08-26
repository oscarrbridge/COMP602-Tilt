from blackjack import start_game, hit, stand, GameState

# Start a game
game = start_game()
print("New Game:")
print("Player:", game["player_hand"])
print("Dealer:", game["dealer_hand"])

# Simulate hitting
state = GameState(player_hand=game["player_hand"], dealer_hand=game["dealer_hand"])
hit_result = hit(state)
print("\nAfter Hit:")
print("Player:", hit_result["player_hand"], "Value:", hit_result["player_value"])

# Simulate standing
stand_result = stand(state)
print("\nAfter Stand:")
print("Dealer:", stand_result["dealer_hand"], "Value:", stand_result["dealer_value"])
print("Winner:", stand_result["winner"])
