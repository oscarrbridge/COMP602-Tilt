import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import './Staff.css';
import NavBar from '@components/NavBar/NavBar';
import { useState } from 'react';
import Footer from '@components/Footer/Footer';
export default function Staff() {
    const [code, setCode] = useState('');
    function GenarateCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 16; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        setCode(result);
        return result;
    }
    return (_jsxs(_Fragment, { children: [_jsx(NavBar, {}), _jsx("div", { className: 'genBoxContainer', children: _jsxs("div", { className: 'genBox', children: [_jsx("h2", { children: "Press to get a random code" }), _jsx("input", { type: 'text', value: code, readOnly: true }), _jsx("button", { onClick: GenarateCode, children: "Generate" })] }) }), _jsx(Footer, {})] }));
}
