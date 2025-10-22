import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import './Leaderboard.css';
import NavBar from '@components/NavBar/NavBar';
import LocalLeaderboard from '@components/LocalLeaderboard/LocalLeaderboard';
import GlobalLeaderboard from '@components/GlobalLeaderboard/GlobalLeaderboard';
import Footer from '@components/Footer/Footer';
export default function Leaderboard() {
    return (_jsxs(_Fragment, { children: [_jsx(NavBar, {}), _jsxs("div", { className: 'StatisticsContainer', children: [_jsxs("div", { className: 'StatisticsComponent', children: [_jsx("h2", { children: "Local Leaderboard" }), _jsx(LocalLeaderboard, {})] }), _jsxs("div", { className: 'StatisticsComponent', children: [_jsx("h2", { children: "Global Leaderboard" }), _jsx(GlobalLeaderboard, {})] })] }), _jsx(Footer, {})] }));
}
