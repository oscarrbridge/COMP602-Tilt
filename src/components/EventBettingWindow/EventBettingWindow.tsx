import "./EventBettingWindow.css";
import { useState } from "react";
import { createPortal } from "react-dom";

interface EventBettingWindowProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  eventDescription: string;
}

export default function EventBettingWindow({
  isOpen,
  onClose,
  eventTitle,
  eventDescription,
}: EventBettingWindowProps) {
  const [betAmount, setBetAmount] = useState<string>("");
  const [selectedChoice, setSelectedChoice] = useState<"yes" | "no" | null>(null);

  const handleBetSubmit = () => {
    // TODO: Implement betting logic
    console.log("Betting:", {
      eventTitle,
      choice: selectedChoice,
      amount: betAmount,
    });
    
    // For now, just close the modal
    onClose();
    setBetAmount("");
    setSelectedChoice(null);
  };

  const handleClose = () => {
    onClose();
    setBetAmount("");
    setSelectedChoice(null);
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
          <label htmlFor="betAmount">Bet Amount:</label>
          <input
            id="betAmount"
            type="number"
            min="1"
            placeholder="Enter amount"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            className="betAmountInput"
          />
        </div>

        {/* Action Buttons */}
        <div className="bettingActions">
          <button className="cancelBtn" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="placeBetBtn"
            onClick={handleBetSubmit}
            disabled={!selectedChoice || !betAmount || parseFloat(betAmount) <= 0}
          >
            Place Bet
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}