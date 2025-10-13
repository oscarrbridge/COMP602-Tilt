import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Home from './App.tsx';
import Wallet from './pages/Wallet/Wallet.tsx';
import Statistics from './pages/Statistics/Statistics.tsx';
import Blackjack from './Games/Blackjack/Blackjack.tsx';
import Slots from './Games/Slots/slots.tsx';
import Mines from './Games/Mines/mines.tsx';
import CoinFlip from './Games/CoinToss/CoinToss.tsx';
import Leaderboard from './pages/Leaderboard/Leaderboard.tsx';
import Admin from './pages/Admin/Admin.tsx'
import Staff from './pages/Staff/Staff.tsx';
import Settings from './pages/Settings/Settings.tsx'

import { CurrencyProvider } from './components/CurrencySwitcher/currencyswitcher';
import Friends from './pages/Friends/friends.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CurrencyProvider base='NZD' DefaultCurrency='NZD' storageKey='currency.code'>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/wallet' element={<Wallet />} />
          <Route path='/leaderboard' element={<Leaderboard />} />
          <Route path='/statistics' element={<Statistics />} />
          <Route path='/slots' element={<Slots />} />
          <Route path='/blackjack' element={<Blackjack />} />
          <Route path='/mines' element={<Mines />} />
          <Route path='/cointoss' element={<CoinFlip />} />
          <Route path='/friends' element={<Friends />} />
          <Route path='/admin' element={<Admin />} />
          <Route path='/staff' element={<Staff />} />
          <Route path='/settings' element={<Settings />} />
        </Routes>
      </BrowserRouter>
    </CurrencyProvider>
  </StrictMode>
);
