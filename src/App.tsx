import { Routes, Route } from "react-router-dom";
import MainPage from "./mainpage";
import MinesPage from "./minespage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/mines" element={<MinesPage />} />
    </Routes>
  );
}