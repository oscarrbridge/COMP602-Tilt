import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { CurrencyProvider } from './components/CurrencySwitcher/currencyswitcher';
import LobbyTest from './Games/Blackjack multiplayer/lobbytest.tsx';

// Navbar pages
import Home from './App.tsx';
import Friends from './pages/Friends/friends.tsx';
import Wallet from './pages/Wallet/Wallet.tsx';
import Statistics from './pages/Statistics/Statistics.tsx';
import Leaderboard from './pages/Leaderboard/Leaderboard.tsx';

// Admin
import Admin from './pages/Admin/Admin.tsx';
import Staff from './pages/Staff/Staff.tsx';
import Settings from './pages/Settings/Settings.tsx';

// Games
import Poker from './Games/Poker/poker.tsx';
import PokerCreate from './Games/Poker/PokerCreate.tsx';
import Blackjack from './Games/Blackjack/Blackjack.tsx';
import Roulette from './Games/Roulette/roulette.tsx';
import Slots from './Games/Slots/slots.tsx';
import Mines from './Games/Mines/mines.tsx';
import CoinFlip from './Games/CoinToss/Cointoss.tsx';
import { BlackjackMRoute } from './Games/Blackjack multiplayer/BlackjackM.tsx';

import { InvitePopup } from './components/Friends/FriendsOverlay.tsx';
import FriendsDock from './components/Friends/FriendsOverlay.tsx';

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
          <Route path='/blackjack/:gameId' element={<BlackjackMRoute />} />
          <Route path='/poker' element={<PokerCreate />} /> {/* Game creation */}
          <Route path='/poker/:gameId' element={<Poker />} /> {/* Actual game */}
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
