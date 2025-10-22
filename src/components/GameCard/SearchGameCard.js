import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import "./GameCard.css";
import { Link } from "react-router-dom";
export default function SearchGameCard({ Text, Image, LinkTo }) {
    const CardContent = (_jsxs("div", { className: "SearchGameCardImage", children: [_jsx("img", { src: Image, alt: Text + " icon", className: "SearchGameCardIcon" }), _jsx("div", { className: "SearchGameCardText", children: _jsx("h3", { children: Text }) })] }));
    return LinkTo ? _jsx(Link, { to: LinkTo, children: CardContent }) : CardContent;
}
