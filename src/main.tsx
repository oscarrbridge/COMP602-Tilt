import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Blackjack from "./Games/Blackjack/Blackjack.tsx";
import Home from "./App.tsx";
import Slots from "./Games/Slots/slots.tsx";
import MinesPage from "./minespage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/slots" element={<Slots />} />
        <Route path="/blackjack" element={<Blackjack />} />
        <Route path="/mines" element={<MinesPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
