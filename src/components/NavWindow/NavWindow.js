import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import './NavWindow.css';
import { CurrencySwitcher } from '../../components/CurrencySwitcher/currencyswitcher'; //
import { useNavigate } from 'react-router-dom';
export default function NavWindow() {
    const navigate = useNavigate();
    return (_jsx(_Fragment, { children: _jsxs("div", { className: 'NavWindowContainer', children: [_jsx("div", { onClick: () => navigate('/'), children: _jsx("p", { className: 'NavItem', children: "Home" }) }), _jsx("div", { onClick: () => navigate('/wallet'), children: _jsx("p", { className: 'NavItem', children: "Wallet" }) }), _jsx("div", { onClick: () => navigate('/leaderboard'), children: _jsx("p", { className: 'NavItem', children: "Leaderboard" }) }), _jsx("div", { onClick: () => navigate('/statistics'), children: _jsx("p", { className: 'NavItem', children: "Statistics" }) }), _jsx("br", {}), _jsx("div", { className: 'CurrencySection', children: _jsx(CurrencySwitcher, { list: ['NZD', 'AUD', 'USD', 'EUR', 'GBP'] }) })] }) }));
}
