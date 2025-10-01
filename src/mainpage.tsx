import { Link } from "react-router-dom";

export default function MainPage() {
  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <p>Click below to play Mines!</p>
      <Link to="/mines">
        <button style={{
          padding: "12px 24px",
          fontSize: "18px",
          borderRadius: "10px",
          backgroundColor: "#b38619",
          color: "#111",
          border: "none",
          cursor: "pointer"
        }}>
          Play Mines Game
        </button>
      </Link>
    </div>
  );
}