import "./BettingHistoryPanel.css";

export default function BettingHistoryPanel() {
  return (
    <div className={`betting-history-panel`}>
      <div className="betting-history-panel-header">
        <h2>Betting History</h2>
      </div>
      <div className="betting-history-panel-content">
        <p>-Previous bets-</p>
      </div>
    </div>
  );
}
