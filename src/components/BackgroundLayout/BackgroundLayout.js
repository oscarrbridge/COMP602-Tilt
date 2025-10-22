import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import './BackgroundLayout.css';
import NavBar from '../NavBar/NavBar';
import PanelMenu from './PanelMenu/PanelMenu';
import InfoPanel from './InfoPanel/InfoPanel';
import { CurrencyProvider } from '../../components/CurrencySwitcher/currencyswitcher';
import GameRankingPanel from './gameRankingPanel/gameRankingPanel';
import BettingHistoryPanel from './BettingHistoryPanel/BettingHistoryPanel';
const BackgroundLayout = ({ children }) => {
    return (_jsxs("div", { className: 'background-container', children: [_jsx(CurrencyProvider, { base: 'NZD', DefaultCurrency: 'NZD', children: _jsx("div", { className: 'NavBar', children: _jsx(NavBar, {}) }) }), _jsxs("div", { className: 'content-wrapper', children: [_jsx("div", { className: 'uni-credits-menu', children: _jsx(GameRankingPanel, {}) }), _jsx("div", { className: 'game-container', children: children }), _jsx("div", { className: 'betting-history-menu', children: _jsx(BettingHistoryPanel, {}) })] }), _jsx("div", { className: 'panel-menu', children: _jsx(PanelMenu, {}) }), _jsx("div", { className: 'info-menu', children: _jsx("div", { className: 'info-panel', children: _jsx(InfoPanel, { children: " " }) }) })] }));
};
export default BackgroundLayout;
