import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { InvitePopup } from './components/Friends/FriendsOverlay';
import FriendsDock from './components/Friends/FriendsOverlay';
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(CurrencyProvider, { base: 'NZD', DefaultCurrency: 'NZD', storageKey: 'currency.code', children: _jsxs(BrowserRouter, { children: [_jsxs(Routes, { children: [_jsx(Route, { path: '/', element: _jsx(Home, {}) }), _jsx(Route, { path: '/wallet', element: _jsx(Wallet, {}) }), _jsx(Route, { path: '/leaderboard', element: _jsx(Leaderboard, {}) }), _jsx(Route, { path: '/statistics', element: _jsx(Statistics, {}) }), _jsx(Route, { path: '/friends', element: _jsx(Friends, {}) }), _jsx(Route, { path: '/slots', element: _jsx(Slots, {}) }), _jsx(Route, { path: '/blackjack', element: _jsx(Blackjack, {}) }), _jsx(Route, { path: '/mines', element: _jsx(Mines, {}) }), _jsx(Route, { path: '/cointoss', element: _jsx(CoinFlip, {}) }), _jsx(Route, { path: '/roulette', element: _jsx(Roulette, {}) }), _jsx(Route, { path: '/blackjack/:gameId', element: _jsx(BlackjackMRoute, {}) }), _jsx(Route, { path: '/poker', element: _jsx(PokerCreate, {}) }), " ", _jsx(Route, { path: '/poker/:gameId', element: _jsx(Poker, {}) }), " ", _jsx(Route, { path: '/LobbyTest', element: _jsx(LobbyTest, {}) }), _jsx(Route, { path: '/admin', element: _jsx(Admin, {}) }), _jsx(Route, { path: '/staff', element: _jsx(Staff, {}) }), _jsx(Route, { path: '/settings', element: _jsx(Settings, {}) })] }), _jsx(InvitePopup, {}), _jsx(FriendsDock, {})] }) }) }));
