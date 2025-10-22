import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import './Footer.css';
import { useNavigate } from 'react-router-dom';
export default function Footer() {
    const navigate = useNavigate();
    return (_jsx(_Fragment, { children: _jsxs("div", { className: 'FooterContainer', children: [_jsx("div", { className: 'FooterColumn col1', children: _jsx("img", { src: 'src/assets/Tilt.png', width: 160 }) }), _jsxs("div", { className: 'FooterColumn col1', children: [_jsx("h2", { children: "Links" }), _jsxs("ul", { children: [_jsx("li", { children: _jsx("p", { onClick: () => navigate('/'), children: "Home" }) }), _jsx("li", { children: _jsx("p", { onClick: () => navigate('/wallet'), children: "Wallet" }) }), _jsx("li", { children: _jsx("p", { onClick: () => navigate('/leaderboard'), children: "Leaderboard" }) }), _jsx("li", { children: _jsx("p", { onClick: () => navigate('/statistics'), children: "Statistics" }) }), _jsx("li", { children: _jsx("p", { onClick: () => navigate('/friends'), children: "Friends" }) })] })] }), _jsx("div", { className: 'FooterColumn col1', children: _jsx("h2", { children: "Info" }) })] }) }));
}
