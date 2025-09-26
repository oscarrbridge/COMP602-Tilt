import type { ReactNode } from "react";
import React from "react";
import "./BackgroundLayout.css";
import NavBar from "../NavBar/NavBar";
import PanelMenu from "./PanelMenu/PanelMenu.tsx";
import InfoPanel from "./InfoPanel/InfoPanel.tsx";
import { CurrencyProvider } from "../../components/CurrencySwitcher/currencyswitcher.tsx";
import UniCreditsPanel from "./UniCreditsPanel/UniCreditsPanel";
import BettingHistoryPanel from "./BettingHistoryPanel/BettingHistoryPanel";

interface BackgroundLayoutProps {
  children: ReactNode;
}

const BackgroundLayout: React.FC<BackgroundLayoutProps> = ({ children }) => {
  return (
    <div className="background-container">
      {/* Navbar */}

      <CurrencyProvider base="NZD" DefaultCurrency="NZD">
        <div className="NavBar">
          <NavBar />
        </div>
      </CurrencyProvider>

      <div className="content-wrapper">
        <div className="uni-credits-menu">
          <UniCreditsPanel />
        </div>
        <div className="game-container">{children}</div>

        <div className="betting-history-menu">
          <BettingHistoryPanel />
        </div>
      </div>

      <div className="panel-menu">
        <PanelMenu />
      </div>

      <div className="info-menu">
        <div className="info-panel">
          <InfoPanel />
        </div>
      </div>
    </div>
  );
};

export default BackgroundLayout;
