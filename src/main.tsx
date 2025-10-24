import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { CurrencyProvider } from './components/CurrencySwitcher/currencyswitcher';
import LobbyTest from './Games/Blackjack multiplayer/lobbytest';

// Navbar pages
import Home from './App';
import Friends from './pages/Friends/Friends';
import Wallet from './pages/Wallet/Wallet';
import Statistics from './pages/Statistics/Statistics';
import Leaderboard from './pages/Leaderboard/Leaderboard';

// Admin
import Admin from './pages/Admin/Admin';
import Staff from './pages/Staff/Staff';
import Settings from './pages/Settings/Settings';

// Games
import Poker from './Games/Poker/poker';
import PokerCreate from './Games/Poker/PokerCreate';
import Blackjack from './Games/Blackjack/Blackjack';
import Roulette from './Games/Roulette/roulette';
import Slots from './Games/Slots/slots';
import Mines from './Games/Mines/mines';
import CoinFlip from './Games/CoinToss/Cointoss';
import { BlackjackMRoute } from './Games/Blackjack multiplayer/BlackjackM';
import Crash from "./Games/Crash/crash";

import { InvitePopup } from './components/Friends/FriendsOverlay';
import FriendsDock from './components/Friends/FriendsOverlay';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CurrencyProvider base='NZD' DefaultCurrency='NZD' storageKey='currency.code'>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/wallet' element={<Wallet />} />
          <Route path='/leaderboard' element={<Leaderboard />} />
          <Route path='/statistics' element={<Statistics />} />
          <Route path='/friends' element={<Friends />} />
          <Route path='/slots' element={<Slots />} />
          <Route path='/blackjack' element={<Blackjack />} />
          <Route path='/mines' element={<Mines />} />
          <Route path='/cointoss' element={<CoinFlip />} />
          <Route path='/roulette' element={<Roulette />} />
          <Route path='/crash' element={<Crash />} />
          <Route path='/blackjack/:gameId' element={<BlackjackMRoute />} />
          <Route path='/poker' element={<PokerCreate />} /> {/* Game creation */}
          <Route path='/poker/:gameId' element={<Poker />} /> {/* Actual game */}
          <Route path="/crash" element={<Crash />} />
          <Route path='/LobbyTest' element={<LobbyTest />} />
          <Route path='/admin' element={<Admin />} />
          <Route path='/staff' element={<Staff />} />
          <Route path='/settings' element={<Settings />} />
        </Routes>
        <InvitePopup />
        <FriendsDock />
      </BrowserRouter>
    </CurrencyProvider>
  </StrictMode>
);
