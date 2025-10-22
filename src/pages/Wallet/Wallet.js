import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import './Wallet.css';
import NavBar from '@components/NavBar/NavBar';
import Withdraw from '@components/Withdraw/Withdraw';
import Deposit from '@components/Deposit/Deposit';
import UniCodes from '@components/AddUniBalance/AddUniBalance';
import AutoPayment from '@components/AutoPayment/AutoPayment';
import { useUser } from '@backend/firebase/UserFunctions';
import Footer from '@components/Footer/Footer';
export default function Wallet() {
    useUser();
    return (_jsxs(_Fragment, { children: [_jsx(NavBar, {}), _jsxs("main", { className: 'WalletContainer', children: [_jsxs("header", { className: 'WalletHeader', children: [_jsx("h1", { children: "Wallet" }), _jsx("p", { children: "Manage deposits, withdrawals, auto top-ups, and uni codes." })] }), _jsxs("section", { className: 'WalletGrid', children: [_jsxs("article", { className: 'Card', children: [_jsxs("h2", { className: 'CardTitle', children: [_jsx("span", { className: 'AccentDot' }), " Deposit Funds"] }), _jsx(Deposit, {})] }), _jsxs("article", { className: 'Card', children: [_jsxs("h2", { className: 'CardTitle', children: [_jsx("span", { className: 'AccentDot' }), " Withdraw Funds"] }), _jsx(Withdraw, {})] }), _jsxs("article", { className: 'Card Card--autopay AutoTopupCard', children: [_jsxs("h2", { className: 'CardTitle', children: [_jsx("span", { className: 'AccentDot' }), " Automatic Top-up"] }), _jsx(AutoPayment, {})] }), _jsxs("article", { className: 'Card', children: [_jsxs("h2", { className: 'CardTitle', children: [_jsx("span", { className: 'AccentDot' }), " Redeem a Uni Code"] }), _jsx(UniCodes, {})] })] })] }), _jsx(Footer, {})] }));
}
