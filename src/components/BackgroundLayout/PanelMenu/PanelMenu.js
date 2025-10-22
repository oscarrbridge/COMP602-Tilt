import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import "./PanelMenu.css";
export default function PanelMenu() {
    return (_jsxs("div", { className: "panel-menu", children: [_jsx("div", { className: "panel-header", children: _jsx("h2", { children: "Menu" }) }), _jsx("div", { className: "panel-content", children: _jsxs("ul", { children: [_jsx("li", { children: _jsx(Link, { to: "/", children: "\uD83C\uDFE0 Home" }) }), _jsx("li", { children: _jsx(Link, { to: "/slots", children: "\uD83C\uDFB0 Slots" }) }), _jsx("li", { children: _jsx(Link, { to: "/blackjack", children: "\uD83C\uDCCF Blackjack" }) }), _jsx("li", { children: _jsx(Link, { to: "/mines", children: "\uD83D\uDCA5 Mines" }) }), _jsx("li", { children: _jsx(Link, { to: "/cointoss", children: "\uD83E\uDE99 Coin Toss" }) }), _jsx("li", { children: _jsx(Link, { to: "/roulette", children: "\uD83D\uDEDE Roulette" }) }), _jsx("li", { children: _jsx(Link, { to: "/poker", children: "\uD83C\uDCCF Poker" }) })] }) })] }));
}
