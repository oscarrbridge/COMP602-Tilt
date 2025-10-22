import { jsx as _jsx } from "react/jsx-runtime";
import './UserBalance.css';
import { Price } from '../CurrencySwitcher/currencyswitcher';
export default function UserBalance({ balance }) {
    // Convert NZD cents -> NZD dollars (major units)
    const balanceNZDMajor = balance !== null ? balance / 100 : null;
    return (_jsx("div", { className: 'UserBalance', children: _jsx("p", { children: balanceNZDMajor !== null ? _jsx(Price, { amount: balanceNZDMajor, from: 'NZD' }) : '---' }) }));
}
