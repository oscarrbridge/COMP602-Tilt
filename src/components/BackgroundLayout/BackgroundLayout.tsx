import type { ReactNode } from "react";
import React from "react";
import "./BackgroundLayout.css";
import NavBar from "../NavBar/NavBar";
import PanelMenu from "../PanelMenu/PanelMenu";
import InfoPanel from "../InfoPanel/InfoPanel";
import { CurrencyProvider } from "../../components/CurrencySwitcher/currencyswitcher.tsx"; 

interface BackgroundLayoutProps {
  children: ReactNode;
}

const BackgroundLayout: React.FC<BackgroundLayoutProps> = ({ children }) => {
  return (
    <div className="background-container">
      {/* Navbar */}
      <div className="title-panel">
        <h1>🎮 My Casino Game</h1>
      </div>
      
      <CurrencyProvider base="NZD" DefaultCurrency="NZD">
        <div className="NavBar">
          <NavBar />
        </div>
      </CurrencyProvider>

      <div className="content-wrapper">{children}</div>

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
