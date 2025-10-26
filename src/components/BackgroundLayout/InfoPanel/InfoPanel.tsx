import React, { useEffect, useState } from "react";
import "./InfoPanel.css";
import { getGameById } from "../../../../Backend/firebase/gameDescriptions";
import type { GameDescription } from "../../../../Backend/firebase/gameDescriptions";

interface InfoPanelProps {
  gameId: string;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ gameId }) => {
  const [game, setGame] = useState<GameDescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      setError("No game ID provided");
      setLoading(false);
      return;
    }

    const fetchGame = async () => {
      setLoading(true);
      setError(null);

      try {
        const gameData = await getGameById(gameId);

        if (!gameData) {
          setError("Game not found");
          setGame(null);
        } else {
          setGame(gameData);
        }
      } catch (err) {
        setError("Failed to fetch game info");
        setGame(null);
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId]);

  if (loading) {
    return (
      <aside className="info-panel">
        Loading game info for <strong>{gameId}</strong>...
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="info-panel">
        Error for <strong>{gameId}</strong>: {error}
      </aside>
    );
  }

  return (
    <aside className="info-panel">
      <h2 className="info-panel-title">{game?.name || "Game Info"}</h2>
      <div className="info-panel-content">
        <div className="info-panel-header">
          <h3>Description</h3>
        </div>
        {game?.description && (
          <div className="description-section">
            {game.description.split("\n").map((paragraph, idx) => (
              <p key={idx}>{paragraph.trim()}</p>
            ))}
          </div>
        )}

        <div className="info-panel-header">
          <h3>How to Play</h3>
        </div>

        {game?.howToPlay && (
          <div className="how-to-play-section">
            {game.howToPlay.split("\n\n").map((paragraph, idx) => (
              <p key={idx}>{paragraph.trim()}</p>
            ))}
          </div>
        )}

        <div className="info-panel-header">
          <h3>Multipliers</h3>
        </div>

        {game?.multipliers && (
          <div className="multipliers-section">
            <table className="multipliers-table">
              <thead>
                <tr>
                  <th>Value</th>
                  <th>Multiplier</th>
                </tr>
              </thead>
              <tbody>
                {game.multipliers.split("\n").map((line, index) => {
                  const [label, value] = line
                    .split("→")
                    .map((part) => part?.trim());
                  return (
                    <tr key={index}>
                      <td>{label}</td>
                      <td>{value}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </aside>
  );
};

export default InfoPanel;
