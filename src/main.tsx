import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Home from "./App.tsx";
import Deposit from "./pages/Deposit/Deposit.tsx";
import Withdraw from "./pages/Withdraw/Withdraw.tsx";
import Statistics from "./pages/Statistics/Statistics.tsx";
import Blackjack from "./Games/Blackjack/Blackjack.tsx";
import Slots from "./Games/Slots/slots.tsx";
import MinesPage from "./minespage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/deposit" element={<Deposit />} />
        <Route path="/withdraw" element={<Withdraw />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/slots" element={<Slots />} />
        <Route path="/blackjack" element={<Blackjack />} />
        <Route path="/mines" element={<MinesPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
