import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import './SearchBar.css';
export default function SearchBar({ Placeholder }) {
    return (_jsx(_Fragment, { children: _jsx("div", { className: 'SearchBarContainer', children: _jsx("input", { type: 'text', placeholder: Placeholder, className: 'SearchBar' }) }) }));
}
