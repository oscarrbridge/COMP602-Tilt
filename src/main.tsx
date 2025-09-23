import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Home from './App.tsx';
import Wallet from './pages/Wallet/Wallet.tsx';
import Statistics from './pages/Statistics/Statistics.tsx';
import Blackjack from './Games/Blackjack/Blackjack.tsx';
import Slots from './Games/Slots/slots.tsx';
import Mines from './Games/mines/mines.tsx';
import Leaderboard from './pages/Leaderboard/Leaderboard.tsx';
import { CurrencyProvider } from './components/CurrencySwitcher/currencyswitcher';

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
        </Routes>
      </BrowserRouter>
    </CurrencyProvider>
  </StrictMode>
);
