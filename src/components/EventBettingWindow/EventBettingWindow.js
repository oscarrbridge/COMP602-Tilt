import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import "./EventBettingWindow.css";
import { useState } from "react";
import { createPortal } from "react-dom";
import { placeEventBet } from "../../../Backend/firebase/eventBetting";
import { useUser } from "../../../Backend/firebase/UserFunctions";
export default function EventBettingWindow({ isOpen, onClose, eventId, eventTitle, eventDescription, }) {
    const [betAmount, setBetAmount] = useState("");
    const [selectedChoice, setSelectedChoice] = useState(null);
    const [isPlacingBet, setIsPlacingBet] = useState(false);
    const [error, setError] = useState(null);
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
        }
        catch (error) {
            setError(error.message || "Failed to place bet");
        }
        finally {
            setIsPlacingBet(false);
        }
    };
    const handleClose = () => {
        onClose();
        setBetAmount("");
        setSelectedChoice(null);
        setError(null);
    };
    if (!isOpen)
        return null;
    return createPortal(_jsx("div", { className: "bettingWindowOverlay", onClick: handleClose, children: _jsxs("div", { className: "bettingWindowContainer", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "bettingWindowHeader", children: [_jsx("h2", { className: "bettingWindowTitle", children: "Bet on Event" }), _jsx("button", { className: "bettingWindowClose", onClick: handleClose, children: "\u00D7" })] }), _jsxs("div", { className: "bettingWindowEventInfo", children: [_jsx("h3", { className: "eventTitle", children: eventTitle }), _jsx("p", { className: "eventDescription", children: eventDescription }), _jsx("div", { style: { marginTop: 12, padding: 8, background: '#0F212E', borderRadius: 8 }, children: _jsxs("small", { children: ["Available Balance: $", (balance / 100).toFixed(2)] }) })] }), _jsxs("div", { className: "bettingOptions", children: [_jsx("h4", { children: "Will this event happen?" }), _jsxs("div", { className: "bettingButtons", children: [_jsx("button", { className: `bettingOptionBtn yesBtn ${selectedChoice === "yes" ? "selected" : ""}`, onClick: () => setSelectedChoice("yes"), children: "YES" }), _jsx("button", { className: `bettingOptionBtn noBtn ${selectedChoice === "no" ? "selected" : ""}`, onClick: () => setSelectedChoice("no"), children: "NO" })] })] }), _jsxs("div", { className: "bettingAmount", children: [_jsx("label", { htmlFor: "betAmount", children: "Bet Amount ($):" }), _jsx("input", { id: "betAmount", type: "number", min: "0.01", step: "0.01", placeholder: "Enter amount in dollars", value: betAmount, onChange: (e) => setBetAmount(e.target.value), className: "betAmountInput", disabled: isPlacingBet }), error && (_jsx("div", { style: { color: '#ff6b6b', fontSize: '0.9rem', marginTop: 8 }, children: error }))] }), _jsxs("div", { className: "bettingActions", children: [_jsx("button", { className: "cancelBtn", onClick: handleClose, disabled: isPlacingBet, children: "Cancel" }), _jsx("button", { className: "placeBetBtn", onClick: handleBetSubmit, disabled: !selectedChoice || !betAmount || parseFloat(betAmount) <= 0 || isPlacingBet || !user, children: isPlacingBet ? "Placing Bet..." : "Place Bet" })] })] }) }), document.body);
}
