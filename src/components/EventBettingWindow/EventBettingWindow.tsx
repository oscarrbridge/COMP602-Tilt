import "./EventBettingWindow.css";
import { useState } from "react";
import { createPortal } from "react-dom";
import { placeEventBet } from "../../../Backend/firebase/eventBetting";
import { useUser } from "../../../Backend/firebase/UserFunctions";

interface EventBettingWindowProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  eventDescription: string;
}

export default function EventBettingWindow({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  eventDescription,
}: EventBettingWindowProps) {
  const [betAmount, setBetAmount] = useState<string>("");
  const [selectedChoice, setSelectedChoice] = useState<"yes" | "no" | null>(null);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, balance } = useUser();

  const handleBetSubmit = async () => {
    if (!user) {
      setError("You must be signed in to place a bet");
      return;
    }
    
    if (!selectedChoice || !betAmount) {
      setError("Please select an outcome and enter a bet amount");
      return;
    }
    
    const amount = parseFloat(betAmount);
    if (amount <= 0) {
      setError("Bet amount must be greater than 0");
      return;
    }
    
    if (amount > balance) {
      setError(`Insufficient balance. You have $${(balance / 100).toFixed(2)} available`);
      return;
    }
    
    setIsPlacingBet(true);
    setError(null);
    
    try {
      // Convert dollars to cents for database storage
      await placeEventBet(eventId, Math.round(amount * 100), selectedChoice);
      
      // Success - close the window and reset
      onClose();
      setBetAmount("");
      setSelectedChoice(null);
      setError(null);
      
      alert("Bet placed successfully!");
    } catch (error: any) {
      setError(error.message || "Failed to place bet");
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handleClose = () => {
    onClose();
    setBetAmount("");
    setSelectedChoice(null);
    setError(null);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="bettingWindowOverlay" onClick={handleClose}>
      <div className="bettingWindowContainer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bettingWindowHeader">
          <h2 className="bettingWindowTitle">Bet on Event</h2>
          <button className="bettingWindowClose" onClick={handleClose}>
            ×
          </button>
        </div>

        {/* Event Info */}
        <div className="bettingWindowEventInfo">
          <h3 className="eventTitle">{eventTitle}</h3>
          <p className="eventDescription">{eventDescription}</p>
          <div style={{ marginTop: 12, padding: 8, background: '#0F212E', borderRadius: 8 }}>
            <small>Available Balance: ${(balance / 100).toFixed(2)}</small>
          </div>
        </div>

        {/* Betting Options */}
        <div className="bettingOptions">
          <h4>Will this event happen?</h4>
          <div className="bettingButtons">
            <button
              className={`bettingOptionBtn yesBtn ${
                selectedChoice === "yes" ? "selected" : ""
              }`}
              onClick={() => setSelectedChoice("yes")}
            >
              YES
            </button>
            <button
              className={`bettingOptionBtn noBtn ${
                selectedChoice === "no" ? "selected" : ""
              }`}
              onClick={() => setSelectedChoice("no")}
            >
              NO
            </button>
          </div>
        </div>

        {/* Bet Amount */}
        <div className="bettingAmount">
          <label htmlFor="betAmount">Bet Amount ($):</label>
          <input
            id="betAmount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Enter amount in dollars"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            className="betAmountInput"
            disabled={isPlacingBet}
          />
          {error && (
            <div style={{ color: '#ff6b6b', fontSize: '0.9rem', marginTop: 8 }}>
              {error}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bettingActions">
          <button className="cancelBtn" onClick={handleClose} disabled={isPlacingBet}>
            Cancel
          </button>
          <button
            className="placeBetBtn"
            onClick={handleBetSubmit}
            disabled={!selectedChoice || !betAmount || parseFloat(betAmount) <= 0 || isPlacingBet || !user}
          >
            {isPlacingBet ? "Placing Bet..." : "Place Bet"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}