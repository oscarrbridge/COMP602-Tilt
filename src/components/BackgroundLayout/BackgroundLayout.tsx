import type { ReactNode } from 'react';
import React from 'react';
import './BackgroundLayout.css';
import NavBar from '../NavBar/NavBar';
import PanelMenu from './PanelMenu/PanelMenu';
import InfoPanel from './InfoPanel/InfoPanel';
import { CurrencyProvider } from '../../components/CurrencySwitcher/currencyswitcher';
import UniCreditsPanel from './UniCreditsPanel/uniCreditsPanel';
import BettingHistoryPanel from './BettingHistoryPanel/BettingHistoryPanel';

interface BackgroundLayoutProps {
  children: ReactNode;
  gameId: string;
  className?: string;
  gameBackground?: string;
}

const BackgroundLayout: React.FC<BackgroundLayoutProps> = ({
  children,
  gameId,
  className = '',
  gameBackground,
}) => {
  const gameContainerStyle = gameBackground
    ? { background: `url(${gameBackground}) center / cover no-repeat` }
    : {};
  return (
    <div className={`full-background-container ${className}`}>
      <CurrencyProvider base='NZD' DefaultCurrency='NZD'>
        <div className='NavBar'>
          <NavBar />
        </div>
      </CurrencyProvider>

      <div className='content-wrapper'>
        <div className='uni-credits-menu'>
          <UniCreditsPanel />
        </div>

        <div className='game-container' style={gameContainerStyle}>
          {children}
        </div>

        <div className='betting-history-menu'>
          <BettingHistoryPanel />
        </div>
      </div>

      <div className='panel-menu'>
        <PanelMenu />
      </div>

      <div className='info-menu'>
        <div className='info-panel'>
          <InfoPanel gameId={gameId} />
        </div>
      </div>
    </div>
  );
};

export default BackgroundLayout;
